export const ASCII_EXIT_SECONDS = .26;
export const ASCII_ENTER_SECONDS = .64;
const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
const cipher = "<>/\\[]{}#%+=_:;01";
export function splitGraphemes(text: string): string[] {
  return Array.from(segmenter.segment(text), part => part.segment);
}
export function cipherFrame(text: string, progress: number, direction: "enter" | "exit", tick: number) {
  const p = Math.max(0, Math.min(1, progress));
  const reveal = direction === "enter" ? p : 1 - p;
  const chars = splitGraphemes(text);
  return {
    text: chars.map((char, i) => /\s/u.test(char) || reveal === 1 || (reveal > 0 && (i + 1) / chars.length < reveal * reveal)
      ? char : cipher[(i * 11 + tick * 7) % cipher.length]).join(""),
    opacity: direction === "exit" ? 1 - p * p : Math.min(1, .3 + p * 2),
  };
}
export function archiveTransition<T extends string>(from: T, to: T, elapsedSeconds: number): { visible: T; phase: "enter" | "exit" } {
  return from !== to && elapsedSeconds < ASCII_EXIT_SECONDS
    ? { visible: from, phase: "exit" } : { visible: to, phase: "enter" };
}
