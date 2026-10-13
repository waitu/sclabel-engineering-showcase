const HEADER_ALIASES = new Map([
  ["tracking", "trackingNumber"],
  ["tracking_number", "trackingNumber"],
  ["tracking number", "trackingNumber"],
  ["service", "service"],
  ["reference", "reference"],
]);

export function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"' && quoted && text[index + 1] === '"') {
      field += '"'; index += 1;
    } else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(field); field = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field); field = "";
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
    } else field += char;
  }
  row.push(field);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function canonicalHeader(value) {
  const normalized = value.trim().toLowerCase().replace(/[-]+/g, "_");
  return HEADER_ALIASES.get(normalized) ?? null;
}

function normalizeTracking(value) {
  return String(value ?? "").trim().toUpperCase();
}

function validateTracking(value) {
  if (!value) return "Tracking number is required";
  if (!/^[A-Z0-9-]{8,40}$/.test(value)) return "Tracking number has an invalid format";
  return null;
}

export function previewImport(csvText, { existingTrackingNumbers = new Set() } = {}) {
  const matrix = parseCsv(csvText);
  if (matrix.length < 2) throw new Error("The file must contain a header and at least one data row");

  const headers = matrix[0].map(canonicalHeader);
  if (!headers.includes("trackingNumber")) throw new Error("Missing tracking-number column");
  const seen = new Set();

  const rows = matrix.slice(1).map((values, rowIndex) => {
    const data = {};
    headers.forEach((header, index) => { if (header) data[header] = values[index]?.trim() ?? ""; });
    data.trackingNumber = normalizeTracking(data.trackingNumber);
    data.service = String(data.service ?? "standard").trim().toLowerCase();
    const errors = [];
    const warnings = [];
    const formatError = validateTracking(data.trackingNumber);
    if (formatError) errors.push(formatError);
    if (seen.has(data.trackingNumber)) errors.push("Duplicate tracking number in uploaded file");
    if (existingTrackingNumbers.has(data.trackingNumber)) errors.push("Tracking number already exists");
    if (!new Set(["standard", "express"]).has(data.service)) errors.push("Unsupported service");
    if (!data.reference) warnings.push("Reference is empty");
    seen.add(data.trackingNumber);
    return { rowNumber: rowIndex + 2, data, errors, warnings, valid: errors.length === 0 };
  });

  return {
    rows,
    summary: {
      total: rows.length,
      valid: rows.filter((row) => row.valid).length,
      invalid: rows.filter((row) => !row.valid).length,
      warnings: rows.reduce((sum, row) => sum + row.warnings.length, 0),
    },
  };
}

export function* validBatches(preview, batchSize = 100) {
  if (!Number.isInteger(batchSize) || batchSize < 1) throw new Error("batchSize must be positive");
  const validRows = preview.rows.filter((row) => row.valid).map((row) => row.data);
  for (let index = 0; index < validRows.length; index += batchSize) {
    yield validRows.slice(index, index + batchSize);
  }
}
