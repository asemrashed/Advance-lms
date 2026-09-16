/**
 * Import past-paper questions into Platform QB from XLSX / CSV / Google Sheet.
 *
 * Uses the same column layout as `0606_QuestionDatabase_MASTER.xlsx`.
 * Upserts by `qid` (safe to re-run). Admin only.
 *
 * POST multipart:
 *   file: .xlsx | .xls | .csv
 *   sheetName?: string
 *   preview?: "1"
 *   subjectId?, subjectCode?, subjectName?, grade?, accessPolicy?
 *   sheetUrl?: Google Sheets URL (alternative to file)
 *
 * POST JSON:
 *   { sheetUrl, sheetName?, preview?, subjectId?, ... }
 *
 * GET: download blank CSV template matching the master headers.
 */
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSessionUser } from "@/app/api/_lib/phase12";
import connectDB from "@/lib/mongodb";
import PlatformQuestion from "@/models/PlatformQuestion";
import {
  normalizePastPaperQuestion,
  type NormalizedPastPaperQuestion,
} from "@/lib/pastPaperQuestion";
import { buildMasterTemplateCsv } from "@/lib/pastPaperSheetHeaders";
import {
  googleSheetToExportUrl,
  parseWorkbookBuffer,
  type SheetRowDraft,
} from "@/lib/pastPaperSheetImport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB
const PREVIEW_SAMPLE = 5;
const WRITE_CHUNK = 200;

function parseBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  const s = String(value ?? "").trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

async function fetchSheetBuffer(url: string): Promise<{ buffer: Buffer; filename: string }> {
  const exportUrl = googleSheetToExportUrl(url, "xlsx") || url;
  const res = await fetch(exportUrl, {
    redirect: "follow",
    headers: { Accept: "*/*" },
  });
  if (!res.ok) {
    throw new Error(
      `Could not download sheet (${res.status}). Make sure the Google Sheet is shared as "Anyone with the link can view".`,
    );
  }
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("text/html")) {
    throw new Error(
      'Google returned an HTML page instead of the sheet. Share the sheet as "Anyone with the link can view", then try again.',
    );
  }
  const ab = await res.arrayBuffer();
  if (ab.byteLength > MAX_BYTES) {
    throw new Error(`File too large (max ${MAX_BYTES / (1024 * 1024)} MB)`);
  }
  return { buffer: Buffer.from(ab), filename: exportUrl };
}

function buildDocs(
  rows: SheetRowDraft[],
  opts: {
    ownerId: string;
    subjectId?: string;
    subjectCode?: string;
    subjectName?: string;
    grade?: string;
    accessPolicy?: string;
  },
): {
  docs: NormalizedPastPaperQuestion[];
  skippedNoText: number;
  skippedNoQid: number;
  incomplete: number;
} {
  const docs: NormalizedPastPaperQuestion[] = [];
  let skippedNoText = 0;
  let skippedNoQid = 0;
  let incomplete = 0;

  for (const row of rows) {
    const doc = normalizePastPaperQuestion(row, {
      ownerId: opts.ownerId,
      ownerType: "admin",
      accessPolicy: opts.accessPolicy || "private",
      aiGenerated: false,
      subject: opts.subjectName,
      subjectCode: opts.subjectCode,
      subjectId: opts.subjectId || undefined,
      grade: opts.grade,
    });
    if (!doc) {
      skippedNoText += 1;
      continue;
    }
    if (!doc.qid) {
      skippedNoQid += 1;
      continue;
    }
    if (doc.status === "incomplete") incomplete += 1;
    docs.push(doc);
  }

  return { docs, skippedNoText, skippedNoQid, incomplete };
}

async function upsertDocs(docs: NormalizedPastPaperQuestion[]) {
  const qids = docs.map((d) => d.qid!).filter(Boolean);
  const existing = new Set(
    (
      await PlatformQuestion.find({ qid: { $in: qids } })
        .select("qid")
        .lean()
    ).map((r) => String((r as { qid: string }).qid)),
  );

  let inserted = 0;
  let updated = 0;

  for (let i = 0; i < docs.length; i += WRITE_CHUNK) {
    const slice = docs.slice(i, i + WRITE_CHUNK);
    for (const doc of slice) {
      if (doc.qid && existing.has(doc.qid)) updated += 1;
      else inserted += 1;
    }
    await PlatformQuestion.bulkWrite(
      slice.map((doc) => ({
        updateOne: {
          filter: { qid: doc.qid },
          update: { $set: doc },
          upsert: true,
        },
      })),
      { ordered: false },
    );
  }

  return { inserted, updated };
}

function toSample(docs: NormalizedPastPaperQuestion[]) {
  return docs.slice(0, PREVIEW_SAMPLE).map((d) => ({
    qid: d.qid,
    subject: d.subject,
    topic: d.topic,
    topicNumber: d.topicNumber,
    year: d.year,
    session: d.session,
    paper: d.paper,
    questionNumber: d.questionNumber,
    difficulty: d.difficulty,
    marks: d.marks,
    questionText: d.questionText.slice(0, 160),
    status: d.status,
    isActive: d.isActive,
  }));
}

export async function GET() {
  const csv = buildMasterTemplateCsv();
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="platform-qb-master-template.csv"',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["admin"]);
    if (auth.error) return auth.error;

    const contentType = request.headers.get("content-type") || "";
    let buffer: Buffer | null = null;
    let filename = "upload";
    let sheetName: string | undefined;
    let preview = false;
    let subjectId = "";
    let subjectCode = "";
    let subjectName = "";
    let grade = "";
    let accessPolicy = "private";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      sheetName = form.get("sheetName") ? String(form.get("sheetName")) : undefined;
      preview = parseBool(form.get("preview"));
      subjectId = form.get("subjectId") ? String(form.get("subjectId")) : "";
      subjectCode = form.get("subjectCode") ? String(form.get("subjectCode")) : "";
      subjectName = form.get("subjectName") ? String(form.get("subjectName")) : "";
      grade = form.get("grade") ? String(form.get("grade")) : "";
      accessPolicy = form.get("accessPolicy")
        ? String(form.get("accessPolicy"))
        : "private";

      const sheetUrl = form.get("sheetUrl") ? String(form.get("sheetUrl")).trim() : "";
      const file = form.get("file");

      if (file && file instanceof File && file.size > 0) {
        if (file.size > MAX_BYTES) {
          return NextResponse.json(
            {
              success: false,
              error: `File too large (max ${MAX_BYTES / (1024 * 1024)} MB)`,
            },
            { status: 400 },
          );
        }
        buffer = Buffer.from(await file.arrayBuffer());
        filename = file.name || "upload.xlsx";
      } else if (sheetUrl) {
        const fetched = await fetchSheetBuffer(sheetUrl);
        buffer = fetched.buffer;
        filename = fetched.filename;
      } else {
        return NextResponse.json(
          {
            success: false,
            error: "Provide a .xlsx/.csv file or a Google Sheet URL",
          },
          { status: 400 },
        );
      }
    } else {
      const body = (await request.json()) as Record<string, unknown>;
      preview = parseBool(body.preview);
      sheetName = body.sheetName ? String(body.sheetName) : undefined;
      subjectId = body.subjectId ? String(body.subjectId) : "";
      subjectCode = body.subjectCode ? String(body.subjectCode) : "";
      subjectName = body.subjectName ? String(body.subjectName) : "";
      grade = body.grade ? String(body.grade) : "";
      accessPolicy = body.accessPolicy ? String(body.accessPolicy) : "private";

      const sheetUrl = body.sheetUrl ? String(body.sheetUrl).trim() : "";
      if (!sheetUrl) {
        return NextResponse.json(
          { success: false, error: "sheetUrl is required for JSON imports" },
          { status: 400 },
        );
      }
      const fetched = await fetchSheetBuffer(sheetUrl);
      buffer = fetched.buffer;
      filename = fetched.filename;
    }

    if (!buffer) {
      return NextResponse.json(
        { success: false, error: "No file data received" },
        { status: 400 },
      );
    }

    const parsed = parseWorkbookBuffer(buffer, { sheetName, filename });
    const { docs, skippedNoText, skippedNoQid, incomplete } = buildDocs(parsed.rows, {
      ownerId: auth.user.id,
      subjectId:
        subjectId && mongoose.isValidObjectId(subjectId) ? subjectId : undefined,
      subjectCode: subjectCode || undefined,
      subjectName: subjectName || undefined,
      grade: grade || undefined,
      accessPolicy,
    });

    const sample = toSample(docs);
    const baseStats = {
      rawRows: parsed.rawRowCount,
      ready: docs.length,
      skippedNoText,
      skippedNoQid,
      incomplete,
    };

    if (preview) {
      return NextResponse.json({
        success: true,
        data: {
          preview: true,
          sheetName: parsed.sheetName,
          sheetNames: parsed.sheetNames,
          stats: baseStats,
          sample,
        },
      });
    }

    if (!docs.length) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No importable rows found. Need Question_Text and QID columns matching the master sheet.",
          data: {
            sheetName: parsed.sheetName,
            sheetNames: parsed.sheetNames,
            stats: baseStats,
          },
        },
        { status: 422 },
      );
    }

    await connectDB();
    const { inserted, updated } = await upsertDocs(docs);

    return NextResponse.json({
      success: true,
      data: {
        preview: false,
        sheetName: parsed.sheetName,
        sheetNames: parsed.sheetNames,
        stats: { ...baseStats, inserted, updated },
        sample,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "IMPORT_FAILED";
    console.error("Platform QB sheet import error:", error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
