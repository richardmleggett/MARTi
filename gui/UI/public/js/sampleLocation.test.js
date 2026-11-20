const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function load() {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'sampleLocation.js'), 'utf8'), context);
  return context;
}

test('coordinates are read from location or the Engine-written sampleLocation', () => {
  const c = load();
  const fromLocation = c.sampleMetadataCoordinates({ location: '52.6217, 1.219', sampleLocation: '10.0,10.0' });
  assert.equal(fromLocation.latitude, 52.6217);
  assert.equal(fromLocation.longitude, 1.219);
  const fromEngine = c.sampleMetadataCoordinates({ sampleLocation: '52.62170,1.21900' });
  assert.equal(fromEngine.latitude, 52.6217);
  assert.equal(fromEngine.longitude, 1.219);
  assert.equal(fromEngine.text, '52.62170,1.21900');
  // A location that is a place name falls through to sampleLocation.
  assert.equal(c.sampleMetadataCoordinates({ location: 'Hickling Broad', sampleLocation: '52.74,1.57' }).latitude, 52.74);
  assert.equal(c.sampleMetadataCoordinates({ location: '-33, 151' }).longitude, 151);
});

test('missing, malformed or out-of-range coordinates are ignored', () => {
  const c = load();
  assert.equal(c.sampleMetadataCoordinates(null), null);
  assert.equal(c.sampleMetadataCoordinates({}), null);
  assert.equal(c.sampleMetadataCoordinates({ location: 'Norwich' }), null);
  assert.equal(c.sampleMetadataCoordinates({ sampleLocation: '95.0, 1.2' }), null);
  assert.equal(c.sampleMetadataCoordinates({ location: '52.1, 190.0' }), null);
  assert.equal(c.sampleMetadataCoordinates({ location: 52.1 }), null);
});

test('site name prefers locationName, then a non-coordinate location', () => {
  const c = load();
  assert.equal(c.sampleMetadataSiteName({ locationName: ' Hickling Broad ', location: '52.74,1.57' }), 'Hickling Broad');
  assert.equal(c.sampleMetadataSiteName({ sampleLocation: 'River Yare' }), 'River Yare');
  assert.equal(c.sampleMetadataSiteName({ sampleLocation: '52.74,1.57' }), '');
  assert.equal(c.escapeSampleLocationHtml('<b>"x"</b>'), '&lt;b&gt;&quot;x&quot;&lt;/b&gt;');
});
