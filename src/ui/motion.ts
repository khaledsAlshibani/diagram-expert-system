export type TransitionDirection = 'forward' | 'back';

const TRANSITION_EASING = 'cubic-bezier(0.2, 0, 0, 1)';
const SLIDE_DISTANCE_PX = 12;

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Selects each option row and each other top-level block for a staggered entrance. */
function getEntranceTargets(content: HTMLElement): HTMLElement[] {
  return [...content.children].flatMap((child) => {
    const targets = child.classList.contains('options') ? [...child.children] : [child];
    return targets as HTMLElement[];
  });
}

/** Fades out the old content, resizes the card, and staggers the new content. */
export async function transitionContent(
  card: HTMLElement,
  content: HTMLElement,
  nextNodes: HTMLElement[],
  direction: TransitionDirection,
  onSwap?: () => void,
): Promise<void> {
  if (prefersReducedMotion() || !content.childElementCount) {
    onSwap?.();
    content.replaceChildren(...nextNodes);
    return;
  }

  const slideOffset = direction === 'forward' ? SLIDE_DISTANCE_PX : -SLIDE_DISTANCE_PX;
  const previousHeight = card.offsetHeight;

  await content.animate(
    [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${-slideOffset}px)` }],
    { duration: 140, easing: 'ease-in', fill: 'forwards' },
  ).finished;

  onSwap?.();
  content.replaceChildren(...nextNodes);
  content.getAnimations().forEach((animation) => animation.cancel());
  const nextHeight = card.offsetHeight;

  card.animate([{ height: `${previousHeight}px` }, { height: `${nextHeight}px` }], {
    duration: 360,
    easing: TRANSITION_EASING,
  });

  getEntranceTargets(content).forEach((element, index) => {
    element.animate(
      [
        { opacity: 0, transform: `translateX(${slideOffset}px)` },
        { opacity: 1, transform: 'none' },
      ],
      { duration: 420, delay: 40 + index * 35, easing: TRANSITION_EASING, fill: 'backwards' },
    );
  });
}

export function animateCardEntrance(card: HTMLElement): void {
  if (prefersReducedMotion()) return;
  card.animate(
    [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }],
    { duration: 520, easing: TRANSITION_EASING },
  );
}

export function fadeElement(element: HTMLElement, direction: 'in' | 'out'): void {
  if (prefersReducedMotion()) return;
  const keyframes = [{ opacity: 0 }, { opacity: 1 }];
  element.animate(direction === 'in' ? keyframes : keyframes.reverse(), {
    duration: direction === 'in' ? 360 : 140,
    easing: direction === 'in' ? TRANSITION_EASING : 'ease-in',
    fill: 'forwards',
  });
}
