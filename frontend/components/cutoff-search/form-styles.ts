/** Shared label style from the original home form. */
export const FIELD_LABEL = "text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"

/** Exam toggle container (segmented control). */
export const EXAM_TOGGLE_WRAP = "grid grid-cols-2 gap-1 rounded-xl bg-muted p-1"

/** Active / inactive exam segment button. */
export function examToggleClass(active: boolean) {
  return active
    ? "rounded-lg py-2.5 text-sm font-medium transition-all bg-background text-foreground shadow-sm"
    : "rounded-lg py-2.5 text-sm font-medium transition-all text-muted-foreground hover:text-foreground"
}

/** Gender-style pool selector (bordered cards). */
export function poolCardClass(active: boolean) {
  return active
    ? "rounded-xl border border-primary bg-primary/10 py-3 text-sm font-medium text-primary"
    : "rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground hover:border-primary/40 hover:text-foreground"
}
