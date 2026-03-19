import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { CalendarIcon, Save } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function Attendance() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [students, setStudents]         = useState([]);
  const [present, setPresent]           = useState({}); // { studentId: boolean }
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingSession, setLoadingSession]   = useState(false);
  const [saving, setSaving]             = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Load full student roster once
  useEffect(() => {
    axios
      .get("/api/students")
      .then(({ data }) => setStudents(data))
      .catch(() => toast.error("Failed to load students."))
      .finally(() => setLoadingStudents(false));
  }, []);

  // Load saved attendance whenever the date changes
  const loadSession = useCallback(async (date) => {
    setLoadingSession(true);
    const dateStr = format(date, "yyyy-MM-dd");
    try {
      const { data } = await axios.get(`/api/attendance/${dateStr}`);
      const map = {};
      (data.records || []).forEach((r) => {
        map[r.studentId] = r.present;
      });
      setPresent(map);
    } catch {
      toast.error("Failed to load attendance for this date.");
    } finally {
      setLoadingSession(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDate) loadSession(selectedDate);
  }, [selectedDate, loadSession]);

  function togglePresent(studentId) {
    setPresent((prev) => ({ ...prev, [studentId]: !prev[studentId] }));
  }

  function markAll(value) {
    const map = {};
    students.forEach((s) => (map[s._id] = value));
    setPresent(map);
  }

  async function saveAttendance() {
    setSaving(true);
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const records = students.map((s) => ({
      studentId: s._id,
      present:   !!present[s._id],
    }));
    try {
      await axios.post("/api/attendance", { date: dateStr, records });
      toast.success(`Attendance saved for ${format(selectedDate, "MMMM d, yyyy")}`);
    } catch {
      toast.error("Failed to save attendance.");
    } finally {
      setSaving(false);
    }
  }

  const presentCount = students.filter((s) => !!present[s._id]).length;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Attendance</h1>

      {/* Date picker */}
      <div className="flex items-center gap-4">
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-56 justify-start text-left">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => {
                if (d) {
                  setSelectedDate(d);
                  setCalendarOpen(false);
                }
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <Badge variant="outline">
          {presentCount} / {students.length} present
        </Badge>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>
            {selectedDate
              ? format(selectedDate, "EEEE, MMMM d, yyyy")
              : "Select a date"}
          </CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => markAll(true)}>
              All Present
            </Button>
            <Button size="sm" variant="outline" onClick={() => markAll(false)}>
              Clear All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingStudents || loadingSession ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : students.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No students found. Add students on the Students page first.
            </p>
          ) : (
            <ul className="divide-y">
              {students.map((s) => (
                <li
                  key={s._id}
                  className={`flex items-center gap-4 py-3 px-2 rounded transition-colors ${
                    present[s._id] ? "bg-green-50 dark:bg-green-950/30" : ""
                  }`}
                >
                  <Checkbox
                    id={`student-${s._id}`}
                    checked={!!present[s._id]}
                    onCheckedChange={() => togglePresent(s._id)}
                  />
                  <Label
                    htmlFor={`student-${s._id}`}
                    className="flex-1 cursor-pointer font-medium select-none"
                  >
                    {s.lastName}, {s.firstName}
                  </Label>
                  <span className="text-sm text-muted-foreground">
                    Grade {s.grade || "—"}
                  </span>
                  {present[s._id] && (
                    <Badge className="bg-green-500 text-white text-xs">Present</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Button
        className="w-full"
        onClick={saveAttendance}
        disabled={saving || students.length === 0}
      >
        <Save className="mr-2 h-4 w-4" />
        {saving ? "Saving…" : "Save Attendance"}
      </Button>
    </div>
  );
}
