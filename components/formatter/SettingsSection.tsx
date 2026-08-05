import React from "react";
import { ChevronDown } from "lucide-react";

interface SettingsSectionProps {
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  chapterKeywords: string;
  setChapterKeywords: (val: string) => void;
  customBlockPhrases: string;
  setCustomBlockPhrases: (val: string) => void;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  isSettingsOpen,
  setIsSettingsOpen,
  chapterKeywords,
  setChapterKeywords,
  customBlockPhrases,
  setCustomBlockPhrases,
}) => {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
      <button
        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
        className="flex items-center justify-between w-full"
      >
        <h2 className="text-md font-semibold text-gray-800">Cài đặt Format</h2>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 transition-transform ${isSettingsOpen ? "rotate-180" : ""}`}
        />
      </button>
      {!isSettingsOpen && (
        <p className="text-xs text-gray-400 mt-1">Từ khoá chia mục · Câu cần chặn</p>
      )}
      {isSettingsOpen && (
        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">
              Từ khoá chia mục (cách nhau dấu phẩy)
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
              value={chapterKeywords}
              onChange={(e) => setChapterKeywords(e.target.value)}
              placeholder="VD: chapter, lesson, unit"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">
              Câu/Từ khóa cần chặn (mỗi dòng 1 cụm)
            </label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
              value={customBlockPhrases}
              onChange={(e) => setCustomBlockPhrases(e.target.value)}
              placeholder="VD: here is your translation&#10;enjoy reading"
            />
          </div>
        </div>
      )}
    </div>
  );
};
