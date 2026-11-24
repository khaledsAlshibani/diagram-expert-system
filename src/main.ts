import './style.css';
import { infer, maxSteps, nextQuestion } from './inference-engine.ts';
import { diagrams, questions, rules } from './knowledge-base/index.ts';
import { mountBackground } from './ui/background.ts';
import { createElement } from './ui/dom.ts';
import { type TransitionDirection, animateCardEntrance, fadeElement, transitionContent } from './ui/motion.ts';
import { createStepper } from './ui/stepper.ts';
import type { Question } from './types.ts';
import {
  type ConsultationAnswer,
  type ConsultationNavigation,
  createErrorView,
  createQuestionView,
  createRecommendationView,
} from './ui/views.ts';

const consultationCard = document.querySelector<HTMLElement>('#app')!;
const totalSteps = maxSteps(questions, rules);
const stepper = createStepper(totalSteps);
const content = createElement('div', 'content');
consultationCard.append(stepper.root, content);

const answerHistory: ConsultationAnswer[] = [];
let isTransitioning = false;

const navigation: ConsultationNavigation = {
  get canGoBack() {
    return answerHistory.length > 0;
  },
  goBack() {
    if (isTransitioning) return;
    answerHistory.pop();
    void renderConsultation('back');
  },
  startOver() {
    if (isTransitioning) return;
    answerHistory.length = 0;
    void renderConsultation('back');
  },
};

function recordAnswer(question: Question, value: string): void {
  if (isTransitioning) return;
  answerHistory.push({ question, value });
  void renderConsultation('forward');
}

interface ConsultationView {
  nodes: HTMLElement[];
  completedSteps: number;
  isComplete?: boolean;
}

function buildConsultationView(): ConsultationView {
  const answers = Object.fromEntries(answerHistory.map(({ question, value }) => [question.id, value]));
  const { facts, firedRules } = infer(answers, rules);
  const diagram = facts.recommendation ? diagrams[facts.recommendation] : undefined;
  if (diagram) {
    const relatedDiagrams = diagram.related.flatMap((diagramId) => diagrams[diagramId] ?? []);
    return {
      nodes: createRecommendationView(diagram, relatedDiagrams, firedRules, answerHistory, navigation),
      completedSteps: totalSteps,
      isComplete: true,
    };
  }

  const question = nextQuestion(facts, questions);
  if (!question) throw new Error('No eligible question or diagram recommendation.');
  return {
    nodes: createQuestionView(question, (value) => recordAnswer(question, value), navigation),
    completedSteps: answerHistory.length,
  };
}

async function renderConsultation(direction: TransitionDirection): Promise<void> {
  let nextView: ConsultationView;
  try {
    nextView = buildConsultationView();
  } catch (error) {
    console.error(error);
    nextView = { nodes: createErrorView(navigation), completedSteps: answerHistory.length };
  }

  isTransitioning = true;
  stepper.update(nextView.completedSteps);
  const shouldHideStepper = Boolean(nextView.isComplete);
  const isStepperVisibilityChanging = shouldHideStepper !== stepper.root.hidden;
  if (isStepperVisibilityChanging && shouldHideStepper) fadeElement(stepper.root, 'out');

  try {
    await transitionContent(consultationCard, content, nextView.nodes, direction, () => {
      stepper.root.hidden = shouldHideStepper;
      stepper.root.getAnimations().forEach((animation) => animation.cancel());
      if (isStepperVisibilityChanging && !shouldHideStepper) fadeElement(stepper.root, 'in');
    });
  } finally {
    isTransitioning = false;
  }
  content.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
}

mountBackground();
stepper.update(0);
content.replaceChildren(...buildConsultationView().nodes);
animateCardEntrance(consultationCard);
