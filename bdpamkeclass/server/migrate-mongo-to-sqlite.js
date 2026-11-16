"use strict";
const mongoose = require("mongoose");
const { db, dbFile } = require("./sqlite");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/bdpamke_student";

const studentSchema = new mongoose.Schema({}, { strict: false, collection: "students" });
const attendanceSchema = new mongoose.Schema({}, { strict: false, collection: "attendances" });
const userSchema = new mongoose.Schema({}, { strict: false, collection: "users" });
const roleRequestSchema = new mongoose.Schema({}, { strict: false, collection: "rolerequests" });
const passwordResetSchema = new mongoose.Schema({}, { strict: false, collection: "passwordresets" });

const Student = mongoose.models.MongoStudent || mongoose.model("MongoStudent", studentSchema);
const Attendance = mongoose.models.MongoAttendance || mongoose.model("MongoAttendance", attendanceSchema);
const User = mongoose.models.MongoUser || mongoose.model("MongoUser", userSchema);
const RoleRequest = mongoose.models.MongoRoleRequest || mongoose.model("MongoRoleRequest", roleRequestSchema);
const PasswordReset = mongoose.models.MongoPasswordReset || mongoose.model("MongoPasswordReset", passwordResetSchema);

const asIso = (value) => {
  if (!value) return new Date().toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
};
const asText = (value) => {
  if (value === undefined || value === null) return null;
  const t = String(value).trim();
  return t === "" ? null : t;
};
const asBool = (value) => (value ? 1 : 0);
const asId = (value) => (value === undefined || value === null ? null : String(value));

function clearSqliteData() {
  db.exec(`
    DELETE FROM attendance_records;
    DELETE FROM attendance_sessions;
    DELETE FROM password_resets;
    DELETE FROM role_requests;
    DELETE FROM users;
    DELETE FROM students;
  `);
}

async function migrate() {
  console.log(`ℹ️  Connecting to MongoDB: ${MONGO_URI}`);
  await mongoose.connect(MONGO_URI);
  console.log(`✅ Connected to MongoDB`);
  console.log(`ℹ️  Writing to SQLite: ${dbFile}`);

  const [students, attendances, users, roleRequests, passwordResets] = await Promise.all([
    Student.find({}).lean(),
    Attendance.find({}).lean(),
    User.find({}).lean(),
    RoleRequest.find({}).lean(),
    PasswordReset.find({}).lean(),
  ]);

  const insertStudent = db.prepare(`
    INSERT INTO students (
      id, first_name, last_name, email, laptop_number, cell_phone, home_phone, date_of_birth, grade, school, shirt_size,
      parent_first_name, parent_last_name, parent_cell_phone, parent_email, address1, address2, program_status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertSession = db.prepare("INSERT INTO attendance_sessions (date, created_at, updated_at) VALUES (?, ?, ?)");
  const insertRecord = db.prepare("INSERT INTO attendance_records (session_id, student_id, present) VALUES (?, ?, ?)");
  const insertUser = db.prepare(`
    INSERT INTO users (id, username, password_hash, role, email, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertRoleRequest = db.prepare(`
    INSERT INTO role_requests (
      id, name, email, message, requested_username, requested_password, status, reviewed_at,
      generated_username, generated_password, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertPasswordReset = db.prepare(`
    INSERT INTO password_resets (
      id, user_id, code_hash, reset_token, attempts, expires_at, used, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const migrateTx = db.transaction(() => {
    clearSqliteData();

    for (const s of students) {
      if (!s.firstName || !s.lastName || !s._id) continue;
      insertStudent.run(
        asId(s._id), asText(s.firstName), asText(s.lastName), asText(s.email), asText(s.laptopNumber), asText(s.cellPhone),
        asText(s.homePhone), asText(s.dateOfBirth), asText(s.grade), asText(s.school), asText(s.shirtSize),
        asText(s.parentFirstName), asText(s.parentLastName), asText(s.parentCellPhone), asText(s.parentEmail),
        asText(s.address1), asText(s.address2), asText(s.programStatus), asIso(s.createdAt), asIso(s.updatedAt)
      );
    }

    for (const a of attendances) {
      if (!a.date) continue;
      const sessionResult = insertSession.run(asText(a.date), asIso(a.createdAt), asIso(a.updatedAt));
      const sessionId = sessionResult.lastInsertRowid;
      if (!Array.isArray(a.records)) continue;
      for (const record of a.records) {
        const studentId = asId(record?.studentId);
        if (!studentId) continue;
        insertRecord.run(sessionId, studentId, asBool(record.present));
      }
    }

    for (const u of users) {
      if (!u._id || !u.username || !u.passwordHash) continue;
      insertUser.run(
        asId(u._id), asText(u.username)?.toLowerCase(), asText(u.passwordHash),
        asText(u.role) || "user", asText(u.email)?.toLowerCase(), asIso(u.createdAt), asIso(u.updatedAt)
      );
    }

    for (const r of roleRequests) {
      if (!r._id || !r.name || !r.email) continue;
      insertRoleRequest.run(
        asId(r._id), asText(r.name), asText(r.email)?.toLowerCase(), asText(r.message), asText(r.requestedUsername),
        asText(r.requestedPassword), asText(r.status) || "pending", r.reviewedAt ? asIso(r.reviewedAt) : null,
        asText(r.generatedUsername), asText(r.generatedPassword), asIso(r.createdAt), asIso(r.updatedAt)
      );
    }

    for (const p of passwordResets) {
      if (!p._id || !p.userId || !p.codeHash || !p.expiresAt) continue;
      insertPasswordReset.run(
        asId(p._id), asId(p.userId), asText(p.codeHash), asText(p.resetToken), Number(p.attempts || 0),
        asIso(p.expiresAt), asBool(p.used), asIso(p.createdAt), asIso(p.updatedAt)
      );
    }
  });

  migrateTx();

  console.log("✅ Migration complete.");
  console.log(`   students: ${students.length}`);
  console.log(`   attendance sessions: ${attendances.length}`);
  console.log(`   users: ${users.length}`);
  console.log(`   role requests: ${roleRequests.length}`);
  console.log(`   password resets: ${passwordResets.length}`);
}

migrate()
  .catch((err) => {
    console.error("❌ Migration failed:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
