import { Routes, Route, NavLink, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Home from "./pages/Home.jsx";
import Login from "./pages/auth/Login.jsx";
import Register from "./pages/auth/Register.jsx";
import ComponentTest from "./pages/ComponentTest.jsx";
import Students from "./pages/Students.jsx";
import Attendance from "./pages/Attendance.jsx";
import AttendanceReport from "./pages/AttendanceReport.jsx";
import bdpamkeLogo from "./artifacts/BDPAmke.avif";

const navLinks = [
  { to: "/", label: "Home", end: true },
  { to: "/students", label: "Students" },
  { to: "/attendance", label: "Attendance" },
  { to: "/report", label: "Report" },
];

function Nav() {
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
    </nav>
  );
}

export default function App() {
  const navigate = useNavigate();

  return (
    <>
      <Nav />
      <main className="min-h-screen">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/students" element={<Students />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/report" element={<AttendanceReport />} />
          <Route
            path="/login"
            element={
              <Login
                onSubmit={() => {
                  toast.success("Login submitted!");
                  navigate("/");
                }}
              />
            }
          />
          <Route
            path="/register"
            element={
              <Register
                onSubmit={() => {
                  toast.success("Registration submitted!");
                  navigate("/");
                }}
              />
            }
          />
          <Route path="/component-test" element={<ComponentTest />} />
        </Routes>
      </main>
    </>
  );
}

