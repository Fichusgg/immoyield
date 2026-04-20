import { test, expect } from '@playwright/test';

// ── Landing page ──────────────────────────────────────────────────────────────

test.describe('Landing page', () => {
  test('renders hero and dual-path CTAs', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Análise de investimento imobiliário');
    await expect(page.getByText('Sou investidor')).toBeVisible();
    await expect(page.getByText('Represento uma agência')).toBeVisible();
  });

  test('skip-link is present', async ({ page }) => {
    await page.goto('/');
    const skipLink = page.getByText('Pular para o conteúdo');
    await expect(skipLink).toBeAttached();
  });

  test('interactive demo inputs are functional', async ({ page }) => {
    await page.goto('/');
    const priceInput = page.locator('input').first();
    await expect(priceInput).toBeVisible();
    await priceInput.fill('500000');
    await expect(page.getByText('Yield Bruto')).toBeVisible();
  });

  test('nav links are visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Entrar' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Criar conta' })).toBeVisible();
  });

  test('FAQ accordion renders items', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Preciso entender de finanças para usar?')).toBeVisible();
  });

  test('pricing section renders three tiers', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Individual Free')).toBeVisible();
    await expect(page.getByText('Individual Pro')).toBeVisible();
    await expect(page.getByText('Agência')).toBeVisible();
  });

  test('footer disclaimer is present', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/Cálculos para fins informativos/)).toBeVisible();
  });
});

// ── Auth page ─────────────────────────────────────────────────────────────────

test.describe('Auth page', () => {
  test('renders two-column layout on desktop', async ({ page, viewport }) => {
    await page.goto('/auth');
    await expect(page.getByText('Entrar na plataforma')).toBeVisible();
    // Right trust panel is only visible on md+ screens
    if (viewport && viewport.width >= 768) {
      await expect(page.getByText(/ImóYield não compra/)).toBeVisible();
    }
  });

  test('shows email input field', async ({ page }) => {
    await page.goto('/auth');
    // Supabase Auth UI renders an email input
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible({ timeout: 5000 });
  });

  test('back to site link works', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.getByText('← Voltar para o site')).toBeVisible();
  });
});

// ── Shared report page ────────────────────────────────────────────────────────

test.describe('Shared report page (unauthenticated)', () => {
  test('404 for unknown slug', async ({ page }) => {
    const response = await page.goto('/r/slug-que-nao-existe-xyz');
    // Either 404 or notFound page
    expect(response?.status()).toBe(404);
  });
});

// ── Dashboard redirect ────────────────────────────────────────────────────────

test.describe('Protected routes', () => {
  test('redirects /propriedades to auth when unauthenticated', async ({ page }) => {
    await page.goto('/propriedades');
    await expect(page).toHaveURL(/\/auth/);
  });

  test('redirects /imoveis route to auth when unauthenticated', async ({ page }) => {
    await page.goto('/imoveis/fake-id');
    await expect(page).toHaveURL(/\/auth/);
  });
});

// ── Internal design page ──────────────────────────────────────────────────────

test.describe('Internal design page', () => {
  test('renders design system documentation', async ({ page }) => {
    await page.goto('/internal/design');
    await expect(page.getByText('Sistema de Design')).toBeVisible();
    await expect(page.getByText(/1 · Paleta de cores/i)).toBeVisible();
    await expect(page.getByText(/2 · Tipografia/i)).toBeVisible();
  });
});
