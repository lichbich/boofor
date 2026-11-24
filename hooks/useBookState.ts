import React, { useState, useEffect, useMemo, useRef } from "react";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import { Markdown } from "tiptap-markdown";
import { copyToClipboard } from "@/utils/clipboard";
import { cleanAndFormatHtml, getProcessedHtml } from "@/utils/formatter";
import {
  ExtractedEpubIntroResult,
  matchEpubToParsedBook,
  getBookIntroFromMap,
  getBookGenresFromMap,
  parseCleanBookTitles,
  hasNonEmptyHtmlText,
} from "@/utils/epubIntroExtractor";
import { exportToWord, exportToPDF, exportToEPUB } from "@/services/exportService";
import { dbGet, dbSet } from "@/utils/db";
import { saveAs } from "file-saver";
import { toast } from "@/utils/toast";

export interface BookCategoryData {
  cat1: string;
  cat2: string;
  cat3: string;
}

export interface AuthorTab {
  id: string;
  title1: string;
  title2: string;
  author: string;
  bookListText: string;
  introductionText: string;
  chapterKeywords: string;
  genresText: string;
  customBlockPhrases: string;
  splitterInput: string;
  reconcilerRawText?: string;
  reconcilerWarehouseText?: string;
  isSettingsOpen: boolean;
  isBookListOpen: boolean;
  isPromptOpen: boolean;
  detectedChapters: string[];
  editorContent: string;
  authorEditorContent: string;
  bookIntroMap: Record<string, string>;
  bookContentMap: Record<string, string>;
  bookGenresMap?: Record<string, BookCategoryData>;
  activeSubTab: "formatter" | "prompt" | "splitter" | "reconciler";
  assignedCards?: string[];
  completedCards?: string[];
}

export interface BatchJob {
  id: number;
  bookTitle: string;
  status: "idle" | "pending" | "generating" | "completed" | "failed";
  progressText: string;
  resultText?: string;
  error?: string;
}

export const useBookState = () => {
  const [isMounted, setIsMounted] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingEPUB, setIsExportingEPUB] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);

  // Tab State
  const [tabs, setTabs] = useState<AuthorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>("");

  // Flat Active State variables (sourced from active tab)
  const [title1, setTitle1] = useState("");
  const [title2, setTitle2] = useState("");
  const [author, setAuthor] = useState("");
  const [bookListText, setBookListText] = useState("");
  const [introductionText, setIntroductionText] = useState("");
  const [chapterKeywords, setChapterKeywords] = useState("chapter, lesson");
  const [genresText, setGenresText] = useState(
    "Language Study / English as a Second Language\nLanguage Study / Multi-Language Phrasebooks"
  );
  const [customBlockPhrases, setCustomBlockPhrases] = useState("");
  const [promptTemplate, setPromptTemplate] = useState("");
  const [promptPlaceholderBook, setPromptPlaceholderBook] = useState("");
  const [activeTab, setActiveTab] = useState<"formatter" | "prompt" | "splitter" | "reconciler">("formatter");
  const [splitterInput, setSplitterInput] = useState("");
  const [reconcilerRawText, setReconcilerRawText] = useState("");
  const [reconcilerWarehouseText, setReconcilerWarehouseText] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);
  const [isBookListOpen, setIsBookListOpen] = useState(true);
  const [isPromptOpen, setIsPromptOpen] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [detectedChapters, setDetectedChapters] = useState<string[]>([]);
  const [isChapterListOpen, setIsChapterListOpen] = useState(false);
  const [isChapterListVisible, setIsChapterListVisible] = useState(false);
  const [buttonPos, setButtonPos] = useState({ x: 0, y: 0 });

  const [bookIntroMap, setBookIntroMap] = useState<Record<string, string>>({});
  const [authorInfoMap, setAuthorInfoMap] = useState<Record<string, string>>({});
  const [bookContentMap, setBookContentMap] = useState<Record<string, string>>({});
  const [bookGenresMap, setBookGenresMap] = useState<Record<string, BookCategoryData>>({});

  const [bookCovers, setBookCovers] = useState<Record<string, string>>({});
  const [globalBookIntros, setGlobalBookIntros] = useState<Record<string, string>>({});
  const [coverPromptTemplate, setCoverPromptTemplate] = useState("");
  const [coverPromptPlaceholderBook, setCoverPromptPlaceholderBook] = useState("");
  const [promptPlaceholderAuthor, setPromptPlaceholderAuthor] = useState("");
  const [coverPromptPlaceholderAuthor, setCoverPromptPlaceholderAuthor] = useState("");
  const [promptPlaceholderCat1, setPromptPlaceholderCat1] = useState("[INSERT CATEGORY 1 HERE]");
  const [promptPlaceholderCat2, setPromptPlaceholderCat2] = useState("[INSERT CATEGORY 2 HERE]");
  const [promptPlaceholderCat3, setPromptPlaceholderCat3] = useState("[INSERT CATEGORY 3 HERE]");
  const [isBatchExporting, setIsBatchExporting] = useState(false);
  const [batchProgress, setBatchProgress] = useState("");

  const editorRestoredRef = useRef(false);
  const authorEditorRestoredRef = useRef(false);
  const isSwitchingTabRef = useRef(false);
  const authorRef = useRef(author);
  const title1Ref = useRef(title1);
  const activeTabIdRef = useRef(activeTabId);
  const editorUpdateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    authorRef.current = author;
  }, [author]);

  useEffect(() => {
    title1Ref.current = title1;
  }, [title1]);

  useEffect(() => {
    activeTabIdRef.current = activeTabId;
  }, [activeTabId]);

  // Initialize from IndexedDB / LocalStorage and migrate old flat state if necessary
  useEffect(() => {
    const initData = async () => {
      let savedTabs = await dbGet("bofo_tabs");
      if (!savedTabs) {
        const lsTabs = localStorage.getItem("bofo_tabs");
        if (lsTabs) {
          try {
            savedTabs = JSON.parse(lsTabs);
          } catch (e) {
            console.error("Failed to parse tabs from localStorage", e);
          }
        }
      }

      let savedActiveTabId = await dbGet("bofo_activeTabId");
      if (!savedActiveTabId) {
        savedActiveTabId = localStorage.getItem("bofo_activeTabId");
      }

      const oldAuthorInfoMap = JSON.parse(localStorage.getItem("bofo_authorInfoMap") || "{}");
      setAuthorInfoMap(oldAuthorInfoMap);

      // Load covers from IndexedDB
      const savedCovers = await dbGet("bofo_bookCovers");
      if (savedCovers) {
        setBookCovers(savedCovers);
      }

      let savedGlobalIntros = await dbGet("bofo_globalBookIntros");
      if (!savedGlobalIntros) {
        const lsIntros = localStorage.getItem("bofo_globalBookIntros");
        if (lsIntros) {
          try {
            savedGlobalIntros = JSON.parse(lsIntros);
          } catch (e) {
            console.error("Failed to parse globalBookIntros from localStorage", e);
          }
        }
      }
      if (savedGlobalIntros) {
        setGlobalBookIntros(savedGlobalIntros);
      }

      const savedTemplate = localStorage.getItem("bofo_promptTemplate");
      const savedPlaceholder = localStorage.getItem("bofo_promptPlaceholderBook");
      let initialTemplate = savedTemplate !== null ? savedTemplate : "Hãy viết Chapter 1 cho cuốn sách English for Beginners với 1500 từ...";
      let initialPlaceholder = savedPlaceholder !== null ? savedPlaceholder : "English for Beginners";

      const savedCoverTemplate = localStorage.getItem("bofo_coverPromptTemplate");
      const savedCoverPlaceholder = localStorage.getItem("bofo_coverPromptPlaceholderBook");
      let initialCoverTemplate = savedCoverTemplate !== null ? savedCoverTemplate : "Hãy thiết kế một ảnh bìa nghệ thuật cho cuốn sách \"English for Beginners\". Phong cách hiện đại, tối giản, màu sắc trang nhã, phù hợp với nội dung giáo dục.";
      let initialCoverPlaceholder = savedCoverPlaceholder !== null ? savedCoverPlaceholder : "English for Beginners";

      const savedAuthorPlaceholder = localStorage.getItem("bofo_promptPlaceholderAuthor");
      let initialAuthorPlaceholder = savedAuthorPlaceholder !== null ? savedAuthorPlaceholder : "ANGEL MENDEZ";

      const savedCoverAuthorPlaceholder = localStorage.getItem("bofo_coverPromptPlaceholderAuthor");
      let initialCoverAuthorPlaceholder = savedCoverAuthorPlaceholder !== null ? savedCoverAuthorPlaceholder : "ANGEL MENDEZ";

      const savedCat1 = localStorage.getItem("bofo_promptPlaceholderCat1");
      const savedCat2 = localStorage.getItem("bofo_promptPlaceholderCat2");
      const savedCat3 = localStorage.getItem("bofo_promptPlaceholderCat3");
      let initialCat1 = savedCat1 !== null ? savedCat1 : "[INSERT CATEGORY 1 HERE]";
      let initialCat2 = savedCat2 !== null ? savedCat2 : "[INSERT CATEGORY 2 HERE]";
      let initialCat3 = savedCat3 !== null ? savedCat3 : "[INSERT CATEGORY 3 HERE]";

      const savedGlobalKeywords = localStorage.getItem("bofo_globalChapterKeywords");
      const savedGlobalPhrases = localStorage.getItem("bofo_globalCustomBlockPhrases");

      if (savedTabs && Array.isArray(savedTabs) && savedTabs.length > 0) {
        const parsedTabs = savedTabs as AuthorTab[];
        setTabs(parsedTabs);

        const targetId = savedActiveTabId && parsedTabs.some((t) => t.id === savedActiveTabId)
          ? savedActiveTabId
          : parsedTabs[0]?.id || "";

        if (targetId) {
          setActiveTabId(targetId);
          const activeTabObj = parsedTabs.find((t) => t.id === targetId)!;
          setTitle1(activeTabObj.title1 || "");
          setTitle2(activeTabObj.title2 || "");
          setAuthor(activeTabObj.author || "");
          setBookListText(activeTabObj.bookListText || "");
          setIntroductionText(activeTabObj.introductionText || "");
          setChapterKeywords(activeTabObj.chapterKeywords || savedGlobalKeywords || "chapter, lesson");
          setGenresText(activeTabObj.genresText || "");
          setCustomBlockPhrases(activeTabObj.customBlockPhrases || savedGlobalPhrases || "");
          
          setSplitterInput(activeTabObj.splitterInput || "");
          setReconcilerRawText(activeTabObj.reconcilerRawText || "");
          setReconcilerWarehouseText(activeTabObj.reconcilerWarehouseText || "");
          setIsSettingsOpen(activeTabObj.isSettingsOpen ?? true);
          setIsBookListOpen(activeTabObj.isBookListOpen ?? true);
          setIsPromptOpen(activeTabObj.isPromptOpen ?? true);
          setDetectedChapters(activeTabObj.detectedChapters || []);
          setBookIntroMap(activeTabObj.bookIntroMap || {});
          setBookContentMap(activeTabObj.bookContentMap || {});
          setBookGenresMap(activeTabObj.bookGenresMap || {});
          setActiveTab(activeTabObj.activeSubTab || "formatter");
        }
      } else {
        // Migrate from old flat structure
        const oldTitle1 = localStorage.getItem("bofo_title1") || "";
        const oldTitle2 = localStorage.getItem("bofo_title2") || "";
        const oldAuthor = localStorage.getItem("bofo_author") || "";
        const oldBookList = localStorage.getItem("bofo_bookList") || "";
        const oldChapterKeywords = localStorage.getItem("bofo_chapterKeywords") || "chapter, lesson";
        const oldGenres = localStorage.getItem("bofo_genres") || "Language Study / English as a Second Language\nLanguage Study / Multi-Language Phrasebooks";
        const oldCustomBlockPhrases = localStorage.getItem("bofo_customBlockPhrases") || "";
        const oldSplitterInput = localStorage.getItem("bofo_splitterInput") || "";
        const oldSettingsOpen = localStorage.getItem("bofo_isSettingsOpen") !== "false";
        const oldBookListOpen = localStorage.getItem("bofo_isBookListOpen") !== "false";
        const oldBookIntroMap = JSON.parse(localStorage.getItem("bofo_bookIntroMap") || "{}");

        const oldAuthorEditorContent = oldAuthor ? (oldAuthorInfoMap[oldAuthor] || "") : "";

        const initialId = `tab_${Date.now()}`;
        const initialTab: AuthorTab = {
          id: initialId,
          title1: oldTitle1,
          title2: oldTitle2,
          author: oldAuthor,
          bookListText: oldBookList,
          introductionText: "",
          chapterKeywords: oldChapterKeywords,
          genresText: oldGenres,
          customBlockPhrases: oldCustomBlockPhrases,
          splitterInput: oldSplitterInput,
          isSettingsOpen: oldSettingsOpen,
          isBookListOpen: oldBookListOpen,
          isPromptOpen: true,
          detectedChapters: [],
          editorContent: "",
          authorEditorContent: oldAuthorEditorContent,
          bookIntroMap: oldBookIntroMap,
          bookContentMap: {},
          bookGenresMap: {},
          activeSubTab: "formatter",
          reconcilerRawText: "",
          reconcilerWarehouseText: "",
          assignedCards: [],
          completedCards: [],
        };

        setTabs([initialTab]);
        setActiveTabId(initialId);

        setTitle1(oldTitle1);
        setTitle2(oldTitle2);
        setAuthor(oldAuthor);
        setBookListText(oldBookList);
        setChapterKeywords(oldChapterKeywords);
        setGenresText(oldGenres);
        setCustomBlockPhrases(oldCustomBlockPhrases);
        setSplitterInput(oldSplitterInput);
        setIsSettingsOpen(oldSettingsOpen);
        setIsBookListOpen(oldBookListOpen);
        setIsPromptOpen(true);
        setBookIntroMap(oldBookIntroMap);
        setBookContentMap({});
        setBookGenresMap({});
        setReconcilerRawText("");
        setReconcilerWarehouseText("");
      }

      setPromptTemplate(initialTemplate);
      setPromptPlaceholderBook(initialPlaceholder);
      setPromptPlaceholderAuthor(initialAuthorPlaceholder);
      setCoverPromptTemplate(initialCoverTemplate);
      setCoverPromptPlaceholderBook(initialCoverPlaceholder);
      setCoverPromptPlaceholderAuthor(initialCoverAuthorPlaceholder);
      setPromptPlaceholderCat1(initialCat1);
      setPromptPlaceholderCat2(initialCat2);
      setPromptPlaceholderCat3(initialCat3);
      setIsMounted(true);
    };

    initData();
  }, []);



  // Sync local bookIntroMap changes to globalBookIntros
  useEffect(() => {
    if (isMounted && Object.keys(bookIntroMap).length > 0) {
      setGlobalBookIntros((prev) => {
        let changed = false;
        const next = { ...prev };
        const authorName = (author || "").trim();
        Object.entries(bookIntroMap).forEach(([bTitle, intro]) => {
          if (intro) {
            const bookName = bTitle.trim();
            const key = `${authorName}::${bookName}`;
            if (next[key] !== intro) {
              next[key] = intro;
              changed = true;
            }
          }
        });
        if (changed) {
          dbSet("bofo_globalBookIntros", next);
          try {
            localStorage.setItem("bofo_globalBookIntros", JSON.stringify(next));
          } catch (e) {
            console.error("Failed to save globalBookIntros to localStorage", e);
          }
          return next;
        }
        return prev;
      });
    }
  }, [bookIntroMap, author, isMounted]);

  const prevTitle1Ref = useRef(title1);

  // Sync Introduction content based on current Title1
  useEffect(() => {
    if (isMounted) {
      const bookName = (title1 || "").trim();
      const prevBookName = (prevTitle1Ref.current || "").trim();
      prevTitle1Ref.current = title1;

      if (!bookName) {
        if (bookIntroMap[""] !== undefined) {
          setIntroductionText(bookIntroMap[""]);
        } else if (prevBookName !== "") {
          setIntroductionText("");
        }
        return;
      }

      const localIntro = getBookIntroFromMap(bookName, bookIntroMap);
      if (localIntro || bookIntroMap[bookName] !== undefined) {
        setIntroductionText(localIntro || bookIntroMap[bookName] || "");
      } else {
        // If not in local map, check global map!
        const authorName = (author || "").trim();
        const key = `${authorName}::${bookName}`;
        const fallbackKey = bookName ? `::${bookName}` : "";
        const globalIntro = (authorName || bookName) 
          ? (globalBookIntros[key] || (fallbackKey ? globalBookIntros[fallbackKey] : undefined)) 
          : undefined;

        if (globalIntro) {
          setIntroductionText(globalIntro);
          setBookIntroMap((prev) => ({ ...prev, [bookName]: globalIntro }));
        } else {
          setIntroductionText("");
        }
      }
    }
  }, [title1, bookIntroMap, globalBookIntros, author, isMounted]);

  // Sync FormatterTab Genres content based on current Title1 & bookGenresMap
  useEffect(() => {
    if (isMounted) {
      const bookName = (title1 || "").trim();
      if (bookName && bookGenresMap[bookName]) {
        const g = bookGenresMap[bookName];
        const list = [g.cat1, g.cat2, g.cat3].filter((c) => c && c.trim().length > 0);
        if (list.length > 0) {
          setGenresText(list.join("\n"));
        }
      }
    }
  }, [title1, bookGenresMap, isMounted]);

  // Handle document scrolling when popup list is open
  useEffect(() => {
    if (isChapterListOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
    } else {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [isChapterListOpen]);

  // Main Text Editor instance
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Underline.configure(),
      Markdown.configure(),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({
        placeholder: "Dán nội dung vào đây...",
      }),
    ],
    content: "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[60vh] max-h-[70vh] overflow-y-auto p-8 border rounded-md shadow-inner bg-white dark:bg-[#161b22] dark:border-slate-700 font-serif dark:prose-invert",
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (isSwitchingTabRef.current) return;
      if (editorUpdateTimerRef.current) {
        clearTimeout(editorUpdateTimerRef.current);
      }
      editorUpdateTimerRef.current = setTimeout(() => {
        if (isSwitchingTabRef.current) return;
        const currentBook = (title1Ref.current || "").trim();
        if (!currentBook) return;
        const html = ed.getHTML();
        setBookContentMap((prev) => {
          if (prev[currentBook] === html) return prev;
          return { ...prev, [currentBook]: html };
        });
      }, 300);
    },
  });

  // Author description Editor instance
  const authorEditor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({
        placeholder: "Dán thông tin tác giả vào đây...",
      }),
    ],
    content: "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm w-full p-3 border border-gray-200 rounded-lg focus:outline-none min-h-[100px] bg-gray-50 dark:bg-[#0d1117] text-sm text-gray-900 dark:text-slate-100 dark:prose-invert",
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (isSwitchingTabRef.current) return;
      const html = ed.getHTML();
      const currentAuthor = authorRef.current;
      if (currentAuthor) {
        setAuthorInfoMap((prev) => {
          const newMap = { ...prev, [currentAuthor]: html };
          try {
            localStorage.setItem("bofo_authorInfoMap", JSON.stringify(newMap));
          } catch (e) {
            console.error("Failed to save authorInfoMap to localStorage", e);
          }
          return newMap;
        });
      }
    },
  });

  // Load editor contents on startup when components are ready
  useEffect(() => {
    if (editor && activeTabId && tabs.length > 0 && !editorRestoredRef.current) {
      const activeTabObj = tabs.find((t) => t.id === activeTabId);
      if (activeTabObj) {
        const title = activeTabObj.title1 || "";
        const savedMap = activeTabObj.bookContentMap || {};
        const content = (title ? savedMap[title] : null) || activeTabObj.editorContent || "";
        editor.commands.setContent(content);
      }
      editorRestoredRef.current = true;
    }
  }, [editor, activeTabId, tabs]);

  useEffect(() => {
    if (authorEditor && activeTabId && tabs.length > 0 && !authorEditorRestoredRef.current) {
      const activeTabObj = tabs.find((t) => t.id === activeTabId);
      if (activeTabObj && activeTabObj.authorEditorContent) {
        isSwitchingTabRef.current = true;
        authorEditor.commands.setContent(activeTabObj.authorEditorContent);
        setTimeout(() => {
          isSwitchingTabRef.current = false;
        }, 100);
      }
      authorEditorRestoredRef.current = true;
    }
  }, [authorEditor, activeTabId, tabs]);

  // Sync author editor contents when current author changes
  useEffect(() => {
    if (authorEditor && author) {
      const savedInfo = authorInfoMap[author] || "";
      if (authorEditor.getHTML() !== savedInfo) {
        authorEditor.commands.setContent(savedInfo);
      }
    } else if (authorEditor && !author) {
      authorEditor.commands.setContent("");
    }
  }, [author, authorInfoMap, authorEditor]);

  // Debounced save to LocalStorage and in-memory tabs state
  useEffect(() => {
    if (!isMounted || !activeTabId) return;

    const timer = setTimeout(() => {
      const currentEditorContent = editor ? editor.getHTML() : "";
      const currentAuthorEditorContent = authorEditor ? authorEditor.getHTML() : "";

      // Save global template to localStorage
      try {
        localStorage.setItem("bofo_promptTemplate", promptTemplate);
        localStorage.setItem("bofo_promptPlaceholderBook", promptPlaceholderBook);
        localStorage.setItem("bofo_promptPlaceholderAuthor", promptPlaceholderAuthor);
        localStorage.setItem("bofo_coverPromptTemplate", coverPromptTemplate);
        localStorage.setItem("bofo_coverPromptPlaceholderBook", coverPromptPlaceholderBook);
        localStorage.setItem("bofo_coverPromptPlaceholderAuthor", coverPromptPlaceholderAuthor);
        localStorage.setItem("bofo_promptPlaceholderCat1", promptPlaceholderCat1);
        localStorage.setItem("bofo_promptPlaceholderCat2", promptPlaceholderCat2);
        localStorage.setItem("bofo_promptPlaceholderCat3", promptPlaceholderCat3);
        localStorage.setItem("bofo_globalChapterKeywords", chapterKeywords);
        localStorage.setItem("bofo_globalCustomBlockPhrases", customBlockPhrases);
      } catch (e) {
        console.error("Failed to save prompt config to localStorage", e);
      }

      setBookContentMap((prevMap) => {
        const nextMap = { ...prevMap };
        if (title1) {
          nextMap[title1] = currentEditorContent;
        }

        setTabs((prevTabs) => {
          const updated = prevTabs.map((t) => {
            if (t.id === activeTabId) {
              return {
                ...t,
                title1,
                title2,
                author,
                bookListText,
                introductionText,
                chapterKeywords,
                genresText,
                customBlockPhrases,
                splitterInput,
                reconcilerRawText,
                reconcilerWarehouseText,
                isSettingsOpen,
                isBookListOpen,
                isPromptOpen,
                detectedChapters,
                bookIntroMap,
                bookContentMap: nextMap,
                bookGenresMap,
                activeSubTab: activeTab,
                editorContent: currentEditorContent,
                authorEditorContent: currentAuthorEditorContent,
              };
            }
            return t;
          });

          // Save to IndexedDB
          dbSet("bofo_tabs", updated);
          dbSet("bofo_activeTabId", activeTabId);

          // Try to save to localStorage as fallback
          try {
            localStorage.setItem("bofo_tabs", JSON.stringify(updated));
            localStorage.setItem("bofo_activeTabId", activeTabId);
          } catch (e) {
            if (e instanceof DOMException && e.name === "QuotaExceededError") {
              console.warn("LocalStorage quota exceeded, using IndexedDB fallback");
            } else {
              console.error("Failed to save tabs to localStorage", e);
            }
          }

          return updated;
        });

        return nextMap;
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [
    activeTabId,
    title1,
    title2,
    author,
    bookListText,
    introductionText,
    chapterKeywords,
    genresText,
    customBlockPhrases,
    promptTemplate,
    promptPlaceholderBook,
    promptPlaceholderAuthor,
    coverPromptTemplate,
    coverPromptPlaceholderBook,
    coverPromptPlaceholderAuthor,
    promptPlaceholderCat1,
    promptPlaceholderCat2,
    promptPlaceholderCat3,
    splitterInput,
    reconcilerRawText,
    reconcilerWarehouseText,
    isSettingsOpen,
    isBookListOpen,
    isPromptOpen,
    detectedChapters,
    bookIntroMap,
    bookGenresMap,
    activeTab,
    editor,
    authorEditor,
    isMounted,
  ]);

  // Tab switcher
  const switchTab = (nextTabId: string) => {
    if (nextTabId === activeTabId) return;

    isSwitchingTabRef.current = true;

    const currentEditorContent = editor ? editor.getHTML() : "";
    const currentAuthorEditorContent = authorEditor ? authorEditor.getHTML() : "";

    setTabs((prevTabs) => {
      const updated = prevTabs.map((t) => {
        if (t.id === activeTabId) {
          return {
            ...t,
            title1,
            title2,
            author,
            bookListText,
            introductionText,
            chapterKeywords,
            genresText,
            customBlockPhrases,
            splitterInput,
            reconcilerRawText,
            reconcilerWarehouseText,
            isSettingsOpen,
            isBookListOpen,
            isPromptOpen,
            detectedChapters,
            bookIntroMap,
            bookContentMap,
            bookGenresMap,
            activeSubTab: activeTab,
            editorContent: currentEditorContent,
            authorEditorContent: currentAuthorEditorContent,
          };
        }
        return t;
      });

      const nextTab = updated.find((t) => t.id === nextTabId);
      if (nextTab) {
        setTitle1(nextTab.title1 || "");
        setTitle2(nextTab.title2 || "");
        setAuthor(nextTab.author || "");
        setBookListText(nextTab.bookListText || "");
        setIntroductionText(nextTab.introductionText || "");
        setChapterKeywords(nextTab.chapterKeywords || "chapter, lesson");
        setGenresText(nextTab.genresText || "");
        setCustomBlockPhrases(nextTab.customBlockPhrases || "");
        setSplitterInput(nextTab.splitterInput || "");
        setReconcilerRawText(nextTab.reconcilerRawText || "");
        setReconcilerWarehouseText(nextTab.reconcilerWarehouseText || "");
        setIsSettingsOpen(nextTab.isSettingsOpen ?? true);
        setIsBookListOpen(nextTab.isBookListOpen ?? true);
        setIsPromptOpen(nextTab.isPromptOpen ?? true);
        setDetectedChapters(nextTab.detectedChapters || []);
        setBookIntroMap(nextTab.bookIntroMap || {});
        setBookContentMap(nextTab.bookContentMap || {});
        setBookGenresMap(nextTab.bookGenresMap || {});
        setActiveTab(nextTab.activeSubTab || "formatter");

        if (editor) {
          const content = (nextTab.title1 ? (nextTab.bookContentMap || {})[nextTab.title1] : null) || nextTab.editorContent || "";
          editor.commands.setContent(content);
        }
        if (authorEditor) {
          authorEditor.commands.setContent(nextTab.authorEditorContent || "");
        }
      }

      return updated;
    });

    setActiveTabId(nextTabId);

    setTimeout(() => {
      isSwitchingTabRef.current = false;
    }, 100);
  };

  // Add a new tab
  const addTab = () => {
    isSwitchingTabRef.current = true;

    const currentGlobalKeywords = chapterKeywords || (typeof window !== "undefined" ? localStorage.getItem("bofo_globalChapterKeywords") : null) || "chapter, lesson";
    const currentGlobalPhrases = customBlockPhrases || (typeof window !== "undefined" ? localStorage.getItem("bofo_globalCustomBlockPhrases") : null) || "";

    const newId = `tab_${Date.now()}`;
    const newTab: AuthorTab = {
      id: newId,
      title1: "",
      title2: "",
      author: "",
      bookListText: "",
      introductionText: "",
      chapterKeywords: currentGlobalKeywords,
      genresText: "Language Study / English as a Second Language\nLanguage Study / Multi-Language Phrasebooks",
      customBlockPhrases: currentGlobalPhrases,
      splitterInput: "",
      reconcilerRawText: "",
      reconcilerWarehouseText: "",
      isSettingsOpen: true,
      isBookListOpen: true,
      isPromptOpen: true,
      detectedChapters: [],
      editorContent: "",
      authorEditorContent: "",
      bookIntroMap: {},
      bookContentMap: {},
      bookGenresMap: {},
      activeSubTab: "formatter",
      assignedCards: [],
      completedCards: [],
    };

    const currentEditorContent = editor ? editor.getHTML() : "";
    const currentAuthorEditorContent = authorEditor ? authorEditor.getHTML() : "";

    setTabs((prevTabs) => {
      const updated = prevTabs.map((t) => {
        if (t.id === activeTabId) {
          return {
            ...t,
            title1,
            title2,
            author,
            bookListText,
            introductionText,
            chapterKeywords,
            genresText,
            customBlockPhrases,
            splitterInput,
            reconcilerRawText,
            reconcilerWarehouseText,
            isSettingsOpen,
            isBookListOpen,
            detectedChapters,
            bookIntroMap,
            bookContentMap,
            bookGenresMap,
            activeSubTab: activeTab,
            editorContent: currentEditorContent,
            authorEditorContent: currentAuthorEditorContent,
          };
        }
        return t;
      });
      return [...updated, newTab];
    });

    setTitle1("");
    setTitle2("");
    setAuthor("");
    setBookListText("");
    setIntroductionText("");
    setChapterKeywords(currentGlobalKeywords);
    setGenresText("Language Study / English as a Second Language\nLanguage Study / Multi-Language Phrasebooks");
    setCustomBlockPhrases(currentGlobalPhrases);
    setSplitterInput("");
    setReconcilerRawText("");
    setReconcilerWarehouseText("");
    setIsSettingsOpen(true);
    setIsBookListOpen(true);
    setIsPromptOpen(true);
    setDetectedChapters([]);
    setBookIntroMap({});
    setBookContentMap({});
    setBookGenresMap({});
    setActiveTab("formatter");

    if (editor) {
      editor.commands.setContent("");
    }
    if (authorEditor) {
      authorEditor.commands.setContent("");
    }

    setActiveTabId(newId);

    setTimeout(() => {
      isSwitchingTabRef.current = false;
    }, 100);
  };

  // Delete a tab
  const deleteTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length <= 1) return;

    isSwitchingTabRef.current = true;

    const tabIndex = tabs.findIndex((t) => t.id === tabId);
    const nextTabs = tabs.filter((t) => t.id !== tabId);

    setTabs(nextTabs);

    if (activeTabId === tabId) {
      const nextActiveIndex = tabIndex === 0 ? 0 : tabIndex - 1;
      const nextActiveTab = nextTabs[nextActiveIndex];
      if (nextActiveTab) {
        setTitle1(nextActiveTab.title1 || "");
        setTitle2(nextActiveTab.title2 || "");
        setAuthor(nextActiveTab.author || "");
        setBookListText(nextActiveTab.bookListText || "");
        setIntroductionText(nextActiveTab.introductionText || "");
        setChapterKeywords(nextActiveTab.chapterKeywords || "chapter, lesson");
        setGenresText(nextActiveTab.genresText || "");
        setCustomBlockPhrases(nextActiveTab.customBlockPhrases || "");
        setSplitterInput(nextActiveTab.splitterInput || "");
        setReconcilerRawText(nextActiveTab.reconcilerRawText || "");
        setReconcilerWarehouseText(nextActiveTab.reconcilerWarehouseText || "");
        setIsSettingsOpen(nextActiveTab.isSettingsOpen ?? true);
        setIsBookListOpen(nextActiveTab.isBookListOpen ?? true);
        setIsPromptOpen(nextActiveTab.isPromptOpen ?? true);
        setDetectedChapters(nextActiveTab.detectedChapters || []);
        setBookIntroMap(nextActiveTab.bookIntroMap || {});
        setBookContentMap(nextActiveTab.bookContentMap || {});
        setBookGenresMap(nextActiveTab.bookGenresMap || {});
        setActiveTab(nextActiveTab.activeSubTab || "formatter");

        if (editor) {
          const content = (nextActiveTab.title1 ? (nextActiveTab.bookContentMap || {})[nextActiveTab.title1] : null) || nextActiveTab.editorContent || "";
          editor.commands.setContent(content);
        }
        if (authorEditor) {
          authorEditor.commands.setContent(nextActiveTab.authorEditorContent || "");
        }

        setActiveTabId(nextActiveTab.id);
      }
    }

    setTimeout(() => {
      isSwitchingTabRef.current = false;
    }, 100);
  };

  // Rename tab
  const renameTab = (tabId: string, newName: string) => {
    if (tabId === activeTabId) {
      setAuthor(newName);
    } else {
      setTabs((prev) =>
        prev.map((t) => (t.id === tabId ? { ...t, author: newName } : t))
      );
    }
  };

  // Memoized lists of parsed books
  const parsedBooks = useMemo(() => {
    if (!bookListText) return [];
    return bookListText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const cleanTitle = line.replace(/^\d+\.\s*/, "");
        const genres = bookGenresMap[cleanTitle] || { cat1: "", cat2: "", cat3: "" };
        return {
          title1: cleanTitle,
          title2: "",
          full: line,
          cat1: genres.cat1 || "",
          cat2: genres.cat2 || "",
          cat3: genres.cat3 || "",
        };
      });
  }, [bookListText, bookGenresMap]);

  const updateBookGenres = (bookTitle: string, cat1: string, cat2: string, cat3: string) => {
    setBookGenresMap((prev) => {
      const updated = {
        ...prev,
        [bookTitle]: { cat1, cat2, cat3 },
      };
      setTabs((prevTabs) =>
        prevTabs.map((t) => (t.id === activeTabId ? { ...t, bookGenresMap: updated } : t))
      );
      return updated;
    });
  };

  const bulkUpdateBookGenres = (items: Array<{ title: string; cat1: string; cat2: string; cat3: string }>) => {
    setBookGenresMap((prev) => {
      const updated = { ...prev };
      items.forEach((item) => {
        if (item.title) {
          updated[item.title] = {
            cat1: item.cat1 || "",
            cat2: item.cat2 || "",
            cat3: item.cat3 || "",
          };
        }
      });
      setTabs((prevTabs) =>
        prevTabs.map((t) => (t.id === activeTabId ? { ...t, bookGenresMap: updated } : t))
      );
      return updated;
    });
  };



  const selectBook = (newTitle1: string, newTitle2: string) => {
    if (!editor) return;

    // 1. Save current content of the old book before switching
    const currentHtml = editor.getHTML();
    let nextMap = { ...bookContentMap };
    if (title1) {
      nextMap[title1] = currentHtml;
      setBookContentMap(nextMap);
      setTabs((prevTabs) =>
        prevTabs.map((t) =>
          t.id === activeTabId ? { ...t, bookContentMap: nextMap } : t
        )
      );
    }

    // 2. Update titles
    setTitle1(newTitle1);
    setTitle2(newTitle2);

    // 3. Load content of the new book
    const newHtml = nextMap[newTitle1] || "";
    editor.commands.setContent(newHtml);
  };

  // Handle select dropdown choices
  const handleSelectBook = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const idx = parseInt(e.target.value, 10);
    if (!isNaN(idx) && parsedBooks[idx]) {
      selectBook(parsedBooks[idx].title1, parsedBooks[idx].title2);
    }
  };

  const handleSelectBookByIndex = (idx: number) => {
    if (parsedBooks[idx]) {
      selectBook(parsedBooks[idx].title1, parsedBooks[idx].title2);
    }
  };

  // Helper copy content action
  const handleCopy = async (text: string, id: string, isHtml = false) => {
    return await copyToClipboard(
      text,
      () => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      },
      isHtml
    );
  };

  // Formatting execution wrapper
  const formatContent = () => {
    if (!editor) return;
    setIsFormatting(true);

    setTimeout(() => {
      const html = editor.getHTML();
      const result = cleanAndFormatHtml(html, chapterKeywords, customBlockPhrases);

      let activeBookKey = (title1 || "").trim();
      if (!activeBookKey && parsedBooks.length === 1) {
        activeBookKey = parsedBooks[0].title1.trim();
        setTitle1(activeBookKey);
      } else if (!activeBookKey && parsedBooks.length > 1) {
        toast.warning(
          "Lưu ý: Bạn chưa chọn sách trong Quản lý Danh sách Sách! Hãy chọn cuốn sách đang làm rồi bấm Dọn dẹp & Format để lưu vào sách đó."
        );
      }

      setIntroductionText(result.introductionText);
      setDetectedChapters(result.detectedChapters);
      editor.commands.setContent(result.cleanedHtml);

      if (activeBookKey) {
        const nextContentMap = {
          ...bookContentMap,
          [activeBookKey]: result.cleanedHtml,
        };
        const nextIntroMap = {
          ...bookIntroMap,
          [activeBookKey]: result.introductionText,
        };

        setBookContentMap(nextContentMap);
        setBookIntroMap(nextIntroMap);

        const currentAuthorEditorHtml = authorEditor ? authorEditor.getHTML() : "";
        setTabs((prevTabs) => {
          const updatedTabs = prevTabs.map((t) =>
            t.id === activeTabId
              ? {
                  ...t,
                  title1: activeBookKey,
                  introductionText: result.introductionText,
                  detectedChapters: result.detectedChapters,
                  editorContent: result.cleanedHtml,
                  authorEditorContent: currentAuthorEditorHtml,
                  bookContentMap: nextContentMap,
                  bookIntroMap: nextIntroMap,
                }
              : t
          );
          dbSet("bofo_tabs", updatedTabs);
          return updatedTabs;
        });

        if (result.introductionText) {
          const authorName = (author || "").trim();
          setGlobalBookIntros((prev) => {
            const next = {
              ...prev,
              [`${authorName}::${activeBookKey}`]: result.introductionText,
              [`::${activeBookKey}`]: result.introductionText,
            };
            dbSet("bofo_globalBookIntros", next);
            try {
              localStorage.setItem("bofo_globalBookIntros", JSON.stringify(next));
            } catch (e) {
              console.error("Failed to save globalBookIntros to localStorage", e);
            }
            return next;
          });
        }
      }

      if (!hasNonEmptyHtmlText(result.introductionText)) {
        toast.warning(
          "Đã dọn dẹp & format nhưng chưa tìm thấy phần Introduction để trích xuất. Vui lòng kiểm tra tiêu đề Introduction!"
        );
      }

      setIsFormatting(false);
    }, 100);
  };

  // Apply extracted introductions from one or multiple EPUB files
  const applyExtractedEpubIntros = (
    results: ExtractedEpubIntroResult[]
  ): Array<ExtractedEpubIntroResult & { matchedBookTitle?: string }> => {
    const annotated: Array<ExtractedEpubIntroResult & { matchedBookTitle?: string }> = results.map((r) => {
      if (r.status !== "success" || !r.introHtml) {
        return { ...r };
      }
      const matched = matchEpubToParsedBook(r.epubTitle, r.fileName, parsedBooks);
      if (matched) {
        return { ...r, matchedBookTitle: matched.title1 };
      }
      if (results.length === 1 && title1.trim()) {
        return { ...r, matchedBookTitle: title1.trim() };
      }
      return { ...r };
    });

    const validItems = annotated.filter((r) => r.status === "success" && r.introHtml);
    if (validItems.length === 0) {
      return annotated;
    }

    const introUpdates: Record<string, string> = {};
    validItems.forEach((item) => {
      const targetKey = (
        item.matchedBookTitle ||
        item.epubTitle ||
        item.cleanTitleFromFile
      ).trim();
      if (targetKey) {
        introUpdates[targetKey] = item.introHtml;
      }
    });

    let nextSelectedBook: { title1: string; title2: string } | null = null;
    let nextTitle1IfEmpty: string | null = null;
    let nextIntroToDisplay = validItems[0].introHtml;

    if (results.length === 1) {
      const single = validItems[0];
      if (single.matchedBookTitle) {
        const foundInList = parsedBooks.find((b) => b.title1 === single.matchedBookTitle);
        if (foundInList && foundInList.title1 !== title1) {
          nextSelectedBook = { title1: foundInList.title1, title2: foundInList.title2 };
        }
      } else if (!title1.trim() && parsedBooks.length === 0) {
        const fallbackTitle = (single.epubTitle || single.cleanTitleFromFile).trim();
        if (fallbackTitle) {
          nextTitle1IfEmpty = fallbackTitle;
        }
      }
      nextIntroToDisplay = single.introHtml;
    } else {
      const currentBookKey = title1.trim();
      if (currentBookKey && introUpdates[currentBookKey]) {
        nextIntroToDisplay = introUpdates[currentBookKey];
      } else {
        const firstMatchedItem = validItems.find(
          (item) =>
            item.matchedBookTitle &&
            parsedBooks.some((b) => b.title1 === item.matchedBookTitle)
        );
        if (!currentBookKey && firstMatchedItem?.matchedBookTitle) {
          const foundBook = parsedBooks.find(
            (b) => b.title1 === firstMatchedItem.matchedBookTitle
          );
          if (foundBook) {
            nextSelectedBook = { title1: foundBook.title1, title2: foundBook.title2 };
            nextIntroToDisplay = firstMatchedItem.introHtml;
          }
        } else {
          nextIntroToDisplay = validItems[0].introHtml;
        }
      }
    }

    if (nextSelectedBook) {
      selectBook(nextSelectedBook.title1, nextSelectedBook.title2);
    } else if (nextTitle1IfEmpty) {
      setTitle1(nextTitle1IfEmpty);
    }

    setIntroductionText(nextIntroToDisplay);

    setBookIntroMap((prev) => {
      const updatedMap = { ...prev, ...introUpdates };
      setTabs((prevTabs) => {
        const updatedTabs = prevTabs.map((t) =>
          t.id === activeTabId
            ? {
                ...t,
                title1: nextSelectedBook?.title1 ?? nextTitle1IfEmpty ?? title1,
                title2: nextSelectedBook?.title2 ?? title2,
                introductionText: nextIntroToDisplay,
                bookIntroMap: updatedMap,
              }
            : t
        );
        dbSet("bofo_tabs", updatedTabs);
        return updatedTabs;
      });
      return updatedMap;
    });

    const authorName = (author || "").trim();
    setGlobalBookIntros((prev) => {
      const next = { ...prev };
      Object.entries(introUpdates).forEach(([bTitle, intro]) => {
        if (bTitle && intro) {
          next[`${authorName}::${bTitle}`] = intro;
          next[`::${bTitle}`] = intro;
        }
      });
      dbSet("bofo_globalBookIntros", next);
      try {
        localStorage.setItem("bofo_globalBookIntros", JSON.stringify(next));
      } catch (e) {
        console.error("Failed to save globalBookIntros to localStorage", e);
      }
      return next;
    });

    return annotated;
  };

  const previewExtractedEpubIntro = (
    introHtml: string,
    targetBookTitle?: string
  ) => {
    if (targetBookTitle) {
      const foundBook = parsedBooks.find((b) => b.title1 === targetBookTitle);
      if (foundBook) {
        selectBook(foundBook.title1, foundBook.title2);
        setIntroductionText(introHtml);
        return;
      }
      if (parsedBooks.length === 0) {
        setTitle1(targetBookTitle);
      }
    }
    setIntroductionText(introHtml);
  };

  // Word document export triggers
  const triggerExportWord = async () => {
    if (!editor) return;
    setIsExporting(true);
    try {
      const processedHtml = getProcessedHtml(editor.getHTML(), title1, title2, author);
      await exportToWord(processedHtml, title1, title2);
    } catch (err) {
      console.error(err);
      toast.error("Đã có lỗi xảy ra khi xuất file Word.");
    } finally {
      setIsExporting(false);
    }
  };

  // PDF export triggers
  const triggerExportPDF = async () => {
    if (!editor) return;
    setIsExportingPDF(true);
    try {
      const processedHtml = getProcessedHtml(editor.getHTML(), title1, title2, author);
      await exportToPDF(processedHtml, title1, title2);
    } catch (err) {
      console.error(err);
      toast.error("Đã có lỗi xảy ra khi xuất file PDF.");
    } finally {
      setIsExportingPDF(false);
    }
  };

  // EPUB export triggers
  const triggerExportEPUB = async () => {
    if (!editor) return;
    setIsExportingEPUB(true);
    try {
      const processedHtml = getProcessedHtml(editor.getHTML(), title1, title2, author);
      const coverBase64 = bookCovers[title1] || undefined;
      await exportToEPUB(processedHtml, title1, title2, author, coverBase64);
      toast.success("Đã xuất file EPUB thành công.");
    } catch (err) {
      console.error(err);
      toast.error("Đã có lỗi xảy ra khi xuất file EPUB.");
    } finally {
      setIsExportingEPUB(false);
    }
  };

  const saveBookCover = (bookTitle: string, base64Data: string) => {
    setBookCovers(prev => {
      const updated = { ...prev, [bookTitle]: base64Data };
      dbSet("bofo_bookCovers", updated);
      return updated;
    });
  };

  const deleteBookCover = (bookTitle: string) => {
    setBookCovers(prev => {
      const updated = { ...prev };
      delete updated[bookTitle];
      dbSet("bofo_bookCovers", updated);
      return updated;
    });
  };

  const triggerBatchExportEPUB = async (selectedTitles: string[]) => {
    if (selectedTitles.length === 0) {
      toast.warning("Vui lòng chọn ít nhất một cuốn sách để xuất.");
      return;
    }

    setIsBatchExporting(true);
    setBatchProgress("Đang chuẩn bị khởi tạo...");

    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      let exportedCount = 0;
      let skippedBooks: string[] = [];

      for (let i = 0; i < selectedTitles.length; i++) {
        const title = selectedTitles[i];
        setBatchProgress(`Đang xuất (${i + 1}/${selectedTitles.length}): ${title}`);

        const rawContent = bookContentMap[title] || "";
        const isContentEmpty = !rawContent || rawContent.replace(/<[^>]*>/g, "").trim().length === 0;

        if (isContentEmpty) {
          skippedBooks.push(title);
          continue;
        }

        const processedHtml = getProcessedHtml(rawContent, title, "", author);
        const coverBase64 = bookCovers[title] || undefined;

        const response = await fetch("/api/export-epub", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            html: processedHtml,
            title: title,
            author: author,
            cover: coverBase64,
          }),
        });

        if (!response.ok) {
          throw new Error(`Lỗi khi xuất sách: ${title}`);
        }

        const epubBlob = await response.blob();
        
        const indexStr = String(i + 1).padStart(2, "0");
        const filename = `${indexStr}. ${title}.epub`;
        
        zip.file(filename, epubBlob);
        exportedCount++;
      }

      if (exportedCount > 0) {
        setBatchProgress("Đang nén file ZIP...");
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const zipName = author
          ? `Sach_${author.replace(/\s+/g, "_")}_EPUB.zip`
          : "Danh_sach_sach_EPUB.zip";

        saveAs(zipBlob, zipName);
      }

      let msg = `Đã xuất thành công ${exportedCount} sách ra file ZIP.`;
      if (skippedBooks.length > 0) {
        msg += ` Bỏ qua ${skippedBooks.length} sách chưa có nội dung.`;
      }
      toast.success(msg);
    } catch (err: any) {
      console.error(err);
      toast.error(`Lỗi xuất hàng loạt: ${err?.message || err}`);
    } finally {
      setIsBatchExporting(false);
      setBatchProgress("");
    }
  };

  // Consolidate a tab's live state and auto-recover any intros from global cache or book contents before sharing
  const prepareTabForShare = (targetTab?: AuthorTab | null): AuthorTab | null => {
    if (!targetTab) return null;

    const isCurrentActive = targetTab.id === activeTabId;
    const effAuthor = (isCurrentActive ? author : targetTab.author) || "";
    const effTitle1 = (isCurrentActive ? title1 : targetTab.title1) || "";
    const effTitle2 = (isCurrentActive ? title2 : targetTab.title2) || "";
    const effBookListText = (isCurrentActive ? bookListText : targetTab.bookListText) || "";
    const effGenresText = (isCurrentActive ? genresText : targetTab.genresText) || "";
    const effChapterKeywords =
      (isCurrentActive ? chapterKeywords : targetTab.chapterKeywords) || "chapter, lesson";
    const effCustomPhrases =
      (isCurrentActive ? customBlockPhrases : targetTab.customBlockPhrases) || "";
    const effAuthorInfo = isCurrentActive
      ? (authorEditor ? authorEditor.getHTML() : authorInfoMap[effAuthor] || targetTab.authorEditorContent || "")
      : targetTab.authorEditorContent || authorInfoMap[effAuthor] || "";

    const rawIntroMap: Record<string, string> = {
      ...(targetTab.bookIntroMap || {}),
      ...(isCurrentActive ? bookIntroMap : {}),
    };
    if (isCurrentActive && effTitle1.trim() && hasNonEmptyHtmlText(introductionText)) {
      rawIntroMap[effTitle1.trim()] = introductionText;
    }

    const rawContentMap: Record<string, string> = {
      ...(targetTab.bookContentMap || {}),
      ...(isCurrentActive ? bookContentMap : {}),
    };
    if (isCurrentActive && effTitle1.trim() && editor) {
      const liveHtml = editor.getHTML();
      if (hasNonEmptyHtmlText(liveHtml)) {
        rawContentMap[effTitle1.trim()] = liveHtml;
      }
    }

    const rawGenresMap: Record<string, BookCategoryData> = {
      ...(targetTab.bookGenresMap || {}),
      ...(isCurrentActive ? bookGenresMap : {}),
    };

    const cleanBooks = parseCleanBookTitles(effBookListText);
    const cleanIntroMap: Record<string, string> = {};
    const cleanGenresMap: Record<string, BookCategoryData> = {};
    const trimmedAuthor = effAuthor.trim();

    // Carry over existing valid entries (excluding empty key "")
    Object.entries(rawIntroMap).forEach(([k, v]) => {
      const tk = k.trim();
      if (tk && hasNonEmptyHtmlText(v)) {
        cleanIntroMap[tk] = v;
      }
    });
    Object.entries(rawGenresMap).forEach(([k, v]) => {
      const tk = k.trim();
      if (tk && v) {
        cleanGenresMap[tk] = v;
      }
    });

    // Ensure every book in bookListText has exact key alignment and fallback recovery
    for (const bookTitle of cleanBooks) {
      let intro = getBookIntroFromMap(bookTitle, cleanIntroMap);

      if (!intro) {
        const gKey = `${trimmedAuthor}::${bookTitle}`;
        const gFallback = `::${bookTitle}`;
        intro = globalBookIntros[gKey] || globalBookIntros[gFallback] || "";
      }

      if (!hasNonEmptyHtmlText(intro)) {
        const contentHtml =
          rawContentMap[bookTitle] ||
          getBookIntroFromMap(bookTitle, rawContentMap);
        if (hasNonEmptyHtmlText(contentHtml)) {
          const formatted = cleanAndFormatHtml(
            contentHtml,
            effChapterKeywords,
            effCustomPhrases
          );
          if (hasNonEmptyHtmlText(formatted.introductionText)) {
            intro = formatted.introductionText;
          }
        }
      }

      if (hasNonEmptyHtmlText(intro)) {
        cleanIntroMap[bookTitle] = intro;
      }

      const matchedGenres = getBookGenresFromMap(bookTitle, rawGenresMap);
      if (matchedGenres) {
        cleanGenresMap[bookTitle] = matchedGenres;
      }
    }

    return {
      ...targetTab,
      title1: effTitle1,
      title2: effTitle2,
      author: effAuthor,
      bookListText: effBookListText,
      introductionText: effTitle1.trim() ? cleanIntroMap[effTitle1.trim()] || "" : "",
      chapterKeywords: effChapterKeywords,
      genresText: effGenresText,
      customBlockPhrases: effCustomPhrases,
      authorEditorContent: effAuthorInfo,
      bookIntroMap: cleanIntroMap,
      bookGenresMap: cleanGenresMap,
      bookContentMap: rawContentMap,
    };
  };

  const prepareAllTabsForShare = (): AuthorTab[] => {
    return tabs
      .map((t) => prepareTabForShare(t))
      .filter((t): t is AuthorTab => t !== null);
  };

  const importSharedAuthor = (sharedData: {
    authorName: string;
    authorInfo?: string;
    bookListText?: string;
    bookIntroMap?: Record<string, string>;
    bookIntroMapJson?: string;
    bookGenresMap?: Record<string, BookCategoryData>;
    bookGenresMapJson?: string;
    genresText?: string;
    chapterKeywords?: string;
    customBlockPhrases?: string;
  }) => {
    isSwitchingTabRef.current = true;

    let incomingIntroMap: Record<string, string> = sharedData.bookIntroMap || {};
    if (sharedData.bookIntroMapJson) {
      try {
        const parsedJson = JSON.parse(sharedData.bookIntroMapJson);
        if (parsedJson && typeof parsedJson === "object") {
          incomingIntroMap = { ...incomingIntroMap, ...parsedJson };
        }
      } catch (e) {
        console.error("Failed to parse bookIntroMapJson", e);
      }
    }

    let incomingGenresMap: Record<string, BookCategoryData> = sharedData.bookGenresMap || {};
    if (sharedData.bookGenresMapJson) {
      try {
        const parsedJson = JSON.parse(sharedData.bookGenresMapJson);
        if (parsedJson && typeof parsedJson === "object") {
          incomingGenresMap = { ...incomingGenresMap, ...parsedJson };
        }
      } catch (e) {
        console.error("Failed to parse bookGenresMapJson", e);
      }
    }

    const newId = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const bookList = sharedData.bookListText || "";
    const cleanTitles = parseCleanBookTitles(bookList);

    const reconciledIntroMap: Record<string, string> = {};
    Object.entries(incomingIntroMap).forEach(([k, v]) => {
      const tk = k.trim();
      if (tk && hasNonEmptyHtmlText(v)) {
        reconciledIntroMap[tk] = v;
      }
    });
    for (const bTitle of cleanTitles) {
      const matchedIntro = getBookIntroFromMap(bTitle, incomingIntroMap);
      if (matchedIntro) {
        reconciledIntroMap[bTitle] = matchedIntro;
      }
    }

    const reconciledGenresMap: Record<string, BookCategoryData> = {};
    Object.entries(incomingGenresMap).forEach(([k, v]) => {
      const tk = k.trim();
      if (tk && v) {
        reconciledGenresMap[tk] = v;
      }
    });
    for (const bTitle of cleanTitles) {
      const matchedGenre = getBookGenresFromMap(bTitle, incomingGenresMap);
      if (matchedGenre) {
        reconciledGenresMap[bTitle] = matchedGenre;
      }
    }

    const firstBookTitle1 = cleanTitles[0] || "";
    const firstBookIntro = firstBookTitle1
      ? getBookIntroFromMap(firstBookTitle1, reconciledIntroMap)
      : "";

    const firstBookGenreObj = firstBookTitle1 ? reconciledGenresMap[firstBookTitle1] : undefined;
    const firstBookGenreLines = firstBookGenreObj
      ? [firstBookGenreObj.cat1, firstBookGenreObj.cat2, firstBookGenreObj.cat3].filter(
          (c) => c && c.trim().length > 0
        )
      : [];
    const initialGenresText =
      firstBookGenreLines.length > 0
        ? firstBookGenreLines.join("\n")
        : sharedData.genresText ||
          "Language Study / English as a Second Language\nLanguage Study / Multi-Language Phrasebooks";

    const incomingAuthorInfo = sharedData.authorInfo || "";

    const newTab: AuthorTab = {
      id: newId,
      title1: firstBookTitle1,
      title2: "",
      author: sharedData.authorName,
      bookListText: bookList,
      introductionText: firstBookIntro,
      chapterKeywords: sharedData.chapterKeywords || "chapter, lesson",
      genresText: initialGenresText,
      customBlockPhrases: sharedData.customBlockPhrases || "",
      splitterInput: "",
      reconcilerRawText: "",
      reconcilerWarehouseText: "",
      isSettingsOpen: true,
      isBookListOpen: true,
      isPromptOpen: true,
      detectedChapters: [],
      editorContent: "",
      authorEditorContent: incomingAuthorInfo,
      bookIntroMap: reconciledIntroMap,
      bookContentMap: {},
      bookGenresMap: reconciledGenresMap,
      activeSubTab: "formatter",
    };

    const currentEditorContent = editor ? editor.getHTML() : "";
    const currentAuthorEditorContent = authorEditor ? authorEditor.getHTML() : "";

    setTabs((prevTabs) => {
      const updated = prevTabs.map((t) => {
        if (t.id === activeTabId) {
          return {
            ...t,
            title1,
            title2,
            author,
            bookListText,
            introductionText,
            chapterKeywords,
            genresText,
            customBlockPhrases,
            splitterInput,
            reconcilerRawText,
            reconcilerWarehouseText,
            isSettingsOpen,
            isBookListOpen,
            detectedChapters,
            bookIntroMap,
            bookContentMap,
            bookGenresMap,
            activeSubTab: activeTab,
            editorContent: currentEditorContent,
            authorEditorContent: currentAuthorEditorContent,
          };
        }
        return t;
      });
      const nextAll = [...updated, newTab];
      dbSet("bofo_tabs", nextAll);
      dbSet("bofo_activeTabId", newId);
      return nextAll;
    });

    if (sharedData.authorName && incomingAuthorInfo) {
      setAuthorInfoMap((prev) => {
        const next = { ...prev, [sharedData.authorName]: incomingAuthorInfo };
        try {
          localStorage.setItem("bofo_authorInfoMap", JSON.stringify(next));
        } catch (e) {
          console.error("Failed to save authorInfoMap to localStorage", e);
        }
        return next;
      });
    }

    const trimmedAuthor = (sharedData.authorName || "").trim();
    if (Object.keys(reconciledIntroMap).length > 0) {
      setGlobalBookIntros((prev) => {
        const next = { ...prev };
        Object.entries(reconciledIntroMap).forEach(([bTitle, intro]) => {
          if (bTitle && intro) {
            next[`${trimmedAuthor}::${bTitle}`] = intro;
            next[`::${bTitle}`] = intro;
          }
        });
        dbSet("bofo_globalBookIntros", next);
        try {
          localStorage.setItem("bofo_globalBookIntros", JSON.stringify(next));
        } catch (e) {
          console.error("Failed to save globalBookIntros to localStorage", e);
        }
        return next;
      });
    }

    setTitle1(firstBookTitle1);
    setTitle2("");
    setAuthor(sharedData.authorName);
    setBookListText(bookList);
    setIntroductionText(firstBookIntro);
    setChapterKeywords(sharedData.chapterKeywords || "chapter, lesson");
    setGenresText(initialGenresText);
    setCustomBlockPhrases(sharedData.customBlockPhrases || "");
    setSplitterInput("");
    setReconcilerRawText("");
    setReconcilerWarehouseText("");
    setIsSettingsOpen(true);
    setIsBookListOpen(true);
    setIsPromptOpen(true);
    setDetectedChapters([]);
    setBookIntroMap(reconciledIntroMap);
    setBookContentMap({});
    setBookGenresMap(reconciledGenresMap);
    setActiveTab("formatter");

    if (editor) {
      editor.commands.setContent("");
    }
    if (authorEditor) {
      authorEditor.commands.setContent(incomingAuthorInfo);
    }

    setActiveTabId(newId);

    setTimeout(() => {
      isSwitchingTabRef.current = false;
    }, 100);
  };

  const addBatchTabs = (authors: string[], books: string[], clearExisting: boolean) => {
    isSwitchingTabRef.current = true;

    const currentEditorContent = editor ? editor.getHTML() : "";
    const currentAuthorEditorContent = authorEditor ? authorEditor.getHTML() : "";

    const timestamp = Date.now();
    const newTabs: AuthorTab[] = authors.map((authorName, index) => {
      const rawLine = (books[index] || "").trim();
      let bookTitle = rawLine;
      let cat1 = "";
      let cat2 = "";
      let cat3 = "";

      if (rawLine.includes("\t")) {
        const parts = rawLine.split("\t").map((p) => p.trim());
        bookTitle = parts[0] || "";
        cat1 = parts[1] || "";
        cat2 = parts[2] || "";
        cat3 = parts[3] || "";
      } else if (rawLine.includes("|")) {
        const parts = rawLine.split("|").map((p) => p.trim());
        bookTitle = parts[0] || "";
        cat1 = parts[1] || "";
        cat2 = parts[2] || "";
        cat3 = parts[3] || "";
      }

      bookTitle = bookTitle.replace(/^\d+[\s\.\-_]*/, "");

      const initialBookGenresMap: Record<string, BookCategoryData> = {};
      if (bookTitle && (cat1 || cat2 || cat3)) {
        initialBookGenresMap[bookTitle] = { cat1, cat2, cat3 };
      }

      const genresList = [cat1, cat2, cat3].filter(Boolean);
      const initialGenresText = genresList.length > 0
        ? genresList.join("\n")
        : "Language Study / English as a Second Language\nLanguage Study / Multi-Language Phrasebooks";

      return {
        id: `tab_${timestamp}_${index}`,
        title1: bookTitle,
        title2: "",
        author: authorName,
        bookListText: bookTitle,
        introductionText: "",
        chapterKeywords: "chapter, lesson",
        genresText: initialGenresText,
        customBlockPhrases: "",
        splitterInput: "",
        reconcilerRawText: "",
        reconcilerWarehouseText: "",
        isSettingsOpen: true,
        isBookListOpen: true,
        isPromptOpen: true,
        detectedChapters: [],
        editorContent: "",
        authorEditorContent: "",
        bookIntroMap: {},
        bookContentMap: bookTitle ? { [bookTitle]: "" } : {},
        bookGenresMap: initialBookGenresMap,
        activeSubTab: "formatter",
      };
    });

    if (newTabs.length === 0) {
      isSwitchingTabRef.current = false;
      return;
    }

    setTabs((prevTabs) => {
      let updated: AuthorTab[];
      if (clearExisting) {
        updated = newTabs;
      } else {
        const mapped = prevTabs.map((t) => {
          if (t.id === activeTabId) {
            return {
              ...t,
              title1,
              title2,
              author,
              bookListText,
              introductionText,
              chapterKeywords,
              genresText,
              customBlockPhrases,
              splitterInput,
              reconcilerRawText,
              reconcilerWarehouseText,
              isSettingsOpen,
              isBookListOpen,
              detectedChapters,
              bookIntroMap,
              bookContentMap,
              bookGenresMap,
              activeSubTab: activeTab,
              editorContent: currentEditorContent,
              authorEditorContent: currentAuthorEditorContent,
            };
          }
          return t;
        });

        const isSingleEmptyTab =
          mapped.length === 1 &&
          !mapped[0].author &&
          !mapped[0].bookListText &&
          !mapped[0].editorContent;

        if (isSingleEmptyTab) {
          updated = newTabs;
        } else {
          updated = [...mapped, ...newTabs];
        }
      }

      // Switch to the first newly added tab
      const firstNewTab = newTabs[0];
      if (firstNewTab) {
        setTitle1(firstNewTab.title1);
        setTitle2(firstNewTab.title2);
        setAuthor(firstNewTab.author);
        setBookListText(firstNewTab.bookListText);
        setIntroductionText("");
        setChapterKeywords(firstNewTab.chapterKeywords);
        setGenresText(firstNewTab.genresText);
        setCustomBlockPhrases("");
        setSplitterInput("");
        setReconcilerRawText("");
        setReconcilerWarehouseText("");
        setIsSettingsOpen(true);
        setIsBookListOpen(true);
        setIsPromptOpen(true);
        setDetectedChapters([]);
        setBookIntroMap({});
        setBookContentMap(firstNewTab.bookContentMap);
        setBookGenresMap(firstNewTab.bookGenresMap || {});
        setActiveTab("formatter");

        if (editor) {
          editor.commands.setContent("");
        }
        if (authorEditor) {
          authorEditor.commands.setContent("");
        }

        setTimeout(() => {
          setActiveTabId(firstNewTab.id);
        }, 0);
      }

      return updated;
    });

    setTimeout(() => {
      isSwitchingTabRef.current = false;
    }, 100);
  };

  return {
    isMounted,
    isExporting,
    isExportingPDF,
    isExportingEPUB,
    isFormatting,
    title1,
    setTitle1,
    title2,
    setTitle2,
    author,
    setAuthor,
    bookListText,
    setBookListText,
    introductionText,
    setIntroductionText,
    chapterKeywords,
    setChapterKeywords,
    genresText,
    setGenresText,
    customBlockPhrases,
    setCustomBlockPhrases,
    promptTemplate,
    setPromptTemplate,
    promptPlaceholderBook,
    setPromptPlaceholderBook,
    activeTab,
    setActiveTab,
    splitterInput,
    setSplitterInput,
    reconcilerRawText,
    setReconcilerRawText,
    reconcilerWarehouseText,
    setReconcilerWarehouseText,
    isSettingsOpen,
    setIsSettingsOpen,
    isBookListOpen,
    setIsBookListOpen,
    isPromptOpen,
    setIsPromptOpen,
    copiedId,
    detectedChapters,
    isChapterListOpen,
    setIsChapterListOpen,
    isChapterListVisible,
    setIsChapterListVisible,
    buttonPos,
    setButtonPos,
    parsedBooks,
    editor,
    authorEditor,
    handleSelectBook,
    handleSelectBookByIndex,
    handleCopy,
    formatContent,
    applyExtractedEpubIntros,
    previewExtractedEpubIntro,
    triggerExportWord,
    triggerExportPDF,
    triggerExportEPUB,
    authorInfoMap,
    bookCovers,
    saveBookCover,
    deleteBookCover,
    coverPromptTemplate,
    setCoverPromptTemplate,
    coverPromptPlaceholderBook,
    setCoverPromptPlaceholderBook,
    promptPlaceholderAuthor,
    setPromptPlaceholderAuthor,
    coverPromptPlaceholderAuthor,
    setCoverPromptPlaceholderAuthor,
    promptPlaceholderCat1,
    setPromptPlaceholderCat1,
    promptPlaceholderCat2,
    setPromptPlaceholderCat2,
    promptPlaceholderCat3,
    setPromptPlaceholderCat3,
    bookGenresMap,
    setBookGenresMap,
    updateBookGenres,
    bulkUpdateBookGenres,
    isBatchExporting,
    batchProgress,
    triggerBatchExportEPUB,
    // Multi-tab workspace features
    tabs,
    setTabs,
    activeTabId,
    setActiveTabId,
    switchTab,
    addTab,
    deleteTab,
    renameTab,
    bookIntroMap,
    bookContentMap,
    setBookContentMap,
    selectBook,
    prepareTabForShare,
    prepareAllTabsForShare,
    importSharedAuthor,
    addBatchTabs,
  };
};
