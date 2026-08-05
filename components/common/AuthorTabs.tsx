import React, { useState, useEffect, useRef } from "react";
import { Plus, X, User, Share2, ListPlus } from "lucide-react";
import { AuthorTab } from "@/hooks/useBookState";

interface AuthorTabsProps {
  tabs: AuthorTab[];
  activeTabId: string;
  activeAuthor: string;
  onSelectTab: (id: string) => void;
  onAddTab: () => void;
  onDeleteTab: (id: string, e: React.MouseEvent) => void;
  onRenameTab: (id: string, newName: string) => void;
  onShareTab: (tab: AuthorTab) => void;
  onShareAll?: () => void;
  sentShares?: any[];
  onBulkAdd?: () => void;
}

export const AuthorTabs: React.FC<AuthorTabsProps> = ({
  tabs,
  activeTabId,
  activeAuthor,
  onSelectTab,
  onAddTab,
  onDeleteTab,
  onRenameTab,
  onShareTab,
  onShareAll,
  sentShares,
  onBulkAdd,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const activeTabRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [activeTabId]);

  const handleStartRename = (id: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(id);
    setEditValue(currentName);
  };

  const handleFinishRename = (id: string) => {
    if (editValue.trim()) {
      onRenameTab(id, editValue.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="flex items-center gap-1 border-b border-gray-200 pb-px mb-6 overflow-x-auto scrollbar-none">
      {/* Tabs list */}
      <div className="flex items-center gap-1">
        {tabs.map((tab) => {
          const isTabActive = tab.id === activeTabId;
          const displayName = isTabActive
            ? activeAuthor || "Tác giả mới"
            : tab.author || "Tác giả mới";

          const isDefaultAuthor = !displayName || displayName === "Tác giả mới";
          const tabShares = isDefaultAuthor || !sentShares ? [] : sentShares.filter(
            (s: any) => s.authorName && s.authorName.toLowerCase() === displayName.toLowerCase()
          );

          return (
            <div
              key={tab.id}
              ref={isTabActive ? activeTabRef : null}
              onClick={() => onSelectTab(tab.id)}
              onDoubleClick={(e) => handleStartRename(tab.id, displayName, e)}
              className={`group relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-xl transition-all duration-200 cursor-pointer select-none border-t border-x ${
                isTabActive
                  ? "author-tab-active bg-white border-gray-200 text-indigo-600 dark:text-amber-500 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] translate-y-[1px] z-10 font-semibold"
                  : "bg-gray-150/70 border-transparent text-gray-500 hover:bg-gray-200/80 hover:text-gray-700 hover:translate-y-[-1px]"
              }`}
              style={{ minWidth: "140px", maxWidth: "220px" }}
            >
              {/* Tab Icon */}
              <User className={`w-3.5 h-3.5 flex-shrink-0 ${isTabActive ? "text-indigo-600 dark:text-amber-500" : "text-gray-400 group-hover:text-gray-500"}`} />

              {/* Editable Name Input or Text */}
              {editingId === tab.id ? (
                <input
                  type="text"
                  className="bg-transparent border-none focus:outline-none focus:ring-0 p-0 m-0 text-sm font-medium text-gray-900 border-b border-indigo-500 w-full focus:border-b-2"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleFinishRename(tab.id);
                    } else if (e.key === "Escape") {
                      setEditingId(null);
                    }
                  }}
                  onBlur={() => handleFinishRename(tab.id)}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <div className={`flex items-center flex-grow min-w-0 ${isTabActive ? (tabs.length > 1 ? "pr-10" : "pr-6") : "pr-4"}`}>
                  <span className="truncate flex-grow text-left" title={displayName}>
                    {displayName}
                  </span>
                  {tabShares.length > 0 && (
                    <span 
                      className="flex items-center gap-0.5 px-1 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded text-[9px] font-extrabold shrink-0 ml-1"
                      title={
                        "Đã chia sẻ cho:\n" + tabShares.map((s: any) => {
                          const statusText = s.status === "accepted" ? "đã nhận" : s.status === "declined" ? "từ chối" : "chờ nhận";
                          return `- ${s.recipient} (${statusText})`;
                        }).join("\n")
                      }
                    >
                      <Share2 className="w-2.5 h-2.5" />
                      <span>{tabShares.length}</span>
                    </span>
                  )}
                </div>
              )}

              {/* Share Button */}
              {isTabActive && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onShareTab(tab);
                  }}
                  className={`absolute ${tabs.length > 1 ? "right-6" : "right-2"} p-0.5 rounded-full hover:bg-gray-250 hover:text-indigo-600 transition-colors opacity-60 hover:opacity-100 text-gray-500 dark:text-slate-400`}
                  title="Chia sẻ tác giả này"
                >
                  <Share2 className="w-3 h-3" />
                </button>
              )}

              {/* Delete Button */}
              {tabs.length > 1 && (
                <button
                  onClick={(e) => onDeleteTab(tab.id, e)}
                  className={`absolute right-2 p-0.5 rounded-full hover:bg-gray-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 ${
                    isTabActive ? "opacity-60 text-gray-400" : "text-gray-400"
                  }`}
                  title="Đóng tab"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Tab Button */}
      <button
        onClick={onAddTab}
        className="flex items-center justify-center p-2 rounded-lg text-gray-400 hover:bg-gray-200 hover:text-indigo-600 hover:scale-105 transition-all duration-200 ml-1.5 cursor-pointer"
        title="Thêm tác giả mới"
      >
        <Plus className="w-4 h-4" />
      </button>

      {/* Bulk Add Button */}
      {onBulkAdd && (
        <button
          onClick={onBulkAdd}
          className="flex items-center justify-center p-2 rounded-lg text-gray-400 hover:bg-gray-200 hover:text-indigo-600 hover:scale-105 transition-all duration-200 ml-1 cursor-pointer"
          title="Nhập tác giả & sách hàng loạt"
        >
          <ListPlus className="w-4 h-4" />
        </button>
      )}

      {/* Share All Button */}
      {onShareAll && (
        <button
          onClick={onShareAll}
          className="flex items-center justify-center p-2 rounded-lg text-gray-400 hover:bg-gray-200 hover:text-indigo-600 hover:scale-105 transition-all duration-200 ml-1 cursor-pointer"
          title="Chia sẻ tất cả tác giả"
        >
          <Share2 className="w-4 h-4 text-indigo-500" />
        </button>
      )}
    </div>
  );
};
