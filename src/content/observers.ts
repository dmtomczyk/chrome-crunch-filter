function debounce<T extends (...args: never[]) => void>(fn: T, delayMs: number): T {
  let timeoutId: number | undefined;

  return ((...args: never[]) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => fn(...args), delayMs);
  }) as T;
}

function isOpenClawInjectedNode(node: HTMLElement): boolean {
  if (node.hasAttribute('data-ccsc-root')) {
    return true;
  }

  if (node.closest?.('[data-ccsc-root="true"]')) {
    return true;
  }

  return /\bccsc-/.test(node.className);
}

export function installObservers(onRefresh: () => void): void {
  const debouncedRefresh = debounce(onRefresh, 200);

  const observer = new MutationObserver((mutations) => {
    const hasMeaningfulChange = mutations.some((mutation) => {
      return [...Array.from(mutation.addedNodes), ...Array.from(mutation.removedNodes)].some((node) => {
        if (!(node instanceof HTMLElement)) {
          return false;
        }

        return !isOpenClawInjectedNode(node);
      });
    });

    if (hasMeaningfulChange) {
      debouncedRefresh();
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  const wrapHistoryMethod = <T extends 'pushState' | 'replaceState'>(methodName: T) => {
    const original = history[methodName];
    history[methodName] = function (this: History, ...args: Parameters<History[T]>) {
      const result = original.apply(this, args);
      debouncedRefresh();
      return result;
    } as History[T];
  };

  wrapHistoryMethod('pushState');
  wrapHistoryMethod('replaceState');

  window.addEventListener('popstate', debouncedRefresh);
  window.addEventListener('hashchange', debouncedRefresh);
}
