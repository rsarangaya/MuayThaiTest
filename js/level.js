function gen(){
 const m=Array.from({length:H},()=>new Array(W).fill(0)),room=Array.from({length:H},()=>new Array(W).fill(false)),rid=Array.from({length:H},()=>new Array(W).fill(-1)),rooms=[];
 for(let i=0;i<70&&rooms.length<12;i++){
  const w=rnd(5,10),h=rnd(5,8),x=rnd(2,W-w-3),y=rnd(2,H-h-3);
  if(rooms.some(r=>x<r.x+r.w+2&&x+w+2>r.x&&y<r.y+r.h+2&&y+h+2>r.y))continue;
  rooms.push({x,y,w,h,cx:x+(w>>1),cy:y+(h>>1)});
  for(let j=y;j<y+h;j++)for(let k=x;k<x+w;k++){m[j][k]=1;room[j][k]=true;rid[j][k]=rooms.length-1}
  if(R()<.4){m[y][x]=0;room[y][x]=false;rid[y][x]=-1;m[y+h-1][x+w-1]=0;room[y+h-1][x+w-1]=false;rid[y+h-1][x+w-1]=-1}}
 const carve=(x,y)=>{if(m[y][x]===0)m[y][x]=1};
 for(let i=1;i<rooms.length;i++){
  const a=rooms[i-1],b=rooms[i];let x=a.cx,y=a.cy;
  if(R()<.5){while(x!==b.cx){carve(x,y);x+=Math.sign(b.cx-x)}while(y!==b.cy){carve(x,y);y+=Math.sign(b.cy-y)}}
  else{while(y!==b.cy){carve(x,y);y+=Math.sign(b.cy-y)}while(x!==b.cx){carve(x,y);x+=Math.sign(b.cx-x)}}
  carve(x,y)}
 if(rooms.length>3){const a=rooms[0],b=rooms[rooms.length-1];let x=a.cx,y=a.cy;while(x!==b.cx){carve(x,y);x+=Math.sign(b.cx-x)}while(y!==b.cy){carve(x,y);y+=Math.sign(b.cy-y)}}
 const fl=(x,y)=>x>=0&&y>=0&&x<W&&y<H&&m[y][x]!==0,DIRS=[[0,-1],[0,1],[-1,0],[1,0]];
 // tidy-up: dissolve orphaned wall stubs (a wall tile poking into open floor on 3+ sides)
 for(let pass=0,ch=true;ch&&pass<40;pass++){ch=false;
  for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++)if(m[y][x]===0&&DIRS.filter(([dx,dy])=>fl(x+dx,y+dy)).length>=3){m[y][x]=1;ch=true}}
 // doors: only in the wall line of a room, where a corridor leaves it AND that corridor reaches a different room
 const leadsToOtherRoom=(sx,sy,from)=>{
  const seen=new Set([sy*W+sx]),q=[[sx,sy]];
  for(let i=0;i<q.length;i++){const [x,y]=q[i];
   for(const [dx,dy] of DIRS){const nx=x+dx,ny=y+dy;if(!fl(nx,ny))continue;
    if(room[ny][nx]){if(rid[ny][nx]!==from)return true;continue}
    const k=ny*W+nx;if(!seen.has(k)){seen.add(k);q.push([nx,ny])}}}
  return false};
 for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){
  if(m[y][x]!==1||room[y][x])continue;
  for(const [ax,ay] of [[1,0],[0,1]]){ // [1,0]: passage runs east-west, [0,1]: north-south
   const a=[x-ax,y-ay],b=[x+ax,y+ay];
   if(fl(x+ay,y+ax)||fl(x-ay,y-ax))continue; // both flanks must be solid wall
   if(!fl(...a)||!fl(...b))continue;
   const [ra,rb]=[room[a[1]][a[0]],room[b[1]][b[0]]];
   if(ra===rb)continue; // exactly one side is a room, the other a corridor
   const [r,c]=ra?[a,b]:[b,a];
   if(DIRS.some(([dx,dy])=>m[y+dy][x+dx]===2))continue; // no double doors
   if(DIRS.filter(([dx,dy])=>fl(c[0]+dx,c[1]+dy)).length<2)continue; // corridor side must continue, not dead-end
   if(!leadsToOtherRoom(c[0],c[1],rid[r[1]][r[0]]))continue;
   if(R()<.6)m[y][x]=2;
   break}}
 return {m,rooms}}
function genLevel(d){
 const L=gen();G.map=L.m;G.rooms=L.rooms;const rs=G.rooms;
 G.vis=Array.from({length:H},()=>new Array(W).fill(false));G.seen=Array.from({length:H},()=>new Array(W).fill(false));
 G.shade=Array.from({length:H},()=>Array.from({length:W},()=>R()));
 G.decor=Array.from({length:H},(_,y)=>Array.from({length:W},(_,x)=>{if(G.map[y][x]!==1)return 0;const r=R();return r<.06?1:r<.1?2:r<.13?3:r<.17?4:r<.2?5:0}));
 G.items=[];G.mons=[];G.torches=[];G.barr=[];G.mounds=[];
 G.sU={x:rs[0].cx,y:rs[0].cy};const last=rs[rs.length-1];G.sD=d<MAX_DEPTH?{x:last.cx,y:last.cy}:{x:-1,y:-1};
 assignThemes(d); // some rooms become themed (body dump, swamp, maggot nest); ordinary loot and monsters avoid them
 const plain=()=>{const p=rs.slice(1).filter(r=>!r.theme);return p.length?p:rs.slice(1)};
 for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++)if(G.map[y][x]===0&&G.map[y+1][x]===1&&R()<.07&&!G.torches.some(t=>Math.abs(t.x-x)<4&&Math.abs(t.y-y)<4))G.torches.push({x,y});
 const free=r=>{for(let i=0;i<30;i++){const x=rnd(r.x,r.x+r.w-1),y=rnd(r.y,r.y+r.h-1);
  if(G.map[y][x]===1&&Math.abs(x-G.sU.x)+Math.abs(y-G.sU.y)>2&&Math.abs(x-G.sD.x)+Math.abs(y-G.sD.y)>1&&!G.items.some(i=>i.x===x&&i.y===y)&&!monAt(x,y))return{x,y}}return null};
 const put=it=>{const f=free(pick(plain()));if(f)G.items.push({...f,it});return !!f};
 // first floor of every stage: the arrival room is a "waste room" stocked with a few free, clean goodies
 if((d-1)%STAGE_LEN===0)stockWasteRoom(d,rs[0],free);
 const mod=MODS[(G.mods&&G.mods[G.regIdx])||'standard']||MODS.standard; // stage variant chosen at the previous stage boundary
 for(let i=0,n=rnd(1,2)+mod.part;i<n;i++)put(mkPart(d+mod.tier*4));put(mkCons('flask'));put(mkCons('scrap'));put(mkLoot(d,null,0));
 for(let i=0;i<mod.loot;i++)put(mkLoot(d,null,0));
 if(d%5===4)put(mkCons('serum')); // one permanent +max HP serum per stage, just before its boss floor
 if(d>=10&&!G.rites&&R()<.35&&put(mkCons('rites')))G.rites=true;
 const types=Object.keys(MON).filter(k=>k!=='boss'&&d>=MON[k].d[0]&&d<=MON[k].d[1]);
 // stage-end bosses guard the way down (floors 5, 10, 15) and the final floor holds The Surgeon with human guards
 const MINI={5:'warden',10:'matron',15:'abomination'};
 if(MINI[d]){const f=free(last);if(f)spawn(MINI[d],f)}
 if(d===MAX_DEPTH){const f=free(last);if(f)spawn('boss',f);for(const k of ['guard','guard','rifleman','scientist']){const f2=free(pick(plain()));if(f2)spawn(k,f2)}}
 // monsters come in room packs: one wake-up call rouses the whole room (see monstersAct)
 let left=Math.round((rnd(6,9)+Math.floor(d/4))*mod.mon),guard=0;const pool=types.length?types:['golem'];
 while(left>0&&guard++<80){const r=pick(plain()),k0=pick(pool),size=Math.min(left,rnd(1,3));
  for(let i=0;i<size;i++){const f=free(r);if(!f)break;spawn(R()<.6?k0:pick(pool),f);left--}}
 populateThemes(d,pool,free)}
// Waste room: 2-3 randomized, untainted goodies (usually a graft, plus supplies) near the stage's start.
function stockWasteRoom(d,r,free){
 for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++)if(G.map[y][x]===1&&R()<.4)G.decor[y][x]=pick([1,3,3,5]); // scattered gore, bones and rubble
 const clean=p=>{p.taint='';p.known=true;return p};
 const n=rnd(2,3),items=[clean(mkPart(d+1))];
 if(R()<.6){let g=clean(mkPart(d+1)),tries=0;while(g.kind===items[0].kind&&tries++<8)g=clean(mkPart(d+1));items.push(g)}
 const sup=['flask','flask','scrap','scrap','shards','brine','candle'];
 while(items.length<n)items.push(mkCons(pick(sup)));
 for(const it of items){const f=free(r);if(f)G.items.push({...f,it})}}
// ---------- themed rooms ----------
// BODY DUMP: interior tiles become piles of bodies. Bump a pile to search it (one turn). Exactly one hides a graft, two or three hide
//            an ambush, and the rest are empty, and nothing tells them apart until you dig.
// SWAMP:     most tiles are mire: wading is slow (monsters get an extra step), but the natives carry food and potions.
// NEST:      a pack of sleeping maggots (a brood-mother deep down) guarding a graft in the middle of the room.
// ALTAR:     one bone altar in the middle. Bump it to offer grafts for a harsh gamble on a better one (one use).
const THEMES=['dump','swamp','nest','altar'];
function assignThemes(d){
 const rs=G.rooms;if(d<2||rs.length<4)return;
 const elig=rs.slice(1,-1).filter(r=>r.w>=5&&r.h>=5);let n=(R()<.65?1:0)+(d>=4&&R()<.4?1:0);
 // the human stage keeps only the body dump (its swamp and nest natives are undead)
 const pool=THEMES.filter(k=>(k!=='nest'||d>=3)&&(k!=='altar'||d>=3)&&(d<16||k==='dump')).sort(()=>R()-.5);
 while(n-->0&&elig.length&&pool.length){const r=elig.splice(Math.floor(R()*elig.length),1)[0];r.theme=pool.shift();r.said=false}}
function populateThemes(d,types,free){
 const stairOk=(x,y)=>!(x===G.sU.x&&y===G.sU.y)&&!(x===G.sD.x&&y===G.sD.y);
 for(const r of G.rooms){if(!r.theme)continue;
  const tiles=[];for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++)if(G.map[y][x]===1&&stairOk(x,y))tiles.push({x,y});
  if(r.theme==='dump'){
   // interior only, so the ring around the room stays open and every door keeps its way in
   const inner=tiles.filter(t=>t.x>r.x&&t.x<r.x+r.w-1&&t.y>r.y&&t.y<r.y+r.h-1).sort(()=>R()-.5);
   const n=Math.min(inner.length,rnd(6,8)),foes=Math.min(rnd(2,3),n-1);
   for(let i=0;i<n;i++){const t=inner[i],k=i===0?'graft':i<=foes?'foe':'empty',mound={x:t.x,y:t.y,k};
    if(k==='graft')mound.it=mkPart(d+1);else if(k==='foe')mound.foe=pick(types.filter(x=>!MON[x].mini&&MON[x].role!=='wail')||types)||'maggot';
    G.mounds.push(mound);G.map[t.y][t.x]=8}
   for(const t of tiles)if(G.map[t.y][t.x]===1&&R()<.35)G.decor[t.y][t.x]=pick([1,3,3])}
  else if(r.theme==='swamp'){
   const cnt=rnd(3,5);for(let i=0;i<cnt;i++){const f=free(r);if(f)spawn(d>=6&&R()<.4?'mirebrute':'toad',f)} // before the tiles turn to mire
   for(const t of tiles)if(G.map[t.y][t.x]===1&&R()<.78&&!G.items.some(i=>i.x===t.x&&i.y===t.y))G.map[t.y][t.x]=9}
  else if(r.theme==='altar'){
   if(stairOk(r.cx,r.cy)&&G.map[r.cy][r.cx]===1)G.map[r.cy][r.cx]=10;
   for(const t of tiles)if(G.map[t.y][t.x]===1&&R()<.3)G.decor[t.y][t.x]=pick([1,3,3,5])}
  else if(r.theme==='nest'){
   const broodmother=d>=8,cnt=broodmother?4:rnd(6,8);
   if(broodmother){const f=free(r);if(f)spawn('broodmother',f)}
   for(let i=0;i<cnt;i++){const f=free(r);if(f)spawn('maggot',f)}
   const cx=r.cx,cy=r.cy;if(stairOk(cx,cy)&&G.map[cy][cx]===1)G.items.push({x:cx,y:cy,it:mkPart(d+2)});
   for(const t of tiles)if(R()<.5)G.decor[t.y][t.x]=pick([1,2,3])}}}
// bump into a pile of bodies: dig through it
function searchMound(x,y){
 const i=G.mounds.findIndex(m=>m.x===x&&m.y===y);G.map[y][x]=1;G.decor[y][x]=pick([1,3]);if(i<0)return;
 const m=G.mounds.splice(i,1)[0];sfx('door');hintOnce('dump');
 if(m.k==='graft'){G.items.push({x,y,it:m.it});msg('You dig through the pile and find something stitched into the rot!','good');sfx('pickup');addFX('heal',{org:{x,y,rx:x,ry:y},life:26})}
 else if(m.k==='foe'){msg('The bodies heave. Something was waiting in the pile!','bad');spawn(m.foe,{x,y},{alert:true});stopTravel();G.shake=Math.max(G.shake,4);sfx('warn');addFX('puff',{org:{x,y,rx:x,ry:y},col:'#8a7a60',r:26,life:28})}
 else msg(pick(['Just bones and rotten cloth.','Nothing but meat gone to soup.','A tangle of the long dead. Nothing here.']),'info')}
function announceTheme(r){
 const say={altar:'A bone altar. Bump it to offer grafts: the more and the better you give, the better your odds. Nothing is guaranteed, and it works once.',dump:'A body dump. Some of these piles hide more than rot: bump a pile to search it.',swamp:'A stagnant swamp. Wading is slow, but what lives here carries supplies.',nest:'A maggot nest! Something valuable gleams in the middle, and the whole room is crawling.'}[r.theme];
 msg(say,'warn');hintOnce(r.theme)}
let MID=1; // unique monster ids (summoners track their minions with these)
function spawn(k,pos,extra){const t=MON[k],hp=t.hp+Math.floor(G.depth/3);
 const grp=G.rooms?G.rooms.findIndex(r=>pos.x>=r.x&&pos.x<r.x+r.w&&pos.y>=r.y&&pos.y<r.y+r.h):-1;
 const m={...t,k,id:MID++,grp,x:pos.x,y:pos.y,rx:pos.x,ry:pos.y,q:[],hp,max:hp,en:0,alert:false,fx:1,bleed:0,poison:0,stun:0,...(extra||{})};G.mons.push(m);return m}
function changeLevel(dir,force){
 const p=G.p,oldReg=G.regIdx;
 // leaving a stage's boss floor for a new stage: pick the next stage's variant first
 if(!force&&dir>0&&G.depth>0&&G.depth<MAX_DEPTH&&G.depth%STAGE_LEN===0&&!(G.mods&&G.mods[G.depth/STAGE_LEN])&&!G.levels[G.depth+1]){stopTravel();openStageChoice();return}
 if(G.depth>0)sfx('stairs');
 // an active Reek follows you instead of waiting behind: it leaves this floor (keeping its wounds) and turns up on the next
 if(G.reekState&&G.reekState[G.regIdx]==='active'){const s=G.mons.find(m=>m.k==='stalker');if(s){G.reekHp=s.hp;G.mons=G.mons.filter(m=>m!==s)}}
 if(G.depth>0){const o={};LVLKEYS.forEach(k=>o[k]=G[k]);G.levels[G.depth]=o;if(G._lc)delete G._lc[G.depth]}
 G.depth+=dir;const d=G.depth;G.regIdx=Math.min(STAGES-1,Math.floor((d-1)/STAGE_LEN));G.reg=REG[G.regIdx];
 if(G.regIdx!==oldReg)G.reekHp=0; // a wounded Reek from the previous stage must not carry its HP into the next stage's Reek
 const existing=G.levels[d];
 G.taintK=(MODS[(G.mods&&G.mods[G.regIdx])||'standard']||MODS.standard).taint;
 if(existing){LVLKEYS.forEach(k=>G[k]=existing[k]);if(G._lc)delete G._lc[d]}else genLevel(d);
 const st=dir>0?G.sU:G.sD;let best=null;
 for(let r=1;r<W&&!best;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){const x=st.x+dx,y=st.y+dy;if(!best&&walk(x,y)&&G.map[y][x]!==2&&!monAt(x,y)&&!(x===G.sU.x&&y===G.sU.y)&&!(x===G.sD.x&&y===G.sD.y))best={x,y}}
 snapPos(p,best.x,best.y);panGoal=null;G.mons.forEach(m=>snapPos(m,m.x,m.y));
 pan.x=pan.y=0;G.sbx=null;G.dying=[];G.fogA=null;G.cx=p.x+.5;G.cy=p.y+.5;computeFOV();
 if(G.reekState&&G.reekState[G.regIdx]==='active'&&d<bossFloor(G.regIdx)&&!G.mons.some(m=>m.k==='stalker')&&summonReek())msg('The Reek has followed you down.','bad');
 if(G.turn>0||d>1)msg(dir>0?`You descend into ${G.reg.n}. Depth ${d}.`:`You climb back to depth ${d}.`,'info');
 if(!existing&&(d-1)%STAGE_LEN===0){const st=G.regIdx+1;showHint(`STAGE ${st}: ${G.reg.n.toUpperCase()}`+(st===STAGES?' - the survivors are human, and armed.':''));if(d>1)msg('You arrive in a waste room. The dead dump their leavings here: take what you need.','info');else msg('Something has been dumped in this waste room. Take what you can.','info')}}
const monAt=(x,y)=>G.mons.find(m=>m.x===x&&m.y===y);
const walk=(x,y)=>x>=0&&y>=0&&x<W&&y<H&&G.map[y][x]!==0&&G.map[y][x]!==7&&G.map[y][x]!==8&&G.map[y][x]!==10; // 7 = bone barricade, 8 = pile of bodies, 10 = altar (all block movement)
const opaque=(x,y)=>x<0||y<0||x>=W||y>=H||G.map[y][x]===0||G.map[y][x]===2;
function computeFOV(){
 const p=G.p,r=stat().sight;for(const row of G.vis)row.fill(false);
 for(let y=p.y-r;y<=p.y+r;y++)for(let x=p.x-r;x<=p.x+r;x++){
  if(x<0||y<0||x>=W||y>=H)continue;if((x-p.x)**2+(y-p.y)**2>r*r+r)continue;
  if(los(p.x,p.y,x,y)){G.vis[y][x]=true;G.seen[y][x]=true}}
 if(G.dev)for(let y=0;y<H;y++)for(let x=0;x<W;x++){G.vis[y][x]=true;G.seen[y][x]=true}}
function los(x0,y0,x1,y1){
 let dx=Math.abs(x1-x0),dy=Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1,e=dx-dy,x=x0,y=y0;
 while(!(x===x1&&y===y1)){const e2=2*e;if(e2>-dy){e-=dy;x+=sx}if(e2<dx){e+=dx;y+=sy}
  if(!(x===x1&&y===y1)&&opaque(x,y))return false}return true}
function blood(tx,ty,n,col='#8a1010',spd=1.6){for(let i=0;i<n;i++){const a=R()*6.28,s=R()*spd+.4;G.parts.push({x:tx*T+16,y:ty*T+16,vx:Math.cos(a)*s,vy:Math.sin(a)*s-.8,l:rnd(14,30),c:col,s:rnd(2,3)})}}
function addInv(it){const p=G.p;
 if(it.type==='cons'&&CONS[it.id].stack){const e=p.inv.find(i=>i.id===it.id);if(e){e.count+=it.count;return true}}
 if(p.inv.length>=maxInv())return false;p.inv.push(it);return true}
