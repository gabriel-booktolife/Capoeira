import { Timestamp } from "firebase-admin/firestore";

export function serializeFirestore<T>(value: T): T {
  if (value instanceof Timestamp) return value.toDate().toISOString() as T;
  if (value instanceof Date) return value.toISOString() as T;
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return (value.toDate() as Date).toISOString() as T;
  }
  if (value && typeof value === "object" && ("_seconds" in value || "seconds" in value)) {
    const record = value as Record<string, unknown>;
    const seconds = Number(record._seconds ?? record.seconds);
    const nanoseconds = Number(record._nanoseconds ?? record.nanoseconds ?? 0);
    if (Number.isFinite(seconds)) return new Date(seconds * 1000 + Math.floor(nanoseconds / 1_000_000)).toISOString() as T;
  }
  if (Array.isArray(value)) return value.map((item) => serializeFirestore(item)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, serializeFirestore(item)]),
    ) as T;
  }
  return value;
}

export function pruneUndefined<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => pruneUndefined(item)) as T;
  if (value && typeof value === "object" && !(value instanceof Date) && !(value instanceof Timestamp)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, pruneUndefined(item)]),
    ) as T;
  }
  return value;
}
