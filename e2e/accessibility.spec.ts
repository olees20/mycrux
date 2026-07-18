import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const publicPages = ["/", "/login", "/register", "/forgot-password"] as const;

for (const path of publicPages) {
  test(`${path} has no serious automated accessibility violations`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    const serious = results.violations.filter(({ impact }) => impact === "critical" || impact === "serious");
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });
}

test("skip navigation reaches the main landmark", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Skip to main content" });
  await expect(skipLink).toBeFocused();
  await skipLink.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
});

test("public layouts do not overflow common viewport widths", async ({ page }) => {
  for (const width of [320, 768, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/login");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow, `Unexpected horizontal overflow at ${width}px`).toBe(false);
  }
});
