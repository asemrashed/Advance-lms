import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { readUploadFile } from "@/lib/mediaStorage";

interface RouteParams {
  params: Promise<{ path: string[] }>;
}

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

/** Serve uploaded images via API so they work when static /uploads is not proxied. */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const segments = (await params).path || [];
    if (segments.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (segments.some((s) => !s || s === "." || s === ".." || s.includes("\0"))) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const relative = segments.join("/");
    const ext = path.extname(relative).toLowerCase();
    const contentType = CONTENT_TYPES[ext];
    if (!contentType) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
    }

    const file = await readUploadFile(relative);
    if (!file) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(file.buffer), {
      status: 200,
      headers: {
        "Content-Type": file.contentType || contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
