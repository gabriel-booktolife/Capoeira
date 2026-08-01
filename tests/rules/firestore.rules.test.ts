import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore";

let env: RulesTestEnvironment;
beforeAll(async () => { env = await initializeTestEnvironment({ projectId: "capoeira-17aee", firestore: { rules: readFileSync("firebase/firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 } }); });
beforeEach(async () => { await env.clearFirestore(); await env.withSecurityRulesDisabled(async (context) => { const db = context.firestore(); await setDoc(doc(db, "publications/pub"), { status: "published", title: "Público" }); await setDoc(doc(db, "publications/draft"), { status: "draft", title: "Rascunho" }); await setDoc(doc(db, "settings/public"), { groupName: "Chão Batido" }); await setDoc(doc(db, "settings/private"), { secret: true }); }); });
afterAll(async () => env.cleanup());

describe("Firestore público e administrativo", () => {
  it("permite somente documentos publicados", async () => { const db = env.unauthenticatedContext().firestore(); await assertSucceeds(getDoc(doc(db, "publications/pub"))); await assertFails(getDoc(doc(db, "publications/draft"))); });
  it("exige filtro published nas consultas públicas", async () => { const db = env.unauthenticatedContext().firestore(); const result = await assertSucceeds(getDocs(query(collection(db, "publications"), where("status", "==", "published")))); expect(result.size).toBe(1); await assertFails(getDocs(collection(db, "publications"))); });
  it("nega rascunho e qualquer write mesmo com claim admin", async () => { const db = env.authenticatedContext("admin", { admin: true }).firestore(); await assertFails(getDoc(doc(db, "publications/draft"))); await assertFails(setDoc(doc(db, "publications/new"), { status: "published" })); });
  it("expõe apenas a configuração pública", async () => { const db = env.unauthenticatedContext().firestore(); await assertSucceeds(getDoc(doc(db, "settings/public"))); await assertFails(getDoc(doc(db, "settings/private"))); });
});
