import type { Facts, InferenceResult, Question, Rule } from './types.ts';

function conditionsMatch(conditions: Facts, facts: Facts): boolean {
  return Object.entries(conditions).every(
    ([factName, expectedValue]) =>
      expectedValue !== undefined && Object.hasOwn(facts, factName) && facts[factName] === expectedValue,
  );
}

/** Uses forward chaining to apply rules until a pass adds no facts. */
export function infer(answers: Facts, rules: readonly Rule[]): InferenceResult {
  const facts = { ...answers };
  const firedRules: Rule[] = [];
  let addedFact = true;

  while (addedFact) {
    addedFact = false;

    for (const rule of rules) {
      if (!conditionsMatch(rule.when, facts)) continue;

      const { fact: factName, value: inferredValue } = rule.then;
      if (Object.hasOwn(facts, factName)) {
        if (facts[factName] !== inferredValue) {
          throw new Error(`Conflicting conclusion for ${factName} in rule ${rule.id}`);
        }
        continue;
      }

      facts[factName] = inferredValue;
      firedRules.push(rule);
      addedFact = true;
    }
  }

  return { facts, firedRules };
}

/** Finds the first eligible unanswered question. A recommendation ends the consultation. */
export function nextQuestion(facts: Facts, questions: readonly Question[]): Question | undefined {
  if (facts.recommendation) return undefined;

  return questions.find(
    (question) => !Object.hasOwn(facts, question.id) && conditionsMatch(question.when, facts),
  );
}

/** Counts the answers on the longest consultation path. */
export function maxSteps(questions: readonly Question[], rules: readonly Rule[]): number {
  function countRemainingAnswers(answers: Facts): number {
    const question = nextQuestion(infer(answers, rules).facts, questions);
    if (!question) return 0;

    const remainingByOption = question.options.map(({ value }) =>
      countRemainingAnswers({ ...answers, [question.id]: value }),
    );
    return 1 + Math.max(...remainingByOption);
  }

  return countRemainingAnswers({});
}
