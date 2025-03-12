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
    // Skip validation for public routes
    if (publicRoutes.includes(location.pathname)) {
      return;
    }

    const validateSession = async () => {
      try {
        const isValid = await authService.validateSession();
        if (!isValid) {
          logout();
          // Use replace to avoid building up history
          navigate("/login", { 
            replace: true,
            state: { from: location.pathname }
          });
        }
      } catch (error) {
        console.error("Session validation error:", error);
        logout();
        navigate("/login", { 
          replace: true,
          state: { from: location.pathname }
        });
      }
    };

    if (!isAuthenticated) {
      navigate("/login", { 
        replace: true,
        state: { from: location.pathname }
      });
    } else {
      validateSession();
    }
  }, [location.pathname, isAuthenticated, navigate, logout, user]);

  return children;
}
