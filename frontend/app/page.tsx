"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useStore } from "@/lib/store"
import type { UserRole } from "@/lib/data"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Boxes, ShieldCheck, Briefcase, User, Search, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

const ROLES: {
  role: UserRole
  icon: React.ReactNode
  title: string
  desc: string
  email: string
}[] = [
  {
    role: "Admin",
    icon: <ShieldCheck className="size-5" />,
    title: "Admin",
    desc: "Full system access",
    email: "alex.carter@company.com",
  },
  {
    role: "Asset Manager",
    icon: <Briefcase className="size-5" />,
    title: "Asset Manager",
    desc: "Approve & manage assets",
    email: "sarah.mitchell@company.com",
  },
  {
    role: "Staff",
    icon: <User className="size-5" />,
    title: "Staff",
    desc: "Request & return assets",
    email: "james.walker@company.com",
  },
  {
    role: "Auditor",
    icon: <Search className="size-5" />,
    title: "Auditor",
    desc: "Read-only audit access",
    email: "linda.torres@company.com",
  },
]

export default function LoginPage() {
  const router = useRouter()
  const { login } = useStore()
  const [role, setRole] = useState<UserRole>("Admin")
  const [email, setEmail] = useState("alex.carter@company.com")
  const [password, setPassword] = useState("demo1234")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    login(email, role)
    router.push("/dashboard")
  }

  function pickRole(r: UserRole, defaultEmail: string) {
    setRole(r)
    setEmail(defaultEmail)
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <section className="relative hidden flex-col justify-between bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Boxes className="size-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">AssetIQ</span>
        </div>

        <div className="space-y-6">
          <h1 className="text-balance text-4xl font-semibold leading-tight">
            Enterprise asset management, accelerated by AI.
          </h1>
          <p className="max-w-md text-pretty leading-relaxed text-sidebar-foreground/70">
            Track laptops, monitors, printers, forklifts, and office equipment. Manage assignments, maintenance
            schedules, AI-assisted queries, and OCR invoice intake — all in one place.
          </p>
          <ul className="space-y-3 text-sm text-sidebar-foreground/80">
            <li className="flex items-center gap-3">
              <span className="flex size-6 items-center justify-center rounded-full bg-sidebar-accent">1</span>
              Full asset CRUD — register, assign, maintain, retire
            </li>
            <li className="flex items-center gap-3">
              <span className="flex size-6 items-center justify-center rounded-full bg-sidebar-accent">2</span>
              Reports by category, lifecycle state, and depreciation
            </li>
            <li className="flex items-center gap-3">
              <span className="flex size-6 items-center justify-center rounded-full bg-sidebar-accent">3</span>
              AI assistant, OCR intake, and predictive maintenance
            </li>
          </ul>
        </div>

        <p className="text-xs text-sidebar-foreground/50">
          UI demo — all data is mock; no real backend connection.
        </p>
      </section>

      {/* Login form */}
      <section className="flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2 lg:hidden">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Boxes className="size-5" />
              </div>
              <span className="text-lg font-semibold tracking-tight">AssetIQ</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
            <p className="text-sm text-muted-foreground">Select a role to experience permission-based access.</p>
          </div>

          {/* Role selector — 2×2 grid */}
          <div className="grid grid-cols-2 gap-3">
            {ROLES.map(({ role: r, icon, title, desc, email: defaultEmail }) => (
              <RoleCard
                key={r}
                active={role === r}
                onClick={() => pickRole(r, defaultEmail)}
                icon={icon}
                title={title}
                desc={desc}
              />
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full gap-2">
              Sign in as {role}
              <ArrowRight className="size-4" />
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            This is a demo account — sign in directly without a real password.
          </p>
        </div>
      </section>
    </main>
  )
}

function RoleCard({
  active,
  onClick,
  icon,
  title,
  desc,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  title: string
  desc: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors",
        active
          ? "border-primary bg-accent ring-1 ring-primary"
          : "border-border bg-card hover:bg-accent/50",
      )}
    >
      <span
        className={cn(
          "flex size-9 items-center justify-center rounded-md",
          active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
        )}
      >
        {icon}
      </span>
      <span className="text-sm font-medium">{title}</span>
      <span className="text-xs text-muted-foreground">{desc}</span>
    </button>
  )
}
