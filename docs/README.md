# Tài liệu LEARN Mobile

Mục lục. Chọn theo việc bạn đang cần làm.

## Tôi mới nhận dự án

| Thứ tự | Tài liệu | Nội dung |
| --- | --- | --- |
| 1 | [../README.md](../README.md) | App là gì, làm được gì, trạng thái hiện tại |
| 2 | [getting-started.md](getting-started.md) | Cài đặt, chạy app (API mock hoặc backend thật), xử lý sự cố |
| 3 | [architecture.md](architecture.md) | Cấu trúc, điều hướng, dữ liệu, phiên đăng nhập, giao diện |
| 4 | [development.md](development.md) | Lệnh, quy ước code, cách thêm màn / API / thư viện |

## Tôi cần làm một việc cụ thể

| Việc | Tài liệu |
| --- | --- |
| Làm giao diện không cần backend | [../mock-api/README.md](../mock-api/README.md) |
| Chạy kiểm thử, kiểm tra trên điện thoại thật | [testing.md](testing.md) |
| Build APK, cập nhật qua EAS, phát hành | [deployment.md](deployment.md) |
| Xây tính năng mới (STO, SRS, POM, ENG, SOC) | [requirements/SRS.md](requirements/SRS.md) |
| Hiểu vì sao giao diện đơn sắc dịu | [adr/001-don-sac-diu.md](adr/001-don-sac-diu.md) |

## Toàn bộ thư mục `docs/`

```text
docs/
├─ README.md               Mục lục này
├─ getting-started.md      Cài đặt và chạy
├─ architecture.md         Kiến trúc của app
├─ development.md          Quy ước và quy trình phát triển
├─ testing.md              Kiểm thử và checklist thiết bị thật
├─ deployment.md           Phát hành bằng EAS
├─ adr/                    Quyết định kiến trúc (Architecture Decision Records)
├─ requirements/
│  ├─ SRS.md               Đặc tả yêu cầu cho các tính năng mới (bản làm việc)
│  └─ SRS-v0.4.docx        Cùng nội dung ở dạng Word, để chia sẻ
├─ reports/
│  └─ bao-cao-ky-thuat.html  Báo cáo kỹ thuật về nền móng hiện có
└─ screenshots/            Ảnh dùng trong README
```

## Quy ước viết tài liệu

- Viết bằng tiếng Việt; tên lệnh, đường dẫn và thuật ngữ kỹ thuật giữ nguyên.
- Mỗi tài liệu có một việc: không lặp nội dung giữa các file, hãy liên kết.
- Khi đổi hành vi của app, cập nhật tài liệu liên quan **trong cùng commit**.
- Quyết định đáng nhớ thì ghi thành ADR mới (`adr/NNN-ten-ngan.md`): bối cảnh, quyết định, hệ quả.
  Không sửa ADR cũ; viết ADR mới thay thế nó.
- `requirements/SRS.md` là bản gốc; `SRS-v0.4.docx` chỉ là bản xuất. Sửa SRS thì sửa file `.md`.
