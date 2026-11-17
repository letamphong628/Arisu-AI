<div align="center">
  <img src="./Arisu.png" alt="Tendou Arisu AI" width="120" style="border-radius: 24px;" />
  <h1>㉿ Tendou Arisu AI v4.0 — Kali Linux Terminal (Agent & Roleplay OS)</h1>
  <p><b>AI Agent Hỗ Trợ Máy Tính &amp; Roleplay Tendou Arisu (Blue Archive) • Đa Nền Tảng (Windows / Linux / macOS) • Chạy Độc Lập Offline &amp; Online</b></p>
</div>

---

## 🎯 Mục tiêu & Ý tưởng của phần mềm (Tendou Arisu AI là gì?)

**Tendou Arisu AI v4.0** không chỉ là một Chatbot nhập vai thông thường, mà là sự kết hợp giữa **2 định hướng** trong một giao diện **Kali Linux Terminal**:

1. **🤖 Hướng Hiệu Suất (PC Assistant AI Agent + Tool Calling)**:
   - Biến **Tendou Arisu** thành một cô học sinh đáng tin cậy thuộc *Câu lạc bộ Phát triển Game (Millennium)* đồng hành và hỗ trợ trực tiếp cho Sensei trong quá trình sử dụng máy tính:
     - **Tìm & Mở Tài liệu nhanh**: Nhắn *"Tìm giúp thầy file README.md"* hoặc *"Mở giúp thầy tài liệu Báo cáo"* — Arisu tự động quét máy tính và mở file ngay lập tức.
     - **Đọc Tài liệu & Ghi chú Obsidian (`.md`)**: Nhắn *"Tóm tắt tài liệu X vào Note giúp thầy"* hoặc *"Note lại giúp thầy ý chính: ..."* — Arisu tự đọc file, rút trích các ý chính (Key Takeaways) và xuất ra file Markdown chuẩn **Obsidian Note** trong thư mục `notes/`.
     - **Đa phương thức (Multimodal File/Image)**: Hỗ trợ kéo thả hoặc đính kèm file văn bản, code, hình ảnh trực tiếp vào Terminal để Arisu phân tích.
     - **Kiểm tra tài nguyên hệ thống**: Kiểm tra nhanh mức sử dụng RAM, CPU, Uptime và Hệ điều hành.

2. **🌸 Hướng Full Roleplay Vui Vẻ (Neuro-Sama / Cute Companion Mode)**:
   - Tập trung 100% vào giá trị cảm xúc và độ đáng yêu của bé Arisu mà không cứng nhắc như một trợ lý ảo bách khoa.
   - Tích hợp **Góc Nhân Vật Arisu Tương Tác (Live Avatar + Vòng Halo Millennium chuyển động)**: Có thể bấm vào đầu Arisu để **Xoa đầu (Headpat)** nhận hiệu ứng trái tim, tăng chỉ số tình cảm và nghe **Âm thanh 8-bit JRPG ("Panpakapan~!") + Giọng nói TTS**.

---

## 🧠 Kiến trúc Bộ nhớ RAG & Ký ức gốc (Chống ảo giác - Anti-Hallucination)

- **Ký ức gốc (`arisu_lore.json` + `system_prompt.json`)**: Tích hợp sẵn toàn bộ cốt truyện gốc của Tendou Arisu (phế tích AL-1S, CLB Phát triển Game cùng Momoi, Midori, Yuzu, Kiếm Ánh Sáng Supernova, Key/Kei, Kivotos...).
- **Bộ nhớ Vô Hạn kết hợp RAG Retrieval**:
  - Lịch sử trò chuyện được lưu trữ **vô hạn** trên ổ cứng (`chat_memory.json`).
  - Khi đưa vào mô hình SLM/LLM, bộ **RAG Retriever** chỉ lọc lấy các dữ kiện quan trọng (tên gọi, sở thích, lời dặn của Sensei) + vài lượt thoại gần nhất để **không bao giờ vượt quá Context Window và ngăn chặn hiện tượng ảo giác (Hallucination)**.
- **Kiểm duyệt độ khớp khi Search mạng**: Chống hiện tượng "lú LLM" khi tổng hợp đa nguồn — chỉ nhận thông tin khớp chính xác với chủ đề câu hỏi.

---

## 💻 Hỗ trợ Đa Hệ Điều Hành (Windows • Linux • macOS)

Dự án hỗ trợ chạy ngay trên cả **Windows**, **Linux** và **macOS**:

### 1. Trên Windows
- Bấm đúp vào file **`Start-Arisu.bat`**.

### 2. Trên Linux (Kali Linux, Ubuntu, Debian, Arch, Fedora...)
- Mở Terminal tại thư mục dự án và chạy:
  ```bash
  chmod +x start-arisu.sh
  ./start-arisu.sh
  ```
  *(Script `start-arisu.sh` sẽ tự động kiểm tra và tải lõi `llama-server` bản địa cho Linux vào thư mục `./bin/` nếu chưa có, đồng thời mở giao diện Web App tự động).*

### 3. Trên macOS (Intel & Apple Silicon M1/M2/M3/M4)
- Bấm đúp vào file **`start-arisu.command`** (hoặc chạy `./start-arisu.sh` trong Terminal).

---

## ⌨️ Các lệnh & Kỹ năng Agent trong Terminal

Bạn chỉ cần **gõ nội dung bất kỳ** để trò chuyện hoặc giao việc cho Arisu, hoặc dùng các lệnh nhanh:

| Lệnh / Câu nhắn mẫu | Chức năng |
| :--- | :--- |
| `help` | Hiển thị bảng danh sách toàn bộ lệnh trong Terminal |
| `tools` / `agent` | Mở bảng điều khiển thử nhanh các **Kỹ năng AI Agent** (Tìm file, Tóm tắt Note Obsidian, Kiểm tra máy, Xoa đầu) |
| `mode` | Chuyển đổi nhanh giữa **🤖 Chế độ Agent Hiệu Suất** và **🌸 Chế độ Full Roleplay Vui Vẻ** |
| `find <tên file>` | Tìm tài liệu trong máy (hoặc nhắn: *"Tìm giúp thầy file ..."*) |
| `open <tên file>` | Tìm và mở trực tiếp tài liệu lên màn hình (hoặc nhắn: *"Mở giúp thầy file ..."*) |
| `note <nội dung>` | Lưu ghi chú hoặc tóm tắt tài liệu vào chuẩn **Obsidian Markdown (`notes/*.md`)** |
| `settings` | Mở bảng **Cài Đặt** sổ ra bên phải (bo 4 góc): Chỉnh Chế độ nhân cách, Âm thanh, Bộ nhớ RAG, Font, Màu, Cỡ chữ, Kích cỡ màn hình |
| `status` / `neofetch` | Xem thông tin Hệ điều hành, Model AI đang chạy, RAM/CPU và chỉ số RPG của Arisu |
| `reload` | Nạp lại file `system_prompt.json` ngay lập tức mà không cần khởi động lại |
| `clear` / `cls` | Xóa gọn màn hình hiển thị Terminal |
| `exit` / `quit` | Lưu tiến trình, tắt AI, đóng Web và **tự động thoát cửa sổ `.bat` / `.sh` đang chạy** |

---

## 🔧 Định hướng phát triển & Hướng dẫn đổi Model Gemma (Gemma 2 / Gemma 3 / Gemma 4)

Mình đang định làm thêm 1 dự án về A.I, sẽ dựa trên **Gemma** và có **`SYSTEM_PROMT`** (`system_prompt.json`) update trên GitHub theo từng phiên bản.

Tùy theo từng dòng máy, bạn có thể đổi dòng **Gemma** bằng cách:

1. Tải file **Gemma / AI** (`.gguf`) trên **https://huggingface.co/**
2. Copy file vào thư mục dự án và chỉnh file **`server.js`** trong thư mục dự án:
   - Thay dòng:
     ```javascript
     const MODEL_PATH = path.join(ROOT_DIR, 'gemma-2-2b-it-Q4_K_M.gguf');
     ```
   - Thành:
     ```javascript
     const MODEL_PATH = path.join(ROOT_DIR, '#FILE MODEL AI CỦA BẠN TẠI ĐÂY#');
     ```
   *(Ví dụ: Mặc định dự án đang có sẵn file `gemma-2` để tương thích cả các máy phổ thông, bạn có thể tải **Gemma 4** về và thay tên như hướng dẫn trên).*

---

## 💖 Lời cảm ơn đặc biệt (Special Thanks)

Xin gửi lời cảm ơn chân thành đến **Tunako** vì những góp ý cực kỳ tâm huyết và chi tiết giúp dự án nâng cấp lên phiên bản **v4.0**:
- Bổ sung launcher **`.sh` / `.command`** đa nền tảng cho **Linux & macOS**.
- Mở rộng từ Chatbot thuần túy sang **AI Agent có Tool Calling** (Tìm/mở tài liệu, tự động tóm tắt ghi chú vào **Obsidian Markdown**).
- Tách bạch 2 chế độ: *(Agent)** và **RP (ROLEPLAY)**.
- Nâng cấp **RAG Memory Retrieval** chống tràn Context Window / chống ảo giác (Hallucination) và bổ sung **Ký ức gốc (`arisu_lore.json`)**.
- Bổ sung **Góc nhân vật Arisu tương tác (Live2D Interactive)**, **Âm thanh RPG 8-bit & Giọng nói (TTS)** cùng hỗ trợ **Đa phương thức (Đính kèm File/Ảnh)**.
