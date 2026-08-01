"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, FileText, Gauge, History, House, LogOut, MapPin, Settings, Users, Waypoints } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";

const links = [
  ["/admin/dashboard", "Visão geral", Gauge],
  ["/admin/dashboard/publications", "Publicações", FileText],
  ["/admin/dashboard/events", "Eventos", CalendarDays],
  ["/admin/dashboard/initiatives", "Iniciativas", Waypoints],
  ["/admin/dashboard/team", "Equipe", Users],
  ["/admin/dashboard/stories", "História", History],
  ["/admin/dashboard/locations", "Locais", MapPin],
  ["/admin/dashboard/configuracoes", "Configurações", Settings],
] as const;

export function AdminNavigation({ email, superadmin }: { email: string; superadmin: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/session", { method: "DELETE" });
    await signOut(auth).catch(() => undefined);
    router.replace("/admin"); router.refresh();
  }
  return <aside className="admin-sidebar">
    <Link className="site-brand" href="/admin/dashboard"><Image src="/media/logo.webp" width={44} height={56} alt="" /><span><strong>Chão Batido</strong><small>Administração</small></span></Link>
    <nav className="admin-nav" aria-label="Administração">
      {links.map(([href, label, Icon]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} className={pathname === href ? "active" : ""}><Icon size={17} />{label}</Link>)}
      {superadmin ? <Link href="/admin/dashboard/administradores" className={pathname === "/admin/dashboard/administradores" ? "active" : ""}><Users size={17} />Administradores</Link> : null}
    </nav>
    <div className="admin-sidebar-footer"><small>{email}</small><Link href="/" target="_blank"><House size={15} /> Ver site público</Link><button className="admin-button" type="button" onClick={() => void logout()}><LogOut size={15} /> Sair</button></div>
  </aside>;
}
