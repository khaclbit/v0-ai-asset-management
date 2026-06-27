import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const STYLES: Record<string, string> = {
  // Asset lifecycle states
  registered: "bg-chart-2/15 text-chart-2 border-chart-2/30",
  available: "bg-chart-3/15 text-chart-3 border-chart-3/30",
  assigned: "bg-chart-1/15 text-chart-1 border-chart-1/30",
  maintenance: "bg-chart-5/15 text-chart-5 border-chart-5/30",
  retired: "bg-muted text-muted-foreground border-border",
  // Assignment states
  requested: "bg-chart-2/15 text-chart-2 border-chart-2/30",
  active: "bg-chart-1/15 text-chart-1 border-chart-1/30",
  overdue: "bg-destructive/15 text-destructive border-destructive/30",
  closed: "bg-chart-3/15 text-chart-3 border-chart-3/30",
  rejected: "bg-muted text-muted-foreground border-border",
  // Maintenance states
  scheduled: "bg-chart-2/15 text-chart-2 border-chart-2/30",
  in_progress: "bg-chart-4/15 text-chart-4 border-chart-4/30",
  completed: "bg-chart-3/15 text-chart-3 border-chart-3/30",
  blocked: "bg-destructive/15 text-destructive border-destructive/30",
  // Warranty states
  expiring_soon: "bg-chart-4/15 text-chart-4 border-chart-4/30",
  expired: "bg-muted text-muted-foreground border-border",
  void: "bg-destructive/15 text-destructive border-destructive/30",
  // Risk levels
  High: "bg-destructive/15 text-destructive border-destructive/30",
  Medium: "bg-chart-4/15 text-chart-4 border-chart-4/30",
  Low: "bg-chart-3/15 text-chart-3 border-chart-3/30",
}

const LABELS: Record<string, string> = {
  in_progress: "In Progress",
  expiring_soon: "Expiring Soon",
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium capitalize", STYLES[status] ?? "")}>
      {LABELS[status] ?? status}
    </Badge>
  )
}
