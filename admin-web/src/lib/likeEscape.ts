// Escapes ILIKE metacharacters (%, _) so a caller-supplied value can't
// broaden the match beyond an exact string — e.g. submitting "%" would
// otherwise match every row instead of returning no match.
export function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

// Builds a `column.ilike."%value%"` operand safe to drop into a PostgREST
// `.or()` filter string. Two layers of escaping are needed: escapeLikePattern
// neutralizes ILIKE wildcards (%, _, \) inside the value itself, then the
// whole "%value%" pattern is wrapped in double quotes (with \ and " doubled)
// so PostgREST's own comma/parenthesis-delimited filter syntax treats commas,
// parentheses, and quotes in the search term as literal characters instead
// of filter syntax.
export function toOrIlikePattern(value: string) {
  const literalPattern = `%${escapeLikePattern(value)}%`;
  const quoted = literalPattern.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${quoted}"`;
}

// Same double-quote-escaping used by toOrIlikePattern, but for a literal
// value dropped into a PostgREST `.in.(a,b,c)` list rather than an ILIKE
// pattern — no % / _ wildcard escaping, since `in` is an exact match.
function toOrListValue(value: string) {
  const quoted = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${quoted}"`;
}

export function toOrInPattern(values: string[]) {
  return `(${values.map(toOrListValue).join(",")})`;
}
