// Best-effort field extraction from AWS Textract's raw OCR lines (see
// extract-id-text edge function and app/visit/(register)/review/page.tsx).
// Textract's DetectDocumentText returns unstructured text lines in reading
// order with no field labels — there's no structured "this is the name
// field" data to work with (Textract's AnalyzeID isn't trained on
// Philippine ID formats, which is why we don't use it — see the edge
// function's own scope note). These are label/keyword heuristics tuned
// against a real Philippine driver's license capture, not a full corpus, so
// accuracy varies by ID layout. That's why every extracted value is only
// ever a pre-filled *suggestion* the visitor must confirm or correct on the
// review step, never written directly to the submitted registration.
import {
  ID_NUMBER_PATTERN,
  ID_TYPE_OPTIONS,
  NAME_DIGIT_PATTERN,
  NAME_LETTER_PATTERN
} from "./visitorRegistrationConstants";

export type ExtractedIdFields = {
  fullName?: string;
  address?: string;
  idType?: (typeof ID_TYPE_OPTIONS)[number];
  idNumber?: string;
};

const ID_TYPE_KEYWORDS: Array<{
  type: (typeof ID_TYPE_OPTIONS)[number];
  keywords: string[];
}> = [
  {
    type: "Philippine National ID (PhilID / ePhilID)",
    keywords: ["PHILIPPINE IDENTIFICATION", "PHILSYS", "PAMBANSANG PAGKAKAKILANLAN"]
  },
  {
    type: "Driver's License",
    keywords: [
      "DRIVER'S LICENSE",
      "DRIVERS LICENSE",
      "LAND TRANSPORTATION OFFICE",
      "NON-PROFESSIONAL",
      "PROFESSIONAL DRIVER"
    ]
  },
  { type: "Philippine Passport", keywords: ["PASSPORT", "REPUBLIKA NG PILIPINAS"] },
  { type: "UMID", keywords: ["UMID", "UNIFIED MULTI-PURPOSE"] },
  { type: "PRC ID", keywords: ["PROFESSIONAL REGULATION COMMISSION", "PRC ID"] },
  { type: "SSS ID", keywords: ["SOCIAL SECURITY SYSTEM"] },
  { type: "GSIS ID", keywords: ["GOVERNMENT SERVICE INSURANCE", "GSIS"] },
  { type: "Voter's ID", keywords: ["COMMISSION ON ELECTIONS", "COMELEC", "VOTER'S", "VOTERS ID"] },
  { type: "Postal ID", keywords: ["PHLPOST", "POSTAL ID", "PHILIPPINE POSTAL"] },
  { type: "Senior Citizen ID", keywords: ["SENIOR CITIZEN"] },
  { type: "PWD ID", keywords: ["PERSON WITH DISABILITY", "PWD ID"] },
  { type: "PhilHealth ID", keywords: ["PHILHEALTH", "PHILIPPINE HEALTH INSURANCE"] },
  { type: "TIN ID", keywords: ["BUREAU OF INTERNAL REVENUE", "TAXPAYER IDENTIFICATION"] },
  { type: "Pag-IBIG ID / Loyalty Card", keywords: ["PAG-IBIG", "HDMF", "HOME DEVELOPMENT MUTUAL FUND"] },
  { type: "Barangay ID", keywords: ["BARANGAY"] }
];

const NAME_LABELS = ["FULL NAME", "NAME", "PANGALAN", "BUONG PANGALAN"];
// Some IDs (the PhilID redesign is the one we've confirmed) print Last
// Name, Given Names, and Middle Name as three SEPARATE labeled lines rather
// than one combined "Last Name, First Name, Middle Name" header — these are
// checked first, distinctly from NAME_LABELS above, so they can be combined
// into a single "Given [Middle] Last" value instead of only capturing
// whichever one happens to match a generic "NAME" substring first.
const LAST_NAME_LABELS = ["LAST NAME", "SURNAME", "APELYIDO"];
const GIVEN_NAME_LABELS = ["GIVEN NAME", "GIVEN NAMES", "FIRST NAME", "MGA PANGALAN"];
const MIDDLE_NAME_LABELS = ["MIDDLE NAME", "GITNANG APELYIDO"];
const ADDRESS_LABELS = ["ADDRESS", "TIRAHAN"];
const ID_NUMBER_LABELS = [
  "ID NO",
  "ID NUMBER",
  "LICENSE NO",
  "LICENSE NUMBER",
  "PSN",
  "CRN",
  "SSS NO",
  "GSIS NO",
  "TIN NO",
  "SERIAL NO"
];
// Other field headers commonly printed on a Philippine ID/driver's license,
// used only to recognize "this line starts a different field" so address
// continuation-line collection knows where to stop.
const OTHER_FIELD_LABELS = [
  "NATIONALITY",
  "SEX",
  "DATE OF BIRTH",
  "WEIGHT",
  "HEIGHT",
  "EXPIRATION",
  "AGENCY CODE",
  "BLOOD TYPE",
  "EYES COLOR",
  "DL CODES",
  "CONDITIONS",
  "SIGNATURE"
];
const ALL_FIELD_LABELS = [...NAME_LABELS, ...ADDRESS_LABELS, ...ID_NUMBER_LABELS, ...OTHER_FIELD_LABELS];

// Philippine IDs are printed almost entirely in caps. Converting an
// ALL-CAPS read to Title Case makes an auto-filled suggestion look like
// something a visitor would actually type — mixed-case text (already
// readable) is left alone rather than risk mangling it.
function toDisplayCase(value: string): string {
  if (value !== value.toUpperCase()) return value;
  return value
    .toLowerCase()
    .split(" ")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}

// "BILAN, VLADYMERE SEPTIMO" (the common "Last Name, First Middle" order
// printed on a driver's license) -> "VLADYMERE SEPTIMO BILAN", matching the
// first-name-first order the Full Name field expects elsewhere in this form.
function reorderCommaName(value: string): string {
  const parts = value.split(",").map((part) => part.trim()).filter(Boolean);
  return parts.length === 2 ? `${parts[1]} ${parts[0]}` : value;
}

// Name header rows on Philippine IDs are almost always compound
// ("Last Name. First Name. Middle Name") with no value on that same line —
// unlike ADDRESS_LABELS/ID_NUMBER_LABELS below, only the line *after* a
// matched label is ever trusted as the name.
function findNameValue(lines: string[]): string | undefined {
  // Case 1: Last Name / Given Names / Middle Name as three separate
  // labeled lines (confirmed on the PhilID redesign) — combine them rather
  // than returning just whichever one is matched first.
  let last: string | undefined;
  let given: string | undefined;
  let middle: string | undefined;
  for (let i = 0; i < lines.length; i++) {
    const upper = lines[i].toUpperCase();
    const nextLine = lines[i + 1]?.trim();
    if (!nextLine) continue;

    if (!last && LAST_NAME_LABELS.some((label) => upper.includes(label))) {
      last = nextLine;
    } else if (!given && GIVEN_NAME_LABELS.some((label) => upper.includes(label))) {
      given = nextLine;
    } else if (!middle && MIDDLE_NAME_LABELS.some((label) => upper.includes(label))) {
      middle = nextLine;
    }
  }
  if (last && given) {
    return [given, middle, last].filter(Boolean).join(" ");
  }

  // Case 2: a single combined header ("Last Name, First Name, Middle
  // Name" / "First Name, Middle Name, Surname, Suffix") with the full name
  // already on the one line right after it — driver's license and Postal
  // ID both work this way.
  for (let i = 0; i < lines.length; i++) {
    const upper = lines[i].toUpperCase();
    if (!NAME_LABELS.some((label) => upper.includes(label))) continue;

    const nextLine = lines[i + 1]?.trim();
    if (nextLine && nextLine.length > 1 && NAME_LETTER_PATTERN.test(nextLine) && !NAME_DIGIT_PATTERN.test(nextLine)) {
      return nextLine;
    }
  }
  return undefined;
}

// A lone all-caps word with no digit, comma, or address-ish keyword is more
// likely OCR picking up a security watermark/background pattern (confirmed
// on a real PhilID capture, which had a stray "AUTHORITY" line bleed into
// the middle of the address) than an actual address fragment — skip it
// rather than let it corrupt the collected address.
function looksLikeAddressContinuation(candidate: string): boolean {
  if (/\d/.test(candidate)) return true;
  if (candidate.includes(",")) return true;
  if (/(STREET|ST\.|AVE|BRGY|BARANGAY|CITY|DISTRICT|SUBDIVISION|VILLAGE|PUROK|ZONE)/i.test(candidate)) {
    return true;
  }
  return candidate.trim().split(/\s+/).length > 1;
}

// Collects the line(s) after an ADDRESS/TIRAHAN label, stopping as soon as
// another field's header is reached — Philippine ID addresses commonly wrap
// across two printed lines (street/subdivision, then city/district/zip).
function findAddressValue(lines: string[]): string | undefined {
  for (let i = 0; i < lines.length; i++) {
    const upper = lines[i].toUpperCase();
    if (!ADDRESS_LABELS.some((label) => upper.includes(label))) continue;

    const collected: string[] = [];
    for (let j = i + 1; j < Math.min(i + 4, lines.length) && collected.length < 2; j++) {
      const candidate = lines[j]?.trim();
      if (!candidate) break;
      if (ALL_FIELD_LABELS.some((label) => candidate.toUpperCase().includes(label))) break;
      if (!looksLikeAddressContinuation(candidate)) continue;
      collected.push(candidate);
    }
    if (collected.length > 0) return collected.join(", ");
  }
  return undefined;
}

// ID numbers are frequently grouped on the same OCR line as an adjacent
// column's value (e.g. "License No." / "Expiration Date" print as separate
// header lines, but "N02-25-017583 2029/05/11" prints as one combined value
// line) — so this scans forward from a matched label for the first line
// with real digit density, then pulls out just the ID-number-shaped token
// rather than trusting the whole line.
function findIdNumberValue(lines: string[]): string | undefined {
  const extractToken = (line: string) => line.match(/[A-Za-z0-9][A-Za-z0-9-]{4,}/)?.[0];

  for (let i = 0; i < lines.length; i++) {
    const upper = lines[i].toUpperCase();
    if (!ID_NUMBER_LABELS.some((label) => upper.includes(label))) continue;

    for (let j = i; j < Math.min(i + 4, lines.length); j++) {
      const candidate = lines[j];
      if ((candidate.match(/\d/g) || []).length < 3) continue;
      const token = extractToken(candidate);
      if (token && /\d/.test(token)) return token;
    }
  }

  // No recognized label at all — fall back to the first sufficiently
  // digit-dense token anywhere on the ID, on the theory that an ID number
  // is one of the few things on the card with that much digit density.
  for (const line of lines) {
    if ((line.match(/\d/g) || []).length < 3) continue;
    const token = extractToken(line);
    if (token && /\d/.test(token)) return token;
  }
  return undefined;
}

export function extractIdFields(lines: string[]): ExtractedIdFields {
  const result: ExtractedIdFields = {};
  const upperJoined = lines.join("\n").toUpperCase();

  for (const { type, keywords } of ID_TYPE_KEYWORDS) {
    if (keywords.some((keyword) => upperJoined.includes(keyword))) {
      result.idType = type;
      break;
    }
  }

  const nameCandidate = findNameValue(lines);
  if (nameCandidate) {
    result.fullName = toDisplayCase(reorderCommaName(nameCandidate));
  }

  const addressCandidate = findAddressValue(lines);
  if (addressCandidate) {
    result.address = toDisplayCase(addressCandidate);
  }

  const idNumberCandidate = findIdNumberValue(lines);
  if (idNumberCandidate && ID_NUMBER_PATTERN.test(idNumberCandidate.trim())) {
    result.idNumber = idNumberCandidate.trim();
  }

  return result;
}
