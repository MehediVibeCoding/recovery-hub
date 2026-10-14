import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeBdPhone } from "../src/phone.ts";

test("plain 01 number passes through", () => {
  assert.equal(normalizeBdPhone("01712345678"), "01712345678");
});

test("+880 prefix is stripped", () => {
  assert.equal(normalizeBdPhone("+8801712345678"), "01712345678");
});

test("880 prefix without plus is stripped", () => {
  assert.equal(normalizeBdPhone("8801712345678"), "01712345678");
});

test("missing leading zero is restored", () => {
  assert.equal(normalizeBdPhone("1712345678"), "01712345678");
});

test("Bengali digits are converted", () => {
  assert.equal(normalizeBdPhone("০১৭১২৩৪৫৬৭৮"), "01712345678");
});

test("spaces and dashes are ignored", () => {
  assert.equal(normalizeBdPhone("017-1234 5678"), "01712345678");
});

test("invalid number returns null", () => {
  assert.equal(normalizeBdPhone("12345"), null);
  assert.equal(normalizeBdPhone(""), null);
  assert.equal(normalizeBdPhone(null), null);
});
