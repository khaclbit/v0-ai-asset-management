"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Boxes, ShieldCheck, User, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

type Role = "Admin" | "Nhân viên"

export default function LoginPage() {
  const router = useRouter()
  const { login } = useStore()
  const [role, setRole] = useState<Role>("Admin")
  const [email, setEmail] = useState("admin@company.vn")
  const [password, setPassword] = useState("demo1234")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    login(email, role)
    router.push("/dashboard")
  }

  function pickRole(r: Role) {
    setRole(r)
    setEmail(r === "Admin" ? "admin@company.vn" : "nhanvien@company.vn")
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
            Quản lý tài sản doanh nghiệp, tăng tốc bằng AI.
          </h1>
          <p className="max-w-md text-pretty leading-relaxed text-sidebar-foreground/70">
            Theo dõi laptop, màn hình, máy in, xe nâng và thiết bị văn phòng. Quản lý mượn/trả, khấu hao,
            trợ lý hỏi đáp AI và trích xuất hóa đơn tự động bằng OCR.
          </p>
          <ul className="space-y-3 text-sm text-sidebar-foreground/80">
            <li className="flex items-center gap-3">
              <span className="flex size-6 items-center justify-center rounded-full bg-sidebar-accent">1</span>
              CRUD tài sản đầy đủ — thêm, cập nhật, thanh lý
            </li>
            <li className="flex items-center gap-3">
              <span className="flex size-6 items-center justify-center rounded-full bg-sidebar-accent">2</span>
              Báo cáo số lượng, giá trị và khấu hao
            </li>
            <li className="flex items-center gap-3">
              <span className="flex size-6 items-center justify-center rounded-full bg-sidebar-accent">3</span>
              Trợ lý AI &amp; OCR hóa đơn
            </li>
          </ul>
        </div>

        <p className="text-xs text-sidebar-foreground/50">
          Bản demo giao diện — dữ liệu là dữ liệu mẫu, không kết nối cơ sở dữ liệu thật.
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
            <h2 className="text-2xl font-semibold tracking-tight">Đăng nhập</h2>
            <p className="text-sm text-muted-foreground">Chọn vai trò để trải nghiệm phân quyền.</p>
          </div>

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-3">
            <RoleCard
              active={role === "Admin"}
              onClick={() => pickRole("Admin")}
              icon={<ShieldCheck className="size-5" />}
              title="Admin"
              desc="Toàn quyền quản trị"
            />
            <RoleCard
              active={role === "Nhân viên"}
              onClick={() => pickRole("Nhân viên")}
              icon={<User className="size-5" />}
              title="Nhân viên"
              desc="Mượn / trả tài sản"
            />
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
              <Label htmlFor="password">Mật khẩu</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full gap-2">
              Đăng nhập với vai trò {role}
              <ArrowRight className="size-4" />
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Đây là tài khoản demo — bạn có thể đăng nhập trực tiếp.
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
