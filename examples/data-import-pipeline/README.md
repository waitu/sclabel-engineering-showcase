# Validated bulk-import pipeline

This dependency-free CSV example normalizes alternate headers, preserves long identifiers as strings, validates row-level data, detects duplicates both inside the upload and against existing records, produces a preview summary, and yields valid records in bounded batches.

The private product also processes spreadsheet workbooks, checks provider links, stores user-bound previews with a TTL, and requires confirmation before persistence. Those integrations are described but intentionally not reproduced here.
