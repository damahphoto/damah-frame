(function(){
"use strict";
const $=id=>document.getElementById(id);
const $$=sel=>Array.from(document.querySelectorAll(sel));
const S={
 view:"home",panel:"photos",mode:"single",frame:"instant",count:4,ratio:"portrait",
 paper:"#fffdfa",customBg:null,bgFit:"cover",photos:[],slots:[null,null,null,null,null,null],
 transforms:{},selectedSlot:0,sample:false,title:"오늘의 기록",subtitle:"ONE FINE DAY",
 font:"Noto Sans KR",textColor:"#273238",showText:true,showInfo:false,
 date:"",place:"",camera:"",lens:"",exposure:""
};
let seq=0,renderQueued=false,drag=null,lastBoxes=[];
const ratios={portrait:[1200,1500],square:[1400,1400],landscape:[1600,1000],story:[1080,1920]};
const colors=["#fffdfa","#f1efeb","#dce8e9","#c5d3c6","#e0d9cf","#2d3b42"];
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const count=()=>S.mode==="single"?1:S.count;
const getPhoto=(id)=>S.photos.find(p=>p.id===id);
const getTrans=(i)=>S.transforms[i]||(S.transforms[i]={zoom:1,x:0,y:0});
const cap=(txt,n)=>String(txt||"").slice(0,n);
function announce(txt){let t=$("toast");t.textContent=txt;t.classList.remove("hidden");clearTimeout(announce.timer);announce.timer=setTimeout(()=>t.classList.add("hidden"),3500)}
function showView(view){
 S.view=view;
 $$(".view").forEach(v=>v.classList.toggle("hidden",v.id!==(view+"View")));
 $$("[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
 if(view==="editor"){refreshControls();queueDraw()}
 window.scrollTo({top:0,behavior:"smooth"});
}
function showPanel(panel){
 S.panel=panel;
 $$(".tool-panel").forEach(v=>v.classList.toggle("hidden",v.id!=="panel-"+panel));
 $$("[data-panel]").forEach(b=>b.classList.toggle("active",b.dataset.panel===panel));
 refreshControls();
}
function resetSample(){S.sample=true;showView("editor");announce("샘플을 불러왔어. 실제 사진도 추가해 봐!")}
function queueDraw(){if(renderQueued)return;renderQueued=true;requestAnimationFrame(()=>{renderQueued=false;render()})}
function setOption(key,value){
 if(key==="count")S.count=Number(value);
 else S[key]=value;
 if(key==="mode"||key==="count"||key==="frame")S.selectedSlot=clamp(S.selectedSlot,0,count()-1);
 refreshControls();queueDraw();
}
function refreshControls(){
 $$("[data-mode]").forEach(b=>b.classList.toggle("active",b.dataset.mode===S.mode));
 $$("[data-frame]").forEach(b=>b.classList.toggle("active",b.dataset.frame===S.frame));
 $$("[data-count]").forEach(b=>b.classList.toggle("active",Number(b.dataset.count)===S.count));
 $$("[data-paper]").forEach(b=>b.classList.toggle("active",b.dataset.paper===S.paper));
 $("singleOptions").classList.toggle("hidden",S.mode!=="single");
 $("collageOptions").classList.toggle("hidden",S.mode!=="collage");
 $("ratioSelect").value=S.ratio;$("selectedSlotNumber").textContent=String(S.selectedSlot+1);
 $("slotPicker").replaceChildren();
 for(let i=0;i<count();i++){const opt=document.createElement("option");opt.value=i;opt.textContent="사진 위치 "+(i+1);$("slotPicker").append(opt)}
 $("slotPicker").value=String(S.selectedSlot);
 $("slotPhotoPicker").replaceChildren();
 const empty=document.createElement("option");empty.value="";empty.textContent="사진을 선택해 주세요";$("slotPhotoPicker").append(empty);
 for(const p of S.photos){const opt=document.createElement("option");opt.value=p.id;opt.textContent=p.name;$("slotPhotoPicker").append(opt)}
 $("slotPhotoPicker").value=S.slots[S.selectedSlot]||"";
 const t=getTrans(S.selectedSlot);
 $("zoomRange").value=t.zoom;$("zoomValue").textContent=Number(t.zoom).toFixed(2)+"×";
 $("xRange").value=t.x;$("xValue").textContent=Math.round(t.x*100)+"%";
 $("yRange").value=t.y;$("yValue").textContent=Math.round(t.y*100)+"%";
 $("backgroundFit").value=S.bgFit;
 $("backgroundPreview").classList.toggle("hidden",!S.customBg);
 if(S.customBg){$("backgroundThumb").src=S.customBg.img.src;$("backgroundName").textContent=S.customBg.name}
 $("showText").checked=S.showText;$("showInfo").checked=S.showInfo;
 renderThumbs();
}
function renderThumbs(){
 const host=$("photoList");host.replaceChildren();
 S.photos.forEach((p,i)=>{
  const tile=document.createElement("div");tile.className="photo-tile"+(S.slots[S.selectedSlot]===p.id?" selected":"");tile.title="선택한 사진 위치에 적용";
  const im=document.createElement("img");im.src=p.img.src;im.alt=p.name;
  const name=document.createElement("span");name.className="tile-name";name.textContent=(i+1)+". "+p.name;
  const remove=document.createElement("button");remove.className="tile-x";remove.type="button";remove.textContent="×";remove.setAttribute("aria-label",p.name+" 삭제");
  remove.addEventListener("click",e=>{e.stopPropagation();removePhoto(p.id)});
  tile.addEventListener("click",()=>{S.slots[S.selectedSlot]=p.id;S.sample=false;refreshControls();queueDraw()});
  tile.append(im,name,remove);host.append(tile)
 });
 $("photoCount").textContent=S.photos.length+"장 업로드됨";
}
function removePhoto(id){
 const p=getPhoto(id);if(!p)return;
 if(p.url)URL.revokeObjectURL(p.url);
 S.photos=S.photos.filter(x=>x.id!==id);
 S.slots=S.slots.map(v=>v===id?(S.photos[0]?.id||null):v);
 refreshControls();queueDraw()
}
function loadImage(file){
 return new Promise((resolve,reject)=>{
  if(!file.type.startsWith("image/")){reject(new Error("사진 파일만 불러올 수 있어."));return}
  if(file.size>40*1024*1024){reject(new Error("40MB 이하의 사진을 선택해 줘."));return}
  const url=URL.createObjectURL(file),img=new Image();
  img.onload=()=>resolve({id:"photo-"+(++seq),name:file.name,img,url,modified:file.lastModified});
  img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("이미지를 열지 못했어."))};
  img.src=url;
 })
}
async function addPhotos(files){
 const arr=Array.from(files).filter(f=>f.type.startsWith("image/")).slice(0,20-S.photos.length);
 if(!arr.length){announce("추가할 수 있는 이미지가 없어. 사진은 최대 20장이야.");return}
 let added=0;
 for(const file of arr){
  try{
   const p=await loadImage(file);S.photos.push(p);
   const available=S.slots.findIndex(id=>!id);
   if(available>=0)S.slots[available]=p.id;
   if(added===0&&!S.date)S.date=new Date(p.modified||Date.now()).toLocaleDateString("ko-KR");
   added++;
  }catch(e){announce(e.message)}
 }
 if(added){S.sample=false;$("infoDate").value=S.date;refreshControls();queueDraw();announce(added+"장의 사진을 불러왔어.")}
}
async function addBackground(file){
 if(!file)return;
 try{
  const bg=await loadImage(file);
  if(S.customBg?.url)URL.revokeObjectURL(S.customBg.url);
  S.customBg=bg;
  refreshControls();queueDraw();announce("프레임 배경을 적용했어. 사진 아래에 배치돼.");
 }catch(e){announce(e.message)}
}
function fitDraw(ctx,img,x,y,w,h,fit){
 const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;
 if(!iw||!ih)return;
 const sc=fit==="contain"?Math.min(w/iw,h/ih):Math.max(w/iw,h/ih);
 const dw=iw*sc,dh=ih*sc;ctx.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh)
}
function roundRect(ctx,x,y,w,h,r){r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
function calculateBoxes(w,h){
 const n=count();
 let margin=w*(S.frame==="gallery"?.095:S.frame==="full"?.035:.065);
 if(S.mode==="collage")margin=w*.055;
 const top=S.mode==="single"?h*.052:h*.055;
 const band=S.showText||S.showInfo?(S.mode==="single"?(S.frame==="instant"?.19:.15):.135):.045;
 const bot=h*band;
 const area={x:margin,y:top,w:w-2*margin,h:h-top-bot};
 const gap=w*.02;
 if(n===1)return [area];
 if(n===2)return [{x:area.x,y:area.y,w:(area.w-gap)/2,h:area.h},{x:area.x+(area.w+gap)/2,y:area.y,w:(area.w-gap)/2,h:area.h}];
 if(n===3)return [
 {x:area.x,y:area.y,w:area.w,h:(area.h-gap)/2},
 {x:area.x,y:area.y+(area.h+gap)/2,w:(area.w-gap)/2,h:(area.h-gap)/2},
 {x:area.x+(area.w+gap)/2,y:area.y+(area.h+gap)/2,w:(area.w-gap)/2,h:(area.h-gap)/2}
 ];
 const cols=n===6&&(w/h>1)?3:2,rows=Math.ceil(n/cols);
 const sw=(area.w-gap*(cols-1))/cols,sh=(area.h-gap*(rows-1))/rows;
 return Array.from({length:n},(_,i)=>({x:area.x+(i%cols)*(sw+gap),y:area.y+Math.floor(i/cols)*(sh+gap),w:sw,h:sh}))
}
function paintSample(ctx,b,i){
 ctx.save();ctx.beginPath();ctx.rect(b.x,b.y,b.w,b.h);ctx.clip();
 const sky=ctx.createLinearGradient(0,b.y,0,b.y+b.h);sky.addColorStop(0,["#a4c9d1","#bed7d1","#e1cdb8","#a8c4cf"][i%4]);sky.addColorStop(.55,["#d4e1d6","#eadfc9","#d2d8c5","#e7dbcc"][i%4]);sky.addColorStop(1,"#6d997e");ctx.fillStyle=sky;ctx.fillRect(b.x,b.y,b.w,b.h);
 ctx.fillStyle="#d7e4de";for(let j=0;j<7;j++){let px=b.x+b.w*(j/7),height=b.h*(.13+.17*((j+2)%4)/4);ctx.fillRect(px,b.y+b.h*.37-height,b.w*.077,height)}
 ctx.fillStyle="#719e82";ctx.beginPath();ctx.ellipse(b.x+b.w*.38,b.y+b.h*.85,b.w*.85,b.h*.35,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="#89ae8b";ctx.beginPath();ctx.ellipse(b.x+b.w*.92,b.y+b.h*.7,b.w*.55,b.h*.35,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="#d7c39d";ctx.beginPath();ctx.moveTo(b.x+b.w*.52,b.y+b.h*.53);ctx.lineTo(b.x+b.w*.66,b.y+b.h*.53);ctx.lineTo(b.x+b.w*.9,b.y+b.h);ctx.lineTo(b.x+b.w*.15,b.y+b.h);ctx.closePath();ctx.fill();
 const tree=(px,py,sz)=>{ctx.fillStyle="#56745b";ctx.fillRect(px-sz*.06,py,sz*.12,sz*.9);ctx.fillStyle="#4e885e";for(let k=0;k<3;k++){ctx.beginPath();ctx.arc(px+(k-1)*sz*.2,py-k*sz*.22,sz*.35,0,Math.PI*2);ctx.fill()}};
 for(let j=0;j<4;j++){tree(b.x+b.w*(.1+j*.19),b.y+b.h*(.54+j*.045),b.w*(.1+j*.014))}
 ctx.restore();
}
function drawPhoto(ctx,b,index){
 ctx.save();ctx.beginPath();ctx.rect(b.x,b.y,b.w,b.h);ctx.clip();
 const img=getPhoto(S.slots[index])?.img,transform=getTrans(index);
 if(img){
  const iw=img.naturalWidth,ih=img.naturalHeight;
  const base=Math.max(b.w/iw,b.h/ih)*transform.zoom;
  const dw=iw*base,dh=ih*base;
  const maxX=Math.max(0,(dw-b.w)/2),maxY=Math.max(0,(dh-b.h)/2);
  const x=b.x+(b.w-dw)/2+transform.x*maxX;
  const y=b.y+(b.h-dh)/2+transform.y*maxY;
  ctx.drawImage(img,x,y,dw,dh)
 }else if(S.sample){paintSample(ctx,b,index)}
 else{
  ctx.fillStyle="#e6ecec";ctx.fillRect(b.x,b.y,b.w,b.h);
  ctx.fillStyle="#a2b3ba";ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.font="600 "+Math.round(clamp(b.w*.05,18,33))+"px sans-serif";
  ctx.fillText("＋ 사진을 추가하세요",b.x+b.w/2,b.y+b.h/2,b.w*.86)
 }
 ctx.restore()
}
function shorten(ctx,str,maxWidth){let s=String(str||"");if(ctx.measureText(s).width<=maxWidth)return s;while(s.length&&ctx.measureText(s+"…").width>maxWidth)s=s.slice(0,-1);return s+"…"}
function drawLabels(ctx,w,h,boxes){
 if(!S.showText&&!S.showInfo)return;
 const maxBottom=Math.max(...boxes.map(b=>b.y+b.h));
 let y=maxBottom+(h-maxBottom)*.31;
 const center=w/2;
 ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillStyle=S.textColor;
 if(S.showText){
  ctx.font="700 "+Math.round(clamp(w*.033,28,52))+"px '"+S.font+"',sans-serif";
  ctx.fillText(shorten(ctx,S.title,w*.86),center,y);y+=w*.048;
  ctx.font="400 "+Math.round(clamp(w*.015,17,26))+"px '"+S.font+"',sans-serif";
  ctx.fillText(shorten(ctx,S.subtitle,w*.86),center,y);y+=w*.037;
 }
 if(S.showInfo){
  const topLine=[S.date,S.place].filter(Boolean).join("  ·  ");
  const camera=[S.camera,S.lens,S.exposure].filter(Boolean).join("  ·  ");
  ctx.font="400 "+Math.round(clamp(w*.014,16,23))+"px '"+S.font+"',sans-serif";
  if(topLine){ctx.fillText(shorten(ctx,topLine,w*.88),center,y);y+=w*.028}
  if(camera){ctx.fillText(shorten(ctx,camera,w*.88),center,y)}
 }
}
function renderTo(ctx,w,h){
 ctx.clearRect(0,0,w,h);ctx.fillStyle=S.paper;ctx.fillRect(0,0,w,h);
 if(S.customBg){ctx.save();fitDraw(ctx,S.customBg.img,0,0,w,h,S.bgFit);ctx.restore()}
 const boxes=calculateBoxes(w,h);
 for(let i=0;i<boxes.length;i++){const b=boxes[i];
  ctx.save();ctx.shadowColor="rgba(24,35,43,.10)";ctx.shadowBlur=12;ctx.shadowOffsetY=5;ctx.fillStyle="#fff";ctx.fillRect(b.x,b.y,b.w,b.h);ctx.restore();
  drawPhoto(ctx,b,i);
 }
 drawLabels(ctx,w,h,boxes);
 return boxes
}
function render(){
 const canvas=$("previewCanvas"),size=ratios[S.ratio]||ratios.portrait;
 if(canvas.width!==size[0])canvas.width=size[0];
 if(canvas.height!==size[1])canvas.height=size[1];
 const ctx=canvas.getContext("2d");if(!ctx)return;
 lastBoxes=renderTo(ctx,size[0],size[1]);
 $("sizeInfo").textContent=size[0]+" × "+size[1]+" px";
}
function bindInput(id,key,event="input"){
 $(id).addEventListener(event,e=>{S[key]=e.target.value;queueDraw()})
}
function exportImage(ext){
 const canvas=$("previewCanvas");render();
 const mime=ext==="jpg"?"image/jpeg":"image/png";
 canvas.toBlob(blob=>{
  if(!blob){announce("저장에 실패했어. 다른 사진으로 다시 시도해 줘.");return}
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  const now=new Date(),stamp=now.getFullYear()+String(now.getMonth()+1).padStart(2,"0")+String(now.getDate()).padStart(2,"0")+"_"+String(now.getHours()).padStart(2,"0")+String(now.getMinutes()).padStart(2,"0");
  a.href=url;a.download="DAMAH_FRAME_"+stamp+"."+ext;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1200);announce(ext.toUpperCase()+" 파일을 저장했어.");
 },mime,ext==="jpg"?.94:undefined)
}
function init(){
 $$("[data-view]").forEach(btn=>btn.addEventListener("click",()=>showView(btn.dataset.view)));
 $$("[data-panel]").forEach(btn=>btn.addEventListener("click",()=>showPanel(btn.dataset.panel)));
 $("startBtn").addEventListener("click",()=>showView("editor"));
 $("sampleBtn").addEventListener("click",resetSample);
 $("sampleSmall").addEventListener("click",resetSample);
 $("uploadPhotosBtn").addEventListener("click",()=>$("photoInput").click());
 $("photoInput").addEventListener("change",e=>{addPhotos(e.target.files);e.target.value=""});
 const drop=$("photoDrop");
 drop.addEventListener("click",()=>$("photoInput").click());
 drop.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();$("photoInput").click()}});
 ["dragenter","dragover"].forEach(evt=>drop.addEventListener(evt,e=>{e.preventDefault();drop.classList.add("dragover")}));
 ["dragleave","drop"].forEach(evt=>drop.addEventListener(evt,e=>{e.preventDefault();drop.classList.remove("dragover")}));
 drop.addEventListener("drop",e=>addPhotos(e.dataTransfer.files));
 $$("[data-mode]").forEach(b=>b.addEventListener("click",()=>setOption("mode",b.dataset.mode)));
 $$("[data-frame]").forEach(b=>b.addEventListener("click",()=>setOption("frame",b.dataset.frame)));
 $$("[data-count]").forEach(b=>b.addEventListener("click",()=>setOption("count",b.dataset.count)));
 $("ratioSelect").addEventListener("change",e=>setOption("ratio",e.target.value));
 $("slotPicker").addEventListener("change",e=>{S.selectedSlot=Number(e.target.value);refreshControls();queueDraw()});
 $("slotPhotoPicker").addEventListener("change",e=>{S.slots[S.selectedSlot]=e.target.value||null;S.sample=false;refreshControls();queueDraw()});
 $("zoomRange").addEventListener("input",e=>{getTrans(S.selectedSlot).zoom=Number(e.target.value);$("zoomValue").textContent=Number(e.target.value).toFixed(2)+"×";queueDraw()});
 $("xRange").addEventListener("input",e=>{getTrans(S.selectedSlot).x=Number(e.target.value);$("xValue").textContent=Math.round(Number(e.target.value)*100)+"%";queueDraw()});
 $("yRange").addEventListener("input",e=>{getTrans(S.selectedSlot).y=Number(e.target.value);$("yValue").textContent=Math.round(Number(e.target.value)*100)+"%";queueDraw()});
 $("resetPosition").addEventListener("click",()=>{S.transforms[S.selectedSlot]={zoom:1,x:0,y:0};refreshControls();queueDraw()});
 $$("[data-paper]").forEach(b=>b.addEventListener("click",()=>setOption("paper",b.dataset.paper)));
 $("paperColor").addEventListener("input",e=>setOption("paper",e.target.value));
 $("uploadBackgroundBtn").addEventListener("click",()=>$("backgroundInput").click());
 $("backgroundInput").addEventListener("change",e=>{addBackground(e.target.files[0]);e.target.value=""});
 $("removeBackground").addEventListener("click",()=>{if(S.customBg?.url)URL.revokeObjectURL(S.customBg.url);S.customBg=null;refreshControls();queueDraw()});
 $("backgroundFit").addEventListener("change",e=>setOption("bgFit",e.target.value));
 $("showText").addEventListener("change",e=>{S.showText=e.target.checked;queueDraw()});
 $("showInfo").addEventListener("change",e=>{S.showInfo=e.target.checked;queueDraw()});
 bindInput("textTitle","title");bindInput("textSubtitle","subtitle");bindInput("fontSelect","font","change");bindInput("fontColor","textColor");
 bindInput("infoDate","date");bindInput("infoPlace","place");bindInput("infoCamera","camera");bindInput("infoLens","lens");bindInput("infoExposure","exposure");
 $("exportPng").addEventListener("click",()=>exportImage("png"));
 $("exportJpg").addEventListener("click",()=>exportImage("jpg"));
 $("resetAll").addEventListener("click",()=>{
  if(!confirm("작업 내용을 초기화할까? 불러온 사진과 배경도 모두 해제돼."))return;
  for(const p of S.photos)if(p.url)URL.revokeObjectURL(p.url);
  if(S.customBg?.url)URL.revokeObjectURL(S.customBg.url);
  S.photos=[];S.customBg=null;S.sample=false;S.slots=[null,null,null,null,null,null];S.transforms={};S.selectedSlot=0;
  ["infoDate","infoPlace","infoCamera","infoLens","infoExposure"].forEach(id=>$(id).value="");
  ["date","place","camera","lens","exposure"].forEach(key=>S[key]="");
  refreshControls();queueDraw();announce("사진과 배경을 초기화했어.")
 });
 const canvas=$("previewCanvas");
 const locate=e=>{const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height,rect:r}};
 canvas.addEventListener("pointerdown",e=>{
  const pt=locate(e);const i=lastBoxes.findIndex(b=>pt.x>=b.x&&pt.x<=b.x+b.w&&pt.y>=b.y&&pt.y<=b.y+b.h);
  if(i<0)return;S.selectedSlot=i;refreshControls();const t=getTrans(i);
  drag={id:e.pointerId,startX:e.clientX,startY:e.clientY,x:t.x,y:t.y,box:lastBoxes[i]};
  canvas.setPointerCapture(e.pointerId);canvas.classList.add("dragging")
 });
 canvas.addEventListener("pointermove",e=>{
  if(!drag||e.pointerId!==drag.id)return;
  const pt=locate(e),t=getTrans(S.selectedSlot);
  const dx=(e.clientX-drag.startX)*canvas.width/pt.rect.width;
  const dy=(e.clientY-drag.startY)*canvas.height/pt.rect.height;
  t.x=clamp(drag.x+dx/(drag.box.w*.4),-1,1);t.y=clamp(drag.y+dy/(drag.box.h*.4),-1,1);
  $("xRange").value=t.x;$("yRange").value=t.y;
  $("xValue").textContent=Math.round(t.x*100)+"%";$("yValue").textContent=Math.round(t.y*100)+"%";
  queueDraw()
 });
 const endDrag=e=>{if(drag&&e.pointerId===drag.id){drag=null;canvas.classList.remove("dragging")}};
 canvas.addEventListener("pointerup",endDrag);canvas.addEventListener("pointercancel",endDrag);
 document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key==="s"){e.preventDefault();exportImage("png")}});
 window.addEventListener("resize",queueDraw);
 if(document.fonts?.ready)document.fonts.ready.then(queueDraw);
 for(const color of colors){
  const b=document.createElement("button");b.type="button";b.className="color-pick";b.style.background=color;b.dataset.paper=color;b.title="배경색 "+color;b.setAttribute("aria-label",b.title);
  b.addEventListener("click",()=>setOption("paper",color));$("paperSwatches").append(b)
 }
 showView("home");showPanel("photos");queueDraw()
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();