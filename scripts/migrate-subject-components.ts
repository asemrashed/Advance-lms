/**
 * Seed default exam components (Paper 1 MCQ, Paper 2 Written) on subjects
 * that have none, and backfill PlatformQuestion.componentId by questionFormat.
 *
 *   npx tsx scripts/migrate-subject-components.ts
 *   npx tsx scripts/migrate-subject-components.ts --dry-run
 */
import { readFileSync } from "fs";
import { join } from "path";
import mongoose from "mongoose";
import Subject from "../src/models/Subject";
import PlatformQuestion from "../src/models/PlatformQuestion";
import { toSubjectComponentDocs } from "../src/app/api/_lib/subjects";

function loadEnvLocal() {
  for (const file of [".env.local", ".env"]) {
    try {
      const path = join(process.cwd(), file);
      const text = readFileSync(path, "utf8");
      for (const line of text.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = value;
      }
    } catch {
      /* optional */
    }
  }
}

async function main() {
  loadEnvLocal();
  const dryRun = process.argv.includes("--dry-run");
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI missing");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log(dryRun ? "Dry run — no writes" : "Connected");

  const subjects = await Subject.find({}).lean();
  let subjectsUpdated = 0;
  let questionsUpdated = 0;

  for (const subject of subjects) {
    const existing = Array.isArray((subject as { components?: unknown[] }).components)
      ? ((subject as { components: { _id?: unknown; name?: string; type?: string }[] }).components || [])
      : [];

    let components = existing;
    if (!components.length) {
      const docs = toSubjectComponentDocs([
        { name: "Paper 1", type: "mcq", order: 1 },
        { name: "Paper 2", type: "written", order: 2 },
      ]);
      if (!dryRun) {
        await Subject.updateOne({ _id: subject._id }, { $set: { components: docs } });
        const refreshed = await Subject.findById(subject._id).lean();
        components = (refreshed as { components?: typeof components })?.components || docs;
      } else {
        components = docs as typeof components;
      }
      subjectsUpdated += 1;
      console.log(
        `Subject ${subject.code || subject.name}: added default Paper 1 (MCQ) + Paper 2 (Written)`,
      );
    }

    const mcqComp = components.find((c) => c.type === "mcq");
    const writtenComp = components.find((c) => c.type === "written");

    if (mcqComp?._id) {
      const filter = {
        $and: [
          {
            $or: [
              { subjectId: subject._id },
              { subjectCode: String(subject.code || "").toUpperCase() },
              {
                subject: {
                  $regex: `^${String(subject.name || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
                  $options: "i",
                },
              },
            ],
          },
          { $or: [{ componentId: { $exists: false } }, { componentId: null }] },
          {
            $or: [
              { questionFormat: "mcq" },
              { questionFormat: { $exists: false } },
              { "options.0": { $exists: true } },
            ],
          },
          { questionFormat: { $ne: "written" } },
        ],
      };
      if (dryRun) {
        const n = await PlatformQuestion.countDocuments(filter);
        questionsUpdated += n;
      } else {
        const res = await PlatformQuestion.updateMany(filter, {
          $set: {
            componentId: mcqComp._id,
            componentName: mcqComp.name || "Paper 1",
            componentType: "mcq",
            questionFormat: "mcq",
          },
        });
        questionsUpdated += res.modifiedCount;
      }
    }

    if (writtenComp?._id) {
      const filter = {
        $and: [
          {
            $or: [
              { subjectId: subject._id },
              { subjectCode: String(subject.code || "").toUpperCase() },
              {
                subject: {
                  $regex: `^${String(subject.name || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
                  $options: "i",
                },
              },
            ],
          },
          { $or: [{ componentId: { $exists: false } }, { componentId: null }] },
          { questionFormat: "written" },
        ],
      };
      if (dryRun) {
        const n = await PlatformQuestion.countDocuments(filter);
        questionsUpdated += n;
      } else {
        const res = await PlatformQuestion.updateMany(filter, {
          $set: {
            componentId: writtenComp._id,
            componentName: writtenComp.name || "Paper 2",
            componentType: "written",
          },
        });
        questionsUpdated += res.modifiedCount;
      }
    }
  }

  console.log(
    `\nDone. Subjects ${dryRun ? "would update" : "updated"}: ${subjectsUpdated}. Questions ${dryRun ? "would update" : "updated"}: ${questionsUpdated}.`,
  );
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
