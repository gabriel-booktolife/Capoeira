import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowDown, ArrowRight, MapPin } from "lucide-react";
import { ContentCard } from "@/components/public/content-card";
import { SectionHeading } from "@/components/public/section-heading";
import { getPublicItems, getSiteSettings } from "@/lib/content/repository";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return { title: settings.seoTitle, description: settings.seoDescription };
}

export default async function HomePage() {
  const [settings, stories, team, locations, initiatives, events, publications] = await Promise.all([
    getSiteSettings(),
    getPublicItems("stories"),
    getPublicItems("team"),
    getPublicItems("locations"),
    getPublicItems("initiatives"),
    getPublicItems("events"),
    getPublicItems("publications"),
  ]);
  const now = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const upcomingEvents = events.filter((item) => {
    const date = "date" in item ? item.date : undefined;
    return !date || date >= now;
  }).slice(0, 3);

  return (
    <main>
      <section className="home-hero dark-section">
        <video
          className="hero-video"
          src={settings.heroMedia?.type === "video" ? settings.heroMedia.url : "/media/presentation.mp4"}
          poster="/media/presentation-poster.webp"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-label="Apresentação do grupo Chão Batido"
        />
        <div className="hero-overlay" />
        <div className="hero-pattern" aria-hidden="true" />
        <div className="container hero-content">
          <div className="hero-seal"><Image src="/media/logo.webp" width={116} height={116} alt="" priority /></div>
          <p className="eyebrow">{settings.tagline}</p>
          <h1>{settings.heroTitle || settings.groupName}</h1>
          <p className="hero-copy">{settings.heroText}</p>
          <div className="hero-actions">
            <Link className="button primary" href="/historia">Conheça nossa história <ArrowRight size={19} /></Link>
            <Link className="button ghost" href="/locais"><MapPin size={19} /> Onde nos encontrar</Link>
          </div>
        </div>
        <a className="scroll-cue" href="#essencia" aria-label="Ir para o conteúdo"><span>Descubra</span><ArrowDown /></a>
      </section>

      {settings.aboutText ? <section id="essencia" className="manifesto-section content-section">
        <div className="container manifesto-grid">
          <div>
            <p className="eyebrow">{settings.aboutTitle || "Nossa essência"}</p>
            <h2>Corpo, memória<br />e comunidade.</h2>
          </div>
          <div className="manifesto-copy">
            <p>{settings.aboutText}</p>
            <Link className="text-link" href="/historia">Conhecer nossas raízes <ArrowRight size={18} /></Link>
          </div>
          <div className="manifesto-number" aria-hidden="true">01</div>
        </div>
      </section> : null}

      {stories.length ? (
        <section className="content-section warm-section">
          <div className="container">
            <SectionHeading eyebrow="Memória viva" title="Nossa história" text="Uma trajetória construída em roda, preservada na memória e renovada a cada encontro." href="/historia" linkLabel="Ver toda a história" />
            <div className="featured-grid"><ContentCard collection="stories" item={stories[0]} featured /></div>
          </div>
        </section>
      ) : null}

      {team.length ? (
        <section className="content-section">
          <div className="container">
            <SectionHeading eyebrow="Quem faz a roda" title="Nossa equipe" text="Pessoas que transformam conhecimento em presença, cuidado e continuidade." href="/equipe" linkLabel="Conheça a equipe" />
            <div className="content-grid team-grid">{team.slice(0, 4).map((item) => <ContentCard key={item.id} collection="team" item={item} />)}</div>
          </div>
        </section>
      ) : null}

      {locations.length ? (
        <section className="content-section dark-section location-section">
          <div className="container">
            <SectionHeading eyebrow="A roda começa aqui" title="Onde nos encontramos" text="Chegue, conheça e sinta de perto a energia do Chão Batido." href="/locais" linkLabel="Ver todos os locais" />
            <div className="content-grid">{locations.slice(0, 3).map((item) => <ContentCard key={item.id} collection="locations" item={item} />)}</div>
          </div>
        </section>
      ) : null}

      {initiatives.length ? (
        <section className="content-section warm-section">
          <div className="container">
            <SectionHeading eyebrow="Cultura em ação" title="Nossas iniciativas" text="Projetos que levam a capoeira além da roda e aproximam pessoas, territórios e saberes." href="/iniciativas" linkLabel="Explorar iniciativas" />
            <div className="content-grid">{initiatives.slice(0, 3).map((item) => <ContentCard key={item.id} collection="initiatives" item={item} />)}</div>
          </div>
        </section>
      ) : null}

      {upcomingEvents.length ? (
        <section className="content-section">
          <div className="container">
            <SectionHeading eyebrow="Próximos encontros" title="Agenda" text="Rodas, celebrações e momentos para compartilhar a capoeira." href="/eventos" linkLabel="Ver agenda completa" />
            <div className="content-grid">{upcomingEvents.map((item) => <ContentCard key={item.id} collection="events" item={item} />)}</div>
          </div>
        </section>
      ) : null}

      {publications.length ? (
        <section className="content-section warm-section">
          <div className="container">
            <SectionHeading eyebrow="Do nosso chão" title="Publicações recentes" href="/publicacoes" linkLabel="Ver todas" />
            <div className="content-grid">{publications.slice(0, 3).map((item) => <ContentCard key={item.id} collection="publications" item={item} />)}</div>
          </div>
        </section>
      ) : null}

      <section className="closing-cta dark-section">
        <div className="container closing-cta-inner">
          <p className="eyebrow">Chão Batido</p>
          <h2>Uma história que se conta em movimento.</h2>
          <Link className="button primary" href="/contato">Conecte-se com o grupo <ArrowRight size={19} /></Link>
        </div>
      </section>
    </main>
  );
}
