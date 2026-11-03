import {chordToString,transposeChord,toUkeChord,voicingFor,detectKey} from './chords.js';
import {transformSheet} from './format.js';
import {escapeHTML as esc,chordDiagramSVG} from './diagram.js';
export const collectChords = sheet => sheet.lines.flatMap(l=>l.segments?.map(s=>s.chord).filter(Boolean)||[]);
export function prepareSheet(sheet,{capo=sheet.meta.capo||0,transpose=0,prefer='auto'}={}) {
  const detected=detectKey(collectChords(sheet));
  const key=sheet.meta.key || detected.tonic+(detected.minor?'m':'');
  const m=key.match(/^([A-G][#b♯♭]?)(m?)$/);
  const target=m?transposeChord({root:m[1],quality:m[2]},Number(capo)+Number(transpose)):null;
  const transformed=transformSheet(sheet,c=>toUkeChord(transposeChord(c,Number(capo)+Number(transpose),{prefer,key:target?chordToString(target):undefined})));
  const unique=[...new Map(collectChords(transformed).map(c=>[chordToString(c),c])).values()];
  return {sheet:transformed,unique,info:`吉他变调夹 ${capo} 品 · ${Number(transpose)===0?'原调':`${transpose>0?'升':'降'} ${Math.abs(transpose)} 半音`} · 尤克里里不夹变调夹`};
}
export function renderSheetHTML(sheet,options={}) {
  const model=prepareSheet(sheet,options);
  return `<h2>${esc(sheet.meta.title||'尤克里里弹唱谱')}</h2><p class="muted">${esc(model.info)}</p><div class="diagrams">${model.unique.map(c=>{const n=chordToString(c),v=voicingFor(c);return v?chordDiagramSVG(n,v,{size:100}):`<span>${esc(n)}：无按法</span>`;}).join('')}</div>`+model.sheet.lines.map(l=>l.type==='blank'?'<div class="blank"></div>':l.type==='section'?`<p class="section"><strong>${esc(l.label)}</strong></p>`:`<div class="sheet-line">${l.segments.map(s=>`<span class="segment"><span class="chord">${s.chord?esc(chordToString(s.chord))+(s.chord.approx?'*':''):'&nbsp;'}</span><span class="lyric">${esc(s.text)||'&nbsp;'}</span></span>`).join('')}</div>`).join('')+(collectChords(model.sheet).some(c=>c.approx)?'<p class="muted">* 已近似为支持的和弦，原谱的色彩音可能省略。</p>':'');
}
