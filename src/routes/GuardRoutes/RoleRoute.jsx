import { Navigate, Outlet, useLocation } from "react-router-dom";
import Loading from "../../components/UI/Loading";
import { useAuth } from "../../hooks/useAuth";
/**
 * RoleRoute component is a protected route that checks if the user is logged in and has the right role to access the route.
 * If the user is not logged in, it redirects to the redirect path.
 * If the user is logged in but does not have the right role, it redirects to the forbidden path.
 * If the user is logged in and has the right role, it renders the children component.
 * @param {allowed} array of roles that are allowed to access the route
 * @param {redirect} path to redirect to if the user is not logged in
 * @param {forbidden} path to redirect to if the user is logged in but does not have the right role
 * @param {children} component to render if the user is logged in and has the right role
 */
export default function RoleRoute({
	allowed = [],
	redirect = "/",
	forbidden = "/unauthorized",
	children,
}) {
	const { token, currentUser } = useAuth();
	const location = useLocation();

	// Not logged in
	if (!token) {
		return <Navigate to={redirect} state={{ from: location }} replace />;
	}

	//token exist but no current user -> user not loaded yet => wait no direct
	if (!currentUser) {
		return <Loading />;
	}

	// Logged in but not allowed
	if (!allowed.includes(currentUser.role)) {
		return <Navigate to={forbidden} replace />;
	}

	// Allowed
	return children || <Outlet />;
}
