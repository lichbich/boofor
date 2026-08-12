import React, { useState, useEffect } from "react";
import { Wand2, BookOpen, Check, Copy, ChevronDown, Image as ImageIcon, FileSpreadsheet, Tag, Edit3 } from "lucide-react";
import { SheetPasteModal } from "../prompt/SheetPasteModal";

interface Book {
  title1: string;
  title2: string;
  full: string;
  cat1?: string;
  cat2?: string;
  cat3?: string;
}

interface PromptTabProps {
  promptTemplate: string;
  setPromptTemplate: (val: string) => void;
  promptPlaceholderBook: string;
  setPromptPlaceholderBook: (val: string) => void;
  promptPlaceholderAuthor: string;
  setPromptPlaceholderAuthor: (val: string) => void;
  promptPlaceholderCat1?: string;
  setPromptPlaceholderCat1?: (val: string) => void;
  promptPlaceholderCat2?: string;
  setPromptPlaceholderCat2?: (val: string) => void;
  promptPlaceholderCat3?: string;
  setPromptPlaceholderCat3?: (val: string) => void;
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
  updateBookGenres?: (bookTitle: string, cat1: string, cat2: string, cat3: string) => void;
  bulkUpdateBookGenres?: (items: Array<{ title: string; cat1: string; cat2: string; cat3: string }>) => void;
  setBookListText?: (val: string | ((prev: string) => string)) => void;
  bookListText?: string;
}

export const PromptTab: React.FC<PromptTabProps> = ({
  promptTemplate,
  setPromptTemplate,
  promptPlaceholderBook,
  setPromptPlaceholderBook,
  promptPlaceholderAuthor,
  setPromptPlaceholderAuthor,
  promptPlaceholderCat1 = "[INSERT CATEGORY 1 HERE]",
  setPromptPlaceholderCat1,
  promptPlaceholderCat2 = "[INSERT CATEGORY 2 HERE]",
  setPromptPlaceholderCat2,
  promptPlaceholderCat3 = "[INSERT CATEGORY 3 HERE]",
  setPromptPlaceholderCat3,
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
  updateBookGenres,
  bulkUpdateBookGenres,
  setBookListText,
  bookListText,
}) => {
  const [isCoverOpen, setIsCoverOpen] = useState<boolean>(true);
  const [isSheetPasteOpen, setIsSheetPasteOpen] = useState<boolean>(false);
  const [editingCardIndex, setEditingCardIndex] = useState<number | null>(null);

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

  // Find currently active book object
  const activeBookObj = parsedBooks.find((b) => b.title1 === title1) || {
    title1: fullTitle,
    title2: "",
    full: fullTitle,
    cat1: "",
    cat2: "",
    cat3: "",
  };

  // Substitute logic for any book
  const getSubstitutedPrompt = (
    templateText: string,
    placeholderBook: string,
    placeholderAuthor: string,
    bookTitle: string,
    cat1 = "",
    cat2 = "",
    cat3 = ""
  ) => {
    if (!templateText) return "";

    let result = templateText
      .replaceAll(placeholderBook, bookTitle)
      .replaceAll(placeholderAuthor, currentAuthorName);

    if (promptPlaceholderCat1) {
      result = result.replaceAll(promptPlaceholderCat1, cat1);
    }
    if (promptPlaceholderCat2) {
      result = result.replaceAll(promptPlaceholderCat2, cat2);
    }
    if (promptPlaceholderCat3) {
      result = result.replaceAll(promptPlaceholderCat3, cat3);
    }

    // Default fallback replacements
    result = result
      .replaceAll("[INSERT CATEGORY 1 HERE]", cat1)
      .replaceAll("[INSERT CATEGORY 2 HERE]", cat2)
      .replaceAll("[INSERT CATEGORY 3 HERE]", cat3);

    return result;
  };

  const generatedPrompt = getSubstitutedPrompt(
    promptTemplate,
    promptPlaceholderBook,
    promptPlaceholderAuthor,
    fullTitle,
    activeBookObj.cat1,
    activeBookObj.cat2,
    activeBookObj.cat3
  );

  const generatedCoverPrompt = getSubstitutedPrompt(
    coverPromptTemplate,
    coverPromptPlaceholderBook,
    coverPromptPlaceholderAuthor,
    fullTitle,
    activeBookObj.cat1,
    activeBookObj.cat2,
    activeBookObj.cat3
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn">
      {/* Left Column: Prompt Template & Quick Selector */}
      <div className="space-y-6">
        <div className="bg-white dark:bg-[#161b22] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 space-y-4">
          <button
            onClick={() => setIsPromptOpen(!isPromptOpen)}
            className="flex items-center justify-between w-full cursor-pointer"
          >
            <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-100 flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Prompt Generator (Nội Dung)
            </h2>
            <ChevronDown
              className={`w-5 h-5 text-gray-400 dark:text-slate-500 transition-transform ${isPromptOpen ? "rotate-180" : ""}`}
            />
          </button>
          {!isPromptOpen && (
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Nhập prompt mẫu và cấu hình tên sách thay thế</p>
          )}

          {isPromptOpen && (
            <div className="space-y-4 pt-2">
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Nhập prompt mẫu rồi chọn sách — hệ thống sẽ tự thay tên sách, tác giả và thể loại cho bạn.
              </p>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 dark:text-slate-400">Prompt mẫu viết sách</label>
                <textarea
                  rows={7}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900 dark:text-slate-100 font-mono"
                  value={promptTemplate || ""}
                  onChange={(e) => setPromptTemplate(e.target.value)}
                  placeholder="VD: Hãy viết Chapter 1 cho cuốn sách English for Beginners..."
                />
              </div>

              {/* Placeholder Config Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-100 dark:border-slate-800">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-slate-400">
                    Tên sách mẫu (để thay thế)
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-1.5 bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs text-gray-900 dark:text-slate-100"
                    value={promptPlaceholderBook || ""}
                    onChange={(e) => setPromptPlaceholderBook(e.target.value)}
                    placeholder="VD: English for Beginners"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-slate-400">
                    Tác giả mẫu (để thay thế)
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-1.5 bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs text-gray-900 dark:text-slate-100"
                    value={promptPlaceholderAuthor || ""}
                    onChange={(e) => setPromptPlaceholderAuthor(e.target.value)}
                    placeholder="VD: ANGEL MENDEZ"
                  />
                </div>
              </div>

              {/* Category Placeholders Configuration */}
              <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-slate-800">
                <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-indigo-500" />
                  Mẫu thay thế Thể loại (Category Placeholders)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 dark:text-slate-500">Mẫu Thể loại 1</label>
                    <input
                      type="text"
                      className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-slate-800 rounded-lg text-xs text-gray-900 dark:text-slate-100 font-mono"
                      value={promptPlaceholderCat1 || ""}
                      onChange={(e) => setPromptPlaceholderCat1 && setPromptPlaceholderCat1(e.target.value)}
                      placeholder="[INSERT CATEGORY 1 HERE]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 dark:text-slate-500">Mẫu Thể loại 2</label>
                    <input
                      type="text"
                      className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-slate-800 rounded-lg text-xs text-gray-900 dark:text-slate-100 font-mono"
                      value={promptPlaceholderCat2 || ""}
                      onChange={(e) => setPromptPlaceholderCat2 && setPromptPlaceholderCat2(e.target.value)}
                      placeholder="[INSERT CATEGORY 2 HERE]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 dark:text-slate-500">Mẫu Thể loại 3</label>
                    <input
                      type="text"
                      className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-slate-800 rounded-lg text-xs text-gray-900 dark:text-slate-100 font-mono"
                      value={promptPlaceholderCat3 || ""}
                      onChange={(e) => setPromptPlaceholderCat3 && setPromptPlaceholderCat3(e.target.value)}
                      placeholder="[INSERT CATEGORY 3 HERE]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>



        {/* Danh sách sách & Copy nhanh */}
        <div className="bg-white dark:bg-[#161b22] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-md font-semibold text-gray-800 dark:text-slate-100 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Danh sách sách & Copy nhanh
            </h2>
            
            <div className="flex items-center gap-2">
              {bulkUpdateBookGenres && (
                <button
                  type="button"
                  onClick={() => setIsSheetPasteOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-sm"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Dán từ Sheet (Khớp thể loại)</span>
                </button>
              )}
              
              <span className="text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-transparent dark:border-indigo-900/30 px-2.5 py-0.5 rounded-full font-semibold">
                {parsedBooks.length} sách
              </span>
            </div>
          </div>

          {parsedBooks.length > 0 ? (
            <div className="max-h-[460px] overflow-y-auto pr-1 space-y-3 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {parsedBooks.map((book, idx) => {
                  const bookFullTitle = `${book.title1}${book.title2 ? ` ${book.title2}` : ""}`.replace(/\s+/g, " ").trim();
                  
                  const bookPrompt = getSubstitutedPrompt(
                    promptTemplate,
                    promptPlaceholderBook,
                    promptPlaceholderAuthor,
                    bookFullTitle,
                    book.cat1,
                    book.cat2,
                    book.cat3
                  );

                  const isSelected = book.title1 === title1 && book.title2 === title2;
                  const contentCopyKey = `prompt-content-${idx}`;
                  const isContentCopied = copiedId === contentCopyKey;
                  const isEditingCard = editingCardIndex === idx;

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        selectBook(book.title1, book.title2);
                        if (promptTemplate && promptPlaceholderBook) {
                          handleCopy(bookPrompt, contentCopyKey);
                        }
                      }}
                      className={`flex flex-col text-left p-4 rounded-xl border transition-all cursor-pointer relative group ${
                        isContentCopied
                          ? "border-green-500 bg-green-50/10 ring-2 ring-green-100 shadow-sm"
                          : isSelected
                          ? "border-indigo-600 bg-indigo-50/20 ring-2 ring-indigo-500/10 shadow-sm"
                          : "border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-[#0d1117]/50 hover:bg-indigo-50/40 dark:hover:bg-slate-800/40 hover:border-indigo-300"
                      }`}
                      title={bookFullTitle}
                    >
                      {/* Top badge & Quick Edit toggle */}
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isSelected ? "bg-indigo-600 text-white" : "bg-gray-200 dark:bg-slate-800 text-gray-600 dark:text-slate-300 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-950 group-hover:text-indigo-700 dark:group-hover:text-indigo-400"
                        }`}>
                          #{idx + 1}
                        </span>

                        <div className="flex items-center gap-1">
                          {updateBookGenres && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCardIndex(isEditingCard ? null : idx);
                              }}
                              className="p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded transition-colors"
                              title="Sửa thể loại cho sách này"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {isContentCopied && (
                            <span className="text-[10px] font-bold text-green-600 flex items-center gap-0.5 animate-scale">
                              <Check className="w-3.5 h-3.5" />
                              Đã copy!
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Book Title */}
                      <h4 className="text-sm font-bold text-gray-800 dark:text-slate-100 line-clamp-1 w-full mt-1" title={bookFullTitle}>
                        {bookFullTitle}
                      </h4>

                      {/* Inline Category edit form on card */}
                      {isEditingCard && updateBookGenres ? (
                        <div
                          className="mt-2.5 p-2 bg-white dark:bg-[#161b22] border border-indigo-200 dark:border-slate-700 rounded-lg space-y-1.5 cursor-default"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            placeholder="Thể loại 1"
                            className="w-full px-2 py-1 bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-slate-800 rounded text-[11px] text-gray-900 dark:text-slate-100"
                            value={book.cat1 || ""}
                            onChange={(e) =>
                              updateBookGenres(book.title1, e.target.value, book.cat2 || "", book.cat3 || "")
                            }
                          />
                          <input
                            type="text"
                            placeholder="Thể loại 2"
                            className="w-full px-2 py-1 bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-slate-800 rounded text-[11px] text-gray-900 dark:text-slate-100"
                            value={book.cat2 || ""}
                            onChange={(e) =>
                              updateBookGenres(book.title1, book.cat1 || "", e.target.value, book.cat3 || "")
                            }
                          />
                          <input
                            type="text"
                            placeholder="Thể loại 3"
                            className="w-full px-2 py-1 bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-slate-800 rounded text-[11px] text-gray-900 dark:text-slate-100"
                            value={book.cat3 || ""}
                            onChange={(e) =>
                              updateBookGenres(book.title1, book.cat1 || "", book.cat2 || "", e.target.value)
                            }
                          />
                          <button
                            type="button"
                            onClick={() => setEditingCardIndex(null)}
                            className="w-full py-1 bg-indigo-600 text-white rounded text-[10px] font-bold mt-1"
                          >
                            Xong
                          </button>
                        </div>
                      ) : (
                        /* Category Badges Preview */
                        (book.cat1 || book.cat2 || book.cat3) && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {book.cat1 && (
                              <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-medium truncate max-w-[120px]" title={book.cat1}>
                                {book.cat1}
                              </span>
                            )}
                            {book.cat2 && (
                              <span className="text-[9px] bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-medium truncate max-w-[120px]" title={book.cat2}>
                                {book.cat2}
                              </span>
                            )}
                            {book.cat3 && (
                              <span className="text-[9px] bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded font-medium truncate max-w-[120px]" title={book.cat3}>
                                {book.cat3}
                              </span>
                            )}
                          </div>
                        )
                      )}

                      {/* Prompt Preview Text */}
                      {bookPrompt ? (
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 line-clamp-2 italic break-words">
                          {bookPrompt}
                        </p>
                      ) : (
                        <p className="text-[11px] text-gray-300 dark:text-gray-600 mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 italic">
                          Chưa có prompt mẫu...
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-gray-50 dark:bg-[#0d1117] border border-dashed border-gray-200 dark:border-slate-800 rounded-xl text-sm text-gray-400">
              Chưa có danh sách sách. Vui lòng nhập danh sách sách trong tab Formatter hoặc bấm Dán từ Sheet.
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Cover Prompt Generator & Previews */}
      <div className="space-y-6">
        <div className="bg-white dark:bg-[#161b22] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 space-y-4">
          <button
            onClick={handleToggleCover}
            className="flex items-center justify-between w-full cursor-pointer"
          >
            <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-100 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Prompt Generator (Ảnh Bìa)
            </h2>
            <ChevronDown
              className={`w-5 h-5 text-gray-400 dark:text-slate-500 transition-transform ${isCoverOpen ? "rotate-180" : ""}`}
            />
          </button>
          {!isCoverOpen && (
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Nhập prompt mẫu ảnh bìa và cấu hình tên sách thay thế</p>
          )}

          {isCoverOpen && (
            <div className="space-y-4 pt-2">
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Nhập prompt mẫu cho ảnh bìa rồi chọn sách — hệ thống sẽ tự thay tên sách và tác giả cho bạn.
              </p>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 dark:text-slate-400">Prompt mẫu ảnh bìa</label>
                <textarea
                  rows={7}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-gray-900 dark:text-slate-100 font-mono"
                  value={coverPromptTemplate}
                  onChange={(e) => setCoverPromptTemplate(e.target.value)}
                  placeholder="VD: Hãy thiết kế một ảnh bìa nghệ thuật cho cuốn sách English for Beginners..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-slate-400">
                    Tên sách mẫu trong Prompt ảnh bìa
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-1.5 bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs text-gray-900 dark:text-slate-100"
                    value={coverPromptPlaceholderBook || ""}
                    onChange={(e) => setCoverPromptPlaceholderBook(e.target.value)}
                    placeholder="VD: English for Beginners"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-slate-400">
                    Tác giả mẫu trong Prompt ảnh bìa
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-1.5 bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs text-gray-900 dark:text-slate-100"
                    value={coverPromptPlaceholderAuthor || ""}
                    onChange={(e) => setCoverPromptPlaceholderAuthor(e.target.value)}
                    placeholder="VD: ANGEL MENDEZ"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Kết quả xem trước Prompt Nội dung (Content Prompt Preview) */}
        <div className="bg-white dark:bg-[#161b22] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-100 flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Kết quả Prompt Nội Dung
            </h2>
            {promptTemplate && title1 && promptPlaceholderBook && (
              <button
                onClick={() => handleCopy(generatedPrompt, "generatedPrompt")}
                className="flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm cursor-pointer"
              >
                {copiedId === "generatedPrompt" ? (
                  <Check className="w-3.5 h-3.5 text-green-300" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}{" "}
                {copiedId === "generatedPrompt" ? "Đã Copy!" : "Copy Prompt Nội Dung"}
              </button>
            )}
          </div>

          {promptTemplate && title1 && promptPlaceholderBook ? (
            <div className="w-full p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/30 rounded-xl text-sm text-gray-800 dark:text-slate-200 whitespace-pre-wrap max-h-[45vh] overflow-y-auto leading-relaxed font-mono text-xs">
              {generatedPrompt}
            </div>
          ) : (
            <div className="w-full p-8 bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-slate-800 rounded-xl text-xs text-gray-400 text-center">
              {!promptTemplate && "Nhập prompt mẫu viết sách để bắt đầu..."}
              {promptTemplate && !promptPlaceholderBook && "Nhập tên sách mẫu cần thay thế..."}
              {promptTemplate && promptPlaceholderBook && !title1 && "Chọn một cuốn sách từ danh sách bên trái..."}
            </div>
          )}
        </div>

        {/* Kết quả xem trước Prompt Ảnh bìa */}
        <div className="bg-white dark:bg-[#161b22] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-100 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Kết quả Prompt Ảnh Bìa
            </h2>
            {coverPromptTemplate && title1 && coverPromptPlaceholderBook && (
              <button
                onClick={() => handleCopy(generatedCoverPrompt, "generatedCoverPrompt")}
                className="flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm cursor-pointer"
              >
                {copiedId === "generatedCoverPrompt" ? (
                  <Check className="w-3.5 h-3.5 text-green-300" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}{" "}
                {copiedId === "generatedCoverPrompt" ? "Đã Copy!" : "Copy Prompt Bìa"}
              </button>
            )}
          </div>

          {coverPromptTemplate && title1 && coverPromptPlaceholderBook ? (
            <div className="w-full p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/30 rounded-xl text-sm text-gray-800 dark:text-slate-200 whitespace-pre-wrap max-h-[45vh] overflow-y-auto leading-relaxed font-mono text-xs">
              {generatedCoverPrompt}
            </div>
          ) : (
            <div className="w-full p-8 bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-slate-800 rounded-xl text-xs text-gray-400 text-center">
              {!coverPromptTemplate && "Nhập prompt mẫu ảnh bìa để bắt đầu..."}
              {coverPromptTemplate && !coverPromptPlaceholderBook && "Nhập tên sách mẫu ảnh bìa cần thay thế..."}
              {coverPromptTemplate && coverPromptPlaceholderBook && !title1 && "Chọn một cuốn sách từ danh sách bên trái..."}
            </div>
          )}
        </div>
      </div>

      {/* Sheet Paste Modal */}
      {bulkUpdateBookGenres && (
        <SheetPasteModal
          isOpen={isSheetPasteOpen}
          onClose={() => setIsSheetPasteOpen(false)}
          parsedBooks={parsedBooks}
          bulkUpdateBookGenres={bulkUpdateBookGenres}
          setBookListText={setBookListText}
          bookListText={bookListText}
        />
      )}
    </div>
  );
};
