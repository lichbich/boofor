import React, { useState } from "react";
import { Upload, Check, Loader2, Sparkles, AlertCircle, FileImage } from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { EpubCoverReplacerModal } from "./EpubCoverReplacerModal";

interface ProcessedFile {
  name: string;
  status: "idle" | "processing" | "success" | "error";
  message: string;
}

export const EpubCleanerSection: React.FC = () => {
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReplacerOpen, setIsReplacerOpen] = useState(false);

  const cleanEpubFile = async (file: File): Promise<Blob> => {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    // 1. Find the OPF file (usually OEBPS/content.opf)
    let opfPath = "OEBPS/content.opf";
    const containerFile = zip.file("META-INF/container.xml");
    if (containerFile) {
      const containerXmlText = await containerFile.async("text");
      const parser = new DOMParser();
      const containerDoc = parser.parseFromString(containerXmlText, "text/xml");
      const rootfileEl = containerDoc.querySelector("rootfile");
      if (rootfileEl) {
        const fullPath = rootfileEl.getAttribute("full-path");
        if (fullPath) {
          opfPath = fullPath;
        }
      }
    } else {
      const opfFiles = Object.keys(zip.files).filter((name) => name.endsWith(".opf"));
      if (opfFiles.length > 0) {
        opfPath = opfFiles[0];
      }
    }

    const opfFile = zip.file(opfPath);
    if (!opfFile) {
      throw new Error("Không tìm thấy file cấu trúc sách (OPF).");
    }

    // Base directory of the OPF file
    const opfDir = opfPath.substring(0, opfPath.lastIndexOf("/") + 1);

    // 2. Parse the OPF file
    const opfText = await opfFile.async("text");
    const parser = new DOMParser();
    const opfDoc = parser.parseFromString(opfText, "text/xml");

    // Find all XHTML items in manifest
    const items = Array.from(opfDoc.querySelectorAll("item"));
    // Look for an inline cover page XHTML (not the image itself)
    const coverPageItem = items.find((item) => {
      const mediaType = item.getAttribute("media-type") || "";
      const href = item.getAttribute("href") || "";
      return (
        mediaType === "application/xhtml+xml" &&
        (href.toLowerCase().includes("cover") || href.toLowerCase().startsWith("0_"))
      );
    });

    if (!coverPageItem) {
      throw new Error("Sách này không chứa trang bìa trắng giả lập để dọn dẹp.");
    }

    const itemId = coverPageItem.getAttribute("id");
    const itemHref = coverPageItem.getAttribute("href");

    if (!itemId || !itemHref) {
      throw new Error("Thông tin trang bìa trong file cấu trúc không hợp lệ.");
    }

    // a. Remove item from manifest
    coverPageItem.parentNode?.removeChild(coverPageItem);

    // b. Remove itemref from spine
    const itemrefs = Array.from(opfDoc.querySelectorAll("itemref"));
    const spineRef = itemrefs.find((ref) => ref.getAttribute("idref") === itemId);
    if (spineRef) {
      spineRef.parentNode?.removeChild(spineRef);
    }

    // c. Delete the cover file from zip
    const coverFilePath = opfDir + itemHref;
    zip.remove(coverFilePath);

    // d. Clean toc.ncx if exists
    const ncxItem = items.find((item) => item.getAttribute("media-type") === "application/x-dtbncx+xml");
    const ncxHref = ncxItem?.getAttribute("href") || "toc.ncx";
    const ncxPath = opfDir + ncxHref;
    const ncxFile = zip.file(ncxPath);
    if (ncxFile) {
      const ncxText = await ncxFile.async("text");
      const ncxDoc = parser.parseFromString(ncxText, "text/xml");
      const navPoints = Array.from(ncxDoc.querySelectorAll("navPoint"));
      const targetNavPoint = navPoints.find(
        (np) => np.getAttribute("id") === itemId || np.querySelector("content")?.getAttribute("src") === itemHref
      );
      if (targetNavPoint) {
        targetNavPoint.parentNode?.removeChild(targetNavPoint);
        const serializer = new XMLSerializer();
        const newNcxText = serializer.serializeToString(ncxDoc);
        zip.file(ncxPath, newNcxText);
      }
    }

    // e. Clean toc.xhtml if exists
    const navItem = items.find((item) => item.getAttribute("properties")?.includes("nav") || item.getAttribute("id") === "toc");
    const navHref = navItem?.getAttribute("href") || "toc.xhtml";
    const navPath = opfDir + navHref;
    const navFile = zip.file(navPath);
    if (navFile) {
      const navText = await navFile.async("text");
      const navDoc = parser.parseFromString(navText, "text/xml");
      const anchors = Array.from(navDoc.querySelectorAll("a"));
      const targetAnchor = anchors.find((a) => a.getAttribute("href") === itemHref);
      if (targetAnchor) {
        const liEl = targetAnchor.closest("li");
        if (liEl) {
          liEl.parentNode?.removeChild(liEl);
        } else {
          targetAnchor.parentNode?.removeChild(targetAnchor);
        }
        const serializer = new XMLSerializer();
        const newNavText = serializer.serializeToString(navDoc);
        zip.file(navPath, newNavText);
      }
    }

    // Save modified OPF back to zip
    const serializer = new XMLSerializer();
    const newOpfText = serializer.serializeToString(opfDoc);
    zip.file(opfPath, newOpfText);

    // Generate cleaned EPUB blob
    return await zip.generateAsync({
      type: "blob",
      mimeType: "application/epub+zip",
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    const fileList = Array.from(uploadedFiles);
    const initialFiles = fileList.map((f) => ({
      name: f.name,
      status: "idle" as const,
      message: "Chờ xử lý...",
    }));

    setFiles(initialFiles);
    setIsProcessing(true);

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      setFiles((prev) =>
        prev.map((item, idx) => (idx === i ? { ...item, status: "processing", message: "Đang dọn dẹp trang bìa..." } : item))
      );

      try {
        const cleanedBlob = await cleanEpubFile(file);
        
        // Save cleaned file
        const cleanName = file.name.endsWith(".epub") 
          ? file.name.replace(/\.epub$/, "_cleaned.epub") 
          : `${file.name}_cleaned.epub`;
          
        saveAs(cleanedBlob, cleanName);

        setFiles((prev) =>
          prev.map((item, idx) => (idx === i ? { ...item, status: "success", message: "Đã xóa trang bìa trắng thành công! (Tự động tải về)" } : item))
        );
      } catch (err: any) {
        console.error("Clean error for file", file.name, err);
        setFiles((prev) =>
          prev.map((item, idx) => (idx === i ? { ...item, status: "error", message: err.message || "Lỗi xử lý file." } : item))
        );
      }
    }

    setIsProcessing(false);
    e.target.value = ""; // reset input
  };

  return (
    <div className="bg-white dark:bg-[#161b22] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 space-y-4 transition-colors duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-50 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          <h2 className="text-md font-semibold text-gray-800 dark:text-slate-100">Dọn dẹp Bìa Trắng EPUB đã tạo</h2>
        </div>
        <button
          type="button"
          onClick={() => setIsReplacerOpen(true)}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-55 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/30 text-indigo-650 dark:text-indigo-400 text-xs font-semibold rounded-lg transition-colors border border-indigo-200/50 dark:border-indigo-850 cursor-pointer"
        >
          <FileImage className="w-3.5 h-3.5" />
          Thay ảnh bìa hàng loạt
        </button>
      </div>

      <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
        Công cụ này giúp sửa nhanh các sách EPUB đã tạo trước đây có trang bìa bị trắng xóa. Nó sẽ tự động xóa trang bìa trắng đó đi, chỉ giữ lại ảnh bìa trong Metadata để hiển thị ngoài thư viện.
      </p>

      {/* Upload Zone */}
      <div className="relative border-2 border-dashed border-gray-250 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-xl p-6 transition-all group cursor-pointer text-center bg-gray-50/50 dark:bg-[#0d1117]/30">
        <input
          type="file"
          accept=".epub"
          multiple
          disabled={isProcessing}
          onChange={handleFileUpload}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
        />
        <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
          <div className="p-3 bg-white dark:bg-[#161b22] border border-gray-150 dark:border-slate-800 rounded-xl group-hover:scale-105 transition-transform shadow-sm text-gray-400 dark:text-slate-400">
            <Upload className="w-6 h-6" />
          </div>
          <div className="text-sm font-semibold text-gray-700 dark:text-slate-200">
            {isProcessing ? "Đang xử lý hàng loạt sách..." : "Chọn hoặc Kéo thả các file EPUB cần sửa vào đây"}
          </div>
          <div className="text-[11px] text-gray-400 dark:text-slate-500">
            Hỗ trợ chọn nhiều file cùng lúc. Xử lý cực nhanh 100% trên trình duyệt của bạn.
          </div>
        </div>
      </div>

      {/* Process list */}
      {files.length > 0 && (
        <div className="space-y-2 mt-4 max-h-60 overflow-y-auto pr-1">
          <div className="text-xs font-semibold text-gray-500 dark:text-slate-405 uppercase tracking-wider">
            Danh sách xử lý ({files.length} file)
          </div>
          {files.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#0d1117]/50 border border-gray-150 dark:border-slate-800 rounded-xl text-xs"
            >
              <div className="space-y-1 max-w-[70%]">
                <span className="font-bold text-gray-700 dark:text-slate-200 truncate block" title={file.name}>
                  {file.name}
                </span>
                <span
                  className={`block text-[11px] ${
                    file.status === "success"
                      ? "text-green-600 dark:text-green-400 font-medium"
                      : file.status === "error"
                      ? "text-red-500 font-medium"
                      : "text-gray-500 dark:text-slate-450"
                  }`}
                >
                  {file.message}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {file.status === "processing" && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />}
                {file.status === "success" && <Check className="w-4 h-4 text-green-500" />}
                {file.status === "error" && <AlertCircle className="w-4 h-4 text-red-500" />}
              </div>
            </div>
          ))}
        </div>
      )}

      <EpubCoverReplacerModal isOpen={isReplacerOpen} onClose={() => setIsReplacerOpen(false)} />
    </div>
  );
};
