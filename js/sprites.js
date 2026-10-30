// ---------- pixel pipeline ----------
const PAL={k:'#14100e',w:'#ddd8c0',e:'#ff3a2a',y:'#d8a830',m:'#aab4bc',r:'#9a1818',g:'#78b030',o:'#d07030',d:'#6a4a3a',f:'#3a2a22',n:'#34344a',p:'#7a3a8a',s:'#b8a070',h:'#20383a',q:'#9ac4d0',u:'#4a80b0',x:'#d86a6a'};
const mkPal=(o)=>{const p={...PAL,...o};if(p.a){p.b=p.b||dark(p.a,.35);p.c=p.c||lite(p.a,.3)}return p};
function parse(rows,pal){return rows.map(r=>[...r].map(ch=>ch==='.'?null:{c:pal[ch]||'#f0f',sh:!'ekw'.includes(ch)}))}
function blank(w,h){return Array.from({length:h},()=>new Array(w).fill(null))}
function place(dst,src,x0,y0,mirror){const sw=Math.max(...src.map(r=>r.length));
 src.forEach((r,j)=>{for(let i=0;i<sw;i++){const px=r[i];if(!px)continue;const x=x0+(mirror?sw-1-i:i),y=y0+j;if(dst[y]&&x>=0&&x<dst[y].length)dst[y][x]=px}})}
function finalize(cells){const h=cells.length,w=cells[0].length,c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');
 const f=(i,j)=>i>=0&&j>=0&&i<w&&j<h&&cells[j][i];
 for(let j=0;j<h;j++)for(let i=0;i<w;i++){const px=cells[j][i];if(!px)continue;let col=px.c;
  if(px.sh){if(!f(i,j-1)||!f(i-1,j))col=lite(col,.22);else if(!f(i+1,j)||!f(i,j+1))col=dark(col,.3)}
  x.fillStyle=col;x.fillRect(i,j,1,1)}
 x.fillStyle='#0a0705';for(let j=0;j<h;j++)for(let i=0;i<w;i++)if(!f(i,j)&&(f(i+1,j)||f(i-1,j)||f(i,j+1)||f(i,j-1)))x.fillRect(i,j,1,1);
 return c}
function build(rows,o){const cells=blank(16,16);place(cells,parse(rows,mkPal(o)),0,0);return finalize(cells)}
const E='................';
const SPR={};
const S={
maggot:build([E,E,E,E,E,E,"....aaaa........","...aaaaaa..aa...","..aeaaaeaa.aaa..","..aaaaaaaaaaaa..",".aaabbaaabbaaab.",".aabbbbabbbbaab.",".abbbbbbbbbbbb..","..bbbbbbbbbbb...","....bb...bb.....",E],{a:'#d8d0a8',e:'#201010'}),
crow:build([E,"......aaa.......",".....aaaaa......",".....aaeaayy....","....aaaaaayy....","..a.aaaaaa......",".aaaaaaaaaa.....","aaacaaaaaaaa....","aaaccaaaaaaaa...",".aaaacaaaaaa....","..aaaaaaaaa.....","...aabaaab......","....aaaaa.......",".....y..y.......","....yy..yy......",E],{a:'#34344a',e:'#ff3020'}),
cultist:build(SPR.cultist=[".....aaaaa......","....aaaaaaa.....","...aaaccaaab....","...aaffffaab....","...aafeffefab...","...aaffffffab...","...aaaffffaab...","..aaaaaaaaaab...",".aaaacaaaaaabd..",".aaaaaaaaaaabd.y",".aaaaaabaaaab.f.",".aaaaaabaaaabb..","..aaaaabaaaab...","..aaaaabaaaabb..",".aaaaaaabaaaab..",".bbbbbbbbbbbbb.."],{a:'#7a1818',e:'#ffd040'}),
bloat:build(SPR.bloat=[E,E,E,"....aaaaaa......","...aaaaaaaa.....","..aaeaaaaeaa....",".aaaaaaaaaaaa...",".aagggaaaaaaab..","aaagggganaggaab.","aaaagggaaagggaab","aaaaaaaaaaggaaab","aabaaaaaaaaaaabb",".abbaaaaaaaabbb.","..bbbbbbbbbbbb..","...bb......bb...",E],{a:'#8a7a58',e:'#301000',n:'#8a7a58'}),
golem:build(SPR.golem=["...aaaaaaaa.....","..aaccaaaaaab...","..aaeaaaaeaab...","..aaakkkkaaab...","..abbaaaabbab...",".aaaaaaaaaaaab..","aaaakkaaaakkaaab","aaackaaaaaakcaab","aaaaaaakkaaaaaab","aabaaaakkaaaabab","aa.aaaakkaaaab.a","aa.aaaaaaaaaab.a",".b.aaabbbaaab...","...aaab.baaab...","...aaab.baaab...","..bbbbb.bbbbb..."],{a:'#9a6a5a',e:'#ffcc30'}),
boss:build(["....hhhhhh......","...hhhhhhhh.....","...aaaaaaab.....","...agaaaagb.....","...aaaaaaab.....","...abbbbbab.m...","..hhaaaaahh.m...",".hhhrrrrrhhh.m..",".hhrrrrrrrrhmm..",".hhrrrrrrrrhmmm.",".hhrrrrrrrrh.m..",".hkrrrrrrrrk.m..","..hhrrrrrrhh.m..","..hkhh..hhkh....","..kkk....kkk....",".kkkk....kkkk..."],{a:'#d8d8d0',g:'#40ff80'}),
};
S.ghoul=build(SPR.cultist,{a:'#6f7f60',e:'#ffe070',d:'#4a5a3a'});
S.acolyte=build(SPR.cultist,{a:'#4a2a6a',e:'#d8a8ff',d:'#3a2a5a'});
S.warden=build(SPR.golem,{a:'#7a2a2a',e:'#ffd040'});
const HUMAN=["................",".....hhhhh......","....hhhhhhh.....","....hsssssh.....","....sskssks.....","....sssssss.....",".....sssss......","....aaaaaaa.....","...aaaaaaaaa....","..saaaaaaaaas...","..saaabaaaaas.m.","..ssaabaaaas.mm.","....aaaaaaa..m..","....bbb..bbb....","....bbb..bbb....","...kkkk..kkkk..."];
S.guard=build(HUMAN,{a:'#3a4a6a',h:'#2a3040'});
S.rifleman=build(HUMAN,{a:'#5a6a3a',h:'#4a4a2a'});
S.scientist=build(HUMAN,{a:'#d8d8d0',h:'#6a5a4a'});
S.matron=build(SPR.bloat,{a:'#a05a7a',e:'#301000',n:'#a05a7a'});
S.abomination=build(SPR.golem,{a:'#5a3a7a',e:'#ff60ff'});
S.mender=build(SPR.cultist,{a:'#7a9a7a',e:'#e8ffd0',d:'#4a6a4a'});
S.wailer=build(SPR.cultist,{a:'#cfd8e0',e:'#ff5a5a',d:'#8a98a8'});
S.broodmother=build(SPR.bloat,{a:'#8a6a4a',e:'#ffd070',n:'#8a6a4a'});
S.leech=build(SPR.cultist,{a:'#6a2a6a',e:'#ff90ff',d:'#4a1a4a'});
S.medic=build(HUMAN,{a:'#ececec',h:'#5a3a3a'});
S.stalker=build(SPR.golem,{a:'#262634',e:'#ff2020'});
S.toad=build(SPR.bloat,{a:'#6a8a3a',e:'#201000',n:'#6a8a3a'});
S.mirebrute=build(SPR.golem,{a:'#4a6a4a',e:'#ffe060'});
// ---------- debug-only player sprite (/fightingdreamers): a zombie in an orange jumpsuit, spiky blond hair, forehead protector, whisker marks ----------
{const ctr=s=>{const l=Math.floor((16-s.length)/2);return '.'.repeat(l)+s+'.'.repeat(16-l-s.length)};
 const rows=['a.a.aa.a.a','aaaaaaaaaa','aaaaaaaaaaaa','ahhhhhhhhhha','ahhmmkkmmhha','assssssssa','asessssesa','nnssssnn','sswrrwss',
  'kkoossssookk','ooorookkoooo','s'+'oooo'+'kk'+'oooo'+'s','s'+'d'.repeat(10)+'s','oooo..oooo','ooro..wwww','hhhh..hhhh'].map(ctr);
 S.dreamer=build(rows,{a:'#f4c430',h:'#1b2340',m:'#c9d3dc',s:'#8fae86',n:'#26382a',o:'#ee6a1c',d:'#b04a10',e:'#ff2a2a',r:'#a01818',w:'#e8e4d0'});
 // the shadow clone is the same figure with a pale blue cast
 const c=document.createElement('canvas');c.width=c.height=16;const x=c.getContext('2d');x.drawImage(S.dreamer,0,0);x.globalCompositeOperation='source-atop';x.fillStyle='rgba(90,170,255,.42)';x.fillRect(0,0,16,16);S.clone=c}
// ---------- body-region sprites ----------
const SKIN='#8aa27a';
const HEAD={ghoul:["..aaaa..",".aaaaaa.",".aeaaea.",".aaaaaa.",".awkkwa.",".awkkwa.","..aaaa.."],
acolyte:["..kkkk..",".kkkkkk.","kkaeeakk","kkaaaakk",".kkaakk.","..kkkk..","...kk..."],
guard:[".mmmmmm.","mmmmmmmm","mmmmmmmm",".aeaaea.",".aaaaaa.","..aaaa..","...aa..."],
scientist:["..hhhh..",".hhhhhh.",".aaaaaa.","qqeaaeqq",".aaaaaa.","..aaaa..","...aa..."],
abom:["a.aaaa.a","aaaaaaaa","aeaaaaea","aaaaaaaa","aeaaaaea","aaakkaaa",".aaaaaa."],
 // 8 wide x 7
def:["..aaaa..",".aaaaaa.",".aeaaea.",".aaaaaa.",".awwwwa.","..aaaa..","...aa..."],
crow:["..aaaa..",".aaccaa.",".aeaaea.",".aaaaaa.","..ayya..","...yy...","....y..."],
nest:["..aaaa..",".aawaaa.",".akaakaw",".aaaaaa.",".awaaka.","..aaaa..","...aa..."],
zeal:["..aaaa..",".aaaaaa.",".akkkka.",".kekkek.",".akwwka.","..aaaa..","...aa..."],
bloat:[".aaaaaa.","aaacaaaa","aeaaaaea","aaagaaaa","aagggaaa",".aaaaaa.","..bbbb.."],
golem:[".aaaaaa.","aaaaaaaa","bbbbbbbb","aeaaaaea","aaakkaaa","akakakaa",".aaaaaa."],
mask:[".aaaaaa.","kkkkkkkk","aggaagga","aaaaaaaa",".abbbba.","..aaaa..","...aa..."]};
const TORSO={vest:["aaaaaaaa","abaaaaba","aaaaaaaa","akkkkkka","aaaaaaaa"],
labcoat:["aaaaaaaa","awaaaawa","aaaaaaaa","aaaabaaa","aab..baa"],
mass:["agaagaag","gaaaggaa","aagaaaga","gaagaaag","aaaaaaaa"],
 // 8 wide x 5
def:["dddddddd","dddfddrd","dddddddd","ddfddddd","dd.dd.dd"],
maggot:["aaaaaaaa","akaawaak","aaaaaaaa","aawaakaa","aaaaaaaa"],
cloak:["cacacaca","aaaaaaaa","acacacac","aaaaaaaa","caca.aca"],
rib:["aaaaaaaa","awwaawwa","aawwwwaa","awwaawwa","aaaaaaaa"],
belly:["aaaaaaaa","aacaaaga","aaaagaaa","agaaacaa","aaaaaaaa"],
slab:["aaaaaaaa","akaaaaka","aaaaaaaa","bbbbbbbb","aakaakaa"]};
const ARM={gun:["..mm","..mm","..mm",".aam",".aam",".aa.",".aa.","aaa."],
baton:["..kk","..kk","..kk",".aak",".aa.",".aa.",".aa.","aaa."],
syringe:["..qq","..qq","..m.",".aam",".aa.",".aa.",".aa.","aaa."],
tentacle:["aa..",".aa.","..aa",".aa.","aa..",".aa.","..aa","..a."],
 // 4 wide x 8 (right arm; left is mirrored)
def:[".aa.",".aa.",".aaa",".aaa",".aa.",".aa.",".aa.","aaaa"],
crow:["aaa.","acaa","aaaa","caaa",".aaa",".aa.",".yy.","y..y"],
hook:[".aa.",".aa.",".aa.",".bbb","..mm","..m.","mmm.","m..."],
scythe:["mmm.","..mm","..wm","..w.","..w.","..w.",".aa.",".aa."],
fist:[".aa.",".aa.",".aa.",".aa.","aaaa","awaw","aaaa",".kk."],
gfist:["aaaa","aaaa","abba","aaaa","aaaa","abba","aaaa",".aa."],
saw:[".aa.",".aa.",".aab","..mm",".mkm",".mmm",".mkm","..mm"]};
const LEGS={lope:[".aa..aa.",".aa..aa.","aa....aa","aaa..aaa"],
boots:[".aa..aa.",".aa..aa.",".aa..aa.","kkk..kkk"],
 // 8 wide x 4
def:[".aa..aa.",".aa..aa.",".aa..aa.","aaa..aaa"],
crawl:["..aaaa..","aaawaaaa","awaaawaa","aaaaaaaa"],
crow:[".y....y.",".y....y.",".y....y.","yyy..yyy"],
stilt:[".a....a.",".k....k.",".a....a.","aaa..aaa"],
pillar:["aaa..aaa","aab..aab","aaa..aaa","bbb..bbb"],
runner:[".aa..aa.",".ca..ca.",".aa..aa.","kkk..kkk"]};
const REGION={head:HEAD,torso:TORSO,arm:ARM,legs:LEGS};
const CONSPR={
flask:["...kk...","...qq...","..qqqq..",".qrrrrq.",".qrrrrq.",".qrrrrq.","..qqqq.."],
serum:["..kk..","..qq..",".qggq.",".qggq.",".qggq.",".qggq.","..qq.."],
brine:[".mmmmmm.",".qqqqqq.","quuuuuuq","quuwuuuq","quuuuuuq","qqqqqqqq"],
scrap:["..xxxx..",".xxrxxx.","xxxxxxxx","xxrxxwwx",".xxxxwwx","..xxxx.."],
meat:["..k..k..","..gggg..",".gdgggg.","gggdgggg","gdgggggg",".gggdgg.","..gggg.."],
shards:["w....w..",".ww.ww..","..www...",".wwwww..","w.www..w"],
jar:["..kkkk..",".dddddd.","dddgdddd","ddgggddd","dddgdddd",".dddddd.","..dddd.."],
candle:["...y....","..yoy...","...w....","..www...","..www...","..www...",".mmmmm.."],
rite:[".ssssss.","swwwwwws","swwkwwws","swkkkwws","swwkwwws","swwkwwws","swwwwwws",".ssssss."],
map:["ssssssss","skssssrs","ssksrsss","sssrksss","ssrsskss","skssssks","ssssssss"],
pyre:["...kk...","...yy...","..qqqq..",".qooooq.",".qoyyoq.",".qooooq.","..qqqq.."],
grease:["..kkkk..",".dddddd.","dnnnnnnd","dnnnnnnd","dnnnnnnd",".dddddd.","..dddd.."],
rites:["...yy...","..y..y..","...yy...",".yyyyyy.","...yy...","...yy...","...yy..."]};
function bigIcon(rows,col,scale=3,mirror=false){
 const w=Math.max(...rows.map(r=>r.length));const cells=blank(w+2,rows.length+2);
 place(cells,parse(rows,mkPal({a:col})),1,1,mirror);const sm=finalize(cells);
 const c=document.createElement('canvas');c.width=c.height=32;const x=c.getContext('2d');x.imageSmoothingEnabled=false;
 const sc=Math.min(scale,Math.floor(32/sm.width),Math.floor(32/sm.height));
 x.drawImage(sm,Math.floor((32-sm.width*sc)/2),Math.floor((32-sm.height*sc)/2),sm.width*sc,sm.height*sc);return c}
const iconCache={};
function itIcon(it){const k=it.id;if(iconCache[k])return iconCache[k];
 if(it.type==='cons')return iconCache[k]=bigIcon(CONSPR[it.id],it.col||'#aaaaaa',3);
 return iconCache[k]=bigIcon(REGION[it.kind][it.spr],it.col,3)}
function ghostIcon(slot){const kind=slot==='armL'||slot==='armR'?'arm':slot;return bigIcon(REGION[kind].def,'#666666',3)}
const pcache={};
function composePlayer(eq){
 if(typeof G!=='undefined'&&G&&G.dreamer)return S.dreamer;
 const key=SLOTS.map(k=>eq[k]?eq[k].id:'-').join('|');if(pcache[key])return pcache[key];
 const cells=blank(16,16),pal=c=>mkPal({a:c});
 const g=(kind,slot)=>{const it=eq[slot];return it?{rows:REGION[kind][it.spr],col:it.col}:{rows:REGION[kind].def,col:SKIN}};
 let r=g('torso','torso');place(cells,parse(r.rows,pal(r.col)),4,7);
 r=g('legs','legs');place(cells,parse(r.rows,pal(r.col)),4,12);
 r=g('arm','armR');place(cells,parse(r.rows,pal(r.col)),12,6);
 r=g('arm','armL');place(cells,parse(r.rows,pal(r.col)),0,6,true);
 r=g('head','head');place(cells,parse(r.rows,pal(r.col)),4,0);
 return pcache[key]=finalize(cells)}
