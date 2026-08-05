export interface BookItem {
  id: string;
  title: string;
  price: string;
  ggkey: string;
  author: string;
  rawLines: string[];
}

export const SAMPLE_DATA = `English and Malay Speech for School and Study
GGKEY:HX3W66EWKDK
Byron Leo Syn
May 26, 2026	Ebook	$2.00

Advanced TypeScript Programming Handbook
GGKEY:TS99X20P329
Dr. Elizabeth Vance
Oct 14, 2025	Ebook	$15.99

The Silent Waves of Mekong Delta
GGKEY:VN77R112A09
Nguyen Van Nam
Jan 02, 2026	Ebook	Free`;

export const SAMPLE_WAREHOUSE = `English and Malay Speech for School and Study
Advanced TypeScript Programming Handbook
The Silent Waves of Mekong Delta
Cẩm nang quản lý nhân sự hiệu quả (Cuốn này chưa đăng!)
Bí quyết giao tiếp cho học sinh sinh viên (Cuốn này cũng chưa có!)`;

// Kiểm tra xem dòng có phải là rác hoặc thừa từ Google Play Partner Center không
export const isNoiseLine = (line: string): boolean => {
  const trimmed = line.trim();
  if (!trimmed) return false;

  // Ảnh bìa sách
  if (/book\s*cover/i.test(trimmed)) return true;
  if (/cover\s*image/i.test(trimmed)) return true;
  if (/^cover$/i.test(trimmed)) return true;
  if (/^bìa(\s+sách)?$/i.test(trimmed)) return true;
  if (/^ảnh\s+bìa/i.test(trimmed)) return true;

  // Trạng thái sách trong Play Books
  if (/^needs\s+action$/i.test(trimmed)) return true;
  if (/^action\s+required$/i.test(trimmed)) return true;
  if (/^needs\s+translation$/i.test(trimmed)) return true;
  if (/^in\s+review$/i.test(trimmed)) return true;
  if (/^gộp(\s+sách)?$/i.test(trimmed)) return true;
  if (/^cần\s+xử\s+lý$/i.test(trimmed)) return true;

  // Nút điều hướng hoặc thông tin phân trang
  if (/^books\s+per\s+page/i.test(trimmed)) return true;
  if (/^showing\s+\d+\s+of\s+/i.test(trimmed)) return true;
  if (/^\d+\s*-\s*\d+\s+of\s+\d+/i.test(trimmed)) return true;
  if (/^add\s+book$/i.test(trimmed)) return true;
  if (/^advanced\s+options$/i.test(trimmed)) return true;
  if (/^search/i.test(trimmed)) return true;

  // Tiêu đề cột của bảng
  if (/^title$/i.test(trimmed)) return true;
  if (/^author$/i.test(trimmed)) return true;
  if (/^last\s+updated$/i.test(trimmed)) return true;
  if (/^list\s+price$/i.test(trimmed)) return true;
  if (/^status$/i.test(trimmed)) return true;
  if (/^tiêu\s+đề$/i.test(trimmed)) return true;
  if (/^tác\s+giả$/i.test(trimmed)) return true;

  return false;
};

// Hàm bóc tách dòng văn bản thô thành danh sách các cuốn sách
export const parsePlayBooksText = (rawText: string): BookItem[] => {
  if (!rawText.trim()) return [];

  const lines = rawText.split(/\r?\n/).map(l => l.trim());
  
  // Bước 1: Loại bỏ hoàn toàn các dòng rác thừa
  const cleanLines = lines.filter(line => line.length > 0 && !isNoiseLine(line));

  const books: BookItem[] = [];

  // Tìm tất cả vị trí (chỉ số) của các mã GGKEY
  const ggkeyIndices: number[] = [];
  cleanLines.forEach((line, index) => {
    if (/GGKEY:/i.test(line)) {
      ggkeyIndices.push(index);
    }
  });

  if (ggkeyIndices.length > 0) {
    // Bước 2: Phân tích dựa trên vị trí neo GGKEY (Mỗi cuốn sách sẽ có Tiêu đề ngay phía trước dòng GGKEY!)
    ggkeyIndices.forEach((keyIdx, i) => {
      const titleIdx = keyIdx - 1;
      if (titleIdx < 0) return; // Đóng vai trò bảo vệ an toàn danh mục

      const title = cleanLines[titleIdx];
      const ggkeyLine = cleanLines[keyIdx];

      // Lấy mã khóa GGKEY thô
      const keyMatch = ggkeyLine.match(/GGKEY:([A-Z0-9]+)/i);
      const ggkey = keyMatch ? keyMatch[1] : ggkeyLine.replace(/GGKEY:\s*/i, '');

      // Toàn bộ dòng từ sau GGKEY hiện tại tới trước Tiêu đề của cuốn tiếp theo được tính là Metadata của cuốn này
      const nextKeyIdx = ggkeyIndices[i + 1];
      const endMetadataIdx = nextKeyIdx !== undefined ? nextKeyIdx - 2 : cleanLines.length - 1;

      const metadataLines: string[] = [];
      for (let m = keyIdx + 1; m <= endMetadataIdx; m++) {
        metadataLines.push(cleanLines[m]);
      }

      // Tìm kiếm giá tiền trong metadata của cuốn sách
      let price = '';
      const priceRegex = /([\$\£\€\¥\₫]\s*\d+(?:[.,]\d+)?)|(\d+(?:[.,]\d+)?\s*[\$\£\€\¥\₫\bđ\b])|(\bFree\b)|(\bMiễn\s+phí\b)/i;

      for (const metaLine of metadataLines) {
        const match = metaLine.match(priceRegex);
        if (match) {
          price = match[0].trim();
          break;
        }
      }

      // Thử tìm theo hàng tab có giá trị cuối: May 26, 2026 Ebook $2.05
      if (!price && metadataLines.length > 0) {
        const lastMeta = metadataLines[metadataLines.length - 1];
        const parts = lastMeta.split(/[\t\s]+/);
        const lastPart = parts[parts.length - 1];
        if (priceRegex.test(lastPart) || /\d/.test(lastPart)) {
          price = lastPart;
        }
      }

      // Tìm kiếm tên tác giả (Dòng thường nằm giữa GGKEY và dòng tiền tệ/định dạng)
      let author = '';
      const formatRegex = /ebook|sách giấy|paperback/i;
      const authorCandidates = metadataLines.filter(line => 
        !priceRegex.test(line) && 
        !formatRegex.test(line) && 
        !/[A-Za-z]+\s+\d{1,2},\s+\d{4}/.test(line) // Đọc dòng chứa ngày tháng
      );
      if (authorCandidates.length > 0) {
        author = authorCandidates[0];
      }

      books.push({
        id: `book-${i}-${Date.now()}`,
        title,
        price: price || 'Free', // Mặc định là Free nếu Google không hiện giá bán lẻ
        ggkey,
        author: author || 'Không rõ',
        rawLines: [title, ggkeyLine, ...metadataLines]
      });
    });
  } else {
    // Cách phân tích dự phòng: Nếu dán văn bản thô dạng tự do không có mã GGKEY
    const doubleNewlineBlocks = rawText.split(/\r?\n\r?\n+/).map(b => b.trim()).filter(Boolean);
    doubleNewlineBlocks.forEach((block, idx) => {
      const blockLines = block.split(/\r?\n/).map(l => l.trim()).filter(line => line.length > 0 && !isNoiseLine(line));
      if (blockLines.length > 0) {
        const title = blockLines[0];
        let price = 'Free';
        
        blockLines.forEach(l => {
          const match = l.match(/([\$\£\€\¥\₫]\s*\d+(?:[.,]\d+)?)|(\bFree\b)|(\bMiễn\s+phí\b)/i);
          if (match) {
            price = match[0].trim();
          }
        });

        books.push({
          id: `fallback-${idx}-${Date.now()}`,
          title,
          price,
          ggkey: 'Không có',
          author: 'Không rõ',
          rawLines: blockLines
        });
      }
    });
  }

  return books;
};

// Bóc tách danh mục sách trong kho được người dùng nhập vào
export const parseWarehouseText = (warehouseText: string): string[] => {
  if (!warehouseText.trim()) return [];
  return warehouseText
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0 && !isNoiseLine(line))
    .map(line => line.replace(/^\d+[\.\)]\s*/, "").trim()); // Lọc bỏ số thứ tự ở đầu dòng (ví dụ: "1. Tên sách" -> "Tên sách")
};

// So sánh đối chiếu tìm những cuốn từ trong kho bị THIẾU trên Google Play (parsedBooks)
export const compareBooks = (
  warehouseBooks: string[],
  parsedBooks: BookItem[]
): { missing: string[]; matchedCount: number; unmatchedCount: number } => {
  if (warehouseBooks.length === 0) {
    return {
      missing: [],
      matchedCount: 0,
      unmatchedCount: 0
    };
  }

  // Tiền xử lý xóa ký tự đặc biệt, viết thường để đối sánh thông minh
  const normalizeString = (str: string) => {
    return str
      .toLowerCase()
      .replace(/[.,\-\/#!$%\^&\*;:{}=\-_`~()]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const googlePlayTitles = parsedBooks.map(b => normalizeString(b.title));

  // Tìm những tiêu đề trong kho mà không có tiêu đề Google Play tương tự
  const missing = warehouseBooks.filter(warehouseBook => {
    const normalizedW = normalizeString(warehouseBook);
    
    // Kiểm tra xem tiêu đề sách kho có nằm trong hoặc tương thích với bất kỳ tiêu đề sách nào trên Play Books không
    const isFound = googlePlayTitles.some(playTitle => {
      return playTitle === normalizedW || playTitle.includes(normalizedW) || normalizedW.includes(playTitle);
    });

    return !isFound;
  });

  return {
    missing,
    matchedCount: warehouseBooks.length - missing.length,
    unmatchedCount: missing.length
  };
};
