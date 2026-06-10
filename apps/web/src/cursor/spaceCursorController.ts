type CursorReturnHandler = (onComplete: () => void) => void;

let cursorReturnHandler: CursorReturnHandler | null = null;

export function setSpaceCursorReturnHandler(handler: CursorReturnHandler | null) {
  cursorReturnHandler = handler;
}

export function requestSpaceCursorReturn(onComplete: () => void) {
  if (!cursorReturnHandler) {
    onComplete();
    return;
  }
  cursorReturnHandler(onComplete);
}
