import { Routes, Route, NavLink, useNavigate, Navigate } from "react-router-dom";
import { toast } from "sonner";
import Home from "./pages/Home.jsx";
import Login from "./pages/auth/Login.jsx";
import Register from "./pages/auth/Register.jsx";
import ComponentTest from "./pages/ComponentTest.jsx";
import Students from "./pages/Students.jsx";
import Attendance from "./pages/Attendance.jsx";
import AttendanceReport from "./pages/AttendanceReport.jsx";
import bdpamkeLogo from "./artifacts/BDPAmke.avif";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";

const navLinks = [
  { to: "/", label: "Home", end: true },
  { to: "/students", label: "Students" },
  { to: "/attendance", label: "Attendance" },
  { to: "/report", label: "Report" },
];

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success("Signed out.");
    navigate("/login");
  };

  return (
    <nav className="bg-[#0f1117] border-b border-white/10 px-6 py-2 flex items-center gap-6 shadow-lg">
      <img src={bdpamkeLogo} alt="BDPAMKE" className="h-10 w-auto object-contain" />
      {navLinks.map(({ to, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `text-sm font-medium transition-colors ${
              isActive
                ? "text-teal-300 underline underline-offset-4"
                : "text-white/60 hover:text-white"
            }`
          }
        >
          {label}
        </NavLink>
      ))}
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
  return (
    <>
      <Nav />
      <main className="min-h-screen">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register onSubmit={() => { toast.success("Registration submitted!"); }} />} />
          <Route path="/students" element={<ProtectedRoute><Students /></ProtectedRoute>} />
          <Route path="/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
          <Route path="/report" element={<AttendanceReport />} />
          <Route path="/component-test" element={<ComponentTest />} />
        </Routes>
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

