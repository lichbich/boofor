import React, { useState, useEffect } from "react";
import { X, AlertCircle, ListPlus, Check } from "lucide-react";

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (authors: string[], books: string[], clearExisting: boolean) => void;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [authorsInput, setAuthorsInput] = useState("");
  const [booksInput, setBooksInput] = useState("");
  const [clearExisting, setClearExisting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAuthorsInput("");
      setBooksInput("");
      setClearExisting(false);
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
    } else {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    const authors = authorsInput
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const books = booksInput
      .split("\n")
      .map((line) => line.trim())
      // Keep empty slots if user deliberately left empty lines to match author order
      // But trailing empty ones can be trimmed, so we match their length or map directly
      .map((line) => line.replace(/^\d+[\s\.\-_]*/, "")); // clean prepending numbers if any like "1. Book Title"

    if (authors.length === 0) {
      setError("Vui lòng nhập ít nhất một tác giả.");
      return;
    }

    onImport(authors, books, clearExisting);
    onClose();
  };

  const authorsCount = authorsInput.split("\n").map(l => l.trim()).filter(l => l).length;
  const booksCount = booksInput.split("\n").map(l => l.trim()).filter(l => l).length;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#161b22] rounded-2xl max-w-2xl w-full flex flex-col shadow-2xl border border-gray-250 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-[#0d1117]/50">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <ListPlus className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">
                Nhập tác giả & sách hàng loạt
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-slate-400">
                Nhập danh sách tác giả cùng sách tương ứng vào hệ thống
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-655 dark:hover:text-slate-300 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex-1 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Grid Layout for Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Authors Input */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider flex justify-between">
                <span>Danh sách tác giả (mỗi dòng một người)</span>
                {authorsCount > 0 && (
                  <span className="text-indigo-600 dark:text-indigo-400 font-extrabold bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.2 rounded text-[9px]">
                    {authorsCount} tác giả
                  </span>
                )}
              </label>
              <textarea
                value={authorsInput}
                onChange={(e) => setAuthorsInput(e.target.value)}
                placeholder="Ví dụ:&#10;Darius Morris&#10;Jennifer Hill&#10;Candy Turner"
                className="w-full h-64 p-3 bg-gray-50 dark:bg-[#0d1117] border border-gray-250 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-slate-100 font-mono resize-none leading-relaxed"
              />
            </div>

            {/* Books Input */}
            <div className="flex flex-col space-y-1.5">
              <label className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider flex justify-between">
                <span>Danh sách sách tương ứng (mỗi dòng một sách)</span>
                {booksCount > 0 && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-extrabold bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.2 rounded text-[9px]">
                    {booksCount} cuốn
                  </span>
                )}
              </label>
              <textarea
                value={booksInput}
                onChange={(e) => setBooksInput(e.target.value)}
                placeholder="Ví dụ:&#10;English Grammar Book&#10;Vocabulary Builder&#10;Reading Comprehension"
                className="w-full h-64 p-3 bg-gray-50 dark:bg-[#0d1117] border border-gray-250 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-slate-100 font-mono resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* Guide tip */}
          <div className="p-3 bg-blue-50/55 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300 rounded-xl text-[11px] leading-relaxed">
            💡 <strong>Quy luật khớp:</strong> Tác giả ở dòng thứ nhất sẽ tương ứng với sách ở dòng thứ nhất, tương tự cho các dòng tiếp theo.
            Nếu bạn muốn bỏ qua sách của một tác giả nào đó, hãy để trống dòng sách tương ứng tại vị trí đó.
          </div>

          {/* Clear existing tabs option */}
          <div className="flex items-center gap-2 pt-1.5">
            <input
              type="checkbox"
              id="clear-tabs-checkbox"
              checked={clearExisting}
              onChange={(e) => setClearExisting(e.target.checked)}
              className="w-4 h-4 text-indigo-600 border-gray-300 dark:border-slate-800 rounded focus:ring-indigo-500 focus:ring-offset-0 dark:bg-[#0d1117] cursor-pointer"
            />
            <label
              htmlFor="clear-tabs-checkbox"
              className="text-xs font-semibold text-gray-700 dark:text-slate-350 cursor-pointer select-none"
            >
              Xóa các tab tác giả hiện tại trước khi nhập (làm sạch Workspace)
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-[#0d1117]/50 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-250 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-350 font-semibold text-xs rounded-xl transition-all cursor-pointer"
          >
            Hủy
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <Check className="w-3.5 h-3.5" />
            Xác nhận nhập
          </button>
        </div>
      </div>
    </div>
  );
};
