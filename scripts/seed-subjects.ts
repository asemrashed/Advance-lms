/**
 * Seed canonical O-Level subjects and link existing platform QB rows.
 *
 *   npx tsx scripts/seed-subjects.ts
 *   npx tsx scripts/seed-subjects.ts --dry-run
 */
import { readFileSync } from "fs";
import { join } from "path";
import mongoose from "mongoose";
import Subject from "../src/models/Subject";
import PlatformQuestion from "../src/models/PlatformQuestion";
import { toSubjectSlug } from "../src/lib/subjectUtils";

const SUBJECTS = [
  { name: "Mathematics (Syllabus D)", code: "4024" },
  { name: "Additional Mathematics", code: "4037" },
  { name: "Statistics", code: "4040" },
  { name: "Physics", code: "5054" },
  { name: "Chemistry", code: "5070" },
  { name: "Biology", code: "5090" },
  { name: "Combined Science", code: "5129" },
  { name: "Environmental Management", code: "5014" },
  { name: "Computer Science", code: "2210" },
  { name: "Design & Technology", code: "6043" },
  { name: "Agriculture", code: "5038" },
] as const;

/** Re-tag existing QB rows for math syllabi. */
const QB_LINKS = [
  {
    code: "4024",
    name: "Mathematics (Syllabus D)",
    subjectPatterns: [
      /^mathematics$/i,
      /^mathmatics$/i,
      /^math$/i,
      /^general$/i,
      /^uncategorized$/i,
      /mathematics.*syllabus/i,
      /syllabus\s*d/i,
    ],
    codeHints: ["4024"],
  },
  {
    code: "4037",
    name: "Additional Mathematics",
    subjectPatterns: [
      /^additional\s*mathematics?$/i,
      /^additional\s*maths?$/i,
      /^add\.?\s*maths?$/i,
      /^addmath$/i,
    ],
    codeHints: ["4037"],
  },
] as const;

function loadEnvLocal() {
  const path = join(process.cwd(), ".env.local");
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
}

function matchesHint(text: string, hints: readonly string[]) {
  const upper = text.toUpperCase();
  return hints.some((h) => upper.includes(h));
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  loadEnvLocal();
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not set");

  await mongoose.connect(uri);

  console.log(dryRun ? "DRY RUN — no writes\n" : "Seeding subjects…\n");

  const subjectByCode = new Map<string, { _id: mongoose.Types.ObjectId; name: string }>();

  for (const row of SUBJECTS) {
    const slug = toSubjectSlug(row.name);
    const existing = await Subject.findOne({ code: row.code }).lean();
    if (existing) {
      subjectByCode.set(row.code, {
        _id: existing._id as mongoose.Types.ObjectId,
        name: String(existing.name),
      });
      if (!dryRun) {
        await Subject.updateOne(
          { _id: existing._id },
          { $set: { name: row.name, slug, isActive: true } },
        );
      }
      console.log(`✓ ${row.code} ${row.name} (updated)`);
      continue;
    }

    if (dryRun) {
      console.log(`+ ${row.code} ${row.name} (would create)`);
      continue;
    }

    const created = await Subject.create({
      name: row.name,
      code: row.code,
      slug,
      isActive: true,
    });
    subjectByCode.set(row.code, { _id: created._id, name: row.name });
    console.log(`+ ${row.code} ${row.name} (created)`);
  }

  if (dryRun) {
    await mongoose.disconnect();
    return;
  }

  // Reload ids after creates
  for (const row of SUBJECTS) {
    if (subjectByCode.has(row.code)) continue;
    const doc = await Subject.findOne({ code: row.code }).lean();
    if (doc) {
      subjectByCode.set(row.code, {
        _id: doc._id as mongoose.Types.ObjectId,
        name: String(doc.name),
      });
    }
  }

  console.log("\nLinking platform question bank rows…\n");

  for (const link of QB_LINKS) {
    const subject = subjectByCode.get(link.code);
    if (!subject) {
      console.warn(`Skip QB link ${link.code}: subject not found`);
      continue;
    }

    const candidates = await PlatformQuestion.find({
      $or: [
        ...link.subjectPatterns.map((p) => ({
          subject: { $regex: p.source, $options: "i" },
        })),
        { subjectCode: link.code },
        { qid: { $regex: link.code, $options: "i" } },
        { tags: { $elemMatch: { $regex: link.code, $options: "i" } } },
      ],
    })
      .select("_id subject subjectCode qid")
      .lean();

    const toUpdate = candidates.filter((q) => {
      const subj = String(q.subject || "");
      const bySubject = link.subjectPatterns.some((p) => p.test(subj));
      const byCode = String(q.subjectCode || "").toUpperCase() === link.code;
      const byQid = matchesHint(String(q.qid || ""), link.codeHints);
      if (byCode || byQid) return true;
      if (bySubject) {
        // For loose names like General, only link when qid/tags hint this syllabus
        if (/^general$/i.test(subj) || /^uncategorized$/i.test(subj)) {
          return byQid || matchesHint(String(q.qid || ""), link.codeHints);
        }
        return true;
      }
      return false;
    });

    if (!toUpdate.length) {
      // Past-paper imports often land as General before subject is selected
      if (link.code === "4024") {
        const generalPast = await PlatformQuestion.updateMany(
          {
            sourceType: "pastpaper",
            subject: { $in: ["General", "Uncategorized"] },
            $or: [{ subjectCode: { $exists: false } }, { subjectCode: "" }],
          },
          {
            $set: {
              subject: subject.name,
              subjectCode: link.code,
              subjectId: subject._id,
              grade: "O",
            },
          },
        );
        if (generalPast.modifiedCount > 0) {
          console.log(
            `  ${link.code}: linked ${generalPast.modifiedCount} General past-paper row(s)`,
          );
        } else {
          console.log(`  ${link.code}: no matching QB rows`);
        }
        continue;
      }
      console.log(`  ${link.code}: no matching QB rows`);
      continue;
    }

    const ids = toUpdate.map((q) => q._id);
    const result = await PlatformQuestion.updateMany(
      { _id: { $in: ids } },
      {
        $set: {
          subject: subject.name,
          subjectCode: link.code,
          subjectId: subject._id,
        },
      },
    );
    console.log(
      `  ${link.code} ${subject.name}: linked ${result.modifiedCount} question(s)`,
    );
  }

  // Broader pass: any past-paper row whose qid contains a known syllabus code
  for (const row of SUBJECTS) {
    const subject = subjectByCode.get(row.code);
    if (!subject) continue;
    const result = await PlatformQuestion.updateMany(
      {
        sourceType: "pastpaper",
        qid: { $regex: row.code, $options: "i" },
        subjectCode: { $ne: row.code },
      },
      {
        $set: {
          subject: subject.name,
          subjectCode: row.code,
          subjectId: subject._id,
        },
      },
    );
    if (result.modifiedCount > 0) {
      console.log(`  ${row.code}: +${result.modifiedCount} past-paper qid match(es)`);
    }
  }

  await mongoose.disconnect();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
