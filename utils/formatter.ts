/**
 * Utility functions for cleaning, formatting, and processing HTML text.
 */

export const DEFAULT_AI_PHRASES = [
  "certainly",
  "ready for chapter",
  "just say",
  "would you like to continue",
  "absolutely",
  "here is a comprehensive",
  "congratulations! by reaching this point",
  "please confirm",
  "next steps:",
  "thank you for your confirmation",
  "end of chapter",
  "next up",
  "in the next chapter",
  "ready for more",
  "continue to chapter",
  "here is chapter",
  "ready to begin",
  "would you like me to continue",
  "bạn có muốn tiếp tục với chapter",
  "dưới đây là chapter",
  "in the final chapter",
  "tôi sẽ tiếp tục với chapter",
  "nếu bạn muốn tiếp tục với chapter",
  "would you like to sê a sample chapter",
  "would you like to see a sample chapter",
  "1000 words",
  "1000+ words",
  "1100 words",
  "1200 words",
  "1300 words",
  "1400 words",
  "1500 words",
  "1600 words",
  "1700 words",
  "1800 words",
  "1900 words",
  "2000 words",
  "would you like to",
  "ready for next chapter",
  "would you like to continue to the next chapter",
  "would you like to proceed",
  "if you need additional",
  "if you need additional revisions",
  "the story continue",
  "if you need further assistance",
  "want to explore more topics",
  "if you approve this introduction",
  "are you ready? take the next step",
  "continue",
];

export interface FormatResult {
  cleanedHtml: string;
  introductionText: string;
  detectedChapters: string[];
}

/**
 * Parses the raw HTML content from AI Chat, filters out unwanted AI meta statements,
 * removes duplicate headings, formats headers, and identifies structure.
 */
export const cleanAndFormatHtml = (
  html: string,
  chapterKeywords: string,
  customBlockPhrases: string
): FormatResult => {
  if (typeof window === "undefined") {
    return { cleanedHtml: html, introductionText: "", detectedChapters: [] };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const vietnameseRegex = /[àáãạảăắằẳẵặâấầẩẫậèéẹẻẽêềếểễệđìíĩỉịòóõọỏôốồổỗộơớờởỡợùúũũụủưứừửữựỳýỹỷỵ]/i;

  const userPhrases = customBlockPhrases
    .split("\n")
    .map((p) => p.trim().toLowerCase())
    .filter((p) => p.length > 0);
  const allAiPhrases = [...DEFAULT_AI_PHRASES, ...userPhrases];

  const chapterRegexStr = chapterKeywords
    .split(",")
    .map((k) => k.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .filter((k) => k.length > 0)
    .join("|") || "chapter";
  const chapterRegex = new RegExp(`^(${chapterRegexStr})\\s+\\d+`, "i");

  const allElementsArr = Array.from(doc.body.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li"));

  let hasSeenIntro = false;
  let hasSeenChapter = false;
  let lastConclusionElement: Element | null = null;

  // Find the last conclusion element
  for (let i = allElementsArr.length - 1; i >= 0; i--) {
    const el = allElementsArr[i];
    const text = el.textContent?.trim() || "";
    if (!text) continue;
    const lowerText = text.toLowerCase();
    const wordCount = text.split(/\s+/).length;

    if (el.tagName !== "LI" && /^(conclusion|kết luận)\b/i.test(lowerText) && wordCount < 15) {
      lastConclusionElement = el;
      break;
    }
  }

  // Pre-pass: Filter duplicate chapter headings
  const chapterCandidates: { el: Element; prefix: string }[] = [];
  allElementsArr.forEach((el) => {
    const text = el.textContent?.trim() || "";
    const lowerText = text.toLowerCase();
    const wordCount = text.split(/\s+/).length;
    if (el.tagName !== "LI" && chapterRegex.test(lowerText) && wordCount < 30) {
      const match = lowerText.match(chapterRegex);
      if (match) {
        chapterCandidates.push({ el, prefix: match[0].trim() });
      }
    }
  });

  const duplicateChaptersToRemove = new Set<Element>();
  for (let i = 0; i < chapterCandidates.length - 1; i++) {
    if (chapterCandidates[i].prefix === chapterCandidates[i + 1].prefix) {
      duplicateChaptersToRemove.add(chapterCandidates[i].el);
    }
  }

  allElementsArr.forEach((el) => {
    const text = el.textContent?.trim() || "";
    const lowerText = text.toLowerCase();

    if (!text) return;

    // Filter out Vietnamese content if any
    if (vietnameseRegex.test(text)) {
      el.remove();
      return;
    }

    // Filter out AI sentences
    const hasAiPhrase = allAiPhrases.some((phrase) => lowerText.includes(phrase));
    if (hasAiPhrase) {
      el.remove();
      return;
    }

    if (duplicateChaptersToRemove.has(el)) {
      el.remove();
      return;
    }

    const wordCount = text.split(/\s+/).length;
    const isHeadingCandidate = wordCount < 15;

    const isChapterHeading = el.tagName !== "LI" && chapterRegex.test(lowerText) && wordCount < 30;
    if (isChapterHeading) {
      hasSeenChapter = true;
    }

    let isMainIntro = false;
    if (el.tagName !== "LI" && /^(introduction|giới thiệu|lời nói đầu)\b/i.test(lowerText) && isHeadingCandidate) {
      if (!hasSeenIntro && !hasSeenChapter) {
        isMainIntro = true;
        hasSeenIntro = true;
      }
    }

    let isMainConclusion = false;
    if (el === lastConclusionElement) {
      isMainConclusion = true;
    }

    const isIntroOrConclusion = isMainIntro || isMainConclusion;

    if (isChapterHeading || isIntroOrConclusion) {
      let headingEl = el;
      if (el.tagName !== "H1") {
        const h1 = doc.createElement("h1");
        h1.innerHTML = el.innerHTML;
        el.replaceWith(h1);
        headingEl = h1;
      }

      (headingEl as HTMLElement).style.textAlign = "center";
      (headingEl as HTMLElement).classList.add("page-break-before");
    }
  });

  // Remove horizontal rules
  doc.body.querySelectorAll("hr").forEach((hr) => hr.remove());

  // Remove empty paragraphs/breaks directly preceding headings to avoid extra blank pages
  doc.body.querySelectorAll(".page-break-before").forEach((heading) => {
    let prev = heading.previousElementSibling;
    while (prev) {
      const text = prev.textContent?.trim() || "";
      const tagName = prev.tagName;
      if (
        !text &&
        ["P", "DIV", "SPAN", "BR", "H2", "H3", "H4", "H5", "H6"].includes(tagName) &&
        !prev.querySelector("img, table")
      ) {
        const toRemove = prev;
        prev = prev.previousElementSibling;
        toRemove.remove();
      } else {
        break;
      }
    }
  });

  // Remove duplicate/excessive empty paragraphs
  const allChildren = Array.from(doc.body.children);
  let consecutiveEmpty = 0;
  for (const child of allChildren) {
    const text = child.textContent?.trim() || "";
    if (
      !text &&
      !child.querySelector("img, table, hr") &&
      ["P", "DIV", "SPAN", "BR"].includes(child.tagName)
    ) {
      consecutiveEmpty++;
      if (consecutiveEmpty > 1) {
        child.remove();
      }
    } else {
      consecutiveEmpty = 0;
    }
  }

  // Remove any H1 heading (Chapter, Intro, Conclusion) that has no content under it
  const h1Elements = Array.from(doc.body.querySelectorAll("h1"));
  h1Elements.forEach((h1) => {
    let hasContent = false;
    let next = h1.nextElementSibling;
    while (next && next.tagName !== "H1") {
      const text = next.textContent?.trim() || "";
      if (text.length > 0 || next.querySelector("img, table")) {
        hasContent = true;
        break;
      }
      next = next.nextElementSibling;
    }
    if (!hasContent) {
      h1.remove();
    }
  });

  // Extract Introduction text
  let isRecordingIntro = false;
  let hasFinishedIntro = false;
  const extractedIntro: string[] = [];
  const cleanedNodes = Array.from(doc.body.children);

  for (const el of cleanedNodes) {
    const text = el.textContent?.trim() || "";
    const lower = text.toLowerCase();

    if (chapterRegex.test(lower)) {
      isRecordingIntro = false;
      hasFinishedIntro = true;
    } else if (
      /introduction/i.test(lower) &&
      text.split(/\s+/).length < 15 &&
      !hasFinishedIntro &&
      !isRecordingIntro
    ) {
      isRecordingIntro = true;
    } else if (isRecordingIntro && text) {
      extractedIntro.push(el.outerHTML);
    }
  }

  const detectedChapters = Array.from(doc.body.querySelectorAll(".page-break-before"))
    .map((el) => el.textContent?.trim() || "")
    .filter((text) => text.length > 0);

  return {
    cleanedHtml: doc.body.innerHTML,
    introductionText: extractedIntro.join(""),
    detectedChapters,
  };
};

/**
 * Prepares the editor's HTML structure for export by styling fonts, font sizes, titles,
 * tables, headers, and adding page break pages.
 */
export const getProcessedHtml = (
  editorHtml: string,
  title1: string,
  title2: string,
  author: string
): string => {
  if (typeof window === "undefined") return editorHtml;

  const parser = new DOMParser();
  const doc = parser.parseFromString(editorHtml, "text/html");

  const allElements = doc.body.querySelectorAll("*");
  allElements.forEach((el) => {
    const hElement = el as HTMLElement;
    hElement.style.fontFamily = "Times New Roman";
    hElement.style.color = "#000000";

    if (hElement.style.textAlign === "center" || hElement.getAttribute("data-text-align") === "center") {
      hElement.style.textAlign = "center";
    }

    if (hElement.tagName === "H1") {
      hElement.style.fontSize = "18pt";
      hElement.style.fontWeight = "bold";
      hElement.style.marginTop = "24pt";
      hElement.style.marginBottom = "12pt";
    } else if (hElement.tagName === "P" || hElement.tagName === "SPAN") {
      hElement.style.fontSize = "13pt";
      hElement.style.lineHeight = "1.5";
      hElement.style.marginBottom = "10pt";
    } else if (hElement.tagName === "TABLE") {
      hElement.style.borderCollapse = "collapse";
      hElement.style.width = "100%";
      hElement.setAttribute("border", "1");
    } else if (hElement.tagName === "TD" || hElement.tagName === "TH") {
      hElement.style.border = "1px solid black";
      hElement.style.padding = "5px";
    }
  });

  const h1Elements = doc.body.querySelectorAll("h1");
  h1Elements.forEach((el) => {
    if (el.previousElementSibling) {
      const pageBreakDiv = doc.createElement("div");
      pageBreakDiv.className = "page-break";
      pageBreakDiv.style.pageBreakAfter = "always";
      el.parentNode?.insertBefore(pageBreakDiv, el);
    }
  });

  let processedHtml = doc.body.innerHTML;
  processedHtml = processedHtml.replace(
    /font-family:\s*(&quot;|"|')?Times New Roman(&quot;|"|')?/gi,
    "font-family: Times New Roman"
  );

  if (title1 || title2 || author) {
    const titlePageHtml = `
      <div style="text-align: center; margin-top: 100pt; margin-bottom: 50pt; color: #000000;">
        ${title1 ? `<p style="font-family: Times New Roman; font-size: 30pt; font-weight: bold; text-align: center; margin: 0; color: #000000;">${title1}</p>` : ""}
        ${title1 && title2 ? `<p style="font-family: Times New Roman; font-size: 24pt; text-align: center; margin: 20pt 0; color: #000000;">***************************</p>` : ""}
        ${title2 ? `<p style="font-family: Times New Roman; font-size: 30pt; font-weight: bold; text-align: center; margin: 0; color: #000000;">${title2}</p>` : ""}
      </div>
      ${Array(18).fill("<br/>").join("")}
      <div style="text-align: center; color: #000000;">
        ${author ? `<p style="font-family: Times New Roman; font-size: 20pt; font-weight: bold; text-align: center; margin: 0; color: #000000;"><u>${author}</u></p>` : ""}
      </div>
      <div class="page-break" style="page-break-after: always;"></div>
    `;
    processedHtml = titlePageHtml + processedHtml;
  }

  return processedHtml;
};
