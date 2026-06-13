export type ProfileLink = {
  label: string;
  value: string;
  href?: string;
};

export type ProfileSection = {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  summary: string;
  details: string[];
  fill: string[];
  spaceUse: string;
  tags: string[];
};

export const lizzardKevinIdentity = {
  name: "LizzardKevin",
  displayName: "LizzardKevin",
  roles: ["AI 创意设计师", "空间设计师", "摄影师", "贝斯手", "etc."],
  location: "New York / Shanghai",
  status: "Architecture, creative technology, image-making, music, and personal culture archive.",
  bio:
    "我把建筑训练、空间叙事、摄影观察、乐队经验和 AI 创作方法放在同一个个人档案里。SPACE 会承载更沉浸的展品与作品，而这里保持更传统的简历状态，方便快速理解我是谁、做过什么、还能继续展开什么。",
};

export const lizzardKevinLinks: ProfileLink[] = [
  { label: "Contact", value: "Open for selected collaborations" },
  { label: "Location", value: "New York / Shanghai" },
  { label: "GitHub", value: "LizzardKevin", href: "https://github.com/LizzardKevin" },
  { label: "Practice", value: "Architecture + creative technology" },
  { label: "Archive", value: "Interactive SPACE in progress" },
  { label: "Portfolio", value: "SPACE-first work archive" },
];

export const lizzardKevinSections: ProfileSection[] = [
  {
    id: "profile-education",
    number: "01",
    title: "Education",
    subtitle: "Pratt Institute / Columbia University",
    summary:
      "从 Pratt 的建筑基础训练到 Columbia 更研究导向的空间实验，教育经历构成了我理解尺度、叙事、图像和系统的底层方法。",
    details: [
      "以建筑 studio 训练建立平面、剖面、模型、材料和叙事表达的共同语言。",
      "把研究型课程、空间原型和 AI 辅助设计放进同一套创作方法里。",
      "关注 diagram、模型照片、渲染和 walk-through 之间如何共同讲清一个空间概念。",
    ],
    fill: [
      "Pratt 作为基础档案区，呈现训练强度、图面逻辑和模型语言。",
      "Columbia 作为实验档案区，呈现空间研究、计算设计和 AI 视觉方法。",
      "每个学术节点会以项目图像、短 statement 和可漫游展品连接到 SPACE。",
    ],
    spaceUse:
      "SPACE 中可以做成两段展墙：Pratt 作为基础训练档案，Columbia 作为研究和实验档案。",
    tags: ["Pratt", "Columbia", "Studio", "Research"],
  },
  {
    id: "profile-architecture",
    number: "02",
    title: "Architecture",
    subtitle: "Three-year professional stage",
    summary:
      "三年的建筑职业阶段让空间想法进入真实协作、交付和限制条件中；这里强调的是专业判断、表达能力和项目推进方式。",
    details: [
      "参与概念设计、建模、图纸、渲染、材料研究和汇报材料组织。",
      "在项目类型、尺度和阶段变化中保持清晰的空间叙事与表达标准。",
      "对保密项目采用脱敏 diagram、抽象模型和过程说明，保留专业脉络而不暴露敏感资料。",
    ],
    fill: [
      "职业项目会被整理成一条空间走廊，按项目阶段和参与角色组织。",
      "公开素材会展示图像、模型、局部细节和简短职责说明。",
      "非公开素材会以抽象空间切片呈现，让访问者理解工作方式而不是浏览机密图纸。",
    ],
    spaceUse:
      "SPACE 中可以做成一条职业走廊，每个建筑项目是一个展品节点，保密项目用抽象信息呈现。",
    tags: ["Spatial Design", "Professional", "Drawing", "Visualization"],
  },
  {
    id: "profile-photography",
    number: "03",
    title: "Photography",
    subtitle: "Image-making and spatial observation",
    summary:
      "摄影是我训练观察的方式：城市、光线、人物、速度和偶然性会反过来影响空间设计与 AI 视觉创作。",
    details: [
      "关注建筑、街头、夜景、演出现场和旅行切片中的空间气氛。",
      "用系列化方式整理图像，让照片不只是单张漂亮画面，而是持续的观察档案。",
      "把摄影中的构图、光比和色彩经验转译到 WebGPU 展厅和 AI 图像实验里。",
    ],
    fill: [
      "照片墙会以系列为单位展开，每组照片保留地点、时间和简短 statement。",
      "影像展区会更像暗房或城市切片，而不是普通相册网格。",
      "可公开图像会连接到外部发布渠道，未公开图像只在 SPACE 中以策展方式出现。",
    ],
    spaceUse:
      "SPACE 中可以做成照片墙、暗房或城市切片区域，让影像成为独立展区。",
    tags: ["Photography", "City", "Light", "Archive"],
  },
  {
    id: "profile-music",
    number: "04",
    title: "Music / Band",
    subtitle: "Bass, rehearsal, live performance",
    summary:
      "贝斯和乐队经验给这个个人档案带来声音、低频和现场感；它也是 SPACE 音频展品系统最自然的内容来源。",
    details: [
      "从排练、demo、live recording 和演出照片中提取声音身份。",
      "关注贝斯线如何支撑节奏、空间和舞台氛围，而不只展示器材清单。",
      "把音频播放、进度条和 Focus 展品连接起来，让作品可以被听见也可以被观看。",
    ],
    fill: [
      "音乐区域会以 rehearsal corner 的方式呈现，保留器材、海报和声音片段。",
      "可播放展品会连接 demo、live clip 或低频 loop。",
      "每个声音节点会保留简单背景：场景、曲目状态、参与角色和记录时间。",
    ],
    spaceUse:
      "SPACE 中可以做成 rehearsal corner 或声音展品，点击后播放 demo、live clip 或 bass line。",
    tags: ["Bass", "Band", "Live", "Audio"],
  },
  {
    id: "profile-culture",
    number: "05",
    title: "Anime / Culture",
    subtitle: "Personal references and visual influence",
    summary:
      "个人文化影响会以审美来源和叙事影响的方式进入档案，而不是直接堆作品名；重点是它们如何改变我的空间、色彩和角色想象。",
    details: [
      "把动画、漫画、游戏、视觉小说和音乐企划作为个人审美来源来整理。",
      "优先展示原创、inspired-by 或实验性作品，避免直接搬运未经授权的官方图像。",
      "关注色彩、角色气质、空间叙事和音乐情绪如何在不同媒介之间迁移。",
    ],
    fill: [
      "文化影响区会更像 reference archive，展示原创图像、poster、AI 实验和文字说明。",
      "每个节点解释影响来自哪里，以及它如何进入空间、影像或声音创作。",
      "公开呈现以原创内容为主，引用内容只作为文本层面的线索。",
    ],
    spaceUse:
      "SPACE 中可以做成文化影响档案区，展示原创内容和灵感说明，而不是直接搬运官方素材。",
    tags: ["Anime", "Culture", "Visual References", "Original Work"],
  },
  {
    id: "profile-experiments",
    number: "06",
    title: "Other / Experiments",
    subtitle: "AI, web, writing, and future work",
    summary:
      "这一段收纳 AI、WebGPU、写作和其他暂时无法归类的实验；它是 SPACE 持续生长的实验室。",
    details: [
      "整理 AI 图像、视频、空间概念生成、prompt design 和 workflow 研究。",
      "把 Three.js、WebGPU 和 interactive portfolio 当作真实作品载体，而不是技术 demo。",
      "保留 essay、devlog、研究笔记和实验失败记录，让过程本身成为档案的一部分。",
    ],
    fill: [
      "实验室区域会持续追加新展品，包含生成结果、过程截图和设计说明。",
      "DevStories 会成为技术叙事层，解释每轮构建如何改变 SPACE。",
      "合作方向会围绕创意技术、空间设计、影像、展览、音乐和 AI workflow 展开。",
    ],
    spaceUse:
      "SPACE 中可以作为持续更新的实验室区域，后续新内容直接扩展为新的展品节点。",
    tags: ["AI", "WebGPU", "Writing", "Experiments"],
  },
];
