import React from "react";
import { BookOpen, RotateCcw, Sparkles } from "lucide-react";

interface ReconcilerInputSectionProps {
  rawText: string;
  setRawText: (val: string) => void;
  warehouseText: string;
  setWarehouseText: (val: string) => void;
  parsedBooksCount: number;
  warehouseBooksCount: number;
  onLoadSample: () => void;
  onClearRaw: () => void;
  onClearWarehouse: () => void;
}

export const ReconcilerInputSection: React.FC<ReconcilerInputSectionProps> = ({
  rawText,
  setRawText,
  warehouseText,
  setWarehouseText,
  parsedBooksCount,
  warehouseBooksCount,
  onLoadSample,
  onClearRaw,
  onClearWarehouse,
}) => {
  return (
    <div className="space-y-6">
      {/* Header and Load Sample Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
        <div className="space-y-1">
          <h3 className="text-md font-bold text-gray-800 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            Nhập Dữ Liệu Catalog &amp; Kho Sách
          </h3>
          <p className="text-xs text-gray-500">
            Dán dữ liệu thô từ Play Books Partner Center và đối sánh với danh sách kho gốc của bạn.
          </p>
        </div>
        <button
          onClick={onLoadSample}
          className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100/80 dark:hover:bg-indigo-900/40 px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs border border-indigo-100 dark:border-indigo-900/50"
        >
          <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          Dùng dữ liệu mẫu đối chiếu
        </button>
      </div>

      {/* Input Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Play Books Raw Data */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-pulse shrink-0"></span>
                1. Copy từ Web/Google Play
              </h4>
              {rawText && (
                <button
                  onClick={onClearRaw}
                  className="text-xs font-semibold text-red-500 hover:text-red-700 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Xóa
                </button>
              )}
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              Copy toàn bộ trang/bảng tại danh mục sách của Google Play Partner Center rồi dán vào đây. Các bìa sách ("Book cover") và trạng thái thừa sẽ được tự động lọc bỏ.
            </p>

            <textarea
              id="textarea-raw-playbooks"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Dán nội dung bảng Catalog sách của bạn tại đây..."
              rows={9}
              className="w-full p-4 text-xs font-mono text-gray-900 placeholder-gray-400 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-550 bg-gray-50/30 resize-y min-h-[180px] transition-all"
            />
          </div>

          <div className="text-xs text-gray-400 font-semibold pt-2 border-t border-gray-50 flex items-center justify-between">
            <span>Trạng thái nhận diện:</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md">
              {parsedBooksCount} sách thô
            </span>
          </div>
        </div>

        {/* Warehouse List */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-emerald-555 rounded-full shrink-0" style={{ backgroundColor: "#10b981" }}></span>
                2. Danh sách kho gốc của bạn
              </h4>
              <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-extrabold px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-900/50 select-none">
                Lấy từ tab Formatter
              </span>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              Danh sách này được đồng bộ tự động từ mục <strong>"Danh sách sách"</strong> bên tab <strong>Formatter</strong>. Để thêm hoặc sửa đổi danh sách sách trong kho, bạn hãy chỉnh sửa ở tab Formatter.
            </p>

            <textarea
              id="textarea-warehouse"
              value={warehouseText}
              readOnly
              placeholder="Chưa có danh sách sách bên tab Formatter..."
              rows={9}
              className="w-full p-4 text-xs font-mono text-gray-900 placeholder-gray-400 border border-gray-200 border-dashed rounded-xl bg-gray-50/50 cursor-not-allowed resize-none min-h-[180px]"
            />
          </div>

          <div className="text-xs text-gray-400 font-semibold pt-2 border-t border-gray-50 flex items-center justify-between">
            <span>Danh mục kho gốc:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
              {warehouseBooksCount} cuốn
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
