import {
  emptyPresetPrompt,
  isPromptBasedAiFeature,
  type BoothInput,
  type PresetPrompt,
} from "@/lib/booths";

type PresetPromptsFieldsProps = {
  form: BoothInput;
  onChange: (form: BoothInput) => void;
  accentClassName?: string;
};

export function PresetPromptsFields({
  form,
  onChange,
  accentClassName = "focus:border-blue-400 focus:ring-blue-100",
}: PresetPromptsFieldsProps) {
  if (!isPromptBasedAiFeature(form.feature)) {
    return null;
  }

  const prompts = form.presetPrompts ?? [];

  function updatePrompts(nextPrompts: PresetPrompt[]) {
    onChange({ ...form, presetPrompts: nextPrompts });
  }

  function toggleEnabled(enabled: boolean) {
    onChange({
      ...form,
      presetPromptsEnabled: enabled,
      presetPrompts: enabled
        ? prompts.length > 0
          ? prompts
          : [emptyPresetPrompt()]
        : undefined,
    });
  }

  function updatePrompt(index: number, key: keyof PresetPrompt, value: string) {
    const nextPrompts = prompts.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [key]: value } : item,
    );
    updatePrompts(nextPrompts);
  }

  function addPrompt() {
    updatePrompts([...prompts, emptyPresetPrompt()]);
  }

  function removePrompt(index: number) {
    const nextPrompts = prompts.filter((_, itemIndex) => itemIndex !== index);
    updatePrompts(nextPrompts.length > 0 ? nextPrompts : [emptyPresetPrompt()]);
  }

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 sm:col-span-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Pre-set prompts
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Offer named prompt buttons that students can tap to fill the prompt
            input. They can switch between prompts or edit the text themselves.
          </p>
        </div>

        <label className="flex shrink-0 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <input
            type="checkbox"
            checked={Boolean(form.presetPromptsEnabled)}
            onChange={(event) => toggleEnabled(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-slate-700">
            Enable pre-set prompts
          </span>
        </label>
      </div>

      {form.presetPromptsEnabled ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Prompt name
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Full prompt statement
                </th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {prompts.map((item, index) => (
                <tr key={index}>
                  <td className="px-4 py-3 align-top">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(event) =>
                        updatePrompt(index, "name", event.target.value)
                      }
                      placeholder="Story starter"
                      className={`w-full min-w-40 rounded-lg border border-slate-200 px-3 py-2 text-base outline-none transition ${accentClassName}`}
                    />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <textarea
                      rows={3}
                      value={item.prompt}
                      onChange={(event) =>
                        updatePrompt(index, "prompt", event.target.value)
                      }
                      placeholder="Write a short story about a robot learning to paint..."
                      className={`w-full min-w-64 rounded-lg border border-slate-200 px-3 py-2 text-base outline-none transition ${accentClassName}`}
                    />
                  </td>
                  <td className="px-4 py-3 align-top text-right">
                    <button
                      type="button"
                      onClick={() => removePrompt(index)}
                      disabled={prompts.length === 1}
                      className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t border-slate-200 px-4 py-3">
            <button
              type="button"
              onClick={addPrompt}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Add prompt
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
