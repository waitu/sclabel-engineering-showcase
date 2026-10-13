import test from "node:test";
import assert from "node:assert/strict";
import { previewImport, validBatches } from "../examples/data-import-pipeline/import-pipeline.js";

test("normalizes headers and reports row-level duplicate and validation errors", () => {
  const csv = [
    "Tracking Number,Service,Reference",
    "ab123456,STANDARD,first",
    "AB123456,express,duplicate",
    "short,overnight,",
    "ZZ999999,express,existing",
  ].join("\n");
  const preview = previewImport(csv, { existingTrackingNumbers: new Set(["ZZ999999"]) });
  assert.deepEqual(preview.summary, { total: 4, valid: 1, invalid: 3, warnings: 1 });
  assert.match(preview.rows[1].errors.join(" "), /Duplicate/);
  assert.match(preview.rows[3].errors.join(" "), /already exists/);
});

test("emits only valid records in bounded batches", () => {
  const csv = "tracking,service,reference\nAA123456,standard,a\nBB123456,express,b\nCC123456,standard,c";
  const batches = [...validBatches(previewImport(csv), 2)];
  assert.equal(batches.length, 2);
  assert.equal(batches[0].length, 2);
  assert.equal(batches[1].length, 1);
});
