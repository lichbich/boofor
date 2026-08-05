import React from "react";
import { Sheet, Copy, Check } from "lucide-react";
import { BookItem } from "@/utils/reconciler";

interface ReconcilerPreviewSectionProps {
  parsedBooks: BookItem[];
  copied: boolean;
  onCopyResults: () => void;
}

export const ReconcilerPreviewSection: React.FC<ReconcilerPreviewSectionProps> = ({
  parsedBooks,
  copied,
  onCopyResults,
}) => {
  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div 
        style={{ backgroundColor: '#1e1b4b' }}
        className="flex flex-col sm:flex-row items-center justify-between gap-4 text-white p-5 rounded-2xl shadow-md transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/10 rounded-xl">
            <Sheet className="w-5 h-5 text-emerald-300" />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-sm font-bold text-[#ffffff]">Đã bóc tách thành công {parsedBooks.length} cuốn sách</h4>
            <p className="text-[11px] text-indigo-200">
              Nhấp nút sao chép, sau đó mở Google Sheets/Excel và nhấn dán (Ctrl + V).
            </p>
          </div>
        </div>

        <button
          onClick={onCopyResults}
          style={copied ? {} : { backgroundColor: '#ffffff', color: '#1e1b4b' }}
          className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer select-none active:scale-95 duration-150 border border-gray-200 ${copied
            ? "bg-emerald-600 text-white hover:bg-emerald-700"
            : "shadow-sm"
            }`}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-white animate-scale" />
              <span>Đã copy dán Sheets!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" style={{ color: '#1e1b4b', stroke: '#1e1b4b' }} />
              <span style={{ color: '#1e1b4b' }}>Sao chép kết quả (Bấm để copy)</span>
            </>
          )}
        </button>
      </div>

      {/* Visual Table Preview */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden transition-all">
        <div className="px-5 py-4 bg-gray-50 border-b border-gray-150 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">
            Xem trước dạng hàng và cột
          </span>
          <span className="text-[11px] text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-900/50 px-3 py-1 rounded-full font-bold select-none">
            Tự động tách Tiêu đề (Cột A) và Giá tiền (Cột B) khi dán
          </span>
        </div>

        <div className="overflow-x-auto max-h-[450px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100/80 border-b border-gray-250 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider sticky top-0 bg-white z-10 shadow-xs">
                <th className="py-3.5 px-5 w-14 text-center">STT</th>
                <th className="py-3.5 px-5 min-w-[280px]">Cột A: Tiêu đề sách đăng Google Play</th>
                <th className="py-3.5 px-5 w-36">Mã GGKEY</th>
                <th className="py-3.5 px-5 w-36">Cột B: Giá bán lẻ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {parsedBooks.map((book, index) => {
                const isFree =
                  book.price.toLowerCase().includes("free") ||
                  book.price.toLowerCase().includes("miễn phí");
                return (
                  <tr
                    key={book.id}
                    className="hover:bg-gray-50/40 transition-colors"
                  >
                    <td className="py-3 px-5 text-center font-mono text-gray-400 font-bold">
                      {index + 1}
                    </td>
                    <td className="py-3 px-5 font-bold text-gray-800 break-words">
                      {book.title}
                    </td>
                    <td className="py-3 px-5 font-mono text-[11px] text-gray-500 select-all">
                      <span className="bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
                        {book.ggkey}
                      </span>
                    </td>
                    <td className="py-3 px-5">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${isFree
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50"
                          : "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50"
                          }`}
                      >
                        {book.price}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tutorial Tooltip */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-xs text-gray-600 leading-relaxed flex gap-2">
        <span className="font-extrabold text-indigo-600 dark:text-indigo-400 shrink-0">Mẹo nhỏ:</span>
        <p>
          Chỉ cần nhấn nút <strong className="text-gray-800 dark:text-slate-200">"Sao chép kết quả"</strong> ở trên, sau đó mở file Google Sheets/Excel của bạn, chọn một ô bất kỳ và nhấn tổ hợp phím <strong className="text-gray-800 dark:text-slate-200">Ctrl + V</strong> (hoặc <strong className="text-gray-800 dark:text-slate-200">Cmd + V</strong> trên Mac). Danh sách sẽ tự động chia sang 2 cột tiêu đề và giá cực kỳ thẳng hàng mà không cần chỉnh sửa thủ công.
        </p>
      </div>
    </div>
  );
};
