"use strict";
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Resend } = require("resend");
const { ApiClient } = require("./utils/apiClient");
const { db, dbFile } = require("./sqlite");

const app = express();
const PORT = Number(process.env.PORT || 5000);
const JWT_SECRET = process.env.JWT_SECRET || "bdpamke_jwt_secret_change_in_prod";
const JWT_EXPIRES_IN = "8h";
const ADMIN_EMAIL = "lxdavis9lxd@gmail.com";

const STUDENT_FIELDS = [
  "firstName", "lastName", "email", "laptopNumber", "cellPhone", "homePhone",
  "dateOfBirth", "grade", "school", "shirtSize", "parentFirstName", "parentLastName",
  "parentCellPhone", "parentEmail", "address1", "address2", "programStatus",
];

const nowIso = () => new Date().toISOString();
const newId = () => crypto.randomUUID();

function asOptionalText(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized === "" ? null : normalized;
}

function asRequiredText(value) {
  const normalized = asOptionalText(value);
  return normalized || null;
}

function asEmail(value) {
  const normalized = asOptionalText(value);
  return normalized ? normalized.toLowerCase() : null;
}

function asUsername(value) {
  const normalized = asOptionalText(value);
  return normalized ? normalized.toLowerCase() : null;
}

function asDbBool(value) {
  return value ? 1 : 0;
}

function isValidId(value) {
  return typeof value === "string" && value.trim() !== "";
}

function mapStudent(row) {
  if (!row) return null;
  return {
    _id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    laptopNumber: row.laptop_number,
    cellPhone: row.cell_phone,
    homePhone: row.home_phone,
    dateOfBirth: row.date_of_birth,
    grade: row.grade,
    school: row.school,
    shirtSize: row.shirt_size,
    parentFirstName: row.parent_first_name,
    parentLastName: row.parent_last_name,
    parentCellPhone: row.parent_cell_phone,
    parentEmail: row.parent_email,
    address1: row.address1,
    address2: row.address2,
    programStatus: row.program_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapUser(row) {
  if (!row) return null;
  return {
    _id: row.id,
    username: row.username,
    role: row.role,
    email: row.email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRoleRequest(row) {
  if (!row) return null;
  return {
    _id: row.id,
    name: row.name,
    email: row.email,
    message: row.message,
    requestedUsername: row.requested_username,
    requestedPassword: row.requested_password,
    status: row.status,
    reviewedAt: row.reviewed_at,
    generatedUsername: row.generated_username,
    generatedPassword: row.generated_password,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAttendanceSession(sessionRow, recordRows) {
  if (!sessionRow) return null;
  return {
    _id: String(sessionRow.id),
    date: sessionRow.date,
    records: recordRows.map((r) => ({
      studentId: r.student_id,
      present: !!r.present,
    })),
    createdAt: sessionRow.created_at,
    updatedAt: sessionRow.updated_at,
  };
}

function getStudentInput(payload) {
  const student = {};
  for (const field of STUDENT_FIELDS) student[field] = asOptionalText(payload[field]);
  student.firstName = asRequiredText(payload.firstName);
  student.lastName = asRequiredText(payload.lastName);
  return student;
}

async function sendEmail({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[EMAIL - Resend not configured (missing RESEND_API_KEY)]\n  To: ${to}\n  Subject: ${subject}`);
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM || `BDPAMKE Attendance <${ADMIN_EMAIL}>`,
    to,
    subject,
    html,
  });
  if (error) throw new Error(error.message);
}

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Authentication required." });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admin access required." });
  return next();
}

app.post("/api/auth/login", async (req, res) => {
  const username = asUsername(req.body.username);
  const password = asOptionalText(req.body.password);
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }
  try {
    const row = db.prepare("SELECT * FROM users WHERE username = ? LIMIT 1").get(username);
    if (!row) return res.status(401).json({ error: "Invalid credentials." });
    const valid = await bcrypt.compare(password, row.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials." });

    const token = jwt.sign(
      { id: row.id, username: row.username, role: row.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    return res.json({ token, user: { id: row.id, username: row.username, role: row.role } });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.post("/api/auth/hash", async (req, res) => {
  const password = asOptionalText(req.body.password);
  if (!password) return res.status(400).json({ error: "Password must be a non-empty string." });
  try {
    const hash = await bcrypt.hash(password, 10);
    return res.json({ hash });
  } catch {
    return res.status(500).json({ error: "Failed to hash password." });
  }
});

app.post("/api/auth/verify", async (req, res) => {
  const password = asOptionalText(req.body.password);
  const hash = asOptionalText(req.body.hash);
  if (!password) return res.status(400).json({ error: "Password must be a non-empty string." });
  if (!hash) return res.status(400).json({ error: "Hash must be a valid string." });
  try {
    const valid = await bcrypt.compare(password, hash);
    return res.json({ valid });
  } catch {
    return res.status(500).json({ error: "Failed to verify password." });
  }
});

app.get("/api/proxy", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).json({ error: "Missing required query param: url" });
  }
  try {
    const client = new ApiClient("");
    const result = await client.getAll(targetUrl);
    if (!result.success) return res.status(502).json({ error: result.error });
    return res.json(result.data);
  } catch {
    return res.status(500).json({ error: "Proxy request failed." });
  }
});

app.post("/api/role-requests", async (req, res) => {
  const name = asOptionalText(req.body.name);
  const email = asEmail(req.body.email);
  const message = asOptionalText(req.body.message);
  const login = asUsername(req.body.login);
  const password = asOptionalText(req.body.password);
  if (!name || !email) return res.status(400).json({ error: "Name and email are required." });
  if (!login || !password) return res.status(400).json({ error: "Login and password are required." });

  try {
    const loginTaken = db.prepare("SELECT 1 FROM users WHERE username = ? LIMIT 1").get(login);
    if (loginTaken) return res.status(409).json({ error: "That login name is already taken. Please choose another." });

    const existing = db.prepare(
      "SELECT 1 FROM role_requests WHERE email = ? AND status = 'pending' LIMIT 1"
    ).get(email);
    if (existing) {
      return res.status(409).json({ error: "A pending request already exists for this email." });
    }

    const now = nowIso();
    db.prepare(`
      INSERT INTO role_requests (
        id, name, email, message, requested_username, requested_password, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `).run(newId(), name, email, message, login, password, now, now);

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

app.get("/api/role-requests", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM role_requests ORDER BY created_at DESC").all();
    return res.json(rows.map(mapRoleRequest));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.put("/api/role-requests/:id/approve", requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return res.status(400).json({ error: "Invalid ID." });

  try {
    const request = db.prepare("SELECT * FROM role_requests WHERE id = ? LIMIT 1").get(id);
    if (!request) return res.status(404).json({ error: "Request not found." });
    if (request.status !== "pending") return res.status(400).json({ error: "Request is not pending." });

    let username = asUsername(request.requested_username);
    if (!username) {
      const base = request.name.toLowerCase().replace(/\s+/g, ".").replace(/[^a-z0-9.]/g, "");
      username = base;
      let counter = 1;
      while (db.prepare("SELECT 1 FROM users WHERE username = ? LIMIT 1").get(username)) {
        username = `${base}${counter++}`;
      }
    } else if (db.prepare("SELECT 1 FROM users WHERE username = ? LIMIT 1").get(username)) {
      return res.status(409).json({ error: `The requested login "${username}" is already taken. Please ask the requester to submit a new request with a different login.` });
    }

    const chosenPassword = asOptionalText(request.requested_password)
      || ("Viewer_" + Math.random().toString(36).slice(2, 10));
    const passwordHash = await bcrypt.hash(chosenPassword, 12);
    const now = nowIso();

    const approveTx = db.transaction(() => {
      db.prepare(`
        INSERT INTO users (id, username, password_hash, role, email, created_at, updated_at)
        VALUES (?, ?, ?, 'viewer', ?, ?, ?)
      `).run(newId(), username, passwordHash, asEmail(request.email), now, now);

      db.prepare(`
        UPDATE role_requests
        SET status = 'approved', reviewed_at = ?, generated_username = ?, generated_password = ?, updated_at = ?
        WHERE id = ?
      `).run(now, username, chosenPassword, now, id);
    });
    approveTx();

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
                  <td style="padding: 6px 0; font-weight: bold; font-size: 14px; font-family: monospace;">${chosenPassword}</td>
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

app.put("/api/role-requests/:id/deny", requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return res.status(400).json({ error: "Invalid ID." });
  try {
    const request = db.prepare("SELECT status FROM role_requests WHERE id = ? LIMIT 1").get(id);
    if (!request) return res.status(404).json({ error: "Request not found." });
    if (request.status !== "pending") return res.status(400).json({ error: "Request is not pending." });

    db.prepare("UPDATE role_requests SET status = 'denied', reviewed_at = ?, updated_at = ? WHERE id = ?")
      .run(nowIso(), nowIso(), id);
    return res.json({ message: "Denied." });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/forgot-password", async (req, res) => {
  const email = asEmail(req.body.email);
  if (!email) return res.status(400).json({ error: "Email is required." });
  const ok = { message: "If that email is registered, a 6-digit code has been sent." };

  try {
    const user = db.prepare("SELECT * FROM users WHERE email = ? LIMIT 1").get(email);
    if (!user) return res.json(ok);

    db.prepare("DELETE FROM password_resets WHERE user_id = ?").run(user.id);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await bcrypt.hash(code, 10);
    const now = nowIso();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO password_resets (id, user_id, code_hash, reset_token, attempts, expires_at, used, created_at, updated_at)
      VALUES (?, ?, ?, NULL, 0, ?, 0, ?, ?)
    `).run(newId(), user.id, codeHash, expiresAt, now, now);

    await sendEmail({
      to: user.email,
      subject: "BDPAMKE Password Reset Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background: #0f1117; padding: 20px 24px;">
            <h2 style="color: #5eead4; margin: 0; font-size: 18px;">BDPAMKE Attendance</h2>
          </div>
          <div style="padding: 24px;">
            <p style="margin-top: 0;">Hi <strong>${user.username}</strong>,</p>
            <p>We received a request to reset your password. Use the code below. It expires in <strong>30 minutes</strong>.</p>
            <div style="text-align: center; margin: 24px 0;">
              <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; font-family: monospace; color: #0f1117;">${code}</span>
            </div>
            <p style="font-size: 13px; color: #64748b;">If you did not request this, you can safely ignore this email.</p>
          </div>
        </div>`,
    });

    return res.json(ok);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/verify-reset-code", async (req, res) => {
  const email = asEmail(req.body.email);
  const code = asOptionalText(req.body.code);
  if (!email || !code) return res.status(400).json({ error: "Email and code are required." });
  const invalid = { error: "Invalid or expired code. Please try again." };

  try {
    const user = db.prepare("SELECT * FROM users WHERE email = ? LIMIT 1").get(email);
    if (!user) return res.status(400).json(invalid);

    const record = db.prepare(`
      SELECT * FROM password_resets
      WHERE user_id = ? AND used = 0 AND expires_at > ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(user.id, nowIso());
    if (!record) return res.status(400).json(invalid);

    const attempts = (record.attempts || 0) + 1;
    db.prepare("UPDATE password_resets SET attempts = ?, updated_at = ? WHERE id = ?")
      .run(attempts, nowIso(), record.id);

    if (attempts > 5) {
      db.prepare("DELETE FROM password_resets WHERE id = ?").run(record.id);
      return res.status(400).json({ error: "Too many incorrect attempts. Please request a new code." });
    }

    const valid = await bcrypt.compare(code, record.code_hash);
    if (!valid) return res.status(400).json(invalid);

    db.prepare("UPDATE password_resets SET used = 1, updated_at = ? WHERE id = ?").run(nowIso(), record.id);
    const resetToken = jwt.sign({ id: user.id, purpose: "password-reset" }, JWT_SECRET, { expiresIn: "10m" });
    return res.json({ resetToken });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/reset-password", async (req, res) => {
  const resetToken = asOptionalText(req.body.resetToken);
  const newPassword = asOptionalText(req.body.newPassword);
  if (!resetToken || !newPassword) return res.status(400).json({ error: "Reset token and new password are required." });
  if (newPassword.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters." });

  try {
    let payload;
    try {
      payload = jwt.verify(resetToken, JWT_SECRET);
    } catch {
      return res.status(400).json({ error: "Reset session expired. Please start over." });
    }
    if (payload.purpose !== "password-reset") return res.status(400).json({ error: "Invalid reset token." });

    const primaryUser = db.prepare("SELECT * FROM users WHERE id = ? LIMIT 1").get(payload.id);
    if (!primaryUser) return res.status(400).json({ error: "User not found." });

    const passwordHash = await bcrypt.hash(newPassword, 12);
    const now = nowIso();
    let updatedAccounts = [];

    const resetTx = db.transaction(() => {
      if (primaryUser.email) {
        const related = db.prepare("SELECT username FROM users WHERE email = ?").all(primaryUser.email);
        db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE email = ?")
          .run(passwordHash, now, primaryUser.email);
        updatedAccounts = related.map((u) => u.username);
      } else {
        db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?")
          .run(passwordHash, now, primaryUser.id);
        updatedAccounts = [primaryUser.username];
      }
    });
    resetTx();

    return res.json({ message: "Password updated successfully. You can now sign in.", updatedAccounts });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/users", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM users ORDER BY created_at ASC").all();
    return res.json(rows.map(mapUser));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.patch("/api/admin/users/:id/role", requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const role = asOptionalText(req.body.role);
  if (!["admin", "user", "viewer"].includes(role)) {
    return res.status(400).json({ error: "Invalid role. Must be admin, user, or viewer." });
  }
  if (id === req.user.id) return res.status(400).json({ error: "You cannot change your own role." });

  try {
    const now = nowIso();
    const result = db.prepare("UPDATE users SET role = ?, updated_at = ? WHERE id = ?").run(role, now, id);
    if (!result.changes) return res.status(404).json({ error: "User not found." });
    const updated = db.prepare("SELECT * FROM users WHERE id = ? LIMIT 1").get(id);
    return res.json(mapUser(updated));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/users/:id/reset-password", requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const newPassword = asOptionalText(req.body.newPassword);
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }
  try {
    const user = db.prepare("SELECT * FROM users WHERE id = ? LIMIT 1").get(id);
    if (!user) return res.status(404).json({ error: "User not found." });

    const passwordHash = await bcrypt.hash(newPassword, 12);
    const now = nowIso();
    let updatedCount = 1;
    if (user.email) {
      const result = db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE email = ?")
        .run(passwordHash, now, user.email);
      updatedCount = result.changes;
    } else {
      db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?")
        .run(passwordHash, now, id);
    }
    return res.json({ message: `Password reset successfully. ${updatedCount} account(s) updated.` });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete("/api/admin/users/:id", requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (id === req.user.id) return res.status(400).json({ error: "You cannot delete your own account." });
  try {
    const user = db.prepare("SELECT * FROM users WHERE id = ? LIMIT 1").get(id);
    if (!user) return res.status(404).json({ error: "User not found." });
    if (user.role === "admin") return res.status(403).json({ error: "Admin accounts cannot be deleted." });
    db.prepare("DELETE FROM users WHERE id = ?").run(id);
    return res.json({ message: "User deleted." });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get("/api/students", requireAuth, async (_req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM students ORDER BY last_name ASC, first_name ASC").all();
    return res.json(rows.map(mapStudent));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/api/students", requireAuth, async (req, res) => {
  const student = getStudentInput(req.body || {});
  if (!student.firstName || !student.lastName) {
    return res.status(400).json({ error: "firstName and lastName are required." });
  }
  try {
    const now = nowIso();
    const id = newId();
    db.prepare(`
      INSERT INTO students (
        id, first_name, last_name, email, laptop_number, cell_phone, home_phone, date_of_birth, grade, school, shirt_size,
        parent_first_name, parent_last_name, parent_cell_phone, parent_email, address1, address2, program_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, student.firstName, student.lastName, student.email, student.laptopNumber, student.cellPhone, student.homePhone,
      student.dateOfBirth, student.grade, student.school, student.shirtSize, student.parentFirstName, student.parentLastName,
      student.parentCellPhone, student.parentEmail, student.address1, student.address2, student.programStatus, now, now
    );
    const created = db.prepare("SELECT * FROM students WHERE id = ?").get(id);
    return res.status(201).json(mapStudent(created));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/api/students/bulk", requireAuth, async (req, res) => {
  const students = req.body.students;
  if (!Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ error: "students must be a non-empty array." });
  }
  try {
    const insertStmt = db.prepare(`
      INSERT INTO students (
        id, first_name, last_name, email, laptop_number, cell_phone, home_phone, date_of_birth, grade, school, shirt_size,
        parent_first_name, parent_last_name, parent_cell_phone, parent_email, address1, address2, program_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    let inserted = 0;
    const tx = db.transaction(() => {
      for (const raw of students) {
        const student = getStudentInput(raw || {});
        if (!student.firstName || !student.lastName) continue;
        const now = nowIso();
        insertStmt.run(
          newId(), student.firstName, student.lastName, student.email, student.laptopNumber, student.cellPhone, student.homePhone,
          student.dateOfBirth, student.grade, student.school, student.shirtSize, student.parentFirstName, student.parentLastName,
          student.parentCellPhone, student.parentEmail, student.address1, student.address2, student.programStatus, now, now
        );
        inserted += 1;
      }
    });
    tx();
    return res.status(201).json({ inserted });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.put("/api/students/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return res.status(400).json({ error: "Invalid student ID." });

  const student = getStudentInput(req.body || {});
  if (!student.firstName || !student.lastName) {
    return res.status(400).json({ error: "firstName and lastName are required." });
  }

  try {
    const result = db.prepare(`
      UPDATE students SET
        first_name = ?, last_name = ?, email = ?, laptop_number = ?, cell_phone = ?, home_phone = ?, date_of_birth = ?, grade = ?,
        school = ?, shirt_size = ?, parent_first_name = ?, parent_last_name = ?, parent_cell_phone = ?, parent_email = ?,
        address1 = ?, address2 = ?, program_status = ?, updated_at = ?
      WHERE id = ?
    `).run(
      student.firstName, student.lastName, student.email, student.laptopNumber, student.cellPhone, student.homePhone, student.dateOfBirth,
      student.grade, student.school, student.shirtSize, student.parentFirstName, student.parentLastName, student.parentCellPhone,
      student.parentEmail, student.address1, student.address2, student.programStatus, nowIso(), id
    );
    if (!result.changes) return res.status(404).json({ error: "Student not found." });
    const updated = db.prepare("SELECT * FROM students WHERE id = ?").get(id);
    return res.json(mapStudent(updated));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete("/api/students/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return res.status(400).json({ error: "Invalid student ID." });
  try {
    const result = db.prepare("DELETE FROM students WHERE id = ?").run(id);
    if (!result.changes) return res.status(404).json({ error: "Student not found." });
    return res.json({ message: "Student deleted." });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get("/api/attendance/report", async (_req, res) => {
  try {
    const students = db.prepare("SELECT * FROM students ORDER BY last_name ASC, first_name ASC").all().map(mapStudent);
    const sessions = db.prepare("SELECT id, date FROM attendance_sessions ORDER BY date ASC").all();
    const rows = db.prepare(`
      SELECT s.date, r.student_id, r.present
      FROM attendance_sessions s
      LEFT JOIN attendance_records r ON r.session_id = s.id
      ORDER BY s.date ASC
    `).all();

    const totalDates = sessions.map((s) => s.date);
    const presentByStudent = new Map();
    for (const row of rows) {
      if (!row.student_id || !row.present) continue;
      if (!presentByStudent.has(row.student_id)) presentByStudent.set(row.student_id, []);
      presentByStudent.get(row.student_id).push(row.date);
    }

    const report = students.map((student) => {
      const presentDates = presentByStudent.get(student._id) || [];
      return {
        student,
        daysPresent: presentDates.length,
        daysMissed: totalDates.length - presentDates.length,
        presentDates,
        totalTrackedDays: totalDates.length,
      };
    });

    return res.json({ report, totalDates });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get("/api/attendance/:date", requireAuth, async (req, res) => {
  const { date } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: "Date must be in YYYY-MM-DD format." });
  }
  try {
    const session = db.prepare("SELECT * FROM attendance_sessions WHERE date = ? LIMIT 1").get(date);
    if (!session) return res.json({ date, records: [] });
    const records = db.prepare("SELECT student_id, present FROM attendance_records WHERE session_id = ?").all(session.id);
    return res.json(mapAttendanceSession(session, records));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/api/attendance", requireAuth, async (req, res) => {
  const date = asOptionalText(req.body.date);
  const records = req.body.records;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: "date (YYYY-MM-DD) is required." });
  }
  if (!Array.isArray(records)) {
    return res.status(400).json({ error: "records must be an array." });
  }
  try {
    const now = nowIso();
    const saveTx = db.transaction(() => {
      const existing = db.prepare("SELECT id FROM attendance_sessions WHERE date = ? LIMIT 1").get(date);
      let sessionId;
      if (existing) {
        sessionId = existing.id;
        db.prepare("UPDATE attendance_sessions SET updated_at = ? WHERE id = ?").run(now, sessionId);
      } else {
        const created = db.prepare(
          "INSERT INTO attendance_sessions (date, created_at, updated_at) VALUES (?, ?, ?)"
        ).run(date, now, now);
        sessionId = created.lastInsertRowid;
      }

      db.prepare("DELETE FROM attendance_records WHERE session_id = ?").run(sessionId);
      const insertRec = db.prepare(
        "INSERT INTO attendance_records (session_id, student_id, present) VALUES (?, ?, ?)"
      );
      for (const rec of records) {
        const studentId = asOptionalText(rec?.studentId);
        if (!studentId) continue;
        insertRec.run(sessionId, studentId, asDbBool(rec.present));
      }
    });
    saveTx();

    const session = db.prepare("SELECT * FROM attendance_sessions WHERE date = ? LIMIT 1").get(date);
    const savedRecords = db.prepare("SELECT student_id, present FROM attendance_records WHERE session_id = ?").all(session.id);
    return res.json(mapAttendanceSession(session, savedRecords));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", db: "sqlite", dbFile, timestamp: nowIso() });
});

async function ensureAdminAccount() {
  const username = "admin";
  const password = "Wecanlearn99";
  const existing = db.prepare("SELECT * FROM users WHERE username = ? LIMIT 1").get(username);
  const passwordHash = await bcrypt.hash(password, 12);
  const now = nowIso();

  if (!existing) {
    db.prepare(`
      INSERT INTO users (id, username, password_hash, role, email, created_at, updated_at)
      VALUES (?, ?, ?, 'admin', NULL, ?, ?)
    `).run(newId(), username, passwordHash, now, now);
    console.log("✅ Admin account created (username: admin)");
    return;
  }

  const passwordMatches = await bcrypt.compare(password, existing.password_hash);
  if (!passwordMatches || existing.role !== "admin") {
    db.prepare("UPDATE users SET password_hash = ?, role = 'admin', updated_at = ? WHERE id = ?")
      .run(passwordHash, now, existing.id);
    console.log("✅ Admin account reset to default password (username: admin)");
  }
}

app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🗄️  SQLite database: ${dbFile}`);
  try {
    await ensureAdminAccount();
  } catch (err) {
    console.error("⚠️  Could not ensure admin account:", err.message);
  }
});
