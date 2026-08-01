import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { getAdminSession } from "@/lib/auth/session";

export default async function AdminLoginPage() {
  if (await getAdminSession()) redirect("/admin/dashboard");
  return <main className="admin-auth-shell"><LoginForm /></main>;
}
