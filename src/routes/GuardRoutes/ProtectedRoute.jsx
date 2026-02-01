import { Navigate, useLocation } from "react-router-dom";
/**
 * ProtectedRoute component
 *
 * This component will redirect to the specified redirect path
 * if no token is found in local storage or session storage.
 *
 * @param {JSX.Element} children - The component to render if the user is authenticated.
 * @param {string} redirect - The path to redirect to if the user is not authenticated.
 * @returns {JSX.Element} The component to render.
 */
export default function ProtectedRoute({ children, redirect = "/login" }) {
	const location = useLocation();
	const hasToken =
		localStorage.getItem("token") || sessionStorage.getItem("token");
	if (!hasToken)
		return <Navigate to={redirect} state={{ from: location }} replace />;

	return children;
}
