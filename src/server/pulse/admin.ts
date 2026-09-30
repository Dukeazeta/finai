import "server-only";

/** Emails allowed into Pulse, from PULSE_ADMINS (comma separated). */
export function pulseAdmins() {
  return (process.env.PULSE_ADMINS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isPulseAdmin(email: string | null | undefined) {
  return !!email && pulseAdmins().includes(email.toLowerCase());
}
