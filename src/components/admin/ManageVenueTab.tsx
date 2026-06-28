"use client";

import {
  useCallback,
  useEffect,
  useState,
  type ComponentType,
  type FormEvent,
} from "react";

import { BoothHelperPanel } from "@/components/admin/BoothHelperPanel";
import {
  createAdminBooth,
  deleteAdminBooth,
  fetchAdminBooths,
  updateAdminBooth,
} from "@/lib/adminApi";
import {
  type BoothDocument,
  type BoothInput,
  type BoothType,
  boothFeatureLabel,
  checkpointModeLabel,
  emptyCheckpointQuiz,
  isAiBoothFeature,
  submissionTypeLabel,
  validateVenueInput,
} from "@/lib/booths";

type VenueFieldsProps = {
  form: BoothInput;
  onChange: (form: BoothInput) => void;
  idDisabled?: boolean;
};

type ManageVenueTabProps = {
  getToken: () => Promise<string>;
  venueType: BoothType;
  title: string;
  subtitle: string;
  addLabel: string;
  emptyLabel: string;
  emptyForm: BoothInput;
  FieldsComponent: ComponentType<VenueFieldsProps>;
  badgeClassName: string;
  accentButtonClassName: string;
  embedded?: boolean;
};

function venueToForm(booth: BoothDocument): BoothInput {
  return {
    id: booth.id,
    title: booth.title,
    code: booth.code,
    points: booth.points,
    type: booth.type,
    helperName: booth.helperName ?? "",
    posterImageUrl: booth.posterImageUrl ?? "",
    description: booth.description,
    feature: booth.feature,
    submissionType: booth.submissionType,
    submissionInstruction: booth.submissionInstruction ?? "",
    checkpointMode: booth.checkpointMode,
    checkpointQuiz:
      booth.checkpointMode === "code_and_quiz"
        ? (booth.checkpointQuiz ?? emptyCheckpointQuiz())
        : booth.checkpointQuiz,
    workshopSlides: booth.workshopSlides ?? [],
    presetPromptsEnabled: booth.presetPromptsEnabled ?? false,
    presetPrompts: booth.presetPrompts ?? [],
  };
}

function venueMetaLine(booth: BoothDocument): string {
  const parts: string[] = [];

  if (booth.type === "booth" || booth.type === "checkpoint") {
    parts.push(`Code: ${booth.code}`, `Points: ${booth.points}`);
  }

  if (booth.feature) {
    parts.push(`Feature: ${boothFeatureLabel(booth.feature)}`);
  }

  if (booth.feature === "submission" && booth.submissionType) {
    parts.push(`Submission: ${submissionTypeLabel(booth.submissionType)}`);
  }

  if (isAiBoothFeature(booth.feature)) {
    parts.push("AI activity");
  }

  if (booth.presetPromptsEnabled && booth.presetPrompts?.length) {
    parts.push(`Pre-set prompts: ${booth.presetPrompts.length}`);
  }

  if (booth.checkpointMode) {
    parts.push(`Mode: ${checkpointModeLabel(booth.checkpointMode)}`);
  }

  if (
    booth.checkpointMode === "code_and_image" &&
    booth.submissionInstruction?.trim()
  ) {
    parts.push("Submission: Image");
  }

  if (booth.workshopSlides && booth.workshopSlides.length > 0) {
    parts.push(`Slides: ${booth.workshopSlides.length}`);
  }

  if (booth.helperName) {
    parts.push(`Helper: ${booth.helperName}`);
  }

  return parts.join(" · ");
}

function venueBadgeLabel(booth: BoothDocument): string {
  if (booth.feature) {
    return boothFeatureLabel(booth.feature);
  }

  if (booth.checkpointMode) {
    return checkpointModeLabel(booth.checkpointMode);
  }

  return booth.type;
}

export function ManageVenueTab({
  getToken,
  venueType,
  title,
  subtitle,
  addLabel,
  emptyLabel,
  emptyForm,
  FieldsComponent,
  badgeClassName,
  accentButtonClassName,
  embedded = false,
}: ManageVenueTabProps) {
  const [venues, setVenues] = useState<BoothDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addForm, setAddForm] = useState<BoothInput>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingVenue, setViewingVenue] = useState<BoothDocument | null>(null);
  const [editForm, setEditForm] = useState<BoothInput>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const loadVenues = useCallback(async () => {
    const token = await getToken();
    const data = await fetchAdminBooths(token);
    setVenues(data.filter((venue) => venue.type === venueType));
  }, [getToken, venueType]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setLoading(true);
      setError(null);

      try {
        await loadVenues();
      } catch (loadError) {
        if (!cancelled) {
          console.error(loadError);
          setError(
            loadError instanceof Error
              ? loadError.message
              : `Could not load ${title.toLowerCase()}.`,
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [loadVenues, title]);

  async function handleAddSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateVenueInput(addForm, venueType);

    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const token = await getToken();
      await createAdminBooth(token, { ...addForm, type: venueType });
      setAddForm(emptyForm);
      setMessage(`${addLabel} added.`);
      await loadVenues();
    } catch (submitError) {
      console.error(submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : `Could not add ${addLabel.toLowerCase()}.`,
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingId) {
      return;
    }

    const validationError = validateVenueInput(editForm, venueType);

    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const token = await getToken();
      await updateAdminBooth(token, editingId, {
        ...editForm,
        type: venueType,
      });
      setEditingId(null);
      setMessage(`${addLabel} updated.`);
      await loadVenues();
    } catch (submitError) {
      console.error(submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : `Could not update ${addLabel.toLowerCase()}.`,
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(venueId: string) {
    const confirmed = window.confirm(`Delete ${venueId}?`);

    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const token = await getToken();
      await deleteAdminBooth(token, venueId);

      if (editingId === venueId) {
        setEditingId(null);
      }

      if (viewingVenue?.id === venueId) {
        setViewingVenue(null);
      }

      setMessage(`${addLabel} deleted.`);
      await loadVenues();
    } catch (submitError) {
      console.error(submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : `Could not delete ${addLabel.toLowerCase()}.`,
      );
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(venue: BoothDocument) {
    setViewingVenue(null);
    setEditingId(venue.id);
    setEditForm(venueToForm(venue));
    setError(null);
    setMessage(null);
  }

  function startView(venue: BoothDocument) {
    setEditingId(null);
    setViewingVenue(venue);
    setError(null);
    setMessage(null);
  }

  if (loading) {
    return <p className="text-lg text-slate-600">Loading {title.toLowerCase()}...</p>;
  }

  if (viewingVenue) {
    return (
      <BoothHelperPanel
        booth={viewingVenue}
        getToken={getToken}
        onBack={() => setViewingVenue(null)}
      />
    );
  }

  return (
    <div className="space-y-8">
      {!embedded ? (
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
          <p className="mt-1 text-slate-600">{subtitle}</p>
        </div>
      ) : null}

      {message ? (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-emerald-800">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6">
        <h3 className="text-xl font-bold text-slate-900">Add {addLabel.toLowerCase()}</h3>
        <form className="mt-6 space-y-6" onSubmit={handleAddSubmit}>
          <FieldsComponent form={addForm} onChange={setAddForm} />
          <button
            type="submit"
            disabled={submitting}
            className={`rounded-xl px-6 py-4 text-lg font-semibold text-white transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${accentButtonClassName}`}
          >
            Add {addLabel.toLowerCase()}
          </button>
        </form>
      </section>

      <section>
        <h3 className="text-xl font-bold text-slate-900">
          Existing {addLabel.toLowerCase()}s ({venues.length})
        </h3>

        {venues.length === 0 ? (
          <p className="mt-4 text-lg text-slate-600">{emptyLabel}</p>
        ) : (
          <ul className="mt-6 space-y-4">
            {venues.map((venue) => (
              <li
                key={venue.id}
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xl font-bold text-slate-900">
                        {venue.id} · {venue.title}
                      </h4>
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-medium ${badgeClassName}`}
                      >
                        {venueBadgeLabel(venue)}
                      </span>
                    </div>
                    {venue.description.trim() ? (
                      <p className="mt-2 whitespace-pre-wrap text-slate-600">
                        {venue.description}
                      </p>
                    ) : null}
                    <p className="mt-2 text-sm text-slate-500">
                      {venueMetaLine(venue)}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => startView(venue)}
                      disabled={submitting}
                      className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800 transition active:bg-blue-100"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(venue)}
                      disabled={submitting}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(venue.id)}
                      disabled={submitting}
                      className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {editingId === venue.id ? (
                  <form
                    className="mt-5 space-y-4 border-t border-slate-100 pt-5"
                    onSubmit={handleEditSubmit}
                  >
                    <FieldsComponent
                      form={editForm}
                      onChange={setEditForm}
                      idDisabled
                    />
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={submitting}
                        className={`rounded-xl px-5 py-3 text-base font-semibold text-white transition ${accentButtonClassName}`}
                      >
                        Save changes
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-base font-semibold text-slate-800 transition hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
