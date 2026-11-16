"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import Home from "./views/Home.jsx";
import Login from "./views/auth/Login.jsx";
import Register from "./views/auth/Register.jsx";
import ComponentTest from "./views/ComponentTest.jsx";
import Students from "./views/Students.jsx";
import Attendance from "./views/Attendance.jsx";
import AttendanceReport from "./views/AttendanceReport.jsx";
import RoleRequests from "./views/RoleRequests.jsx";
import AdminUsers from "./views/AdminUsers.jsx";
import DatabaseMaintenance from "./views/DatabaseMaintenance.jsx";
import ForgotPassword from "./views/auth/ForgotPassword.jsx";
import bdpamkeLogo from "./artifacts/BDPAmke.avif";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";

const navLinks = [
  { to: "/", label: "Home", end: true },
  { to: "/students", label: "Students" },
  { to: "/attendance", label: "Attendance" },
  { to: "/report", label: "Report" },
];

// Allows admin and viewer roles (or any role if allowedRoles not specified)
function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      router.replace("/");
    }
  }, [allowedRoles, loading, router, user]);

  if (loading || !user) return null;
  if (allowedRoles && !allowedRoles.includes(user.role)) return null;
  return children;
}

function Nav() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    toast.success("Signed out.");
    router.push("/login");
  };

  return (
    <nav className="bg-[#0f1117] border-b border-white/10 px-6 py-2 flex items-center gap-6 shadow-lg">
      <img src={bdpamkeLogo.src} alt="BDPAMKE" className="h-10 w-auto object-contain" />
      {navLinks.map(({ to, label, end }) => (
        <Link
          key={to}
          href={to}
          className={`text-sm font-medium transition-colors ${
            (end ? pathname === to : pathname.startsWith(to))
              ? "text-teal-300 underline underline-offset-4"
              : "text-white/60 hover:text-white"
          }`}
        >
          {label}
        </Link>
      ))}
      {user?.role === "admin" && (
        <>
          <Link
            href="/role-requests"
            className={`text-sm font-medium transition-colors ${
              pathname === "/role-requests"
                ? "text-teal-300 underline underline-offset-4"
                : "text-yellow-400/80 hover:text-yellow-300"
            }`}
          >
            Role Requests
          </Link>
          <Link
            href="/admin/users"
            className={`text-sm font-medium transition-colors ${
              pathname === "/admin/users"
                ? "text-teal-300 underline underline-offset-4"
                : "text-purple-400/80 hover:text-purple-300"
            }`}
          >
            Users
          </Link>
          <Link
            href="/admin/database"
            className={`text-sm font-medium transition-colors ${
              pathname === "/admin/database"
                ? "text-teal-300 underline underline-offset-4"
                : "text-red-400/80 hover:text-red-300"
            }`}
          >
            DB Maintenance
          </Link>
        </>
      )}
      <div className="ml-auto flex items-center gap-3">
        {user && (
          <>
            <span className="text-white/50 text-xs">{user.username}</span>
            <button
              onClick={handleLogout}
              className="text-xs text-white/60 hover:text-red-400 transition-colors border border-white/20 hover:border-red-400/50 px-3 py-1 rounded"
            >
              Sign Out
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

function AppRoutes() {
  const pathname = usePathname();

  let page = <Home />;
  if (pathname === "/login") page = <Login />;
  else if (pathname === "/forgot-password") page = <ForgotPassword />;
  else if (pathname === "/register") page = <Register onSubmit={() => { toast.success("Registration submitted!"); }} />;
  else if (pathname === "/students") page = <ProtectedRoute allowedRoles={["admin", "viewer"]}><Students /></ProtectedRoute>;
  else if (pathname === "/attendance") page = <ProtectedRoute allowedRoles={["admin"]}><Attendance /></ProtectedRoute>;
  else if (pathname === "/report") page = <AttendanceReport />;
  else if (pathname === "/role-requests") page = <ProtectedRoute allowedRoles={["admin"]}><RoleRequests /></ProtectedRoute>;
  else if (pathname === "/admin/users") page = <ProtectedRoute allowedRoles={["admin"]}><AdminUsers /></ProtectedRoute>;
  else if (pathname === "/admin/database") page = <ProtectedRoute allowedRoles={["admin"]}><DatabaseMaintenance /></ProtectedRoute>;
  else if (pathname === "/component-test") page = <ComponentTest />;

  return (
    <>
      <Nav />
      <main className="min-h-screen">
        {page}
      </main>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

