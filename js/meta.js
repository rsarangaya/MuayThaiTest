// Meta layer: a small profile kept in localStorage (never an in-progress run). Holds Marrow, unlocked perks,
// the codex of everything you've met, and run records. The playtest build stamp lives here too.
const BUILD='alpha 0.4 · build 2026-10-23c';
const PERKS={
 ironbound:{n:'Ironbound',cost:40,desc:'No speed penalty when you have no legs.'},
 slowrot:{n:'Slow Rot',cost:60,desc:'Attached grafts decay 20% slower.'},
 gravedigger:{n:'Gravedigger',cost:50,desc:'Start with a random leg graft instead of the stitched pair.'},
 packrat:{n:'Pack Rat',cost:40,desc:'+4 backpack slots.'},
 thickskin:{n:'Thick Skin',cost:50,desc:'+6 max HP.'},
 scavenger:{n:'Scavenger',cost:70,desc:'Every kill heals 1 extra HP.'}};
function loadProfile(){
 try{const p=JSON.parse(localStorage.getItem('rd_profile')||'null');if(p&&p.v===1)return p}catch(e){}
 return {v:1,marrow:0,perks:{},start:'',seen:{},parts:{},best:{depth:0,kills:0,turns:0,wins:0,runs:0},runs:[],playtime:0,created:Date.now()}}
let profile=loadProfile();
function saveProfile(){try{localStorage.setItem('rd_profile',JSON.stringify(profile))}catch(e){}}
setInterval(()=>{if(!document.hidden){profile.playtime++;if(profile.playtime%30===0)saveProfile()}},1000);
const fmtTime=s=>{s|=0;const h=(s/3600)|0,m=((s%3600)/60)|0;return h+'h '+String(m).padStart(2,'0')+'m'};
const maxInv=()=>MAXINV+(typeof G!=='undefined'&&G&&G.p&&G.p.perk==='packrat'?4:0);

// ---- codex discoveries ----
function codexSee(kind,id,label){const bag=kind==='mon'?profile.seen:profile.parts;if(bag[id])return;bag[id]=1;saveProfile();
 msg(`NEW ${kind==='mon'?'SIGNATURE':'GRAFT'}: ${label} logged to the Codex.`,'info');(G.newEntries||(G.newEntries=[])).push(label)}
function codexScan(){ // called whenever the screen state changes
 for(const m of G.mons)if(!m.ally&&G.vis[m.y][m.x])codexSee('mon',m.k,MON[m.k].n);
 const seePart=it=>{if(it&&it.type==='part'&&!/^s_/.test(it.id)&&!profile.parts[it.id]){const t=TPL.find(t=>t.id===it.id);codexSee('part',it.id,t?t.n:it.name)}};
 for(const it of G.p.inv)seePart(it);for(const k of SLOTS)seePart(G.p.eq[k]);for(const e of G.items)if(G.vis[e.y][e.x])seePart(e.it)}

// ---- runs ----
function startPerkSetup(p){ // applied in newGame
 p.perk=profile.start&&profile.perks[profile.start]?profile.start:'';
 if(p.perk==='thickskin'){p.bonusHp+=6;p.hp+=6}
 if(p.perk==='gravedigger'){const g=mkPart(2,null,pick(['l_crawl','l_crow','l_penitent']));g.taint='';g.known=true;p.eq.legs=g}}
function finishRun(win){
 if(G.ended)return {earn:0,total:profile.marrow,fresh:[]};G.ended=true;clearRun(curSlot); // the run is over: its slot is freed
 const p=G.p,b=profile.best;
 const earn=G.debugUsed?0:Math.round((G.depth*6+p.kills+(win?150:0))*(win?1:.7));
 profile.marrow+=earn;b.runs++;b.depth=Math.max(b.depth,G.depth);b.kills=Math.max(b.kills,p.kills);b.turns=Math.max(b.turns,G.turn);if(win)b.wins++;
 profile.runs.unshift({seed:G.seed,depth:G.depth,kills:p.kills,turns:G.turn,lvl:p.lvl,win:!!win,marrow:earn,date:Date.now(),debug:!!G.debugUsed});profile.runs.length=Math.min(profile.runs.length,25);
 saveProfile();return {earn,total:profile.marrow,fresh:G.newEntries||[]}}
function resultHtml(head,r){
 const p=G.p;return `${head}<br>Seed ${G.seed} · Level ${p.lvl} · ${p.kills} kills · ${G.turn} turns<br>`+
  `<b>${G.debugUsed?'Debug console used: no Marrow earned.':`+${r.earn} Marrow`}</b> (total ${r.total})`+
  (r.fresh.length?`<br><small>New codex entries: ${r.fresh.join(', ')}</small>`:'')+
  `<br><small>Deepest ever: floor ${profile.best.depth} · wins ${profile.best.wins}</small>`}

// ---- codex / perks window ----
let codexTab='mon';
const iconOfMon=k=>S[k].toDataURL();
const iconOfPart=t=>bigIcon(REGION[t.kind][t.spr],t.col,3).toDataURL();
function monCard(k){const m=MON[k],seen=profile.seen[k];
 if(!seen)return `<div class="cx locked"><div class="unk">?</div><div><b>?????</b><br><small>Not yet encountered.</small></div></div>`;
 const own=TPL.filter(t=>t.src===k),role={heal:'Heals the monsters around it.',wail:'Shrieks to wake the whole floor.',brood:'Births maggots.',leech:'Each hit drains your max HP.'}[m.role];
 const where=m.swamp?'Swamp rooms':m.d[0]>20?(k==='boss'?'Floor 20':k==='stalker'?'Appears if you linger':{warden:'Floor 5',matron:'Floor 10',abomination:'Floor 15'}[k]):`Floors ${m.d[0]}-${m.d[1]}`;
 return `<div class="cx"><img src="${iconOfMon(k)}"><div><b>${m.n}</b> <small>${where}</small><br>HP ${m.hp} · hits ${m.a[0]}-${m.a[1]} · ${m.spd>1?'fast':m.spd<1?'slow':'normal speed'}${m.rng?` · ranged ${m.rng}`:''}<br>`+
  `<small>${LORE[k]||''}${role?' '+role:''}${m.burst?' Bursts in acid.':''}</small><br>`+
  `<small>Drops: ${own.length?own.map(t=>`<span class="${profile.parts[t.id]?'good':''}">${t.n}</span>`).join(', '):'random grafts'}</small></div></div>`}
function partCard(t){if(!profile.parts[t.id])return `<div class="cx locked"><div class="unk">?</div><div><b>?????</b><br><small>${KINDNAME[t.kind]} · tier ${t.t}</small></div></div>`;
 const st=t.st,b=[];if(st.atk)b.push('+'+st.atk+' ATK');if(st.def)b.push('+'+st.def+' DEF');if(st.hp)b.push('+'+st.hp+' HP');if(st.sight)b.push('+'+st.sight+' sight');if(st.steal)b.push('life-steal');if(st.spd)b.push('+'+Math.round(st.spd*100)+'% spd');
 const ab=ABIL[t.id];return `<div class="cx"><img src="${iconOfPart(t)}"><div><b>${t.n}</b> <small>${KINDNAME[t.kind]} · tier ${t.t}</small><br>${b.join(', ')||'-'}<br>`+
  `${t.fxd?`<small>${t.fxd}</small><br>`:''}${ab?`<small class="info">Active - ${ab.n}: ${ab.desc}</small><br>`:''}<small>From: ${(MON[t.src]||{n:t.src}).n}</small></div></div>`}
function renderCodex(){
 const el=document.getElementById('codexBody');let h='';
 for(const b of document.querySelectorAll('#codexTabs button'))b.classList.toggle('on',b.dataset.tab===codexTab);
 if(codexTab==='mon'){const keys=Object.keys(MON).filter(k=>!MON[k].hidden),n=keys.filter(k=>profile.seen[k]).length;h=`<p><b>${n}/${keys.length}</b> signatures logged</p>`+keys.map(monCard).join('')}
 else if(codexTab==='part'){const n=TPL.filter(t=>profile.parts[t.id]).length;h=`<p><b>${n}/${TPL.length}</b> grafts discovered</p>`+TPL.map(partCard).join('')}
 else if(codexTab==='perk'){h=`<p>Marrow: <b>${profile.marrow}</b>. Earn it by descending and killing; spend it here. Pick one perk to start each run.</p>`+
  Object.entries(PERKS).map(([id,pk])=>`<div class="cx"><div><b>${pk.n}</b> <small>${pk.cost} Marrow</small><br><small>${pk.desc}</small></div>`+
   (profile.perks[id]?`<button data-start="${id}" ${profile.start===id?'disabled':''}>${profile.start===id?'Starting perk':'Use'}</button>`:`<button data-buy="${id}" ${profile.marrow>=pk.cost?'':'disabled'}>Unlock</button>`)+`</div>`).join('')}
 else{const b=profile.best;h=`<p>Deepest floor <b>${b.depth}</b> · most kills <b>${b.kills}</b> · wins <b>${b.wins}</b> · runs <b>${b.runs}</b> · play time <b>${fmtTime(profile.playtime)}</b></p>`+
  (profile.runs.length?profile.runs.slice(0,15).map(r=>`<div class="cx"><div><b>${r.win?'WON':'Died'}</b> floor ${r.depth} · lv ${r.lvl} · ${r.kills} kills · ${r.turns} turns<br><small>seed ${r.seed}${r.debug?' · debug':''} · +${r.marrow} Marrow</small></div></div>`).join(''):'<p>No runs yet.</p>')}
 el.innerHTML=h;
 for(const b of el.querySelectorAll('[data-buy]'))b.onclick=()=>{const pk=PERKS[b.dataset.buy];if(profile.marrow<pk.cost)return;profile.marrow-=pk.cost;profile.perks[b.dataset.buy]=1;if(!profile.start)profile.start=b.dataset.buy;saveProfile();sfx('level');renderCodex();syncMenuPerk()};
 for(const b of el.querySelectorAll('[data-start]'))b.onclick=()=>{profile.start=b.dataset.start;saveProfile();renderCodex();syncMenuPerk()}}
function openCodex(tab){codexTab=tab||codexTab;document.getElementById('codex').style.display='flex';renderCodex()}
function syncMenuPerk(){const s=document.getElementById('perkSel');if(!s)return;
 s.innerHTML='<option value="">None</option>'+Object.entries(PERKS).filter(([id])=>profile.perks[id]).map(([id,pk])=>`<option value="${id}">${pk.n}</option>`).join('');
 s.value=profile.perks[profile.start]?profile.start:'';
 const m=document.getElementById('marrowShow');if(m)m.textContent=`Marrow ${profile.marrow} · deepest floor ${profile.best.depth}`}

// ---- field manual ----
function manualHtml(){return `
<h3>GOAL</h3><p>Descend 20 floors in four stages and devour The Surgeon. Each stage starts in a waste room with a few free items.</p>
<h3>CONTROLS</h3><p>Arrows/WASD/QEZC move · Space wait · R rest · X scent · I pack · G grab the newest item on your tile (tap Ground or your own tile too, one item per tap) · L log · &gt; / &lt; travel to stairs · TAB inspect next monster · 1-6 (top row) use the quickslots; the numpad moves you. Tap the map to travel, tap an enemy to walk up and attack it, bump to attack, right-click or long-press a monster to inspect. Drag to look around, pinch/scroll to zoom, tap or drag the minimap to jump the camera (zoom is kept).</p>
<h3>SCREEN</h3><p>HP and hunger stay at the top left. The Stats button under them drops down your level, attack, defense, speed, sight, kills and the stage line; tap it again to roll it up.</p>
<h3>GRAFTS</h3><p>Attach grafts to your head, torso, arms and legs. Select a graft in your pack or on the ground to see exactly what attaching it would change, for example +2 ATK or -25% SPEED, plus any ability you would gain or lose.Every attached graft rots; at zero it falls off. Stored grafts rot at 25% speed. Unexamined grafts may be <b>tainted</b> (Rotting, Ravenous or Weeping) until you attach them; Formaldehyde Brine cleanses a taint. Two copies of the same graft can be <b>fused</b> (twice at most): +25% stats and rot capacity each time.</p>
<h3>ABILITIES</h3><p>Many grafts have an active ability. Tap an attached graft, or use its button on the action bar. Abilities take a turn and then recharge. Some, like Play Dead, Lure, Fork and Bone Barricade, change the battle rather than just hurting things.</p>
<h3>SPEED</h3><p>Your legs set your speed. No legs, or rotten legs, slow you: monsters get extra steps. Good legs let you slip away.</p>
<h3>MONSTERS</h3><p>Monsters live in packs: wake one and its room joins in. Each has its own sight radius. Red tiles show where a blow lands next turn. Support types change fights: <b>Gravetenders and Medics</b> heal, <b>Wailers</b> wake the floor, <b>Brood-mothers</b> spawn maggots, <b>Leeches</b> drain your max HP. Bosses call reinforcements, rally allies or enrage.</p>
<h3>THEMED ROOMS</h3><p><b>Body dumps</b> hide a graft and ambushes in identical piles: bump a pile to search it. <b>Swamps</b> slow you but their natives drop supplies. <b>Maggot nests</b> guard a graft. An <b>altar</b> turns grafts you offer into a gamble on a better one: more and stronger offerings help, fodder helps little, and it can return nothing. It works once.</p>
<h3>THE REEK</h3><p>Each stage gives you a turn budget to reach its boss floor: 350 turns per floor, so 1,750 per stage. The HUD counts it down. Run out before you arrive and a relentless stalker hunts you, following you down each floor until you reach the boss or kill it. It drops a guaranteed graft. Every stage starts a fresh clock.</p>
<h3>STAGES</h3><p>After floors 5, 10 and 15 you choose the next stage's variant: Infested Hive, Cursed Ruin, Dark Crypt or Standard.</p>
<h3>THE BARGAIN</h3><p>Every new run offers a challenge: give up half your max HP and one random endgame graft is stitched on at the start. It rots 75% slower than anything else. The deal lasts the whole run.</p>
<h3>MARROW &amp; PERKS</h3><p>Every run earns Marrow (more for depth and kills, halved on death). Spend it in the Codex on perks and pick one to start each run. The Codex also records every monster and graft you have met.</p>`}