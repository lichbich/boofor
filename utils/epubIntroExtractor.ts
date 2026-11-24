import JSZip from "jszip";

export interface ExtractedEpubIntroResult {
  fileName: string;
  epubTitle: string;
  epubAuthor: string;
  cleanTitleFromFile: string;
  introHtml: string;
  status: "success" | "empty" | "error";
  message?: string;
}

const INTRO_HEADING_REGEX =
  /^(?:introduction|giới\s*thiệu|lời\s*nói\s*đầu|lời\s*mở\s*đầu|mở\s*đầu|preface|foreword|prologue)(?:\s*$|[\s:\-–—.])/i;

const INTRO_FILENAME_REGEX =
  /(?:^|[\/_\-\d])(?:intro|introduction|preface|foreword|prologue)(?:[._\-\d]|$)/i;

const CHAPTER_BOUNDARY_REGEX =
  /^(?:chapter|lesson|part|module|unit|section|chương|phần|bài)\s+(?:\d+|[ivxlcdm]+|one|two|three|four|five|six|seven|eight|nine|ten)\b/i;

const CONCLUSION_BOUNDARY_REGEX =
  /^(?:conclusion|kết\s*luận|epilogue|afterword|about\s+the\s+author|về\s+tác\s+giả)\b/i;

const SKIP_FRONTMATTER_HREF_REGEX =
  /(?:^|[\/_\-\d])(?:cover|titlepage|halftitle|toc|nav|copyright|dedication|acknowledg)(?:[._\-\d]|$)/i;

const SKIP_FRONTMATTER_TITLE_REGEX =
  /^(?:cover|table\s+of\s+contents|contents|mục\s*lục|copyright|all\s+rights\s+reserved|title\s+page|dedication|acknowledgments?|acknowledgements?|also\s+by)\b/i;

export const decodeHtmlEntities = (str: string): string => {
  if (!str) return "";
  return str
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      try {
        return String.fromCodePoint(parseInt(hex, 16));
      } catch {
        return `&#x${hex};`;
      }
    })
    .replace(/&#([0-9]+);/g, (_, dec) => {
      try {
        return String.fromCodePoint(parseInt(dec, 10));
      } catch {
        return `&#${dec};`;
      }
    })
    .replace(/&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&nbsp;/gi, " ")
    .replace(/&rsquo;/gi, "’")
    .replace(/&lsquo;/gi, "‘")
    .replace(/&ldquo;/gi, "“")
    .replace(/&rdquo;/gi, "”")
    .replace(/&ndash;/gi, "–")
    .replace(/&mdash;/gi, "—")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&");
};

export const cleanBookTitleFromFileName = (fileName: string): string => {
  return fileName
    .replace(/\.epub$/i, "")
    .replace(/_cleaned$/i, "")
    .replace(/^\d+[\s.\-_]+/, "")
    .trim();
};

export const normalizeBookMatchKey = (str: string): string => {
  return cleanBookTitleFromFileName(str)
    .replace(/[^\p{L}\p{N}]/gu, "")
    .toLowerCase();
};

export const parseCleanBookTitles = (bookListText?: string): string[] => {
  if (!bookListText) return [];
  return bookListText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.replace(/^\d+\.\s*/, "").trim())
    .filter((title) => title.length > 0);
};

export const hasNonEmptyHtmlText = (html?: string): boolean => {
  if (!html) return false;
  return html.replace(/<[^>]*>/g, "").trim().length > 0;
};

export const getBookIntroFromMap = (
  bookTitle: string,
  bookIntroMap?: Record<string, string>
): string => {
  if (!bookTitle || !bookIntroMap) return "";
  const trimmed = bookTitle.trim();

  if (hasNonEmptyHtmlText(bookIntroMap[trimmed])) {
    return bookIntroMap[trimmed];
  }
  if (hasNonEmptyHtmlText(bookIntroMap[bookTitle])) {
    return bookIntroMap[bookTitle];
  }

  const targetKey = normalizeBookMatchKey(trimmed);
  if (!targetKey) return "";

  for (const [key, val] of Object.entries(bookIntroMap)) {
    if (!key || !hasNonEmptyHtmlText(val)) continue;
    if (normalizeBookMatchKey(key) === targetKey) {
      return val;
    }
  }

  return "";
};

export const getBookGenresFromMap = <T extends { cat1?: string; cat2?: string; cat3?: string }>(
  bookTitle: string,
  bookGenresMap?: Record<string, T>
): T | undefined => {
  if (!bookTitle || !bookGenresMap) return undefined;
  const trimmed = bookTitle.trim();
  if (bookGenresMap[trimmed]) return bookGenresMap[trimmed];
  if (bookGenresMap[bookTitle]) return bookGenresMap[bookTitle];

  const targetKey = normalizeBookMatchKey(trimmed);
  if (!targetKey) return undefined;

  for (const [key, val] of Object.entries(bookGenresMap)) {
    if (!key || !val) continue;
    if (normalizeBookMatchKey(key) === targetKey) {
      return val;
    }
  }
  return undefined;
};

export interface AuthorShareReadiness {
  isReady: boolean;
  hasValidAuthor: boolean;
  totalBooks: number;
  introCount: number;
  missingIntroBooks: string[];
  hasGenres: boolean;
}

export const checkAuthorShareReadiness = (tabData: {
  author?: string;
  bookListText?: string;
  bookIntroMap?: Record<string, string>;
  bookGenresMap?: Record<string, { cat1?: string; cat2?: string; cat3?: string }>;
  genresText?: string;
}): AuthorShareReadiness => {
  const authorName = (tabData.author || "").trim();
  const hasValidAuthor = Boolean(authorName && authorName !== "Tác giả mới");
  const books = parseCleanBookTitles(tabData.bookListText);
  const totalBooks = books.length;

  const missingIntroBooks: string[] = [];
  for (const bookTitle of books) {
    const intro = getBookIntroFromMap(bookTitle, tabData.bookIntroMap);
    if (!intro) {
      missingIntroBooks.push(bookTitle);
    }
  }

  const introCount = totalBooks - missingIntroBooks.length;
  const hasFallbackGenres = Boolean((tabData.genresText || "").trim());
  const allBooksHaveGenres =
    totalBooks > 0 &&
    books.every((b) => {
      const g = getBookGenresFromMap(b, tabData.bookGenresMap);
      return Boolean(g && (g.cat1?.trim() || g.cat2?.trim() || g.cat3?.trim()));
    });
  const hasGenres = allBooksHaveGenres || hasFallbackGenres;

  const isReady =
    hasValidAuthor &&
    totalBooks > 0 &&
    missingIntroBooks.length === 0 &&
    hasGenres;

  return {
    isReady,
    hasValidAuthor,
    totalBooks,
    introCount,
    missingIntroBooks,
    hasGenres,
  };
};

export const matchEpubToParsedBook = <
  T extends { title1: string; title2: string; full: string }
>(
  epubTitle: string,
  fileName: string,
  parsedBooks: T[]
): T | null => {
  if (!parsedBooks || parsedBooks.length === 0) return null;

  const candidates: string[] = [];
  if (
    epubTitle &&
    epubTitle.trim() &&
    !/^(book\s+export|untitled)$/i.test(epubTitle.trim())
  ) {
    candidates.push(epubTitle.trim());
  }

  const fromFile = cleanBookTitleFromFileName(fileName);
  if (fromFile) {
    candidates.push(fromFile);
    const dashIdx = fromFile.lastIndexOf(" - ");
    if (dashIdx > 0) {
      candidates.push(fromFile.substring(0, dashIdx).trim());
    }
  }

  const candidateKeys = candidates
    .map((c) => normalizeBookMatchKey(c))
    .filter((k) => k.length > 0);

  // 1. Exact normalized match
  for (const candKey of candidateKeys) {
    const exactMatch = parsedBooks.find((book) => {
      const t1Key = normalizeBookMatchKey(book.title1);
      const fullKey = normalizeBookMatchKey(
        `${book.title1}${book.title2 ? ` ${book.title2}` : ""}`
      );
      return t1Key === candKey || fullKey === candKey;
    });
    if (exactMatch) return exactMatch;
  }

  // 2. High-confidence substring match (e.g. Title1 vs Title1 + Subtitle)
  for (const candKey of candidateKeys) {
    if (candKey.length < 10) continue;
    const partialMatches = parsedBooks.filter((book) => {
      const t1Key = normalizeBookMatchKey(book.title1);
      if (t1Key.length < 10) return false;
      return candKey.startsWith(t1Key) || t1Key.startsWith(candKey);
    });
    if (partialMatches.length === 1) {
      return partialMatches[0];
    }
  }

  return null;
};

const safeDecodeUri = (uri: string): string => {
  try {
    return decodeURIComponent(uri);
  } catch {
    return uri;
  }
};

const resolveZipPath = (baseDir: string, relativeHref: string): string => {
  const withoutHash = relativeHref.split("#")[0];
  const decoded = safeDecodeUri(withoutHash);
  const combined = (baseDir + decoded).replace(/\\/g, "/");
  const parts = combined.split("/");
  const stack: string[] = [];

  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") {
      if (stack.length > 0) stack.pop();
    } else {
      stack.push(part);
    }
  }

  return stack.join("/");
};

const findFileInZip = (zip: JSZip, targetPath: string): JSZip.JSZipObject | null => {
  const direct = zip.file(targetPath);
  if (direct) return direct;

  const lowerTarget = targetPath.toLowerCase();
  const matchedKey = Object.keys(zip.files).find(
    (k) => !zip.files[k].dir && k.toLowerCase() === lowerTarget
  );
  return matchedKey ? zip.file(matchedKey) : null;
};

const isChapterOrConclusionHeading = (el: Element): boolean => {
  const tag = el.tagName.toUpperCase();
  const text = (el.textContent || "").replace(/\s+/g, " ").trim();
  if (!text) return false;
  const wordCount = text.split(/\s+/).length;

  if (tag === "H1") {
    return true;
  }

  if (/^H[2-6]$/.test(tag) || (tag === "P" && wordCount < 20)) {
    return (
      CHAPTER_BOUNDARY_REGEX.test(text) || CONCLUSION_BOUNDARY_REGEX.test(text)
    );
  }

  return false;
};

const isIntroHeadingElement = (el: Element): boolean => {
  const tag = el.tagName.toUpperCase();
  if (!["H1", "H2", "H3", "H4", "P", "DIV"].includes(tag)) return false;
  const text = (el.textContent || "").replace(/\s+/g, " ").trim();
  if (!text) return false;
  const wordCount = text.split(/\s+/).length;
  if (wordCount > 15) return false;
  return INTRO_HEADING_REGEX.test(text);
};

const cleanExtractedNodesToHtml = (nodes: Element[]): string => {
  if (typeof window === "undefined" || nodes.length === 0) return "";

  const parser = new DOMParser();
  const outDoc = parser.parseFromString("<!DOCTYPE html><html><body></body></html>", "text/html");
  const container = outDoc.body;

  for (const node of nodes) {
    container.appendChild(outDoc.importNode(node, true));
  }

  // Remove non-prose / metadata / EPUB boilerplate elements
  container
    .querySelectorAll(
      "script, style, link, meta, title, img, svg, figure, hr, nav, .epub-author, .epub-link, .page-break"
    )
    .forEach((el) => el.remove());

  // Unwrap generic container elements (section, article, main, div wrapping blocks)
  const unwrapContainers = () => {
    let changed = false;
    const wrappers = Array.from(
      container.querySelectorAll("section, article, main, header, div")
    );
    for (const wrapper of wrappers) {
      const hasBlockChildren = Array.from(wrapper.children).some((c) =>
        ["P", "H1", "H2", "H3", "H4", "H5", "H6", "UL", "OL", "BLOCKQUOTE", "TABLE", "DIV", "SECTION"].includes(
          c.tagName.toUpperCase()
        )
      );
      if (hasBlockChildren) {
        while (wrapper.firstChild) {
          wrapper.parentNode?.insertBefore(wrapper.firstChild, wrapper);
        }
        wrapper.remove();
        changed = true;
      } else if (wrapper.tagName.toUpperCase() === "DIV") {
        const text = (wrapper.textContent || "").trim();
        if (!text) {
          wrapper.remove();
        } else {
          const p = outDoc.createElement("p");
          p.innerHTML = wrapper.innerHTML;
          wrapper.replaceWith(p);
        }
        changed = true;
      }
    }
    return changed;
  };

  let guard = 0;
  while (unwrapContainers() && guard < 6) {
    guard++;
  }

  // Unwrap inline spans/fonts while keeping their inner content
  Array.from(container.querySelectorAll("span, font")).forEach((span) => {
    while (span.firstChild) {
      span.parentNode?.insertBefore(span.firstChild, span);
    }
    span.remove();
  });

  // Remove leading Introduction heading if still present at the top
  while (container.firstElementChild && isIntroHeadingElement(container.firstElementChild)) {
    container.firstElementChild.remove();
  }

  // Strip presentation attributes so HTML renders cleanly in both light & dark mode and copies cleanly
  Array.from(container.querySelectorAll("*")).forEach((el) => {
    const attrs = Array.from(el.attributes);
    for (const attr of attrs) {
      if (el.tagName.toUpperCase() === "A" && attr.name.toLowerCase() === "href") {
        continue;
      }
      el.removeAttribute(attr.name);
    }
  });

  // Remove empty block elements
  Array.from(container.children).forEach((child) => {
    const tag = child.tagName.toUpperCase();
    const text = (child.textContent || "").replace(/\s+/g, " ").trim();
    if (!text && tag !== "BR") {
      child.remove();
    }
  });

  const blocks = Array.from(container.children).map((el) => el.outerHTML.trim()).filter(Boolean);
  if (blocks.length > 0) {
    return blocks.join("\n\n");
  }

  const fallbackText = (container.textContent || "").trim();
  return fallbackText ? `<p>${fallbackText}</p>` : "";
};

const extractIntroNodesFromBody = (
  body: HTMLElement,
  requireIntroHeadingInside: boolean
): Element[] => {
  // Flatten single top-level wrapper (e.g. <body><section>...</section></body>) so we can walk block siblings
  let root: Element = body;
  while (
    root.children.length === 1 &&
    ["DIV", "SECTION", "ARTICLE", "MAIN"].includes(root.children[0].tagName.toUpperCase())
  ) {
    root = root.children[0];
  }

  const children = Array.from(root.children);
  if (children.length === 0) {
    const rawText = (root.textContent || "").trim();
    if (!requireIntroHeadingInside && rawText.length >= 40) {
      const p = body.ownerDocument.createElement("p");
      p.textContent = rawText;
      return [p];
    }
    return [];
  }

  // Check if there is an explicit Introduction heading among direct children
  const introIdx = children.findIndex((el) => isIntroHeadingElement(el));

  if (introIdx !== -1) {
    const collected: Element[] = [];
    for (let i = introIdx + 1; i < children.length; i++) {
      const el = children[i];
      if (isChapterOrConclusionHeading(el)) {
        break;
      }
      collected.push(el);
    }
    return collected;
  }

  if (requireIntroHeadingInside) {
    return [];
  }

  // Whole spine file is already identified as Introduction (via <title>, TOC, or filename)
  // If a Title Page preceded a .page-break (e.g. containing ******), skip before the page break
  let startIdx = 0;
  const pageBreakIdx = children.findIndex(
    (el) =>
      el.classList.contains("page-break") ||
      (el.getAttribute("style") || "").toLowerCase().includes("page-break-after")
  );
  if (pageBreakIdx !== -1 && pageBreakIdx < 6) {
    const beforeText = children
      .slice(0, pageBreakIdx)
      .map((c) => c.textContent || "")
      .join(" ");
    if (beforeText.includes("*****") || beforeText.length < 250) {
      startIdx = pageBreakIdx + 1;
    }
  }

  const collected: Element[] = [];
  for (let i = startIdx; i < children.length; i++) {
    const el = children[i];
    if (i === startIdx && isIntroHeadingElement(el)) {
      continue;
    }
    if (collected.length > 0 && isChapterOrConclusionHeading(el)) {
      break;
    }
    collected.push(el);
  }

  return collected;
};

export const extractIntroFromEpubFile = async (
  file: File
): Promise<ExtractedEpubIntroResult> => {
  const cleanTitleFromFile = cleanBookTitleFromFileName(file.name);

  try {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    const parser = new DOMParser();

    // 1. Locate OPF file
    let opfPath = "";
    const containerFile = findFileInZip(zip, "META-INF/container.xml");
    if (containerFile) {
      const containerXml = await containerFile.async("text");
      const containerDoc = parser.parseFromString(containerXml, "text/xml");
      const rootfileEl =
        containerDoc.querySelector("rootfile") ||
        containerDoc.getElementsByTagNameNS("*", "rootfile")[0];
      const fullPathAttr = rootfileEl?.getAttribute("full-path");
      if (fullPathAttr) {
        opfPath = fullPathAttr;
      } else {
        const m = containerXml.match(/full-path=["']([^"']+)["']/i);
        if (m?.[1]) opfPath = m[1];
      }
    }

    if (!opfPath) {
      const opfKeys = Object.keys(zip.files).filter((k) => k.toLowerCase().endsWith(".opf"));
      if (opfKeys.length > 0) {
        opfPath = opfKeys[0];
      }
    }

    const opfFile = opfPath ? findFileInZip(zip, opfPath) : null;
    if (!opfFile) {
      return {
        fileName: file.name,
        epubTitle: "",
        epubAuthor: "",
        cleanTitleFromFile,
        introHtml: "",
        status: "error",
        message: "Không tìm thấy cấu trúc sách (content.opf) trong file EPUB.",
      };
    }

    const opfDir = opfPath.includes("/")
      ? opfPath.substring(0, opfPath.lastIndexOf("/") + 1)
      : "";
    const opfText = await opfFile.async("text");
    const opfDoc = parser.parseFromString(opfText, "text/xml");

    // 2. Extract Metadata (Title & Author)
    let epubTitle = "";
    const titleEl =
      opfDoc.getElementsByTagName("dc:title")[0] ||
      opfDoc.getElementsByTagNameNS("*", "title")[0];
    if (titleEl?.textContent) {
      epubTitle = decodeHtmlEntities(titleEl.textContent).trim();
    } else {
      const titleMatch = opfText.match(/<(?:dc:)?title[^>]*>([\s\S]*?)<\/(?:dc:)?title>/i);
      if (titleMatch?.[1]) {
        epubTitle = decodeHtmlEntities(titleMatch[1].replace(/<[^>]*>/g, "")).trim();
      }
    }

    let epubAuthor = "";
    const creatorEl =
      opfDoc.getElementsByTagName("dc:creator")[0] ||
      opfDoc.getElementsByTagNameNS("*", "creator")[0];
    if (creatorEl?.textContent) {
      epubAuthor = decodeHtmlEntities(creatorEl.textContent).trim();
    } else {
      const authorMatch = opfText.match(/<(?:dc:)?creator[^>]*>([\s\S]*?)<\/(?:dc:)?creator>/i);
      if (authorMatch?.[1]) {
        epubAuthor = decodeHtmlEntities(authorMatch[1].replace(/<[^>]*>/g, "")).trim();
      }
    }

    // 3. Parse Manifest & Spine
    interface ManifestItem {
      id: string;
      href: string;
      mediaType: string;
      properties: string;
    }
    const manifestMap: Record<string, ManifestItem> = {};
    const xmlItems = Array.from(opfDoc.getElementsByTagNameNS("*", "item"));

    if (xmlItems.length > 0 && !opfDoc.querySelector("parsererror")) {
      for (const item of xmlItems) {
        const id = item.getAttribute("id") || "";
        const href = item.getAttribute("href") || "";
        const mediaType = item.getAttribute("media-type") || "";
        const properties = item.getAttribute("properties") || "";
        if (id && href) {
          manifestMap[id] = { id, href, mediaType, properties };
        }
      }
    } else {
      const itemTagMatches = opfText.matchAll(/<item\b([^>]*)\/?>/gi);
      for (const m of itemTagMatches) {
        const attrs = m[1];
        const id = attrs.match(/\bid=["']([^"']+)["']/i)?.[1] || "";
        const href = attrs.match(/\bhref=["']([^"']+)["']/i)?.[1] || "";
        const mediaType = attrs.match(/\bmedia-type=["']([^"']+)["']/i)?.[1] || "";
        const properties = attrs.match(/\bproperties=["']([^"']+)["']/i)?.[1] || "";
        if (id && href) {
          manifestMap[id] = { id, href, mediaType, properties };
        }
      }
    }

    const spineIds: string[] = [];
    const xmlItemRefs = Array.from(opfDoc.getElementsByTagNameNS("*", "itemref"));
    if (xmlItemRefs.length > 0 && !opfDoc.querySelector("parsererror")) {
      for (const ref of xmlItemRefs) {
        const idref = ref.getAttribute("idref");
        if (idref) spineIds.push(idref);
      }
    } else {
      const refMatches = opfText.matchAll(/<itemref\b[^>]*\bidref=["']([^"']+)["']/gi);
      for (const m of refMatches) {
        if (m[1]) spineIds.push(m[1]);
      }
    }

    // 4. Parse TOC labels mapped by resolved zip path (toc.ncx & toc.xhtml)
    const tocLabelByZipPath: Record<string, string> = {};
    const manifestValues = Object.values(manifestMap);

    const ncxItem = manifestValues.find(
      (i) => i.mediaType === "application/x-dtbncx+xml" || i.href.toLowerCase().endsWith(".ncx")
    );
    if (ncxItem) {
      const ncxZipPath = resolveZipPath(opfDir, ncxItem.href);
      const ncxFile = findFileInZip(zip, ncxZipPath);
      if (ncxFile) {
        const ncxDir = ncxZipPath.includes("/")
          ? ncxZipPath.substring(0, ncxZipPath.lastIndexOf("/") + 1)
          : "";
        const ncxText = await ncxFile.async("text");
        const ncxDoc = parser.parseFromString(ncxText, "text/xml");
        const navPoints = Array.from(ncxDoc.getElementsByTagNameNS("*", "navPoint"));
        for (const np of navPoints) {
          const textEl = np.getElementsByTagNameNS("*", "text")[0];
          const contentEl = np.getElementsByTagNameNS("*", "content")[0];
          const label = (textEl?.textContent || "").trim();
          const src = contentEl?.getAttribute("src") || "";
          if (label && src) {
            const targetZipPath = resolveZipPath(ncxDir, src).toLowerCase();
            if (!tocLabelByZipPath[targetZipPath]) {
              tocLabelByZipPath[targetZipPath] = label;
            }
          }
        }
      }
    }

    const navItem = manifestValues.find(
      (i) => i.properties.includes("nav") || i.id.toLowerCase() === "toc"
    );
    if (navItem) {
      const navZipPath = resolveZipPath(opfDir, navItem.href);
      const navFile = findFileInZip(zip, navZipPath);
      if (navFile) {
        const navDir = navZipPath.includes("/")
          ? navZipPath.substring(0, navZipPath.lastIndexOf("/") + 1)
          : "";
        const navText = await navFile.async("text");
        const navDoc = parser.parseFromString(navText, "text/html");
        const anchors = Array.from(navDoc.querySelectorAll("a[href]"));
        for (const a of anchors) {
          const label = (a.textContent || "").trim();
          const href = a.getAttribute("href") || "";
          if (label && href) {
            const targetZipPath = resolveZipPath(navDir, href).toLowerCase();
            if (!tocLabelByZipPath[targetZipPath]) {
              tocLabelByZipPath[targetZipPath] = label;
            }
          }
        }
      }
    }

    // Build ordered list of candidate XHTML spine entries
    const orderedCandidates: Array<{
      id: string;
      href: string;
      zipPath: string;
      properties: string;
    }> = [];

    for (const id of spineIds) {
      const item = manifestMap[id];
      if (!item) continue;
      if (item.properties.includes("nav") || item.id.toLowerCase() === "toc") continue;
      const zipPath = resolveZipPath(opfDir, item.href);
      orderedCandidates.push({
        id: item.id,
        href: item.href,
        zipPath,
        properties: item.properties,
      });
    }

    if (orderedCandidates.length === 0) {
      const htmlKeys = Object.keys(zip.files).filter((k) =>
        /\.(?:xhtml|html|htm)$/i.test(k)
      );
      for (const key of htmlKeys) {
        orderedCandidates.push({ id: key, href: key, zipPath: key, properties: "" });
      }
    }

    // Pass 1: Look for an explicit Introduction chapter/section
    const parsedSpineDocs: Array<{
      href: string;
      zipPath: string;
      docTitle: string;
      tocLabel: string;
      firstHeading: string;
      body: HTMLElement;
    }> = [];

    for (const cand of orderedCandidates) {
      if (SKIP_FRONTMATTER_HREF_REGEX.test(cand.href)) continue;

      const entryFile = findFileInZip(zip, cand.zipPath);
      if (!entryFile) continue;

      const rawXhtml = await entryFile.async("text");
      const htmlDoc = parser.parseFromString(decodeHtmlEntities(rawXhtml), "text/html");
      const body = htmlDoc.body;
      if (!body) continue;

      const docTitle = (htmlDoc.querySelector("title")?.textContent || "").trim();
      const tocLabel = tocLabelByZipPath[cand.zipPath.toLowerCase()] || "";
      const firstHeadingEl = body.querySelector("h1, h2, h3");
      const firstHeading = (firstHeadingEl?.textContent || "").replace(/\s+/g, " ").trim();

      parsedSpineDocs.push({
        href: cand.href,
        zipPath: cand.zipPath,
        docTitle,
        tocLabel,
        firstHeading,
        body,
      });

      const isExplicitIntroMeta =
        INTRO_HEADING_REGEX.test(docTitle) ||
        INTRO_HEADING_REGEX.test(tocLabel) ||
        INTRO_FILENAME_REGEX.test(cand.href) ||
        INTRO_FILENAME_REGEX.test(cand.id);

      const hasIntroHeadingInside = Array.from(
        body.querySelectorAll("h1, h2, h3, h4, p, div")
      ).some((el) => isIntroHeadingElement(el));

      if (isExplicitIntroMeta || hasIntroHeadingInside) {
        const nodes = extractIntroNodesFromBody(body, !isExplicitIntroMeta);
        const cleanedHtml = cleanExtractedNodesToHtml(nodes);
        const plainLen = cleanedHtml.replace(/<[^>]*>/g, "").trim().length;

        if (plainLen >= 20) {
          return {
            fileName: file.name,
            epubTitle,
            epubAuthor,
            cleanTitleFromFile,
            introHtml: cleanedHtml,
            status: "success",
          };
        }
      }
    }

    // Pass 2: Check pre-Chapter-1 prose section (e.g. untitled Introduction before Chapter 1)
    for (const item of parsedSpineDocs) {
      const combinedLabel = `${item.tocLabel} ${item.firstHeading} ${item.docTitle}`.trim();

      // Stop scanning once we hit Chapter 1 / Part 1 / Lesson 1
      if (
        CHAPTER_BOUNDARY_REGEX.test(item.tocLabel) ||
        CHAPTER_BOUNDARY_REGEX.test(item.firstHeading) ||
        CHAPTER_BOUNDARY_REGEX.test(item.docTitle)
      ) {
        break;
      }

      if (
        SKIP_FRONTMATTER_TITLE_REGEX.test(item.tocLabel) ||
        SKIP_FRONTMATTER_TITLE_REGEX.test(item.firstHeading) ||
        SKIP_FRONTMATTER_TITLE_REGEX.test(item.docTitle) ||
        CONCLUSION_BOUNDARY_REGEX.test(combinedLabel)
      ) {
        continue;
      }

      const nodes = extractIntroNodesFromBody(item.body, false);
      const cleanedHtml = cleanExtractedNodesToHtml(nodes);
      const plainText = cleanedHtml.replace(/<[^>]*>/g, "").trim();

      // Must contain real prose (not just a short title/author page)
      if (plainText.length >= 120 && !plainText.includes("***********")) {
        return {
          fileName: file.name,
          epubTitle,
          epubAuthor,
          cleanTitleFromFile,
          introHtml: cleanedHtml,
          status: "success",
        };
      }
    }

    return {
      fileName: file.name,
      epubTitle,
      epubAuthor,
      cleanTitleFromFile,
      introHtml: "",
      status: "empty",
      message: "Không tìm thấy phần Introduction trong file EPUB này.",
    };
  } catch (err: any) {
    console.error("Error extracting intro from EPUB:", file.name, err);
    return {
      fileName: file.name,
      epubTitle: "",
      epubAuthor: "",
      cleanTitleFromFile,
      introHtml: "",
      status: "error",
      message: err?.message || "File EPUB bị lỗi hoặc không đọc được.",
    };
  }
};
