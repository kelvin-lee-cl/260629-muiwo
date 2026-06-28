import { useState } from "react";

import {
  BOOTH_FEATURES,
  type BoothInput,
  boothFeatureLabel,
  isPromptBasedAiFeature,
  normalizeBoothId,
  venueIdPlaceholder,
} from "@/lib/booths";
import { PresetPromptsFields } from "@/components/admin/PresetPromptsFields";
import { SubmissionSettingsFields } from "@/components/admin/SubmissionSettingsFields";
import { SlideCarousel } from "@/components/student/SlideCarousel";

type WorkshopFieldsProps = {
  form: BoothInput;
  onChange: (form: BoothInput) => void;
  idDisabled?: boolean;
};

export function WorkshopFields({
  form,
  onChange,
  idDisabled = false,
}: WorkshopFieldsProps) {
  const [newSlidePaths, setNewSlidePaths] = useState("");

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

  function handleAddSlides() {
    const paths = newSlidePaths
      .split(/[\n,]+/)
      .map((path) => path.trim())
      .filter(Boolean);

    if (paths.length === 0) {
      return;
    }

    const existing = form.workshopSlides ?? [];
    const newPaths = paths.filter((path) => !existing.includes(path));

    if (newPaths.length === 0) {
      return;
    }

    updateField("workshopSlides", [...existing, ...newPaths]);
    setNewSlidePaths("");
  }

  function removeSlide(path: string) {
    updateField(
      "workshopSlides",
      (form.workshopSlides ?? []).filter((slide) => slide !== path),
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block sm:col-span-1">
        <span className="mb-2 block text-sm font-medium text-slate-700">
          Workshop ID
        </span>
        <input
          type="text"
          value={form.id}
          disabled={idDisabled}
          onChange={(event) =>
            updateField("id", normalizeBoothId(event.target.value).slice(0, 3))
          }
          placeholder={venueIdPlaceholder("workshop")}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:bg-slate-100"
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
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
        >
          <option value="">No feature</option>
          {BOOTH_FEATURES.map((feature) => (
            <option key={feature} value={feature}>
              {boothFeatureLabel(feature)}
            </option>
          ))}
        </select>
      </label>

      <SubmissionSettingsFields
        form={form}
        onChange={onChange}
        accentClassName="focus:border-violet-400 focus:ring-violet-100"
      />

      <PresetPromptsFields
        form={form}
        onChange={onChange}
        accentClassName="focus:border-violet-400 focus:ring-violet-100"
      />

      <label className="block sm:col-span-2">
        <span className="mb-2 block text-sm font-medium text-slate-700">
          Title
        </span>
        <input
          type="text"
          value={form.title}
          onChange={(event) => updateField("title", event.target.value)}
          placeholder="Art Bot Workshop"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
        />
      </label>

      <label className="block sm:col-span-1">
        <span className="mb-2 block text-sm font-medium text-slate-700">
          Helper name (optional)
        </span>
        <input
          type="text"
          value={form.helperName}
          onChange={(event) => updateField("helperName", event.target.value)}
          placeholder="Team Recraft"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
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
          placeholder="/booths/art-bot.svg"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
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
          placeholder="Tell students what they will do in this workshop."
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
        />
      </label>

      <div className="space-y-4 rounded-2xl border border-violet-100 bg-violet-50/50 p-5 sm:col-span-2">
        <div>
          <p className="text-sm font-semibold text-violet-950">
            Workshop slides
          </p>
          <p className="mt-1 text-sm text-violet-800">
            Add image paths from the public folder (same format as booth or
            workshop poster images). Enter one path per line to add multiple
            slides. Students browse them one at a time in the workshop.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <textarea
            value={newSlidePaths}
            onChange={(event) => setNewSlidePaths(event.target.value)}
            rows={3}
            placeholder={"/workshops/w01/slide-01.png\n/workshops/w01/slide-02.png"}
            className="w-full rounded-xl border border-violet-200 bg-white px-4 py-3 font-mono text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
          />
          <button
            type="button"
            onClick={handleAddSlides}
            disabled={!newSlidePaths.trim()}
            className="shrink-0 rounded-xl border border-violet-300 bg-white px-5 py-3 text-sm font-semibold text-violet-900 transition hover:bg-violet-50 focus:outline-none focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-60 sm:self-start"
          >
            Add slides
          </button>
        </div>

        {(form.workshopSlides ?? []).length > 0 ? (
          <>
            <ul className="space-y-2 rounded-xl border border-violet-100 bg-white p-3">
              {(form.workshopSlides ?? []).map((slide, index) => (
                <li
                  key={slide}
                  className="flex items-start justify-between gap-3 rounded-lg bg-violet-50/50 px-3 py-2"
                >
                  <p className="min-w-0 break-all font-mono text-sm text-slate-700">
                    <span className="mr-2 font-semibold text-slate-500">
                      {index + 1}.
                    </span>
                    {slide}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeSlide(slide)}
                    className="shrink-0 rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>

            <SlideCarousel
              slides={form.workshopSlides ?? []}
              title="Slides preview"
              counterLabel="Slide"
              className=""
            />
          </>
        ) : (
          <p className="text-sm text-violet-700">No slides added yet.</p>
        )}
      </div>
    </div>
  );
}
