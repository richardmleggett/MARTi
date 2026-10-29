const assert = require('node:assert/strict');
const test = require('node:test');
const { compareOrdinationLegendLayout, compareOrdinationEqualAxisDomains, compareOrdinationHasAssignedGroups, compareOrdinationDefaultColour, compareOrdinationProject3d } = require('./compareOrdination');

test('3D projection rotates points without changing their coordinate scale', () => {
  const point = { x: 0.2, y: -0.3, z: 0.4 };
  const projected = compareOrdinationProject3d(point, 0.6, 0.4);
  assert.ok(Math.abs(Math.hypot(projected.x, projected.y, projected.depth) -
    Math.hypot(point.x, point.y, point.z)) < 1e-12);
  const front = compareOrdinationProject3d(point, 0, 0);
  assert.equal(front.x, point.x);
  assert.equal(front.y, point.z);
});

test('PCoA legend wraps variable-length names without overlapping items', () => {
  const names = ['Short', 'MARC_Yare_171117_F1_with_control', 'Another long sample name', 'Tail'];
  const availableWidth = 220;
  const layout = compareOrdinationLegendLayout(names, availableWidth, text => text.length * 7);
  assert.equal(layout.items.length, names.length);
  assert.ok(layout.height > 15);
  layout.items.forEach((item, index) => {
    assert.equal(item.group, names[index]);
    assert.ok(item.x + item.width <= availableWidth);
    assert.ok(item.lines.every(line => line.length * 7 <= availableWidth - 18));
  });
  for (let i = 0; i < layout.items.length; i++) {
    for (let j = i + 1; j < layout.items.length; j++) {
      const a = layout.items[i], b = layout.items[j];
      assert.ok(a.x + a.width <= b.x || b.x + b.width <= a.x ||
        a.y + a.height <= b.y || b.y + b.height <= a.y);
    }
  }
  const wrapped = layout.items.find(item => item.group === names[1]);
  assert.ok(wrapped.lines.length > 1);
  assert.equal(wrapped.lines.join(''), names[1]);
});

test('PCoA uses equal coordinate scale on both axes', () => {
  const points = [{ x: -0.2, y: -0.1 }, { x: 0.4, y: 0.3 }];
  for (const [width, height] of [[785, 410], [425, 410]]) {
    const domain = compareOrdinationEqualAxisDomains(points, width, height);
    const xPixelsPerUnit = width / (domain.xmax - domain.xmin);
    const yPixelsPerUnit = height / (domain.ymax - domain.ymin);
    assert.ok(Math.abs(xPixelsPerUnit - yPixelsPerUnit) < 1e-10);
    assert.ok(domain.xmin < points[0].x && domain.xmax > points[1].x);
    assert.ok(domain.ymin < points[0].y && domain.ymax > points[1].y);
  }
});

test('PCoA defaults to assigned groups only when a selected sample has one', () => {
  const selected = [{ pathRun: 'run-1', pathName: 'a' }, { pathRun: 'run-2', pathName: 'b' }];
  const groups = { 'run-1/a': 'Control', 'run-3/c': 'Other' };
  const groupValue = (run, sample) => groups[run + '/' + sample] || '';
  assert.equal(compareOrdinationHasAssignedGroups(selected, groupValue), true);
  assert.equal(compareOrdinationHasAssignedGroups([selected[1]], groupValue), false);
  assert.equal(compareOrdinationDefaultColour(selected, groupValue), 'manual');
  assert.equal(compareOrdinationDefaultColour([selected[1]], groupValue), 'run');
  assert.equal(compareOrdinationDefaultColour([], groupValue), 'run');
});
