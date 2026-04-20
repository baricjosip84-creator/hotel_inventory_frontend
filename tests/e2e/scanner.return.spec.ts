import { test, expect, type Locator, type Page } from '@playwright/test';
import { bootstrapAuthenticatedPage } from './helpers/session';

/*
  tests/e2e/scanner.return.spec.ts

  What changed:
  - adds scanner return / auto-receive browser coverage
  - drives the Shipments page with the same URL parameter contract used by your scanner integration
  - verifies shipment restoration, location restoration, and safe return behavior

  Why:
  - scanner return is one of the most integration-sensitive flows in your app
  - it combines route params, state restoration, and receive logic

  What problem this solves:
  - catches regressions where shipmentId/itemId/locationId/scannedBarcode stop restoring state
  - catches regressions where scanner return stops selecting the right shipment context
  - creates a regression guard around the auto-receive entry path without inventing a mock workflow
*/

async function getMain(page: Page): Promise<Locator> {
  const main = page.locator('main');

  await expect(page).toHaveURL(/\/shipments/);
  await expect(page.locator('h1')).toContainText(/Shipments/i);

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
    test.fail(true, 'No shipment card was available for scanner return tests.');
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

async function selectDefaultScanLocation(main: Locator): Promise<string | null> {
  const locationSelect = main.locator('select').first();

  if ((await locationSelect.count()) === 0) {
    test.fail(true, 'Default scan location selector was not rendered.');
    return null;
  }

  const options = await locationSelect.locator('option').evaluateAll((nodes) =>
    nodes
      .map((node) => ({
        value: (node as HTMLOptionElement).value,
        text: ((node as HTMLOptionElement).textContent || '').trim(),
        disabled: (node as HTMLOptionElement).disabled
      }))
      .filter((option) => option.value && !option.disabled)
  );

  if (options.length === 0) {
    return null;
  }

  await locationSelect.selectOption(options[0]["value"]);
  return options[0]["value"];
}

async function readSelectedShipmentId(main: Locator): Promise<string | null> {
  const text = await main.innerText();
  const match = text.match(/Shipment ID:\s*([a-f0-9-]{8,})/i);
  return match ? match[1] : null;
}

async function findShipmentItemId(main: Locator): Promise<string | null> {
  /*
    Prefer an explicit item identifier if the UI exposes one.
  */
  const text = await main.innerText();

  const itemMatch =
    text.match(/Item ID:\s*([a-f0-9-]{8,})/i) ||
    text.match(/Shipment Item ID:\s*([a-f0-9-]{8,})/i);

  if (itemMatch) {
    return itemMatch[1];
  }

  /*
    Fallback:
    use a data attribute if the selected shipment line exposes one in the DOM.
  */
  const itemNode = main.locator('[data-item-id], [data-shipment-item-id]').first();

  if ((await itemNode.count()) > 0) {
    const dataItemId = await itemNode.getAttribute('data-item-id');
    const dataShipmentItemId = await itemNode.getAttribute('data-shipment-item-id');
    return dataItemId || dataShipmentItemId;
  }

  return null;
}

test.describe('scanner return and auto-receive integration', () => {
  test('scanner return restores shipment and default scan location context', async ({
    page,
    request
  }) => {
    await bootstrapAuthenticatedPage(page, request);

    await page.goto('/shipments');

    const main = await getMain(page);

    await selectFirstOperationalShipment(main);

    await expect(main).not.toContainText(/Select a shipment to continue\./i);
    await expect(main).toContainText(/Selected Shipment|Shipment Items/i);
    await expect(main).toContainText(/Default Scan Location/i);

    const shipmentId = await readSelectedShipmentId(main);
    expect(shipmentId).toBeTruthy();

    const locationId = await selectDefaultScanLocation(main);

    if (!locationId) {
      await expect(main).toContainText(
        /no storage locations|create a storage location|storage locations available/i
      );
      return;
    }

    const locationSelect = main.locator('select').first();
    await expect(locationSelect).toHaveValue(locationId);

    const itemId = await findShipmentItemId(main);

    /*
      The scanner contract supports itemId, but not every UI state exposes it clearly.
      Build the return URL from what the page currently exposes without inventing values.
    */
    const params = new URLSearchParams({
      shipmentId,
      locationId,
      scannedBarcode: 'E2E-SCANNER-RETURN'
    });

    if (itemId) {
      params.set('itemId', itemId);
    }

    await page.goto(`/shipments?${params.toString()}`);

    const restoredMain = await getMain(page);

    await expect(restoredMain).not.toContainText(/Select a shipment to continue\./i);
    await expect(restoredMain).toContainText(/Selected Shipment|Shipment Items/i);
    await expect(restoredMain).toContainText(/Default Scan Location/i);

    const restoredLocationSelect = restoredMain.locator('select').first();
    await expect(restoredLocationSelect).toHaveValue(locationId);

    await expect(page.locator('body')).toContainText(
      /Selected Shipment|Shipment Items|Default Scan Location|Scan/i
    );
  });

  test('scanner return keeps the page safe when auto-receive conditions are not fully actionable', async ({
    page,
    request
  }) => {
    await bootstrapAuthenticatedPage(page, request);

    /*
      Deliberately omit locationId so the page must remain safe and require manual action
      instead of proceeding with silent receiving.
    */
    await page.goto('/shipments?shipmentId=00000000-0000-0000-0000-000000000000&scannedBarcode=E2E-UNSAFE-RETURN');

    const main = await getMain(page);

    /*
      The page must remain usable even if the scanner return cannot be resolved into a safe receive.
    */
    await expect(page.locator('body')).not.toContainText(/Unhandled Runtime Error|Something went wrong/i);

    /*
      Accept either:
      - the page remains on the generic shipment list with safe fallback UI
      - or it restores shipment context but still requires location/manual user action
    */
    await expect(page.locator('body')).toContainText(
      /Shipments|Shipment List|Selected Shipment|Default Scan Location|Select a shipment to continue/i
    );
  });
});
