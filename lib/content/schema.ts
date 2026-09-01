import { z } from "zod";
import { slugify } from "./format";
import type { ContentKind, ContentStatus } from "./types";

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);
const optionalUrl = z.preprocess(
  emptyToUndefined,
  z.url("Informe uma URL completa, começando com https://.").max(600).optional(),
);
const optionalDate = z.preprocess(
  emptyToUndefined,
  z.iso.date("Informe uma data válida.").optional(),
);
const optionalTime = z.preprocess(
  emptyToUndefined,
  z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Informe um horário válido.").optional(),
);
const text = (max: number) => z.string().trim().max(max);

export const mediaSchema = z.object({
  url: z.url().max(1200),
  type: z.enum(["image", "video"]),
  path: z.string().min(1).max(700),
  name: z.string().min(1).max(240),
  size: z.number().int().nonnegative().max(80 * 1024 * 1024),
  order: z.number().int().nonnegative().max(20),
  alt: text(240).optional().default(""),
  caption: text(500).optional().default(""),
  width: z.number().int().positive().max(12000).optional(),
  height: z.number().int().positive().max(12000).optional(),
  duration: z.number().nonnegative().max(90).optional(),
});

export const scheduleItemSchema = z.object({
  id: z.string().min(1).max(80),
  day: z.enum(["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]),
  startTime: optionalTime,
  endTime: optionalTime,
  label: text(120).optional().default(""),
}).refine((item) => !item.startTime || !item.endTime || item.startTime < item.endTime, {
  message: "O horário final deve ser posterior ao inicial.",
  path: ["endTime"],
});

export const storyBlockSchema = z.object({
  id: z.string().min(1).max(80),
  type: z.enum(["text", "image"]),
  text: text(6000).optional().default(""),
  media: mediaSchema.optional(),
});

const baseShape = {
  status: z.enum(["draft", "published", "deleting"]).default("draft"),
  slug: text(96).optional().default(""),
  featured: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
};

const publicationSchema = z.object({
  ...baseShape,
  title: text(160).default(""),
  description: text(6000).default(""),
  date: optionalDate,
  time: optionalTime,
  address: text(500).default(""),
  media: z.array(mediaSchema).max(4).default([]),
}).refine((data) => data.media.filter((item) => item.type === "image").length <= 3 && data.media.filter((item) => item.type === "video").length <= 1, {
  message: "Publicações aceitam até 3 imagens e 1 vídeo.", path: ["media"],
});

const eventSchema = z.object({
  ...baseShape,
  title: text(100).default(""),
  description: text(1000).default(""),
  date: optionalDate,
  time: optionalTime,
  address: text(150).default(""),
  endTime: optionalTime,
  locationId: text(128).default(""),
  registrationUrl: optionalUrl,
  media: z.array(mediaSchema).max(1, "Eventos aceitam uma imagem de capa.").default([]),
}).refine((data) => data.media.every((item) => item.type === "image"), { message: "Eventos aceitam apenas imagens.", path: ["media"] });

const initiativeSchema = z.object({
  ...baseShape,
  title: text(160).default(""),
  description: text(6000).default(""),
  address: text(500).default(""),
  days: z.array(text(12)).max(7).default([]),
  schedule: text(300).default(""),
  scheduleItems: z.array(scheduleItemSchema).max(21).default([]),
  teamIds: z.array(text(128)).max(20).default([]),
  noticeTitle: text(160).default(""),
  noticeText: text(2000).default(""),
  noticeExpiresAt: optionalDate,
  locationId: text(128).default(""),
  contactUrl: optionalUrl,
  media: z.array(mediaSchema).max(3).default([]),
}).refine((data) => data.media.every((item) => item.type === "image"), { message: "Iniciativas aceitam apenas imagens.", path: ["media"] });

const teamSchema = z.object({
  ...baseShape,
  name: text(120).default(""),
  graduation: text(120).default(""),
  role: text(120).default(""),
  age: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).max(130).optional().nullable()),
  history: text(6000).default(""),
  photo: mediaSchema.optional().nullable().default(null),
});

const storySchema = z.object({
  ...baseShape,
  title: text(160).default(""),
  summary: text(600).default(""),
  blocks: z.array(storyBlockSchema).max(40).default([]),
});

const locationSchema = z.object({
  ...baseShape,
  name: text(160).default(""),
  description: text(3000).default(""),
  address: text(500).default(""),
  mapUrl: optionalUrl,
  days: z.array(text(12)).max(7).default([]),
  schedule: text(300).default(""),
  scheduleItems: z.array(scheduleItemSchema).max(21).default([]),
  media: z.array(mediaSchema).max(3).default([]),
}).refine((data) => data.media.every((item) => item.type === "image"), { message: "Locais aceitam apenas imagens.", path: ["media"] });

export const schemasByKind = {
  publication: publicationSchema,
  event: eventSchema,
  initiative: initiativeSchema,
  team: teamSchema,
  story: storySchema,
  location: locationSchema,
} as const;

export type ContentInput = z.infer<(typeof schemasByKind)[ContentKind]>;

export function parseContent(kind: ContentKind, input: unknown, forcedStatus?: ContentStatus) {
  const parsed = schemasByKind[kind].parse(input) as Record<string, unknown>;
  parsed.status = forcedStatus || parsed.status;
  const title = String(parsed.title || parsed.name || "");
  parsed.slug = slugify(String(parsed.slug || title));
  validatePublicationRequirements(kind, parsed, parsed.status as ContentStatus);
  return parsed;
}

function validatePublicationRequirements(
  kind: ContentKind,
  data: Record<string, unknown>,
  status: ContentStatus,
) {
  if (status !== "published") return;
  const fail = (message: string): never => {
    throw new z.ZodError([{ code: "custom", message, path: [] }]);
  };
  if (kind === "publication") {
    if (!data.title) fail("Informe o título antes de publicar.");
    if (!data.description && !(data.media as unknown[])?.length) fail("Adicione uma descrição ou mídia.");
  }
  if (kind === "event") {
    if (!data.title || !data.date || !data.time || !data.address) fail("Eventos publicados precisam de nome, data, horário e local.");
    if (String(data.title).trim().length < 3) fail("O nome do evento deve ter ao menos 3 caracteres.");
    if (String(data.address).trim().length < 3) fail("O local deve ter ao menos 3 caracteres.");
    const date = String(data.date);
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    if (date < today) fail("A data do evento não pode ser anterior a hoje.");
  }
  if (kind === "initiative" && (!data.title || !data.description)) {
    fail("Iniciativas publicadas precisam de título e descrição.");
  }
  if (kind === "team" && (!data.name || !data.history)) {
    fail("Membros publicados precisam de nome e história.");
  }
  if (kind === "story") {
    const blocks = (data.blocks as Array<{ type: string; text?: string; media?: unknown }>) || [];
    if (!data.title || !blocks.some((block) => block.type === "image" ? block.media : block.text?.trim())) {
      fail("Capítulos publicados precisam de título e ao menos um bloco preenchido.");
    }
  }
  if (kind === "location" && (!data.name || !data.address)) {
    fail("Locais publicados precisam de nome e endereço.");
  }
}

export const siteSettingsSchema = z.object({
  groupName: text(120).min(1, "Informe o nome do grupo."),
  tagline: text(180).min(1, "Informe o slogan."),
  heroTitle: text(180),
  heroText: text(700),
  aboutTitle: text(160),
  aboutText: text(6000),
  contactEmail: z.preprocess(emptyToUndefined, z.email().max(240).optional()).transform((value) => value || ""),
  whatsapp: text(40),
  instagramUrl: optionalUrl.transform((value) => value || ""),
  youtubeUrl: optionalUrl.transform((value) => value || ""),
  facebookUrl: optionalUrl.transform((value) => value || ""),
  tiktokUrl: optionalUrl.transform((value) => value || ""),
  seoTitle: text(160).min(1),
  seoDescription: text(320).min(1),
  footerText: text(500),
  heroMedia: mediaSchema.optional().nullable().default(null),
});

export function emptyContent(kind: ContentKind): Record<string, unknown> {
  const common = { status: "draft", slug: "", featured: false, sortOrder: 0 };
  if (kind === "publication") return { ...common, title: "", description: "", date: "", time: "", address: "", media: [] };
  if (kind === "event") return { ...common, title: "", description: "", date: "", time: "", endTime: "", address: "", locationId: "", registrationUrl: "", media: [] };
  if (kind === "initiative") return { ...common, title: "", description: "", address: "", days: [], schedule: "", scheduleItems: [], teamIds: [], noticeTitle: "", noticeText: "", noticeExpiresAt: "", locationId: "", contactUrl: "", media: [] };
  if (kind === "team") return { ...common, name: "", graduation: "", role: "", age: "", history: "", photo: null };
  if (kind === "story") return { ...common, title: "", summary: "", blocks: [{ id: crypto.randomUUID(), type: "text", text: "" }] };
  return { ...common, name: "", description: "", address: "", mapUrl: "", days: [], schedule: "", scheduleItems: [], media: [] };
}
