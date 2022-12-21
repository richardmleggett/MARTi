
function initialiseCompareTree() {

  compareTreeSvg = d3.select("#compareTreePlot").append("svg")
  	.attr("id", "compareTreeSvg")
  	.attr("height", "440")
    .attr("width", "100%")
    .append("g")
  	.attr("transform", "translate(" + compareTreeMargin.left + "," + compareTreeMargin.top + ")");


  d3.selectAll("input[name='compareTreeHorizontalSeparation']").on("input", function() {
    ctHorizontalSeparation = parseInt(this.value);
    d3.select("#compareTreeHorizontalSeparationNum").text(ctHorizontalSeparation);
  });

  d3.selectAll("input[name='compareTreeHorizontalSeparation']").on("change", function() {
    plotCompareTree(newCompareTree);
  });

  d3.selectAll("input[name='compareTreeVerticalSeparation']").on("input", function() {
    ctVerticalSeparation = parseInt(this.value);
    d3.select("#compareTreeVerticalSeparationNum").text(ctVerticalSeparation);
  });

  d3.selectAll("input[name='compareTreeVerticalSeparation']").on("change", function() {
    plotCompareTree(newCompareTree);
  });


  d3.selectAll("input[name='compareTreeNodeHeight']").on("input", function() {
    ctRectHeight = parseInt(this.value);
    d3.select("#compareTreeNodeHeightNum").text(ctRectHeight);
  });

  d3.selectAll("input[name='compareTreeNodeHeight']").on("change", function() {
    plotCompareTree(newCompareTree);
  });


  d3.selectAll("input[name='compareTreeNodeWidth']").on("input", function() {
    ctRectWidth = parseInt(this.value);
    d3.select("#compareTreeNodeWidthNum").text(ctRectWidth);
  });

  d3.selectAll("input[name='compareTreeNodeWidth']").on("change", function() {
    plotCompareTree(newCompareTree);
  });

  d3.selectAll("input[name='compareTreeRead']").on("change", function(){
    compareTreeRead = this.value;
    plotCompareTree(newCompareTree);
  });

  compareTreeRead = "percent";

  d3.selectAll("input[name='compareTreeValueScale']").on("change", function(){
    compareTreeValueScale = this.value;
    plotCompareTree(newCompareTree);
  });

  compareTreeValueScale = "linear";


  d3.selectAll("input[name='compareTreeHorizontalPath']").on("input", function() {
    ctHorizontalPath = parseInt(this.value);
    d3.select("#compareTreeHorizontalPathNum").text(ctHorizontalPath);
  });

  d3.selectAll("input[name='compareTreeHorizontalPath']").on("change", function() {
    plotCompareTree(newCompareTree);
  });


  d3.selectAll("input[name='compareTreeSiblingSeparation']").on("input", function() {
    ctSiblingSeparation = parseFloat(this.value);
    d3.select("#compareTreeSiblingSeparationNum").text(ctSiblingSeparation);
  });

  d3.selectAll("input[name='compareTreeSiblingSeparation']").on("change", function() {
    plotCompareTree(newCompareTree);
  });

  d3.selectAll("input[name='compareTreeCousinSeparation']").on("input", function() {
    ctCousinSeparation = parseFloat(this.value);
    d3.select("#compareTreeCousinSeparationNum").text(ctCousinSeparation);
  });

  d3.selectAll("input[name='compareTreeCousinSeparation']").on("change", function() {
    plotCompareTree(newCompareTree);
  });



  d3.select("input[name='compareTreeTopN']").on("change", function(){
    compareTreeTopNChanged = true;
    plotCompareTree(newCompareTree);
    compareTreeTopNChanged = false;
  });

  d3.select("input[name='compareTreeTopN']").on("input", function(){
    compareTreeTopN = parseInt(this.value);
    d3.select("#compareTreeTopNNum").text(compareTreeTopN);
  });

    d3.select("#compareTreeTopNNum").text(compareTreeTopN);



ctVerticalSeparation = 60;
ctHorizontalSeparation = 80;
ctRectHeight = 34;
ctRectWidth = 46;
ctHorizontalPath = 60;
ctSiblingSeparation = 1;
ctCousinSeparation = 2;

d3.select("#compareTreeVerticalSeparationNum").text(ctVerticalSeparation);
d3.select("#compareTreeHorizontalSeparationNum").text(ctHorizontalSeparation);
d3.select("#compareTreeNodeHeightNum").text(ctRectHeight);
d3.select("#compareTreeNodeWidthNum").text(ctRectWidth);
d3.select("#compareTreeHorizontalPathNum").text(ctHorizontalPath);

d3.select("#compareTreeSiblingSeparationNum").text(ctSiblingSeparation);
d3.select("#compareTreeCousinSeparationNum").text(ctCousinSeparation);



};


var compareTreeTopN;
// var ctHeight;
// var ctWidth;
var ctVerticalSeparation;
var ctHorizontalSeparation;
var ctHorizontalPath,
ctSiblingSeparation,
ctCousinSeparation,
compareTreeValueScale;

var compareTreeMargin = {top: 20, right: 120, bottom: 20, left: 120}


var durationCompareTree = 750;


// var diagonal = d3.svg.diagonal()
// 	.projection(function(d) { return [d.y, d.x]; });


  var maxCircleSize = 9;
  var minCircleSize = 3;

  var readCountMax;
  var readCountSum;

var oldCompareTreeNodes = {};

var ctArc = d3.svg.arc()
  .outerRadius(16)
  .innerRadius(0);

var ctPie = d3.layout.pie()
  .value(function(d) {
    return d.readCount;
  })
  .sort(null);

// var ctColor = d3.scale.ordinal()
//   .range(['#40bc96', '#fabd57', '#f5696d']);

// var ctColor = d3.scale.ordinal()
//     .range(colourPalettes[selectedPalette]);

function drawPie(d) {


  d3.select(this)
    .selectAll('path')
    .data(ctPie(d.values))
    .enter()
    .append('path')
    .attr('d', ctArc)
    .attr('fill', function(d, i) {
      return ctColor(d.data.sampleId + "_" + d.data.runId);
    });
}

var ctRectHeight = 34;
var ctRectWidth = 46;

var ctX = d3.scale.ordinal()
  .rangeBands([0, ctRectWidth]);

var ctY = d3.scale.linear()
  .range([ctRectHeight, 0]);

function drawBars(d) {
  // var maxCount = 0;
  // var valToPlot;
  // if (d.hasOwnProperty("children")) {
  //   valToPlot = "readCount";
  // } else {
  //   valToPlot = "summedCount";
  // }
  // for (var sample of d.values) {
  //   var value = sample[valToPlot];
  //   if (value > maxCount) {
  //     maxCount = value;
  //   }
  // }
  //
  // ctY.domain([0, maxCount]);



  d3.select(this)
    .selectAll('.ctBarStroke')
    .data(d.values)
    .enter()
    .append('rect')
    .attr("class", "ctBarStroke")
    .attr('fill', 'white')
    .attr('stroke', '#b5b5b5');

  d3.select(this)
    .selectAll('.ctbar')
    .data(d.values)
    .enter()
    .append('rect')
    .attr("class", "ctbar")
    // .attr("x", function(d) {return ctX(d.sampleId + "_" + d.runId); })
    // .attr("width", ctX.rangeBand())
    // .attr("y", function(d) { return ctY(d[valToPlot])-ctRectHeight/2; })
    // .attr("height", function(d) { return ctRectHeight - ctY(d[valToPlot]); })
    // .attr('fill', function(d, i) {
    //   return ctColor(d.sampleId + "_" + d.runId);
    // });
}

if(compareHmTaxaRead == "percent") {
      plotValue = prop;
    }

function valueScale(val) {

var value;

  switch (compareTreeValueScale) {
case "sqrt":
  value = Math.sqrt(val);
  break;
case "log10":
  value = Math.log10(val+1);
  break;
case "ln":
   value = Math.log(val+1);
  break;
case "linear":
  value = val;
}


  return value;
};

function updateBars(d) {


  var maxCount = 0;
  var valToPlot;
  if (d.hasOwnProperty("children")) {
    if (compareTreeRead == "percent") {
      valToPlot = "proportion";
    } else {
      valToPlot = "readCount";
    }

  } else {
    if (compareTreeRead == "percent") {
      valToPlot = "summedProportion";
    } else {
      valToPlot = "summedCount";
    }
  }
  for (var sample of d.values) {
    var value = sample[valToPlot];
    if (value > maxCount) {
      maxCount = value;
    }
  }
  var thisData = d.values;

  ctY.domain([0, valueScale(maxCount)]);

  d3.select(this).transition()
    .duration(durationCompareTree)
    .selectAll('.ctBarStroke')
    .attr("x", function(d) {return Math.round(ctX(d.sampleId + "_" + d.runId)); })
    .attr("width", Math.round(ctX.rangeBand()))
    .attr("y", function(d) { return -ctRectHeight/2; })
    .attr("height", function(d) { return ctRectHeight; });

  d3.select(this).transition()
    .duration(durationCompareTree)
    .selectAll('.ctbar')
    .attr("x", function(d) {return Math.round(ctX(d.sampleId + "_" + d.runId)); })
    .attr("width", Math.round(ctX.rangeBand()))
    // .attr("y", function(d) { return ctY(valueScale(d[valToPlot]))-ctRectHeight/2; })
    .attr("y", function(d,i) { return ctY(valueScale(thisData[i][valToPlot]))-ctRectHeight/2; })
    .attr("height", function(d,i) {
      // return ctRectHeight - ctY(valueScale(d[valToPlot])); })
      return ctRectHeight - ctY(valueScale(thisData[i][valToPlot])); })
    .attr('fill', function(d, i) {
      return ctColor(d.sampleId + "_" + d.runId);
    });



}

function plotCompareTree(source) {



  // if(newCompareTreeData == true) {
  //   console.log("New data");
    preNodesCompare = d3.layout.tree().nodes(newCompareTree).reverse();

  // }

  // console.log("newCompareTreeData: " + newCompareTreeData.toString());
  // console.log("taxonomicRankChangedCompare: " + taxonomicRankChangedCompare.toString());


  // if (newCompareTreeData == true || taxonomicRankChangedCompare == true) {
  //   resetTreeBranches(newCompareTree);
  //   taxonomicRankFilt(newCompareTree,"compare",taxonomicRankSelectedCompare);
  // };

  // if (newCompareTreeData == true || taxonomicRankChangedCompare == true) {
  //
  //   resetTreeBranches(newCompareTree);
  //   taxonomicRankFilt(newCompareTree,"compare",taxonomicRankSelectedCompare);
  //
  //   compareTreeLeafCount = treeLeafCounts.compare;
  //   updateCompareTreeTopNMax();
  //   topNLeavesPerSample(newCompareTree,compareTreeTopN);
  // } else if (compareTreeTopNChanged == true){
  //   resetTreeBranches(newCompareTree);
  //   topNLeavesPerSample(newCompareTree,compareTreeTopN);
  // };


  if (newCompareTreeData == true || taxonomicRankChangedCompare == true) {

    resetTreeBranches(newCompareTree);
    taxonomicRankFilt(newCompareTree,"compare",taxonomicRankSelectedCompare);

    compareTreeLeafCount = treeLeafCounts.compare;
    updateCompareTreeTopNMax();
    topNLeavesPerSample(newCompareTree,compareTreeTopN);
  } else if (compareTreeTopNChanged == true){
    resetTreeBranches(newCompareTree);
    taxonomicRankFilt(newCompareTree,"compare",taxonomicRankSelectedCompare);

    // compareTreeLeafCount = treeLeafCounts.compare;
    // updateCompareTreeTopNMax();
    topNLeavesPerSample(newCompareTree,compareTreeTopN);
  };

  if (newCompareTreeData == true && Object.keys(oldCompareTreeNodes).length !== 0) {
  copyCollapseState(newCompareTree,oldCompareTreeNodes);
  duration = 0;
  };

// console.log(newCompareTree);

  ctX = d3.scale.ordinal()
    .rangeBands([0, ctRectWidth]);


  ctY = d3.scale.linear()
    .range([ctRectHeight, 0]);

    // ctY = d3.scale.linear()
    //   .range([0, ctRectHeight]);

    ctX.domain(sortCompareNameArray.map(function(d) { return d.name + "_" + d.runId; }));

  var tempNodes = d3.layout.tree().nodes(newCompareTree).reverse(),
	   tempLinks = d3.layout.tree().links(tempNodes);


  // Calculate tree size.
  var depthDict = {};

  tempNodes.forEach(function(d) {
    if (depthDict.hasOwnProperty(d.depth)) {
    depthDict[d.depth] += 1;
  } else {
    depthDict[d.depth] = 0;
  }});


var highestDepthValue = 0;


for (var [key,value] of Object.entries(depthDict)) {
  // var key = parseInt(key);
  if (value > highestDepthValue) { highestDepthValue = value;};
}

var tempHeight = highestDepthValue * 110;
  if (tempHeight < 400) {
    var tempHeight = 400;
  };




// d3.select("#compareTreePlot>svg").transition().duration(durationCompareTree).attr("height", ctHeightPlotValue + compareTreeMargin.top + compareTreeMargin.bottom);
// d3.select("#compareTreePlot>svg").transition().duration(durationCompareTree).attr("height", tempHeight + compareTreeMargin.top + compareTreeMargin.bottom);

  // var treeDivWidth = $("#compareTreePlot").width() - compareTreeMargin.right - compareTreeMargin.left - 100;


    var tree = d3.layout.tree()
        // .size([ctHeightPlotValue, treeDivWidth]);
        // .size([tempHeight, treeDivWidth]);
        .nodeSize([ctVerticalSeparation, ctHorizontalSeparation])
        .separation(function separation(a, b) {
        return a.parent == b.parent ? ctSiblingSeparation : ctCousinSeparation;
      });

        // Compute the new tree layout.
    var nodes = tree.nodes(newCompareTree).reverse();
  	var links = tree.links(nodes);







var hXnode;
var lXnode;
var lYnode;
var rYnode;

for (var [i,node] of nodes.entries()) {
  if (i==0){
    hXnode = node.x;
    lXnode = node.x;
    lYnode = node.y;
    rYnode = node.y;
  } else {
    if (node.x > hXnode) {
      hXnode = node.x;
    } else if (node.x < lXnode) {
      lXnode = node.x;
    }

    if (node.y > rYnode) {
      rYnode = node.y;
    } else if (node.y < lYnode) {
      lYnode = node.y;
    }

  }
}



var xNodeDelta = hXnode - lXnode;
var yNodeDelta = rYnode - lYnode

var ctHeight = xNodeDelta + ctRectHeight + 5;
var ctWidth = yNodeDelta + ctRectWidth + 100;
var ctGroupShim = -lXnode+(ctRectHeight/2)+5;

d3.select("#compareTreePlot>svg").transition().duration(durationCompareTree)
.attr("height", ctHeight + compareTreeMargin.top + compareTreeMargin.bottom)
.attr("width", ctWidth + compareTreeMargin.left + compareTreeMargin.right);
d3.select("#compareTreePlot>svg>g").transition().duration(durationCompareTree).attr("transform", function(d) {return "translate(" + compareTreeMargin.left + "," + ctGroupShim + ")"; });

  var node = compareTreeSvg.selectAll("g.node")
	  // .data(nodes, function(d) { return d.id || (d.id = ++i); });
	  .data(nodes, function(d) { return d.ncbiID; });
	  // .data(nodes);


  var nodeEnter = node.enter().append("g")
	  .attr("class", "node")
	  .attr("transform", function(d) {return "translate(" + source.y0 + "," + source.x0 + ")"; })
	  .on("click", function(d) { click(d); plotCompareTree(d); });

    // nodeEnter.each(drawPie);


    nodeEnter.append("rect")
      .attr("class", "ctBgRect")
      .attr("fill", "white");

    nodeEnter.each(drawBars);

    nodeEnter.append("rect")
      .attr("class", "ctBgStroke")
      .attr("fill-opacity", 0);

      // nodeEnter.append("circle")
    	//   .attr("r", 1e-6);
      //
      nodeEnter.append("text")
    	  .attr("dy", ".35em")
    	  .text(function(d) { return d.name; })
    	  .style("visibility", "hidden");

      // Transition nodes to their new position.
      var nodeUpdate = node.transition()
    	  .duration(durationCompareTree)
    	  .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

      // nodeUpdate.select("circle")
    	//   .attr("r", 8)
    	//   .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; })
      //   .style("stroke", function(d) { return d._children ? "#000" : "#858796"; });

      nodeUpdate.select("text")
        // .attr("dx", function (d) {return d.children ? (-14 - circleSize(d,dashboardTreeCircleSizeType)) : (6 + circleSize(d,dashboardTreeCircleSizeType)); })
        .attr("dx", ctRectWidth + 8)
        .attr("text-anchor", function(d) { return d.children ? "end" : "start"; })
        .style("visibility", function(d) { return d.children ?  "hidden" : "visible"; });

        nodeUpdate.select(".ctBgRect")
      	  .attr("width", ctRectWidth)
          .attr("height", ctRectHeight)
          .attr("y", -ctRectHeight/2);

      nodeUpdate.each(updateBars);

      nodeUpdate.select(".ctBgStroke")
        .attr("width", ctRectWidth)
        .attr("height", ctRectHeight)
        .attr("stroke",function(d) { return d._children ? "#000" : "#b5b5b5"; })
        .attr("y", -ctRectHeight/2);

      node.on("mousemove", function(d) {

      var ttSpecies = "<h5 class='mb-0'>" + d.name + "</h5><small class='text-gray-800'>" + d.ncbiRank + "</em></small>";
      var ttTable = `
      <table id="ttTable" class='table small mt-2 mb-1'>
      <thead>
      <tr>
      <th scope='col'></th>
      <th scope='col'>Sample</th>
      <th scope='col'>Reads at node</th>
      <th scope='col'>Summed read count</th>
      <th scope='col'>Read %</th>
      <th scope='col'>Summed count %</th>
      </tr>
      </thead>
      <tbody>
    `;




        // for (var sample of sortCompareNameArray) {
        //   var sampleValueRow;
        //   var sampleRun = sample.name + "_" + sample.runId;
        //   var indexOfSampleValue = d.values.findIndex(e => e.sampleId == sample.name && e.runId == sample.runId);
        //
        //     sampleValueRow = "<hr class='toolTipLine'/><small class='text-gray-800'>" + sampleRun + "</em></small><hr class='toolTipLine'/>" +  "Reads at this node: " + thousandsSeparators(d["values"][indexOfSampleValue]["readCount"]) + "<br/>Summed read count: " + thousandsSeparators(d["values"][indexOfSampleValue]["summedCount"]);
        //   toolTipHtml += sampleValueRow;
        // }

        for (var sample of sortCompareNameArray) {
          var sampleValueRow;
          var sampleName = sample.name;
          var sampleRun = sample.name + "_" + sample.runId;
          var indexOfSampleValue = d.values.findIndex(e => e.sampleId == sample.name && e.runId == sample.runId);
          var readCount = thousandsSeparators(d["values"][indexOfSampleValue]["readCount"]);
          var summedCount = thousandsSeparators(d["values"][indexOfSampleValue]["summedCount"]);
          var proportion = Math.round(((d["values"][indexOfSampleValue]["proportion"]*100) + Number.EPSILON) * 100)/100;
          var summedProportion = Math.round(((d["values"][indexOfSampleValue]["summedProportion"]*100) + Number.EPSILON) * 100)/100;


            sampleTableRow = `<tr>
                <th scope="row"></th>
                <td>${sampleName}</td>
                <td>${readCount}</td>
                <td>${summedCount}</td>
                <td>${proportion}</td>
                <td>${summedProportion}</td>
              </tr>`;


          ttTable += sampleTableRow;
        }

        ttTable += `
          </tbody>
          </table>`;

            var toolTipHtml = ttSpecies + ttTable;

               toolTipDiv.transition()
                  .duration(0)
                  .style("opacity", .95);

                  // toolTipDiv.html("<h5 class='mb-0'>" + d.name + "</h5><small class='text-gray-800'>" + d.ncbiRank + "</em></small><hr class='toolTipLine'/>Reads at this node: " +
                  // thousandsSeparators(d.value) + "<br/>Summed read count: " + thousandsSeparators(d.summedValue))
                  // toolTipDiv.html("<h5 class='mb-0'>" + d.name + "</h5>")
                  toolTipDiv.html(toolTipHtml)
                  .style("color", "black")
                  .style("left", (d3.event.pageX) + "px")
                  .style("top", (d3.event.pageY - 35) + "px");

                  // var ttTableRows = d3.selectAll("#ttTable>tbody>tr>th").selectAll(".testsvg").data(sortCompareNameArray);

                  var ttTableRows = d3.selectAll("#ttTable>tbody>tr>th");

                  ttTableRows.each(function (d,i){
                  var ttRectCol = ctColor(sortCompareNameArray[i].name + "_" + sortCompareNameArray[i].runId);

                  d3.select(this)
                    .append('svg')
                    .attr("height", 10)
                    .attr("width", 10)
                    .append('rect')
                    .attr("height", 10)
                    .attr("width", 10)
                    .attr("class", "ttRect")
                    .attr('fill', ttRectCol);
                  })


              })
                  .on("mouseout", function(d) {
                      toolTipDiv.transition()
                          .duration(50)
                          .style("opacity", 0);
                  });






      var nodeExit = node.exit().transition()
    	  .duration(durationCompareTree)
    	  .attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; })
    	  .remove();

      // nodeExit.select("circle")
    	//   .attr("r", 1e-6);

      nodeExit.select("text")
        .style("visibility", "hidden");

        var diagonal = function (d, i) {
          return "M" + d.source.y + "," + d.source.x
              + "h" + ctHorizontalPath
              + "V" + d.target.x + "H" + d.target.y;
        }

        var link = compareTreeSvg.selectAll("path.treeLink")
      	  // .data(links, function(d) { return d.target.id; });
      	  .data(links, function(d) { return d.target.ncbiID; });

          link.enter().insert("path", "g")
        	  .attr("class", "treeLink")
        	  .attr("d", function(d) {
        		var o = {x: source.x0, y: source.y0};
        		return diagonal({source: o, target: o});
        	  });

          link.transition()
        	  .duration(durationCompareTree)
        	  .attr("d", diagonal);

          link.exit().transition()
        	  .duration(durationCompareTree)
        	  .attr("d", function(d) {
        		var o = {x: source.x, y: source.y};
        		return diagonal({source: o, target: o});
        	  })
        	  .remove();

          nodes.forEach(function(d) {
        	d.x0 = d.x;
        	d.y0 = d.y;

          var hiddenClickChildren = false;
          if (d._children) {
            hiddenClickChildren = true;
          };

          oldCompareTreeNodes[d.ncbiID] = {
            x0:d.x,
            y0:d.y,
            hiddenClickChildren:hiddenClickChildren
          };


          });




//End of plotCompareTree
}












// var oldNodes = {};






var compareTreeLeafCount;
var compareTreeTopNChanged = false;
var compareTreeTopNDefault = 10;
var compareTreeTopN = compareTreeTopNDefault;
var compareTreeTopNMaxSelected = true;

function updateCompareTreeTopNMax() {

  d3.selectAll("input[name='compareTreeTopN']").property("max", parseInt(compareTreeLeafCount));

  if (compareTreeLeafCount < compareTreeTopNDefault) {
    compareTreeTopN = compareTreeLeafCount;
  } else {
    compareTreeTopN = compareTreeTopNDefault;
  }

  d3.selectAll("input[name='compareTreeTopN']").property("value",compareTreeTopN);
  d3.selectAll("#compareTreeTopNNum").text(compareTreeTopN);
  // d3.selectAll(".compare-taxa-tree-total-n-text").text(compareTreeLeafCount);



};






var preNodesCompare;
var preReadCountSum;

function topNLeavesPerSample(tree,topN) {

  var allNodes = d3.layout.tree().nodes(tree);

  var leaves = [];

  var leafNodes = allNodes.filter(function(d){
        if (!d.children){
            return d;
         }
       });


 for (var sampleData of selectedCompareMetaDataArray) {
     var id = sampleData.id;
     var runId = sampleData.runId;
     var sampleRun = id + "_" + runId;
     var taxaCount = topN;

     var totalSampleNodeList = compareTreeSampleNodes[sampleRun];
     var leafSampleNodeList = [];
     var topNSampleNodeList = [];

     for (const [i,taxa] of leafNodes.entries()) {

       var node = taxa;
       var findTaxa = totalSampleNodeList.findIndex(e => e.ncbiID == taxa.ncbiID);
       node.taxaIndex = findTaxa;
       leafSampleNodeList.push(node);
     };

     leafSampleNodeList.sort(function(a, b) {
         return a.taxaIndex - b.taxaIndex
     });

     var lastMissingTaxa = leafSampleNodeList.findLastIndex(e => e.taxaIndex == -1);
     topNSampleNodeList = leafSampleNodeList.slice(lastMissingTaxa+1,lastMissingTaxa+topN+1);

     for (const [i,taxa] of topNSampleNodeList.entries()) {
       var findTaxa = leafNodes.findIndex(e => e.ncbiID == taxa.ncbiID);
       if (findTaxa != -1){
         leafNodes[findTaxa]["keep"] = "true";
       }
     };



 };






var keepNodes = leafNodes.filter(function(d){
      if (d.keep == "true"){
          return d;
       }
     });


var removeLeaves = leafNodes.filter(function(d){
     if (d.keep == "false"){
         return d;
      }
    });

// console.log(removeLeaves);


keepNodes.forEach((keepNode) => {
  function recursiveParentKeep(d) {
    if (d.parent) {
        d.keep = "true";
        recursiveParentKeep(d.parent);
    }else {
      d.keep = "true";
    };
  };
  recursiveParentKeep(keepNode);
});

removeLeaves.forEach((removeLeaf) => {
  function recursiveParentRemove(d) {
    if (d.parent) {
        if (d.parent.keep == "true") {
          hideSpecificBranch(d.parent,d.ncbiID);
        } else{
          recursiveParentRemove(d.parent);
        };
    };
  };
  recursiveParentRemove(removeLeaf);
});


};
