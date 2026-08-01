export type ContentStatus = "draft" | "published" | "deleting";
export type MediaType = "image" | "video";
export type WeekDay = "Seg" | "Ter" | "Qua" | "Qui" | "Sex" | "Sáb" | "Dom";

export const weekDays: WeekDay[] = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export type MediaItem = {
  url: string;
  type: MediaType;
  path: string;
  name: string;
  size: number;
  order: number;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
  duration?: number;
};

export type ScheduleItem = {
  id: string;
  day: WeekDay;
  startTime: string;
  endTime: string;
  label?: string;
};

export type StoryBlock = {
  id: string;
  type: "text" | "image";
  text?: string;
  media?: MediaItem;
};

export type ContentCollection =
  | "publications"
  | "events"
  | "initiatives"
  | "team"
  | "stories"
  | "locations";

export type ContentKind =
  | "publication"
  | "event"
  | "initiative"
  | "team"
  | "story"
  | "location";

export type ContentBase = {
  id: string;
  status: ContentStatus;
  schemaVersion?: number;
  slug?: string;
  featured?: boolean;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string | null;
  createdBy?: string;
  updatedBy?: string;
};

export type Publication = ContentBase & {
  title?: string;
  description?: string;
  date?: string;
  time?: string;
  address?: string;
  media?: MediaItem[];
};

export type EventItem = Publication & {
  endTime?: string;
  locationId?: string;
  registrationUrl?: string;
};

export type Initiative = ContentBase & {
  title?: string;
  description?: string;
  address?: string;
  days?: string[];
  schedule?: string;
  scheduleItems?: ScheduleItem[];
  teamIds?: string[];
  noticeTitle?: string;
  noticeText?: string;
  noticeExpiresAt?: string;
  locationId?: string;
  contactUrl?: string;
  media?: MediaItem[];
};

export type TeamMember = ContentBase & {
  name?: string;
  graduation?: string;
  role?: string;
  age?: number | null;
  history?: string;
  photo?: MediaItem | null;
};

export type Story = ContentBase & {
  title?: string;
  summary?: string;
  blocks?: StoryBlock[];
};

export type LocationItem = ContentBase & {
  name?: string;
  description?: string;
  address?: string;
  mapUrl?: string;
  days?: string[];
  schedule?: string;
  scheduleItems?: ScheduleItem[];
  media?: MediaItem[];
};

export type AnyContent = Publication | EventItem | Initiative | TeamMember | Story | LocationItem;

export type SiteSettings = {
  id: "public";
  groupName: string;
  tagline: string;
  heroTitle: string;
  heroText: string;
  aboutTitle: string;
  aboutText: string;
  contactEmail: string;
  whatsapp: string;
  instagramUrl: string;
  youtubeUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  seoTitle: string;
  seoDescription: string;
  footerText: string;
  heroMedia?: MediaItem | null;
  updatedAt?: string;
  updatedBy?: string;
};

export type AdminRecord = {
  uid: string;
  email: string;
  displayName: string;
  active: boolean;
  role: "admin" | "superadmin";
  createdAt?: string;
  updatedAt?: string;
};
