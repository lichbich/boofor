import React, { useState, useMemo } from "react";
import { X, Upload, Check, Loader2, AlertCircle, FileImage, Sparkles, RefreshCw, Copy, FileText } from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";

interface EpubCoverReplacerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface EpubFileItem {
  file: File;
  arrayBuffer: ArrayBuffer;
  zip: JSZip;
  opfPath: string;
}

interface MatchResult {
  epubItem: EpubFileItem;
  imageFile: File | null;
  status: "matched" | "unmatched";
}

// Robust HTML entity decoder (handles decimal, hex, and common named entities)
const decodeHtmlEntities = (str: string): string => {
  if (!str) return "";
  return str
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      try {
        return String.fromCharCode(parseInt(hex, 16));
      } catch {
        return `&#x${hex};`;
      }
    })
    .replace(/&#([0-9]+);/g, (_, dec) => {
      try {
        return String.fromCharCode(parseInt(dec, 10));
      } catch {
        return `&#${dec};`;
      }
    })
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&rsquo;/g, "’")
    .replace(/&lsquo;/g, "‘")
    .replace(/&ldquo;/g, "“")
    .replace(/&rdquo;/g, "”")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—");
};

// Strips HTML tags and decodes entities to produce clean plain text for clipboard
const cleanHtmlToPlainText = (html: string): string => {
  let text = html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "");
  text = text.replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|tr)>/gi, "\n");
  text = text.replace(/<(br|hr)[^>]*>/gi, "\n");
  text = text.replace(/<[^>]*>/g, "");
  return decodeHtmlEntities(text).trim();
};

// Finds and extracts the Introduction section HTML from EPUB
const extractIntroductionHtml = async (zip: JSZip, opfPath: string): Promise<string> => {
  const opfFile = zip.file(opfPath);
  if (!opfFile) return "";
  
  const opfText = await opfFile.async("text");
  const opfDir = opfPath.substring(0, opfPath.lastIndexOf("/")) + "/";
  const cleanOpfDir = opfDir === "/" ? "" : opfDir;
  
  const items: Record<string, string> = {};
  const itemMatches = opfText.matchAll(/<item[^>]*id=["']([^"']+)["'][^>]*href=["']([^"']+)["']/gi);
  for (const m of itemMatches) {
    items[m[1]] = decodeURIComponent(m[2]);
  }
  
  const spineIds: string[] = [];
  const spineMatches = opfText.matchAll(/<itemref[^>]*idref=["']([^"']+)["']/gi);
  for (const m of spineMatches) {
    spineIds.push(m[1]);
  }
  
  let rawHtml = "";
  
  for (const id of spineIds) {
    const href = items[id];
    if (!href) continue;
    
    const fullPath = cleanOpfDir + href;
    const file = zip.file(fullPath);
    if (!file) continue;
    
    const htmlText = await file.async("text");
    const cleanHref = href.toLowerCase();
    
    const isIntroFile = cleanHref.includes("intro") || cleanHref.includes("preface");
    const hasIntroHeader = /<(h1|h2)[^>]*>[\s\S]*?(introduction|giới thiệu|preface|lời nói đầu)[\s\S]*?<\/\1>/i.test(htmlText);
    
    if (isIntroFile || hasIntroHeader) {
      rawHtml = htmlText;
      break;
    }
  }
  
  // Fallback: Use first readable content file (skip cover, title, toc)
  if (!rawHtml) {
    for (const id of spineIds) {
      const href = items[id];
      if (!href) continue;
      
      const cleanHref = href.toLowerCase();
      if (cleanHref.includes("cover") || cleanHref.includes("title") || cleanHref.includes("toc") || cleanHref.includes("nav")) {
        continue;
      }
      
      const fullPath = cleanOpfDir + href;
      const file = zip.file(fullPath);
      if (!file) continue;
      
      const htmlText = await file.async("text");
      const plain = cleanHtmlToPlainText(htmlText);
      if (plain.trim().length > 100) {
        rawHtml = htmlText;
        break;
      }
    }
  }
  
  if (!rawHtml) return "";

  // Extract body content
  const bodyMatch = rawHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let bodyContent = bodyMatch ? bodyMatch[1] : rawHtml;

  // Clean entities inside the HTML string to prevent display issues
  bodyContent = decodeHtmlEntities(bodyContent);

  return bodyContent.trim();
};

export const EpubCoverReplacerModal: React.FC<EpubCoverReplacerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [epubItems, setEpubItems] = useState<EpubFileItem[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processLogs, setProcessLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const [isDraggingEpub, setIsDraggingEpub] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState(false);

  // Introduction extraction states
  const [extractedIntros, setExtractedIntros] = useState<Record<string, string>>({});
  const [copiedIntroId, setCopiedIntroId] = useState<string | null>(null);
  const [isParsingIntros, setIsParsingIntros] = useState(false);
  const [isExportingAllIntros, setIsExportingAllIntros] = useState(false);

  // Load and parse EPUB files immediately into memory (ArrayBuffer + JSZip)
  const loadEpubFiles = async (filesList: File[]) => {
    setIsParsingIntros(true);
    const loadedItems: EpubFileItem[] = [];
    const intros: Record<string, string> = {};

    for (const file of filesList) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);
        
        let opfPath = "";
        const containerFile = zip.file("META-INF/container.xml");
        if (containerFile) {
          const containerXml = await containerFile.async("text");
          const match = containerXml.match(/full-path=["']([^"']+)["']/);
          if (match && match[1]) {
            opfPath = match[1];
          }
        }
        if (!opfPath) {
          const opfFiles = Object.keys(zip.files).filter(p => p.endsWith(".opf"));
          if (opfFiles.length > 0) {
            opfPath = opfFiles[0];
          }
        }

        loadedItems.push({
          file,
          arrayBuffer,
          zip,
          opfPath
        });

        if (opfPath) {
          const introHtml = await extractIntroductionHtml(zip, opfPath);
          intros[file.name] = introHtml;
        } else {
          intros[file.name] = "Không tìm thấy cấu trúc OPF.";
        }
      } catch (err) {
        console.error("Lỗi đọc file EPUB:", file.name, err);
        intros[file.name] = "Lỗi đọc file EPUB.";
      }
    }

    setEpubItems(loadedItems);
    setExtractedIntros(intros);
    setIsParsingIntros(false);
  };

  const handleCopyIntro = async (epubName: string) => {
    const htmlText = extractedIntros[epubName];
    if (!htmlText || htmlText.startsWith("Không tìm thấy") || htmlText.startsWith("Lỗi")) {
      alert("Không có nội dung Introduction hợp lệ để sao chép.");
      return;
    }

    try {
      const plainText = cleanHtmlToPlainText(htmlText);
      await navigator.clipboard.writeText(plainText);
      setCopiedIntroId(epubName);
      setTimeout(() => setCopiedIntroId(null), 2000);
    } catch (err) {
      console.error(err);
      alert("Lỗi khi sao chép vào bộ nhớ tạm.");
    }
  };

  const handleExportAllIntrosDocx = async () => {
    const validMatches = matches.filter(m => {
      const text = extractedIntros[m.epubItem.file.name];
      return text && !text.startsWith("Không tìm thấy") && !text.startsWith("Lỗi");
    });

    if (validMatches.length === 0) {
      alert("Chưa có Introduction nào được trích xuất thành công để xuất file Word.");
      return;
    }

    setIsExportingAllIntros(true);

    try {
      let combinedHtml = "";
      
      for (let i = 0; i < validMatches.length; i++) {
        const match = validMatches[i];
        const name = match.epubItem.file.name;
        const htmlContent = extractedIntros[name];
        const bookTitle = name.endsWith(".epub") ? name.substring(0, name.lastIndexOf(".")) : name;

        // Add header for the book with clear visual distinction
        combinedHtml += `
          <div style="margin-bottom: 24pt;">
            <h2 style="font-family: Arial, sans-serif; font-size: 16pt; font-weight: bold; color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 5px; margin-top: 18pt; margin-bottom: 12pt;">
              SÁCH: ${bookTitle}
            </h2>
            <div style="font-family: 'Times New Roman', serif; font-size: 13pt; line-height: 1.6;">
              ${htmlContent}
            </div>
          </div>
        `;

        if (i < validMatches.length - 1) {
          combinedHtml += `<div style="page-break-after: always; break-after: page;"></div>`;
        }
      }

      // Wrap in standard HTML structure
      const finalHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Tổng hợp Introduction</title>
          </head>
          <body>
            ${combinedHtml}
          </body>
        </html>
      `;

      // Call API export-docx
      const response = await fetch("/api/export-docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: finalHtml }),
      });

      if (!response.ok) {
        throw new Error("Lỗi kết nối API xuất Docx");
      }

      const blob = await response.blob();
      saveAs(blob, "Tong_Hop_Introduction.docx");
      
      alert(`Đã xuất thành công Introduction của ${validMatches.length} cuốn sách ra file Docx!`);
    } catch (err: any) {
      console.error(err);
      alert(`Đã xảy ra lỗi khi xuất file Word: ${err.message || String(err)}`);
    } finally {
      setIsExportingAllIntros(false);
    }
  };

  // Smart Matching Logic
  const matches: MatchResult[] = useMemo(() => {
    const stripMetadata = (name: string) => {
      let s = name.substring(0, name.lastIndexOf(".")) || name;
      s = s.replace(/^\d+[\s\.\-_]*/, "");
      const hyphenIdx = s.lastIndexOf("-");
      if (hyphenIdx !== -1) {
        s = s.substring(0, hyphenIdx).trim();
      }
      return s.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
    };

    return epubItems.map((item) => {
      const epubName = item.file.name;
      const cleanEpub = epubName.substring(0, epubName.lastIndexOf(".")).trim().toLowerCase();
      const epubKey = stripMetadata(epubName);

      let matchedImage: File | null = null;

      for (const img of imageFiles) {
        const cleanImage = img.name.substring(0, img.name.lastIndexOf(".")).trim().toLowerCase();
        const imageKey = stripMetadata(img.name);

        if (cleanEpub === cleanImage || epubKey === imageKey) {
          matchedImage = img;
          break;
        }

        if (
          (epubKey.length >= 6 && imageKey.length >= 6) &&
          (epubKey.includes(imageKey) || imageKey.includes(epubKey))
        ) {
          matchedImage = img;
          break;
        }
      }

      return {
        epubItem: item,
        imageFile: matchedImage,
        status: matchedImage ? "matched" : "unmatched",
      };
    });
  }, [epubItems, imageFiles]);

  const handleEpubChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      loadEpubFiles(Array.from(e.target.files));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImageFiles(Array.from(e.target.files));
    }
  };

  // Drag and Drop for EPUBs
  const handleEpubDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingEpub(true);
  };
  const handleEpubDragLeave = () => {
    setIsDraggingEpub(false);
  };
  const handleEpubDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingEpub(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith(".epub"));
    if (files.length > 0) {
      loadEpubFiles(files);
    }
  };

  // Drag and Drop for Images
  const handleImageDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingImage(true);
  };
  const handleImageDragLeave = () => {
    setIsDraggingImage(false);
  };
  const handleImageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingImage(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    if (files.length > 0) {
      setImageFiles(files);
    }
  };

  // Helper to replace cover image inside zip (Uses pre-parsed JSZip instance)
  const replaceSingleEpubCover = async (zip: JSZip, opfPath: string, newCoverFile: File): Promise<Blob> => {
    // 1. Process and compress new image to JPEG
    const newCoverData = await new Promise<ArrayBuffer>((resolve, reject) => {
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
            canvas.toBlob((blob) => {
              if (blob) {
                const r = new FileReader();
                r.onload = () => resolve(r.result as ArrayBuffer);
                r.onerror = reject;
                r.readAsArrayBuffer(blob);
              } else {
                reject(new Error("Lỗi nén ảnh bìa"));
              }
            }, "image/jpeg", 0.8);
          } else {
            reject(new Error("Lỗi dựng canvas"));
          }
        };
        img.onerror = () => reject(new Error("Định dạng ảnh không đọc được"));
        img.src = evt.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(newCoverFile);
    });

    let coverPathInZip = "";
    if (opfPath) {
      const opfText = await zip.file(opfPath)!.async("text");
      const opfDir = opfPath.substring(0, opfPath.lastIndexOf("/")) + "/";
      const cleanOpfDir = opfDir === "/" ? "" : opfDir;

      let coverHref = "";
      const itemRegexes = [
        /<item[^>]*id=["']cover-image["'][^>]*href=["']([^"']+)["']/i,
        /<item[^>]*href=["']([^"']+)["'][^>]*id=["']cover-image["']/i,
        /<item[^>]*id=["']cover["'][^>]*href=["']([^"']+)["']/i,
        /<item[^>]*href=["']([^"']+)["'][^>]*id=["']cover["']/i,
        /<item[^>]*properties=["']cover-image["'][^>]*href=["']([^"']+)["']/i,
        /<item[^>]*href=["']([^"']+)["'][^>]*properties=["']cover-image["']/i
      ];

      for (const regex of itemRegexes) {
        const m = opfText.match(regex);
        if (m && m[1]) {
          coverHref = m[1];
          break;
        }
      }

      if (!coverHref) {
        const metaMatch = opfText.match(/<meta[^>]*name=["']cover["'][^>]*content=["']([^"']+)["']/i);
        if (metaMatch && metaMatch[1]) {
          const itemId = metaMatch[1];
          const itemRegex = new RegExp("<item[^>]*id=[\"']" + itemId + "[\"'][^>]*href=[\"']([^\"']+)[\"']", "i");
          const itemMatch = opfText.match(itemRegex);
          if (itemMatch && itemMatch[1]) {
            coverHref = itemMatch[1];
          }
        }
      }

      if (coverHref) {
        coverPathInZip = cleanOpfDir + decodeURIComponent(coverHref);
      }
    }

    // 3. Fallback scan for cover filenames
    if (!coverPathInZip || !zip.file(coverPathInZip)) {
      const fallbackPaths = Object.keys(zip.files).filter(p => 
        /(cover-image|bookcover|cover)\.(jpg|jpeg|png|webp)$/i.test(p)
      );
      if (fallbackPaths.length > 0) {
        coverPathInZip = fallbackPaths[0];
      }
    }

    // 4. Ultimate fallback: first image in zip
    if (!coverPathInZip || !zip.file(coverPathInZip)) {
      const allImages = Object.keys(zip.files).filter(p => /\.(jpg|jpeg|png|webp)$/i.test(p));
      if (allImages.length > 0) {
        coverPathInZip = allImages[0];
      }
    }

    if (coverPathInZip && zip.file(coverPathInZip)) {
      zip.file(coverPathInZip, newCoverData);
      return await zip.generateAsync({ type: "blob", mimeType: "application/epub+zip" });
    } else {
      throw new Error("Không tìm thấy tệp ảnh bìa nào trong cấu trúc EPUB");
    }
  };

  const handleProcessReplacement = async () => {
    const matchedItems = matches.filter(m => m.imageFile !== null) as Array<{ epubItem: EpubFileItem; imageFile: File }>;
    if (matchedItems.length === 0) {
      alert("Không tìm thấy cặp EPUB và ảnh bìa nào trùng tên nhau để xử lý!");
      return;
    }

    setIsProcessing(true);
    setProcessLogs([]);
    setProgress({ current: 0, total: matchedItems.length });

    const zip = new JSZip();
    let successCount = 0;

    for (let i = 0; i < matchedItems.length; i++) {
      const { epubItem, imageFile } = matchedItems[i];
      const logPrefix = `[${i + 1}/${matchedItems.length}] ${epubItem.file.name}`;
      
      setProcessLogs(prev => [...prev, `${logPrefix}: Đang khớp ảnh bìa...`]);
      setProgress(prev => ({ ...prev, current: i + 1 }));

      try {
        const modifiedBlob = await replaceSingleEpubCover(epubItem.zip, epubItem.opfPath, imageFile);
        zip.file(epubItem.file.name, modifiedBlob);
        successCount++;
        
        setProcessLogs(prev => [
          ...prev.slice(0, -1),
          `${logPrefix}: ✓ Thay ảnh bìa thành công.`
        ]);
      } catch (err: any) {
        console.error("Replacement error:", epubItem.file.name, err);
        setProcessLogs(prev => [
          ...prev.slice(0, -1),
          `${logPrefix}: ✗ Lỗi: ${err.message || String(err)}`
        ]);
      }
    }

    if (successCount > 0) {
      setProcessLogs(prev => [...prev, "Đang nén file ZIP kết quả..."]);
      try {
        const zipBlob = await zip.generateAsync({ type: "blob" });
        saveAs(zipBlob, "EPUB_Da_Thay_Bia.zip");
        setProcessLogs(prev => [...prev, "✓ Hoàn thành! File ZIP đã được tự động tải về máy."]);
      } catch (err: any) {
        setProcessLogs(prev => [...prev, `✗ Lỗi nén file ZIP: ${err.message || String(err)}`]);
      }
    } else {
      setProcessLogs(prev => [...prev, "Không có file nào được thay đổi thành công."]);
    }

    setIsProcessing(false);
  };

  const matchedCount = matches.filter(m => m.imageFile !== null).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#161b22] text-gray-800 dark:text-slate-100 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-[#0d1117]/30">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-650 dark:text-indigo-400 rounded-lg">
              <RefreshCw className="w-5 h-5 animate-spin-slow" />
            </span>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">
                Thay đổi ảnh bìa EPUB hàng loạt
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Tải lên nhiều sách EPUB & ảnh bìa mới, hệ thống tự đối chiếu, trích xuất Introduction và tạo file mới.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-600 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Upload Inputs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* EPUB Files Input */}
            <div 
              onDragOver={handleEpubDragOver}
              onDragLeave={handleEpubDragLeave}
              onDrop={handleEpubDrop}
              className={`relative border-2 border-dashed rounded-xl p-6 transition-all text-center flex flex-col items-center justify-center space-y-2 bg-gray-50/50 dark:bg-[#0d1117]/10 ${
                isDraggingEpub 
                  ? "border-indigo-500 bg-indigo-50/20 text-indigo-600" 
                  : "border-gray-200 dark:border-slate-800 hover:border-indigo-400"
              }`}
            >
              <input
                type="file"
                accept=".epub"
                multiple
                disabled={isProcessing}
                onChange={handleEpubChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
              />
              <Upload className="w-8 h-8 text-gray-400" />
              <div className="text-xs font-semibold text-gray-700 dark:text-slate-200">
                1. Đẩy các file EPUB cần thay ảnh bìa
              </div>
              <div className="text-[10px] text-gray-400 dark:text-slate-500">
                {epubItems.length > 0 ? `Đã chọn ${epubItems.length} file EPUB` : "Kéo thả hoặc click chọn nhiều file .epub"}
              </div>
            </div>

            {/* Images Input */}
            <div 
              onDragOver={handleImageDragOver}
              onDragLeave={handleImageDragLeave}
              onDrop={handleImageDrop}
              className={`relative border-2 border-dashed rounded-xl p-6 transition-all text-center flex flex-col items-center justify-center space-y-2 bg-gray-50/50 dark:bg-[#0d1117]/10 ${
                isDraggingImage 
                  ? "border-indigo-500 bg-indigo-50/20 text-indigo-600" 
                  : "border-gray-200 dark:border-slate-800 hover:border-indigo-400"
              }`}
            >
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={isProcessing}
                onChange={handleImageChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
              />
              <FileImage className="w-8 h-8 text-gray-400" />
              <div className="text-xs font-semibold text-gray-700 dark:text-slate-200">
                2. Đẩy các file ảnh bìa mới
              </div>
              <div className="text-[10px] text-gray-400 dark:text-slate-500">
                {imageFiles.length > 0 ? `Đã chọn ${imageFiles.length} tệp ảnh` : "Kéo thả hoặc click chọn nhiều ảnh trùng tên sách"}
              </div>
            </div>

          </div>

          {/* Verification Table */}
          {epubItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  Danh sách đối khớp ảnh bìa ({epubItems.length} sách)
                  {isParsingIntros && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-green-600 dark:text-green-400 font-bold">
                    Khớp thành công: {matchedCount} / {epubItems.length}
                  </span>
                  {Object.keys(extractedIntros).length > 0 && (
                    <button
                      type="button"
                      onClick={handleExportAllIntrosDocx}
                      disabled={isExportingAllIntros}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/30 text-blue-650 dark:text-blue-400 font-semibold rounded border border-blue-200/30 cursor-pointer transition-all duration-200 hover:shadow-sm disabled:opacity-50"
                    >
                      {isExportingAllIntros ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <FileText className="w-3 h-3" />
                      )}
                      Xuất tất cả Intro (.docx)
                    </button>
                  )}
                </div>
              </div>

              <div className="border border-gray-100 dark:border-slate-800 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-[#0d1117]/40 border-b border-gray-150 dark:border-slate-800 text-gray-500 font-medium">
                      <th className="p-3">Tên file EPUB</th>
                      <th className="p-3">Ảnh bìa sẽ đổi</th>
                      <th className="p-3 text-center">Introduction</th>
                      <th className="p-3 text-right">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {matches.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/20">
                        <td className="p-3 font-medium text-gray-700 dark:text-slate-200 truncate max-w-[240px]" title={item.epubItem.file.name}>
                          {item.epubItem.file.name}
                        </td>
                        <td className="p-3 text-gray-500 dark:text-slate-400 truncate max-w-[200px]" title={item.imageFile?.name || "Chưa có"}>
                          {item.imageFile ? (
                            <span className="flex items-center gap-1.5 text-indigo-650 dark:text-indigo-400 font-medium">
                              <FileImage className="w-3.5 h-3.5" />
                              {item.imageFile.name}
                            </span>
                          ) : (
                            <span className="text-gray-400">---</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {isParsingIntros && !extractedIntros[item.epubItem.file.name] ? (
                            <Loader2 className="w-4 h-4 animate-spin text-gray-400 mx-auto" />
                          ) : extractedIntros[item.epubItem.file.name] && 
                              !extractedIntros[item.epubItem.file.name].startsWith("Không tìm thấy") && 
                              !extractedIntros[item.epubItem.file.name].startsWith("Lỗi") ? (
                            <button
                              type="button"
                              onClick={() => handleCopyIntro(item.epubItem.file.name)}
                              className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 font-bold transition-all duration-250 cursor-pointer border border-indigo-200/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30"
                              title="Sao chép Introduction cuốn sách này (văn bản trơn)"
                            >
                              {copiedIntroId === item.epubItem.file.name ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-green-500" />
                                  <span className="text-[10px] text-green-600">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span className="text-[10px]">Copy Intro</span>
                                </>
                              )}
                            </button>
                          ) : (
                            <span className="text-gray-400 text-[10px] italic" title={extractedIntros[item.epubItem.file.name] || "Không có Introduction"}>
                              Trống / Lỗi
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {item.status === "matched" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 font-semibold text-[10px]">
                              <Check className="w-3.5 h-3.5 text-green-500" /> Đã khớp
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-500 font-semibold text-[10px]">
                              <AlertCircle className="w-3 h-3" /> Thiếu ảnh
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Process logs */}
          {processLogs.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tiến trình thay ảnh</div>
              <div className="bg-gray-50 dark:bg-[#0d1117] p-4 rounded-xl border border-gray-150 dark:border-slate-800 font-mono text-[11px] space-y-1.5 max-h-40 overflow-y-auto text-gray-600 dark:text-slate-300">
                {processLogs.map((log, idx) => (
                  <div key={idx} className={log.includes("✓") ? "text-green-600 dark:text-green-400" : log.includes("✗") ? "text-red-500" : ""}>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-[#0d1117]/30 flex justify-between items-center">
          <div className="text-xs text-gray-400 dark:text-slate-500">
            {isProcessing && `Tiến trình: ${progress.current}/${progress.total} file`}
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              onClick={handleProcessReplacement}
              disabled={isProcessing || matchedCount === 0}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Bắt đầu thay ảnh bìa ({matchedCount} sách)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
