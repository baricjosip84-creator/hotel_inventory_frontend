import { test, expect, type Locator } from '@playwright/test';
import { bootstrapAuthenticatedPage } from './helpers/session';

/*
  tests/e2e/shipments.receiving.spec.ts

  What changed:
  - targets the actual shipment list area instead of broad page-level candidates
  - prefers pending/partial shipment cards because those are operationally actionable
  - clicks a real action inside the shipment card first, then falls back to clicking the card
  - explicitly verifies that the placeholder text "Select a shipment to continue." disappears
    before checking default scan location readiness

  Why:
  - the previous test was still interacting with the wrong element shape for your page
  - your latest failure proves the page stayed in the unselected state after the click attempt

  What problem this solves:
  - prevents false failures where the test reaches Shipments but never actually selects a shipment
  - aligns the E2E flow with the real selected-shipment panel behavior already present in your app
*/

async function selectFirstOperationalShipment(main: Locator): Promise<void> {
  const shipmentListSection = main
    .locator('section, div, article')
    .filter({ hasText: /Shipment List/i })
    .first();

  const preferredCards = shipmentListSection
    .locator('section, div, article')
    .filter({
      hasText: /Shipment ID:/i
    })
    .filter({
      hasText: /PENDING|PARTIAL/i
    });

  const fallbackCards = shipmentListSection.locator('section, div, article').filter({
    hasText: /Shipment ID:/i
  });

  const cardCount = await preferredCards.count();
  const card = cardCount > 0 ? preferredCards.first() : fallbackCards.first();

  if ((await card.count()) === 0) {
    test.fail(true, 'No shipment card was available for selection.');
    return;
  }

  /*
    Prefer explicit card-level actions if present.
    This avoids assuming the whole card is clickable when the UI may require a button.
  */
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

test.describe('shipment receiving readiness', () => {
  test('selected shipment requires default scan location before scanning', async ({
    page,
    request
  }) => {
    await bootstrapAuthenticatedPage(page, request);

    await page.goto('/shipments');
    await expect(page).toHaveURL(/\/shipments$/);

    const main = page.locator('main');

    await expect(page.locator('h1')).toContainText(/Shipments/i);
    await expect(main).toContainText(/Shipment List/i);

    await selectFirstOperationalShipment(main);

    /*
      The real signal that selection succeeded is that the placeholder state is gone.
      Do not continue until the page leaves the unselected state.
    */
    await expect(main).not.toContainText(/Select a shipment to continue\./i);
    await expect(main).toContainText(/Selected Shipment|Shipment Items/i);
    await expect(main).toContainText(/Default Scan Location/i);

    const scanButton = main.getByRole('button', { name: /scan/i }).first();
    await expect(scanButton).toBeDisabled();

    await expect(main).toContainText(
      /default scan location|must select.*location|select.*location before scanning/i
    );

    const locationSelect = main.locator('select').first();

    if ((await locationSelect.count()) === 0) {
      test.fail(true, 'Default scan location selector was not rendered for the selected shipment.');
      return;
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
      return;
    }

    await locationSelect.selectOption(optionValues[0]);
    await expect(scanButton).toBeEnabled();
  });
});