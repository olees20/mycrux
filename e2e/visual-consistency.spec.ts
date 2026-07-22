import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const enabled = process.env.E2E_SUPABASE === "true";
const screenshot = process.env.E2E_VISUAL_SCREENSHOTS === "true";
const password = "Crux-Demo-Only-2026!";
const gym = "demo-crux-centre";
const viewports = [{ name: "desktop", width: 1440, height: 900 }, { name: "tablet", width: 1024, height: 768 }, { name: "mobile", width: 390, height: 844 }] as const;

const memberRoutes = [
  "", "/routes", "/routes/70000000-0000-4000-8000-000000000001", "/logbook", "/events", "/events/81000000-0000-4000-8000-000000000001",
  "/community", "/chat", "/chat/84000000-0000-4000-8000-000000000001", "/competitions", "/announcements", "/notifications", "/statistics",
  "/leaderboards", "/wallet", "/waivers", "/guests", "/partners", "/profile", "/search?q=route",
].map((suffix) => `/g/${gym}/app${suffix}`);

const staffRoutes = [
  "", "/floorplan", "/routes", "/holds", "/check-in", "/guests", "/events",
  "/competitions", "/route-feedback", "/announcements", "/waivers", "/member-access", "/team", "/analytics", "/route-analytics",
  "/route-analytics/history", "/plans", "/billing", "/integrations", "/privacy", "/settings", "/setup",
].map((suffix) => `/g/${gym}/staff${suffix}`);

async function login(page: Page, email: string, next: string) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname !== "/login");
}

async function inspect(page: Page, route: string, viewport: typeof viewports[number]) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  const response = await page.goto(route, { waitUntil: "networkidle" });
  expect(response?.status(), `${route} returned an error`).toBeLessThan(400);
  await expect(page.locator("#main-content")).toBeVisible();
  const layout = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    clippedControls: [...document.querySelectorAll<HTMLElement>("button, a, input, select, textarea")].filter((element) => {
      const rect = element.getBoundingClientRect();
      const visible = rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== "hidden";
      return visible && (rect.right > document.documentElement.clientWidth + 2 || rect.left < -2);
    }).length,
    blackNavigation: [...document.querySelectorAll<HTMLElement>("header, aside, nav")].some((element) => {
      const background = getComputedStyle(element).backgroundColor;
      const rect = element.getBoundingClientRect();
      return background === "rgb(0, 0, 0)" && rect.width > 160 && rect.height > 160;
    }),
  }));
  expect(layout.overflow, `${route} overflows at ${viewport.width}×${viewport.height}`).toBe(false);
  expect(layout.clippedControls, `${route} has clipped controls at ${viewport.name}`).toBe(0);
  expect(layout.blackNavigation, `${route} still uses black navigation`).toBe(false);
  if (viewport.name === "desktop") {
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(results.violations.filter(({ impact }) => impact === "critical" || impact === "serious"), `${route} accessibility issues`).toEqual([]);
  }
  if (screenshot) await page.screenshot({ fullPage: true, path: `test-results/visual/${viewport.name}-${route.replaceAll(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}.png` });
}

test.describe("authenticated visual route matrix", () => {
  test.skip(!enabled, "Requires the documented local-only Supabase seed");
  test.setTimeout(10 * 60 * 1000);

  test("member routes at all target viewports", async ({ page }) => {
    await login(page, "member@crux.example.invalid", memberRoutes[0]);
    for (const viewport of viewports) for (const route of memberRoutes) await inspect(page, route, viewport);
  });

  test("owner and staff routes at all target viewports", async ({ page }) => {
    await login(page, "owner@crux.example.invalid", staffRoutes[0]);
    for (const viewport of viewports) for (const route of staffRoutes) await inspect(page, route, viewport);
  });

  test("platform routes at all target viewports", async ({ page }) => {
    await login(page, "admin@crux.example.invalid", "/platform");
    for (const viewport of viewports) for (const route of ["/platform", "/platform/gyms/new", "/platform/gyms/30000000-0000-4000-8000-000000000001"]) await inspect(page, route, viewport);
  });
});
