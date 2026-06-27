"use client"

import { Fragment, useMemo, useState } from "react"

import { Topbar } from "@/components/topbar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AUDIT_CATEGORIES,
  getAuditCorrelationLabel,
  getAuditEventsByCategory,
  type AuditCategory,
} from "@/lib/audit-log"
import { formatDate } from "@/lib/data"

export default function AuditPage() {
  const [selectedCategory, setSelectedCategory] = useState<AuditCategory | "All">("All")
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null)
  const correlationLabel = getAuditCorrelationLabel()

  const events = useMemo(
    () => getAuditEventsByCategory(selectedCategory),
    [selectedCategory],
  )

  function toggleExpanded(id: string) {
    setExpandedEventId((current) => (current === id ? null : id))
  }

  return (
    <>
      <Topbar title="Audit Log" subtitle="Immutable event trail with category filters and expandable details" />
      <div className="flex-1 overflow-y-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Audit Event Log</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === "All" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory("All")}
              >
                All
              </Button>
              {AUDIT_CATEGORIES.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>

            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Before</TableHead>
                    <TableHead>After</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>{correlationLabel}</TableHead>
                    <TableHead className="text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-muted-foreground">
                        No audit events in this category
                      </TableCell>
                    </TableRow>
                  ) : (
                    events.map((event) => (
                      <Fragment key={event.id}>
                        <TableRow>
                          <TableCell>{event.actor}</TableCell>
                          <TableCell>{event.action}</TableCell>
                          <TableCell>{event.entity}</TableCell>
                          <TableCell>{event.before}</TableCell>
                          <TableCell>{event.after}</TableCell>
                          <TableCell>{formatDate(event.timestamp)}</TableCell>
                          <TableCell>{event.correlation_id}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleExpanded(event.id)}
                              aria-label={`Toggle details for ${event.id}`}
                            >
                              {expandedEventId === event.id ? "Hide details" : "View details"}
                            </Button>
                          </TableCell>
                        </TableRow>
                        {expandedEventId === event.id ? (
                          <TableRow>
                            <TableCell colSpan={8}>
                              <div className="space-y-2 rounded-md bg-muted/40 p-3">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">{event.category}</Badge>
                                  <span className="text-xs text-muted-foreground">Event ID: {event.id}</span>
                                </div>
                                <p className="text-sm">
                                  <span className="font-medium">Before:</span> {event.before}
                                </p>
                                <p className="text-sm">
                                  <span className="font-medium">After:</span> {event.after}
                                </p>
                                <p className="text-sm">
                                  <span className="font-medium">{correlationLabel}:</span> {event.correlation_id}
                                </p>
                                <p className="text-sm">
                                  <span className="font-medium">AI Recommendation:</span>{" "}
                                  {event.aiRecommendation
                                    ? `${event.aiRecommendation.id} — ${event.aiRecommendation.summary}`
                                    : "None"}
                                </p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </Fragment>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
