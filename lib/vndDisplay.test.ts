import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { ledgerCharge, ledgerPayableAmount, listedVndQuote, readServerVnd, serverVndInteger } from './vndDisplay.ts';

describe('server VND quotes', () => {
  it('accepts only an authoritative positive integer', () => {
    assert.deepEqual(readServerVnd({ amountVnd: 250000, authoritative: true, rateSource: 'exchangerate-api' }), {
      ok: true,
      amountVnd: 250000,
    });
    assert.equal(readServerVnd({ amountVnd: null, authoritative: false, code: 'RATE_UNAVAILABLE' }).code, 'RATE_UNAVAILABLE');
    assert.equal(readServerVnd({ amountVnd: 0, authoritative: true, code: 'AMOUNT_BELOW_VND_PRECISION' }).code, 'AMOUNT_BELOW_VND_PRECISION');
    assert.equal(serverVndInteger({ amountVnd: 1.5, authoritative: true }), null);
    assert.equal(readServerVnd(null).code, 'VND_UNAVAILABLE');
  });

  it('does not turn a missing quote into the raw USD amount', () => {
    const product = { pricing: { model: 'one-time', price: 10, currency: 'USD' }, pricingVnd: null };
    assert.equal(listedVndQuote(product), null);
    assert.equal(serverVndInteger(listedVndQuote(product)), null);
    assert.deepEqual(ledgerCharge({ amount: 10, currency: 'USD' }), { amount: 10, currency: 'USD' });
    assert.equal(ledgerPayableAmount(10, 2), 20);
  });

  it('keeps the Exchange Rate API on the server and the sector list unqualified', () => {
    const source = readFileSync(new URL('./vndDisplay.ts', import.meta.url), 'utf8');
    assert.equal(/26500|vndPerUsd\s*\*/.test(source), false);
    const api = readFileSync(new URL('../api/index.ts', import.meta.url), 'utf8');
    assert.match(api, /\/exchange-rates\/quote/);
    const categories = readFileSync(new URL('../constants/categories.ts', import.meta.url), 'utf8');
    const block = categories.slice(categories.indexOf('SECTOR_DRAFT_CATEGORY_IDS'), categories.indexOf('export function isSectorDraftCategory'));
    for (const id of ['ai-film-series', 'story-book', 'voice-clone', 'voice-preset', 'gpu-compute']) {
      assert.match(block, new RegExp(`'${id}'`));
    }
    assert.equal(block.includes('api-endpoint'), false);
  });
});
