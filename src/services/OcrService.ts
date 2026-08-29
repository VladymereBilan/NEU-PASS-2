import { extractTextFromImage, isSupported } from "expo-text-extractor";
import {
  ID_NUMBER_PATTERN,
  ID_TYPE_OPTIONS,
  NAME_DIGIT_PATTERN,
  NAME_LETTER_PATTERN
} from "../types/VisitorRegistration";

// The "Use Prototype Sample" affordance has no real file to run OCR against.
const PROTOTYPE_SAMPLE_PREFIX = "prototype://";

const ADDRESS_KEYWORD_PATTERN = /\b(city|brgy|barangay|street|st\.|ave|avenue|province|municipality)\b/i;
const ID_NUMBER_LABEL_PATTERN = /\b(no\.?|number|id no)\b/i;
const NAME_LABEL_PATTERN = /\bname\b/i;

// Recognized-text keyword -> one of the fixed ID_TYPE_OPTIONS entries. Order
// matters where keywords could overlap (checked top to bottom, first match wins).
const ID_TYPE_KEYWORDS: Array<[RegExp, (typeof ID_TYPE_OPTIONS)[number]]> = [
  [/PHILIPPINE IDENTIFICATION|PHILSYS|PHILID/, "Philippine National ID (PhilID / ePhilID)"],
  [/DRIVER/, "Driver's License"],
  [/PASSPORT/, "Philippine Passport"],
  [/\bUMID\b/, "UMID"],
  [/\bPRC\b/, "PRC ID"],
  [/\bSSS\b/, "SSS ID"],
  [/\bGSIS\b/, "GSIS ID"],
  [/VOTER/, "Voter's ID"],
  [/POSTAL/, "Postal ID"],
  [/SENIOR CITIZEN/, "Senior Citizen ID"],
  [/\bPWD\b/, "PWD ID"],
  [/PHILHEALTH/, "PhilHealth ID"],
  [/\bTIN\b/, "TIN ID"],
  [/PAG-?IBIG/, "Pag-IBIG ID / Loyalty Card"],
  [/BARANGAY/, "Barangay ID"]
];

export type OcrFields = {
  fullName?: string;
  address?: string;
  idType?: string;
  idNumber?: string;
};

export type OcrResult = {
  rawText: string;
  fields: OcrFields;
  confidence: "high" | "low" | "none";
};

const EMPTY_RESULT: OcrResult = { rawText: "", fields: {}, confidence: "none" };

// Heuristic line/keyword matching, not a document-layout model — Philippine
// ID layouts vary too much for anything more precise to be worth building
// here. Accuracy will be rough, and that's by design: the visitor always
// reviews/corrects the resulting form before continuing (see ocr-review.tsx),
// so this only needs to save typing on the common case, not be authoritative.
export async function extractIdFields(imageUri: string): Promise<OcrResult> {
  if (!imageUri || imageUri.startsWith(PROTOTYPE_SAMPLE_PREFIX) || !isSupported) {
    return EMPTY_RESULT;
  }

  let lines: string[];
  try {
    lines = await extractTextFromImage(imageUri);
  } catch {
    return EMPTY_RESULT;
  }

  if (!lines || lines.length === 0) {
    return EMPTY_RESULT;
  }

  const fields: OcrFields = {
    idNumber: findIdNumber(lines),
    fullName: findFullName(lines),
    address: findAddress(lines),
    idType: findIdType(lines)
  };

  const foundCount = Object.values(fields).filter(Boolean).length;
  const confidence = foundCount >= 2 ? "high" : foundCount >= 1 ? "low" : "none";

  return { rawText: lines.join("\n"), fields, confidence };
}

function extractNumberToken(line: string): string | undefined {
  const trimmed = line.trim();
  if (!ID_NUMBER_PATTERN.test(trimmed)) return undefined;
  const match = trimmed.match(/[A-Za-z0-9][A-Za-z0-9\-\s]{4,}/);
  return (match ? match[0] : trimmed).trim();
}

function findIdNumber(lines: string[]): string | undefined {
  // A label ("License No.", "ID No.") and its value are often OCR'd as two
  // separate lines, not one — check the label's own line first, then the
  // line right after it.
  for (let i = 0; i < lines.length; i++) {
    if (!ID_NUMBER_LABEL_PATTERN.test(lines[i])) continue;
    const sameLine = extractNumberToken(lines[i]);
    if (sameLine) return sameLine;
    const nextLine = lines[i + 1] ? extractNumberToken(lines[i + 1]) : undefined;
    if (nextLine) return nextLine;
  }

  // Fallback: a number-looking line that isn't also an address (a street
  // number like "123 Rizal St" would otherwise pass ID_NUMBER_PATTERN too)
  // and has real digit density or a dash, the way ID numbers usually do.
  const candidate = lines.find((line) => {
    const trimmed = line.trim();
    if (!ID_NUMBER_PATTERN.test(trimmed) || ADDRESS_KEYWORD_PATTERN.test(trimmed)) return false;
    const digitCount = (trimmed.match(/\d/g) || []).length;
    const letterCount = (trimmed.match(/[A-Za-z]/g) || []).length;
    return /-/.test(trimmed) || digitCount >= letterCount;
  });
  return candidate ? extractNumberToken(candidate) : undefined;
}

function findFullName(lines: string[]): string | undefined {
  const candidates = lines.filter((line) => {
    const trimmed = line.trim();
    return (
      NAME_LETTER_PATTERN.test(trimmed) &&
      !NAME_DIGIT_PATTERN.test(trimmed) &&
      trimmed.split(/\s+/).length >= 2 &&
      trimmed.length <= 60
    );
  });
  if (candidates.length === 0) return undefined;

  const labeledIndex = lines.findIndex((line) => NAME_LABEL_PATTERN.test(line));
  const nearLabel = labeledIndex >= 0 ? candidates.find((c) => lines.indexOf(c) > labeledIndex) : undefined;

  const best = nearLabel ?? [...candidates].sort((a, b) => b.length - a.length)[0];
  return best.trim();
}

function findAddress(lines: string[]): string | undefined {
  const candidate = lines.find((line) => {
    const trimmed = line.trim();
    return NAME_LETTER_PATTERN.test(trimmed) && /\d/.test(trimmed) && ADDRESS_KEYWORD_PATTERN.test(trimmed);
  });
  return candidate?.trim();
}

function findIdType(lines: string[]): string | undefined {
  const joined = lines.join(" ").toUpperCase();
  const hit = ID_TYPE_KEYWORDS.find(([pattern]) => pattern.test(joined));
  return hit?.[1];
}
