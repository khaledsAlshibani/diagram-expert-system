import type { Diagram, Question, Rule } from '../types.ts';
import { type IconName, createButton, createElement, createIcon } from './dom.ts';

export interface ConsultationAnswer {
  question: Question;
  value: string;
}

export interface ConsultationNavigation {
  canGoBack: boolean;
  goBack: () => void;
  startOver: () => void;
}

function createViewTitle(text: string): HTMLHeadingElement {
  const heading = createElement('h2', 'title', text);
  heading.tabIndex = -1;
  return heading;
}

type ViewMode = 'question' | 'result' | 'error';

function createNavigationActions(
  { canGoBack, goBack, startOver }: ConsultationNavigation,
  mode: ViewMode,
): HTMLElement {
  const actionRow = createElement('div', 'actions');
  if (mode === 'result') actionRow.append(createButton('primary', startOver, createIcon('rotateCcw'), 'Start over'));
  if (canGoBack) actionRow.append(createButton('ghost', goBack, createIcon('arrowLeft'), 'Back'));
  if (mode === 'error') actionRow.append(createButton('ghost', startOver, createIcon('rotateCcw'), 'Start over'));
  return actionRow;
}

export function createQuestionView(
  question: Question,
  onAnswer: (value: string) => void,
  navigation: ConsultationNavigation,
): HTMLElement[] {
  const optionList = createElement('div', 'options');
  for (const option of question.options) {
    const optionButton = createButton(
      'option',
      () => {
        optionButton.classList.add('is-selected');
        onAnswer(option.value);
      },
      createElement('span', '', option.label),
      createIcon('chevronRight'),
    );
    optionList.append(optionButton);
  }

  const nodes: HTMLElement[] = [createViewTitle(question.prompt), optionList];
  if (navigation.canGoBack) nodes.push(createNavigationActions(navigation, 'question'));
  return nodes;
}

function createResultSection(iconName: IconName, title: string, content: HTMLElement): HTMLElement {
  const heading = createElement('h3', 'section-title', createIcon(iconName), title);
  return createElement('section', 'section', heading, content);
}

export function createRecommendationView(
  diagram: Diagram,
  relatedDiagrams: readonly Diagram[],
  firedRules: readonly Rule[],
  answers: readonly ConsultationAnswer[],
  navigation: ConsultationNavigation,
): HTMLElement[] {
  const heading = createViewTitle(diagram.name);
  heading.classList.add('result-title');

  const example = createElement(
    'div',
    'callout',
    createIcon('fileText'),
    createElement('div', '', createElement('p', 'callout-label', 'Example'), createElement('p', '', diagram.example)),
  );

  const ruleTrace = createElement('ol', 'trace');
  for (const rule of firedRules) {
    const { fact, value } = rule.then;
    const conclusion = createElement('span', 'conclusion', createIcon('arrowRight'), `${fact} = ${value}`);
    ruleTrace.append(createElement(
      'li',
      '',
      createElement('code', 'rule-id', rule.id),
      createElement('div', 'rule-body', createElement('p', '', rule.explanation), conclusion),
    ));
  }

  const answerList = createElement('ol', 'well');
  for (const { question, value } of answers) {
    const label = question.options.find((option) => option.value === value)?.label ?? value;
    answerList.append(createElement(
      'li', '', createElement('span', 'meta', question.prompt), createElement('span', '', label),
    ));
  }

  const resultBody = createElement(
    'div',
    'result-body',
    example,
    createResultSection('lightbulb', 'Why this diagram?', ruleTrace),
    createResultSection('listChecks', 'Your answers', answerList),
  );

  if (relatedDiagrams.length) {
    const relatedDiagramList = createElement('ul', 'well');
    for (const relatedDiagram of relatedDiagrams) {
      relatedDiagramList.append(createElement(
        'li',
        '',
        createElement('span', 'item-name', relatedDiagram.name),
        createElement('span', 'meta', relatedDiagram.description),
      ));
    }
    resultBody.append(createResultSection('layers', 'Related diagrams', relatedDiagramList));
  }

  return [
    createElement('p', 'badge', createIcon('circleCheck'), 'Recommendation'),
    heading,
    createElement('p', 'lead', diagram.description),
    addScrollFades(resultBody),
    createNavigationActions(navigation, 'result'),
  ];
}

/** Fades each edge that has more content beyond it. */
function addScrollFades(scrollArea: HTMLElement): HTMLElement {
  const updateFades = () => {
    const { scrollTop, scrollHeight, clientHeight } = scrollArea;
    scrollArea.classList.toggle('fade-top', scrollTop > 1);
    scrollArea.classList.toggle('fade-bottom', scrollTop + clientHeight < scrollHeight - 1);
  };
  scrollArea.addEventListener('scroll', updateFades, { passive: true });
  new ResizeObserver(updateFades).observe(scrollArea);
  return scrollArea;
}

export function createErrorView(navigation: ConsultationNavigation): HTMLElement[] {
  return [
    createViewTitle('No matching diagram'),
    createElement('p', 'lead', 'Go back to change an answer, or start over.'),
    createNavigationActions(navigation, 'error'),
  ];
}
