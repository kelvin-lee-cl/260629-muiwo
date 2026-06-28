// Client-safe event settings — no firebase-admin imports.

export const RESET_CONFIRMATION_PHRASE = "DELETE ALL DATA";
export const DELETE_ALL_BOOTHS_PHRASE = "DELETE ALL BOOTHS";
export const DELETE_ALL_STUDENT_WORKS_PHRASE = "DELETE ALL STUDENT WORKS";

export type EventSettings = {
  frozen: boolean;
  projectNotes: string;
  galleryImages: string[];
};
