/**
 * Promote all existing `admin` users to `super_admin`.
 * Run once after deploying the super_admin role:
 *   npx tsx scripts/promote-admins-to-super-admin.ts
 */
import mongoose from "mongoose";
import User from "../src/models/User";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is required");
  }

  await mongoose.connect(uri);

  const result = await User.updateMany(
    { role: "admin" },
    { $set: { role: "super_admin" } },
  );

  console.log(
    `Promoted ${result.modifiedCount} admin(s) to super_admin (matched ${result.matchedCount}).`,
  );

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
