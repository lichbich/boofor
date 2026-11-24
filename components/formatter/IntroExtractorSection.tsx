import React, { useState, useRef } from "react";
import { Check, Copy, Upload, Loader2, BookOpen, AlertCircle, X } from "lucide-react";
import {
  extractIntroFromEpubFile,
  ExtractedEpubIntroResult,
} from "@/utils/epubIntroExtractor";
import { toast } from "@/utils/toast";

export type AnnotatedEpubIntroResult = ExtractedEpubIntroResult & {
  matchedBookTitle?: string;
};

interface IntroExtractorSectionProps {
  introductionText: string;
  copiedId: string | null;
  handleCopy: (text: string, id: string, isHtml?: boolean) => void;
  onExtractedEpubIntros?: (
    results: ExtractedEpubIntroResult[]
  ) => AnnotatedEpubIntroResult[];
  onPreviewExtractedIntro?: (introHtml: string, targetBookTitle?: string) => void;
}

export const IntroExtractorSection: React.FC<IntroExtractorSectionProps> = ({
  introductionText,
  copiedId,
  handleCopy,
  onExtractedEpubIntros,
  onPreviewExtractedIntro,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });
  const [recentResults, setRecentResults] = useState<AnnotatedEpubIntroResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const processEpubFiles = async (fileList: File[]) => {
    const epubFiles = fileList.filter((f) => f.name.toLowerCase().endsWith(".epub"));
    if (epubFiles.length === 0) {
      toast.warning("Vui lòng kéo thả hoặc chọn file định dạng .epub!");
      return;
    }

    setIsExtracting(true);
    setProgress({ current: 0, total: epubFiles.length });

    const extractedList: ExtractedEpubIntroResult[] = [];
    for (let i = 0; i < epubFiles.length; i++) {
      setProgress({ current: i + 1, total: epubFiles.length });
      const res = await extractIntroFromEpubFile(epubFiles[i]);
      extractedList.push(res);
    }

    let annotated: AnnotatedEpubIntroResult[] = extractedList;
    if (onExtractedEpubIntros) {
      annotated = onExtractedEpubIntros(extractedList);
    }

    setRecentResults(annotated);
    setIsExtracting(false);

    const successItems = annotated.filter((r) => r.status === "success" && r.introHtml);
    const matchedCount = successItems.filter((r) => Boolean(r.matchedBookTitle)).length;

    if (epubFiles.length === 1) {
      const single = annotated[0];
      if (single.status === "success") {
        toast.success(
          single.matchedBookTitle
            ? `Đã trích xuất Introduction cho sách "${single.matchedBookTitle}"!`
            : `Đã trích xuất Introduction từ "${single.fileName}"!`
        );
      } else {
        toast.warning(single.message || "Không tìm thấy Introduction trong file EPUB.");
      }
    } else {
      if (successItems.length > 0) {
        toast.success(
          matchedCount > 0
            ? `Đã trích xuất ${successItems.length}/${epubFiles.length} file EPUB (khớp ${matchedCount} sách)!`
            : `Đã trích xuất thành công ${successItems.length}/${epubFiles.length} file EPUB!`
        );
      } else {
        toast.warning("Không tìm thấy phần Introduction trong các file EPUB đã chọn.");
      }
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isExtracting) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isExtracting && !isDragging) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (isExtracting) return;

    const droppedFiles = Array.from(e.dataTransfer.files || []);
    if (droppedFiles.length > 0) {
      processEpubFiles(droppedFiles);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      processEpubFiles(selectedFiles);
    }
    e.target.value = "";
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`bg-white p-6 rounded-2xl shadow-sm border space-y-4 transition-all relative ${
        isDragging
          ? "border-indigo-500 ring-2 ring-indigo-500/20"
          : "border-gray-100"
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".epub"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
      />

      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <h2 className="text-md font-semibold text-gray-800">Trích xuất Introduction</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isExtracting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 text-xs font-semibold rounded-md transition-colors border border-indigo-200/60 dark:border-indigo-800/60 cursor-pointer disabled:opacity-50"
            title="Chọn 1 hoặc nhiều file .epub để trích xuất Introduction"
          >
            {isExtracting ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Upload className="w-3 h-3" />
            )}
            <span>{isExtracting ? "Đang đọc EPUB..." : "Chọn file EPUB"}</span>
          </button>

          <button
            type="button"
            onClick={() => handleCopy(introductionText, "intro", true)}
            disabled={!introductionText}
            className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-md transition-colors disabled:opacity-50 cursor-pointer"
          >
            {copiedId === "intro" ? (
              <Check className="w-3 h-3 text-green-600" />
            ) : (
              <Copy className="w-3 h-3" />
            )}{" "}
            {copiedId === "intro" ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-2">
        Sau khi ấn &quot;Dọn dẹp &amp; Format&quot;, phần giới thiệu sẽ tự động xuất hiện ở đây — hoặc{" "}
        <span className="font-medium text-indigo-600 dark:text-indigo-400">
          kéo thả file .epub (1 hoặc nhiều file)
        </span>{" "}
        trực tiếp vào ô bên dưới để lấy lại Introduction.
      </p>

      <div className="relative">
        {/* Drag Overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-20 rounded-lg border-2 border-dashed border-indigo-500 bg-indigo-50/90 dark:bg-indigo-950/85 backdrop-blur-[1px] flex flex-col items-center justify-center text-center p-4 pointer-events-none">
            <Upload className="w-7 h-7 text-indigo-600 dark:text-indigo-400 mb-1.5 animate-bounce" />
            <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
              Thả file .epub vào đây để trích xuất Introduction
            </span>
            <span className="text-xs text-indigo-600/80 dark:text-indigo-400/80 mt-0.5">
              Hỗ trợ kéo 1 file hoặc hàng loạt file EPUB của tác giả cùng lúc
            </span>
          </div>
        )}

        {isExtracting ? (
          <div className="w-full h-44 p-4 bg-gray-50 border border-indigo-200 dark:border-indigo-800/60 rounded-lg text-sm flex flex-col items-center justify-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="font-semibold text-xs">
              Đang trích xuất Introduction từ EPUB ({progress.current}/{progress.total})...
            </span>
          </div>
        ) : introductionText ? (
          <div
            className="w-full h-44 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 overflow-y-auto prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: introductionText }}
          />
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-44 p-4 bg-gray-50 border-2 border-dashed border-gray-250 hover:border-indigo-400 rounded-lg text-sm overflow-y-auto flex flex-col items-center justify-center text-center gap-1.5 text-gray-400 cursor-pointer transition-colors group"
          >
            <Upload className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
            <span className="font-medium text-gray-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              Chưa có nội dung — Kéo thả file .epub vào đây hoặc bấm để chọn file
            </span>
            <span className="text-[11px] text-gray-400">
              Tự động tách phần Introduction và gán khớp theo tên sách của tác giả
            </span>
          </div>
        )}
      </div>

      {/* Extracted EPUB results summary bar */}
      {recentResults.length > 0 && !isExtracting && (
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-700 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
              Kết quả trích xuất EPUB (
              {recentResults.filter((r) => r.status === "success").length}/
              {recentResults.length} thành công)
            </span>
            <button
              type="button"
              onClick={() => setRecentResults([])}
              className="p-0.5 text-gray-400 hover:text-gray-600 rounded transition-colors cursor-pointer"
              title="Ẩn danh sách kết quả"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
            {recentResults.map((item, idx) => {
              const isOk = item.status === "success" && Boolean(item.introHtml);
              const displayLabel =
                item.matchedBookTitle || item.epubTitle || item.cleanTitleFromFile || item.fileName;

              return (
                <button
                  key={`${item.fileName}_${idx}`}
                  type="button"
                  disabled={!isOk}
                  onClick={() => {
                    if (isOk && onPreviewExtractedIntro) {
                      onPreviewExtractedIntro(
                        item.introHtml,
                        item.matchedBookTitle || item.epubTitle || item.cleanTitleFromFile
                      );
                    }
                  }}
                  title={
                    isOk
                      ? item.matchedBookTitle
                        ? `Đã lưu vào sách: ${item.matchedBookTitle} (Bấm để xem)`
                        : `Đã trích xuất từ: ${item.fileName} (Bấm để xem)`
                      : item.message || "Không tìm thấy Introduction"
                  }
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all max-w-full ${
                    isOk
                      ? "bg-white hover:border-indigo-400 text-gray-700 border-gray-200 cursor-pointer shadow-2xs"
                      : "bg-amber-50/60 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200/70 dark:border-amber-800/50 cursor-default"
                  }`}
                >
                  {isOk ? (
                    <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
                  )}
                  <span className="truncate max-w-[220px]">{displayLabel}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
