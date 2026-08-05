import React from "react";
import { Check, Copy } from "lucide-react";

interface GenresSectionProps {
  genresText: string;
  setGenresText: (val: string) => void;
  copiedId: string | null;
  handleCopy: (text: string, id: string, isHtml?: boolean) => void;
}

export const GenresSection: React.FC<GenresSectionProps> = ({
  genresText,
  setGenresText,
  copiedId,
  handleCopy,
}) => {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-3">
      <h2 className="text-md font-semibold text-gray-800">Genres</h2>
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500">
          Nhập danh sách Genres (mỗi dòng 1 cái)
        </label>
        <textarea
          rows={3}
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
          value={genresText}
          onChange={(e) => setGenresText(e.target.value)}
        />
      </div>
      <div className="space-y-2 mt-2">
        {genresText
          .split("\n")
          .map((g) => g.trim())
          .filter((g) => g)
          .map((genre, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-200 rounded-lg"
            >
              <span className="text-sm text-gray-700 truncate pr-2" title={genre}>
                {genre}
              </span>
              <button
                onClick={() => handleCopy(genre, `genre${idx}`)}
                className="flex-shrink-0 flex items-center gap-1 px-2 py-1.5 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-medium rounded-md transition-colors shadow-sm"
              >
                {copiedId === `genre${idx}` ? (
                  <Check className="w-3 h-3 text-green-600" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          ))}
      </div>
    </div>
  );
};
