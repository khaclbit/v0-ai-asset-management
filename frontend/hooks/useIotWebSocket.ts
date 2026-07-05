"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { type SensorReadingOut, iotApi } from "@/lib/api"

// ─── Types ───────────────────────────────────────────────────────────────────

type Reading = { ts: number; value: number }
type WsStatus = "connecting" | "connected" | "disconnected"

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_POINTS = 200
const RECONNECT_DELAY_MS = 3000

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Manages a live WebSocket connection to /api/v1/iot/ws/{deviceId}.
 * On mount (or when deviceId changes):
 *   1. Fetches cold-start history via REST (iotApi.getHistory)
 *   2. Opens a WebSocket and appends incoming readings to per-metric state
 *   3. Auto-reconnects after 3 s on close or error
 *   4. Cleans up WS + reconnect timer on unmount or deviceId change
 *
 * @param deviceId  sensor_device_id of the selected asset, or null if none selected
 * @param metrics   metric keys to initialise state for (from SENSOR_CATEGORY_MAP)
 * @returns readings per metric and current connection status
 */
export function useIotWebSocket(
  deviceId: string | null,
  metrics: string[],
): { readings: Record<string, Reading[]>; status: WsStatus } {
  const [readings, setReadings] = useState<Record<string, Reading[]>>({})
  const [status, setStatus] = useState<WsStatus>("disconnected")

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Guard: prevents setState calls after component unmounts or deviceId changes
  const isActiveRef = useRef(false)

  const connect = useCallback((devId: string) => {
    if (wsRef.current) {
      wsRef.current.close()
    }
    if (!isActiveRef.current) return

    setStatus("connecting")
    const ws = new WebSocket(iotApi.getWsUrl(devId))
    wsRef.current = ws

    ws.onopen = () => {
      if (!isActiveRef.current) return
      setStatus("connected")
    }

    ws.onmessage = (event: MessageEvent) => {
      if (!isActiveRef.current) return
      try {
        const msg = JSON.parse(event.data as string) as {
          ts: number
          value: number
          metric: string
          device_id: string
          unit: string
        }
        const key = msg.metric
        setReadings((prev) => {
          const existing = prev[key] ?? []
          const next = [...existing, { ts: msg.ts, value: msg.value }]
          return {
            ...prev,
            [key]: next.length > MAX_POINTS ? next.slice(-MAX_POINTS) : next,
          }
        })
      } catch {
        // malformed WS message — ignore silently
      }
    }

    ws.onclose = () => {
      if (!isActiveRef.current) return
      setStatus("disconnected")
      reconnectRef.current = setTimeout(() => {
        if (isActiveRef.current) connect(devId)
      }, RECONNECT_DELAY_MS)
    }

    ws.onerror = () => {
      ws.close() // triggers onclose which schedules reconnect
    }
  }, [])

  useEffect(() => {
    if (!deviceId) {
      setReadings({})
      setStatus("disconnected")
      return
    }

    isActiveRef.current = true
    setReadings({}) // reset state for new device

    // Cold-start history backfill (parallel with WS connect — no await)
    iotApi
      .getHistory(deviceId)
      .then((history: SensorReadingOut[]) => {
        if (!isActiveRef.current) return
        // Build seed from REST response (already ascending order from backend)
        const seed: Record<string, Reading[]> = {}
        for (const r of history) {
          if (!seed[r.metric]) seed[r.metric] = []
          seed[r.metric].push({ ts: new Date(r.recorded_at).getTime(), value: r.value })
        }
        // Merge: keep any WS points that arrived before history resolved
        setReadings((prev) => {
          const merged: Record<string, Reading[]> = { ...prev }
          for (const [key, pts] of Object.entries(seed)) {
            const existing = prev[key] ?? []
            // Combine history (older) with live WS points (newer), dedup by ts
            const combined = [...pts, ...existing].filter(
              (p, i, arr) => arr.findIndex((x) => x.ts === p.ts) === i,
            )
            merged[key] = combined.slice(-MAX_POINTS)
          }
          return merged
        })
      })
      .catch(() => {
        // History fetch failed — WS will still provide data; charts start empty
      })

    // Open WebSocket connection
    connect(deviceId)

    return () => {
      // Cleanup: mark inactive first so onclose does not schedule a reconnect
      isActiveRef.current = false
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
      if (wsRef.current) wsRef.current.close()
    }
  }, [deviceId, connect])

  return { readings, status }
}
