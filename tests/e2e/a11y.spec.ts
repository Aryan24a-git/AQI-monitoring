import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function assertTouchTargets(page: import('@playwright/test').Page, label: string) {
  if ((page.viewportSize()?.width ?? 1280) > 480) return;
  const small = await page.evaluate(() => {
    const els = Array.from(
      document.querySelectorAll<HTMLElement>('button, a, [role="tab"], [role="button"], summary')
    );
    return els
      .filter((el) => {
        if (el.classList.contains('sr-only')) return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44);
      })
      .map((el) => ({
        text: (el.textContent || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 40),
        w: Math.round(el.getBoundingClientRect().width),
        h: Math.round(el.getBoundingClientRect().height),
      }));
  });
  expect(small, `Touch targets < 44x44 on ${label}`).toEqual([]);
}

async function assertNoSeriousA11yViolations(page: import('@playwright/test').Page, label: string) {
  const results = await new AxeBuilder({ page }).analyze();
  const bad = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  expect(
    bad.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => n.html) })),
    `Axe violations on ${label}`
  ).toEqual([]);
  await assertTouchTargets(page, label);
}

test('all main UI states have zero critical or serious axe violations', async ({ page }) => {
  await page.route('**/api/ready', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ready', llm: false }),
    })
  );

  // 1. First screen (landing empty state)
  await page.goto('/');
  await expect(page.getByText(/Check live winter air quality/i)).toBeVisible();
  await assertNoSeriousA11yViolations(page, 'landing');

  // Load manual PM2.5 reading so main dashboard tabs render without external network
  await page.getByRole('button', { name: /Enter.*PM2\.5|Manual/i }).click();
  await page.getByRole('button', { name: /Apply/i }).click();

  // 2. Playbook tab
  await expect(page.getByText(/Today’s Live Impact Meter/i)).toBeVisible();
  await assertNoSeriousA11yViolations(page, 'playbook');

  // 3. Copilot tab
  await page
    .getByRole('tab', { name: /Ask AI/i })
    .locator('visible=true')
    .first()
    .click();
  await expect(page.getByText(/Ask VayuSaathi Copilot/i)).toBeVisible();
  await assertNoSeriousA11yViolations(page, 'copilot');

  // 4. Community tab
  await page
    .getByRole('tab', { name: /Community/i })
    .locator('visible=true')
    .first()
    .click();
  await expect(page.getByText(/WhatsApp RWA Bulletin/i)).toBeVisible();
  await assertNoSeriousA11yViolations(page, 'community');

  // 5. Profile drawer open
  await page.getByRole('button', { name: /Profile/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await assertNoSeriousA11yViolations(page, 'profile-drawer');
});
