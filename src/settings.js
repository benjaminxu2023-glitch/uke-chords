export const STORAGE_KEY='uke-chords-settings-v1';
export const PRESETS={moonshot:{label:'月之暗面 / Kimi',baseUrl:'https://api.moonshot.cn/v1',model:'kimi-k3.1-pro'},openai:{label:'OpenAI',baseUrl:'https://api.openai.com/v1',model:'gpt-4.1-mini'},dashscope:{label:'通义千问',baseUrl:'https://dashscope.aliyuncs.com/compatible-mode/v1',model:'qwen-vl-max'}};
export const defaults=()=>({provider:'moonshot',baseUrl:PRESETS.moonshot.baseUrl,model:PRESETS.moonshot.model,apiKey:''});
export function loadSettings(storage){try{storage ??= globalThis.localStorage;return {...defaults(),...JSON.parse(storage.getItem(STORAGE_KEY)||'{}')};}catch{return defaults();}}
export function saveSettings(settings,storage){storage ??= globalThis.localStorage;storage.setItem(STORAGE_KEY,JSON.stringify(settings));}
