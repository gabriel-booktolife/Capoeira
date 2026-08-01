import type { AnyContent, ContentKind, MediaItem, SiteSettings } from "./types";

export const defaultSettings: SiteSettings = {
  id: "public",
  groupName: "Chão Batido",
  tagline: "Capoeira, cultura e comunidade",
  heroTitle: "Chão Batido",
  heroText: "",
  aboutTitle: "",
  aboutText: "",
  contactEmail: "",
  whatsapp: "",
  instagramUrl: "",
  youtubeUrl: "",
  facebookUrl: "",
  tiktokUrl: "",
  seoTitle: "Capoeira Chão Batido",
  seoDescription: "Chão Batido — Capoeira, cultura e comunidade.",
  footerText: "Capoeira, cultura e comunidade",
  heroMedia: null,
};

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

export function contentTitle(kind: ContentKind, item: AnyContent) {
  if (kind === "team") return "name" in item && item.name ? item.name : "Membro do grupo";
  if (kind === "location") return "name" in item && item.name ? item.name : "Local de encontro";
  if ("title" in item && item.title) return item.title;
  if ("description" in item && item.description) {
    return item.description.split(/[\n.!?]/)[0].trim().slice(0, 72) || "Chão Batido";
  }
  return "Chão Batido";
}

export function contentDescription(item: AnyContent) {
  if ("summary" in item && item.summary) return item.summary;
  if ("description" in item && item.description) return item.description;
  if ("history" in item && item.history) return item.history;
  return "";
}

export function primaryMedia(item: AnyContent): MediaItem | null {
  if ("photo" in item && item.photo) return item.photo;
  if ("media" in item && item.media?.length) return [...item.media].sort((a, b) => a.order - b.order)[0];
  if ("blocks" in item && item.blocks) {
    return item.blocks.find((block) => block.type === "image" && block.media)?.media || null;
  }
  return null;
}

export function formatDate(value?: string) {
  if (!value) return "";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

export function isNoticeActive(expiresAt?: string, now = new Date()) {
  if (!expiresAt) return true;
  const parts = expiresAt.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return false;
  const endOfDayUtc = Date.UTC(parts[0], parts[1] - 1, parts[2], 26, 59, 59);
  return now.getTime() <= endOfDayUtc;
}
