// Sample collection coordinates and site names from a sample's metadata.json.
//
// Coordinates can be given as "location" (written by hand or by older tools) or as
// "sampleLocation" (written by the MARTi Engine from the config file's Metadata Location line).
// Both are "latitude,longitude" in decimal degrees, e.g. "52.62170,1.21900".

var SAMPLE_COORDINATE_FIELDS = ['location', 'sampleLocation'];

function parseSampleCoordinates(value) {
  if (typeof value !== 'string') return null;
  var match = value.match(/^\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);
  if (!match) return null;
  var latitude = parseFloat(match[1]);
  var longitude = parseFloat(match[2]);
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude: latitude, longitude: longitude, text: value.trim() };
}

// The first valid coordinates in the metadata ("location", then "sampleLocation"), or null.
function sampleMetadataCoordinates(metadata) {
  if (!metadata) return null;
  for (var i = 0; i < SAMPLE_COORDINATE_FIELDS.length; i++) {
    var coordinates = parseSampleCoordinates(metadata[SAMPLE_COORDINATE_FIELDS[i]]);
    if (coordinates) return coordinates;
  }
  return null;
}

// The site's name: "locationName", else a location field that holds words rather than coordinates.
function sampleMetadataSiteName(metadata) {
  if (!metadata) return '';
  var name = typeof metadata.locationName === 'string' ? metadata.locationName.trim() : '';
  if (name) return name;
  for (var i = 0; i < SAMPLE_COORDINATE_FIELDS.length; i++) {
    var value = metadata[SAMPLE_COORDINATE_FIELDS[i]];
    if (typeof value === 'string' && value.trim() && !parseSampleCoordinates(value)) return value.trim();
  }
  return '';
}

function escapeSampleLocationHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
