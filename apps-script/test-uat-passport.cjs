const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function load(config = {}, rows = []) {
  const c = {config, sheet5: {getDataRange: () => ({getDisplayValues: () => rows})}};
  vm.createContext(c);
  vm.runInContext(fs.readFileSync(__dirname + '/uat-passport.gs', 'utf8'), c);
  return c;
}
function nodes(n) {return [n, ...(n.contents || []).flatMap(nodes), ...(n.body ? nodes(n.body) : []), ...(n.footer ? nodes(n.footer) : [])];}
test('portrait card places each field in a separate bounded white-field overlay', () => {
  const card = load({passport_img:'https://example.org/pass.jpg'}).gen_passport_msg('中1','測試店','測試員工');
  const all = nodes(card);
  const image = all.find(n => n.type === 'image');
  const [w,h] = image.aspectRatio.split(':').map(Number);
  assert.ok(h > w, 'portrait background must not be letterboxed into a square');
  const fields = all.filter(n => n.type === 'box' && n.position === 'absolute' && n.contents?.[0]?.type === 'text');
  assert.equal(fields.length, 3);
  assert.equal(new Set(fields.map(n => n.offsetTop)).size, 3);
  for (const field of fields) {
    assert.ok(parseFloat(field.height) < 8);
    assert.equal(field.contents[0].align,'center');
    assert.equal(field.contents[0].maxLines,1);
  }
});
test('missing image still returns readable pass without an invalid image component', () => {
  const card=load().gen_passport_msg('中1','測試店','測試員工');
  assert.equal(nodes(card).some(n => n.type === 'image'),false);
  assert.ok(nodes(card).some(n => n.text === '測試員工'));
});
test('roster lookup uses UID and header names, not hardcoded L column or matching names', () => {
  const rows=[['姓名','桌號','LINE_UID'],['同名員工','19','uid-other'],['同名員工','9','uid-test']];
  const card=load({},rows).gen_passport_msg('中1','測試店','同名員工','uid-test');
  assert.ok(nodes(card).some(n => n.text === '桌號：9'));
  const button=nodes(card).find(n => n.type === 'button');
  const url=new URL(button.action.uri);
  assert.equal(url.hostname,'adamlien.github.io');
  assert.equal(url.searchParams.get('q'),'9');
  assert.equal(url.searchParams.has('uid'),false);
});
test('unknown or ambiguous assignment is explicit and only links to branch reference', () => {
  const rows=[['LINE_UID','桌號'],['dup','9'],['dup','19']];
  const card=load({},rows).gen_passport_msg('中1','店 A&B','測試員工','dup');
  assert.ok(nodes(card).some(n => /桌位尚未確認/.test(n.text || '')));
  const button=nodes(card).find(n => n.type === 'button');
  assert.match(button.action.label,/參考/);
  assert.equal(new URL(button.action.uri).searchParams.get('q'),'店 A&B');
});
test('invalid image URL is omitted and a long name remains present with smaller text', () => {
  const name='這是一個非常長的測試姓名';
  const card=load({passport_img:'http://example.org/pass.jpg'}).gen_passport_msg('中1','測試店',name);
  assert.equal(nodes(card).some(n => n.type === 'image'),false);
  assert.ok(nodes(card).some(n => n.text === name));
});
