import Image from "next/image";
import Link from "next/link";
import { Instagram, Mail, MapPin, MessageCircle, Youtube } from "lucide-react";
import type { SiteSettings } from "@/lib/content/types";

export function SiteFooter({ settings }: { settings: SiteSettings }) {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Image src="/media/logo.webp" width={92} height={92} alt="" />
          <div>
            <p className="eyebrow">Associação de Capoeira</p>
            <h2>{settings.groupName}</h2>
            <p>{settings.footerText || settings.tagline}</p>
          </div>
        </div>
        <div>
          <p className="footer-title">Explore</p>
          <div className="footer-links">
            <Link href="/historia">Nossa história</Link>
            <Link href="/equipe">Quem somos</Link>
            <Link href="/locais"><MapPin size={16} /> Onde estamos</Link>
          </div>
        </div>
        <div>
          <p className="footer-title">Conecte-se</p>
          <div className="footer-links">
            {settings.contactEmail ? <a href={`mailto:${settings.contactEmail}`}><Mail size={16} /> E-mail</a> : null}
            {settings.whatsapp ? <a href={`https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"><MessageCircle size={16} /> WhatsApp</a> : null}
            {settings.instagramUrl ? <a href={settings.instagramUrl} target="_blank" rel="noreferrer"><Instagram size={16} /> Instagram</a> : null}
            {settings.youtubeUrl ? <a href={settings.youtubeUrl} target="_blank" rel="noreferrer"><Youtube size={16} /> YouTube</a> : null}
          </div>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {year} {settings.groupName}</span>
        <span>Capoeira, cultura e comunidade.</span>
      </div>
    </footer>
  );
}
