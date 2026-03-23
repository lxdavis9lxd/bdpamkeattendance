"use strict";
const mongoose = require("mongoose");
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/bdpamke_student";

const studentSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
const Student = mongoose.model("Student", studentSchema);

const patches = [
  {
    find: { firstName: "Malachai", lastName: "Kenner" },
    data: { cellPhone: "414-379-9253", grade: "8", programStatus: "YTC", shirtSize: "M", parentFirstName: "Michelle", parentLastName: "Kenner", parentCellPhone: "414-308-7117", parentEmail: "lady.j.a.k@gmail.com" },
  },
  {
    find: { firstName: "Christopher", lastName: "Harston" },
    data: { cellPhone: "414-676-5069", grade: "8", programStatus: "Competition", parentFirstName: "Rozlyn", parentLastName: "Harsten", parentCellPhone: "414-676-5064" },
  },
];

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected\n");
  for (const { find, data } of patches) {
    const student = await Student.findOne({
      firstName: { $regex: `^${find.firstName}$`, $options: "i" },
      lastName:  { $regex: `^${find.lastName}$`,  $options: "i" },
    });
    if (!student) { console.log("Not found:", find.firstName, find.lastName); continue; }
    const updates = {};
    for (const [k, v] of Object.entries(data)) {
      if (!student[k]) updates[k] = v;
    }
    if (!Object.keys(updates).length) { console.log("Nothing to update:", find.firstName, find.lastName); continue; }
    await Student.findByIdAndUpdate(student._id, { $set: updates });
    console.log(`Updated ${find.firstName} ${find.lastName}:`, Object.keys(updates).join(", "));
  }
  await mongoose.disconnect();
  console.log("\nDone.");
}
run().catch((e) => { console.error(e.message); process.exit(1); });
