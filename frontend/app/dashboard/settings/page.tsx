"use client"

import { useEffect, useState } from "react"
import { Loader2, Play, Save, Settings2 } from "lucide-react"
import { toast } from "sonner"

import { Topbar } from "@/components/topbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { anomalyApi } from "@/lib/api"
import { useStore } from "@/lib/store"

const MODEL_OPTIONS = ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"] as const

export default function SettingsPage() {
  const { user } = useStore()
  const isAdmin = user?.role === "Admin"

  const [loadingSettings, setLoadingSettings] = useState(true)
  const [saving, setSaving] = useState(false)
  const [runningNow, setRunningNow] = useState(false)

  // Form state
  const [apiKey, setApiKey] = useState("")
  const [model, setModel] = useState<string>("gpt-4o-mini")
  const [intervalMinutes, setIntervalMinutes] = useState<number>(60)

  // Track whether the API key is already saved (show masked placeholder)
  const [apiKeySaved, setApiKeySaved] = useState(false)

  // Load current settings on mount (Admin only)
  useEffect(() => {
    if (!isAdmin) return
    setLoadingSettings(true)
    anomalyApi
      .getSettings()
      .then((settings) => {
        for (const s of settings) {
          if (s.key === "ai_anomaly_model") setModel(s.value)
          if (s.key === "ai_anomaly_interval_minutes") {
            const parsed = parseInt(s.value, 10)
            if (!isNaN(parsed)) setIntervalMinutes(parsed)
          }
          if (s.key === "openai_api_key" && s.value) setApiKeySaved(true)
        }
      })
      .catch(() => {
        // API unavailable — defaults remain
      })
      .finally(() => setLoadingSettings(false))
  }, [isAdmin])

  async function handleSave() {
    setSaving(true)
    try {
      const updates: Promise<unknown>[] = [
        anomalyApi.updateSetting("ai_anomaly_model", model),
        anomalyApi.updateSetting("ai_anomaly_interval_minutes", String(intervalMinutes)),
      ]
      // Only send API key if the user typed something new
      if (apiKey.trim()) {
        updates.push(anomalyApi.updateSetting("openai_api_key", apiKey.trim()))
      }
      await Promise.all(updates)
      toast.success("Settings saved successfully")
      if (apiKey.trim()) {
        setApiKeySaved(true)
        setApiKey("")
      }
    } catch {
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  async function handleRunNow() {
    setRunningNow(true)
    try {
      await anomalyApi.runNow()
      toast.success("Anomaly detection triggered successfully")
    } catch {
      toast.error("Failed to trigger anomaly detection")
    } finally {
      setRunningNow(false)
    }
  }

  // Non-admin view
  if (!isAdmin) {
    return (
      <>
        <Topbar title="Settings" subtitle="System configuration" />
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-8 text-center">
            <p className="text-lg font-semibold text-destructive">403 — Access Denied</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Settings are only accessible to Administrators.
            </p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Topbar title="Settings" subtitle="System and AI configuration" />

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
        {/* AI Anomaly Detection Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings2 className="size-4" />
              AI Anomaly Detection
            </CardTitle>
            <CardDescription>
              Configure the OpenAI model and detection schedule used for sensor anomaly analysis.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {loadingSettings ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading settings…
              </div>
            ) : (
              <>
                {/* OpenAI API Key */}
                <div className="grid gap-2">
                  <Label htmlFor="openai-api-key">OpenAI API Key</Label>
                  <Input
                    id="openai-api-key"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={apiKeySaved ? "••••••••  (key already saved — leave blank to keep)" : "sk-…"}
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave blank to keep the existing key. New value will be stored securely.
                  </p>
                </div>

                <Separator />

                {/* Detection Model */}
                <div className="grid gap-2">
                  <Label htmlFor="detection-model">Detection Model</Label>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger id="detection-model" className="w-64">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {MODEL_OPTIONS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Model used for anomaly explanation generation.
                  </p>
                </div>

                <Separator />

                {/* Detection Interval */}
                <div className="grid gap-2">
                  <Label htmlFor="interval-minutes">Detection Interval (minutes)</Label>
                  <Input
                    id="interval-minutes"
                    type="number"
                    min={1}
                    max={1440}
                    value={intervalMinutes}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10)
                      if (!isNaN(v) && v >= 1 && v <= 1440) setIntervalMinutes(v)
                    }}
                    className="w-40"
                  />
                  <p className="text-xs text-muted-foreground">
                    How often the anomaly detection job runs (1 – 1440 minutes).
                  </p>
                </div>

                <Separator />

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <><Loader2 className="mr-2 size-4 animate-spin" />Saving…</>
                    ) : (
                      <><Save className="mr-2 size-4" />Save Settings</>
                    )}
                  </Button>

                  <Button
                    variant="destructive"
                    className="border border-destructive bg-transparent text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    disabled={runningNow}
                    onClick={handleRunNow}
                  >
                    {runningNow ? (
                      <><Loader2 className="mr-2 size-4 animate-spin" />Running…</>
                    ) : (
                      <><Play className="mr-2 size-4" />Run Detection Now</>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
