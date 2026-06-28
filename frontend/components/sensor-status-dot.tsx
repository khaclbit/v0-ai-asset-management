export function SensorStatusDot({ sensorDeviceId }: { sensorDeviceId?: string | null }) {
  if (!sensorDeviceId) return <span className="text-muted-foreground">—</span>
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block size-2 rounded-full bg-chart-3" />
      <span className="font-mono text-xs text-muted-foreground">{sensorDeviceId}</span>
    </span>
  )
}
