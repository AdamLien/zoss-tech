import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('manual check-in preserves the default logo when the UAT response has no logo', async () => {
  const html = await readFile(new URL('../manual_clock_in.html', import.meta.url), 'utf8');

  assert.match(
    html,
    /if\s*\(response\.logo\)\s*\{\s*changeImage\("logo", response\.logo\);\s*\}/,
    'the default logo must not be replaced with an empty UAT response value',
  );
});
