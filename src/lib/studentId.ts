const GRADE_CLASS_PATTERN = /(?:[1-6][A-Z]|K[23]|P[1-6])/;
const STUDENT_ID_PATTERN = new RegExp(`^${GRADE_CLASS_PATTERN.source}\\d{2}$`);
const CLASS_CODE_PATTERN = new RegExp(`^${GRADE_CLASS_PATTERN.source}$`);

export function normalizeStudentId(raw: string): string {
  return raw.trim().toUpperCase();
}

export function normalizeClassCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isValidClassCode(raw: string): boolean {
  return CLASS_CODE_PATTERN.test(normalizeClassCode(raw));
}

export function generateStudentIdsForClass(
  classCode: string,
  count: number,
): string[] {
  const normalizedClass = normalizeClassCode(classCode);
  const ids: string[] = [];

  for (let number = 1; number <= count; number += 1) {
    ids.push(`${normalizedClass}${String(number).padStart(2, "0")}`);
  }

  return ids;
}

export function parseStudentId(studentId: string): {
  class: string;
  number: string;
} | null {
  const normalized = normalizeStudentId(studentId);

  if (!STUDENT_ID_PATTERN.test(normalized)) {
    return null;
  }

  return {
    class: normalized.slice(0, 2),
    number: normalized.slice(2, 4),
  };
}

export function validateStudentId(raw: string): string | null {
  const normalized = normalizeStudentId(raw);

  if (normalized.length !== 4) {
    return "請輸入 4 個字元（例如 P101、4D01）。";
  }

  if (!STUDENT_ID_PATTERN.test(normalized)) {
    return "格式：P1–P6、K2/K3、或年級 1–6 加英文字母，再加兩位數字（例如 P101、4D01、K201）。";
  }

  return null;
}
