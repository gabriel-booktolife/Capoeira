import type { MetadataRoute } from "next";
import { sectionConfigs } from "@/lib/content/config";
import { getPublicItems } from "@/lib/content/repository";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://chao-batido--capoeira-17aee.us-central1.hosted.app";
  const entries: MetadataRoute.Sitemap = [{ url: base, changeFrequency: "weekly", priority: 1 }, { url: `${base}/contato`, changeFrequency: "monthly", priority: 0.6 }];
  for (const section of sectionConfigs) {
    entries.push({ url: `${base}${section.publicPath}`, changeFrequency: "weekly", priority: 0.8 });
    const items = await getPublicItems(section.collection);
    for (const item of items) if (item.slug) entries.push({ url: `${base}${section.publicPath}/${item.slug}`, lastModified: item.updatedAt, changeFrequency: "monthly", priority: 0.7 });
  }
  return entries;
}
