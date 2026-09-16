/**
 * Phase 25.D — drop legacy unique indexes and sync schema indexes.
 *
 * Run once against each environment after deploying model changes:
 *   npx tsx scripts/sync-phase25d-indexes.ts
 *
 * Requires MONGODB_URI (same as the app).
 */
import mongoose from "mongoose";
import connectDB from "../src/lib/mongodb";
import PastPaper from "../src/models/PastPaper";
import TestYourselfTest from "../src/models/TestYourselfTest";
import Payment from "../src/models/Payment";
import Course from "../src/models/Course";
import Batch from "../src/models/Batch";

async function dropIfExists(
  collection: mongoose.Collection,
  indexName: string,
) {
  const existing = await collection.indexes();
  if (existing.some((idx) => idx.name === indexName)) {
    await collection.dropIndex(indexName);
    console.log(`Dropped index ${collection.collectionName}.${indexName}`);
  } else {
    console.log(`Skip missing ${collection.collectionName}.${indexName}`);
  }
}

async function main() {
  await connectDB();

  await dropIfExists(
    PastPaper.collection,
    "subject_1_sessionName_1_year_1_examType_1",
  );
  await dropIfExists(TestYourselfTest.collection, "subject_1_topic_1");
  // Field-level unique:true historically named transactionId_1; schema unique remains.
  // No drop needed if only one remains after schema cleanup.

  await dropIfExists(Course.collection, "category_1");
  await dropIfExists(Batch.collection, "approvalStatus_1");

  for (const model of [
    PastPaper,
    TestYourselfTest,
    Payment,
    Course,
    Batch,
  ]) {
    const result = await model.syncIndexes();
    console.log(`syncIndexes ${model.modelName}:`, result);
  }

  await mongoose.disconnect();
  console.log("Phase 25.D index sync complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
