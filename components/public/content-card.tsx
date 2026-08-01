import Link from "next/link";
import { ArrowUpRight, CalendarDays, Clock3, MapPin } from "lucide-react";
import { sectionByCollection } from "@/lib/content/config";
import { contentDescription, contentTitle, formatDate, primaryMedia } from "@/lib/content/format";
import type { AnyContent, ContentCollection, Initiative, LocationItem, TeamMember } from "@/lib/content/types";
import { MediaGallery } from "./media-gallery";

export function ContentCard({ collection, item, featured = false }: { collection: ContentCollection; item: AnyContent; featured?: boolean }) {
  const config = sectionByCollection[collection];
  const title = contentTitle(config.kind, item);
  const description = contentDescription(item);
  const media = primaryMedia(item);
  const href = item.slug ? `${config.publicPath}/${item.slug}` : config.publicPath;
  const date = "date" in item ? item.date : undefined;
  const time = "time" in item ? item.time : undefined;
  const address = "address" in item ? item.address : undefined;
  const team = collection === "team" ? item as TeamMember : null;
  const initiative = collection === "initiatives" ? item as Initiative : null;
  const location = collection === "locations" ? item as LocationItem : null;

  return (
    <article className={featured ? "content-card featured" : "content-card"}>
      <Link className="card-media-link" href={href} aria-label={`Abrir ${title}`}>
        <MediaGallery media={media ? [media] : []} ratio={collection === "team" ? "portrait" : "landscape"} />
        <span className="card-index">{config.singular}</span>
      </Link>
      <div className="card-content">
        <div className="card-meta">
          {date ? <span><CalendarDays size={15} />{formatDate(date)}</span> : null}
          {time ? <span><Clock3 size={15} />{time}</span> : null}
          {address ? <span><MapPin size={15} />{address}</span> : null}
          {team?.graduation ? <span>{team.graduation}</span> : null}
          {team?.role ? <span>{team.role}</span> : null}
          {initiative?.days?.length ? <span>{initiative.days.join(" · ")}</span> : null}
          {location?.days?.length ? <span>{location.days.join(" · ")}</span> : null}
        </div>
        <h3><Link href={href}>{title}</Link></h3>
        {description ? <p>{description}</p> : null}
        <Link className="card-link" href={href}>Conhecer <ArrowUpRight size={18} /></Link>
      </div>
    </article>
  );
}
