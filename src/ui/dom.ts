type ElementChild = Node | string;

export function createElement<TagName extends keyof HTMLElementTagNameMap>(
  tagName: TagName,
  className?: string,
  ...children: ElementChild[]
): HTMLElementTagNameMap[TagName] {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  element.append(...children);
  return element;
}

export function createButton(className: string, onClick: () => void, ...children: ElementChild[]): HTMLButtonElement {
  const button = createElement('button', className, ...children);
  button.type = 'button';
  button.addEventListener('click', onClick);
  return button;
}

// Lucide stroke paths use a 24 × 24 viewBox.
const ICON_PATHS = {
  arrowLeft: ['M12 19l-7-7 7-7', 'M19 12H5'],
  arrowRight: ['M5 12h14', 'm12 5 7 7-7 7'],
  chevronRight: ['M9 18l6-6-6-6'],
  circleCheck: ['M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0', 'M9 12l2 2 4-4'],
  fileText: [
    'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z',
    'M14 2v4a2 2 0 0 0 2 2h4',
    'M10 9H8',
    'M16 13H8',
    'M16 17H8',
  ],
  layers: [
    'm12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z',
    'm22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65',
    'm22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65',
  ],
  lightbulb: [
    'M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5',
    'M9 18h6',
    'M10 22h4',
  ],
  listChecks: ['m3 17 2 2 4-4', 'm3 7 2 2 4-4', 'M13 6h8', 'M13 12h8', 'M13 18h8'],
  rotateCcw: ['M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8', 'M3 3v5h5'],
} as const;

export type IconName = keyof typeof ICON_PATHS;

export function createIcon(name: IconName): SVGSVGElement {
  const svgNamespace = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNamespace, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('icon');
  for (const pathData of ICON_PATHS[name]) {
    const path = document.createElementNS(svgNamespace, 'path');
    path.setAttribute('d', pathData);
    svg.append(path);
  }
  return svg;
}
