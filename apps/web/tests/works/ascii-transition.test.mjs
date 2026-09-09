import assert from "node:assert/strict";
import test from "node:test";
import { existsSync } from "node:fs";
import { sourcePath, importSourceModule } from "../helpers/projectPaths.mjs";

test("cipher frames preserve graphemes and settle to exact text without yellow markup", async () => {
  assert.ok(existsSync(sourcePath("scroll/asciiTransition.ts")), "shared cipher state is required");
  const { cipherFrame, splitGraphemes, archiveTransition } = await importSourceModule("scroll/asciiTransition.ts");
  const text = "中文 e\u0301 👨‍👩‍👧‍👦";
  assert.equal(splitGraphemes(text).length, 6);
  assert.equal(cipherFrame(text,1,"enter",2).text,text);
  assert.equal(cipherFrame(text,0,"exit",2).text,text);
  assert.equal(cipherFrame(text,1,"exit",2).opacity,0);
  assert.notEqual(cipherFrame(text,.4,"enter",2).text,text);
  assert.ok(new Set(cipherFrame("abcdefghijklmnopqrst", 0, "enter", 2).text).size > 4, "cipher must vary across positions");
  assert.deepEqual(archiveTransition("profile","devstories",.1),{visible:"profile",phase:"exit"});
  assert.deepEqual(archiveTransition("profile","devstories",.3),{visible:"devstories",phase:"enter"});
  assert.deepEqual(archiveTransition("profile","profile",.1),{visible:"profile",phase:"enter"});
});
