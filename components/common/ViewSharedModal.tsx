import React, { useState } from "react";
import { X, Calendar, User, Check, Copy, Eye, BookOpen, Layers } from "lucide-react";
import { copyToClipboard } from "@/utils/clipboard";

interface ViewSharedModalProps {
  isOpen: boolean;
  onClose: () => void;
  authorName: string;
  shares: any[]; // Filtered sentShares for this author
}

export const ViewSharedModal: React.FC<ViewSharedModalProps> = ({
  isOpen,
  onClose,
  authorName,
  shares = [],
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = async (text: string, id: string, isHtml = false) => {
    await copyToClipboard(
      text,
      () => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      },
      isHtml
    );
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "accepted":
        return "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-450 border border-emerald-200 dark:border-emerald-900/50";
      case "declined":
        return "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 line-through";
      default:
        return "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "accepted":
        return "Đã nhận";
      case "declined":
        return "Từ chối";
      default:
        return "Chờ nhận";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#161b22] rounded-2xl max-w-2xl w-full flex flex-col shadow-2xl border border-gray-250 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-[#0d1117]/50">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Eye className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">
                Chi tiết dữ liệu chia sẻ của: {authorName}
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-slate-400">
                Sao chép lại nội dung trích xuất lưu trên Database đám mây
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex-1 space-y-6 overflow-y-auto">
          {shares.length === 0 ? (
            <div className="text-center py-10 text-xs text-gray-450 italic">
              Không tìm thấy dữ liệu sao lưu nào cho các lượt chia sẻ của tác giả này. 
              <p className="text-[10px] mt-1 text-gray-400 font-normal">
                (Chỉ những lượt chia sẻ mới sau bản cập nhật này mới được sao lưu đầy đủ nội dung)
              </p>
            </div>
          ) : (
            shares.map((share, idx) => {
              const sharedDate = new Date(share.sharedAt).toLocaleString();
              const bookIntros = Object.entries(share.bookIntroMap || {});

              return (
                <div 
                  key={share.id} 
                  className="bg-gray-50 dark:bg-[#0d1117]/40 border border-gray-150 dark:border-slate-800/80 rounded-xl p-4 space-y-4"
                >
                  {/* Share Info Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200/60 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-4 text-[11px] text-gray-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-gray-450" />
                        Người nhận: <strong className="text-gray-800 dark:text-slate-200">{share.recipient}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-450" />
                        Gửi lúc: {sharedDate}
                      </span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusBadgeClass(share.status)}`}>
                      {getStatusText(share.status)}
                    </span>
                  </div>

                  {/* Backup Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Book List Backup */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-500 dark:text-slate-450 uppercase tracking-wider flex items-center gap-1">
                          <BookOpen className="w-3 h-3" /> Danh sách sách
                        </span>
                        <button
                          onClick={() => handleCopy(share.bookListText, `list_${share.id}`)}
                          disabled={!share.bookListText}
                          className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-0.5 disabled:opacity-50"
                        >
                          {copiedId === `list_${share.id}` ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                          {copiedId === `list_${share.id}` ? "Copied" : "Copy"}
                        </button>
                      </div>
                      <div className="w-full bg-white dark:bg-[#161b22] border border-gray-200 dark:border-slate-800/80 rounded-xl p-3 text-xs text-gray-700 dark:text-slate-300 font-mono h-24 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                        {share.bookListText || "Không có danh sách sách"}
                      </div>
                    </div>

                    {/* Genres Backup */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-500 dark:text-slate-450 uppercase tracking-wider flex items-center gap-1">
                          <Layers className="w-3 h-3" /> Thể loại (Genres)
                        </span>
                        <button
                          onClick={() => handleCopy(share.genresText, `genres_${share.id}`)}
                          disabled={!share.genresText}
                          className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-0.5 disabled:opacity-50"
                        >
                          {copiedId === `genres_${share.id}` ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                          {copiedId === `genres_${share.id}` ? "Copied" : "Copy"}
                        </button>
                      </div>
                      <div className="w-full bg-white dark:bg-[#161b22] border border-gray-200 dark:border-slate-800/80 rounded-xl p-3 text-xs text-gray-700 dark:text-slate-300 font-mono h-24 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                        {share.genresText || "Không có thông tin thể loại"}
                      </div>
                    </div>
                  </div>

                  {/* Introductions List Backup */}
                  <div className="space-y-2 pt-2">
                    <span className="text-[10px] font-bold text-gray-500 dark:text-slate-450 uppercase tracking-wider block">
                      Danh sách Introduction trích xuất của từng sách
                    </span>
                    
                    {bookIntros.length === 0 ? (
                      <div className="text-center py-4 bg-white dark:bg-[#161b22] border border-gray-200 dark:border-slate-800/80 rounded-xl text-xs text-gray-400 italic">
                        Không có dữ liệu introduction nào được lưu trữ
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                        {bookIntros.map(([bookTitle, introText]) => {
                          const cleanBookTitle = bookTitle || "Sách mặc định (Không tên)";
                          const copyKey = `intro_${share.id}_${bookTitle}`;
                          
                          return (
                            <div 
                              key={bookTitle}
                              className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-slate-800/80 rounded-xl p-3 space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-800 dark:text-slate-200">
                                  📖 {cleanBookTitle}
                                </span>
                                <button
                                  onClick={() => handleCopy(introText as string, copyKey, true)}
                                  className="text-[10px] font-bold bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300 px-2 py-1 rounded transition-colors flex items-center gap-1"
                                >
                                  {copiedId === copyKey ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                                  {copiedId === copyKey ? "Copied" : "Copy Intro"}
                                </button>
                              </div>
                              <div 
                                className="w-full max-h-24 overflow-y-auto p-2 bg-gray-50 dark:bg-[#0d1117]/30 border border-gray-100 dark:border-slate-800/50 rounded-lg text-[11px] text-gray-655 dark:text-slate-400 prose prose-sm dark:prose-invert max-w-none"
                                dangerouslySetInnerHTML={{ __html: (introText as string) || "Chưa có nội dung introduction" }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-150 dark:border-slate-800 bg-gray-50/50 dark:bg-[#0d1117]/50 flex items-center justify-between">
          <span className="text-[11px] text-indigo-650 dark:text-indigo-400 font-medium">
            💡 Mẹo: Dữ liệu được lấy trực tiếp từ lịch sử gửi (sent_shares) của bạn.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white font-semibold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
