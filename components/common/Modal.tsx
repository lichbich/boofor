import React, { useState, useEffect } from "react";
import { X, List, Download, Loader2, CheckSquare2, Square, ChevronDown } from "lucide-react";
import { saveAs } from "file-saver";
import { getProcessedHtml } from "@/utils/formatter";

interface ModalProps {
  isOpen: boolean;
  isVisible: boolean;
  onClose: () => void;
  title: string;
  detectedChapters: string[];
  buttonPos: { x: number; y: number };
  editorHtml: string;
  title1: string;
  title2: string;
  author: string;
}

const getChapterHtmlMap = (editorHtml: string): Record<string, string> => {
  const map: Record<string, string> = {};
  if (typeof window === "undefined" || !editorHtml) return map;

  const parser = new DOMParser();
  const doc = parser.parseFromString(editorHtml, "text/html");

  const h1Elements = Array.from(doc.body.querySelectorAll("h1"));

  if (h1Elements.length === 0) {
    map["Content"] = doc.body.innerHTML;
    return map;
  }

  h1Elements.forEach((h1, index) => {
    const titleText = h1.textContent?.trim() || `Chapter ${index + 1}`;
    
    // We create a container to hold this chapter's elements
    const container = document.createElement("div");
    container.appendChild(h1.cloneNode(true));

    let next = h1.nextElementSibling;
    while (next && next.tagName !== "H1") {
      container.appendChild(next.cloneNode(true));
      next = next.nextElementSibling;
    }

    map[titleText] = container.innerHTML;
  });

  return map;
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  isVisible,
  onClose,
  title,
  detectedChapters,
  buttonPos,
  editorHtml,
  title1,
  title2,
  author,
}) => {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [exportFormat, setExportFormat] = useState<"docx" | "pdf" | "epub">("docx");
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState("");
  const [isFormatDropdownOpen, setIsFormatDropdownOpen] = useState(false);
  const formatDropdownRef = React.useRef<HTMLDivElement>(null);

  // Close format dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (formatDropdownRef.current && !formatDropdownRef.current.contains(event.target as Node)) {
        setIsFormatDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset/initialize selection state when modal opens or detectedChapters change
  useEffect(() => {
    if (isOpen) {
      const initialSelected: Record<string, boolean> = {};
      detectedChapters.forEach((ch) => {
        initialSelected[ch] = true; // select all by default
      });
      setSelected(initialSelected);
    }
  }, [isOpen, detectedChapters]);

  if (!isOpen) return null;

  const allSelected = detectedChapters.length > 0 && detectedChapters.every((ch) => selected[ch]);
  const selectedCount = detectedChapters.filter((ch) => selected[ch]).length;

  const handleSelectAll = () => {
    const nextSelected: Record<string, boolean> = {};
    detectedChapters.forEach((ch) => {
      nextSelected[ch] = !allSelected;
    });
    setSelected(nextSelected);
  };

  const handleToggle = (chapter: string) => {
    setSelected((prev) => ({
      ...prev,
      [chapter]: !prev[chapter],
    }));
  };

  // Export Selected Chapters
  const handleExportSelected = async () => {
    const selectedChs = detectedChapters.filter((ch) => selected[ch]);
    if (selectedChs.length === 0) {
      alert("Vui lòng chọn ít nhất một mục để xuất.");
      return;
    }

    setIsExporting(true);
    setExportProgress("Khởi tạo ZIP...");

    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const chapterHtmlMap = getChapterHtmlMap(editorHtml);

      // Iterate and generate/fetch files for each selected chapter
      for (let i = 0; i < selectedChs.length; i++) {
        const chapterTitle = selectedChs[i];
        setExportProgress(`Xử lý ${i + 1}/${selectedChs.length}: ${chapterTitle}...`);

        const rawHtml = chapterHtmlMap[chapterTitle] || `<h1>${chapterTitle}</h1><p>Nội dung trống.</p>`;
        
        const processedHtml = getProcessedHtml(rawHtml, "", "", "");
        const fileTitle = chapterTitle.replace(/[\\/*?:"<>|]/g, "_").trim();

        if (exportFormat === "docx") {
          const response = await fetch("/api/export-docx", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ html: processedHtml }),
          });
          if (!response.ok) throw new Error(`Lỗi xuất Word: ${chapterTitle}`);
          const docxBlob = await response.blob();
          
          if (selectedChs.length === 1) {
            saveAs(docxBlob, `${fileTitle}.docx`);
          } else {
            zip.file(`${fileTitle}.docx`, docxBlob);
          }
        } 
        else if (exportFormat === "epub") {
          const response = await fetch("/api/export-epub", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ html: processedHtml, title: fileTitle, author }),
          });
          if (!response.ok) throw new Error(`Lỗi xuất EPUB: ${chapterTitle}`);
          const epubBlob = await response.blob();

          if (selectedChs.length === 1) {
            saveAs(epubBlob, `${fileTitle}.epub`);
          } else {
            zip.file(`${fileTitle}.epub`, epubBlob);
          }
        } 
        else if (exportFormat === "pdf") {
          const html2pdf = (await import("html2pdf.js")).default;
          const opt = {
            margin: 0.5,
            filename: `${fileTitle}.pdf`,
            image: { type: 'jpeg' as const, quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in' as const, format: 'a4' as const, orientation: 'portrait' as const }
          };
          
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = processedHtml;
          document.body.appendChild(tempDiv);
          const pdfBlob = await html2pdf().set(opt).from(tempDiv).toPdf().outputPdf('blob');
          document.body.removeChild(tempDiv);

          if (selectedChs.length === 1) {
            saveAs(pdfBlob, `${fileTitle}.pdf`);
          } else {
            zip.file(`${fileTitle}.pdf`, pdfBlob);
          }
        }
      }

      // If multiple chapters were selected, compile and download as a ZIP file
      if (selectedChs.length > 1) {
        setExportProgress("Nén file ZIP...");
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const cleanZipName = (title1 || "Book").replace(/[\\/*?:"<>|]/g, "_");
        saveAs(zipBlob, `${cleanZipName}_Chapters_${exportFormat.toUpperCase()}.zip`);
      }

      setExportProgress("Hoàn thành!");
      setTimeout(() => setExportProgress(""), 1500);
    } catch (error) {
      console.error(error);
      alert("Đã xảy ra lỗi trong quá trình xuất bản.");
    } finally {
      setIsExporting(false);
    }
  };

  // Export all detected chapters as a simple text table of contents / appendix file
  const handleExportAppendix = () => {
    if (detectedChapters.length === 0) {
      alert("Không tìm thấy chương nào để xuất.");
      return;
    }
    
    const fileTitle = `${title1}${title2 ? ` - ${title2}` : ""}`.trim() || "Book";
    const content = `DANH SÁCH PHỤ LỤC (MỤC LỤC CHI TIẾT)\n` +
      `Tên sách: ${fileTitle}\n` +
      `Tác giả: ${author || "Không rõ"}\n` +
      `Tổng số phần đã nhận diện: ${detectedChapters.length}\n` +
      `--------------------------------------------------\n\n` +
      detectedChapters.map((ch, index) => `${index + 1}. ${ch}`).join("\n");
      
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const cleanFileName = fileTitle.replace(/[\\/*?:"<>|]/g, "_").replace(/\s+/g, "_");
    saveAs(blob, `Phu_luc_${cleanFileName}.txt`);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-colors duration-300 ${
        isVisible ? "bg-black/60 backdrop-blur-sm" : "bg-transparent backdrop-blur-none"
      }`}
    >
      <div
        className={`bg-white dark:bg-[#161b22] rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] border border-gray-150 dark:border-slate-800 transition-all duration-300 pointer-events-auto
          ${isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
        style={{ transformOrigin: `${buttonPos.x}px ${buttonPos.y}px` }}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50 dark:bg-[#0d1117]/50">
          <h2 className="text-lg font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
            <List className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            {title} ({detectedChapters.length})
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-250 dark:hover:bg-[#1f2937] rounded-full text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Controls */}
        <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/40 dark:bg-[#0d1117]/20 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            {/* Select All Action */}
            <button
              onClick={handleSelectAll}
              disabled={detectedChapters.length === 0}
              className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors"
            >
              {allSelected ? (
                <CheckSquare2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              ) : (
                <Square className="w-4 h-4 text-gray-400" />
              )}
              Chọn tất cả ({selectedCount}/{detectedChapters.length})
            </button>

            {/* Export Format Select */}
            <div className="flex items-center gap-2 w-full sm:w-auto" ref={formatDropdownRef}>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Định dạng:</label>
              <div className="relative w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsFormatDropdownOpen(!isFormatDropdownOpen)}
                  className="w-full sm:w-34 text-xs pl-3 pr-6 py-1.5 bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-lg text-gray-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium cursor-pointer shadow-sm text-left flex items-center justify-between transition-all duration-200 whitespace-nowrap"
                >
                  <span className="whitespace-nowrap pr-1">
                    {exportFormat === "docx" && "Word (.docx)"}
                    {exportFormat === "epub" && "EPUB (.epub)"}
                    {exportFormat === "pdf" && "PDF (.pdf)"}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-gray-400 dark:text-slate-500 transition-transform duration-200 flex-shrink-0 ${
                      isFormatDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isFormatDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-lg shadow-lg py-1 animate-fadeIn divide-y divide-gray-50 dark:divide-slate-800 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => {
                        setExportFormat("docx");
                        setIsFormatDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-1.5 text-xs text-left cursor-pointer transition-colors whitespace-nowrap ${
                        exportFormat === "docx"
                          ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold"
                          : "text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      Word (.docx)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setExportFormat("epub");
                        setIsFormatDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-1.5 text-xs text-left cursor-pointer transition-colors whitespace-nowrap ${
                        exportFormat === "epub"
                          ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold"
                          : "text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      EPUB (.epub)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setExportFormat("pdf");
                        setIsFormatDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-1.5 text-xs text-left cursor-pointer transition-colors whitespace-nowrap ${
                        exportFormat === "pdf"
                          ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold"
                          : "text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      PDF (.pdf)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 mt-1">
            <button
              onClick={handleExportSelected}
              disabled={isExporting || selectedCount === 0}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-bold rounded-lg transition-colors shadow-sm disabled:cursor-not-allowed cursor-pointer"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="truncate">{exportProgress}</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Xuất mục đã chọn {selectedCount > 1 ? `(${selectedCount})` : ""}</span>
                </>
              )}
            </button>

            <button
              onClick={handleExportAppendix}
              disabled={isExporting || detectedChapters.length === 0}
              className="px-4 py-2 bg-white dark:bg-[#161b22] border border-gray-250 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-[#1f2937] text-gray-700 dark:text-slate-300 text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer whitespace-nowrap"
            >
              Xuất phụ lục (.txt)
            </button>
          </div>
        </div>

        {/* List of Detected Chapters */}
        <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
          {detectedChapters.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-gray-400">
              <List className="w-10 h-10 opacity-30 mb-2" />
              <p className="text-sm">Chưa phát hiện được mục nào trong sách.</p>
              <p className="text-xs text-gray-500 mt-1">Vui lòng nhấp "Dọn dẹp & Format" trước.</p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {detectedChapters.map((chapter, idx) => {
                const isSel = selected[chapter] || false;
                return (
                  <li
                    key={idx}
                    onClick={() => handleToggle(chapter)}
                    className={`p-3 border rounded-xl flex items-start gap-3 transition-all cursor-pointer select-none active:scale-[0.99] duration-75
                      ${
                        isSel
                          ? "bg-indigo-50/60 dark:bg-indigo-950/20 border-indigo-200/60 dark:border-indigo-800"
                          : "bg-gray-50/40 hover:bg-gray-50 dark:bg-[#0d1117]/10 dark:hover:bg-[#1f2937]/30 border-gray-200 dark:border-slate-800"
                      }`}
                  >
                    <div className="pt-0.5 shrink-0">
                      {isSel ? (
                        <CheckSquare2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <span className={`text-xs font-semibold leading-relaxed ${
                      isSel ? "text-indigo-950 dark:text-slate-100" : "text-gray-700 dark:text-slate-300"
                    }`}>
                      {chapter}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
