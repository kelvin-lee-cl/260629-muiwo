import {
  SUBMISSION_TYPES,
  type BoothInput,
  submissionTypeLabel,
} from "@/lib/booths";

type SubmissionSettingsFieldsProps = {
  form: BoothInput;
  onChange: (form: BoothInput) => void;
  accentClassName?: string;
};

export function SubmissionSettingsFields({
  form,
  onChange,
  accentClassName = "focus:border-blue-400 focus:ring-blue-100",
}: SubmissionSettingsFieldsProps) {
  if (form.feature !== "submission") {
    return null;
  }

  function updateField<K extends keyof BoothInput>(
    key: K,
    value: BoothInput[K],
  ) {
    onChange({ ...form, [key]: value });
  }

  return (
    <>
      <label className="block sm:col-span-1">
        <span className="mb-2 block text-sm font-medium text-slate-700">
          Submission type
        </span>
        <select
          value={form.submissionType ?? "text"}
          onChange={(event) =>
            updateField(
              "submissionType",
              event.target.value as BoothInput["submissionType"],
            )
          }
          className={`w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition ${accentClassName}`}
        >
          {SUBMISSION_TYPES.map((type) => (
            <option key={type} value={type}>
              {submissionTypeLabel(type)}
            </option>
          ))}
        </select>
      </label>

      <label className="block sm:col-span-2">
        <span className="mb-2 block text-sm font-medium text-slate-700">
          Submission instructions
        </span>
        <textarea
          rows={3}
          value={form.submissionInstruction ?? ""}
          onChange={(event) =>
            updateField("submissionInstruction", event.target.value)
          }
          placeholder="Tell students what to submit, e.g. paste your project link or upload a photo of your work."
          className={`w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition ${accentClassName}`}
        />
      </label>
    </>
  );
}
