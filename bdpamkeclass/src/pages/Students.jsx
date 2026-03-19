import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { UserPlus, Trash2, Pencil } from "lucide-react";

// Shared form used for both Add and Edit
function StudentForm({ defaultValues, onSuccess }) {
  const isEdit = !!defaultValues;
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    defaultValues: defaultValues || {},
  });

  async function onSubmit(data) {
    try {
      if (isEdit) {
        await axios.put(`/api/students/${defaultValues._id}`, data);
        toast.success("Student updated successfully!");
      } else {
        await axios.post("/api/students", data);
        toast.success("Student added successfully!");
        reset();
      }
      onSuccess();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to save student.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            {...register("firstName", { required: "First name is required" })}
            placeholder="Jane"
          />
          {errors.firstName && (
            <p className="text-xs text-red-500">{errors.firstName.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            {...register("lastName", { required: "Last name is required" })}
            placeholder="Doe"
          />
          {errors.lastName && (
            <p className="text-xs text-red-500">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" {...register("phone")} placeholder="(555) 000-1234" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register("email")} placeholder="jane@example.com" />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="grade">Grade</Label>
        <Input id="grade" {...register("grade")} placeholder="e.g. 8th" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="parentName">Parent / Guardian Name</Label>
          <Input id="parentName" {...register("parentName")} placeholder="John Doe" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="parentPhone">Parent / Guardian Phone</Label>
          <Input id="parentPhone" {...register("parentPhone")} placeholder="(555) 000-5678" />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : isEdit ? "Save Changes" : "Add Student"}
      </Button>
    </form>
  );
}

export default function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editStudent, setEditStudent] = useState(null); // student being edited

  async function loadStudents() {
    try {
      const { data } = await axios.get("/api/students");
      setStudents(data);
    } catch {
      toast.error("Failed to load students.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadStudents(); }, []);

  async function deleteStudent(id, name) {
    if (!window.confirm(`Remove ${name}? This cannot be undone.`)) return;
    try {
      await axios.delete(`/api/students/${id}`);
      toast.success(`${name} removed.`);
      loadStudents();
    } catch {
      toast.error("Failed to delete student.");
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Students</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Student
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Student</DialogTitle>
            </DialogHeader>
            <StudentForm
              onSuccess={() => {
                setDialogOpen(false);
                loadStudents();
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Edit dialog — opened programmatically, no trigger */}
        <Dialog open={!!editStudent} onOpenChange={(open) => { if (!open) setEditStudent(null); }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Student</DialogTitle>
            </DialogHeader>
            {editStudent && (
              <StudentForm
                defaultValues={editStudent}
                onSuccess={() => {
                  setEditStudent(null);
                  loadStudents();
                }}
              />
            )}
          </DialogContent>
        </Dialog>

      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student Roster ({students.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : students.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No students yet. Click "Add Student" to get started.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Parent / Guardian</TableHead>
                    <TableHead>Parent Phone</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((s) => (
                    <TableRow key={s._id}>
                      <TableCell className="font-medium">
                        {s.lastName}, {s.firstName}
                      </TableCell>
                      <TableCell>{s.grade || "—"}</TableCell>
                      <TableCell>{s.phone || "—"}</TableCell>
                      <TableCell>{s.email || "—"}</TableCell>
                      <TableCell>{s.parentName || "—"}</TableCell>
                      <TableCell>{s.parentPhone || "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-blue-500 hover:text-blue-700"
                            onClick={() => setEditStudent(s)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-700"
                            onClick={() =>
                              deleteStudent(s._id, `${s.firstName} ${s.lastName}`)
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
