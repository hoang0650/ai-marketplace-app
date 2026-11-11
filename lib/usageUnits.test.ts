import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { accessPeriodOf, isAccessListing, isAccessPeriodUnit, labelForUnit, unitsForCategory, usageUnitChoice, usageUnitLabelText } from './usageUnits.ts';
import { packagePriceVnd, paymentChoiceOf, sellerPackageDraft } from './servicePackages.ts';

const catalog = {
  units: [
    { code: '1k_characters', labelEn: '1K characters', labelVi: '1K ký tự', dimension: 'characters', kind: 'metered', unitSize: 1000 },
    { code: '1_day', labelEn: '1 day', labelVi: '1 ngày', dimension: 'access_period', kind: 'entitlement', unitSize: 1, period: 'day' },
    { code: '1_hour', labelEn: '1 hour', labelVi: '1 giờ', dimension: 'seconds', kind: 'metered', unitSize: 3600 },
  ],
  allowedByCategory: {
    'text-to-text': ['1k_characters', '1_day'],
    'gpu-compute': ['1_hour'],
  },
};

describe('usage unit catalog', () => {
  it('offers only the codes the server allows for that category', () => {
    assert.deepEqual(unitsForCategory(catalog, 'text-to-text').map((unit) => unit.code), ['1k_characters', '1_day']);
    assert.deepEqual(unitsForCategory(catalog, 'gpu-compute').map((unit) => unit.code), ['1_hour']);
    assert.deepEqual(unitsForCategory(null, 'text-to-text'), []);
    assert.equal(labelForUnit(catalog.units[0], 'vi'), '1K ký tự');
    assert.equal(labelForUnit(catalog.units[0], 'en'), '1K characters');
  });

  it('refuses free text and units outside the category', () => {
    assert.equal(usageUnitChoice('per token', ['1k_characters']).ok, false);
    assert.equal(usageUnitChoice('1_hour', ['1k_characters']).code, 'USAGE_UNIT_NOT_METERABLE');
    assert.deepEqual(usageUnitChoice('1k_characters', ['1k_characters']), { ok: true, code: '1k_characters' });
  });

  it('treats day, week, month and year as access periods', () => {
    assert.equal(isAccessPeriodUnit(catalog.units[1]), true);
    assert.equal(isAccessPeriodUnit(catalog.units[2]), false);
    assert.equal(accessPeriodOf('1_day', catalog), 'day');
    assert.equal(accessPeriodOf('1_hour', catalog), null);
    assert.equal(isAccessListing({ usagePeriod: 'week' }), true);
    assert.equal(isAccessListing({ usageUnit: '1_hour' }), false);
    assert.equal(usageUnitLabelText({ vi: '1 ngày', en: '1 day' }, 'vi'), '1 ngày');
    assert.equal(usageUnitLabelText(null, 'en'), null);
  });
});

describe('service package payment', () => {
  it('accepts staged or prepaid and reads only a server VND integer', () => {
    assert.equal(paymentChoiceOf('staged'), 'staged');
    assert.equal(paymentChoiceOf('prepaid'), 'prepaid');
    assert.equal(paymentChoiceOf('later'), null);
    assert.equal(packagePriceVnd({ amountVnd: 1500000, authoritative: true }), 1500000);
    assert.equal(packagePriceVnd({ amountVnd: null, authoritative: false, code: 'RATE_UNAVAILABLE' }), null);
    assert.equal(packagePriceVnd({ amountVnd: 10, authoritative: false }), null);
  });

  it('stores the seller amount in the currency they entered', () => {
    const saved = sellerPackageDraft({
      name: 'Nửa ngày',
      scope: 'Chụp tại studio',
      deliverable: '20 ảnh đã chỉnh',
      durationDays: '1',
      price: '150',
      currency: 'usd',
    });
    assert.equal(saved.ok, true);
    if (saved.ok) assert.equal(saved.row.currency, 'USD');
    assert.equal(sellerPackageDraft({
      name: 'Gói',
      scope: 'Phạm vi',
      deliverable: 'Ảnh',
      durationDays: '0',
      price: '10',
      currency: 'USD',
    }).ok, false);
  });
});
