// Run slots. Three slots hold runs you can walk away from and come back to, like pausing, but you can never save or load on
// demand: every slot is overwritten with the CURRENT state after each action, so there is no older state to go back to.
// A slot is cleared the moment its run ends (death or victory), and the RNG state is stored, so reloading cannot re-roll anything.
const RUN_SLOTS=3,runKey=i=>'rd_run'+i,sumKey=i=>'rd_runsum'+i;
let curSlot=0; // slot of the run currently loaded (0 = none)
const TRANSIENT=new Set(['q','tw','lg','fl','rx','ry','vel','moving','startAt','delay','va','lhp','cruise','pr']); // animation-only fields
// 2D grids are stored as compact strings
const pack2d=(a,f)=>a.map(r=>r.map(f).join('')).join('|');
const unpack2d=(s,f)=>s.split('|').map(r=>[...r].map(f));
const PACK={map:v=>v.toString(36),vis:v=>v?1:0,seen:v=>v?1:0,decor:v=>v}; // tile codes reach 10 (altar), so one base-36 character each
function packLevel(o){const out={};
 for(const k of LVLKEYS){if(k==='shade')continue;out[k]=PACK[k]?pack2d(o[k],PACK[k]):o[k]}return out}
function unpackLevel(o){const out={};
 for(const k of LVLKEYS){if(k==='shade'){out[k]=Array.from({length:H},()=>Array.from({length:W},()=>Math.random()));continue} // cosmetic only: not saved, so re-rolled
  out[k]=k==='map'?unpack2d(o[k],c=>parseInt(c,36)):k==='decor'?unpack2d(o[k],c=>+c):k==='vis'||k==='seen'?unpack2d(o[k],c=>c==='1'):o[k]}
 return out}
function idleState(){curSlot=0;G={over:false,p:null,map:null,mons:[],items:[],floaters:[],parts:[],attackFX:[],dying:[],log:[],shake:0,cx:0,cy:0,levels:{}}}
const inRun=()=>!!(G&&G.p&&G.map&&curSlot);

function saveRun(){
 if(!inRun())return;
 if(G.over){clearRun(curSlot);return}
 const cur={};for(const k of LVLKEYS)cur[k]=G[k];
 G._lc=G._lc||{};const lv={};
 for(const d in G.levels){if(+d===G.depth)continue;lv[d]=G._lc[d]||(G._lc[d]=packLevel(G.levels[d]))} // visited floors are packed once and reused
 const core={seed:G.seed,mods:G.mods,depth:G.depth,turn:G.turn,ward:G.ward,rites:G.rites,dropCounts:G.dropCounts,p:G.p,log:G.log.slice(0,60),
  kindBag:G.kindBag,stageTurns:G.stageTurns,reekState:G.reekState,reekHp:G.reekHp,debugUsed:G.debugUsed,dev:G.dev,god:G.god,dreamer:G.dreamer,dreamCd:G.dreamCd,newEntries:G.newEntries,ended:G.ended};
 const sum={bargain:!!G.p.bargain,depth:G.depth,lvl:G.p.lvl,hp:G.p.hp,max:stat().hp,turn:G.turn,kills:G.p.kills,seed:G.seed,saved:Date.now()};
 try{localStorage.setItem(runKey(curSlot),JSON.stringify({v:1,rng:rngState,mid:MID,core,cur:packLevel(cur),lv},(k,v)=>TRANSIENT.has(k)?undefined:v));
  localStorage.setItem(sumKey(curSlot),JSON.stringify(sum))}catch(e){/* storage full or blocked: the run simply cannot be resumed later */}}
let saveQueued=false;
function saveRunSoon(){if(saveQueued||!inRun())return;saveQueued=true;setTimeout(()=>{saveQueued=false;saveRun()},200)}
function clearRun(i){try{localStorage.removeItem(runKey(i));localStorage.removeItem(sumKey(i))}catch(e){}}
function readSum(i){try{return JSON.parse(localStorage.getItem(sumKey(i))||'null')}catch(e){return null}}

// Starting a run first offers the bargain (a challenge run): half your max HP for one endgame graft that barely rots.
let pendingBargain=false,bargainSlot=0;
function startRun(slot){bargainSlot=slot;document.getElementById('bargain').style.display='flex'}
function chooseBargain(take){document.getElementById('bargain').style.display='none';pendingBargain=take;curSlot=bargainSlot;newGame();saveRun();hideMenuForRun()}
function applyBargain(p){
 if(TPL[0].hid===undefined)computePower();const top=TPL.filter(t=>t.t===5&&t.hid>=4),t=pick(top.length?top:TPL.filter(t=>t.t===5)),it=mkPart(MAX_DEPTH,null,t.id),slot=it.kind==='arm'?'armR':it.kind;
 it.taint='';it.known=true;it.dur=it.maxdur;it.decay=+(it.decay*.25).toFixed(3);it.bargain=true;
 p.eq[slot]=it;it.slot=slot;p.bargain=true;p.bargainName=it.name;p.hp=stat().hp;return it}
function continueRun(slot){
 if(curSlot===slot&&inRun()&&!G.over){hideMenuForRun();return true} // already loaded: just go back to it
 let d=null;try{d=JSON.parse(localStorage.getItem(runKey(slot))||'null')}catch(e){}
 if(!d||d.v!==1){alert('That run could not be read. It has been cleared.');clearRun(slot);renderRunSlots();return false}
 curSlot=slot;rngState=d.rng;MID=d.mid;
 G=Object.assign({levels:{},floaters:[],parts:[],attackFX:[],dying:[],shake:0,over:false,cx:0,cy:0,fogA:null,sbx:null,_lc:{}},d.core);
 for(const k in d.lv)G.levels[k]=unpackLevel(d.lv[k]);
 const cur=unpackLevel(d.cur);for(const k of LVLKEYS)G[k]=cur[k];
 G.regIdx=Math.min(STAGES-1,Math.floor((G.depth-1)/STAGE_LEN));G.reg=REG[G.regIdx];G.taintK=(MODS[(G.mods&&G.mods[G.regIdx])||'standard']||MODS.standard).taint;
 for(const o of [G.p,...G.mons]){o.rx=o.x;o.ry=o.y;o.q=[]}
 selItem=null;pan.x=pan.y=0;panGoal=null;stopTravel();cancelAim();
 computeFOV();G.cx=G.p.x+.5;G.cy=G.p.y+.5;
 msg('You return to the run.','info');ui();hideMenuForRun();return true}
function hideMenuForRun(){paused=false;document.getElementById('menu').style.display='none';hintOnce('start');const sd=document.getElementById('seedShow');if(sd&&G.seed!=null)sd.textContent=G.seed}
function deleteRun(i){
 if(!confirm(`Delete the run in slot ${i}? This cannot be undone.`))return;
 clearRun(i);if(i===curSlot)idleState();if(savedCount())renderRunSlots();else showMenuRuns(false)}

// ---- title screen: New Game / Continue / Exit; the run list only appears behind Continue ----
const menuEl=id=>document.getElementById(id);
const savedCount=()=>[1,2,3].filter(i=>readSum(i)).length;
function syncMenuButtons(){
 menuEl('mContinue').style.display=savedCount()?'':'none';
 menuEl('mClose').style.display=inRun()&&!G.over?'':'none'}
function showMenuRuns(on){
 menuEl('menuMain').style.display=on?'none':'';menuEl('menuRuns').style.display=on?'':'none';
 if(on)renderRunSlots();else{menuEl('menuNote').textContent='';syncMenuButtons()}}
function renderRunSlots(){
 const el=menuEl('runSlots');let h='';
 for(let i=1;i<=RUN_SLOTS;i++){
  const s=readSum(i);if(!s)continue;
  const active=curSlot===i&&inRun()&&!G.over;
  h+=`<div class="slot-row${active?' on':''}"><div><b>Slot ${i}</b>${s.bargain?' <span title="Bargain run">☠</span>':''}${active?' <small class="good">in progress</small>':''}<br><small>Floor ${s.depth}/${MAX_DEPTH} · Lv ${s.lvl} · HP ${s.hp}/${s.max} · ${s.kills} kills · turn ${s.turn}<br>seed ${s.seed} · ${new Date(s.saved).toLocaleString()}</small></div>`+
   `<div class="slot-btns"><button data-act="go" data-i="${i}">${active?'Resume':'Continue'}</button><button data-act="del" data-i="${i}" class="danger">Delete</button></div></div>`}
 el.innerHTML=h||'<p>No saved runs.</p>';
 for(const b of el.querySelectorAll('button'))b.onclick=()=>{const i=+b.dataset.i;if(b.dataset.act==='go')continueRun(i);else deleteRun(i)};
 syncMenuButtons()}
// New Game takes the next open slot by itself
function newGameClick(){
 menuEl('menuNote').textContent='';
 const slot=[1,2,3].find(i=>!readSum(i));
 if(!slot){menuEl('menuNote').textContent='All three run slots are full. Finish or delete a run first.';showMenuRuns(true);return}
 if(inRun())saveRun();startRun(slot)}
function exitGame(){
 if(inRun())saveRun(); // the run is already autosaved; this just makes sure the latest turn is stored
 try{window.close()}catch(e){} // browsers only allow this for tabs the page opened itself, so also show a goodbye screen
 menuEl('exitScreen').style.display='flex'}
// leaving the page mid-run keeps the latest state (never an older one)
addEventListener('pagehide',saveRun);document.addEventListener('visibilitychange',()=>{if(document.hidden)saveRun()});
