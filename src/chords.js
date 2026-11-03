import { VOICINGS } from './chord-db.js';
export const QUALITIES = ['', 'm', '7', 'maj7', 'm7', 'sus2', 'sus4', 'dim', 'aug', 'add9'];
const flats = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const sharps = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const common = ['C','Db','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
const mod = n => ((n % 12) + 12) % 12;
const normalize = s => s.normalize('NFKC').replace(/♯/g,'#').replace(/♭/g,'b');
export function noteIndex(note) {
  const m = normalize(String(note)).match(/^([A-G])([#b]?)$/);
  return m ? mod(({C:0,D:2,E:4,F:5,G:7,A:9,B:11})[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0)) : null;
}
export function parseChord(str) {
  if (typeof str !== 'string') return null;
  const raw = str.trim();
  const m = normalize(raw).replace(/#5(?=\/|$)/, '+').match(/^([A-G][#b]?)([^/\s]*)(?:\/([A-G][#b]?))?$/);
  if (!m) return null;
  const aliases = {min:'m',mi:'m','-':'m',M7:'maj7',Maj7:'maj7','Δ':'maj7','Δ7':'maj7',ma7:'maj7',min7:'m7',mi7:'m7','-7':'m7',sus:'sus4','°':'dim',o:'dim','+':'aug','#5':'aug',add2:'add9','2':'add9'};
  let quality = aliases[m[2]] ?? m[2], approx = false;
  if (!QUALITIES.includes(quality)) {
    const fallback = {'9':'7','11':'7','13':'7',m7b5:'m7','6':'',m6:'m',dim7:'dim',m9:'m7',maj9:'maj7','7sus4':'sus4'};
    if (!Object.hasOwn(fallback, quality)) return null;
    quality = fallback[quality]; approx = true;
  }
  return {root:m[1],quality,bass:m[3] || null,raw,...(approx ? {approx:true} : {})};
}
export const chordToString = c => c ? c.root + c.quality + (c.bass ? '/' + c.bass : '') : '';
export function transposeChord(chord, semitones, {prefer='auto',key}={}) {
  const c = typeof chord === 'string' ? parseChord(chord) : chord;
  if (!c) return null;
  const keyName = typeof key === 'object' ? key.tonic + (key.minor ? 'm' : '') : key;
  const useFlat = ['F','Bb','Eb','Ab','Db','Gb','Dm','Gm','Cm','Fm','Bbm','Ebm'].includes(keyName);
  const names = prefer === 'flat' ? flats : prefer === 'sharp' ? sharps : key ? (useFlat ? flats : sharps) : common;
  const move = n => names[mod(noteIndex(n) + Number(semitones))];
  return {...c,root:move(c.root),bass:c.bass ? move(c.bass) : null};
}
export const toUkeChord = c => ({...c,bass:null});
export function voicingFor(chord) {
  const c = typeof chord === 'string' ? parseChord(chord) : chord;
  return c ? VOICINGS[flats[noteIndex(c.root)] + c.quality] : undefined;
}
export function detectKey(chords) {
  const cs = chords.map(c => typeof c === 'string' ? parseChord(c) : c).filter(Boolean);
  let best = {tonic:'C',minor:false}, highest = -Infinity;
  for (let tonic=0; tonic<12; tonic++) for (const minor of [false,true]) {
    const steps = minor ? [0,2,3,5,7,8,10] : [0,2,4,5,7,9,11];
    const qs = minor ? ['m','dim','','m','m','',''] : ['','m','m','','','m','dim'];
    let score=0;
    cs.forEach((c,i) => {
      const degree=steps.indexOf(mod(noteIndex(c.root)-tonic));
      const triad=c.quality==='m7'?'m': ['7','maj7','add9','sus2','sus4'].includes(c.quality)?'':c.quality;
      score += degree<0 ? -3 : qs[degree]===triad ? 3 : -1;
      if (degree===0 && triad===(minor?'m':'')) score += 1 + (i===0?4:0) + (i===cs.length-1?3:0);
    });
    if(score>highest) {highest=score;best={tonic:common[tonic],minor};}
  }
  return best;
}
// 0.45×最高品 + 0.7×按弦跨度 + 0.65×按弦数 + 0.8×同品多弦，封顶 10。
export function chordDifficulty(v) {
  if (!v) return 10;
  const pressed=v.filter(n=>n>0);
  if (!pressed.length) return 0;
  return Math.min(10,.45*Math.max(...pressed)+.7*(Math.max(...pressed)-Math.min(...pressed))+.65*pressed.length+(new Set(pressed).size<pressed.length?.8:0));
}
const penalties = {E:3,Eb:2,B:3,Gbm:3,Bb:2,Db:2,Gb:2,Ab:2,Dbm:2};
export const DIFFICULTY = Object.fromEntries(Object.entries(VOICINGS).map(([name,v])=>[name,Math.min(10,chordDifficulty(v)+(penalties[name]||0))]));
export function suggestTransposes(chords,{capo=0}={}) {
  const cs=chords.map(c=>typeof c==='string'?parseChord(c):c).filter(Boolean);
  const originalKey=detectKey(cs);
  return Array.from({length:12},(_,i)=>i-6).map(semitones=>{
    const k=transposeChord({root:originalKey.tonic,quality:originalKey.minor?'m':''},Number(capo)+semitones);
    const keyName=k.root+k.quality;
    const moved=cs.map(c=>toUkeChord(transposeChord(c,Number(capo)+semitones,{key:keyName})));
    const names=[...new Set(moved.map(chordToString))];
    const scores=moved.map(c=>DIFFICULTY[flats[noteIndex(c.root)]+c.quality] ?? 10);
    const score=scores.length ? scores.reduce((a,b)=>a+b,0)/scores.length + .35*Math.max(...scores) : 0;
    const hardChords=names.filter(n=>{const c=parseChord(n);return DIFFICULTY[flats[noteIndex(c.root)]+c.quality]>=6;});
    const label=semitones===0?'原调':`${semitones>0?'升':'降'} ${Math.abs(semitones)} 半音`;
    const reason=`${label}（到 ${keyName} 调）：全曲用到 ${names.join(' ')}，${hardChords.length?'较难和弦：'+hardChords.join(' '):'没有 E/B/F#m 这类难按和弦'}。`;
    return {semitones,score,hardChords,keyName,reason};
  }).sort((a,b)=>a.score-b.score || Math.abs(a.semitones)-Math.abs(b.semitones));
}
