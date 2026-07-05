# Requirements: AI-Powered Asset Management System

**Defined:** 2026-07-05
**Milestone:** v2.2 — AI Predictive Maintenance & Notifications
**Core Value:** Give teams a production-grade, enterprise-style asset management platform with real persistent data, authenticated multi-role access, IoT monitoring, and AI-driven predictive maintenance with real-time notifications.

## v2.2 Requirements

### AI Predictive Maintenance

- [ ] **AI-01**: Database schema for `ai_recommendations` table exists (Alembic migration): id, asset_id (FK → assets), recommendation (text), confidence (float 0–1), risk_level ("Low"|"Medium"|"High"), risk_score (float), top_factors (JSON array), correlation_id, approved_by (FK → users, nullable), approved_at (nullable), action_state ("pending"|"approved"|"deferred"), defer_reason (nullable), sla_due_at (nullable), created_at
- [ ] **AI-02**: Offline training script (`backend/scripts/train_model.py`) reads `sensor_readings` table, engineers features per asset (mean/std/max per metric over last 7 days), trains a Scikit-learn Random Forest classifier, and saves the model to `backend/model/model.pkl`
- [ ] **AI-03**: `POST /api/v1/ai/recommendations` (authenticated) triggers inference for a given `asset_id`: loads `model.pkl`, engineers features from `sensor_readings`, produces recommendation + confidence + risk_level + top_factors, writes row to `ai_recommendations`; returns the created recommendation
- [ ] **AI-04**: `GET /api/v1/ai/recommendations` (authenticated) returns all recommendations sorted by risk_level desc, confidence desc; supports optional `?asset_id=` filter
- [ ] **AI-05**: `POST /api/v1/ai/recommendations/{id}/approve` (Manager/Admin only) sets `action_state="approved"`, records `approved_by` + `approved_at`; `POST /api/v1/ai/recommendations/{id}/defer` (Manager/Admin only) sets `action_state="deferred"`, accepts optional `defer_reason`
- [ ] **AI-06**: AI Predictive Maintenance page (`/dashboard/ai`) wired to real `ai_recommendations` API — `seedRecommendations` mock removed; approve/defer dialogs call real endpoints; API response maps to `PredictiveRecommendation` type in `frontend/lib/predictive.ts` exactly

### SSE Notifications

- [ ] **NOTIF-01**: Database schema for `notifications` table exists (Alembic migration): id, user_id (FK → users), type (NotificationType enum), title, message, is_read (bool, default false), href (nullable), created_at
- [ ] **NOTIF-02**: Notification event triggers persist rows to `notifications` for the relevant user(s): (a) MQTT consumer threshold breach (cpu_usage > 90%, temperature > 75°C, etc. per `SENSOR_CONFIG`) → notify all Managers/Admins; (b) assignment created/returned → notify assignee; (c) maintenance request status change → notify requester
- [ ] **NOTIF-03**: `GET /api/v1/notifications/stream` SSE endpoint authenticates via `?token=<jwt>` query param (since `EventSource` cannot send `Authorization` headers), streams `text/event-stream` with one event per new notification delivered to that user's `asyncio.Queue`; connection tracked in `NotificationManager` singleton (mirrors `ConnectionManager` pattern)
- [ ] **NOTIF-04**: `GET /api/v1/notifications` (authenticated) returns user's notifications sorted by `created_at` desc; `PATCH /api/v1/notifications/{id}/read` marks one as read; `POST /api/v1/notifications/read-all` marks all as read
- [ ] **NOTIF-05**: Frontend `useNotifications` hook connects to SSE stream, appends incoming events to store's `notifications[]`, replacing `SEED_NOTIFICATIONS`; notification bell badge shows live `unreadCount`; Notifications page lists real notifications with mark-as-read and mark-all-read wired to REST endpoints

