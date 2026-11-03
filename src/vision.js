export const PROMPT=`你是严格的和弦谱抄录员。只输出 ChordPro 纯文本，不要解释，不要代码块。
首行若谱上有标题写 {title: ...}；若谱上有 Capo/变调夹标注输出 {capo: N}，N 为数字，没有就不输出。若有原调标注输出 {key: X}。
每一行歌词一行，和弦用 [和弦] 插在它所在的那个字或单词之前，严格按图中和弦在字上方的位置。
保留原和弦拼写，不要自己移调，不要换算 Capo。段落标签（主歌/副歌/前奏/Verse/Chorus）用 {comment: ...}。
只有和弦没有歌词的行（如前奏）输出成 [C] [G] [Am] [F]。看不清的字用 □。`;
export function fileDataURL(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('图片读取失败，请重新选择。'));r.readAsDataURL(file);});}
export async function imageDataURL(file){
  const original=typeof file==='string'?file:await fileDataURL(file);
  if(!/^data:image\//i.test(original))throw new Error('请选择有效的图片文件。');
  try {
    const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=original;});
    const ratio=Math.min(1,1600/Math.max(img.naturalWidth,img.naturalHeight));
    const canvas=document.createElement('canvas');canvas.width=Math.round(img.naturalWidth*ratio);canvas.height=Math.round(img.naturalHeight*ratio);
    const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/jpeg',.85);
  } catch {return original;}
}
export async function recognizeImage(file,settings){
  if(!settings.apiKey?.trim())throw new Error('请先在接口设置中填写密钥。');
  if(!settings.model?.trim())throw new Error('请填写模型名称。');
  let url;try{url=new URL(settings.baseUrl);}catch{throw new Error('接口地址无效。');}
  if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw new Error('接口地址必须使用 HTTP 或 HTTPS。');
  const dataURL=await imageDataURL(file);let response;
  try {response=await fetch(settings.baseUrl.replace(/\/+$/,'')+'/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${settings.apiKey.trim()}`},body:JSON.stringify({model:settings.model,messages:[{role:'system',content:PROMPT},{role:'user',content:[{type:'image_url',image_url:{url:dataURL}},{type:'text',text:'请严格按图片位置抄录这张吉他和弦谱。'}]}],temperature:0})});}
  catch{throw new Error('网络请求失败，可能是网络或跨域（CORS）限制。请检查接口地址，或换服务商／使用自己的代理。');}
  if(!response.ok)throw new Error(response.status===401?'密钥无效或已失效（401），请检查密钥与服务商是否对应。':response.status===429?'请求过多或额度不足（429），请稍后重试并检查账户额度。':`识别接口返回错误（${response.status}），请检查模型名和服务商设置。`);
  let result;try{result=await response.json();}catch{throw new Error('接口返回的内容不是有效 JSON。');}
  const content=result?.choices?.[0]?.message?.content;
  if(typeof content!=='string'||!content.trim())throw new Error('接口没有返回可用的谱面文字。');
  return content.trim().replace(/^```[^\n]*\n?/, '').replace(/\n?```\s*$/, '').trim();
}
