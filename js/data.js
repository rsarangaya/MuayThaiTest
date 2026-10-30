const SLOTS=['head','torso','armL','armR','legs'];
const SLOTNAME={head:'Head',torso:'Torso',armL:'Left Arm',armR:'Right Arm',legs:'Legs'};
const KINDNAME={head:'Head',torso:'Torso',arm:'Arm',legs:'Legs'};
const TPL=[
{id:'h_crow',kind:'head',n:'Crow Skull',t:1,col:'#4a4a62',spr:'crow',st:{sight:2,hp:2},src:'crow'},
{id:'h_nest',kind:'head',n:'Maggot-Nest Head',t:1,col:'#d0c8a0',spr:'nest',st:{hp:4,steal:1},src:'maggot'},
{id:'h_zeal',kind:'head',n:"Zealot's Skull",t:2,col:'#a02828',spr:'zeal',st:{atk:1,def:1,hp:4},src:'cultist'},
{id:'h_bloat',kind:'head',n:'Bloat Head',t:3,col:'#8a9a50',spr:'bloat',st:{hp:14},fx:'thorns',fxd:'Acid Spit: melee attackers take 1 damage when they hit you',src:'bloat'},
{id:'h_golem',kind:'head',n:'Golem Brow',t:4,col:'#a87a68',spr:'golem',st:{def:4,hp:8},src:'golem'},
{id:'h_mask',kind:'head',n:"Surgeon's Mask",t:5,col:'#d0d8d8',spr:'mask',st:{atk:2,def:2,sight:2,steal:1,hp:4},src:'boss'},
{id:'t_maggot',kind:'torso',n:'Maggot-Riddled Torso',t:1,col:'#c8c0a0',spr:'maggot',st:{hp:10},src:'maggot'},
{id:'t_cloak',kind:'torso',n:'Feather-Cloak Torso',t:2,col:'#3a3a52',spr:'cloak',st:{def:1,hp:2},fx:'dodge',fxd:'Light Fall: 10% chance to dodge any attack',src:'crow'},
{id:'t_rib',kind:'torso',n:'Cultist Ribcage',t:3,col:'#b03030',spr:'rib',st:{def:2,hp:4},fx:'ward',fxd:'Bone Ward: the first hit on each floor is halved',src:'cultist'},
{id:'t_belly',kind:'torso',n:'Bloat Belly',t:4,col:'#8a8a50',spr:'belly',st:{hp:24},fx:'gas',fxd:'Gas Sac: bursts on a hit of 8+, dealing 4 to adjacent enemies (part is lost)',src:'bloat'},
{id:'t_slab',kind:'torso',n:'Golem Slab',t:5,col:'#a87868',spr:'slab',st:{def:4,hp:10},fx:'regen',fxd:'Stitched Hide: +1 HP every 5 turns while hunger is under 75%',src:'golem'},
{id:'a_crow',kind:'arm',n:'Crow Wing-Claw',t:1,col:'#3a3a52',spr:'crow',st:{atk:1},fx:'peck',fxd:'Quick Peck: 15% chance to strike twice',src:'crow'},
{id:'a_hook',kind:'arm',n:'Rusty Hook Arm',t:2,col:'#a8785a',spr:'hook',st:{atk:2},fx:'rend',fxd:'Rend: 25% chance to make the target bleed (4 turns)',src:'cultist'},
{id:'a_scythe',kind:'arm',n:'Bone Scythe Arm',t:3,col:'#d8d0b0',spr:'scythe',st:{atk:2},fx:'sweep',fxd:'Sweep: also hits one adjacent enemy for half damage',src:'cultist'},
{id:'a_fist',kind:'arm',n:'Maggot-Fist',t:3,col:'#d0c8a0',spr:'fist',st:{atk:2},fx:'infest',fxd:'Infest: kills heal 2 extra HP',src:'maggot'},
{id:'a_gfist',kind:'arm',n:'Golem Fist',t:4,col:'#a87868',spr:'gfist',st:{atk:3},fx:'crush',fxd:'Crush: 20% chance to stun the target for a turn',src:'golem'},
{id:'a_saw',kind:'arm',n:'Bonesaw Arm',t:5,col:'#d0d8d8',spr:'saw',st:{atk:6},fx:'brittle',fxd:'Brittle: loses 2 rot per hit',src:'boss'},
{id:'l_crawl',kind:'legs',n:'Maggot Crawlers',t:1,col:'#d0c8a0',spr:'crawl',st:{spd:.10,hp:4},src:'maggot'},
{id:'l_crow',kind:'legs',n:'Crow Legs',t:2,col:'#d0a030',spr:'crow',st:{spd:.20,hp:4},src:'crow'},
{id:'l_stilt',kind:'legs',n:'Stilt Legs',t:3,col:'#8a6a4a',spr:'stilt',st:{spd:.25,sight:1,hp:5},src:'bloat'},
{id:'l_pillar',kind:'legs',n:'Golem Pillars',t:4,col:'#a87868',spr:'pillar',st:{def:3,hp:10},fx:'planted',fxd:'Planted: immune to stun and knockback',src:'golem'},
{id:'l_runner',kind:'legs',n:"Runner's Legs",t:5,col:'#c8c0a0',spr:'runner',st:{spd:.35,def:1,hp:9},fx:'sprint',fxd:'Sprint: the first move after resting 5+ turns is free',src:'boss'},
{id:'t_apron',kind:'torso',n:"Surgeon's Apron",t:5,col:'#c8d0d0',spr:'labcoat',st:{def:3,hp:12},fx:'ward',fxd:'Bone Ward: the first hit on each floor is halved',src:'boss'},
// ---- parts dropped by the rest of the bestiary: every monster drops grafts of its own kind ----
{id:'l_penitent',kind:'legs',n:"Penitent's Legs",t:2,col:'#a02828',spr:'runner',st:{spd:.12,hp:3},src:'cultist'},
{id:'a_bloatarm',kind:'arm',n:'Gas-Swollen Arm',t:3,col:'#8a9a50',spr:'gfist',st:{atk:1,hp:8},src:'bloat'},
{id:'h_ghoul',kind:'head',n:'Ghoul Maw',t:2,col:'#7a8a68',spr:'ghoul',st:{atk:1,steal:1,hp:2},src:'ghoul'},
{id:'a_ghoul',kind:'arm',n:'Ghoul Claws',t:2,col:'#7a8a68',spr:'hook',st:{atk:2},fx:'rend',fxd:'Rend: 25% chance to make the target bleed (4 turns)',src:'ghoul'},
{id:'t_ghoul',kind:'torso',n:'Exposed-Rib Torso',t:3,col:'#7a8a68',spr:'rib',st:{def:1,hp:6},src:'ghoul'},
{id:'l_ghoul',kind:'legs',n:'Ghoul Lope',t:3,col:'#7a8a68',spr:'lope',st:{spd:.22,hp:3},src:'ghoul'},
{id:'h_acolyte',kind:'head',n:'Hexing Hood',t:3,col:'#5a3a8a',spr:'acolyte',st:{sight:1,hp:3},src:'acolyte'},
{id:'a_acolyte',kind:'arm',n:'Ritual Hand',t:3,col:'#8a6aaa',spr:'fist',st:{atk:1},src:'acolyte'},
{id:'t_acolyte',kind:'torso',n:'Hexed Robes',t:4,col:'#4a2a6a',spr:'cloak',st:{def:1,hp:5},fx:'dodge',fxd:'Light Fall: 10% chance to dodge any attack',src:'acolyte'},
{id:'l_acolyte',kind:'legs',n:'Veiled Legs',t:3,col:'#4a2a6a',spr:'stilt',st:{spd:.18,hp:4},src:'acolyte'},
{id:'h_warden',kind:'head',n:"Warden's Helm",t:3,col:'#9a4a3a',spr:'golem',st:{def:2,hp:6},src:'warden'},
{id:'t_warden',kind:'torso',n:"Warden's Plate",t:3,col:'#9a4a3a',spr:'slab',st:{def:3,hp:8},src:'warden'},
{id:'a_warden',kind:'arm',n:"Warden's Mace",t:3,col:'#9a4a3a',spr:'gfist',st:{atk:3},src:'warden'},
{id:'l_warden',kind:'legs',n:"Warden's Greaves",t:3,col:'#9a4a3a',spr:'pillar',st:{def:2,hp:6},src:'warden'},
{id:'h_matron',kind:'head',n:"Matron's Visage",t:4,col:'#c07a9a',spr:'bloat',st:{hp:10,sight:1},fx:'thorns',fxd:'Acid Spit: melee attackers take 1 damage when they hit you',src:'matron'},
{id:'t_matron',kind:'torso',n:"Matron's Womb",t:4,col:'#c07a9a',spr:'belly',st:{hp:20},src:'matron'},
{id:'a_matron',kind:'arm',n:"Matron's Tendril",t:4,col:'#c07a9a',spr:'tentacle',st:{atk:2},fx:'sweep',fxd:'Sweep: also hits one adjacent enemy for half damage',src:'matron'},
{id:'l_matron',kind:'legs',n:"Brood-Mother's Legs",t:4,col:'#c07a9a',spr:'crawl',st:{spd:.2,hp:8},src:'matron'},
{id:'h_abom',kind:'head',n:'Many-Eyed Head',t:5,col:'#8a5ab0',spr:'abom',st:{sight:3,atk:1,hp:6},src:'abomination'},
{id:'t_abom',kind:'torso',n:'Pulsing Mass',t:5,col:'#6a4a8a',spr:'mass',st:{def:1,hp:30},fx:'regen',fxd:'Stitched Hide: +1 HP every 5 turns while hunger is under 75%',src:'abomination'},
{id:'a_nyx',kind:'arm',n:'Nyx Lash',t:5,col:'#7a4aa0',spr:'tentacle',st:{atk:3},src:'abomination'},
{id:'l_abom',kind:'legs',n:'Writhing Limbs',t:5,col:'#6a4a8a',spr:'crawl',st:{spd:.30,hp:8},src:'abomination'},
{id:'h_guard',kind:'head',n:'Guard Helmet',t:4,col:'#5a6a8a',spr:'guard',st:{def:3,hp:6},src:'guard'},
{id:'t_guard',kind:'torso',n:'Riot Vest',t:4,col:'#3a4a6a',spr:'vest',st:{def:3,hp:8},src:'guard'},
{id:'a_baton',kind:'arm',n:'Shock Baton',t:4,col:'#3a4a6a',spr:'baton',st:{atk:3},fx:'crush',fxd:'Crush: 20% chance to stun the target for a turn',src:'guard'},
{id:'l_guard',kind:'legs',n:'Combat Boots',t:4,col:'#3a4a6a',spr:'boots',st:{def:2,spd:.2,hp:6},src:'guard'},
{id:'h_rifle',kind:'head',n:"Marksman's Cap",t:4,col:'#6a7a4a',spr:'guard',st:{sight:3,atk:1},src:'rifleman'},
{id:'t_rifle',kind:'torso',n:'Bandolier Torso',t:4,col:'#5a6a3a',spr:'vest',st:{def:2,hp:6},src:'rifleman'},
{id:'a_rifle',kind:'arm',n:'Rifle Arm',t:5,col:'#5a6a3a',spr:'gun',st:{atk:3},src:'rifleman'},
{id:'l_rifle',kind:'legs',n:"Hunter's Legs",t:5,col:'#5a6a3a',spr:'boots',st:{spd:.30,hp:6},fx:'sprint',fxd:'Sprint: the first move after resting 5+ turns is free',src:'rifleman'},
{id:'h_sci',kind:'head',n:'Goggled Head',t:4,col:'#d8d8d0',spr:'scientist',st:{sight:2,atk:1,hp:4},src:'scientist'},
{id:'t_sci',kind:'torso',n:'Lab Coat Torso',t:4,col:'#d8d8d0',spr:'labcoat',st:{hp:8,def:1},src:'scientist'},
{id:'a_sci',kind:'arm',n:'Syringe Arm',t:5,col:'#d8d8d0',spr:'syringe',st:{atk:2},src:'scientist'},
{id:'l_sci',kind:'legs',n:'Surgical Legs',t:4,col:'#d8d8d0',spr:'boots',st:{spd:.20,hp:5},src:'scientist'},
// ---- support-role monsters
{id:'h_mender',kind:'head',n:"Mender's Cowl",t:3,col:'#8aa88a',spr:'acolyte',st:{hp:4,sight:1},src:'mender'},
{id:'t_mender',kind:'torso',n:"Mender's Vestments",t:3,col:'#6a8a6a',spr:'cloak',st:{def:1,hp:6},src:'mender'},
{id:'a_mender',kind:'arm',n:'Salve-Hand',t:3,col:'#9ab89a',spr:'fist',st:{atk:1},src:'mender'},
{id:'l_mender',kind:'legs',n:'Shuffling Legs',t:3,col:'#6a8a6a',spr:'stilt',st:{spd:.15,hp:3},src:'mender'},
{id:'h_wailer',kind:'head',n:'Death Mask',t:3,col:'#cfd8e0',spr:'mask',st:{sight:2,hp:2},src:'wailer'},
{id:'t_wailer',kind:'torso',n:"Screamer's Chest",t:3,col:'#cfd8e0',spr:'rib',st:{hp:6},src:'wailer'},
{id:'a_wailer',kind:'arm',n:'Wail-Claws',t:3,col:'#cfd8e0',spr:'hook',st:{atk:2},fx:'rend',fxd:'Rend: 25% chance to make the target bleed (4 turns)',src:'wailer'},
{id:'l_wailer',kind:'legs',n:'Drifting Legs',t:3,col:'#cfd8e0',spr:'lope',st:{spd:.22,hp:2},src:'wailer'},
{id:'h_brood',kind:'head',n:'Brood Crown',t:4,col:'#9a7a5a',spr:'bloat',st:{hp:8,sight:1},src:'broodmother'},
{id:'t_brood',kind:'torso',n:'Spawning Sac',t:4,col:'#9a7a5a',spr:'belly',st:{hp:18},src:'broodmother'},
{id:'a_brood',kind:'arm',n:'Brood Arm',t:4,col:'#9a7a5a',spr:'fist',st:{atk:2},src:'broodmother'},
{id:'l_brood',kind:'legs',n:'Brood Legs',t:4,col:'#9a7a5a',spr:'crawl',st:{spd:.12,hp:8},src:'broodmother'},
{id:'h_leech',kind:'head',n:'Leech Maw',t:4,col:'#7a3a7a',spr:'ghoul',st:{atk:1,steal:1,hp:2},src:'leech'},
{id:'t_leech',kind:'torso',n:'Engorged Torso',t:4,col:'#7a3a7a',spr:'belly',st:{hp:14,def:1},src:'leech'},
{id:'a_leech',kind:'arm',n:'Sucker Arm',t:4,col:'#7a3a7a',spr:'tentacle',st:{atk:2,steal:1},src:'leech'},
{id:'l_leech',kind:'legs',n:'Leech Crawlers',t:4,col:'#7a3a7a',spr:'crawl',st:{spd:.2,hp:5},src:'leech'},
{id:'h_medic',kind:'head',n:"Medic's Cap",t:4,col:'#ececec',spr:'scientist',st:{sight:2,hp:4},src:'medic'},
{id:'t_medic',kind:'torso',n:'Trauma Vest',t:4,col:'#ececec',spr:'labcoat',st:{def:2,hp:8},src:'medic'},
{id:'a_medic',kind:'arm',n:'Hypo Arm',t:5,col:'#ececec',spr:'syringe',st:{atk:2},src:'medic'},
{id:'l_medic',kind:'legs',n:'Field Boots',t:4,col:'#ececec',spr:'boots',st:{spd:.22,def:1},src:'medic'}];
// Hidden curses on grafts. Revealed (and applied) the moment a graft is attached; Formaldehyde Brine can cleanse one.
const TAINT={rot:{n:'Rotting',d:'it decays 80% faster'},itch:{n:'Ravenous',d:'it makes you hungrier every turn'},weep:{n:'Weeping',d:'it seeps: -1 HP every 8 turns'}};
const QUAL=[['Withered',.6],['',1],['',1],['Sturdy',1.2],['Pristine',1.5]];
// ---------- hidden power tiers ----------
// Every graft gets a power score from its stats, passive effect and active ability, banded into hidden tiers 1-5 (never shown to
// the player). Loot leans toward grafts whose hidden tier suits the depth, and the strongest ones are naturally scarcer.
const FX_POWER={sprint:4,regen:6,dodge:4,ward:5,thorns:3,peck:3,rend:4,sweep:4,infest:3,crush:5,brittle:-2,planted:2,gas:2};
function computePower(){
 for(const t of TPL){const s=t.st;t.pow=(s.atk||0)*5+(s.def||0)*4+(s.hp||0)*.7+(s.sight||0)*2.5+(s.steal||0)*5+(s.spd||0)*50+(FX_POWER[t.fx]||0)+(typeof ABIL!=='undefined'&&ABIL[t.id]?7:0)}
 const order=[...TPL].sort((a,b)=>a.pow-b.pow);
 order.forEach((t,i)=>{const q=i/order.length;t.hid=q<.25?1:q<.5?2:q<.7?3:q<.9?4:5})}
const HID_RARITY=[0,1,1,.9,.7,.5];
// ---------- even variety: a shuffled bag of slots ----------
// Picking a template uniformly made kinds follow template counts (early tiers have two heads to one of everything else, so heads
// flooded the early game). Instead each drop takes the next slot from a shuffled bag holding head, torso, arm and legs once, so the
// kinds stay level (never more than two of the same slot in a row). The bag lives on the run, so it is seeded and saved with it.
const _fallbackBag={};
function nextKind(){const h=(typeof G!=='undefined'&&G)||_fallbackBag;
 if(!h.kindBag||!h.kindBag.length){const b=['head','torso','arm','legs'];for(let i=b.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[b[i],b[j]]=[b[j],b[i]]}h.kindBag=b}
 return h.kindBag.pop()}
function pickTemplate(depth,src){
 if(TPL[0].hid===undefined)computePower();
 const cur=Math.min(5,Math.ceil(depth/4)),kind=nextKind();
 let pool=TPL.filter(t=>t.kind===kind&&(t.t===cur||(cur>1&&t.t===cur-1)));
 if(!pool.length)pool=TPL.filter(t=>t.kind===kind&&Math.abs(t.t-cur)<=1);
 if(src&&R()<.45){const sp=pool.filter(t=>t.src===src);if(sp.length)pool=sp}
 const w=pool.map(t=>(t.t===cur?.5:.8)*HID_RARITY[t.hid]/(1+Math.abs(t.hid-cur)*.5));
 let r=R()*w.reduce((x,y)=>x+y,0);for(let i=0;i<pool.length;i++){r-=w[i];if(r<=0)return pool[i]}return pool[pool.length-1]}
function mkPart(depth,src,forceId){
 const t=forceId?TPL.find(x=>x.id===forceId):pickTemplate(depth,src);
 const q=pick(QUAL),maxdur=Math.round(100*Math.max(1,q[1])); return {type:'part',id:t.id,name:(q[0]?q[0]+' ':'')+t.n,kind:t.kind,spr:t.spr,col:t.col,stats:{...t.st},fx:t.fx||'',fxd:t.fxd||'',tier:t.t,taint:depth>=3&&R()<.22*(typeof G!=='undefined'&&G&&G.taintK||1)?pick(Object.keys(TAINT)):'',known:false,fz:0,slot:t.kind==='arm'?'armR':t.kind,maxdur,dur:Math.round(100*q[1]),decay:[0,.18,.24,.32,.42,.55][t.t]}}
const CONS={
flask:{n:'Embalming Flask',col:'#b01820',w:30,md:1,stack:1,desc:'Drink: heal 10 + 2 per floor depth.'},
scrap:{n:'Scrap of Flesh',col:'#d86a6a',w:25,md:1,stack:1,desc:'Eat: hunger -20, heal 2.'},
shards:{n:'Bone Shards',col:'#ddd8c0',w:15,md:1,stack:1,desc:'Throw at the nearest enemy (range 5): 2-4 damage.',throw:1,cnt:4},
meat:{n:'Tainted Meat',col:'#78b030',w:12,md:6,stack:1,desc:'Eat: hunger -35. 25% chance of nausea (-3 HP).'},
brine:{n:'Formaldehyde Brine',col:'#4a80b0',w:10,md:4,stack:1,desc:'Restores half the rot (missing durability) of your most decayed attached part and cleanses its taint.'},
pyre:{n:'Pyre Flask',col:'#e86a28',w:9,md:8,stack:1,desc:'Throw (range 5): 3 damage and sets the target ablaze (2 damage a turn for 4 turns).',throw:1},
grease:{n:'Grave Tar',col:'#5a5a78',w:9,md:6,stack:1,desc:'Throw (range 5): slows every enemy in radius 1 for 6 turns.',throw:1},
candle:{n:'Grave Candle',col:'#d8a830',w:8,md:4,stack:1,desc:'Light it: +2 sight for 60 turns.'},
map:{n:'Corpse Map',col:'#b8a070',w:8,md:4,stack:1,desc:'Reveals the layout of this floor.'},
jar:{n:'Putrid Jar',col:'#6a4a3a',w:8,md:6,stack:1,desc:'Throw (range 5): 4 damage in radius 1 plus poison for 5 turns.',throw:1},
rite:{n:'Burial Rite',col:'#b8a070',w:6,md:8,stack:1,desc:'Read: teleport to a random room.'},
serum:{n:'Graft Serum',col:'#78b030',w:0,md:1,stack:1,desc:'Inject: permanently +3 max HP.'},
rites:{n:'Last Rites',col:'#d8a830',w:0,md:12,stack:0,desc:'Passive: if you would die, revive once at 50% HP.'}};
// Chance that a defeated monster drops one of its own body parts. Mini-bosses and the final boss always do.
const PART_CHANCE={maggot:.10,crow:.12,cultist:.14,bloat:.14,golem:.18,ghoul:.14,acolyte:.16,guard:.16,rifleman:.16,scientist:.18,mender:.16,wailer:.14,broodmother:.2,leech:.16,medic:.18};
// Monster drops take their slot from the same shuffled bag as floor loot, then pick one of that monster's own grafts in that slot,
// so variety stays level across every source of grafts, not just the floor.
function mkMonsterPart(m,depth){const own=TPL.filter(t=>t.src===m.k);if(!own.length)return mkPart(depth,m.k);
 const kind=nextKind(),ofKind=own.filter(t=>t.kind===kind);return mkPart(depth,m.k,pick(ofKind.length?ofKind:own).id)}
// Starting limbs: weak, but they rot much faster than any found graft (decay 0.6/turn vs 0.18-0.55).
const STARTER={
 armL:{id:'s_armL',kind:'arm',n:'Stitched Left Arm',st:{atk:0}},
 armR:{id:'s_armR',kind:'arm',n:'Stitched Right Arm',st:{atk:1}},
 legs:{id:'s_legs',kind:'legs',n:'Stitched Legs',st:{spd:.05}}};
function mkStarter(slot){const t=STARTER[slot];
 return {type:'part',id:t.id,name:t.n,kind:t.kind,spr:'def',col:'#8e9f7e',stats:{...t.st},fx:'',fxd:'Hastily stitched together. Rots very quickly.',tier:0,slot,maxdur:100,dur:100,decay:.6,taint:'',known:true}}
function mkCons(id,n){return {type:'cons',id,name:CONS[id].n,col:CONS[id].col,count:n||CONS[id].cnt||1}}
function mkLoot(depth,src,partChance){
 if(R()<partChance)return mkPart(depth,src);
 const pool=Object.keys(CONS).filter(k=>CONS[k].w>0&&depth>=CONS[k].md),tot=pool.reduce((a,k)=>a+CONS[k].w,0);let r=R()*tot;
 for(const k of pool){r-=CONS[k].w;if(r<=0)return mkCons(k)}return mkCons('flask')}
// 4 stages of 5 floors each; the last is human (a survivors' research facility)
const STAGE_LEN=5,STAGES=4,MAX_DEPTH=STAGE_LEN*STAGES;
const REG=[{n:'The Cesspits',w:'#46564a',f:'#2c352d',t:'#141a15',acc:'#4a7a4a'},{n:'The Ossuary',w:'#625c4e',f:'#3a362c',t:'#1c1a14',acc:'#c8b878'},{n:'The Crematorium',w:'#6a4234',f:'#3d2820',t:'#20120d',acc:'#e86a28'},{n:'The Facility',w:'#4a5a68',f:'#2a333c',t:'#12171c',acc:'#6ab0d0'}];
const MON={
maggot:{heavy:.2,n:'Grave Maggot',hp:6,a:[1,3],spd:1,food:12,xp:3,d:[1,6],drop:.12},
crow:{heavy:.25,n:'Carrion Crow',hp:7,a:[2,4],spd:2,food:18,xp:5,d:[2,9],drop:.15,erratic:.3},
cultist:{n:'Hollow Zealot',hp:13,a:[3,6],spd:1,food:35,xp:9,d:[4,14],drop:.20,rng:5,sight:7},
bloat:{n:'Gore Bloat',hp:15,a:[2,5],spd:.5,food:28,xp:7,d:[5,12],drop:.18,burst:1},
golem:{heavy:.5,n:'Flesh Golem',hp:32,a:[5,9],spd:1,food:50,xp:20,d:[9,15],drop:.25},
ghoul:{n:'Ravenous Ghoul',hp:14,a:[3,6],spd:1.5,food:30,xp:11,d:[7,15],drop:.20},
acolyte:{n:'Hex Acolyte',hp:10,a:[2,5],spd:1,food:30,xp:10,d:[11,15],drop:.22,rng:6,sight:8},
warden:{heavy:.5,n:'The Warden',hp:55,a:[5,9],spd:1,food:70,xp:45,d:[99,99],drop:1,mini:1,tick:{every:4,fn:'rally'}},
// swamp-room natives: not part of the normal spawn tables; they drop supplies (food, potions) instead of grafts
toad:{n:'Bog Toad',hp:9,a:[2,4],spd:1,food:25,xp:6,d:[99,99],drop:0,swamp:1,noParts:true,loot:['scrap','scrap','meat','flask'],sight:4,heavy:.15},
mirebrute:{n:'Mire Brute',hp:24,a:[4,7],spd:.75,food:50,xp:18,d:[99,99],drop:0,swamp:1,noParts:true,loot:['flask','flask','brine','scrap'],sight:5,heavy:.5},// support roles: they make the rest of the pack more dangerous, so priorities matter
mender:{heavy:.15,n:'Gravetender',hp:12,a:[2,4],spd:1,food:30,xp:12,d:[6,15],drop:.2,role:'heal',kite:1,sight:6},
wailer:{heavy:.1,n:'Wailing Hollow',hp:8,a:[1,3],spd:1,food:20,xp:10,d:[4,12],drop:.2,role:'wail',kite:1,sight:9},
broodmother:{n:'Brood-mother',hp:28,a:[4,7],spd:.5,food:45,xp:22,d:[8,15],drop:.25,role:'brood',sight:6},
leech:{n:'Marrow Leech',hp:14,a:[2,5],spd:1.2,food:30,xp:14,d:[9,15],drop:.2,role:'leech',sight:6},
medic:{heavy:.15,n:'Field Medic',hp:20,a:[3,6],spd:1,food:40,xp:20,d:[16,20],drop:.25,role:'heal',kite:1,sight:7},
// the Reek: a relentless stalker that arrives when you linger on a floor too long
stalker:{heavy:.4,n:'The Reek',hp:46,a:[7,11],spd:1,food:80,xp:60,d:[99,99],drop:1,mini:1,noParts:true,sight:40},
// stage-end mini-bosses (floors 10 and 15 join The Warden on floor 5)
matron:{heavy:.4,n:'The Matron',hp:90,a:[6,11],spd:.75,food:90,xp:60,d:[99,99],drop:1,mini:1,burst:1,tick:{every:3,fn:'spawn',k:'maggot',max:4}},
abomination:{heavy:.5,n:'The Abomination',hp:130,a:[9,15],spd:1,food:100,xp:90,d:[99,99],drop:1,mini:1,tick:{every:1,fn:'enrage'}},
// stage 4 is human
guard:{heavy:.4,n:'Armed Guard',hp:34,a:[7,11],spd:1,food:60,xp:24,d:[16,20],drop:.25},
rifleman:{n:'Rifleman',hp:22,a:[6,10],spd:1,food:45,xp:22,d:[16,20],drop:.25,rng:6,sight:8},
scientist:{n:'Mad Scientist',hp:18,a:[5,9],spd:1,food:40,xp:20,d:[16,20],drop:.28,rng:5,erratic:.2,sight:7},
boss:{heavy:.45,n:'The Surgeon',hp:150,a:[9,15],spd:1,food:100,xp:150,d:[99,99],drop:1,tick:{every:4,fn:'reinforce',k:['guard','rifleman','medic'],max:5}}};
// Stage variants offered at each stage boundary (from floors 5, 10 and 15). Effects apply to every floor of that stage.
const MODS={
 standard:{n:'Standard',desc:'No surprises.',mon:1,sight:0,taint:1,tier:0,loot:0,part:0},
 hive:{n:'Infested Hive',desc:'40% more monsters, but extra supplies and an extra graft on every floor.',mon:1.4,sight:0,taint:1,tier:0,loot:2,part:1},
 cursed:{n:'Cursed Ruin',desc:'Grafts are a tier better here, but twice as likely to be tainted.',mon:1,sight:0,taint:2.2,tier:1,loot:0,part:0},
 crypt:{n:'Dark Crypt',desc:'30% fewer monsters and an extra flask per floor, but your sight is cut by 2.',mon:.7,sight:2,taint:1,tier:0,loot:1,part:0}};
// one-line flavour for the codex
const LORE={maggot:'Hungry larvae that nest in anything that stops moving.',crow:'Carrion birds. They follow the smell of you.',cultist:'Penitents who hex what they cannot reach.',bloat:'Swollen with gas and rot. Do not pop it beside you.',golem:'Flesh stitched into something that never tires.',ghoul:'Starved past reason and far too fast.',acolyte:'The loudest hexers of the deep faith.',warden:"The Ossuary's keeper. It wears its prisoners.",matron:'Mother of the Crematorium. She never stops birthing.',abomination:'Many things, badly joined.',guard:'He still follows his orders.',rifleman:'Patient. He has been waiting for you.',scientist:'Still working. The notes are in his own blood.',mender:'Tends the pack. Kill it first.',wailer:'Its scream carries through stone.',broodmother:'A walking nest. Do not let it settle.',leech:'Feeds on marrow, not blood.',medic:"The Facility's last honest employee.",stalker:'It smells you. It has always smelled you.',toad:'Fat on whatever the swamp keeps. Tastes better than it looks.',mirebrute:'Rises out of the muck. Carries more than it should.',boss:'He promised to fix you. He is still promising.'};

// ---------- altar: sacrifice grafts for a gamble on a better one ----------
// The best offered graft sets the tier to beat (M). Extra offerings raise the odds, but fodder counts for less the weaker it is
// (a part is worth (its tier / M)^2 of a full offering), so piling on junk cannot climb the tiers cheaply. The odds stay harsh:
// a lone offering fails outright a quarter of the time and returns something worse another quarter.
function altarOdds(tiers){
 const T=tiers.map(t=>Math.max(1,t)).sort((a,b)=>b-a),M=T[0];let n=1;for(let i=1;i<T.length;i++)n+=Math.pow(T[i]/M,2);
 const dec=.05*(n-1),nothing=Math.max(.06,.25-dec),lower=Math.max(.06,.25-dec);
 const up2=M>=5?0:Math.min(.12,.04*Math.max(0,n-2)),up1=M>=5?0:Math.min(.40,.10+.08*(n-1));
 return {M,n,nothing,lower,up1,up2,same:1-nothing-lower-up1-up2}}
function altarRoll(tiers){
 const o=altarOdds(tiers),r=R();let acc=o.nothing;
 if(r<acc)return {outcome:'nothing',tier:0};acc+=o.lower;
 if(r<acc)return o.M<=1?{outcome:'nothing',tier:0}:{outcome:'lower',tier:o.M-1};acc+=o.same;
 if(r<acc)return {outcome:'same',tier:o.M};acc+=o.up1;
 if(r<acc)return {outcome:'up1',tier:Math.min(5,o.M+1)};
 return {outcome:'up2',tier:Math.min(5,o.M+2)}}
// a graft of exactly this tier (slot from the shared bag, strong ones scarcer)
function mkAltarPart(tier,depth){
 if(TPL[0].hid===undefined)computePower();
 const kind=nextKind();let pool=TPL.filter(t=>t.kind===kind&&t.t===tier);if(!pool.length)pool=TPL.filter(t=>t.t===tier);
 const w=pool.map(t=>HID_RARITY[t.hid]);let r=R()*w.reduce((a,b)=>a+b,0),t=pool[pool.length-1];for(let i=0;i<pool.length;i++){r-=w[i];if(r<=0){t=pool[i];break}}
 return mkPart(depth,null,t.id)}