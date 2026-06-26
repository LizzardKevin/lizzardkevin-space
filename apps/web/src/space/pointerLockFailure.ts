export const POINTER_LOCK_RESUME_TIMEOUT_MS = 900;

const PERMANENT_POINTER_LOCK_FAILURE_MESSAGES = new Set(["Pointer Lock API is unavailable"]);

export function isPermanentPointerLockFailure(message: string) {
  return PERMANENT_POINTER_LOCK_FAILURE_MESSAGES.has(message);
}
