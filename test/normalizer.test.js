import test from 'node:test';
import assert from 'node:assert';
import { normalizeUrl } from '../src/normalizer/index.js';

test('URL Normalizer', async (t) => {
  await t.test('Removes hash fragments', () => {
    assert.strictEqual(
      normalizeUrl('https://example.com/page#section1'),
      'https://example.com/page'
    );
  });

  await t.test('Removes UTM parameters', () => {
    assert.strictEqual(
      normalizeUrl('https://example.com/page?utm_source=google&utm_medium=cpc&other=value'),
      'https://example.com/page?other=value'
    );
  });

  await t.test('Sorts query parameters alphabetically', () => {
    assert.strictEqual(
      normalizeUrl('https://example.com/page?z=1&a=2&b=3'),
      'https://example.com/page?a=2&b=3&z=1'
    );
  });

  await t.test('Removes duplicate slashes in pathname', () => {
    assert.strictEqual(
      normalizeUrl('https://example.com/about//us///history'),
      'https://example.com/about/us/history'
    );
  });

  await t.test('Preserves valid URLs', () => {
    assert.strictEqual(
      normalizeUrl('https://example.com/about'),
      'https://example.com/about'
    );
  });
});
