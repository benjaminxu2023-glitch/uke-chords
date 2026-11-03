import test from 'node:test';import assert from 'node:assert/strict';
import {parseSheet as p,toChordPro,toTwoLine,transformSheet,displayWidth} from '../src/format.js';
import {chordToString as str,transposeChord} from '../src/chords.js';
const lyrics=s=>s.lines.filter(l=>l.type==='lyric');
// 格式间新增的排版空格不属于歌词语义；比较每个和弦所关联的原文。
const semantic=s=>({meta:s.meta,lines:s.lines.map(l=>l.type==='lyric'?{type:l.type,segments:l.segments.filter(s=>s.chord||s.text.trim()).map(s=>({chord:s.chord?str(s.chord):null,text:s.text.replace(/\s/g,''),approx:!!s.chord?.approx}))}:l)});
test('ChordPro 元数据、分段与忽略指令',()=>{
 const s=p('{t: 测试}\n{capo: 5}\n{key: G}\n{comment: 主歌}\n[C]一闪一[G]闪亮晶晶\n{c: }\n{soc}\n[Am]晚风\n{eoc}\n{unknown: 任意}');
 assert.deepEqual(s.meta,{title:'测试',capo:5,key:'G'});assert.equal(s.lines[0].label,'主歌');assert.equal(lyrics(s)[0].segments[1].text,'闪亮晶晶');assert.ok(s.lines.some(l=>l.label==='副歌'));assert.equal(lyrics(s).length,2);
});
test('中文与英文双行列宽',()=>{
 const cn=lyrics(p('C       G\n一闪一闪亮晶晶'))[0].segments;assert.equal(cn[0].text,'一闪一闪');assert.equal(cn[1].text,'亮晶晶');
 const en=lyrics(p('C     G\nHello world'))[0].segments;assert.equal(en[0].text,'Hello ');assert.equal(en[1].text,'world');
 assert.equal(displayWidth('你，好！A'),9);
 const inside=lyrics(p('C  G\n你好啊'))[0].segments;assert.equal(inside[1].text,'好啊');
});
test('各种变调夹与调号',()=>{
 for(const [line,n]of [['Capo 2',2],['capo:3',3],['CAPO 3',3],['变调夹 2 品',2],['变调夹夹2品',2],['夹4品',4],['Capo IV',4],['Capo XII',12],['{capo: 5}',5]]){const s=p(line);assert.equal(s.meta.capo,n,line);assert.equal(s.lines.length,0);}
 for(const line of ['Key: G','原调 G','1=G']){assert.equal(p(line).meta.key,'G');assert.equal(p(line).lines.length,0);}
});
test('纯和弦行、小节符号、相邻和弦行与空行',()=>{
 const s=p('C | G - / x2\nAm F\n\nD');assert.equal(s.lines.length,4);assert.ok(lyrics(s).every(l=>l.segments.every(s=>s.text==='')));assert.equal(lyrics(s)[0].segments.length,2);
 assert.ok(lyrics(p('[C] [G] [Am] [F]'))[0].segments.every(s=>s.text===''));
});
test('中英文与拥挤和弦的两种格式语义往返',()=>{
 for(const text of ['{title: 测试}\n{capo: 2}\n{key: G}\n{c: 主歌}\n[C]一闪一闪[G]亮晶晶\n\n[Am]Hello [F]world\n[C][G]', '[Cmaj7]一[G]闪[Am]亮', '[C9]晚风[C/G]轻轻', '没有和弦的歌词']){
 const s=p(text);assert.deepEqual(semantic(p(toChordPro(s))),semantic(s));assert.deepEqual(semantic(p(toTwoLine(s))),semantic(s));
 }
});
test('转换纯函数不修改源对象',()=>{const s=p('[C/E]你好');const changed=transformSheet(s,c=>transposeChord(c,2));assert.equal(str(lyrics(changed)[0].segments[0].chord),'D/F#');assert.equal(str(lyrics(s)[0].segments[0].chord),'C/E');});
test('纯和弦行后紧跟无和弦歌词仍保持两行',()=>{const s=p('[C][G]\n晚风吹过');assert.deepEqual(semantic(p(toTwoLine(s))),semantic(s));});
