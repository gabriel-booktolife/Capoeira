import type { Metadata } from "next";
import { Instagram, Mail, MessageCircle, Youtube } from "lucide-react";
import { getSiteSettings } from "@/lib/content/repository";

export const metadata: Metadata = { title: "Contato" };

export default async function ContactPage() {
  const settings = await getSiteSettings();
  const links = [
    settings.whatsapp ? { href: `https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`, label: "Conversar pelo WhatsApp", icon: MessageCircle } : null,
    settings.contactEmail ? { href: `mailto:${settings.contactEmail}`, label: settings.contactEmail, icon: Mail } : null,
    settings.instagramUrl ? { href: settings.instagramUrl, label: "Acompanhar no Instagram", icon: Instagram } : null,
    settings.youtubeUrl ? { href: settings.youtubeUrl, label: "Assistir no YouTube", icon: Youtube } : null,
  ].filter(Boolean) as Array<{ href: string; label: string; icon: typeof Mail }>;
  return (
    <main>
      <section className="contact-hero dark-section">
        <div className="container contact-grid">
          <div><p className="eyebrow">Conecte-se</p><h1>Vamos manter essa roda em movimento.</h1><p>Conheça o Chão Batido, acompanhe nossas atividades e converse com a gente pelos canais oficiais.</p></div>
          <div className="contact-links">
            {links.length ? links.map(({ href, label, icon: Icon }) => <a key={href} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer"><Icon /><span>{label}</span></a>) : <p>Os canais de contato estão sendo organizados. Volte em breve.</p>}
          </div>
        </div>
      </section>
    </main>
  );
}
