export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export function actionError(error: unknown): ActionResult<never> {
  if (error && typeof error === "object" && "issues" in error) {
    const issues = (error as { issues: Array<{ path: PropertyKey[]; message: string }> }).issues;
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of issues) {
      const key = String(issue.path[0] || "form");
      fieldErrors[key] ||= [];
      fieldErrors[key].push(issue.message);
    }
    return { ok: false, error: issues[0]?.message || "Revise os campos informados.", fieldErrors };
  }
  return { ok: false, error: error instanceof Error ? error.message : "Não foi possível concluir a operação." };
}
