import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function search(q) {
  const html=fs.readFileSync(new URL('../table_location.html',import.meta.url),'utf8');
  const start=html.indexOf('        function performSearch(');
  const end=html.indexOf('        function render()',start);
  const elements=[['9','藝文 8'],['19','分店 9'],['29','另一店 9']].map(([id,name])=>({
    active:false,getAttribute:k=>k==='data-id'?id:name,
    classList:{add(c){if(c==='highlight-pulse')elements.find(e=>e.getAttribute('data-id')===id).active=true;},remove(){}},
  }));
  const c={document:{querySelectorAll:()=>elements},stopAutoCycle(){},scrollToTarget(){},startAutoCycle(){}};
  vm.createContext(c);vm.runInContext(html.slice(start,end),c);c.performSearch(q,false);
  return elements.filter(e=>e.active).map(e=>e.getAttribute('data-id'));
}
test('numeric table query matches table id only, never quantities in branch labels',()=>assert.deepEqual(search('9'),['9']));
test('branch query still works',()=>assert.deepEqual(search('藝文'),['9']));
test('unknown numeric table matches nothing',()=>assert.deepEqual(search('8'),[]));
