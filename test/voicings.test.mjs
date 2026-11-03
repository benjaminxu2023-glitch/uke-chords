import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {VOICINGS} from '../src/chord-db.js';import {parseChord,noteIndex} from '../src/chords.js';
const read=name=>JSON.parse(readFileSync(new URL('./fixtures/'+name,import.meta.url),'utf8'));
const report=read('voicing-report.json'),uc=read('ukulele-chords.com.json'),ut=read('ukuleletricks.com.json');
const intervals={'':[0,4,7],m:[0,3,7],'7':[0,4,7,10],maj7:[0,4,7,11],m7:[0,3,7,10],sus2:[0,2,7],sus4:[0,5,7],dim:[0,3,6],aug:[0,4,8],add9:[0,4,7,2]};
const qualityMap={'':'major',m:'minor','7':'7',maj7:'maj7',m7:'min7',sus4:'sus',dim:'dim',aug:'aug',add9:'add9'};
for(const [name,v]of Object.entries(VOICINGS))test(`按法 ${name}：乐理和来源`,()=>{
 const c=parseChord(name),root=noteIndex(c.root),tones=new Set(v.flatMap((n,i)=>n===null?[]:[([7,0,4,9][i]+n-root+24)%12]));
 const allowed=intervals[c.quality];for(const n of tones)assert.ok(allowed.includes(n),`${name} 多余音 ${n}`);
 assert.ok(tones.has(0));assert.ok(tones.has(allowed[1]));if(['dim','aug'].includes(c.quality))for(const n of allowed)assert.ok(tones.has(n));
 if(allowed.length===4)assert.ok(tones.has(allowed[3]),'必须有色彩音');
 const chosen=report.find(r=>r.chord===name)?.chosen;assert.ok(chosen);assert.equal(chosen,v.map(n=>n===null?'x':n).join(''));
 const letter=c.root==='Gb'?'F#':c.root,variants=ut[letter+'|'+qualityMap[c.quality]]||[];
 assert.ok(chosen===uc[name]||variants.some(s=>s.split(',').map(n=>n==='x'?null:Number(n)).every((n,i)=>n===v[i])),name+' 不在来源中');
});
test('公认标准答案表',()=>{
 const standards={C:'0003',Cm:'0333',C7:'0001',Cmaj7:'0002',Cm7:'3333',G:'0232',Gm:'0231',G7:'0212',Gmaj7:'0222',Am:'2000',A:'2100',A7:'0100',Am7:'0000',F:'2010',Fm:'1013',F7:'2313',Fmaj7:'2413',D:'2220',Dm:'2210',D7:'2223',Dm7:'2213',E:'1402',Em:'0432',E7:'1202',Em7:'0202',Bb:'3211',Bbm:'3111',B:'4322',Bm:'4222',B7:'2322',Csus4:'0013',Gsus4:'0233',Dsus2:'2200',Caug:'1003',Cadd9:'0203',Eb:'3331',Gb:'3121',Ab:'5343',Db:'1114'};
 for(const [name,v]of Object.entries(standards))assert.equal(VOICINGS[name].join(''),v,name);
});
