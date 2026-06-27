"use client"

import { useMemo } from "react"

import { Topbar } from "@/components/topbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDate } from "@/lib/data"
import {
  buildAssetOverviewReport,
  buildAssignmentReport,
  buildMaintenanceReport,
} from "@/lib/reporting"
import { useStore } from "@/lib/store"

export default function ReportsPage() {
  const { user, assets, assignmentRecords, maintenanceRecords } = useStore()

  const assetReport = useMemo(() => buildAssetOverviewReport(assets), [assets])
  const assignmentReport = useMemo(
    () => buildAssignmentReport(assignmentRecords, user),
    [assignmentRecords, user],
  )
  const maintenanceReport = useMemo(
    () => buildMaintenanceReport(maintenanceRecords),
    [maintenanceRecords],
  )

  return (
    <>
      <Topbar title="Reports" subtitle="Asset overview, assignment history, and maintenance schedule" />
      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Asset Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Total Assets: {assetReport.total}</p>
            <div className="grid gap-4 lg:grid-cols-2">
              <SimpleCountTable title="Asset by Category" rows={assetReport.byCategory} />
              <SimpleCountTable title="Asset by Lifecycle State" rows={assetReport.byStatus} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assignment Report</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-2">
            <AssignmentTable title="Active Assignments" records={assignmentReport.active} />
            <AssignmentTable title="Historical Assignments" records={assignmentReport.historical} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Maintenance Report</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-2">
            <MaintenanceTable title="Upcoming Maintenance" records={maintenanceReport.upcoming} />
            <MaintenanceTable title="Overdue Maintenance" records={maintenanceReport.overdue} />
          </CardContent>
        </Card>
      </div>
    </>
  )
}

function SimpleCountTable({
  title,
  rows,
}: {
  title: string
  rows: Array<{ label: string; count: number }>
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Label</TableHead>
              <TableHead className="text-right">Count</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.label}>
                <TableCell>{row.label}</TableCell>
                <TableCell className="text-right">{row.count}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function AssignmentTable({
  title,
  records,
}: {
  title: string
  records: Array<{
    id: string
    assetName: string
    assignee: string
    status: string
    dueDate: string
    returnDate: string | null
  }>
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  No records
                </TableCell>
              </TableRow>
            ) : (
              records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{record.assetName}</TableCell>
                  <TableCell>{record.assignee}</TableCell>
                  <TableCell>{record.status}</TableCell>
                  <TableCell>{formatDate(record.returnDate ?? record.dueDate)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function MaintenanceTable({
  title,
  records,
}: {
  title: string
  records: Array<{
    id: string
    assetName: string
    status: string
    scheduledDate: string
  }>
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Scheduled Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground">
                  No records
                </TableCell>
              </TableRow>
            ) : (
              records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{record.assetName}</TableCell>
                  <TableCell>{record.status}</TableCell>
                  <TableCell>{formatDate(record.scheduledDate)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
