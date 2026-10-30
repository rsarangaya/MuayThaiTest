const KEYS={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0],w:[0,-1],s:[0,1],a:[-1,0],d:[1,0],q:[-1,-1],e:[1,-1],z:[-1,1],c:[1,1],' ':[0,0],'.':[0,0],7:[-1,-1],8:[0,-1],9:[1,-1],4:[-1,0],6:[1,0],1:[-1,1],2:[0,1],3:[1,1],5:[0,0]};
const keyDir=key=>Object.prototype.hasOwnProperty.call(KEYS,key)?KEYS[key]:Object.prototype.hasOwnProperty.call(KEYS,key.toLowerCase())?KEYS[key.toLowerCase()]:null;
const $=id=>document.getElementById(id);
const closeTopWindow=()=>{ // Esc: close the top-most window; with none open, open the menu
 if($('console').style.display==='flex')return closeConsole();
 if($('stageChoice').style.display==='flex')return; // must choose
 if($('bargain').style.display==='flex'){$('bargain').style.display='none';return}
 if(aim){cancelAim();return}
 if(altarOpen()){closeAltar();return}
 if(qpOpen()){closeQuickPicker();return}
 if($('codex').style.display==='flex'){$('codex').style.display='none';return}
 if($('manual').style.display==='flex'){$('manual').style.display='none';return}
 if($('logModal').style.display==='flex'){$('logModal').style.display='none';return}
 if(packIsOpen()){closePack();return}
 if(selItem&&selItem.mon){selItem=null;ui();return}
 if($('exitScreen').style.display==='flex'){$('exitScreen').style.display='none';openMenu();return}
 if($('menu').style.display==='flex'){if($('menuRuns').style.display!=='none'){showMenuRuns(false);return}if(inRun()&&!G.over)resumeRun();return} // Esc on the menu goes back to the game
 openMenu()};
const anyWindowOpen=()=>packIsOpen()||$('codex').style.display==='flex'||$('manual').style.display==='flex'||$('stageChoice').style.display==='flex'||$('bargain').style.display==='flex'||altarOpen()||qpOpen()||$('logModal').style.display==='flex'||$('console').style.display==='flex'||$('menu').style.display==='flex';
addEventListener('keydown',e=>{
 if(!e.key||e.ctrlKey||e.metaKey||e.altKey)return;
 if(e.key==='`'){e.preventDefault();con.modal.style.display==='flex'?closeConsole():openConsole();return}
 if(e.key==='Escape'){closeTopWindow();return}
 if(e.key==='Tab'&&!anyWindowOpen()){e.preventDefault();cycleTarget(e.shiftKey?-1:1);return} // TAB: next visible monster to inspect
 if(!inRun())return; // no run loaded: only the menu is usable
 const l=e.key.toLowerCase();
 // Shift+1..9 fire the nth quick button (abilities first, then consumables)
 if(e.shiftKey&&/^Digit[1-9]$/.test(e.code||'')){e.preventDefault();const f=hudActions[+e.code.slice(5)-1];if(f&&!anyWindowOpen())f();return}
 if(l==='l'){e.preventDefault();openLog();return}
 if(l==='i'||l==='b'){e.preventDefault();packIsOpen()?closePack():openPack();return}
 if(anyWindowOpen())return; // the rest only applies to the bare map
 if(l==='g'){e.preventDefault();grabTop();return}
 if(e.key==='>'){e.preventDefault();goStairs(G.sD);return}
 if(e.key==='<'){e.preventDefault();goStairs(G.sU);return}
 if(/^Digit\d$/.test(e.code||'')&&!e.shiftKey){e.preventDefault();const n=+e.code.slice(5);if(n>=1&&n<=6&&!e.repeat)useQuick(n-1);return} // top-row 1-6 fire the quickslots (the numpad keeps moving you)
 const k=keyDir(e.key);
 if(!k){if(l==='r'){e.preventDefault();startRest()}else if(l==='x'){e.preventDefault();scentAct()}return}
 e.preventDefault();
 if(e.shiftKey&&e.key.startsWith('Arrow')){panGoal=null;pan.x+=k[0]*2;pan.y+=k[1]*2;return}
 const card=CARD[e.key]||CARD[e.key.toLowerCase()];
 if(!card||(k[0]&&k[1])){stopTravel();playerAct(k[0],k[1]);return} // diagonal keys and wait act immediately
 // Cardinal keys are buffered for a moment so that two pressed together (W+A, Up+Left...) make ONE diagonal step instead of two steps.
 chordHeld.add(card);chordPending.add(card);
 if(e.repeat){chordFlush();return}
 if(!chordTimer)chordTimer=setTimeout(chordFlush,CHORD_MS)});
const CARD={ArrowUp:'u',ArrowDown:'d',ArrowLeft:'l',ArrowRight:'r',w:'u',s:'d',a:'l',d:'r',8:'u',2:'d',4:'l',6:'r'},CHORD_MS=45;
const chordHeld=new Set(),chordPending=new Set();let chordTimer=null;
function chordFlush(){
 clearTimeout(chordTimer);chordTimer=null;
 let x=0,y=0;for(const c of new Set([...chordPending,...chordHeld])){if(c==='u')y--;else if(c==='d')y++;else if(c==='l')x--;else x++}
 chordPending.clear();x=Math.max(-1,Math.min(1,x));y=Math.max(-1,Math.min(1,y));
 if(!x&&!y||!inRun()||anyWindowOpen())return;stopTravel();playerAct(x,y)}
addEventListener('keyup',e=>{const c=CARD[e.key]||(e.key&&CARD[e.key.toLowerCase()]);if(c)chordHeld.delete(c)});
addEventListener('blur',()=>{chordHeld.clear();chordPending.clear()});

// screen -> tile (the canvas is CSS-sized CW x CH; G.cx/G.cy is the tile at screen centre)
function screenTile(clientX,clientY){const r=cv.getBoundingClientRect(),ccx=Math.round(CW/2),ccy=Math.round(CH/2);
 const sx=(clientX-r.left)*(CW/r.width),sy=(clientY-r.top)*(CH/r.height);
 return {x:Math.floor((((sx-ccx)/zoom)+Math.round(G.cx*T))/T),y:Math.floor((((sy-ccy)/zoom)+Math.round(G.cy*T))/T)}}
const visibleMonAt=(x,y)=>{const m=G.mons.find(m=>m.x===x&&m.y===y);return m&&G.vis[y]&&G.vis[y][x]?m:null};
function inspectAt(clientX,clientY){const {x,y}=screenTile(clientX,clientY),m=visibleMonAt(x,y);
 if(m){selItem={mon:m};ui();return true}return false}
const pointers=new Map(),DRAG_PX=10,LONG_MS=450;let pinched=false,pinchDist=0,pinchZoom=1,dragging=false,longTimer=null,longFired=false;
const clampZoom=z=>Math.max(.6,Math.min(3,z));
cv.addEventListener('wheel',e=>{e.preventDefault();stopTravel();zoom=clampZoom(zoom*Math.exp(-e.deltaY*.0015))},{passive:false});
cv.addEventListener('contextmenu',e=>{e.preventDefault();if(!paused&&!G.over)inspectAt(e.clientX,e.clientY)});
// Minimap: tap or drag to look at that part of the floor. Only the camera moves; zoom is left exactly as it is.
let mmDrag=null;
const capture=id=>{try{cv.setPointerCapture(id)}catch(err){}}; // synthetic/stale pointers must never break a tap
function jumpCamera(tx,ty){panGoal={x:tx+.5-(G.sbx==null?G.cx:G.sbx),y:ty+.5-(G.sby==null?G.cy:G.sby)}}
function mmHit(e){if(!MM.w)return false;const r=cv.getBoundingClientRect(),x=(e.clientX-r.left)*(CW/r.width),y=(e.clientY-r.top)*(CH/r.height);return x>=MM.x-6&&x<=MM.x+MM.w+6&&y>=MM.y-6&&y<=MM.y+MM.h+6}
function mmJump(e){const r=cv.getBoundingClientRect(),x=(e.clientX-r.left)*(CW/r.width),y=(e.clientY-r.top)*(CH/r.height);jumpCamera(Math.max(0,Math.min(W-1,Math.floor((x-MM.x)/MM.s))),Math.max(0,Math.min(H-1,Math.floor((y-MM.y)/MM.s))))}
cv.addEventListener('pointerdown',e=>{if(e.button===2)return;if(mmHit(e)){e.preventDefault();capture(e.pointerId);mmDrag=e.pointerId;mmJump(e);return}if(paused||G.over)return;e.preventDefault();capture(e.pointerId);panGoal=null;
 pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY});
 longFired=false;clearTimeout(longTimer);
 if(pointers.size===1&&e.pointerType!=='mouse')longTimer=setTimeout(()=>{if(pointers.size===1&&!dragging&&!pinched){longFired=inspectAt(e.clientX,e.clientY)}},LONG_MS);
 if(pointers.size===2){pinched=true;clearTimeout(longTimer);stopTravel();const [a,b]=[...pointers.values()];pinchDist=Math.hypot(a.x-b.x,a.y-b.y);pinchZoom=zoom}});
cv.addEventListener('pointermove',e=>{if(mmDrag===e.pointerId){mmJump(e);return}const a=pointers.get(e.pointerId);if(!a)return;
 if(pointers.size===2){a.x=e.clientX;a.y=e.clientY;const [p1,p2]=[...pointers.values()];if(pinchDist>0)zoom=clampZoom(pinchZoom*Math.hypot(p1.x-p2.x,p1.y-p2.y)/pinchDist);return}
 if(pinched)return;
 if(!dragging&&Math.hypot(e.clientX-a.startX,e.clientY-a.startY)>DRAG_PX){dragging=true;clearTimeout(longTimer);stopTravel();cv.classList.add('drag')}
 if(dragging){panGoal=null;const r=cv.getBoundingClientRect(),k=(CW/r.width)/zoom/T;pan.x-=(e.clientX-a.x)*k;pan.y-=(e.clientY-a.y)*k}
 a.x=e.clientX;a.y=e.clientY});
cv.addEventListener('pointerup',e=>{if(mmDrag===e.pointerId){mmDrag=null;return}clearTimeout(longTimer);const a=pointers.get(e.pointerId);pointers.delete(e.pointerId);
 if(a&&!pinched&&!dragging&&!longFired&&!paused&&!G.over&&e.button!==2){const {x,y}=screenTile(e.clientX,e.clientY),p=G.p;stopTravel();
  if(aim){const m=aim.cands.find(m=>m.x===x&&m.y===y&&!m.dead);if(m)fireAim(m);else if(aim.tile&&G.seen[y]&&G.seen[y][x]&&cheb({x,y},p)<=aim.range&&(aim.seen||(G.vis[y][x]&&los(p.x,p.y,x,y)))){const f=aim.fn;endAim();f(x,y)}else cancelAim();if(!pointers.size){pinched=false;pinchDist=0;dragging=false;cv.classList.remove('drag')}return}
  if(selItem&&selItem.mon)selItem=null; // tapping elsewhere dismisses the inspect card
  if(x===p.x&&y===p.y&&G.items.some(i=>i.x===x&&i.y===y)){grabTop();return} // tap your own tile to pick up
  const adj=Math.max(Math.abs(x-p.x),Math.abs(y-p.y))===1;
  if(adj)playerAct(x-p.x,y-p.y);
  else if(visibleMonAt(x,y)){const m=visibleMonAt(x,y);if(m.ally){selItem={mon:m};ui()}else startChase(m)} // tap an enemy: charge it and attack (long-press / right-click / Tab still inspect)
  else if(walk(x,y)&&G.seen[y][x])startTravel(x,y);
  else ui()}
 if(!pointers.size){pinched=false;pinchDist=0;dragging=false;cv.classList.remove('drag')}});
cv.addEventListener('pointercancel',e=>{if(mmDrag===e.pointerId)mmDrag=null;clearTimeout(longTimer);pointers.delete(e.pointerId);if(!pointers.size){pinched=false;dragging=false;cv.classList.remove('drag')}});

const goStairs=s=>{if(s.x<0)msg('There is no way further down. Find The Surgeon.','warn');else if(G.seen[s.y][s.x])startTravel(s.x,s.y);else msg('You have not found that staircase yet.','warn')};
$('bDown').onclick=()=>goStairs(G.sD);
$('bUp').onclick=()=>goStairs(G.sU);
$('bMenu').onclick=openMenu;
$('bView').onclick=()=>{panGoal={x:0,y:0}}; // recentre on the player; zoom stays as the player set it
$('bWait').onclick=()=>{stopTravel();playerAct(0,0)};
$('bRest').onclick=startRest;
$('bScent').onclick=scentAct;
$('bPack').onclick=openPack;
$('bGround').onclick=grabTop;
$('packClose').onclick=closePack;
$('pack').addEventListener('pointerdown',e=>{if(e.target===$('pack'))closePack()}); // tap outside the window to close it
$('bLog').onclick=openLog;$('logClose').onclick=()=>{$('logModal').style.display='none'};
$('mClose').onclick=resumeRun;
$('qpClear').onclick=()=>{ensureQuick(G.p)[qpSlot]=null;closeQuickPicker();ui()};$('qpClose').onclick=closeQuickPicker;
$('altarGo').onclick=makeOffering;$('altarLeave').onclick=closeAltar;
$('mContinue').onclick=()=>showMenuRuns(true);$('mRunsBack').onclick=()=>showMenuRuns(false);
$('mNewGame').onclick=newGameClick;$('mExit').onclick=exitGame;$('exitBack').onclick=()=>{$('exitScreen').style.display='none';openMenu()};
$('bgYes').onclick=()=>chooseBargain(true);$('bgNo').onclick=()=>chooseBargain(false);$('bgCancel').onclick=()=>{$('bargain').style.display='none'};
$('bRise').onclick=()=>startRun(curSlot||1);
$('bToMenu').onclick=()=>{$('over').style.display='none';openMenu()};
$('mCopy').onclick=copySummary;$('oCopy').onclick=copySummary;
$('mDebug').onclick=openConsole;$('conClose').onclick=closeConsole;
bindSettings();applySettings();

// ---- TAB cycling and the desktop hover tooltip ----
function cycleTarget(dir){
 const p=G.p,list=G.mons.filter(m=>!m.ally&&G.vis[m.y][m.x]).sort((a,b)=>cheb(a,p)-cheb(b,p));
 if(!list.length){msg('Nothing hostile in view.','info');return}
 const cur=selItem&&selItem.mon?list.indexOf(selItem.mon):-1;
 selItem={mon:list[(cur+dir+list.length)%list.length]};ui()}
const tip=$('tip');
function tipFor(x,y){
 if(x<0||y<0||x>=W||y>=H||!G.seen[y][x])return '';
 const m=G.mons.find(m=>m.x===x&&m.y===y);if(m&&G.vis[y][x])return `${m.n}${m.ally?' (yours)':''} · HP ${m.hp}/${m.max}${m.alert?'':' · asleep'}`;
 const its=G.items.filter(i=>i.x===x&&i.y===y);if(its.length)return its.map(i=>i.it.name+(i.it.count>1?' x'+i.it.count:'')).join(', ');
 if(x===G.sD.x&&y===G.sD.y)return 'Stairs down';if(x===G.sU.x&&y===G.sU.y)return 'Stairs up';
 const t=G.map[y][x];return t===2||t===5?'Door':t===7?'Bone barricade':t===10?'Altar - bump to make an offering':t===8?'Pile of bodies - bump to search':t===9?'Swamp - slows you':''}
cv.addEventListener('pointermove',e=>{
 if(e.pointerType!=='mouse'||paused||G.over||dragging||pointers.size||mmDrag!=null||mmHit(e)){tip.style.display='none';return}
 const {x,y}=screenTile(e.clientX,e.clientY),s=tipFor(x,y);
 if(!s){tip.style.display='none';return}
 tip.textContent=s;tip.style.display='block';tip.style.left=Math.min(innerWidth-270,e.clientX+14)+'px';tip.style.top=(e.clientY+16)+'px'});
cv.addEventListener('pointerleave',()=>{tip.style.display='none'});
cv.addEventListener('pointerdown',()=>{tip.style.display='none'});

// ---- codex / manual / perk selector ----
$('mCodex').onclick=()=>openCodex();$('codexClose').onclick=()=>{$('codex').style.display='none'};
$('mManual').onclick=()=>{$('manualBody').innerHTML=manualHtml();$('manual').style.display='flex'};$('manualClose').onclick=()=>{$('manual').style.display='none'};
for(const b of document.querySelectorAll('#codexTabs button'))b.onclick=()=>{codexTab=b.dataset.tab;renderCodex()};
$('perkSel').onchange=e=>{profile.start=e.target.value;saveProfile()};
$('buildStamp').textContent=BUILD;syncMenuPerk();
// The canvas always fills the screen; its backing store follows the window size (and device pixel ratio).
const wrap=$('mapwrap');
function fitScreen(){resizeCanvas(wrap.clientWidth,wrap.clientHeight)}
let centerShown=false;
function syncCenterBtn(){const off=Math.abs(pan.x)+Math.abs(pan.y)>.4;if(off!==centerShown){centerShown=off;$('bView').style.display=off?'':'none'}}
setInterval(syncCenterBtn,250);
new ResizeObserver(fitScreen).observe(wrap);addEventListener('resize',fitScreen);fitScreen();
idleState();openMenu();loop(); // nothing starts until the player picks a slot
