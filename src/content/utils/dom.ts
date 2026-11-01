import { ENTRY_ID_ATTR } from '../../shared/constants';

export function textOf(node: Element | null | undefined): string {
  return (node?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

export function uniqElements<T extends Element>(elements: T[]): T[] {
  return [...new Set(elements)];
}

export function isVisible(element: HTMLElement | null | undefined): boolean {
  if (!element) {
    return false;
  }

  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden' && element.offsetParent !== null;
}

export function applyEntryPresentation(element: HTMLElement, hidden: boolean, dimmed: boolean): void {
  element.dataset.ccscHidden = hidden ? 'true' : 'false';
  element.dataset.ccscDimmed = dimmed ? 'true' : 'false';

  if (hidden) {
    element.classList.add('ccsc-hidden');
    element.classList.remove('ccsc-dimmed');
    return;
  }

  element.classList.remove('ccsc-hidden');
  element.classList.toggle('ccsc-dimmed', dimmed);
}

export function setEntryId(element: HTMLElement, entryId: string): void {
  element.setAttribute(ENTRY_ID_ATTR, entryId);
}

export function upsertAfter(target: Element | null, node: HTMLElement): void {
  if (!target?.parentElement) {
    return;
  }

  if (node.parentElement !== target.parentElement) {
    target.parentElement.insertBefore(node, target.nextSibling);
  }
}

export function findFirstAnchor(root: HTMLElement, patterns: RegExp[]): HTMLAnchorElement | null {
  const anchors = root.matches('a[href]')
    ? [root as HTMLAnchorElement, ...Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href]'))]
    : Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href]'));
  return anchors.find((anchor) => patterns.some((pattern) => pattern.test(anchor.href))) ?? null;
}

export function clearInjectedUi(): void {
  document
    .querySelectorAll<HTMLElement>('[data-ccsc-root="true"], .ccsc-badge-row, .ccsc-preferred-tag, #ccsc-title-summary')
    .forEach((node) => node.remove());
}

export function clearEntryPresentation(): void {
  document.querySelectorAll<HTMLElement>('.ccsc-hidden, .ccsc-dimmed, [data-ccsc-hidden], [data-ccsc-dimmed]').forEach((element) => {
    element.classList.remove('ccsc-hidden', 'ccsc-dimmed');
    delete element.dataset.ccscHidden;
    delete element.dataset.ccscDimmed;
  });

  document.querySelectorAll<HTMLElement>('.ccsc-variant-option, .ccsc-variant-option--preferred').forEach((element) => {
    element.classList.remove('ccsc-variant-option', 'ccsc-variant-option--preferred');
  });
}
