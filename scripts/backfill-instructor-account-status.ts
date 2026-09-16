/**
 * One-time backfill: set accountStatus=pending for instructors saved before the field existed.
 * Run: npx tsx scripts/backfill-instructor-account-status.ts
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
    {
      role: "instructor",
      isActive: false,
      $or: [
        { accountStatus: { $exists: false } },
        { accountStatus: null },
      ],
    },
    { $set: { accountStatus: "pending" } },
  );

  console.log(
    `Backfilled ${result.modifiedCount} instructor(s) to accountStatus=pending`,
  );

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
