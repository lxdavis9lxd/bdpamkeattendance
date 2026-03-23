"use strict";
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const { ApiClient } = require("./utils/apiClient");

const app = express();
const PORT = 5000;

// JWT secret — use env var in production
const JWT_SECRET = process.env.JWT_SECRET || "bdpamke_jwt_secret_change_in_prod";
const JWT_EXPIRES_IN = "8h";

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
    programStatus:   { type: String, trim: true },
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

// ── User / Auth Schema ────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema(
  {
    username:     { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role:         { type: String, enum: ["admin", "user", "viewer"], default: "user" },
  },
  { timestamps: true }
);
const User = mongoose.model("User", userSchema);

const roleRequestSchema = new mongoose.Schema(
  {
    name:              { type: String, required: true, trim: true },
    email:             { type: String, required: true, trim: true },
    message:           { type: String, trim: true },
    status:            { type: String, enum: ["pending", "approved", "denied"], default: "pending" },
    reviewedAt:        { type: Date },
    generatedUsername: { type: String },
    generatedPassword: { type: String },
  },
  { timestamps: true }
);
const RoleRequest = mongoose.model("RoleRequest", roleRequestSchema);

// ── Email helper (Gmail OAuth2) ──────────────────────────────────────────────
const ADMIN_EMAIL = "lxdavis9lxd@gmail.com";

function createOAuth2Client() {
  const client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    "https://developers.google.com/oauthplayground"
  );
  client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  return client;
}

async function sendEmail({ to, subject, html }) {
  const required = ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET", "GMAIL_REFRESH_TOKEN", "GMAIL_USER"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.log(`[EMAIL - OAuth2 not configured (missing: ${missing.join(", ")})]
  To: ${to}
  Subject: ${subject}`);
    return;
  }
  const oAuth2Client = createOAuth2Client();
  const { token: accessToken } = await oAuth2Client.getAccessToken();
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: process.env.GMAIL_USER,
      clientId: process.env.GMAIL_CLIENT_ID,
      clientSecret: process.env.GMAIL_CLIENT_SECRET,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN,
      accessToken,
    },
  });
  await transporter.sendMail({ from: process.env.GMAIL_USER, to, subject, html });
}

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());

// ── JWT Auth Middleware ───────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Authentication required." });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

// ── Auth Routes ───────────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 * Body: { username, password }
 * Returns: { token, user: { id, username, role } }
 */
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }
  try {
    const user = await User.findOne({ username: username.trim().toLowerCase() });
    if (!user) return res.status(401).json({ error: "Invalid credentials." });
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials." });
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    return res.json({ token, user: { id: user._id, username: user.username, role: user.role } });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/auth/me
 * Returns current user from token
 */
app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});


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

// ── Role Requests ────────────────────────────────────────────────────────────

// POST /api/role-requests  → submit a viewer access request (public)
app.post("/api/role-requests", async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email) return res.status(400).json({ error: "Name and email are required." });
  try {
    const existing = await RoleRequest.findOne({
      email: email.trim().toLowerCase(),
      status: "pending",
    });
    if (existing) {
      return res.status(409).json({ error: "A pending request already exists for this email." });
    }
    await RoleRequest.create({ name: name.trim(), email: email.trim(), message: message?.trim() });
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: "New Viewer Role Request — BDPAMKE",
      html: `<p><strong>${name}</strong> (${email}) has requested student viewer access.</p>
             <p><strong>Message:</strong> ${message || "(none)"}</p>
             <p>Log in to BDPAMKE Attendance and visit <em>Role Requests</em> to approve or deny.</p>`,
    });
    return res.status(201).json({ message: "Request submitted. You will be notified by email when approved." });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/role-requests  → admin only, list all requests
app.get("/api/role-requests", requireAuth, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admin access required." });
  try {
    const requests = await RoleRequest.find().sort({ createdAt: -1 });
    return res.json(requests);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/role-requests/:id/approve  → admin only
app.put("/api/role-requests/:id/approve", requireAuth, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admin access required." });
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid ID." });
  try {
    const request = await RoleRequest.findById(id);
    if (!request) return res.status(404).json({ error: "Request not found." });
    if (request.status !== "pending") return res.status(400).json({ error: "Request is not pending." });

    // Derive a unique username from the requester's name
    const base = request.name.toLowerCase().replace(/\s+/g, ".").replace(/[^a-z0-9.]/g, "");
    let username = base;
    let counter = 1;
    while (await User.findOne({ username })) username = `${base}${counter++}`;

    const tempPassword = "Viewer_" + Math.random().toString(36).slice(2, 10);
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    await User.create({ username, passwordHash, role: "viewer" });

    request.status = "approved";
    request.reviewedAt = new Date();
    request.generatedUsername = username;
    request.generatedPassword = tempPassword;
    await request.save();

    const loginUrl = process.env.CLIENT_ORIGIN || "http://localhost:3000";

    await sendEmail({
      to: request.email,
      subject: "Your BDPAMKE Student Viewer Access is Approved",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background: #0f1117; padding: 20px 24px;">
            <h2 style="color: #5eead4; margin: 0; font-size: 18px;">BDPAMKE Attendance</h2>
          </div>
          <div style="padding: 24px;">
            <p style="margin-top: 0;">Hi <strong>${request.name}</strong>,</p>
            <p>Your request for <strong>Student Viewer Access</strong> has been approved. You can now log in and view the student roster.</p>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px 20px; margin: 20px 0;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Your Login Credentials</p>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 6px 0; color: #475569; font-size: 14px; width: 120px;">Username:</td>
                  <td style="padding: 6px 0; font-weight: bold; font-size: 14px; font-family: monospace;">${username}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #475569; font-size: 14px;">Password:</td>
                  <td style="padding: 6px 0; font-weight: bold; font-size: 14px; font-family: monospace;">${tempPassword}</td>
                </tr>
              </table>
            </div>

            <p>To log in, visit the application and click <strong>Sign In</strong>, then enter the credentials above.</p>
            <p style="font-size: 13px; color: #64748b;">You will have read-only access to the student roster. If you have any questions, please contact the administrator.</p>
          </div>
          <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 12px 24px;">
            <p style="margin: 0; font-size: 12px; color: #94a3b8;">This is an automated message from BDPAMKE Attendance. Please do not reply to this email.</p>
          </div>
        </div>
      `,
    });

    return res.json({ message: "Approved.", username });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/role-requests/:id/deny  → admin only
app.put("/api/role-requests/:id/deny", requireAuth, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admin access required." });
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid ID." });
  try {
    const request = await RoleRequest.findById(id);
    if (!request) return res.status(404).json({ error: "Request not found." });
    if (request.status !== "pending") return res.status(400).json({ error: "Request is not pending." });
    request.status = "denied";
    request.reviewedAt = new Date();
    await request.save();
    return res.json({ message: "Denied." });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Students ─────────────────────────────────────────────────────────────────

// GET /api/students  → list all students sorted by last name
app.get("/api/students", requireAuth, async (_req, res) => {
  try {
    const students = await Student.find().sort({ lastName: 1, firstName: 1 });
    return res.json(students);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/students  → create a new student
app.post("/api/students", requireAuth, async (req, res) => {
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
app.post("/api/students/bulk", requireAuth, async (req, res) => {
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
app.put("/api/students/:id", requireAuth, async (req, res) => {
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
app.delete("/api/students/:id", requireAuth, async (req, res) => {
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
app.get("/api/attendance/:date", requireAuth, async (req, res) => {
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
app.post("/api/attendance", requireAuth, async (req, res) => {
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
async function ensureAdminAccount() {
  const existing = await User.findOne({ username: "admin" });
  if (!existing) {
    const passwordHash = await bcrypt.hash("Wecanlearn99@", 12);
    await User.create({ username: "admin", passwordHash, role: "admin" });
    console.log("✅ Admin account created (username: admin)");
  }
}

app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  try {
    await ensureAdminAccount();
  } catch (err) {
    console.error("⚠️  Could not ensure admin account:", err.message);
  }
});
