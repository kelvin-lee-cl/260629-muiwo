import JSZip from "jszip";

import { listStudentWorksForAdmin } from "@/lib/studentWorks";
import {
  studentWorkFeatureLabel,
  type StudentWorkDocument,
} from "@/lib/studentWorksShared";

type WorkFilePaths = {
  image?: string;
  generatedText?: string;
  submissionText?: string;
};

function escapeCsvValue(value: string | number): string {
  const text = String(value);

  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function formatTimestamp(timestampMs: number | null): string {
  if (timestampMs === null) {
    return "";
  }

  return new Date(timestampMs).toISOString();
}

function extensionFromMime(mime: string): string {
  if (mime.includes("jpeg") || mime.includes("jpg")) {
    return "jpg";
  }

  if (mime.includes("webp")) {
    return "webp";
  }

  if (mime.includes("gif")) {
    return "gif";
  }

  if (mime.includes("png")) {
    return "png";
  }

  return "bin";
}

function parseDataUrl(dataUrl: string): { buffer: Buffer; ext: string } | null {
  const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUrl);

  if (!match) {
    return null;
  }

  return {
    buffer: Buffer.from(match[2], "base64"),
    ext: extensionFromMime(match[1]),
  };
}

async function fetchRemoteFile(
  url: string,
): Promise<{ buffer: Buffer; ext: string } | null> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") ?? "";
    let ext = extensionFromMime(contentType);

    if (ext === "bin") {
      const pathname = new URL(url).pathname;
      const dot = pathname.lastIndexOf(".");

      if (dot >= 0) {
        ext = pathname.slice(dot + 1).toLowerCase() || "bin";
      }
    }

    return { buffer, ext };
  } catch {
    return null;
  }
}

function safeFilePrefix(work: StudentWorkDocument): string {
  return `${work.studentId}_${work.venueId}_${work.id}`.replace(/[^\w.-]+/g, "_");
}

export function buildStudentWorksCsv(
  works: StudentWorkDocument[],
  filePaths: Map<string, WorkFilePaths>,
): string {
  const header = [
    "id",
    "studentId",
    "venueId",
    "venueType",
    "feature",
    "createdAt",
    "prompt",
    "generatedText",
    "submissionText",
    "submissionUrl",
    "imageUrl",
    "videoUrl",
    "imageFile",
    "generatedTextFile",
    "submissionTextFile",
  ].join(",");

  const rows = works.map((work) => {
    const paths = filePaths.get(work.id);

    return [
      escapeCsvValue(work.id),
      escapeCsvValue(work.studentId),
      escapeCsvValue(work.venueId),
      escapeCsvValue(work.venueType),
      escapeCsvValue(studentWorkFeatureLabel(work.feature)),
      escapeCsvValue(formatTimestamp(work.createdAtMs)),
      escapeCsvValue(work.prompt ?? ""),
      escapeCsvValue(work.generatedText ?? ""),
      escapeCsvValue(work.submissionText ?? ""),
      escapeCsvValue(work.submissionUrl ?? ""),
      escapeCsvValue(work.imageUrl ?? ""),
      escapeCsvValue(work.videoUrl ?? ""),
      escapeCsvValue(paths?.image ?? ""),
      escapeCsvValue(paths?.generatedText ?? ""),
      escapeCsvValue(paths?.submissionText ?? ""),
    ].join(",");
  });

  return [header, ...rows].join("\n");
}

export async function buildStudentWorksZip(): Promise<Buffer> {
  const works = await listStudentWorksForAdmin();
  const zip = new JSZip();
  const filePaths = new Map<string, WorkFilePaths>();

  for (const work of works) {
    const paths: WorkFilePaths = {};
    filePaths.set(work.id, paths);

    const safePrefix = safeFilePrefix(work);

    if (work.imageUrl) {
      if (work.imageUrl.startsWith("data:")) {
        const parsed = parseDataUrl(work.imageUrl);

        if (parsed) {
          paths.image = `images/${safePrefix}.${parsed.ext}`;
          zip.file(paths.image, parsed.buffer);
        }
      } else if (work.imageUrl.startsWith("http")) {
        const fetched = await fetchRemoteFile(work.imageUrl);

        if (fetched) {
          paths.image = `images/${safePrefix}.${fetched.ext}`;
          zip.file(paths.image, fetched.buffer);
        }
      }
    }

    if (work.generatedText) {
      paths.generatedText = `text/${safePrefix}-generated.txt`;
      zip.file(paths.generatedText, work.generatedText);
    }

    if (work.submissionText) {
      paths.submissionText = `text/${safePrefix}-submission.txt`;
      zip.file(paths.submissionText, work.submissionText);
    }
  }

  zip.file("student-works.csv", buildStudentWorksCsv(works, filePaths));

  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
