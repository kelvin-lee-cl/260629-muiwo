import {
  CHECKPOINT_QUIZ_OPTION_COUNT,
  type BoothInput,
  type CheckpointQuiz,
  emptyCheckpointQuiz,
} from "@/lib/booths";

const OPTION_LABELS = ["A", "B", "C", "D"] as const;

type CheckpointQuizFieldsProps = {
  form: BoothInput;
  onChange: (form: BoothInput) => void;
};

export function CheckpointQuizFields({
  form,
  onChange,
}: CheckpointQuizFieldsProps) {
  if (form.checkpointMode !== "code_and_quiz") {
    return null;
  }

  const quiz = form.checkpointQuiz ?? emptyCheckpointQuiz();

  function updateQuiz(nextQuiz: CheckpointQuiz) {
    onChange({ ...form, checkpointQuiz: nextQuiz });
  }

  function updateOption(index: number, value: string) {
    const options = [...quiz.options];
    options[index] = value;
    updateQuiz({ ...quiz, options });
  }

  return (
    <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 sm:col-span-2">
      <div>
        <p className="text-sm font-semibold text-emerald-900">
          Multiple-choice question
        </p>
        <p className="mt-1 text-sm text-emerald-800">
          Students enter the checkpoint code, then answer this question to earn
          points.
        </p>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">
          Question
        </span>
        <textarea
          rows={3}
          value={quiz.question}
          onChange={(event) =>
            updateQuiz({ ...quiz, question: event.target.value })
          }
          placeholder="What is the main purpose of a checkpoint in this event?"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
        />
      </label>

      <fieldset>
        <legend className="mb-3 block text-sm font-medium text-slate-700">
          Answer options
        </legend>
        <div className="space-y-3">
          {Array.from({ length: CHECKPOINT_QUIZ_OPTION_COUNT }, (_, index) => (
            <div
              key={OPTION_LABELS[index]}
              className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3"
            >
              <label className="flex shrink-0 cursor-pointer items-center gap-2 pt-3">
                <input
                  type="radio"
                  name={`checkpoint-quiz-correct-${form.id || "new"}`}
                  checked={quiz.correctOptionIndex === index}
                  onChange={() =>
                    updateQuiz({ ...quiz, correctOptionIndex: index })
                  }
                  className="h-4 w-4 border-slate-300 text-emerald-600 focus:ring-emerald-200"
                />
                <span className="text-sm font-semibold text-slate-700">
                  {OPTION_LABELS[index]}
                </span>
              </label>
              <label className="block flex-1">
                <span className="sr-only">Option {OPTION_LABELS[index]}</span>
                <input
                  type="text"
                  value={quiz.options[index] ?? ""}
                  onChange={(event) => updateOption(index, event.target.value)}
                  placeholder={`Option ${OPTION_LABELS[index]}`}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                />
              </label>
            </div>
          ))}
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Select the radio button next to the correct answer.
        </p>
      </fieldset>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">
          Response after correct answer
        </span>
        <textarea
          rows={2}
          value={quiz.correctResponse}
          onChange={(event) =>
            updateQuiz({ ...quiz, correctResponse: event.target.value })
          }
          placeholder="Great job! You got it right."
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">
          Response after incorrect answer
        </span>
        <textarea
          rows={2}
          value={quiz.incorrectResponse}
          onChange={(event) =>
            updateQuiz({ ...quiz, incorrectResponse: event.target.value })
          }
          placeholder="Not quite. Try again or ask a helper for a hint."
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
        />
      </label>
    </div>
  );
}
