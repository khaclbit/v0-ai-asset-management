# Phase 32: Mosquitto Broker & Docker Compose Integration — Research

**Researched:** 2026-07-05
**Domain:** Docker Compose service configuration, Mosquitto 2.x MQTT broker, FastAPI environment variables
**Confidence:** HIGH — all key decisions verified against project codebase and pre-existing STACK.md / PITFALLS.md research (grounded in live registry checks completed 2026-07-05)

---

## Summary

Phase 32 is a pure infrastructure configuration phase with no application logic. Its scope is:
1. Create `config/mosquitto/mosquitto.conf` with the minimum correct Mosquitto 2.x config.
2. Add a `mosquitto` service to `docker-compose.yml` with healthcheck, volumes, and port mapping.
3. Wire the `api` service to depend on the healthy Mosquitto broker and expose MQTT env vars.
4. Update `backend/app/config.py` and `backend/.env.example` with the new MQTT settings.

The critical technical fact for this phase is the **Mosquitto 2.x breaking change**: anonymous connections and default listeners are disabled by default. Without `listener 1883` and `allow_anonymous true` in a mounted config file, all client connections are silently refused — the container starts healthy but rejects every MQTT connect attempt. Every other concern in this phase is plumbing.

**Primary recommendation:** Mount `config/mosquitto/mosquitto.conf` (with `listener 1883` + `allow_anonymous true`) before wiring the Docker Compose service, and add a `mosquitto_pub` healthcheck so the `api` service waits for the broker to be genuinely ready, not just started.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| IOT-MQTT-01 | `mosquitto` Docker Compose service added using `eclipse-mosquitto:2.0.22` image with explicit `listener 1883` and `allow_anonymous true` in `config/mosquitto/mosquitto.conf` | Exact image tag, config syntax, and volume path confirmed in STACK.md [VERIFIED: Docker Hub API 2026-07-05] |
| IOT-MQTT-02 | `docker-compose.yml` updated: `mosquitto` service with volume mounts for config and data; `api` service gains `MQTT_BROKER_HOST` and `MQTT_BROKER_PORT` env vars; `.env.example` updated accordingly | Existing docker-compose.yml inspected; all env var names and volume patterns documented below |
| IOT-MQTT-03 | MQTT broker confirmed healthy (reachable on port 1883) before MQTT consumer or simulator attempt connection | `mosquitto_pub` healthcheck pattern + `service_healthy` condition confirmed in PITFALLS.md DOCKER-2 |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| MQTT message routing/persistence | Docker service (Mosquitto) | — | Mosquitto is the broker; all routing happens inside it |
| Broker configuration | Bind-mounted config file | Docker Compose volume | Config is a file artifact committed to repo; mounted read-only |
| Broker port exposure | Docker Compose ports | Host OS | Port 1883 exposed to host for simulator (may run outside Docker) |
| API MQTT connection settings | API environment variables | pydantic-settings | Keeps config externalised and consistent with existing Settings pattern |
| Broker health enforcement | Docker Compose `depends_on` | Reconnect loop (Phase 33) | `service_healthy` condition ensures broker is TCP-ready before api starts |

---

## Standard Stack

### Core (this phase)

| Component | Version / Tag | Purpose | Why Standard |
|-----------|--------------|---------|--------------|
| `eclipse-mosquitto` Docker image | `2.0.22` | MQTT broker | Official Eclipse Foundation image; `2.0.22` last pushed 2026-06-22 [VERIFIED: Docker Hub API 2026-07-05] |
| `pydantic-settings` (already installed) | `2.6.1` | Load MQTT env vars into `Settings` | Already used for all config — zero new deps |

### No New Python Packages
Phase 32 does **not** add any Python packages. `aiomqtt` is Phase 33 scope.

### Installation
```bash
# No package installs — this phase is config + YAML only
```

---

## Package Legitimacy Audit

> Phase 32 installs zero external packages. This section is satisfied by confirming the Docker image tag.

| Package | Registry | Age | Verdict | Disposition |
|---------|----------|-----|---------|-------------|
| `eclipse-mosquitto:2.0.22` | Docker Hub | Official Eclipse image, 8+ yrs | OK | Approved |

**Packages removed due to SLOP verdict:** none
**Packages flagged SUS:** none

---

## Architecture Patterns

### System Architecture Diagram — Phase 32 Scope

```
                  ┌─────────────────────────────────────────────┐
                  │            docker-compose.yml               │
                  │                                             │
  Host port 1883  │  ┌────────────────────────────────────┐    │
  ◄───────────────┼──│  mosquitto (eclipse-mosquitto:2.0.22)│   │
  (simulator /    │  │  listener 1883 0.0.0.0              │    │
   external tool) │  │  allow_anonymous true               │    │
                  │  │  healthcheck: mosquitto_pub ping     │    │
                  │  │  volumes:                           │    │
                  │  │   - config/mosquitto/mosquitto.conf │    │
                  │  │     (bind, read-only)               │    │
                  │  │   - mosquitto_data (named vol)      │    │
                  │  │   - mosquitto_log  (named vol)      │    │
                  │  └───────────────┬────────────────────┘    │
                  │                  │ service_healthy          │
                  │                  ▼                          │
                  │  ┌──────────────────────────────────────┐   │
                  │  │  api (FastAPI)                       │   │
                  │  │  env: MQTT_BROKER_HOST=mosquitto     │   │
                  │  │       MQTT_BROKER_PORT=1883          │   │
                  │  │  depends_on:                        │   │
                  │  │    db: service_healthy              │   │
                  │  │    mosquitto: service_healthy        │   │
                  │  └──────────────────────────────────────┘   │
                  │                                             │
                  └─────────────────────────────────────────────┘

  Repo file tree additions:
  config/mosquitto/mosquitto.conf   ← bind-mounted into broker container
```

### Recommended Project Structure (additions only)

```
config/
└── mosquitto/
    └── mosquitto.conf     # broker config — committed to repo

docker-compose.yml          # modified: mosquitto service + volumes
backend/app/config.py       # modified: MQTT_BROKER_HOST, MQTT_BROKER_PORT fields
backend/.env.example        # modified: MQTT_BROKER_HOST, MQTT_BROKER_PORT entries
```

> **Config directory name decision:** The requirements spec says `config/mosquitto/mosquitto.conf`.
> The STACK.md pre-research used `mosquitto/config/mosquitto.conf`. Use **`config/mosquitto/mosquitto.conf`** as the canonical path per IOT-MQTT-01 to match the requirements verbatim.

### Pattern 1: Minimum Mosquitto 2.x Config for Anonymous Dev Use

**What:** Mosquitto 2.x changed defaults — `allow_anonymous` is `false` and no listener is bound by default. You must explicitly declare both.

**When to use:** Any `eclipse-mosquitto:2.x` container in a dev/Docker Compose environment.

```ini
# config/mosquitto/mosquitto.conf
# Source: Eclipse Mosquitto 2.x docs + PITFALLS.md DOCKER-1 [VERIFIED: project PITFALLS.md]

# Mosquitto 2.0+ requires explicit listener declaration.
# Without this, Mosquitto binds to localhost only — not reachable from other Docker containers.
listener 1883

# Dev-only: allow unauthenticated connections.
# Production: replace with password_file directive.
allow_anonymous true

# Persistence (keeps retained messages across broker restarts)
persistence true
persistence_location /mosquitto/data/

# Logging
log_dest file /mosquitto/log/mosquitto.log
log_type error
log_type warning
log_type notice
log_type information
```

### Pattern 2: Docker Compose Mosquitto Service Block

```yaml
# Addition to docker-compose.yml
mosquitto:
  image: eclipse-mosquitto:2.0.22
  restart: unless-stopped
  ports:
    - "1883:1883"      # MQTT — exposed to host so simulator can connect from outside Docker
  volumes:
    - ./config/mosquitto/mosquitto.conf:/mosquitto/config/mosquitto.conf:ro
    - mosquitto_data:/mosquitto/data
    - mosquitto_log:/mosquitto/log
  healthcheck:
    test: ["CMD", "mosquitto_pub", "-h", "localhost", "-t", "healthcheck", "-m", "ping", "-q"]
    interval: 5s
    timeout: 5s
    retries: 5
    start_period: 5s
```

> **Healthcheck rationale:** `mosquitto_pub` is bundled in the `eclipse-mosquitto` image. A successful publish confirms the broker is accepting connections on port 1883 — not just that the process started. TCP-level probes (nc, curl) would pass even if Mosquitto rejects MQTT connects due to bad config. [VERIFIED: project PITFALLS.md DOCKER-2]

### Pattern 3: Updated `api` Service Block

```yaml
# Modified api service in docker-compose.yml
api:
  build: ./backend
  restart: unless-stopped
  ports:
    - "8000:8000"
  volumes:
    - ./backend:/app
  env_file:
    - ./backend/.env
  environment:
    DATABASE_URL: "postgresql://postgres:postgres@db:5432/asset_management"
    MQTT_BROKER_HOST: mosquitto
    MQTT_BROKER_PORT: "1883"
  depends_on:
    db:
      condition: service_healthy
    mosquitto:
      condition: service_healthy
  command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

> **`service_healthy` vs `service_started`:** Use `service_healthy` for Mosquitto so the api container does not start until Mosquitto is genuinely accepting MQTT connections. `service_started` only waits for the container process to exist — not for the port to be open. [VERIFIED: project PITFALLS.md DOCKER-2]

### Pattern 4: `backend/app/config.py` Additions

```python
# Add to the Settings class (pydantic-settings BaseSettings)
# Source: existing config.py pattern [VERIFIED: codebase inspection]

class Settings(BaseSettings):
    # ... existing fields ...

    # MQTT Broker
    MQTT_BROKER_HOST: str = "localhost"
    MQTT_BROKER_PORT: int = 1883
```

> **Field naming:** Requirements IOT-MQTT-02 specifies `MQTT_BROKER_HOST` and `MQTT_BROKER_PORT` — use these exact names. The pre-research ARCHITECTURE.md used `MQTT_HOST` / `MQTT_PORT` — defer to the requirements spec.

### Pattern 5: `.env.example` Additions

```bash
# ─── MQTT Broker ──────────────────────────────────────────────────────────────
# Host: use "mosquitto" inside Docker Compose, "localhost" for local dev outside Docker
MQTT_BROKER_HOST=localhost
MQTT_BROKER_PORT=1883
```

### Named Volumes Addition to `docker-compose.yml`

```yaml
volumes:
  postgres_data:      # existing
  pgadmin_data:       # existing
  mosquitto_data:     # new — persists retained MQTT messages across broker restarts
  mosquitto_log:      # new — persists broker logs
```

### Anti-Patterns to Avoid

- **Omitting `listener 1883`:** Without this line Mosquitto 2.x binds to localhost inside the container — no other Docker container can reach port 1883. [VERIFIED: PITFALLS.md DOCKER-1]
- **Omitting `allow_anonymous true`:** Without this line Mosquitto 2.x rejects all unauthenticated connects with "Connection Refused". The container shows `Up (healthy)` but aiomqtt raises `MqttError`. [VERIFIED: PITFALLS.md DOCKER-1]
- **Using `service_started` instead of `service_healthy`:** Race condition — the api service starts before Mosquitto finishes binding port 1883. [VERIFIED: PITFALLS.md DOCKER-2]
- **Using a TCP-only healthcheck (e.g., `nc -z localhost 1883`):** Passes even when Mosquitto rejects MQTT connects due to missing `allow_anonymous true`. Use `mosquitto_pub` instead.
- **Bind-mounting the config file at the wrong path:** The container expects `/mosquitto/config/mosquitto.conf`. The repo path `./config/mosquitto/mosquitto.conf` must map to exactly this container path. [VERIFIED: eclipse-mosquitto Docker image docs]
- **Pinning the image to `latest`:** Non-reproducible builds. Pin to `eclipse-mosquitto:2.0.22`. [VERIFIED: STACK.md]
- **Exposing port 9001 (WebSocket MQTT) when not needed:** Phase 32 only needs port 1883 (plain MQTT). Adding 9001 without a corresponding `listener 9001` in the config will silently fail.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MQTT broker readiness detection | Custom TCP probe script | `mosquitto_pub` healthcheck (built into image) | `mosquitto_pub` tests the actual MQTT protocol layer, not just TCP |
| Broker auth (future) | Custom auth plugin | `password_file` directive in `mosquitto.conf` | Mosquitto has native password auth — no code needed |
| Message persistence | Custom DB logging at broker level | `persistence true` + named Docker volume | Mosquitto handles QoS persistence natively |

---

## Common Pitfalls

### Pitfall 1: Mosquitto 2.x Silent Connection Refused (DOCKER-1 — CRITICAL)
**What goes wrong:** `eclipse-mosquitto:2` starts successfully, shows `Up`, but all MQTT clients get "Connection Refused". There are no error logs that point to the config issue.
**Why it happens:** Mosquitto 2.x changed defaults — `allow_anonymous false` and no listener is bound. Without a mounted config declaring `listener 1883` + `allow_anonymous true`, the broker refuses everything.
**How to avoid:** Create `config/mosquitto/mosquitto.conf` with both directives BEFORE running `docker compose up`. Mount it at `/mosquitto/config/mosquitto.conf` (read-only).
**Warning signs:** `docker exec mosquitto mosquitto_pub -h localhost -t test -m hello` returns error; healthcheck keeps failing.

### Pitfall 2: Race Condition — API Starts Before Broker Ready (DOCKER-2)
**What goes wrong:** `api` service starts, tries to connect to `mosquitto:1883`, but Mosquitto is still initialising. `aiomqtt` raises `MqttError`. Without a reconnect loop (Phase 33 concern), the consumer task dies silently.
**Why it happens:** `depends_on: mosquitto` with `condition: service_started` only waits for the container process to exist, not for port 1883 to be open.
**How to avoid:** Use `condition: service_healthy` on the `mosquitto` `depends_on` entry. The `mosquitto_pub` healthcheck confirms TCP + MQTT layer readiness.
**Warning signs:** API logs show `MqttError: Connection refused` immediately after startup.

### Pitfall 3: Wrong Volume Mount Path
**What goes wrong:** Config file is created but not loaded — Mosquitto falls back to empty defaults and refuses connections.
**Why it happens:** The bind-mount source (`./config/mosquitto/mosquitto.conf`) or destination (`/mosquitto/config/mosquitto.conf`) path is wrong.
**How to avoid:** Verify after `docker compose up`: `docker exec mosquitto cat /mosquitto/config/mosquitto.conf` — should show `listener 1883` and `allow_anonymous true`.
**Warning signs:** Config file exists on host but broker still refuses connections.

### Pitfall 4: MQTT_BROKER_HOST Value in .env vs docker-compose Environment
**What goes wrong:** `.env.example` (and developer `.env`) uses `MQTT_BROKER_HOST=localhost`, but inside Docker Compose the api container must use `MQTT_BROKER_HOST=mosquitto` (the service name).
**Why it happens:** The docker-compose `environment:` block sets `MQTT_BROKER_HOST: mosquitto`, overriding whatever is in `.env`. This is correct, but developers running the API outside Docker must know to use `localhost`.
**How to avoid:** The `docker-compose.yml` `environment:` block explicitly sets `MQTT_BROKER_HOST: mosquitto`. The `.env.example` uses `localhost` as the local-dev default. Document this in `.env.example` with a comment.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker Engine | Mosquitto container | ✓ | 29.3.1 | — |
| Docker Compose | `docker compose up` | ✓ | v2 (bundled) | — |
| `eclipse-mosquitto:2.0.22` image | Mosquitto service | Pull-on-demand | 2.0.22 | — |
| `mosquitto_pub` (in image) | Healthcheck | ✓ (built into image) | bundled | — |

**Missing dependencies with no fallback:** None — Docker is available and images are pull-on-demand.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected in `backend/` (no `pytest.ini`, no `tests/` dir) |
| Config file | None — Wave 0 would need to create it |
| Quick run command | `docker compose exec mosquitto mosquitto_pub -h localhost -t healthcheck -m ping -q` (smoke test) |
| Full suite command | N/A — no automated Python tests exist yet |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| IOT-MQTT-01 | Mosquitto container starts and binds port 1883 | smoke | `docker compose exec mosquitto mosquitto_pub -h localhost -t test -m ping -q && echo OK` | ❌ Wave 0 (manual verify) |
| IOT-MQTT-02 | Port 1883 reachable from host | smoke | `nc -zv localhost 1883` | ❌ Wave 0 (manual verify) |
| IOT-MQTT-03 | API service waits for broker healthy before starting | smoke | `docker compose up --wait` then check api logs for no `MqttError` | ❌ Wave 0 (manual verify) |

> All three requirements are verified by `docker compose up` observation — no automated Python test framework exists yet. The plan should include explicit manual verification steps after each docker-compose change.

### Sampling Rate
- **Per task commit:** `docker compose exec mosquitto mosquitto_pub -h localhost -t healthcheck -m ping -q`
- **Per wave merge:** `docker compose up --wait && docker compose ps` (all services healthy)
- **Phase gate:** All three smoke tests green before marking phase complete

### Wave 0 Gaps
- [ ] No automated test framework exists — all verification is `docker compose` commands
- [ ] Consider adding `scripts/verify_mqtt.sh` as a one-shot smoke test script

---

## Security Domain

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | This phase uses `allow_anonymous true` intentionally for dev |
| V4 Access Control | Partial | Mosquitto port 1883 exposed to host — acceptable for dev; document that production requires `password_file` |
| V5 Input Validation | No | No application code added in this phase |
| V6 Cryptography | No | No TLS in this phase (dev only) |

**Security note:** `allow_anonymous true` + port 1883 exposed to host is intentional for local development. Any production or staging deployment must replace this with a `password_file` directive and remove the host port binding. Document this prominently in `mosquitto.conf`.

---

## Existing Codebase — Confirmed Facts

From direct inspection of the repository:

| File | Current State | What Phase 32 Changes |
|------|--------------|----------------------|
| `docker-compose.yml` | 3 services: `db`, `api`, `pgadmin`; 2 named volumes | Adds `mosquitto` service + 2 named volumes; updates `api` env + depends_on |
| `backend/app/config.py` | `Settings(BaseSettings)` with DB, JWT, seed, CORS fields | Adds `MQTT_BROKER_HOST: str` and `MQTT_BROKER_PORT: int` fields |
| `backend/.env.example` | DB, JWT, seed, CORS, pgadmin vars | Adds `MQTT_BROKER_HOST` and `MQTT_BROKER_PORT` |
| `backend/requirements.txt` | 12 packages; no MQTT client | **No change** (aiomqtt is Phase 33) |
| `config/mosquitto/` | Does not exist | **Create** this directory + `mosquitto.conf` |

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Mosquitto 1.x: anonymous allowed by default | Mosquitto 2.x: anonymous denied by default | Must add `allow_anonymous true` + `listener 1883` in config — not optional |
| `depends_on: [service]` (list form) | `depends_on: service: condition: service_healthy` (map form) | Condition-based depends_on requires healthcheck to be defined |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `config/mosquitto/mosquitto.conf` is the canonical path (per IOT-MQTT-01) rather than `mosquitto/config/mosquitto.conf` (per ARCHITECTURE.md) | Standard Stack, Patterns | Planner creates the dir in the wrong location; volume mount path in docker-compose.yml must match exactly |

> All other claims in this document are VERIFIED against the project codebase, STACK.md, or PITFALLS.md.

**Resolution for A1:** IOT-MQTT-01 explicitly states `config/mosquitto/mosquitto.conf`. Use this path. The planner should create `config/mosquitto/mosquitto.conf` and mount it as `./config/mosquitto/mosquitto.conf:/mosquitto/config/mosquitto.conf:ro`.

---

## Open Questions (RESOLVED)

1. **Should port 9001 (WebSocket MQTT) be exposed?**
   - What we know: Phase 32 scope is port 1883 (plain MQTT for simulator + consumer). No browser MQTT client is planned for v2.1.
   - What's unclear: Whether future phases will need WebSocket MQTT for browser clients.
   - Recommendation: **Omit port 9001 for Phase 32.** Adding it later requires only a `listener 9001` config line + port mapping — trivial. Adding it now without a consumer adds noise.
   - **RESOLVED: Port 9001 omitted from Phase 32 scope. Add in v2.2+ if browser MQTT client needed.**

2. **Does the `backend/.env` file (not `.env.example`) need updating?**
   - What we know: The `api` service uses `env_file: ./backend/.env` plus an `environment:` override for `MQTT_BROKER_HOST: mosquitto`.
   - What's unclear: Whether a developer's local `.env` needs updating for running outside Docker.
   - Recommendation: Add `MQTT_BROKER_HOST=localhost` and `MQTT_BROKER_PORT=1883` to `.env.example`. The plan should note that developers running the api outside Docker should copy these to their local `.env`.
   - **RESOLVED: backend/.env gets `MQTT_BROKER_HOST=localhost` (correct for outside-Docker uvicorn dev). The value `mosquitto` only resolves inside Docker's internal network. The docker-compose.yml `environment:` block overrides this to `mosquitto` for in-Compose runs. Both cases are handled correctly without changing the .env for Docker use.**

---

## Sources

### Primary (HIGH confidence)
- Project PITFALLS.md (live research 2026-07-05) — DOCKER-1, DOCKER-2: Mosquitto 2.x defaults, healthcheck pattern
- Project STACK.md (live research 2026-07-05) — `eclipse-mosquitto:2.0.22` image, mosquitto.conf content, Docker Compose service block
- Project ARCHITECTURE.md (live research 2026-07-05) — Docker Compose complete service block, volume names, api env vars
- Codebase inspection (2026-07-05) — `docker-compose.yml`, `backend/app/config.py`, `backend/.env.example`, `backend/requirements.txt`
- Docker Hub eclipse-mosquitto tags API (2026-07-05) — `2.0.22` last pushed 2026-06-22

### Secondary (MEDIUM confidence)
- REQUIREMENTS.md IOT-MQTT-01/02/03 — canonical requirement text for exact file paths and env var names

---

## Metadata

**Confidence breakdown:**
- Docker Compose service block: HIGH — exact YAML verified in STACK.md + ARCHITECTURE.md
- mosquitto.conf content: HIGH — verified against Mosquitto 2.x docs and PITFALLS.md
- Config file path: HIGH (with A1 caveat) — IOT-MQTT-01 requirement is the canonical authority
- Env var names: HIGH — IOT-MQTT-02 requirement is explicit (`MQTT_BROKER_HOST`, `MQTT_BROKER_PORT`)
- Healthcheck approach: HIGH — `mosquitto_pub` is the proven MQTT-layer health probe per PITFALLS.md

**Research date:** 2026-07-05
**Valid until:** 2026-08-04 (stable — Docker Compose and Mosquitto config are not fast-moving)
