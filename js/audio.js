// Tiny synthesized sound effects (Web Audio, no asset files). Starts on the first user gesture.
const Sound={ctx:null,master:null};
function audioInit(){
 if(!Sound.ctx){try{Sound.ctx=new (window.AudioContext||window.webkitAudioContext)();Sound.master=Sound.ctx.createGain();Sound.master.gain.value=.5;Sound.master.connect(Sound.ctx.destination)}catch(e){return}}
 if(Sound.ctx.state==='suspended')Sound.ctx.resume()}
['pointerdown','keydown'].forEach(ev=>addEventListener(ev,audioInit,{once:false,passive:true}));
function tone(f,dur,type='square',vol=.08,slide=0,delay=0){
 const c=Sound.ctx,t=c.currentTime+delay,o=c.createOscillator(),g=c.createGain();
 o.type=type;o.frequency.setValueAtTime(f,t);if(slide)o.frequency.linearRampToValueAtTime(Math.max(20,f+slide),t+dur);
 g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(Sound.master);o.start(t);o.stop(t+dur+.02)}
function noise(dur,vol=.1,freq=1500,delay=0){
 const c=Sound.ctx,t=c.currentTime+delay,n=Math.floor(c.sampleRate*dur),b=c.createBuffer(1,n,c.sampleRate),d=b.getChannelData(0);
 for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*(1-i/n);
 const s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=b;f.type='lowpass';f.frequency.value=freq;
 g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(f);f.connect(g);g.connect(Sound.master);s.start(t)}
const SFX={
 hit:()=>{noise(.09,.16,2200);tone(150,.1,'sawtooth',.08,-70)},
 miss:()=>{noise(.07,.05,4000)},
 hurt:()=>{tone(110,.18,'sawtooth',.12,-60);noise(.12,.12,900)},
 kill:()=>{noise(.18,.14,700);tone(90,.25,'square',.08,-50)},
 detach:()=>{noise(.25,.14,500);tone(70,.3,'sawtooth',.1,-30)},
 taint:()=>{tone(220,.5,'sawtooth',.07,-150);tone(233,.5,'sawtooth',.07,-150,.02)},
 equip:()=>{tone(180,.08,'square',.07);tone(260,.12,'square',.07,0,.07)},
 eat:()=>{noise(.12,.1,900);noise(.12,.1,700,.14)},
 drink:()=>{tone(300,.08,'sine',.08,200);tone(350,.08,'sine',.08,200,.09)},
 use:()=>{tone(440,.06,'square',.05)},
 rite:()=>{tone(200,.5,'sine',.1,500)},
 throw:()=>{noise(.1,.08,3000);tone(300,.12,'triangle',.05,-120)},
 warn:()=>{tone(520,.07,'square',.05);tone(390,.09,'square',.05,0,.08)},
 level:()=>{[300,380,460,600].forEach((f,i)=>tone(f,.12,'square',.07,0,i*.08))},
 death:()=>{tone(220,1,'sawtooth',.14,-190);noise(.8,.12,600)},
 win:()=>{[300,380,460,600,760].forEach((f,i)=>tone(f,.2,'triangle',.1,0,i*.12))},
 stairs:()=>{[400,330,260].forEach((f,i)=>tone(f,.1,'triangle',.08,0,i*.08))},
 door:()=>{noise(.15,.1,500);tone(90,.15,'square',.05,30)},
 pickup:()=>{tone(520,.05,'square',.06);tone(780,.07,'square',.06,0,.05)},
 step:()=>{noise(.04,.025,800)},
 heart:()=>{tone(60,.12,'sine',.18);tone(55,.14,'sine',.14,0,.17)}};
function sfx(name){if(!settings.sound||!Sound.ctx||Sound.ctx.state!=='running')return;const f=SFX[name];if(f)try{f()}catch(e){}}
