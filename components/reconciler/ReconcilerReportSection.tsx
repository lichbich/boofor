import React from "react";
import { TrendingUp, Copy, Check, CheckCircle2, AlertTriangle, Inbox } from "lucide-react";

interface ReconcilerReportSectionProps {
  warehouseBooksCount: number;
  parsedBooksCount: number;
  matchedCount: number;
  unmatchedCount: number;
  missingBooks: string[];
  copiedMissing: boolean;
  onCopyMissing: () => void;
}

export const ReconcilerReportSection: React.FC<ReconcilerReportSectionProps> = ({
  warehouseBooksCount,
  parsedBooksCount,
  matchedCount,
  unmatchedCount,
  missingBooks,
  copiedMissing,
  onCopyMissing,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-250 overflow-hidden shadow-md transition-all duration-300">
      {/* Report Header */}
      <div className="p-5 bg-gradient-to-r from-indigo-50/70 to-emerald-50/70 dark:from-indigo-950/20 dark:to-emerald-950/20 border-b border-gray-150 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Báo cáo phân tích đối tương thích &amp; thất lạc
          </h3>
          <p className="text-xs text-gray-500">
            Đối chiếu danh mục kho gốc ({warehouseBooksCount} cuốn) vs hệ thống Play Books ({parsedBooksCount} cuốn)
          </p>
        </div>

        {unmatchedCount > 0 && (
          <button
            onClick={onCopyMissing}
            className="self-start sm:self-center px-4 py-2 bg-amber-500 hover:bg-amber-600 text-[#ffffff] rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer active:scale-95 select-none"
          >
            {copiedMissing ? <Check className="w-3.5 h-3.5 text-[#ffffff]" /> : <Copy className="w-3.5 h-3.5 text-[#ffffff]" />}
            {copiedMissing ? "Đã copy danh sách sách thiếu!" : "Copy danh sách sách thiếu"}
          </button>
        )}
      </div>

      {/* Grid Status Cards */}
      <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-gray-100 bg-gray-50/30">
        {/* Match Count */}
        <div className="p-4 bg-white border border-gray-200 rounded-xl flex items-center gap-3 shadow-xs">
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">Đã khớp trùng</div>
            <div className="text-md font-extrabold text-gray-900">
              {matchedCount} / {warehouseBooksCount} cuốn
            </div>
          </div>
        </div>

        {/* Missing Count */}
        <div className="p-4 bg-white border border-gray-200 rounded-xl flex items-center gap-3 shadow-xs">
          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-lg">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">Thiếu hụt (Chưa có)</div>
            <div className={`text-md font-extrabold ${unmatchedCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900'}`}>
              {unmatchedCount} cuốn
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="p-4 bg-white border border-gray-200 rounded-xl flex items-center gap-3 shadow-xs">
          <div className={`p-2.5 rounded-lg ${unmatchedCount === 0 ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'}`}>
            <Inbox className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">Trạng thái an toàn</div>
            <div className="text-xs font-bold">
              {unmatchedCount === 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">Đầy đủ 100%!</span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400 font-semibold">Bị hụt {unmatchedCount} cuốn sách</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* List missing books */}
      <div className="p-5">
        {unmatchedCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center text-gray-500">
            <div className="mb-2.5 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-full text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-6 h-6 animate-scale" />
            </div>
            <p className="text-sm font-bold text-gray-800">Tuyệt vời! Không thiếu cuốn sách nào</p>
            <p className="text-xs text-gray-400 mt-1 max-w-sm">
              Mọi đầu sách trong kho danh sách của bạn đã được đối khớp đầy đủ trên Google Play Partner Center.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
              Danh sách chi tiết {unmatchedCount} cuốn đang bị THIẾU TRÊN GOOGLE PLAY:
            </span>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
              {missingBooks.map((bookTitle, i) => (
                <div
                  key={i}
                  className="p-3 bg-red-50/40 dark:bg-red-950/20 hover:bg-red-50/60 dark:hover:bg-red-950/30 border border-red-100 dark:border-red-900/30 rounded-xl flex items-center justify-between text-xs text-red-800 dark:text-red-300 transition-colors"
                >
                  <div className="flex items-center gap-3 font-semibold min-w-0 pr-2">
                    <span className="w-5 h-5 shrink-0 bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 font-mono flex items-center justify-center rounded-lg font-extrabold text-[10px]">
                      {i + 1}
                    </span>
                    <span className="truncate" title={bookTitle}>{bookTitle}</span>
                  </div>
                  <span className="shrink-0 text-[10px] bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1 select-none">
                    Chưa thấy đăng
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
