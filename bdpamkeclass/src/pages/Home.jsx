import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
      <h1 className="text-4xl font-bold tracking-tight">
        Welcome to BDPAMKE Attendance
      </h1>
      <p className="mt-4 text-muted-foreground text-lg max-w-lg">
        {user
          ? `Signed in as ${user.username}. Use the navigation above to manage students, take attendance, or view reports.`
          : "You are browsing as a guest."}
      </p>

      <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-3xl text-left">
        <Card className="opacity-50">
          <CardHeader>
            <CardTitle className="text-base">📋 Students</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Requires <span className="font-semibold text-foreground">admin</span> login to view or manage student records.
          </CardContent>
        </Card>

        <Card className="opacity-50">
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
          <Button onClick={() => navigate("/login")}>Sign In as Admin</Button>
          <Button variant="outline" onClick={() => navigate("/report")}>View Report as Guest</Button>
        </div>
      )}
    </div>
  );
}

