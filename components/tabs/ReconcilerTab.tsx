import React, { useState, useMemo } from "react";
import { Sheet } from "lucide-react";
import { ReconcilerInputSection } from "../reconciler/ReconcilerInputSection";
import { ReconcilerReportSection } from "../reconciler/ReconcilerReportSection";
import { ReconcilerPreviewSection } from "../reconciler/ReconcilerPreviewSection";
import {
  parsePlayBooksText,
  parseWarehouseText,
  compareBooks,
  SAMPLE_DATA,
  SAMPLE_WAREHOUSE
} from "@/utils/reconciler";

interface ReconcilerTabProps {
  rawText: string;
  setRawText: (val: string) => void;
  warehouseText: string;
  setWarehouseText: (val: string) => void;
}

export const ReconcilerTab: React.FC<ReconcilerTabProps> = ({
  rawText,
  setRawText,
  warehouseText,
  setWarehouseText,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedMissing, setCopiedMissing] = useState<boolean>(false);

  // Parse Google Play Books raw text
  const parsedBooks = useMemo(() => {
    return parsePlayBooksText(rawText);
  }, [rawText]);

  // Parse Warehouse catalog text
  const warehouseBooks = useMemo(() => {
    return parseWarehouseText(warehouseText);
  }, [warehouseText]);

  // Compare Warehouse catalog with Play Books results
  const comparisonResults = useMemo(() => {
    return compareBooks(warehouseBooks, parsedBooks);
  }, [warehouseBooks, parsedBooks]);

  // Sort parsed books based on their occurrence order in warehouse catalog
  const orderedParsedBooks = useMemo(() => {
    if (warehouseBooks.length === 0) return parsedBooks;

    const normalizeStringForSort = (str: string) => {
      return str
        .toLowerCase()
        .replace(/[.,\-\/#!$%\^&\*;:{}=\-_`~()]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const warehouseNormalized = warehouseBooks.map(b => normalizeStringForSort(b));

    return [...parsedBooks].sort((a, b) => {
      const normA = normalizeStringForSort(a.title);
      const normB = normalizeStringForSort(b.title);

      const idxA = warehouseNormalized.findIndex(w => normA === w || normA.includes(w) || w.includes(normA));
      const idxB = warehouseNormalized.findIndex(w => normB === w || normB.includes(w) || w.includes(normB));

      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return 0;
    });
  }, [parsedBooks, warehouseBooks]);

  // Convert parsed books into TSV format for Google Sheets copy-paste
  const sheetsPasteString = useMemo(() => {
    return orderedParsedBooks.map(book => `${book.title}\t${book.price}`).join("\n");
  }, [orderedParsedBooks]);

  const handleCopyResults = () => {
    if (!sheetsPasteString) return;
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(sheetsPasteString).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const handleCopyMissing = () => {
    if (comparisonResults.missing.length === 0) return;
    if (typeof window !== "undefined") {
      const text = comparisonResults.missing.join("\n");
      navigator.clipboard.writeText(text).then(() => {
        setCopiedMissing(true);
        setTimeout(() => setCopiedMissing(false), 2000);
      });
    }
  };

  const handleLoadSample = () => {
    setRawText(SAMPLE_DATA);
    setWarehouseText(SAMPLE_WAREHOUSE);
  };

  const handleClearRaw = () => {
    setRawText("");
  };

  const handleClearWarehouse = () => {
    setWarehouseText("");
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 1. Input Section */}
      <ReconcilerInputSection
        rawText={rawText}
        setRawText={setRawText}
        warehouseText={warehouseText}
        setWarehouseText={setWarehouseText}
        parsedBooksCount={parsedBooks.length}
        warehouseBooksCount={warehouseBooks.length}
        onLoadSample={handleLoadSample}
        onClearRaw={handleClearRaw}
        onClearWarehouse={handleClearWarehouse}
      />

      {/* 2. Comparison and Report Section (only visible if warehouse list contains items) */}
      {warehouseBooks.length > 0 && (
        <ReconcilerReportSection
          warehouseBooksCount={warehouseBooks.length}
          parsedBooksCount={parsedBooks.length}
          matchedCount={comparisonResults.matchedCount}
          unmatchedCount={comparisonResults.unmatchedCount}
          missingBooks={comparisonResults.missing}
          copiedMissing={copiedMissing}
          onCopyMissing={handleCopyMissing}
        />
      )}

      {/* 3. Parsed Output Preview Table (only visible if books are successfully parsed) */}
      {parsedBooks.length > 0 ? (
        <ReconcilerPreviewSection
          parsedBooks={orderedParsedBooks}
          copied={copied}
          onCopyResults={handleCopyResults}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center flex flex-col items-center justify-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-full bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-500 dark:text-indigo-400">
            <Sheet className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-gray-800">Chưa có dữ liệu bóc tách thô</h4>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              Hãy dán nội dung copy thô từ tài khoản Google Play Partner của bạn ở cột bên trái để hệ thống tự động bóc tách thông tin.
            </p>
          </div>
          <button
            onClick={handleLoadSample}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            Thử nhanh bằng dữ liệu mẫu
          </button>
        </div>
      )}
    </div>
  );
};
