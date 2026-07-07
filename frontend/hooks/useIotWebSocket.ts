"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { type SensorReadingOut, iotApi } from "@/lib/api"

// ─── Types ───────────────────────────────────────────────────────────────────

type Reading = { ts: number; value: number }
type WsStatus = "connecting" | "connected" | "disconnected"

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_POINTS = 2000
const RECONNECT_DELAY_MS = 3000

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Manages a live WebSocket connection to /api/v1/iot/ws/{deviceId}.
 * On mount (or when deviceId/windowHours change):
 *   1. Fetches cold-start history from the DB via REST (iotApi.getHistory),
 *      scoped to the requested time window.
 *   2. Opens a WebSocket and appends incoming readings to per-metric state.
 *   3. Auto-reconnects after 3 s on close or error.
 *   4. Cleans up WS + reconnect timer on unmount or deviceId change.
 *
 * @param deviceId    sensor_device_id of the selected asset, or null if none selected
 * @param metrics     metric keys to initialise state for (from SENSOR_CATEGORY_MAP)
 * @param windowHours time window for history backfill (default 6h). Re-fetches on change.
 * @returns readings per metric, current connection status, and history loading flag
 */
export function useIotWebSocket(
  deviceId: string | null,
  metrics: string[],
  windowHours: number = 6,
): { readings: Record<string, Reading[]>; status: WsStatus; historyLoading: boolean } {
  const [readings, setReadings] = useState<Record<string, Reading[]>>({})
  const [status, setStatus] = useState<WsStatus>("disconnected")
  const [historyLoading, setHistoryLoading] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Guard: prevents setState calls after component unmounts or deviceId changes
  const isActiveRef = useRef(false)
  // Track current device so the WS isn't re-created on window change
  const currentDeviceRef = useRef<string | null>(null)

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

  // Re-fetch DB history whenever deviceId or windowHours changes
  useEffect(() => {
    if (!deviceId) {
      setReadings({})
      setHistoryLoading(false)
      setStatus("disconnected")
      return
    }

    isActiveRef.current = true
    setHistoryLoading(true)

    // Only reset readings + reconnect WS when the device itself changes
    const deviceChanged = currentDeviceRef.current !== deviceId
    if (deviceChanged) {
      currentDeviceRef.current = deviceId
      setReadings({})
      connect(deviceId)
    }

    // (Re-)fetch history for the selected time window
    iotApi
      .getHistory(deviceId, undefined, 2000, windowHours)
      .then((history: SensorReadingOut[]) => {
        if (!isActiveRef.current) return
        // Build seed from REST response (already ascending order from backend)
        const seed: Record<string, Reading[]> = {}
        for (const r of history) {
          if (!seed[r.metric]) seed[r.metric] = []
          seed[r.metric].push({ ts: new Date(r.recorded_at).getTime(), value: r.value })
        }
        setReadings((prev) => {
          const merged: Record<string, Reading[]> = {}
          // Gather all metric keys from both seed and existing live WS points
          const allKeys = new Set([...Object.keys(seed), ...Object.keys(prev)])
          for (const key of allKeys) {
            const histPts = seed[key] ?? []
            const livePts = prev[key] ?? []
            // Combine history (older) with live WS points (newer), dedup by ts
            const combined = [...histPts, ...livePts].filter(
              (p, i, arr) => arr.findIndex((x) => x.ts === p.ts) === i,
            )
            // Keep only points within the requested window
            const cutoff = Date.now() - windowHours * 3_600_000
            merged[key] = combined.filter((p) => p.ts >= cutoff).slice(-MAX_POINTS)
          }
          return merged
        })
      })
      .catch(() => {
        // History fetch failed — WS will still provide live data; charts may start empty
      })
      .finally(() => {
        if (isActiveRef.current) setHistoryLoading(false)
      })

    return () => {
      if (deviceChanged) {
        // Full cleanup only on device change
        isActiveRef.current = false
        if (reconnectRef.current) clearTimeout(reconnectRef.current)
        if (wsRef.current) wsRef.current.close()
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId, windowHours, connect])

  return { readings, status, historyLoading }
}
