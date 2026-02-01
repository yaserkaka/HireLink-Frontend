// config/axiosConfig.js
import axios from "axios";
import { PATHS } from "../constants/apiPaths";
import {
	clearAccessToken,
	getAccessToken,
	setAccessToken,
} from "../lib/tokenStore";

const baseURL = import.meta.env.VITE_API_URL;
const PROTECTED_PREFIXES = ["/talent", "/employer", "/moderation", "/auth/me"]; // مثال


// Create a single axios client for the whole app
// - baseURL comes from env
// - withCredentials: is required to send refresh token cookies
const axiosClient = axios.create({
	baseURL: baseURL,
	withCredentials: true,
	headers: {},
});

// Refreshclient
const refreshClient = axios.create({
	baseURL: import.meta.env.VITE_API_URL,
	withCredentials: true,
});

// Request Interceptor:
// Add Authorization header to requests

// axiosClient.interceptors.request.use(
// 	(config) => {
// 		const token = getAccessToken();
// 		console.log(
// 			"REQ",
// 			config.method?.toUpperCase(),
// 			config.url,
// 			"token",
// 			!!token,
// 		);
// 		// Ensure headers object eists
// 		config.headers = config.headers || {};
// 		if (token) config.headers.Authorization = `Bearer ${token}`;
// 		else delete config.headers.Authorization;

// 		const isFormData = config.data instanceof FormData;

// 		if (isFormData) {
// 			// for file upload
// 			delete config.headers["Content-Type"];
// 		} else {
// 			if (!config.headers["Content-Type"]) {
// 				config.headers["Content-Type"] = "application/json";
// 			}
// 		}

// 		return config;
// 	},
// 	(error) => Promise.reject(error),
// );

axiosClient.interceptors.request.use(
	(config) => {
		const token = getAccessToken();

		// Ensure headers exists early
		config.headers = config.headers || {};

		const needsAuth = (url) =>
			typeof url === "string" &&
			PROTECTED_PREFIXES.some((p) => url.startsWith(p));

		const mustAuth = needsAuth(config.url);

		console.log("REQ", config.method?.toUpperCase(), config.url, "mustAuth", mustAuth, "token", !!token);
		console.log("token value:", token);

		// Block protected requests until token exists
		if (mustAuth && !token) {
			return Promise.reject(new Error("No access token yet"));
		}

		// Set Authorization (compatible with AxiosHeaders + plain object)
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
			config.headers.set?.("Authorization", `Bearer ${token}`);
		} else {
			delete config.headers.Authorization;
			config.headers.delete?.("Authorization");
		}

		const authHeader =
			config.headers.get?.("Authorization") ?? config.headers.Authorization;
		console.log("auth header final:", authHeader);

		// Content-Type handling
		const isFormData = config.data instanceof FormData;
		if (isFormData) {
			config.headers.delete?.("Content-Type");
			delete config.headers["Content-Type"];
		} else {
			const ct = config.headers.get?.("Content-Type") ?? config.headers["Content-Type"];
			if (!ct) {
				config.headers.set?.("Content-Type", "application/json");
				config.headers["Content-Type"] = "application/json";
			}
		}

		return config;
	},
	(error) => Promise.reject(error)
);

//Rferesh  queue logic
// Flag to prevent multiple refresh calls at the same time
let isRefreshing = false;

// Queue to store requests that failed with 401 while refresh is in progress
let failedQueue = [];

// Restore or reject all queued requests after refresh finishes
const processQueue = (error, token = null) => {
	failedQueue.forEach(({ resolve, reject }) => {
		if (error) reject(error);
		else resolve(token);
	});
	failedQueue = [];
};

// Response Interceptor:
// Handle expired access token (401 errors)
axiosClient.interceptors.response.use(
	(response) => response,
	async (error) => {
		const status = error?.response?.status;
		const originalRequest = error.config;

		// Network errors (no response from server)
		// Let the caller handle them
		if (!status || !originalRequest) return Promise.reject(error);

		// Prevent infinite loop:
		// Do not try to refresh if the failed request is already /auth/refresh
		const isRefreshCall =
			typeof originalRequest.url === "string" &&
			originalRequest.url.includes(PATHS.auth.refresh);

		// handle expired access token
		if (status === 401 && !originalRequest._retry && !isRefreshCall) {
			// Ensure headers object exists for retry

			originalRequest.headers = originalRequest.headers || {};

			// check if refresh is in progress
			if (isRefreshing) {
				// If a refresh request is already is running,
				//wait until it finishes and retry the original request
				return new Promise((resolve, reject) => {
					failedQueue.push({ resolve, reject });
					//
				}).then((newToken) => {
					originalRequest.headers.Authorization = `Bearer ${newToken}`;
					return axiosClient(originalRequest);
				});
			}

			// Mark request as retried to prevent infinite loop
			originalRequest._retry = true;
			isRefreshing = true;

			try {
				// Refresh should be cookie-based only (no Authorization header)
				// const res = await axiosClient.get(PATHS.auth.refresh, {
				// 	headers: { Authorization: "" },
				// });
				const refreshRes = await refreshClient.get(PATHS.auth.refresh);
				const newAccessToken = refreshRes?.data?.data?.token;

				//				const newAccessToken = res?.data?.data?.token;
				console.log(newAccessToken);
				if (!newAccessToken) {
					throw new Error("Refresh succeeded but token missing in response");
				}

				setAccessToken(newAccessToken);
				processQueue(null, newAccessToken);

				originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
				return axiosClient(originalRequest);
			} catch (err) {
				processQueue(err, null);

				const refreshStatus = err?.response?.status;
				if (refreshStatus === 401 || refreshStatus === 403) {
					clearAccessToken();
				}

				return Promise.reject(err);
			} finally {
				isRefreshing = false;
			}
		}

		// Any other error
		return Promise.reject(error);
	},
);

export default axiosClient;
