import { Routes, Route, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Home from "./pages/Home.jsx";
import Login from "./pages/auth/Login.jsx";
import Register from "./pages/auth/Register.jsx";
import ComponentTest from "./pages/ComponentTest.jsx";

export default function App() {
  const navigate = useNavigate();

  return (
    <Routes>
      <Route path="/" element={<Home />} />
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
  );
}
