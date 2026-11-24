import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { infer, maxSteps, nextQuestion } from '../src/inference-engine.ts';

function loadKnowledgeBaseFile(name) {
  const fileUrl = new URL(`../src/knowledge-base/${name}.json`, import.meta.url);
  return JSON.parse(readFileSync(fileUrl, 'utf8'));
}

const questions = loadKnowledgeBaseFile('questions');
const rules = loadKnowledgeBaseFile('rules');
const diagrams = loadKnowledgeBaseFile('diagrams');

test('starts with the goal question and no inferred facts', () => {
  const result = infer({}, rules);
  assert.deepEqual(result.firedRules, []);
  assert.equal(nextQuestion(result.facts, questions)?.id, 'goal');
});

test('reaches the same recommendation when rules are reversed', () => {
  const answers = { goal: 'interaction', interactionFocus: 'messages', messagesDetail: 'order' };
  const result = infer(answers, [...rules].reverse());
  assert.equal(result.facts.recommendation, 'sequence');
  assert.deepEqual(result.firedRules.map((rule) => rule.then.fact), ['focus', 'recommendation']);
  assert.equal(answers.focus, undefined);
  assert.equal(nextQuestion(result.facts, questions), undefined);
});

test('recomputes conclusions from the current answers', () => {
  const originalResult = infer({ goal: 'structure', structureFocus: 'data', dataDetail: 'database' }, rules);
  assert.equal(originalResult.facts.recommendation, 'er');
  const revisedResult = infer({ goal: 'structure', structureFocus: 'objects' }, rules);
  assert.equal(revisedResult.facts.recommendation, undefined);
  assert.equal(nextQuestion(revisedResult.facts, questions)?.id, 'objectsDetail');
});

test('rejects conflicting conclusions for the same fact', () => {
  const conflictingRules = [
    { id: 'A', when: {}, then: { fact: 'recommendation', value: 'a' }, explanation: '' },
    { id: 'B', when: {}, then: { fact: 'recommendation', value: 'b' }, explanation: '' },
  ];
  assert.throws(() => infer({}, conflictingRules), /Conflicting conclusion/);
});

test('uses unique IDs and valid diagram references throughout the knowledge base', () => {
  assert.equal(rules.length, 48);
  assert.equal(new Set(rules.map((rule) => rule.id)).size, rules.length);
  assert.equal(new Set(questions.map((question) => question.id)).size, questions.length);
  for (const question of questions) {
    assert.equal(new Set(question.options.map((option) => option.value)).size, question.options.length);
  }
  for (const rule of rules) {
    assert.ok(Object.keys(rule.when).length);
    assert.ok(rule.explanation);
    if (rule.then.fact === 'recommendation') assert.ok(diagrams[rule.then.value]);
  }
  for (const [diagramId, diagram] of Object.entries(diagrams)) {
    for (const relatedDiagramId of diagram.related) {
      assert.ok(diagrams[relatedDiagramId], `${diagramId} references unknown diagram ${relatedDiagramId}`);
      assert.notEqual(relatedDiagramId, diagramId);
    }
  }
});

test('reaches every question, rule, and diagram across 36 three-answer paths', () => {
  const reachedRules = new Set();
  const reachedDiagrams = new Set();
  const reachedQuestions = new Set();
  let completedPaths = 0;

  function checkPath(answers = {}) {
    const result = infer(answers, rules);
    const question = nextQuestion(result.facts, questions);
    const recommendedDiagramId = result.facts.recommendation;
    const answerCount = Object.keys(answers).length;
    if (recommendedDiagramId) {
      assert.equal(answerCount, 3);
      assert.equal(question, undefined);
      assert.ok(diagrams[recommendedDiagramId]);
      assert.equal(result.firedRules.length, 2);
      result.firedRules.forEach((rule) => reachedRules.add(rule.id));
      reachedDiagrams.add(recommendedDiagramId);
      completedPaths++;
      return;
    }
    assert.ok(question, 'The consultation must offer a question before reaching a recommendation');
    assert.ok(answerCount < 3, 'The consultation must end within three answers');
    reachedQuestions.add(question.id);
    for (const option of question.options) checkPath({ ...answers, [question.id]: option.value });
  }

  checkPath();
  assert.equal(completedPaths, 36);
  assert.equal(reachedRules.size, rules.length);
  assert.equal(reachedDiagrams.size, Object.keys(diagrams).length);
  assert.equal(reachedQuestions.size, questions.length);
});

test('counts the answers on the longest consultation path', () => {
  assert.equal(maxSteps(questions, rules), 3);
});
