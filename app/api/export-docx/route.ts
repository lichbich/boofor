import { NextResponse } from "next/server";
import HTMLtoDOCX from "html-to-docx";

export async function POST(req: Request) {
  try {
    const { html } = await req.json();

    if (!html) {
      return NextResponse.json({ error: "Missing HTML content" }, { status: 400 });
    }

    const docxBuffer = await HTMLtoDOCX(html, null, {
      table: { row: { cantSplit: true } },
      footer: true,
      pageNumber: true,
      font: "Times New Roman",
      fontSize: 26, // html-to-docx uses half-points. 13pt = 26 half-points.
      title: {
        font: "Times New Roman",
        size: 32, // 16pt = 32 half-points
        align: "center",
      },
    });

    return new Response(docxBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": "attachment; filename=Book_Export.docx",
      },
    });
  } catch (error) {
    console.error("Export Error:", error);
    return NextResponse.json({ error: "Failed to generate document" }, { status: 500 });
  }
}
