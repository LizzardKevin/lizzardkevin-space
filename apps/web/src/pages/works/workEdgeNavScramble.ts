/**
 * WorkEdgeNav 的密文/解密纯逻辑(Decrypt Reveal 思路,参考 reactbits DecryptedText):
 * 未揭示的字符位每 tick 换成随机密文字符,已揭示位显示真实字符;
 * 揭示顺序按缘侧从指针来向一侧扫向屏幕边缘。
 */

/** 常态闪烁节拍:~12fps,与站点粒子同级的低频克制 */
export const WORK_EDGE_NAV_IDLE_TICK_MS = 1000 / 12;
/** 解密/回密期间的密文抖动节拍:~30fps */
export const WORK_EDGE_NAV_SCRAMBLE_TICK_MS = 1000 / 30;
/** hover 解密时长 */
export const WORK_EDGE_NAV_DECRYPT_MS = 520;
/** 指针移出回到密文箭头态的时长 */
export const WORK_EDGE_NAV_ENCRYPT_MS = 340;

/** idle 显词("上一件"/"下一件"/PREV/NEXT):首次显词延迟窗口 */
export const WORK_EDGE_NAV_HINT_FIRST_MIN_MS = 1400;
export const WORK_EDGE_NAV_HINT_FIRST_MAX_MS = 2600;
/** idle 显词:两次显词之间的随机间隔(克制,几秒一次) */
export const WORK_EDGE_NAV_HINT_MIN_GAP_MS = 3400;
export const WORK_EDGE_NAV_HINT_MAX_GAP_MS = 7200;
/** idle 显词:单次显词停留时长(~0.5-1s 后回密文) */
export const WORK_EDGE_NAV_HINT_MIN_VISIBLE_MS = 550;
export const WORK_EDGE_NAV_HINT_MAX_VISIBLE_MS = 950;

/** 密文字符集:ASCII 工业符号 + 少量数字,等宽字体下灰阶读感一致 */
export const WORK_EDGE_NAV_CIPHER_CHARS = "!<>-_\\/[]{}=+*^?#%&@$01";

/**
 * ASCII 密文箭头位图(左向,11 列 × 7 行,"#" 为箭头格)。
 * 箭头头三角沿对角线逐格收拢,底边落在第 4 列,中间行贯通成箭杆;
 * 右向由 resolveArrowGrid 水平镜像得到。
 */
export const WORK_EDGE_NAV_ARROW_ROWS: readonly string[] = [
  "...#.......",
  "..##.......",
  ".###.......",
  "###########",
  ".###.......",
  "..##.......",
  "...#.......",
];

export type WorkEdgeNavSide = "left" | "right";

export type WorkEdgeNavArrowCell = Readonly<{ row: number; column: number }>;

export type WorkEdgeNavArrowGrid = Readonly<{
  rows: readonly string[];
  cells: readonly WorkEdgeNavArrowCell[];
}>;

export function resolveArrowGrid(side: WorkEdgeNavSide): WorkEdgeNavArrowGrid {
  const rows =
    side === "left"
      ? WORK_EDGE_NAV_ARROW_ROWS
      : WORK_EDGE_NAV_ARROW_ROWS.map((row) => Array.from(row).reverse().join(""));
  const cells: WorkEdgeNavArrowCell[] = [];
  rows.forEach((row, rowIndex) => {
    Array.from(row).forEach((char, column) => {
      if (char === "#") cells.push({ row: rowIndex, column });
    });
  });
  return { rows, cells };
}

export function pickCipherChar(random: () => number = Math.random): string {
  const chars = WORK_EDGE_NAV_CIPHER_CHARS;
  return chars[Math.floor(random() * chars.length) % chars.length];
}

/**
 * 揭示顺序:指针从页面侧进入缘条,解密从指针侧开始、扫向屏幕边缘。
 * 左缘按钮文字向右排(尾部朝页面)→ 从尾(右端)向缘(左端)解密;
 * 右缘按钮文字向左排(首部朝页面)→ 自首(左端)向缘(右端)解密。
 */
export function resolveRevealOrder(length: number, side: WorkEdgeNavSide): number[] {
  const order = Array.from({ length: Math.max(0, length) }, (_, index) => index);
  return side === "left" ? order.reverse() : order;
}

/** 解密进度 → 已揭示字符数:0ms 时 0,durationMs 时恰好 length。 */
export function resolveRevealCount(elapsedMs: number, length: number, durationMs: number) {
  if (length <= 0) return 0;
  const progress = Math.max(0, Math.min(1, elapsedMs / Math.max(1, durationMs)));
  return Math.min(length, Math.ceil(progress * length));
}

/**
 * 生成一帧显示文本:已揭示位为真实字符,其余为随机密文;空格保持空格。
 * 等价于 DecryptedText 的 shuffleText,但改为纯函数 + 可注入随机源。
 */
export function scrambleText(
  text: string,
  revealed: ReadonlySet<number>,
  random: () => number = Math.random,
): string {
  return Array.from(text)
    .map((char, index) => {
      if (char === " ") return " ";
      if (revealed.has(index)) return char;
      return pickCipherChar(random);
    })
    .join("");
}

/* ---- idle 显词调度:密文箭头按随机节奏短暂闪出"上一件/下一件"(PREV/NEXT) ---- */

/**
 * 显词落位:词字符沿箭杆行(中间行,两侧均为 11 格贯通)居中排布,
 * 返回 扁平 cell 序号 → 词字符 的映射;词长于箭杆时按格数截断,空词不落位。
 * 左右缘共用(右缘箭头是水平镜像,箭杆行不变,词仍按阅读序从左到右)。
 */
export function resolveHintCellChars(
  grid: WorkEdgeNavArrowGrid,
  word: string,
): Map<number, string> {
  const placements = new Map<number, string>();
  const chars = Array.from(word).filter((char) => char !== " ");
  if (chars.length === 0) return placements;
  const shaftRow = Math.floor(grid.rows.length / 2);
  const shaftCells: number[] = [];
  grid.cells.forEach((cell, index) => {
    if (cell.row === shaftRow) shaftCells.push(index);
  });
  if (shaftCells.length === 0) return placements;
  const visible = chars.slice(0, shaftCells.length);
  const start = Math.floor((shaftCells.length - visible.length) / 2);
  visible.forEach((char, index) => {
    placements.set(shaftCells[start + index], char);
  });
  return placements;
}

/**
 * 显词时钟:visible=false 时 untilMs 为下一次显词时刻,visible=true 时为显词结束时刻。
 * 全部由注入的随机源驱动,给定 seed 可复现(单测据此断言显词节奏)。
 */
export type WorkEdgeNavHintClock = Readonly<{
  visible: boolean;
  untilMs: number;
}>;

function hintDelay(minMs: number, maxMs: number, random: () => number): number {
  return minMs + (maxMs - minMs) * random();
}

/** 首只时钟:挂载后 1.4-2.6s 内首次显词,让人尽早留意到两侧存在上/下一件。 */
export function createHintClock(
  nowMs: number,
  random: () => number = Math.random,
): WorkEdgeNavHintClock {
  return {
    visible: false,
    untilMs: nowMs + hintDelay(WORK_EDGE_NAV_HINT_FIRST_MIN_MS, WORK_EDGE_NAV_HINT_FIRST_MAX_MS, random),
  };
}

/**
 * 推进显词时钟:到点翻转。显词结束 → 排 3.4-7.2s 后的下一次;
 * 隐藏结束 → 显词 0.55-0.95s。时间步进由调用方(idle tick)驱动。
 */
export function stepHintClock(
  clock: WorkEdgeNavHintClock,
  nowMs: number,
  random: () => number = Math.random,
): WorkEdgeNavHintClock {
  if (nowMs < clock.untilMs) return clock;
  if (clock.visible) {
    return {
      visible: false,
      untilMs: nowMs + hintDelay(WORK_EDGE_NAV_HINT_MIN_GAP_MS, WORK_EDGE_NAV_HINT_MAX_GAP_MS, random),
    };
  }
  return {
    visible: true,
    untilMs: nowMs + hintDelay(WORK_EDGE_NAV_HINT_MIN_VISIBLE_MS, WORK_EDGE_NAV_HINT_MAX_VISIBLE_MS, random),
  };
}
