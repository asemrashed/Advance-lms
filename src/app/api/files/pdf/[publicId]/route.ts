import { NextRequest, NextResponse } from "next/server";
import { sanitizePdfPublicId } from "@/lib/pdf/extractPdfText";
import { readPdfBuffer } from "@/lib/pdf/pdfStorage";

interface RouteParams {
  params: Promise<{ publicId: string }>;
}

function pdfHeaders(publicId: string, size: number): HeadersInit {
  return {
    "Content-Type": "application/pdf",
    "Content-Length": String(size),
    "Content-Disposition": `inline; filename="${publicId}.pdf"`,
    "Cache-Control": "private, max-age=86400, immutable",
  };
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { publicId: raw } = await params;
    const publicId = sanitizePdfPublicId(decodeURIComponent(raw || ""));
    if (!publicId) {
      return NextResponse.json(
        { success: false, error: "Invalid PDF id" },
        { status: 400 },
      );
    }

    const buffer = await readPdfBuffer(publicId);
    if (!buffer) {
      return NextResponse.json(
        { success: false, error: "PDF not found" },
        { status: 404 },
      );
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: pdfHeaders(publicId, buffer.length),
    });
  } catch (error) {
    console.error("GET /api/files/pdf error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load PDF" },
      { status: 500 },
    );
  }
}
