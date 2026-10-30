function drawStairs(px,py,down){
 ctx.fillStyle='#0a0706';ctx.fillRect(px+1,py+1,30,30);
 for(let i=0;i<6;i++){const sh=down?1-i*.15:.3+i*.12,col=mix(G.reg.f,'#ffffff',.25*sh);
  ctx.fillStyle=col;ctx.fillRect(px+3+(down?i:0),py+3+i*4,26-(down?i*2:0),3);
  ctx.fillStyle=dark(col,.5);ctx.fillRect(px+3+(down?i:0),py+6+i*4,26-(down?i*2:0),1)}
 ctx.fillStyle=down?'#000':G.reg.acc;ctx.globalAlpha=.8;
 ctx.beginPath();if(down){ctx.moveTo(px+16,py+29);ctx.lineTo(px+10,py+22);ctx.lineTo(px+22,py+22)}else{ctx.moveTo(px+16,py+4);ctx.lineTo(px+10,py+11);ctx.lineTo(px+22,py+11)}ctx.fill();ctx.globalAlpha=1;
 ctx.strokeStyle=dark(G.reg.w,.2);ctx.lineWidth=2;ctx.strokeRect(px+1,py+1,30,30)}
// ew = passage runs east-west (walls to the north/south), so the door slab spans north-south and its frame hugs those walls
function drawDoor(open,px,py,ew){
 const R=(x,y,w,h)=>ew?ctx.fillRect(px+x,py+y,w,h):ctx.fillRect(px+y,py+x,h,w); // author in east-west space, mirror for north-south
 if(!open){ctx.fillStyle='#2a1a0e';R(12,0,8,32);for(let k=0;k<4;k++){ctx.fillStyle=k%2?'#5a3a20':'#6a4628';R(13,2+k*7,6,6)}
  ctx.fillStyle='#2a2a30';R(12,6,8,3);R(12,22,8,3);ctx.fillStyle='#c8a030';R(15,22,3,3)}
 else{ctx.fillStyle='#3a2410';R(10,0,12,3);R(10,29,12,3);ctx.fillStyle='#5a3a20';R(10,0,12,1);R(10,29,12,1)}}
// pile of bodies (all piles look alike: you only learn what is inside by searching)
function drawMound(px,py,x,y){const sr=seeded(x*173+y*29);
 ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(px+16,py+26,14,5,0,0,6.3);ctx.fill();
 ctx.fillStyle='#4a3a2c';ctx.beginPath();ctx.ellipse(px+16,py+20,13,9,0,0,6.3);ctx.fill();ctx.fillStyle='#5e4a38';ctx.beginPath();ctx.ellipse(px+14,py+17,9,6,0,0,6.3);ctx.fill();
 ctx.fillStyle='#7a6a5a';for(let i=0;i<3;i++)ctx.fillRect(px+6+Math.floor(sr()*18),py+12+Math.floor(sr()*10),5,2);
 ctx.fillStyle='#cfc8a8';ctx.fillRect(px+18,py+11,6,5);ctx.fillStyle='#1a1410';ctx.fillRect(px+19,py+13,1,1);ctx.fillRect(px+22,py+13,1,1);
 ctx.fillStyle='#a02828';ctx.fillRect(px+10,py+20,3,2);ctx.fillStyle='#8a8068';ctx.fillRect(px+6,py+15,10,2)}
// swamp mire: murky water that ripples
function drawSwamp(px,py,x,y){ctx.fillStyle='rgba(28,62,38,.62)';ctx.fillRect(px,py,T,T);
 const w=Math.sin(tick/22+x*2.7+y*1.9);ctx.fillStyle='rgba(120,160,90,.28)';ctx.fillRect(px+4+Math.round(w*3),py+9,9,1);ctx.fillRect(px+16-Math.round(w*3),py+21,10,1);
 if(((x*7+y*3)&3)===0){const b=(tick/30+x)%1;ctx.fillStyle='rgba(170,200,120,'+(.5-b*.5)+')';ctx.fillRect(px+10,py+22-b*10,2,2)}}
// bone altar: a slab of stone ringed with candles and skulls
function drawAltar(px,py){
 ctx.fillStyle='rgba(0,0,0,.4)';ctx.beginPath();ctx.ellipse(px+16,py+27,14,4,0,0,6.3);ctx.fill();
 ctx.fillStyle='#6a6a72';ctx.fillRect(px+4,py+14,24,12);ctx.fillStyle='#8a8a94';ctx.fillRect(px+4,py+12,24,4);ctx.fillStyle='#4a4a52';ctx.fillRect(px+4,py+24,24,3);
 ctx.fillStyle='#a02828';ctx.fillRect(px+13,py+17,6,3);ctx.fillRect(px+15,py+20,2,4);
 ctx.fillStyle='#cfc8a8';ctx.fillRect(px+5,py+8,5,4);ctx.fillRect(px+22,py+8,5,4);ctx.fillStyle='#1a1410';ctx.fillRect(px+6,py+10,1,1);ctx.fillRect(px+8,py+10,1,1);ctx.fillRect(px+23,py+10,1,1);ctx.fillRect(px+25,py+10,1,1);
 const f=Math.sin(tick/6+px)*1;ctx.fillStyle='#e8e0c0';ctx.fillRect(px+13,py+9,2,5);ctx.fillRect(px+18,py+9,2,5);ctx.fillStyle='#ffb030';ctx.fillRect(px+13,py+6+f,2,3);ctx.fillRect(px+18,py+6-f,2,3)}
function drawDecor(d,px,py,x,y){
 const seedr=seeded(x*131+y*17);
 if(d===1){ctx.fillStyle='#4a0e0e';for(let k=0;k<7;k++)ctx.fillRect(px+4+Math.floor(seedr()*20),py+6+Math.floor(seedr()*18),2*(1+Math.floor(seedr()*4)),2*(1+Math.floor(seedr()*3)));ctx.fillStyle='#6a1414';ctx.fillRect(px+12,py+12,6,4);ctx.fillStyle='rgba(255,120,120,.25)';ctx.fillRect(px+13,py+12,2,2)}
 else if(d===2){ctx.fillStyle=G.reg.acc+'88';for(let k=0;k<9;k++)ctx.fillRect(px+Math.floor(seedr()*14)*2,py+Math.floor(seedr()*14)*2,3,3)}
 else if(d===3){ctx.fillStyle='#c8c2a8';ctx.fillRect(px+8,py+16,16,2);ctx.fillRect(px+6,py+14,4,4);ctx.fillRect(px+22,py+18,4,4);ctx.fillRect(px+14,py+8,8,6);ctx.fillStyle='#1a1410';ctx.fillRect(px+16,py+10,2,2);ctx.fillRect(px+20,py+10,2,2);ctx.fillStyle='#8a8470';ctx.fillRect(px+14,py+13,8,1)}
 else if(d===4){ctx.fillStyle='#10262a';ctx.fillRect(px+4,py+8,24,16);ctx.fillRect(px+8,py+6,16,20);const w=Math.sin(tick/20+x+y);ctx.fillStyle='#2a5e5a';ctx.fillRect(px+8+Math.round(w*2),py+11,6,1);ctx.fillRect(px+16-Math.round(w*2),py+18,5,1)}
 else if(d===5){ctx.fillStyle='#2a2420';ctx.fillRect(px+8,py+18,6,4);ctx.fillRect(px+16,py+14,8,6);ctx.fillRect(px+12,py+22,4,3);ctx.fillStyle='#4a423a';ctx.fillRect(px+8,py+18,6,1);ctx.fillRect(px+16,py+14,8,1)}}
// sprites that are drawn facing LEFT (the maggot's head is on its left); everything else is drawn facing right
const NATIVE={maggot:-1};
// ---------- attack / ability effects ----------
const easeOut=u=>1-Math.pow(1-u,2.4),easeIn=u=>u*u,lerp=(a,b,u)=>a+(b-a)*u;
const fxPos=(o,fx,fy,wx,wy)=>o&&o.rx!==undefined?[wx(o.rx)+16,wy(o.ry)+16]:[wx(fx)+16,wy(fy)+16];
function spark(x,y,r,rays,col,a){ctx.strokeStyle=col;ctx.globalAlpha=a;ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<rays;i++){const an=i/rays*6.283+.4;ctx.moveTo(x+Math.cos(an)*r*.35,y+Math.sin(an)*r*.35);ctx.lineTo(x+Math.cos(an)*r,y+Math.sin(an)*r)}ctx.stroke();ctx.globalAlpha=1}
function glowDot(x,y,r,col,a){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,col);g.addColorStop(1,'rgba(0,0,0,0)');ctx.globalAlpha=a;ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.globalAlpha=1}
function drawFX(f,wx,wy){
 const t=Math.min(1,Math.max(0,1-f.life/f.max)),col=f.col||'#fff';
 const [x,y]=fxPos(f.org,f.x,f.y,wx,wy),[tx,ty]=fxPos(f.tgt,f.tx,f.ty,wx,wy);
 const dx=tx-x,dy=ty-y,dist=Math.hypot(dx,dy)||1,ux=dx/dist,uy=dy/dist,nx=-uy,ny=ux;
 switch(f.kind){
 case 'whip':{ // Nyx Lash: a tentacle snaps out, cracks at the tip, and recoils
  const L=t<.4?easeOut(t/.4):Math.max(0,1-(t-.4)/.6),N=16,fade=t>.75?(1-t)/.25:1;
  const pt=s=>{const w=Math.sin(s*5.5+t*16)*13*Math.sin(Math.min(1,L)*Math.PI*.9+.25)*(1-s*.35),bow=Math.sin(s*Math.PI)*16*(1-L*.5)*(f.flip?-1:1);return[x+dx*s*L+nx*(w+bow),y+dy*s*L+ny*(w+bow)]};
  ctx.lineCap='round';ctx.globalAlpha=fade;
  for(const [c,wd] of [['#2a1040',1],['#7a4aa0',.62],['#c9a0f0',.2]]){for(let i=0;i<N;i++){const a=pt(i/N),b=pt((i+1)/N);ctx.strokeStyle=c;ctx.lineWidth=(9-6*(i/N))*wd;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke()}}
  ctx.fillStyle='#e6c8ff';for(let i=2;i<N;i+=2){const a=pt(i/N),b=pt(Math.min(1,(i+1)/N)),sx=-(b[1]-a[1]),sy=b[0]-a[0],sl=Math.hypot(sx,sy)||1;ctx.beginPath();ctx.arc(a[0]+sx/sl*3,a[1]+sy/sl*3,1.5*(1-i/N)+.6,0,6.283);ctx.fill()}
  const tip=pt(1);if(t>.3&&t<.62){const u=(t-.3)/.32;spark(tip[0],tip[1],8+14*u,8,'#ffffff',1-u);glowDot(tip[0],tip[1],18,'#d9b0ff',.8*(1-u))}
  ctx.globalAlpha=1;break}
 case 'eye':{ // a floating eye opens above the victim, flashes, and blinks out
  const rise=t*7,a=t<.15?t/.15:t>.72?(1-t)/.28:1,ex=tx,ey=ty-15-rise;
  if(t>.12&&t<.5){const u=(t-.12)/.38;ctx.strokeStyle=col;ctx.globalAlpha=(1-u)*.9;ctx.lineWidth=3;ctx.beginPath();ctx.arc(tx,ty,8+16*u,0,6.283);ctx.stroke();ctx.fillStyle=col;ctx.globalAlpha=(1-u)*.22;ctx.fillRect(tx-16,ty-16,32,32);spark(ex,ey,18+8*u,10,col,1-u)}
  glowDot(ex,ey,20,col,.45*a);
  const open=t>.46&&t<.58?Math.abs(t-.52)/.06:1; // blink
  ctx.globalAlpha=a;ctx.fillStyle='#f4efe0';ctx.strokeStyle='#150a1a';ctx.lineWidth=2;
  ctx.beginPath();ctx.ellipse(ex,ey,10,6*open+.6,0,0,6.283);ctx.fill();ctx.stroke();
  if(open>.2){const ix=ex+Math.max(-3,Math.min(3,-ux*3)),iy=ey+Math.max(-1.5,Math.min(1.5,-uy*2));ctx.fillStyle=col;ctx.beginPath();ctx.arc(ix,iy,3.6*Math.min(1,open+.2),0,6.283);ctx.fill();ctx.fillStyle='#08040c';ctx.beginPath();ctx.arc(ix,iy,1.7,0,6.283);ctx.fill();ctx.fillStyle='#fff';ctx.fillRect(ix-2,iy-2,1.5,1.5)}
  ctx.globalAlpha=1;break}
 case 'bullet':{ // tracer with muzzle flash and impact sparks
  const head=Math.min(1,t*3.2),tail=Math.max(0,head-.4);
  if(t<.25){const u=t/.25;glowDot(x+ux*8,y+uy*8,16,'#ffe9a0',1-u);spark(x+ux*8,y+uy*8,10+6*u,6,'#fff2c0',1-u)}
  ctx.lineCap='round';ctx.globalAlpha=t>.5?(1-t)*2:1;ctx.strokeStyle='rgba(255,220,120,.35)';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(x+dx*tail,y+dy*tail);ctx.lineTo(x+dx*head,y+dy*head);ctx.stroke();
  ctx.strokeStyle='#fff3c8';ctx.lineWidth=2;ctx.stroke();ctx.globalAlpha=1;
  if(t>.28){const u=(t-.28)/.72;spark(tx,ty,6+10*u,7,'#ffd070',1-u)}break}
 case 'bolt':{ // glowing orb with a short trail (hexes, hex bolts)
  const s=easeIn(Math.min(1,t/.7));for(let i=4;i>=0;i--){const ss=Math.max(0,s-i*.05);glowDot(x+dx*ss,y+dy*ss,10-i*1.4,col,.7-i*.12)}
  ctx.fillStyle='#fff';ctx.globalAlpha=t<.7?1:0;ctx.beginPath();ctx.arc(x+dx*s,y+dy*s,3,0,6.283);ctx.fill();ctx.globalAlpha=1;
  if(t>.7){const u=(t-.7)/.3;ctx.strokeStyle=col;ctx.globalAlpha=1-u;ctx.lineWidth=3;ctx.beginPath();ctx.arc(tx,ty,4+14*u,0,6.283);ctx.stroke();spark(tx,ty,10+6*u,6,col,1-u);ctx.globalAlpha=1}break}
 case 'lob':{ // thrown blob on an arc: acid spit, vials, flasks, tar
  const s=Math.min(1,t/.75),h=-Math.sin(s*Math.PI)*(14+dist*.12),bx=x+dx*s,by=y+dy*s+h;
  if(t<.78){ctx.fillStyle=col;ctx.beginPath();ctx.arc(bx,by,f.big?5:4,0,6.283);ctx.fill();glowDot(bx,by,9,col,.5);ctx.fillStyle='rgba(255,255,255,.7)';ctx.fillRect(bx-1,by-2,2,2)}
  else{const u=(t-.78)/.22;ctx.fillStyle=col;ctx.globalAlpha=(1-u)*.8;ctx.beginPath();ctx.arc(tx,ty,6+(f.splash||10)*u,0,6.283);ctx.fill();
   for(let i=0;i<7;i++){const an=i/7*6.283+f.seed;ctx.beginPath();ctx.arc(tx+Math.cos(an)*(8+12*u),ty+Math.sin(an)*(8+12*u)-4*u,2.2*(1-u)+.5,0,6.283);ctx.fill()}ctx.globalAlpha=1}break}
 case 'rasen':{ // Rasenshuriken: a spinning chakra blade flies to the spot, then detonates across a 5x5 area
  if(t<.5){const fl=easeOut(t/.5),bx=x+dx*fl,by=y+dy*fl;glowDot(bx,by,30,'#7ad0ff',.85);ctx.save();ctx.translate(bx,by);ctx.rotate(tick*.9);
   ctx.fillStyle='#8ad8ff';for(let i=0;i<4;i++){ctx.rotate(Math.PI/2);ctx.beginPath();ctx.moveTo(4,-3);ctx.lineTo(20,0);ctx.lineTo(4,3);ctx.closePath();ctx.fill()}
   ctx.fillStyle='#f2fcff';ctx.beginPath();ctx.arc(0,0,6,0,6.283);ctx.fill();ctx.restore()}
  else{const u=(t-.5)/.5,r=T*2.6*easeOut(u);ctx.globalAlpha=(1-u)*.32;ctx.fillStyle='#9fe0ff';ctx.fillRect(tx-T*2.5,ty-T*2.5,T*5,T*5);
   ctx.globalAlpha=1-u;ctx.strokeStyle='#e8fbff';ctx.lineWidth=4*(1-u)+1;ctx.beginPath();ctx.arc(tx,ty,r,0,6.283);ctx.stroke();
   ctx.strokeStyle='#5ab8ff';ctx.lineWidth=2;for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(tx,ty,r*(.45+i*.2),u*9+i*2,u*9+i*2+2.4);ctx.stroke()}
   glowDot(tx,ty,60*(1-u*.5),'#bfeaff',.9*(1-u));ctx.globalAlpha=1;spark(tx,ty,r,12,'#ffffff',1-u)}
  break}
 case 'ring':{ // shockwave
  const r=(f.r||48)*easeOut(t),cx=f.atTarget?tx:x,cy=f.atTarget?ty:y;ctx.strokeStyle=col;ctx.globalAlpha=1-t;ctx.lineWidth=5*(1-t)+1;ctx.beginPath();ctx.arc(cx,cy,r,0,6.283);ctx.stroke();
  ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,cy,r*.6,0,6.283);ctx.stroke();
  if(f.debris)for(let i=0;i<8;i++){const an=i/8*6.283+f.seed;ctx.fillStyle='#8a7a68';ctx.fillRect(cx+Math.cos(an)*r*.85-1,cy+Math.sin(an)*r*.85-1-Math.sin(t*Math.PI)*6,3,3)}ctx.globalAlpha=1;break}
 case 'whirl':{ // scythe sweep around the player
  const a=t*9.4;ctx.lineCap='round';for(let i=0;i<4;i++){ctx.strokeStyle=i===0?'#fff':'rgba(220,230,200,'+(.55-i*.13)+')';ctx.lineWidth=5-i;ctx.globalAlpha=t>.7?(1-t)/.3:1;ctx.beginPath();ctx.arc(x,y,24,a-.9-i*.35,a-i*.35);ctx.stroke()}ctx.globalAlpha=1;break}
 case 'slash':{ // heavy X cut
  const u=easeOut(Math.min(1,t/.35)),a=t>.5?(1-t)*2:1;ctx.lineCap='round';ctx.globalAlpha=a;
  for(const sg of [1,-1]){ctx.strokeStyle='#ffe0a0';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(tx-sg*14*u,ty-14*u);ctx.lineTo(tx+sg*14*u,ty+14*u);ctx.stroke();ctx.strokeStyle='#c02020';ctx.lineWidth=2;ctx.stroke()}ctx.globalAlpha=1;break}
 case 'claws':{ // three parallel rips
  const u=easeOut(Math.min(1,t/.4)),a=t>.55?(1-t)/.45:1;ctx.lineCap='round';ctx.globalAlpha=a;ctx.strokeStyle='#e8e0c8';
  for(let i=-1;i<=1;i++){ctx.lineWidth=3-Math.abs(i)*.6;ctx.beginPath();ctx.moveTo(tx-11+i*6,ty-13);ctx.lineTo(tx-11+i*6+22*u,ty-13+26*u);ctx.stroke()}
  ctx.strokeStyle='#c02020';ctx.lineWidth=1.2;ctx.globalAlpha=a*.8;for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(tx-11+i*6,ty-13);ctx.lineTo(tx-11+i*6+22*u,ty-13+26*u);ctx.stroke()}ctx.globalAlpha=1;break}
 case 'puff':{ // gas cloud
  const cx=f.atTarget?tx:x,cy=f.atTarget?ty:y;for(let i=0;i<7;i++){const an=i/7*6.283+f.seed,r=(8+(f.r||22)*easeOut(t))*(.6+(i%3)*.22);ctx.globalAlpha=(1-t)*.42;ctx.fillStyle=col;ctx.beginPath();ctx.arc(cx+Math.cos(an)*r*.7,cy+Math.sin(an)*r*.7-t*5,9+10*t,0,6.283);ctx.fill()}ctx.globalAlpha=1;break}
 case 'bite':{ // jaws snap shut
  const open=Math.abs(1-t*2.4)*Math.max(0,1-Math.max(0,t-.45)*1.8),jy=2+open*13;ctx.globalAlpha=t>.7?(1-t)/.3:1;ctx.fillStyle='#ece4cc';ctx.strokeStyle='#2a1a14';ctx.lineWidth=1.5;
  for(const sg of [-1,1]){ctx.beginPath();ctx.moveTo(tx-12,ty+sg*(jy+3));for(let i=0;i<6;i++){ctx.lineTo(tx-12+i*4.8+2.4,ty+sg*(jy-5));ctx.lineTo(tx-12+(i+1)*4.8,ty+sg*(jy+3))}ctx.closePath();ctx.fill();ctx.stroke()}
  if(t>.4&&t<.7)spark(tx,ty,10,6,'#c02020',1-(t-.4)/.3);ctx.globalAlpha=1;break}
 case 'heal':{ // rising green crosses
  glowDot(x,y,24,'#6fdc6a',.5*(1-t));ctx.globalAlpha=1-t;ctx.fillStyle='#9af58f';
  for(let i=0;i<5;i++){const px=x-14+i*7+Math.sin(f.seed+i)*3,py=y+8-(t*24+i*3)%26;ctx.fillRect(px-1,py-4,2,8);ctx.fillRect(px-4,py-1,8,2)}ctx.globalAlpha=1;break}
 case 'ward':{ // shield bubble
  ctx.strokeStyle=col;ctx.globalAlpha=(1-t)*.9;ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,14+10*easeOut(t),0,6.283);ctx.stroke();ctx.globalAlpha=(1-t)*.25;ctx.fillStyle=col;ctx.fill();ctx.globalAlpha=1;break}
 case 'sonar':{ // expanding scent ring
  const r=(f.r||T*8)*easeOut(t);ctx.strokeStyle=col;ctx.globalAlpha=(1-t)*.7;ctx.lineWidth=2+3*(1-t);ctx.beginPath();ctx.arc(x,y,r,0,6.283);ctx.stroke();ctx.globalAlpha=1;break}
 case 'streak':{ // speed lines trailing behind the player
  const dir=-(f.dir||1);ctx.globalAlpha=(1-t)*.8;ctx.strokeStyle='#dfe8c8';ctx.lineWidth=2;ctx.lineCap='round';
  for(let i=0;i<4;i++){const yy=y-10+i*7,len=14+i*5+30*t;ctx.beginPath();ctx.moveTo(x+dir*6,yy);ctx.lineTo(x+dir*(6+len),yy);ctx.stroke()}ctx.globalAlpha=1;break}
 case 'impact':{ // generic hit burst on the target
  spark(tx,ty,8+14*easeOut(t),8,col,1-t);glowDot(tx,ty,16,col,.5*(1-t));break}
 default:{ // classic melee arc / plain projectile
  ctx.strokeStyle=f.player?'#d9e0ba':'#ff7040';ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=3;
  if(f.ranged){ctx.beginPath();ctx.arc(x+dx*t,y+dy*t,5,0,Math.PI*2);ctx.fill()}
  else{const a=Math.atan2(dy,dx);ctx.beginPath();ctx.arc(x,y,18,a-.9+t*.6,a+.2+t*.6);ctx.stroke()}}}}function draw(){
 const p=G.p,s=stat(),tx=mkTex(G.regIdx);ctx.setTransform(DPR,0,0,DPR,0,0);ctx.imageSmoothingEnabled=false;ctx.save();ctx.fillStyle='#000';ctx.fillRect(0,0,CW,CH);
 const ccx=Math.round(CW/2),ccy=Math.round(CH/2);ctx.translate(ccx,ccy);ctx.scale(zoom,zoom);ctx.translate(-ccx,-ccy);
 if(G.shake>0&&settings.shake&&!settings.reduceMotion)ctx.translate((Math.random()-.5)*G.shake,(Math.random()-.5)*G.shake);
 // camera is snapped to whole pixels so tiles and sprites never shimmer against each other
 // G.cx/G.cy is the tile coordinate at the centre of the screen.
 const cxp=Math.round(G.cx*T),cyp=Math.round(G.cy*T),vw=CW/(T*zoom),vh=CH/(T*zoom);
 const tx0=Math.max(0,Math.floor(G.cx-vw/2)-1),tx1=Math.min(W-1,Math.ceil(G.cx+vw/2)+1),ty0=Math.max(0,Math.floor(G.cy-vh/2)-1),ty1=Math.min(H-1,Math.ceil(G.cy+vh/2)+1);
 const wx=x=>Math.round(x*T)-cxp+ccx,wy=y=>Math.round(y*T)-cyp+ccy;
 if(!G.fogA){G.fogA=new Float32Array(W*H);for(let y=0;y<H;y++)for(let x=0;x<W;x++)G.fogA[y*W+x]=G.vis[y][x]?0:FOG_A}
 const fogK=1-Math.exp(-frameDt/110),BR=BRIGHT[settings.brightness]||BRIGHT[1];
 for(let y=ty0;y<=ty1;y++)for(let x=tx0;x<=tx1;x++){
  if(!G.seen[y][x])continue;const t=G.map[y][x],px=wx(x),py=wy(y),v=(x*7+y*13)%4;
  if(t===0){const below=y+1<H&&G.map[y+1][x]!==0;ctx.drawImage(below?tx.wall[v]:tx.top[v&1],px,py)}
  else{ctx.drawImage(tx.floor[v],px,py);if(G.decor[y][x])drawDecor(G.decor[y][x],px,py,x,y);
   if(t===2||t===5)drawDoor(t===5,px,py,G.map[y-1][x]===0&&G.map[y+1][x]===0);
   if(t===8)drawMound(px,py,x,y);else if(t===9)drawSwamp(px,py,x,y);else if(t===10)drawAltar(px,py);
   if(t===7){ctx.fillStyle='#d8d0b0';for(let i=0;i<4;i++){ctx.fillRect(px+3+i*7,py+6+(i%2)*3,5,22-(i%2)*3)}ctx.fillStyle='#8a8068';ctx.fillRect(px+2,py+10,28,3);ctx.fillRect(px+2,py+20,28,3)}
   if(x===G.sD.x&&y===G.sD.y)drawStairs(px,py,true);if(x===G.sU.x&&y===G.sU.y)drawStairs(px,py,false)}
  // remembered-but-not-visible tiles dim and brighten smoothly instead of popping
  const fi=y*W+x,fa=G.fogA[fi]+((G.vis[y][x]?0:FOG_A)-G.fogA[fi])*fogK;G.fogA[fi]=fa;
  if(fa>.01){ctx.fillStyle='rgba(4,2,8,'+fa.toFixed(3)+')';ctx.fillRect(px,py,T,T)}}
 for(const t of G.torches){if(t.x<tx0-1||t.y<ty0-1||t.x>tx1+1||t.y>ty1+1||!G.seen[t.y][t.x])continue;const px=wx(t.x),py=wy(t.y),f=Math.floor(tick/5+t.x)%3;
  ctx.fillStyle='#2a1a10';ctx.fillRect(px+14,py+14,4,10);ctx.fillStyle='#555';ctx.fillRect(px+12,py+12,8,3);
  ctx.fillStyle='#e85a10';ctx.fillRect(px+13,py+5+f,6,8-f);ctx.fillStyle='#ffb030';ctx.fillRect(px+14,py+7+f,4,6-f);ctx.fillStyle='#fff0a0';ctx.fillRect(px+15,py+10,2,3)}
 const piles=new Map();for(const it of G.items){if(!G.seen[it.y][it.x])continue;const k=it.y*W+it.x;(piles.get(k)||piles.set(k,[]).get(k)).push(it)}
 for(const pile of piles.values()){
  pile.forEach((it,n)=>{const ox2=n===0?0:(n%2?5:-5),oy2=n===0?0:2,px=wx(it.x)+ox2,py=wy(it.y)+oy2;
   ctx.fillStyle='rgba(0,0,0,.45)';ctx.beginPath();ctx.ellipse(px+16,py+27,10,4,0,0,6.3);ctx.fill();
   ctx.drawImage(itIcon(it.it),px,py-2+Math.round(Math.sin(tick/14+it.x+n)*1.5),T,T)});
  const top=pile[0],px=wx(top.x),py=wy(top.y);
  if(G.vis[top.y][top.x]){ctx.fillStyle='rgba(255,230,140,'+(.5+.5*Math.sin(tick/9+top.y))+')';ctx.fillRect(px+25,py+3,2,2)}
  if(pile.length>1){ctx.fillStyle='#000';ctx.fillRect(px+19,py+19,12,10);ctx.fillStyle='#fc6';ctx.font='bold 10px monospace';ctx.textAlign='center';ctx.fillText('x'+pile.length,px+25,py+27);ctx.textAlign='left'}}
 for(const m of G.mons)if(m.warning&&G.vis[m.y][m.x]){const w=m.warning,px=wx(w.x),py=wy(w.y),pu=.7+.3*Math.sin(tick/4);
 ctx.fillStyle='rgba(255,30,35,'+(.3*pu+.1)+')';ctx.fillRect(px,py,32,32);ctx.strokeStyle='#ff6050';ctx.lineWidth=2;ctx.strokeRect(px+2,py+2,28,28);
 ctx.beginPath();ctx.moveTo(wx(m.x)+16,wy(m.y)+16);ctx.lineTo(px+16,py+16);ctx.setLineDash([4,4]);ctx.stroke();ctx.setLineDash([]);
 }
 // monsters that just died shrink and fade where they fell
 for(const d of G.dying){const u=Math.min(1,(NOW-d.t0)/280);if(!G.vis[d.y][d.x])continue;const px=wx(d.rx),py=wy(d.ry),sc=1-.25*u;
  ctx.save();ctx.globalAlpha=1-u;ctx.translate(px+16,py+30);ctx.scale(d.fx*(NATIVE[d.k]||1)<0?-sc:sc,sc);ctx.drawImage(S[d.k],-16,-30+u*4,T,T);
  if(u<.5){ctx.globalAlpha=(1-u*2)*.7;ctx.drawImage(flashSprite(S[d.k],'#ffffff'),-16,-30+u*4,T,T)}ctx.restore()}
 const ents=G.mons.filter(m=>m.va>.02).map(m=>({y:m.ry,m})).concat([{y:p.ry,pl:1}]).sort((a,b)=>a.y-b.y);
 for(const e of ents){
  const o=e.pl?p:e.m,px=wx(o.rx),py=wy(o.ry),face=(e.pl?o.face:o.fx)*(e.pl?1:(NATIVE[o.k]||1));
  // lunge toward the target and back, hop while walking, gentle breathing when idle
  const rm=settings.reduceMotion;let lx=0,ly=0;if(o.lg&&rm)o.lg=null;if(o.lg){const u=(NOW-o.lg.t0)/180;if(u>=1)o.lg=null;else{const k=Math.sin(Math.PI*Math.pow(u,.7))*.4*T;lx=o.lg.dx*k;ly=o.lg.dy*k}}
  const hop=0,br=0;
  const fly=!e.pl&&o.k==='crow'?-3+(o.moving&&!rm?Math.sin(tick/2.2)*1.2:0):0;
  let fa=0;if(o.fl){fa=1-(NOW-o.fl.t0)/220;if(fa<=0){o.fl=null;fa=0}}
  const alpha=e.pl?1:Math.min(1,o.va);ctx.globalAlpha=alpha;
  if(!e.pl&&o.ally){ctx.strokeStyle='rgba(120,230,210,.9)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(px+16,py+29,13,5,0,0,6.3);ctx.stroke()}
  if(e.pl&&o.sage>0)glowDot(px+16,py+18,32,'#ff9a30',.5+.15*Math.sin(tick/4)); // Sage Mode aura
  ctx.fillStyle='rgba(0,0,0,.5)';ctx.beginPath();ctx.ellipse(px+16+lx*.5,py+29,(e.pl?10:(o.k==='golem'||o.k==='boss'?13:9))-hop*.5,4,0,0,6.3);ctx.fill();
  ctx.save();if(face<0){ctx.translate(px+T+lx,py+ly);ctx.scale(-1,1)}else ctx.translate(px+lx,py+ly);
  ctx.translate(0,Math.round(-hop-br+fly));
  const img=e.pl?composePlayer(p.eq):S[o.k];ctx.drawImage(img,0,0,T,T);
  if(fa>0){ctx.globalAlpha=alpha*fa*.85;ctx.drawImage(flashSprite(img,e.pl?'#ff4a38':'#ffffff'),0,0,T,T)}
  ctx.restore();ctx.globalAlpha=alpha;
  if(!e.pl&&selItem&&selItem.mon===o){ctx.strokeStyle='#ffd060';ctx.lineWidth=2;ctx.setLineDash([4,3]);ctx.strokeRect(px+2,py+2,28,28);ctx.setLineDash([])}
  if(!e.pl){const m=o;
   if(m.hp<m.max){ctx.fillStyle='#1a0505';ctx.fillRect(px+3,py-1,T-6,4);ctx.fillStyle='#d33';ctx.fillRect(px+4,py,Math.max(0,(T-8)*m.hp/m.max),2)}
   if(m.bleed>0||m.poison>0||m.stun>0||m.burn>0||m.slow>0||m.root>0){ctx.fillStyle=m.stun>0?'#fe6':m.root>0?'#fb4':m.burn>0?'#f93':m.poison>0?'#9c3':m.slow>0?'#8ab':'#c33';ctx.fillRect(px+2,py+4,4,4)}
   if(!m.alert&&!m.ally){ctx.fillStyle='#fff';ctx.font='bold 10px monospace';ctx.textAlign='left';ctx.fillText('z',px+T-9,py+8+Math.sin(tick/12)*2)}}
  ctx.globalAlpha=1}
 // while aiming: pulsing crosshair rings on every enemy you can pick
 if(aim)for(const m of aim.cands){if(m.dead)continue;const px=wx(m.rx!==undefined?m.rx:m.x)+16,py=wy(m.ry!==undefined?m.ry:m.y)+16,pu=.6+.4*Math.sin(tick/5),r=17+2*Math.sin(tick/5);
  ctx.strokeStyle='rgba(255,90,70,'+(.5+.5*pu)+')';ctx.lineWidth=2;ctx.beginPath();ctx.arc(px,py,r,0,6.283);ctx.stroke();
  ctx.beginPath();ctx.moveTo(px-r-4,py);ctx.lineTo(px-r+5,py);ctx.moveTo(px+r-5,py);ctx.lineTo(px+r+4,py);ctx.moveTo(px,py-r-4);ctx.lineTo(px,py-r+5);ctx.moveTo(px,py+r-5);ctx.lineTo(px,py+r+4);ctx.stroke()}
 // attack and ability effects draw over the sprites
 for(const f of G.attackFX){if(f.delay>0)continue;ctx.save();drawFX(f,wx,wy);ctx.restore()}
 for(const q of G.parts){ctx.fillStyle=q.c;ctx.globalAlpha=Math.min(1,q.l/10);ctx.fillRect(Math.round(q.x-cxp),Math.round(q.y-cyp),q.s,q.s)}ctx.globalAlpha=1;
 lctx.globalCompositeOperation='source-over';lctx.clearRect(0,0,CW,CH);lctx.fillStyle='rgba(3,2,8,'+BR.dark+')';lctx.fillRect(0,0,CW,CH);
 lctx.globalCompositeOperation='destination-out';
 const fl=1+Math.sin(tick/7)*.03+Math.sin(tick/3.1)*.02;
 const light=(cx,cy,r,a)=>{const g=lctx.createRadialGradient(cx,cy,r*.1,cx,cy,r);g.addColorStop(0,`rgba(0,0,0,${a})`);g.addColorStop(.55,`rgba(0,0,0,${a*.6})`);g.addColorStop(1,'rgba(0,0,0,0)');lctx.fillStyle=g;lctx.fillRect(cx-r,cy-r,r*2,r*2)};
 light(wx(p.rx)+16,wy(p.ry)+16,(s.sight*T+44)*fl,1);
 for(const t of G.torches){if(!G.seen[t.y][t.x])continue;light(wx(t.x)+16,wy(t.y)+20,130*(1+Math.sin(tick/5+t.x*3)*.06),.9)}
 // when zoomed out the light canvas no longer covers the view: darken the margin around it too
 ctx.fillStyle='rgba(3,2,8,'+BR.dark+')';ctx.fillRect(-3000,-3000,CW+6000,3000);ctx.fillRect(-3000,CH,CW+6000,3000);ctx.fillRect(-3000,0,3000,CH);ctx.fillRect(CW,0,3000,CH);
 ctx.drawImage(lc,0,0);
 ctx.globalCompositeOperation='lighter';
 if(!settings.lowfx)for(const t of G.torches){if(!G.seen[t.y][t.x])continue;const cx=wx(t.x)+16,cy=wy(t.y)+20,g=ctx.createRadialGradient(cx,cy,4,cx,cy,110);g.addColorStop(0,'rgba(255,120,30,.22)');g.addColorStop(1,'rgba(255,120,30,0)');ctx.fillStyle=g;ctx.fillRect(cx-110,cy-110,220,220)}
 if(!settings.lowfx){const cx=wx(p.rx)+16,cy=wy(p.ry)+16,g=ctx.createRadialGradient(cx,cy,4,cx,cy,s.sight*T);g.addColorStop(0,'rgba(140,165,115,.13)');g.addColorStop(1,'rgba(120,150,100,0)');ctx.fillStyle=g;ctx.fillRect(cx-200,cy-200,400,400)}
 ctx.globalCompositeOperation='source-over';
 // floating numbers pop in slightly large, rise with ease-out and fade over the last 40% of their life
 ctx.lineWidth=3;ctx.strokeStyle='#000';ctx.textAlign='center';
 for(const f of G.floaters){const u=1-f.l/(f.max||f.l),rise=1-Math.pow(1-u,2.2),sc=u<.15?1+.4*(1-u/.15):1,px=wx(f.x)+16+(f.jx||0),py=wy(f.y)+6-rise*24;
  ctx.globalAlpha=u<.6?1:Math.max(0,(1-u)/.4);ctx.font='bold '+Math.round(13*sc)+'px monospace';ctx.strokeText(f.t,px,py);ctx.fillStyle=f.c;ctx.fillText(f.t,px,py)}
 ctx.globalAlpha=1;ctx.textAlign='left';
 ctx.restore();
 const vg=Math.min(CW,CH),g=ctx.createRadialGradient(ccx,ccy,vg*.35,ccx,ccy,Math.hypot(CW,CH)*.55);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,'+BR.vig+')');ctx.fillStyle=g;ctx.fillRect(0,0,CW,CH);
 if(p.hp<s.hp*.3){ctx.fillStyle=`rgba(160,0,0,${.12+.08*Math.sin(tick/6)})`;ctx.fillRect(0,0,CW,CH)}
 if(p.hunger>=75){ctx.strokeStyle=`rgba(120,90,10,${.3+.2*Math.sin(tick/10)})`;ctx.lineWidth=8;ctx.strokeRect(0,0,CW,CH)}
 drawMinimap(p,vw,vh);
}
// brightness presets: `dark` is the unlit layer's opacity, `vig` the screen-edge vignette
const BRIGHT=[{dark:.88,vig:.5},{dark:.76,vig:.38},{dark:.62,vig:.26}],FOG_A=.3;
// minimap geometry is shared with the tap-to-jump handler in input.js
const MM={x:0,y:0,s:2,w:0,h:0};
function drawMinimap(p,vw,vh){
 if(!settings.minimap){MM.w=0;return}
 const s=CW<520?2:3,mx=CW-W*s-8,my=52;MM.x=mx;MM.y=my;MM.s=s;MM.w=W*s;MM.h=H*s;
 ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(mx-1,my-1,W*s+2,H*s+2);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(G.seen[y][x]){const t=G.map[y][x];ctx.fillStyle=t===0?'#3a3a3a':t===2||t===5?'#a07838':t===8?'#9a5a3a':t===9?'#3a6a4a':t===10?'#b0b0d0':'#7a6a58';ctx.fillRect(mx+x*s,my+y*s,s,s)}
 for(const m of G.mons)if(G.vis[m.y][m.x]){ctx.fillStyle=m.ally?'#7fd':'#e44';ctx.fillRect(mx+m.x*s-1,my+m.y*s-1,s+1,s+1)}
 ctx.fillStyle='#7f7';ctx.fillRect(mx+p.x*s-1,my+p.y*s-1,s+2,s+2);
 if(G.sD.x>=0&&G.seen[G.sD.y][G.sD.x]){ctx.fillStyle='#fc3';ctx.fillRect(mx+G.sD.x*s-1,my+G.sD.y*s-1,s+2,s+2)}
 ctx.fillStyle='#6cf';ctx.fillRect(mx+G.sU.x*s-1,my+G.sU.y*s-1,s+2,s+2);
 // where the camera is looking
 ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=1;
 const rx=Math.max(mx,mx+(G.cx-vw/2)*s),ry=Math.max(my,my+(G.cy-vh/2)*s),rx2=Math.min(mx+W*s,mx+(G.cx+vw/2)*s),ry2=Math.min(my+H*s,my+(G.cy+vh/2)*s);
 ctx.strokeRect(Math.round(rx)+.5,Math.round(ry)+.5,Math.max(2,Math.round(rx2-rx)),Math.max(2,Math.round(ry2-ry)))}// white/red silhouette of a sprite, used for hit flashes (cached per sprite + colour)
const flashCache=new Map();
function flashSprite(img,col){const key=col;let m=flashCache.get(img);if(!m)flashCache.set(img,m={});
 if(m[key])return m[key];const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const x=c.getContext('2d');
 x.drawImage(img,0,0);x.globalCompositeOperation='source-atop';x.fillStyle=col;x.fillRect(0,0,c.width,c.height);return m[key]=c}
// Movement: every logical step (setPos) queues a waypoint, and glide() slides the sprite along the queue as one continuous motion.
// It is a plain slide in the direction of travel (no hop or bounce): speed ramps up from rest, holds steady through chained steps,
// and brakes smoothly onto the final tile, so a lone step and a long walk both look fluid. Monsters start slightly apart (o.delay).
const VMAX=8.5,ACC=170; // tiles per second, tiles per second squared
let frameDt=16.7,lastT=0;
function setPos(o,x,y){(o.q||(o.q=[])).push([x,y]);if(o.q.length>8)o.q.splice(0,o.q.length-4);o.x=x;o.y=y}
function snapPos(o,x,y){o.x=x;o.y=y;o.rx=x;o.ry=y;o.q=[];o.vel=0;o.pr=1;o.moving=false}
function setFace(o,s){if(!s)return;if(o===G.p)o.face=s;else o.fx=s}
function glide(o){
 if(o.rx===undefined){o.rx=o.x;o.ry=o.y;o.q=[];o.vel=0}
 const q=o.q||(o.q=[]);o.pr=1;
 // anything that wrote o.x/o.y directly (pulls, teleports, debug) shows up as a mismatch with the end of the queue
 const last=q.length?q[q.length-1]:null;
 if(last?(last[0]!==o.x||last[1]!==o.y):(Math.round(o.rx)!==o.x||Math.round(o.ry)!==o.y)){
  if(Math.hypot(o.x-o.rx,o.y-o.ry)>4)snapPos(o,o.x,o.y);else q.push([o.x,o.y])}
 if(!q.length){o.vel=0;o.moving=false;o.rx=o.x;o.ry=o.y;return}
 if(!o.moving){o.moving=true;o.startAt=NOW+(o.delay||0);o.delay=0}
 if(NOW<o.startAt)return; // staggered start: hold still
 const dt=Math.min(.05,frameDt/1000);
 // distance still to cover along the whole queue decides how hard to brake
 let rem=0,px=o.rx,py=o.ry;for(const [qx,qy] of q){rem+=Math.max(Math.abs(qx-px),Math.abs(qy-py));px=qx;py=qy} // chessboard distance: a diagonal step takes exactly as long as a straight one
 const vmax=VMAX*(1+.35*(q.length-1))*(o.haste>0?1.8:1),cruising=o.cruise&&NOW<o.cruise, // click-to-travel keeps feeding steps: do not brake between them
  vlim=cruising?Infinity:Math.max(.7,Math.sqrt(2*ACC*rem)),goal=Math.min(vmax,vlim);
 o.vel+=Math.max(-ACC*dt,Math.min(ACC*dt,goal-o.vel));
 let step=o.vel*dt;
 while(step>0&&q.length){
  const [tx,ty]=q[0],dx=tx-o.rx,dy=ty-o.ry,d=Math.max(Math.abs(dx),Math.abs(dy));
  if(Math.abs(dx)>.05)setFace(o,Math.sign(dx)); // look where you are heading
  if(d<=step){o.rx=tx;o.ry=ty;step-=d;q.shift()}else{o.rx+=dx/d*step;o.ry+=dy/d*step;step=0}}
 if(!q.length){o.vel=0;o.moving=false}}function loop(){
 const t=performance.now();frameDt=Math.min(50,t-(lastT||t-16.7));lastT=t;NOW=t;const k=frameDt/16.667;tick+=k;
 for(const f of G.attackFX){if(f.delay>0)f.delay-=k;else f.life-=k}G.attackFX=G.attackFX.filter(f=>f.life>0);
 G.dying=G.dying.filter(d=>NOW-d.t0<300);
 if(G.map){const p=G.p;
  glide(p);for(const m of G.mons){glide(m);
   if(m.va===undefined)m.va=G.vis[m.y][m.x]?1:0;m.va+=((G.vis[m.y][m.x]?1:0)-m.va)*(1-Math.exp(-frameDt/90));
   if(m.lhp===undefined)m.lhp=m.hp;if(m.hp<m.lhp)m.fl={t0:NOW};m.lhp=m.hp}
  if(p.lhp===undefined)p.lhp=p.hp;if(p.hp<p.lhp)p.fl={t0:NOW};p.lhp=p.hp;
  // camera eases toward the player (centre-based: G.cx/G.cy is the tile at the middle of the screen)
  const vw=CW/(T*zoom),vh=CH/(T*zoom),tcx=p.rx+.5,tcy=p.ry+.5;
  const range=(size,half)=>size<=half*2?[size/2,size/2]:[half,size-half]; // allowed centre range keeps the map on screen
  const [lx,hx]=range(W,vw/2),[ly,hy]=range(H,vh/2),M=4;
  const bx=Math.max(lx,Math.min(hx,tcx)),by=Math.max(ly,Math.min(hy,tcy));
  if(G.sbx==null){G.sbx=bx;G.sby=by}else{const a=1-Math.exp(-frameDt/110);G.sbx+=(bx-G.sbx)*a;G.sby+=(by-G.sby)*a}
  if(panGoal){const a=1-Math.exp(-frameDt/90);pan.x+=(panGoal.x-pan.x)*a;pan.y+=(panGoal.y-pan.y)*a;if(Math.abs(panGoal.x-pan.x)+Math.abs(panGoal.y-pan.y)<.03){pan.x=panGoal.x;pan.y=panGoal.y;panGoal=null}}
  // the user's pan offset sits on top and may overshoot the map edge by a few tiles
  G.cx=Math.max(lx-M,Math.min(hx+M,G.sbx+pan.x));G.cy=Math.max(ly-M,Math.min(hy+M,G.sby+pan.y));pan.x=G.cx-G.sbx;pan.y=G.cy-G.sby}
 for(const f of G.floaters){if(!f.max){f.max=f.l;f.jx=Math.random()*10-5}f.l-=k}G.floaters=G.floaters.filter(f=>f.l>0);
 for(const q of G.parts){q.x+=q.vx*k;q.y+=q.vy*k;q.vy+=.12*k;q.l-=k}G.parts=G.parts.filter(q=>q.l>0);
 if(G.shake>0)G.shake*=Math.pow(.85,k);if(G.shake<.3)G.shake=0;
 try{if(G.map)draw()}catch(err){console.error('draw failed',err);ctx.restore()}
 requestAnimationFrame(loop)}
