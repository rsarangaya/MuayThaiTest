// Playtest helpers: run summary for bug reports and a debug console (toggle with the ` key).
function runSummary(){
 const p=G.p,s=stat(),eq=SLOTS.map(k=>`${SLOTNAME[k]}: ${p.eq[k]?`${p.eq[k].name} (${Math.ceil(p.eq[k].dur)}/${p.eq[k].maxdur}${p.eq[k].taint?', tainted '+p.eq[k].taint:''})`:'-'}`);
 return ["Romeo's Pixel Dungeon Inspired Zombie Rogue Like Game Name TBD but Soon Maybe ALso ITs HorroR and Harder To Beat Ideally - run summary",`build: ${BUILD}`,`Seed: ${G.seed}`,`Status: ${G.over?(p.hp>0?'won':'dead'):'alive'}${G.debugUsed?' (debug console used)':''}`,
  `Depth ${G.depth}/${MAX_DEPTH} (stage ${G.regIdx+1}, ${G.reg.n}) · turn ${G.turn} · level ${p.lvl} · ${p.kills} kills`,`HP ${p.hp}/${s.hp} · ATK+${s.atk} DEF+${s.def} · SPD ${Math.round(s.spd*100)}% · hunger ${Math.floor(p.hunger)}%`,
  ...eq,G.p.bargain?'Challenge: BARGAIN taken (half max HP, one endgame graft)':'',`Pack: ${p.inv.map(i=>i.name+(i.count>1?' x'+i.count:'')).join(', ')||'empty'}`,`Browser: ${navigator.userAgent}`].join('\n')}
function copySummary(){if(!inRun()&&!(G&&G.p)){return}const t=runSummary();
 (navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>msg('Run summary copied to the clipboard.','info'),()=>{prompt('Copy your run summary:',t)})}
const con={out:document.getElementById('conOut'),inp:document.getElementById('conIn'),modal:document.getElementById('console')};
function conPrint(t){const d=document.createElement('div');d.textContent=t;con.out.appendChild(d);con.out.scrollTop=1e9}
let conWasPaused=false;
function openConsole(){conWasPaused=paused;paused=true;stopTravel();document.getElementById('menu').style.display==='flex'&&(document.getElementById('menu').style.zIndex=10);con.modal.style.display='flex';con.inp.focus();if(!con.out.childNodes.length)conPrint('Debug console. Type "help".')}
function closeConsole(){con.modal.style.display='none';con.inp.blur();paused=conWasPaused;document.getElementById('menu').style.zIndex=''}
const DEBUG={
 help:()=>'help | seed [n] | goto <depth> | heal | hp <n> | xp <n> | hunger <n> | give <partId|itemId> [n] | ids | spawn <monster> | kill | reveal | tp | god | dev | marrow <n> | tiers | summary | /fightingdreamers (toggle playtest mode)',
 seed:a=>a[0]?(newGame(parseSeed(a[0])),`new run, seed ${G.seed}`):`seed ${G.seed}`,
 goto:a=>{const d=Math.max(1,Math.min(MAX_DEPTH,+a[0]||1));let guard=0;while(G.depth<d&&guard++<MAX_DEPTH+2)changeLevel(1,true);while(G.depth>d&&guard++<2*MAX_DEPTH+4)changeLevel(-1,true);ui();return `now on depth ${G.depth}`},
 heal:()=>{G.p.hp=stat().hp;ui();return 'healed'},
 hp:a=>{G.p.hp=+a[0]||1;ui();return `hp ${G.p.hp}`},
 xp:a=>{G.p.xp+=+a[0]||0;while(G.p.xp>=G.p.lvl*10){G.p.xp-=G.p.lvl*10;G.p.lvl++}ui();return `level ${G.p.lvl}`},
 hunger:a=>{G.p.hunger=+a[0]||0;ui();return `hunger ${G.p.hunger}`},
 ids:()=>'parts: '+TPL.map(t=>t.id).join(' ')+'\nitems: '+Object.keys(CONS).join(' '),
 give:a=>{const id=a[0];let it;if(CONS[id])it=mkCons(id,+a[1]||undefined);else if(TPL.some(t=>t.id===id)){it=mkPart(Math.max(3,G.depth),null,id);it.known=true}else return 'unknown id (try "ids")';
  if(!addInv(it))return 'pack full';ui();return `gave ${it.name}`},
 spawn:a=>{if(!MON[a[0]])return 'unknown monster: '+Object.keys(MON).join(' ');const p=G.p;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1]])if(walk(p.x+dx*2,p.y+dy*2)&&!monAt(p.x+dx*2,p.y+dy*2)){spawn(a[0],{x:p.x+dx*2,y:p.y+dy*2});return 'spawned'}return 'no room'},
 kill:()=>{const n=G.mons.length;for(const m of [...G.mons])kill(m);ui();return `killed ${n}`},
 reveal:()=>{for(const r of G.seen)r.fill(true);return 'map revealed'},
 tp:()=>{const r=pick(G.rooms.slice(1));snapPos(G.p,r.cx,r.cy);computeFOV();ui();return 'teleported'},
 tiers:()=>{if(TPL[0].hid===undefined)computePower();return [...TPL].sort((a,b)=>b.hid-a.hid||b.pow-a.pow).map(t=>`h${t.hid} pow ${t.pow.toFixed(1).padStart(5)} t${t.t} ${t.kind.padEnd(5)} ${t.id}`).join('\n')},
 god:()=>{G.god=!G.god;return 'god mode '+(G.god?'on':'off')},
 dev:()=>{G.dev=!G.dev;return 'dev vision '+(G.dev?'on (everything revealed each turn)':'off')},
 marrow:a=>{profile.marrow+=+a[0]||0;saveProfile();syncMenuPerk();return 'marrow '+profile.marrow},
 summary:()=>runSummary(),
 fightingdreamers:()=>toggleDreamers()};
function runCommand(line){
 const [c,...a]=line.trim().replace(/^\/+/,'').split(/\s+/);if(!c)return;conPrint('> '+line);
 const f=DEBUG[c.toLowerCase()];if(!f){conPrint('unknown command; try "help"');return}
 try{G.debugUsed=true;const out=String(f(a));G.debugUsed=true;conPrint(out)}catch(e){conPrint('error: '+e.message)}}
con.inp.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'){runCommand(con.inp.value);con.inp.value=''}else if(e.key==='Escape'||e.key==='`'){e.preventDefault();closeConsole()}});
