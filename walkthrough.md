# Nhật ký Triển khai & Xác minh Tính năng Đồng bộ Thẻ Google Sheet, Kéo thả Ảnh Bìa, Định dạng Tên File EPUB & Thay ảnh bìa EPUB hàng loạt

Hệ thống `boofor` đã được hoàn thiện nâng cấp các tính năng tiện ích xử lý:

1. **Sửa lỗi tự động nhận diện tên tác giả (Dynamic Author Name Extraction)**:
   - **Hiện tượng**: Khi người dùng dán dòng dữ liệu Google Sheet vào công cụ Splitter và chọn các format khác nhau (như `DEV` trong ví dụ), hệ thống tự động nhận diện sai tên tác giả thành số SSN (Ví dụ: `560877002`), đồng thời đặt tên cho Tab làm việc và trường "Tác giả đang làm" là chuỗi SSN này thay vì tên thực tế (`Marcia Owens`). Nguyên nhân là do trong `useBookState.ts` có một `useEffect` được cấu hình cứng để lấy giá trị cột thứ 10 (`columns[9]`) của dòng dữ liệu làm tên tác giả mà không quan tâm đến format được chọn.
   - **Giải pháp**:
     - Gỡ bỏ `useEffect` cấu hình cứng ở `useBookState.ts`.
     - Chuyển logic tự động nhận diện tên tác giả vào `SplitterTab.tsx` và truyền hàm `setAuthor` xuống dưới dạng một Prop.
     - Viết thuật toán tìm kiếm động: Quét danh sách cấu hình các trường (`fields`) của format đang hoạt động (`activeFormat`). Hệ thống sẽ tìm kiếm trường được định nghĩa là **`NAME`** (ưu tiên chính xác tuyệt đối chữ "NAME" không phân biệt hoa thường), sau đó đến các trường có nhãn `"HỌ TÊN"`, `"TÊN"` hoặc `"NAME ADD"` rồi cuối cùng là chứa chữ `"NAME"`.
     - Đọc giá trị tại chỉ số cột `colIndex` tương ứng của trường tìm được để cập nhật chính xác tên tác giả (Ví dụ: Lấy `columns[6]` là `Marcia Owens` trong cấu hình format `DEV` thay vì lấy nhầm SSN ở cột 8).
     - Giúp đồng bộ hóa ngay lập tức tên Tab và mục "Tác giả đang làm" khớp chuẩn xác với tên người thật.
2. **Khắc phục lỗi NotFoundError khi thay ảnh bìa hàng loạt**:
   - **Giải pháp**: Ngay khi tệp EPUB được kéo thả hoặc tải lên thành công, hệ thống lập tức đọc toàn bộ dữ liệu nhị phân thành `ArrayBuffer` và khởi tạo đối tượng `JSZip` lưu trữ trực tiếp trong bộ nhớ RAM (`epubItems`), loại bỏ 100% nguy cơ xảy ra lỗi `NotFoundError` do mất File Handle.
3. **Xuất toàn bộ Introduction ra file Word (.docx) giữ nguyên định dạng gốc**:
   - Tích hợp nút **Xuất tất cả Intro (.docx)** mới, gộp tất cả Introduction đã trích xuất thành tệp Word với các cuốn sách được tự động phân tách bằng ngắt trang (Page Break), tiêu đề in đậm lớn màu xanh dương có gạch chân trang trọng: `SÁCH: [Tên Sách]`.
   - Sử dụng bộ giải mã thực thể `decodeHtmlEntities` xử lý toàn bộ các mã thực thể số thập phân và thập lục phân (Ví dụ: `&#x2014;` thành em-dash `—`, `&apos;` hay `&#x2019;` thành dấu nháy `'` / `’`, `&#x201c;` / `&#x201d;` thành dấu ngoặc kép `“` / `”`), loại bỏ hoàn toàn các ký tự bị gạch chân báo lỗi trong Word.
   - Loại bỏ hiện tượng lặp lại tiêu đề "Introduction" do không chèn thêm tiêu đề trùng lắp ở đầu sách.
4. **Tính năng thay ảnh bìa EPUB hàng loạt (Batch EPUB Cover Replacer)**:
   - Cho phép người dùng thay nhanh ảnh bìa của một loạt file EPUB đã có sẵn bằng các ảnh bìa mới. Hệ thống tự đối khớp thông minh và xuất tệp ZIP đầu ra `EPUB_Da_Thay_Bia.zip`.
5. **Định dạng Tên File EPUB khi xuất bản đơn lẻ (EPUB Export Filename Format)**:
   - Khi xuất file EPUB tải về máy, tên file sẽ có dạng `[Tên Sách]-[Tên Tác Giả].epub` (Ví dụ: `Bright Personal Growth Plan-Monica Gomez.epub`).
6. **Hỗ trợ Kéo thả Ảnh Bìa Sách trực tiếp (Drag & Drop Cover Upload)**:
   - Hỗ trợ kéo thả file ảnh bìa trực tiếp vào ô nét đứt ở panel "Thông tin Trang Bìa" và tự động nén chất lượng lưu trữ.
7. **Tự động Đồng bộ hóa khi Load trang / Chuyển Tab / Đổi Email (Auto-sync on Load)**:
   - Tự động gọi API đồng bộ hóa dọn dẹp thẻ rác ngay khi tải trang, đổi email mục tiêu hoặc đổi tab làm việc.
8. **Tính năng Áp dụng lại Thông tin đã Chia sẻ vào Workspace (Apply Shared Author Data)**:
   - **Mô tả**: Cho phép người gửi thông tin tác giả bấm nút **"Áp dụng vào Workspace"** trong modal xem chi tiết lượt chia sẻ (`ViewSharedModal`) hoặc nhấp trực tiếp vào badge số lượt chia sẻ `[Share2] N` trên Tab tác giả.
   - **Cách hoạt động**: Khi bấm nút, hệ thống sẽ gọi `state.importSharedAuthor` để tạo mới/nạp lại toàn bộ dữ liệu tác giả (bao gồm Danh sách sách, Thể loại, Introductions, Từ khóa Chapter, Cụm từ chặn tùy chỉnh) vào Workspace để người gửi có thể tiếp tục làm việc mà **HOÀN TOÀN GIỮ NGUYÊN** trạng thái và lịch sử chia sẻ cho người nhận.

---

## Các Thay đổi đã Thực hiện

### 1. Thay đổi Code Frontend

#### [useBookState.ts](file:///c:/Users/trong/Downloads/Code/boofor/hooks/useBookState.ts)
- Gỡ bỏ `useEffect` đồng bộ cứng `columns[9]` của `splitterInput`.

#### [page.tsx](file:///c:/Users/trong/Downloads/Code/boofor/app/page.tsx)
- Truyền `setAuthor={state.setAuthor}` vào component `SplitterTab`.
- Thêm handler `handleApplySentShare` nạp dữ liệu tác giả chia sẻ vào Workspace bằng `state.importSharedAuthor`.
- Truyền `onViewShares={handleOpenViewShares}` vào `AuthorTabs`.
- Truyền `onApplyShare={handleApplySentShare}` vào `ViewSharedModal`.

#### [SplitterTab.tsx](file:///c:/Users/trong/Downloads/Code/boofor/components/tabs/SplitterTab.tsx)
- Định nghĩa thêm prop `setAuthor` trong `SplitterTabProps`.
- Thêm `useEffect` phân tích động cấu hình format đang hoạt động và cập nhật giá trị cột `NAME` vào state của tác giả chính xác.

#### [ViewSharedModal.tsx](file:///c:/Users/trong/Downloads/Code/boofor/components/common/ViewSharedModal.tsx)
- Thêm prop `onApplyShare?: (share: any) => void`.
- Thêm nút **"Áp dụng vào Workspace"** với icon `Download` cho từng bản ghi dữ liệu đã chia sẻ.

#### [AuthorTabs.tsx](file:///c:/Users/trong/Downloads/Code/boofor/components/common/AuthorTabs.tsx)
- Thêm prop `onViewShares?: (authorName: string) => void`.
- Chuyển badge số lượt chia sẻ `[Share2] N` thành button có hiệu ứng hover & nhấp chuột để mở nhanh chi tiết và nạp lại dữ liệu.

---

## Kết quả Kiểm tra & Biên dịch

- **TypeScript compilation check**: Quá trình biên dịch tĩnh (`npx tsc --noEmit`) đã chạy thành công 100% không có bất kỳ lỗi cú pháp hay kiểu dữ liệu nào.
- **Production Build check**: Lệnh `npm run build` đã biên dịch thành công 100% không phát sinh lỗi cú pháp hay lỗi kiểu TypeScript.
