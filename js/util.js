const W=44,H=44,T=32,VW=15,VH=15,MAXINV=16;
// Gameplay randomness comes from a seeded generator (mulberry32) so a run can be reproduced from its seed.
// Purely cosmetic randomness (screen shake, texture noise) uses Math.random via crnd so it never disturbs the sequence.
let rngState=1;
function seedRng(s){rngState=(s>>>0)||1}
function R(){rngState=(rngState+0x6D2B79F5)>>>0;let t=rngState;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}
const rnd=(a,b)=>a+Math.floor(R()*(b-a+1)), pick=a=>a[Math.floor(R()*a.length)];
const crnd=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
function hx(c){return[1,3,5].map(i=>parseInt(c.substr(i,2),16))}
function rgb(a){return '#'+a.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('')}
function mix(c,t,f){const a=hx(c),b=hx(t);return rgb(a.map((v,i)=>v+(b[i]-v)*f))}
const lite=(c,f)=>mix(c,'#ffffff',f),dark=(c,f)=>mix(c,'#000000',f);
