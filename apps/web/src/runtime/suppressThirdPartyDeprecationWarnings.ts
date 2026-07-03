import { getConsoleFunction, setConsoleFunction } from "three";

const THREE_CLOCK_DEPRECATION_WARNING =
  "THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.";
const WASM_BINDGEN_INIT_DEPRECATION_WARNING =
  "using deprecated parameters for the initialization function; pass a single object instead";

type ThreeConsoleFunction = (
  type: "log" | "warn" | "error",
  message: string,
  ...params: unknown[]
) => void;

type WarningFilterGlobal = typeof globalThis & {
  __spaceThirdPartyDeprecationWarningFilterInstalled?: boolean;
};

function isSuppressedThreeWarning(type: "log" | "warn" | "error", message: string) {
  return type === "warn" && message === THREE_CLOCK_DEPRECATION_WARNING;
}

function isSuppressedConsoleWarning(args: unknown[]) {
  const message = args.length === 1 ? args[0] : null;
  return message === WASM_BINDGEN_INIT_DEPRECATION_WARNING;
}

function forwardThreeConsole(
  previousConsoleFunction: ThreeConsoleFunction | null,
  type: "log" | "warn" | "error",
  message: string,
  params: unknown[],
) {
  if (previousConsoleFunction) {
    previousConsoleFunction(type, message, ...params);
    return;
  }

  if (type === "warn") {
    console.warn(message, ...params);
    return;
  }
  if (type === "error") {
    console.error(message, ...params);
    return;
  }
  console.log(message, ...params);
}

function installThirdPartyDeprecationWarningFilter() {
  const state = globalThis as WarningFilterGlobal;
  if (state.__spaceThirdPartyDeprecationWarningFilterInstalled) return;
  state.__spaceThirdPartyDeprecationWarningFilterInstalled = true;

  const previousThreeConsoleFunction = getConsoleFunction() as ThreeConsoleFunction | null;
  setConsoleFunction((type, message, ...params) => {
    if (isSuppressedThreeWarning(type, message)) return;
    forwardThreeConsole(previousThreeConsoleFunction, type, message, params);
  });

  const originalWarn = console.warn.bind(console);
  console.warn = (...args: unknown[]) => {
    if (isSuppressedConsoleWarning(args)) return;
    originalWarn(...args);
  };
}

installThirdPartyDeprecationWarningFilter();
