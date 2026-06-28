export type AdminRole = "super" | "helper";

export type AdminAccess = {
  role: AdminRole;
  email: string;
};

export type AdminVerifyFailureReason =
  | "unauthorized"
  | "server_error"
  | "invalid_response";

export type AdminAccessResult =
  | { ok: true; access: AdminAccess }
  | { ok: false; reason: AdminVerifyFailureReason; status: number };
