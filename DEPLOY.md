# Deployment Guide — AI Asset Management System

**Recommended stack (free tier, ~10 phút setup):**

| Service | Platform | Hostname |
|---------|----------|---------|
| Frontend (Next.js) | **Vercel** | `your-app.vercel.app` |
| Backend API (FastAPI) | **Railway** | `your-api.up.railway.app` |
| Database (PostgreSQL 16) | **Railway** add-on | auto-configured |
| MQTT Broker | **HiveMQ Cloud** free | `xxxxx.s1.eu.hivemq.cloud` |

---

## Step 1 — MQTT Cloud Broker (HiveMQ Free)

1. Tạo account tại [hivemq.com/mqtt-cloud-broker](https://www.hivemq.com/mqtt-cloud-broker/)
2. Tạo **Free Cluster** → nhận `hostname` dạng `xxxxx.s1.eu.hivemq.cloud`
3. Tạo **Credentials** (username + password) trong tab *Access Management*
4. Lưu lại: `MQTT_BROKER_HOST`, `MQTT_BROKER_PORT=8883`, `MQTT_USERNAME`, `MQTT_PASSWORD`

> HiveMQ Free hỗ trợ TLS (port 8883) — cần update `consumer.py` nếu dùng TLS.
> Hoặc dùng **broker.emqx.io** (public, port 1883, không cần auth) để test nhanh.

---

## Step 2 — Backend + PostgreSQL trên Railway

### 2a. Chuẩn bị

```bash
# Cài Railway CLI
npm install -g @railway/cli

# Login
railway login
```

### 2b. Tạo project trên Railway

```bash
cd /path/to/AI_Management_System/backend

# Init project
railway init

# Add PostgreSQL add-on (1 lệnh)
railway add --plugin postgresql
```

Railway tự tạo biến `DATABASE_URL` và inject vào service.

### 2c. Set environment variables

```bash
railway variables set SECRET_KEY=$(openssl rand -hex 32)
railway variables set ALGORITHM=HS256
railway variables set ACCESS_TOKEN_EXPIRE_MINUTES=30
railway variables set MQTT_BROKER_HOST=xxxxx.s1.eu.hivemq.cloud
railway variables set MQTT_BROKER_PORT=8883
railway variables set MQTT_USERNAME=your_mqtt_user
railway variables set MQTT_PASSWORD=your_mqtt_password
railway variables set CORS_ORIGINS=https://your-app.vercel.app
railway variables set FIRST_ADMIN_EMAIL=admin@company.com
railway variables set FIRST_ADMIN_PASSWORD=admin123!
# Optional:
railway variables set OPENAI_API_KEY=sk-...
```

### 2d. Deploy backend

```bash
# Deploy từ Dockerfile (tự detect)
railway up

# Chạy migrations sau khi deploy
railway run alembic upgrade head

# Seed dữ liệu ban đầu
railway run python scripts/seed.py

# Train AI model
railway run python scripts/train_model.py
```

### 2e. Lấy backend URL

```bash
railway domain   # → https://your-api.up.railway.app
```

---

## Step 3 — Frontend trên Vercel

### 3a. Cài Vercel CLI và deploy

```bash
cd /path/to/AI_Management_System/frontend

npm install -g vercel

# Deploy (lần đầu sẽ hỏi project name, team, etc.)
vercel

# Nhập khi được hỏi:
# Project name: ai-asset-management
# Root directory: ./  (đang ở trong frontend/)
# Build Command: npm run build
# Output Directory: .next
```

### 3b. Set environment variable cho frontend

```bash
vercel env add NEXT_PUBLIC_API_URL
# Nhập: https://your-api.up.railway.app/api/v1
# Chọn: Production, Preview, Development
```

### 3c. Redeploy với env mới

```bash
vercel --prod
```

Vercel tạo hostname: `https://ai-asset-management.vercel.app`

---

## Step 4 — Verify

```bash
# Test API health
curl https://your-api.up.railway.app/health

# Test login
curl -X POST https://your-api.up.railway.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"admin123!"}'
```

Mở frontend: `https://ai-asset-management.vercel.app`  
Đăng nhập: `admin@company.com` / `admin123!`

---

## Step 5 — Custom Domain (tùy chọn)

### Vercel
```bash
vercel domains add yourdomain.com
```

### Railway
Railway Dashboard → Settings → Domains → Add custom domain

---

## Troubleshooting

| Vấn đề | Giải pháp |
|--------|-----------|
| CORS error từ frontend | Đảm bảo `CORS_ORIGINS` có đúng Vercel URL |
| WebSocket không kết nối | Railway hỗ trợ WS qua HTTPS — URL tự được convert sang `wss://` |
| SSE bị ngắt | Railway có idle timeout — thêm `KeepAlive` hoặc upgrade plan |
| MQTT không connect | Kiểm tra port (1883 vs 8883) và credentials |
| `model.pkl` không tồn tại | Chạy `railway run python scripts/train_model.py` |

---

## Tổng kết URLs

| Item | URL |
|------|-----|
| Frontend | `https://your-app.vercel.app` |
| Backend API | `https://your-api.up.railway.app` |
| API Docs (Swagger) | `https://your-api.up.railway.app/docs` |
| MQTT Broker | `mqtts://xxxxx.s1.eu.hivemq.cloud:8883` |

---

## Chi phí

| Service | Free Tier |
|---------|-----------|
| Vercel | ✅ Free (unlimited projects) |
| Railway | ✅ $5 free credit/month (~500h runtime) |
| HiveMQ Cloud | ✅ Free (10 connections, 10GB/month) |
| **Total** | **$0** |
