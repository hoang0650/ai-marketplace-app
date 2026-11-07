import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { WALLET_IAP_SKUS } from './iap-packs.ts';
import {
  BUYER_ACTIONS,
  affiliateNeedsEkyc,
  buyerActionNeedsEkyc,
  canRequestOwnRefund,
  payoutPersonaNeedsEkyc,
  resolvePayoutWithdraw,
  showEkycMenu,
  storedIdentityAction,
} from './buyerIdentity.ts';

function messageValue(source: string, key: string): string {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(`'${escaped}':\\s*'((?:\\\\'|[^'])*)'`));
  assert.ok(match, key);
  return match[1].replace(/\\'/g, "'");
}

describe('buyer versus seller and affiliate identity', () => {
  it('does not require eKYC for buyer checkout, top-up, use, complaint or refund', () => {
    for (const action of BUYER_ACTIONS) {
      assert.equal(buyerActionNeedsEkyc(action), false);
    }
    assert.equal(showEkycMenu('buyer'), false);
    assert.equal(showEkycMenu(''), false);
    assert.equal(payoutPersonaNeedsEkyc('buyer', 'buyer'), false);
  });

  it('keeps eKYC for seller payouts and affiliate, including a buyer who is also a seller', () => {
    assert.equal(showEkycMenu('seller'), true);
    assert.equal(showEkycMenu('creator'), true);
    assert.equal(showEkycMenu('talent'), true);
    assert.equal(showEkycMenu('freelancer'), true);
    assert.equal(showEkycMenu('employer'), true);
    assert.equal(payoutPersonaNeedsEkyc('seller', 'seller'), true);
    assert.equal(payoutPersonaNeedsEkyc('employer', 'employer'), true);
    assert.equal(affiliateNeedsEkyc(), true);
    assert.equal(payoutPersonaNeedsEkyc('affiliate', 'buyer'), true);
    assert.equal(showEkycMenu('buyer'), false);
    assert.equal(payoutPersonaNeedsEkyc('seller', 'admin'), false);
  });

  it('refuses to cash buyer credit by switching persona', () => {
    const buyerOnly = resolvePayoutWithdraw({
      requestedPersona: 'seller',
      serverPersona: 'buyer',
      serverPersonas: ['buyer'],
      canWithdraw: false,
      unavailableCode: 'BUYER_CREDIT_NON_WITHDRAWABLE',
    });
    assert.deepEqual(buyerOnly, { ok: false, code: 'buyer_credit' });

    const switched = resolvePayoutWithdraw({
      requestedPersona: 'seller',
      serverPersona: 'buyer',
      serverPersonas: ['seller', 'buyer'],
      canWithdraw: true,
    });
    assert.equal(switched.ok, false);
    if (!switched.ok) assert.equal(switched.code, 'buyer_credit');

    const explicitBuyer = resolvePayoutWithdraw({
      requestedPersona: 'buyer',
      serverPersona: 'seller',
      serverPersonas: ['seller', 'buyer'],
      canWithdraw: true,
    });
    assert.deepEqual(explicitBuyer, { ok: false, code: 'buyer_credit' });
  });

  it('allows a seller payout the server marked withdrawable and keeps employer minimums on that persona', () => {
    const seller = resolvePayoutWithdraw({
      serverPersona: 'seller',
      serverPersonas: ['seller', 'buyer'],
      canWithdraw: true,
    });
    assert.deepEqual(seller, { ok: true, persona: 'seller' });

    const employer = resolvePayoutWithdraw({
      requestedPersona: 'employer',
      serverPersona: 'employer',
      serverPersonas: ['employer', 'buyer'],
      canWithdraw: true,
    });
    assert.deepEqual(employer, { ok: true, persona: 'employer' });

    const held = resolvePayoutWithdraw({
      serverPersona: 'seller',
      serverPersonas: ['seller', 'buyer'],
      canWithdraw: false,
    });
    assert.deepEqual(held, { ok: false, code: 'server_blocked' });
  });

  it('does not submit affiliate commission from the general wallet form', () => {
    const affiliate = resolvePayoutWithdraw({
      requestedPersona: 'affiliate',
      serverPersona: 'seller',
      serverPersonas: ['seller', 'affiliate', 'buyer'],
      canWithdraw: true,
    });
    assert.deepEqual(affiliate, { ok: false, code: 'affiliate_separate' });
  });

  it('keeps refund ownership without an identity prerequisite', () => {
    assert.equal(canRequestOwnRefund({ authenticated: true, userId: 'u1', orderBuyerId: 'u1' }), true);
    assert.equal(canRequestOwnRefund({ authenticated: true, userId: 'u1', orderBuyerId: 'u2' }), false);
    assert.equal(canRequestOwnRefund({ authenticated: false, userId: 'u1', orderBuyerId: 'u1' }), false);
    assert.equal(canRequestOwnRefund({ authenticated: true, userId: 'u1' }), true);
    assert.equal(buyerActionNeedsEkyc('refund'), false);
    assert.equal(storedIdentityAction(), 'keep');
  });
});

describe('buyer identity copy and IAP', () => {
  const messages = readFileSync(new URL('../i18n/messages.ts', import.meta.url), 'utf8');
  const enStart = messages.indexOf('const en: Dict');
  const vi = messages.slice(0, enStart);
  const en = messages.slice(enStart);
  const zh = readFileSync(new URL('../i18n/messages.zh.ts', import.meta.url), 'utf8');

  it('says buyers can shop and request refunds without eKYC, and keeps seller payout copy', () => {
    assert.match(messageValue(vi, 'kyc.lede'), /không cần eKYC/);
    assert.match(messageValue(en, 'kyc.lede'), /do not require it/i);
    assert.match(messageValue(zh, 'kyc.lede'), /不需要 eKYC/);
    assert.match(messageValue(en, 'kyc.lede'), /stay on file/);
    assert.match(messageValue(en, 'payout.buyerBlocked'), /cannot be withdrawn/);
    assert.match(messageValue(en, 'payout.rulesBody'), /Seller proceeds are held for 48 hours/);
    assert.match(messageValue(vi, 'payout.minBalance'), /tối thiểu/);
    assert.deepEqual([...WALLET_IAP_SKUS], [
      'aimarkets.wallet.5',
      'aimarkets.wallet.10',
      'aimarkets.wallet.20',
      'aimarkets.wallet.50',
      'aimarkets.wallet.100',
    ]);
  });
});
