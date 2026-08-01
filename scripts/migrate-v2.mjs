import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import process from "node:process";

const projectId = "capoeira-17aee";
const databaseId = "(default)";
const bucketName = "capoeira-17aee.firebasestorage.app";
const apply = process.argv.includes("--apply");
const confirmed = process.argv.includes(`--confirm=${projectId}`);
if (apply && !confirmed) throw new Error(`Aplicação bloqueada. Repita com --confirm=${projectId}.`);

const { stdout } = await promisify(execFile)("gcloud", ["auth", "print-access-token"]);
const accessToken = stdout.trim();
if (!accessToken) throw new Error("Não foi possível obter a credencial local do Google Cloud.");
const headers = { authorization: `Bearer ${accessToken}`, "content-type": "application/json", "x-goog-user-project": projectId };
const firestoreRoot = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${encodeURIComponent(databaseId)}/documents`;
const collections = ["publications", "events", "initiatives", "team", "stories", "locations", "settings", "admins"];
const contentCollections = collections.slice(0, 6);
const stamp = new Date().toISOString().replace(/[.:]/g, "-");
const backupDir = `.migration-backups/${stamp}`;

async function jsonRequest(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  const body = await response.text();
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${body.slice(0, 700)}`);
  return body ? JSON.parse(body) : {};
}

function decodeValue(value = {}) {
  if ("nullValue" in value) return null;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("stringValue" in value) return value.stringValue;
  if ("timestampValue" in value) return { __firestoreType: "timestamp", value: value.timestampValue };
  if ("bytesValue" in value) return { __firestoreType: "bytes", value: value.bytesValue };
  if ("referenceValue" in value) return { __firestoreType: "reference", value: value.referenceValue };
  if ("geoPointValue" in value) return { __firestoreType: "geoPoint", value: value.geoPointValue };
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(decodeValue);
  if ("mapValue" in value) return decodeFields(value.mapValue.fields || {});
  return undefined;
}

function decodeFields(fields = {}) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]));
}

function encodeValue(value) {
  if (value === null) return { nullValue: null };
  if (value && value.__firestoreType === "timestamp") return { timestampValue: value.value };
  if (value && value.__firestoreType === "bytes") return { bytesValue: value.value };
  if (value && value.__firestoreType === "reference") return { referenceValue: value.value };
  if (value && value.__firestoreType === "geoPoint") return { geoPointValue: value.value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === "string") return { stringValue: value };
  if (value && typeof value === "object") return { mapValue: { fields: encodeFields(value) } };
  return { nullValue: null };
}

function encodeFields(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined).map(([key, value]) => [key, encodeValue(value)]));
}

async function listDocuments(collection) {
  const documents = [];
  let pageToken = "";
  do {
    const url = new URL(`${firestoreRoot}/${collection}`);
    url.searchParams.set("pageSize", "300");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const page = await jsonRequest(url);
    documents.push(...(page.documents || []));
    pageToken = page.nextPageToken || "";
  } while (pageToken);
  return Object.fromEntries(documents.map((document) => [document.name.split("/").at(-1), decodeFields(document.fields)]));
}

async function listAuthUsers() {
  const page = await jsonRequest(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:query`, {
    method: "POST",
    body: JSON.stringify({ returnUserInfo: true, limit: "500", offset: "0" }),
  });
  const count = Number(page.recordsCount || 0);
  if (count > 500) throw new Error("Há mais de 500 contas Auth; o script precisa de paginação explícita antes de continuar.");
  return page.userInfo || [];
}

async function listStorageObjects() {
  const objects = [];
  let pageToken = "";
  do {
    const url = new URL(`https://storage.googleapis.com/storage/v1/b/${bucketName}/o`);
    url.searchParams.set("maxResults", "1000");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const page = await jsonRequest(url);
    objects.push(...(page.items || []).map((item) => ({ name: item.name, size: Number(item.size || 0), contentType: item.contentType || "", updated: item.updated || "" })));
    pageToken = page.nextPageToken || "";
  } while (pageToken);
  return objects;
}

function slugify(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 96);
}

function mediaV2(media) {
  if (!Array.isArray(media)) return [];
  return media.map((item, order) => ({ ...item, order: Number.isInteger(item.order) ? item.order : order, alt: item.alt || "", caption: item.caption || "" }));
}

function migrate(collection, id, source) {
  const title = source.title || source.name || String(source.description || "").split(/[\n.!?]/)[0].slice(0, 72);
  const base = { ...source, schemaVersion: 2, status: "draft", slug: source.slug || slugify(title) || `${collection.slice(0, -1)}-${id.slice(0, 7)}`, featured: source.featured === true, sortOrder: Number.isInteger(source.sortOrder) ? source.sortOrder : 0, publishedAt: null };
  if (collection === "publications") return { title: "", description: "", date: "", time: "", address: "", media: [], ...base, media: mediaV2(source.media) };
  if (collection === "events") return { title: "", description: "", date: "", time: "", endTime: "", address: "", locationId: "", registrationUrl: "", media: [], ...base, media: mediaV2(source.media) };
  if (collection === "initiatives") return { title: "", description: "", address: "", days: [], schedule: "", scheduleItems: [], teamIds: [], noticeTitle: "", noticeText: "", noticeExpiresAt: "", locationId: "", contactUrl: "", media: [], ...base, media: mediaV2(source.media) };
  if (collection === "team") return { name: "", graduation: "", role: "", age: null, history: "", photo: null, ...base, photo: source.photo ? { ...source.photo, order: 0, alt: source.photo.alt || "", caption: source.photo.caption || "" } : null };
  if (collection === "stories") return { title: "", summary: "", blocks: [], ...base };
  return { name: "", description: "", address: "", mapUrl: "", days: [], schedule: "", scheduleItems: [], media: [], ...base, media: mediaV2(source.media) };
}

function collectPaths(value, paths = new Set()) {
  if (Array.isArray(value)) value.forEach((item) => collectPaths(item, paths));
  else if (value && typeof value === "object") {
    if (typeof value.path === "string") paths.add(value.path);
    Object.values(value).forEach((item) => collectPaths(item, paths));
  }
  return paths;
}

await mkdir(backupDir, { recursive: true });
const firestoreBackup = {};
for (const name of collections) firestoreBackup[name] = await listDocuments(name);
const [users, storageObjects] = await Promise.all([listAuthUsers(), listStorageObjects()]);
const referenced = collectPaths(firestoreBackup);
const orphans = storageObjects.filter((file) => !referenced.has(file.name) && !file.name.startsWith("backups/")).map((file) => file.name);
const migrated = {};
for (const collection of contentCollections) migrated[collection] = Object.fromEntries(Object.entries(firestoreBackup[collection]).map(([id, data]) => [id, migrate(collection, id, data)]));
const manifest = { projectId, generatedAt: new Date().toISOString(), mode: apply ? "apply" : "dry-run", sourceDocuments: Object.fromEntries(collections.map((name) => [name, Object.keys(firestoreBackup[name]).length])), authUsers: users.length, storageObjects: storageObjects.length, referencedMedia: [...referenced].sort(), orphanCandidates: orphans.sort(), plannedContentUpdates: Object.fromEntries(contentCollections.map((name) => [name, Object.keys(migrated[name]).length])), notes: ["Conteúdos existentes serão rascunhos.", "Campos e auditoria existentes são preservados.", "Órfãos são apenas inventariados; este script nunca os apaga."] };
await Promise.all([
  writeFile(`${backupDir}/firestore.json`, JSON.stringify(firestoreBackup, null, 2)),
  writeFile(`${backupDir}/auth.json`, JSON.stringify(users, null, 2)),
  writeFile(`${backupDir}/storage.json`, JSON.stringify(storageObjects, null, 2)),
  writeFile(`${backupDir}/migration-manifest.json`, JSON.stringify(manifest, null, 2)),
  writeFile(`${backupDir}/planned-content.json`, JSON.stringify(migrated, null, 2)),
]);

if (!apply) {
  console.log(JSON.stringify({ backupDir, ...manifest }, null, 2));
  process.exit(0);
}

if (users.length !== 1) throw new Error(`Esperada exatamente uma conta Auth antes do bootstrap; encontradas ${users.length}.`);
const owner = users[0];
const currentClaims = owner.customAttributes ? JSON.parse(owner.customAttributes) : {};
const backupFiles = ["firestore.json", "auth.json", "storage.json", "migration-manifest.json", "planned-content.json"];
for (const fileName of backupFiles) {
  const contents = await import("node:fs/promises").then(({ readFile }) => readFile(`${backupDir}/${fileName}`));
  const url = new URL(`https://storage.googleapis.com/upload/storage/v1/b/${bucketName}/o`);
  url.searchParams.set("uploadType", "media");
  url.searchParams.set("name", `backups/v2/${stamp}/${fileName}`);
  const response = await fetch(url, { method: "POST", headers, body: contents });
  if (!response.ok) throw new Error(`Falha ao enviar backup ${fileName}: ${response.status} ${await response.text()}`);
}
await jsonRequest(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:update`, {
  method: "POST", body: JSON.stringify({ localId: owner.localId, customAttributes: JSON.stringify({ ...currentClaims, admin: true, superadmin: true }) }),
});
const now = { __firestoreType: "timestamp", value: new Date().toISOString() };
const settings = { schemaVersion: 2, groupName: "Chão Batido", tagline: "Capoeira, cultura e comunidade", heroTitle: "Chão Batido", heroText: "", aboutTitle: "", aboutText: "", contactEmail: "", whatsapp: "", instagramUrl: "", youtubeUrl: "", facebookUrl: "", tiktokUrl: "", seoTitle: "Capoeira Chão Batido", seoDescription: "Chão Batido — Capoeira, cultura e comunidade.", footerText: "Capoeira, cultura e comunidade", heroMedia: null, updatedAt: now, updatedBy: "migration-v2" };
const admin = { uid: owner.localId, email: owner.email || "", displayName: owner.displayName || owner.email || "Superadmin", active: true, role: "superadmin", createdAt: now, createdBy: "migration-v2", updatedAt: now, updatedBy: "migration-v2" };
const writes = [];
for (const collection of contentCollections) for (const [id, data] of Object.entries(migrated[collection])) writes.push({ update: { name: `${firestoreRoot}/${collection}/${id}`, fields: encodeFields(data) }, currentDocument: { exists: true } });
writes.push({ update: { name: `${firestoreRoot}/settings/public`, fields: encodeFields(settings) } });
writes.push({ update: { name: `${firestoreRoot}/admins/${owner.localId}`, fields: encodeFields(admin) } });
await jsonRequest(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/${encodeURIComponent(databaseId)}/documents:commit`, { method: "POST", body: JSON.stringify({ writes }) });
console.log(JSON.stringify({ applied: true, backupDir, remoteBackup: `backups/v2/${stamp}/`, updatedDocuments: Object.values(migrated).reduce((sum, group) => sum + Object.keys(group).length, 0), superadminUid: owner.localId, orphanCandidatesPreserved: orphans.length }, null, 2));
