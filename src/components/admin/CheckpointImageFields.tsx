import type { BoothInput } from "@/lib/booths";

type CheckpointImageFieldsProps = {
  form: BoothInput;
  onChange: (form: BoothInput) => void;
};

export function CheckpointImageFields({
  form,
  onChange,
}: CheckpointImageFieldsProps) {
  if (form.checkpointMode !== "code_and_image") {
    return null;
  }

  return (
    <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 sm:col-span-2">
      <div>
        <p className="text-sm font-semibold text-emerald-900">Image upload</p>
        <p className="mt-1 text-sm text-emerald-800">
          Students enter the checkpoint code, then upload an image to earn points.
        </p>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">
          Submission instructions
        </span>
        <textarea
          rows={3}
          value={form.submissionInstruction ?? ""}
          onChange={(event) =>
            onChange({ ...form, submissionInstruction: event.target.value })
          }
          placeholder="Tell students what photo to upload, e.g. a picture of your completed worksheet."
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
        />
      </label>
    </div>
  );
}
