import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import process from "node:process";

const projectId = "capoeira-17aee";
const bucket = "capoeira-17aee.firebasestorage.app";
const manifestPath = process.argv.find((arg) => arg.startsWith("--manifest="))?.split("=").slice(1).join("=");
const apply = process.argv.includes("--apply");
const confirmed = process.argv.includes("--confirm=delete-listed-orphans");
if (!manifestPath) throw new Error("Informe --manifest=.migration-backups/.../migration-manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
if (manifest.projectId !== projectId || !Array.isArray(manifest.orphanCandidates)) throw new Error("Manifesto inválido.");
console.log(JSON.stringify({ candidates: manifest.orphanCandidates, count: manifest.orphanCandidates.length, apply }, null, 2));
if (!apply) process.exit(0);
if (!confirmed) throw new Error("Exclusão bloqueada. Adicione --confirm=delete-listed-orphans.");
const { stdout } = await promisify(execFile)("gcloud", ["auth", "print-access-token"]);
const headers = { authorization: `Bearer ${stdout.trim()}`, "x-goog-user-project": projectId };
for (const path of manifest.orphanCandidates) {
  const response = await fetch(`https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(path)}`, { method: "DELETE", headers });
  if (!response.ok && response.status !== 404) throw new Error(`Falha ao remover ${path}: ${response.status} ${await response.text()}`);
}
console.log(`Removidos ${manifest.orphanCandidates.length} objetos listados explicitamente.`);
