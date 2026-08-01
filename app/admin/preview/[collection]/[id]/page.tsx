import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock3, MapPin } from "lucide-react";
import { MediaGallery } from "@/components/public/media-gallery";
import { requireAdmin } from "@/lib/auth/session";
import { contentDescription, contentTitle, formatDate } from "@/lib/content/format";
import { isContentCollection, sectionByCollection } from "@/lib/content/config";
import { getAdminItem } from "@/lib/content/repository";
import type { Story } from "@/lib/content/types";

export default async function PreviewPage({ params }: { params: Promise<{ collection: string; id: string }> }) {
  await requireAdmin(); const { collection, id } = await params;
  if (!isContentCollection(collection)) notFound();
  const item = await getAdminItem(collection, id); if (!item) notFound();
  const config = sectionByCollection[collection]; const title = contentTitle(config.kind, item); const description = contentDescription(item);
  const media = "media" in item ? item.media || [] : "photo" in item && item.photo ? [item.photo] : [];
  const date = "date" in item ? item.date : undefined; const time = "time" in item ? item.time : undefined; const address = "address" in item ? item.address : undefined;
  const story = collection === "stories" ? item as Story : null;
  return <main><div className="preview-banner"><strong>Prévia protegida</strong><span>Este conteúdo {item.status === "published" ? "está publicado" : "não aparece no site público"}.</span><Link href={`/admin/dashboard/${collection}`}><ArrowLeft size={15} /> Voltar ao painel</Link></div><article className="detail-page"><header className="detail-header dark-section"><div className="container detail-header-grid"><div><p className="eyebrow">Prévia · {config.singular}</p><h1>{title}</h1>{story?.summary ? <p className="detail-lead">{story.summary}</p> : null}<div className="detail-meta">{date ? <span><CalendarDays />{formatDate(date)}</span> : null}{time ? <span><Clock3 />{time}</span> : null}{address ? <span><MapPin />{address}</span> : null}</div></div>{media.length ? <MediaGallery media={media} ratio={collection === "team" ? "portrait" : "landscape"} priority /> : <div className="detail-mark">CB</div>}</div></header><div className="container detail-body">{description ? <div className="prose"><p>{description}</p></div> : null}{story?.blocks?.map((block) => block.type === "image" && block.media ? <div className="story-image" key={block.id}><MediaGallery media={[block.media]} ratio="landscape" /></div> : block.text ? <div className="prose" key={block.id}><p>{block.text}</p></div> : null)}</div></article></main>;
}
