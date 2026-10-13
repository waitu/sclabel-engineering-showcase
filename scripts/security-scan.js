import { readFile, readdir } from "node:fs/promises";
import { extname, relative, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const thisFile = resolve(fileURLToPath(import.meta.url));
const ignoredDirectories = new Set([".git", "node_modules", "coverage", "dist"]);
const binaryExtensions = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico"]);
const sensitiveArtifactExtensions = new Set([".zip", ".pdf", ".sql.gz", ".bak"]);

async function collect(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) output.push(...await collect(path));
    else output.push(path);
  }
  return output;
}

const placeholder = /^(?:change-me|replace-me|example|demo|localhost|not-set|\$\{[^}]+\})$/i;
const assignment = /^\s*([A-Z][A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|API_KEY|PRIVATE_KEY)[A-Z0-9_]*)\s*=\s*(.+?)\s*$/;
const credentialUrl = /:\/\/[^/\s:@]+:[^/\s@]+@/;
const privateKeyMarker = ["-----BEGIN", "PRIVATE KEY-----"].join(" ");
const originalWorkspaceReference = /[A-Z]:\\GTE\\GTEORDER(?:\\|$)/i;
const findings = [];

for (const path of await collect(projectRoot)) {
  const name = relative(projectRoot, path).replaceAll("\\", "/");
  const extension = extname(path).toLowerCase();
  if (sensitiveArtifactExtensions.has(extension) || name.endsWith(".sql.gz")) {
    findings.push({ file: name, line: 1, risk: "sensitive artifact type" });
  }
  if (binaryExtensions.has(extension) || path === thisFile) continue;
  const text = await readFile(path, "utf8");
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (line.includes(privateKeyMarker)) findings.push({ file: name, line: index + 1, risk: "private-key material" });
    if (credentialUrl.test(line) && !/(?:change-me|example\.invalid|localhost)/i.test(line)) {
      findings.push({ file: name, line: index + 1, risk: "credential-bearing URL" });
    }
    if (originalWorkspaceReference.test(line)) findings.push({ file: name, line: index + 1, risk: "private workspace reference" });
    const match = line.match(assignment);
    if (match && !placeholder.test(match[2].replace(/^['"]|['"]$/g, ""))) {
      findings.push({ file: name, line: index + 1, risk: "non-placeholder secret assignment" });
    }
  }
}

if (findings.length) {
  console.error("Security scan failed. Findings (values intentionally omitted):");
  for (const finding of findings) console.error(`${finding.file}:${finding.line}: ${finding.risk}`);
  process.exitCode = 1;
} else {
  console.log("Security scan passed: no credential material, private paths, or sensitive export artifacts detected.");
}
