const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
class El{constructor(){this.children=[];this.style={};this.textContent='';}appendChild(x){this.children.push(x);return x;}replaceChildren(...x){this.children=x;}setAttribute(){}}
const html=fs.readFileSync(__dirname+'/../redeem_process.html','utf8');
const QR='00000000-0000-4000-8000-000000000001';
function setup({value=QR,result='OK',notifyFails=false}={}){
 const nodes=Object.fromEntries(['prizes','loading','mask','spinner','refresh','group','shop','heading','usage'].map(k=>[k,new El()]));let requests=[],messages=0,scans=0;
 const c=vm.createContext({URL,AbortController,setTimeout,clearTimeout,console,document:{location:'https://example.test/?sid=TEST&liff=TEST&mode=scan',hidden:false,createElement:()=>new El(),getElementById:k=>nodes[k],addEventListener(){}},window:{confirm:()=>{throw Error('No confirmation allowed');}},
 liff:{init:async()=>{},getAccessToken:()=> 'token',scanCodeV2:async()=>{scans++;return {value};},sendMessages:async()=>{messages++;if(notifyFails)throw Error('notification failed');}},
 fetch:async(url,opts)=>{requests.push({url,body:JSON.parse(opts.body)});return {ok:true,json:async()=>({result,prize:'測試獎',no:191,redeemedAt:'2026/09/22 12:00:00',...(result==='OK'?{msg:{type:'text',text:'核銷證明'}}:{})})};}});
 for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim())vm.runInContext(m[1],c);
 return {c,nodes,requests,stats:()=>({messages,scans})};
}
test('scan mode loads without querying prizes, scan directly redeems without confirm',async()=>{
 const s=setup();assert.equal(typeof s.c.scanEnvelope,'function');await s.c.window.onload();assert.equal(s.requests.length,0);
 await s.c.scanEnvelope();assert.equal(s.requests.length,1);assert.match(s.requests[0].url,/prize_redeem_scan$/);assert.equal(s.requests[0].body.sn,QR);assert.equal(s.requests[0].body.type,undefined);assert.equal(s.stats().messages,1);assert.match(JSON.stringify(s.nodes.prizes),/核銷已完成/);
});
test('cancel scan never submits',async()=>{const s=setup({value:''});assert.equal(typeof s.c.scanEnvelope,'function');await s.c.scanEnvelope();assert.equal(s.requests.length,0);});
test('already redeemed shows original time and sends no message',async()=>{const s=setup({result:'Redeemed'});assert.equal(typeof s.c.scanEnvelope,'function');await s.c.scanEnvelope();assert.equal(s.stats().messages,0);assert.match(JSON.stringify(s.nodes.prizes),/已核銷/);assert.match(JSON.stringify(s.nodes.prizes),/2026\/09\/22 12:00:00/);});
test('notification error preserves success and does not retry mutation',async()=>{const s=setup({notifyFails:true});assert.equal(typeof s.c.scanEnvelope,'function');await s.c.scanEnvelope();assert.equal(s.requests.length,1);assert.match(JSON.stringify(s.nodes.prizes),/核銷已完成/);assert.match(JSON.stringify(s.nodes.prizes),/未送達/);});
test('double click produces only one scan and request',async()=>{const s=setup();assert.equal(typeof s.c.scanEnvelope,'function');await Promise.all([s.c.scanEnvelope(),s.c.scanEnvelope()]);assert.equal(s.requests.length,1);assert.equal(s.stats().scans,1);});
test('wrong owner and malformed scans never show success or send receipts',async()=>{const s=setup({result:'NoPrize'});assert.equal(typeof s.c.scanEnvelope,'function');await s.c.scanEnvelope();assert.equal(s.stats().messages,0);assert.doesNotMatch(JSON.stringify(s.nodes.prizes),/核銷已完成/);const b=setup({value:'https://bad.test'});await b.c.scanEnvelope();assert.equal(b.requests.length,0);});
