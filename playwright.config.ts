import { defineConfig, devices } from "@playwright/test";

const appPort = process.env.PLAYWRIGHT_PORT || "3000";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  globalSetup: "./tests/e2e/global-setup.ts",
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: `http://127.0.0.1:${appPort}`, trace: "on-first-retry" },
  webServer: [
    {
      command: "npx -y firebase-tools@latest emulators:start --only auth,firestore,storage,functions --project capoeira-17aee",
      url: "http://127.0.0.1:4000",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `npm run dev -- -p ${appPort}`,
      url: `http://127.0.0.1:${appPort}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        CHAO_BATIDO_E2E: "1",
        NEXT_PUBLIC_USE_FIREBASE_EMULATORS: "1",
        FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
        FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
        FIREBASE_STORAGE_EMULATOR_HOST: "127.0.0.1:9199",
        GCLOUD_PROJECT: "capoeira-17aee",
      },
    },
  ],
  projects: [
    { name: "mobile", use: { ...devices["Pixel 5"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
});
