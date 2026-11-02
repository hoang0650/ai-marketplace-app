import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isDeletionConfirm, normalizeDeletionConfirm } from './accountDeletion.ts';
import { iapFailureKind } from './iapErrors.ts';
import { WALLET_IAP_SKUS } from './iap-packs.ts';

describe('deletion confirm', () => {
  it('accepts the API words in any case', () => {
    for (const word of ['XÓA', 'xóa', 'XOA', 'xoa', 'XOÁ', 'DELETE', 'delete', '删除']) {
      assert.equal(isDeletionConfirm(word), true, word);
    }
  });

  it('normalizes iOS NFD Vietnamese input to NFC', () => {
    const nfd = `X${'O'}\u0301A`;
    assert.equal(normalizeDeletionConfirm(nfd), 'XÓA');
    assert.equal(isDeletionConfirm(nfd), true);
  });

  it('rejects a partial word', () => {
    assert.equal(isDeletionConfirm('XO'), false);
    assert.equal(isDeletionConfirm(''), false);
  });
});

describe('iap errors', () => {
  it('splits connection failures from a missing catalog', () => {
    assert.equal(iapFailureKind({ code: 'init-connection' }), 'connect');
    assert.equal(iapFailureKind({ code: 'sku-not-found' }), 'products');
    assert.equal(iapFailureKind({ code: 'user-cancelled' }), 'cancel');
  });

  it('requests the App Store consumable ids exactly', () => {
    assert.deepEqual([...WALLET_IAP_SKUS], [
      'aimarkets.wallet.5',
      'aimarkets.wallet.10',
      'aimarkets.wallet.20',
      'aimarkets.wallet.50',
      'aimarkets.wallet.100',
    ]);
  });
});
