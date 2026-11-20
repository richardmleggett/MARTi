const test = require('node:test');
const assert = require('node:assert/strict');
const { appendId } = require('./taxonIdPicker');

test('adds a selected NCBI ID after existing IDs without changing their order', () => {
  assert.equal(appendId('', '562'), '562');
  assert.equal(appendId('2, 4751', '562'), '2, 4751, 562');
  assert.equal(appendId('2\n4751; ', '562'), '2\n4751, 562');
});

test('does not add a duplicate ID or alter a list that already contains it', () => {
  assert.equal(appendId('2, 4751, ', '2'), '2, 4751, ');
  assert.equal(appendId('2157, 2', '2'), '2157, 2');
});
