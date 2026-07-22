# 明日方舟式「大色块 × 线条 × 工业平面」设计风格研究总览

> 整理日期：2026-07-21<br>
> 用途：个人网页 / SPACE 视觉与 UI 壳层的风格参考文档<br>
> 范围：明日方舟（Arknights）及其相关品牌站点、UI/UX 拆解文章、磁带盒未来主义、机能风、瑞士国际主义、当代工业平面案例与素材包

---

## 1. 风格定义（一句话）

这是一种以**黑白灰大色块**为结构骨架、以**线条 / 条纹 / 网点**为工业质感、以**警戒色与符号化**为功能点缀的平面设计语言。

它不是「紫光赛博朋克」，也不是「萌系二次元 UI」，更接近：

- **硬核性冷淡**（黑白底 + 高对比）
- **都市机能 / Techwear 的平面化**
- **磁带盒未来主义（Cassette Futurism）**
- **HUD / 战术界面语言**
- 底子上的 **瑞士国际主义网格 + 建构主义色块海报**

核心原则：**形式追随功能（Functionalism）** —— 结构表达优先，装饰只服务识别与状态。

---

## 2. 命名与关键词对照

| 中文叫法 | 英文 / 近义 | 说明 |
| --- | --- | --- |
| 硬核性冷淡 | Hardcore cold minimal | 黑白灰主导、信息冷静、少煽情装饰 |
| 都市机能风 | Techwear / Urban functional | 军工、户外、口袋、绑带结构感 |
| 磁带盒未来主义 | Cassette Futurism | 70–80s 模拟科技：大按键、CRT、VHS 彩条 |
| 战术 HUD | Tactical HUD / Diegetic UI | 角标、浮窗、观瞄投影、编号系统 |
| 工业平面 | Industrial flat / Utilitarian graphic | 色块、警戒线、条码、标签、网格 |
| 瑞士国际主义 | Swiss Style / International Typographic Style | 网格、非对称、无衬线、大色块 |
| 临床粗野主义 | Clinical Brutalism | 石墨底 + Safety Orange、物流/数据字排 |

**推荐搜图关键词（中英混用）：**

```
明日方舟 UI
机能风 平面
cassette futurism poster
industrial brutalist graphic
safety yellow color block
HUD UI flat
utilitarian sticker pack
swiss style poster red black
techwear graphic design
源石 三角形 图标
警戒条纹 网点纸
```

---

## 3. 视觉 DNA（完整清单）

### 3.1 色彩

| 角色 | 用法 | 典型倾向 |
| --- | --- | --- |
| 主色 | 结构、背景、大面板 | 近黑、深灰、石墨、冷灰 |
| 中性色 | 分区、卡片、正文底 | 浅灰、铝灰、半透明黑 |
| 辅色 | 功能引导、次级强调 | 蓝、橙（方舟常见） |
| 警戒色 | CTA、状态、关键数字 | 信号黄、安全橙、CRT 绿/琥珀 |
| 复古条纹 | 磁带/VHS 意象 | 红–黄–青彩条（活动 UI 常见） |

规则：

1. **亮色配额极低**：只给按钮、状态、关键指标。
2. **大面积低饱和**：环境与背景向黑白两极靠拢。
3. **对比靠结构，不靠彩虹**：层级用明度与叠层，不用多彩色块堆砌。

工业网页参考色例（Forge 类模板思路，可借鉴而非照抄）：

- Mill-scale black `#1B1B1E`
- Machined aluminum `#A8A9AD`
- Bright-drawn steel `#D5D6D8`
- Signal yellow `#E8D44D`（仅 CTA / 数据高亮）

### 3.2 色块与排版结构

- **矩形为主**：面板、顶栏、侧栏、底栏、信息条几乎全是直角或微圆角矩形。
- **大色块分层**：先画信息层，再加线与纹理；色块是主角，插画是配角（网页侧尤其如此）。
- **非对称网格**：瑞士式 modular grid；内容左对齐或强对比字阶，留白有目的。
- **卡片可用，但要克制**：方舟采购中心 / 基建用阴影卡片做深度；网页若学「舟味」，应避免互联网式圆角大卡片瀑布流。
- **黑色长条**：磁带盒未来主义影响下的主视觉条、按钮条、信息条。

### 3.3 线条与纹理

| 元素 | 作用 |
| --- | --- |
| 细线框 / 分割线 | 工程图感、信息分区 |
| 粗警戒条纹 | 工业感、警示、底图节奏 |
| 斜纹 / 几何渐变底纹 | 规则感、工厂标识感 |
| 散点网点（Grain） | 让留白不空、提升对比 |
| 漫画网点纸 | 细腻度与印刷感 |
| 局部马赛克 / 失焦 | 叙事暗示、焦点控制 |
| Vignette（晕影） | 压边、突出中心主体 |

这些底图处理在**游戏内外高度统一**，是「舟味」品牌识别的关键胶水。

### 3.4 图形与符号化

- **三角形**：源石、职业、时装系列、终末地场景符号延续。
- **几何图标**：圆、方、字母、机能小图标叠加，构成 HUD 点线面。
- **物流符号**：条码、编号、标签、胶带、警告贴、QR。
- **外露结构**：管线、桁架、钢架在平面中转译为网格与线条骨架。
- **半透明塑料感**：弹窗、浮层、磁带盒外壳意象。

### 3.5 字体

| 场景 | 倾向 | 例子 / 说明 |
| --- | --- | --- |
| 中文标题 | 衬线，粗细对比强 | 思源宋体一类；「警戒」字意向 |
| 中文正文 | 无衬线，易读 | 思源黑体一类 |
| 拉丁标题 | Old Style / Modern 衬线视题材切换 | Trajan、Didot/Bodoni 系；城市/城邦可区分 |
| 基建 / 数据 | 伪等宽工业字 | Bender 一类 |
| 网页英文主字 | 可考虑古典衬线 | 如 Garamond Premier Pro（官网改版案） |

中英混排是「硬派科技感」的常用手法：装饰性英文 + 临床文风说明，会强化工业/军工气质。

### 3.6 层级、深度与材质

从 Fluent Design 五要素对照方舟实践：

| Fluent 要素 | 方舟做法 |
| --- | --- |
| Light | 静态背光贴图、奖励光圈、粒子呼吸 |
| Depth | 卡片阴影、视差、前景模糊取镜 |
| Motion | 系统切换淡出、zoom-in/out、养成页局部位移 |
| Material | 毛玻璃浮窗、亚克力式模糊覆盖 |
| Scale | 字阶与组件大小拉开对比 |

关键技巧：

1. **背景模糊覆盖浮窗**：既突出当前交互，又让玩家「窥」见下层页面。
2. **Diegetic Interface**：主看板 PRTS 全息投影，把系统状态做成「角色可见」的观瞄界面。
3. **同一 canvas 内展开**：养成页多用位移/展开，而不是跳全新页面。
4. **系统场景化导航**：各系统挂在「罗德岛」空间分区上，导航有世界观。

### 3.7 气质边界（做什么 / 不做什么）

**做：**

- 结构清晰、功能优先
- 大色块 + 线框 + 少量警戒色
- 符号化、编号化、网格化
- 冷冽、克制、可信的工业重量

**不做：**

- 紫霓虹赛博堆特效
- 奶油极简 / 圆角营销卡片首屏
- 装饰性渐变抢结构
- 插画堆满第一屏
- 亮色到处撒、字号全一样

---

## 4. 美学谱系（从祖宗到当代）

### 4.1 瑞士国际主义 + 建构主义

- 模块网格、非对称排版、无衬线、大色块、少装饰。
- 「形式追随功能」是现代平面与 Flat Design 的共同祖先。
- 工业展会海报、机构标识、街道路牌是经典载体。

### 4.2 磁带盒未来主义（Cassette Futurism）

启发自 1970 年代末–1980 年代电子产品美学：

- 磁带、盘式机、CRT、大按键、旋钮、拨杆
- 扫描线、磷光绿/琥珀字、VHS 彩条
- 方方正正、可维修、可操作的实体科技感
- 「少即是多」：黑长条按钮、干净塑料半透明

方舟活动 UI（如卫戍协议、孤星等）常直接挪用 CRT / VHS / HUD 语法。

### 4.3 城市机能 / Techwear

- 黑 / 灰 / 军绿；长飘带、大立体口袋、防水防风结构
- 代表品牌思路：ACRONYM（Errolson Hugh）——军装工装 + 功能剪裁
- 与户外运动共通：**功能主导**
- 游戏侧对照：《杀出重围》《死亡搁浅》等机能服装叙事

### 4.4 HUD / 战术界面

- 2.5D 构图、全息、环绕按钮、中间屏幕读数
- 早期诺基亚式实体按键感 + LED 抬头显示
- 参考气质：《光环》HUD、《西部世界》系统等高线规划感
- 结论：**科技风 ≠ 只有赛博朋克**

### 4.5 终末地工业场景美学

- 粗野主义建筑底：外露管材、钢架、反应罐
- 「高级灰」环境 + 品牌黄作工业警示引导
- 低饱和 + NPR/PBR 混合：锈、油污、磨损带来历史感
- 场景本身做导航：货箱、破车、斜坡构成高低差与视线引导
- 工业不仅是皮肤，更是「秩序被一点点维持」的叙事

### 4.6 当代工业平面 / 物流粗野主义

Behance 上常见：

- 石墨底 + Safety Yellow / Orange
- 瑞士 12 栏网格 + 扫描矩阵 + 条码微字
- 浓缩无衬线标题 + 等宽数据字
- 标签贴纸包、警戒胶带、撕裂纸张等「功利图形」

---

## 5. 明日方舟 UI/UX 六角拆解（核心文献摘要）

来源：腾讯游戏学院 AJ 文（机核 / indienova / 腾讯学堂多处转载）。六角如下：

### 5.1 Diegetic Interface（画内界面）

- 主看板做成 PRTS 远程接入的全息观瞄投影。
- 电量、信号、时间也统一进浮窗，并可随陀螺仪轻微位移。
- 对照：《全境封锁》物品栏、《死亡空间》的画内 UI 传统。

### 5.2 类 Fluent Design 质感

- 高对比层级 + 警戒亮色 + 毛玻璃模糊。
- 模糊既突出交互，又保留下层页面可读轮廓。

### 5.3 扁平后的深度

- 卡片阴影圆角做「离用户更近」的高度。
- 章节选择：白边「相片」+ vignette 压边。
- 寻访：视差强化干员远近。

### 5.4 字体双轨：古典骑士 × 科幻军工

- 中文衬线 = 警戒与工厂格纳库统一。
- 基建 Bender = 硬核科技。
- 城邦用更古典拉丁衬线，龙门向章节可切无衬线/点阵赛博。

### 5.5 焦距与底图统一 VI

- 散点 grain + 粗条纹 = 全品牌统一底图语言。
- 前景失焦取镜、局部马赛克做叙事与焦点。

### 5.6 过场与层级压缩

- 独立系统：深色淡出；有逻辑联系：zoom。
- 次级系统：原页上浮窗，不整页跳转。
- 养成页：位移/展开保持同一 canvas。
- 全局物品链跳转 + 罗德岛空间化导航。

---

## 6. 鹰角品牌网页体系（可直接打开的「成品」）

| 站点 | URL | 看什么 |
| --- | --- | --- |
| 鹰角企业站 | https://www.hypergryph.com/ | 深色画布、几何精度、品牌底盘 |
| 明日方舟官网 | https://ak.hypergryph.com/ | 暗色奇幻 + 战术 UI；模块区块、半透明叠层、SVG 图标系统 |
| 终末地官网 | https://endfield.hypergryph.com/ | 电影感英雄区、流体字阶；工业符号仍在 |
| 塞壬唱片 | https://monster-siren.hypergryph.com/ | 极简音乐站；大留白、深中性色、画廊式克制 |
| 塞壬曲目页示例 | https://monster-siren.hypergryph.com/music | 唱片式信息陈列与播放器布局 |
| 曲目详情示例 | https://monster-siren.hypergryph.com/music/232201 | 文案区 + playlist 排版 |

设计语言共性（社区 DESIGN.md 归纳）：

- **Dark-industrial native**：黑暗是介质，不是后加的 dark theme
- **Game-UI → Web**：HUD、角几何、战术叠层上网页
- **思源黑体生态**：CJK 字重搭配统一
- **克制动效**：电影感但不喧宾夺主
- **跨子品牌一致**：各站个性不同，母语相同

制作人钟祺翔相关公开表述要点：以**功能主义**为审美核心；黑白灰表达结构，多色做识别；把前沿平面 UI 带入二游并影响一批模仿者。

---

## 7. 网页落地 checklist（给个人站 / SPACE HUD）

1. **先结构后装饰**：顶栏 / 主视 / 侧栏 / 底栏矩形分层。
2. **色块是主角**：深灰近黑底 + 浅灰/半透明黑内容区。
3. **线条要有「工种」**：分割线、角标、斜纹、编号栏优先于装饰插画。
4. **亮色配额**：橙/黄/蓝只给 CTA、状态、关键数字。
5. **字重对比大**：衬线标题 + 无衬线正文 + 等宽数据。
6. **纹理薄涂**：网点 / 条纹 / grain 低透明度铺底。
7. **浮层用毛玻璃或半透明黑条**，保留下层轮廓。
8. **避免**：紫霓虹、圆角卡片瀑布流、首屏插画堆砌、装饰渐变抢结构。

---

## 8. 完整链接目录

> 以下为本次研究所覆盖的全部主要网址，按类型分组。建议收藏后按「官方成品 → 拆解文章 → 风格理论 → 平面素材 → 工业网页案例」顺序浏览。

### 8.1 官方 / 品牌网页

| 名称 | 链接 |
| --- | --- |
| 鹰角网络官网 | https://www.hypergryph.com/ |
| 明日方舟官网 | https://ak.hypergryph.com/ |
| 明日方舟：终末地官网 | https://endfield.hypergryph.com/ |
| 塞壬唱片首页 | https://monster-siren.hypergryph.com/ |
| 塞壬唱片曲目列表 | https://monster-siren.hypergryph.com/music |
| 塞壬唱片曲目详情示例 | https://monster-siren.hypergryph.com/music/232201 |

### 8.2 明日方舟 UI / 美学拆解文章

| 名称 | 链接 |
| --- | --- |
| 机核：从 6 个角度拆解方舟视觉细节 | https://www.gcores.com/articles/112810 |
| 腾讯游戏学堂：方舟 UI/UX 分析 | https://gameinstitute.qq.com/article/10027 |
| 腾讯游戏学堂知识页（同文） | http://gameinstitute.qq.com/knowledge/100122 |
| indienova 真经阁：方舟 UI/UX 分析 | https://ldt.indienova.com/indie-game-development/arknights-ui-ux-design/ |
| PDF：《舟味》UI/UX 设计篇 | https://janniewang.net/wp-content/uploads/2023/09/UIUX-analysis-for-Arknights.pdf |
| 巴哈姆特转载：方舟 UI/UX 分析 | https://forum.gamer.com.tw/Co.php?bsn=33651&sn=6813 |
| 站酷：明日方舟里的美学（机能 / 磁带盒 / HUD） | https://www.zcool.com.cn/article/ZMTQyNDAyOA==.html |
| 站酷：明日方舟里的「磁带盒未来主义」 | https://www.zcool.com.cn/article/ZMTY0MTk4NA==.html |
| 站酷：终末地工业风 / 四号谷地美学 | https://www.zcool.com.cn/article/ZMTY5Njk4NA==.html |
| 机核：尝试优化明日方舟官方网站设计 | https://www.gcores.com/articles/135723 |
| 大触来了：明日方舟美术风格简述 | https://www.psai2046.com/news/1555.html |
| 17173：终末地场景原画与环境设计 | https://news.17173.com/z/arknights2026/content/01092026/151404662.shtml |
| 腾讯新闻：终末地工业机能风评述 | https://news.qq.com/rain/a/20260210A05YOA00 |
| 17173：终末地美术团队与风格传承 | https://news.17173.com/z/arknights2026/content/01172026/142008906.shtml |
| 17173：终末地题材与艺术风格定位 | https://news.17173.com/z/arknights2026/content/01162026/160233403.shtml |

### 8.3 制作人 / 品牌设计语言讨论

| 名称 | 链接 |
| --- | --- |
| 钟祺翔（百度百科英文条目，含功能主义美学表述） | https://baike.baidu.com/en/item/Zhong%20Qixiang/19510 |
| GitHub Issue：Hypergryph DESIGN.md 提案（子站清单与设计共性） | https://github.com/VoltAgent/awesome-design-md/issues/53 |
| YouTube：How Arknights MASTERED Gacha Art | https://www.youtube.com/watch?v=G4Z3wyvSXMo |

### 8.4 磁带盒未来主义 / 相关美学理论

| 名称 | 链接 |
| --- | --- |
| Martin Fieber：Cassette Futurism | https://martin-fieber.de/blog/cassette-futurism/ |
| Mike Piggott：A love letter to cassette futurism | https://twistedwonderland.substack.com/p/a-love-letter-to-cassette-futurism |
| DESIGN.md：Cassette Futurism 词条 | https://designmd.app/library/cassette-futurism |
| 虎嗅：磁带与磁带未来主义美学 | https://www.huxiu.com/article/418320.html |

### 8.5 瑞士国际主义 / Flat Design 祖宗与海报

| 名称 | 链接 |
| --- | --- |
| Wikipedia：Swiss Style (design) | https://en.wikipedia.org/wiki/Swiss_Style_(design) |
| Poster House：The Swiss Grid | https://swissgrid.posterhouse.org/ |
| Smashing Magazine：Lessons From Swiss Style | https://www.smashingmagazine.com/2009/07/lessons-from-swiss-style-graphic-design/ |
| Michelle Farley：Swiss Style 笔记 | https://michellefarleygdyear1.home.blog/2019/04/29/swiss-style/ |
| AntikBar：Swiss Industries Fair 1932 海报 | https://antikbar.co.uk/products/swiss-industries-fair-basle-1932-photomontage-pa1209 |
| Awwwards：Flat Design 网站精选 | https://www.awwwards.com/websites/flat-design/ |
| Designmodo：Flat Illustrations 网页案例 | https://designmodo.com/flat-illustrations/ |

### 8.6 Behance 平面 / 品牌 / 素材案例

| 名称 | 链接 |
| --- | --- |
| FixPoint：Industrial Aesthetic & Social Media Design | https://www.behance.net/gallery/250657037/FixPoint-Industrial-Aesthetic-Social-Media-Design |
| KORBEX：Modern Industrial Brand Identity | https://www.behance.net/gallery/239686639/KORBEX-Modern-Industrial-Brand-Identity-Design |
| SL24：Brutalist Data-Logistics & Cyber-Typography | https://www.behance.net/gallery/247026671/SL24-Brutalist-Data-Logistics-Cyber-Typography |
| Utilitarian Graphic Elements Pack | https://www.behance.net/gallery/238103457/Utilitarian-Graphic-Elements-Pack |
| Design Trends 2025（高对比 / 暗底霓虹趋势参考） | https://www.behance.net/gallery/209674381/Design-Trends-2025 |

### 8.7 工业感网页 / 系统 UI 案例

| 名称 | 链接 |
| --- | --- |
| Forge：Industrial Machine Manufacturer Landing Template | https://www.rocket.new/templates/forge-elite-industrial-manufacturer-landing-page-template |
| Forged Excellence：Oil & Gas Landing Case Study | https://s1bstudio.website/cases/forged-excellence |
| Floor OS：Industrial Machines UI/UX（Satisfactory 启发） | https://contra.com/p/UUvmWW3g-floor-os-uiux-design-for-industrial-machines |

### 8.8 周边代码 / 仿作参考（次要）

| 名称 | 链接 |
| --- | --- |
| 仿塞壬唱片切歌文字动画示例仓库 | https://github.com/colacat-mp3/monstersirentextchange |

---

## 9. 建议浏览顺序（高效吸收）

1. **先看成品**：明日方舟官网 → 塞壬唱片 → 终末地官网 → 鹰角官网
2. **再看拆解**：机核六角文 → 站酷美学文 → 磁带盒未来主义专文 → 终末地四号谷地
3. **补理论祖宗**：Swiss Grid → Cassette Futurism 词条
4. **攒素材库**：Utilitarian Pack → FixPoint → SL24
5. **对照网页落地**：机核官网改版案 → Forge / Forged Excellence

---

## 10. 总结：可复用的「舟味」公式

```
舟味 ≈
  功能主义结构
+ 黑白灰大色块分层
+ 线条 / 条纹 / 网点工业底图
+ 符号化（三角、编号、HUD 角标）
+ 衬线警戒标题 × 无衬线正文 × 等宽数据
+ 极少量警戒色（蓝 / 橙 / 信号黄）
+ 毛玻璃浮层与高对比叠层
− 赛博霓虹堆砌
− 营销圆角卡片瀑布流
```

把这套公式同时用于：**网页排版、HUD 壳层、平面物料、3D 场景标识系统**，就能在不同媒介上保持同一套工业平面语言，而不必逐像素抄袭明日方舟素材。

---

## 11. 文档维护

- 本文为调研汇总，不构成版权素材授权；商用请自行确认各站点与 Behance 作品的许可。
- 若后续要落地到本仓库 UI，可从本文第 3、7、10 节抽出 **CSS variables / 字阶 / 组件线框规范** 另开实现文档。
