let debugEnabled = false;

export function setDebugEnabled(enabled: boolean): void {
  debugEnabled = enabled;
}

export function logDebug(...args: unknown[]): void {
  if (!debugEnabled) {
    return;
  }

  console.debug('[CCSC]', ...args);
}
