import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, it } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteObject, getBytes, ref, uploadBytes } from "firebase/storage";

let env: RulesTestEnvironment;
beforeAll(async () => { env = await initializeTestEnvironment({ projectId: "capoeira-17aee", storage: { rules: readFileSync("firebase/storage.rules", "utf8"), host: "127.0.0.1", port: 9199 } }); });
afterAll(async () => env.cleanup());

describe("Storage em duas fases", () => {
  it("permite ao admin apenas o staging do próprio UID", async () => {
    const storage = env.authenticatedContext("admin-1", { admin: true }).storage();
    await assertSucceeds(uploadBytes(ref(storage, "staging/admin-1/upload/image.webp"), new Uint8Array([1, 2, 3]), { contentType: "image/webp" }));
    await assertFails(uploadBytes(ref(storage, "staging/outro/upload/image.webp"), new Uint8Array([1]), { contentType: "image/webp" }));
    await assertFails(uploadBytes(ref(storage, "staging/admin-1/upload/file.exe"), new Uint8Array([1]), { contentType: "application/octet-stream" }));
  });

  it("nega escrita definitiva e leitura pública de staging", async () => {
    const admin = env.authenticatedContext("admin-1", { admin: true }).storage();
    await assertFails(uploadBytes(ref(admin, "publications/doc/image.webp"), new Uint8Array([1]), { contentType: "image/webp" }));
    await assertSucceeds(uploadBytes(ref(admin, "staging/admin-1/upload/image.webp"), new Uint8Array([1]), { contentType: "image/webp" }));
    const anonymous = env.unauthenticatedContext().storage();
    await assertFails(getBytes(ref(anonymous, "staging/admin-1/upload/image.webp")));
    await assertSucceeds(deleteObject(ref(admin, "staging/admin-1/upload/image.webp")));
  });
});
