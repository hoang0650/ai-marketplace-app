import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { WALLET_IAP_SKUS } from './iap-packs.ts';
import {
  affiliateWithdrawBody,
  impliedVndPerUsd,
  isLegacyAffiliateMinimumRejection,
  parseAffiliateVndInput,
  quoteAffiliateWithdraw,
} from './affiliateWithdraw.ts';

function messageValue(source: string, key: string): string {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(`'${escaped}':\\s*'((?:\\\\'|[^'])*)'`));
  assert.ok(match, key);
  return match[1].replace(/\\'/g, "'");
}

const RATE = 25_000;

function quote(amountVnd: number, availableVnd: number, availableUsd = Math.round((availableVnd / RATE) * 100) / 100) {
  return quoteAffiliateWithdraw({ amountVnd, availableVnd, availableUsd, vndPerUsd: RATE });
}

describe('affiliate withdraw quote', () => {
  it('allows a balance below 2,000,000 VND', () => {
    const result = quote(1_000_000, 1_500_000);
    assert.equal(result.ok, true);
    assert.equal(result.code, 'ok');
    assert.equal(result.amountVnd, 1_000_000);
    assert.equal(result.amountUsd, 40);
    assert.deepEqual(affiliateWithdrawBody(result), { amount: 40, persona: 'affiliate' });
  });

  it('allows exactly 2,000,000 VND and does not treat it as a minimum', () => {
    const result = quote(2_000_000, 2_000_000);
    assert.equal(result.ok, true);
    assert.equal(result.amountUsd, 80);
    const partial = quote(2_000_000, 3_000_000);
    assert.equal(partial.ok, true);
    assert.equal(partial.amountUsd, 80);
  });

  it('rejects zero and negative amounts', () => {
    assert.equal(quote(0, 2_000_000).code, 'not_positive');
    assert.equal(quote(-1, 2_000_000).code, 'not_positive');
    assert.equal(quote(-2_000_000, 5_000_000).code, 'not_positive');
    assert.equal(parseAffiliateVndInput(''), 0);
    assert.equal(parseAffiliateVndInput('-250000'), -250000);
    assert.equal(affiliateWithdrawBody(quote(0, 2_000_000)), null);
  });

  it('rejects non-finite amounts and fractional dong', () => {
    for (const amount of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      assert.equal(quote(amount, 2_000_000).code, 'nonfinite');
    }
    assert.equal(
      quoteAffiliateWithdraw({ amountVnd: 1000, availableVnd: 1000, availableUsd: Number.NaN, vndPerUsd: RATE }).code,
      'nonfinite',
    );
    assert.equal(parseAffiliateVndInput('1000.5'), Number.NaN);
    assert.equal(parseAffiliateVndInput('1,000.50'), Number.NaN);
    assert.equal(quote(parseAffiliateVndInput('1000.5'), 5_000_000).code, 'nonfinite');
  });

  it('accepts grouped whole VND', () => {
    assert.equal(parseAffiliateVndInput('1.000.000'), 1_000_000);
    assert.equal(parseAffiliateVndInput('1,500,000'), 1_500_000);
    assert.equal(quote(parseAffiliateVndInput('1.000.000'), 1_500_000).amountUsd, 40);
  });

  it('rejects a request above the available balance', () => {
    const result = quote(3_000_000, 2_500_000);
    assert.equal(result.ok, false);
    assert.equal(result.code, 'exceeds_available');
    assert.equal(result.amountUsd, 0);
    assert.equal(affiliateWithdrawBody(result), null);
  });

  it('pays the full displayed VND balance in exact USD cents', () => {
    const result = quoteAffiliateWithdraw({
      amountVnd: 100_001,
      availableVnd: 100_001,
      availableUsd: 4.01,
      vndPerUsd: RATE,
    });
    assert.equal(result.ok, true);
    assert.equal(result.amountUsd, 4.01);
    assert.deepEqual(affiliateWithdrawBody(result), { amount: 4.01, persona: 'affiliate' });
    assert.equal(impliedVndPerUsd(4.01, 100_001), 100_001 / 4.01);
  });

  it('rejects a VND amount that rounds to 0.00 USD as precision, not a new floor', () => {
    const result = quote(1, 5_000_000);
    assert.equal(result.code, 'below_precision');
    assert.equal(result.amountUsd, 0);
    assert.equal(result.ok, false);
  });

  it('does not consult a legacy 2,000,000 VND config when quoting', () => {
    const legacy = { thresholdVnd: 2_000_000, minWithdrawVnd: 2_000_000 };
    const result = quoteAffiliateWithdraw({
      amountVnd: 50_000,
      availableVnd: 50_000,
      availableUsd: 2,
      vndPerUsd: impliedVndPerUsd(2, 50_000),
    });
    assert.equal(legacy.minWithdrawVnd, 2_000_000);
    assert.equal(result.ok, true);
    assert.equal(result.amountUsd, 2);
    assert.equal(result.amountVnd < legacy.thresholdVnd, true);
  });

  it('names the old server rejection codes without turning them into a client floor', () => {
    assert.equal(isLegacyAffiliateMinimumRejection('AFFILIATE_MIN_WITHDRAWAL'), true);
    assert.equal(isLegacyAffiliateMinimumRejection('AFFILIATE_MIN_BALANCE'), true);
    assert.equal(isLegacyAffiliateMinimumRejection('PAYOUT_HELD'), false);
    const below = quote(100_000, 100_000);
    assert.equal(below.ok, true);
    assert.equal(affiliateWithdrawBody(below)?.amount, 4);
  });
});

describe('affiliate copy and untouched payout rails', () => {
  const messages = readFileSync(new URL('../i18n/messages.ts', import.meta.url), 'utf8');
  const enStart = messages.indexOf('const en: Dict');
  const vi = messages.slice(0, enStart);
  const en = messages.slice(enStart);
  const zh = readFileSync(new URL('../i18n/messages.zh.ts', import.meta.url), 'utf8');
  const tables = { vi, en, zh };
  const commercialMin = /2[.\s,]?000[.\s,]?000|2000000|2,000,000/;

  it('drops the commercial minimum from vi, en and zh affiliate rules', () => {
    for (const [lang, source] of Object.entries(tables)) {
      for (const key of ['aff.rule.pit', 'aff.wd.rule', 'aff.wd.available', 'aff.wd.below_precision', 'aff.wd.serverMin']) {
        const text = messageValue(source, key);
        assert.equal(commercialMin.test(text), false, `${lang} ${key}: ${text}`);
      }
    }
    assert.match(messageValue(vi, 'aff.wd.rule'), /Không có mức rút tối thiểu/);
    assert.match(messageValue(en, 'aff.rule.pit'), /no minimum payout/i);
    assert.match(messageValue(zh, 'aff.wd.rule'), /没有最低额/);
    assert.match(messageValue(en, 'aff.wd.below_precision'), /rounds to 0/);
    assert.match(messageValue(vi, 'aff.rule.hold'), /\{hours\}/);
    assert.match(messageValue(en, 'aff.rule.pitCert'), /withholding certificate/);
  });

  it('keeps seller and employer wallet wording and the IAP catalog', () => {
    assert.match(messageValue(en, 'payout.rulesBody'), /Seller proceeds are held for 48 hours/);
    assert.match(messageValue(vi, 'payout.minBalance'), /tối thiểu/);
    assert.match(messageValue(en, 'payout.persona.employer'), /Employer/);
    assert.equal(messageValue(en, 'payout.persona.seller'), 'Seller');
    assert.deepEqual([...WALLET_IAP_SKUS], [
      'aimarkets.wallet.5',
      'aimarkets.wallet.10',
      'aimarkets.wallet.20',
      'aimarkets.wallet.50',
      'aimarkets.wallet.100',
    ]);
  });
});
