"use client";

import { useCallback, useEffect, useState } from "react";

import { SlideCarousel } from "@/components/student/SlideCarousel";

import { RegisterStudentsPanel } from "@/components/admin/RegisterStudentsPanel";

import {
  addAdminHelpers,
  DELETE_ALL_BOOTHS_PHRASE,
  DELETE_ALL_STUDENT_WORKS_PHRASE,
  deleteAdminBooths,
  deleteAdminStudentWorks,
  exportAdminEventData,
  exportAdminStudentWorks,
  fetchAdminEventSettings,
  fetchAdminHelpers,
  removeAdminHelper,
  RESET_CONFIRMATION_PHRASE,
  resetAdminEventData,
  updateAdminEventFrozen,
  updateAdminGalleryImages,
  updateAdminProjectNotes,
  type AdminHelperSummary,
} from "@/lib/adminApi";

type EventControlsTabProps = {
  getToken: () => Promise<string>;
};

export function EventControlsTab({ getToken }: EventControlsTabProps) {
  const [frozen, setFrozen] = useState(false);
  const [projectNotes, setProjectNotes] = useState("");
  const [savedProjectNotes, setSavedProjectNotes] = useState("");
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [savedGalleryImages, setSavedGalleryImages] = useState<string[]>([]);
  const [newGalleryImageUrl, setNewGalleryImageUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [savingGallery, setSavingGallery] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState("");
  const [showDeleteBoothsDialog, setShowDeleteBoothsDialog] = useState(false);
  const [deleteBoothsConfirmation, setDeleteBoothsConfirmation] = useState("");
  const [showDeleteStudentWorksDialog, setShowDeleteStudentWorksDialog] =
    useState(false);
  const [deleteStudentWorksConfirmation, setDeleteStudentWorksConfirmation] =
    useState("");
  const [helpers, setHelpers] = useState<AdminHelperSummary[]>([]);
  const [helperEmailsInput, setHelperEmailsInput] = useState("");
  const [loadingHelpers, setLoadingHelpers] = useState(true);
  const [savingHelpers, setSavingHelpers] = useState(false);
  const [removingHelperEmail, setRemovingHelperEmail] = useState<string | null>(
    null,
  );

  const loadSettings = useCallback(async () => {
    const token = await getToken();
    return fetchAdminEventSettings(token);
  }, [getToken]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setLoading(true);
      setError(null);

      try {
        const settings = await loadSettings();

        if (!cancelled) {
          setFrozen(settings.frozen);
          setProjectNotes(settings.projectNotes);
          setSavedProjectNotes(settings.projectNotes);
          setGalleryImages(settings.galleryImages);
          setSavedGalleryImages(settings.galleryImages);
        }
      } catch (loadError) {
        if (!cancelled) {
          console.error(loadError);
          setError("Could not load event settings.");
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
  }, [loadSettings]);

  useEffect(() => {
    let cancelled = false;

    async function loadHelpers() {
      setLoadingHelpers(true);

      try {
        const token = await getToken();
        const rows = await fetchAdminHelpers(token);

        if (!cancelled) {
          setHelpers(rows);
        }
      } catch (loadError) {
        if (!cancelled) {
          console.error(loadError);
          setError("Could not load admin helpers.");
        }
      } finally {
        if (!cancelled) {
          setLoadingHelpers(false);
        }
      }
    }

    void loadHelpers();

    return () => {
      cancelled = true;
    };
  }, [getToken]);

  async function handleAddHelpers() {
    const trimmed = helperEmailsInput.trim();

    if (!trimmed) {
      return;
    }

    setSavingHelpers(true);
    setError(null);
    setMessage(null);

    try {
      const token = await getToken();
      const result = await addAdminHelpers(token, trimmed);
      setHelpers(result.helpers);
      setHelperEmailsInput("");

      const parts: string[] = [];

      if (result.added.length > 0) {
        parts.push(
          `Added ${result.added.length} helper${result.added.length === 1 ? "" : "s"}.`,
        );
      }

      if (result.skipped.length > 0) {
        parts.push(
          `Skipped ${result.skipped.length} already listed.`,
        );
      }

      if (result.invalid.length > 0) {
        parts.push(
          `Ignored ${result.invalid.length} invalid address${result.invalid.length === 1 ? "" : "es"}.`,
        );
      }

      setMessage(parts.join(" ") || "No changes made.");
    } catch (saveError) {
      console.error(saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not add admin helpers.",
      );
    } finally {
      setSavingHelpers(false);
    }
  }

  async function handleRemoveHelper(email: string) {
    setRemovingHelperEmail(email);
    setError(null);
    setMessage(null);

    try {
      const token = await getToken();
      const rows = await removeAdminHelper(token, email);
      setHelpers(rows);
      setMessage(`Removed helper access for ${email}.`);
    } catch (removeError) {
      console.error(removeError);
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Could not remove admin helper.",
      );
    } finally {
      setRemovingHelperEmail(null);
    }
  }

  async function handleToggleFrozen() {
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const token = await getToken();
      const settings = await updateAdminEventFrozen(token, !frozen);
      setFrozen(settings.frozen);
      setMessage(
        settings.frozen
          ? "Game frozen. Students can no longer sign in or enter codes."
          : "Game unfrozen. Students can sign in and enter codes again.",
      );
    } catch (toggleError) {
      console.error(toggleError);
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Could not update game status.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveProjectNotes() {
    setSavingNotes(true);
    setError(null);
    setMessage(null);

    try {
      const token = await getToken();
      const settings = await updateAdminProjectNotes(token, projectNotes);
      setProjectNotes(settings.projectNotes);
      setSavedProjectNotes(settings.projectNotes);
      setMessage("Project notes saved.");
    } catch (saveError) {
      console.error(saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save project notes.",
      );
    } finally {
      setSavingNotes(false);
    }
  }

  function handleAddGalleryImage() {
    const paths = newGalleryImageUrl
      .split(/[\n,]+/)
      .map((url) => url.trim())
      .filter(Boolean);

    if (paths.length === 0) {
      return;
    }

    const newPaths = paths.filter((url) => !galleryImages.includes(url));

    if (newPaths.length === 0) {
      setError("All image paths are already in the gallery.");
      return;
    }

    setGalleryImages((current) => [...current, ...newPaths]);
    setNewGalleryImageUrl("");
    setError(null);

    const skippedCount = paths.length - newPaths.length;
    if (skippedCount > 0) {
      setMessage(
        `Added ${newPaths.length} image${newPaths.length === 1 ? "" : "s"}. Skipped ${skippedCount} duplicate${skippedCount === 1 ? "" : "s"}.`,
      );
    }
  }

  function handleRemoveGalleryImage(url: string) {
    setGalleryImages((current) => current.filter((entry) => entry !== url));
  }

  async function handleSaveGalleryImages() {
    setSavingGallery(true);
    setError(null);
    setMessage(null);

    try {
      const token = await getToken();
      const settings = await updateAdminGalleryImages(token, galleryImages);
      setGalleryImages(settings.galleryImages);
      setSavedGalleryImages(settings.galleryImages);
      setMessage("Gallery images saved.");
    } catch (saveError) {
      console.error(saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save gallery images.",
      );
    } finally {
      setSavingGallery(false);
    }
  }

  async function handleExport() {
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const token = await getToken();
      await exportAdminEventData(token);
      setMessage("Downloaded scores and activity CSV files.");
    } catch (exportError) {
      console.error(exportError);
      setError(
        exportError instanceof Error
          ? exportError.message
          : "Could not export event data.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleExportStudentWorks() {
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const token = await getToken();
      await exportAdminStudentWorks(token);
      setMessage(
        "Downloaded student works ZIP with CSV, images, and text files.",
      );
    } catch (exportError) {
      console.error(exportError);
      setError(
        exportError instanceof Error
          ? exportError.message
          : "Could not download student works.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReset() {
    if (resetConfirmation !== RESET_CONFIRMATION_PHRASE) {
      setError(`Type ${RESET_CONFIRMATION_PHRASE} exactly to confirm.`);
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const token = await getToken();
      const result = await resetAdminEventData(token, resetConfirmation);
      setShowResetDialog(false);
      setResetConfirmation("");
      setFrozen(false);
      setMessage(
        `All event data removed (${result.studentsDeleted} students, ${result.visitsDeleted} visits, ${result.rateLimitsDeleted} rate limits).`,
      );
    } catch (resetError) {
      console.error(resetError);
      setError(
        resetError instanceof Error
          ? resetError.message
          : "Could not reset event data.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteBooths() {
    if (deleteBoothsConfirmation !== DELETE_ALL_BOOTHS_PHRASE) {
      setError(`Type ${DELETE_ALL_BOOTHS_PHRASE} exactly to confirm.`);
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const token = await getToken();
      const result = await deleteAdminBooths(token, deleteBoothsConfirmation);
      setShowDeleteBoothsDialog(false);
      setDeleteBoothsConfirmation("");
      setMessage(`Deleted ${result.boothsDeleted} activities.`);
    } catch (deleteError) {
      console.error(deleteError);
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete activities.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteStudentWorks() {
    if (deleteStudentWorksConfirmation !== DELETE_ALL_STUDENT_WORKS_PHRASE) {
      setError(`Type ${DELETE_ALL_STUDENT_WORKS_PHRASE} exactly to confirm.`);
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const token = await getToken();
      const result = await deleteAdminStudentWorks(
        token,
        deleteStudentWorksConfirmation,
      );
      setShowDeleteStudentWorksDialog(false);
      setDeleteStudentWorksConfirmation("");
      setMessage(`Deleted ${result.worksDeleted} student works.`);
    } catch (deleteError) {
      console.error(deleteError);
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete student works.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="text-lg text-slate-600">Loading event controls...</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Event Controls</h2>
        <p className="mt-1 text-slate-600">
          End the game, export results, download student works, or wipe event
          data.
        </p>
      </div>

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

      <RegisterStudentsPanel
        getToken={getToken}
        onMessage={setMessage}
        onError={setError}
      />

      <section className="rounded-2xl border border-blue-200 bg-blue-50/40 p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Admin helpers</h3>
            <p className="mt-2 text-slate-600">
              Helpers can use all admin tabs except Event Controls. Use Gmail
              addresses or your Google Workspace domain (@futureleadersunion.com).
              Enter one address per line to grant access in batch.
            </p>
          </div>

          <textarea
            value={helperEmailsInput}
            onChange={(event) => setHelperEmailsInput(event.target.value)}
            rows={6}
            placeholder={"helper1@gmail.com\nhelper2@gmail.com\nhelper3@futureleadersunion.com"}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Helpers sign in with the same Google admin login on the home page.
            </p>

            <button
              type="button"
              onClick={() => void handleAddHelpers()}
              disabled={savingHelpers || !helperEmailsInput.trim()}
              className="shrink-0 rounded-xl bg-blue-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingHelpers ? "Adding..." : "Add helpers"}
            </button>
          </div>

          {loadingHelpers ? (
            <p className="text-sm text-slate-500">Loading helpers...</p>
          ) : helpers.length > 0 ? (
            <ul className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
              {helpers.map((helper) => (
                <li
                  key={helper.email}
                  className="flex flex-col gap-2 rounded-lg bg-slate-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-sm text-slate-800">
                      {helper.email}
                    </p>
                    {helper.addedAt ? (
                      <p className="text-xs text-slate-500">
                        Added {new Date(helper.addedAt).toLocaleString()}
                        {helper.addedBy ? ` by ${helper.addedBy}` : ""}
                      </p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleRemoveHelper(helper.email)}
                    disabled={removingHelperEmail === helper.email}
                    className="shrink-0 rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {removingHelperEmail === helper.email
                      ? "Removing..."
                      : "Remove"}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No helpers added yet.</p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Freeze game</h3>
            <p className="mt-2 text-slate-600">
              When frozen, students see a thank-you screen and cannot sign in or
              enter booth codes. Booths and admin access stay available.
            </p>
            <p className="mt-3 text-sm font-medium text-slate-700">
              Status:{" "}
              <span
                className={
                  frozen ? "text-red-700" : "text-emerald-700"
                }
              >
                {frozen ? "Frozen" : "Active"}
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleToggleFrozen()}
            disabled={submitting}
            className={`shrink-0 rounded-xl px-5 py-3 text-base font-semibold text-white transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${
              frozen
                ? "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-200"
                : "bg-amber-600 hover:bg-amber-700 focus:ring-amber-200"
            }`}
          >
            {frozen ? "Unfreeze game" : "Freeze game"}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Project notes</h3>
            <p className="mt-2 text-slate-600">
              Private admin notes for this deployment. Use it to record what this
              event is about, Firebase setup, API keys, booth config, or anything
              you need when cloning this app for another event.
            </p>
          </div>

          <textarea
            value={projectNotes}
            onChange={(event) => setProjectNotes(event.target.value)}
            rows={10}
            placeholder={`Example:\n\nEvent: Spring Fair 2026\nFirebase project: schoolquest-demo\nAdmin emails: you@school.edu\n\nAPI setup:\n- Recraft key in server/.env\n- DeepSeek key in server/.env\n\nBooth notes:\n- 12 booths added from Manage Activity\n- Workshop IDs: ws-photo, ws-story`}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm leading-relaxed text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              {projectNotes !== savedProjectNotes
                ? "Unsaved changes"
                : "Saved to this project"}
            </p>

            <button
              type="button"
              onClick={() => void handleSaveProjectNotes()}
              disabled={savingNotes || projectNotes === savedProjectNotes}
              className="shrink-0 rounded-xl bg-slate-800 px-5 py-3 text-base font-semibold text-white transition hover:bg-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingNotes ? "Saving..." : "Save notes"}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              Student dashboard gallery
            </h3>
            <p className="mt-2 text-slate-600">
              Add image paths from the public folder (same format as booth or
              workshop poster images). Enter one path per line to add multiple
              images. Students browse them one at a time on the dashboard.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <textarea
              value={newGalleryImageUrl}
              onChange={(event) => setNewGalleryImageUrl(event.target.value)}
              rows={3}
              placeholder={"/booths/robotics.svg\n/booths/science.svg\n/workshops/w01/slide-01.svg"}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
            <button
              type="button"
              onClick={handleAddGalleryImage}
              disabled={!newGalleryImageUrl.trim()}
              className="shrink-0 rounded-xl border border-slate-300 bg-white px-5 py-3 text-base font-semibold text-slate-800 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60 sm:self-start"
            >
              Add images
            </button>
          </div>

          {galleryImages.length > 0 ? (
            <>
              <ul className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                {galleryImages.map((url, index) => (
                  <li
                    key={url}
                    className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"
                  >
                    <p className="min-w-0 break-all font-mono text-sm text-slate-700">
                      <span className="mr-2 font-semibold text-slate-500">
                        {index + 1}.
                      </span>
                      {url}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleRemoveGalleryImage(url)}
                      className="shrink-0 rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>

              <SlideCarousel
                slides={galleryImages}
                title="Gallery preview"
                counterLabel="Image"
                className=""
              />
            </>
          ) : (
            <p className="text-sm text-slate-500">No gallery images yet.</p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              {JSON.stringify(galleryImages) !== JSON.stringify(savedGalleryImages)
                ? "Unsaved changes"
                : "Saved to this project"}
            </p>

            <button
              type="button"
              onClick={() => void handleSaveGalleryImages()}
              disabled={
                savingGallery ||
                JSON.stringify(galleryImages) ===
                  JSON.stringify(savedGalleryImages)
              }
              className="shrink-0 rounded-xl bg-slate-800 px-5 py-3 text-base font-semibold text-white transition hover:bg-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingGallery ? "Saving..." : "Save gallery"}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Export data</h3>
            <p className="mt-2 text-slate-600">
              Download two CSV files: student scores and booth visit activity.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleExport()}
            disabled={submitting}
            className="shrink-0 rounded-xl bg-blue-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Download CSV
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              Download student works
            </h3>
            <p className="mt-2 text-slate-600">
              Download a ZIP file with all student works: a CSV index plus
              extracted images and text files from every booth and workshop
              activity.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleExportStudentWorks()}
            disabled={submitting}
            className="shrink-0 rounded-xl bg-violet-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-violet-700 focus:outline-none focus:ring-4 focus:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Preparing..." : "Download all contents"}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50/40 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-xl font-bold text-amber-950">Delete all activities</h3>
            <p className="mt-2 text-amber-900">
              Permanently removes every booth, workshop, and checkpoint from the
              event setup. Student data is kept. Add activities again afterward.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowDeleteBoothsDialog(true);
              setDeleteBoothsConfirmation("");
              setError(null);
              setMessage(null);
            }}
            disabled={submitting}
            className="shrink-0 rounded-xl border border-amber-300 bg-white px-5 py-3 text-base font-semibold text-amber-900 transition hover:bg-amber-50 focus:outline-none focus:ring-4 focus:ring-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Delete all activities
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-rose-200 bg-rose-50/40 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-xl font-bold text-rose-950">
              Clear student works
            </h3>
            <p className="mt-2 text-rose-900">
              Permanently removes every AI generation, image, video, and
              submission saved in Student Works. Student scores, visits, and
              booth settings are kept.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowDeleteStudentWorksDialog(true);
              setDeleteStudentWorksConfirmation("");
              setError(null);
              setMessage(null);
            }}
            disabled={submitting}
            className="shrink-0 rounded-xl border border-rose-300 bg-white px-5 py-3 text-base font-semibold text-rose-900 transition hover:bg-rose-50 focus:outline-none focus:ring-4 focus:ring-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Clear student works
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-red-200 bg-red-50/40 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-xl font-bold text-red-900">Remove all data</h3>
            <p className="mt-2 text-red-800">
              Permanently deletes all students, visits, and rate limits. Booth
              settings and admin accounts are kept. This cannot be undone.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowResetDialog(true);
              setResetConfirmation("");
              setError(null);
              setMessage(null);
            }}
            disabled={submitting}
            className="shrink-0 rounded-xl border border-red-300 bg-white px-5 py-3 text-base font-semibold text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Remove all data
          </button>
        </div>
      </section>

      {showResetDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div
            className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-6 shadow-xl"
            role="dialog"
            aria-labelledby="reset-dialog-title"
            aria-modal="true"
          >
            <h3
              id="reset-dialog-title"
              className="text-2xl font-bold text-red-900"
            >
              Confirm data removal
            </h3>
            <p className="mt-3 text-slate-600">
              This will erase every student profile, visit record, and rate
              limit. Export your data first if you need a backup.
            </p>
            <p className="mt-4 text-sm font-medium text-slate-700">
              Type{" "}
              <span className="font-mono text-red-700">
                {RESET_CONFIRMATION_PHRASE}
              </span>{" "}
              to confirm:
            </p>
            <input
              type="text"
              value={resetConfirmation}
              onChange={(event) => setResetConfirmation(event.target.value)}
              autoComplete="off"
              className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
            />

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowResetDialog(false);
                  setResetConfirmation("");
                }}
                disabled={submitting}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-base font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleReset()}
                disabled={
                  submitting ||
                  resetConfirmation !== RESET_CONFIRMATION_PHRASE
                }
                className="rounded-xl bg-red-700 px-5 py-3 text-base font-semibold text-white transition hover:bg-red-800 focus:outline-none focus:ring-4 focus:ring-red-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Removing..." : "Remove all data"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showDeleteBoothsDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div
            className="w-full max-w-lg rounded-2xl border border-amber-200 bg-white p-6 shadow-xl"
            role="dialog"
            aria-labelledby="delete-booths-dialog-title"
            aria-modal="true"
          >
            <h3
              id="delete-booths-dialog-title"
              className="text-2xl font-bold text-amber-950"
            >
              Confirm activity deletion
            </h3>
            <p className="mt-3 text-slate-600">
              This will remove every booth, workshop, and checkpoint. QR codes
              and activity pages will stop working until you add activities
              again.
            </p>
            <p className="mt-4 text-sm font-medium text-slate-700">
              Type{" "}
              <span className="font-mono text-amber-900">
                {DELETE_ALL_BOOTHS_PHRASE}
              </span>{" "}
              to confirm:
            </p>
            <input
              type="text"
              value={deleteBoothsConfirmation}
              onChange={(event) =>
                setDeleteBoothsConfirmation(event.target.value)
              }
              autoComplete="off"
              className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
            />

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteBoothsDialog(false);
                  setDeleteBoothsConfirmation("");
                }}
                disabled={submitting}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-base font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteBooths()}
                disabled={
                  submitting ||
                  deleteBoothsConfirmation !== DELETE_ALL_BOOTHS_PHRASE
                }
                className="rounded-xl bg-amber-700 px-5 py-3 text-base font-semibold text-white transition hover:bg-amber-800 focus:outline-none focus:ring-4 focus:ring-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Deleting..." : "Delete all activities"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showDeleteStudentWorksDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div
            className="w-full max-w-lg rounded-2xl border border-rose-200 bg-white p-6 shadow-xl"
            role="dialog"
            aria-labelledby="delete-student-works-dialog-title"
            aria-modal="true"
          >
            <h3
              id="delete-student-works-dialog-title"
              className="text-2xl font-bold text-rose-950"
            >
              Confirm student works removal
            </h3>
            <p className="mt-3 text-slate-600">
              This will erase every saved student work across all features.
              Export your data first if you need a backup.
            </p>
            <p className="mt-4 text-sm font-medium text-slate-700">
              Type{" "}
              <span className="font-mono text-rose-900">
                {DELETE_ALL_STUDENT_WORKS_PHRASE}
              </span>{" "}
              to confirm:
            </p>
            <input
              type="text"
              value={deleteStudentWorksConfirmation}
              onChange={(event) =>
                setDeleteStudentWorksConfirmation(event.target.value)
              }
              autoComplete="off"
              className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
            />

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteStudentWorksDialog(false);
                  setDeleteStudentWorksConfirmation("");
                }}
                disabled={submitting}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-base font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteStudentWorks()}
                disabled={
                  submitting ||
                  deleteStudentWorksConfirmation !==
                    DELETE_ALL_STUDENT_WORKS_PHRASE
                }
                className="rounded-xl bg-rose-700 px-5 py-3 text-base font-semibold text-white transition hover:bg-rose-800 focus:outline-none focus:ring-4 focus:ring-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Removing..." : "Clear student works"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
