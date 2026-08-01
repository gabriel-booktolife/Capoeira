"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const navigation = [
  { href: "/historia", label: "História" },
  { href: "/equipe", label: "Equipe" },
  { href: "/iniciativas", label: "Iniciativas" },
  { href: "/eventos", label: "Eventos" },
  { href: "/publicacoes", label: "Publicações" },
  { href: "/locais", label: "Locais" },
  { href: "/contato", label: "Contato" },
];

export function SiteHeader({ groupName }: { groupName: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="site-nav-shell">
      <div className="site-nav container">
        <Link className="site-brand" href="/" aria-label={`${groupName}, página inicial`}>
          <Image src="/media/logo.webp" width={62} height={62} alt="Símbolo do Chão Batido" priority />
          <span>
            <small>Associação de Capoeira</small>
            <strong>{groupName}</strong>
          </span>
        </Link>
        <button
          className="menu-toggle"
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="public-navigation"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
        >
          {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
        <nav id="public-navigation" className={open ? "site-links is-open" : "site-links"} aria-label="Navegação principal">
          {navigation.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} onClick={() => setOpen(false)}>{item.label}</Link>;
          })}
        </nav>
      </div>
    </header>
  );
}
