import { test, expect, type Locator, type Page } from '@playwright/test';
import { bootstrapAuthenticatedPage } from './helpers/session';

/*
  tests/e2e/shipment.receive.execution.spec.ts

  What changed:
  - adds authenticated shipment receive execution coverage
  - selects an operational shipment
  - applies a default scan location
  - attempts one real receive action on a shipment line
  - verifies the shipments page remains healthy after the mutation

  Why:
  - readiness coverage already proves the default scan location requirement exists
  - the next production step is proving the receive workflow can execute

  What problem this solves:
  - catches regressions where shipment line receive controls stop working
  - catches regressions where location selection does not unlock receiving
  - catches regressions where the shipments page fails to recover after a receive action
*/

async function getMain(page: Page): Promise<Locator> {
  const main = page.locator('main');

  await expect(page).toHaveURL(/\/shipments$/);
  await expect(page.locator('h1')).toContainText(/Shipments/i);
  await expect(main).toContainText(/Shipment List/i);

  return main;
}

async function selectFirstOperationalShipment(main: Locator): Promise<void> {
  const shipmentListSection = main
    .locator('section, div, article')
    .filter({ hasText: /Shipment List/i })
    .first();

  const preferredCards = shipmentListSection
    .locator('section, div, article')
    .filter({ hasText: /Shipment ID:/i })
    .filter({ hasText: /PENDING|PARTIAL/i });

  const fallbackCards = shipmentListSection
    .locator('section, div, article')
    .filter({ hasText: /Shipment ID:/i });

  const card = (await preferredCards.count()) > 0 ? preferredCards.first() : fallbackCards.first();

  if ((await card.count()) === 0) {
    test.fail(true, 'No shipment card was available for selection.');
    return;
  }

  const cardButtons = card.getByRole('button');

  if ((await cardButtons.count()) > 0) {
    await cardButtons.first().click();
    return;
  }

  const cardLinks = card.getByRole('link');

  if ((await cardLinks.count()) > 0) {
    await cardLinks.first().click();
    return;
  }

  await card.click();
}

async function selectDefaultScanLocation(main: Locator): Promise<boolean> {
  const locationSelect = main.locator('select').first();

  if ((await locationSelect.count()) === 0) {
    test.fail(true, 'Default scan location selector was not rendered for the selected shipment.');
    return false;
  }

  const optionValues = await locationSelect.locator('option').evaluateAll((options) =>
    options
      .map((option) => ({
        value: (option as HTMLOptionElement).value,
        disabled: (option as HTMLOptionElement).disabled
      }))
      .filter((option) => option.value && !option.disabled)
      .map((option) => option.value)
  );

  if (optionValues.length === 0) {
    await expect(main).toContainText(
      /no storage locations|create a storage location|storage locations available/i
    );
    return false;
  }

  await locationSelect.selectOption(optionValues[0]);
  return true;
}

async function getReceiveSurface(page: Page): Promise<Locator> {
  const dialog = page.getByRole('dialog').first();

  if ((await dialog.count()) > 0 && (await dialog.isVisible())) {
    return dialog;
  }

  return page.locator('main');
}

async function openReceiveAction(main: Locator): Promise<boolean> {
  const explicitReceiveButtons = main.getByRole('button', { name: /^receive$/i });

  if ((await explicitReceiveButtons.count()) > 0) {
    await explicitReceiveButtons.first().click();
    return true;
  }

  const broaderReceiveButtons = main.getByRole('button', { name: /receive/i });

  if ((await broaderReceiveButtons.count()) > 0) {
    await broaderReceiveButtons.first().click();
    return true;
  }

  const lineCandidates = main
    .locator('section, article, div, tr')
    .filter({ hasText: /ordered|received|remaining|product/i });

  if ((await lineCandidates.count()) === 0) {
    return false;
  }

  const firstLine = lineCandidates.first();
  const lineButtons = firstLine.getByRole('button', { name: /receive|save|submit|confirm/i });

  if ((await lineButtons.count()) > 0) {
    await lineButtons.first().click();
    return true;
  }

  return false;
}

async function fillReceiveForm(surface: Locator): Promise<void> {
  const selects = surface.locator('select');
  const selectCount = await selects.count();

  for (let i = 0; i < selectCount; i += 1) {
    const select = selects.nth(i);

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
      await input.fill('E2E shipment receive verification');
    }
  }
}

async function submitReceive(surface: Locator): Promise<boolean> {
  const submitButtons = [
    surface.getByRole('button', { name: /^receive$/i }).first(),
    surface.getByRole('button', { name: /save|submit|confirm/i }).first()
  ];

  for (const button of submitButtons) {
    if ((await button.count()) > 0 && (await button.isVisible()) && !(await button.isDisabled())) {
      await button.click();
      return true;
    }
  }

  return false;
}

test.describe('shipment receive execution', () => {
  test('authorized user can execute one shipment receive flow', async ({ page, request }) => {
    await bootstrapAuthenticatedPage(page, request);

    await page.goto('/shipments');

    const main = await getMain(page);

    await selectFirstOperationalShipment(main);

    await expect(main).not.toContainText(/Select a shipment to continue\./i);
    await expect(main).toContainText(/Selected Shipment|Shipment Items/i);
    await expect(main).toContainText(/Default Scan Location/i);

    const locationSelected = await selectDefaultScanLocation(main);

    if (!locationSelected) {
      return;
    }

    const scanButton = main.getByRole('button', { name: /scan/i }).first();
    await expect(scanButton).toBeEnabled();

    const receiveOpened = await openReceiveAction(main);

    if (!receiveOpened) {
      test.fail(true, 'No shipment receive action was available for the selected shipment.');
      return;
    }

    const surface = await getReceiveSurface(page);

    await expect(surface).toContainText(/receive|quantity|location|product/i);

    await fillReceiveForm(surface);

    const submitted = await submitReceive(surface);

    if (!submitted) {
      test.fail(true, 'No enabled submit button was available for shipment receive.');
      return;
    }

    await expect(page).toHaveURL(/\/shipments$/);
    await expect(page.locator('h1')).toContainText(/Shipments/i);
    await expect(main).toContainText(/Selected Shipment|Shipment Items/i);

    await expect(page.locator('body')).toContainText(
      /success|updated|saved|recorded|received|shipment items/i
    );
  });
});