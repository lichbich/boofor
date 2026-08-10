import { saveAs } from "file-saver";

/**
 * Service to export document HTML structure to Word and PDF files.
 */

/**
 * Sends processed HTML to the backend Docx service and downloads the Word file.
 */
export const exportToWord = async (
  processedHtml: string,
  title1: string,
  title2: string
): Promise<void> => {
  if (!processedHtml) return;

  const response = await fetch("/api/export-docx", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ html: processedHtml }),
  });

  if (!response.ok) {
    throw new Error("Failed to export Word document");
  }

  const blob = await response.blob();
  const fullTitle = title1
    ? `${title1}${title2 ? ` ${title2}` : ""}`.replace(/\s+/g, " ").trim()
    : "Book_Exported";

  // Automatically copy full title to clipboard
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
 * Sends processed HTML and metadata to the backend EPUB service and downloads the EPUB file.
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

  const response = await fetch("/api/export-epub", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      html: processedHtml,
      title: fullTitle,
      author,
      cover: coverBase64,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to export EPUB document");
  }

  const blob = await response.blob();

  // Automatically copy full title to clipboard
  try {
    await navigator.clipboard.writeText(fullTitle);
  } catch (err) {
    console.error("Failed to copy title to clipboard:", err);
  }

  const fileName = author ? `${fullTitle}-${author}.epub` : `${fullTitle}.epub`;
  saveAs(blob, fileName);
};

