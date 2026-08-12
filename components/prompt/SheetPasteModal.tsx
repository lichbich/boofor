import React, { useState, useMemo } from "react";
import { X, CheckCircle2, FileSpreadsheet, PlusCircle } from "lucide-react";

interface Book {
  title1: string;
  title2: string;
  full: string;
  cat1?: string;
  cat2?: string;
  cat3?: string;
}

interface ParsedSheetRow {
  originalRaw: string;
  rawTitle: string;
  cleanTitle: string;
  cat1: string;
  cat2: string;
  cat3: string;
  matchedTitle: string | null;
  status: "matched" | "new";
}

interface SheetPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  parsedBooks: Book[];
  bulkUpdateBookGenres: (items: Array<{ title: string; cat1: string; cat2: string; cat3: string }>) => void;
  setBookListText?: (val: string | ((prev: string) => string)) => void;
  bookListText?: string;
}

export const SheetPasteModal: React.FC<SheetPasteModalProps> = ({
  isOpen,
  onClose,
  parsedBooks,
  bulkUpdateBookGenres,
  setBookListText,
}) => {
  const [pasteText, setPasteText] = useState("");
  const [autoAddNewBooks, setAutoAddNewBooks] = useState(true);

  // Normalize string for fuzzy matching
  const normalize = (str: string) => {
    return str
      .toLowerCase()
      .replace(/^\d+[\.\-\s]*/, "") // remove leading numbers like 1. or 1 -
      .replace(/[^\w\s\u00C0-\u024F\u1E00-\u1EFF]/gi, "") // strip punctuation except unicode letters
      .replace(/\s+/g, " ")
      .trim();
  };

  // Parse pasted sheet rows
  const parsedRows: ParsedSheetRow[] = useMemo(() => {
    if (!pasteText.trim()) return [];

    const lines = pasteText.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

    return lines.map((line) => {
      // Check column separation (TAB default from Excel/Google Sheets, fallback to pipe or comma)
      let cols: string[] = [];
      if (line.includes("\t")) {
        cols = line.split("\t");
      } else if (line.includes("|")) {
        cols = line.split("|");
      } else {
        cols = line.split(",");
      }

      cols = cols.map((c) => c.trim().replace(/^"(.*)"$/, "$1")); // Strip surrounding quotes

      if (cols.length === 0) {
        return {
          originalRaw: line,
          rawTitle: line,
          cleanTitle: line,
          cat1: "",
          cat2: "",
          cat3: "",
          matchedTitle: null,
          status: "new",
        };
      }

      let rawTitle = "";
      let cat1 = "";
      let cat2 = "";
      let cat3 = "";

      // Check if first column is numeric index / empty (e.g. Google Sheets col A)
      const firstIsIndex = /^#?\d+$/.test(cols[0]) || cols[0] === "";
      if (firstIsIndex && cols.length >= 2) {
        rawTitle = cols[1];
        cat1 = cols[2] || "";
        cat2 = cols[3] || "";
        cat3 = cols[4] || "";
      } else {
        rawTitle = cols[0];
        cat1 = cols[1] || "";
        cat2 = cols[2] || "";
        cat3 = cols[3] || "";
      }

      const cleanTitle = rawTitle.replace(/^\d+[\.\-\s]*/, "").trim();
      const normCandidate = normalize(cleanTitle);

      // Match against parsedBooks
      let matchedTitle: string | null = null;

      if (normCandidate) {
        // 1. Exact clean match
        const exactMatch = parsedBooks.find((b) => {
          const normBook = normalize(b.title1);
          return normBook === normCandidate;
        });

        if (exactMatch) {
          matchedTitle = exactMatch.title1;
        } else {
          // 2. Partial/Includes match
          const partialMatch = parsedBooks.find((b) => {
            const normBook = normalize(b.title1);
            return normBook.includes(normCandidate) || normCandidate.includes(normBook);
          });
          if (partialMatch) {
            matchedTitle = partialMatch.title1;
          }
        }
      }

      return {
        originalRaw: line,
        rawTitle: rawTitle || line,
        cleanTitle: cleanTitle || rawTitle || line,
        cat1,
        cat2,
        cat3,
        matchedTitle,
        status: matchedTitle ? "matched" : "new",
      };
    });
  }, [pasteText, parsedBooks]);

  const matchedCount = parsedRows.filter((r) => r.status === "matched").length;
  const newCount = parsedRows.length - matchedCount;

  const handleApply = () => {
    if (parsedRows.length === 0) return;

    const itemsToUpdate: Array<{ title: string; cat1: string; cat2: string; cat3: string }> = [];
    const newBookTitlesToAdd: string[] = [];

    parsedRows.forEach((row) => {
      const targetTitle = row.matchedTitle || row.cleanTitle;
      if (targetTitle) {
        itemsToUpdate.push({
          title: targetTitle,
          cat1: row.cat1,
          cat2: row.cat2,
          cat3: row.cat3,
        });

        if (!row.matchedTitle && autoAddNewBooks && row.cleanTitle) {
          newBookTitlesToAdd.push(row.cleanTitle);
        }
      }
    });

    // 1. Update Genres Map
    bulkUpdateBookGenres(itemsToUpdate);

    // 2. If autoAddNewBooks enabled and there are new titles, append to bookListText
    if (autoAddNewBooks && newBookTitlesToAdd.length > 0 && setBookListText) {
      setBookListText((prev) => {
        const existingLines = (prev || "")
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l.length > 0);
        
        const nextLines = [...existingLines];
        newBookTitlesToAdd.forEach((t) => {
          if (!nextLines.some((line) => normalize(line) === normalize(t))) {
            nextLines.push(t);
          }
        });
        return nextLines.join("\n");
      });
    }

    onClose();
    setPasteText("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-[#0d1117]/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">
                Dán dữ liệu từ Sheet (Khớp theo tên sách)
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Copy các ô trong Google Sheets / Excel (Tên sách, Thể loại 1, Thể loại 2, Thể loại 3) rồi dán vào đây.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {/* Textarea Paste Box */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 flex items-center justify-between">
              <span>Khung dán dữ liệu Sheet (Ctrl+V)</span>
              <span className="text-[11px] font-normal text-gray-400">
                Định dạng: Tên sách | Thể loại 1 | Thể loại 2 | Thể loại 3
              </span>
            </label>
            <textarea
              rows={6}
              className="w-full p-3 bg-gray-50 dark:bg-[#0d1117] border border-gray-250 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-mono text-gray-900 dark:text-slate-100"
              placeholder={`Ví dụ copy từ Google Sheet:
A Healthy Guide to Budgeting	BUSINESS & ECONOMICS / Personal Finance / General	BUSINESS & ECONOMICS / Personal Finance / Budgeting	SELF-HELP / Personal Growth / Success
A Healthy Guide to Time Management	SELF-HELP / Personal Growth / General	SELF-HELP / Motivational & Inspirational	SELF-HELP / Journaling`}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
            />
          </div>

          {/* Live Preview section */}
          {parsedRows.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-700 dark:text-slate-200">
                    Kết quả nhận diện ({parsedRows.length} dòng):
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-200 dark:border-emerald-900/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Khớp {matchedCount} sách
                  </span>
                  {newCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-full border border-amber-200 dark:border-amber-900/30 flex items-center gap-1">
                      <PlusCircle className="w-3 h-3" /> {newCount} sách mới
                    </span>
                  )}
                </div>

                {setBookListText && newCount > 0 && (
                  <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoAddNewBooks}
                      onChange={(e) => setAutoAddNewBooks(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 border-gray-300 dark:border-slate-700"
                    />
                    <span>Tự thêm {newCount} sách mới vào Danh sách sách</span>
                  </label>
                )}
              </div>

              {/* Table Preview */}
              <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-inner">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 dark:bg-[#0d1117] text-gray-600 dark:text-slate-400 font-semibold sticky top-0">
                    <tr>
                      <th className="p-2.5 w-8">#</th>
                      <th className="p-2.5">Sách khớp / Tên sách</th>
                      <th className="p-2.5">Thể loại 1</th>
                      <th className="p-2.5">Thể loại 2</th>
                      <th className="p-2.5">Thể loại 3</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-[#161b22]">
                    {parsedRows.map((row, idx) => (
                      <tr
                        key={idx}
                        className={
                          row.status === "matched"
                            ? "hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10"
                            : "hover:bg-amber-50/20 dark:hover:bg-amber-950/10 bg-amber-50/10 dark:bg-amber-950/5"
                        }
                      >
                        <td className="p-2.5 text-gray-400 text-[10px] font-mono">{idx + 1}</td>
                        <td className="p-2.5">
                          <div className="font-semibold text-gray-800 dark:text-slate-100 truncate max-w-[200px]" title={row.cleanTitle}>
                            {row.matchedTitle ? (
                              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 shrink-0" />
                                {row.matchedTitle}
                              </span>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                <PlusCircle className="w-3 h-3 shrink-0" />
                                {row.cleanTitle}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-2.5 text-gray-600 dark:text-slate-300 truncate max-w-[140px]" title={row.cat1}>
                          {row.cat1 || <span className="text-gray-300 dark:text-slate-600 italic">Trống</span>}
                        </td>
                        <td className="p-2.5 text-gray-600 dark:text-slate-300 truncate max-w-[140px]" title={row.cat2}>
                          {row.cat2 || <span className="text-gray-300 dark:text-slate-600 italic">Trống</span>}
                        </td>
                        <td className="p-2.5 text-gray-600 dark:text-slate-300 truncate max-w-[140px]" title={row.cat3}>
                          {row.cat3 || <span className="text-gray-300 dark:text-slate-600 italic">Trống</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-end gap-3 bg-gray-50/50 dark:bg-[#0d1117]/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 dark:text-slate-300 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            disabled={parsedRows.length === 0}
            onClick={handleApply}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 dark:disabled:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Áp dụng Thể loại ({parsedRows.length} sách)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
