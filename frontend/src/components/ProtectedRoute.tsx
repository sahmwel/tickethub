import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: ("organizer" | "admin")[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-smoke gap-2 pt-24">
        <Loader2 className="w-5 h-5 animate-spin" />
        Checking access…
      </div>
    );
  }

  if (!profile || !allowedRoles.includes(profile.role as "organizer" | "admin")) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}