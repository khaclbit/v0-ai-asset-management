---
phase: 32
slug: mosquitto-broker-docker-compose-integration
date: 2026-07-05
---

# Phase 32 Validation Strategy

## Test Framework

| Property | Value |
|----------|-------|
| Framework | No automated Python test framework (no `pytest.ini`, no `tests/` dir in backend) |
| Verification mode | Manual Docker Compose smoke tests |
| Quick smoke command | `docker compose exec mosquitto mosquitto_pub -h localhost -t healthcheck -m ping -q` |
| Full suite command | N/A — all verification is docker compose observation |

## Phase Requirements → Test Map

| Req ID | Behavior Under Test | Test Type | Command | Status |
|--------|--------------------|-----------|---------|---------| 
| IOT-MQTT-01 | Mosquitto 2.0.22 container starts and binds port 1883 with explicit listener | smoke | `docker compose up -d mosquitto && docker logs mosquitto 2>&1 \| grep "Opening ipv4 listen socket on port 1883"` | ❌ Wave 0 (manual) |
| IOT-MQTT-01 | `mosquitto.conf` has both `listener 1883` and `allow_anonymous true` | static | `grep "listener 1883" config/mosquitto/mosquitto.conf && grep "allow_anonymous true" config/mosquitto/mosquitto.conf` | ❌ Wave 0 (file check) |
| IOT-MQTT-02 | Port 1883 reachable from host; api has MQTT env vars | smoke | `nc -zv localhost 1883` + `docker compose exec api env \| grep MQTT` | ❌ Wave 0 (manual) |
| IOT-MQTT-03 | API service waits for broker healthy (`service_healthy` condition) | integration | `docker compose up --wait && docker compose ps` (all services healthy) | ❌ Wave 0 (manual) |

> All three requirements are verified by `docker compose up` observation — no automated Python test framework exists yet in this project.

## Sampling Rate

- **Per task commit:** Static file check — grep conf file for required lines
- **Per wave merge:** `docker compose up --wait && docker compose ps` (all services showing "healthy")  
- **Phase gate:** All three smoke tests green before marking phase complete

## Wave 0 Gaps (Pre-existing)

- [ ] No automated test framework — all MQTT verification is docker compose + CLI commands
- [ ] Optional improvement (future): `scripts/verify_mqtt.sh` one-shot smoke test script

## Critical Verification: Mosquitto 2.x Silent-Refusal Check

The single highest-risk item in this phase is the Mosquitto 2.x breaking change where missing `listener` + `allow_anonymous` causes the container to start healthy but reject all MQTT connections.

**Verification sequence (must be run in order):**
1. `cat config/mosquitto/mosquitto.conf` — confirms both required lines present
2. `docker compose up -d mosquitto`
3. `docker logs mosquitto | grep "Opening ipv4 listen socket"` — confirms listener active
4. `docker compose exec mosquitto mosquitto_pub -h localhost -t test -m ping -q` — confirms anonymous MQTT accepted (would fail if allow_anonymous missing)

If step 4 fails, the root cause is almost always a missing or malformed `mosquitto.conf`.
