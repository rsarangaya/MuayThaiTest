// Playtest mode, switched on from the debug console with /fightingdreamers (run it again to switch off).
// You become a zombie in an orange jumpsuit, take no damage, never starve and your grafts never rot. Five jutsu fill quickslots 1-5.
// Their cooldowns live on G.dreamCd; Sage Mode and Leg Surge are timers on the player (p.sage, p.haste), so they save with the run.
MON.clone={n:'Shadow Clone',hp:1,a:[3,6],spd:1,food:0,xp:0,d:[99,99],drop:0,noParts:true,hidden:true};
const DREAM={
 d_sage:{n:'Sage Mode',cd:20,desc:'Gather nature energy: all your melee damage is tripled for 15 turns.',col:'#f08020',
  spr:["..aaaa..",".aaaaaa.","aakkkkaa","aakwwkaa","aakkkkaa",".aaaaaa.","..aaaa.."],
  run(){const p=G.p;p.sage=16;addFX('ring',{org:p,col:'#ff9a30',r:56,life:30});addFX('heal',{org:p,life:30});G.shake=4;msg('Sage Mode! Your strikes hit three times as hard.','good')}},
 d_rasen:{n:'Rasenshuriken',cd:4,aim:{range:8},desc:'Hurl a spinning chakra blade at a spot: a 5x5 blast. Tap the target area (range 8).',col:'#66ccff',
  spr:["...a....","...aa...","a..aa..a","aaaaaaaa","a..aa..a","...aa...","....a..."],
  run(x,y){const p=G.p,hit=G.mons.filter(m=>!m.ally&&!m.dead&&Math.max(Math.abs(m.x-x),Math.abs(m.y-y))<=2);
   addFX('rasen',{org:p,tgt:{x,y,rx:x,ry:y},life:36});G.shake=8;
   for(const m of hit){const d=(rnd(14,20)+stat().atk)*(p.sage>0?3:1);m.hp-=d;m.alert=true;G.floaters.push({x:m.x,y:m.y,t:'-'+d,c:'#9fe0ff',l:30});blood(m.x,m.y,10,'#9fe0ff',2.4);if(m.hp<=0)kill(m)}
   msg(hit.length?`The Rasenshuriken detonates across ${hit.length} enem${hit.length>1?'ies':'y'}!`:'The Rasenshuriken detonates on empty ground.',hit.length?'good':'info')}},
 d_clone:{n:'Kage Bunshin',cd:1,desc:'Summon a shadow clone (1 HP, dodges 92% of blows, never expires) that hunts down enemies. Up to five at once.',col:'#f0c040',
  spr:[".aa.aa..",".aa.aa..","aaaaaaa.","aaaaaaa.",".a.a.a..",".a.a.a.."],
  run(){const p=G.p;if(G.mons.filter(m=>m.ally&&!m.dead&&m.k==='clone').length>=5){msg('Five clones is the limit.','warn');return false}
   const f=freeAdj(p);if(!f){msg('No room for another clone.','warn');return false}
   const m=spawn('clone',f,{ally:true,alert:true,life:80,grp:-1,from:'p'});m.hp=m.max=1;m.fx=p.face;addFX('puff',{org:m,col:'#eef',r:28,life:28});msg('Kage Bunshin no Jutsu!','good')}},
 d_dash:{n:'Leg Surge',cd:12,desc:'Your legs move five times faster for 12 turns.',col:'#9fe870',
  spr:[".....a..","......a.","aaaaaaaa","......a.",".....a.."],
  run(){const p=G.p;p.haste=13;p.hs=0;addFX('streak',{org:p,dir:p.face,life:26});msg('Your legs blur. Everything else crawls.','good')}},
 d_tele:{n:'Flicker',cd:2,aim:{range:10,seen:true,near:false},desc:'Teleport instantly up to 10 tiles: tap any tile you have seen.',col:'#c9a0ff',
  spr:["..aaaa..",".a....a.","a..aa..a","a.a..a.a","a..aa..a",".a....a.","..aaaa.."],
  run(x,y){const p=G.p;if(!walk(x,y)||monAt(x,y)||(x===p.x&&y===p.y)||(x===G.sU.x&&y===G.sU.y)||(x===G.sD.x&&y===G.sD.y)){msg('You cannot land there.','warn');return false}
   addFX('puff',{org:{x:p.x,y:p.y,rx:p.rx,ry:p.ry},col:'#c9a0ff',r:30,life:26});
   snapPos(p,x,y);if(G.map[y][x]===2)G.map[y][x]=5;p.burst=1; // landing costs no time
   addFX('puff',{org:{x,y,rx:x,ry:y},col:'#c9a0ff',r:30,life:26});sfx('stairs');computeFOV();msg('You flicker across the room.','good')}}};
const dreamIconCache={};
function dreamIcon(id){return cloneCanvas(dreamIconCache[id]||(dreamIconCache[id]=bigIcon(DREAM[id].spr,DREAM[id].col,3)))}
function tickDream(){const p=G.p;
 if(p.sage>0&&--p.sage===0)msg('Sage Mode fades.','info');
 if(p.haste>0&&--p.haste===0)msg('Your legs slow to normal.','info');
 for(const k in G.dreamCd)if(G.dreamCd[k]>0)G.dreamCd[k]--}
// tap a tile (or an enemy ring): fn(x,y) runs on that tile. cands rings the enemies in range; a quick double tap on the slot uses the nearest.
function aimTile(fn,range,seen,near){const p=G.p;
 const c=near?G.mons.filter(m=>!m.ally&&!m.dead&&G.vis[m.y][m.x]&&cheb(m,p)<=range):[];
 aim={fn,tile:true,seen,range,cands:c,slotIdx:curQuick,t0:performance.now()};curQuick=-1;
 const el=document.getElementById('hint');clearTimeout(hintTimer);el.textContent=near?'Choose a target area: tap a tile or an enemy. Double-tap the slot for the nearest enemy.':'Tap where to land.';el.style.opacity=1}
function useDream(id){
 if(paused||G.over||!G.dreamer)return;const d=DREAM[id];
 if((G.dreamCd[id]||0)>0){msg(`${d.n} is recharging (${G.dreamCd[id]}).`,'warn');return}
 stopTravel();
 const go=(x,y)=>{if(d.run(x,y)===false)return;G.dreamCd[id]=d.cd+1;sfx('use');selItem=null;closePack();if(G.over)return;endTurn(id==='d_tele',false)};
 if(d.aim){aimTile(go,d.aim.range,!!d.aim.seen,d.aim.near!==false);return}
 go()}
// a shadow clone hunts the nearest enemy anywhere on the floor (not just in view) along the shortest walkable route
function cloneAct(m,toPlayer){const p=G.p,foes=G.mons.filter(o=>!o.ally&&!o.dead);
 const adj=foes.filter(o=>cheb(m,o)<=1).sort((a,b)=>a.hp-b.hp)[0];
 if(adj){const d=rnd(m.a[0],m.a[1]);adj.hp-=d;adj.alert=true;lunge(m,adj.x,adj.y);G.floaters.push({x:adj.x,y:adj.y,t:'-'+d,c:'#9fe',l:22});blood(adj.x,adj.y,5);if(adj.hp<=0)kill(adj);return}
 let goal;
 if(foes.length&&!toPlayer)goal=(x,y)=>foes.some(o=>Math.max(Math.abs(o.x-x),Math.abs(o.y-y))<=1);
 else if(!toPlayer){ // nothing left to hunt: roam the floor from room to room on their own
  if(!m.roam||(m.x===m.roam.x&&m.y===m.roam.y)){const r=pick(G.rooms);m.roam={x:r.cx,y:r.cy}}
  const rm=m.roam;goal=(x,y)=>x===rm.x&&y===rm.y}
 else goal=(x,y)=>Math.max(Math.abs(p.x-x),Math.abs(p.y-y))<=2;
 const key=(x,y)=>y*W+x,prev=new Map(),q=[[m.x,m.y]];prev.set(key(m.x,m.y),null);let end=null;
 for(let i=0;i<q.length&&!end;i++){const [x,y]=q[i];if(i&&goal(x,y)){end=[x,y];break}
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy;if((!dx&&!dy)||!walk(nx,ny)||prev.has(key(nx,ny))||(monAt(nx,ny)&&!monAt(nx,ny).ally)||(nx===p.x&&ny===p.y))continue;
   if((nx===G.sU.x&&ny===G.sU.y)||(nx===G.sD.x&&ny===G.sD.y))continue;prev.set(key(nx,ny),[x,y]);q.push([nx,ny])}}
 if(!end){m.roam=null;if(!toPlayer&&foes.length)cloneAct(m,true);return} // no route to any enemy: rejoin the player instead of standing still
 let c=end;for(;;){const pr=prev.get(key(c[0],c[1]));if(!pr||(pr[0]===m.x&&pr[1]===m.y))break;c=pr}
 if(G.map[c[1]][c[0]]===2)G.map[c[1]][c[0]]=5;
 // a clone in the way is waited on, unless it is a younger one: the older clone pushes through (trading places), so a jam always clears and nobody ping-pongs
 const o=monAt(c[0],c[1]);if(o){if(o.ally&&o.id>m.id)setPos(o,m.x,m.y);else return}
 if(c[0]!==m.x)m.fx=Math.sign(c[0]-m.x);moveMon(m,c[0],c[1])}
function toggleDreamers(){
 if(!G||!G.p||!inRun())return 'start a run first';
 const p=G.p,q=ensureQuick(p);
 if(!G.dreamer){G.dreamer=true;G.god=true;G.dreamCd={};
  Object.keys(DREAM).forEach((id,i)=>{q[i]={t:'d',id}});p.hp=stat().hp;p.hunger=0;
  addFX('ring',{org:p,col:'#ff9a30',r:70,life:34});addFX('puff',{org:p,col:'#eef',r:32,life:30});sfx('level');
  msg('Believe it! Zombie dreamer mode: no damage, no hunger, grafts never rot. Jutsu are on quickslots 1-5.','good');ui();return 'fighting dreamers ON'}
 G.dreamer=false;G.god=false;p.sage=p.haste=0;
 q.forEach((e,i)=>{if(e&&e.t==='d')q[i]=null});if(!q[0])q[0]={t:'c',id:'flask'};if(!q[1])q[1]={t:'c',id:'scrap'};
 msg('The dream ends.','info');ui();return 'fighting dreamers OFF'}
