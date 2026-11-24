import type { Diagram, Question, Rule } from '../types.ts';
import questionDefinitions from './questions.json';
import ruleDefinitions from './rules.json';
import diagramDefinitions from './diagrams.json';

export const questions: readonly Question[] = questionDefinitions;
export const rules: readonly Rule[] = ruleDefinitions;
export const diagrams: Readonly<Record<string, Diagram>> = diagramDefinitions;
