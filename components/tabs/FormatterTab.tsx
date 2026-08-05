import React, { useState, useEffect, useRef, useMemo } from "react";
import { Editor } from "@tiptap/react";
import { EditorSection } from "../formatter/EditorSection";
import { IntroExtractorSection } from "../formatter/IntroExtractorSection";
import { SettingsSection } from "../formatter/SettingsSection";
import { BookListSection } from "../formatter/BookListSection";
import { BookCoverSection } from "../formatter/BookCoverSection";
import { GenresSection } from "../formatter/GenresSection";
import { EpubCleanerSection } from "../formatter/EpubCleanerSection";
import { Copy, X, ChevronDown } from "lucide-react";
import { parsePlayBooksText } from "@/utils/reconciler";

interface Book {
  title1: string;
  title2: string;
  full: string;
}

interface FormatterTabProps {
  editor: Editor | null;
  isFormatting: boolean;
  isExporting: boolean;
  isExportingPDF: boolean;
  isExportingEPUB: boolean;
  formatContent: () => void;
  triggerExportWord: () => void;
  triggerExportPDF: () => void;
  triggerExportEPUB: () => void;
  detectedChapters: string[];
  setButtonPos: (pos: { x: number; y: number }) => void;
  setIsChapterListOpen: (open: boolean) => void;
  setIsChapterListVisible: (visible: boolean) => void;
  introductionText: string;
  copiedId: string | null;
  handleCopy: (text: string, id: string, isHtml?: boolean) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  chapterKeywords: string;
  setChapterKeywords: (val: string) => void;
  customBlockPhrases: string;
  setCustomBlockPhrases: (val: string) => void;
  isBookListOpen: boolean;
  setIsBookListOpen: (open: boolean) => void;
  bookListText: string;
  setBookListText: (val: string) => void;
  parsedBooks: Book[];
  handleSelectBook: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  title1: string;
  setTitle1: (val: string) => void;
  title2: string;
  setTitle2: (val: string) => void;
  author: string;
  setAuthor: (val: string) => void;
  authorEditor: Editor | null;
  authorInfoMap: Record<string, string>;
  genresText: string;
  setGenresText: (val: string) => void;
  bookContentMap: Record<string, string>;
  bookCovers: Record<string, string>;
  saveBookCover: (bookTitle: string, base64Data: string) => void;
  deleteBookCover: (bookTitle: string) => void;
  isBatchExporting: boolean;
  batchProgress: string;
  triggerBatchExportEPUB: (selectedTitles: string[]) => Promise<void>;
  reconcilerRawText?: string;
  sentShares?: any[];
  onViewShares?: (authorName: string) => void;
}

export const FormatterTab: React.FC<FormatterTabProps> = ({
  editor,
  isFormatting,
  isExporting,
  isExportingPDF,
  isExportingEPUB,
  formatContent,
  triggerExportWord,
  triggerExportPDF,
  triggerExportEPUB,
  detectedChapters,
  setButtonPos,
  setIsChapterListOpen,
  setIsChapterListVisible,
  introductionText,
  copiedId,
  handleCopy,
  isSettingsOpen,
  setIsSettingsOpen,
  chapterKeywords,
  setChapterKeywords,
  customBlockPhrases,
  setCustomBlockPhrases,
  isBookListOpen,
  setIsBookListOpen,
  bookListText,
  setBookListText,
  parsedBooks,
  handleSelectBook,
  title1,
  setTitle1,
  title2,
  setTitle2,
  author,
  setAuthor,
  authorEditor,
  authorInfoMap,
  genresText,
  setGenresText,
  bookContentMap,
  bookCovers,
  saveBookCover,
  deleteBookCover,
  isBatchExporting,
  batchProgress,
  triggerBatchExportEPUB,
  reconcilerRawText,
  sentShares,
  onViewShares,
}) => {
  const [isMetadataModalOpen, setIsMetadataModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const modalDropdownRef = useRef<HTMLDivElement>(null);
  const modalListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isMetadataModalOpen) {
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
  }, [isMetadataModalOpen]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalDropdownRef.current && !modalDropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Center selected item in modal dropdown when it opens
  useEffect(() => {
    if (isDropdownOpen && modalListRef.current) {
      const container = modalListRef.current;
      const selectedEl = container.querySelector('[data-selected="true"]');
      if (selectedEl) {
        const selHtml = selectedEl as HTMLElement;
        container.scrollTop =
          selHtml.offsetTop -
          container.clientHeight / 2 +
          selHtml.clientHeight / 2;
      }
    }
  }, [isDropdownOpen]);

  const fullTitle = `${title1}${title2 ? ` ${title2}` : ""}`.replace(/\s+/g, " ").trim();
  const authorInfoHTML = authorEditor ? authorEditor.getHTML() : (authorInfoMap[author] || "");

  const bookPrice = useMemo(() => {
    if (!reconcilerRawText || !title1) return null;
    const parsed = parsePlayBooksText(reconcilerRawText);

    const normalizeStringForMatch = (str: string) => {
      const noLeadingNumbers = str.replace(/^\d+[\s\.\-_]*/, "");
      return noLeadingNumbers.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
    };

    const targetKey = normalizeStringForMatch(title1);
    const matchedBook = parsed.find(b => {
      return normalizeStringForMatch(b.title) === targetKey || b.title.trim().toLowerCase() === title1.trim().toLowerCase();
    });

    if (!matchedBook) return null;
    // Strip the dollar sign ($) from the price string to display raw amount
    return matchedBook.price.replace(/^\$/, "").trim();
  }, [reconcilerRawText, title1]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column: Editor, Intro Extractor, Manual */}
      <div className="lg:col-span-2 space-y-6">
        <EditorSection
          editor={editor}
          isFormatting={isFormatting}
          isExporting={isExporting}
          isExportingPDF={isExportingPDF}
          isExportingEPUB={isExportingEPUB}
          formatContent={formatContent}
          triggerExportWord={triggerExportWord}
          triggerExportPDF={triggerExportPDF}
          triggerExportEPUB={triggerExportEPUB}
          detectedChapters={detectedChapters}
          setButtonPos={setButtonPos}
          setIsChapterListOpen={setIsChapterListOpen}
          setIsChapterListVisible={setIsChapterListVisible}
        />

        <IntroExtractorSection
          introductionText={introductionText}
          copiedId={copiedId}
          handleCopy={handleCopy}
        />

        <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm leading-relaxed">
          <strong>📝 Hướng dẫn sử dụng:</strong>
          <ul className="list-disc ml-5 mt-2 space-y-1">
            <li>Copy toàn bộ văn bản từ AI Chat và dán vào khung soạn thảo trên.</li>
            <li>
              Bấm <strong>Dọn dẹp & Format</strong> để công cụ tự động căn lề và tạo ngắt trang.
            </li>
            <li>
              Bấm <strong>Xuất File Word</strong> để tải về file <code>.docx</code> chuẩn.
            </li>
          </ul>
        </div>

        <button
          onClick={() => setIsMetadataModalOpen(true)}
          disabled={!title1}
          className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-400"
        >
          <Copy className="w-5 h-5" />
          Xem & Sao chép Nhanh Metadata (Google Play Books)
        </button>
      </div>

      {/* Right Column: Settings, Book Selector, Covers, Genres */}
      <div className="space-y-6">
        <SettingsSection
          isSettingsOpen={isSettingsOpen}
          setIsSettingsOpen={setIsSettingsOpen}
          chapterKeywords={chapterKeywords}
          setChapterKeywords={setChapterKeywords}
          customBlockPhrases={customBlockPhrases}
          setCustomBlockPhrases={setCustomBlockPhrases}
        />

        <BookListSection
          isBookListOpen={isBookListOpen}
          setIsBookListOpen={setIsBookListOpen}
          bookListText={bookListText}
          setBookListText={setBookListText}
          parsedBooks={parsedBooks}
          handleSelectBook={handleSelectBook}
          title1={title1}
          title2={title2}
          bookContentMap={bookContentMap}
          bookCovers={bookCovers}
          isBatchExporting={isBatchExporting}
          batchProgress={batchProgress}
          triggerBatchExportEPUB={triggerBatchExportEPUB}
        />

        <BookCoverSection
          title1={title1}
          setTitle1={setTitle1}
          title2={title2}
          setTitle2={setTitle2}
          author={author}
          setAuthor={setAuthor}
          copiedId={copiedId}
          handleCopy={handleCopy}
          authorEditor={authorEditor}
          authorInfoMap={authorInfoMap}
          bookCovers={bookCovers}
          saveBookCover={saveBookCover}
          deleteBookCover={deleteBookCover}
          parsedBooks={parsedBooks}
          sentShares={sentShares}
          onViewShares={onViewShares}
        />

        <GenresSection
          genresText={genresText}
          setGenresText={setGenresText}
          copiedId={copiedId}
          handleCopy={handleCopy}
        />

        <EpubCleanerSection />
      </div>

      {isMetadataModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg animate-pulse">
                  <Copy className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Thông tin Đăng tải Google Play Books
                  </h3>
                  <p className="text-xs text-gray-500">
                    Xem và copy nhanh thông tin cuốn sách hiện tại
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsMetadataModalOpen(false)}
                className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-655 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Book Selector Bar */}
            <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/30 flex items-center justify-between gap-4">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                Chọn Sách:
              </span>
              <div className="relative flex-1" ref={modalDropdownRef}>
                {(() => {
                  const selectedIdx = parsedBooks.findIndex(
                    (book) => book.title1 === title1 && book.title2 === title2
                  );
                  const selectedBook = selectedIdx >= 0 ? parsedBooks[selectedIdx] : null;

                  return (
                    <div className="relative w-full">
                      <button
                        type="button"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="w-full pl-3 pr-10 py-2 bg-white border border-gray-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs text-gray-900 font-semibold transition-all duration-200 cursor-pointer shadow-sm text-left flex items-center justify-between"
                      >
                        <span className="truncate">
                          {selectedBook
                            ? `${selectedIdx + 1}. ${selectedBook.title1}${selectedBook.title2 ? ` - ${selectedBook.title2}` : ""}`
                            : "-- Chọn sách --"}
                        </span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${
                            isDropdownOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {isDropdownOpen && (
                        <div
                          ref={modalListRef}
                          className="absolute z-[60] w-full mt-1 bg-white border border-gray-250 rounded-xl shadow-lg max-h-48 overflow-y-auto py-1 divide-y divide-gray-50 animate-fadeIn"
                        >
                          {parsedBooks.length === 0 ? (
                            <div className="px-3 py-2 text-xs text-gray-400 text-center">
                              Danh sách trống
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
                                    setIsDropdownOpen(false);
                                  }}
                                  className={`w-full px-3 py-2 text-xs text-left cursor-pointer transition-colors flex items-center justify-between ${
                                    isSelected
                                      ? "bg-indigo-50 text-indigo-600 font-bold"
                                      : "text-gray-700 hover:bg-gray-50"
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
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* 1. Tên sách */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Tên Sách (Click để copy)
                  </span>
                  {copiedId === "modalTitle" && (
                    <span className="text-xs font-semibold text-green-600 animate-pulse">
                      Đã copy!
                    </span>
                  )}
                </div>
                <div
                  onClick={() => handleCopy(fullTitle, "modalTitle")}
                  className={`px-4 py-3 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                    copiedId === "modalTitle"
                      ? "border-green-500 bg-green-50/10 ring-2 ring-green-100"
                      : "border-gray-200 bg-gray-50 hover:bg-gray-100/30 hover:border-indigo-400"
                  }`}
                >
                  {fullTitle}
                </div>
              </div>

              {/* Giá sách */}
              {bookPrice && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Giá Sách (Retail Price - Click để copy)
                    </span>
                    {copiedId === "modalPrice" && (
                      <span className="text-xs font-semibold text-green-600 animate-pulse">
                        Đã copy!
                      </span>
                    )}
                  </div>
                  <div
                    onClick={() => handleCopy(bookPrice, "modalPrice")}
                    className={`px-4 py-3 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                      copiedId === "modalPrice"
                        ? "border-green-500 bg-green-50/10 ring-2 ring-green-100 text-gray-900"
                        : "border-gray-200 bg-gray-50 hover:bg-gray-100/30 hover:border-indigo-400 text-gray-900"
                    }`}
                  >
                    {bookPrice}
                  </div>
                </div>
              )}

              {/* 2. Introduction */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Mô tả / Giới thiệu (Introduction - Click để copy)
                  </span>
                  {copiedId === "modalIntro" && (
                    <span className="text-xs font-semibold text-green-600 animate-pulse">
                      Đã copy!
                    </span>
                  )}
                </div>
                <div
                  onClick={() => handleCopy(introductionText, "modalIntro", true)}
                  className={`w-full min-h-[100px] max-h-[200px] overflow-y-auto px-4 py-3 rounded-xl border text-xs text-gray-700 prose prose-sm focus:outline-none transition-all cursor-pointer ${
                    copiedId === "modalIntro"
                      ? "border-green-500 bg-green-50/10 ring-2 ring-green-100"
                      : "border-gray-200 bg-gray-50 hover:bg-gray-100/30 hover:border-indigo-400 bg-white"
                  }`}
                  dangerouslySetInnerHTML={{ __html: introductionText || "Chưa có trích xuất introduction" }}
                />
              </div>

              {/* 3. Genres */}
              <div className="space-y-1">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                  Thể loại (Genres - Click từng hàng để copy)
                </span>
                {(() => {
                  const genresList = genresText
                    ? genresText.split("\n").map((g) => g.trim()).filter((g) => g.length > 0)
                    : [];

                  if (genresList.length === 0) {
                    return (
                      <div className="px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-400 italic">
                        Chưa chọn thể loại
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      {genresList.map((genre, idx) => {
                        const copyKey = `modalGenre_${idx}`;
                        const isCopied = copiedId === copyKey;
                        return (
                          <div
                            key={idx}
                            onClick={() => handleCopy(genre, copyKey)}
                            className={`flex items-center justify-between p-3 border rounded-xl transition-all cursor-pointer ${
                              isCopied
                                ? "border-green-500 bg-green-50/10 ring-2 ring-green-100"
                                : "border-gray-200 bg-gray-50 hover:bg-gray-100/30 hover:border-indigo-400"
                            }`}
                          >
                            <span className="text-xs text-gray-855 font-medium pl-1 select-all break-words truncate max-w-[85%]">
                              {genre}
                            </span>
                            {isCopied && (
                              <span className="text-[10px] font-semibold text-green-600 pl-2 pr-1 animate-pulse">
                                Đã copy!
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Tên Tác giả */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Tên Tác giả (Click để copy)
                  </span>
                  {copiedId === "modalAuthor" && (
                    <span className="text-xs font-semibold text-green-600 animate-pulse">
                      Đã copy!
                    </span>
                  )}
                </div>
                <div
                  onClick={() => handleCopy(author, "modalAuthor")}
                  className={`px-4 py-3 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                    copiedId === "modalAuthor"
                      ? "border-green-500 bg-green-50/10 ring-2 ring-green-100"
                      : "border-gray-200 bg-gray-50 hover:bg-gray-100/30 hover:border-indigo-400"
                  }`}
                >
                  {author || "Chưa có tên tác giả"}
                </div>
              </div>

              {/* 4. Thông tin Tác giả */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Thông tin Tác giả (Click để copy)
                  </span>
                  {copiedId === "modalAuthorInfo" && (
                    <span className="text-xs font-semibold text-green-600 animate-pulse">
                      Đã copy!
                    </span>
                  )}
                </div>
                <div
                  onClick={() => handleCopy(authorInfoHTML, "modalAuthorInfo", true)}
                  className={`w-full min-h-[80px] max-h-[160px] overflow-y-auto px-4 py-3 rounded-xl border text-xs text-gray-700 prose prose-sm focus:outline-none transition-all cursor-pointer ${
                    copiedId === "modalAuthorInfo"
                      ? "border-green-500 bg-green-50/10 ring-2 ring-green-100"
                      : "border-gray-200 bg-gray-50 hover:bg-gray-100/30 hover:border-indigo-400 bg-white"
                  }`}
                  dangerouslySetInnerHTML={{ __html: authorInfoHTML || "Chưa có thông tin tác giả" }}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-150 bg-gray-50/50 flex items-center justify-between">
              <span className="text-xs text-gray-500 text-indigo-600 font-medium">
                💡 Mẹo: Nhấn trực tiếp vào từng ô để copy dữ liệu (ô được chọn sẽ nháy viền xanh lá)
              </span>
              <button
                onClick={() => setIsMetadataModalOpen(false)}
                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white font-semibold text-sm rounded-xl transition-all shadow-sm"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
