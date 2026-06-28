import type {
  StudentWorkDocument,
  StudentWorkInput,
} from "@/lib/studentWorksShared";

async function parseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? `Request failed (${response.status}).`;
  } catch {
    return `Request failed (${response.status}).`;
  }
}

export async function saveStudentWork(
  token: string,
  params: {
    studentId: string;
    input: StudentWorkInput;
  },
): Promise<StudentWorkDocument> {
  const response = await fetch("/api/student/works", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      studentId: params.studentId,
      ...params.input,
    }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const body = (await response.json()) as { work: StudentWorkDocument };
  return body.work;
}

export async function fetchStudentWorks(
  token: string,
  studentId: string,
): Promise<StudentWorkDocument[]> {
  const response = await fetch(
    `/api/student/works?studentId=${encodeURIComponent(studentId)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const body = (await response.json()) as { works: StudentWorkDocument[] };
  return body.works;
}
