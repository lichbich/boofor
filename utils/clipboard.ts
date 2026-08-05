/**
 * Utility to copy text or HTML content to the system clipboard.
 */
export const copyToClipboard = async (
  text: string,
  onSuccess?: () => void,
  isHtml = false
): Promise<boolean> => {
  if (!text) return false;
  try {
    if (isHtml) {
      const blobHtml = new Blob([text], { type: "text/html" });
      const plainText = new DOMParser().parseFromString(text, "text/html").body.textContent || "";
      const blobText = new Blob([plainText], { type: "text/plain" });
      const data = [
        new ClipboardItem({
          "text/html": blobHtml,
          "text/plain": blobText,
        }),
      ];
      await navigator.clipboard.write(data);
    } else {
      await navigator.clipboard.writeText(text);
    }
    if (onSuccess) onSuccess();
    return true;
  } catch (err) {
    console.error("Clipboard copy failed, trying fallback:", err);
    try {
      if (isHtml) {
        const plainText = new DOMParser().parseFromString(text, "text/html").body.textContent || "";
        await navigator.clipboard.writeText(plainText);
      } else {
        await navigator.clipboard.writeText(text);
      }
      if (onSuccess) onSuccess();
      return true;
    } catch (fallbackErr) {
      console.error("Fallback clipboard copy failed:", fallbackErr);
      return false;
    }
  }
};
