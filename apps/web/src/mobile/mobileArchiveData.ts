export type MobileTabId = "projects" | "skills" | "soul" | "contact";

export type MobileProjectStageId =
  | "stage-student"
  | "stage-work"
  | "stage-music"
  | "stage-culture"
  | "stage-explore";

export type MobileProjectCategory =
  | "Study"
  | "Architecture"
  | "Music"
  | "Culture"
  | "Experiment";

export type MobileMediaKind = "image" | "audio" | "video" | "model" | "text";

export type MobileLocalizedText = {
  en: string;
  zh: string;
};

export type MobileProjectItem = {
  id: string;
  title: string;
  subtitle?: MobileLocalizedText;
  indexLabel: string;
  category: MobileProjectCategory;
  stageId: MobileProjectStageId;
  stageLabel: string;
  tags?: string[];
  summary: MobileLocalizedText;
  story?: MobileLocalizedText;
  signal: MobileLocalizedText;
  spaceLayer: MobileLocalizedText;
  archiveNote: MobileLocalizedText;
  mediaKind: MobileMediaKind;
  mediaStatus: MobileLocalizedText;
  imageUrls?: string[];
};

export type MobileSkillCategory = "ai" | "architecture" | "soft" | "digital" | "analog";

export type MobileSkillEntry = {
  id: string;
  label: string;
  category: MobileSkillCategory;
  summary: MobileLocalizedText;
};

export type MobileContactValue = {
  text: string;
  href?: string;
};

export type MobileContactLine = {
  label: string;
  values: MobileContactValue[];
};

export type MobileTerminalLanguage = "en" | "zh";

export type MobileTerminalTheme = "light" | "dark";

export type MobileTab = {
  id: MobileTabId;
  label: string;
};

export const mobileTabs: MobileTab[] = [
  {
    id: "projects",
    label: "Projects",
  },
  {
    id: "skills",
    label: "Skills.md",
  },
  {
    id: "soul",
    label: "Soul.md",
  },
  {
    id: "contact",
    label: "Contact.md",
  },
];

export const mobileTerminalCopy = {
  en: {
    boot: {
      command: "$ space-cli boot --mode mobile",
      status: "loading terminal session...",
    },
    settings: {
      label: "Terminal settings",
      language: "Language",
      theme: "Theme",
      english: "EN",
      chinese: "中文",
      light: "Light",
      dark: "Dark",
    },
    aria: {
      settings: "Terminal settings",
      sections: "Mobile terminal sections",
      museum: "Mobile terminal museum",
      loading: "Mobile terminal loading",
      idle: "Mobile terminal idle",
    },
    projectDetails: {
      currentSignal: "Current Signal",
      spaceLayer: "SPACE Layer",
      archiveNote: "Archive Note",
      tags: "tags",
      media: "media",
      imageAlt: "image",
    },
    projects: {
      command: "$ open Projects",
      lede:
        "A phone-readable index for future exhibition rooms. Project details stay text-first until real media is ready.",
    },
    skills: {
      command: "$ cat Skills.md",
      lede:
        "A static skill document for quick scanning. Detailed examples will attach to project entries later.",
    },
    soul: {
      command: "$ cat Soul.md",
      bio:
        "LizzardKevin is an architecture-trained creative technologist working across spatial design, AI image workflows, web experiments, photography, music, and personal culture archives.",
      sections: [
        {
          title: "Education",
          meta: "Pratt Institute / Columbia University",
          summary:
            "Architectural studio training shaped the way I read scale, sequence, model logic, and visual systems.",
          details: [
            "Built a foundation in drawings, sections, physical models, research boards, and spatial storytelling.",
            "Moved toward computational and AI-assisted methods through research-led spatial experiments.",
          ],
        },
        {
          title: "Professional Practice",
          meta: "Professional practice",
          summary:
            "Three years of practice turned spatial ideas into collaboration, delivery, constraints, and presentation logic.",
          details: [
            "Worked across concept design, modeling, drawings, visualization, material studies, and presentation packages.",
            "Public work will be shown through abstracted diagrams and non-confidential process fragments.",
          ],
        },
        {
          title: "Persona",
          meta: "Personal archive",
          summary:
            "Photography, bass practice, band memory, anime, games, and visual references define the personal side of the archive.",
          details: [
            "Images are treated as observation systems rather than single portfolio shots.",
            "Music and culture rooms hold sound, posters, references, and original experiment nodes.",
          ],
        },
        {
          title: "Rule",
          meta: "Working principles",
          summary:
            "The work favors fast tests, readable process, precise visual decisions, and tools that serve the idea.",
          details: [
            "Mobile remains text-first and lightweight while desktop SPACE carries heavier media and interaction.",
            "Unfinished work can stay visible when the process explains why it matters.",
          ],
        },
      ],
    },
    contact: {
      command: "$ cat Contact.md",
      name: "Wang Tianyi",
      roleLine: "AI Visual Creator/ Architect/ Photographer/ Bassist",
      lines: [
        {
          label: "contact",
          values: [
            { text: "+86 13682600019", href: "tel:+8613682600019" },
            { text: "lizzardkevin@gmail.com", href: "mailto:lizzardkevin@gmail.com" },
          ],
        },
        {
          label: "location",
          values: [{ text: "Shenzhen, China" }],
        },
        {
          label: "github",
          values: [{ text: "lizzardkevin", href: "https://github.com/lizzardkevin" }],
        },
        {
          label: "practice",
          values: [{ text: "(spatial + visual + AI) x Creativity" }],
        },
      ],
      note: "mobile terminal only gives brief index. Desktop opens full SPACE experience.",
    },
  },
  zh: {
    boot: {
      command: "$ space-cli boot --mode mobile",
      status: "loading terminal session...",
    },
    settings: {
      label: "终端设置",
      language: "语言",
      theme: "主题",
      english: "EN",
      chinese: "中文",
      light: "白底",
      dark: "黑底",
    },
    aria: {
      settings: "终端设置",
      sections: "移动端 terminal 栏目",
      museum: "移动端 terminal 博物馆",
      loading: "移动端 terminal 加载中",
      idle: "移动端 terminal 待机",
    },
    projectDetails: {
      currentSignal: "当前信号",
      spaceLayer: "SPACE 层级",
      archiveNote: "档案备注",
      tags: "标签",
      media: "媒体",
      imageAlt: "图片",
    },
    projects: {
      command: "$ open Projects",
      lede: "适合手机快速阅读的展厅索引。真实媒体完成前，项目详情先保持文字优先。",
    },
    skills: {
      command: "$ cat Skills.md",
      lede: "用于快速扫描的能力文档。更具体的例子之后会连接到项目条目。",
    },
    soul: {
      command: "$ cat Soul.md",
      bio:
        "我把建筑训练、空间叙事、摄影观察、乐队经验和 AI 创作方法放在同一个个人档案里。",
      sections: [
        {
          title: "Education",
          meta: "Pratt Institute / Columbia University",
          summary: "建筑 studio 训练建立了我理解尺度、叙事、图像和系统的底层方法。",
          details: [
            "用图纸、剖面、模型、材料和研究板建立空间表达语言。",
            "把研究型课程、空间原型和 AI 辅助设计放进同一套创作方法里。",
          ],
        },
        {
          title: "Professional Practice",
          meta: "三年职业阶段",
          summary: "三年的建筑职业阶段让空间想法进入真实协作、交付和限制条件中。",
          details: [
            "参与概念设计、建模、图纸、渲染、材料研究和汇报材料组织。",
            "保密内容会用抽象 diagram、模型切片和过程说明替代。",
          ],
        },
        {
          title: "Persona",
          meta: "个人档案",
          summary: "摄影、贝斯、乐队经验、动画、游戏和视觉参考构成个人档案中更私人的部分。",
          details: [
            "摄影更像持续观察系统，而不是普通相册。",
            "音乐和文化区域会成为声音、海报、参考和原创实验节点。",
          ],
        },
        {
          title: "Rule",
          meta: "工作原则",
          summary: "创作优先保持快速测试、过程可读、视觉判断明确，以及工具服务于想法。",
          details: [
            "移动端保持文字优先和轻量，桌面 SPACE 承载更重的媒体和完整交互。",
            "未完成的内容可以保留，只要过程本身说明了它为什么重要。",
          ],
        },
      ],
    },
    contact: {
      command: "$ cat Contact.md",
      name: "王天奕",
      roleLine: "AI视觉创作者 / 建筑师 / 摄影师 / 贝斯手",
      lines: [
        {
          label: "contact",
          values: [
            { text: "+86 13682600019", href: "tel:+8613682600019" },
            { text: "lizzardkevin@gmail.com", href: "mailto:lizzardkevin@gmail.com" },
          ],
        },
        {
          label: "location",
          values: [{ text: "深圳，中国" }],
        },
        {
          label: "github",
          values: [{ text: "lizzardkevin", href: "https://github.com/lizzardkevin" }],
        },
        {
          label: "practice",
          values: [{ text: "(空间 + 视觉 + AI) x 创造力" }],
        },
      ],
      note: "移动端 terminal 只提供简要索引。桌面端会打开完整的 SPACE 体验。",
    },
  },
} satisfies Record<
  MobileTerminalLanguage,
  {
    boot: { command: string; status: string };
    settings: {
      label: string;
      language: string;
      theme: string;
      english: string;
      chinese: string;
      light: string;
      dark: string;
    };
    aria: {
      settings: string;
      sections: string;
      museum: string;
      loading: string;
      idle: string;
    };
    projectDetails: {
      currentSignal: string;
      spaceLayer: string;
      archiveNote: string;
      tags: string;
      media: string;
      imageAlt: string;
    };
    projects: { command: string; lede: string };
    skills: { command: string; lede: string };
    soul: {
      command: string;
      bio: string;
      sections: { title: string; meta: string; summary: string; details: string[] }[];
    };
    contact: { command: string; name: string; roleLine: string; lines: MobileContactLine[]; note: string };
  }
>;

export const mobileProjectItems: MobileProjectItem[] = [
  {
    id: "arch_treehabitat",
    title: "Tree Habitat",
    subtitle: {
      en: "Academic architecture study for a speculative vertical habitat",
      zh: "学生阶段的推想型垂直栖居建筑研究",
    },
    indexLabel: "Student Room / Academic Architecture",
    category: "Study",
    stageId: "stage-student",
    stageLabel: "Education",
    tags: ["student work", "mixed use", "highrise building", "architecture"],
    summary: {
      en: "A student-era architecture project that studies how a dense tower can act as an urban habitat shaped by mangrove structure, mixed use, circulation, and planted sky levels.",
      zh: "一个学生阶段建筑作品，研究高密度塔楼如何借由红树林结构、复合功能、动线和空中绿化，成为一种城市栖居系统。",
    },
    story: {
      en: "Tree Habitat is presented here as academic architecture, not as a built or commercial project. The focus is the learning-stage design question: how to translate ecological structure into section, circulation, program stacking, and architectural representation.",
      zh: "Tree Habitat 在这里作为学生阶段建筑作品呈现，而不是已建成或商业项目。重点是学习阶段的设计命题：如何把生态结构转译成剖面、动线、功能叠合和建筑表达。",
    },
    signal: {
      en: "The project should read as academic architecture and spatial design research, with the model and images serving the concept rather than claiming finished delivery.",
      zh: "这个项目应被读作 academic architecture 和 spatial design research；模型与图片服务于概念，而不是包装成成熟交付项目。",
    },
    spaceLayer: {
      en: "Education layer / Student Room entry for architecture studio work, image boards, model views, and concept notes.",
      zh: "Education layer / Student Room 条目，用于承载建筑 studio 作品、图像板、模型视角和概念说明。",
    },
    archiveNote: {
      en: "Mobile keeps this entry text-and-image first. The 3D model remains a desktop Focus artifact and is not shown in the phone view.",
      zh: "移动端保持文字和图片优先。3D 模型保留给桌面端 Focus，不在手机页面展示。",
    },
    mediaKind: "image",
    mediaStatus: {
      en: "image sequence / no mobile 3D",
      zh: "图片序列 / 手机端不展示 3D",
    },
    imageUrls: [
      "/exhibits/arch_treehabitat/img/FL-1.webp",
      "/exhibits/arch_treehabitat/img/FL-2.webp",
      "/exhibits/arch_treehabitat/img/FL-3.webp",
      "/exhibits/arch_treehabitat/img/FL-6.webp",
      "/exhibits/arch_treehabitat/img/FL-8.webp",
      "/exhibits/arch_treehabitat/img/FL-9.webp",
      "/exhibits/arch_treehabitat/img/FL-10.webp",
      "/exhibits/arch_treehabitat/img/FL-11.webp",
      "/exhibits/arch_treehabitat/img/FL-12.webp",
      "/exhibits/arch_treehabitat/img/FL-13.webp",
      "/exhibits/arch_treehabitat/img/FL-14.webp",
      "/exhibits/arch_treehabitat/img/FL-15.webp",
      "/exhibits/arch_treehabitat/img/FL-16.webp",
      "/exhibits/arch_treehabitat/img/FL-17.webp",
      "/exhibits/arch_treehabitat/img/FL-18.webp",
      "/exhibits/arch_treehabitat/img/FL-19.webp",
      "/exhibits/arch_treehabitat/img/FL-20.webp",
      "/exhibits/arch_treehabitat/img/FL-21.webp",
      "/exhibits/arch_treehabitat/img/FL-22.webp",
      "/exhibits/arch_treehabitat/img/FL-23.webp",
      "/exhibits/arch_treehabitat/img/FL-24.webp",
      "/exhibits/arch_treehabitat/img/FL-25.webp",
      "/exhibits/arch_treehabitat/img/FL-26.webp",
    ],
  },
  {
    id: "arch_uabb_exhibit",
    title: "UABB Exhibit",
    subtitle: {
      en: "Urban research and exhibition model study for Shenzhen's everyday spatial systems",
      zh: "围绕深圳日常空间系统的城市研究与展览模型研究",
    },
    indexLabel: "Student Room / Urban Research",
    category: "Study",
    stageId: "stage-student",
    stageLabel: "Education",
    tags: ["urban research", "field observation", "exhibition proposal"],
    summary: {
      en: "An architecture-school research project that turns Shenzhen field observation, public interfaces, informal economies, and mapping work into a spatial exhibition model.",
      zh: "一个建筑学习阶段的研究项目，把深圳现场观察、公共界面、非正式经济和 mapping 工作转译成一个空间展览模型。",
    },
    story: {
      en: "UABB Exhibit sits between urban research and exhibition design. It studies how ordinary street fragments, commercial rhythms, thresholds, and service spaces can be compressed into a model that reads like a spatial archive.",
      zh: "UABB Exhibit 位于城市研究与展览设计之间。它研究日常街道片段、商业节奏、门槛空间和服务空间如何被压缩成一个像空间档案一样可阅读的模型。",
    },
    signal: {
      en: "The work should read as research translated into space: observation, mapping, model logic, and exhibition language working together.",
      zh: "这个作品应被读作被转译为空间的研究：观察、mapping、模型逻辑和展览语言共同工作。",
    },
    spaceLayer: {
      en: "Education layer / Urban research entry for model-based exhibition thinking and future research boards.",
      zh: "Education layer / Urban research 条目，用于承载基于模型的展览思考和未来研究板内容。",
    },
    archiveNote: {
      en: "Mobile keeps the project text-first while desktop SPACE carries the heavier model artifact.",
      zh: "移动端先保持文字优先；较重的模型展品由桌面端 SPACE 承载。",
    },
    mediaKind: "model",
    mediaStatus: {
      en: "desktop model exhibit / mobile text index",
      zh: "桌面端模型展品 / 移动端文字索引",
    },
  },
  {
    id: "arch_3d_printing_architecture",
    title: "3D Printing Architecture",
    subtitle: {
      en: "Architecture prototype study pairing a printed spatial model with process animation",
      zh: "结合 3D 打印空间模型与过程动画的建筑原型研究",
    },
    indexLabel: "Student Room / Fabrication Study",
    category: "Study",
    stageId: "stage-student",
    stageLabel: "Education",
    tags: ["student work", "3d printing", "architecture animation"],
    summary: {
      en: "A 2021 student work where a desktop model and architecture animation simulate crane-supported construction with 3D-printed cement, staged 0.9-meter thresholds, and prefab components.",
      zh: "一个 2021 年学生作品：通过桌面端模型与建筑动画，模拟吊车辅助、3D 打印水泥、0.9 米阶段控制和预制构件协同的建造方式。",
    },
    story: {
      en: "The process animation imagines a predesigned building that can be rapidly assembled: printed cementitious walls rise in 0.9-meter stages, prefab structural pieces and components are inserted at key moments, and the whole system can be rapidly iterated before a full build.",
      zh: "过程动画想象一个预先设计好的建筑如何被快速搭建：水泥打印墙体以 0.9 米为阶段逐层生长，预制结构件和组件在关键节点介入，整套系统可以在完整建造前快速迭代。",
    },
    signal: {
      en: "The work should feel compact and process-led: model first, one animation second, with no extra documentation noise.",
      zh: "这个作品应该保持紧凑并以过程为主：先看模型，再看一个动画，不加入多余文档噪音。",
    },
    spaceLayer: {
      en: "Education layer / Fabrication entry for physical modeling, 3D printing, and process video.",
      zh: "Education layer / Fabrication 条目，用于呈现实体模型、3D 打印和过程视频。",
    },
    archiveNote: {
      en: "Mobile describes the artifact; desktop Focus shows the rotatable model and MP4 process animation.",
      zh: "移动端描述作品；桌面端 Focus 展示可旋转模型和 MP4 过程动画。",
    },
    mediaKind: "video",
    mediaStatus: {
      en: "desktop model + process animation",
      zh: "桌面端模型 + 过程动画",
    },
  },
  {
    id: "project-02",
    title: "Project 02",
    indexLabel: "Student Room / Object 02",
    category: "Study",
    stageId: "stage-student",
    stageLabel: "Education",
    summary: {
      en: "Reserved for Pratt and Columbia work, diagrams, models, and research notes.",
      zh: "预留给 Pratt 和 Columbia 阶段的作品、diagram、模型和研究笔记。",
    },
    signal: {
      en: "Academic research, diagram logic, and studio traces can be collected here.",
      zh: "学术研究、diagram 逻辑和 studio 过程痕迹会收纳在这里。",
    },
    spaceLayer: {
      en: "Study wall slot for still images, research boards, and layered notes.",
      zh: "Study wall 的对象位，用于静态图像、研究板和分层笔记。",
    },
    archiveNote: {
      en: "Keep this as a second student-stage project position for deeper process material.",
      zh: "保留为第二个学生阶段位置，用于更深入的过程材料。",
    },
    mediaKind: "image",
    mediaStatus: {
      en: "image sequence reserved",
      zh: "预留 image sequence",
    },
  },
  {
    id: "project-03",
    title: "Project 03",
    indexLabel: "Work Room / Object 01",
    category: "Architecture",
    stageId: "stage-work",
    stageLabel: "Professional Practice",
    summary: {
      en: "Reserved for abstracted professional roles, workflows, and delivery logic.",
      zh: "预留给抽象化处理后的职业角色、工作流和交付逻辑。",
    },
    signal: {
      en: "Professional practice is represented through workflow, responsibility, and delivery logic.",
      zh: "职业阶段会通过工作流、职责范围和交付逻辑来呈现。",
    },
    spaceLayer: {
      en: "Work room fragment for text-led cases and non-confidential process records.",
      zh: "Work room 中的片段，用于文字主导的案例和非保密过程记录。",
    },
    archiveNote: {
      en: "Replace with abstracted office-era material that can be shown publicly.",
      zh: "之后替换为可以公开展示的抽象化办公室阶段材料。",
    },
    mediaKind: "text",
    mediaStatus: {
      en: "case note reserved",
      zh: "预留 case note",
    },
  },
  {
    id: "project-04",
    title: "Project 04",
    indexLabel: "Work Room / Object 02",
    category: "Architecture",
    stageId: "stage-work",
    stageLabel: "Professional Practice",
    summary: {
      en: "Reserved for non-confidential architecture fragments, spatial diagrams, and visual output.",
      zh: "预留给非保密建筑片段、空间 diagram 和视觉产出。",
    },
    signal: {
      en: "Built-environment thinking can sit here without exposing restricted project details.",
      zh: "这里可以展示建筑环境思考，同时不暴露受限制的项目细节。",
    },
    spaceLayer: {
      en: "Practice object slot for spatial diagrams, model shells, and visual output.",
      zh: "Practice 对象位，用于空间 diagram、模型外壳和视觉输出。",
    },
    archiveNote: {
      en: "Use this entry for architecture material once disclosure boundaries are clear.",
      zh: "当公开边界明确后，用这个条目放置建筑相关材料。",
    },
    mediaKind: "model",
    mediaStatus: {
      en: "model shell reserved",
      zh: "预留 model shell",
    },
  },
  {
    id: "project-05",
    title: "Project 05",
    indexLabel: "Music Room / Object 01",
    category: "Music",
    stageId: "stage-music",
    stageLabel: "Personal Archive",
    summary: {
      en: "Reserved for bass lines, rehearsal recordings, and live fragments.",
      zh: "预留给 bass line、排练录音和现场片段。",
    },
    signal: {
      en: "Music appears as rhythm, practice memory, and low-frequency personal material.",
      zh: "音乐会以节奏、练习记忆和低频个人材料的方式出现。",
    },
    spaceLayer: {
      en: "Music room object slot for audio fragments and future playback controls.",
      zh: "Music room 的对象位，用于音频片段和之后的播放控制。",
    },
    archiveNote: {
      en: "Keep the copy short so sound or score can become the main exhibit later.",
      zh: "文字保持短，让声音或谱面之后成为主要展品。",
    },
    mediaKind: "audio",
    mediaStatus: {
      en: "audio player reserved",
      zh: "预留 audio player",
    },
  },
  {
    id: "project-06",
    title: "Project 06",
    indexLabel: "Music Room / Object 02",
    category: "Music",
    stageId: "stage-music",
    stageLabel: "Personal Archive",
    summary: {
      en: "Reserved for band process, stage memory, instruments, posters, and sound notes.",
      zh: "预留给乐队过程、舞台记忆、乐器、海报和声音笔记。",
    },
    signal: {
      en: "Performance context, rehearsal traces, and band artifacts can be assembled here.",
      zh: "演出语境、排练痕迹和乐队物件可以在这里组合。",
    },
    spaceLayer: {
      en: "Music room media slot for video, posters, instruments, and sound notes.",
      zh: "Music room 的媒体位，用于 video、poster、乐器和声音笔记。",
    },
    archiveNote: {
      en: "Use this for material that needs movement rather than a static index row.",
      zh: "用于那些需要动态呈现，而不是只放静态索引行的材料。",
    },
    mediaKind: "video",
    mediaStatus: {
      en: "video slot reserved",
      zh: "预留 video slot",
    },
  },
  {
    id: "project-07",
    title: "Project 07",
    indexLabel: "Culture Room / Object 01",
    category: "Culture",
    stageId: "stage-culture",
    stageLabel: "Personal Archive",
    summary: {
      en: "Reserved for influence mapping, original studies, and visual references.",
      zh: "预留给影响来源 mapping、原创研究和视觉参考。",
    },
    signal: {
      en: "Reference culture and personal taste are treated as source material, not decoration.",
      zh: "参考文化和个人审美在这里被当作创作材料，而不是装饰。",
    },
    spaceLayer: {
      en: "Culture room shelf for influence maps, image studies, and annotated references.",
      zh: "Culture room 的 shelf，用于影响图谱、图像研究和带注释的参考。",
    },
    archiveNote: {
      en: "Replace with references only when they connect clearly to original work.",
      zh: "只有当参考能清楚连接到原创产出时，再替换进这个位置。",
    },
    mediaKind: "image",
    mediaStatus: {
      en: "image board reserved",
      zh: "预留 image board",
    },
  },
  {
    id: "project-08",
    title: "Project 08",
    indexLabel: "Culture Room / Object 02",
    category: "Culture",
    stageId: "stage-culture",
    stageLabel: "Personal Archive",
    summary: {
      en: "Reserved for original poster experiments, character atmosphere, and image translation.",
      zh: "预留给原创 poster 实验、角色氛围和图像转译。",
    },
    signal: {
      en: "Graphic studies and character atmosphere can show how references become output.",
      zh: "平面研究和角色氛围可以说明参考如何变成自己的输出。",
    },
    spaceLayer: {
      en: "Culture room wall slot for poster tests, compositions, and image translation.",
      zh: "Culture room 的 wall slot，用于 poster 测试、构图和图像转译。",
    },
    archiveNote: {
      en: "Keep this slot for original experiments rather than copied reference material.",
      zh: "这个位置保留给原创实验，而不是直接复制参考材料。",
    },
    mediaKind: "image",
    mediaStatus: {
      en: "poster preview reserved",
      zh: "预留 poster preview",
    },
  },
  {
    id: "project-09",
    title: "Project 09",
    indexLabel: "Explore Room / Object 01",
    category: "Experiment",
    stageId: "stage-explore",
    stageLabel: "Explore",
    summary: {
      en: "Reserved for photography, AI image workflow, and observed urban fragments.",
      zh: "预留给摄影、AI image workflow 和城市观察片段。",
    },
    signal: {
      en: "Image experiments, observation, and tool-assisted workflows can converge here.",
      zh: "图像实验、观察和工具辅助流程可以在这里汇合。",
    },
    spaceLayer: {
      en: "Exploration room slot for photo grids, AI process images, and urban fragments.",
      zh: "Exploration room 的对象位，用于 photo grid、AI 过程图和城市片段。",
    },
    archiveNote: {
      en: "Use this for visual experiments that do not belong to a single life stage.",
      zh: "用于那些不属于单一人生阶段的视觉实验。",
    },
    mediaKind: "image",
    mediaStatus: {
      en: "photo grid reserved",
      zh: "预留 photo grid",
    },
  },
  {
    id: "project-10",
    title: "Project 10",
    indexLabel: "Explore Room / Object 02",
    category: "Experiment",
    stageId: "stage-explore",
    stageLabel: "Explore",
    summary: {
      en: "Reserved for web, WebGPU notes, creative tooling, and unfinished prototypes.",
      zh: "预留给 web、WebGPU 笔记、创意工具和未完成 prototype。",
    },
    signal: {
      en: "Web prototypes and tool experiments become a visible research surface.",
      zh: "Web prototype 和工具实验会成为可见的研究界面。",
    },
    spaceLayer: {
      en: "Exploration room interactive slot for web, WebGPU notes, and creative tooling.",
      zh: "Exploration room 的交互位，用于 web、WebGPU 笔记和创意工具。",
    },
    archiveNote: {
      en: "Keep this lightweight on mobile and reserve heavy interaction for desktop SPACE.",
      zh: "移动端保持轻量，重交互留给桌面 SPACE。",
    },
    mediaKind: "model",
    mediaStatus: {
      en: "interactive preview reserved",
      zh: "预留 interactive preview",
    },
  },
  {
    id: "project-11",
    title: "Project 11",
    indexLabel: "Explore Room / Open Slot",
    category: "Experiment",
    stageId: "stage-explore",
    stageLabel: "Explore",
    summary: {
      en: "An extra project position reserved for work that does not fit the current rooms yet.",
      zh: "额外预留的位置，用于暂时不适合当前房间结构的作品。",
    },
    signal: {
      en: "Unsorted work can stay visible without forcing it into the wrong room.",
      zh: "未分类作品可以保持可见，而不是被强行放进不合适的房间。",
    },
    spaceLayer: {
      en: "Open exploration slot for future objects, writing, or hybrid media.",
      zh: "开放的 Explore 对象位，用于未来物件、写作或混合媒体。",
    },
    archiveNote: {
      en: "Use this as a flexible placeholder when new work changes the room structure.",
      zh: "当新作品改变房间结构时，把这里作为弹性占位。",
    },
    mediaKind: "text",
    mediaStatus: {
      en: "future note reserved",
      zh: "预留 future note",
    },
  },
  {
    id: "project-12",
    title: "Project 12",
    indexLabel: "Student Room / Process Slot",
    category: "Study",
    stageId: "stage-student",
    stageLabel: "Education",
    summary: {
      en: "Reserved for process scans, physical models, and transitions between learning stages.",
      zh: "预留给过程扫描、实体模型和学习阶段之间的转变。",
    },
    signal: {
      en: "Process material can show transitions between learning phases and working habits.",
      zh: "过程材料可以展示学习阶段和工作习惯之间的过渡。",
    },
    spaceLayer: {
      en: "Student room process slot for scans, physical models, and transition notes.",
      zh: "Student room 的过程位，用于扫描件、实体模型和阶段转换笔记。",
    },
    archiveNote: {
      en: "Keep this entry process-led so finished work does not hide the making logic.",
      zh: "保持这个条目以过程为主，避免完成品遮住制作逻辑。",
    },
    mediaKind: "image",
    mediaStatus: {
      en: "process preview reserved",
      zh: "预留 process preview",
    },
  },
];

export const mobileSkillEntries: MobileSkillEntry[] = [
  {
    id: "skill-01",
    label: "AIGC workflows",
    category: "ai",
    summary: {
      en: "Stable Diffusion WebUI, ComfyUI, GPT Image, Nano Banana Pro, and agent-based image/video generation pipelines.",
      zh: "使用 Stable Diffusion WebUI、ComfyUI、GPT Image、Nano Banana Pro，以及 agent-based 图像和视频生成流程。",
    },
  },
  {
    id: "skill-02",
    label: "AI prototyping",
    category: "ai",
    summary: {
      en: "Using AI agents and related skills to perform fast concept tests for spatial, visual, interactive, and interface ideas.",
      zh: "使用 AI agents 以及相关能力，快速测试空间、视觉、互动和界面方向的早期概念。",
    },
  },
  {
    id: "skill-03",
    label: "Agent-based web programs",
    category: "ai",
    summary: {
      en: "Small AI-assisted web tools for image generation, video generation, references, prompts, and production experiments.",
      zh: "制作小型 AI-assisted web tools，用于图像生成、视频生成、参考整理、prompt 和制作实验。",
    },
  },
  {
    id: "skill-04",
    label: "Spatial narrative",
    category: "architecture",
    summary: {
      en: "Build readable spatial experiences and present them as interactive demos, walk-throughs, or professional documentation.",
      zh: "构建可读的空间体验，并转译成 interactive demo、walk-through 或专业文档。",
    },
  },
  {
    id: "skill-05",
    label: "Model logic",
    category: "architecture",
    summary: {
      en: "Use Rhino 3D, SketchUp, and Blender to test massing, circulation, proportion, atmosphere, and spatial decisions.",
      zh: "使用 Rhino 3D、SketchUp 和 Blender 测试体量、动线、比例、氛围和空间决策。",
    },
  },
  {
    id: "skill-06",
    label: "Visualization process",
    category: "architecture",
    summary: {
      en: "Photorealistic rendering workflows across V-Ray, Enscape, D5 Render, Twinmotion, and Adobe Suite.",
      zh: "掌握 V-Ray、Enscape、D5 Render、Twinmotion 和 Adobe Suite 之间的 photorealistic rendering 流程。",
    },
  },
  {
    id: "skill-07",
    label: "Interactive engines",
    category: "architecture",
    summary: {
      en: "Prototype real-time scenes and spatial interactions with UE5, Unity, and Godot.",
      zh: "使用 UE5、Unity 和 Godot 原型化 real-time scene 与空间交互。",
    },
  },
  {
    id: "skill-08",
    label: "Creative coding",
    category: "digital",
    summary: {
      en: "Work with AI coding tools to turn interface, image, and spatial ideas into fast browser-based prototypes.",
      zh: "借助 AI coding tools，把界面、图像和空间想法快速变成 browser-based prototype。",
    },
  },
  {
    id: "skill-09",
    label: "Software fluency",
    category: "digital",
    summary: {
      en: "Move between design, modeling, rendering, editing, and web tools without losing the project's visual logic.",
      zh: "在设计、建模、渲染、剪辑和 web 工具之间切换，同时保持项目的视觉逻辑不丢失。",
    },
  },
  {
    id: "skill-10",
    label: "Visual communication",
    category: "digital",
    summary: {
      en: "Graphic design, exhibition design, motion graphics, and video editing for clear presentation systems.",
      zh: "用 graphic design、exhibition design、motion graphics 和 video editing 建立清晰的表达系统。",
    },
  },
  {
    id: "skill-11",
    label: "Photography",
    category: "analog",
    summary: {
      en: "Observation, framing, light, sequencing, and image selection as a visual research practice.",
      zh: "把观察、取景、光线、排序和选片作为一种视觉研究方法。",
    },
  },
  {
    id: "skill-12",
    label: "Music playing",
    category: "analog",
    summary: {
      en: "Bass practice, rhythm, listening, arrangement awareness, and performance-oriented repetition.",
      zh: "围绕 bass practice、节奏、聆听、编曲意识和演出导向的重复练习。",
    },
  },
  {
    id: "skill-13",
    label: "Physical modeling",
    category: "analog",
    summary: {
      en: "Laser cutting, 3D printing, hand modeling, material testing, assembly, and model-making workflows.",
      zh: "覆盖 laser cutting、3D printing、手工模型、材料测试、组装和模型制作流程。",
    },
  },
  {
    id: "skill-14",
    label: "Presentation",
    category: "soft",
    summary: {
      en: "Structure complex work into a readable story for reviews, juries, clients, and collaborators.",
      zh: "把复杂工作组织成可读叙事，用于 review、jury、client 和协作者沟通。",
    },
  },
  {
    id: "skill-15",
    label: "Project coordination",
    category: "soft",
    summary: {
      en: "Track tasks, timelines, revisions, references, and deliverables across mixed creative workflows.",
      zh: "在混合创作流程中跟进任务、时间线、修改、参考和交付内容。",
    },
  },
  {
    id: "skill-16",
    label: "Creative aesthetic",
    category: "soft",
    summary: {
      en: "Spatial narrative, aesthetic composition, and cross-functional collaboration across visual and technical work.",
      zh: "在视觉与技术工作中整合空间叙事、美学构图和跨职能协作。",
    },
  },
  {
    id: "skill-17",
    label: "Fast-paced workflow",
    category: "soft",
    summary: {
      en: "Move quickly from reference to test to iteration while keeping decisions legible.",
      zh: "快速从 reference 进入测试和迭代，同时让每个决策保持可读。",
    },
  },
  {
    id: "skill-18",
    label: "Creative problem-solving",
    category: "soft",
    summary: {
      en: "Translate loose ideas, constraints, and incomplete inputs into workable project directions.",
      zh: "把松散想法、限制条件和不完整输入转化成可执行的项目方向。",
    },
  },
];

export function getProjectItem(id: string): MobileProjectItem {
  return mobileProjectItems.find((item) => item.id === id) ?? mobileProjectItems[0];
}
