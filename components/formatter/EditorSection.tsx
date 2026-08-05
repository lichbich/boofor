import React from "react";
import { EditorContent, Editor } from "@tiptap/react";
import { FileText, Wand2, Loader2, List, Save, Book } from "lucide-react";

interface EditorSectionProps {
  editor: Editor | null;
  isFormatting: boolean;
  isExporting: boolean;
  isExportingPDF: boolean;
  isExportingEPUB: boolean;
  formatContent: () => void;
  triggerExportWord: () => void;
  triggerExportPDF: () => void;
  triggerExportEPUB: () => void;
  detectedChapters: string[];
  setButtonPos: (pos: { x: number; y: number }) => void;
  setIsChapterListOpen: (open: boolean) => void;
  setIsChapterListVisible: (visible: boolean) => void;
}

export const EditorSection: React.FC<EditorSectionProps> = ({
  editor,
  isFormatting,
  isExporting,
  isExportingPDF,
  isExportingEPUB,
  formatContent,
  triggerExportWord,
  triggerExportPDF,
  triggerExportEPUB,
  detectedChapters,
  setButtonPos,
  setIsChapterListOpen,
  setIsChapterListVisible,
}) => {
  return (
    <div className="lg:col-span-2 space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Book Formatter Pro
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Dán văn bản AI, tự động format thành sách và xuất Word.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex gap-1">
            <button
              onClick={formatContent}
              disabled={isFormatting}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-sm disabled:opacity-70 cursor-pointer"
            >
              {isFormatting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
              Dọn dẹp & Format
            </button>
            {detectedChapters.length > 0 && (
              <button
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setButtonPos({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
                  setIsChapterListOpen(true);
                  setTimeout(() => setIsChapterListVisible(true), 10);
                }}
                className="flex items-center justify-center px-3 py-2.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg transition-colors shadow-sm cursor-pointer"
                title="Kiểm tra các mục đã nhận diện"
              >
                <List className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={triggerExportWord}
            disabled={isExporting}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm disabled:opacity-70 cursor-pointer"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Xuất File Word
          </button>
          <button
            onClick={triggerExportPDF}
            disabled={isExportingPDF}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors shadow-sm disabled:opacity-70 cursor-pointer"
          >
            {isExportingPDF ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            Xuất File PDF
          </button>
          <button
            onClick={triggerExportEPUB}
            disabled={isExportingEPUB}
            className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg transition-colors shadow-sm disabled:opacity-70 cursor-pointer"
          >
            {isExportingEPUB ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Book className="w-4 h-4" />
            )}
            Xuất File EPUB
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 md:p-4">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};
