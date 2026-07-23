# Deployment Guide — AI Asset Management System

> **Mục tiêu:** Deploy toàn bộ hệ thống lên cloud **hoàn toàn miễn phí** — không cần thẻ tín dụng, không trial có hạn, ~20 phút setup.

## Stack

| Service | Platform | Free Tier | CC cần? |
|---------|----------|-----------|---------|
| Frontend (Next.js 15) | **Vercel** | Miễn phí vĩnh viễn | ❌ Không |
| Backend API (FastAPI) | **Render** | 750h/tháng, sleep sau 15 phút idle | ❌ Không |
| Database (PostgreSQL 16) | **Neon** | 512 MB storage | ❌ Không |
| MQTT Broker | **broker.emqx.io** | Public broker, không cần setup | ❌ Không |

> **Lưu ý về Render free tier:** Service tự *sleep* sau 15 phút không có request. Request đầu tiên sau sleep sẽ mất ~30–50 giây để wake up — hoàn toàn chấp nhận được cho demo/học thuật.

---

## Bước 1 — PostgreSQL trên Neon (~5 phút)

1. Truy cập [neon.tech](https://neon.tech) → **Sign Up** (dùng GitHub hoặc Google)
2. **Create Project** → Đặt tên (vd: `ai-asset-management`) → chọn region gần nhất
3. Neon tự tạo database `neondb`. Vào **Dashboard → Connection Details**
4. Copy **Connection string** dạng:
   ```
   postgresql://username:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
5. Lưu lại — đây là `DATABASE_URL` cho Render.

---

## Bước 2 — Backend (FastAPI) trên Render (~10 phút)

### 2a. Đẩy code lên GitHub (nếu chưa có)

```bash
# Tại thư mục gốc project
git add . && git commit -m "chore: prepare for render deployment"
git push origin main
```

### 2b. Tạo Web Service trên Render

1. Truy cập [render.com](https://render.com) → **Sign Up** → **New → Web Service**
2. Kết nối với GitHub repo của bạn
3. Cấu hình:

   | Field | Giá trị |
   |-------|---------|
   | **Name** | `ai-asset-management-api` |
   | **Root Directory** | `backend` |
   | **Environment** | `Docker` |
   | **Dockerfile Path** | `./Dockerfile.prod` |
   | **Instance Type** | `Free` |

### 2c. Set Environment Variables trên Render Dashboard

Tại Web Service → **Environment** → thêm từng biến:

```
DATABASE_URL          = postgresql://...neon.tech/neondb?sslmode=require
SECRET_KEY            = <chạy: openssl rand -hex 32>
ALGORITHM             = HS256
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS   = 7
MQTT_BROKER_HOST      = broker.emqx.io
MQTT_BROKER_PORT      = 1883
CORS_ORIGINS          = https://your-app.vercel.app
FIRST_ADMIN_EMAIL     = admin@company.com
FIRST_ADMIN_PASSWORD  = admin123!
```

> `broker.emqx.io` là MQTT public broker miễn phí — không cần đăng ký, không cần auth, không cần thay đổi code.

### 2d. Deploy và chạy migrations

Render tự build và deploy khi nhấn **Create Web Service**. Sau khi deploy xong (3–5 phút):

```bash
# Kết nối trực tiếp đến Neon để chạy migrations (1 lần duy nhất)
# Cài psql hoặc dùng Neon SQL Editor trên dashboard

# Option A: dùng Render Shell (Dashboard → Web Service → Shell)
alembic upgrade head
python scripts/seed.py
python scripts/train_model.py
```

Hoặc dùng **Render Shell** trực tiếp trên web dashboard.

### 2e. Lấy backend URL

Render cấp domain dạng: `https://ai-asset-management-api.onrender.com`

---

## Bước 3 — Frontend (Next.js 15) trên Vercel (~5 phút)

### 3a. Deploy qua Vercel CLI

```bash
cd frontend
npm install -g vercel
vercel
```

Khi được hỏi:
- **Project name:** `ai-asset-management`
- **Root directory:** `./` (đang ở trong `frontend/`)
- **Build Command:** `npm run build`
- **Output Directory:** `.next`

### 3b. Set environment variable

```bash
vercel env add NEXT_PUBLIC_API_URL
# Nhập: https://ai-asset-management-api.onrender.com/api/v1
# Chọn: Production, Preview, Development
```

### 3c. Redeploy với env

```bash
vercel --prod
```

Vercel tạo hostname: `https://ai-asset-management.vercel.app`

### 3d. Cập nhật CORS trên Render

Quay lại Render Dashboard → Web Service → **Environment** → cập nhật:
```
CORS_ORIGINS = https://ai-asset-management.vercel.app
```
→ **Save Changes** → Render tự redeploy.

---

## Bước 4 — Verify

```bash
# Test API health
curl https://ai-asset-management-api.onrender.com/api/v1/health

# Test login
curl -X POST https://ai-asset-management-api.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"admin123!"}'
```

Mở frontend: `https://ai-asset-management.vercel.app`  
Đăng nhập: `admin@company.com` / `admin123!`

---

## Bước 5 — Custom Domain (tùy chọn)

### Vercel
```bash
vercel domains add yourdomain.com
```

### Render
Dashboard → Web Service → **Settings → Custom Domains**

---

## Tổng kết URLs

| Item | URL |
|------|-----|
| Frontend | `https://ai-asset-management.vercel.app` |
| Backend API | `https://ai-asset-management-api.onrender.com` |
| API Docs (Swagger) | `https://ai-asset-management-api.onrender.com/docs` |
| MQTT Broker | `mqtt://broker.emqx.io:1883` (public) |
| Database (Neon) | Xem Neon dashboard |

---

## Troubleshooting

| Vấn đề | Giải pháp |
|--------|-----------|
| API trả về 5xx lần đầu | Render đang wake up — đợi 30–50s rồi thử lại |
| CORS error từ frontend | Kiểm tra `CORS_ORIGINS` khớp đúng URL Vercel (không có trailing slash) |
| WebSocket không kết nối | Render hỗ trợ WS — URL frontend cần dùng `wss://` thay `ws://` |
| SSE bị ngắt sớm | Render free có request timeout 30s — xem [docs](https://render.com/docs/free) |
| MQTT không nhận data | `broker.emqx.io` là public — kiểm tra `MQTT_BROKER_HOST` và port 1883 |
| `model.pkl` không tồn tại | Render Shell → `python scripts/train_model.py` |
| Neon connection timeout | Thêm `?sslmode=require&connect_timeout=10` vào DATABASE_URL |

---

## Chi phí

| Service | Plan | Hết hạn? |
|---------|------|----------|
| Vercel | Free Hobby | ❌ Không bao giờ |
| Render | Free (750h/tháng) | ❌ Không bao giờ |
| Neon | Free (512 MB) | ❌ Không bao giờ |
| broker.emqx.io | Public Free | ❌ Không bao giờ |
| **Tổng** | **$0** | — |
