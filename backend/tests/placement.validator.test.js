import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlacementSchema } from '../src/validators/placement.validator.js';

test('accepts a consecutive academic year and HTTPS sheet URL', () => {
  const result=createPlacementSchema.safeParse({body:{academicYear:'2025-26',sheetUrl:'https://docs.google.com/spreadsheets/d/example',status:'published'}});
  assert.equal(result.success,true);
});

test('rejects a non-consecutive academic year', () => {
  const result=createPlacementSchema.safeParse({body:{academicYear:'2025-27',sheetUrl:'https://example.com/sheet'}});
  assert.equal(result.success,false);
});

test('rejects a non-HTTPS placement link', () => {
  const result=createPlacementSchema.safeParse({body:{academicYear:'2025-26',sheetUrl:'http://example.com/sheet'}});
  assert.equal(result.success,false);
});
