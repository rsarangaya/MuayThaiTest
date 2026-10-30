let TEX={};
function seeded(s){return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296}}
function mkTex(ri){
 if(TEX[ri])return TEX[ri];const R=REG[ri],rng=seeded(ri*977+11),mk=()=>{const c=document.createElement('canvas');c.width=c.height=32;return c},tx={floor:[],wall:[],top:[]};
 const blocks=(x,base,amp)=>{for(let j=0;j<32;j+=2)for(let i=0;i<32;i+=2){x.fillStyle=mix(base,rng()<.5?'#000000':'#ffffff',rng()*amp);x.fillRect(i,j,2,2)}};
 for(let v=0;v<4;v++){
  let c=mk(),x=c.getContext('2d');blocks(x,R.f,.1);
  const g=dark(R.f,.5),hl=lite(R.f,.14),oy=[0,16,8,20][v],ox=[8,24,16,4][v];
  x.fillStyle=g;x.fillRect(0,0,32,2);x.fillRect(0,oy,32,2);x.fillRect(ox,0,2,oy);x.fillRect((ox+16)%32,oy,2,32-oy);
  x.fillStyle=hl;x.fillRect(2,2,28,1);x.fillRect(2,oy+2,28,1);
  for(let k=0;k<3;k++){x.fillStyle=dark(R.f,.4);let px=crnd(3,26),py=crnd(3,26);for(let s=0;s<crnd(3,6);s++){x.fillRect(px,py,2,2);px+=crnd(0,2)*2;py+=2}}
  tx.floor.push(c);
  c=mk();x=c.getContext('2d');
  for(let r=0;r<4;r++){const off=(r%2)*8+(v*3%8);for(let b=-1;b<3;b++){const bx=off+b*16-(off>=8?8:0),by=r*8;
    const col=mix(R.w,rng()<.5?'#000000':'#ffffff',rng()*.16);x.fillStyle=col;x.fillRect(bx,by,16,8);
    for(let k=0;k<5;k++){x.fillStyle=mix(col,'#000000',rng()*.2);x.fillRect(bx+crnd(1,13),by+crnd(1,5),2,1)}
    x.fillStyle=lite(col,.16);x.fillRect(bx+1,by,14,1);x.fillStyle=dark(col,.3);x.fillRect(bx,by+7,16,1);x.fillStyle=dark(R.w,.55);x.fillRect(bx,by,1,8)}}
  x.fillStyle='rgba(0,0,0,.28)';x.fillRect(0,26,32,6);x.fillStyle='rgba(0,0,0,.2)';x.fillRect(0,22,32,4);
  if(v===1||v===3){x.fillStyle=R.acc+'55';x.fillRect(crnd(2,22),0,3,crnd(6,16));x.fillRect(crnd(2,22),0,2,crnd(4,10))}
  tx.wall.push(c)}
 for(let v=0;v<2;v++){const c=mk(),x=c.getContext('2d');blocks(x,R.t,.35);x.fillStyle='rgba(255,255,255,.04)';for(let k=0;k<6;k++)x.fillRect(crnd(0,15)*2,crnd(0,15)*2,2,2);tx.top.push(c)}
 return TEX[ri]=tx}
