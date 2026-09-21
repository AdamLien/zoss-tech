const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');
const html=fs.readFileSync(__dirname+'/../lottery_pre_order.html','utf8');
const code=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n');
const sid='AKfycbyj3WQTfglYGkx_s0TEq80AFW4qUiyD70kDIXk5qZjOhlPLnQmP7OpJ8iwX18C7xF9M';
async function run(response,fail=false){
 const nodes=Object.fromEntries(['loading','order','mask','ft_img'].map(k=>[k,{style:{},innerHTML:'',textContent:''}]));
 const calls=[];const alerts=[];
 const c=vm.createContext({URL,AbortController,setTimeout,clearTimeout,console,
 document:{location:{toString:()=>`https://example.com/?sid=${sid}&liff=test`},getElementById:k=>nodes[k],body:{style:{}}},
 window:{},Swal:{fire:x=>{alerts.push(x);return Promise.resolve({});}},
 liff:{init:async()=>{},getProfile:async()=>({userId:'test'}),getAccessToken:()=> 'test',closeWindow:()=>{},sendMessages:()=>{throw Error('must not send');}},
 fetch:async(url,opts)=>{calls.push(url);if(fail)throw Error('network');return {ok:true,text:async()=>JSON.stringify(response)};}});
 vm.runInContext(code,c);await c.window.onload();await new Promise(r=>setTimeout(r,10));
 return {nodes,calls,alerts};
}
test('expired entry never offers quantities or creates an order',async()=>{
 const r=await run({result:'Expired',deadline:'2026/09/25 12:00',max:10});
 assert.equal(r.nodes.order.innerHTML.includes('confirm_order'),false);
 assert.match(r.nodes.order.textContent,/購買已截止/);assert.match(r.nodes.order.textContent,/2026\/09\/25/);
 assert.equal(r.calls.length,1);assert.match(r.calls[0],/lottery_pre_order_status/);
});
test('open entry renders only the Sheet purchase limit',async()=>{
 const r=await run({result:'OK',deadline:'2026/09/25 12:00',max:3});
 assert.match(r.nodes.order.innerHTML,/confirm_order\(3\)/);assert.doesNotMatch(r.nodes.order.innerHTML,/confirm_order\(4\)/);
});
test('failed status fetch keeps purchase controls hidden',async()=>{
 const r=await run(null,true);assert.doesNotMatch(r.nodes.order.innerHTML,/confirm_order/);
 assert.match(r.nodes.order.textContent,/無法確認/);
});
test('unbound or invalid status cannot offer quantities',async()=>{
 for(const result of ['NotMember','ConfigError','Unknown']){
 const r=await run({result});assert.doesNotMatch(r.nodes.order.innerHTML,/confirm_order/);
 }
});
