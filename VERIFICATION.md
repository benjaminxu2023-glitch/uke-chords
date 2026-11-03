# 按法核对记录（VERIFICATION）

核对日期：**2026-11-03**（Asia/Shanghai）。调弦：标准 GCEA（G4 C4 E4 A4，re-entrant）。
范围：12 个根音 × 10 种类型（大三、m、7、maj7、m7、sus2、sus4、dim、aug、add9）= **120 个和弦**，品位存于 `src/chord-db.js`（G、C、E、A 弦顺序，降号根音命名）。

## 数据来源（均为公开页面，实际抓取）

| 来源 | 抓取地址 | 本仓库快照 |
| --- | --- | --- |
| ukulele-chords.com | `https://ukulele-chords.com/<和弦名>`，例如 https://ukulele-chords.com/C 、https://ukulele-chords.com/Dbm7 ，共 120 页 | `test/fixtures/ukulele-chords.com.json`（每个和弦首选按法） |
| UkuleleTricks 和弦库 | 页面 https://ukuleletricks.com/ukulele-chords/ ；页面由 JS 渲染，数据取自其调用的 https://members.ukuleletricks.com/chord-library | `test/fixtures/ukuleletricks.com.json`（每个和弦的全部变体，共 606 个与本工具 9 种类型对应的按法） |

未采用：ukulele.io、ukutabs（抓取返回 404/403）；scales-chords.com（按法写法非常规，未纳入）。

## 方法

1. **乐理校验（独立于来源）**：把每弦品位换算成音级（空弦 G=7、C=0、E=4、A=9），要求所弹音 ⊆ 和弦音，且必需音全部出现；四音和弦（add9 除外）允许省略五音。不弹弦（x）不计入。
2. **选型**（`tools/pick_voicings.py`）：ukulele-chords.com 首选按法若通过乐理校验、无不弹弦、最高品 ≤ 5，则采用；否则在两个来源所有通过校验、无不弹弦的按法中取代价最低者（先比较最高品，再比较跨度和按弦数）。
3. **交叉比对**：记录每个和弦的选型是否也出现在 UkuleleTricks 的变体中。逐和弦结果见 `test/fixtures/voicing-report.json`。
4. **单元测试** `test/voicings.test.mjs` 对 120 个按法逐一断言乐理校验与来源一致，并含一组公认标准答案（如 C 0003、G 0232、F 2010、Am 2000、D 2220、Em 0432 等）。

## 结果与覆盖

- 120 / 120 个最终按法通过乐理校验。
- 120 / 120 个 ukulele-chords.com 首选按法通过乐理校验；其中 115 个直接采用。
- 95 / 120 个最终按法同时出现在 UkuleleTricks 变体中（两个来源一致）。
- 108 个和弦两个来源都有；其中 90 个的 ukulele-chords.com 首选按法与 UkuleleTricks 某个变体一致，18 个不一致：Cdim、Cadd9、Dbm、Dbadd9、Dsus4、Ddim、Dadd9、Ebsus4、Edim、Eadd9、Fdim、Fadd9、Gbsus4、Gbadd9、Gadd9、Absus4、Abdim、Abadd9。
- 因首选按法含不弹弦而改用 UkuleleTricks 按法的 5 个：Cdim x323→5323、Dbm 110x→1104、Ddim 121x→7545、Fdim 1x12→4542、Abdim 12x2→4242。

## 未能完全核对 / 已知问题（如实列出）

- **sus2 全部 12 个只有单一来源**（UkuleleTricks 和弦库没有 sus2），只靠 ukulele-chords.com + 乐理校验：Csus2、Dbsus2、Dsus2、Ebsus2、Esus2、Fsus2、Gbsus2、Gsus2、Absus2、Asus2、Bbsus2、Bsus2。
- 13 个最终按法只来自 ukulele-chords.com、未在 UkuleleTricks 中找到相同变体（但通过乐理校验）：Cadd9、Dbadd9、Dsus4、Dadd9、Ebsus4、Edim、Eadd9、Fadd9、Gbsus4、Gbadd9、Gadd9、Absus4、Abadd9。
- UkuleleTricks 数据中有 16 个变体未通过本校验（缺必需音或含和弦外音），未被采用：Abadd9 5363、Absus4 5344、Caug 1043、C 0033、Dadd9 2200、Dsus4 0220、Ebaug 0336、Ebsus4 0341、Eadd9 2442、Gbadd9 3141、Gbaug 6558、Gbsus4 3122、Fadd9 2030、Gadd9 0230、Gaug 0336、Gmaj7 11-14-14-14。其中部分可能是有意省音的简化按法，但本工具不采用。
- dim 和弦的若干按法位置偏高（如 Ddim 7545）或不常见，是在“不含不弹弦”约束下的结果。
- 只核对了“音对不对”，未核对指法是否最顺手；难度分（README 中的公式）是启发式估计。
- 未与纸质教材或第三个来源比对。
