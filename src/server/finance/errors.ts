/** An error whose message is safe to show the user (and the AI). */
export class FinanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FinanceError";
  }
}

export function errorMessage(e: unknown): string {
  if (e instanceof FinanceError) return e.message;
  if (e && typeof e === "object" && "issues" in e) return "Some details were missing or invalid.";
  console.error(e);
  return "Something went wrong. Please try again.";
}
