import { useState, useEffect } from "react";
import { format } from "date-fns";
import { RefreshCw, Download } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

export default function AttendanceReport() {
  const [report, setReport]         = useState([]);
  const [totalDates, setTotalDates] = useState([]);
  const [loading, setLoading]       = useState(true);

  async function loadReport() {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/attendance/report");
      setReport(data.report || []);
      setTotalDates(data.totalDates || []);
    } catch {
      toast.error("Failed to load attendance report.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadReport(); }, []);

  const totalTracked = totalDates.length;

  function exportCSV() {
    const sortedDates = [...totalDates].sort();
    const headers = ["Last Name", "First Name", "Grade", "Days Present", "Days Missed", "Attendance Rate", ...sortedDates];
    const rows = report.map(({ student, daysPresent, daysMissed, presentDates }) => {
      const rate = totalTracked === 0 ? "0%" : `${Math.round((daysPresent / totalTracked) * 100)}%`;
      const dateCols = sortedDates.map((d) => (presentDates.includes(d) ? "P" : "A"));
      return [student.lastName, student.firstName, student.grade || "", daysPresent, daysMissed, rate, ...dateCols];
    });
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bdpamke-attendance-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Attendance Report</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {totalTracked} day{totalTracked !== 1 ? "s" : ""} tracked
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadReport} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={exportCSV} disabled={loading || report.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      {!loading && report.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-sm">Total Students</p>
              <p className="text-3xl font-bold">{report.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-sm">Days Tracked</p>
              <p className="text-3xl font-bold">{totalTracked}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-sm">Avg Attendance Rate</p>
              <p className="text-3xl font-bold">
                {totalTracked === 0
                  ? "—"
                  : `${Math.round(
                      (report.reduce((sum, r) => sum + r.daysPresent, 0) /
                        (report.length * totalTracked)) *
                        100
                    )}%`}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main table */}
      <Card>
        <CardHeader>
          <CardTitle>Student Attendance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : report.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No attendance data yet. Take attendance on the Attendance page first.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead className="text-center">Days Present</TableHead>
                    <TableHead className="text-center">Days Missed</TableHead>
                    <TableHead className="w-48">Attendance Rate</TableHead>
                    <TableHead>Dates Present</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.map(({ student, daysPresent, daysMissed, presentDates }) => {
                    const rate =
                      totalTracked === 0
                        ? 0
                        : Math.round((daysPresent / totalTracked) * 100);
                    return (
                      <TableRow key={student._id}>
                        <TableCell className="font-medium">
                          {student.lastName}, {student.firstName}
                        </TableCell>
                        <TableCell>{student.grade || "—"}</TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-green-500 text-white">
                            {daysPresent}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={daysMissed > 0 ? "destructive" : "outline"}
                          >
                            {daysMissed}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={rate} className="h-2 flex-1" />
                            <span className="text-xs font-medium w-10 text-right">
                              {rate}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {presentDates.length === 0 ? (
                              <span className="text-muted-foreground text-xs">None</span>
                            ) : (
                              presentDates
                                .sort()
                                .map((d) => (
                                  <Badge
                                    key={d}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {format(new Date(d + "T00:00:00"), "MMM d")}
                                  </Badge>
                                ))
                            )}
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

      {/* Date legend */}
      {!loading && totalDates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tracked Dates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {totalDates.map((d) => (
                <Badge key={d} variant="outline">
                  {format(new Date(d + "T00:00:00"), "EEE, MMM d yyyy")}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
