import { AdminNavigation } from "@/components/admin/admin-navigation";
import { requireAdmin } from "@/lib/auth/session";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  return <div className="admin-shell"><AdminNavigation email={session.email || "Administrador"} superadmin={session.superadmin === true} /><main className="admin-content">{children}</main></div>;
}
