/**
 * Reset login passwords for seed accounts.
 * Usage: node scripts/reset-login-passwords.mjs
 */
import fs from "fs";
import bcrypt from "bcryptjs";
import { MongoClient } from "mongodb";

const PASSWORD = "Asdfghjk";
const ACCOUNTS = [
  { email: "hasiv@gmail.com", role: "student", name: "Hasiv" },
  { email: "admin@gmail.com", role: "admin", name: "Admin" },
  { email: "asem@gmail.com", role: "instructor", name: "Asem" },
  { email: "superadmin@gmail.com", role: "super_admin", name: "Super Admin" },
];

const uri = fs.readFileSync(".env", "utf8").match(/^\s*MONGODB_URI=(.+)$/m)[1].trim();
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 20000 });

try {
  await client.connect();
  const db = client.db("AdvanceLMS");
  const users = db.collection("users");
  const hashed = await bcrypt.hash(PASSWORD, 12);

  for (const account of ACCOUNTS) {
    const email = account.email.toLowerCase().trim();
    const existing = await users.findOne({ email });

    if (existing) {
      const result = await users.updateOne(
        { _id: existing._id },
        {
          $set: {
            password: hashed,
            role: account.role,
            isActive: true,
            accountStatus: "active",
            passwordResetToken: null,
            passwordResetExpires: null,
          },
        },
      );
      const ok = await bcrypt.compare(PASSWORD, hashed);
      console.log(
        `UPDATED ${email} role=${account.role} matched=${result.matchedCount} modified=${result.modifiedCount} verifyHash=${ok} prevRole=${existing.role} prevActive=${existing.isActive} prevStatus=${existing.accountStatus}`,
      );
    } else {
      const doc = {
        name: account.name,
        email,
        password: hashed,
        role: account.role,
        isActive: true,
        accountStatus: "active",
        avatar: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const inserted = await users.insertOne(doc);
      console.log(`CREATED ${email} role=${account.role} id=${inserted.insertedId}`);
    }
  }

  // Quick verify: reload and compare
  console.log("\nVerification:");
  for (const account of ACCOUNTS) {
    const email = account.email.toLowerCase().trim();
    const u = await users.findOne({ email });
    if (!u) {
      console.log(`FAIL missing ${email}`);
      continue;
    }
    const passOk = await bcrypt.compare(PASSWORD, u.password);
    console.log(
      `${email} | role=${u.role} | active=${u.isActive} | status=${u.accountStatus} | passwordOk=${passOk}`,
    );
  }
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await client.close().catch(() => {});
}
