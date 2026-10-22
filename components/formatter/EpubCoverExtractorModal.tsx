import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Upload,
  Download,
  Check,
  Loader2,
  AlertCircle,
  FileImage,
  Trash2,
  Copy,
  ZoomIn,
  FolderArchive,
  Image as ImageIcon,
  CheckCircle2,
} from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { toast } from "@/utils/toast";

interface EpubCoverExtractorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface ExtractedCoverItem {
  id: string;
  fileName: string;
  bookTitle: string;
  blob: Blob | null;
  url: string | null;
  extension: string;
  sizeBytes: number;
  dimensions: { width: number; height: number } | null;
  status: "success" | "error";
  errorMessage?: string;
}

// Helper to sanitize filename for ZIP and filesystem
const sanitizeFileName = (name: string): string => {
  return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").trim();
};

// Helper to resolve relative paths inside ZIP
const resolveZipPath = (baseDir: string, relativePath: string): string => {
  const combined = (baseDir + relativePath).replace(/\\/g, "/");
  const parts = combined.split("/");
  const stack: string[] = [];
  for (const part of parts) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      if (stack.length > 0) stack.pop();
    } else {
      stack.push(part);
    }
  }
  return stack.join("/");
};

// Measure natural image dimensions
const getImageDimensions = (blob: Blob): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 0, height: 0 });
    };
    img.src = url;
  });
};

export const EpubCoverExtractorModal: React.FC<EpubCoverExtractorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [items, setItems] = useState<ExtractedCoverItem[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState({ current: 0, total: 0, currentName: "" });
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<ExtractedCoverItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up object URLs on unmount or items reset
  useEffect(() => {
    return () => {
      items.forEach((item) => {
        if (item.url) URL.revokeObjectURL(item.url);
      });
    };
  }, []);

  const extractCoverFromEpub = async (file: File): Promise<ExtractedCoverItem> => {
    const cleanTitle = file.name.replace(/\.epub$/i, "").trim();
    const id = `${file.name}-${Math.random().toString(36).substring(2, 8)}`;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);

      // 1. Locate OPF file path
      let opfPath = "";
      const containerFile = zip.file("META-INF/container.xml");
      if (containerFile) {
        const containerXml = await containerFile.async("text");
        const match = containerXml.match(/full-path=["']([^"']+)["']/i);
        if (match && match[1]) {
          opfPath = match[1];
        }
      }
      if (!opfPath) {
        const opfFiles = Object.keys(zip.files).filter((p) => p.endsWith(".opf"));
        if (opfFiles.length > 0) {
          opfPath = opfFiles[0];
        }
      }

      let coverZipPath = "";

      // 2. Parse OPF if available
      if (opfPath && zip.file(opfPath)) {
        const opfText = await zip.file(opfPath)!.async("text");
        const opfDir = opfPath.includes("/") ? opfPath.substring(0, opfPath.lastIndexOf("/") + 1) : "";

        let coverHref = "";

        // Standard EPUB 3 cover-image item or standard id
        const itemRegexes = [
          /<item[^>]*properties=["'][^"']*cover-image[^"']*["'][^>]*href=["']([^"']+)["']/i,
          /<item[^>]*href=["']([^"']+)["'][^>]*properties=["'][^"']*cover-image[^"']*["']/i,
          /<item[^>]*id=["']cover-image["'][^>]*href=["']([^"']+)["']/i,
          /<item[^>]*href=["']([^"']+)["'][^>]*id=["']cover-image["']/i,
          /<item[^>]*id=["']cover["'][^>]*href=["']([^"']+)["']/i,
          /<item[^>]*href=["']([^"']+)["'][^>]*id=["']cover["']/i,
          /<item[^>]*id=["'][^"']*cover[^"']*["'][^>]*href=["']([^"']+\.(jpe?g|png|webp))["']/i,
        ];

        for (const regex of itemRegexes) {
          const m = opfText.match(regex);
          if (m && m[1]) {
            coverHref = m[1];
            break;
          }
        }

        // EPUB 2 meta name="cover" pointing to item id
        if (!coverHref) {
          const metaMatch = opfText.match(/<meta[^>]*name=["']cover["'][^>]*content=["']([^"']+)["']/i);
          if (metaMatch && metaMatch[1]) {
            const itemId = metaMatch[1];
            const itemRegex = new RegExp(
              `<item[^>]*id=["']${itemId}["'][^>]*href=["']([^"']+)["']`,
              "i"
            );
            const itemMatch = opfText.match(itemRegex);
            if (itemMatch && itemMatch[1]) {
              coverHref = itemMatch[1];
            }
          }
        }

        // Any image with cover in href
        if (!coverHref) {
          const anyCoverImgMatch = opfText.match(
            /<item[^>]*href=["']([^"']*(?:cover|bìa)[^"']*\.(?:jpe?g|png|webp))["']/i
          );
          if (anyCoverImgMatch && anyCoverImgMatch[1]) {
            coverHref = anyCoverImgMatch[1];
          }
        }

        if (coverHref) {
          const candidate = resolveZipPath(opfDir, decodeURIComponent(coverHref));
          if (zip.file(candidate)) {
            coverZipPath = candidate;
          } else {
            // Case-insensitive search in zip
            const lowerCandidate = candidate.toLowerCase();
            const foundKey = Object.keys(zip.files).find((k) => k.toLowerCase() === lowerCandidate);
            if (foundKey) coverZipPath = foundKey;
          }
        }
      }

      // 3. Fallback: Search all zip entries for cover-named images
      if (!coverZipPath || !zip.file(coverZipPath)) {
        const coverNamedEntries = Object.keys(zip.files).filter((p) =>
          /(?:cover-image|bookcover|cover|titlepage)\.(?:jpe?g|png|webp)$/i.test(p)
        );
        if (coverNamedEntries.length > 0) {
          coverZipPath = coverNamedEntries[0];
        }
      }

      // 4. Fallback: Check any image containing "cover" anywhere in path
      if (!coverZipPath || !zip.file(coverZipPath)) {
        const anyCoverEntry = Object.keys(zip.files).filter((p) =>
          /cover.*\.(?:jpe?g|png|webp)$/i.test(p)
        );
        if (anyCoverEntry.length > 0) {
          coverZipPath = anyCoverEntry[0];
        }
      }

      // 5. Ultimate Fallback: Image with largest byte size in zip
      if (!coverZipPath || !zip.file(coverZipPath)) {
        const imageEntries = Object.keys(zip.files).filter((p) =>
          /\.(?:jpe?g|png|webp)$/i.test(p)
        );
        if (imageEntries.length > 0) {
          // Sort by file length descending
          let largestPath = imageEntries[0];
          let maxSize = 0;
          for (const imgPath of imageEntries) {
            const entry = zip.file(imgPath);
            // @ts-ignore JSZip internal uncompressedSize if available
            const size = (entry as any)?._data?.uncompressedSize || 0;
            if (size > maxSize) {
              maxSize = size;
              largestPath = imgPath;
            }
          }
          coverZipPath = largestPath;
        }
      }

      if (!coverZipPath || !zip.file(coverZipPath)) {
        return {
          id,
          fileName: file.name,
          bookTitle: cleanTitle,
          blob: null,
          url: null,
          extension: "",
          sizeBytes: 0,
          dimensions: null,
          status: "error",
          errorMessage: "Không tìm thấy tệp ảnh bìa nào trong EPUB",
        };
      }

      const zipEntry = zip.file(coverZipPath)!;

      // Determine extension and mime type
      const lowerPath = coverZipPath.toLowerCase();
      let extension = ".jpg";
      let mimeType = "image/jpeg";
      if (lowerPath.endsWith(".png")) {
        extension = ".png";
        mimeType = "image/png";
      } else if (lowerPath.endsWith(".webp")) {
        extension = ".webp";
        mimeType = "image/webp";
      }

      const rawBlob = await zipEntry.async("blob");
      const blob = rawBlob.type === mimeType ? rawBlob : new Blob([rawBlob], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const dimensions = await getImageDimensions(blob);

      return {
        id,
        fileName: file.name,
        bookTitle: cleanTitle,
        blob,
        url,
        extension,
        sizeBytes: blob.size,
        dimensions,
        status: "success",
      };
    } catch (err: any) {
      console.error("Lỗi khi giải nén ảnh bìa từ:", file.name, err);
      return {
        id,
        fileName: file.name,
        bookTitle: cleanTitle,
        blob: null,
        url: null,
        extension: "",
        sizeBytes: 0,
        dimensions: null,
        status: "error",
        errorMessage: err.message || "Lỗi đọc tệp EPUB",
      };
    }
  };

  const processUploadedFiles = async (newFiles: File[]) => {
    const epubFiles = newFiles.filter((f) => f.name.toLowerCase().endsWith(".epub"));
    if (epubFiles.length === 0) {
      toast.warning("Vui lòng chọn ít nhất một tệp định dạng .epub!");
      return;
    }

    setIsExtracting(true);
    setExtractProgress({ current: 0, total: epubFiles.length, currentName: "" });

    const newExtractedItems: ExtractedCoverItem[] = [];

    for (let i = 0; i < epubFiles.length; i++) {
      const file = epubFiles[i];
      setExtractProgress({
        current: i + 1,
        total: epubFiles.length,
        currentName: file.name,
      });

      const extracted = await extractCoverFromEpub(file);
      newExtractedItems.push(extracted);
    }

    setItems((prev) => [...prev, ...newExtractedItems]);
    setIsExtracting(false);

    const successCount = newExtractedItems.filter((i) => i.status === "success").length;
    if (successCount > 0) {
      toast.success(`Đã trích xuất thành công ${successCount}/${epubFiles.length} ảnh bìa!`);
    } else {
      toast.error("Không tìm thấy ảnh bìa hợp lệ trong các file vừa tải lên.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processUploadedFiles(Array.from(e.target.files));
      e.target.value = "";
    }
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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processUploadedFiles(Array.from(e.dataTransfer.files));
    }
  };

  // Download all extracted covers as a single ZIP file
  const handleDownloadAllZip = async () => {
    const validItems = items.filter((i) => i.status === "success" && i.blob !== null);
    if (validItems.length === 0) {
      toast.warning("Chưa có ảnh bìa nào được trích xuất thành công để tải về!");
      return;
    }

    setIsZipping(true);
    setZipProgress(0);

    try {
      const zip = new JSZip();
      const usedNames = new Set<string>();

      for (const item of validItems) {
        let baseName = sanitizeFileName(item.bookTitle) || "cover";
        let finalName = `${baseName}${item.extension}`;
        let counter = 1;

        while (usedNames.has(finalName.toLowerCase())) {
          finalName = `${baseName}_(${counter})${item.extension}`;
          counter++;
        }
        usedNames.add(finalName.toLowerCase());

        zip.file(finalName, item.blob!);
      }

      const zipBlob = await zip.generateAsync(
        {
          type: "blob",
          compression: "STORE", // Store is instant since JPEGs are already compressed
        },
        (metadata) => {
          setZipProgress(Math.round(metadata.percent));
        }
      );

      saveAs(zipBlob, "Anh_Bia_EPUB.zip");
      toast.success(`Đã nén và tải về file ZIP chứa ${validItems.length} ảnh bìa chất lượng gốc!`);
    } catch (err: any) {
      console.error("Lỗi khi tạo file ZIP:", err);
      toast.error(`Lỗi khi tạo file ZIP: ${err.message || String(err)}`);
    } finally {
      setIsZipping(false);
      setZipProgress(0);
    }
  };

  // Download single image
  const handleDownloadSingle = (item: ExtractedCoverItem) => {
    if (!item.blob) return;
    const fileName = `${sanitizeFileName(item.bookTitle)}${item.extension}`;
    saveAs(item.blob, fileName);
    toast.success(`Đã tải về: ${fileName}`);
  };

  // Copy image to clipboard
  const handleCopyImage = async (item: ExtractedCoverItem) => {
    if (!item.blob || !item.url) return;
    try {
      if (item.blob.type === "image/png") {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": item.blob })]);
        setCopiedId(item.id);
        setTimeout(() => setCopiedId(null), 2000);
        toast.success("Đã sao chép ảnh bìa vào clipboard!");
      } else {
        // Convert to PNG on canvas for clipboard compatibility
        const img = new Image();
        img.src = item.url;
        await new Promise((res) => (img.onload = res));
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0);
        canvas.toBlob(async (pngBlob) => {
          if (pngBlob) {
            await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })]);
            setCopiedId(item.id);
            setTimeout(() => setCopiedId(null), 2000);
            toast.success("Đã sao chép ảnh bìa vào clipboard!");
          }
        }, "image/png");
      }
    } catch (err) {
      console.error(err);
      toast.error("Trình duyệt không cho phép sao chép ảnh trực tiếp.");
    }
  };

  const handleClearAll = () => {
    items.forEach((item) => {
      if (item.url) URL.revokeObjectURL(item.url);
    });
    setItems([]);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target?.url) URL.revokeObjectURL(target.url);
      return prev.filter((i) => i.id !== id);
    });
  };

  const validCount = items.filter((i) => i.status === "success").length;
  const totalBytes = items
    .filter((i) => i.status === "success")
    .reduce((acc, curr) => acc + curr.sizeBytes, 0);
  const totalSizeFormatted =
    totalBytes > 1024 * 1024
      ? `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`
      : `${(totalBytes / 1024).toFixed(1)} KB`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#161b22] text-gray-800 dark:text-slate-100 rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-gray-150 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-150 dark:border-slate-800 bg-gray-50/70 dark:bg-[#0d1117]/40">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-200/50 dark:border-emerald-800/60 shadow-sm">
              <FolderArchive className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-slate-100">
                  Tách & Tải Ảnh Bìa EPUB Hàng Loạt
                </h3>
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-100/70 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-200/60 dark:border-emerald-800">
                  Chất lượng gốc 100%
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                Kéo thả toàn bộ file EPUB vào đây, hệ thống sẽ trích xuất ảnh bìa gốc nguyên bản và nén thành file ZIP tự động.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isExtracting || isZipping}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Top Actions & Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-2xl p-5 sm:p-6 transition-all text-center flex flex-col items-center justify-center space-y-2 cursor-pointer ${
              isDragging
                ? "border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20 text-emerald-600"
                : "border-gray-250 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-400 bg-gray-50/50 dark:bg-[#0d1117]/30"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".epub"
              multiple
              disabled={isExtracting || isZipping}
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
            />
            <div className="p-3 bg-white dark:bg-[#161b22] border border-gray-150 dark:border-slate-800 rounded-xl shadow-sm text-emerald-600 dark:text-emerald-400">
              <Upload className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-gray-800 dark:text-slate-200">
              {isDragging
                ? "Thả các file EPUB vào đây ngay!"
                : "Kéo thả hoặc Bấm để chọn 1 loạt file EPUB (.epub)"}
            </div>
            <p className="text-xs text-gray-400 dark:text-slate-500 max-w-md">
              Hỗ trợ kéo thả 10, 20 hoặc hàng trăm file cùng lúc. Xử lý siêu tốc ngay trong trình duyệt, không tốn băng thông server.
            </p>
          </div>

          {/* Progress Banner */}
          {isExtracting && (
            <div className="p-4 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl space-y-2 animate-pulse">
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  Đang đọc và tách ảnh bìa: {extractProgress.currentName}
                </span>
                <span>
                  {extractProgress.current} / {extractProgress.total} file
                </span>
              </div>
              <div className="w-full bg-emerald-200/50 dark:bg-emerald-900/50 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-2 transition-all duration-200 rounded-full"
                  style={{
                    width: `${Math.round((extractProgress.current / extractProgress.total) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Controls Bar when items exist */}
          {items.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-gray-50/80 dark:bg-[#0d1117]/50 border border-gray-200 dark:border-slate-800 rounded-xl">
              <div className="flex items-center gap-3 text-xs">
                <span className="font-semibold text-gray-700 dark:text-slate-200">
                  Tổng cộng:{" "}
                  <strong className="text-emerald-600 dark:text-emerald-400">
                    {validCount} / {items.length}
                  </strong>{" "}
                  ảnh bìa hợp lệ
                </span>
                {validCount > 0 && (
                  <span className="text-gray-400 dark:text-slate-500">• Dung lượng: {totalSizeFormatted}</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearAll}
                  disabled={isExtracting || isZipping}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-red-200 dark:hover:border-red-900"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Xóa tất cả
                </button>

                <button
                  type="button"
                  onClick={handleDownloadAllZip}
                  disabled={validCount === 0 || isExtracting || isZipping}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  {isZipping ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang nén ZIP ({zipProgress}%)...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Tải tất cả ảnh bìa (.ZIP)
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Cards Gallery */}
          {items.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 pt-1">
              {items.map((item) => {
                const isSuccess = item.status === "success" && item.url;
                return (
                  <div
                    key={item.id}
                    className="group relative flex flex-col bg-white dark:bg-[#161b22] border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 hover:border-emerald-300 dark:hover:border-emerald-600/50"
                  >
                    {/* Thumbnail Image Container */}
                    <div className="relative aspect-[3/4.2] bg-gray-100 dark:bg-slate-900/60 overflow-hidden flex items-center justify-center">
                      {isSuccess ? (
                        <>
                          <img
                            src={item.url!}
                            alt={item.bookTitle}
                            className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                          />
                          {/* Hover action overlay */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                            <button
                              type="button"
                              onClick={() => setPreviewItem(item)}
                              title="Xem kích thước lớn"
                              className="p-2 bg-white/90 hover:bg-white text-gray-800 rounded-lg shadow-sm transition-transform active:scale-90 cursor-pointer"
                            >
                              <ZoomIn className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopyImage(item)}
                              title="Sao chép ảnh"
                              className="p-2 bg-white/90 hover:bg-white text-gray-800 rounded-lg shadow-sm transition-transform active:scale-90 cursor-pointer"
                            >
                              {copiedId === item.id ? (
                                <Check className="w-4 h-4 text-emerald-600 font-bold" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadSingle(item)}
                              title="Tải ảnh này về"
                              className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-transform active:scale-90 cursor-pointer"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="p-3 text-center space-y-1">
                          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium line-clamp-2">
                            {item.errorMessage || "Không có ảnh bìa"}
                          </span>
                        </div>
                      )}

                      {/* Top Badges */}
                      <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-none">
                        {isSuccess && item.dimensions && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold bg-black/60 backdrop-blur-xs text-white rounded">
                            {item.extension.replace(".", "").toUpperCase()}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveItem(item.id);
                          }}
                          title="Xóa khỏi danh sách"
                          className="pointer-events-auto p-1 bg-black/40 hover:bg-red-600 text-white rounded-md backdrop-blur-xs transition-colors cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Book Information */}
                    <div className="p-2.5 flex-1 flex flex-col justify-between space-y-1.5 bg-gray-50/40 dark:bg-[#0d1117]/20">
                      <div>
                        <h4
                          className="text-xs font-semibold text-gray-800 dark:text-slate-200 line-clamp-2 leading-tight"
                          title={item.bookTitle}
                        >
                          {item.bookTitle}
                        </h4>
                      </div>

                      <div className="pt-1 border-t border-gray-150 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-gray-500 dark:text-slate-400">
                        {isSuccess ? (
                          <>
                            <span>
                              {item.dimensions?.width && item.dimensions?.height
                                ? `${item.dimensions.width}×${item.dimensions.height}`
                                : "Ảnh gốc"}
                            </span>
                            <span className="font-medium text-emerald-600 dark:text-emerald-400">
                              {(item.sizeBytes / 1024).toFixed(0)} KB
                            </span>
                          </>
                        ) : (
                          <span className="text-red-500 font-medium">Lỗi trích xuất</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-t border-gray-150 dark:border-slate-800 bg-gray-50/70 dark:bg-[#0d1117]/40">
          <span className="text-xs text-gray-500 dark:text-slate-400">
            💡 Ảnh tải về qua file ZIP được tự động đặt tên theo tên sách để bạn không cần đổi tên thủ công.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-semibold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Enlarged Image Preview Modal */}
      {previewItem && previewItem.url && (
        <div
          onClick={() => setPreviewItem(null)}
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-lg w-full bg-white dark:bg-[#161b22] rounded-2xl p-4 shadow-2xl border border-gray-200 dark:border-slate-800 flex flex-col items-center space-y-3"
          >
            <div className="w-full flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-800">
              <span className="text-xs font-bold text-gray-800 dark:text-slate-200 truncate max-w-[80%]">
                {previewItem.bookTitle}
              </span>
              <button
                onClick={() => setPreviewItem(null)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[65vh] overflow-hidden rounded-xl bg-gray-100 dark:bg-slate-900 flex items-center justify-center">
              <img
                src={previewItem.url}
                alt={previewItem.bookTitle}
                className="max-h-[65vh] w-auto object-contain rounded-xl"
              />
            </div>

            <div className="w-full flex items-center justify-between text-xs text-gray-500 dark:text-slate-400 pt-1">
              <span>
                Độ phân giải:{" "}
                <strong>
                  {previewItem.dimensions?.width} × {previewItem.dimensions?.height} px
                </strong>
              </span>
              <span>
                Dung lượng: <strong>{(previewItem.sizeBytes / 1024).toFixed(1)} KB</strong>
              </span>
            </div>

            <div className="w-full flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleCopyImage(previewItem)}
                className="px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                Sao chép ảnh
              </button>
              <button
                type="button"
                onClick={() => handleDownloadSingle(previewItem)}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Tải ảnh về
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
