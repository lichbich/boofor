import React, { useState } from "react";
import { EditorContent, Editor } from "@tiptap/react";
import { Check, Copy, Upload, X, Loader2, Eye } from "lucide-react";
import { toast } from "@/utils/toast";

interface BookCoverSectionProps {
  title1: string;
  setTitle1: (val: string) => void;
  title2: string;
  setTitle2: (val: string) => void;
  author: string;
  setAuthor: (val: string) => void;
  copiedId: string | null;
  handleCopy: (text: string, id: string, isHtml?: boolean) => void;
  authorEditor: Editor | null;
  authorInfoMap: Record<string, string>;
  bookCovers: Record<string, string>;
  saveBookCover: (bookTitle: string, base64Data: string) => void;
  deleteBookCover: (bookTitle: string) => void;
  parsedBooks: Array<{ title1: string; title2: string; full: string }>;
  sentShares?: any[];
  onViewShares?: (authorName: string) => void;
}

export const BookCoverSection: React.FC<BookCoverSectionProps> = ({
  title1,
  setTitle1,
  title2,
  setTitle2,
  author,
  setAuthor,
  copiedId,
  handleCopy,
  authorEditor,
  authorInfoMap,
  bookCovers,
  saveBookCover,
  deleteBookCover,
  parsedBooks,
  sentShares,
  onViewShares,
}) => {
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewCoverUrl, setPreviewCoverUrl] = useState<string | null>(null);

  const processAndSaveImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 600;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.8);
          saveBookCover(title1, compressedBase64);
        }
      };
      img.src = evt.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      processAndSaveImageFile(file);
      return;
    }

    const imageUrl = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("URL") || e.dataTransfer.getData("text/plain");
    if (imageUrl && (imageUrl.startsWith("http") || imageUrl.startsWith("data:image"))) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 600;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.8);
          saveBookCover(title1, compressedBase64);
        }
      };
      img.onerror = () => {
        saveBookCover(title1, imageUrl);
      };
      img.src = imageUrl;
    }
  };

  const fullTitle = `${title1}${title2 ? ` ${title2}` : ""}`.replace(/\s+/g, " ").trim();

  const handleBulkCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsBulkUploading(true);
    const fileList = Array.from(files);
    let matchedCount = 0;
    const unmatchedNames: string[] = [];

    const getCleanMatchKey = (str: string) => {
      const noLeadingNumbers = str.replace(/^\d+[\s\.\-_]*/, "");
      return noLeadingNumbers.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
    };

    const promises = fileList.map((file) => {
      return new Promise<void>((resolve) => {
        const filename = file.name;
        const lastDotIdx = filename.lastIndexOf(".");
        const nameWithoutExt = lastDotIdx !== -1 ? filename.substring(0, lastDotIdx) : filename;
        const fileMatchKey = getCleanMatchKey(nameWithoutExt);

        const matchedBook = parsedBooks.find((book) => {
          const bookMatchKey = getCleanMatchKey(book.title1);
          return bookMatchKey === fileMatchKey || book.title1.trim().toLowerCase() === nameWithoutExt.trim().toLowerCase();
        });

        if (!matchedBook) {
          unmatchedNames.push(filename);
          resolve();
          return;
        }

        const reader = new FileReader();
        reader.onload = (evt) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const MAX_WIDTH = 600;
            const MAX_HEIGHT = 800;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height = Math.round((height * MAX_WIDTH) / width);
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width = Math.round((width * MAX_HEIGHT) / height);
                height = MAX_HEIGHT;
              }
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              const compressedBase64 = canvas.toDataURL("image/jpeg", 0.8);
              saveBookCover(matchedBook.title1, compressedBase64);
              matchedCount++;
            }
            resolve();
          };
          img.onerror = () => {
            unmatchedNames.push(`${filename} (Không đọc được ảnh)`);
            resolve();
          };
          img.src = evt.target?.result as string;
        };
        reader.onerror = () => {
          unmatchedNames.push(`${filename} (Không đọc được file)`);
          resolve();
        };
        reader.readAsDataURL(file);
      });
    });

    await Promise.all(promises);
    setIsBulkUploading(false);

    let message = `Đã xử lý xong hàng loạt ảnh bìa: Khớp thành công ${matchedCount} sách.`;
    if (unmatchedNames.length > 0) {
      message += ` Không khớp ${unmatchedNames.length} ảnh.`;
    }
    toast.info(message);
    e.target.value = "";
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
      <h2 className="text-md font-semibold text-gray-800">Thông tin Trang Bìa</h2>

      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500">Tên sách (Phần 1)</label>
        <div className="flex gap-2">
          <input
            type="text"
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
            value={title1}
            onChange={(e) => setTitle1(e.target.value)}
          />
          <button
            onClick={() => handleCopy(fullTitle, "title1")}
            className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors"
            title="Copy Full Title"
          >
            {copiedId === "title1" ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500">Tên sách (Phần 2)</label>
        <div className="flex gap-2">
          <input
            type="text"
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
            value={title2}
            onChange={(e) => setTitle2(e.target.value)}
          />
          <button
            onClick={() => handleCopy(fullTitle, "title2")}
            className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors"
            title="Copy Full Title"
          >
            {copiedId === "title2" ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500">Tác giả</label>
        <div className="flex gap-2">
          <input
            type="text"
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
          />
          <button
            onClick={() => handleCopy(author, "author")}
            className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors"
            title="Copy"
          >
            {copiedId === "author" ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
        {author && sentShares && (() => {
          const authorShares = sentShares.filter(
            (s) => s.authorName && s.authorName.toLowerCase() === author.toLowerCase()
          );
          if (authorShares.length === 0) return null;
          return (
            <div 
              onClick={() => onViewShares && onViewShares(author)}
              className={`text-[11px] text-gray-500 mt-1.5 bg-indigo-50/50 dark:bg-indigo-950/20 px-3 py-2 rounded-lg border border-indigo-100/30 flex flex-wrap items-center gap-1.5 ${
                onViewShares 
                  ? "hover:bg-indigo-100/50 dark:hover:bg-indigo-950/40 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all cursor-pointer select-none" 
                  : ""
              }`}
              title={onViewShares ? "Nhấp để xem chi tiết nội dung đã chia sẻ" : undefined}
            >
              <span className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                <Eye className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
                Đã chia sẻ cho:
              </span>
              {authorShares.map((s, idx) => {
                const statusColor =
                  s.status === "accepted"
                    ? "text-emerald-600 dark:text-emerald-400 font-bold"
                    : s.status === "declined"
                    ? "text-rose-600 dark:text-rose-455 line-through font-medium"
                    : "text-amber-600 dark:text-amber-400 font-medium";
                const statusText =
                  s.status === "accepted"
                    ? "đã nhận"
                    : s.status === "declined"
                    ? "từ chối"
                    : "chờ nhận";
                return (
                  <span key={s.id} className="inline-flex items-center gap-1">
                    <span className="text-gray-700 dark:text-slate-200">{s.recipient}</span>
                    <span className={`text-[10px] ${statusColor}`}>({statusText})</span>
                    {idx < authorShares.length - 1 && <span className="text-gray-300 dark:text-slate-600">•</span>}
                  </span>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Author Info inner block */}
      <div className="pt-4 border-t border-gray-100 mt-4 space-y-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-800">Thông tin Tác giả</h3>
          <button
            onClick={() => {
              if (authorEditor) {
                handleCopy(authorEditor.getHTML(), "authorInfo", true);
              }
            }}
            disabled={!author || !authorInfoMap[author]}
            className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-md transition-colors disabled:opacity-50"
          >
            {copiedId === "authorInfo" ? (
              <Check className="w-3 h-3 text-green-600" />
            ) : (
              <Copy className="w-3 h-3" />
            )}{" "}
            {copiedId === "authorInfo" ? "Copied" : "Copy"}
          </button>
        </div>
        {!author && (
          <p className="text-xs text-red-500 mb-2">
            Vui lòng nhập tên tác giả ở trên trước khi điền.
          </p>
        )}
        <div
          className={`overflow-hidden rounded-lg ${
            !author ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          <EditorContent editor={authorEditor} />
        </div>
      </div>

      {/* Ảnh bìa Sách */}
      <div className="pt-4 border-t border-gray-100 mt-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">Ảnh bìa Sách</h3>
          <label className={`flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg cursor-pointer transition-colors border border-indigo-100 ${isBulkUploading ? "opacity-50 pointer-events-none" : ""}`}>
            {isBulkUploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            {isBulkUploading ? "Đang xử lý..." : "Khớp ảnh hàng loạt"}
            <input
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              disabled={isBulkUploading}
              onChange={handleBulkCoverUpload}
            />
          </label>
        </div>
        {!title1 ? (
          <p className="text-xs text-red-500">
            Vui lòng chọn hoặc nhập tên sách để tải lên ảnh bìa.
          </p>
        ) : (
          <div className="space-y-3">
            {bookCovers[title1] ? (
              <div
                onClick={() => setPreviewCoverUrl(bookCovers[title1])}
                className="relative w-full max-w-[200px] aspect-[3/4] rounded-xl overflow-hidden border border-gray-200 group shadow-sm bg-gray-50 cursor-pointer hover:ring-2 hover:ring-indigo-500/50 transition-all"
                title="Bấm để xem full ảnh bìa"
              >
                <img
                  src={bookCovers[title1]}
                  alt="Cover Preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewCoverUrl(bookCovers[title1]);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm cursor-pointer active:scale-95"
                  >
                    <Eye className="w-3.5 h-3.5" /> Xem full ảnh
                  </button>
                  <label
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 px-3 py-1 bg-white/90 hover:bg-white text-gray-900 rounded-lg text-[11px] font-bold cursor-pointer shadow-sm"
                  >
                    <Upload className="w-3 h-3 text-indigo-600" /> Thay ảnh
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          processAndSaveImageFile(file);
                        }
                      }}
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteBookCover(title1);
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors cursor-pointer z-10"
                  title="Xóa ảnh bìa"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center w-full aspect-[5/2] border-2 border-dashed rounded-xl cursor-pointer transition-colors py-4 ${
                  isDragging 
                    ? "border-indigo-500 bg-indigo-50/20 text-indigo-600" 
                    : "border-gray-250 hover:border-indigo-400 hover:bg-indigo-50/10 text-gray-600"
                }`}
              >
                <div className="flex flex-col items-center justify-center text-center px-4">
                  <Upload className="w-6 h-6 text-gray-400 mb-1" />
                  <span className="text-xs font-semibold text-gray-600">
                    Kéo thả hoặc Click tải ảnh bìa
                  </span>
                  <span className="text-[10px] text-indigo-500 font-medium mt-0.5 animate-pulse">
                    Tự động tối ưu dung lượng ảnh
                  </span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      processAndSaveImageFile(file);
                    }
                  }}
                />
              </label>
            )}
          </div>
        )}
      </div>

      {/* Lightbox Fullscreen Cover Preview Modal */}
      {previewCoverUrl && (
        <div
          className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setPreviewCoverUrl(null)}
        >
          <div
            className="relative max-w-2xl max-h-[90vh] flex flex-col items-center bg-[#161b22] border border-slate-800 p-4 rounded-2xl shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between w-full pb-2 border-b border-slate-800">
              <span className="text-sm font-bold text-slate-100 line-clamp-1">
                📖 Xem ảnh bìa: <span className="text-indigo-400">{title1}</span>
              </span>
              <button
                type="button"
                onClick={() => setPreviewCoverUrl(null)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full transition-colors cursor-pointer"
                title="Đóng xem ảnh"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-auto max-h-[75vh] flex items-center justify-center rounded-xl p-1 bg-black/40">
              <img
                src={previewCoverUrl}
                alt="Full Book Cover"
                className="max-h-[75vh] w-auto object-contain rounded-xl shadow-2xl border border-slate-700/80"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
