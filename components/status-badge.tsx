import { Badge } from "@/components/ui/badge"
import type { AssetStatus } from "@/lib/data"
import { cn } from "@/lib/utils"

const STYLES: Record<string, string> = {
  "Đang sử dụng": "bg-chart-1/15 text-chart-1 border-chart-1/30",
  "Sẵn sàng": "bg-chart-3/15 text-chart-3 border-chart-3/30",
  "Đang mượn": "bg-chart-4/15 text-chart-4 border-chart-4/30",
  "Bảo trì": "bg-chart-5/15 text-chart-5 border-chart-5/30",
  "Đã thanh lý": "bg-muted text-muted-foreground border-border",
  "Đã trả": "bg-chart-3/15 text-chart-3 border-chart-3/30",
  "Quá hạn": "bg-destructive/15 text-destructive border-destructive/30",
}

export function StatusBadge({ status }: { status: AssetStatus | string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", STYLES[status] ?? "")}>
      {status}
    </Badge>
  )
}
