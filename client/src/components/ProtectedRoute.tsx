import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function ProtectedRoute() {
  const { user, profile, status } = useAuthStore();

  if (status !== "ready") {
    return (
      <div className="flex h-screen items-center justify-center text-slate-400">
        Загрузка…
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!profile) return <Navigate to="/onboarding" replace />;

  return <Outlet />;
}
