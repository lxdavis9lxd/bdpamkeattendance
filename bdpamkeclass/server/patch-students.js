"use strict";
/**
 * One-time patch script — fills in missing student fields from the roster spreadsheet.
 * Only updates a field if it is currently empty/null/undefined in the database.
 * Run with:  node server/patch-students.js
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
    programStatus:   { type: String, trim: true },
  },
  { timestamps: true }
);

const Student = mongoose.model("Student", studentSchema);

// Spreadsheet data — "Not Listed" treated as blank (skipped).
// Only fields listed here will be considered for patching.
const patches = [
  {
    firstName: "Jada",
    lastName: "Kenner",
    cellPhone: "414-379-9253",
    grade: "7",
    programStatus: "YTC",
    shirtSize: "S",
    parentFirstName: "Michelle",
    parentLastName: "Kenner",
    parentCellPhone: "414-308-7117",
    parentEmail: "lady.j.a.k@gmail.com",
  },
  {
    firstName: "Malachi",
    lastName: "Kenner",
    cellPhone: "414-379-9253",
    grade: "8",
    programStatus: "YTC",
    shirtSize: "M",
    parentFirstName: "Michelle",
    parentLastName: "Kenner",
    parentCellPhone: "414-308-7117",
    parentEmail: "lady.j.a.k@gmail.com",
  },
  {
    firstName: "Kenneth",
    lastName: "McFadden",
    cellPhone: "414-759-2111",
    grade: "11",
    programStatus: "Competition",
    shirtSize: "L",
    parentFirstName: "Tony",
    parentLastName: "Kerney",
    parentCellPhone: "414-807-4639",
  },
  {
    firstName: "Madison",
    lastName: "Donald",
    cellPhone: "262-349-6644",
    grade: "9",
    programStatus: "YTC",
    shirtSize: "L",
    parentFirstName: "Tonya",
    parentLastName: "Donald",
    parentCellPhone: "414-350-7208",
    parentEmail: "tonya.donald@ymail.com",
  },
  {
    firstName: "Ethan",
    lastName: "Ezekiel",
    cellPhone: "414-364-9371",
    grade: "10",
    programStatus: "YTC",
    shirtSize: "XL",
    parentFirstName: "Benjamin",
    parentLastName: "Ezekiel",
    parentCellPhone: "414-852-7858",
    parentEmail: "bezekiel@yahoo.com",
  },
  {
    firstName: "Christopher",
    lastName: "Harsten",
    cellPhone: "414-676-5069",
    grade: "8",
    programStatus: "Competition",
    // shirtSize: "Not Listed" — skipped
    parentFirstName: "Rozlyn",
    parentLastName: "Harsten",
    parentCellPhone: "414-676-5064",
    // parentEmail: "Not Listed" — skipped
  },
  {
    firstName: "Zhariona",
    lastName: "Hill",
    cellPhone: "313-342-9079",
    grade: "10",
    programStatus: "Competition",
    shirtSize: "M",
    parentFirstName: "Chiquitia",
    parentLastName: "Edwards",
    parentCellPhone: "414-949-1245",
    parentEmail: "chiquitiae24@gmail.com",
  },
  {
    firstName: "Adriel",
    lastName: "McFarland Jr",
    cellPhone: "414-807-1874",
    grade: "5",
    programStatus: "YTC",
    shirtSize: "M",
    parentFirstName: "Adriel",
    parentLastName: "McFarlane",
    parentCellPhone: "414-737-1076",
    parentEmail: "adriel.mcfarlane@gmail.com",
  },
];

function isEmpty(val) {
  return val === undefined || val === null || val === "";
}

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB\n");

  for (const patch of patches) {
    const { firstName, lastName, ...fields } = patch;

    const student = await Student.findOne({
      firstName: { $regex: `^${firstName}$`, $options: "i" },
      lastName:  { $regex: `^${lastName}$`,  $options: "i" },
    });

    if (!student) {
      console.log(`⚠️  Not found: ${firstName} ${lastName}`);
      continue;
    }

    const updates = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value && isEmpty(student[key])) {
        updates[key] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      console.log(`✔  No empty fields to fill for ${firstName} ${lastName}`);
      continue;
    }

    await Student.findByIdAndUpdate(student._id, { $set: updates });
    console.log(`✅ Updated ${firstName} ${lastName}:`, Object.keys(updates).join(", "));
  }

  await mongoose.disconnect();
  console.log("\nDone.");
}

run().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
