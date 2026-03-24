import { useState, useEffect } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import axios from "axios";
import { RefreshCw, Trash2, KeyRound, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ROLE_COLORS = {
  admin:  "bg-purple-100 text-purple-800 border-purple-300",
  viewer: "bg-blue-100  text-blue-800  border-blue-300",
  user:   "bg-gray-100  text-gray-800  border-gray-300",
};

export default function AdminUsers() {
  const [users, setUsers]             = useState([]);
  const [loading, setLoading]         = useState(true);

  // Role change state
  const [roleMap, setRoleMap]         = useState({}); // { id: selectedRole }
  const [savingRole, setSavingRole]   = useState(null);

  // Reset password dialog
  const [resetTarget, setResetTarget] = useState(null); // user object
  const [newPw, setNewPw]             = useState("");
  const [confirmPw, setConfirmPw]     = useState("");
  const [resetting, setResetting]     = useState(false);

  // Delete confirmation dialog
  const [deleteTarget, setDeleteTarget] = useState(null); // user object
  const [deleting, setDeleting]         = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/admin/users");
      setUsers(data);
      const map = {};
      data.forEach((u) => { map[u._id] = u.role; });
      setRoleMap(map);
    } catch {
      toast.error("Failed to load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function saveRole(user) {
    const role = roleMap[user._id];
    if (role === user.role) return;
    setSavingRole(user._id);
    try {
      await axios.patch(`/api/admin/users/${user._id}/role`, { role });
      toast.success(`${user.username} is now ${role}.`);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to update role.");
    } finally {
      setSavingRole(null);
    }
  }

  async function doResetPassword() {
    if (!newPw || newPw.length < 6) { toast.error("Password must be at least 6 characters."); return; }
    if (newPw !== confirmPw)         { toast.error("Passwords do not match.");                return; }
    setResetting(true);
    try {
      const { data } = await axios.post(`/api/admin/users/${resetTarget._id}/reset-password`, { newPassword: newPw });
      toast.success(data.message);
      setResetTarget(null);
      setNewPw("");
      setConfirmPw("");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to reset password.");
    } finally {
      setResetting(false);
    }
  }

  async function doDelete() {
    setDeleting(true);
    try {
      await axios.delete(`/api/admin/users/${deleteTarget._id}`);
      toast.success(`${deleteTarget.username} deleted.`);
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to delete user.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-purple-600" />
            User Management
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {users.length} account{users.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : users.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => {
                    const roleChanged = roleMap[u._id] !== u.role;
                    return (
                      <TableRow key={u._id}>
                        <TableCell className="font-mono font-medium">{u.username}</TableCell>
                        <TableCell className="text-muted-foreground">{u.email || "—"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {/* Show role badge when not admin (admins' role is fixed display) */}
                            <Select
                              value={roleMap[u._id] || u.role}
                              onValueChange={(val) => setRoleMap((m) => ({ ...m, [u._id]: val }))}
                              disabled={u.role === "admin"}
                            >
                              <SelectTrigger className="h-8 w-28 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">admin</SelectItem>
                                <SelectItem value="viewer">viewer</SelectItem>
                                <SelectItem value="user">user</SelectItem>
                              </SelectContent>
                            </Select>
                            {roleChanged && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs px-2 border-teal-500 text-teal-600 hover:bg-teal-50"
                                disabled={savingRole === u._id}
                                onClick={() => saveRole(u)}
                              >
                                {savingRole === u._id ? "Saving…" : "Save"}
                              </Button>
                            )}
                            {!roleChanged && (
                              <Badge className={`text-xs border ${ROLE_COLORS[u.role]}`} variant="outline">
                                {u.role}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {u.createdAt ? format(new Date(u.createdAt), "MMM d, yyyy") : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs gap-1"
                              onClick={() => { setResetTarget(u); setNewPw(""); setConfirmPw(""); }}
                            >
                              <KeyRound className="h-3.5 w-3.5" />
                              Reset PW
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs gap-1 border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-30"
                              disabled={u.role === "admin"}
                              title={u.role === "admin" ? "Admin accounts cannot be deleted" : "Delete user"}
                              onClick={() => setDeleteTarget(u)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Reset Password Dialog ── */}
      <Dialog open={!!resetTarget} onOpenChange={(open) => { if (!open) setResetTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset Password — <span className="font-mono text-purple-700">{resetTarget?.username}</span></DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="rp-new">New Password</Label>
              <Input
                id="rp-new"
                type="password"
                placeholder="At least 6 characters"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="rp-confirm">Confirm Password</Label>
              <Input
                id="rp-confirm"
                type="password"
                placeholder="Repeat new password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            {resetTarget?.email && (
              <p className="text-xs text-muted-foreground bg-blue-50 border border-blue-200 rounded p-2">
                This user's email is <strong>{resetTarget.email}</strong>. All accounts sharing that email will also be updated.
              </p>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={resetting}>Cancel</Button>
            </DialogClose>
            <Button onClick={doResetPassword} disabled={resetting}>
              {resetting ? "Saving…" : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user <span className="font-mono text-red-600">{deleteTarget?.username}</span>?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The account will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={doDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
