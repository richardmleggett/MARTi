/* global d3, $, ResizeSensor, colourPalettes, selectedPalette, toolTipDiv */

// =======================
// Dashboard Sankey (D3 v3)
// =======================


var dashboardSankeyRoot;
var sankeyShowUnclassified;

var sankeyVisibleCols;


var sankeySvg, sankeyG;
var sankeyMargin = { top: 50, right: 20, bottom: 18, left: 20 };
var sankeyHeight = 440; // overall SVG height; width is responsive
var sankeyColor = d3.scale.ordinal().range(colourPalettes && colourPalettes[selectedPalette] ? colourPalettes[selectedPalette] : d3.scale.category20().range());

var sankeyLayout, sankeyPath;        // d3.sankey layout + link generator (v3 plugin)
var sankeyDataCurrent = null;        // latest data we rendered
var sankeyPrevPosById = {};       // remember node positions by name across updates

// per-rank label visibility; default: show D..S, hide R unless user enables it
var sankeyLabelCols;
var sankeyLeafCount = 0;
var sankeyTopNDefault = 25;
var sankeyTopN = sankeyTopNDefault;

var sankeyResetTopNOnNextBuild;
var sankeyLastRankKey = null;   // signature of the columns we’re building: e.g. "1|2|3"

var SANKEY_MIN_NODE_DY = 0.5;
var SANKEY_MIN_LINK_DY = SANKEY_MIN_NODE_DY; // keep in sync

var SANKEY_MIN_PER_LEAF_PX  = 28;   // target px per leaf
var SANKEY_MIN_PER_LEAF_CAP = 40;   // stop growing beyond this many leaves
var SANKEY_MIN_INNER_H = 350;

var sankeyLastTreeName = null;

function updateDashboardSankeyTopNMax(count, resetToDefault) {
  if (typeof count === "number") sankeyLeafCount = count;

  var maxCount = Math.max(1, sankeyLeafCount || 1);
  d3.selectAll("input[name='dashboardSankeyTopN']").property("max", maxCount);

  if (resetToDefault) {
    // Snap back to default if new data can support it; otherwise use the max available
    sankeyTopN = (sankeyLeafCount >= sankeyTopNDefault) ? sankeyTopNDefault : sankeyLeafCount || 1;
  } else {
    // Normal clamp only
    if (sankeyTopN < 1) sankeyTopN = 1;
    if (sankeyTopN > maxCount) sankeyTopN = maxCount;
  }

  // Reflect in both slider instances + label
  d3.selectAll("input[name='dashboardSankeyTopN']").property("value", sankeyTopN);
  d3.selectAll(".dashboard-sankey-top-n-text").text(sankeyTopN);
  d3.selectAll(".dashboard-sankey-total-n-text").text(sankeyLeafCount || 0);
}



// -----------------------
// Public: init once
// -----------------------
function initialiseDashboardSankey() {

  // per-rank label visibility; default: show D..S, hide R unless user enables it
sankeyLabelCols = { 0:false, 1:true, 2:true, 3:true, 4:true, 5:true, 6:true, 7:true, 8:true };
sankeyVisibleCols = { 1:true, 2:true, 3:true, 4:false, 5:false, 6:true, 7:true, 8:true };
dashboardSankeyRoot = "hide";
sankeyShowUnclassified = "show";
sankeyLastTreeName = null;
sankeyLeafCount = 0;
sankeyTopNDefault = 25;
sankeyTopN = sankeyTopNDefault;
sankeyResetTopNOnNextBuild = false;

  // remove any previous SVG
  d3.select("#sankeyPlotContainer").select("svg").remove();

  // scaffold
  sankeySvg = d3.select("#sankeyPlotContainer")
    .append("svg")
      .attr("id", "sankeySvg")
      .attr("width", "100%")
      .attr("height", sankeyHeight);

  sankeyG = sankeySvg.append("g")
    .attr("transform", "translate(" + sankeyMargin.left + "," + sankeyMargin.top + ")");

  // d3.sankey (v3 plugin)
  sankeyLayout = d3.sankey()
    .nodeWidth(16)
    .nodePadding(8);

  sankeyPath = sankeyLayout.link();

  // make sure palette is in sync
  sankeyColor.range(colourPalettes && colourPalettes[selectedPalette] ? colourPalettes[selectedPalette] : sankeyColor.range());



  d3.selectAll("input[name='dashboardSankeyRoot']").on("change", function () {
    dashboardSankeyRoot = this.value; // "show" | "hide"
    updateSankeyFromActiveTree();            // rebuild using the new option
  });

  d3.selectAll("input[name='dashboardSankeyUnclassified']").on("change", function () {
    sankeyShowUnclassified = this.value;
    updateSankeyFromActiveTree();
  });
  

  d3.selectAll(".sankey-label-col").on("change", function() {
    var rn = +this.value;
    sankeyLabelCols[rn] = this.checked;
    if (sankeyDataCurrent) sankeyUpdate(sankeyDataCurrent, false);
  });

  // Column show/hide toggles
  d3.selectAll(".sankey-col-toggle").on("change", function () {
    var rn = +this.value;
    sankeyVisibleCols[rn] = this.checked;
    updateSankeyFromActiveTree();   // rebuild with new column set
  });



  // Top-N leaves slider (both instances share the same name)
d3.selectAll("input[name='dashboardSankeyTopN']").on("change", function(){
  updateSankeyFromActiveTree();
});

d3.selectAll("input[name='dashboardSankeyTopN']").on("input", function(){
  sankeyTopN = parseInt(this.value) || sankeyTopNDefault;
  d3.selectAll("input[name='dashboardSankeyTopN']").property("value", sankeyTopN);
  d3.selectAll(".dashboard-sankey-top-n-text").text(sankeyTopN);
});

// initialise label text
d3.selectAll(".dashboard-sankey-top-n-text").text(sankeyTopN);
d3.selectAll(".dashboard-sankey-total-n-text").text(sankeyLeafCount || 0);


}

// -----------------------
// Public: update data
// data = { nodes:[{name:'A'},...], links:[{source:'A'|0, target:'B'|1, value: n}, ...] }
// -----------------------
function sankeySetData(data) {
  sankeyDataCurrent = cloneSankeyData(data);
  sankeyUpdate(sankeyDataCurrent, true);
}

// -----------------------
// Public: refresh colours if palette changes
// -----------------------
function sankeyRefreshPalette() {
  sankeyColor.range(colourPalettes && colourPalettes[selectedPalette] ? colourPalettes[selectedPalette] : sankeyColor.range());
  if (!sankeyG) return;
  sankeyG.selectAll("g.sankey-node rect").style("fill", function (d) { return sankeyColor(d.id); });
}

// -----------------------
// Internal: layout + draw
// -----------------------
function sankeyUpdate(data, animate) {
  // responsive inner size
  // var cardW = $("#sankeyPlotContainer").width() || 0;
  // var innerW = Math.max(320, cardW - sankeyMargin.left - sankeyMargin.right);
  // var innerH = Math.max(240, sankeyHeight - sankeyMargin.top - sankeyMargin.bottom);

  var cardW = $("#sankeyPlotContainer").width() || 0;

  // --- dynamic right margin: longest label in the right-most *visible* column ---
  var minRight = 20;                               // keep at least this much
  var rightmostRank = null, maxLabel = 0;
  
  // use the incoming data (not yet laid out) and ignore dummy carry-nodes
  if (data && data.nodes && data.nodes.length) {
    var realNodes = data.nodes.filter(function(n){ return !n.__dummy; });
    if (realNodes.length) {
      rightmostRank = d3.max(realNodes, function(n){ return +n.rankNo; });
      var lastCol = realNodes.filter(function(n){
        return +n.rankNo === rightmostRank && sankeyLabelCols[n.rankNo]; // only ranks with labels ON
      });
  
      for (var i = 0; i < lastCol.length; i++) {
        var txt = truncateLabel(lastCol[i].name || "", SANKEY_LABEL_MAX);
        maxLabel = Math.max(maxLabel, measureLabelWidth(txt));
      }
    }
  }
  
  // label sits at nodeWidth + 6 to the right of the node
  var labelOffset = (sankeyLayout ? sankeyLayout.nodeWidth() : 16) + 6;
  sankeyMargin.right = Math.max(minRight, labelOffset + maxLabel + 6);
  
  // now compute innerW using the updated right margin
  var innerW = Math.max(320, cardW - sankeyMargin.left - sankeyMargin.right);
  

  sankeyColor.range(colourPalettes && colourPalettes[selectedPalette] ? colourPalettes[selectedPalette] : sankeyColor.range());

// Build node list first (as you already do)
var nodes = data.nodes.map(function (n) {
  var copy = $.extend({}, n);
  if (sankeyPrevPosById[copy.id]) {
    copy.x = sankeyPrevPosById[copy.id].x;
    copy.y = sankeyPrevPosById[copy.id].y;
  }
  return copy;
});

// --- choose a padding based on density ---
var countsByCol = {};
nodes.forEach(function(n){
  var k = (typeof n.rankNo === 'number') ? n.rankNo : -1;
  countsByCol[k] = (countsByCol[k] || 0) + 1;
});
var maxInCol = 0;
Object.keys(countsByCol).forEach(function(k){ if (countsByCol[k] > maxInCol) maxInCol = countsByCol[k]; });


// --- how many leaves (endpoints) are actually being drawn? -------------
function countVisibleLeavesFromData(nodes, dataLinks) {
  if (!nodes || !nodes.length) return 0;

  // right-most visible rank in this render
  var lastRank = d3.max(nodes, function(n){ return (n && !n.__dummy) ? +n.rankNo : -1; });
  if (!isFinite(lastRank) || lastRank < 0) return 0;

  // maps to resolve id/rank quickly
  var idByIndex = {};
  var rankById  = {};
  for (var i = 0; i < nodes.length; i++) {
    if (!nodes[i]) continue;
    idByIndex[i] = nodes[i].id;
    rankById[nodes[i].id] = +nodes[i].rankNo;
  }

  function targetId(l) {
    var t = l && l.target;
    if (t == null) return null;
    if (typeof t === "number") {
      // could be an index or already an id; prefer index if in range
      return (t >= 0 && t < nodes.length && idByIndex[t] != null) ? idByIndex[t] : t;
    }
    if (typeof t === "string") return t;
    if (typeof t === "object") return (t.id != null) ? t.id : null;
    return null;
  }

  var seen = Object.create(null);
  (dataLinks || []).forEach(function(l){
    if (!l || l.__hidden) return;
    var tid = targetId(l);
    if (tid == null) return;
    if (+rankById[tid] === lastRank) seen[tid] = true;
  });
  return Object.keys(seen).length;
}

// --- padding used everywhere
var pad = 18;
if (typeof sankeyLayout.nodePadding === "function") sankeyLayout.nodePadding(pad);

// leaves actually shown this render (use data.links, not the yet-to-be-built `links`)
var leavesShown   = countVisibleLeavesFromData(nodes, data && data.links);
var leavesForFloor = Math.min(leavesShown, SANKEY_MIN_PER_LEAF_CAP);

// match your expectation: ~ (per-leaf px * leaves) + top/bottom cushion
var extraTB = 30;  // keep consistent with computeAutoInnerHeight call below
var dynMinInner = extraTB + (leavesForFloor * SANKEY_MIN_PER_LEAF_PX);

// combine with any hard floor
var minInnerForThisRender = Math.max(SANKEY_MIN_INNER_H || 0, dynMinInner);

// now compute inner height
var innerH = computeAutoInnerHeight(nodes, {
  minNodeHeight : SANKEY_MIN_NODE_DY,
  extraTopBottom: extraTB,
  minInnerHeight: minInnerForThisRender,
  maxInnerHeight: Number.POSITIVE_INFINITY,
  padOverride   : pad
});



sankeySvg.attr("height", innerH + sankeyMargin.top + sankeyMargin.bottom);
sankeyG.attr("transform", "translate(" + sankeyMargin.left + "," + sankeyMargin.top + ")");








  // 2) (PIN COLUMNS HERE) — before links are normalized and before layout()
  // Build a column index from the MARTi rank numbers present in this dataset.
  // Order is fixed to match treemap semantics: Domain→…→Species.
  var fixedOrder = [1,2,3,4,5,6,7,8];         // MARTi ranks we use as columns
  var present = {};
  nodes.forEach(function(n){
    if (!n.__dummy && typeof n.rankNo === "number" && fixedOrder.indexOf(n.rankNo) !== -1) {
      present[n.rankNo] = true;
    }
  });
  var orderedCols = fixedOrder.filter(function(rn){ return present[rn]; });
  // If you render root (rank 0), put it as the leftmost column:
  var hasRoot = nodes.some(function(n){ return n.rankNo === 0; });
  if (hasRoot) orderedCols.unshift(0);

  var colIndex = {};
  for (var i = 0; i < orderedCols.length; i++) colIndex[orderedCols[i]] = i;

  // Pin each node to its column (d3-sankey v3 uses integer "breadths" for x)
  nodes.forEach(function(n){
    if (colIndex.hasOwnProperty(n.rankNo)) n.x = colIndex[n.rankNo];
  });



// --- Resolve links by ID or index ---
// 1) id -> index map
var idToIndex = {};
for (var i = 0; i < nodes.length; i++) {
  var nd = nodes[i];
  if (nd && nd.id != null) idToIndex[nd.id] = i; // keys become strings under the hood
}

// 2) Helper: turn a ref into an index
function toIdx(ref) {
  // Prefer ID resolution for numbers (ncbiIDs) to avoid misinterpreting small IDs as indices
  if (typeof ref === "number") {
    if (ref in idToIndex) return idToIndex[ref];           // treat numeric as ID first
    return (ref >= 0 && ref < nodes.length) ? ref : null;  // ONLY then consider index
  }
  if (typeof ref === "string") {
    return (ref in idToIndex) ? idToIndex[ref] : null;
  }
  if (ref && typeof ref === "object") {
    var rid = (ref.id != null) ? ref.id : ref.name;
    return (rid in idToIndex) ? idToIndex[rid] : null;
  }
  return null;
}


// 3) Normalize links (accept id or index) and build stable keys by ID
var links = data.links.map(function (l, idx) {
  var s = toIdx(l.source);
  var t = toIdx(l.target);

  if (s == null || t == null) {
    return null;
  }

  var key = (nodes[s].id + "→" + nodes[t].id);
  return { source: s, target: t, value: +l.value, __key: key, __hidden: !!l.__hidden };
}).filter(Boolean);





  // Layout
  sankeyLayout
    .nodes(nodes)
    .links(links)
    .size([innerW, innerH])
    .layout(24); // iterations

// Snap columns by rank after layout (prevents sinks being pushed to the last column)
(function snapColumnsByRank(){
  var xByRank = {};

  nodes.forEach(function(n){
    if (n.__dummy) return;
    var r = n.rankNo;
    (xByRank[r] || (xByRank[r] = [])).push(n.x);
  });

  var targetX = {};
  Object.keys(xByRank).forEach(function(r){
    var xs = xByRank[r].sort(function(a,b){ return a - b; });
    // use the lower median to be extra stable for even sizes
    var idx = Math.floor((xs.length - 1) / 2);
    targetX[r] = xs[idx];
  });

  // re-pin all nodes (including dummies) to the rank's target x
  nodes.forEach(function(n){
    var tx = targetX[n.rankNo];
    if (tx != null) n.x = tx;
  });
})();

sankeyLayout.relayout();


// Tree-like ordering with two-way sweep
var maps = buildParentChildrenMaps(nodes, links);

// roots (no parent). If root=1 is shown, it will be the single root.
var roots = [];
for (var i = 0; i < nodes.length; i++) {
  var n = nodes[i];
  if (maps.parentOf[n.id] == null) roots.push(n.id);
}

// initial DFS order (stable id order for traversal)
var childSort = function(aId, bId){
  var a = nodes.find(function(n){ return n.id === aId; });
  var b = nodes.find(function(n){ return n.id === bId; });
  var va = (a && a.value) || 0, vb = (b && b.value) || 0;
  if (vb !== va) return vb - va;
  return d3.ascending(a ? a.name : "", b ? b.name : "");
};
var orderIndex = computeTreeOrder(nodes, maps.childrenOf, roots, childSort);

var padNow = (typeof sankeyLayout.nodePadding === "function") ? sankeyLayout.nodePadding() : 8;
var cols = columnsByRank(nodes);
var colKeys = Object.keys(cols).map(function(k){ return +k; }).sort(function(a,b){ return a-b; });

// --- Left -> Right: sort each column by parent order
for (var c = 1; c < colKeys.length; c++) {
  var k = colKeys[c];
  var colL2R = cols[k].filter(isLayoutActive);
  packOneColumn(
    colL2R,
    function(a,b){
      var pa = maps.parentOf[a.id], pb = maps.parentOf[b.id];
      var oa = (pa != null ? orderIndex[pa] : orderIndex[a.id]);
      var ob = (pb != null ? orderIndex[pb] : orderIndex[b.id]);
      if (oa !== ob) return oa - ob;
      return d3.ascending(a.name, b.name);
    },
    padNow,
    innerH
  );
}
sankeyLayout.relayout(); // recompute sy/ty with the new packing

// --- Right -> Left: sort each column by barycenter of children order
for (var c2 = colKeys.length - 2; c2 >= 0; c2--) {
  var k2 = colKeys[c2];
  var colR2L = cols[k2].filter(isLayoutActive);
  packOneColumn(
    colR2L,
    function(a,b){
      var ca = childBarycenter(a, maps.childrenOf, orderIndex);
      var cb = childBarycenter(b, maps.childrenOf, orderIndex);
      if (ca !== cb) return ca - cb;
      return d3.ascending(a.name, b.name);
    },
    padNow,
    innerH
  );
}
sankeyLayout.relayout(); // final sy/ty with both-side consistency

// --- Final guard: keep child blocks in the same order as their parents
enforceParentBlockOrder(nodes, maps, padNow, innerH);
sankeyLayout.relayout();


// --- OVERRIDE NODE HEIGHTS FROM TOTALS (summedValue) -----------------------
// (function applyNodeHeightsFromTotals(){
//   // 1) compute scale so the busiest column by summedValue fits innerH
//   var cols = columnsByRank(nodes);
//   var colKeys = Object.keys(cols).map(function(k){ return +k; }).sort(function(a,b){ return a - b; });

//   // base gap used in repacking; match your packer’s pad (leaf column extra is handled by packer)
//   var basePad = (typeof sankeyLayout.nodePadding === "function") ? sankeyLayout.nodePadding() : 8;

//   // if you use fixed top/bottom paddings inside packOneColumn, reflect them here (defaults below)
//   var TOP_PAD = (typeof SANKEY_COL_TOP_PAD !== "undefined") ? SANKEY_COL_TOP_PAD : 10;
//   var BOTTOM_PAD = (typeof SANKEY_COL_BOTTOM_PAD !== "undefined") ? SANKEY_COL_BOTTOM_PAD : 10;

//   var pxPerUnit = Infinity;
//   colKeys.forEach(function(rn){
//     var col = cols[rn].filter(function(n){ return !n.__dummy; });
//     if (!col.length) return;
//     var sumVals = 0;
//     for (var i = 0; i < col.length; i++) sumVals += (+col[i].summedValue || 0);
//     // room available for rectangles in this column
//     var gaps = Math.max(0, col.length - 1);
//     var room = Math.max(1, innerH - TOP_PAD - BOTTOM_PAD - gaps * basePad);
//     if (sumVals > 0) {
//       var perCol = room / sumVals;
//       if (perCol > 0) pxPerUnit = Math.min(pxPerUnit, perCol);
//     }
//   });

//   if (!isFinite(pxPerUnit) || pxPerUnit === Infinity) return;
//   nodes.forEach(function(n){
//     var v = +n.summedValue || 0;
//     n.dy = Math.max(SANKEY_MIN_NODE_DY, v * pxPerUnit);
//   });

//   var clamped = 0;
//   nodes.forEach(function(n){
//     var raw = (+n.summedValue || 0) * pxPerUnit;
//     if (raw < SANKEY_MIN_NODE_DY) clamped++;
//   });
//   console.log("[Sankey] pxPerUnit=", pxPerUnit.toFixed(4),
//               " minHeight=", SANKEY_MIN_NODE_DY,
//               " clamped nodes=", clamped);

//   // 3) repack each column (preserve current order), then recompute sy/ty
//   var cmpKeepOrder = function(a,b){ return a.y - b.y; };
//   colKeys.forEach(function(rn){
//     packOneColumn(cols[rn], cmpKeepOrder, basePad, innerH);
//   });

//   sankeyLayout.relayout(); // recompute link sy/ty against new node.dy
// })();

// --- OVERRIDE NODE HEIGHTS FROM TOTALS (min maps to min-height) ------------
(function applyNodeHeightsFromTotals(){
  var cols = columnsByRank(nodes);
  var colKeys = Object.keys(cols).map(function(k){ return +k; }).sort(function(a,b){ return a - b; });

  var basePad = (typeof sankeyLayout.nodePadding === "function") ? sankeyLayout.nodePadding() : 8;
  var TOP_PAD = (typeof SANKEY_COL_TOP_PAD !== "undefined") ? SANKEY_COL_TOP_PAD : 10;
  var BOTTOM_PAD = (typeof SANKEY_COL_BOTTOM_PAD !== "undefined") ? SANKEY_COL_BOTTOM_PAD : 10;

  // 1) smallest non-zero summedValue across *real* nodes
  var vMin = Infinity;
  colKeys.forEach(function(rn){
    cols[rn].forEach(function(n){
      if (n.__dummy) return;
      var v = +n.summedValue || 0;
      if (v > 0 && v < vMin) vMin = v;
    });
  });
  if (!isFinite(vMin)) return; // nothing to scale from

  // 2) compute a single global scale S so every column fits
  //    start at +∞ so we can also *expand* when there is spare room
  var S = Infinity;
  colKeys.forEach(function(rn){
    var col = cols[rn].filter(function(n){ return !n.__dummy; });
    if (!col.length) return;

    var gaps = Math.max(0, col.length - 1);
    var room = Math.max(1, innerH - TOP_PAD - BOTTOM_PAD - gaps * basePad);

    var totalRaw = 0;
    for (var i = 0; i < col.length; i++) {
      var v = +col[i].summedValue || 0;
      totalRaw += (v > 0) ? (SANKEY_MIN_NODE_DY * (v / vMin)) : SANKEY_MIN_NODE_DY;
    }
    if (totalRaw > 0) {
      var sCol = room / totalRaw;
      if (sCol > 0 && sCol < S) S = sCol;  // take the min so *every* column fits
    }
  });
  if (!isFinite(S) || S <= 0) S = 1; // fallback

  // 3) apply heights and repack
  nodes.forEach(function(n){
    if (n.__dummy) return;
    var v = +n.summedValue || 0;
    var hRaw = (v > 0) ? (SANKEY_MIN_NODE_DY * (v / vMin)) : SANKEY_MIN_NODE_DY;
    n.dy = Math.max(SANKEY_MIN_NODE_DY, hRaw * S);
  });

  var cmpKeepOrder = function(a,b){ return a.y - b.y; };
  colKeys.forEach(function(rn){
    packOneColumn(cols[rn].filter(isLayoutActive), cmpKeepOrder, basePad, innerH);
  });
  sankeyLayout.relayout();

})();


// Align the tallest column to a fixed top pad without breaking the centring feel
(function alignTallestTop(){
  var desiredTopPad = 10;           // px from the top of the inner plotting area
  var byCol = columnsByRank(nodes); // you already have this util

  // Compute "used height" per column (sum of rect heights + gaps), and current top (min y)
  var totals = {}, tops = {};
  var padUsed = (typeof sankeyLayout.nodePadding === "function") ? sankeyLayout.nodePadding() : 8;

  Object.keys(byCol).forEach(function(k){
    var col = byCol[k].filter(function(n){ return !n.__dummy; });
    if (!col.length) return;

    var totalRects = 0;
    for (var i = 0; i < col.length; i++) totalRects += Math.max(1, col[i].dy);
    var gaps = Math.max(0, col.length - 1);
    totals[k] = totalRects + gaps * padUsed;
    tops[k]   = d3.min(col, function(n){ return n.y; });
  });

  // Which column is tallest?
  var tallestRank = null, tallestTotal = -Infinity;
  Object.keys(totals).forEach(function(k){
    if (totals[k] > tallestTotal) { tallestTotal = totals[k]; tallestRank = +k; }
  });
  if (tallestRank == null) return;

  var currentTop = tops[tallestRank] || 0;
  var delta = desiredTopPad - currentTop;

  // Shift the whole layout so the tallest column starts at desiredTopPad
  if (Math.abs(delta) > 0.5) {
    nodes.forEach(function(n){ n.y += delta; });
    sankeyLayout.relayout();   // update sy/ty for links after shifting nodes
  }

  // Make sure the SVG is tall enough to include the bottom after the shift
  var bottom = d3.max(nodes, function(n){ return n.y + Math.max(1, n.dy); }) || innerH;
  var bottomPad = 10; // fixed bottom cushion
  var newInnerH = Math.max(bottom + bottomPad, SANKEY_MIN_INNER_H, innerH);
  sankeySvg.attr("height", newInnerH + sankeyMargin.top + sankeyMargin.bottom);
})();

nodes.forEach(function(n){ if (n.__dummy) n.dx = 0; });


// --- Make link thickness follow the target node's total (summedValue) -------
(function setLinkThicknessFromTotals() {
  // Follow through dummy passthrough nodes to the real child target
  function terminalTarget(l) {
    var t = l.target;
    while (t && t.__dummy && t.sourceLinks && t.sourceLinks.length === 1) {
      t = t.sourceLinks[0].target;
    }
    return t || l.target;
  }

  // 1) Set each visible link's thickness to the target node's height
  (links || []).forEach(function (l) {
    if (l.__hidden) return;                 // ignore hidden carry links
    var tt = terminalTarget(l);
    l.dy = Math.max(SANKEY_MIN_LINK_DY, tt ? tt.dy : SANKEY_MIN_LINK_DY);                      // thickness used when rendering
  });

  // 2) Keep dummy node heights consistent with the band that passes through
  (nodes || []).forEach(function (n) {
    if (n.__dummy &&
        (n.targetLinks || []).length === 1 &&
        (n.sourceLinks || []).length === 1) {
      var inL  = n.targetLinks[0];
      var outL = n.sourceLinks[0];
      var d = Math.max(inL.dy || 1, outL.dy || 1);
      n.dy = d;
      // keep the band continuous through the dummy
      outL.sy = inL.ty = 0;
    }
  });

  // 3) Recompute sy/ty with the new link ordering, no visual gaps (prevents overflow)
  reorderLinksAndAddGaps(nodes, 0);
  sankeyLayout.relayout();
})();




// Finally: order links inside each node and add small visual gaps
// reorderLinksAndAddGaps(nodes, 0);  // try 2–3 if you have height


  // ----------------
  // LINKS (v3 pattern)
  // ----------------

  // var linksToRender = links.filter(function(l){ return !l.__hidden; });

  // var linkSel = sankeyG.selectAll("path.sankey-link")
  // .data(linksToRender, function (d) { return d.__key; });


  // linkSel.exit().remove();

  // linkSel.enter()
  //   .append("path")
  //     .attr("class", "sankey-link")
  //     .attr("fill", "none")
  //     .attr("stroke", "#999")
  //     .style("stroke-opacity", 0.45)
  //     .attr("d", sankeyPath)
  //     .style("stroke-width", function (d) { return Math.max(SANKEY_MIN_LINK_DY, d.dy); });

  // // v3: reselect unified selection
  // linkSel = sankeyG.selectAll("path.sankey-link");

  // linkSel.transition().duration(animate ? 700 : 0)
  //   .attr("d", sankeyPath)
  //   .style("stroke-width", function (d) { return Math.max(SANKEY_MIN_LINK_DY, d.dy); });
    

// ----------------
// LINKS (v3 pattern)
// ----------------
var linksToRender = links.filter(function(l){ return !l.__hidden; });

var linkSel = sankeyG.selectAll("path.sankey-link")
  .data(linksToRender, function (d) { return d.__key; });

// EXIT: fade + shrink
linkSel.exit()
  .remove();

// ENTER: start invisible and thin so they can animate in
var linkEnter = linkSel.enter()
  .append("path")
    .attr("class", "sankey-link")
    .attr("fill", "none")
    .attr("stroke", "#999")
    .style("stroke-opacity", 0)
    .style("stroke-width", 0)
    .attr("d", sankeyPath);

// UPDATE + ENTER together (reselect; v3 has no .merge)
linkSel = sankeyG.selectAll("path.sankey-link");

linkSel.transition().duration(animate ? 700 : 0)
  .attr("d", sankeyPath)
  .style("stroke-opacity", 0.45)
  .style("stroke-width", function (d) { return Math.max(SANKEY_MIN_LINK_DY, d.dy); });


  // tooltips for links
  ensureTooltipDiv();
  // linkSel
  //   .on("mousemove", function (d) {
  //     var sName = (typeof d.source === "object") ? d.source.name : nodes[d.source].name;
  //     var tName = (typeof d.target === "object") ? d.target.name : nodes[d.target].name;
  //     toolTipDiv.transition().duration(0).style("opacity", 0.95);
  //     toolTipDiv.html("<h6 class='mb-1'>" + sName + " → " + tName + "</h6>")
  //     .style("left", tooltipPos(d3.event.pageX) + "px")
  //     .style("top",  tooltipPosY(d3.event.pageY) + "px");
  //   })
  //   .on("mouseout", function () {
  //     toolTipDiv.transition().duration(50).style("opacity", 0);
  //   });

  // ----------------
  // NODES (v3 pattern)
  // ----------------
  var nodesToRender = nodes.filter(function (d) { return !d.__dummy; });   // <— NEW
  var nodeSel = sankeyG.selectAll("g.sankey-node")
  .data(nodesToRender, function (d) { return d.id; });

  nodeSel.exit().remove();

  // nodeSel.exit()
  //   .transition().duration(animate ? 400 : 0)
  //   .style("opacity", 0)
  //   .remove();

  var nodeEnter = nodeSel.enter().append("g")
    .attr("class", "sankey-node")
    .attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; });

  nodeEnter.append("rect")
    .attr("height", function (d) { return Math.max(1, d.dy); })
    .attr("width", sankeyLayout.nodeWidth())
    .style("fill", function (d) { return sankeyColor(d.id); })
    .style("stroke", "#000");

    nodeEnter.append("text")
    .attr("x", function(){ return sankeyLayout.nodeWidth() + 6; })
    .attr("y", function(d){ return Math.max(1, d.dy) / 2; })
    .attr("dy", ".35em")
    .attr("text-anchor", "start")
    .text(function (d) { return truncateLabel(d.name, SANKEY_LABEL_MAX); })
    .style("display", function(d){ return sankeyLabelCols[d.rankNo] ? null : "none"; });
  

  // v3: reselect unified selection
  nodeSel = sankeyG.selectAll("g.sankey-node");

  nodeSel.transition().duration(animate ? 700 : 0)
    .attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; });

  nodeSel.select("rect").transition().duration(animate ? 700 : 0)
    .attr("height", function (d) { return Math.max(SANKEY_MIN_NODE_DY, d.dy); })
    .attr("width", sankeyLayout.nodeWidth())
    .style("fill", function (d) { return sankeyColor(d.id); });

    nodeSel.select("text").transition().duration(animate ? 700 : 0)
    .attr("x", function(){ return sankeyLayout.nodeWidth() + 6; })
    .attr("y", function(d){ return Math.max(SANKEY_MIN_NODE_DY, d.dy) / 2; })
    .attr("text-anchor", "start")
    .text(function (d) { return truncateLabel(d.name, SANKEY_LABEL_MAX); })
    .style("display", function(d){ return sankeyLabelCols[d.rankNo] ? null : "none"; });
  
  

  sankeyG.selectAll("g.sankey-node").filter(function(d){ return !d; }).remove();
  sankeyG.selectAll("path.sankey-link").filter(function(d){ return !d; }).remove();

  sankeyG.selectAll(".sankey-node").each(function () {
    this.parentNode.appendChild(this);   // raise nodes above links
  });

  // node tooltips
  nodeSel
    .on("mousemove", function (d) {
      toolTipDiv.transition().duration(0).style("opacity", .95);
      toolTipDiv.html(
        "<h5 class='mb-0'>" + d.name + "</h5>" +
        "<small class='text-gray-800'>" + (d.ncbiRank || d.rank) + "</small>" +
        "<hr class='toolTipLine'/>" +
        plotLevelSelectorDashboardObject[plotLevelSelectedDashboardId].prefix + "s at this node: " +
          toolTipValueFormat(plotLevelSelectedDashboardId, d.count) +
        "<br/>Summed " +
          plotLevelSelectorDashboardObject[plotLevelSelectedDashboardId].prefix.toLowerCase() + " count: " +
          toolTipValueFormat(plotLevelSelectedDashboardId, d.summedValue)
      )
      .style("left", tooltipPos(d3.event.pageX) + "px")
      .style("top",  tooltipPosY(d3.event.pageY) + "px");
    })
    .on("mouseout", function () {
      toolTipDiv.transition().duration(50).style("opacity", 0);
    });

  // optional: drag nodes to reposition (keeps layout interactive)
  // try {
  //   nodeSel.call(d3.behavior.drag()
  //     .origin(function (d) { return d; })
  //     .on("dragstart", function () { this.parentNode.appendChild(this); })
  //     .on("drag", function (d) {
  //       d.y = Math.max(0, Math.min(innerH - d.dy, d3.event.y));
  //       d.x = Math.max(0, Math.min(innerW - d.dx, d3.event.x));
  //       d3.select(this).attr("transform", "translate(" + d.x + "," + d.y + ")");
  //       sankeyLayout.relayout();
  //       sankeyG.selectAll("path.sankey-link")
  //         .attr("d", sankeyPath)
  //         .style("stroke-width", function (l) { return Math.max(1, l.dy); });
  //     })
  //   );
  // } catch(e) {
  //   // if drag isn't available, silently ignore
  // }

  // remember positions for the next update
  sankeyPrevPosById = {};
  for (var n = 0; n < nodes.length; n++) {
    sankeyPrevPosById[nodes[n].id] = { x: nodes[n].x, y: nodes[n].y };
  }



}

// -----------------------
// Utilities
// -----------------------



// Deep-clone the active treemap hierarchy (from treeMapDataRaw[treeName])
function getSankeySourceData(treeName) {
  // This ensures D3 mutations in the Sankey do NOT affect the treemap
  return JSON.parse(JSON.stringify(treeMapDataRaw[treeName]));
  
}

function buildSankeyFromHierarchy(root, opts) {
  var options = $.extend({
    rankNos: [1,2,3,4,5,6,7,8],
    rankLabels: {
      0:"no rank", 1:"domain", 2:"kingdom", 3:"phylum", 4:"class",
      5:"order", 6:"family", 7:"genus", 8:"species", 9:"subspecies"
    },
    topNLeaves: (typeof sankeyTopN !== "undefined") ? sankeyTopN : 25,
    showUnclassified: (typeof sankeyShowUnclassified === "string") ? (sankeyShowUnclassified === "show") : true,
    showRoot: (typeof dashboardSankeyRoot === "string") ? (dashboardSankeyRoot === "show") : false,
    valueAccessor: function(d) { return +d.summedValue || 0; }
  }, opts || {});

  if (options.showRoot) {
    if (options.rankNos[0] !== 0) {
      options.rankNos = [0].concat(options.rankNos);
    }
    options.rankLabels[0] = "root";
  }

  function isHidden(id) {
    if (!options.showRoot && id === 1) return true;           // root
    if (!options.showUnclassified && id === 0) return true;   // unclassified
    return false;
  }

  function pruneDeeperNos(map, rankNo) {
    for (var i=0; i<options.rankNos.length; i++) {
      var rn = options.rankNos[i];
      if (rn > rankNo) delete map[rn];
    }
  }

 // Index value & summedValue by NCBI id so Sankey nodes can reuse treemap stats
var __statsById = {};
(function indexStats(n){
  var id = +n.ncbiID;
  if (id !== undefined && id !== null) {
    __statsById[id] = {
      name: n.name || "",
      count: +n.value || 0,
      summedValue: +n.summedValue || (+n.value || 0),
      ncbiRank: n.ncbiRank || null
    };
  }
  if (n.children) n.children.forEach(indexStats);
})(root);


  // 1) collect leaves with MARTi rank-number lineage (first occurrence per rank)
  var leaves = [];
  (function walk(node, nameByNo, idByNo){
    var lineageName = $.extend({}, nameByNo);
    var lineageId   = $.extend({}, idByNo);

    var rn = +node.rank;               // MARTi rank number 0..9
    var nm = node.name;
    var id = node.ncbiID;

    if (!isNaN(rn) && options.rankNos.indexOf(rn) !== -1 && nm) {
      if (lineageName[rn] == null) {
        lineageName[rn] = nm;
        lineageId[rn]   = id;
        pruneDeeperNos(lineageName, rn);
        pruneDeeperNos(lineageId,   rn);
      }
    }

    if (node.children && node.children.length){
      node.children.forEach(function(c){ walk(c, lineageName, lineageId); });
    } else {
      var v = options.valueAccessor(node);
      leaves.push({ lineageName: lineageName, lineageId: lineageId, value: v });
    }
  })(root, {}, {});



// 2) Top-N endpoints by aggregated value, excluding Unclassified,
//    and only counting leaves that contribute in the current view.

// last visible rank (endpoint column)
var lastVisible = (options.rankNos && options.rankNos.length)
  ? options.rankNos[options.rankNos.length - 1]
  : 8;

function filledVisibleRanks(leaf) {
  return (options.rankNos || []).filter(function (rn) {
    return rn > 0 && leaf.lineageId[rn] != null && leaf.lineageName[rn] != null;
  });
}
function contributesInCurrentView(leaf) {
  var k = filledVisibleRanks(leaf).length;
  if (lastVisible === 1 && !options.showRoot) return (k >= 1);  // Domain-only, root hidden
  return options.showRoot ? (k >= 1) : (k >= 2);
}


// pool: non-Unclassified leaves that would actually draw something now
var rankedPool = leaves.filter(function (L) {
  return (+L.lineageId[1] !== 0) && contributesInCurrentView(L);
});



// aggregate value per endpoint (node id at last visible rank)
var totalsByEnd = Object.create(null);
rankedPool.forEach(function (leaf) {
  var eid = leaf.lineageId[lastVisible];
  if (eid == null) return;
  totalsByEnd[eid] = (totalsByEnd[eid] || 0) + leaf.value;
});

// total endpoints available for the UI label
var endpointIds = Object.keys(totalsByEnd);
var __leafCount = endpointIds.length;

// rank endpoints by aggregated value (desc)
endpointIds.sort(function(a, b){ return (totalsByEnd[b] || 0) - (totalsByEnd[a] || 0); });

// choose top N endpoints
var keepCount = Math.max(1, Math.min(endpointIds.length, options.topNLeaves || 1));
var keepSet = Object.create(null);
for (var i = 0; i < keepCount; i++) keepSet[endpointIds[i]] = true;

// keep only leaves whose endpoint is in the top-N set
var topLeaves = rankedPool.filter(function (leaf) {
  var eid = leaf.lineageId[lastVisible];
  return eid != null && keepSet[eid] === true;
});


// Step 3a) nodes + links aggregators — define FIRST
var idToIndex = {}, nodes = [];
function upsertNode(rankNo, name, id, domainId, isDummy) {
  if (id == null) return null;
  if (isHidden(id)) return null;
  if (idToIndex.hasOwnProperty(id)) {
    var idx = idToIndex[id];
    if (domainId != null && nodes[idx].domainId == null) nodes[idx].domainId = domainId;
    return idx;
  }
  var idxNew = nodes.length;
  idToIndex[id] = idxNew;

  var stats = __statsById[id] || {};
  nodes.push({
    id: id, name: name, rankNo: rankNo,
    rank: options.rankLabels[rankNo] || String(rankNo),
    domainId: (domainId == null ? null : domainId),
    count: +stats.count || 0,
    summedValue: +stats.summedValue || 0,
    ncbiRank: stats.ncbiRank || (options.rankLabels[rankNo] || String(rankNo)),
    __dummy: !!isDummy
  });
  return idxNew;
}
var linkMap = {};
function addLinkById(srcIdx, tgtIdx, value, opts) {
  var sId = nodes[srcIdx].id, tId = nodes[tgtIdx].id;
  var k = sId + "→" + tId;
  var e = linkMap[k];
  if (!e) e = linkMap[k] = { source: sId, target: tId, value: 0 };
  e.value += +value || 0;
  if (opts && opts.hidden) e.__hidden = true;
}

// Step 3b) ✅ Domain-only block (now safe to call upsertNode/addLinkById)
if (!options.showRoot && lastVisible === 1) {
  var totalsByDom = Object.create(null);
  topLeaves.forEach(function (leaf) {
    var did = leaf.lineageId[1];
    if (did == null || did === 0) return;
    var dname = leaf.lineageName[1];
    if (!totalsByDom[did]) totalsByDom[did] = { name: dname, total: 0 };
    totalsByDom[did].total += leaf.value;
  });
  Object.keys(totalsByDom).forEach(function (didStr) {
    var did  = +didStr;
    var info = totalsByDom[didStr];
    var dIdx = upsertNode(1, info.name, did, did);
    var sink = upsertNode(2, "", "__dom_sink@" + did, did, true);
    addLinkById(dIdx, sink, info.total, { hidden: true });
  });
}

// Step 4) build flows between consecutive visible ranks using topLeaves …


  // 4) build flows between consecutive *filled* ranks; tag domain for nodes
// 4) build flows between consecutive *filled* ranks; tag domain for nodes
// 4) build flows between consecutive *filled* ranks; tag domain for nodes
topLeaves.forEach(function (leaf) {
  var v = leaf.value; 
  if (!v) return;

  // domain for this branch (MARTi rank 1)
  var domainId = leaf.lineageId[1] || null;

// collect the filled ranks (skip root=0; root is handled separately in step 5)
var filled = options.rankNos.filter(function (rn) {
  return rn > 0 && leaf.lineageName[rn] != null && leaf.lineageId[rn] != null;
});

  // link each adjacent pair (skip gaps if any)
  for (var i = 0; i < filled.length - 1; i++) {
    var rA = filled[i],   rB = filled[i + 1];
    var nameA = leaf.lineageName[rA], nameB = leaf.lineageName[rB];
    var idA   = leaf.lineageId[rA],   idB   = leaf.lineageId[rB];

    var srcIdx = upsertNode(rA, nameA, idA, domainId);
    var tgtIdx = upsertNode(rB, nameB, idB, domainId);
    addLinkById(srcIdx, tgtIdx, v);
  }
});



  // 5) optional root (0) → first filled rank
  if (options.showRoot && root && root.ncbiID === 1) {
    // Sum by first-rank node ID to avoid creating duplicates
    var totalsById = {}; // id -> { name, rankNo, value }
    topLeaves.forEach(function (leaf) {
      // find first filled MARTi rank number in this branch
      var firstFilled = null;
      for (var i = 0; i < options.rankNos.length; i++) {
        var rn = options.rankNos[i];
        if (rn > 0 && leaf.lineageId[rn] != null && leaf.lineageName[rn] != null) { firstFilled = rn; break; }
      }
      if (firstFilled != null) {
        var fid = leaf.lineageId[firstFilled];
        var fname = leaf.lineageName[firstFilled];
        if (fid == null) return;
        if (!totalsById[fid]) totalsById[fid] = { name: fname, rankNo: firstFilled, value: 0 };
        totalsById[fid].value += leaf.value;
      }
    });
  
  // Upsert root with its real ID (1) and NO domainId
  var rootIdx = upsertNode(0, "root", 1, null);
  
    // Link root to the already-existing first-rank nodes (same real IDs)
    Object.keys(totalsById).forEach(function (fidStr) {
      var fid = isNaN(fidStr) ? fidStr : +fidStr; // safety: ids might be numbers or strings
      var info = totalsById[fidStr];
      var tgtIdx = upsertNode(info.rankNo, info.name, fid, (info.rankNo === 1 ? fid : null));
      addLinkById(rootIdx, tgtIdx, info.value);
    });
  }
  
// --- Ensure "Unclassified" (id=0) appears in Domain and is linked or carried ---
if (options.showUnclassified) {
  var uStats = __statsById[0] || null;
  var uName  = (uStats && uStats.name) ? uStats.name : "Unclassified";
  var uTotal = (uStats && (+uStats.summedValue || +uStats.count || 0)) || 0;

  // Upsert the Domain-level Unclassified node (rankNo=1, domainId=0)
  var unIdx = upsertNode(1, uName, 0, 0);

  if (options.showRoot) {
    // top up root → 0 to the true total (you already had this part)
    var rIdx = upsertNode(0, "root", 1, null);
    var existingRootToU = (linkMap["1→0"] ? linkMap["1→0"].value : 0);
    var extraR = Math.max(0, uTotal - existingRootToU);
    if (extraR > 0) addLinkById(rIdx, unIdx, extraR);
  } else {
  // root is hidden → carry Unclassified forward invisibly so the box keeps its thickness
  var existingOut = 0;
  Object.keys(linkMap).forEach(function(k){
    if (k.split("→")[0] === "0") existingOut += linkMap[k].value;
  });
  var extraU = Math.max(0, uTotal - existingOut);
  if (extraU > 0) {
    // hidden sink one rank to the right (rank 2). Mark as dummy & domainId=0.
    var uSinkIdx = upsertNode(2, "", "__u_sink@2", 0, true);
    addLinkById(unIdx, uSinkIdx, extraU, { hidden: true });
  }
  }
}



var links = Object.keys(linkMap).map(function(k){
  var e = linkMap[k];
  return {
    source: e.source,
    target: e.target,
    value:  e.value,
    __hidden: !!e.__hidden,
    __key: k
  };
});

  // Filter: strictly increasing rankNo and no cross-domain edges
  // (function(){
  //   var byId = {}; nodes.forEach(function(n){ byId[n.id] = n; });
  //   links = links.filter(function(L){
  //     var s = byId[L.source], t = byId[L.target];
  //     if (!s || !t) return false;
  //     if (!(t.rankNo > s.rankNo)) return false;
  //     if (s.domainId != null && t.domainId != null && s.domainId !== t.domainId) return false;
  //     return true;
  //   });
  // })();

  

  

  // Filter: strictly increasing rankNo; keep root (rank 0) edges; block cross-domain elsewhere
(function(){
  var byId = {}; nodes.forEach(function(n){ byId[n.id] = n; });
  links = links.filter(function(L){
    var s = byId[L.source], t = byId[L.target];
    if (!s || !t) return false;

    // must flow left->right
    if (t.rankNo <= s.rankNo) return false;

    // allow all edges out of the root column
    if (s.rankNo === 0) return true;

    // block cross-domain elsewhere
    if (s.domainId != null && t.domainId != null && s.domainId !== t.domainId) return false;

    return true;
  });
})();


// ---- Densify only across *visible* ranks (positions in options.rankNos) ----
(function(){
  var byId = {}; nodes.forEach(function(n){ byId[n.id] = n; });

  // map rankNo -> position in the visible rank list
  var posOf = {};
  for (var i = 0; i < options.rankNos.length; i++) posOf[options.rankNos[i]] = i;

  var seq = 0, newLinks = [];

  links.forEach(function(L){
    var s = byId[L.source], t = byId[L.target];
    if (!s || !t) return;

    var ps = posOf[s.rankNo], pt = posOf[t.rankNo];
    if (ps == null || pt == null) { newLinks.push(L); return; }

    var gap = pt - ps;                     // gap in *visible* positions
    if (gap <= 1) { newLinks.push(L); return; }

    var prevId = s.id;
    for (var p = ps + 1; p < pt; p++) {
      var rn = options.rankNos[p];         // intermediate visible rank
      var dummyId = "__d" + (++seq) + ":" + prevId + "→" + t.id + "@" + rn;
      upsertNode(rn, "", dummyId, s.domainId, true);
      newLinks.push({ source: prevId, target: dummyId, value: L.value, __hidden: !!L.__hidden });
      prevId = dummyId;
    }
    newLinks.push({ source: prevId, target: t.id, value: L.value, __hidden: !!L.__hidden });
  });

  links = newLinks;
})();


  return { nodes: nodes, links: links, leafCount: __leafCount };

}

// Reorder each node's links to reduce crossings (barycentric heuristic)
// and add a small vertical gap between adjacent links so they don't visually merge.
function reorderLinksAndAddGaps(nodes, gapPx) {
  var gap = +gapPx || 0;

  nodes.forEach(function(n){
    var g = n.__dummy ? 0 : gap;

    // OUTGOING
    var outs = (n.sourceLinks || []).filter(function(l){ return !l.__hidden; }); 
    outs.sort(function(a, b){
      var ay = a.target.y + a.target.dy * 0.5;
      var by = b.target.y + b.target.dy * 0.5;
      return ay - by;
    });
    var sy = 0;
    outs.forEach(function(l){
      l.sy = sy;
      sy += l.dy + g;
    });

    // INCOMING
    var ins = (n.targetLinks || []).filter(function(l){ return !l.__hidden; }); 
    ins.sort(function(a, b){
      var ay = a.source.y + a.source.dy * 0.5;
      var by = b.source.y + b.source.dy * 0.5;
      return ay - by;
    });
    var ty = 0;
    ins.forEach(function(l){
      l.ty = ty;
      ty += l.dy + g;
    });

    // keep dummy pass-throughs continuous
    if (n.__dummy &&
        (n.sourceLinks||[]).length === 1 &&
        (n.targetLinks||[]).length === 1) {
      var outL = n.sourceLinks[0], inL = n.targetLinks[0];
      outL.sy = inL.ty = 0;
    }
  });
}



// Average of child order indices for a node (used on the right->left sweep)
function childBarycenter(node, childrenOf, orderIndex) {
  var kids = childrenOf[node.id] || [];
  if (!kids.length) return orderIndex[node.id]; // leaf: fallback to own order
  var sum = 0;
  for (var i = 0; i < kids.length; i++) sum += (orderIndex[kids[i]] || 0);
  return sum / kids.length;
}

// Keep each column's nodes in contiguous parent blocks, ordered by the
// parents' vertical order in the previous column. Tree-safe: one parent per node.
function enforceParentBlockOrder(nodes, maps, pad, innerH) {
  // columns keyed by rankNo (you already have columnsByRank)
  var cols = columnsByRank(nodes);
  var colKeys = Object.keys(cols).map(function(k){ return +k; }).sort(function(a,b){ return a - b; });

  // helper: barycenter toward the NEXT column for in-block tie-breaks
  function baryToNext(n, nextIndex) {
    if (!n.sourceLinks || !n.sourceLinks.length) return n.y;
    var sum = 0, w = 0;
    n.sourceLinks.forEach(function(L){
      var idx = nextIndex[L.target.id];
      if (idx == null) return;
      sum += idx * L.value; w += L.value;
    });
    return w ? (sum / w) : n.y;
  }

  for (var ci = 1; ci < colKeys.length; ci++) {
    var prev = cols[colKeys[ci - 1]].filter(isLayoutActive).slice().sort(function(a,b){ return a.y - b.y; });
    var curr = cols[colKeys[ci]].filter(isLayoutActive);
    var next = cols[colKeys[ci + 1]] ? cols[colKeys[ci + 1]].filter(isLayoutActive).slice().sort(function(a,b){ return a.y - b.y; }) : [];

    // parent order = index by current vertical order in the previous column
    var parentOrder = {};
    for (var i = 0; i < prev.length; i++) parentOrder[prev[i].id] = i;

    // index of nodes in the next column for barycenter tie-breaks
    var nextIndex = {};
    for (var j = 0; j < next.length; j++) nextIndex[next[j].id] = j;

    // sort current column: by parent block first, then by barycenter within the block
    curr.sort(function(a, b){
      var pa = maps.parentOf[a.id], pb = maps.parentOf[b.id];
      var ba = parentOrder[pa],       bb = parentOrder[pb];
      if (ba !== bb) return ba - bb;                             // **no interleaving of blocks**
      var ca = baryToNext(a, nextIndex), cb = baryToNext(b, nextIndex);
      if (ca !== cb) return ca - cb;                             // keep crossings low *inside* the block
      return d3.ascending(a.name, b.name);
    });

// repack this column, centered vertically
var total = 0;
for (var k = 0; k < curr.length; k++) total += Math.max(1, curr[k].dy);
total += pad * Math.max(0, curr.length - 1);

var yStart = Math.max(0, (innerH - total) / 2);
var y = yStart;

for (var k = 0; k < curr.length; k++) {
  var n = curr[k];
  n.y = y;
  y += Math.max(1, n.dy) + pad;
}

// tiny safety clamp if it barely overflows the canvas
var overflow = y - pad - innerH;
if (overflow > 0 && curr.length) {
  var shift = Math.min(overflow, yStart);
  for (var m = 0; m < curr.length; m++) curr[m].y -= shift;
}

  }
}



function nodeHasVisibleLinks(n) {
  var a = n.targetLinks || [], b = n.sourceLinks || [];
  for (var i = 0; i < a.length; i++) if (!a[i].__hidden) return true;
  for (var j = 0; j < b.length; j++) if (!b[j].__hidden) return true;
  return false;
}
// layout-active = real node, or a dummy that actually carries a visible band
function isLayoutActive(n) {
  return !n.__dummy || nodeHasVisibleLinks(n);
}

// Pack a single column top->bottom according to a given comparator
function packOneColumn(colNodes, compareFn, pad, innerH) {
  colNodes.sort(compareFn);

  // total height this column needs (rects + gaps)
  var total = 0;
  for (var i = 0; i < colNodes.length; i++) {
    total += Math.max(1, colNodes[i].dy);
  }
  total += pad * Math.max(0, colNodes.length - 1);

  // center the block; if it doesn't fit, start at 0
  var yStart = Math.max(0, (innerH - total) / 2);
  var y = yStart;

  for (var j = 0; j < colNodes.length; j++) {
    var n = colNodes[j];
    n.y = y;
    y += Math.max(1, n.dy) + pad;
  }

  // tiny safety clamp if we barely overflow
  var overflow = y - pad - innerH;
  if (overflow > 0 && colNodes.length) {
    var shift = Math.min(overflow, yStart);
    for (var k = 0; k < colNodes.length; k++) colNodes[k].y -= shift;
  }
}


// Measure SVG text width using the same font as our node labels
function measureLabelWidth(txt) {
  if (!sankeySvg) return 0;
  var g = sankeySvg.select("g.__sankeyMeasure");
  if (g.empty()) g = sankeySvg.append("g")
    .attr("class", "__sankeyMeasure")
    .attr("transform", "translate(0,-9999)"); // off-canvas

  var t = g.append("text")
    .attr("class", "sankey-label");     // inherit whatever font you use on labels
  t.text(txt || "");
  var w = Math.ceil(t.node().getComputedTextLength());
  t.remove();
  return isFinite(w) ? w : 0;
}


// Split nodes by column (rankNo) once
function columnsByRank(nodes) {
  var byCol = {};
  for (var i = 0; i < nodes.length; i++) {
    var n = nodes[i];
    var k = (typeof n.rankNo === "number") ? n.rankNo : -1;
    (byCol[k] || (byCol[k] = [])).push(n);
  }
  return byCol;
}



// Build parent/children maps from links (works whether source/target are indices or node objects)
function buildParentChildrenMaps(nodes, links) {
  var parentOf = {};      // childId -> parentId (by node.id)
  var childrenOf = {};    // parentId -> [childId,...]

  links.forEach(function (l) {
    var sId = (typeof l.source === "number") ? (nodes[l.source] && nodes[l.source].id) : (l.source && l.source.id);
    var tId = (typeof l.target === "number") ? (nodes[l.target] && nodes[l.target].id) : (l.target && l.target.id);
    if (sId == null || tId == null) return; // skip malformed links safely

    parentOf[tId] = sId;
    (childrenOf[sId] || (childrenOf[sId] = [])).push(tId);
  });

  return { parentOf: parentOf, childrenOf: childrenOf };
}


// Depth-first traversal to assign a stable order index to every node.id
function computeTreeOrder(nodes, childrenOf, roots, childSortFn) {
  var order = {}, idx = 0;
  function visit(id){
    if (order[id] != null) return;
    order[id] = idx++;
    var kids = (childrenOf[id] || []).slice();
    if (childSortFn) kids.sort(childSortFn);
    kids.forEach(visit);
  }
  roots.forEach(visit);
  return order;
}

// Pack each column (rankNo) top->bottom using the parent's order index
function packColumnsTreeLike(nodes, parentOf, orderIndex, pad, innerH) {
  // group nodes by column
  var byCol = {};
  nodes.forEach(function(n){
    var k = typeof n.rankNo === "number" ? n.rankNo : -1;
    (byCol[k] || (byCol[k] = [])).push(n);
  });

  Object.keys(byCol).forEach(function(colKey){
    var col = byCol[colKey];

    // sort column by parent's order (root column uses its own order)
    col.sort(function(a,b){
      var pa = parentOf[a.id], pb = parentOf[b.id];
      var oa = (pa != null ? orderIndex[pa] : orderIndex[a.id]);
      var ob = (pb != null ? orderIndex[pb] : orderIndex[b.id]);
      if (oa !== ob) return oa - ob;
      // tie-breaker: keep deterministic order
      return d3.ascending(a.name, b.name);
    });

    // repack y positions (use node.dy from the first layout)
    var y = 0;
    col.forEach(function(n){
      n.y = y;
      y += Math.max(1, n.dy) + pad;
    });
    // clamp inside canvas if it overflowed
    var overflow = y - pad - innerH;
    if (overflow > 0 && col.length) {
      var shift = Math.min(overflow, col[0].y);
      col.forEach(function(n){ n.y -= shift; });
    }
  });
}


// Estimate inner plot height based on how many nodes are in the busiest column/rank
function computeAutoInnerHeight(nodes, opts) {
  var o = $.extend({ minNodeHeight:10, extraTopBottom:20, minInnerHeight:240, maxInnerHeight:1200, padOverride:null }, opts || {});
  var counts = {};
  (nodes || []).forEach(function(n){
    var r = (typeof n.rankNo === "number") ? n.rankNo : -1;
    counts[r] = (counts[r] || 0) + 1;
  });
  var maxInCol = 0;
  Object.keys(counts).forEach(function(k){ if (counts[k] > maxInCol) maxInCol = counts[k]; });
  if (maxInCol === 0) maxInCol = Math.max(1, (nodes || []).length);

  var pad = (o.padOverride != null) ? o.padOverride
            : (typeof sankeyLayout !== 'undefined' && sankeyLayout.nodePadding) ? sankeyLayout.nodePadding()
            : 8;

  var h = (maxInCol * o.minNodeHeight) + ((maxInCol - 1) * pad) + o.extraTopBottom;
  return Math.max(o.minInnerHeight, Math.min(o.maxInnerHeight, h));
}



// A small orchestrator you’ll call from dashboard.js
function updateSankeyFromActiveTree() {
  var treeName = (typeof plotLevelSelectedDashboardTreeName !== "undefined")
    ? plotLevelSelectedDashboardTreeName : "tree"; // "tree"=reads, "treeYield"=bp

    if (treeName !== sankeyLastTreeName) {
      sankeyPrevPosById = {};          // don't seed x/y from the old dataset
      sankeyLastTreeName = treeName;
      sankeyResetTopNOnNextBuild = true;  // snap slider to default if needed
    }

  var sankeyHierarchy = getSankeySourceData(treeName);

  // Rank cap from the main dropdown
  var maxRankNo = (typeof taxonomicRankSelected === "number" &&
                   taxonomicRankSelected >= 1 && taxonomicRankSelected <= 8)
                  ? taxonomicRankSelected : 8;

  // Intersection: ONLY ranks that are <= cap AND currently visible
  var rankNos = [];
  for (var rn = 1; rn <= maxRankNo; rn++) {
    if (!sankeyVisibleCols || sankeyVisibleCols[rn] !== false) rankNos.push(rn);
  }
  if (!rankNos.length) rankNos = [1]; // safety: never show an empty layout

  var keyNow = rankNos.join("|") + "|" + (dashboardSankeyRoot === "show" ? "R1" : "R0");
  if (keyNow !== sankeyLastRankKey) {
    sankeyPrevPosById = {};
    sankeyLastRankKey = keyNow;
  }

  if (sankeyResetTopNOnNextBuild) {
    sankeyTopN = sankeyTopNDefault;
  }

  var sankeyFlat = buildSankeyFromHierarchy(sankeyHierarchy, {
    rankNos: rankNos,                                  // ← key change
    topNLeaves: (typeof sankeyTopN !== "undefined") ? sankeyTopN : 25,
    showUnclassified: (sankeyShowUnclassified === "show"),
    showRoot: (dashboardSankeyRoot === "show")
  });

  // keep the UI counters and slider max in sync with data (non-Unclassified eligible leaves)
  updateDashboardSankeyTopNMax(sankeyFlat && sankeyFlat.leafCount, sankeyResetTopNOnNextBuild);
  sankeyResetTopNOnNextBuild = false;

  sankeySetData(sankeyFlat);
}





function cloneSankeyData(d) {
  return {
    nodes: (d.nodes || []).map(function (n) {
      return {
        id: n.id, name: n.name, rank: n.rank, rankNo: n.rankNo,
        count: n.count, summedValue: n.summedValue, ncbiRank: n.ncbiRank,
        __dummy: !!n.__dummy
      };
    }),
    links: (d.links || []).map(function (l) {
      return { source: l.source, target: l.target, value: +l.value, __hidden: !!l.__hidden };
    })    
  };
}


function ensureTooltipDiv() {
  if (typeof toolTipDiv !== "undefined" && toolTipDiv) return;
  // lightweight fallback tooltip if your global doesn't exist
  var div = d3.select("body").selectAll("div.__sankeyTooltip").data([0]);
  div = div.enter().append("div")
    .attr("class", "__sankeyTooltip")
    .style("position", "absolute")
    .style("pointer-events", "none")
    .style("z-index", 9999)
    .style("background", "rgba(255,255,255,0.96)")
    .style("border", "1px solid #ddd")
    .style("padding", "6px 8px")
    .style("border-radius", "4px")
    .style("font-size", "12px")
    .style("box-shadow", "0 2px 6px rgba(0,0,0,0.1)")
    .style("opacity", 0);
  // expose as global to match other charts' pattern
  window.toolTipDiv = div;
}

// Max label length (incl. spaces)
var SANKEY_LABEL_MAX = 30;

// Truncate with an ellipsis (…)
function truncateLabel(txt, max) {
  if (!txt) return "";
  if (!max || txt.length <= max) return txt;
  var s = txt.slice(0, max);
  // optional: avoid cutting mid-word if there's a recent space
  var cut = s.lastIndexOf(" ");
  if (cut > max * 0.6) s = s.slice(0, cut); // only back off if there's a decent earlier break
  return s.replace(/[ \t.,;:!-]+$/,"") + "…";
}

