import type { RefObject } from "react";

export type EntryTransition = {
  entered: boolean;
  fading: boolean;
  hideButton: boolean;
  /** 白屏过渡结束，已进入目标分支 */
  done: boolean;
  showSplash: boolean;
  enterWrapRef: RefObject<HTMLDivElement | null>;
  freezeButtonFloat: () => void;
  startFade: () => void;
  onSplashTransitionEnd: (e: React.TransitionEvent<HTMLDivElement>) => void;
};
