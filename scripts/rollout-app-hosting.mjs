import { execFile } from "node:child_process";
import { promisify } from "node:util";

const projectId = "capoeira-17aee";
const location = "us-central1";
const backendId = "chao-batido";
const sourceBucket = "firebaseapphosting-sources-201698844724-us-central1";
const sha = process.env.GITHUB_SHA || "";
const runId = process.env.GITHUB_RUN_ID || "";
const attempt = process.env.GITHUB_RUN_ATTEMPT || "1";

if (!/^[0-9a-f]{40}$/.test(sha) || !/^\d+$/.test(runId) || !/^\d+$/.test(attempt)) {
  throw new Error("GITHUB_SHA, GITHUB_RUN_ID e GITHUB_RUN_ATTEMPT são obrigatórios e devem ser válidos.");
}

const sourceUri = `gs://${sourceBucket}/github/${sha}-${runId}-${attempt}.zip`;
const apiOrigin = "https://firebaseapphosting.googleapis.com";
const apiVersion = "v1beta";
const backendPath = `projects/${projectId}/locations/${location}/backends/${backendId}`;
const apiBase = `${apiOrigin}/${apiVersion}/${backendPath}`;
const { stdout } = await promisify(execFile)("gcloud", ["auth", "print-access-token"]);
const accessToken = stdout.trim();

if (!accessToken) throw new Error("Não foi possível obter o token da conta de CI.");

const headers = {
  authorization: `Bearer ${accessToken}`,
  "content-type": "application/json",
  "x-goog-user-project": projectId,
};

function reportFatalError(error) {
  const message = String(error instanceof Error ? error.message : error)
    .replaceAll("%", "%25")
    .replaceAll("\r", "%0D")
    .replaceAll("\n", "%0A");
  console.error(`::error title=Falha no rollout do App Hosting::${message}`);
  process.exit(1);
}

process.once("uncaughtException", reportFatalError);
process.once("unhandledRejection", reportFatalError);

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${body.slice(0, 1000)}`);
  }
  return body ? JSON.parse(body) : {};
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function pollOperation(name, label) {
  for (let index = 0; index < 120; index += 1) {
    const operation = await apiRequest(`${apiOrigin}/${apiVersion}/${name}`);
    if (operation.done) {
      if (operation.error) {
        throw new Error(`${label} falhou: ${JSON.stringify(operation.error)}`);
      }
      return operation.response || {};
    }
    await wait(10_000);
  }
  throw new Error(`${label} excedeu o limite de 20 minutos.`);
}

async function getNextBuildId() {
  const now = new Date();
  const date = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0"),
  ].join("-");
  const [buildResponse, rolloutResponse] = await Promise.all([
    apiRequest(`${apiBase}/builds?pageSize=1000`),
    apiRequest(`${apiBase}/rollouts?pageSize=1000`),
  ]);
  const pattern = new RegExp(`/build-${date}-(\\d+)$`);
  const counters = [...(buildResponse.builds || []), ...(rolloutResponse.rollouts || [])]
    .map((resource) => resource.name?.match(pattern)?.[1])
    .filter(Boolean)
    .map(Number);
  const next = (counters.length ? Math.max(...counters) : 0) + 1;
  return `build-${date}-${String(next).padStart(3, "0")}`;
}

const buildId = await getNextBuildId();

const buildOperation = await apiRequest(`${apiBase}/builds?buildId=${encodeURIComponent(buildId)}`, {
  method: "POST",
  body: JSON.stringify({
    source: { archive: { userStorageUri: sourceUri, rootDirectory: "." } },
    labels: { "deployment-tool": "github-actions", commit: sha.slice(0, 12) },
  }),
});
const build = await pollOperation(buildOperation.name, "Build do App Hosting");
if (build.state !== "READY") {
  throw new Error(`Build ${buildId} terminou em estado inesperado: ${build.state || "desconhecido"}.`);
}

const rolloutOperation = await apiRequest(`${apiBase}/rollouts?rolloutId=${encodeURIComponent(buildId)}`, {
  method: "POST",
  body: JSON.stringify({
    build: `${backendPath}/builds/${buildId}`,
    labels: { "deployment-tool": "github-actions", commit: sha.slice(0, 12) },
  }),
});
await pollOperation(rolloutOperation.name, "Criação do rollout");

for (let index = 0; index < 120; index += 1) {
  const rollout = await apiRequest(`${apiBase}/rollouts/${buildId}`);
  if (rollout.state === "SUCCEEDED") {
    console.log(JSON.stringify({ buildId, state: rollout.state, backend: `https://${backendId}--${projectId}.${location}.hosted.app` }));
    process.exit(0);
  }
  if (["FAILED", "CANCELLED"].includes(rollout.state)) {
    throw new Error(`Rollout ${buildId} terminou em ${rollout.state}.`);
  }
  await wait(10_000);
}

throw new Error(`Rollout ${buildId} excedeu o limite de 20 minutos.`);
