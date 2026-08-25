import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('binding guard exits without referencing an undefined pause symbol', async () => {
  const html = await readFile(new URL('../iohealth_binding.html', import.meta.url), 'utf8');

  assert.doesNotMatch(
    html,
    /^\s*pause\s*$/m,
    'guard branches must return after showing their error instead of evaluating pause',
  );
});
