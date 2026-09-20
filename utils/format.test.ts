import { formatMoney, productPrice, productSale } from './format';

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

describe('productSale', () => {
  it('is on sale when compareAtPrice is higher than price', () => {
    const sale = productSale({ pricing: { model: 'one-time', price: 8, compareAtPrice: 12, currency: 'USD' } });
    expect(sale.onSale).toBe(true);
    expect(sale.was).toContain('12');
  });
  it('is not on sale without compareAtPrice', () => {
    expect(productSale({ pricing: { model: 'one-time', price: 8, currency: 'USD' } }).onSale).toBe(false);
  });
});
