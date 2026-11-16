"use strict";
const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const dbFile = process.env.SQLITE_FILE || path.join(__dirname, "data", "bdpamke.sqlite");
fs.mkdirSync(path.dirname(dbFile), { recursive: true });

const db = new Database(dbFile);
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    laptop_number TEXT,
    cell_phone TEXT,
    home_phone TEXT,
    date_of_birth TEXT,
    grade TEXT,
    school TEXT,
    shirt_size TEXT,
    parent_first_name TEXT,
    parent_last_name TEXT,
    parent_cell_phone TEXT,
    parent_email TEXT,
    address1 TEXT,
    address2 TEXT,
    program_status TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS attendance_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS attendance_records (
    session_id INTEGER NOT NULL,
    student_id TEXT NOT NULL,
    present INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (session_id, student_id),
    FOREIGN KEY (session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    email TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS role_requests (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT,
    requested_username TEXT,
    requested_password TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    reviewed_at TEXT,
    generated_username TEXT,
    generated_password TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS password_resets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    reset_token TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    expires_at TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_sessions(date);
  CREATE INDEX IF NOT EXISTS idx_role_requests_status ON role_requests(status);
  CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id);
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
`);

module.exports = { db, dbFile };
