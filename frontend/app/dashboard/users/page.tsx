"use client"

import { useState } from "react"
import { Plus, UserCheck, UserX } from "lucide-react"

import { StatusBadge } from "@/components/status-badge"
import { Topbar } from "@/components/topbar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SEED_MANAGED_USERS, type ManagedUser, type UserRole } from "@/lib/data"
import { formatDate } from "@/lib/data"
import { useStore } from "@/lib/store"

const ROLE_OPTIONS: UserRole[] = ["Admin", "Asset Manager", "Staff", "Auditor"]

type EditRoleTarget = { userId: string; currentRole: UserRole }
type DeactivateTarget = { userId: string; name: string }

function CreateUserDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean
  onClose: () => void
  onCreate: (user: ManagedUser) => void
}) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<UserRole>("Staff")
  const [department, setDepartment] = useState("")

  function handleSubmit() {
    if (!name.trim() || !email.trim() || !department.trim()) return
    onCreate({
      id: `USR-${String(Date.now()).slice(-6)}`,
      name: name.trim(),
      email: email.trim(),
      role,
      department: department.trim(),
      isActive: true,
      createdAt: new Date().toISOString().slice(0, 10),
    })
    setName("")
    setEmail("")
    setRole("Staff")
    setDepartment("")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create User</DialogTitle>
          <DialogDescription>Add a new user account to the system.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="cu-name">Full Name</Label>
            <Input id="cu-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cu-email">Email</Label>
            <Input id="cu-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane.doe@company.com" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cu-dept">Department</Label>
            <Input id="cu-dept" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Engineering" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cu-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger id="cu-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cu-pw">Password</Label>
            <Input id="cu-pw" type="password" placeholder="(demo only — not stored)" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || !email.trim() || !department.trim()}>
            Create User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function UsersPage() {
  const { user } = useStore()
  const [users, setUsers] = useState<ManagedUser[]>(SEED_MANAGED_USERS)
  const [showCreate, setShowCreate] = useState(false)
  const [editRoleTarget, setEditRoleTarget] = useState<EditRoleTarget | null>(null)
  const [editRoleValue, setEditRoleValue] = useState<UserRole>("Staff")
  const [deactivateTarget, setDeactivateTarget] = useState<DeactivateTarget | null>(null)

  const isAdmin = user?.role === "Admin"

  function handleCreate(newUser: ManagedUser) {
    setUsers((prev) => [newUser, ...prev])
  }

  function openEditRole(u: ManagedUser) {
    setEditRoleTarget({ userId: u.id, currentRole: u.role })
    setEditRoleValue(u.role)
  }

  function confirmEditRole() {
    if (!editRoleTarget) return
    setUsers((prev) =>
      prev.map((u) => u.id === editRoleTarget.userId ? { ...u, role: editRoleValue } : u),
    )
    setEditRoleTarget(null)
  }

  function openDeactivate(u: ManagedUser) {
    setDeactivateTarget({ userId: u.id, name: u.name })
  }

  function confirmDeactivate() {
    if (!deactivateTarget) return
    setUsers((prev) =>
      prev.map((u) => u.id === deactivateTarget.userId ? { ...u, isActive: false } : u),
    )
    setDeactivateTarget(null)
  }

  if (!isAdmin) {
    return (
      <>
        <Topbar title="User Management" subtitle="Administrator access required" />
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="text-sm text-muted-foreground">This page is restricted to Administrators.</p>
        </div>
      </>
    )
  }

  return (
    <>
      <Topbar title="User Management" subtitle="Manage user accounts, roles, and access" />
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{users.length} users · {users.filter((u) => u.isActive).length} active</p>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="mr-1.5 size-4" />
            Create User
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id} className={!u.isActive ? "opacity-60" : undefined}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell>{u.department}</TableCell>
                      <TableCell>
                        <Badge variant={u.role === "Admin" ? "default" : u.role === "Asset Manager" ? "secondary" : "outline"}>
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {u.isActive ? (
                          <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                            <UserCheck className="size-3.5" /> Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <UserX className="size-3.5" /> Inactive
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditRole(u)}
                            disabled={!u.isActive}
                          >
                            Edit Role
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDeactivate(u)}
                            disabled={!u.isActive}
                          >
                            Deactivate
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <CreateUserDialog open={showCreate} onClose={() => setShowCreate(false)} onCreate={handleCreate} />

      {/* Edit Role Dialog — USER-04 */}
      <Dialog open={!!editRoleTarget} onOpenChange={(v) => !v && setEditRoleTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit User Role</DialogTitle>
            <DialogDescription>
              Change role for <strong>{users.find((u) => u.id === editRoleTarget?.userId)?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="edit-role">New Role</Label>
            <Select value={editRoleValue} onValueChange={(v) => setEditRoleValue(v as UserRole)}>
              <SelectTrigger id="edit-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRoleTarget(null)}>Cancel</Button>
            <Button onClick={confirmEditRole}>Save Role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation Dialog — USER-05 */}
      <Dialog open={!!deactivateTarget} onOpenChange={(v) => !v && setDeactivateTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Deactivate User</DialogTitle>
            <DialogDescription>
              This will deactivate <strong>{deactivateTarget?.name}</strong>. Their account will remain in the system
              but they will not be able to log in. This action can be reversed by an Administrator.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDeactivate}>Deactivate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
