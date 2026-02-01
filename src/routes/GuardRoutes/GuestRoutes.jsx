import { Navigate, Outlet, useLocation } from "react-router-dom";
import Loading from "../../components/UI/Loading";
import { useAuth } from "../../hooks/useAuth";

/**
 * GuestRoute component to protect routes from unauthorized access.
 * If the user is authenticated and has a current user, it shows a loading
 * screen. If the user is authenticated but has no current user, it redirects
 * to the original route if available, or to the homepage otherwise. If the user
 * is not authenticated, it renders the outlet (i.e. the route's children).
 */
export default function GuestRoute() {
	const { token, currentUser } = useAuth();
	const location = useLocation();

	if (token && currentUser) return <Loading />;
	if (currentUser) {
		return <Navigate to={location.state?.from?.pathname || "/"} replace />;
	}

	return <Outlet />;
}
