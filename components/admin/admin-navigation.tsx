"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CalendarDays, FileText, Gauge, History, House, LogOut, MapPin, Menu, Settings, Users, Waypoints, X } from "lucide-react";
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

function Brand() {
  return <Link className="site-brand" href="/admin/dashboard"><Image src="/media/logo.webp" width={44} height={56} alt="" /><span><strong>Chão Batido</strong><small>Administração</small></span></Link>;
}

export function AdminNavigation({ email, superadmin }: { email: string; superadmin: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!drawerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [drawerOpen]);

  function closeDrawer(returnFocus = false) {
    setDrawerOpen(false);
    if (returnFocus) requestAnimationFrame(() => menuButtonRef.current?.focus());
  }

  function openDrawer() {
    setDrawerOpen(true);
    window.setTimeout(() => closeButtonRef.current?.focus(), 0);
  }

  async function logout() {
    await fetch("/api/auth/session", { method: "DELETE" });
    await signOut(auth).catch(() => undefined);
    router.replace("/admin");
    router.refresh();
  }

  return <>
    <header className="admin-mobile-header">
      <Brand />
      <button ref={menuButtonRef} className="admin-menu-button" type="button" aria-controls="admin-navigation-drawer" aria-expanded={drawerOpen} aria-label="Abrir menu de administração" onClick={openDrawer}><Menu size={22} /><span>Menu</span></button>
    </header>
    <button className={`admin-drawer-backdrop${drawerOpen ? " is-open" : ""}`} type="button" aria-label="Fechar menu de administração" tabIndex={drawerOpen ? 0 : -1} onClick={() => closeDrawer(true)} />
    <aside id="admin-navigation-drawer" className={`admin-sidebar${drawerOpen ? " is-open" : ""}`}>
      <div className="admin-drawer-heading"><Brand /><button ref={closeButtonRef} className="admin-drawer-close" type="button" aria-label="Fechar menu de administração" onClick={() => closeDrawer(true)}><X size={22} /></button></div>
      <nav className="admin-nav" aria-label="Administração">
        {links.map(([href, label, Icon]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} className={pathname === href ? "active" : ""} onClick={() => closeDrawer()}><Icon size={17} />{label}</Link>)}
        {superadmin ? <Link href="/admin/dashboard/administradores" aria-current={pathname === "/admin/dashboard/administradores" ? "page" : undefined} className={pathname === "/admin/dashboard/administradores" ? "active" : ""} onClick={() => closeDrawer()}><Users size={17} />Administradores</Link> : null}
      </nav>
      <div className="admin-sidebar-footer"><small>{email}</small><Link href="/" target="_blank"><House size={15} /> Ver site público</Link><button className="admin-button" type="button" onClick={() => void logout()}><LogOut size={15} /> Sair</button></div>
    </aside>
  </>;
}
