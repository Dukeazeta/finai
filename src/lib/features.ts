/** Server side feature flags derived from env. Safe to import anywhere on the server. */
export const isGoogleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
