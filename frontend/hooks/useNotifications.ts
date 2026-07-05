"use client"

import { useEffect, useRef } from "react"

import { type ApiNotification, notificationsApi } from "@/lib/api"
import { type AppNotification } from "@/lib/data"
import { useStore } from "@/lib/store"

/**
 * useNotifications — SSE-based real-time notification hook.
 *
 * Connects to GET /api/v1/notifications/stream?token=<jwt> on mount.
 * Each SSE event is an ApiNotification JSON object. The hook:
 *   1. Loads initial notifications from REST on mount
 *   2. Prepends incoming SSE events to store.notifications
 *   3. Reconnects on error/close with 3s backoff (capped at 30s)
 *
 * The store's markNotificationRead / markAllNotificationsRead actions
 * must also call the REST API — this hook wires only the inbound SSE stream.
 */
export function useNotifications() {
  const { setNotifications, prependNotification } = useStore()
  const esRef = useRef<EventSource | null>(null)
  const backoffRef = useRef(3000)
  const isActiveRef = useRef(true)

  function toAppNotification(api: ApiNotification): AppNotification {
    return {
      id: api.id,
      type: api.type,
      title: api.title,
      message: api.message,
      isRead: api.is_read,
      createdAt: api.created_at,
      href: api.href ?? undefined,
    }
  }

  useEffect(() => {
    isActiveRef.current = true

    // Load initial notifications from REST
    notificationsApi
      .list()
      .then((items) => {
        if (isActiveRef.current) {
          setNotifications(items.map(toAppNotification))
        }
      })
      .catch(() => {
        // REST load failure is non-fatal — keep existing store state
      })

    function connect() {
      const url = notificationsApi.getSseUrl()
      if (!url) return // no token yet

      const es = new EventSource(url)
      esRef.current = es

      es.onmessage = (evt) => {
        if (!isActiveRef.current) return
        try {
          const data: ApiNotification = JSON.parse(evt.data)
          prependNotification(toAppNotification(data))
          backoffRef.current = 3000 // reset backoff on successful message
        } catch {
          // malformed event — ignore
        }
      }

      es.onerror = () => {
        es.close()
        esRef.current = null
        if (!isActiveRef.current) return
        const delay = Math.min(backoffRef.current, 30000)
        backoffRef.current = Math.min(backoffRef.current * 2, 30000)
        setTimeout(connect, delay)
      }
    }

    connect()

    return () => {
      isActiveRef.current = false
      esRef.current?.close()
      esRef.current = null
    }
  }, [])
}
