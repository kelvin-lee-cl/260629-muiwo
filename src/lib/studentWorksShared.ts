import {
  BOOTH_FEATURES,
  boothFeatureLabel,
  type BoothFeature,
  type BoothType,
} from "@/lib/booths";

export const MAX_STUDENT_WORK_IMAGE_BYTES = 900_000;

export type StudentWorkDocument = {
  id: string;
  studentId: string;
  authUid: string;
  venueId: string;
  venueType: Extract<BoothType, "booth" | "workshop" | "checkpoint">;
  feature: BoothFeature;
  prompt?: string;
  generatedText?: string;
  imageUrl?: string;
  videoUrl?: string;
  submissionText?: string;
  submissionUrl?: string;
  createdAtMs: number | null;
};

export type StudentWorkInput = {
  venueId: string;
  venueType: Extract<BoothType, "booth" | "workshop" | "checkpoint">;
  feature: BoothFeature;
  prompt?: string;
  generatedText?: string;
  imageUrl?: string;
  videoUrl?: string;
  submissionText?: string;
  submissionUrl?: string;
};

export const STUDENT_WORK_FEATURES = BOOTH_FEATURES;

export function studentWorkFeatureLabel(feature: BoothFeature): string {
  return boothFeatureLabel(feature);
}

export function formatStudentWorkTime(timestampMs: number | null): string {
  if (timestampMs === null) {
    return "Unknown time";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestampMs));
}

export type StudentWorkSort =
  | "newest"
  | "oldest"
  | "student-asc"
  | "student-desc"
  | "venue-asc";

export const STUDENT_WORK_SORT_OPTIONS: {
  value: StudentWorkSort;
  label: string;
}[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "student-asc", label: "Student ID (A–Z)" },
  { value: "student-desc", label: "Student ID (Z–A)" },
  { value: "venue-asc", label: "Venue (A–Z)" },
];

export type StudentWorkListFilters = {
  feature: BoothFeature;
  venueId: string;
  venueType: "all" | "booth" | "workshop" | "checkpoint";
  studentQuery: string;
};

function workTimestampMs(work: StudentWorkDocument): number {
  return work.createdAtMs ?? 0;
}

export function filterStudentWorks(
  works: StudentWorkDocument[],
  filters: StudentWorkListFilters,
): StudentWorkDocument[] {
  const query = filters.studentQuery.trim().toLowerCase();

  return works.filter((work) => {
    if (work.feature !== filters.feature) {
      return false;
    }

    if (filters.venueId !== "all" && work.venueId !== filters.venueId) {
      return false;
    }

    if (filters.venueType !== "all" && work.venueType !== filters.venueType) {
      return false;
    }

    if (query && !work.studentId.toLowerCase().includes(query)) {
      return false;
    }

    return true;
  });
}

export function sortStudentWorks(
  works: StudentWorkDocument[],
  sort: StudentWorkSort,
): StudentWorkDocument[] {
  const sorted = [...works];

  sorted.sort((left, right) => {
    switch (sort) {
      case "newest":
        return workTimestampMs(right) - workTimestampMs(left);
      case "oldest":
        return workTimestampMs(left) - workTimestampMs(right);
      case "student-asc":
        return left.studentId.localeCompare(right.studentId);
      case "student-desc":
        return right.studentId.localeCompare(left.studentId);
      case "venue-asc":
        return (
          left.venueId.localeCompare(right.venueId) ||
          workTimestampMs(right) - workTimestampMs(left)
        );
    }
  });

  return sorted;
}

export function filterAndSortStudentWorks(
  works: StudentWorkDocument[],
  filters: StudentWorkListFilters,
  sort: StudentWorkSort,
): StudentWorkDocument[] {
  return sortStudentWorks(filterStudentWorks(works, filters), sort);
}
