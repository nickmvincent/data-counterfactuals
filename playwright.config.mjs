import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";

const macChromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browserUse = existsSync(macChromePath)
  ? {
      browserName: "chromium",
      launchOptions: {
        executablePath: macChromePath,
      },
    }
  : {
      browserName: "chromium",
      channel: "chrome",
    };

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  use: {
    ...browserUse,
    baseURL: "http://127.0.0.1:4321",
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    viewport: {
      width: 1440,
      height: 1200,
    },
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 4321",
    url: "http://127.0.0.1:4321/grid",
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",
    timeout: 120_000,
  },
});
