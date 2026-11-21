'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { prettifyModelName, formatTokens, getBarColor, renderBar, buildStatusLine, DEFAULTS } = require('../src/statusline');

test('prettifyModelName', () => {
  assert.strictEqual(prettifyModelName('claude-opus-4-6'), 'Opus 4.6');
  assert.strictEqual(prettifyModelName('claude-sonnet-4-5-20241022'), 'Sonnet 4.5');
  assert.strictEqual(prettifyModelName('claude-opus-4-20250514'), 'Opus 4');
  assert.strictEqual(prettifyModelName('Claude Opus 4.6'), 'Opus 4.6');
  assert.strictEqual(prettifyModelName(undefined), 'Claude');
});

test('formatTokens', () => {
  assert.strictEqual(formatTokens(999), '999');
  assert.strictEqual(formatTokens(40000), '40K');
  assert.strictEqual(formatTokens(1500000), '1.5M');
});

test('threshold edges', () => {
  const t = DEFAULTS.thresholds;
  assert.notStrictEqual(getBarColor(49, t), getBarColor(50, t));
  assert.notStrictEqual(getBarColor(69, t), getBarColor(70, t));
  assert.notStrictEqual(getBarColor(84, t), getBarColor(85, t));
});

test('renderBar clamps out-of-range input', () => {
  assert.ok(renderBar(150, 10, DEFAULTS.thresholds).includes('█'.repeat(10)));
  assert.ok(renderBar(-5, 10, DEFAULTS.thresholds).includes('░'.repeat(10)));
});

test('bad barWidth does not blank the bar; config error is shown', () => {
  const input = { model: { id: 'claude-opus-4-6' }, context_window: { used_percentage: 50 } };
  const line = buildStatusLine(input, { ...DEFAULTS, barWidth: -1, configError: true });
  assert.ok(line.includes('50%'));
  assert.ok(line.includes('config?'));
});
