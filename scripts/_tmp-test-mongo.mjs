import fs from "fs";
import { MongoClient } from "mongodb";

const env = fs.readFileSync(".env", "utf8");
const match = env.match(/^\s*MONGODB_URI=(.+)$/m);
const uri = match[1].trim();
const redacted = uri.replace(/\/\/([^:]+):[^@]+@/, "//$1:***@");
console.log("URI:", redacted);

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
try {
  await client.connect();
  await client.db().command({ ping: 1 });
  const dbName = new URL(uri.replace("mongodb+srv://", "https://")).pathname.replace(/^\//, "").split("?")[0];
  console.log("OK connected. default db:", dbName || "(none)");
  const cols = await client.db(dbName || "AdvanceLMS").listCollections().toArray();
  console.log("Existing collections:", cols.length, cols.map((c) => c.name).slice(0, 20));
} catch (e) {
  console.error("FAIL:", e.codeName || e.code, e.message);
  process.exitCode = 1;
} finally {
  await client.close().catch(() => {});
}
