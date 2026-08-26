import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('binding manager does not evaluate an undefined pause symbol', async () => {
  const html = await readFile(new URL('../iohealth_users.html', import.meta.url), 'utf8');

  assert.doesNotMatch(
    html,
    /^\s*pause\s*$/m,
    'binding manager error branches must stop without evaluating pause',
  );
});

test('lottery page preserves its default background when UAT omits lottery_sys_img', async () => {
  const html = await readFile(new URL('../happy_lottery.html', import.meta.url), 'utf8');
  const configHandler = html.slice(html.indexOf('response.result==="OK"'));

  assert.match(
    configHandler,
    /if\s*\(response\.lottery_sys_img\)\s*\{\s*changeImage\("bg_img", response\.lottery_sys_img\);\s*\}/,
    'the lottery background must only be replaced when UAT provides a value',
  );
});
