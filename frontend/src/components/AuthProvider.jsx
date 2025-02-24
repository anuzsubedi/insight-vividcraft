import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useAuthState from "../hooks/useAuthState";
import { authService } from "../services/authService";

const publicRoutes = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
];

export default function AuthProvider({ children }) {
  const { user, isAuthenticated, logout } = useAuthState();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const validateSession = async () => {
      try {
        const isValid = await authService.validateSession();
        if (!isValid && !publicRoutes.includes(location.pathname)) {
          logout();
          navigate("/login");
        }
      } catch (error) {
        console.error("Session validation error:", error);
      }
    };

    if (!isAuthenticated && !publicRoutes.includes(location.pathname)) {
      navigate("/login");
    } else if (isAuthenticated) {
      validateSession();
    }
  }, [location.pathname]);

  return children;
}
