import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Loading from "../components/UI/Loading";

// Guards
const ProtectedRoute = lazy(() => import("./GuardRoutes/ProtectedRoute"));
const RoleRoute = lazy(() => import("./GuardRoutes/RoleRoute"));
const GuestRoutes = lazy(() => import("./GuardRoutes/GuestRoutes"));

// Layouts
const MainLayout = lazy(() => import("../components/layouts/MainLayout"));
const AuthLayout = lazy(() => import("../components/layouts/AuthLayOut"));
const DashboardLayout = lazy(
	() => import("../components/layouts/DashboardLayout"),
);

// Public Pages
const Home = lazy(() => import("../features/Main/Public/Home"));
const About = lazy(() => import("../features/Main/Public/About"));
const Contact = lazy(() => import("../features/Main/Public/Contact"));

const NotFound = lazy(() => import("../features/Main/Public/NotFound"));
const Unauthorized = lazy(() => import("../features/Main/Public/Unauthorized"));

// Auth Pages
const Register = lazy(() => import("../features/Auth/pages/Register"));
const Login = lazy(() => import("../features/Auth/pages/Login"));
const VerifyEmail = lazy(() => import("../features/Auth/pages/VerifyEmail")); //modal

//modal
const ResetPassword = lazy(
	() => import("../features/Auth/pages/ResetPassword"),
);

// ************************* Talent pages *****************************

// 1- findjob page
const FindJob = lazy(
	() => import("../features/Main/Talent/findJobPage/FindJob"),
);
// 2- job details page
const JobDetails = lazy(() => import("../features/Main/Talent/JobDetails"));
//3- job proposal page
const JobProposal = lazy(() => import("../features/Main/Talent/JobProposal"));
//4- my applications page
const MyApplications = lazy(
	() => import("../features/Main/Talent/MyApplications"),
);
//5- profile page / account
const TalentProfile = lazy(
	() => import("../features/Main/Talent/profile/TalentProfile"),
);

const TalentAccountSettings = lazy(
	() => import("../features/Main/Talent/TalentAccountSettings"),
);

// **************** Employer routes ************************
const EmployerDashboard = lazy(
	() => import("../features/Main/Employer/dashboard/Dashboard"),
);
const EmployerProfile = lazy(
	() => import("../features/Main/Employer/EmployerProfile"),
);

const EmployerAccountSettings = lazy(
	() => import("../features/Main/Employer/AccountSettings"),
);
const PostAJob = lazy(() => import("../features/Main/Employer/PostAJob"));

// Moderator pages
const AdminLogin = lazy(() => import("../features/Main/Moderator/AdminLogin"));
const AdminDashboard = lazy(
	() => import("../features/Main/Moderator/AdminDashboard"),
);

/**
 * AppRoutes is the main routes component of the application.
 * It defines all the routes of the application, including public,
 * auth, talent, employer, and admin routes.
 * It uses the React Router library to define the routes and
 * redirect the user to the correct page based on their role and
 * the current path.
 *
 * @returns {JSX.Element} The AppRoutes component.
 */
export default function AppRoutes() {
	const router = createBrowserRouter([
		// 1) Public routes
		{
			path: "/",
			element: <MainLayout />,
			children: [
				// { index: true, element: <Home /> },
				{ path: "about", element: <About /> },
				{ path: "contact", element: <Contact /> },
			],
		},

		// 2) Auth routes (Guest only)
		{
			path: "",
			element: <GuestRoutes />,
			children: [
				{
					element: <MainLayout />,
					children: [{ index: true, element: <Home /> }],
				},
				{
					element: <AuthLayout />,
					children: [
						{ path: "register", element: <Register /> },
						{ path: "login", element: <Login /> },
						{ path: "verify", element: <VerifyEmail /> },
						{ path: "reset", element: <ResetPassword /> },
					],
				},

				{ path: "unauthorized", element: <Unauthorized /> },
			],
		},

		// 3) Talent routes
		{
			path: "talent",
			element: (
				<ProtectedRoute>
					<RoleRoute allowed={["TALENT"]}>
						<MainLayout />
					</RoleRoute>
				</ProtectedRoute>
			),
			children: [
				{ index: true, element: <FindJob /> },
				{ path: "findjob", element: <FindJob /> },
				{ path: "jobs/:id", element: <JobDetails /> },
				{ path: "jobs/:id/apply", element: <JobProposal /> },
				{ path: "applications", element: <MyApplications /> },
				{ path: "profile", element: <TalentProfile /> },
				{ path: "profile/settings", element: <TalentAccountSettings /> },
			],
		},

		// 4) Employer routes
		{
			path: "employer",
			element: (
				<ProtectedRoute>
					<RoleRoute allowed={["EMPLOYER"]}>
						<MainLayout />
					</RoleRoute>
				</ProtectedRoute>
			),
			children: [
				{ index: true, element: <EmployerDashboard /> },
				{ path: "dashboard", element: <EmployerDashboard /> },

				{ path: "profile", element: <EmployerProfile /> },

				{ path: "profile/settings", element: <EmployerAccountSettings /> },

				{ path: "jobs/new", element: <PostAJob /> },
				//edit job
				{ path: "jobs/:jobId/edit", element: <PostAJob /> },

				{ path: "jobs/:jobId", element: <JobDetails /> },
			],
		},

		// 5) Admin / Moderator
		{
			path: "admin/login",
			element: <AdminLogin />,
		},

		{
			path: "admin/dashboard",
			element: (
				<ProtectedRoute redirect="/admin/login">
					<RoleRoute
						allowed={["MODERATOR", "ADMIN"]}
						redirect="/admin/login"
						forbidden="/unauthorized"
					>
						<DashboardLayout />
					</RoleRoute>
				</ProtectedRoute>
			),
			children: [{ index: true, element: <AdminDashboard /> }],
		},

		// 6) Not Found
		{
			path: "*",
			element: <NotFound />,
		},
	]);

	return (
		<Suspense fallback={<Loading />}>
			<RouterProvider router={router} />
		</Suspense>
	);
}
