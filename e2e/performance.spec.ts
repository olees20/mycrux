import { expect, test } from "@playwright/test";

for (const path of ["/", "/login"] as const) {
  test(`${path} stays within the local mobile smoke budget`, async ({ page }) => {
    await page.goto(path, { waitUntil: "networkidle" });
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
      const transferBytes = performance.getEntriesByType("resource").reduce((total, entry) => total + (entry as PerformanceResourceTiming).transferSize, 0);
      return { domContentLoadedMs: navigation.domContentLoadedEventEnd, transferBytes };
    });
    expect(metrics.domContentLoadedMs).toBeLessThan(5_000);
    expect(metrics.transferBytes).toBeLessThan(2_500_000);
  });
}
