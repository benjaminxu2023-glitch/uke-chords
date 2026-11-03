import test from 'node:test';import assert from 'node:assert/strict';
import {parseSheet} from '../src/format.js';import {renderSheetHTML,prepareSheet} from '../src/render.js';import {recognizeImage} from '../src/vision.js';import {loadSettings,saveSettings,STORAGE_KEY} from '../src/settings.js';
test('渲染实际音高、去低音、去重、近似提示与 HTML 转义',()=>{
 const s=parseSheet('{title: <img onerror=alert(1)>}\n{capo: 2}\n{key: G}\n[G]晚风[D/F#]轻轻[G]吹[Em]过[C9]窗');
 const model=prepareSheet(s);assert.deepEqual(model.unique.map(c=>c.root+c.quality),['A','E','F#m','D7']);
 const html=renderSheetHTML(s);assert.ok(!html.includes('<img'));assert.match(html,/&lt;img/);assert.match(html,/D7\*/);assert.match(html,/近似/);assert.equal((html.match(/<svg /g)||[]).length,4);
});
test('设置存储与损坏数据恢复',()=>{
 const store=new Map(),storage={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)};
 const settings={...loadSettings(storage),apiKey:'测试密钥'};saveSettings(settings,storage);assert.deepEqual(loadSettings(storage),settings);store.set(STORAGE_KEY,'invalid');assert.equal(loadSettings(storage).provider,'moonshot');
});
test('识图请求数组、地址、代码围栏和中文错误',async t=>{
 const settings={baseUrl:'https://example.invalid/v1/',model:'测试模型',apiKey:'测试密钥'},image='data:image/png;base64,AA==';
 let sent;
 t.mock.method(globalThis,'fetch',async(url,request)=>{sent={url,...request};return {ok:true,json:async()=>({choices:[{message:{content:'```chordpro\n[C]你好\n```'}}]})};});
 assert.equal(await recognizeImage(image,settings),'[C]你好');assert.equal(sent.url,'https://example.invalid/v1/chat/completions');const body=JSON.parse(sent.body);assert.equal(body.temperature,0);assert.ok(Array.isArray(body.messages[1].content));assert.equal(body.messages[1].content[0].image_url.url,image);assert.equal(sent.headers.Authorization,'Bearer 测试密钥');
 for(const [code,message]of [[401,/密钥/],[429,/额度/],[500,/500/]]){globalThis.fetch=async()=>({ok:false,status:code});await assert.rejects(recognizeImage(image,settings),message);}
 globalThis.fetch=async()=>{throw new Error('offline');};await assert.rejects(recognizeImage(image,settings),/CORS/);
 await assert.rejects(recognizeImage(image,{...settings,apiKey:''}),/密钥/);
});
test('图片预处理最长边 1600、JPEG 质量及解码失败回退',async t=>{
 const {imageDataURL}=await import('../src/vision.js');let format,quality,canvas;
 class MockImage {naturalWidth=3200;naturalHeight=2400;set src(value){queueMicrotask(()=>this.onload());}}
 const priorImage=Object.getOwnPropertyDescriptor(globalThis,'Image'),priorDocument=Object.getOwnPropertyDescriptor(globalThis,'document');
 t.after(()=>{for(const [key,descriptor]of [['Image',priorImage],['document',priorDocument]]){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});
 globalThis.Image=MockImage;
 globalThis.document={createElement(){canvas={getContext:()=>({fillRect(){},drawImage(){}}),toDataURL:(f,q)=>{format=f;quality=q;return 'data:image/jpeg;base64,处理后';}};return canvas;}};
 assert.equal(await imageDataURL('data:image/png;base64,原图'),'data:image/jpeg;base64,处理后');assert.equal(canvas.width,1600);assert.equal(canvas.height,1200);assert.equal(format,'image/jpeg');assert.equal(quality,.85);
 globalThis.Image=class{set src(v){queueMicrotask(()=>this.onerror());}};assert.equal(await imageDataURL('data:image/heic;base64,原图'),'data:image/heic;base64,原图');
});
