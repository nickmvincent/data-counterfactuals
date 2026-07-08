import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const textFilePattern = /\.(astro|css|cjs|js|jsx|json|mjs|md|ts|tsx|toml|ya?ml)$/;
const debugStatementPattern = new RegExp(`\\b${"debug"}ger\\b`);
const issues = [];

const gitResult = spawnSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
  encoding: "utf8",
});

if (gitResult.status !== 0) {
  console.error(gitResult.stderr || "Could not list repository files.");
  process.exit(gitResult.status || 1);
}

const files = gitResult.stdout
  .split("\n")
  .filter((file) => textFilePattern.test(file))
  .filter((file) => !file.startsWith("dist/") && !file.startsWith("node_modules/"));

for (const file of files) {
  const lines = readFileSync(file, "utf8").split("\n");

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    if (/^(<{7}|={7}|>{7})/.test(line)) {
      issues.push(`${file}:${lineNumber} merge conflict marker`);
    }
    if (debugStatementPattern.test(line)) {
      issues.push(`${file}:${lineNumber} debug statement`);
    }
    if (file.startsWith("src/") && /\bconsole\.log\b/.test(line)) {
      issues.push(`${file}:${lineNumber} browser-facing console.log`);
    }
  });
}

if (issues.length) {
  console.error("Hygiene check failed:");
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log(`Hygiene check passed for ${files.length} text files.`);
