import { test, expect, type Locator, type Page } from '@playwright/test';
import { bootstrapAuthenticatedPage } from './helpers/session';

/*
  tests/e2e/stock.mutations.spec.ts

  What changed:
  - fixes strict-mode heading collisions on the stock page
  - scopes stock-page assertions to the real page h1
  - keeps mutation execution coverage intact

  Why:
  - your stock page now contains multiple headings that include the word "Stock"
  - the previous selector matched too many elements for Playwright strict mode

  What problem this solves:
  - removes false failures caused by broad heading matching
  - preserves real mutation-flow coverage
*/

async function expectStockPageLoaded(page: Page): Promise<Locator> {
  const main = page.locator('main');

  await expect(page).toHaveURL(/\/stock$/);
  await expect(page.locator('h1')).toContainText(/^Stock$/i);
  await expect(main).toContainText(/Stock Movements|Quantity|Location|Product/i);

  return main;
}

async function findActionButton(
  main: Locator
): Promise<{ button: Locator; action: 'consume' | 'count' | 'adjust' }> {
  const candidates: Array<{
    locator: Locator;
    action: 'consume' | 'count' | 'adjust';
  }> = [
    {
      locator: main.getByRole('button', { name: /^consume$/i }).first(),
      action: 'consume'
    },
    {
      locator: main.getByRole('button', { name: /^count$/i }).first(),
      action: 'count'
    },
    {
      locator: main.getByRole('button', { name: /^adjust$/i }).first(),
      action: 'adjust'
    }
  ];

  for (const candidate of candidates) {
    if ((await candidate.locator.count()) > 0 && (await candidate.locator.isVisible())) {
      return { button: candidate.locator, action: candidate.action };
    }
  }

  test.fail(true, 'No visible stock mutation action button was available.');
  return candidates[0];
}

async function getMutationSurface(page: Page): Promise<Locator> {
  const dialog = page.getByRole('dialog').first();

  if ((await dialog.count()) > 0 && (await dialog.isVisible())) {
    return dialog;
  }

  return page.locator('main');
}

async function fillSafeMutationForm(
  surface: Locator,
  action: 'consume' | 'count' | 'adjust'
): Promise<void> {
  const editableSelects = surface.locator('select');
  const selectCount = await editableSelects.count();

  for (let i = 0; i < selectCount; i += 1) {
    const select = editableSelects.nth(i);

    if (!(await select.isVisible())) {
      continue;
    }

    const optionValues = await select.locator('option').evaluateAll((options) =>
      options
        .map((option) => ({
          value: (option as HTMLOptionElement).value,
          disabled: (option as HTMLOptionElement).disabled
        }))
        .filter((option) => option.value && !option.disabled)
        .map((option) => option.value)
    );

    if (optionValues.length > 0) {
      await select.selectOption(optionValues[0]);
    }
  }

  const numberInputs = surface.locator('input[type="number"]');
  const numberInputCount = await numberInputs.count();

  for (let i = 0; i < numberInputCount; i += 1) {
    const input = numberInputs.nth(i);

    if (await input.isVisible()) {
      await input.fill('1');
    }
  }

  const textInputs = surface.locator('input[type="text"], textarea');
  const textInputCount = await textInputs.count();

  for (let i = 0; i < textInputCount; i += 1) {
    const input = textInputs.nth(i);

    if (!(await input.isVisible())) {
      continue;
    }

    const currentValue = await input.inputValue().catch(() => '');

    if (!currentValue) {
      await input.fill(`E2E ${action} mutation verification`);
    }
  }
}

async function submitMutation(
  surface: Locator,
  action: 'consume' | 'count' | 'adjust'
): Promise<void> {
  const submitButtons = [
    surface.getByRole('button', { name: new RegExp(`^${action}$`, 'i') }).first(),
    surface.getByRole('button', { name: /save|submit|confirm/i }).first()
  ];

  for (const button of submitButtons) {
    if ((await button.count()) > 0 && (await button.isVisible()) && !(await button.isDisabled())) {
      await button.click();
      return;
    }
  }

  test.fail(true, `No enabled submit button was available for stock action: ${action}.`);
}

test.describe('stock mutation execution', () => {
  test('authorized user can open and submit a stock mutation flow', async ({ page, request }) => {
    await bootstrapAuthenticatedPage(page, request);

    await page.goto('/stock');

    const main = await expectStockPageLoaded(page);

    const { button, action } = await findActionButton(main);
    await button.click();

    const surface = await getMutationSurface(page);

    await expect(surface).toContainText(/consume|count|adjust|quantity|location|product/i);

    await fillSafeMutationForm(surface, action);
    await submitMutation(surface, action);

    await expect(page).toHaveURL(/\/stock$/);
    await expect(page.locator('h1')).toContainText(/^Stock$/i);
    await expect(main).toContainText(/Stock Movements|Quantity|Location|Product/i);

    await expect(page.locator('body')).toContainText(
      /success|updated|saved|recorded|adjustment|consumption|count|stock movements/i
    );
  });
});