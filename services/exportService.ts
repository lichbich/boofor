import { saveAs } from "file-saver";
import HTMLtoDOCX from "html-to-docx";
// @ts-ignore
import epub from "epub-gen-memory";

/**
 * Split HTML content into chapters based on <h1> elements for EPUB generation.
 */
export function splitHtmlIntoChapters(html: string): any[] {
  const sections: any[] = [];
  const h1Regex = /<h1[^>]*>(.*?)<\/h1>/gi;
  let match;
  const matches: { index: number; title: string; length: number }[] = [];

  while ((match = h1Regex.exec(html)) !== null) {
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

  const firstMatch = matches[0];
  const initialContent = html.substring(0, firstMatch.index).trim();
  if (initialContent) {
    const pageBreakRegex = /<div class="page-break" style="page-break-after: always;"><\/div>/i;
    const parts = initialContent.split(pageBreakRegex);

    if (parts.length > 1) {
      const remainingIntro = parts.slice(1).join('<div class="page-break" style="page-break-after: always;"></div>').trim();
      if (remainingIntro && remainingIntro.replace(/<[^>]*>/g, "").trim().length > 0) {
        sections.push({
          title: "Introduction",
          content: remainingIntro,
        });
      }
    } else {
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
    const content = html.substring(start + matches[i].length, end).trim();

    sections.push({
      title: matches[i].title,
      content: content,
    });
  }

  return sections;
}

/**
 * Generates DOCX Blob completely client-side in the browser.
 */
export const generateDocxBlob = async (html: string): Promise<Blob> => {
  if (!html) throw new Error("Missing HTML content");
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
  return new Blob([docxBuffer as any], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
};

/**
 * Generates EPUB Blob completely client-side in the browser.
 */
export const generateEpubBlob = async (
  html: string,
  title?: string,
  author?: string,
  coverBase64?: string
): Promise<Blob> => {
  if (!html) throw new Error("Missing HTML content");
  const bookTitle = title || "Book Export";
  const bookAuthor = author || "Unknown Author";

  const chapters = splitHtmlIntoChapters(html);

  let coverOption = undefined;
  if (coverBase64 && typeof coverBase64 === "string" && coverBase64.startsWith("data:")) {
    const match = coverBase64.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      const contentType = match[1];
      const base64Data = match[2];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);

      let ext = "jpg";
      if (contentType.includes("png")) ext = "png";
      else if (contentType.includes("gif")) ext = "gif";
      else if (contentType.includes("webp")) ext = "webp";

      if (typeof File !== "undefined") {
        coverOption = new File([byteArray], `cover.${ext}`, { type: contentType });
      }
    }
  }

  const option = {
    title: bookTitle,
    author: bookAuthor,
    cover: coverOption,
  };

  const epubBuffer = await epub(option as any, chapters);
  return new Blob([epubBuffer as any], { type: "application/epub+zip" });
};

/**
 * Exports processed HTML to Word (.docx) 100% client-side.
 */
export const exportToWord = async (
  processedHtml: string,
  title1: string,
  title2: string
): Promise<void> => {
  if (!processedHtml) return;

  const blob = await generateDocxBlob(processedHtml);
  const fullTitle = title1
    ? `${title1}${title2 ? ` ${title2}` : ""}`.replace(/\s+/g, " ").trim()
    : "Book_Exported";

  try {
    await navigator.clipboard.writeText(fullTitle);
  } catch (err) {
    console.error("Failed to copy title to clipboard:", err);
  }

  saveAs(blob, `${fullTitle}.docx`);
};

/**
 * Opens a print popup with formatted HTML content to enable A4 PDF saving.
 */
export const exportToPDF = async (
  processedHtml: string,
  title1: string,
  title2: string
): Promise<void> => {
  const fullTitle = title1
    ? `${title1}${title2 ? ` ${title2}` : ""}`.replace(/\s+/g, " ").trim()
    : "Book_Exported";

  try {
    await navigator.clipboard.writeText(fullTitle);
  } catch (err) {
    console.error("Failed to copy title to clipboard:", err);
  }

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    throw new Error("Vui lòng cho phép mở popup để xuất PDF.");
  }

  printWindow.document.write(`
    <html>
      <head>
        <title>${fullTitle}</title>
        <style>
          @page {
            size: A4;
            margin: 0.5in;
          }
          body {
            font-family: 'Times New Roman', serif;
            color: #000000;
            line-height: 1.5;
            font-size: 13pt;
          }
          h1 {
            font-size: 18pt;
            font-weight: bold;
            text-align: center;
            margin-top: 24pt;
            margin-bottom: 12pt;
          }
          p, span, div {
            font-size: 13pt;
            margin-bottom: 10pt;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          td, th {
            border: 1px solid black;
            padding: 5px;
          }
          .page-break {
            page-break-after: always;
          }
          @media print {
            html, body {
              height: auto;
            }
          }
        </style>
      </head>
      <body>
        ${processedHtml}
        <script>
          window.onload = () => {
            setTimeout(() => {
              window.print();
            }, 500);
          };
          window.onafterprint = () => {
            window.close();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

/**
 * Exports processed HTML and metadata to EPUB (.epub) 100% client-side.
 */
export const exportToEPUB = async (
  processedHtml: string,
  title1: string,
  title2: string,
  author: string,
  coverBase64?: string
): Promise<void> => {
  if (!processedHtml) return;

  const fullTitle = title1
    ? `${title1}${title2 ? ` ${title2}` : ""}`.replace(/\s+/g, " ").trim()
    : "Book_Exported";

  const blob = await generateEpubBlob(processedHtml, fullTitle, author, coverBase64);

  try {
    await navigator.clipboard.writeText(fullTitle);
  } catch (err) {
    console.error("Failed to copy title to clipboard:", err);
  }

  const fileName = author ? `${fullTitle}-${author}.epub` : `${fullTitle}.epub`;
  saveAs(blob, fileName);
};

