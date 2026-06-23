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
    title: "把 SPACE 的骨架先跑起来",
    summary:
      "第一天的重点不是做一个漂亮的展厅，而是先让它成为一个可以继续生长的空间：Vite + React + TypeScript 的前端骨架、不中断 Canvas 的顶栏 Overlay、第一人称重力碰撞、展品 Focus、音频播放和 GLB 命名规范都在这一轮接上了。",
    built: [
      "建立 workspace 结构，以 apps/web 作为 Vite + React + TypeScript 主应用。",
      "把顶栏改成 Overlay 模式，打开菜单时不卸载 SPACE，关闭后回到原来的第一人称位置。",
      "接入 Rapier KinematicCharacterController 风格移动，完成重力、滑墙、地面吸附和随视角 WASD。",
      "约定 COL_ 碰撞网格自动识别，并搭出展品 manifest、Focus overlay 和统一播放进度条。",
    ],
    trouble: [
      "Pointer Lock 的系统提示框无法被网页隐藏，这是浏览器安全机制，只能通过减少频繁锁定/释放来降低打扰。",
      "第一版更多是在建立接口和约定，视觉、音频 zone、展品按钮映射和真实 gallery_main.glb 都还只是下一步。",
    ],
    next:
      "导入真实 gallery_main.glb，验证 COL_ 碰撞网格；继续补展品按钮、视频通道、脚步声地面映射和 Firewatch 向视觉。",
    tags: ["React", "Rapier", "Overlay", "Focus GLB"],
  },
  {
    id: "devlog-02",
    number: "02",
    period: "2026.05.29 - 06.01",
    title: "从 WebGL 迁到 WebGPU，也撞上了性能和材质问题",
    summary:
      "第二轮开始把主场景推进到 WebGPU。渲染、碰撞、移动手感和部署排查都集中爆发：GTAO、Toon、雾效、Bloom、trimesh、线上白屏和 Blender AO bake 互相牵连，最后选择先稳定在 Toon + Fog + 轻 Bloom 的路线。",
    built: [
      "新增 WebGPU 能力检测、Renderer 初始化、错误边界和不支持 WebGPU 的提示页。",
      "把 SpacePage 和 FocusOverlay 都切到 WebGPURenderer，并移除 WebGL 后处理依赖树。",
      "修复平台和外墙碰撞：root 空间烘焙、双面 trimesh、地面开孔和 autostep 配合解决穿模。",
      "完成 Toon gradientMap、Fog、轻 Bloom 的当前视觉方案，并审计 gallery_main.glb 的三角面分布。",
    ],
    trouble: [
      "WebGPU GTAO 能增强墙根结构，但开销明显；与 Toon/Basic 组合时还会出现过暗或全黑。",
      "关掉 GTAO 后场景太白、结构不清，只能用 Toon 色带、雾和分层补光重新找可读性。",
      "线上白屏并不是单一代码问题，也可能来自只上传 index.html、assets 缺失或 JS 404。",
      "Blender AO bake 卡在 active Image Texture 节点选择，说明资产流程也需要被明确记录。",
    ],
    next:
      "继续推进 Blender AO 烘焙，用资产内 AO 替代实时 GTAO；降低 exhibit_demo_box 面数，并规范完整 dist 上传流程。",
    tags: ["WebGPU", "Toon", "Trimesh", "AO Bake"],
  },
  {
    id: "devlog-03",
    number: "03",
    period: "2026.06.02 - 06.03",
    title: "让展品真的能被看见，也把一些交互方案退回来",
    summary:
      "第三轮把展品 Focus 做到可用：准星瞄准、左键进入、背景虚化、独立透明 Canvas、Orbit 旋转、入口白屏和 pivot 优先策略都完成了。但这轮也留下了几次明确回退，尤其是 Focus 内按钮 hover 与 billboard。",
    built: [
      "中心射线从子 mesh 向父级冒泡查找 exhibitId，并把入口从 E 键改为左键 mousedown。",
      "Focus 时释放 pointer lock、禁用底层 Canvas 事件，前景使用独立透明 WebGPU Canvas 和 OrbitControls。",
      "完成 300ms blur/dim 与 150ms 内容淡入的分段动画，以及 ESC 和右上角关闭。",
      "入口白屏改为 2 秒线性淡出，准星支持展品高亮和空点击脉冲反馈。",
    ],
    trouble: [
      "Pointer lock 下 click 不稳定，改成 mousedown 才让左键 Focus 可靠。",
      "曾经在顶层捕获并 stopPropagation，导致 Focus 内 Orbit 拖转只能拖一次甚至无法拖动，最终回退为底层 Canvas pointer-events none。",
      "准星 idle 动画和 pulse 动画叠加后会连闪两次，最后移除常驻 idle。",
      "按钮 hover emissive 与 Html billboard 虽然做完，但不符合后续交互方向，整段回退等待新方案。",
    ],
    next:
      "重新设计 Focus 三按钮的 hover、状态和 billboard；继续补媒体资源，并优先从 Blender 去重面或 AO 资产侧解决视觉闪动。",
    tags: ["Focus", "Pointer Lock", "Splash", "Rollback"],
  },
  {
    id: "devlog-04",
    number: "04",
    period: "2026.06.07 - 06.08",
    title: "从 Cursor/projectless 迁移到 Codex，并把项目重新拉回可验证状态",
    summary:
      "第四轮是一次接管和修复：上下文从 Cursor 与 projectless chat 迁移到 Codex App Projects，先把 lint、TypeScript、构建、包体和资源加载恢复到可验证状态，再继续修 Focus、入口彩蛋、跳跃彩蛋和展品资产表。",
    built: [
      "修复 React hooks 新规则造成的 P1 lint 阻断，并拆分 GallerySpawnContext 以满足 Fast Refresh。",
      "把 SpaceDesktopExperience 和 FocusOverlay 改为 lazy 加载，再用 Rolldown groups 拆出 React、Three 和 Rapier vendor。",
      "将 Draco decoder 本地化到 /draco/，避免 useGLTF 从 gstatic 拉取失败。",
      "修正 demo_box Focus 旋转中心，新增入口点击彩蛋、第一人称跳跃彩蛋和基于脚步声生成的起跳/落地音。",
      "用最新 CSV 重新生成 exhibit-asset-tracker.xlsx，让 demo_box 与 demo_bass 在资产表中一致。",
    ],
    trouble: [
      "lint failure 集中来自 render 阶段 ref 读写、effect 内同步 setState 和 Three/R3F 必要 imperative mutation，需要逐类处理。",
      "主入口 chunk 曾经超过 4 MB，拆包后入口降到约 148 KB，但 Three/Rapier vendor 体积仍是已知现实。",
      "Draco 外链失败会让主模型加载异常，表面现象甚至会变成出生点很远、WASD 无效。",
      "旧 dist 中残留大 GLB 会误导本地预览，必须重新 build 并检查 dist 内无 20 MB 以上残留文件。",
      "Excel 与 CSV 内容不一致，暴露出展品资产流程需要单一事实源。",
    ],
    next:
      "继续手动 QA 跳跃手感和音量；重做 Focus 三按钮交互；上线前确认 /draco/、/audio/、/exhibits/ 等静态资源完整上传。",
    tags: ["Codex", "Lint", "Chunk Split", "Draco"],
  },
  {
    id: "devlog-05",
    number: "05",
    period: "2026.06.09 - 06.16",
    title: "稳住桌面基准，然后为手机做一套 Terminal Site",
    summary:
      "第五轮分成两条线：桌面端继续整理入口、Pointer Lock、cursor、Frosted Split Overlay、DevStories 和 space_main 生产资产；手机端不再硬塞 WebGPU SPACE，而是重做成独立的 Terminal Site，用四个 terminal 文档承载 Projects、Skills.md、Soul.md 和 Contact.md。",
    built: [
      "桌面入口等待 canvas ready 后再进入，并在同一用户手势里请求 pointer lock；Overlay 关闭继续同步 cursor return 和第一人称恢复。",
      "把 Profile / DevStories 稳定在 Frosted Split：白色 Profile、黑色 DevStories、滑动分界线、低密度 index、+ / - detail，以及一次 wheel gesture 只翻一条的滚轮目录。",
      "将生产主空间切到 space_main.blend / space_main.glb，运行时加载 /models/space_main.glb?v=20260614-space-main，并把 gallery_main 明确降为历史 demo。",
      "新增手机端 MobileExperience 和 mobileArchiveData：手机只加载 terminal 页面，不导入桌面 TopBar、Overlay、WebGPU SPACE 或 DevStories。",
      "手机端完成 terminal boot、Projects / Skills.md / Soul.md / Contact.md 四个 tab、项目详情、中英文 copy、Light/Dark 设置、自托管 Ubuntu Mono、圆形 theme reveal、滚动折叠 header 和 fold section 动效。",
    ],
    trouble: [
      "手机端复用桌面 SPACE 会带来 WebGPU、Pointer Lock 和 Overlay 负担，最后改成平台分支加独立 terminal site。",
      "boot 固定 3 秒无法处理字体慢加载，改为最短 3000ms、最长 10000ms，并等待 document.fonts.load，失败后进入 fallback。",
      "手机 header 折叠初版让正文像被钉住，改为连续 CSS variables，同时分开计算 content 和 nav 的滚动补偿。",
      "文本 load animation 放在滚动补偿容器上会造成布局抖动，最后下沉到内部 load layer。",
      "触控板惯性会让桌面 DevStories 滚轮目录连续跳页，wheel paging 改为 gesture lock 后用脚本锁定行为。",
    ],
    next:
      "下一轮重点是真机手机 QA：iPhone Safari、Android Chrome 的滚动折叠、safe-area、字体 fallback、主题 reveal 和 Contact 链接；同时继续把 12 个 project slot 替换成真实内容，并回到桌面 Focus 三按钮与 exhibit_* hit mesh。",
    tags: ["Mobile", "Terminal Site", "space_main", "Frosted Split"],
  },
  {
    id: "devlog-06",
    number: "06",
    period: "2026.06.17 - 06.22",
    title: "把跨平台开发和 space_main 资产管线接稳",
    summary:
      "第六轮把项目从单机连续开发推进到跨平台协作：Windows Codex 分支接入 GitHub，macOS 本机继续作为 Blender 和视觉 QA 的事实源。同时，桌面 cursor、Pointer Lock、入口彩蛋、出生点和主空间模型材质都继续收口，space_main 的楼梯、LED、碰撞和 spawn 开始进入更稳定的资产管线。",
    built: [
      "补齐 LizzardKevin 个人页和 DevStories 内容层，让个人网页既能作为传统简历，也能在同一 Overlay 中阅读开发故事。",
      "建立全局自定义 cursor：圆点、hover、点击脉冲、文字选择、滚动粒子、Focus 拖拽八角星，以及回第一人称前的 500ms 回中心动画。",
      "处理 Alt / ESC 释放 pointer lock 后的 cursor 漂移，让圆点从中心动画飞向真实系统鼠标位置，并在鼠标移动时持续更新目标。",
      "把 Windows Codex 的 cross-platform 分支合入项目，并确认 `.nvmrc`、package scripts、lockfile 和 contract test 适合双平台继续开发。",
      "将 Blender 里的 Plain Axes Empty 规范为 `spawn_player_main`，出生后平视朝 Blender -Y，并让 runtime 在缺少地板碰撞时使用 marker 自身高度。",
      "改用 Blender Python Console 作为默认资产批处理方式，保存 blend 后导出覆盖 `space_main.glb`。",
      "生成 69 个 `STRUCT_STAIR_*` 可见楼梯，保留 `COL_STAIR_*` 碰撞体，并给 55 个 `LIGHT_GENERIC_LIGHT_*` 赋 emissive LED 材质。",
    ],
    trouble: [
      "Blender MCP 多次返回不完整 JSON，直接 socket 也超时，最后放弃 MCP 作为本阶段主流程，改用 Python Console 加 JSON report。",
      "重新导入 GLB 后出现 `spawn_player_main` 和 `spawn_player_main.001`，批处理必须保留最新 marker 并清掉重复节点。",
      "新模型只有 `COL_STAIR_*` 时，运行时会隐藏 `COL_` 节点，网页端看起来就像楼梯透明或不存在，因此需要单独生成可见 `STRUCT_STAIR_*`。",
      "generic LED 初始仍是 dark metal 材质，视觉上不发光，需要写入真正的 emissive factor 和 emissive strength。",
      "Node v26 会触发项目 engine warning，并让 `package-lock.json` 产生无意义 metadata 漂移，后续应统一使用 `.nvmrc` 的 Node 24.11.0。",
      "远端 main 和本机 main 曾经分叉；在用户确认本机为最新事实源后，使用 `--force-with-lease` 将远端安全对齐到本机。",
    ],
    next:
      "继续做真实 Chrome 视觉 QA：确认可见楼梯、上楼碰撞、LED 亮度、出生点和移动手感；随后把 `STRUCT_STAIR_*` 视觉/`COL_STAIR_*` 碰撞的双节点规则写回资产命名文档，并开始补正式 `exhibit_*` hit mesh。",
    tags: ["Cross Platform", "Blender", "Cursor", "space_main"],
  },
  {
    id: "devlog-07",
    number: "07",
    period: "2026.06.23 - 06.24",
    title: "把 SPACE 移动手感和 physics tick 收回到可验证状态",
    summary:
      "第七轮集中处理 space_main 新模型进入网页后的运行时排障：先用 dev-only 移动 debug overlay 显示位置、速度、ratio 和当前接触的 COL_*，再确认所谓 Vite/服务器动态 tick 实际是浏览器端 render dt 与 Rapier fixed timestep 混用；最终显式固定 Physics timeStep 和 PlayerController timestep，把速度回到 2.45 / 3.85 基线。",
    built: [
      "新增 space:movement-debug telemetry 和左上角 debug overlay，显示 pos、actual/desired speed、ratio、target、grounded、collision count、vertical velocity 和 contact 名称。",
      "给 floor、COL_* trimesh/cuboid、prop fallback 和 SAFETY_GROUND 注册 collider handle 到名称，方便在真实浏览器中定位碰撞来源。",
      "保守回退自定义 pointer lock controls 到 Drei PointerLockControls，先恢复第一人称视角可用性。",
      "显式设置 SPACE_PHYSICS_TIME_STEP = 1 / 60，并让 PlayerController 使用 PLAYER_PHYSICS_TIME_STEP，不再用 useFrame 的动态 dt 推动物理移动。",
      "将临时翻倍速度回退到 WALK 2.45 / SPRINT 3.85，同时保留 smoothstep 和 lerp 带来的停止惯性。",
    ],
    trouble: [
      "debug ratio 一度看起来稳定，是因为 actual/desired 都用同一个动态 dtRef 归一化，反而掩盖了 physics step 和 render dt 混用。",
      "Vite dev server 被怀疑在跑动态 tick，但排查后确认它只负责 dev server/HMR，真正的问题在浏览器运行时的 timestep 使用。",
      "自定义 guarded pointer lock controls 虽然能过滤异常 delta，但破坏了第一人称视角移动，因此先整段回退。",
      "新 GLB 的碰撞是否异常不能靠体感猜，需要通过 contact 名称回到 Blender 检查对应 COL_*。",
    ],
    next:
      "继续用真实浏览器和 debug overlay 复测移动手感；若鼠标跳闪仍存在，在 Drei PointerLockControls 链路上做最小 delta 防护；同时把异常 contact 名称带回 Blender 检查 COL_* 重叠、法线和 Apply Scale。",
    tags: ["Physics Tick", "Movement Debug", "Rapier", "space_main"],
  },
];
