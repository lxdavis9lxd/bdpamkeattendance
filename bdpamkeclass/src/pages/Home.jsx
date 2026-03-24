import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import axios from "axios";

function ViewerRequestForm() {
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [login, setLogin]       = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage]   = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required.");
      return;
    }
    if (!login.trim() || !password.trim()) {
      toast.error("Login and password are required.");
      return;
    }
    setLoading(true);
    try {
      await axios.post("/api/role-requests", {
        name: name.trim(),
        email: email.trim(),
        login: login.trim(),
        password: password.trim(),
        message: message.trim(),
      });
      setSubmitted(true);
      toast.success("Request submitted! You will be notified by email when approved.");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to submit request.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <p className="text-green-600 font-medium text-sm">
        ✅ Your request has been submitted. You will receive an email confirmation once approved.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 mt-2">
      <div className="space-y-1">
        <Label htmlFor="req-name">Full Name *</Label>
        <Input id="req-name" placeholder="Jane Doe" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="req-email">Email Address *</Label>
        <Input id="req-email" type="email" placeholder="jane@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="req-login">Desired Login *</Label>
        <Input id="req-login" placeholder="jane.doe" value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="off" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="req-password">Desired Password *</Label>
        <Input id="req-password" type="password" placeholder="Choose a password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="req-msg">Reason for Access</Label>
        <Textarea id="req-msg" placeholder="Briefly describe why you need access…" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Submitting…" : "Request Viewer Access"}
      </Button>
    </form>
  );
}

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canRequest = !user || (user.role !== "admin" && user.role !== "viewer");

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
      <h1 className="text-4xl font-bold tracking-tight">
        Welcome to BDPAMKE Attendance
      </h1>
      <p className="mt-4 text-muted-foreground text-lg max-w-lg">
        {user
          ? `Signed in as ${user.username} (${user.role}). Use the navigation above to manage students, take attendance, or view reports.`
          : "You are browsing as a guest."}
      </p>

      <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-3xl text-left">
        <Card className={user?.role === "admin" || user?.role === "viewer" ? "" : "opacity-50"}>
          <CardHeader>
            <CardTitle className="text-base">📋 Students</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Requires <span className="font-semibold text-foreground">admin or viewer</span> login to view student records.
          </CardContent>
        </Card>

        <Card className={user?.role === "admin" ? "" : "opacity-50"}>
          <CardHeader>
            <CardTitle className="text-base">✅ Attendance</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Requires <span className="font-semibold text-foreground">admin</span> login to take or edit attendance.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">📊 Report</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Available to <span className="font-semibold text-foreground">all visitors</span>. No login required.
          </CardContent>
        </Card>
      </div>

      {!user && (
        <div className="mt-8 flex gap-4">
          <Button onClick={() => navigate("/login")}>Sign In</Button>
          <Button variant="outline" onClick={() => navigate("/report")}>View Report as Guest</Button>
        </div>
      )}

      {canRequest && (
        <div className="mt-10 w-full max-w-md text-left">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">🔒 Request Student Viewer Access</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p className="mb-2">Need read-only access to the student roster? Submit a request below and an admin will review it.</p>
              <ViewerRequestForm />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

