# DEPLOY.md — Chạy LEARN (web + API + app mobile) trên một server AWS EC2

Kiến trúc và lý do: ADR 017. Một máy EC2 chạy tất cả bằng Docker Compose; web và app mobile dùng
chung `https://<domain>`.

```
Internet :443 ─ Caddy ─┬─ /api/*              → api      (web + app mobile)
                       ├─ /learn-documents/*  → minio    (tải tài liệu lên)
                       └─ /*                  → web
            nội bộ: postgres · redis · minio · worker   (không mở cổng ra ngoài)
```

## 0. Thử trên máy dev trước (không tốn tiền AWS)

```bash
cp .env.prod.example .env.prod      # DOMAIN=localhost, APP_URL/S3_PUBLIC_ENDPOINT=https://localhost:8443,
                                    # HTTP_PORT=8080, HTTPS_PORT=8443 (Windows hay chiếm cổng 80)
docker compose -f infra/docker-compose.prod.yml --env-file .env.prod up -d --build
docker compose -f infra/docker-compose.prod.yml --env-file .env.prod run --rm migrate npm run db:seed -w packages/db
curl -k https://localhost:8443/api/v1/health
```

Với `DOMAIN=localhost`, Caddy dùng chứng chỉ nội bộ (trình duyệt cảnh báo — bình thường). Máy dev
Windows đang chạy compose dev thì dừng trước (`docker compose -f infra/docker-compose.yml down`),
tránh đụng cổng.

## 1. Tạo máy EC2 (bạn tự làm trên AWS Console)

| Mục            | Chọn                                                                                                     |
| -------------- | -------------------------------------------------------------------------------------------------------- |
| AMI            | Ubuntu Server 24.04 LTS (x86_64)                                                                         |
| Loại máy       | **t3.medium** (2 vCPU, 4 GB) — build Next.js cần ~3–4 GB RAM. t3.small chỉ đủ nếu build image ở nơi khác |
| Ổ đĩa          | 30 GB gp3                                                                                                |
| Key pair       | tạo mới, giữ file `.pem`                                                                                 |
| Security Group | Inbound: **22** chỉ IP của bạn · **80** và **443** từ mọi nơi (0.0.0.0/0)                                |
| Elastic IP     | cấp một Elastic IP và gắn vào máy — IP không đổi khi khởi động lại (tên miền sslip.io dựa vào IP)        |

Chi phí tham khảo: t3.medium chạy liên tục khoảng 30 USD/tháng (xem bảng giá AWS vùng bạn chọn);
Elastic IP gắn vào máy đang chạy có phí nhỏ theo giờ. Tắt máy khi không dùng để tiết kiệm.

## 2. Cài Docker trên máy

```bash
ssh -i learn.pem ubuntu@<ELASTIC_IP>
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu && exit        # đăng nhập lại để có quyền docker
```

## 3. Lấy mã nguồn và cấu hình

```bash
git clone <repo LEARN> learn && cd learn
cp .env.prod.example .env.prod && nano .env.prod
```

Bắt buộc sửa trong `.env.prod`:

- `DOMAIN`, `APP_URL`, `S3_PUBLIC_ENDPOINT` — IP `3.1.2.4` thành `3-1-2-4.sslip.io` (đổi dấu chấm
  thành gạch ngang). Có domain riêng thì trỏ bản ghi A về Elastic IP và dùng domain đó.
- `POSTGRES_PASSWORD` **và** mật khẩu trong `DATABASE_URL` (phải giống nhau), `S3_SECRET_ACCESS_KEY`,
  `JWT_ACCESS_SECRET`, `SEED_ADMIN_PASSWORD` — sinh bằng `openssl rand -base64 48`.

Quyết định bạn phải tự chốt:

- **`LLM_MODE`**: `mock` (miễn phí, bài học mẫu) hay `live` (gọi mô hình thật, **tính tiền theo lượt**,
  bất kỳ ai đăng ký cũng bấm được). Chọn `live` thì giữ `AI_JOB_MAX_COST_USD` thấp và điền `LLM_API_KEY`.
- **`MAIL_MODE`**: `log` thì email quên mật khẩu **không được gửi** (link chỉ nằm trong log). Muốn
  gửi thật: `MAIL_MODE=smtp` + `SMTP_URL` (vd Gmail app password: `smtps://user:app-pass@smtp.gmail.com:465`).

## 4. Chạy

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env.prod up -d --build
docker compose -f infra/docker-compose.prod.yml --env-file .env.prod run --rm migrate npm run db:seed -w packages/db
docker compose -f infra/docker-compose.prod.yml --env-file .env.prod ps
curl https://<DOMAIN>/api/v1/health       # {"status":"ok",...}
curl https://<DOMAIN>/api/v1/health/ready # database/redis/storage đều "up"
```

Lần đầu build mất khoảng 15–30 phút (đo trên máy dev: API 17 phút, web 15 phút — phần lớn là tải ~1.500 gói npm); các lần sau nhanh hơn nhờ cache npm của BuildKit. Mở `https://<DOMAIN>` → đăng nhập bằng `SEED_ADMIN_EMAIL`.

## 5. Trỏ app mobile vào server

Trong repo `LEARN_mobile`: `eas.json` → profile `preview` đặt
`EXPO_PUBLIC_API_URL=https://<DOMAIN>`, rồi làm theo README mobile (`eas update` cho Expo Go,
`eas build` cho file APK).

## 6. Vận hành

| Việc                        | Lệnh                                                                                                                  |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Xem log                     | `docker compose -f infra/docker-compose.prod.yml logs -f api worker`                                                  |
| Cập nhật code               | `git pull && docker compose -f infra/docker-compose.prod.yml --env-file .env.prod up -d --build` (migration tự chạy)  |
| Sao lưu DB hằng ngày        | `crontab -e` → `0 3 * * * docker exec learn-postgres-1 pg_dump -U learn learn \| gzip > ~/backup-$(date +\%F).sql.gz` |
| Đổi domain                  | sửa `DOMAIN`/`APP_URL`/`S3_PUBLIC_ENDPOINT` → `up -d` (không cần build lại web)                                       |
| Buộc app mobile cũ cập nhật | tăng `MIN_MOBILE_VERSION` → `up -d api`                                                                               |

## Kiểm chứng sau deploy

1. Web trên máy tính: đăng ký → tạo khóa → tải tài liệu → sinh bài → làm bài tập.
2. App trên điện thoại **dùng 4G** (khác mạng với server): đăng nhập cùng tài khoản → thấy đúng khóa
   học vừa tạo → làm bài → kéo xuống tải lại web: lịch sử có lượt làm bài từ điện thoại.
3. `curl https://<DOMAIN>/api/v1/meta` → `contractsHash` trùng với `CONTRACTS_HASH` của app.
