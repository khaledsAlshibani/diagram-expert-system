# Diagram Expert System

Principles of Artificial Intelligence course, Assignment 1.

A rule-based expert system that recommends a diagram based on the user's modelling requirements and explains its reasoning. It runs entirely in the browser, using TypeScript and Vite without a UI framework, backend, database or AI API.

## Run locally

Requires Node.js 22.16 or later.

```sh
npm install
npm run dev
```

```sh
npm test       # Inference engine and all consultation paths
npm run build  # Type checking and production build
```

## How the system works

1. The consultation begins by asking the user what they want to model.
2. Each answer adds a fact to working memory.
3. The inference engine applies IF–THEN rules using forward chaining. A matching rule can infer another fact, which can make further rules or questions applicable.
4. The interface asks the next applicable question until a rule concludes which diagram to recommend.
5. The recommendation includes a description, an example and the explanations of the rules that fired. The user can go back or restart.

The knowledge base contains **48 rules**, **19 questions** and **28 diagram types**. Each consultation follows one of 36 paths and requires three answers. The rules are manually authored; the system is deterministic and does not train a model.

### Example consultation

- Goal: Interactions and user requirements
- Focus: Messages exchanged between participants
- Detail: Their chronological order

The system infers the focus `messages`, then applies the recommendation rule:

```text
IF focus = messages AND messages-detail = order
THEN recommendation = sequence
```

Result: **UML Sequence Diagram**. It shows the chronological exchange of messages between participants.

## Structure

```text
src/
  knowledge-base/
    questions.json       # Questions, options and prerequisites
    rules.json           # IF–THEN rules and explanations
    diagrams.json        # Diagram definitions and examples
    index.ts             # Typed access to the knowledge base
  inference-engine.ts    # Forward chaining and question selection
  types.ts               # Shared types
  main.ts                # Consultation interface
  style.css              # Responsive styling
tests/
  engine.test.mjs        # Rule and consultation tests
```

The knowledge base can be extended independently of the inference engine. The tests traverse every possible consultation to check that no path reaches a dead end, all rules and diagram types are reachable, and conflicting conclusions are rejected.

This is a teaching prototype. Real modelling problems may benefit from more than one diagram; this system recommends a single diagram based on the user's primary objective.
