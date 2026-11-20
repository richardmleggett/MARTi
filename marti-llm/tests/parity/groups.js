// Run the MARTi GUI's own grouping code on test cases: node groups.js <MARTi root> <cases.json> <out.json>
const fs = require('fs'), path = require('path'), vm = require('vm');
const [root, casesPath, outPath] = process.argv.slice(2);
const ui = path.join(root, 'gui', 'UI');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(ui, 'public', 'js', 'compareViews.js'), 'utf8'), context);
const { normalizeProjectSampleGroups } = require(path.join(ui, 'services', 'projectSampleGroups.js'));
const cases = JSON.parse(fs.readFileSync(casesPath, 'utf8'));
const out = { metadata: [], groups: [] };
for (const md of cases.metadata) {
  context.sample = { metadatafile: md };
  out.metadata.push({
    location: vm.runInContext('compareSampleMetadataGroup(sample, "location")', context),
    date: vm.runInContext('compareSampleMetadataGroup(sample, "date")', context),
  });
}
for (const g of cases.groups) {
  try { out.groups.push({ ok: normalizeProjectSampleGroups(g) }); }
  catch (e) { out.groups.push({ error: e.message }); }
}
fs.writeFileSync(outPath, JSON.stringify(out));
