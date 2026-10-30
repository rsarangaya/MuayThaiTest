// Headless tests: run with  node tests/run.js  (no dependencies).
// Loads the game scripts into a vm context with a stubbed canvas/DOM, then checks level generation and game data.
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..','js');
const proxy=()=>new Proxy(function(){},{get:(t,k)=>k==='canvas'?proxy():proxy(),set:()=>true,apply:()=>proxy()});
const ctx=vm.createContext({console,Math,Set,Map,Array,Object,JSON,Float32Array,addEventListener(){},
 document:{createElement:()=>({width:0,height:0,getContext:()=>proxy()}),getElementById:()=>proxy(),addEventListener(){}},
 performance:{now:()=>0},window:{},localStorage:{getItem:()=>null,setItem(){}}});
for(const f of ['util','sprites','data','textures','level','game','abilities','runs'])vm.runInContext(fs.readFileSync(path.join(root,f+'.js'),'utf8'),ctx,{filename:f+'.js'});
const run=code=>vm.runInContext(code,ctx);
let fails=0,checks=0;
const ok=(cond,msg)=>{checks++;if(!cond){fails++;if(fails<=25)console.log('FAIL:',msg)}};

// ---- 1. level generation invariants over many seeds
const MAXD=run('MAX_DEPTH'),STAGE_LEN=run('STAGE_LEN');
const SEEDS=+process.argv[2]||2000;
const gen=run(`(function(seed){
 seedRng(seed);const {m,rooms}=gen();const out={rooms:rooms.length,bad:[],stubs:0,disc:false,doors:0,h:0};
 const fl=(x,y)=>x>=0&&y>=0&&x<W&&y<H&&m[y][x]!==0;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){out.h=(out.h*31+m[y][x]+1)>>>0}
 for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){
  if(m[y][x]===2){out.doors++;const ew=!fl(x,y-1)&&!fl(x,y+1),ns=!fl(x-1,y)&&!fl(x+1,y);
   if(ew===ns)out.bad.push('door '+x+','+y+' has no clean wall flanks');
   else{const a=ew?[x-1,y]:[x,y-1],b=ew?[x+1,y]:[x,y+1];if(!fl(...a)||!fl(...b))out.bad.push('door '+x+','+y+' leads nowhere')}}
  if(m[y][x]===0&&[[0,1],[0,-1],[1,0],[-1,0]].filter(([a,b])=>fl(x+a,y+b)).length>=3)out.stubs++}
 const seen=new Set(),q=[[rooms[0].cx,rooms[0].cy]];seen.add(rooms[0].cy*W+rooms[0].cx);
 for(let i=0;i<q.length;i++){const [x,y]=q[i];for(const [a,b] of [[0,1],[0,-1],[1,0],[-1,0]]){const nx=x+a,ny=y+b;if(fl(nx,ny)&&!seen.has(ny*W+nx)){seen.add(ny*W+nx);q.push([nx,ny])}}}
 out.disc=!rooms.every(r=>seen.has(r.cy*W+r.cx));return out})`);
let totalDoors=0;
for(let s=1;s<=SEEDS;s++){const r=gen(s);totalDoors+=r.doors;
 ok(r.rooms>=2,`seed ${s}: only ${r.rooms} rooms`);ok(!r.disc,`seed ${s}: rooms not all connected`);
 ok(r.stubs===0,`seed ${s}: ${r.stubs} orphaned wall stubs`);for(const b of r.bad)ok(false,`seed ${s}: ${b}`)}
console.log(`generation: ${SEEDS} seeds, ${totalDoors} doors checked`);

// ---- 2. determinism: same seed -> identical level; different seed -> different
ok(gen(1234).h===gen(1234).h,'same seed produced different maps');
ok(gen(1).h!==gen(2).h,'different seeds produced identical maps');

// ---- 3. full level generation for every depth (items, monsters, stairs, mini-boss)
const lvl=run(`(function(seed,d){
 seedRng(seed);G={depth:d,rites:false,levels:{},mons:[],items:[]};genLevel(d);
 const fl=(x,y)=>G.map[y]&&G.map[y][x]!==undefined&&G.map[y][x]!==0,err=[];
 for(const i of G.items)if(!fl(i.x,i.y))err.push('item on wall '+i.x+','+i.y);
 const seenPos=new Set();for(const m of G.mons){if(!fl(m.x,m.y))err.push('monster on wall');const k=m.x+','+m.y;if(seenPos.has(k))err.push('stacked monsters at '+k);seenPos.add(k)}
 if(!fl(G.sU.x,G.sU.y))err.push('up stairs on wall');if(d<10&&!fl(G.sD.x,G.sD.y))err.push('down stairs on wall');
 const r0=G.rooms[0],inWaste=G.items.filter(i=>i.x>=r0.x&&i.x<r0.x+r0.w&&i.y>=r0.y&&i.y<r0.y+r0.h);
 if((d-1)%STAGE_LEN===0&&inWaste.some(i=>i.it.type==='part'&&(i.it.taint||!i.it.known)))err.push('waste room graft is tainted/unknown');
 return {err,mons:G.mons.length,ks:G.mons.map(m=>m.k),items:G.items.length,waste:inWaste.length,sDx:G.sD.x}})`);
for(let d=1;d<=MAXD;d++)for(let s=1;s<=40;s++){const r=lvl(s*7919,d);
 for(const e of r.err)ok(false,`depth ${d} seed ${s*7919}: ${e}`);
 ok(r.mons>0,`depth ${d}: no monsters`);ok(r.items>=3,`depth ${d}: too few items`);
 const mini={5:'warden',10:'matron',15:'abomination'}[d];if(mini)ok(r.ks.includes(mini),`depth ${d} seed ${s*7919}: ${mini} missing`);
 if((d-1)%STAGE_LEN===0)ok(r.waste>=2,`depth ${d} seed ${s*7919}: waste room has ${r.waste} items`);
 if(d>=16)ok(r.ks.filter(k=>['guard','rifleman','scientist','medic'].includes(k)).length>0,`depth ${d} seed ${s*7919}: no humans in the human stage`);
 if(d>=16)ok(r.ks.every(k=>['guard','rifleman','scientist','medic','boss','stalker'].includes(k)),`depth ${d} seed ${s*7919}: non-human monster in the human stage`);
 if(d<16)ok(!r.ks.some(k=>['guard','rifleman','scientist','medic'].includes(k)),`depth ${d}: humans appeared early`);
 ok((d<MAXD)===(r.sDx>=0),`depth ${d}: wrong down-stairs presence`);
 ok(d!==MAXD||r.ks.includes('boss'),`depth ${d} seed ${s*7919}: boss missing`)}
console.log(`levels: depths 1-${MAXD} x 40 seeds checked`);

// ---- 4. data consistency: every template/item/monster has art and valid palette characters
const issues=run(`(function(){const e=[];
 for(const t of TPL){if(!REGION[t.kind]||!REGION[t.kind][t.spr])e.push('missing sprite for '+t.id);
  if(!t.st)e.push('no stats '+t.id)}
 for(const s of Object.values(STARTER))if(!REGION[s.kind].def)e.push('missing starter sprite');
 {const a=mkStarter('legs');if(a.decay<=.55)e.push('starter limbs must rot faster than any graft')}
 for(const id in ABIL){if(!TPL.some(t=>t.id===id))e.push('ability for unknown part '+id);const a=ABIL[id];if(!a.n||!(a.cd>0)||typeof a.run!=='function')e.push('malformed ability '+id)}
 for(const kind of ['head','torso','arm','legs'])if(!TPL.some(t=>t.t===5&&t.kind===kind))e.push('the bargain needs a tier-5 '+kind+' graft')
 for(const k in CONS)if(!CONSPR[k])e.push('missing item icon '+k);
 for(const k in MON){if(!S[k])e.push('missing monster sprite '+k);const ps=TPL.filter(t=>t.src===k);if(ps.length<3&&!MON[k].noParts)e.push('monster '+k+' has only '+ps.length+' own parts');if(!ps.some(t=>t.kind==='legs')&&!['boss'].includes(k)&&!MON[k].noParts)e.push('monster '+k+' drops no legs')}
 for(const k in PART_CHANCE)if(!MON[k])e.push('PART_CHANCE for unknown monster '+k);
 for(const k in MON)if(!MON[k].mini&&k!=='boss'&&!MON[k].noParts&&!(PART_CHANCE[k]>0))e.push('no part chance for '+k);
 const rows=[...Object.values(CONSPR)];for(const r of Object.values(REGION))for(const v of Object.values(r))rows.push(v);
 for(const r of rows)for(const line of r)for(const ch of line)if(ch!=='.'&&!'abcdefghijklmnopqrstuvwxyz'.includes(ch))e.push('odd sprite char '+ch);
 for(const t of TPL){const p=mkPart(10,null,t.id);if(p.id!==t.id)e.push('mkPart forceId failed '+t.id)}
 for(let d=1;d<=20;d++)for(let i=0;i<40;i++){const p=mkPart(d);if(p.dur>p.maxdur||p.dur<=0)e.push('bad durability');if(d<3&&p.taint)e.push('early taint')}
 return e})()`);
for(const i of issues)ok(false,i);
console.log('data: templates, icons, monsters, durability checked');

// ---- 5. click-to-travel must never route through a staircase (taps beside the stairs used to take them)
const stairsRoute=run(`(function(){
 const mk=()=>Array.from({length:H},()=>new Array(W).fill(1));
 G={map:mk(),seen:Array.from({length:H},()=>new Array(W).fill(true)),p:{x:10,y:10},sU:{x:11,y:9},sD:{x:-1,y:-1},mons:[]};
 const around=pathTo(12,10);                 // two tiles right; the shortest BFS route used to cut through the stairs at (11,9)
 const onto=pathTo(11,9);                    // the stairs themselves are still a valid destination
 G.sU={x:11,y:11};const south=pathTo(12,10); // and the same when the stairs sit on the other diagonal
 return {around:around&&around.map(c=>c.join(',')),onto:onto&&onto.map(c=>c.join(',')),south:south&&south.map(c=>c.join(','))}})()`);
ok(stairsRoute.around&&!stairsRoute.around.includes('11,9'),'travel path cut through the up stairs: '+JSON.stringify(stairsRoute.around));
ok(stairsRoute.onto&&stairsRoute.onto[stairsRoute.onto.length-1]==='11,9','cannot travel onto the stairs when asked');
ok(stairsRoute.south&&!stairsRoute.south.includes('11,11'),'travel path cut through stairs on the south diagonal');
console.log('travel: stairs are only entered on purpose');
// ---- 6. graft variety: slots stay level, and the hidden tiers are sane
const variety=run(`(function(){
 seedRng(31337);G={};const kinds={head:0,torso:0,arm:0,legs:0};let prev='',streak=0,maxStreak=0;const N=6000;
 for(let i=0;i<N;i++){const d=1+Math.floor(R()*20),k=mkPart(d).kind;kinds[k]++;streak=k===prev?streak+1:1;prev=k;if(streak>maxStreak)maxStreak=streak}
 const byDepth={};for(const d of [1,4,8,12,16,20]){G={};const c={head:0,torso:0,arm:0,legs:0};for(let i=0;i<1200;i++)c[mkPart(d).kind]++;byDepth[d]=c}
 const hid={1:0,2:0,3:0,4:0,5:0};for(const t of TPL)hid[t.hid]++;
 const kindsWithSpread=['head','torso','arm','legs'].map(k=>new Set(TPL.filter(t=>t.kind===k).map(t=>t.hid)).size);
 return {kinds,maxStreak,byDepth,hid,kindsWithSpread,N}})()`);
for(const k of ['head','torso','arm','legs'])ok(Math.abs(variety.kinds[k]/variety.N-.25)<.02,`graft slot ${k} is ${(variety.kinds[k]/variety.N*100).toFixed(1)}% of drops (want ~25%)`);
ok(variety.maxStreak<=2,`same graft slot ${variety.maxStreak} times in a row`);
for(const d in variety.byDepth)for(const k in variety.byDepth[d])ok(Math.abs(variety.byDepth[d][k]/1200-.25)<.04,`depth ${d}: ${k} is ${(variety.byDepth[d][k]/12).toFixed(1)}% of drops`);
for(const h in variety.hid)ok(variety.hid[h]>0,`hidden tier ${h} has no grafts`);
variety.kindsWithSpread.forEach((n,i)=>ok(n>=3,`slot ${['head','torso','arm','legs'][i]} only spans ${n} hidden tiers`));
console.log('variety: slots even across '+variety.N+' drops, hidden tiers '+JSON.stringify(variety.hid));
// ---- 7. themed rooms and monster attack mix
const themed=run(`(function(){
 const out={levels:0,dump:0,swamp:0,nest:0,bad:[]};
 for(let seed=1;seed<=400;seed++){const d=2+(seed%19);seedRng(seed*131);G={depth:d,regIdx:Math.floor((d-1)/5),rites:false,levels:{},mons:[],items:[],mods:{0:'standard'}};genLevel(d);out.levels++;
  const rs=G.rooms;
  // every themed room: right kind of content, never the first/last room, open ring around the dump
  for(const [i,r] of rs.entries()){if(!r.theme)continue;out[r.theme]++;
   if(i===0||i===rs.length-1)out.bad.push('themed first/last room');
   const inRoom=(x,y)=>x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h;
   if(r.theme==='dump'){const ms=G.mounds.filter(m=>inRoom(m.x,m.y)),g=ms.filter(m=>m.k==='graft').length,f=ms.filter(m=>m.k==='foe').length;
    if(g!==1)out.bad.push('dump '+seed+' has '+g+' grafts');if(f<2||f>3)out.bad.push('dump '+seed+' has '+f+' ambushes');if(ms.length<4)out.bad.push('dump '+seed+' too few piles');
    for(const m of ms){if(G.map[m.y][m.x]!==8)out.bad.push('mound not on a mound tile');if(m.x===r.x||m.x===r.x+r.w-1||m.y===r.y||m.y===r.y+r.h-1)out.bad.push('mound on the room edge');if(m.k==='foe'&&!MON[m.foe])out.bad.push('bad ambusher '+m.foe)}}
   if(r.theme==='swamp'){if(!G.mons.some(m=>m.swamp&&inRoom(m.x,m.y)))out.bad.push('swamp '+seed+' has no natives');if(d>=16)out.bad.push('swamp in the human stage')}
   if(r.theme==='nest'){if(G.mons.filter(m=>(m.k==='maggot'||m.k==='broodmother')&&inRoom(m.x,m.y)).length<4)out.bad.push('nest '+seed+' too empty');if(d<3||d>=16)out.bad.push('nest on wrong floor')}}
  // ordinary monsters and loot stay out of themed rooms; swamp natives only appear in swamp rooms
  for(const m of G.mons){const r=rs.find(r=>m.x>=r.x&&m.x<r.x+r.w&&m.y>=r.y&&m.y<r.y+r.h);
   if(m.swamp&&!(r&&r.theme==='swamp'))out.bad.push('swamp native outside a swamp');
   if(!m.swamp&&r&&r.theme&&r.theme!=='nest'&&!['maggot','broodmother'].includes(m.k))out.bad.push('ordinary monster in a themed room: '+m.k)}
  // the stairs must still be reachable (mounds block, everything else walks)
  const seen=new Set([G.sU.y*W+G.sU.x]),q=[[G.sU.x,G.sU.y]];for(let i=0;i<q.length;i++){const [x,y]=q[i];for(const [a,b] of [[0,1],[0,-1],[1,0],[-1,0],[1,1],[-1,-1],[1,-1],[-1,1]]){const nx=x+a,ny=y+b;if(walk(nx,ny)&&!seen.has(ny*W+nx)){seen.add(ny*W+nx);q.push([nx,ny])}}}
  if(G.sD.x>=0&&!seen.has(G.sD.y*W+G.sD.x))out.bad.push('stairs down unreachable with seed '+seed)}
 return out})()`);
for(const b of themed.bad.slice(0,10))ok(false,'themed rooms: '+b);
ok(themed.dump>20&&themed.swamp>20&&themed.nest>10,`themed rooms too rare: ${JSON.stringify({dump:themed.dump,swamp:themed.swamp,nest:themed.nest})}`);
console.log('themed rooms: '+JSON.stringify({dump:themed.dump,swamp:themed.swamp,nest:themed.nest})+' across '+themed.levels+' floors');
// attacks: with the default mix most strikes are quick ones; heavy blows stay a minority and heavier hitters use them more
const mix=run(`(function(){seedRng(77);const res={};for(const k of ['maggot','golem','cultist','boss']){let heavy=0;const N=4000;for(let i=0;i<N;i++){const h=MON[k].heavy!==undefined?MON[k].heavy:.35;if(R()<h)heavy++}res[k]=heavy/N}return res})()`);
ok(mix.maggot<.3&&mix.golem>.4&&mix.golem<.6&&mix.cultist>.28&&mix.cultist<.42,'heavy-blow mix is off: '+JSON.stringify(mix));
console.log('attack mix (share of heavy blows): '+JSON.stringify(mix));
// ---- 8. altar: odds stay harsh, fodder is weak, results are real grafts, rooms are placed safely
const altar=run(`(function(){
 const near=(a,b)=>Math.abs(a-b)<.0001,out={bad:[]};
 const sum=o=>o.nothing+o.lower+o.same+o.up1+o.up2;
 for(const set of [[1],[3],[5],[2,2],[4,1,1,1],[3,3,3,3,3],[5,5,5],[1,1,1,1,1,1]]){const o=altarOdds(set);if(!near(sum(o),1)||[o.nothing,o.lower,o.same,o.up1,o.up2].some(v=>v<-1e-9))out.bad.push('odds do not sum to 1 for '+set)}
 const one=altarOdds([3]);out.one=one;
 if(one.nothing+one.lower<.45)out.bad.push('a lone offering is too safe');
 if(altarOdds([3,3,3]).up1+altarOdds([3,3,3]).up2<=one.up1+one.up2)out.bad.push('more offerings do not improve the upgrade odds');
 // junk barely helps: five tier-1 parts alongside a tier-5 add almost nothing
 const solo=altarOdds([5]),junk=altarOdds([5,1,1,1,1]);if(junk.n>solo.n+.2)out.bad.push('fodder counts for too much');
 // ceiling: nothing above tier 5, and a tier-5 offering can only fail or return tier 5
 const top=altarOdds([5,5,5]);if(top.up1!==0||top.up2!==0)out.bad.push('tier 5 can be upgraded');
 // empirical: results respect the table and never exceed tier 5
 seedRng(4242);const N=20000,tally={nothing:0,lower:0,same:0,up1:0,up2:0};let maxTier=0,minGood=9;
 for(let i=0;i<N;i++){const r=altarRoll([3,3]);tally[r.outcome]++;if(r.tier>maxTier)maxTier=r.tier}
 out.tally=Object.fromEntries(Object.entries(tally).map(([k,v])=>[k,+(v/N).toFixed(3)]));out.maxTier=maxTier;
 const ex=altarOdds([3,3]);for(const k of ['nothing','lower','same','up1','up2'])if(Math.abs(tally[k]/N-ex[k])>.02)out.bad.push('roll differs from the stated odds for '+k);
 // tier-1 offerings cannot get a "worse" result
 let worse=0;for(let i=0;i<2000;i++)if(altarRoll([1]).outcome==='lower')worse++;if(worse)out.bad.push('tier 1 offering returned a lower tier');
 // rewards are real grafts of the promised tier
 G={};for(let t=1;t<=5;t++)for(let i=0;i<60;i++){const p=mkAltarPart(t,10);if(p.tier!==t||p.type!=='part')out.bad.push('altar reward tier '+t+' came out as tier '+p.tier)}
 // rooms
 out.altars=0;
 for(let seed=1;seed<=300;seed++){const d=3+(seed%13);seedRng(seed*977);G={depth:d,regIdx:Math.floor((d-1)/5),rites:false,levels:{},mons:[],items:[],mods:{0:'standard'}};genLevel(d);
  const r=G.rooms.find(r=>r.theme==='altar');if(!r)continue;out.altars++;
  let n=0;for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++)if(G.map[y][x]===10)n++;
  if(n!==1)out.bad.push('altar room '+seed+' has '+n+' altars');
  if(G.map[r.cy][r.cx]!==10)out.bad.push('altar is not in the middle');
  if(d>=16)out.bad.push('altar in the human stage')}
 return out})()`);
for(const b of altar.bad.slice(0,10))ok(false,'altar: '+b);
ok(altar.altars>15,'altar rooms too rare: '+altar.altars);
console.log('altar: lone offering '+JSON.stringify(Object.fromEntries(Object.entries(altar.one).filter(([k])=>k!=='M'&&k!=='n').map(([k,v])=>[k,+v.toFixed(2)])))+', '+altar.altars+' altar rooms in 300 floors');
// ---- 9. saved levels survive a round trip (tile codes up to 10 = altar must not shift a row), Tendril Sweep reaches off-axis targets
run(`var LVLKEYS=['map','rooms','vis','seen','shade','decor','items','mons','sD','sU','torches','barr','mounds']`); // mirrors state.js (not loaded headless)
const rt=run(`(function(){const bad=[];
 for(let seed=1;seed<=40;seed++){seedRng(seed);G={depth:3+seed%15,rites:false,levels:{},mons:[],items:[]};genLevel(G.depth);
  const r=G.rooms[1];G.map[r.cy][r.cx]=10;G.map[r.cy][r.cx+1]=9;G.map[r.cy][r.cx+2]=8;
  const o={};for(const k of LVLKEYS)o[k]=G[k];const back=unpackLevel(JSON.parse(JSON.stringify(packLevel(o))));
  for(let y=0;y<H;y++){if(back.map[y].length!==W)bad.push('seed '+seed+': row '+y+' has '+back.map[y].length+' columns');
   for(let x=0;x<W;x++)if(back.map[y][x]!==G.map[y][x]||back.decor[y][x]!==G.decor[y][x]){bad.push('seed '+seed+': tile '+x+','+y+' changed');y=H;break}}}
 return bad})()`);
for(const b of rt.slice(0,8))ok(false,'save round trip: '+b);
ok(rt.length===0,'save round trip failed');
const sweep=run(`(function(){
 seedRng(3);G={depth:3,rites:false,levels:{},mons:[],items:[],log:[],floaters:[],parts:[],attackFX:[],dying:[],mstag:0};genLevel(3);
 const r=G.rooms[1];for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++)G.map[y][x]=1;
 G.p={x:r.x,y:r.y+1,hp:20,eq:{},inv:[],face:1,lvl:1,xp:0,hunger:0,bonusHp:0,candle:0,rest:0};
 G.mons=[];G.vis=Array.from({length:H},()=>new Array(W).fill(true));
 const m=spawn('maggot',{x:r.x+2,y:r.y+2},{alert:true});m.hp=m.max=99;msg=()=>{};addFX=()=>{};stat=()=>({atk:0,hp:20});pickedTarget=null;
 ABIL.a_matron.run({name:'x'},'armR');return m.hp<m.max})()`);
ok(sweep,'Tendril Sweep missed a target at a knight-move offset');
console.log(fails?`\n${fails} of ${checks} checks FAILED`:`\nall ${checks} checks passed`);
process.exit(fails?1:0);
