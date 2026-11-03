import test from 'node:test';
import assert from 'node:assert/strict';
import {parseChord as p,chordToString as str,transposeChord as tr,noteIndex,toUkeChord,voicingFor,QUALITIES,DIFFICULTY,chordDifficulty,suggestTransposes,detectKey} from '../src/chords.js';
test('别名、全角升降号、斜线和弦与非法输入',()=>{
  for(const [suffix,q]of Object.entries({min:'m',mi:'m','-':'m',M7:'maj7',Maj7:'maj7','Δ':'maj7','Δ7':'maj7',ma7:'maj7',min7:'m7',mi7:'m7','-7':'m7',sus:'sus4','°':'dim',o:'dim','+':'aug','#5':'aug',add2:'add9','2':'add9'}))assert.equal(p('C'+suffix).quality,q,suffix);
  for(const q of QUALITIES)assert.equal(p('Bb'+q).quality,q);
  assert.equal(p('Ｆ♯m').root,'F#');assert.equal(p('B♭').root,'Bb');assert.equal(p('C/G').bass,'G');
  for(const bad of ['',null,'H','hello','Cfoo','C/G7','C//G','CC','C m','|'])assert.equal(p(bad),null,String(bad));
});
test('扩展和弦近似且保留原谱',()=>{
  for(const [name,q]of Object.entries({C9:'7',Cm7b5:'m7',C6:'',Cm6:'m',C13:'7',C11:'7',Cdim7:'dim'})){assert.equal(p(name).quality,q);assert.equal(p(name).approx,true);assert.equal(p(name).raw,name);}
});
test('移调、变调夹与升降号偏好',()=>{
  for(const [c,n,result,prefer]of [['C',2,'D'],['Bb',2,'C'],['E',-1,'Eb','flat'],['E',-1,'D#','sharp'],['F#m',1,'Gm'],['C/E',2,'D/F#'],['G',2,'A'],['Em',3,'Gm']])assert.equal(str(tr(p(c),n,{prefer})),result);
  assert.equal(str(tr(p('A'),1,{prefer:'auto',key:'F'})),'Bb');
  for(const [n,expected]of [[1,'Db'],[3,'Eb'],[6,'F#'],[8,'Ab'],[10,'Bb']])assert.equal(str(tr(p('C'),n)),expected);
  for(const root of ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B']){let c=p(root+'m7');for(let i=0;i<12;i++)c=tr(c,1);assert.equal(noteIndex(c.root),noteIndex(root));assert.equal(c.quality,'m7');}
  assert.equal(str(toUkeChord(p('C/G'))),'C');
});
test('所有根音和类型有按法；等音同按法',()=>{
  for(const root of ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'])for(const q of QUALITIES)assert.equal(voicingFor(p(root+q)).length,4);
  assert.deepEqual(voicingFor('C#'),voicingFor('Db'));
});
test('难度公式与公认难度排序',()=>{
  assert.equal(chordDifficulty([0,0,0,0]),0);assert.equal(chordDifficulty([0,0,0,3]),2);
  for(const hard of ['E','B','Gbm'])for(const easy of ['C','G','Am','F'])assert.ok(DIFFICULTY[hard]>DIFFICULTY[easy]+2);
});
test('调性估计及十二个加权推荐',()=>{
  assert.deepEqual(detectKey(['C','G','Am','F','C']),{tonic:'C',minor:false});
  assert.deepEqual(detectKey(['Am','Dm','Em','Am']),{tonic:'A',minor:true});
  const hard=suggestTransposes(['E','B','F#m','A']);assert.equal(hard.length,12);assert.notEqual(hard[0].semitones,0);assert.match(hard[0].reason,/E/);
  assert.equal(suggestTransposes(['C','G','Am','F'])[0].semitones,0);
  const capo=suggestTransposes(['G','C','D','Em'],{capo:2});assert.equal(capo.find(r=>r.semitones===0).keyName,'A');assert.match(capo.find(r=>r.semitones===0).reason,/原调/);
  assert.notEqual(suggestTransposes(['C','F','G'])[0].score,suggestTransposes(['C','C','C','F','G'])[0].score);
});
