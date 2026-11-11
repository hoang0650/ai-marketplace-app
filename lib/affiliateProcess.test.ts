import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  affiliateClawbackDecision,
  affiliateIdentityReady,
  affiliateLinkGate,
  affiliateServerWindow,
  commissionViewState,
  ownPitSummary,
  payoutRequestIsTransfer,
} from './affiliateProcess.ts';

function messageValue(source: string, key: string): string {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(`['"]${escaped}['"]:\\s*'((?:\\\\'|[^'])*)'`));
  assert.ok(match, key);
  return match[1].replace(/\\'/g, "'");
}

describe('affiliate process against the live contract', () => {
  it('issues no new affiliate code and still allows an existing code', () => {
    assert.deepEqual(affiliateLinkGate({ kycStatus: 'pending', code: null }), {
      canCreateLink: false,
      code: 'KYC_REQUIRED',
    });
    assert.deepEqual(affiliateLinkGate({ kycStatus: 'verified', code: null, linkReady: false }), {
      canCreateLink: false,
      code: 'ELECTRONIC_IDENTITY_NOT_IMPLEMENTED',
    });
    assert.deepEqual(affiliateLinkGate({ kycStatus: 'verified', code: 'AB12CD', linkReady: true }), {
      canCreateLink: true,
      code: 'ok',
    });
  });

  it('keeps affiliate identity separate from a supplier tax review', () => {
    const pending = affiliateIdentityReady({ kycStatus: 'pending', manualTaxReviewStatus: 'approved' });
    assert.equal(pending.electronicIdentityVerified, false);
    assert.equal(pending.manualReviewGrantsAffiliate, false);
    const ready = affiliateIdentityReady({ kycStatus: 'verified', manualTaxReviewStatus: 'none' });
    assert.equal(ready.electronicIdentityVerified, true);
  });

  it('does not invent a window, a cap, a commission state, or a completed transfer', () => {
    assert.deepEqual(affiliateServerWindow(null), { attributionDays: null, holdHours: null, maxRatePercent: null });
    assert.deepEqual(affiliateServerWindow({ attributionDays: 30, holdHours: 48, maxRate: 0.25 }), {
      attributionDays: 30,
      holdHours: 48,
      maxRatePercent: 25,
    });
    assert.equal(affiliateServerWindow({ maxRate: 2 }).maxRatePercent, null);
    assert.equal(commissionViewState('pending'), 'pending');
    assert.equal(commissionViewState('available'), 'available');
    assert.equal(commissionViewState('reversed'), 'reversed');
    assert.equal(commissionViewState('paid'), 'unknown');
    assert.equal(payoutRequestIsTransfer(), false);
  });

  it('does not treat a zero server summary as an exemption and does not list other people', () => {
    const empty = ownPitSummary(null);
    assert.equal(empty.known, false);
    assert.equal(empty.certifiesExemption, false);
    const zeros = ownPitSummary({ year: 2026, totalIncomeVnd: 0, totalPitWithheldVnd: 0, payments: 0 });
    assert.equal(zeros.known, true);
    assert.equal(zeros.certifiesExemption, false);
    const seller = affiliateClawbackDecision({ actorRole: 'seller', orderId: 'a'.repeat(24), reason: 'gian lận đơn ảo' });
    assert.equal(seller.ok, false);
    const missing = affiliateClawbackDecision({ actorRole: 'admin', orderId: 'order-1', reason: 'gian lận' });
    assert.equal(missing.ok, false);
    const ok = affiliateClawbackDecision({ actorRole: 'admin', orderId: 'a'.repeat(24), reason: 'đơn ảo đã xác minh' });
    assert.equal(ok.ok, true);
  });

  it('does not publish a fixed rate, a minimum, or a completed bank transfer', () => {
    const messages = readFileSync(new URL('../i18n/messages.ts', import.meta.url), 'utf8');
    const enStart = messages.indexOf('const en: Dict');
    const vi = messages.slice(0, enStart);
    const en = messages.slice(enStart);
    assert.match(messageValue(vi, 'aff.roles.body'), /không phải loại tài khoản riêng/);
    assert.match(messageValue(en, 'aff.roles.notTransfer'), /not a completed bank transfer/);
    assert.match(messageValue(en, 'aff.wd.sent'), /has not been sent/);
    assert.equal(/0–25%|0-25%/.test(messageValue(en, 'aff.lead') + messageValue(en, 'sellAff.lead')), false);
    assert.equal(/2[.\s,]?000[.\s,]?000/.test(messageValue(vi, 'aff.lead')), false);
    assert.match(messageValue(en, 'aff.rule.pitCert'), /withholding certificate/);
    const screen = readFileSync(new URL('../app/affiliate/index.tsx', import.meta.url), 'utf8');
    assert.equal(screen.includes('/affiliate/admin'), false);
  });
});
