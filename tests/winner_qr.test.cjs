const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
const html=fs.readFileSync(__dirname+'/../redeem_process.html','utf8');
class Element{constructor(){this.children=[];this.style={};this.textContent='';this.innerHTML='';}appendChild(x){this.children.push(x);return x;}replaceChildren(...x){this.children=x;}setAttribute(){} }
function setup(location='https://example.test/?sid=TEST&liff=TEST'){const nodes={prizes:new Element(),loading:new Element(),mask:new Element(),spinner:new Element(),refresh:new Element(),group:new Element(),shop:new Element(),heading:new Element(),usage:new Element()};let codes=[];
 const ctx={URL,AbortController,setTimeout:(fn,ms)=>ms===30000?0:setTimeout(fn,ms),clearTimeout,setInterval:()=>0,clearInterval,console,document:{location:'https://example.test/?sid=TEST&liff=TEST',hidden:false,body:new Element(),createElement:()=>new Element(),getElementById:id=>nodes[id]||null,addEventListener(){}},window:{},Swal:{fire:()=>Promise.resolve()},liff:{init:async()=>{},getProfile:async()=>({userId:'owner'}),getAccessToken:()=> 'token'},fetch:async()=>({ok:true,json:async()=>({result:'OK',group:'g',shop:'s',qrMode:true,awards:[]})}),QRCode:function(el,opt){codes.push(opt.text);el.appendChild(new Element());}};
 ctx.document.location=location;ctx.QRCode.CorrectLevel={M:0};vm.createContext(ctx);for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim())vm.runInContext(m[1],ctx);return {ctx,nodes,codes};}
test('owner QR renders without invoking a scanner',()=>{const {ctx,codes}=setup();ctx.add_prize({name:'Test',no:191,redeem:'',qrMode:true,qr:'00000000-0000-4000-8000-000000000001'},'prize');assert.equal(codes.length,1);});
test('redeemed award never creates a QR even if stale qr field was supplied',()=>{const {ctx,codes,nodes}=setup();ctx.add_prize({name:'Test',no:191,redeem:'V',qrMode:true,qr:'stale'},'prize');assert.equal(codes.length,0);assert.match(JSON.stringify(nodes.prizes),/已核銷/);});
test('login errors reject instead of leaving spinner pending',async()=>{const {ctx}=setup();ctx.liff.init=async()=>{throw new Error('login failed');};const outcome=await Promise.race([ctx.getToken('x').then(()=> 'resolved',()=> 'rejected'),new Promise(r=>setTimeout(()=>r('pending'),30))]);assert.equal(outcome,'rejected');});
test('non-JSON API failure rejects instead of leaving request pending',async()=>{const {ctx}=setup();ctx.fetch=async()=>({ok:true,text:async()=>'<html>',json:async()=>{throw new Error('invalid json');}});const outcome=await Promise.race([ctx.sendPost('https://example.test',{}).then(()=> 'resolved',()=> 'rejected'),new Promise(r=>setTimeout(()=>r('pending'),30))]);assert.equal(outcome,'rejected');});
test('refresh clears previous code before requesting state and keeps it hidden on failure',async()=>{const {ctx,nodes}=setup();nodes.prizes.appendChild(new Element());ctx.getToken=async()=>{throw new Error('offline');};await ctx.refreshPrizes();assert.equal(nodes.prizes.children.length,0);assert.match(nodes.mask.textContent,/無法/);});
for(const location of [
 'https://example.test/?sid=TEST&liff=TEST&mode=scan',
 'https://example.test/?sid=TEST&liff=TEST&liff.state=%3Fmode%3Dscan',
 'https://example.test/?code=TEST&liffRedirectUri='+encodeURIComponent('https://example.test/?sid=TEST&liff=TEST&mode=scan')
])test('scan entry offers scanner instead of owner QR: '+location,async()=>{
 const {ctx,nodes,codes}=setup(location);let scans=0;ctx.liff.scanCodeV2=async()=>{scans++;return {value:''};};ctx.window.confirm=()=>true;
 ctx.add_prize({name:'Test',no:191,redeem:'',qrMode:true,qr:'00000000-0000-4000-8000-000000000001'},'prize');
 assert.equal(codes.length,0);assert.equal(scans,0);
 const button=nodes.prizes.children[0].children.find(x=>x.textContent==='掃碼核銷');assert.ok(button);await button.onclick();assert.equal(scans,1);
 assert.match(nodes.heading.textContent,/掃碼領獎/);
});
test('scan entry cannot scan a redeemed award',()=>{const {ctx,nodes,codes}=setup('https://example.test/?sid=TEST&liff=TEST&mode=scan');ctx.add_prize({name:'Test',no:191,redeem:'V',qrMode:true},'prize');assert.equal(codes.length,0);assert.match(JSON.stringify(nodes.prizes),/已核銷/);assert.ok(!nodes.prizes.children[0].children.some(x=>x.onclick));});
