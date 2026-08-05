import React, { useState, useEffect } from "react";
import { Wand2, BookOpen, Check, Copy, ChevronDown, Image as ImageIcon } from "lucide-react";

interface Book {
  title1: string;
  title2: string;
  full: string;
}

interface PromptTabProps {
  promptTemplate: string;
  setPromptTemplate: (val: string) => void;
  promptPlaceholderBook: string;
  setPromptPlaceholderBook: (val: string) => void;
  promptPlaceholderAuthor: string;
  setPromptPlaceholderAuthor: (val: string) => void;
  coverPromptTemplate: string;
  setCoverPromptTemplate: (val: string) => void;
  coverPromptPlaceholderBook: string;
  setCoverPromptPlaceholderBook: (val: string) => void;
  coverPromptPlaceholderAuthor: string;
  setCoverPromptPlaceholderAuthor: (val: string) => void;
  parsedBooks: Book[];
  handleSelectBook: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  title1: string;
  title2: string;
  author: string;
  copiedId: string | null;
  handleCopy: (text: string, id: string, isHtml?: boolean) => void;
  editor: any;
  setActiveTab: (val: "formatter" | "prompt" | "splitter") => void;
  selectBook: (title1: string, title2: string) => void;
  isPromptOpen: boolean;
  setIsPromptOpen: (val: boolean) => void;
  currentUsername: string;
}

export const PromptTab: React.FC<PromptTabProps> = ({
  promptTemplate,
  setPromptTemplate,
  promptPlaceholderBook,
  setPromptPlaceholderBook,
  promptPlaceholderAuthor,
  setPromptPlaceholderAuthor,
  coverPromptTemplate,
  setCoverPromptTemplate,
  coverPromptPlaceholderBook,
  setCoverPromptPlaceholderBook,
  coverPromptPlaceholderAuthor,
  setCoverPromptPlaceholderAuthor,
  parsedBooks,
  title1,
  title2,
  author,
  copiedId,
  handleCopy,
  selectBook,
  isPromptOpen,
  setIsPromptOpen,
  currentUsername,
}) => {
  const [isCoverOpen, setIsCoverOpen] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window !== "undefined" && currentUsername) {
      const saved = localStorage.getItem(`boofor_is_cover_open_${currentUsername}`);
      if (saved !== null) {
        setIsCoverOpen(saved !== "false");
      }
    }
  }, [currentUsername]);

  const handleToggleCover = () => {
    const nextState = !isCoverOpen;
    setIsCoverOpen(nextState);
    if (typeof window !== "undefined" && currentUsername) {
      localStorage.setItem(`boofor_is_cover_open_${currentUsername}`, String(nextState));
    }
  };
  const fullTitle = `${title1}${title2 ? ` ${title2}` : ""}`.replace(/\s+/g, " ").trim();
  const currentAuthorName = author || "Chưa có tác giả";

  // Replaced prompt templates for the currently active book
  const generatedPrompt = promptTemplate
    .replaceAll(promptPlaceholderBook, fullTitle)
    .replaceAll(promptPlaceholderAuthor, currentAuthorName);

  const generatedCoverPrompt = coverPromptTemplate
    .replaceAll(coverPromptPlaceholderBook, fullTitle)
    .replaceAll(coverPromptPlaceholderAuthor, currentAuthorName);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn">
      {/* Left Column: Prompt Template & Quick Selector */}
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <button
            onClick={() => setIsPromptOpen(!isPromptOpen)}
            className="flex items-center justify-between w-full cursor-pointer"
          >
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-indigo-600" />
              Prompt Generator (Nội Dung)
            </h2>
            <ChevronDown
              className={`w-5 h-5 text-gray-400 transition-transform ${isPromptOpen ? "rotate-180" : ""}`}
            />
          </button>
          {!isPromptOpen && (
            <p className="text-xs text-gray-400 mt-1">Nhập prompt mẫu và cấu hình tên sách thay thế</p>
          )}

          {isPromptOpen && (
            <div className="space-y-4 pt-2">
              <p className="text-xs text-gray-500">
                Nhập prompt mẫu rồi chọn sách — hệ thống sẽ tự thay tên sách và tác giả cho bạn.
              </p>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Prompt mẫu viết sách</label>
                <textarea
                  rows={8}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                  value={promptTemplate}
                  onChange={(e) => setPromptTemplate(e.target.value)}
                  placeholder="VD: Hãy viết Chapter 1 cho cuốn sách English for Beginners với 1500 từ..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">
                  Tên sách mẫu trong Prompt (để thay thế)
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                  value={promptPlaceholderBook}
                  onChange={(e) => setPromptPlaceholderBook(e.target.value)}
                  placeholder="VD: English for Beginners"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">
                  Tên tác giả mẫu trong Prompt (để thay thế)
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                  value={promptPlaceholderAuthor}
                  onChange={(e) => setPromptPlaceholderAuthor(e.target.value)}
                  placeholder="VD: ANGEL MENDEZ"
                />
              </div>
            </div>
          )}
        </div>

        {/* Danh sách sách & Copy nhanh */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-md font-semibold text-gray-800 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              Danh sách sách & Copy nhanh
            </h2>
            <span className="text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-transparent dark:border-indigo-900/30 px-2.5 py-0.5 rounded-full font-semibold">
              {parsedBooks.length} sách
            </span>
          </div>

          {parsedBooks.length > 0 ? (
            <div className="max-h-[420px] overflow-y-auto pr-1 space-y-3 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {parsedBooks.map((book, idx) => {
                  const bookFullTitle = `${book.title1}${book.title2 ? ` ${book.title2}` : ""}`.replace(/\s+/g, " ").trim();
                  
                  const bookPrompt = promptTemplate
                    .replaceAll(promptPlaceholderBook, bookFullTitle)
                    .replaceAll(promptPlaceholderAuthor, currentAuthorName);

                  const bookCoverPrompt = coverPromptTemplate
                    .replaceAll(coverPromptPlaceholderBook, bookFullTitle)
                    .replaceAll(coverPromptPlaceholderAuthor, currentAuthorName);

                   const isSelected = book.title1 === title1 && book.title2 === title2;
                  
                  const contentCopyKey = `prompt-content-${idx}`;
                  const isContentCopied = copiedId === contentCopyKey;

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        selectBook(book.title1, book.title2);
                        if (promptTemplate && promptPlaceholderBook) {
                          handleCopy(bookPrompt, contentCopyKey);
                        }
                      }}
                      className={`flex flex-col text-left p-4 rounded-xl border transition-all cursor-pointer relative group active:scale-[0.98] ${
                        isContentCopied
                          ? "border-green-500 bg-green-50/10 ring-2 ring-green-100 shadow-sm"
                          : isSelected
                          ? "border-indigo-600 bg-indigo-50/20 ring-2 ring-indigo-500/10 shadow-sm"
                          : "border-gray-100 bg-gray-50/50 hover:bg-indigo-50/40 hover:border-indigo-300"
                      }`}
                      title={bookFullTitle}
                    >
                      {/* Top badge */}
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isSelected ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-600 group-hover:bg-indigo-100 group-hover:text-indigo-700"
                        }`}>
                          #{idx + 1}
                        </span>
                        {isContentCopied && (
                          <span className="text-[10px] font-bold text-green-600 flex items-center gap-0.5 animate-scale">
                            <Check className="w-3.5 h-3.5" />
                            Đã copy!
                          </span>
                        )}
                      </div>

                      {/* Book Title */}
                      <h4 className="text-sm font-bold text-gray-800 line-clamp-1 w-full mt-1.5" title={bookFullTitle}>
                        {bookFullTitle}
                      </h4>

                      {/* Prompt Preview Text */}
                      {bookPrompt ? (
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2 pt-2 border-t border-gray-100 dark:border-gray-200/40 line-clamp-2 italic break-words">
                          {bookPrompt}
                        </p>
                      ) : (
                        <p className="text-[11px] text-gray-300 dark:text-gray-600 mt-2 pt-2 border-t border-gray-100 dark:border-gray-200/40 italic">
                          Chưa có prompt mẫu...
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-gray-50 border border-dashed border-gray-200 rounded-xl text-sm text-gray-400">
              Chưa có danh sách sách. Vui lòng nhập danh sách sách trong tab Formatter.
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Cover Prompt Generator & Previews */}
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <button
            onClick={handleToggleCover}
            className="flex items-center justify-between w-full cursor-pointer"
          >
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-emerald-600" />
              Prompt Generator (Ảnh Bìa)
            </h2>
            <ChevronDown
              className={`w-5 h-5 text-gray-400 transition-transform ${isCoverOpen ? "rotate-180" : ""}`}
            />
          </button>
          {!isCoverOpen && (
            <p className="text-xs text-gray-400 mt-1">Nhập prompt mẫu ảnh bìa và cấu hình tên sách thay thế</p>
          )}

          {isCoverOpen && (
            <div className="space-y-4 pt-2">
              <p className="text-xs text-gray-500">
                Nhập prompt mẫu cho ảnh bìa rồi chọn sách — hệ thống sẽ tự thay tên sách và tác giả cho bạn.
              </p>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">Prompt mẫu ảnh bìa</label>
                <textarea
                  rows={8}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                  value={coverPromptTemplate}
                  onChange={(e) => setCoverPromptTemplate(e.target.value)}
                  placeholder="VD: Hãy thiết kế một ảnh bìa nghệ thuật cho cuốn sách English for Beginners..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">
                  Tên sách mẫu trong Prompt ảnh bìa (để thay thế)
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                  value={coverPromptPlaceholderBook}
                  onChange={(e) => setCoverPromptPlaceholderBook(e.target.value)}
                  placeholder="VD: English for Beginners"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500">
                  Tên tác giả mẫu trong Prompt ảnh bìa (để thay thế)
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                  value={coverPromptPlaceholderAuthor}
                  onChange={(e) => setCoverPromptPlaceholderAuthor(e.target.value)}
                  placeholder="VD: ANGEL MENDEZ"
                />
              </div>
            </div>
          )}
        </div>

        {/* Kết quả xem trước Prompt Ảnh bìa */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Kết quả Prompt Ảnh Bìa</h2>
            {coverPromptTemplate && title1 && coverPromptPlaceholderBook && (
              <button
                onClick={() => handleCopy(generatedCoverPrompt, "generatedCoverPrompt")}
                className="flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors shadow-sm cursor-pointer"
              >
                {copiedId === "generatedCoverPrompt" ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}{" "}
                {copiedId === "generatedCoverPrompt" ? "Copied!" : "Copy Prompt"}
              </button>
            )}
          </div>

          {coverPromptTemplate && title1 && coverPromptPlaceholderBook ? (
            <div className="w-full p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/30 rounded-lg text-sm text-gray-800 whitespace-pre-wrap max-h-[60vh] overflow-y-auto leading-relaxed">
              {generatedCoverPrompt}
            </div>
          ) : (
            <div className="w-full p-8 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-400 text-center">
              {!coverPromptTemplate && "Nhập prompt mẫu ảnh bìa để bắt đầu..."}
              {coverPromptTemplate && !coverPromptPlaceholderBook && "Nhập tên sách mẫu ảnh bìa cần thay thế..."}
              {coverPromptTemplate && coverPromptPlaceholderBook && !title1 && "Chọn một cuốn sách từ danh sách..."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
