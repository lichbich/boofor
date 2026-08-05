import React, { useState, useEffect } from "react";
import { X, Search, Send, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { AuthorTab } from "@/hooks/useBookState";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  authorTab: AuthorTab | null;
  allTabs?: AuthorTab[];
  isShareAll?: boolean;
  currentUsername: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  authorTab,
  allTabs = [],
  isShareAll = false,
  currentUsername,
}) => {
  const [users, setUsers] = useState<string[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch users on open
  useEffect(() => {
    if (isOpen) {
      setLoadingUsers(true);
      setError(null);
      setSelectedUser("");
      setSuccess(false);
      
      const fetchUsers = async () => {
        try {
          const token = typeof window !== "undefined" ? localStorage.getItem("boofor_session_id") : null;
          const headers: Record<string, string> = {};
          if (token) {
            headers["Authorization"] = `Bearer ${token}`;
          }

          const res = await fetch("/api/users", { headers });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || "Không thể tải danh sách tài khoản");
          }
          // Filter out current user
          const filtered = (data.users || []).filter((u: string) => u !== currentUsername);
          setUsers(filtered);
        } catch (err: any) {
          console.error(err);
          setError(err.message || "Có lỗi xảy ra khi tải danh sách người dùng");
        } finally {
          setLoadingUsers(false);
        }
      };

      fetchUsers();
    }
  }, [isOpen, currentUsername]);

  if (!isOpen || (!authorTab && !isShareAll)) return null;

  const filteredUsers = users.filter((u) =>
    u.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleShare = async () => {
    if (!selectedUser) return;
    setSharing(true);
    setError(null);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("boofor_session_id") : null;
      
      const payload: any = {
        recipientUsername: selectedUser,
      };

      if (isShareAll) {
        const authorsToShare = allTabs.filter(
          (tab) => tab.author && tab.author.trim() !== "" && tab.author.trim() !== "Tác giả mới"
        );
        if (authorsToShare.length === 0) {
          throw new Error("Không tìm thấy tác giả nào hợp lệ (có tên và không phải 'Tác giả mới') để chia sẻ.");
        }
        payload.authors = authorsToShare.map((tab) => ({
          authorName: tab.author,
          bookListText: tab.bookListText || "",
          bookIntroMap: tab.bookIntroMap || {},
          genresText: tab.genresText || "",
          chapterKeywords: tab.chapterKeywords || "chapter, lesson",
          customBlockPhrases: tab.customBlockPhrases || "",
        }));
      } else {
        if (!authorTab) {
          throw new Error("Không có thông tin tác giả để chia sẻ.");
        }
        payload.authorName = authorTab.author || "Tác giả mới";
        payload.bookListText = authorTab.bookListText || "";
        payload.bookIntroMap = authorTab.bookIntroMap || {};
        payload.genresText = authorTab.genresText || "";
        payload.chapterKeywords = authorTab.chapterKeywords || "";
        payload.customBlockPhrases = authorTab.customBlockPhrases || "";
      }

      const res = await fetch("/api/shares", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể chia sẻ tác giả");
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Có lỗi xảy ra khi thực hiện chia sẻ");
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#161b22] rounded-2xl max-w-md w-full flex flex-col shadow-2xl border border-gray-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-[#0d1117]/50">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Send className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">
                {isShareAll ? "Chia sẻ tất cả tác giả" : "Chia sẻ tác giả"}
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-slate-400">
                {isShareAll
                  ? `Gửi tất cả các tác giả của bạn cho tài khoản khác`
                  : `Gửi tác giả ${authorTab?.author || "Tác giả mới"} cho tài khoản khác`
                }
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
        <div className="p-5 flex-1 space-y-4 max-h-[60vh] overflow-y-auto">
          {success ? (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 animate-bounce" />
              <h4 className="text-sm font-bold text-gray-900 dark:text-slate-100">
                Chia sẻ thành công!
              </h4>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                {isShareAll
                  ? `Tất cả tác giả đã được chia sẻ tới tài khoản `
                  : `Tác giả đã được chia sẻ tới tài khoản `
                }
                <strong>{selectedUser}</strong>
              </p>
            </div>
          ) : (
            <>
              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Tìm kiếm người dùng
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Nhập tên đăng nhập..."
                    className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-[#0d1117] border border-gray-250 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-slate-100"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Chọn người nhận từ danh sách ({filteredUsers.length})
                </label>

                {loadingUsers ? (
                  <div className="flex items-center justify-center py-8 gap-2">
                    <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                    <span className="text-xs text-gray-400">Đang tải danh sách...</span>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-400 italic bg-gray-50 dark:bg-[#0d1117] rounded-xl border border-dashed border-gray-200 dark:border-slate-800">
                    Không tìm thấy người dùng phù hợp
                  </div>
                ) : (
                  <div className="border border-gray-150 dark:border-slate-800 rounded-xl divide-y divide-gray-150 dark:divide-slate-800 max-h-40 overflow-y-auto">
                    {filteredUsers.map((username) => {
                      const isSelected = selectedUser === username;
                      return (
                        <button
                          key={username}
                          type="button"
                          onClick={() => setSelectedUser(username)}
                          className={`w-full px-4 py-2.5 text-xs text-left transition-colors flex items-center justify-between ${
                            isSelected
                              ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold"
                              : "text-gray-700 dark:text-slate-200 hover:bg-gray-50/50 dark:hover:bg-[#0d1117]/30"
                          }`}
                        >
                          <span>{username}</span>
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="px-5 py-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-[#0d1117]/50 flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              disabled={sharing}
              className="px-4 py-2 border border-gray-250 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition-all disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              onClick={handleShare}
              disabled={sharing || !selectedUser}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sharing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Đang chia sẻ...
                </>
              ) : (
                <>
                  <Send className="w-3 h-3" />
                  Gửi chia sẻ
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
