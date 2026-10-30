// Active graft abilities. Select an attached part on your body, then press its ability button.
// Each ability takes a turn and then recharges for `cd` turns. Abilities act on adjacent enemies or the nearest visible one,
// so no targeting step is needed. run() returns false (and spends nothing) when there is nothing to act on.
// Every ability plays its own effect (see drawFX in render.js): whips, floating eyes, tracers, lobbed acid, shockwaves...
const adjacentEnemies=()=>{const p=G.p;return G.mons.filter(m=>!m.dead&&!m.ally&&Math.max(Math.abs(m.x-p.x),Math.abs(m.y-p.y))<=1)};
const finish=m=>{if(m.hp<=0&&!m.dead)kill(m)};
// single-target adjacent abilities hit the tapped enemy if one was chosen, else the first one next to you
const pickAdj=a=>pickedTarget&&a.includes(pickedTarget)?pickedTarget:a[0];
const needAdj=()=>{const a=adjacentEnemies();if(!a.length)msg('No enemy is adjacent.','warn');return a};
function targetWithin(r){const p=G.p;
 if(pickedTarget){const m=pickedTarget; // the player chose this target by tapping it
  if(!m.dead&&!m.ally&&G.vis[m.y][m.x]&&cheb(m,p)<=r&&(r<=1||los(p.x,p.y,m.x,m.y)))return m;msg("That target is out of range.","warn");return null}
 let best=null,bd=99;
 for(const m of G.mons){if(m.dead||m.ally||!G.vis[m.y][m.x])continue;const d=Math.max(Math.abs(m.x-p.x),Math.abs(m.y-p.y));if(d<=r&&d<bd&&los(p.x,p.y,m.x,m.y)){bd=d;best=m}}
 if(!best)msg('No target in range.','warn');return best}
// ranged hit: deals damage, queues the matching projectile effect
const shot=(t,dmg,col,kind='bolt',life=16)=>{t.hp-=dmg;t.alert=true;addFX(kind,{org:G.p,tgt:t,col,life});
 G.floaters.push({x:t.x,y:t.y,t:'-'+dmg,c:col||'#fc6',l:25});blood(t.x,t.y,7)};
const fxAt=(kind,m,col,life,extra)=>addFX(kind,{org:G.p,tgt:m,col,life,...extra});
const ABIL={
 a_scythe:{n:'Whirl',cd:8,desc:'Strike every adjacent enemy.',run:()=>{const a=needAdj();if(!a.length)return false;
  lunge(G.p,a[0].x,a[0].y);addFX('whirl',{org:G.p,life:20});for(const m of a){fxAt('impact',m,'#fff',16,{delay:4});strike(m);finish(m)}msg(`You whirl the scythe through ${a.length} enem${a.length>1?'ies':'y'}.`,'good')}},
 a_gfist:{n:'Ground Slam',cd:12,desc:'Stun every adjacent enemy for a turn and hit them for 2.',run:()=>{const a=needAdj();if(!a.length)return false;
  G.shake=8;addFX('ring',{org:G.p,col:'#d8c090',r:64,debris:true,life:24});
  for(const m of a){m.hp-=2;m.stun=1;m.alert=true;G.floaters.push({x:m.x,y:m.y,t:'stun',c:'#fe6',l:25});blood(m.x,m.y,8);finish(m)}msg('The ground buckles under your fist.','good')}},
 a_saw:{n:'Butcher',cd:10,desc:'Triple-damage strike on one adjacent enemy. Costs 6 rot.',run:(e,k)=>{const a=needAdj();if(!a.length)return false;
  const m=pickAdj(a);lunge(G.p,m.x,m.y);fxAt('slash',m,'#ffe0a0',22);const d=strike(m);m.hp-=d*2;G.floaters.push({x:m.x,y:m.y,t:'-'+d*3,c:'#fc6',l:30});wear(k,6);msg(`The bonesaw butchers the ${m.n} for ${d*3}.`,'good');finish(m)}},
 a_hook:{n:'Rend Open',cd:8,desc:'Every adjacent enemy bleeds for 5 turns.',run:()=>{const a=needAdj();if(!a.length)return false;
  for(const m of a){m.bleed=5;m.alert=true;fxAt('claws',m,'#e8e0c8',22);G.floaters.push({x:m.x,y:m.y,t:'bleed',c:'#c33',l:25});blood(m.x,m.y,6)}msg('The hook tears them open.','good')}},
 t_belly:{n:'Vent Gas',cd:12,desc:'Poison every adjacent enemy for 5 turns.',run:()=>{const a=needAdj();if(!a.length)return false;
  addFX('puff',{org:G.p,col:'#9ad030',r:34,life:34});for(const m of a){m.poison=5;m.alert=true;G.floaters.push({x:m.x,y:m.y,t:'gas',c:'#9c3',l:25})}msg('Your belly sighs out a green cloud.','good')}},
 h_bloat:{n:'Acid Spit',cd:8,desc:'Spit at the nearest enemy (range 5) for 4 damage and poison.',run:()=>{const t=nearestTarget();if(!t){msg('No target in range.','warn');return false}
  shot(t,4,'#9ad030','lob',24);t.poison=5;msg(`You spit acid at the ${t.n}.`,'good');finish(t)}},
 h_crow:{n:'Carrion Call',cd:20,desc:'Sense nearby enemies and the layout, like Scent.',run:()=>{scentEffects()}},
 t_rib:{n:'Bone Ward',cd:25,desc:'Renew your Bone Ward on this floor.',run:()=>{G.ward[G.depth]=false;addFX('ward',{org:G.p,col:'#cfe8ff',life:34});msg('Your ribs knit a fresh ward.','good')}},
 t_slab:{n:'Stone Skin',cd:30,desc:'Heal 8 HP.',run:()=>{const p=G.p;p.hp=Math.min(stat().hp,p.hp+8);addFX('heal',{org:p,life:34});G.floaters.push({x:p.x,y:p.y,t:'+8',c:'#8d6',l:25});msg('Your hide knits itself shut. (+8 HP)','good')}},
 l_runner:{n:'Burst of Speed',cd:20,desc:'Your next 4 moves are free.',run:()=>{G.p.burst=4;addFX('streak',{org:G.p,dir:G.p.face,life:26});msg('Your legs coil. The next steps cost no time.','good')}},
 l_crow:{n:'Skitter',cd:15,desc:'Your next 3 moves are free.',run:()=>{G.p.burst=3;addFX('streak',{org:G.p,dir:G.p.face,life:24});msg('You skitter on hooked feet.','good')}}};

// ---- abilities for parts dropped by the wider bestiary ----
Object.assign(ABIL,{
 a_bloatarm:{n:'Pop',cd:10,desc:'Burst the swollen arm over adjacent enemies: 3 damage and poison.',run:()=>{const a=needAdj();if(!a.length)return false;
  for(const m of a){m.hp-=3;m.poison=4;m.alert=true;fxAt('puff',m,'#9ad030',30,{atTarget:true,r:20});G.floaters.push({x:m.x,y:m.y,t:'-3',c:'#9c3',l:25});blood(m.x,m.y,8,'#9ad030',2);finish(m)}}},
 h_ghoul:{n:'Ravenous Bite',cd:12,desc:'Bite an adjacent enemy and heal for the damage dealt.',run:()=>{const a=needAdj();if(!a.length)return false;
  const m=pickAdj(a);lunge(G.p,m.x,m.y);fxAt('bite',m,'#ece4cc',24);const d=strike(m);G.p.hp=Math.min(stat().hp,G.p.hp+d);G.floaters.push({x:G.p.x,y:G.p.y,t:'+'+d,c:'#8d6',l:25});msg(`You tear into the ${m.n} and feed (+${d}).`,'good');finish(m)}},
 h_acolyte:{n:'Evil Eye',cd:14,desc:'Freeze the nearest enemy (range 5) for 2 turns.',run:()=>{const t=targetWithin(5);if(!t)return false;
  t.stun=2;t.alert=true;t.warning=null;fxAt('eye',t,'#c060ff',54);G.floaters.push({x:t.x,y:t.y,t:'stun',c:'#fe6',l:30})}},
 a_acolyte:{n:'Hex Bolt',cd:8,desc:'Bolt the nearest enemy (range 5): 3 damage and slow.',run:()=>{const t=targetWithin(5);if(!t)return false;
  shot(t,3,'#c9a0ff','bolt',18);t.slow=5;msg(`A hex bolt wracks the ${t.n}.`,'good');finish(t)}},
 a_warden:{n:'Shield Bash',cd:10,desc:'Smash one adjacent enemy: 3 damage and stun for 2 turns.',run:()=>{const a=needAdj();if(!a.length)return false;
  const m=pickAdj(a);lunge(G.p,m.x,m.y);m.hp-=3;m.stun=2;m.alert=true;m.warning=null;G.shake=6;fxAt('impact',m,'#ffd070',18);fxAt('ring',m,'#ffd070',18,{atTarget:true,r:30});
  G.floaters.push({x:m.x,y:m.y,t:'-3',c:'#fc6',l:25},{x:m.x,y:m.y,t:'stun',c:'#fe6',l:30});blood(m.x,m.y,8);finish(m)}},
 t_matron:{n:'Afterbirth',cd:28,desc:'Heal 12 HP.',run:()=>{const p=G.p;p.hp=Math.min(stat().hp,p.hp+12);addFX('heal',{org:p,life:38});G.floaters.push({x:p.x,y:p.y,t:'+12',c:'#8d6',l:25});msg('The womb pulses and knits you back together. (+12 HP)','good')}},
 a_nyx:{n:'Lash',cd:6,desc:'Whip the nearest enemy within 3 tiles for 4-7 + attack, dragging it one tile closer.',run:()=>{const t=targetWithin(3);if(!t)return false;
  const p=G.p,d=rnd(4,7)+stat().atk;shot(t,d,'#c9a0ff','whip',32);
  const nx=t.x+Math.sign(p.x-t.x),ny=t.y+Math.sign(p.y-t.y);
  if(Math.max(Math.abs(t.x-p.x),Math.abs(t.y-p.y))>1&&walk(nx,ny)&&!monAt(nx,ny)&&!(nx===p.x&&ny===p.y)){setPos(t,nx,ny)}
  msg(`Nyx Lash cracks across the ${t.n} for ${d}.`,'good');finish(t)}},
 h_abom:{n:'Paralytic Gaze',cd:20,desc:'Freeze every visible enemy within 5 tiles for a turn.',run:()=>{const p=G.p;let n=0;
  for(const m of G.mons)if(!m.dead&&!m.ally&&G.vis[m.y][m.x]&&Math.max(Math.abs(m.x-p.x),Math.abs(m.y-p.y))<=5){m.stun=1;m.alert=true;m.warning=null;fxAt('eye',m,'#ff4fd0',56,{delay:n*5});n++;G.floaters.push({x:m.x,y:m.y,t:'stun',c:'#fe6',l:30})}
  if(!n){msg('Nothing to stare at.','warn');return false}msg(`Your eyes lock ${n} enem${n>1?'ies':'y'} in place.`,'good')}},
 a_rifle:{n:'Gunshot',cd:7,desc:'Shoot the nearest enemy within 6 tiles for 6-10 + attack.',run:()=>{const t=targetWithin(6);if(!t)return false;
  const d=rnd(6,10)+stat().atk;shot(t,d,'#ffd070','bullet',14);G.shake=5;msg(`The rifle barks. The ${t.n} takes ${d}.`,'good');finish(t)}},
 t_sci:{n:'Stim',cd:25,desc:'Inject yourself: heal 6 HP and ease hunger by 10.',run:()=>{const p=G.p;p.hp=Math.min(stat().hp,p.hp+6);p.hunger=Math.max(0,p.hunger-10);addFX('heal',{org:p,life:30});G.floaters.push({x:p.x,y:p.y,t:'+6',c:'#8d6',l:25});msg('A cold rush floods your veins. (+6 HP)','good')}},
 a_sci:{n:'Inject',cd:10,desc:'Stab one adjacent enemy: 2 damage and a heavy poison (8 turns).',run:()=>{const a=needAdj();if(!a.length)return false;
  const m=pickAdj(a);lunge(G.p,m.x,m.y);m.hp-=2;m.poison=8;m.alert=true;fxAt('impact',m,'#9ad030',20);G.floaters.push({x:m.x,y:m.y,t:'-2',c:'#9c3',l:25});msg(`The syringe empties into the ${m.n}.`,'good');finish(m)}},
 h_mask:{n:'Anesthetize',cd:18,desc:'Stun every adjacent enemy for 2 turns.',run:()=>{const a=needAdj();if(!a.length)return false;
  addFX('puff',{org:G.p,col:'#bcd8ff',r:36,life:34});for(const m of a){m.stun=2;m.alert=true;m.warning=null;G.floaters.push({x:m.x,y:m.y,t:'stun',c:'#fe6',l:30})}msg('A sweet gas puts them under.','good')}}});
// ---- constructors for ability types (descriptions are generated from the numbers) ----
const A={
 heal:(n,cd,amt,hunger)=>({n,cd,desc:`Heal ${amt} HP${hunger?` and ease hunger by ${hunger}`:''}.`,run:()=>{const p=G.p;p.hp=Math.min(stat().hp,p.hp+amt);if(hunger)p.hunger=Math.max(0,p.hunger-hunger);addFX('heal',{org:p,life:32});G.floaters.push({x:p.x,y:p.y,t:'+'+amt,c:'#8d6',l:25});msg(`You mend yourself. (+${amt} HP)`,'good')}}),
 line:(n,cd,len,base)=>({n,cd,desc:`Lash a ${len}-tile line toward the nearest enemy: ${base}-${base+2} + attack to everything in it.`,run:()=>{
  const t=targetWithin(len);if(!t)return false;const p=G.p,ex=t.x-p.x,ey=t.y-p.y,far=Math.max(Math.abs(ex),Math.abs(ey)),hit=[];
  // the line runs through the target (not just along the nearest of 8 directions, which missed targets at knight's-move offsets)
  for(let i=1;i<=len;i++){const x=p.x+Math.round(ex/far*i),y=p.y+Math.round(ey/far*i);if(!walk(x,y))break;const m=monAt(x,y);if(m&&!m.ally&&!hit.includes(m))hit.push(m)}
  hit.forEach((m,i)=>{const d=rnd(base,base+2)+stat().atk;m.hp-=d;m.alert=true;fxAt('whip',m,'#e0a0ff',30,{delay:i*3});G.floaters.push({x:m.x,y:m.y,t:'-'+d,c:'#fc6',l:25});blood(m.x,m.y,6)});
  msg(`A tendril sweeps ${hit.length} enem${hit.length===1?'y':'ies'}.`,'good');for(const m of hit)finish(m)}}),
 root:(n,cd,dur,drain)=>({n,cd,desc:`Latch onto an adjacent enemy: it cannot move for ${dur-1} turns${drain?` and you drain ${drain} HP from it`:''}.`,run:()=>{
  const a=needAdj();if(!a.length)return false;const m=pickAdj(a);lunge(G.p,m.x,m.y);m.root=dur;m.alert=true;fxAt('bite',m,'#c070c0',24);
  if(drain){m.hp-=drain;G.p.hp=Math.min(stat().hp,G.p.hp+drain);G.floaters.push({x:m.x,y:m.y,t:'-'+drain,c:'#c9f',l:25},{x:G.p.x,y:G.p.y,t:'+'+drain,c:'#8d6',l:25})}
  G.floaters.push({x:m.x,y:m.y,t:'root',c:'#fb4',l:28});msg(`You latch onto the ${m.n}.`,'good');finish(m)}}),
 alert:(n,cd,r)=>({n,cd,desc:`Wake every enemy within ${r} tiles and draw them to you.`,run:()=>{
  let c=0;for(const m of G.mons)if(!m.ally&&!m.alert&&cheb(G.p,m)<=r){m.alert=true;c++}
  addFX('sonar',{org:G.p,col:'#ffe0a0',r:T*r,life:40});G.shake=4;stopTravel();msg(c?`Your cry rouses ${c} enem${c>1?'ies':'y'}.`:'Your cry echoes. Nothing new stirs.','warn')}}),
 cloak:(n,cd,turns)=>({n,cd,desc:`Play dead for up to ${turns} turns: hunters lose you and nothing notices you until you attack or are hit.`,run:()=>{
  const p=G.p;p.cloak=turns;for(const m of G.mons)if(!m.ally){m.alert=false;m.warning=null}addFX('ward',{org:p,col:'#aab',life:40});msg('You go limp and still. The dead lose interest.','good')}}),
 boom:(n,cd,dmg)=>({n,cd,desc:`Destroy this part to blast every adjacent enemy for ${dmg}.`,run:(e,k)=>{
  const a=needAdj();if(!a.length)return false;G.shake=9;addFX('ring',{org:G.p,col:'#ff9040',r:60,debris:true,life:26});addFX('puff',{org:G.p,col:'#c08040',r:34,life:30});
  for(const m of a){m.hp-=dmg;m.alert=true;G.floaters.push({x:m.x,y:m.y,t:'-'+dmg,c:'#f93',l:26});blood(m.x,m.y,10,'#c07030',2.2);finish(m)}
  G.p.eq[k]=null;sfx('detach');msg(`Your ${e.name} bursts! (${dmg} to all adjacent)`,'warn');return 'spent'}}),
 ally:(n,cd,k,life,cost)=>({n,cd,desc:`Raise a ${MON[k].n.toLowerCase()} minion that fights for ${life} turns (costs ${cost} HP, max 2).`,run:()=>{
  if(G.mons.filter(m=>m.ally&&!m.dead).length>=2){msg('You cannot control any more minions.','warn');return false}
  if(!spawnAlly(k,life)){msg('No room to raise it.','warn');return false}hurt(cost);msg(`A ${MON[k].n.toLowerCase()} claws free of your body.`,'good')}}),
 wall:(n,cd,turns)=>({n,cd,desc:`Raise a bone barricade in front of you toward the nearest enemy. Blocks everyone for ${turns} turns.`,run:()=>{
  const p=G.p,t=nearestTarget(),dx=t?Math.sign(t.x-p.x):p.face,dy=t?Math.sign(t.y-p.y):0,x=p.x+dx,y=p.y+dy;
  if(!walk(x,y)||monAt(x,y)||G.map[y][x]===2||(x===G.sU.x&&y===G.sU.y)||(x===G.sD.x&&y===G.sD.y)){msg('No room for a barricade there.','warn');return false}
  G.map[y][x]=7;G.barr.push({x,y,t:G.turn+turns});addFX('puff',{org:{x,y,rx:x,ry:y},col:'#d8d0b0',r:20,life:26});msg('Bones knit into a barricade.','good')}}),
 stunAdj:(n,cd,turns)=>({n,cd,desc:`Stun every adjacent enemy for ${turns} turns.`,run:()=>{const a=needAdj();if(!a.length)return false;addFX('puff',{org:G.p,col:'#bcd8ff',r:36,life:34});
  for(const m of a){m.stun=turns;m.alert=true;m.warning=null;G.floaters.push({x:m.x,y:m.y,t:'stun',c:'#fe6',l:30})}msg('A sweet gas puts them under.','good')}})};
Object.assign(ABIL,{
 h_leech:A.root('Latch',12,3,3),
 t_wailer:A.alert('Lure',16,10),
 h_wailer:A.cloak('Play Dead',30,25),
 t_brood:A.boom('Burst Sac',1,8),
 a_brood:A.ally('Fork',14,'maggot',40,2),
 a_mender:A.heal('Mend Wounds',12,7),
 a_medic:A.heal('Triage',18,10,8),
 t_warden:A.wall('Bone Barricade',18,15),
 a_matron:A.line("Tendril Sweep",10,3,3)});
function useAbility(k){
 if(paused||G.over)return;const p=G.p,e=p.eq[k];if(!e)return;const ab=ABIL[e.id];if(!ab)return;
 if(e.cd>0){msg(`${ab.n} is recharging (${e.cd} turns).`,'warn');return}
 stopTravel();
 if(ab.tgt&&!pickedTarget&&aimBegin(()=>useAbility(k),ab.tgt))return; // choose a target first
 const r=ab.run(e,k);if(r===false)return;
 if(e.id!=='h_wailer')G.p.cloak=0; // acting ends 'Play Dead'
 if(r!=='spent')e.cd=ab.cd+1; // +1: endTurn below ticks cooldowns once immediately
 sfx('use');selItem=null;closePack();if(G.over)return;endTurn(false,false)}
computePower(); // abilities are known now: score every graft for its hidden tier
// abilities that aim at one enemy: tap the ability, then tap who to hit (a lone candidate is used automatically)
Object.assign(ABIL.h_bloat,{tgt:5});Object.assign(ABIL.h_acolyte,{tgt:5});Object.assign(ABIL.a_acolyte,{tgt:5});Object.assign(ABIL.a_nyx,{tgt:3});Object.assign(ABIL.a_rifle,{tgt:6});Object.assign(ABIL.a_matron,{tgt:3});
for(const id of ['a_saw','h_ghoul','a_warden','a_sci','h_leech'])Object.assign(ABIL[id],{tgt:1});
