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
  { label: "Email", value: "TODO" },
  { label: "Instagram", value: "TODO" },
  { label: "GitHub", value: "TODO" },
  { label: "LinkedIn", value: "TODO" },
  { label: "Resume PDF", value: "TODO" },
  { label: "Portfolio PDF", value: "TODO" },
];

export const lizzardKevinSections: ProfileSection[] = [
  {
    id: "profile-education",
    number: "01",
    title: "Education",
    subtitle: "Pratt Institute / Columbia University",
    summary:
      "学生阶段会展示从本科建筑训练到研究生空间研究的连续路径：Pratt 作为基础训练，Columbia 作为更实验、更研究导向的阶段。",
    details: [
      "Pratt Institute：本科阶段、专业方向、studio 项目、代表展板与模型。",
      "Columbia University：研究生阶段、研究方向、课程、实验性空间或 AI 设计项目。",
      "可展示 academic studio、thesis、diagram、模型照片、渲染图、walk-through 视频。",
    ],
    fill: [
      "学位名称、入学/毕业年份、导师或 studio 名称。",
      "每个代表项目的一句话概念、地点、工具、产出图像和是否可公开。",
      "你希望强调的学术关键词：空间叙事、城市、计算设计、AI、建造或影像。",
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
      "职业阶段重点呈现你作为空间设计师和建筑从业者的专业可信度，包括项目类型、职责、交付物和可公开成果。",
    details: [
      "记录公司/事务所、职位、时间范围、项目类型和参与阶段。",
      "展示概念设计、建模、图纸、渲染、材料研究、客户汇报或施工配合等职责。",
      "对保密项目使用脱敏 diagram、抽象模型或文字摘要，而不是强行公开完整图纸。",
    ],
    fill: [
      "三年内参与过的项目数量、类型、规模、地点和团队角色。",
      "每个项目你具体负责的部分，以及是否能公开图片或只公开描述。",
      "可以量化的成果：面积、阶段、方案采纳、交付图纸、展示材料。",
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
      "摄影部分不只是兴趣列表，而是解释你如何观察城市、光线、人物和空间，它可以成为你建筑与 AI 视觉创作之间的桥。",
    details: [
      "整理建筑摄影、街头、人像、旅行、演出现场、城市夜景或胶片/数码系列。",
      "每个系列包含名称、年份、地点、statement、代表照片和发布链接。",
      "可以标注设备、镜头、后期流程、print 或商用授权状态。",
    ],
    fill: [
      "3-6 个最想展示的摄影系列名称。",
      "每组照片的主题关键词：光线、城市、孤独感、现场感、速度、日常切片。",
      "Instagram、小红书、摄影集、print 或授权联系信息。",
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
      "音乐部分展示你作为贝斯手和乐队成员的协作经验、现场感和声音身份，也可以和 SPACE 内的音频展品系统连接。",
    details: [
      "记录乐队名称、音乐风格、演出经历、曲目、排练或录音片段。",
      "展示 bass 型号、pedals、amp、audio interface 或 DAW workflow。",
      "可以放 demo、live recording、rehearsal clip、海报、演出照片和视频链接。",
    ],
    fill: [
      "乐队/项目名称、你的角色、常演风格和代表曲目。",
      "演出日期、场地、城市、阵容、照片、视频或录音。",
      "你希望别人如何理解你的贝斯身份：节奏、低频、舞台、协作或改编。",
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
      "二次元与个人文化部分会以审美来源和叙事影响的方式呈现，而不是直接堆作品名；重点是它们如何影响你的空间、色彩、角色、音乐和 AI 创作。",
    details: [
      "记录动画、漫画、游戏、视觉小说、音乐企划或 ACG cover 对你的影响。",
      "展示原创或 inspired-by 的创作内容，避免直接使用未经授权的官方图像。",
      "可以整理同人摄影、poster、视觉实验、AI image experiments 或 cover 演出。",
    ],
    fill: [
      "对你影响最大的作品、类型和关键词。",
      "这些文化内容具体影响了你的哪部分创作：色彩、叙事、空间、角色、音乐。",
      "可公开展示的原创图像、文字说明、音乐或影像链接。",
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
      "最后一段收纳暂时不属于前面几类的实验：AI 工作流、WebGPU SPACE、写作、研究、奖项、展览和未来合作方向。",
    details: [
      "记录 AI 图像、视频、空间概念生成、prompt design 或 ComfyUI workflow。",
      "展示 Three.js / WebGPU / interactive portfolio 等网页和 3D 实验。",
      "补充 essay、thesis、devlog、publication、award 或 exhibition。",
    ],
    fill: [
      "当前最值得展示的 AI / Web / 3D 实验名称和链接。",
      "可公开的工作流截图、生成结果、设计说明或开发日志。",
      "你希望收到的合作类型：创意技术、空间设计、影像、展览、音乐或 AI workflow。",
    ],
    spaceUse:
      "SPACE 中可以作为持续更新的实验室区域，后续新内容直接扩展为新的展品节点。",
    tags: ["AI", "WebGPU", "Writing", "Experiments"],
  },
];
