import {parseSheet,toChordPro,toTwoLine} from './format.js';
import {renderSheetHTML,collectChords} from './render.js';
import {suggestTransposes} from './chords.js';
import {loadSettings,saveSettings,PRESETS} from './settings.js';
import {recognizeImage,fileDataURL} from './vision.js';
import {exportPNG} from './export.js';
const $=id=>document.getElementById(id);
const status=(text,error=false)=>{$('status').textContent=text;$('status').classList.toggle('error',error);};
export const SAMPLE=`{title: 小星星（练习示例）}
Capo 2
Key: G
{comment: 主歌}
G       C       G
一闪一闪亮晶晶
C       G       D       G
满天都是小星星
Em      Cadd9   D/F#    G
晚风轻轻 吹过窗台
Em7     C       D       G
琴声慢慢 唱出未来
{comment: 尾奏}
G  C  D  G`;
for(const [key,p]of Object.entries(PRESETS))$('set-provider').add(new Option(p.label,key));
for(let i=0;i<=11;i++)$('capo').add(new Option(`${i} 品`,i));
for(let i=-6;i<=6;i++)$('transpose').add(new Option(i===0?'原调':`${i>0?'升':'降'} ${Math.abs(i)} 半音`,i));
$('transpose').value='0';
let settings=loadSettings(),file=null,current=null,exportUrl=null;
function fillSettings(){for(const [id,key]of [['set-provider','provider'],['set-baseurl','baseUrl'],['set-model','model'],['set-key','apiKey']])$(id).value=settings[key];}
fillSettings();
const readSettings=()=>({provider:$('set-provider').value,baseUrl:$('set-baseurl').value.trim(),model:$('set-model').value.trim(),apiKey:$('set-key').value.trim()});
$('set-provider').onchange=()=>{const preset=PRESETS[$('set-provider').value];$('set-baseurl').value=preset.baseUrl;$('set-model').value=preset.model;$('set-key').value='';status('已切换服务商，请填写对应密钥并保存设置。');};
$('btn-save-settings').onclick=()=>{try{settings=readSettings();saveSettings(settings);status('设置已保存在本浏览器。');}catch{status('浏览器不允许保存设置；本次仍可使用当前输入。',true);}};
$('btn-clear-key').onclick=()=>{$('set-key').value='';settings={...readSettings(),apiKey:''};try{saveSettings(settings);status('已清除保存的密钥。');}catch{status('当前输入已清除，但浏览器阻止了存储操作，请在浏览器设置中清除站点数据。',true);}};
let selection=0;
async function choose(event){const selected=event.target.files?.[0];if(!selected)return;const token=++selection;file=selected;$('btn-recognize').disabled=true;try{const url=await fileDataURL(file);if(token!==selection)return;$('image-preview').src=url;$('image-preview').hidden=false;$('btn-recognize').disabled=false;status('图片已就绪，可以开始识别。');}catch(e){status(e.message,true);}}
$('file-camera').onchange=choose;$('file-album').onchange=choose;
function syncMeta(){const sheet=parseSheet($('sheet-input').value);$('capo').value=String(Math.max(0,sheet.meta.capo)%12);return sheet;}
function invalidate(){current=null;$('btn-export').disabled=true;$('export-preview').replaceChildren();$('export-download').hidden=true;if(exportUrl){URL.revokeObjectURL(exportUrl);exportUrl=null;}$('suggestions').replaceChildren();}
$('sheet-input').oninput=()=>{syncMeta();invalidate();};
$('btn-recognize').onclick=async()=>{if(!file)return;$('btn-recognize').disabled=true;status('正在识别图片，请稍候…');try{$('sheet-input').value=await recognizeImage(file,readSettings());syncMeta();invalidate();status('识别完成，请校对和弦、歌词与变调夹品位。');}catch(e){status(e.message,true);}finally{$('btn-recognize').disabled=false;}};
function convert(){invalidate();const sheet=parseSheet($('sheet-input').value);if(!collectChords(sheet).length){status('没有找到和弦，请输入谱面或使用示例谱。',true);return;}const options={capo:Number($('capo').value),transpose:Number($('transpose').value),prefer:$('prefer').value};current={sheet,options};$('output').innerHTML=renderSheetHTML(sheet,options);$('btn-export').disabled=false;status('转换完成，下方是尤克里里实际弹奏的和弦。');}
$('btn-sample').onclick=()=>{$('sheet-input').value=SAMPLE;$('transpose').value='0';syncMeta();convert();};
for(const [id,fn]of [['btn-to-chordpro',toChordPro],['btn-to-twoline',toTwoLine]])$(id).onclick=()=>{$('sheet-input').value=fn(parseSheet($('sheet-input').value));invalidate();status('已转换文本格式。');};
$('btn-convert').onclick=convert;
for(const id of ['capo','transpose','prefer'])$(id).onchange=()=>{invalidate();status('设置已更改，点击「转换」更新谱面。');};
$('btn-suggest').onclick=()=>{const chords=collectChords(parseSheet($('sheet-input').value));$('suggestions').replaceChildren();if(!chords.length){status('请先输入包含和弦的谱面。',true);return;}for(const rec of suggestTransposes(chords,{capo:Number($('capo').value)}).slice(0,3)){const button=document.createElement('button');button.textContent=rec.reason+` 难度 ${rec.score.toFixed(1)}`;button.onclick=()=>{$('transpose').value=String(rec.semitones);convert();};$('suggestions').append(button);}status('已推荐三个方案；点击即可应用。移调也会改变适合演唱的音域。');};
$('btn-export').onclick=async()=>{if(!current)return;const snapshot=current;$('btn-export').disabled=true;status('正在生成图片…');try{const blob=await exportPNG(snapshot);if(current!==snapshot)return;if(exportUrl)URL.revokeObjectURL(exportUrl);exportUrl=URL.createObjectURL(blob);const img=new Image();img.alt='导出的尤克里里弹唱谱，手机可长按保存';img.src=exportUrl;$('export-preview').replaceChildren(img);$('export-download').href=exportUrl;$('export-download').download=(snapshot.sheet.meta.title||'尤克里里弹唱谱').replace(/[\\/:*?"<>|]/g,'_')+'.png';$('export-download').hidden=false;status('图片已生成，手机可长按下方图片保存，或点击下载。');}catch(e){status(e.message||'导出失败，请缩短谱面后重试。',true);}finally{$('btn-export').disabled=!current;}};
