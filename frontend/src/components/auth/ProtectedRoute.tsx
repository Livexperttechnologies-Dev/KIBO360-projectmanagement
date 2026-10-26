import React from "react";
import { Navigate, useLocation, Link } from "react-router-dom";
import { useAuth, Role } from "../../contexts/AuthContext";
import { Spinner } from "../ui/Spinner";
import { ShieldAlert, ArrowLeft, LogOut } from "lucide-react";
import { Button } from "../ui/Button";

interface ProtectedRouteProps {
  children?: React.ReactNode;
  allowedRoles?: Role[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F9FC]">
        <div className="text-center space-y-3">
          <Spinner size="lg" variant="brand" />
          <p className="text-xs font-semibold text-slate-500">Authenticating session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center text-center px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-pink-50 text-[#E81778] mb-4 border border-[#E81778]/20">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-900">Restricted Administration Access</h3>
        <p className="mt-2 text-xs text-slate-500 max-w-md leading-relaxed">
          Your current account role (<strong>{user.role}</strong>) does not have authorization to view this module. Access is restricted to <strong>{allowedRoles.join(", ")}</strong>.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Link to="/dashboard">
            <Button variant="primary" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Return to Dashboard
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => logout()}
            leftIcon={<LogOut className="h-4 w-4" />}
          >
            Switch Account
          </Button>
        </div>
      </div>
    );
  }

  return children ? <>{children}</> : null;
};