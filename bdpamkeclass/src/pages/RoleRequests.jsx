import { useState, useEffect } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import axios from "axios";
import { RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const STATUS_COLORS = {
  pending:  "bg-yellow-100 text-yellow-800 border-yellow-300",
  approved: "bg-green-100 text-green-800 border-green-300",
  denied:   "bg-red-100 text-red-800 border-red-300",
};

export default function RoleRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [working, setWorking]   = useState(null); // id of request being processed

  async function load() {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/role-requests");
      setRequests(data);
    } catch {
      toast.error("Failed to load role requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function approve(id) {
    setWorking(id);
    try {
      const { data } = await axios.put(`/api/role-requests/${id}/approve`);
      toast.success(`Approved! Username: ${data.username}. Credentials emailed to requester.`);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to approve.");
    } finally {
      setWorking(null);
    }
  }

  async function deny(id) {
    if (!window.confirm("Deny this request?")) return;
    setWorking(id);
    try {
      await axios.put(`/api/role-requests/${id}/deny`);
      toast.success("Request denied.");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to deny.");
    } finally {
      setWorking(null);
    }
  }

  const pending  = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Viewer Role Requests</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {pending} pending request{pending !== 1 ? "s" : ""}
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : requests.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No role requests yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Password</TableHead>
                    <TableHead className="w-28">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((r) => (
                    <TableRow key={r._id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{r.email}</TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">
                        {r.message || "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(r.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium capitalize ${STATUS_COLORS[r.status]}`}>
                          {r.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {r.generatedUsername || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs font-mono">
                        {r.generatedPassword || "—"}
                      </TableCell>
                      <TableCell>
                        {r.status === "pending" && (
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-green-600 hover:text-green-800"
                              disabled={working === r._id}
                              onClick={() => approve(r._id)}
                              title="Approve"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-red-500 hover:text-red-700"
                              disabled={working === r._id}
                              onClick={() => deny(r._id)}
                              title="Deny"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
