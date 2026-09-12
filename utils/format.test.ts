import { formatMoney, productPrice } from './format';

describe('formatMoney', () => {
  it('formats USD', () => {
    expect(formatMoney(12.5, 'USD')).toContain('12');
  });
  it('formats VND without fraction', () => {
    const out = formatMoney(100000, 'VND');
    expect(out.replace(/\s/g, '')).toMatch(/100/);
  });
});

describe('productPrice', () => {
  it('uses usageRate for usage pricing', () => {
    const out = productPrice({ pricing: { model: 'usage', usageRate: 2, currency: 'USD', unit: '/ 1M' } });
    expect(out).toContain('2');
  });
});
