import {
  CHECKPOINT_MODES,
  type BoothInput,
  checkpointModeLabel,
  emptyCheckpointQuiz,
  normalizeBoothCode,
  normalizeBoothId,
  venueIdPlaceholder,
} from "@/lib/booths";
import { CheckpointImageFields } from "@/components/admin/CheckpointImageFields";
import { CheckpointQuizFields } from "@/components/admin/CheckpointQuizFields";

type CheckpointFieldsProps = {
  form: BoothInput;
  onChange: (form: BoothInput) => void;
  idDisabled?: boolean;
};

export function CheckpointFields({
  form,
  onChange,
  idDisabled = false,
}: CheckpointFieldsProps) {
  function updateField<K extends keyof BoothInput>(
    key: K,
    value: BoothInput[K],
  ) {
    onChange({ ...form, [key]: value });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block sm:col-span-1">
        <span className="mb-2 block text-sm font-medium text-slate-700">
          Checkpoint ID
        </span>
        <input
          type="text"
          value={form.id}
          disabled={idDisabled}
          onChange={(event) =>
            updateField("id", normalizeBoothId(event.target.value).slice(0, 3))
          }
          placeholder={venueIdPlaceholder("checkpoint")}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 disabled:bg-slate-100"
        />
      </label>

      <label className="block sm:col-span-1">
        <span className="mb-2 block text-sm font-medium text-slate-700">
          3-digit code
        </span>
        <input
          type="text"
          inputMode="numeric"
          maxLength={3}
          value={form.code}
          onChange={(event) =>
            updateField("code", normalizeBoothCode(event.target.value))
          }
          placeholder="739"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
        />
      </label>

      <label className="block sm:col-span-2">
        <span className="mb-2 block text-sm font-medium text-slate-700">
          Title
        </span>
        <input
          type="text"
          value={form.title}
          onChange={(event) => updateField("title", event.target.value)}
          placeholder="Math Maze Checkpoint"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
        />
      </label>

      <label className="block sm:col-span-1">
        <span className="mb-2 block text-sm font-medium text-slate-700">
          Points
        </span>
        <input
          type="number"
          min={0}
          value={form.points}
          onChange={(event) =>
            updateField("points", Number(event.target.value))
          }
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
        />
      </label>

      <label className="block sm:col-span-1">
        <span className="mb-2 block text-sm font-medium text-slate-700">
          Checkpoint mode
        </span>
        <select
          value={form.checkpointMode ?? ""}
          onChange={(event) => {
            const nextMode = event.target.value
              ? (event.target.value as BoothInput["checkpointMode"])
              : undefined;

            if (nextMode === "code_and_quiz") {
              onChange({
                ...form,
                checkpointMode: nextMode,
                checkpointQuiz: form.checkpointQuiz ?? emptyCheckpointQuiz(),
              });
              return;
            }

            if (nextMode === "code_and_image") {
              onChange({
                ...form,
                checkpointMode: nextMode,
                submissionInstruction: form.submissionInstruction ?? "",
              });
              return;
            }

            updateField("checkpointMode", nextMode);
          }}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
        >
          <option value="">Choose a mode...</option>
          {CHECKPOINT_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {checkpointModeLabel(mode)}
            </option>
          ))}
        </select>
      </label>

      <label className="block sm:col-span-1">
        <span className="mb-2 block text-sm font-medium text-slate-700">
          Helper name (optional)
        </span>
        <input
          type="text"
          value={form.helperName}
          onChange={(event) => updateField("helperName", event.target.value)}
          placeholder="STEM Helpers"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
        />
      </label>

      <label className="block sm:col-span-1">
        <span className="mb-2 block text-sm font-medium text-slate-700">
          Checkpoint image URL (optional, shown to students)
        </span>
        <input
          type="text"
          value={form.posterImageUrl}
          onChange={(event) =>
            updateField("posterImageUrl", event.target.value)
          }
          placeholder="Leave blank for no image"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
        />
      </label>

      <label className="block sm:col-span-2">
        <span className="mb-2 block text-sm font-medium text-slate-700">
          Description (optional)
        </span>
        <textarea
          rows={4}
          value={form.description}
          onChange={(event) => updateField("description", event.target.value)}
          placeholder="Tell students what this checkpoint is about."
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
        />
      </label>

      <CheckpointQuizFields form={form} onChange={onChange} />
      <CheckpointImageFields form={form} onChange={onChange} />
    </div>
  );
}
