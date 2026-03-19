"use strict";
/**
 * Seed script — inserts students from the BDPAMKE roster spreadsheet.
 * Run with:  node server/seed.js
 * The Express server must be running on port 5000, OR set MONGO_URI env var
 * and this script will connect directly to MongoDB.
 */

const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/bdpamke_student";

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

const Student = mongoose.model("Student", studentSchema);

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
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB:", MONGO_URI);

    // Avoid duplicates — remove existing students with matching first+last name
    for (const s of students) {
      await Student.deleteMany({ firstName: s.firstName, lastName: s.lastName });
    }

    const result = await Student.insertMany(students);
    console.log(`✅ Inserted ${result.length} students successfully.`);
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected.");
  }
}

seed();
