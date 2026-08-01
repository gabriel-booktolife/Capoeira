import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock3, ExternalLink, MapPin } from "lucide-react";
import { sectionByCollection } from "@/lib/content/config";
import { contentDescription, contentTitle, formatDate, isNoticeActive } from "@/lib/content/format";
import { getPublicItemBySlug, getPublicItems } from "@/lib/content/repository";
import type { ContentCollection, EventItem, Initiative, LocationItem, ScheduleItem, Story, TeamMember } from "@/lib/content/types";
import { MediaGallery } from "./media-gallery";

export async function ContentDetail({ collection, slug }: { collection: ContentCollection; slug: string }) {
  const item = await getPublicItemBySlug(collection, slug);
  if (!item) notFound();
  const section = sectionByCollection[collection];
  const title = contentTitle(section.kind, item);
  const description = contentDescription(item);
  const media = "media" in item ? item.media || [] : "photo" in item && item.photo ? [item.photo] : [];
  const date = "date" in item ? item.date : undefined;
  const time = "time" in item ? item.time : undefined;
  const address = "address" in item ? item.address : undefined;
  const story = collection === "stories" ? item as Story : null;
  const team = collection === "team" ? item as TeamMember : null;
  const initiative = collection === "initiatives" ? item as Initiative : null;
  const location = collection === "locations" ? item as LocationItem : null;
  const event = collection === "events" ? item as EventItem : null;
  const [teamMembers, locations] = await Promise.all([
    initiative?.teamIds?.length ? getPublicItems("team") : Promise.resolve([]),
    event?.locationId || initiative?.locationId ? getPublicItems("locations") : Promise.resolve([]),
  ]);
  const responsible = initiative?.teamIds?.length ? teamMembers.filter((member) => initiative.teamIds?.includes(member.id)) as TeamMember[] : [];
  const linkedLocation = locations.find((entry) => entry.id === (event?.locationId || initiative?.locationId)) as LocationItem | undefined;
  const displayAddress = address || linkedLocation?.address;
  const scheduleItems = (initiative?.scheduleItems || location?.scheduleItems || []) as ScheduleItem[];

  return (
    <main>
      <article className="detail-page">
        <header className="detail-header dark-section">
          <div className="container detail-header-grid">
            <div>
              <Link className="back-link" href={section.publicPath}><ArrowLeft size={18} /> Voltar para {section.label.toLowerCase()}</Link>
              <p className="eyebrow">{section.singular}</p>
              <h1>{title}</h1>
              {story?.summary ? <p className="detail-lead">{story.summary}</p> : null}
              <div className="detail-meta">
                {date ? <span><CalendarDays />{formatDate(date)}</span> : null}
                {time ? <span><Clock3 />{time}</span> : null}
                {displayAddress ? <span><MapPin />{displayAddress}</span> : null}
                {team?.graduation ? <span>{team.graduation}</span> : null}
                {team?.role ? <span>{team.role}</span> : null}
              </div>
            </div>
            {media.length ? <MediaGallery media={media} ratio={collection === "team" ? "portrait" : "landscape"} priority /> : <div className="detail-mark" aria-hidden="true">CB</div>}
          </div>
        </header>
        <div className="container detail-body">
          {description ? <div className="prose"><p>{description}</p></div> : null}
          {story?.blocks?.map((block) => block.type === "image" && block.media ? (
            <div className="story-image" key={block.id}><MediaGallery media={[block.media]} ratio="landscape" /></div>
          ) : block.text ? <div className="prose" key={block.id}><p>{block.text}</p></div> : null)}
          {initiative && (initiative.schedule || scheduleItems.length) ? <aside className="detail-callout"><p className="eyebrow">Horários</p>{initiative.days?.length ? <h2>{initiative.days.join(" · ")}</h2> : null}{initiative.schedule ? <p>{initiative.schedule}</p> : null}<ScheduleList items={scheduleItems} /></aside> : null}
          {location && (location.schedule || scheduleItems.length) ? <aside className="detail-callout"><p className="eyebrow">Quando nos encontramos</p>{location.days?.length ? <h2>{location.days.join(" · ")}</h2> : null}{location.schedule ? <p>{location.schedule}</p> : null}<ScheduleList items={scheduleItems} />{location.mapUrl ? <a className="button primary" href={location.mapUrl} target="_blank" rel="noreferrer">Abrir no mapa <ExternalLink size={18} /></a> : null}</aside> : null}
          {linkedLocation ? <aside className="detail-callout"><p className="eyebrow">Local</p><h2>{linkedLocation.name}</h2><p>{linkedLocation.address}</p>{linkedLocation.slug ? <Link className="text-link" href={`/locais/${linkedLocation.slug}`}>Conhecer o local</Link> : null}</aside> : null}
          {responsible.length ? <aside className="detail-callout"><p className="eyebrow">Responsáveis</p><div className="responsible-links">{responsible.map((member) => member.slug ? <Link key={member.id} href={`/equipe/${member.slug}`}>{member.name}</Link> : <span key={member.id}>{member.name}</span>)}</div></aside> : null}
          {event?.registrationUrl ? <a className="button primary detail-action" href={event.registrationUrl} target="_blank" rel="noreferrer">Fazer inscrição <ExternalLink size={18} /></a> : null}
          {initiative?.contactUrl ? <a className="button primary detail-action" href={initiative.contactUrl} target="_blank" rel="noreferrer">Entrar em contato <ExternalLink size={18} /></a> : null}
          {initiative && (initiative.noticeTitle || initiative.noticeText) && isNoticeActive(initiative.noticeExpiresAt) ? <aside className="notice-card"><p className="eyebrow">Aviso</p><h2>{initiative.noticeTitle}</h2><p>{initiative.noticeText}</p></aside> : null}
        </div>
      </article>
    </main>
  );
}

function ScheduleList({ items }: { items: ScheduleItem[] }) {
  if (!items.length) return null;
  return <ul className="schedule-list">{items.map((item) => <li key={item.id}><strong>{item.day}</strong><span>{item.startTime}{item.endTime ? `–${item.endTime}` : ""}{item.label ? ` · ${item.label}` : ""}</span></li>)}</ul>;
}
