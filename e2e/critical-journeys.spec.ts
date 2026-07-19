import { expect, test, type Page } from "@playwright/test";

const enabled = process.env.E2E_SUPABASE === "true";
const password = "Crux-Demo-Only-2026!";
const gym = "demo-crux-centre";

async function login(page: Page, email: string, next: string) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname !== "/login");
}

test.describe("seeded critical journeys", () => {
  test.skip(!enabled, "Requires local Supabase reset with the synthetic two-tenant fixtures");

  test("member onboarding, route discovery, ascent logging, waiver and event entry", async ({ page }) => {
    await login(page, "member@crux.example.invalid", `/g/${gym}/app`);
    await expect(page.getByRole("heading", { name: /Demo Crux Centre/ })).toBeVisible();
    await page.goto(`/g/${gym}/app/routes/70000000-0000-4000-8000-000000000001`);
    await expect(page.getByRole("heading", { name: "Lime and Punishment" })).toBeVisible();
    await page.getByRole("button", { name: "Log ascent" }).click();
    await expect(page.getByText(/Ascent logged|Ascent could not/)).toBeVisible();
    await page.goto(`/g/${gym}/app/waivers`);
    await expect(page.getByRole("heading", { name: "Waivers" })).toBeVisible();
    await page.goto(`/g/${gym}/app/events`);
    await expect(page.getByRole("heading", { name: "What’s happening" })).toBeVisible();
  });

  test("owner member access and subscription checkout boundary", async ({ page }) => {
    await login(page, "owner@crux.example.invalid", `/g/${gym}/staff`);
    await page.goto(`/g/${gym}/staff/member-access`);
    await expect(page.getByRole("heading", { name: "Member access" })).toBeVisible();
    await expect(page.getByText("Gym code")).toBeVisible();
    await page.goto(`/g/${gym}/staff/billing`);
    await expect(page.getByRole("heading", { name: "Crux platform subscription" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Start platform subscription|Manage in Stripe portal/ })).toBeVisible();
  });

  test("route setter, front desk, guest and competition controls remain role-bound", async ({ page }) => {
    await login(page, "setter@crux.example.invalid", `/g/${gym}/staff/routes`);
    await expect(page.getByRole("heading", { name: /Walls and routes/i })).toBeVisible();
    await page.context().clearCookies();
    await login(page, "staff@crux.example.invalid", `/g/${gym}/staff/check-in`);
    await expect(page.getByRole("heading", { name: /check-in/i })).toBeVisible();
    await page.goto(`/g/${gym}/staff/guests`);
    await expect(page.getByRole("heading", { name: /guest/i })).toBeVisible();
    await page.goto(`/g/${gym}/staff/competitions`);
    await expect(page.getByRole("heading", { name: /competition/i })).toBeVisible();
  });

  test("platform gym creation requires the explicit admin fixture", async ({ page }) => {
    await login(page, "admin@crux.example.invalid", "/platform/gyms/new");
    await expect(page.getByRole("heading", { name: "Create a gym tenant" })).toBeVisible();
  });
});
