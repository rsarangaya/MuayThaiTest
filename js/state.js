let G,cv=document.getElementById('cv'),ctx=cv.getContext('2d');ctx.imageSmoothingEnabled=false;
// The canvas fills the whole play area: CW/CH are its CSS size in px, DPR the (capped) pixel density. lc is the lighting layer.
let CW=480,CH=480,DPR=1;
const lc=document.createElement('canvas');lc.width=lc.height=480;const lctx=lc.getContext('2d');
function resizeCanvas(w,h){CW=Math.max(160,Math.floor(w));CH=Math.max(160,Math.floor(h));DPR=Math.min(2,window.devicePixelRatio||1);cv.width=Math.round(CW*DPR);cv.height=Math.round(CH*DPR);cv.style.width=CW+'px';cv.style.height=CH+'px';lc.width=CW;lc.height=CH}
const ZOOM_DEFAULT=innerWidth>=900?1.4:1;
let selItem=null,travel=null,travelTimer=null,tick=0,paused=true,zoom=ZOOM_DEFAULT;
let panGoal=null; // smooth camera jumps (minimap taps, Centre button) ease the pan offset toward this
const pan={x:0,y:0}; // camera offset from the player, in tiles; persists while moving, reset by "Center view" or a new level
let NOW=performance.now(); // frame timestamp (ms) used by all animations
// Visual effect queue. kind picks the drawing routine in render.js (drawFX); org/tgt are live entities the effect follows;
// delay (frames) staggers effects. Plain melee swings use no kind and fall back to the classic arc.
const TRAVEL_MS=95; // click-to-travel step interval: shorter than a step's slide, so the queue never runs dry and the walk stays continuous
function addFX(kind,o={}){const life=o.life||20;if(o.org&&o.tgt&&o.org.x!==undefined&&o.tgt.x!==undefined)faceTo(o.org,o.tgt.x);G.attackFX.push({kind,seed:Math.random()*100,delay:0,...o,life,max:life})}
// turn to face a target's side (the player stores facing in .face, monsters in .fx)
function faceTo(o,tx){const s=Math.sign(tx-o.x);if(!s)return;if(o.face!==undefined)o.face=s;else o.fx=s}
const lunge=(o,tx,ty)=>{faceTo(o,tx);o.lg={dx:Math.sign(tx-o.x),dy:Math.sign(ty-o.y),t0:NOW}}; // attacker darts toward its target and back
const LVLKEYS=['map','rooms','vis','seen','shade','decor','items','mons','sD','sU','torches','barr','mounds'];
function openMenu(){paused=true;stopTravel();closePack();showMenuRuns(false);syncMenuPerk();document.getElementById('menu').style.display='flex'}
function resumeRun(){if(!inRun()||G.over)return;hideMenuForRun()}
// A seed typed in the menu (number or any text) makes the run reproducible; blank = random.
function parseSeed(v){v=String(v||'').trim();if(!v)return null;if(/^\d+$/.test(v))return(+v)>>>0;let h=2166136261;for(const ch of v){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function newGame(seedArg){
 const seedEl=document.getElementById('seedIn'),seed=seedArg!=null?seedArg>>>0:(seedEl&&parseSeed(seedEl.value))??(Math.random()*4294967296>>>0);
 seedRng(seed);stopRest();cancelAim();
 document.getElementById('over').style.display='none';
 G={seed,mods:{0:'standard'},depth:0,turn:0,levels:{},ward:{},rites:false,dropCounts:{},p:{x:0,y:0,hp:20,lvl:1,xp:0,hunger:10,bonusHp:0,candle:0,rest:0,eq:{head:null,torso:null,armL:mkStarter('armL'),armR:mkStarter('armR'),legs:mkStarter('legs')},inv:[mkCons('flask'),mkCons('scrap')],kills:0,face:1},log:[],floaters:[],parts:[],attackFX:[],dying:[],shake:0,over:false,cx:0,cy:0};
 startPerkSetup(G.p);
 if(pendingBargain){applyBargain(G.p)}pendingBargain=false;
 ensureQuick(G.p);for(const k of SLOTS)if(G.p.eq[k])autoQuick(G.p.eq[k]); // grafts that arrive with an ability (bargain, perk) get their quickslot
 paused=false;document.getElementById('menu').style.display='none';selItem=null;pan.x=pan.y=0;stopTravel();changeLevel(1,true);
 G.cx=G.p.x+.5;G.cy=G.p.y+.5;
 msg('You claw out of a shallow grave. You are so hungry.','warn');if(G.p.bargain)msg(`The dead take half of you. In return: ${G.p.bargainName}, which barely rots.`,'bad');msg(`Seed ${G.seed}`,'info');
 const sd=document.getElementById('seedShow');if(sd)sd.textContent=G.seed;
 ui()}
function msg(t,c=''){G.log.unshift({t,c,turn:G.turn,t0:performance.now()});if(G.log.length>300)G.log.pop();renderLog()}
const fx=k=>SLOTS.reduce((a,s)=>a+(G.p.eq[s]&&G.p.eq[s].fx===k?1:0),0);
function stat(){const p=G.p,mod=MODS[(G.mods&&G.mods[G.regIdx])||'standard']||MODS.standard,
  s={hp:(h=>p.bargain?Math.max(6,Math.round(h/2)):h)(Math.max(8,20+(p.lvl-1)*3+p.bonusHp-(p.drain||0))),atk:0,def:0,sight:Math.max(3,6+(p.candle>0?2:0)-mod.sight),steal:0,spd:0};
 for(const k of SLOTS){const e=p.eq[k];if(!e)continue;for(const j in e.stats)if(j!=='spd')s[j]+=e.stats[j]}
 // Movement speed (chance per step that monsters lose their turn; negative = they gain one).
 // Leg grafts add speed in proportion to their condition, so rotting legs slow you; no legs at all means dragging yourself along.
 const lg=p.eq.legs;
 if(!lg)s.spd=p.perk==='ironbound'?0:-.3;
 else{const cond=Math.max(0,lg.dur/lg.maxdur);s.spd=(lg.stats.spd||0)*(.35+.65*cond)-(cond<.25?.1:0)}
 s.def=Math.min(8,s.def);s.spd=Math.max(-.4,Math.min(.6,s.spd));return s}
