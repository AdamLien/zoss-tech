const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../redeem_process_specific.html'),'utf8');
const source=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n');
// Synthetic receipt only; no real winner identifiers or timestamps.
const broken={type:'flex',altText:'【undefined】獎項核銷證明',contents:{type:'bubble',body:{type:'box',layout:'vertical',contents:[{type:'image',aspectRatio:'351:170'},{type:'text',text:'核銷證明'},{type:'text',text:'測試獎品'},{type:'text',text:'99999'},{type:'text',text:'2000/01/01 00:00:00'}]}}};
async function run(result='OK',failSend=false){
 const sent=[],alerts=[],posts=[];
 const ctx={URL,window:{},document:{location:{toString:()=> 'https://example.test/?sid=TEST&liff=TEST&type=prize&prize_no=99999'}},liff:{scanCodeV2:async()=>({value:'test-qr'}),sendMessages:async m=>{sent.push(m);if(failSend)throw Error('SECRET_PAYLOAD');},closeWindow(){}},Swal:{fire:async x=>alerts.push(x)}};
 vm.createContext(ctx);vm.runInContext(source,ctx);
 ctx.getToken=async()=>({accessToken:'test-only'});
 ctx.sendPost=async(url,p)=>{posts.push(p);return {result,msg:broken};};
 await ctx.window.onload();for(let i=0;i<8;i++)await new Promise(setImmediate);
 return {sent,alerts,posts};
}
test('successful redemption sends usable receipt without missing image or undefined title',async()=>{
 const {sent,posts}=await run();assert.equal(posts.length,1);assert.equal(sent.length,1);
 const json=JSON.stringify(sent[0]);assert.doesNotMatch(json,/undefined/);assert.doesNotMatch(json,/"type":"image"/);
 for(const value of ['99999','測試獎品','2000/01/01 00:00:00'])assert.ok(json.includes(value));
});
test('receipt failure preserves success and never retries redemption or exposes raw message',async()=>{
 const {alerts,posts,sent}=await run('OK',true);assert.equal(posts.length,1);assert.equal(sent.length,1);
 assert.ok(alerts.some(x=>/核銷已完成/.test(x.title)&&/證明.*傳送失敗/.test(x.text)));
 assert.doesNotMatch(JSON.stringify(alerts),/SECRET_PAYLOAD|"contents"|undefined/);
});
test('already redeemed never sends a new receipt',async()=>{const x=await run('Redeemed');assert.equal(x.sent.length,0);assert.ok(x.alerts.some(a=>/已完成核銷/.test(a.text)));});
test('nonwinner never receives success receipt',async()=>{const x=await run('NoPrize');assert.equal(x.sent.length,0);assert.ok(x.alerts.some(a=>/查無/.test(a.text)));});
