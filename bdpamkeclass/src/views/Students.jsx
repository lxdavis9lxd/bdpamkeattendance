import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { UserPlus, Trash2, Pencil } from "lucide-react";

const PROGRAM_STATUS_OPTIONS = ["Active", "Inactive", "Graduated", "Withdrawn", "Pending"];

function Field({ label, id, reg, error, type = "text", placeholder }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} {...reg} placeholder={placeholder} />
      {error && <p className="text-xs text-red-500">{error.message}</p>}
    </div>
  );
}

function StudentForm({ defaultValues, onSuccess }) {
  const isEdit = !!defaultValues;
  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm({
    defaultValues: defaultValues || {},
  });

  async function onSubmit(data) {
    try {
      if (isEdit) {
        await axios.put(`/api/students/${defaultValues._id}`, data);
        toast.success("Student updated!");
      } else {
        await axios.post("/api/students", data);
        toast.success("Student added!");
        reset();
      }
      onSuccess();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to save student.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Student Info</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="First Name *" id="firstName" reg={register("firstName", { required: "Required" })} error={errors.firstName} placeholder="Jane" />
          <Field label="Last Name *"  id="lastName"  reg={register("lastName",  { required: "Required" })} error={errors.lastName}  placeholder="Doe" />
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <Field label="Date of Birth"   id="dateOfBirth" reg={register("dateOfBirth")} placeholder="MM/DD/YYYY" />
          <Field label="Grade in School" id="grade"       reg={register("grade")}       placeholder="e.g. 8th" />
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <Field label="School"     id="school"    reg={register("school")}    placeholder="School name" />
          <Field label="Shirt Size" id="shirtSize" reg={register("shirtSize")} placeholder="S / M / L / XL" />
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Contact</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cell Phone" id="cellPhone" reg={register("cellPhone")} placeholder="(414) 000-1234" />
          <Field label="Home Phone" id="homePhone" reg={register("homePhone")} placeholder="(414) 000-5678" />
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <Field label="Email" id="email" type="email" reg={register("email")} placeholder="jane@example.com" />
          <Field label="Laptop Number" id="laptopNumber" reg={register("laptopNumber")} placeholder="e.g. 3" />
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Address</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Address 1" id="address1" reg={register("address1")} placeholder="123 Main St" />
          <Field label="Address 2" id="address2" reg={register("address2")} placeholder="City, ST ZIP" />
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Program</p>
        <div className="space-y-1">
          <Label htmlFor="programStatus">Program Status</Label>
          <Controller
            name="programStatus"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value || ""}>
                <SelectTrigger id="programStatus">
                  <SelectValue placeholder="Select status…" />
                </SelectTrigger>
                <SelectContent>
                  {PROGRAM_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Parent / Guardian</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Parent First Name" id="parentFirstName" reg={register("parentFirstName")} placeholder="John" />
          <Field label="Parent Last Name"  id="parentLastName"  reg={register("parentLastName")}  placeholder="Doe" />
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <Field label="Parent Cell Phone" id="parentCellPhone" reg={register("parentCellPhone")} placeholder="(414) 000-9999" />
          <Field label="Parent Email"      id="parentEmail"     reg={register("parentEmail")} type="email" placeholder="parent@example.com" />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : isEdit ? "Save Changes" : "Add Student"}
      </Button>
    </form>
  );
}

export default function Students() {
  const { user } = useAuth();
  const isViewer = user?.role === "viewer";
  const [students, setStudents]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [dialogOpen, setDialogOpen]   = useState(false);
  const [editStudent, setEditStudent] = useState(null);

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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Students</h1>
        {!isViewer && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Student
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Student</DialogTitle>
            </DialogHeader>
            <StudentForm onSuccess={() => { setDialogOpen(false); loadStudents(); }} />
          </DialogContent>
        </Dialog>
        )}

        {!isViewer && (
          <Dialog open={!!editStudent} onOpenChange={(open) => { if (!open) setEditStudent(null); }}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Student</DialogTitle>
            </DialogHeader>
            {editStudent && (
              <StudentForm
                defaultValues={editStudent}
                onSuccess={() => { setEditStudent(null); loadStudents(); }}
              />
            )}
          </DialogContent>
        </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student Roster ({students.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : students.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No students yet. Click "Add Student" to get started.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="text-xs whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>First Name</TableHead>
                    <TableHead>Last Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Laptop #</TableHead>
                    <TableHead>Cell Phone</TableHead>
                    <TableHead>Home Phone</TableHead>
                    <TableHead>Date of Birth</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>School</TableHead>
                    <TableHead>Shirt</TableHead>
                    <TableHead>Parent First</TableHead>
                    <TableHead>Parent Last</TableHead>
                    <TableHead>Parent Cell</TableHead>
                    <TableHead>Parent Email</TableHead>
                    <TableHead>Address 1</TableHead>
                    <TableHead>Address 2</TableHead>
                    <TableHead>Program Status</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((s) => (
                    <TableRow key={s._id}>
                      <TableCell>{s.firstName}</TableCell>
                      <TableCell>{s.lastName}</TableCell>
                      <TableCell>{s.email || "—"}</TableCell>
                      <TableCell>{s.laptopNumber || "—"}</TableCell>
                      <TableCell>{s.cellPhone || "—"}</TableCell>
                      <TableCell>{s.homePhone || "—"}</TableCell>
                      <TableCell>{s.dateOfBirth || "—"}</TableCell>
                      <TableCell>{s.grade || "—"}</TableCell>
                      <TableCell>{s.school || "—"}</TableCell>
                      <TableCell>{s.shirtSize || "—"}</TableCell>
                      <TableCell>{s.parentFirstName || "—"}</TableCell>
                      <TableCell>{s.parentLastName || "—"}</TableCell>
                      <TableCell>{s.parentCellPhone || "—"}</TableCell>
                      <TableCell>{s.parentEmail || "—"}</TableCell>
                      <TableCell>{s.address1 || "—"}</TableCell>
                      <TableCell>{s.address2 || "—"}</TableCell>
                      <TableCell>{s.programStatus || "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-7 w-7 ${isViewer ? "text-gray-300 cursor-not-allowed" : "text-blue-500 hover:text-blue-700"}`}
                            onClick={() => !isViewer && setEditStudent(s)}
                            disabled={isViewer}
                            title={isViewer ? "View only — editing disabled" : "Edit student"}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-7 w-7 ${isViewer ? "text-gray-300 cursor-not-allowed" : "text-red-500 hover:text-red-700"}`}
                            onClick={() => !isViewer && deleteStudent(s._id, `${s.firstName} ${s.lastName}`)}
                            disabled={isViewer}
                            title={isViewer ? "View only — deletion disabled" : "Delete student"}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

