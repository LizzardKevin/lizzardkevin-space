export type DevStory = {
  id: string;
  number: string;
  period: string;
  title: string;
  summary: string;
  built: string[];
  trouble: string[];
  next: string;
  tags: string[];
};

export const devStories: DevStory[] = [
  {
    id: "devlog-01",
    number: "01",
    period: "2026.05.28",
    title: "先把 SPACE 的骨架搭起来",
    summary:
      "第一天我没有急着把展厅做漂亮，而是先把它搭成一个能继续长下去的空间。Vite、React、TypeScript、第一人称移动、Overlay、Focus、音频和 GLB 命名这些底座先接上，后面才有地方慢慢加内容。",
    built: [
      "我把 workspace 先整理出来，让 `apps/web` 成为 Vite + React + TypeScript 的主应用。",
      "顶栏改成 Overlay，打开菜单时 SPACE 不会被卸载，关掉后还能回到原来的第一人称位置。",
      "第一版移动接上 Rapier 风格的角色控制，先有重力、滑墙、地面吸附和随视角 WASD。",
      "我顺手约定了 `COL_` 碰撞网格、展品 manifest、Focus overlay 和统一播放进度条这些之后会反复用到的接口。",
    ],
    trouble: [
      "Pointer Lock 的浏览器提示框没法被网页藏掉，只能从交互节奏上减少频繁锁定和释放。",
      "这一版更像是在铺地基，视觉、音频 zone、展品按钮和真实 `gallery_main.glb` 都还没有真正展开。",
    ],
    next:
      "下一步我想把真实 gallery 模型导进来，确认 `COL_` 碰撞能走，再继续补展品按钮、视频通道、脚步声和更明确的视觉方向。",
    tags: ["React", "Rapier", "Overlay", "Focus GLB"],
  },
  {
    id: "devlog-02",
    number: "02",
    period: "2026.05.29 - 06.01",
    title: "WebGPU 上线，然后材质和性能一起找上门",
    summary:
      "这一轮我把主场景推到 WebGPU，结果渲染、碰撞、移动和部署问题一起冒出来。GTAO、Toon、雾效、Bloom、trimesh、线上白屏和 Blender AO bake 全都搅在一起，最后先选了 Toon + Fog + 轻 Bloom 这条更稳的路线。",
    built: [
      "我加了 WebGPU 能力检测、Renderer 初始化、错误边界和不支持 WebGPU 时的提示页。",
      "SpacePage 和 FocusOverlay 都切到 WebGPURenderer，同时把旧 WebGL 后处理依赖拿掉。",
      "平台和外墙碰撞重新梳理了一遍，用 root 空间烘焙、双面 trimesh、地面开孔和 autostep 先把穿模压住。",
      "当前视觉先落在 Toon gradientMap、Fog 和轻 Bloom 上，也顺手审了一遍 `gallery_main.glb` 的三角面分布。",
    ],
    trouble: [
      "GTAO 确实能让墙根更有结构，但开销明显，和 Toon/Basic 混在一起还容易变暗甚至全黑。",
      "关掉 GTAO 后场景又太白，我只能用色带、雾和补光把空间层次一点点找回来。",
      "线上白屏不一定是代码坏了，也可能只是部署时漏传了 `dist/assets` 或 JS 404。",
      "Blender AO bake 卡在 active Image Texture 节点，提醒我资产管线也要写清楚，不能只靠记忆。",
    ],
    next:
      "后面我想继续把 AO 往资产里烘，少依赖实时 GTAO；同时降低占位展品面数，并把完整 `dist` 上传流程写得更笨也更可靠。",
    tags: ["WebGPU", "Toon", "Trimesh", "AO Bake"],
  },
  {
    id: "devlog-03",
    number: "03",
    period: "2026.06.02 - 06.03",
    title: "让展品真的能被点开，也把不合适的方案退回来",
    summary:
      "这两天我主要在做 Focus：准星瞄准、左键进入、背景虚化、独立透明 Canvas、Orbit 旋转、入口白屏和 pivot 策略都跑通了。也有几次明显绕远路，尤其是按钮 hover 和 billboard，做完后发现不对，就先退回来。",
    built: [
      "中心射线从子 mesh 往父级找 exhibitId，入口也从 E 键改成左键 mousedown，手感更像真的在点展品。",
      "进入 Focus 时释放 pointer lock，底层 Canvas 不再抢事件，前景用独立透明 WebGPU Canvas 和 OrbitControls。",
      "我做了 300ms blur/dim、150ms 内容淡入、ESC 退出和右上角返回，让 Focus 像一个临时打开的展示台。",
      "入口白屏改成 2 秒淡出，准星也有了展品高亮和空点击的小反馈。",
    ],
    trouble: [
      "Pointer lock 里 click 不稳定，换成 mousedown 后左键 Focus 才可靠。",
      "我试过在顶层捕获并 stopPropagation，结果把 Focus 内 Orbit 拖拽弄坏了，最后退回到底层 Canvas `pointer-events: none`。",
      "准星 idle 和 pulse 动画叠在一起会连闪两次，于是我删掉了常驻 idle。",
      "按钮 hover emissive 和 Html billboard 技术上能跑，但方向不对，先退掉，等交互语言更清楚再做。",
    ],
    next:
      "接下来我想重新想 Focus 三个按钮的 hover、状态和说明方式，同时继续补媒体资源，把视觉闪动问题更多放回 Blender 和 AO 资产侧解决。",
    tags: ["Focus", "Pointer Lock", "Splash", "Rollback"],
  },
  {
    id: "devlog-04",
    number: "04",
    period: "2026.06.07 - 06.08",
    title: "把项目搬到 Codex 后，先救回可验证状态",
    summary:
      "这一轮像一次接管和体检。我把上下文从 Cursor/projectless chat 搬进 Codex App Projects，先让 lint、TypeScript、构建、包体和资源加载重新变得可验证，然后再继续修 Focus、入口彩蛋、跳跃彩蛋和展品资产表。",
    built: [
      "我修掉 React hooks 新规则带来的 P1 lint 阻断，也拆了 GallerySpawnContext，让 Fast Refresh 不再报警。",
      "SpaceDesktopExperience 和 FocusOverlay 改成 lazy 加载，再用 Rolldown groups 拆出 React、Three 和 Rapier vendor。",
      "Draco decoder 本地化到 `/draco/`，避免 useGLTF 去 gstatic 拉资源失败。",
      "早期占位 Focus 的旋转中心、入口点击彩蛋、第一人称跳跃彩蛋和起跳/落地音也在这一轮接上。",
      "我用最新 CSV 重新生成了 exhibit asset tracker，让占位展品和资产表重新对齐。",
    ],
    trouble: [
      "lint failure 很多都来自 Three/R3F 必要的 imperative mutation，需要一类一类处理，不能一刀切。",
      "主入口 chunk 曾经超过 4 MB，拆包后入口下来了，但 Three/Rapier vendor 大是现实问题。",
      "Draco 外链失败的表象很迷惑，可能看起来像出生点很远、WASD 失效，其实是模型没正常加载。",
      "旧 `dist` 里残留的大 GLB 会骗过本地预览，所以重新 build 后还要检查产物里有没有 20 MB 以上的残留文件。",
      "Excel 和 CSV 一度不一致，说明展品资产流程需要一个更明确的事实源。",
    ],
    next:
      "下一步我会继续手测跳跃手感和音量，重做 Focus 三按钮交互，并在上线前确认 `/draco/`、`/audio/`、`/exhibits/` 都完整发布。",
    tags: ["Codex", "Lint", "Chunk Split", "Draco"],
  },
  {
    id: "devlog-05",
    number: "05",
    period: "2026.06.09 - 06.16",
    title: "桌面稳住，手机端改走 Terminal Site",
    summary:
      "这一轮我把桌面和手机拆成两条路。桌面继续整理入口、Pointer Lock、cursor、Frosted Split、DevStories 和 `space_main` 资产；手机端不再硬塞 WebGPU SPACE，而是改成更轻的 Terminal Site，用 Projects、Skills.md、Soul.md 和 Contact.md 承载信息。",
    built: [
      "桌面入口会等 Canvas ready 后再进入，并在同一次用户手势里请求 pointer lock。",
      "Profile / DevStories 稳定在 Frosted Split 里，白色 Profile、黑色 DevStories、滑动分界线、低密度 index 和 + / - detail 都成型了。",
      "生产主空间切到 `space_main.blend` / `space_main.glb`，运行时加载 `/models/space_main.glb?v=20260614-space-main`。",
      "手机端新增 MobileExperience 和 mobileArchiveData，只加载 terminal 页面，不导入桌面 TopBar、Overlay、WebGPU SPACE 或 DevStories。",
      "手机 terminal 做了 boot、四个 tab、中英文 copy、Light/Dark、Ubuntu Mono、自托管字体、圆形主题 reveal、滚动折叠 header 和 fold section 动效。",
    ],
    trouble: [
      "手机复用桌面 SPACE 太重，WebGPU、Pointer Lock 和 Overlay 都不适合，所以最后改成平台分支。",
      "boot 固定 3 秒不够聪明，后来改成最短 3000ms、最长 10000ms，并等待字体加载，失败就 fallback。",
      "手机 header 初版像把正文钉住了，我改成连续 CSS variables，让 content 和 nav 的滚动补偿分开。",
      "文本 load animation 放错层会造成布局抖动，最后下沉到内部 load layer。",
      "触控板惯性会让桌面 DevStories 一下跳好几页，所以 wheel paging 加了 gesture lock。",
    ],
    next:
      "我还想拿真机继续测 iPhone Safari 和 Android Chrome 的滚动、safe-area、字体 fallback、主题 reveal 和 Contact 链接，同时把更多 project slot 换成真实内容。",
    tags: ["Mobile", "Terminal Site", "space_main", "Frosted Split"],
  },
  {
    id: "devlog-06",
    number: "06",
    period: "2026.06.17 - 06.22",
    title: "把跨平台开发和 space_main 管线接稳",
    summary:
      "这一轮我一边补个人页和 DevStories，一边把 Windows Codex、macOS、GitHub 和 Blender 资产管线接起来。`space_main` 的出生点、楼梯、LED、碰撞和材质开始从网页临时补救，慢慢回到 Blender 源文件里。",
    built: [
      "LizzardKevin 个人页和 DevStories 内容层补齐了，个人网站不只是简历，也能看到 SPACE 一路怎么长出来。",
      "我做了全局自定义 cursor：圆点、hover、点击脉冲、文字选择、滚动粒子、Focus 八角星和回第一人称前的回中心动画。",
      "Alt / ESC 释放 pointer lock 后的 cursor 漂移被重新处理，自定义圆点会从中心飞回真实系统鼠标位置。",
      "Windows Codex 的跨平台分支合入后，`.nvmrc`、package scripts、lockfile 和 contract tests 都更适合双平台继续开发。",
      "Blender 里的 Plain Axes Empty 规范成 `spawn_player_main`，runtime 在缺少地板碰撞时会用 marker 自身高度。",
      "我改用 Blender Python Console 做资产批处理，生成可见 `STRUCT_STAIR_*` 楼梯，并给 `LIGHT_GENERIC_LIGHT_*` 写入 emissive LED 材质。",
    ],
    trouble: [
      "Blender MCP 多次返回不完整 JSON，直接 socket 也会超时，所以我把本阶段主流程改成 Python Console + JSON report。",
      "重新导入 GLB 后会出现重复的 `spawn_player_main.001`，批处理必须保留最新 marker 并清掉旧节点。",
      "新模型只有 `COL_STAIR_*` 时，网页会隐藏碰撞体，看起来就像楼梯不存在，所以必须单独生成可见结构。",
      "generic LED 初始还是 dark metal，视觉上完全不发光，需要真正写入 emissive factor 和 emissive strength。",
      "Node v26 会触发 engine warning，还会让 lockfile 有无意义漂移，后续还是要统一 Node 24.11.0。",
    ],
    next:
      "接下来我会继续做真实 Chrome 视觉 QA，确认楼梯、LED、出生点和移动手感，然后把楼梯视觉/碰撞双节点规则写回资产命名文档。",
    tags: ["Cross Platform", "Blender", "Cursor", "space_main"],
  },
  {
    id: "devlog-07",
    number: "07",
    period: "2026.06.23 - 06.24",
    title: "把移动手感和 physics tick 调顺",
    summary:
      "这一轮我盯着 `space_main` 新模型进网页后的移动手感。先加 dev-only debug overlay，看位置、速度、ratio 和当前接触的 `COL_*`，再确认问题不在 Vite server，而是 render `dt` 和 Rapier fixed timestep 混用。最后把 physics 和玩家移动都固定回 1/60。",
    built: [
      "我加了 `space:movement-debug` telemetry 和左上角 debug overlay，能看到 pos、speed、ratio、target、grounded、collision count、vertical velocity 和 contact 名称。",
      "`COL_*`、floor、prop fallback 和 `SAFETY_GROUND` 都能注册 collider handle，真实浏览器里可以直接看到踩到了谁。",
      "第一人称视角控制先保守回到可用链路，再在后续用更小的 delta 防护处理跳闪。",
      "SPACE 显式设置 `<Physics timeStep={1 / 60}>`，PlayerController 也使用固定 `PLAYER_PHYSICS_TIME_STEP`。",
      "临时翻倍的走路/冲刺速度回到 2.45 / 3.85，同时保留 smoothstep 和 lerp 带来的停止惯性。",
    ],
    trouble: [
      "debug ratio 一开始看起来很稳，是因为 actual/desired 都用了同一个动态 `dtRef`，反而把问题藏起来了。",
      "我一度怀疑 Vite dev server 在跑动态 tick，后来确认它只负责 dev server/HMR，真正的问题在浏览器运行时。",
      "自定义 guarded pointer lock controls 曾经把视角移动搞坏，所以这一块不能大拆，只能小心加防护。",
      "新 GLB 的碰撞异常不能靠体感猜，必须拿 contact 名称回 Blender 找对应 `COL_*`。",
    ],
    next:
      "我还会继续用真实浏览器和 debug overlay 复测移动手感；如果鼠标跳闪还在，就沿着 Drei PointerLockControls 链路做最小防护。",
    tags: ["Physics Tick", "Movement Debug", "Rapier", "space_main"],
  },
  {
    id: "devlog-08",
    number: "08",
    period: "2026.07.02",
    title: "做一次项目收口，也把开发日志写得像自己说话",
    summary:
      "这次我没有继续往 SPACE 里加新展品，而是停下来做项目管理审查和日志收尾。先清理一些低风险的 repo 和运行时问题，再把 DevStories 从冷冰冰的工程账本改成更像个人创作者的建站日记。",
    built: [
      "我先开了独立 review 分支，派了三个并行审查方向：repo hygiene、SPACE runtime、content/i18n/mobile/devlog。",
      "低风险修复包括：root `release/` ignore 不再误伤 `apps/web/tests/release`，placement cache 去掉时间戳，Blender 脚本补上跨平台 PATH 查找，GitHub bootstrap 不再默认推已有 origin。",
      "运行时顺手补了几个小安全垫：Focus 非模型页暂停隐藏 Canvas 渲染，scene exhibit clone 在卸载时释放自有 material，手机和 SPACE daily resume 的 localStorage 访问都加了 try/catch。",
      "README、DevStories 维护说明和 DevLog 7 里过期的脚本/碰撞描述也一起对齐到当前结构。",
      "我新增了这条 DevLog 8 和摘要，并把网页端 DevStories 的 1 到 8 条都改成更轻松的第一人称记录。",
    ],
    trouble: [
      "有些建议很诱人但不适合顺手改，比如把 public 里的 source GLB/JPG 搬出发布目录、做 GitHub Pages 迁移、重写 manifest 加载方式或改 Focus 返回文案。",
      "DevStories 的 Markdown 和网页数据不是自动同步的，所以新增日志时必须同时更新 `docs/devlog` 和 `apps/web/src/content/devStories.ts`。",
      "内容语气要变轻松，但不能丢掉技术脉络，我保留了 WebGPU、Rapier、Pointer Lock、GLB、chunk、localStorage 这些必要线索。",
      "这轮 build 会生成本地 `apps/web/dist`，但它仍然是被忽略的本地产物，不能提交。",
    ],
    next:
      "下一步可以让 GitHub Pages / github.io 迁移线程接手部署策略，但它应该先确认 base path、静态资源路径和 public source assets 的处理方式，不要直接把这轮 review 分支当作部署动作。",
    tags: ["Review", "DevLog", "Repo Hygiene", "Tone"],
  },
];
