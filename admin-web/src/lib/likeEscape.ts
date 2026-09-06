// Escapes ILIKE metacharacters (%, _) so a caller-supplied value can't
// broaden the match beyond an exact string — e.g. submitting "%" would
// otherwise match every row instead of returning no match.
export function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}
