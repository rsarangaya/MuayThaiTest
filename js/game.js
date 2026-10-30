function playerAct(dx,dy){
 if(aim)cancelAim();
 if(G.over||paused||Math.abs(dx)>1||Math.abs(dy)>1)return;const p=G.p;let acted=false,moved=false,waited=false;
 if(dx===0&&dy===0){acted=true;waited=true}
 else{
  if(dx)p.face=dx;const nx=p.x+dx,ny=p.y+dy,m=monAt(nx,ny);
  const ally=m&&m.ally?m:null;
  if(m&&!ally){attack(m);acted=true}
  else if(G.map[ny]&&G.map[ny][nx]===8){searchMound(nx,ny);acted=true} // bump a pile of bodies to search it
  else if(G.map[ny]&&G.map[ny][nx]===10){openAltar(nx,ny)} // bumping the altar opens the offering window (no turn passes)
  else if(walk(nx,ny)){
   if(ally)setPos(ally,p.x,p.y); // you swap places with your minions
   if(nx===G.sD.x&&ny===G.sD.y){stopTravel();changeLevel(1);ui();return}
   if(nx===G.sU.x&&ny===G.sU.y){stopTravel();if(G.depth===1){msg('Rubble seals the way up. There is only down.','warn');return}changeLevel(-1);ui();return}
   setPos(p,nx,ny);moved=true;acted=true;
   {const rr=G.rooms.find(r=>nx>=r.x&&nx<r.x+r.w&&ny>=r.y&&ny<r.y+r.h);if(rr&&rr.theme&&!rr.said){rr.said=true;announceTheme(rr)}}sfx('step');if(G.map[ny][nx]===2){G.map[ny][nx]=5;sfx('door')}
   // a lone item is grabbed automatically; a pile is left for the player to pick through (see the ground panel)
   const here=G.items.filter(i=>i.x===nx&&i.y===ny);
   if(here.length===1){const e=here[0],it=e.it;if(addInv(it)){G.items.splice(G.items.indexOf(e),1);msg(`You grab: ${it.name}${it.count>1?' x'+it.count:''}.`,'good');sfx('pickup');stopTravel()}else msg('Backpack full.','warn')}
   else if(here.length>1){stopTravel();msg(`${here.length} items lie here. Tap Ground (or your own tile) to grab the newest.`,'info')}}}
 if(acted)endTurn(moved,waited)}
const taintCount=k=>SLOTS.reduce((a,s)=>a+(G.p.eq[s]&&G.p.eq[s].taint===k?1:0),0);
function endTurn(moved,waited){
 const p=G.p;G.turn++;const hasted=p.haste>0;if(G.dreamer){tickDream();p.hunger=0}
 if(p.cloak>0)p.cloak--;if(p.drain>0&&G.turn%30===0)p.drain--;decayParts();for(const k of SLOTS){const e=p.eq[k];if(e&&e.cd>0)e.cd--} // graft ability cooldowns
 const s=stat();p.hunger+=.35+taintCount('itch')*.12;if(p.candle>0)p.candle--;
 if(p.hunger>=100){hurt(1);if(G.turn%3===0)msg('Your hunger gnaws at you.','bad')}
 else if(G.turn%10===0&&p.hp<s.hp&&p.hunger<75)p.hp++;
 if(fx('regen')&&p.hunger<75&&G.turn%5===0&&p.hp<s.hp)p.hp++;
 if(taintCount('weep')&&G.turn%8===0){hurt(1);msg('A weeping graft seeps into your wounds. (-1)','bad')}
 if(p.hp>s.hp)p.hp=s.hp;
 computeFOV();tickDots();if(G.over||paused)return;
 let free=false,slowed=false;
 if(moved){
  if(G.map[p.y][p.x]===9){slowed=true;G.floaters.push({x:p.x,y:p.y,t:'mire',c:'#7a9a5a',l:18})} // wading through a swamp: monsters get an extra step
  else if(fx('sprint')&&p.rest>=5){free=true;msg('You sprint!','good')}
  else if(p.burst>0){p.burst--;free=true}
  else if(hasted&&(p.hs=((p.hs||0)+1)%5)!==0)free=true; // Leg Surge: four of every five steps cost the dead no time
  else if(s.spd>0&&R()<s.spd)free=true;
  else if(s.spd<0&&R()<-s.spd)slowed=true;
  p.rest=0}
 else if(waited)p.rest++;else p.rest=0;
 if(free)G.floaters.push({x:p.x,y:p.y,t:'swift',c:'#8c8',l:20});
 else{monstersAct();
  // dragging yourself on stumps or rotten legs lets the dead close in; they only move, so telegraphed blows stay dodgeable
  if(slowed&&p.hp>0&&!G.over){G.floaters.push({x:p.x,y:p.y,t:'drag',c:'#a86',l:20});monstersAct(true);hintOnce('slow')}}
 if(!G.over)worldTick();
 if(p.hp<=0)die();
 checkHints();ui();saveRun()}
function tickDots(){for(const m of [...G.mons]){let d=0,col='#c33';
 if(m.bleed>0){m.bleed--;d++}
 if(m.poison>0){m.poison--;d++;col='#9c3'}
 if(m.burn>0){m.burn--;d+=2;col='#f93'}
 if(d){m.hp-=d;G.floaters.push({x:m.x,y:m.y,t:'-'+d,c:col,l:20});if(m.hp<=0){kill(m);if(G.over)return}}}}function strike(m){
 const s=stat(),p=G.p,dmg=(rnd(1,3)+s.atk)*(p.sage>0?3:1); // Sage Mode (debug mode) triples melee damage
 m.hp-=dmg;m.alert=true;G.floaters.push({x:m.x,y:m.y,t:'-'+dmg,c:'#fc6',l:25});blood(m.x,m.y,6+dmg);G.shake=Math.min(8,2+dmg/2);
 for(const k of ['armL','armR']){const a=p.eq[k];if(!a)continue;if(a.stats.atk)wear(k,a.fx==='brittle'?2:.35);
  if(a&&a.fx==='rend'&&R()<.25){m.bleed=4;G.floaters.push({x:m.x,y:m.y,t:'bleed',c:'#c33',l:20})}
  if(a&&a.fx==='crush'&&R()<.2){m.stun=1;G.floaters.push({x:m.x,y:m.y,t:'stun',c:'#fe6',l:20})}}
 if(s.steal&&G.turn%3===0&&p.hp<s.hp)p.hp=Math.min(s.hp,p.hp+Math.min(1,s.steal));
 return dmg}
function attack(m){
 const p=G.p;p.cloak=0;if(m.x!==p.x)p.face=Math.sign(m.x-p.x)||p.face;
 if(R()<.1){msg(`You miss the ${m.n}.`);sfx('miss');return}
 sfx('hit');
 lunge(p,m.x,m.y);G.attackFX.push({x:p.x,y:p.y,tx:m.x,ty:m.y,life:16,max:16,ranged:false,player:true});const d=strike(m);if(m.hp>0)msg(`You maul the ${m.n} for ${d}.`);
 const pk=fx('peck');if(m.hp>0&&pk&&R()<.15*pk){msg('Quick peck! You strike again.','good');strike(m)}
 if(fx('sweep')){const o=G.mons.find(o=>o!==m&&!o.ally&&o.hp>0&&Math.max(Math.abs(o.x-p.x),Math.abs(o.y-p.y))<=1);
  if(o){const h=Math.max(1,Math.ceil(d/2));o.hp-=h;o.alert=true;G.floaters.push({x:o.x,y:o.y,t:'-'+h,c:'#fc6',l:25});blood(o.x,o.y,5);if(o.hp<=0)kill(o)}}
 if(m.hp<=0&&!m.dead)kill(m)}
function decayParts(){if(G.dreamer)return;const slow=G.p.perk==='slowrot'?.8:1;for(const k of SLOTS){const e=G.p.eq[k];if(e)wear(k,(e.decay||.18)*(e.taint==='rot'?1.8:1)*slow)}
 for(const it of G.p.inv)if(it.type==='part')it.dur=Math.max(0,it.dur-(it.decay||.18)*.25);
 G.p.hp=Math.min(G.p.hp,stat().hp)}
function wear(k,n){const e=G.p.eq[k];if(!e||G.dreamer)return;e.dur-=n;if(e.dur<=0)sfx('detach');
 if(e.dur<=Math.floor(e.maxdur*.2)&&e.dur+n>Math.floor(e.maxdur*.2)&&e.dur>0)msg(`Your ${e.name} is about to fall off!`,'warn');
 if(e.dur<=0){msg(`Your ${e.name} rots away and falls off!`,'bad');G.p.eq[k]=null;G.floaters.push({x:G.p.x,y:G.p.y,t:'DETACHED',c:'#e55',l:30});blood(G.p.x,G.p.y,14,'#6a8a3a')}}
function kill(m){
 if(m.dead)return;
 if(m.ally){if(m.k==='clone')addFX('puff',{org:m,col:'#eef',r:22,life:22});removeMon(m);msg(`Your ${m.n} is destroyed.`,'warn');return} // minions leave no loot, xp or hunger relief
 m.dead=true;sfx('kill');
 // loot never lands on a staircase (stepping there would take the stairs before you could pick it up)
 const onStairs=(m.x===G.sD.x&&m.y===G.sD.y)||(m.x===G.sU.x&&m.y===G.sU.y),at=(onStairs&&freeAdj(m))||{x:m.x,y:m.y};
 if(m.k==='stalker'){G.reekState=G.reekState||{};G.reekState[G.regIdx]='dead';G.reekHp=0;msg('The Reek is finally still. It will not hunt you again this stage.','good')}
 G.dying.push({k:m.k,x:m.x,y:m.y,rx:m.rx===undefined?m.x:m.rx,ry:m.ry===undefined?m.y:m.ry,fx:m.fx,t0:NOW});
 const p=G.p;G.mons=G.mons.filter(x=>x!==m);p.kills++;blood(m.x,m.y,18,m.k==='bloat'?'#78a02a':'#8a1010',2.4);G.decor[m.y][m.x]=1;
 p.hunger=Math.max(0,p.hunger-m.food);const heal=1+fx('infest')+(p.perk==='scavenger'?1:0);p.hp=Math.min(stat().hp,p.hp+heal);
 msg(`You devour the ${m.n}. (+${heal} HP, hunger eased)`,'good');
 if(m.burst){for(let i=0;i<20;i++)blood(m.x,m.y,1,'#9ad030',3);if(Math.max(Math.abs(m.x-p.x),Math.abs(m.y-p.y))<=1){hurt(3);msg('The Gore Bloat bursts in acid! (-3)','bad')}}
 p.xp+=m.xp;while(p.xp>=p.lvl*10){p.xp-=p.lvl*10;p.lvl++;msg(`Your corruption deepens. Level ${p.lvl}! (+3 max HP)`,'info');sfx('level')}
 // two independent drops: one of the monster's own body parts (guaranteed from bosses), and the usual supplies
 if(m.mini||m.k==='boss'||R()<(PART_CHANCE[m.k]||0)){
  const it=mkMonsterPart(m,m.k==='boss'?MAX_DEPTH:m.mini?G.depth+2:G.depth);
  G.items.push({x:at.x,y:at.y,it});msg(`The ${m.n} leaves a body part: ${it.name}.`,'good')}
 if(m.loot){const it=mkCons(pick(m.loot));G.items.push({x:at.x,y:at.y,it});msg(`The ${m.n} was carrying: ${it.name}.`,'good')} // swamp natives always drop supplies
 if(!m.mini&&m.k!=='boss'&&(G.dropCounts[G.depth]||0)<3&&R()<m.drop){
  G.dropCounts[G.depth]=(G.dropCounts[G.depth]||0)+1;const it=mkLoot(G.depth,m.k,0);
  G.items.push({x:at.x,y:at.y,it});msg(`It left something: ${it.name}.`,'info')}
 if(m.k==='boss')win()}
function hurt(n){const p=G.p;if(G.god)return;p.cloak=0;p.hp-=n;sfx('hurt');if(settings.haptics&&navigator.vibrate)try{navigator.vibrate(Math.min(70,20+n*6))}catch(e){}G.floaters.push({x:p.x,y:p.y,t:'-'+n,c:'#f44',l:25});blood(p.x,p.y,8,'#6a8a3a');G.shake=Math.min(10,3+n/2);
 if(!(chase&&!chase.dead&&cheb(chase,p)<=1))stopTravel()} // being hit by the enemy you are charging does not stop the charge: you still get your swing
// a monster's step is queued for animation with a small stagger so a crowd ripples instead of all snapping at once
function moveMon(m,x,y){if(G.map[y][x]===9&&!m.swamp)m.en-=1; // non-natives lose a step wading through the mire
 setPos(m,x,y);m.delay=G.mstag;G.mstag=Math.min(170,G.mstag+40)}
const cheb=(a,b)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));
function freeAdj(o){const c=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const x=o.x+dx,y=o.y+dy;if((dx||dy)&&walk(x,y)&&!monAt(x,y)&&!(x===G.p.x&&y===G.p.y)&&!(x===G.sU.x&&y===G.sU.y)&&!(x===G.sD.x&&y===G.sD.y))c.push({x,y})}return c.length?pick(c):null}
// step to the neighbouring tile that puts the most distance between m and the player
function stepAway(m,p){let best=null,bd=cheb(m,p);
 for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const x=m.x+dx,y=m.y+dy;if(!walk(x,y)||monAt(x,y)||(x===p.x&&y===p.y)||G.map[y][x]===2)continue;
  const d=Math.max(Math.abs(x-p.x),Math.abs(y-p.y));if(d>bd){bd=d;best=[x,y]}}
 if(!best)return false;if(best[0]!==m.x)m.fx=Math.sign(best[0]-m.x);moveMon(m,best[0],best[1]);return true}
function removeMon(m){m.dead=true;G.mons=G.mons.filter(x=>x!==m);G.dying.push({k:m.k,x:m.x,y:m.y,rx:m.rx,ry:m.ry,fx:m.fx,t0:NOW})}
// Support roles. Return 'acted' (used the action), 'moved' (repositioned, keep going) or false (fall through to normal chasing).
function roleAct(m,cd){const p=G.p;
 if(m.role==='heal'){
  if((m.cdh||0)>0)m.cdh--;
  else{const w=G.mons.filter(o=>o!==m&&!o.ally&&!o.dead&&o.hp<o.max&&cheb(m,o)<=4&&los(m.x,m.y,o.x,o.y)).sort((a,b)=>a.hp/a.max-b.hp/b.max)[0];
   if(w){w.hp=Math.min(w.max,w.hp+4+Math.floor(G.depth/5));m.cdh=3;addFX('heal',{org:w,life:30});G.floaters.push({x:w.x,y:w.y,t:'+heal',c:'#8d6',l:24});
    if(G.vis[w.y][w.x])msg(`The ${m.n} mends the ${w.n}.`,'warn');return 'acted'}}
  return cd<=3&&stepAway(m,p)?'moved':false}
 if(m.role==='wail'){
  if((m.wt||0)>0)m.wt--;
  else if(cd<=(m.sight||9)){let n=0;for(const o of G.mons)if(o!==m&&!o.ally&&!o.alert&&cheb(m,o)<=12){o.alert=true;n++}
   addFX('sonar',{org:m,col:'#e8e8ff',r:T*10,life:40});G.shake=Math.max(G.shake,3);sfx('warn');stopTravel();m.wt=14;
   msg(`The ${m.n} SHRIEKS!${n?` ${n} more hear it.`:''}`,'bad');return 'acted'}
  if(cd<=3&&stepAway(m,p))return 'moved';
  return cd<=6?'acted':false}
 if(m.role==='brood'){
  if((m.sp||0)>0)m.sp--;
  else if(cd<=8&&G.mons.filter(o=>o.from===m.id&&!o.dead).length<3){const f=freeAdj(m);
   if(f){spawn('maggot',f,{alert:true,from:m.id,grp:m.grp});m.sp=4;addFX('puff',{org:m,col:'#a08050',r:22,life:28});msg(`The ${m.n} births a maggot.`,'warn');return 'acted'}}
  return false}
 return false}
// a hostile next to one of your minions (and not next to you) hits the minion instead
function hostileVsAlly(m,cd){if(cd<=1)return false;const al=G.mons.find(o=>o.ally&&!o.dead&&cheb(m,o)<=1);if(!al)return false;
 if(al.k==='clone'&&R()<.92){lunge(m,al.x,al.y);G.floaters.push({x:al.x,y:al.y,t:'dodge',c:'#bdf',l:22});return true} // shadow clones slip most blows
 const d=Math.max(1,rnd(m.a[0],m.a[1])-1);al.hp-=d;lunge(m,al.x,al.y);G.floaters.push({x:al.x,y:al.y,t:'-'+d,c:'#f66',l:22});blood(al.x,al.y,5);
 if(al.hp<=0)kill(al);return true}
function allyAct(m){const p=G.p;
 if(m.k!=='clone'&&--m.life<=0){msg(`Your ${m.n} crumbles back into the dark.`,'info');removeMon(m);return}
 if(m.k==='clone'){cloneAct(m);return}
 let t=null,bd=99;for(const o of G.mons){if(o.ally||o.dead||!G.vis[o.y][o.x])continue;const d=cheb(m,o);if(d<bd){bd=d;t=o}}
 const toward=(tx,ty)=>{let best=null,b=cheb(m,{x:tx,y:ty});
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const x=m.x+dx,y=m.y+dy;if(!walk(x,y)||monAt(x,y)||(x===p.x&&y===p.y))continue;const d=Math.max(Math.abs(x-tx),Math.abs(y-ty));if(d<b){b=d;best=[x,y]}}
  if(best){if(best[0]!==m.x)m.fx=Math.sign(best[0]-m.x);moveMon(m,best[0],best[1])}};
 if(t&&bd<=7){if(bd<=1){const d=rnd(m.a[0],m.a[1])+1;t.hp-=d;t.alert=true;lunge(m,t.x,t.y);G.floaters.push({x:t.x,y:t.y,t:'-'+d,c:'#9fe',l:22});blood(t.x,t.y,5);if(t.hp<=0)kill(t)}else toward(t.x,t.y)}
 else if(cheb(m,p)>2)toward(p.x,p.y)}
function spawnAlly(k,life){const f=freeAdj(G.p);if(!f)return null;
 const m=spawn(k,f,{ally:true,alert:true,life,grp:-1,from:'p'});m.hp=m.max=Math.max(m.hp,6+Math.floor(G.depth/2));m.n='Raised '+MON[k].n;addFX('puff',{org:m,col:'#7fd8c8',r:24,life:28});return m}
function monstersAct(moveOnly){
 const p=G.p,s=stat();G.mstag=30;
 // pack wake-up: once any member of a room's pack is hunting you, the whole pack joins in
 let woke=0;for(const m of G.mons)if(m.alert&&!m.ally&&m.grp>=0)for(const o of G.mons)if(!o.alert&&!o.ally&&o.grp===m.grp){o.alert=true;woke++}
 if(woke){msg('The pack stirs and turns toward you.','warn');if(!chase)stopTravel();sfx('warn')}
 const D=Array.from({length:H},()=>new Array(W).fill(999));D[p.y][p.x]=0;const q=[[p.x,p.y]];
 for(let i=0;i<q.length;i++){const [x,y]=q[i];if(D[y][x]>=24)continue;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy;if(!walk(nx,ny)||D[ny][nx]!==999)continue;D[ny][nx]=D[y][x]+1;q.push([nx,ny])}}
 for(const m of [...G.mons]){
  if(m.dead)continue;
  if(m.stun>0){m.stun--;m.warning=null;continue}
  if(m.ally){if(!moveOnly)allyAct(m);continue}
  if(m.slow>0){m.slow--;if(G.turn%2===0){G.floaters.push({x:m.x,y:m.y,t:'slow',c:'#8ab',l:16});continue}}
  const rooted=m.root>0;if(rooted)m.root--; // rooted monsters can still strike, but cannot move
  if(moveOnly&&m.warning)continue; // extra move-only pass never resolves a telegraphed attack early
 if(m.warning){const w=m.warning;m.warning=null;
  if(p.x===w.x&&p.y===w.y&&los(m.x,m.y,p.x,p.y)&&Math.max(Math.abs(p.x-m.x),Math.abs(p.y-m.y))<=(w.ranged?m.rng||6:1)){
   attackFx(m,w.ranged,w.x,w.y);mattack(m,s,w.ranged,1.5); // the telegraphed blow: slower, but it hits much harder
  }else msg(`The ${m.n}'s attack strikes empty stone.`,'info');
  continue;
 }
  m.en+=m.spd;
  while(m.en>=1&&G.p.hp>0&&!m.dead){m.en-=1;
   const cd=cheb(m,p);
   // each monster notices you by your light, or by its own sight radius with a clear line; playing dead hides you from both
   const sees=!p.cloak&&(G.vis[m.y][m.x]||(cd<=(m.sight||5)&&los(m.x,m.y,p.x,p.y)));if(sees&&!m.alert){m.alert=true;if(chase!==m)stopTravel()} // the enemy you are charging noticing you does not stop the charge
   if(!m.alert){if(R()<.25){const dx=rnd(-1,1),dy=rnd(-1,1);if(walk(m.x+dx,m.y+dy)&&G.map[m.y+dy][m.x+dx]!==2&&!monAt(m.x+dx,m.y+dy)&&!(m.x+dx===p.x&&m.y+dy===p.y)){moveMon(m,m.x+dx,m.y+dy);if(dx)m.fx=dx}}continue}
   if(!moveOnly&&hostileVsAlly(m,cd))break;
   if(m.role&&!moveOnly){const r=roleAct(m,cd);if(r==='acted')break;if(r==='moved')continue}
   if(m.erratic&&cd>1&&!rooted&&R()<m.erratic){const dx=rnd(-1,1),dy=rnd(-1,1);if(walk(m.x+dx,m.y+dy)&&!monAt(m.x+dx,m.y+dy)&&!(m.x+dx===p.x&&m.y+dy===p.y)){moveMon(m,m.x+dx,m.y+dy);if(dx)m.fx=dx}continue}
   if(m.rng&&cd<=2&&!rooted&&!moveOnly&&sees&&R()<.55&&stepAway(m,p))continue; // ranged units back off to keep their distance
   if(cd<=1){m.fx=Math.sign(p.x-m.x)||m.fx;if(!moveOnly)engage(m,s,false);break}
   if(m.rng&&sees&&cd<=m.rng&&los(m.x,m.y,p.x,p.y)){if(!moveOnly)engage(m,s,true);break}
   if(rooted)break;
   let best=null,bd=D[m.y][m.x];
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=m.x+dx,ny=m.y+dy;
    if(!walk(nx,ny)||monAt(nx,ny)||(nx===p.x&&ny===p.y))continue;
    if(D[ny][nx]<bd){bd=D[ny][nx];best=[nx,ny]}}
   if(best){if(G.map[best[1]][best[0]]===2)G.map[best[1]][best[0]]=5;if(best[0]!==m.x)m.fx=Math.sign(best[0]-m.x);moveMon(m,best[0],best[1])}}}}
// ---- per-turn world effects: boss behaviours, bone barricades, and the Reek ----
function bossTick(){
 for(const m of [...G.mons]){const tk=m.tick;if(!tk||m.dead||!m.alert)continue;
  if(tk.fn==='enrage'){if(!m.enraged&&m.hp<m.max*.5){m.enraged=true;m.spd=1.5;msg(`The ${m.n} ROARS and thrashes faster!`,'bad');G.shake=8;addFX('ring',{org:m,col:'#ff4040',r:70,life:26});sfx('warn')}continue}
  if(G.turn%tk.every)continue;
  if(tk.fn==='rally'){let n=0;for(const o of G.mons)if(!o.ally&&!o.dead&&cheb(m,o)<=6){if(o.hp<o.max){o.hp=Math.min(o.max,o.hp+3);n++;addFX('heal',{org:o,life:26})}o.alert=true}
   if(n)msg(`The ${m.n} rallies its servants.`,'warn');continue}
  const mine=G.mons.filter(o=>o.from===m.id&&!o.dead).length;if(mine>=tk.max)continue;
  const f=freeAdj(m);if(!f)continue;const k=Array.isArray(tk.k)?pick(tk.k):tk.k;
  spawn(k,f,{alert:true,from:m.id,grp:m.grp});addFX('puff',{org:m,col:tk.fn==='reinforce'?'#9fb0c8':'#a08050',r:26,life:30});
  msg(tk.fn==='reinforce'?`${m.n} calls for reinforcements!`:`The ${m.n} births another maggot.`,'bad');sfx('warn')}}
// ---- The Reek: a per-stage clock ----
// Every stage gives you a budget of turns to reach its boss floor (floors 5, 10, 15 and 20): REEK_PER_FLOOR turns for each of the
// stage's floors. Run out before you arrive and the Reek starts hunting you. It then follows you down each floor of the stage until you
// reach the boss floor or kill it. Each new stage starts a fresh clock.
const REEK_PER_FLOOR=350,REEK_BUDGET=REEK_PER_FLOOR*STAGE_LEN,REEK_WARN_AT=.8;
const bossFloor=idx=>(idx+1)*STAGE_LEN;
// turns left on this stage's clock, or null when the clock is off (boss floor reached, or the Reek was killed)
function reekLeft(){const i=G.regIdx;if(G.depth>=bossFloor(i)||(G.reekState&&G.reekState[i]==='dead'))return null;return Math.max(0,REEK_BUDGET-((G.stageTurns&&G.stageTurns[i])||0))}
function summonReek(){
 const far=G.rooms.slice(1).sort((a,b)=>Math.hypot(b.cx-G.p.x,b.cy-G.p.y)-Math.hypot(a.cx-G.p.x,a.cy-G.p.y))[0];
 let pos=null;for(let i=0;i<40&&!pos;i++){const x=rnd(far.x,far.x+far.w-1),y=rnd(far.y,far.y+far.h-1);if(G.map[y][x]===1&&!monAt(x,y))pos={x,y}}
 if(pos){const m=spawn('stalker',pos,{alert:true,grp:-1});if(G.reekHp)m.hp=Math.min(m.max,G.reekHp);sfx('death');G.shake=8;return true}return false}
function reekCheck(){
 G.stageTurns=G.stageTurns||{};G.reekState=G.reekState||{};const i=G.regIdx;
 if(G.depth>=bossFloor(i)||G.reekState[i]==='dead')return; // you made it to the boss (or killed it): this stage's clock is off
 const n=G.stageTurns[i]=(G.stageTurns[i]||0)+1;
 if(n===Math.round(REEK_BUDGET*REEK_WARN_AT)){msg(`A foul smell drifts closer. ${REEK_BUDGET-n} turns left to reach the boss before the Reek comes.`,'bad');showHint('The Reek is tracking you. Reach the stage boss before the clock runs out.')}
 if(n>=REEK_BUDGET&&!G.reekState[i]){G.reekState[i]='active';if(summonReek()){msg('THE REEK has found you. It will follow you down until you reach the boss.','bad');showHint('THE REEK: relentless and strong. Run for the boss, or kill it for a guaranteed graft.')}}}function worldTick(){
 for(const b of [...(G.barr||[])])if(G.turn>=b.t){if(G.map[b.y][b.x]===7)G.map[b.y][b.x]=1;G.barr.splice(G.barr.indexOf(b),1)}
 bossTick();reekCheck()}// A monster's attack is either a quick strike that lands right away (lighter, and stepping aside cannot dodge it) or, some of the
// time, a telegraphed HEAVY blow: a red tile now, a much harder hit next turn. `heavy` is the chance of the heavy kind per monster.
function attackFx(m,ranged,tx,ty){
 if(ranged){const rk={rifleman:["bullet","#ffd070"],scientist:["lob","#9ad030"],acolyte:["bolt","#c060ff"],cultist:["bolt","#ffd040"]}[m.k]||["bolt","#ff7040"];addFX(rk[0],{org:m,tgt:G.p,col:rk[1],life:rk[0]==="bullet"?14:rk[0]==="lob"?24:18})}
 else G.attackFX.push({x:m.x,y:m.y,tx,ty,life:18,max:18,ranged:false})}
function engage(m,s,ranged){
 const heavy=m.heavy!==undefined?m.heavy:.35;
 if(R()<heavy){warnAttack(m,ranged);return}
 attackFx(m,ranged,G.p.x,G.p.y);mattack(m,s,ranged,.8)}
function warnAttack(m,ranged){m.warning={x:G.p.x,y:G.p.y,ranged};stopTravel();sfx('warn');hintOnce('warning');msg(`The ${m.n} prepares ${ranged?'a hex':'a heavy blow'}! Move off the red tile.`,'warn')}
function mattack(m,s,ranged,mult=1){
 const p=G.p;
 if(!ranged)lunge(m,p.x,p.y);
 if(R()<.15){msg(`The ${m.n} misses you.`);return}
 const dg=fx('dodge');if(dg&&R()<.1*dg){msg(`You sway aside from the ${m.n}.`,'good');return}
 const roll=Math.max(1,Math.round((rnd(m.a[0],m.a[1])+Math.floor(G.depth/4))*mult));let d=Math.max(1,Math.ceil(roll*.25),roll-s.def);
 if(fx('ward')&&!G.ward[G.depth]){G.ward[G.depth]=true;d=Math.max(1,Math.ceil(d/2));msg('Your bone ward absorbs half the blow.','info')}
 hurt(d);msg(`${ranged?(mult>1?'A hex from the':'A shot from the'):'The'} ${m.n} ${ranged?(mult>1?'sears':'strikes'):(mult>1?'rips':'hits')} you for ${d}.`,'bad');
 if(m.role==='leech'&&!G.god){p.drain=Math.min(10,(p.drain||0)+1);msg('The leech siphons your marrow. (max HP -1)','bad')}
 if(ranged)for(let i=0;i<8;i++)G.parts.push({x:m.x*T+16,y:m.y*T+16,vx:(p.x-m.x)*2+R()-.5,vy:(p.y-m.y)*2+R()-.5,l:14,c:'#ffd040',s:2});
 const th=fx('thorns');if(!ranged&&th){m.hp-=th;G.floaters.push({x:m.x,y:m.y,t:'-'+th,c:'#9c3',l:20});if(m.hp<=0)kill(m)}
 if(d>=8&&p.eq.torso&&p.eq.torso.fx==='gas'){msg('Your Bloat Belly bursts!','warn');p.eq.torso=null;for(const o of [...G.mons])if(!o.ally&&Math.max(Math.abs(o.x-p.x),Math.abs(o.y-p.y))<=1){o.hp-=4;G.floaters.push({x:o.x,y:o.y,t:'-4',c:'#9c3',l:25});if(o.hp<=0)kill(o)}blood(p.x,p.y,24,'#9ad030',3)}
 const c=['head','torso','legs'].filter(k=>p.eq[k]);if(c.length&&R()<.5)wear(pick(c),.25)}
function die(){const p=G.p,ri=p.inv.findIndex(i=>i.id==='rites');
 if(ri>=0){p.inv.splice(ri,1);selItem=null;p.hp=Math.ceil(stat().hp/2);msg('The Last Rites drag you back from the dark!','good');blood(p.x,p.y,30,'#d8a830',3);ui();return}
 G.over=true;sfx('death');ui();showOver('YOU ARE UNDEAD ... NO MORE',resultHtml(`Slain in ${G.reg.n}, depth ${G.depth}.`,finishRun(false)))}
function win(){sfx('win');G.over=true;showOver('THE HUNGER ENDS',resultHtml('You devoured The Surgeon.',finishRun(true)))}
function showOver(t,b){document.getElementById('ot').textContent=t;document.getElementById('ob').innerHTML=b;document.getElementById('over').style.display='flex'}
let chase=null,chaseTimer=null; // tap an enemy: walk up to it and strike
function stopTravel(){travel=null;clearTimeout(travelTimer);chase=null;clearTimeout(chaseTimer);stopRest()}
function startChase(m){stopTravel();chase=m;stepChase()}
function stepChase(){
 const m=chase,p=G.p;
 if(!m||m.dead||G.over||paused||!G.mons.includes(m)||!G.vis[m.y][m.x]){chase=null;return} // lost sight of it: give up
 if(cheb(m,p)<=1){chase=null;playerAct(m.x-p.x,m.y-p.y);return} // arrived: one strike, then you are back in control
 const path=pathTo(m.x,m.y);
 if(!path||!path.length){chase=null;msg(`You cannot reach the ${m.n}.`,'warn');return}
 const n=path[0];playerAct(n[0]-p.x,n[1]-p.y);p.cruise=NOW+TRAVEL_MS*2.5;
 if(chase===m)chaseTimer=setTimeout(stepChase,TRAVEL_MS)} // a hit on you or any key press calls stopTravel, which cancels the chase
// Rest: wait repeatedly until healed, interrupted by an enemy in view, damage, hunger, or 150 turns.
let resting=false,restTimer=null,restLeft=0;
function stopRest(){resting=false;clearTimeout(restTimer)}
const enemyInView=()=>G.mons.some(m=>!m.ally&&G.vis[m.y][m.x]&&(m.alert||Math.max(Math.abs(m.x-G.p.x),Math.abs(m.y-G.p.y))<=5));
function startRest(){
 if(G.over||paused)return;const p=G.p;
 if(enemyInView()){msg('You cannot rest with enemies in view.','warn');return}
 if(p.hp>=stat().hp){msg('You are as whole as the dead get.','info');return}
 if(p.hunger>=75&&!fx('regen')){msg('Too hungry to heal by resting. Eat something.','warn');return}
 resting=true;restLeft=150;restStep()}
function restStep(){
 if(!resting)return;const p=G.p,hp0=p.hp;
 if(G.over||paused||enemyInView()||p.hp>=stat().hp||restLeft--<=0||p.hunger>=75&&!fx('regen')){stopRest();return}
 playerAct(0,0);if(p.hp<hp0||G.over){stopRest();return}
 restTimer=setTimeout(restStep,70)}
// Scent: spend a turn to sense the layout nearby and mark where enemies lurk (even in the dark).
function scentAct(){
 if(G.over||paused)return;stopTravel();
 scentEffects();sfx('use');endTurn(false,true)}
function scentEffects(){const p=G.p;
 for(let y=Math.max(0,p.y-8);y<=Math.min(H-1,p.y+8);y++)for(let x=Math.max(0,p.x-8);x<=Math.min(W-1,p.x+8);x++)if((x-p.x)**2+(y-p.y)**2<=64)G.seen[y][x]=true;
 let n=0;for(const m of G.mons)if(!m.ally&&Math.max(Math.abs(m.x-p.x),Math.abs(m.y-p.y))<=10){n++;G.floaters.push({x:m.x,y:m.y,t:'!',c:'#e55',l:70})}
addFX('sonar',{org:G.p,col:'#e55',r:T*8,life:36});
 msg(n?`You sniff the air. ${n} presence${n>1?'s':''} nearby.`:'You sniff the air. Nothing stirs nearby.','info')}
function pathTo(tx,ty){
 const p=G.p,prev=new Map(),key=(x,y)=>y*W+x,q=[[p.x,p.y]];prev.set(key(p.x,p.y),null);
 for(let i=0;i<q.length;i++){const [x,y]=q[i];if(x===tx&&y===ty)break;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy;if((!dx&&!dy)||!walk(nx,ny)||!G.seen[ny][nx]||prev.has(key(nx,ny)))continue;
   // stairs are exits, not corridors: only path onto them when they are the destination (otherwise a tap beside them took the stairs by accident)
   if(!(nx===tx&&ny===ty)&&((nx===G.sD.x&&ny===G.sD.y)||(nx===G.sU.x&&ny===G.sU.y)))continue;
   prev.set(key(nx,ny),[x,y]);q.push([nx,ny])}}
 if(!prev.has(key(tx,ty)))return null;const path=[];let c=[tx,ty];while(c&&!(c[0]===p.x&&c[1]===p.y)){path.unshift(c);c=prev.get(key(c[0],c[1]))}return path}
// Travel only stops for real threats: a monster that newly comes into view, or a hunting one within 6 tiles.
// Sleepers you already know about no longer block clicking to move, and the first step always happens.
let travelSeen=new Set();
function startTravel(tx,ty){const path=pathTo(tx,ty);if(!path||!path.length)return;travel=path;travelSeen=new Set(G.mons.filter(m=>!m.ally&&G.vis[m.y][m.x]));stepTravel(true)}
function stepTravel(first){
 if(!travel||!travel.length||G.over||paused){stopTravel();return}
 if(first!==true){const p=G.p,threat=G.mons.find(m=>!m.ally&&G.vis[m.y][m.x]&&(!travelSeen.has(m)||(m.alert&&Math.max(Math.abs(m.x-p.x),Math.abs(m.y-p.y))<=6)));
  if(threat){stopTravel();msg(`The ${threat.n} ${travelSeen.has(threat)?'closes in':'comes into view'}.`,'warn');return}}
 const n=travel.shift(),p=G.p;playerAct(n[0]-p.x,n[1]-p.y);p.cruise=NOW+TRAVEL_MS*2.5;
 if(travel)travelTimer=setTimeout(stepTravel,TRAVEL_MS)}
