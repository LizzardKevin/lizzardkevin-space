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
    period: "2026.06.09 - 06.14",
    title: "把入口、Overlay 和滚轮目录推进成新的前端基准",
    summary:
      "第五轮把 SPACE 的第一屏、第一人称进入、Profile / DevStories 信息界面和验证流程重新整理：入口保留极简白屏但不再像加载失败，点击进入后直接请求第一人称控制，Overlay 从长 feed 改成全屏 Frosted Split，并继续把滚轮目录、Detail 展开和开发日志纳入可验证状态。",
    built: [
      "清理 Profile 和展品内容中的 TODO、占位和测试语气，入口只保留 LizzardKevin Space 与点击进入提示，并让整组文字可点击、可键盘进入、轻微漂浮。",
      "让 SPACE canvas ready 后才允许桌面入口进入，并在同一用户手势里请求 pointer lock；失败时只显示 fallback toast，避免重复 unhandled error。",
      "调整初始视角、Overlay 关闭按钮、ESC / 双击空白关闭和关闭后的 cursor / pointer lock 恢复逻辑。",
      "把 Profile 与 DevStories 重做成全屏 Frosted Split：白色 Profile、黑色 DevStories、半透明毛玻璃、滑动分界线、低密度 index、深浅光标和 clickable text hover。",
      "重做中间 stage 的 wheel paging：慢速跟手、过阈值同时飞出飞入、首尾回弹、一次 gesture 只跳一条，并用独立脚本锁定状态机行为。",
    ],
    trouble: [
      "in-app browser 对 WebGPU 与 Pointer Lock 的自动化限制明显，最终用 Chrome CDP fallback 验证 overlay 尺寸、状态和交互，再保留真实 Chrome 手测要求。",
      "全屏面板初版因为 content-box 宽度叠加 padding，DevStories 顶部说明被裁切，改为 border-box 后修复。",
      "只靠 cooldown 不能阻止触控板惯性连续跳两条，需要改成 gesture lock，直到 wheel 事件真正空闲后才允许下一次选择。",
      "Detail 右侧两位数量看起来像编号但没有实际意义，改为 + / - 后才符合可展开控件的直觉。",
    ],
    next:
      "继续在真实 Chrome 中手测 WebGPU 背景透出、Pointer Lock、触控板滚轮手感和移动端降级；下一轮回到 Focus 三按钮 hover、billboard 和展品媒体资产。",
    tags: ["Frosted Split", "Pointer Lock", "Wheel UX", "DevLog"],
  },
];
