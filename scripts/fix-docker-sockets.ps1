# Sửa lỗi Docker Desktop không khởi động được trên máy dev Windows này:
#   "rename ...\*.sock ...\*.sock.stale: The file cannot be accessed by the system"
# Docker Desktop để lại file Unix socket (AF_UNIX) sau lần tắt không sạch; Windows không xoá/đổi tên
# được từng file đó, nhưng ĐỔI TÊN CẢ THƯ MỤC CHA thì được, và Docker tự tạo thư mục mới
# (chi tiết: docs/progress/STATE.md mục Docker Desktop).
#
#   powershell -ExecutionPolicy Bypass -File scripts/fix-docker-sockets.ps1
#
# Thứ tự quan trọng (kiểm chứng 2026-09-30): phải TẮT HẾT tiến trình Docker trước. Bản Docker bị crash
# vẫn sống, đứng chờ ở hộp thoại lỗi và tạo lại socket ngay sau khi đổi tên thư mục → mở lại vẫn crash.
# Thư mục cũ thành `*.stale-<thời gian>` — xoá được bất cứ lúc nào sau khi Docker chạy lại.

$stamp = Get-Date -Format yyyyMMddHHmmss
$dirs = @("$env:LOCALAPPDATA\Docker\run", "$env:LOCALAPPDATA\docker-secrets-engine")

Get-Process "Docker Desktop", "com.docker.backend", "com.docker.build" -ErrorAction SilentlyContinue |
  Stop-Process -Force -Confirm:$false
Start-Sleep -Seconds 3

foreach ($d in $dirs) {
  if (Test-Path $d) {
    Rename-Item $d "$(Split-Path $d -Leaf).stale-$stamp"
    Write-Host "Đã đổi tên $d"
  }
}

Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
Write-Host "Đã mở Docker Desktop — đợi 'docker info' chạy được rồi 'docker compose up -d'."
