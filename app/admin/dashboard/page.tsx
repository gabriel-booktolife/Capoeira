import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { sectionConfigs } from "@/lib/content/config";
import { getAdminDashboardCounts } from "@/lib/content/repository";

export default async function AdminDashboardPage() {
  await requireAdmin();
  const counts = await getAdminDashboardCounts();
  return <><header className="admin-page-header"><div><h1>Visão geral</h1><p>Um retrato rápido do conteúdo público e do que ainda precisa de revisão.</p></div></header><div className="stats-grid">{sectionConfigs.map((section) => { const value = counts[section.collection]; return <Link className="stat-card" href={`/admin/dashboard/${section.collection}`} key={section.collection}><small>{section.label}</small><strong>{value.total}</strong><span>{value.published} publicados · {value.draft} rascunhos{value.deleting ? ` · ${value.deleting} exclusões pendentes` : ""}</span></Link>; })}</div></>;
}
