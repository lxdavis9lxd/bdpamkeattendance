"use strict";
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { ApiClient } = require("./utils/apiClient");

const app = express();
const PORT = 5000;

// ── MongoDB connection ────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/bdpamke_student";

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected to bdpamke_student"))
  .catch((err) => console.error("❌ MongoDB connection error:", err.message));

// ── Mongoose Schemas ──────────────────────────────────────────────────────────
const studentSchema = new mongoose.Schema(
  {
    firstName:       { type: String, required: true, trim: true },
    lastName:        { type: String, required: true, trim: true },
    email:           { type: String, trim: true },
    laptopNumber:    { type: String, trim: true },
    cellPhone:       { type: String, trim: true },
    homePhone:       { type: String, trim: true },
    dateOfBirth:     { type: String, trim: true },
    grade:           { type: String, trim: true },
    school:          { type: String, trim: true },
    shirtSize:       { type: String, trim: true },
    parentFirstName: { type: String, trim: true },
    parentLastName:  { type: String, trim: true },
    parentCellPhone: { type: String, trim: true },
    parentEmail:     { type: String, trim: true },
    address1:        { type: String, trim: true },
    address2:        { type: String, trim: true },
  },
  { timestamps: true }
);

const attendanceRecordSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    present:   { type: Boolean, default: false },
  },
  { _id: false }
);

const attendanceSchema = new mongoose.Schema(
  {
    date:    { type: String, required: true, unique: true }, // "YYYY-MM-DD"
    records: [attendanceRecordSchema],
  },
  { timestamps: true }
);

const Student    = mongoose.model("Student",    studentSchema);
const Attendance = mongoose.model("Attendance", attendanceSchema);

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());

// ── Password routes ─────────────────────────────────────────────────────────

/**
 * POST /api/auth/hash
 * Body: { password: string }
 * Returns: { hash: string }
 */
app.post("/api/auth/hash", async (req, res) => {
  const { password } = req.body;
  if (!password || typeof password !== "string" || password.trim() === "") {
    return res.status(400).json({ error: "Password must be a non-empty string." });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    return res.json({ hash });
  } catch (err) {
    return res.status(500).json({ error: "Failed to hash password." });
  }
});

/**
 * POST /api/auth/verify
 * Body: { password: string, hash: string }
 * Returns: { valid: boolean }
 */
app.post("/api/auth/verify", async (req, res) => {
  const { password, hash } = req.body;
  if (!password || typeof password !== "string") {
    return res.status(400).json({ error: "Password must be a non-empty string." });
  }
  if (!hash || typeof hash !== "string") {
    return res.status(400).json({ error: "Hash must be a valid string." });
  }
  try {
    const valid = await bcrypt.compare(password, hash);
    return res.json({ valid });
  } catch (err) {
    return res.status(500).json({ error: "Failed to verify password." });
  }
});

// ── Generic external-API proxy ───────────────────────────────────────────────
// Forwards GET /api/proxy?url=<encoded-url> to an external service.
// Use for fetching third-party data server-side to avoid CORS issues.
app.get("/api/proxy", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).json({ error: "Missing required query param: url" });
  }
  try {
    const client = new ApiClient("");
    const result = await client.getAll(targetUrl);
    if (!result.success) {
      return res.status(502).json({ error: result.error });
    }
    return res.json(result.data);
  } catch (err) {
    return res.status(500).json({ error: "Proxy request failed." });
  }
});

// ── Students ─────────────────────────────────────────────────────────────────

// GET /api/students  → list all students sorted by last name
app.get("/api/students", async (_req, res) => {
  try {
    const students = await Student.find().sort({ lastName: 1, firstName: 1 });
    return res.json(students);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/students  → create a new student
app.post("/api/students", async (req, res) => {
  const fields = req.body;
  if (!fields.firstName || !fields.lastName) {
    return res.status(400).json({ error: "firstName and lastName are required." });
  }
  try {
    const student = await Student.create(fields);
    return res.status(201).json(student);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/students/bulk  → insert multiple students (seed / import)
app.post("/api/students/bulk", async (req, res) => {
  const { students } = req.body;
  if (!Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ error: "students must be a non-empty array." });
  }
  try {
    const inserted = await Student.insertMany(students, { ordered: false });
    return res.status(201).json({ inserted: inserted.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/students/:id  → update a student
app.put("/api/students/:id", async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid student ID." });
  }
  const fields = req.body;
  if (!fields.firstName || !fields.lastName) {
    return res.status(400).json({ error: "firstName and lastName are required." });
  }
  try {
    const updated = await Student.findByIdAndUpdate(
      id,
      fields,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ error: "Student not found." });
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/students/:id  → remove a student
app.delete("/api/students/:id", async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid student ID." });
  }
  try {
    const result = await Student.findByIdAndDelete(id);
    if (!result) return res.status(404).json({ error: "Student not found." });
    // Remove that student from all attendance records
    await Attendance.updateMany({}, { $pull: { records: { studentId: new mongoose.Types.ObjectId(id) } } });
    return res.json({ message: "Student deleted." });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Attendance ────────────────────────────────────────────────────────────────

// GET /api/attendance/report  → summary for every student
// Returns: [{ student, daysPresent, daysMissed, attendanceDates }]
app.get("/api/attendance/report", async (_req, res) => {
  try {
    const [students, sessions] = await Promise.all([
      Student.find().sort({ lastName: 1, firstName: 1 }),
      Attendance.find(),
    ]);

    const totalDates = sessions.map((s) => s.date).sort();

    const report = students.map((student) => {
      const presentDates = [];
      for (const session of sessions) {
        const rec = session.records.find((r) => r.studentId.toString() === student._id.toString());
        if (rec && rec.present) presentDates.push(session.date);
      }
      return {
        student,
        daysPresent: presentDates.length,
        daysMissed:  totalDates.length - presentDates.length,
        presentDates,
        totalTrackedDays: totalDates.length,
      };
    });

    return res.json({ report, totalDates });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/attendance/:date  → attendance record for a specific date (YYYY-MM-DD)
app.get("/api/attendance/:date", async (req, res) => {
  const { date } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: "Date must be in YYYY-MM-DD format." });
  }
  try {
    const session = await Attendance.findOne({ date });
    return res.json(session || { date, records: [] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/attendance  → save (upsert) attendance for a date
// Body: { date: "YYYY-MM-DD", records: [{ studentId, present }] }
app.post("/api/attendance", async (req, res) => {
  const { date, records } = req.body;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: "date (YYYY-MM-DD) is required." });
  }
  if (!Array.isArray(records)) {
    return res.status(400).json({ error: "records must be an array." });
  }
  try {
    const session = await Attendance.findOneAndUpdate(
      { date },
      { date, records },
      { upsert: true, new: true }
    );
    return res.json(session);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Health check ─────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
