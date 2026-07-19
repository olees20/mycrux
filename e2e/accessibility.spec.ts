import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator } from "@playwright/test";

function channel(value: number) {
  const normalised = value / 255;
  return normalised <= 0.04045 ? normalised / 12.92 : ((normalised + 0.055) / 1.055) ** 2.4;
}

function luminance(cssColour: string) {
  const values = cssColour.match(/[\d.]+/g)?.slice(0, 3).map(Number);
  if (!values || values.length !== 3) throw new Error(`Unsupported CSS colour: ${cssColour}`);
  return 0.2126 * channel(values[0]) + 0.7152 * channel(values[1]) + 0.0722 * channel(values[2]);
}

function contrast(first: string, second: string) {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

async function renderedColours(locator: Locator) {
  return locator.evaluate((element) => {
    const styles = getComputedStyle(element);
    return { background: styles.backgroundColor, foreground: styles.color };
  });
}

async function renderedContrast(locator: Locator) {
  const colours = await renderedColours(locator);
  return contrast(colours.foreground, colours.background);
}

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

test("homepage primary links retain contrast and a visible focus indicator", async ({ page }) => {
  await page.goto("/");

  for (const name of ["Join", "Create your account"]) {
    const link = page.getByRole("link", { name, exact: true });
    await expect(link).toBeVisible();
    await link.evaluate((element) => element.addEventListener("click", (event) => event.preventDefault()));

    expect(await renderedContrast(link)).toBeGreaterThanOrEqual(4.5);

    await link.hover();
    expect(await renderedContrast(link)).toBeGreaterThanOrEqual(4.5);

    await link.focus();
    const focus = await link.evaluate((element) => {
      const styles = getComputedStyle(element);
      return {
        background: getComputedStyle(document.body).backgroundColor,
        outline: styles.outlineColor,
        style: styles.outlineStyle,
        width: Number.parseFloat(styles.outlineWidth),
      };
    });
    expect(focus.style).toBe("solid");
    expect(focus.width).toBeGreaterThanOrEqual(3);
    expect(contrast(focus.outline, focus.background)).toBeGreaterThanOrEqual(3);

    await link.hover();
    await page.mouse.down();
    expect(await renderedContrast(link)).toBeGreaterThanOrEqual(4.5);
    await page.mouse.up();

    await link.evaluate((element) => element.setAttribute("aria-disabled", "true"));
    const disabledColours = await renderedColours(link);
    expect(
      contrast(disabledColours.foreground, disabledColours.background),
      `Disabled ${name} colours: ${JSON.stringify(disabledColours)}`,
    ).toBeGreaterThanOrEqual(4.5);
    await link.evaluate((element) => element.removeAttribute("aria-disabled"));
  }
});

test("public layouts do not overflow common viewport widths", async ({ page }) => {
  for (const width of [320, 768, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/login");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow, `Unexpected horizontal overflow at ${width}px`).toBe(false);
  }
});
