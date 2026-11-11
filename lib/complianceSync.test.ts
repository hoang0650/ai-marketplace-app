import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  buyerTopupWithdrawDecision,
  fxReferenceUsd,
  parseVndInput,
  vietqrWithdrawRequest,
  type BuyerDepositWithdrawSnapshot,
} from './buyerDepositWithdraw.ts';
import { GPAY_ENABLED } from './features.ts';
import { buyerWithdrawMaySubmit, gpayMayActivate } from './gpayOffer.ts';
import { isSupplierTaxCode, supplierReviewDecision, supplierReviewView } from './supplierReview.ts';
import { walletHistoryKind } from './walletHistory.ts';

const open: BuyerDepositWithdrawSnapshot = {
  enabled: true,
  fundingSeparated: true,
  settlement: 'VND',
  refundsSeparate: true,
  electronicIdentityStatus: 'verified',
  payableVnd: 150000,
  payableUsd: 5.77,
  blockedSources: [],
  source: 'vietqr_company_bank',
};

function messageValue(source: string, key: string): string {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(`['"]${escaped}['"]:\\s*['"]((?:\\\\['"]|[^'"])*)['"]`));
  assert.ok(match, key);
  return match[1].replace(/\\'/g, "'");
}

describe('VietQR withdrawal gate', () => {
  it('stays closed when the server omits the new fields', () => {
    assert.equal(buyerTopupWithdrawDecision({ snapshot: null, amountVnd: 1000 }).blocker, 'SERVER_GATE_CLOSED');
    assert.equal(buyerTopupWithdrawDecision({ snapshot: {}, amountVnd: 1000 }).blocker, 'SERVER_GATE_CLOSED');
    assert.equal(buyerTopupWithdrawDecision({ snapshot: { ...open, enabled: false } }).blocker, 'SERVER_GATE_CLOSED');
    assert.equal(buyerTopupWithdrawDecision({ snapshot: { ...open, fundingSeparated: false } }).blocker, 'SERVER_GATE_CLOSED');
    assert.equal(buyerTopupWithdrawDecision({ snapshot: { ...open, settlement: 'USD' } }).blocker, 'SERVER_GATE_CLOSED');
    assert.equal(buyerTopupWithdrawDecision({ snapshot: { ...open, refundsSeparate: false } }).blocker, 'SERVER_GATE_CLOSED');
    assert.equal(buyerTopupWithdrawDecision({ snapshot: { ...open, refundsSeparate: undefined } }).blocker, 'SERVER_GATE_CLOSED');
    const stale = vietqrWithdrawRequest({ snapshot: undefined, amountVnd: 150000, savedAccount: true });
    assert.equal(stale.ok, false);
  });

  it('does not treat pending, rejected or a tax review as approved electronic identity', () => {
    for (const status of ['pending', 'rejected', 'draft', 'none', 'approved', null]) {
      const decision = buyerTopupWithdrawDecision({
        snapshot: { ...open, electronicIdentityStatus: status },
        amountVnd: 150000,
      });
      assert.equal(decision.ok, false);
      if (!decision.ok) assert.equal(decision.blocker, 'IDENTITY_REQUIRED');
    }
  });

  it('submits only a whole VND amount inside the server provenance cap', () => {
    assert.deepEqual(buyerTopupWithdrawDecision({ snapshot: open, amountVnd: 150000 }), { ok: true, amountVnd: 150000 });
    assert.equal(buyerTopupWithdrawDecision({ snapshot: open, amountVnd: 150001 }).blocker, 'DEPOSIT_CAP');
    assert.equal(buyerTopupWithdrawDecision({ snapshot: open, amountVnd: 150000.5 }).blocker, 'NOTHING_TO_WITHDRAW');
    assert.equal(buyerTopupWithdrawDecision({ snapshot: { ...open, payableVnd: 150000.5 }, amountVnd: 1 }).blocker, 'NOTHING_TO_WITHDRAW');
    assert.equal(parseVndInput('150.000').code, 'INVALID_AMOUNT');
    assert.equal(parseVndInput('').code, 'empty');
    const body = vietqrWithdrawRequest({ snapshot: open, amountVnd: 100000, savedAccount: true });
    assert.equal(body.ok, true);
    if (body.ok) {
      assert.deepEqual(body.body, { source: 'vietqr_company_bank', amountVnd: 100000, settlement: 'VND' });
      assert.equal('amount' in body.body, false);
      assert.equal('persona' in body.body, false);
      assert.equal(body.body.amountVnd === open.payableUsd, false);
    }
    assert.equal(fxReferenceUsd(open), 5.77);
    assert.equal(fxReferenceUsd({ ...open, payableUsd: null }), null);
  });

  it('does not cash out app store, removed GPay, unknown or a guessed pooled balance', () => {
    assert.equal(
      buyerTopupWithdrawDecision({ snapshot: { ...open, payableVnd: 0, blockedSources: ['appstore'] }, amountVnd: 1 }).blocker,
      'APPSTORE_UNRESOLVED',
    );
    assert.equal(
      buyerTopupWithdrawDecision({ snapshot: { ...open, payableVnd: 0, blockedSources: ['gpay'] }, amountVnd: 1 }).blocker,
      'GPAY_REMOVED',
    );
    assert.equal(
      buyerTopupWithdrawDecision({ snapshot: { ...open, payableVnd: null, blockedSources: ['unknown'] }, amountVnd: 1 }).blocker,
      'SOURCE_NOT_SEPARATED',
    );
    assert.equal(
      buyerTopupWithdrawDecision({ snapshot: { ...open, payableVnd: 0, blockedSources: ['other'] }, amountVnd: 1 }).blocker,
      'SOURCE_NOT_SEPARATED',
    );
    const separated = buyerTopupWithdrawDecision({
      snapshot: { ...open, payableVnd: 40000, blockedSources: ['appstore', 'gpay', 'unknown'] },
      amountVnd: 40000,
    });
    assert.deepEqual(separated, { ok: true, amountVnd: 40000 });
    const pooled = vietqrWithdrawRequest({
      snapshot: { ...open, payableVnd: null },
      amountVnd: 999999,
      savedAccount: true,
    });
    assert.equal(pooled.ok, false);
  });

  it('keeps the holder check on the server and omits a typed account when one is already saved', () => {
    const saved = vietqrWithdrawRequest({
      snapshot: open,
      amountVnd: 150000,
      savedAccount: true,
      bankAccount: { bankName: 'Other', accountNumber: '999999', accountName: 'SOMEONE ELSE' },
    });
    assert.equal(saved.ok, true);
    if (saved.ok) assert.equal(saved.body.bankAccount, undefined);

    const missing = vietqrWithdrawRequest({ snapshot: open, amountVnd: 150000, savedAccount: false });
    assert.equal(missing.ok, false);
    if (!missing.ok) assert.equal(missing.blocker, 'BANK_ACCOUNT_REQUIRED');

    const typed = vietqrWithdrawRequest({
      snapshot: open,
      amountVnd: 150000,
      bankAccount: { bankName: 'VCB', accountNumber: '0123 456 789', accountName: 'NGUYEN VAN A' },
      saveAccount: true,
    });
    assert.equal(typed.ok, true);
    if (typed.ok) {
      assert.equal(typed.body.bankAccount?.accountNumber, '0123456789');
      assert.equal(typed.body.saveAccount, true);
      assert.equal('amount' in typed.body, false);
    }
  });
});

describe('supplier review is not electronic identity', () => {
  it('shows pending and rejected reviews without completing eKYC', () => {
    const pending = supplierReviewView({
      verificationStatus: 'VERIFIED',
      manualTaxReviewFieldPresent: true,
      manualStatus: 'pending',
      electronicIdentityKnown: true,
      electronicIdentityStatus: 'pending',
      canPublish: false,
    });
    assert.equal(pending.manualStatus, 'pending');
    assert.equal(pending.electronicIdentityStatus, 'pending');
    assert.equal(pending.manualReviewCompletesEkyc, false);
    assert.equal(pending.electronicIdentityVerified, false);
    assert.equal(pending.serverCanPublish, false);

    const rejected = supplierReviewView({
      manualTaxReviewFieldPresent: true,
      manualStatus: 'rejected',
      statusReason: 'MST không khớp',
      electronicIdentityKnown: true,
      electronicIdentityStatus: 'rejected',
    });
    assert.equal(rejected.manualStatus, 'rejected');
    assert.equal(rejected.reason, 'MST không khớp');
    assert.equal(rejected.electronicIdentityVerified, false);
  });

  it('does not treat a missing field or the old profile flag as approved identity', () => {
    const missing = supplierReviewView({
      verificationStatus: 'VERIFIED',
      manualTaxReviewFieldPresent: false,
      manualStatus: 'approved',
      electronicIdentityKnown: false,
      electronicIdentityStatus: 'verified',
      canPublish: true,
    });
    assert.equal(missing.manualStatus, 'unknown');
    assert.equal(missing.manualStatusKnown, false);
    assert.equal(missing.electronicIdentityStatus, 'unknown');
    assert.equal(missing.electronicIdentityVerified, false);
    assert.equal(missing.serverCanPublish, true);

    const approvedReview = supplierReviewView({
      verificationStatus: 'VERIFIED',
      manualTaxReviewFieldPresent: true,
      manualStatus: 'approved',
      electronicIdentityKnown: true,
      electronicIdentityStatus: 'pending',
      canPublish: false,
      sellerAgreementAcceptedAt: '2026-11-08T00:00:00Z',
    });
    assert.equal(approvedReview.manualStatus, 'approved');
    assert.equal(approvedReview.electronicIdentityVerified, false);
    assert.equal(approvedReview.contractAccepted, true);
    assert.equal(approvedReview.serverCanPublish, false);
  });

  it('requires an admin, a reason and a lookup attestation', () => {
    assert.equal(supplierReviewDecision({ action: 'approve', reason: 'MST khớp tên trên trang tra cứu', actorRole: 'seller', lookupAttested: true }).ok, false);
    assert.equal(supplierReviewDecision({ action: 'reject', reason: 'no', actorRole: 'admin' }).ok, false);
    assert.equal(supplierReviewDecision({ action: 'approve', reason: 'Đã đối chiếu MST', actorRole: 'admin', lookupAttested: false }).ok, false);
    const ok = supplierReviewDecision({ action: 'approve', reason: 'Đã đối chiếu MST', actorRole: 'admin', lookupAttested: true });
    assert.equal(ok.ok, true);
    if (ok.ok) assert.equal(ok.lookupAttested, true);
    assert.equal(isSupplierTaxCode('0312345678', 'enterprise'), true);
    assert.equal(isSupplierTaxCode('012345678901', 'enterprise'), false);
    assert.equal(isSupplierTaxCode('012345678901', 'individual'), true);
  });
});

describe('GPay direct work and closed checkout', () => {
  it('does not activate from a status string or collect credentials', () => {
    assert.equal(GPAY_ENABLED, false);
    assert.equal(buyerWithdrawMaySubmit(), false);
    for (const input of [
      null,
      { status: 'pending_contract', enabled: true },
      { status: 'GPAY_REMOVED', removed: true },
      { code: 'GPAY_REMOVED', featureEnabled: true },
      { status: 'ready', contractExecuted: true, enabled: true },
      { code: 'GPAY_NOT_ACTIVATED', enabled: false, removed: false },
    ]) {
      assert.equal(gpayMayActivate(input), false);
    }
    const source = readFileSync(new URL('./features.ts', import.meta.url), 'utf8');
    assert.equal(source.includes('EXPO_PUBLIC_GPAY_ENABLED'), false);
    const bank = readFileSync(new URL('../components/wallet/BankTransferInfo.tsx', import.meta.url), 'utf8');
    assert.equal(bank.includes('method=gpay'), false);
    const screen = readFileSync(new URL('../components/wallet/BuyerVietqrWithdraw.tsx', import.meta.url), 'utf8');
    assert.match(screen, /buyerWithdrawMaySubmit/);
  });

  it('keeps a historical GPay row labeled as GPay', () => {
    assert.equal(walletHistoryKind({ paymentMethod: 'gpay', type: 'deposit', note: 'GPay top-up' }), 'gpay_historical');
    assert.equal(walletHistoryKind({ paymentMethod: 'gpay', type: 'deposit', note: 'google play' }), 'gpay_historical');
    assert.equal(walletHistoryKind({ paymentMethod: 'iap', type: 'deposit' }), 'iap');
    assert.equal(walletHistoryKind({ paymentMethod: 'google_pay', type: 'deposit' }), 'iap');
    assert.equal(walletHistoryKind({ paymentMethod: 'bank_transfer', type: 'deposit' }), 'deposit');
    const screen = readFileSync(new URL('../app/wallet/index.tsx', import.meta.url), 'utf8');
    assert.match(screen, /gpay_historical/);
    assert.equal(screen.includes('wallet.method.bankTransfer'), false);
  });
});

describe('published app copy', () => {
  const messages = readFileSync(new URL('../i18n/messages.ts', import.meta.url), 'utf8');
  const enStart = messages.indexOf('const en: Dict');
  const vi = messages.slice(0, enStart);
  const en = messages.slice(enStart);
  const zh = readFileSync(new URL('../i18n/messages.zh.ts', import.meta.url), 'utf8');

  it('distinguishes a refund from a VietQR cash-out and does not promise a finished VNeID integration', () => {
    for (const source of [vi, en, zh]) {
      assert.match(messageValue(source, 'bhub.refunds.note'), /không phải lệnh rút|not a cash withdrawal|不是提现/);
      assert.match(messageValue(source, 'wallet.topupWithdraw.blocker.SERVER_GATE_CLOSED'), /chưa|has not returned|尚未/);
      assert.match(messageValue(source, 'kyc.vneidNote'), /không phải xác nhận đã tích hợp VNeID|does not confirm that VNeID is integrated|并不表示已经接入 VNeID/);
      assert.equal(/được thực hiện qua VNeID|will be done via VNeID|将依法通过 VNeID/.test(messageValue(source, 'kyc.vneidNote')), false);
      assert.equal(/DPIA|ISO 27001|PCI DSS/.test(messageValue(source, 'wallet.legalHint')), false);
      assert.equal(/2[.\s,]?000[.\s,]?000|2000000/.test(messageValue(source, 'signup.role.buyerDesc')), false);
    }
    assert.match(messageValue(vi, 'wallet.gpay.direct'), /đang làm việc trực tiếp với GPay để hoàn tất hợp đồng cung ứng dịch vụ cho dự án/);
    assert.equal(/đối tác dự kiến|proposed partner|permanently removed/.test(messageValue(vi, 'wallet.gpay.direct') + messageValue(en, 'wallet.gpay.direct')), false);
    assert.match(messageValue(en, 'wallet.topupWithdraw.fx'), /not the withdrawal amount/);
    assert.match(messageValue(en, 'wallet.topupWithdraw.fx'), /not a legal exception/);
    assert.match(messageValue(en, 'sell.review.manualUnknown'), /has not returned/);
    assert.match(messageValue(en, 'payout.rulesBody'), /held for 48 hours/);
    assert.match(messageValue(en, 'payout.rulesBody'), /later of/);
    assert.equal(/original payment method/.test(messageValue(en, 'payout.rulesBody')), false);
    assert.match(messageValue(vi, 'payout.rulesBody'), /muộn hơn/);
    assert.match(messageValue(en, 'bhub.refunds.note'), /has not been verified/);
    assert.equal(/no PIT withheld|không khấu trừ TNCN|不代扣个税/.test(messageValue(en, 'aff.pit08.active') + messageValue(vi, 'aff.pit08.active') + messageValue(zh, 'aff.pit08.active')), false);
    assert.match(messageValue(en, 'aff.wd.exempt'), /does not certify that tax is zero/);
    const engine = readFileSync(new URL('./affiliateWithdraw.ts', import.meta.url), 'utf8');
    assert.equal(/pitRate\s*=\s*0\.1|withhold(?:ing)?\s*=\s*0/.test(engine), false);
  });
});
