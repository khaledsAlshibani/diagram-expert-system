export type Facts = Readonly<Partial<Record<string, string>>>;

export interface Rule {
  id: string;
  when: Facts;
  then: { fact: string; value: string };
  explanation: string;
}

export interface Question {
  id: string;
  prompt: string;
  when: Facts;
  options: { value: string; label: string }[];
}

export interface Diagram {
  name: string;
  description: string;
  example: string;
  related: string[];
}

export interface InferenceResult {
  facts: Facts;
  firedRules: Rule[];
}
