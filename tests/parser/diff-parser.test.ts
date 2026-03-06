import { describe, it, expect } from 'vitest';
import { parseDiff } from '../../src/parser/diff-parser.js';

describe('diff-parser', () => {
  it('should parse a simple diff with one file', () => {
    const diff = `diff --git a/src/app.ts b/src/app.ts
index abc1234..def5678 100644
--- a/src/app.ts
+++ b/src/app.ts
@@ -1,3 +1,4 @@
 import { foo } from './foo';
+import { bar } from './bar';

 function main() {`;

    const result = parseDiff(diff);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].path).toBe('src/app.ts');
    expect(result.files[0].status).toBe('modified');
    expect(result.files[0].hunks).toHaveLength(1);

    const lines = result.files[0].hunks[0].lines;
    expect(lines.some((l) => l.type === 'add' && l.content.includes('bar'))).toBe(true);
  });

  it('should parse a new file diff', () => {
    const diff = `diff --git a/src/new.ts b/src/new.ts
new file mode 100644
index 0000000..abc1234
--- /dev/null
+++ b/src/new.ts
@@ -0,0 +1,3 @@
+export function hello() {
+  return 'world';
+}`;

    const result = parseDiff(diff);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].status).toBe('added');
    expect(result.files[0].oldPath).toBeNull();
    expect(result.files[0].hunks[0].lines.filter((l) => l.type === 'add')).toHaveLength(3);
  });

  it('should parse a deleted file diff', () => {
    const diff = `diff --git a/src/old.ts b/src/old.ts
deleted file mode 100644
index abc1234..0000000
--- a/src/old.ts
+++ /dev/null
@@ -1,2 +0,0 @@
-export const x = 1;
-export const y = 2;`;

    const result = parseDiff(diff);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].status).toBe('deleted');
  });

  it('should parse multiple files in one diff', () => {
    const diff = `diff --git a/src/a.ts b/src/a.ts
index abc..def 100644
--- a/src/a.ts
+++ b/src/a.ts
@@ -1,2 +1,2 @@
-const x = 1;
+const x = 2;
 const y = 3;
diff --git a/src/b.ts b/src/b.ts
index ghi..jkl 100644
--- a/src/b.ts
+++ b/src/b.ts
@@ -1 +1 @@
-export default 'a';
+export default 'b';`;

    const result = parseDiff(diff);
    expect(result.files).toHaveLength(2);
    expect(result.files[0].path).toBe('src/a.ts');
    expect(result.files[1].path).toBe('src/b.ts');
  });

  it('should handle multiple hunks in one file', () => {
    const diff = `diff --git a/src/app.ts b/src/app.ts
index abc..def 100644
--- a/src/app.ts
+++ b/src/app.ts
@@ -1,3 +1,3 @@
-const a = 1;
+const a = 2;
 const b = 3;
 const c = 4;
@@ -10,3 +10,3 @@
-const x = 1;
+const x = 2;
 const y = 3;
 const z = 4;`;

    const result = parseDiff(diff);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].hunks).toHaveLength(2);
  });

  it('should parse line numbers correctly', () => {
    const diff = `diff --git a/src/app.ts b/src/app.ts
index abc..def 100644
--- a/src/app.ts
+++ b/src/app.ts
@@ -5,3 +5,4 @@
 line5
 line6
+newLine
 line7`;

    const result = parseDiff(diff);
    const lines = result.files[0].hunks[0].lines;
    const addedLine = lines.find((l) => l.type === 'add');
    expect(addedLine?.newLineNumber).toBe(7);
    expect(addedLine?.content).toBe('newLine');
  });

  it('should handle empty diff', () => {
    const result = parseDiff('');
    expect(result.files).toHaveLength(0);
  });

  it('should handle renamed files', () => {
    const diff = `diff --git a/src/old-name.ts b/src/new-name.ts
similarity index 100%
rename from src/old-name.ts
rename to src/new-name.ts`;

    const result = parseDiff(diff);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].status).toBe('renamed');
    expect(result.files[0].path).toBe('src/new-name.ts');
    expect(result.files[0].oldPath).toBe('src/old-name.ts');
  });
});
