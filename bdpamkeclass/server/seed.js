"use strict";
/**
 * Seed script — inserts students from the BDPAMKE roster spreadsheet.
 * Run with:  node server/seed.js
 * Writes directly to the SQLite database used by the Express server.
 */

const crypto = require("crypto");
const { db, dbFile } = require("./sqlite");

const students = [
  {
    firstName: "Samuel",
    lastName: "Gayle",
    laptopNumber: "1",
  },
  {
    firstName: "Felix",
    lastName: "Saavedra",
    email: "fc360cop@gmail.com",
    laptopNumber: "2",
    cellPhone: "414-317-5720",
    dateOfBirth: "9/8/2009",
    grade: "4",
    school: "Tenor High School (Cathedral Square)",
    parentFirstName: "Maritza",
    parentLastName: "Saavedra",
    parentCellPhone: "414-378-9935",
    parentEmail: "mrs.saavy@gmail.com",
  },
  {
    firstName: "Jada",
    lastName: "Kenner",
  },
  {
    firstName: "Adriel",
    lastName: "McFarland Jr",
    laptopNumber: "6",
  },
  {
    firstName: "Madison",
    lastName: "Donald",
    laptopNumber: "7",
  },
  {
    firstName: "Karena",
    lastName: "Hart",
    email: "cheenelle.fox@gmail.com",
    laptopNumber: "8",
    cellPhone: "414-400-2206",
    dateOfBirth: "6/4/2012",
    grade: "8th",
    school: "Audubon",
    parentFirstName: "Ciara",
    parentLastName: "Fox",
    parentCellPhone: "414-248-3159",
    parentEmail: "cheenelle.fox@gmail.com",
  },
  {
    firstName: "Ethan",
    lastName: "Ezekiel",
    laptopNumber: "9",
  },
  {
    firstName: "Zhariona",
    lastName: "Hill",
    laptopNumber: "10",
  },
  {
    firstName: "Elijah",
    lastName: "Donald",
  },
  {
    firstName: "Elijah",
    lastName: "Kenner",
  },
  {
    firstName: "Ja'Qualyn",
    lastName: "McCoy",
    email: "jaqualynmccoy@gmail.com",
    cellPhone: "414-285-8552",
    grade: "9th",
    school: "Dr. Howard Fuller Collegiate",
    shirtSize: "M",
    parentFirstName: "Jessica",
    parentLastName: "McCoy",
    parentCellPhone: "414-914-0258",
    parentEmail: "jessicamccoy25@yahoo.com",
  },
  {
    firstName: "Leke",
    lastName: "Oguntade",
    email: "lekeoguntade@gmail.com",
    grade: "9th",
    shirtSize: "S",
    parentFirstName: "Idowu",
    parentLastName: "Oguntade",
    parentCellPhone: "414-921-8111",
    parentEmail: "idowuoguntade@gmail.com",
  },
  {
    firstName: "Enoch",
    lastName: "Ajibade",
    email: "Bamd5716@gmail.com",
    cellPhone: "414-748-8295",
    dateOfBirth: "9/28/2009",
    grade: "10th",
    school: "Brown Deer Middle/High School",
    parentFirstName: "Olabisi",
    parentLastName: "Ajibade",
    parentCellPhone: "414-712-1486",
    parentEmail: "olaj.oa@gmail.com",
  },
  {
    firstName: "Amiliahna",
    lastName: "Luangphaxayachack",
    email: "amiliahna1980@icloud.com",
    cellPhone: "414-902-3457",
    dateOfBirth: "9/26/2011",
    grade: "8th",
    school: "Audubon",
    parentFirstName: "Christina",
    parentLastName: "Lee",
    parentCellPhone: "414-803-0315",
    parentEmail: "Lee.christina.d@gmail.com",
    address1: "4709 W. Kiley Ave",
    address2: "Milwaukee, WI 53223",
  },
  {
    firstName: "Kenneth",
    lastName: "McFadden",
  },
  {
    firstName: "Christopher",
    lastName: "Harston",
  },
  {
    firstName: "Malachai",
    lastName: "Kenner",
  },
];

async function seed() {
  try {
    console.log("✅ Connected to SQLite:", dbFile);

    const deleteStmt = db.prepare("DELETE FROM students WHERE first_name = ? AND last_name = ?");
    const insertStmt = db.prepare(`
      INSERT INTO students (
        id, first_name, last_name, email, laptop_number, cell_phone, home_phone, date_of_birth, grade, school, shirt_size,
        parent_first_name, parent_last_name, parent_cell_phone, parent_email, address1, address2, program_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
    `);

    const runSeed = db.transaction(() => {
      for (const s of students) {
        deleteStmt.run(s.firstName, s.lastName);
      }

      for (const s of students) {
        const now = new Date().toISOString();
        insertStmt.run(
          crypto.randomUUID(),
          s.firstName,
          s.lastName,
          s.email || null,
          s.laptopNumber || null,
          s.cellPhone || null,
          s.homePhone || null,
          s.dateOfBirth || null,
          s.grade || null,
          s.school || null,
          s.shirtSize || null,
          s.parentFirstName || null,
          s.parentLastName || null,
          s.parentCellPhone || null,
          s.parentEmail || null,
          s.address1 || null,
          s.address2 || null,
          now,
          now
        );
      }
    });
    runSeed();
    console.log(`✅ Inserted ${students.length} students successfully.`);
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
  }
}

seed();
