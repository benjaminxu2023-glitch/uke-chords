# 吉他照片 → 尤克里里弹唱谱

手机优先的纯前端单页工具，无构建、无后端、无第三方运行时依赖。标准 GCEA 调弦。可以拍照识谱、编辑 ChordPro 或双行谱、还原吉他变调夹音高、移调、推荐更容易按的调，并导出带按法图的 PNG。全界面中文，随系统切换明暗主题。

## 本地使用

需要 Python 3；测试需要支持 ES modules 和 node:test 的 Node.js（建议 22 或更新）。

```sh
npm run serve
# 或 python3 -m http.server 8080
```

打开 http://localhost:8080 。不要直接双击 HTML：浏览器对 file URL 的 ES modules 有限制。手机访问同一局域网电脑的地址与 8080 端口，或部署至 HTTPS 静态站点。无需 npm install。

1. 先点「示例谱」可离线体验。示例使用传统《小星星》童谣片段及两句自编歌词。
2. 展开「识图接口设置」，选服务商，填写模型和密钥并保存。
3. 点「拍照/上传」或「从相册选」，确认缩略图后点「识别」。识别只在点击按钮时请求接口。
4. 在文本框校对标题、歌词、和弦与位置，必要时切换 ChordPro / 双行格式。
5. 核对吉他变调夹品位，选额外移调及升降号偏好，再点「转换」。也可点击推荐的前三个方案。
6. 点「导出 PNG」，手机长按预览图片保存，或点击下载。PNG 使用 1080 逻辑宽度、固定 2 倍像素密度，直接通过 Canvas 2D 绘制，不用 foreignObject。

## 接口设置

| 服务商 | 接口地址 | 默认模型 |
| --- | --- | --- |
| Moonshot / Kimi 国内站 | https://api.moonshot.cn/v1 | kimi-k3.1-pro |
| OpenAI | https://api.openai.com/v1 | gpt-4.1-mini |
| 通义 DashScope 兼容模式 | https://dashscope.aliyuncs.com/compatible-mode/v1 | qwen-vl-max |

接口地址与模型名都可手改，地址不要附加 `/chat/completions`。请求使用 OpenAI 兼容 Chat Completions 格式，用户消息的 content 为图片与文字组成的数组，temperature 为 0。图片本地缩至最长边 1600px、JPEG 质量 0.85；浏览器无法解码的 HEIC 保留原始 data URL，是否接受由服务商决定。

2026-11-03 查阅 [Kimi 官方模型列表](https://platform.kimi.ai/docs/models)：`moonshot-v1-*-vision-preview` 已于 2026-08-31 下线，`kimi-latest` 已下线，`kimi-k3.1-pro` 支持图片输入。[视觉输入文档](https://platform.kimi.ai/docs/guide/use-kimi-vision-model)要求 content 使用数组；图片不能直接传公网 URL，本工具只传 base64 data URL（官方也提供文件 ID 上传方式，本工具未采用）。[OpenAI 模型文档](https://developers.openai.com/api/docs/models/gpt-4.1-mini)列有指定的 gpt-4.1-mini。

国内站使用 `api.moonshot.cn`，国际站使用 `api.moonshot.ai`，账户、密钥及可用模型需要分别核对。上面的 Kimi 文档使用国际站示例；仍需 Ben 在国内站 [platform.moonshot.cn](https://platform.moonshot.cn) 核对模型名是否一致、自己的账户是否可用。切换服务商会清空当前密钥输入，保存后才覆盖持久化设置。

### CORS 与连通性边界

以下是开发时 **2026-11-03 用 curl 实测**的结果（只看响应头），并非在浏览器中用真实密钥的验证结果：

- `api.moonshot.cn` 的 OPTIONS 预检返回 204，`access-control-allow-origin` 回显 `https://benjaminxu2023-glitch.github.io`，允许 `authorization,content-type`；带假 key 的 POST 返回 401 且带 ACAO 头。
- DashScope 兼容模式预检返回 200、ACAO 为 `*`。
- OpenAI 预检返回 200，回显 origin。

这只是服务端头部检查，未在真实浏览器用真 key 跑通，服务商随时可能改策略。网络错误也可能是 CORS、域名配置或账户限制。若失败，可自建小代理（例如 Cloudflare Worker），或换服务商；代理不属于本仓库，部署代理时需自行保护密钥、限制访问。不要把私人密钥写进公开静态文件。

### 密钥安全

设置以 `uke-chords-settings-v1` 保存在本浏览器 localStorage。**这是明文存储**：能访问本地设备、浏览器配置或该站点脚本的人可能获取密钥。建议使用单独的低额度 key，不在共享设备长期保留，使用后点「清除密钥」。照片和密钥只发送到所选接口；本项目没有统计、第三方脚本或其他上传端点。页面上的密码遮挡不等于加密。

## Capo、移调与谱面规则

实际和弦 = 吉他指法 + 吉他变调夹品数 + 用户额外移调，然后去掉斜线低音。例如 G 指法、Capo 2 变成 A；D/F# 先变成 E/G#，再以 E 的尤克里里按法显示。输出默认尤克里里不夹变调夹。额外移调 0 标「原调」，即保留吉他谱实际音高，不是忽略原谱的变调夹。

支持十种类型：大三、m、7、maj7、m7、sus2、sus4、dim、aug、add9。`2` / `add2` 统一作 add9，`#5` 作 aug。9/11/13 → 7，m7b5 → m7，6 → 大三，m6 → m，dim7 → dim；近似结果带星号。无法识别的其他后缀不当作和弦。格式转换保留近似和弦的原始标记。

有调号时，自动拼写按**目标调**决定：F、Bb、Eb、Ab、Db、Gb 和对应 Dm、Gm、Cm、Fm、Bbm、Ebm 用降号，其余用升号。`transposeChord` 的第三个参数可传 `{prefer:'auto', key:'F'}`，key 是目标调。单个和弦没有调信息时五个黑键默认 Db、Eb、F#、Ab、Bb。和弦库查找统一转成降号根音，因此 C# 和 Db 使用同一按法。

主调估计评估 24 个大小调：自然音阶对应三和弦匹配 +3，根音在音阶但类型不匹配 −1，音阶外 −3；主和弦每次 +1，首和弦另 +4、末和弦另 +3。它是启发式估计，不是调性分析结论。

双行谱按显示列数对齐，中文及全角标点宽 2，ASCII 宽 1，制表符展开为 4 个空格。落在汉字中间的列归到该字。输出拥挤和弦时在歌词相应位置补排版空格，语义往返保留和弦与歌词关联，新增的排版空格不视为歌词内容。连续纯和弦行保留独立行。可混用 ChordPro 指令，未知指令忽略。

## 难度公式

对一个按法，取正品位集合（空弦与不弹弦不计入）：

`基础分 = min(10, 0.45 × 最高品位 + 0.7 × (最高按品 − 最低按品) + 0.65 × 按弦数 + 横按代理罚分)`

同一正品位有多根弦时，横按代理罚分为 0.8，否则为 0；全部空弦为 0。这是便于解释的估计，并非真实手指分配求解。

E、B、Gbm（F#m）各额外 +3；Eb、Bb、Db、Gb（F#）、Ab、Dbm 各 +2；最终每个和弦封顶 10。`DIFFICULTY` 存储全部 120 个和弦分数。

全曲得分 = 按每次出现次数加权的平均分 + 0.35 × 最难和弦分。枚举 −6 到 +5 的十二个方案，分数越低越优先；同分优先移调幅度小。大于等于 6 分列为较难和弦。总分可能超过 10。推荐只考虑按法，不考虑演唱者音域、转位效果和换和弦动作。

## 测试与部署

```sh
npm test            # 即 node --test test/*.test.mjs
node test/index.js  # 等价入口

# 端到端（Playwright + Chromium，识图接口被 mock，不需要密钥）：
npm i -D playwright && npx playwright install chromium
node tools/e2e.cjs  # 390x844 与 820x1180 两个视口，截图写入 screenshots/
```

测试使用 node:test + node:assert。覆盖解析、十二音移调、难度、格式往返、中文对齐、SVG、识图接口模拟、输出转义，以及全部 120 个按法的乐理、来源 fixtures 与标准答案。测试不发真实接口请求，不需要密钥。

GitHub Pages：先把本分支通过 PR 合并到 main，再在仓库 Settings → Pages → Deploy from branch 中选择 **main / root**。所有资源使用相对路径，可部署在仓库子路径下。也可直接部署到任意静态服务器。无需安装依赖或构建。

## 已知限制

- OCR 可能漏字、错位或误读和弦；必须人工校对，模糊字按提示用 □。
- 吉他斜线低音在四弦按法中省略，扩展和弦会近似；不能替代精确编曲。
- 识别 Capo 支持数字和 I–XII；界面只提供 0–11 品，12 品在控件中归为 0（相差一个八度，和弦音级相同）。调号估计对转调、借用和弦及相对大小调可能不准。
- 显示列宽不是完整 Unicode 排版引擎，组合音标、复杂 emoji 和特殊字体可能影响对齐。纯文本中全由合法和弦 token 组成的歌词行会被视作和弦行。
- PNG 在 segment 之间换行；超长单一 segment 为保持关联整体缩小。超长整谱可能超过浏览器 Canvas 尺寸或内存上限，宜分段导出。
- 浏览器不支持的图片格式可能无法显示缩略图；HEIC 原样发送后还需服务商支持。
- 已用 Playwright Chromium 在 390x844 / 820x1180 跑通 mock 识图的完整流程；**未在真机、iOS Safari 上验证**（含 Safari 长按保存 PNG）；未用真实密钥连通任何服务商；CORS 与模型可用性可能变化。

`src/chord-db.js` 与来源 fixtures 为既有数据，本次实现不修改其中品位。来源与选型工具见 `tools/pick_voicings.py`。按法核对来源、日期与覆盖情况见 [VERIFICATION.md](VERIFICATION.md)。
