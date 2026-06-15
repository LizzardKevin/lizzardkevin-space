export type CursorReturnOptions = {
  target?: "center" | "pointer";
};

type CursorReturnHandler = (options?: CursorReturnOptions) => void;

let cursorReturnHandler: CursorReturnHandler | null = null;

export function setSpaceCursorReturnHandler(handler: CursorReturnHandler | null) {
  cursorReturnHandler = handler;
}

export function requestSpaceCursorReturn(options?: CursorReturnOptions) {
  if (!cursorReturnHandler) {
    return;
  }
  cursorReturnHandler(options);
}
