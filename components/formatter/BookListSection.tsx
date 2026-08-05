import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, BookOpen, Loader2 } from "lucide-react";

interface Book {
  title1: string;
  title2: string;
  full: string;
}

interface BookListSectionProps {
  isBookListOpen: boolean;
  setIsBookListOpen: (open: boolean) => void;
  bookListText: string;
  setBookListText: (val: string) => void;
  parsedBooks: Book[];
  handleSelectBook: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  title1: string;
  title2: string;
  bookContentMap?: Record<string, string>;
  bookCovers?: Record<string, string>;
  isBatchExporting?: boolean;
  batchProgress?: string;
  triggerBatchExportEPUB?: (selectedTitles: string[]) => Promise<void>;
}

export const BookListSection: React.FC<BookListSectionProps> = ({
  isBookListOpen,
  setIsBookListOpen,
  bookListText,
  setBookListText,
  parsedBooks,
  handleSelectBook,
  title1,
  title2,
  bookContentMap,
  bookCovers,
  isBatchExporting = false,
  batchProgress = "",
  triggerBatchExportEPUB,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [selectedBatchTitles, setSelectedBatchTitles] = useState<string[]>([]);

  // Auto-select all books by default when parsedBooks changes
  useEffect(() => {
    setSelectedBatchTitles(parsedBooks.map((b) => b.title1));
  }, [parsedBooks]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Center selected item when dropdown opens
  useEffect(() => {
    if (isOpen && listRef.current) {
      const container = listRef.current;
      const selectedEl = container.querySelector('[data-selected="true"]');
      if (selectedEl) {
        const selHtml = selectedEl as HTMLElement;
        container.scrollTop =
          selHtml.offsetTop -
          container.clientHeight / 2 +
          selHtml.clientHeight / 2;
      }
    }
  }, [isOpen]);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
      <button
        onClick={() => setIsBookListOpen(!isBookListOpen)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-600" />
          <h2 className="text-md font-semibold text-gray-800">Quản lý Danh sách Sách</h2>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 transition-transform ${isBookListOpen ? "rotate-180" : ""}`}
        />
      </button>
      {!isBookListOpen && (
        <p className="text-xs text-gray-400 mt-1">Nhập và quản lý danh sách sách</p>
      )}

      {isBookListOpen && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500">
            Danh sách sách (Mỗi dòng 1 cuốn, dùng dấu "-" để tách 2 phần)
          </label>
          <textarea
            rows={4}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900"
            placeholder="Ví dụ:&#10;Sách 1 phần A - Sách 1 phần B&#10;Sách số 2 - Cực kỳ hay"
            value={bookListText}
            onChange={(e) => setBookListText(e.target.value)}
          />
        </div>
      )}

      <div className="space-y-1" ref={dropdownRef}>
        <label className="text-xs font-medium text-gray-500">Chọn Sách để điền Tự Động</label>
        {(() => {
          const selectedIdx = parsedBooks.findIndex(
            (book) => book.title1 === title1 && book.title2 === title2
          );
          const selectedBook = selectedIdx >= 0 ? parsedBooks[selectedIdx] : null;

          return (
            <div className="relative w-full">
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full pl-3 pr-10 py-2.5 bg-white dark:bg-[#161b22] border border-gray-250 dark:border-[#30363d] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm text-gray-900 dark:text-slate-100 font-medium transition-all duration-200 cursor-pointer shadow-sm text-left flex items-center justify-between"
              >
                <span className="truncate">
                  {selectedBook
                    ? `${selectedIdx + 1}. ${selectedBook.title1}${selectedBook.title2 ? ` - ${selectedBook.title2}` : ""}`
                    : "-- Chọn cuốn sách đang làm --"}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 dark:text-slate-500 transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isOpen && (
                <div ref={listRef} className="absolute z-50 w-full mt-1.5 bg-white dark:bg-[#161b22] border border-gray-250 dark:border-[#30363d] rounded-xl shadow-lg max-h-60 overflow-y-auto py-1 divide-y divide-gray-50 dark:divide-slate-800 animate-fadeIn">
                  <button
                    type="button"
                    data-selected={selectedIdx === -1}
                    onClick={() => {
                      const fakeEvent = {
                        target: { value: "" }
                      } as React.ChangeEvent<HTMLSelectElement>;
                      handleSelectBook(fakeEvent);
                      setIsOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 text-xs text-left cursor-pointer transition-colors ${
                      selectedIdx === -1
                        ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold"
                        : "text-gray-400 dark:text-slate-500 hover:bg-gray-50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    -- Chọn cuốn sách đang làm --
                  </button>
                  {parsedBooks.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-gray-400 dark:text-slate-500 text-center">
                      Danh sách trống, vui lòng nhập ở trên.
                    </div>
                  ) : (
                    parsedBooks.map((book, idx) => {
                      const isSelected = idx === selectedIdx;
                      return (
                        <button
                          key={idx}
                          type="button"
                          data-selected={isSelected}
                          onClick={() => {
                            const fakeEvent = {
                              target: { value: String(idx) }
                            } as React.ChangeEvent<HTMLSelectElement>;
                            handleSelectBook(fakeEvent);
                            setIsOpen(false);
                          }}
                          className={`w-full px-3 py-2.5 text-xs text-left cursor-pointer transition-colors flex items-center justify-between ${
                            isSelected
                              ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold"
                              : "text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800/50"
                          }`}
                        >
                          <span className="truncate">
                            {idx + 1}. {book.title1} {book.title2 ? ` - ${book.title2}` : ""}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Batch Export Section */}
      {parsedBooks.length > 0 && triggerBatchExportEPUB && (
        <div className="pt-4 border-t border-gray-100 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-100">
              Xuất bản hàng loạt EPUB (.zip)
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const allTitles = parsedBooks.map(b => b.title1);
                  setSelectedBatchTitles(allTitles);
                }}
                className="text-[11px] text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-semibold cursor-pointer"
              >
                Chọn tất cả
              </button>
              <span className="text-gray-300 dark:text-slate-700">|</span>
              <button
                type="button"
                onClick={() => setSelectedBatchTitles([])}
                className="text-[11px] text-gray-500 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-350 font-semibold cursor-pointer"
              >
                Bỏ chọn
              </button>
            </div>
          </div>

          <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-slate-800 rounded-lg p-2 bg-gray-50 dark:bg-[#0d1117]/50 space-y-1">
            {parsedBooks.map((book, idx) => {
              const hasContent = bookContentMap && bookContentMap[book.title1] && bookContentMap[book.title1].replace(/<[^>]*>/g, "").trim().length > 0;
              const hasCover = bookCovers && bookCovers[book.title1];
              const isChecked = selectedBatchTitles.includes(book.title1);

              return (
                <label
                  key={idx}
                  className="flex items-center justify-between text-xs text-gray-700 dark:text-slate-350 hover:bg-gray-100 dark:hover:bg-slate-800/40 p-1.5 rounded cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        setSelectedBatchTitles((prev) =>
                          prev.includes(book.title1)
                            ? prev.filter((t) => t !== book.title1)
                            : [...prev, book.title1]
                        );
                      }}
                      className="rounded text-indigo-600 focus:ring-indigo-500/20 border-gray-300 dark:border-slate-700"
                    />
                    <span className="truncate max-w-[200px]">
                      {idx + 1}. {book.title1}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 text-[10px]">
                    {hasContent ? (
                      <span className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 px-1 rounded font-medium">
                        Nội dung
                      </span>
                    ) : (
                      <span className="bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-500 px-1 rounded font-medium">
                        Trống
                      </span>
                    )}
                    {hasCover && (
                      <span className="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 px-1 rounded font-medium">
                        Ảnh bìa
                      </span>
                    )}
                  </div>
                </label>
              );
            })}
          </div>

          <button
            type="button"
            disabled={isBatchExporting || selectedBatchTitles.length === 0}
            onClick={() => triggerBatchExportEPUB(selectedBatchTitles)}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 dark:disabled:bg-slate-800 dark:disabled:text-slate-600 text-white disabled:text-gray-400 font-semibold rounded-lg text-xs transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-2"
          >
            {isBatchExporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="truncate max-w-[220px]">
                  {batchProgress || "Đang xuất..."}
                </span>
              </>
            ) : (
              <span>Xuất {selectedBatchTitles.length} Sách ra file ZIP (.zip)</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

