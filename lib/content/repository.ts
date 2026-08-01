import "server-only";

import { cache } from "react";
import { adminDb } from "@/lib/firebase/admin";
import { serializeFirestore } from "@/lib/firebase/serialize";
import { sectionByCollection } from "./config";
import { contentTitle, defaultSettings } from "./format";
import type {
  AdminRecord,
  AnyContent,
  ContentCollection,
  SiteSettings,
  TeamMember,
} from "./types";

function sortItems(collection: ContentCollection, items: AnyContent[]) {
  return [...items].sort((a, b) => {
    if (collection === "events") {
      return String((a as { date?: string }).date || "9999-12-31").localeCompare(
        String((b as { date?: string }).date || "9999-12-31"),
      );
    }
    if (["initiatives", "team", "stories", "locations"].includes(collection)) {
      const order = (a.sortOrder || 0) - (b.sortOrder || 0);
      if (order) return order;
    }
    return String(b.publishedAt || b.updatedAt || "").localeCompare(String(a.publishedAt || a.updatedAt || ""));
  });
}

export const getPublicItems = cache(async (collection: ContentCollection): Promise<AnyContent[]> => {
  const snapshot = await adminDb.collection(collection).where("status", "==", "published").get();
  const items = snapshot.docs.map((item) => serializeFirestore({ id: item.id, ...item.data() }) as AnyContent);
  return sortItems(collection, items);
});

export const getPublicItemBySlug = cache(async (collection: ContentCollection, slug: string) => {
  const snapshot = await adminDb
    .collection(collection)
    .where("status", "==", "published")
    .where("slug", "==", slug)
    .limit(1)
    .get();
  const item = snapshot.docs[0];
  return item ? serializeFirestore({ id: item.id, ...item.data() }) as AnyContent : null;
});

export async function getAdminItems(collection: ContentCollection): Promise<AnyContent[]> {
  const snapshot = await adminDb.collection(collection).orderBy("updatedAt", "desc").get();
  return snapshot.docs.map((item) => serializeFirestore({ id: item.id, ...item.data() }) as AnyContent);
}

export async function getAdminItem(collection: ContentCollection, id: string): Promise<AnyContent | null> {
  const snapshot = await adminDb.collection(collection).doc(id).get();
  return snapshot.exists ? serializeFirestore({ id: snapshot.id, ...snapshot.data() }) as AnyContent : null;
}

export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  const snapshot = await adminDb.collection("settings").doc("public").get();
  if (!snapshot.exists) return defaultSettings;
  return { ...defaultSettings, ...serializeFirestore(snapshot.data() || {}), id: "public" } as SiteSettings;
});

export async function getAdminRecords(): Promise<AdminRecord[]> {
  const snapshot = await adminDb.collection("admins").orderBy("displayName").get();
  return snapshot.docs.map((item) => serializeFirestore(item.data()) as AdminRecord);
}

export async function getAdminDashboardCounts() {
  const pairs = await Promise.all(
    (Object.keys(sectionByCollection) as ContentCollection[]).map(async (collection) => {
      const snapshot = await adminDb.collection(collection).get();
      const items = snapshot.docs.map((item) => item.data());
      return [collection, {
        total: items.length,
        published: items.filter((item) => item.status === "published").length,
        draft: items.filter((item) => item.status === "draft").length,
        deleting: items.filter((item) => item.status === "deleting").length,
      }] as const;
    }),
  );
  return Object.fromEntries(pairs) as Record<ContentCollection, { total: number; published: number; draft: number; deleting: number }>;
}

export async function getTeamOptions() {
  const snapshot = await adminDb.collection("team").orderBy("name").get();
  return snapshot.docs.map((item) => {
    const data = item.data() as TeamMember;
    return { id: item.id, label: contentTitle("team", { ...data, id: item.id }) };
  });
}

export async function getLocationOptions() {
  const snapshot = await adminDb.collection("locations").orderBy("name").get();
  return snapshot.docs.map((item) => ({
    id: item.id,
    label: String(item.data().name || "Local sem nome"),
  }));
}
