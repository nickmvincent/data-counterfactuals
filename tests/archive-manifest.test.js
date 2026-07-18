import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const archiveRoot = path.join(root, "archive", "site-v1");

test("every archived Markdown file exists and matches the preservation manifest", async () => {
  const manifest = JSON.parse(
    await readFile(path.join(archiveRoot, "manifest.json"), "utf8"),
  );
  assert.equal(manifest.algorithm, "sha256");
  assert.equal(manifest.files.length, 10);

  for (const entry of manifest.files) {
    const bytes = await readFile(path.join(archiveRoot, entry.path));
    const digest = createHash("sha256").update(bytes).digest("hex");
    assert.equal(digest, entry.sha256, entry.path);
  }

  const discoverMarkdown = async (directory) => {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) files.push(...(await discoverMarkdown(fullPath)));
      else if (entry.name.endsWith(".md")) files.push(fullPath);
    }
    return files;
  };

  const archivedMarkdown = await discoverMarkdown(
    path.join(archiveRoot, "content"),
  );
  assert.equal(archivedMarkdown.length, manifest.files.length);
});
