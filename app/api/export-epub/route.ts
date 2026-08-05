import { NextResponse } from "next/server";
// @ts-ignore
import epub from "epub-gen-memory";

function splitHtmlIntoChapters(html: string): any[] {
  const sections: any[] = [];
  
  // Use a regex to match <h1> tags
  const h1Regex = /<h1[^>]*>(.*?)<\/h1>/gi;
  
  let match;
  const matches: { index: number; title: string; length: number }[] = [];
  
  while ((match = h1Regex.exec(html)) !== null) {
    // Strip HTML tags from the matched title
    const titleText = match[1].replace(/<[^>]*>/g, "").trim() || `Chapter ${matches.length + 1}`;
    matches.push({
      index: match.index,
      title: titleText,
      length: match[0].length,
    });
  }
  
  if (matches.length === 0) {
    return [{ title: "Content", content: html }];
  }
  
  // Add content before first H1 as a separate introduction chapter if it exists (Title Page is omitted)
  const firstMatch = matches[0];
  const initialContent = html.substring(0, firstMatch.index).trim();
  if (initialContent) {
    // Split the initialContent by the first page break if it's the title page
    const pageBreakRegex = /<div class="page-break" style="page-break-after: always;"><\/div>/i;
    const parts = initialContent.split(pageBreakRegex);
    
    if (parts.length > 1) {
      // The first part is the Title Page (omitted for EPUB)
      // The second part (if any) is the actual introduction/preface content
      const remainingIntro = parts.slice(1).join('<div class="page-break" style="page-break-after: always;"></div>').trim();
      if (remainingIntro && remainingIntro.replace(/<[^>]*>/g, "").trim().length > 0) {
        sections.push({
          title: "Introduction",
          content: remainingIntro,
        });
      }
    } else {
      // Only one part exists, treat it as the Introduction
      const introContent = parts[0].trim();
      if (introContent && introContent.replace(/<[^>]*>/g, "").trim().length > 0) {
        sections.push({
          title: "Introduction",
          content: introContent,
        });
      }
    }
  }
  
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = (i + 1 < matches.length) ? matches[i + 1].index : html.length;
    // Strip the matched leading <h1>...</h1> header to prevent duplicate headings
    // since epub-gen-memory automatically prepends the chapter title as a header.
    const content = html.substring(start + matches[i].length, end).trim();
    
    sections.push({
      title: matches[i].title,
      content: content,
    });
  }
  
  return sections;
}

export async function POST(req: Request) {
  try {
    const { html, title, author, cover } = await req.json();

    if (!html) {
      return NextResponse.json({ error: "Missing HTML content" }, { status: 400 });
    }

    const bookTitle = title || "Book Export";
    const bookAuthor = author || "Unknown Author";

    // Split the HTML into structured chapters based on <h1> elements
    const chapters = splitHtmlIntoChapters(html);

    let coverOption = undefined;
    if (cover && typeof cover === "string" && cover.startsWith("data:")) {
      const match = cover.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const contentType = match[1];
        const base64Data = match[2];
        const buffer = Buffer.from(base64Data, "base64");

        let ext = "jpg";
        if (contentType.includes("png")) ext = "png";
        else if (contentType.includes("gif")) ext = "gif";
        else if (contentType.includes("webp")) ext = "webp";

        if (typeof File !== "undefined") {
          coverOption = new File([buffer], `cover.${ext}`, { type: contentType }) as any;
        } else {
          const { File: NodeFile } = require("buffer");
          if (NodeFile) {
            coverOption = new NodeFile([buffer], `cover.${ext}`, { type: contentType }) as any;
          } else {
            coverOption = {
              name: `cover.${ext}`,
              arrayBuffer: () => buffer,
            } as any;
          }
        }

        // Note: We only register the cover image in the EPUB metadata (content.opf) 
        // to avoid rendering a blank cover page inside strict EPUB readers.
        // The reader app will use the coverOption metadata to show the cover in the library.
      }
    }

    const option = {
      title: bookTitle,
      author: bookAuthor,
      cover: coverOption,
    };

    const epubBuffer = await epub(option as any, chapters);

    return new Response(epubBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/epub+zip",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(bookTitle)}.epub"`,
      },
    });
  } catch (error: any) {
    console.error("Export EPUB Error:", error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}
