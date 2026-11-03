import {parseChord,chordToString} from './chords.js';
export const charWidth = c => /[\u1100-\u115f\u2329\u232a\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe10-\ufe6f\uff01-\uff60\uffe0-\uffe6\u{1f300}-\u{1faff}]/u.test(c)?2:1;
export const displayWidth = s => [...s].reduce((a,c)=>a+charWidth(c),0);
function chordRow(s) {
  const tokens=[...s.matchAll(/\S+/g)], chords=[];
  if (!tokens.length) return null;
  for(const t of tokens) {
    if(/^(?:[|:\-/]+|[x×]\d+)$/i.test(t[0])) continue;
    const c=parseChord(t[0]); if(!c)return null;
    chords.push({chord:c,col:displayWidth(s.slice(0,t.index))});
  }
  return chords.length?chords:null;
}
function paired(row,text) {
  const chars=[...text], positions=[0];
  chars.forEach(c=>positions.push(positions.at(-1)+charWidth(c)));
  const points=row.map(r=>({...r,index:positions.findIndex((p,i)=>i<chars.length && p+charWidth(chars[i])>r.col)})).map(r=>({...r,index:r.index<0?chars.length:r.index}));
  const segments=[];
  if(points[0].index)segments.push({chord:null,text:chars.slice(0,points[0].index).join('')});
  points.forEach((p,i)=>segments.push({chord:p.chord,text:chars.slice(p.index,points[i+1]?.index ?? chars.length).join('')}));
  return {type:'lyric',segments};
}
export function parseSheet(text) {
  const meta={title:'',capo:0,key:''}, lines=[];
  const roman=['','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
  const input=String(text).replace(/\r/g,'').replace(/\t/g,'    ').split('\n');
  function metadata(s) {
    const cap=s.match(/(?:capo\s*:?\s*|变调夹\s*夹?\s*|夹\s*)(\d{1,2}|XII|XI|IX|VIII|VII|VI|IV|V|III|II|I)(?=\s|品|$)/i);
    if(cap){meta.capo=Math.min(12,/^\d+$/.test(cap[1])?Number(cap[1]):roman.indexOf(cap[1].toUpperCase()));return true;}
    const key=s.match(/(?:key\s*:\s*|原调\s*|1\s*=\s*)([A-G][#b♯♭]?m?)/i);
    if(key){meta.key=key[1];return true;}return false;
  }
  for(let i=0;i<input.length;i++) {
    let s=input[i];
    let directive=false;
    s=s.replace(/\{([^}:]+)(?::\s*([^}]*))?\}/g,(_,name,value='')=>{
      directive=true;name=name.trim().toLowerCase();value=value.trim();
      if(['title','t'].includes(name))meta.title=value;
      if(name==='capo')meta.capo=Number(value)||0;
      if(name==='key')meta.key=value;
      if(['comment','c'].includes(name))lines.push({type:'section',label:value});
      if(name==='soc')lines.push({type:'section',label:'副歌'});
      return '';
    });
    if(directive&&!s.trim())continue;
    if(metadata(s))continue;
    if(!s.trim()){lines.push({type:'blank'});continue;}
    const row=chordRow(s);
    if(row) {
      const next=input[i+1];
      if(next?.trim()&&!chordRow(next)&&!/[\[{}]/.test(next)&&!/(?:capo|变调夹|夹\s*\d|key\s*:|原调|1\s*=)/i.test(next))lines.push(paired(row,input[++i]));
      else lines.push({type:'lyric',segments:row.map(r=>({chord:r.chord,text:''}))});
      continue;
    }
    const segments=[];let chord=null,last=0;
    for(const m of s.matchAll(/\[([^\]]+)\]/g)) {
      const c=parseChord(m[1]);if(!c)continue;
      if(m.index>last||chord)segments.push({chord,text:s.slice(last,m.index)});
      chord=c;last=m.index+m[0].length;
    }
    segments.push({chord,text:s.slice(last)});
    if(segments.every(seg=>!seg.text.trim())&&segments.some(seg=>seg.chord))segments.forEach(seg=>seg.text='');
    lines.push({type:'lyric',segments});
  }
  return {meta,lines};
}
const sourceName = c => c?.approx ? c.raw : chordToString(c);
const header = s => [s.meta.title?`{title: ${s.meta.title}}`:null,`{capo: ${s.meta.capo||0}}`,s.meta.key?`{key: ${s.meta.key}}`:null].filter(x=>x!==null);
export function toChordPro(sheet) {
  return [...header(sheet),...sheet.lines.map(l=>l.type==='blank'?'':l.type==='section'?`{comment: ${l.label}}`:l.segments.map(s=>(s.chord?`[${sourceName(s.chord)}]`:'')+s.text).join(''))].join('\n');
}
export function toTwoLine(sheet) {
  return [...header(sheet),...sheet.lines.flatMap((l,index)=>{
    if(l.type==='blank')return [''];if(l.type==='section')return [`{comment: ${l.label}}`];
    if(!l.segments.some(s=>s.chord))return [l.segments.map(s=>s.text).join('')];
    if(l.segments.every(s=>!s.text)){
      const row=l.segments.filter(s=>s.chord).map(s=>sourceName(s.chord)).join(' ');
      // 用可忽略的指令隔开纯和弦行与后续歌词，避免再次解析时误配为双行。
      const next=sheet.lines[index+1];
      return next?.type==='lyric'&&next.segments.some(s=>s.text)&&!next.segments.some(s=>s.chord)?[row,'{end_of_line}']:[row];
    }
    let top='',bottom='',col=0;
    l.segments.forEach(s=>{
      if(s.chord){const need=Math.max(0,displayWidth(top)+(top?1:0)-col);bottom+=' '.repeat(need);col+=need;top+=' '.repeat(Math.max(0,col-displayWidth(top)))+sourceName(s.chord);}
      bottom+=s.text;col+=displayWidth(s.text);
    });return [top,bottom];
  })].join('\n');
}
export function transformSheet(sheet,fn) {
  return {...sheet,meta:{...sheet.meta},lines:sheet.lines.map(l=>l.type==='lyric'?{...l,segments:l.segments.map(s=>({...s,chord:s.chord?fn(s.chord):null}))}:{...l})};
}
