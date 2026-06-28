import {
  BOOTH_FEATURES,
  type BoothInput,
  boothFeatureLabel,
  isPromptBasedAiFeature,
  normalizeBoothCode,
  normalizeBoothId,
  venueIdPlaceholder,
} from "@/lib/booths";
import { PresetPromptsFields } from "@/components/admin/PresetPromptsFields";
import { SubmissionSettingsFields } from "@/components/admin/SubmissionSettingsFields";

type BoothFieldsProps = {
  form: BoothInput;
  onChange: (form: BoothInput) => void;
  idDisabled?: boolean;
};

export function BoothFields({
  form,
  onChange,
  idDisabled = false,
}: BoothFieldsProps) {
  function updateField<K extends keyof BoothInput>(
    key: K,
    value: BoothInput[K],
  ) {
    onChange({ ...form, [key]: value });
  }

  function handleFeatureChange(nextFeature: BoothInput["feature"]) {
    if (nextFeature === "submission") {
      onChange({
        ...form,
        feature: nextFeature,
        submissionType: form.submissionType ?? "text",
        submissionInstruction: form.submissionInstruction ?? "",
        presetPromptsEnabled: false,
        presetPrompts: undefined,
      });
      return;
    }

    onChange({
      ...form,
      feature: nextFeature,
      presetPromptsEnabled: isPromptBasedAiFeature(nextFeature)
        ? form.presetPromptsEnabled
        : false,
      presetPrompts: isPromptBasedAiFeature(nextFeature)
        ? form.presetPrompts
        : undefined,
    });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block sm:col-span-1">
        <span className="mb-2 block text-sm font-medium text-slate-700">
          Booth ID
        </span>
        <input
          type="text"
          value={form.id}
          disabled={idDisabled}
          onChange={(event) =>
            updateField("id", normalizeBoothId(event.target.value).slice(0, 3))
          }
          placeholder={venueIdPlaceholder("booth")}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
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
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
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
          placeholder="Robotics Arena"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
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
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        />
      </label>

      <label className="block sm:col-span-1">
        <span className="mb-2 block text-sm font-medium text-slate-700">
          Feature (optional)
        </span>
        <select
          value={form.feature ?? ""}
          onChange={(event) =>
            handleFeatureChange(
              event.target.value
                ? (event.target.value as BoothInput["feature"])
                : undefined,
            )
          }
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        >
          <option value="">No feature</option>
          {BOOTH_FEATURES.map((feature) => (
            <option key={feature} value={feature}>
              {boothFeatureLabel(feature)}
            </option>
          ))}
        </select>
      </label>

      <SubmissionSettingsFields form={form} onChange={onChange} />

      <PresetPromptsFields form={form} onChange={onChange} />

      <label className="block sm:col-span-1">
        <span className="mb-2 block text-sm font-medium text-slate-700">
          Helper name (optional)
        </span>
        <input
          type="text"
          value={form.helperName}
          onChange={(event) => updateField("helperName", event.target.value)}
          placeholder="Mr. Lee"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        />
      </label>

      <label className="block sm:col-span-1">
        <span className="mb-2 block text-sm font-medium text-slate-700">
          Poster image URL (optional)
        </span>
        <input
          type="text"
          value={form.posterImageUrl}
          onChange={(event) =>
            updateField("posterImageUrl", event.target.value)
          }
          placeholder="/booths/robotics.svg"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
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
          placeholder="Tell students what they will do at this booth."
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        />
      </label>
    </div>
  );
}
