import React from "react";
import { Check, Copy } from "lucide-react";

interface IntroExtractorSectionProps {
  introductionText: string;
  copiedId: string | null;
  handleCopy: (text: string, id: string, isHtml?: boolean) => void;
}

export const IntroExtractorSection: React.FC<IntroExtractorSectionProps> = ({
  introductionText,
  copiedId,
  handleCopy,
}) => {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-md font-semibold text-gray-800">Trích xuất Introduction</h2>
        <button
          onClick={() => handleCopy(introductionText, "intro", true)}
          disabled={!introductionText}
          className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-md transition-colors disabled:opacity-50"
        >
          {copiedId === "intro" ? (
            <Check className="w-3 h-3 text-green-600" />
          ) : (
            <Copy className="w-3 h-3" />
          )}{" "}
          {copiedId === "intro" ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-2">
        Sau khi ấn "Dọn dẹp & Format", phần giới thiệu sẽ tự động xuất hiện ở đây.
      </p>
      {introductionText ? (
        <div
          className="w-full h-40 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 overflow-y-auto prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: introductionText }}
        />
      ) : (
        <div className="w-full h-40 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 overflow-y-auto whitespace-pre-wrap flex items-center justify-center text-gray-400">
          Chưa có nội dung...
        </div>
      )}
    </div>
  );
};
