import {prepareSheet,collectChords} from './render.js';
import {chordToString,voicingFor} from './chords.js';
import {chordDiagramSVG} from './diagram.js';
// 所有文字与图形直接画入 2D canvas；不使用 foreignObject。
export async function exportPNG(sheetModel) {
  const {sheet:source,options={}}=sheetModel.lines?{sheet:sheetModel}:sheetModel;
  const model=prepareSheet(source,options),width=1080,pad=48,right=width-pad;
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
  const operations=[];let y=62;
  const addText=(text,x,yy,size=28,color='#172a2a')=>operations.push(c=>{c.font=`${size}px sans-serif`;c.fillStyle=color;c.fillText(text,x,yy);});
  function wrappedText(text,size=28){ctx.font=`${size}px sans-serif`;let line='';for(const char of String(text)){if(ctx.measureText(line+char).width>width-pad*2&&line){addText(line,pad,y,size);y+=size*1.5;line='';}line+=char;}addText(line,pad,y,size);y+=size*1.5;}
  wrappedText(source.meta.title||'尤克里里弹唱谱',40);wrappedText(model.info,23);y+=15;
  let x=pad;
  for(const chord of model.unique){
    if(x+120>right){x=pad;y+=195;}
    const name=chordToString(chord),v=voicingFor(chord),drawX=x,drawY=y;
    if(v){const svg=chordDiagramSVG(name,v,{size:120});const img=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('按法图生成失败，请重试。'));image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);});operations.push(c=>c.drawImage(img,drawX,drawY,120,180));}
    else addText(name+'：无按法',x,y+50,20);
    x+=140;
  }
  if(model.unique.length)y+=210;
  for(const line of model.sheet.lines){
    if(line.type==='blank'){y+=28;continue;}
    if(line.type==='section'){wrappedText(line.label,30);y+=16;continue;}
    x=pad;let rowHeight=82;
    for(const seg of line.segments){
      const label=seg.chord?chordToString(seg.chord)+(seg.chord.approx?'*':''):'';
      ctx.font='28px sans-serif';const textWidth=ctx.measureText(seg.text).width;
      ctx.font='25px sans-serif';const chordWidth=ctx.measureText(label).width;
      const natural=Math.max(textWidth,chordWidth+16);
      // 超长单个 segment 等比缩小，保持和弦与整段歌词不拆分。
      const scale=Math.min(1,(right-pad)/natural),w=natural*scale;
      if(x+w>right&&x>pad){x=pad;y+=rowHeight;}
      const sx=x,sy=y,txt=seg.text;
      operations.push(c=>{c.save();c.translate(sx,sy);c.scale(scale,scale);c.fillStyle='#14786c';c.font='bold 25px sans-serif';c.fillText(label,0,0);c.fillStyle='#172a2a';c.font='28px sans-serif';c.fillText(txt,0,38);c.restore();});x+=w;
    }y+=rowHeight;
  }
  if(collectChords(model.sheet).some(c=>c.approx))wrappedText('* 已近似为支持的和弦，原谱的色彩音可能省略。',22);
  canvas.width=width*2;canvas.height=Math.ceil(y+pad)*2;ctx.scale(2,2);ctx.fillStyle='white';ctx.fillRect(0,0,width,y+pad);operations.forEach(fn=>fn(ctx));
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('图片导出失败，谱面可能过长。')),'image/png'));
}
