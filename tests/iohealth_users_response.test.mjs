import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('list response handles NoPermission before requiring a success payload', async () => {
  const html = await readFile(new URL('../iohealth_users.html', import.meta.url), 'utf8');
  const listHandler = html.slice(html.indexOf('sendPost(`${url}?role=list`'));
  const noPermission = listHandler.indexOf('response.result==="NoPermission"');
  const missingPayload = listHandler.indexOf('typeof response.msg === "undefined"');

  assert.ok(noPermission >= 0, 'NoPermission must have a dedicated UI branch');
  assert.ok(
    missingPayload < 0 || noPermission < missingPayload,
    'NoPermission must be evaluated before a missing msg is treated as a system error',
  );
});
