function cloneCanvas(c){const n=document.createElement('canvas');n.width=n.height=32;n.getContext('2d').drawImage(c,0,0);return n}
function describe(it){
 if(it.type==='cons')return `<b>${it.name}</b>${it.count>1?' x'+it.count:''}<br>${CONS[it.id].desc}`;
 const st=it.stats,b=[];if(st.atk)b.push(`+${st.atk} ATK`);if(st.def)b.push(`+${st.def} DEF`);if(st.hp)b.push(`+${st.hp} max HP`);if(st.sight)b.push(`+${st.sight} sight`);if(st.steal)b.push(`life-steal ${st.steal}`);if(st.spd)b.push(`+${Math.round(st.spd*100)}% speed (shrinks as it rots)`);
 const ab=ABIL[it.id],abl=ab?`<br><span class="info">Active: <b>${ab.n}</b> (cooldown ${ab.cd}). ${ab.desc}${it.cd>0?' Recharging: '+it.cd+'.':''}</span>`:'';
 const bg=it.bargain?'<br><span class="good">Bargain graft: it rots 75% slower than normal.</span>':'';
 const tn=!it.known?'<br><span class="warn">Unexamined: may be tainted.</span>':it.taint?`<br><span class="bad">Tainted (${TAINT[it.taint].n}): ${TAINT[it.taint].d}.</span>`:'';
 return `<b>${it.name}</b> (${KINDNAME[it.kind]})<br>${b.join(', ')||'Just meat.'}${it.fxd?'<br>'+it.fxd:''}${abl}${bg}${tn}<br>Rot ${Math.ceil(it.dur)}/${it.maxdur} · Decay ${(it.decay||.18).toFixed(2)}/turn`}
function ui(){
 const p=G.p,s=stat(),set=(id,v,max,txt)=>{const e=document.getElementById(id);e.firstChild.style.width=Math.max(0,Math.min(100,v/max*100))+'%';e.lastChild.textContent=txt};
 set('hp',p.hp,s.hp,`HP ${Math.max(0,p.hp)}/${s.hp}`);set('hu',p.hunger,100,`Hunger ${Math.min(100,Math.floor(p.hunger))}%`);
 const row=(k,v)=>`<div><span>${k}</span><b>${v}</b></div>`;
 document.getElementById('statList').innerHTML=row('Level',`${p.lvl} (${p.xp}/${p.lvl*10} xp)`)+row('Attack',`+${s.atk}`)+row('Defense',`+${s.def}`)+row('Speed',`${s.spd>=0?'+':''}${Math.round(s.spd*100)}%`)+row('Sight',s.sight)+row('Kills',p.kills);
 const modK=(G.mods&&G.mods[G.regIdx])||'standard',left=reekLeft(),hunting=G.reekState&&G.reekState[G.regIdx]==='active'&&left!==null,reek=left===null?'':hunting?' · <b style=\"color:#e55\">THE REEK HUNTS</b>':left<=REEK_BUDGET*.2?`  · <b style=\"color:#e90\">Reek in ${left}</b>`:` · <small style=\"color:#8a7a68\">Reek in ${left}</small>`;
 document.getElementById('where').innerHTML=`Stage ${G.regIdx+1} · ${G.reg.n} · Depth ${G.depth}/${MAX_DEPTH}${modK!=='standard'?' · '+MODS[modK].n:''}${G.p.bargain?' · ☠ Bargain':''}${reek}`;
 const sl=document.getElementById('slots');sl.innerHTML='';
 for(const k of SLOTS){const e=p.eq[k],d=document.createElement('div');d.className='slot'+(selItem&&selItem.eq===k?' sel':'');
  d.appendChild(cloneCanvas(e?itIcon(e):ghostIcon(k)));if(!e)d.firstChild.style.opacity=.35;
  d.insertAdjacentHTML('beforeend',`<small>${SLOTNAME[k]}</small><span class="nm">${e?(e.known&&e.taint?'☣ ':'')+(ABIL[e.id]&&!e.cd?'⚡ ':'')+e.name:'— stump —'}</span>`);
  if(e)d.insertAdjacentHTML('beforeend',`<div class="dur"><i style="width:${e.dur/e.maxdur*100}%"></i></div>`);
  d.onclick=()=>{selItem=e?{eq:k,it:e}:null;ui()};sl.appendChild(d)}
 const iv=document.getElementById('inv');iv.innerHTML='';
 p.inv.forEach((it,idx)=>{const d=document.createElement('div');d.className='inv'+(selItem&&selItem.it===it&&selItem.idx===idx?' sel':'');d.appendChild(cloneCanvas(itIcon(it)));d.title=it.name;
  if(it.count>1)d.insertAdjacentHTML('beforeend',`<b>${it.count}</b>`);
  d.onclick=()=>{selItem={idx,it};ui()};iv.appendChild(d)});
 // ground panel: every item on the player's tile, each picked up individually
 const here=G.items.filter(i=>i.x===p.x&&i.y===p.y),gv=document.getElementById('floor');
 if(selItem&&selItem.ground&&!here.includes(selItem.ground))selItem=null;
 // a selection can go stale (a graft rotted off, was offered at the altar, or the pack was reshuffled): drop it rather than act on the wrong item
 if(selItem&&selItem.eq&&p.eq[selItem.eq]!==selItem.it)selItem=null;
 if(selItem&&selItem.idx!==undefined&&p.inv[selItem.idx]!==selItem.it)selItem=null;
 if(selItem&&selItem.mon&&(selItem.mon.dead||!G.mons.includes(selItem.mon)||!G.vis[selItem.mon.y][selItem.mon.x]))selItem=null;
 gv.innerHTML='';gv.style.display=document.getElementById('floorH').style.display=here.length?'':'none';
 here.forEach(e=>{const d=document.createElement('div');d.className='inv'+(selItem&&selItem.ground===e?' sel':'');d.appendChild(cloneCanvas(itIcon(e.it)));d.title=e.it.name;
  if(e.it.count>1)d.insertAdjacentHTML('beforeend',`<b>${e.it.count}</b>`);
  d.onclick=()=>{selItem={ground:e,it:e.it};ui()};gv.appendChild(d)});
 document.getElementById('packH').textContent=`BACKPACK (${p.inv.length}/${maxInv()})`;
 detail();renderQuick();renderInspect();codexScan();syncMenuPerk();saveRunSoon()}
// Stats button: drops the other stats down / rolls them back up (wired by an inline onclick in index.html, so it never depends on load order)
function toggleStats(){const pn=document.getElementById('statsPanel'),open=pn.style.display==='none';pn.style.display=open?'':'none';
 document.getElementById('statArrow').textContent=open?'▴':'▾';document.getElementById('bStats').setAttribute('aria-expanded',open)}
// ---------- HUD: backpack window, action bar, quick buttons, inspect card ----------
const packEl=()=>document.getElementById('pack');
const packIsOpen=()=>packEl().style.display==='flex';
function openPack(){if(G.over)return;stopTravel();if(selItem&&selItem.mon)selItem=null;packEl().style.display='flex';ui()}
function closePack(){packEl().style.display='none'}
function compareLine(it){ // how a graft in the pack/on the ground stacks up against what's attached to its slot
 if(it.type!=='part')return '';const p=G.p;let slot=it.kind;
 if(it.kind==='arm')slot=!p.eq.armL?'armL':!p.eq.armR?'armR':(p.eq.armL.dur<=p.eq.armR.dur?'armL':'armR');
 // run the real stat() with the graft swapped in, so the numbers include rot-scaled speed, caps and everything else that really applies
 const cur=p.eq[slot],before=stat();p.eq[slot]=it;let after;try{after=stat()}finally{p.eq[slot]=cur}
 const LBL={atk:'ATK',def:'DEF',hp:'HP',sight:'SIGHT',steal:'LIFESTEAL',spd:'SPEED'},d=[];
 for(const k in LBL){const v=k==='spd'?Math.round(after.spd*100)-Math.round(before.spd*100):Math.round(after[k]-before[k]);if(!v)continue;
  d.push(`<span class="${v>0?'good':'bad'}">${v>0?'+':''}${v}${k==='spd'?'%':''} ${LBL[k]}</span>`)}
 const abn=x=>x&&ABIL[x.id]?ABIL[x.id].n:null,na=abn(it),ca=abn(cur);
 if(na&&na!==ca)d.push(`<span class="info">gains ${na}</span>`);if(ca&&ca!==na)d.push(`<span class="warn">loses ${ca}</span>`);
 return `<div class="cmp"><small>${cur?`If attached, replaces ${SLOTNAME[slot]}: ${cur.name}`:`If attached, fills your empty ${SLOTNAME[slot]}`}</small><br>${d.join(' &nbsp; ')||'no stat change'}</div>`}
// ---------- quickslots ----------
// Six fixed slots above the action bar. Each holds a consumable (by item type) or a graft ability (by graft type). Tap to use;
// long-press (or right-click) to choose what the slot holds. A slot keeps its entry even when you run out, so it is ready again
// after a restock. Abilities follow the graft: if it is detached the slot greys out.
const QSLOTS=6;
let hudActions=[]; // Shift+1..6 fire the matching slot
function ensureQuick(p){if(!p.quick)p.quick=[{t:'c',id:'flask'},{t:'c',id:'scrap'},null,null,null,null];if(!p.qSeen)p.qSeen={};return p.quick}
// a newly attached graft with an active ability claims the first empty slot (once, so clearing it sticks)
function autoQuick(it){const p=G.p,q=ensureQuick(p);if(!it||!ABIL[it.id]||p.qSeen[it.id])return;p.qSeen[it.id]=1;const i=q.findIndex(x=>!x);if(i>=0)q[i]={t:'a',id:it.id}}
const attachedSlot=id=>SLOTS.find(s=>G.p.eq[s]&&G.p.eq[s].id===id);
function useQuick(i){
 if(paused||G.over||!inRun())return;const p=G.p,e=ensureQuick(p)[i];
 if(aim){ // a quick second tap on the same slot throws/fires at the nearest enemy; anything else cancels the aim first
  const same=aim.slotIdx===i,quick=performance.now()-aim.t0<AIM_DOUBLE_MS;
  if(same&&quick){aimNearest();return}
  cancelAim();if(same)return}
 curQuick=i;
 if(!e){openQuickPicker(i);return}
 if(e.t==='c'){const it=p.inv.find(x=>x.id===e.id);if(!it){msg(`You have no ${CONS[e.id].n} left.`,'warn');return}selItem={idx:p.inv.indexOf(it),it};useCons()}
 else if(e.t==='d')useDream(e.id);
 else{const k=attachedSlot(e.id);if(!k){msg('That graft is not attached.','warn');return}useAbility(k)}}
function quickIcon(e){
 if(e.t==='d')return dreamIcon(e.id);
 if(e.t==='c'){const it=G.p.inv.find(x=>x.id===e.id);return cloneCanvas(itIcon(it||{type:'cons',id:e.id,col:CONS[e.id].col}))}
 const k=attachedSlot(e.id),t=TPL.find(t=>t.id===e.id);return cloneCanvas(k?itIcon(G.p.eq[k]):bigIcon(REGION[t.kind][t.spr],t.col,3))}
function renderQuick(){
 const p=G.p,q=ensureQuick(p),bar=document.getElementById('quickbar');bar.innerHTML='';
 q.forEach((e,i)=>{
  const b=document.createElement('button');b.className='qbtn';
  if(!e){b.classList.add('empty');b.innerHTML=`<i class="qk">${i+1}</i><span class="plus">+</span>`;b.title='Empty quickslot: tap or long-press to assign'}
  else if(e.t==='c'){const it=p.inv.find(x=>x.id===e.id),def=CONS[e.id];b.appendChild(quickIcon(e));
   b.insertAdjacentHTML('beforeend',`<i class="qk">${i+1}</i>${it&&it.count>1?`<span class="cnt">${it.count}</span>`:''}`);if(!it)b.classList.add('off');b.title=`${def.n}: ${def.desc}`+(it?'':' (none left)')}
  else if(e.t==='d'){const d=DREAM[e.id],cd=(G.dreamCd&&G.dreamCd[e.id])||0;b.appendChild(quickIcon(e));
   b.insertAdjacentHTML('beforeend',`<i class="qk">${i+1}</i>${cd>0?`<span class="cd">${cd}</span>`:''}`);
   if(!G.dreamer)b.classList.add('off');else if(!cd)b.classList.add('ready');b.title=`${d.n}: ${d.desc}`}
  else{const k=attachedSlot(e.id),part=k&&p.eq[k],ab=ABIL[e.id];b.appendChild(quickIcon(e));
   b.insertAdjacentHTML('beforeend',`<i class="qk">${i+1}</i>${part&&part.cd>0?`<span class="cd">${part.cd}</span>`:''}`);
   if(!part)b.classList.add('off');else if(!(part.cd>0))b.classList.add('ready');b.title=`${ab.n}: ${ab.desc}`+(part?'':' (graft not attached)')}
  // tap uses it; a long press (touch) or right-click chooses what the slot holds
  let timer=null,fired=false;
  b.addEventListener('pointerdown',()=>{fired=false;timer=setTimeout(()=>{fired=true;openQuickPicker(i)},450)});
  for(const ev of ['pointerup','pointerleave','pointercancel'])b.addEventListener(ev,()=>clearTimeout(timer));
  b.addEventListener('click',ev=>{if(fired){ev.preventDefault();fired=false;return}useQuick(i)});
  b.addEventListener('contextmenu',ev=>{ev.preventDefault();clearTimeout(timer);openQuickPicker(i)});
  bar.appendChild(b)});
 hudActions=q.map((_,i)=>()=>useQuick(i)); // contextual buttons
 const here=G.items.filter(i=>i.x===p.x&&i.y===p.y),bg=document.getElementById('bGround');
 bg.style.display=here.length?'':'none';bg.querySelector('small').textContent=here.length>1?`Ground ${here.length}`:'Ground';
 const seen=s=>s.x>=0&&G.seen[s.y]&&G.seen[s.y][s.x];
 document.getElementById('bDown').style.display=seen(G.sD)?'':'none';
 document.getElementById('bUp').style.display=seen(G.sU)&&G.depth>1?'':'none'}
function renderInspect(){
 const el=document.getElementById('inspect');
 if(selItem&&selItem.mon&&!packIsOpen()){el.innerHTML=`<button class="x" onclick="selItem=null;ui()">✕</button>`+describeMon(selItem.mon);el.style.display='block'}
 else el.style.display='none'}function describeMon(m){
 const bonus=Math.floor(G.depth/4),tr=[];
 if(m.rng)tr.push(`ranged hex (range ${m.rng})`);if(m.burst)tr.push('bursts in acid when killed');if(m.erratic)tr.push('flits erratically');
 if(m.role)tr.push({heal:'heals the monsters near it',wail:'shrieks to wake the floor',brood:'births maggots',leech:'drains your max HP'}[m.role]);if(m.ally)tr.push('YOUR MINION');if(m.grp>=0&&!m.ally)tr.push('runs in a pack');
 if(m.spd>1)tr.push('fast');else if(m.spd<1)tr.push('slow');if(m.mini||m.k==='boss')tr.push(m.k==='boss'?'final boss':'mini-boss');
 const st=[m.bleed>0&&`bleeding ${m.bleed}`,m.poison>0&&`poisoned ${m.poison}`,m.burn>0&&`burning ${m.burn}`,m.slow>0&&`slowed ${m.slow}`,m.root>0&&`rooted ${m.root}`,m.stun>0&&'stunned'].filter(Boolean);
 return `<b>${m.n}</b> · HP ${m.hp}/${m.max}<br>Hits for ${m.a[0]+bonus}-${m.a[1]+bonus} (before your defense)<br>${tr.join(', ')||'No special traits.'}${st.length?'<br>Status: '+st.join(', '):''}<br>${m.alert?'Hunting you.':'Asleep or unaware.'}`}
function pickUp(){const s=selItem;if(!s||!s.ground||paused||G.over)return;const e=s.ground,i=G.items.indexOf(e);if(i<0)return;
 if(!addInv(e.it)){msg('Backpack full.','warn');return}
 G.items.splice(i,1);msg(`You grab: ${e.it.name}${e.it.count>1?' x'+e.it.count:''}.`,'good');sfx('pickup');selItem=null;ui()}
// Ground button / tapping your own tile: grab the most recently dropped item here, one per tap (the pack's ground panel still lets you choose)
function grabTop(){
 if(paused||G.over)return;const p=G.p,here=G.items.filter(i=>i.x===p.x&&i.y===p.y);if(!here.length)return;
 const e=here[here.length-1];
 if(!addInv(e.it)){msg('Backpack full.','warn');return}
 G.items.splice(G.items.indexOf(e),1);msg(`You grab: ${e.it.name}${e.it.count>1?' x'+e.it.count:''}.${here.length>1?` (${here.length-1} more here)`:''}`,'good');sfx('pickup');selItem=null;ui()}
function detail(){const el=document.getElementById('detail');
 if(!selItem||!selItem.it){el.innerHTML='Tap an item to inspect it.';return}
 const it=selItem.it;let b='';
 if(selItem.ground)b=`<button onclick="pickUp()">Pick up</button>`;
 else if(selItem.eq){const ab=ABIL[it.id];
  b=`<button onclick="detach('${selItem.eq}')">Detach</button><button onclick="devourEq('${selItem.eq}')">Devour</button>`
   +(ab?`<button onclick="useAbility('${selItem.eq}')"${it.cd>0?' disabled':''}>${ab.n}${it.cd>0?' ('+it.cd+')':''}</button>`:'')+fuseBtn(it)}
 else if(it.type==='cons'){if(it.id!=='rites')b+=`<button onclick="useCons()">${CONS[it.id].throw?'Throw':'Use'}</button>`;b+=`<button onclick="dropIt()">Drop</button>`}
 else b=`<button onclick="equip()">Attach</button><button onclick="devour()">Devour</button><button onclick="dropIt()">Drop</button>`+fuseBtn(it);
 el.innerHTML=describe(it)+((!selItem.eq&&compareLine(it))||'<br>')+b}
function equip(){if(paused||G.over)return;const p=G.p,it=selItem.it;if(it.dur<=0){msg('This graft has decomposed.','warn');return}let slot=it.kind;
 if(it.kind==='arm')slot=!p.eq.armL?'armL':!p.eq.armR?'armR':(p.eq.armL.dur<=p.eq.armR.dur?'armL':'armR');
 p.inv.splice(selItem.idx,1);const old=p.eq[slot];p.eq[slot]=it;it.slot=slot;
 if(old)p.inv.push(old);msg(`You stitch on ${it.name}.`,'info');sfx('equip');
 if(ABIL[it.id]){hintOnce('ability');autoQuick(it)}
 if(!it.known){it.known=true;if(it.taint){msg(`It writhes! The graft is TAINTED (${TAINT[it.taint].n}): ${TAINT[it.taint].d}.`,'bad');sfx('taint')}}
 selItem=null;afterManage()}
function detach(k){const p=G.p,e=p.eq[k];if(!e)return;if(p.inv.length>=maxInv()){msg('Backpack full.','warn');return}p.eq[k]=null;p.inv.push(e);msg(`You tear off your ${e.name}.`);selItem=null;afterManage()}
function devour(){const p=G.p,it=selItem.it;p.inv.splice(selItem.idx,1);feed(it);selItem=null;afterManage()}
function devourEq(k){const p=G.p,it=p.eq[k];p.eq[k]=null;feed(it);selItem=null;afterManage()}
function feed(it){const p=G.p;p.hunger=Math.max(0,p.hunger-18);p.hp=Math.min(stat().hp,p.hp+4);msg(`You gnaw on ${it.name}. Tastes awful. (+4 HP)`,'good');sfx('eat');
 if(it.taint){hurt(2);msg(`The ${TAINT[it.taint].n.toLowerCase()} taint turns your stomach. (-2)`,'bad')}}
function dropIt(){const p=G.p,it=selItem.it; // dropped items stack on the tile with whatever is already there
 p.inv.splice(selItem.idx,1);G.items.push({x:p.x,y:p.y,it});msg(`You drop ${it.name}.`);selItem=null;afterManage()}
function afterManage(){const s=stat();if(G.p.hp>s.hp)G.p.hp=s.hp;if(G.p.hp<=0){die();return}computeFOV();ui()}
function consume(it){it.count--;if(it.count<=0){const i=G.p.inv.indexOf(it);if(i>=0)G.p.inv.splice(i,1)}}
function nearestTarget(){const p=G.p;
 if(pickedTarget){const m=pickedTarget;if(!m.dead&&!m.ally&&G.vis[m.y][m.x]&&Math.max(Math.abs(m.x-p.x),Math.abs(m.y-p.y))<=5&&los(p.x,p.y,m.x,m.y))return m;msg("That target is out of range.","warn");return null}
 let best=null,bd=99;for(const m of G.mons){if(m.ally||!G.vis[m.y][m.x])continue;const d=Math.max(Math.abs(m.x-p.x),Math.abs(m.y-p.y));if(d<=5&&d<bd&&los(p.x,p.y,m.x,m.y)){bd=d;best=m}}return best}
function useCons(){if(paused||G.over)return;stopTravel();
 const it=selItem.it,p=G.p,s=stat(),id=it.id;
 if(CONS[id].throw&&!pickedTarget&&aimBegin(()=>{selItem={idx:p.inv.indexOf(it),it};useCons()},5))return; // choose who to throw at
 if(CONS[id].throw){const t=nearestTarget();if(!t){msg('No target in range.','warn');return}
  consume(it);sfx('throw');
  addFX('lob',{org:p,tgt:t,col:id==='shards'?'#ddd8c0':id==='pyre'?'#f93':id==='grease'?'#6a6a98':'#9ad030',life:20,big:id!=='shards',splash:id==='shards'?4:14});
  if(id==='shards'){const d=rnd(2,4);t.hp-=d;t.alert=true;G.floaters.push({x:t.x,y:t.y,t:'-'+d,c:'#fc6',l:25});blood(t.x,t.y,6);msg(`A bone shard hits the ${t.n} for ${d}.`);if(t.hp<=0)kill(t)}
  else if(id==='pyre'){msg(`The Pyre Flask bursts over the ${t.n}!`,'warn');t.hp-=3;t.burn=4;t.alert=true;G.floaters.push({x:t.x,y:t.y,t:'-3',c:'#f93',l:25});blood(t.x,t.y,10,'#f93',2);if(t.hp<=0)kill(t)}
  else if(id==='grease'){msg('Grave Tar splashes out and clings!','warn');for(const o of [...G.mons])if(!o.ally&&Math.max(Math.abs(o.x-t.x),Math.abs(o.y-t.y))<=1){o.slow=6;o.alert=true;G.floaters.push({x:o.x,y:o.y,t:'slow',c:'#8ab',l:25});blood(o.x,o.y,8,'#5a5a78',1.5)}}
  else{msg('The Putrid Jar shatters in a green cloud!','warn');for(const o of [...G.mons])if(!o.ally&&Math.max(Math.abs(o.x-t.x),Math.abs(o.y-t.y))<=1){o.hp-=4;o.poison=5;o.alert=true;G.floaters.push({x:o.x,y:o.y,t:'-4',c:'#9c3',l:25});blood(o.x,o.y,10,'#9ad030',2);if(o.hp<=0)kill(o)}}
 }else{
  sfx(id==='flask'||id==='serum'||id==='brine'?'drink':id==='rite'?'rite':'use');
  if(id==='flask'){const h=10+2*G.depth;p.hp=Math.min(s.hp,p.hp+h);msg(`You gulp the flask. +${h} HP.`,'good')}
  else if(id==='scrap'){p.hunger=Math.max(0,p.hunger-20);p.hp=Math.min(s.hp,p.hp+2);msg('You tear into the raw scrap.','good')}
  else if(id==='meat'){p.hunger=Math.max(0,p.hunger-35);if(R()<.25){hurt(3);msg('The tainted meat turns your stomach. -3 HP.','bad')}else msg('You choke down the tainted meat.','good')}
  else if(id==='serum'){p.bonusHp+=3;p.hp+=3;msg('Graft Serum burns through you. +3 max HP permanently.','info')}
  else if(id==='brine'){let w=null,wr=2;for(const k of SLOTS){const e=p.eq[k];if(e&&e.dur/e.maxdur<wr){wr=e.dur/e.maxdur;w=e}}
   if(!w){msg('You have nothing attached to preserve.','warn');return}w.dur=Math.min(w.maxdur,w.dur+Math.ceil((w.maxdur-w.dur)/2));msg(`The brine firms up your ${w.name}.`,'good');
   if(w.taint){w.taint='';msg('The taint dissolves in the brine.','good')}}
  else if(id==='candle'){p.candle=60;msg('A pale flame steadies your sight.','info')}
  else if(id==='map'){for(let y=0;y<H;y++)for(let x=0;x<W;x++)G.seen[y][x]=true;msg('The map etches the floor into your memory.','info')}
  else if(id==='rite'){const rs=G.rooms.slice(1);for(let i=0;i<40;i++){const r=pick(rs),x=rnd(r.x,r.x+r.w-1),y=rnd(r.y,r.y+r.h-1);if(G.map[y][x]===1&&!monAt(x,y)&&!(x===G.sD.x&&y===G.sD.y)&&!(x===G.sU.x&&y===G.sU.y)){snapPos(p,x,y);break}}msg('The rite tears you through the dark.','info')}
  consume(it)}
 selItem=null;closePack();computeFOV();endTurn(false,false)}
// Messages float over the map like in Shattered Pixel Dungeon and fade after a few seconds; the 📜 button opens the full history.
const LOG_SHOW=4,LOG_MS=7000;
function renderLog(){const now=performance.now(),el=document.getElementById('log');
 el.innerHTML=G.log.slice(0,LOG_SHOW).filter(l=>now-l.t0<LOG_MS).reverse().map(l=>`<div class="${l.c}">${l.t}</div>`).join('');
 if(document.getElementById('logModal').style.display==='flex')renderLogFull()}
setInterval(()=>{if(G&&G.log&&G.log.length&&G.log[0])renderLog()},700);function renderLogFull(){const h=document.getElementById('logFull');h.innerHTML=G.log.map(l=>`<div class="${l.c}"><small>T${l.turn}</small> ${l.t}</div>`).join('')}
function openLog(){document.getElementById('logModal').style.display='flex';renderLogFull()}

// ---------- fusion: two copies of the same graft become one stronger graft ----------
const fusePartner=it=>it&&it.type==='part'&&it.fz!==undefined?G.p.inv.find(o=>o!==it&&o.type==='part'&&o.id===it.id):null;
const fuseBtn=it=>fusePartner(it)&&(it.fz||0)<2?`<button onclick="fuse()" title="Consumes the spare copy: +25% stats, +25% rot capacity, restores rot, cleanses taint">Fuse</button>`:'';
function fuse(){
 const p=G.p,it=selItem&&selItem.it,other=fusePartner(it);if(!it||!other||paused||G.over)return;
 if((it.fz||0)>=2){msg('This graft cannot be fused any further.','warn');return}
 p.inv.splice(p.inv.indexOf(other),1);
 it.base=it.base||it.name.replace(/^(Twice-fused|Fused) /,'');it.fz=(it.fz||0)+1;it.name=(it.fz>1?'Twice-fused ':'Fused ')+it.base;
 for(const k in it.stats){const v=it.stats[k];if(v>0)it.stats[k]=k==='spd'?+(v+.03).toFixed(2):v+Math.max(1,Math.round(v*.25))}
 it.maxdur=Math.round(it.maxdur*1.25);it.dur=it.maxdur;it.taint='';it.known=true;
 msg(`The two grafts knit into one: ${it.name}.`,'good');sfx('equip');addFX('heal',{org:p,life:28});
 selItem=selItem.eq?{eq:selItem.eq,it}:{idx:p.inv.indexOf(it),it};afterManage()}

// ---------- stage variant choice ----------
function openStageChoice(){
 const idx=G.depth/STAGE_LEN,pool=['hive','cursed','crypt','standard'].sort(()=>R()-.5).slice(0,3),el=document.getElementById('stageBody');
 paused=true;closePack();
 document.getElementById('stageTitle').textContent=`The way splits: ${REG[Math.min(STAGES-1,idx)].n}`;
 el.innerHTML=pool.map(k=>`<button class="mod" data-k="${k}"><b>${MODS[k].n}</b><br><small>${MODS[k].desc}</small></button>`).join('');
 for(const b of el.querySelectorAll('button'))b.onclick=()=>{G.mods[idx]=b.dataset.k;document.getElementById('stageChoice').style.display='none';paused=false;sfx('stairs');changeLevel(1,true)};
 document.getElementById('stageChoice').style.display='flex'}

// ---------- altar offering window ----------
let altarPos=null,altarSel=new Set();
const altarEl=()=>document.getElementById('altar');
const altarOpen=()=>altarEl().style.display==='flex';
// everything that can be sacrificed: pack grafts and attached ones (entries are looked up again when the offer is made)
function altarCandidates(){const p=G.p,out=[];p.inv.forEach((it,i)=>{if(it.type==='part')out.push({key:'i'+i,it,where:'pack'})});for(const k of SLOTS)if(p.eq[k])out.push({key:'e'+k,it:p.eq[k],where:'attached',slot:k});return out}
function openAltar(x,y){if(G.over)return;stopTravel();altarPos={x,y};altarSel=new Set();hintOnce('altar');paused=true;renderAltar();altarEl().style.display='flex'}
function closeAltar(){altarEl().style.display='none';paused=false}
function renderAltar(){
 const cands=altarCandidates(),el=document.getElementById('altarList');
 document.getElementById('altarText').textContent='Offer grafts to the altar. It keeps all of them. The best one you give sets the tier to beat; more offerings improve the odds, weaker ones only a little. It can also give back less, or nothing. The altar works once.';
 el.innerHTML='';
 for(const c of cands){const d=document.createElement('div');d.className='offer'+(altarSel.has(c.key)?' on':'');
  const img=document.createElement('img');img.src=itIcon(c.it).toDataURL();d.appendChild(img);
  const tag=c.it.tier>0?`tier ${c.it.tier}`:'stitched';d.insertAdjacentHTML('beforeend',`<span>${c.it.name}<br><small>${tag} · ${c.where}</small></span>`);
  d.onclick=()=>{altarSel.has(c.key)?altarSel.delete(c.key):altarSel.add(c.key);renderAltar()};el.appendChild(d)}
 if(!cands.length)el.innerHTML='<p>You have no grafts to offer.</p>';
 const chosen=cands.filter(c=>altarSel.has(c.key)),go=document.getElementById('altarGo'),od=document.getElementById('altarOdds');
 go.disabled=!chosen.length;
 if(chosen.length){const o=altarOdds(chosen.map(c=>c.it.tier)),pc=v=>Math.round(v*100)+'%',better=o.up1+o.up2;
  od.innerHTML=`Offering ${chosen.length} (counts as ${o.n.toFixed(1)}) against tier ${o.M}:<br>`+
   `<span class="bad">nothing ${pc(o.nothing)}</span> · <span class="warn">worse ${pc(o.lower)}</span> · same tier ${pc(o.same)} · <span class="good">better ${pc(better)}</span>${o.M>=5?' <small>(tier 5 is the ceiling)</small>':''}`}
 else od.textContent='Choose the grafts to offer.'}
function makeOffering(){
 const p=G.p,chosen=altarCandidates().filter(c=>altarSel.has(c.key));if(!chosen.length||!altarPos)return;
 const {x,y}=altarPos,res=altarRoll(chosen.map(c=>c.it.tier));
 // the offering is consumed whatever happens
 for(const c of chosen){if(c.where==='pack')p.inv[+c.key.slice(1)]=null;else p.eq[c.slot]=null}
 p.inv=p.inv.filter(Boolean);
 G.map[y][x]=1;G.decor[y][x]=pick([1,3,5]);sfx(res.tier?'level':'detach');closeAltar();addFX('ring',{org:{x,y,rx:x,ry:y},col:res.tier?'#ffd070':'#8a8a94',r:60,life:30});
 if(!res.tier){msg('The altar drinks your offering and gives nothing back. It crumbles.','bad')}
 else{const it=mkAltarPart(res.tier,G.depth);G.items.push({x,y,it});
  msg({lower:`The altar spits out a lesser graft: ${it.name}.`,same:`The altar returns its equal: ${it.name}.`,up1:`The altar gives back something BETTER: ${it.name}!`,up2:`The altar gives back something far BETTER: ${it.name}!!`}[res.outcome],res.outcome==='lower'?'warn':'good')}
 afterManage()}

// ---------- quickslot picker (opened by a long press) ----------
let qpSlot=0;
const qpEl=()=>document.getElementById('qpick');
const qpOpen=()=>qpEl().style.display==='flex';
function openQuickPicker(i){
 if(!inRun()||G.over)return;stopTravel();qpSlot=i;paused=true;const p=G.p,q=ensureQuick(p),list=document.getElementById('qpList');list.innerHTML='';
 document.getElementById('qpTitle').textContent=`Quickslot ${i+1}`;
 const add=(label,sub,canvas,entry)=>{const d=document.createElement('div');d.className='offer'+(q[i]&&entry&&q[i].t===entry.t&&q[i].id===entry.id?' on':'');
  d.appendChild(canvas);d.insertAdjacentHTML('beforeend',`<span>${label}<br><small>${sub}</small></span>`);
  d.onclick=()=>{q.forEach((x,j)=>{if(x&&x.t===entry.t&&x.id===entry.id&&j!==i)q[j]=null});q[i]=entry;closeQuickPicker();sfx('equip');ui()};list.appendChild(d)};
 // only things that can actually be used or thrown: pack consumables (not passive ones) and abilities of attached grafts
 const seen=new Set();let n=0;
 for(const it of p.inv)if(it.type==='cons'&&it.id!=='rites'&&!seen.has(it.id)){seen.add(it.id);n++;add(`${it.name}${it.count>1?' x'+it.count:''}`,CONS[it.id].throw?'throw':'use',cloneCanvas(itIcon(it)),{t:'c',id:it.id})}
 for(const k of SLOTS){const e=p.eq[k],ab=e&&ABIL[e.id];if(!ab)continue;n++;add(ab.n,`ability · ${e.name}`,cloneCanvas(itIcon(e)),{t:'a',id:e.id})}
 if(G.dreamer)for(const id in DREAM){n++;add(DREAM[id].n,'jutsu',dreamIcon(id),{t:'d',id})}
 if(!n)list.innerHTML='<p>Nothing usable yet. Pack consumables and attached grafts with abilities show up here.</p>';
 qpEl().style.display='flex'}
function closeQuickPicker(){qpEl().style.display='none';paused=false}

// ---------- aiming: tap a throwable or targeted ability, then tap the enemy ----------
// No confirmation step: tapping an enemy fires immediately. A lone candidate is used automatically, and a quick double tap on the
// quickslot uses the nearest enemy. Tapping empty ground, another slot, moving or Esc cancels.
const AIM_DOUBLE_MS=450;
let aim=null,pickedTarget=null,curQuick=-1;
function withTarget(m,fn){pickedTarget=m;try{fn()}finally{pickedTarget=null}}
function aimCands(range){const p=G.p;return G.mons.filter(m=>!m.ally&&!m.dead&&G.vis[m.y][m.x]&&Math.max(Math.abs(m.x-p.x),Math.abs(m.y-p.y))<=range&&(range<=1||los(p.x,p.y,m.x,m.y)))}
function aimBegin(fn,range){
 const c=aimCands(range);if(!c.length)return false; // nothing in reach: the normal code reports it
 if(c.length===1){curQuick=-1;withTarget(c[0],fn);return true}
 aim={fn,range,cands:c,slotIdx:curQuick,t0:performance.now()};curQuick=-1;
 const el=document.getElementById('hint');clearTimeout(hintTimer);el.textContent='Choose a target: tap an enemy. Double-tap the slot for the nearest.';el.style.opacity=1;return true}
function endAim(){aim=null;const el=document.getElementById('hint');if(el)el.style.opacity=0}
function cancelAim(){if(aim)endAim()}
function fireAim(m){if(!aim)return;const f=aim.fn;if(aim.tile){endAim();f(m.x,m.y);return}endAim();withTarget(m,f)}
function aimNearest(){if(!aim)return;const p=G.p,best=[...aim.cands].sort((a,b)=>Math.max(Math.abs(a.x-p.x),Math.abs(a.y-p.y))-Math.max(Math.abs(b.x-p.x),Math.abs(b.y-p.y)))[0];if(!best){cancelAim();return}fireAim(best)}
// the slot index only matters while a use is being dispatched
const _useQuick=useQuick;useQuick=function(i){try{return _useQuick(i)}finally{curQuick=-1}};
