import { useMemo, useState } from "react";
import type { Transaction } from "../../src/types";
import { createAssistant, type Answer } from "../../src/assistant/query";

interface AskProps {
  transactions: readonly Transaction[];
}

interface Turn {
  question: string;
  answer: Answer;
}

const SUGGESTIONS = [
  "How much did I spend in total?",
  "What did I spend on food?",
  "Top merchants?",
  "What are my subscriptions?",
  "What was my biggest transaction?",
];

export function Ask({ transactions }: AskProps) {
  const assistant = useMemo(() => createAssistant(transactions), [transactions]);
  const [draft, setDraft] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);

  function send(question: string) {
    const q = question.trim();
    if (!q) return;
    setTurns((prev) => [...prev, { question: q, answer: assistant.ask(q) }]);
    setDraft("");
  }

  return (
    <div className="ask">
      <div className="card">
        <h3>Ask</h3>
        <p className="muted">
          Answered on device from your transactions. No model is loaded in this
          web demo, so a deterministic rule engine stands in for on device Qwen.
        </p>
        <div className="suggestions">
          {SUGGESTIONS.map((s) => (
            <button key={s} className="chip" onClick={() => send(s)}>
              {s}
            </button>
          ))}
        </div>
        <div className="conversation">
          {turns.map((t, i) => (
            <div key={i} className="turn">
              <p className="q">{t.question}</p>
              <p className="a">{t.answer.text}</p>
            </div>
          ))}
        </div>
        <form
          className="ask-form"
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask about your spending..."
            aria-label="Ask a question"
          />
          <button type="submit">Ask</button>
        </form>
      </div>
    </div>
  );
}
