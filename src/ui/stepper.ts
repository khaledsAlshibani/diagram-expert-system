import { createElement } from './dom.ts';

export interface Stepper {
  root: HTMLElement;
  /** Fills the completed segments and marks the next segment as current. */
  update(completedSteps: number): void;
}

export function createStepper(totalSteps: number): Stepper {
  const segments = Array.from({ length: totalSteps }, () =>
    createElement('span', 'segment', createElement('span', 'segment-fill')),
  );
  const stepLabel = createElement('span', 'meta');
  const root = createElement('div', 'steps', createElement('div', 'segments', ...segments), stepLabel);
  root.setAttribute('role', 'progressbar');
  root.setAttribute('aria-valuemin', '0');
  root.setAttribute('aria-valuemax', String(totalSteps));

  return {
    root,
    update(completedSteps) {
      segments.forEach((segment, index) => {
        segment.classList.toggle('is-done', index < completedSteps);
        segment.classList.toggle('is-current', index === completedSteps);
      });
      stepLabel.textContent = completedSteps >= totalSteps ? 'Done' : `${completedSteps + 1} / ${totalSteps}`;
      root.setAttribute('aria-valuenow', String(completedSteps));
    },
  };
}
