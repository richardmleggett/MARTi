
var dashboardTreeLinkType,
dashboardTreeType,
dashboardTreeCircleSizeType,
dashboardTreeCircleColourType;

function initialiseDashboardTree() {

  treeSVG = d3.select("#dendrogram").append("svg")
  	.attr("id", "dashboardTreeSVG")
  	.attr("height", "440")
    .attr("width", "100%")
    .append("g")
  	.attr("transform", "translate(" + dashboardTreeMargin.left + "," + dashboardTreeMargin.top + ")");


var currentTreeDivWidth = $('#dendrogram').width();


new ResizeSensor($('#taxaTableAndDonutRow'), function(){

  var tempTreeDivWidth = $('#dendrogram').width();
  if (tempTreeDivWidth > 0) {
    if (Math.abs(currentTreeDivWidth - tempTreeDivWidth) >= 30) {
        currentTreeDivWidth = $('#dendrogram').width();
        treeUpdate(root);
        treeMapUpdate(treeMapData);
      }
  }

  });

  d3.selectAll("input[name='dashboardTreeLinkType']").on("change", function() {
    dashboardTreeLinkType = this.value;
    duration = 0;

    treeUpdate(root);
    duration = 750;
  });

  d3.selectAll("input[name='dashboardTreeType']").on("change", function() {
    dashboardTreeType = this.value;
    treeUpdate(root);
  });

  d3.selectAll("input[name='dashboardTreeCircleSizeType']").on("change", function() {
    dashboardTreeCircleSizeType = this.value;
    treeUpdate(root);
  });

  d3.selectAll("input[name='dashboardTreeCircleColourType']").on("change", function() {
    dashboardTreeCircleColourType = this.value;
    treeUpdate(root);
  });




  d3.selectAll("input[name='dashboardTaxaTreeTopN']").on("change", function(){
    dashboardTaxaTreeTopNChanged = true;
    treeUpdate(root);
    dashboardTaxaTreeTopNChanged = false;
  });

  d3.selectAll("input[name='dashboardTaxaTreeTopN']").on("input", function(){
    dashboardTaxaTreeTopN = parseInt(this.value);
    d3.selectAll("input[name='dashboardTaxaTreeTopN']").property("value",dashboardTaxaTreeTopN);
    d3.selectAll(".dashboard-taxa-tree-top-n-text").text(dashboardTaxaTreeTopN);
  });

    d3.selectAll(".dashboard-taxa-tree-top-n-text").text(dashboardTaxaTreeTopN);


    dashboardTreeLinkType = "curve";
    dashboardTreeType = "tree";
    dashboardTreeCircleSizeType = "linear";
    dashboardTreeCircleColourType = "linear";



};





var dashboardTreeMargin = {top: 20, right: 120, bottom: 20, left: 120};

var i = 0,
	duration = 750;


var diagonal = d3.svg.diagonal()
	.projection(function(d) { return [d.y, d.x]; });


  var maxCircleSize = 9;
  var minCircleSize = 3;

  var readCountMax;
  var readCountSum;

  function circleSize(d,type) {
    var nodeVal;

    if (d.children) {
      nodeVal = d.value;
    } else {
      nodeVal = d.summedValue;
    }


    if (nodeVal == 0)
        return minCircleSize;
    else if (type === "log10")
        return ((Math.log(nodeVal)/Math.log(readCountMax))*maxCircleSize)+minCircleSize;
    else if (type === "linear")
        return ((nodeVal/readCountMax)*maxCircleSize)+minCircleSize;
    else if (type === "ln")
        return ((Math.log10(nodeVal)/Math.log10(readCountMax))*maxCircleSize)+minCircleSize;
    else if (type === "sqrt")
        return ((Math.sqrt(nodeVal)/Math.sqrt(readCountMax))*maxCircleSize)+minCircleSize;


  }




var oldNodes = {};



function tempRecursiveSumFunction(d) {
            var childrenSum = 0;
            function recursiveSum(n) {
                    if (n.children){
                      n.children.forEach(function(c){
                          childrenSum += c.value;
                          recursiveSum(c);
                        });
                    } else if (n._children){
                      n._children.forEach(function(c){
                          childrenSum += c.value;
                          recursiveSum(c);
                        });
                    } else if (n.Tchildren){
                      n.Tchildren.forEach(function(c){
                          childrenSum += c.value;
                          recursiveSum(c);
                        });
                    }
            };
            recursiveSum(d);
            var summedReadCount = childrenSum + d.value;
            d.summedReadCount = summedReadCount;
};




function copyCollapseState(tree,ids) {
            function recursiveCopy(d) {

              if (ids.hasOwnProperty(d.ncbiID)) {

                if (ids[d.ncbiID]["hiddenClickChildren"] == true) {
                  click(d);
                  d._children.forEach(function(c){
                      recursiveCopy(c);
                    });
                };

                if (d.children) {
                  d.children.forEach(function(c){
                      recursiveCopy(c);
                    });
                };
              };
            };
            recursiveCopy(tree);
};

var treeLeafCounts = {"compare":0,"dashboard":0};

function taxonomicRankFilt(tree,plot,rank) {


   var leafCount = 0
   var hideBranchList = [];
            function recursiveRankFilt(d) {


              if (d.rank < rank) {

                if (d.children) {
                  d.children.forEach(function(c){
                      recursiveRankFilt(c);
                    });
                } else if (d._children) {
                  d._children.forEach(function(c){
                      recursiveRankFilt(c);
                    });
                } else if (d.Tchildren){
                  changeTaxa(d,"true");
                  d.children.forEach(function(c){
                      recursiveRankFilt(c);
                    });
                } else {
                  leafCount += 1;
                }
              } else if (d.rank == rank) {
                  leafCount += 1;
                  changeTaxa(d,"false");
              } else if (d.rank > rank) {
                  hideBranchList.push(d);
              };

              if (d.name == "other sequences" && rank < 8) {
                leafCount += 1;
                changeTaxa(d,"false");
              }

            };
            recursiveRankFilt(tree);


            hideBranchList.forEach(function(d){
              hideSpecificBranch(d.parent,d.ncbiID);
              });

              treeLeafCounts[plot] = leafCount;
};


var dashboardTreeLeafCount = 0;
var dashboardTaxaTreeTopNChanged = false;
var dashboardTaxaTreeTopNDefault = 30;
var dashboardTaxaTreeTopN = dashboardTaxaTreeTopNDefault;
var dashboardTaxaTreeTopNMaxSelected = true;

function updateDashboardTaxaTreeTopNMax() {

  d3.selectAll("input[name='dashboardTaxaTreeTopN']").property("max", parseInt(dashboardTreeLeafCount));

  if (dashboardTreeLeafCount < dashboardTaxaTreeTopNDefault) {
    dashboardTaxaTreeTopN = dashboardTreeLeafCount;
  } else {
    dashboardTaxaTreeTopN = dashboardTaxaTreeTopNDefault;
  }

  d3.selectAll("input[name='dashboardTaxaTreeTopN']").property("value",dashboardTaxaTreeTopN);
  d3.selectAll(".dashboard-taxa-tree-top-n-text").text(dashboardTaxaTreeTopN);
  d3.selectAll(".dashboard-taxa-tree-total-n-text").text(dashboardTreeLeafCount);



};

function resetTreeBranches(tree) {

  function recursiveFunc(d) {
    d.keep = "false";

    if (d._children) {
      click(d);
    }

    if (d.branchChildren) {

      if (typeof d.children !== 'undefined') {
          d.children = d.children.concat(d.branchChildren);
      } else {
        d.children = d.branchChildren;
      }
      delete d.branchChildren;
    }

      if (d.children) {
        d.children.forEach(function(c){
            recursiveFunc(c);
          });
      }


  };
  recursiveFunc(tree);

};

function topNLeaves(tree,topN) {

  var allNodes = d3.layout.tree().nodes(tree);

  var leaves = [];


  var leafNodes = allNodes.filter(function(d){
        if (!d.children){
            return d;
         }
       });

  leafNodes.sort(function(a, b) {
      return b.summedValue - a.summedValue
  });


  for (const [i,taxa] of leafNodes.entries()) {
    if(i < topN) {
      taxa.keep = "true";
    }

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



keepNodes.forEach((keepNode) => {
  function recursiveParentKeep(d) {
    d.keep = "true";
    if (d.parent) {
        recursiveParentKeep(d.parent);
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

var preNodes;
var preReadCountSum;

function treeUpdate(source) {
  if (plotLevelSelectorChanged) {
    plotLevelDataManipulation(plotLevelSelectedDashboardId,root);
  }

  if (dashboardTreeLinkType == "straight") {
    diagonal = function (d, i) {
      return "M" + d.source.y + "," + d.source.x
          + "h" + 20
          + "V" + d.target.x + "H" + d.target.y;
    }
  } else {
    diagonal = d3.svg.diagonal()
      .projection(function(d) { return [d.y, d.x]; });
  }

if(newTreeData == true) {
  preNodes = d3.layout.tree().nodes(root).reverse();
  preReadCountSum = d3.sum(preNodes, function(d) { return d.children ? d.value : d.summedValue; });

  function recursiveSetSum(d) {
      tempRecursiveSumFunction(d);
      if (d.children) {
          d.children.forEach(function(c){
              recursiveSetSum(c);
            });
      };
    };

  recursiveSetSum(source);

}

if (newTreeData == true || taxonomicRankChanged == true) {
  resetTreeBranches(root);
  taxonomicRankFilt(root,"dashboard",taxonomicRankSelected);
  dashboardTreeLeafCount = treeLeafCounts.dashboard;
  updateDashboardTaxaTreeTopNMax();
  topNLeaves(root,dashboardTaxaTreeTopN);
} else if (dashboardTaxaTreeTopNChanged == true) {
  resetTreeBranches(root);
  taxonomicRankFilt(root,"dashboard",taxonomicRankSelected);
  topNLeaves(root,dashboardTaxaTreeTopN);
}

if (newTreeData == true && Object.keys(oldNodes).length !== 0) {
copyCollapseState(root,oldNodes);
duration = 0;
};


  var tempNodes = d3.layout.tree().nodes(root).reverse(),
	   tempLinks = d3.layout.tree().links(tempNodes);

    var depthDict = {};

  tempNodes.forEach(function(d) {
    if (depthDict.hasOwnProperty(d.depth)) {
    depthDict[d.depth] += 1;
  } else {
    depthDict[d.depth] = 0;
  }});


var highestDepthValue = 0;
var greatestDepthKey = 0;

for (var [key,value] of Object.entries(depthDict)) {
  var key = parseInt(key);
  if (value > highestDepthValue) { highestDepthValue = value;};
  if (key > greatestDepthKey) { greatestDepthKey = key;};
}


var tempHeight = highestDepthValue * 80;
  if (tempHeight < 400) {
    var tempHeight = 400;
  };

d3.select("#dendrogram>svg").transition().duration(duration).attr("height", tempHeight + dashboardTreeMargin.top + dashboardTreeMargin.bottom);

var treeDivWidth = $("#dendrogram").width() - dashboardTreeMargin.right - dashboardTreeMargin.left - 180;



if (dashboardTreeType == "tree") {

  var tree = d3.layout.tree()
      .size([tempHeight, treeDivWidth]);

  var nodes = tree.nodes(root).reverse();
	var links = tree.links(nodes);
}
else {

  var cluster = d3.layout.cluster()
      .size([tempHeight, treeDivWidth]);


  var nodes = cluster.nodes(root).reverse();
  var links = cluster.links(nodes);
}

  var node = treeSVG.selectAll("g.node")
	  .data(nodes, function(d) { return d.id || (d.id = ++i); });


    readCountMax = d3.max(nodes, function(d) { return d.children ? d.value : d.summedValue; });
    readCountSum = d3.sum(nodes, function(d) { return d.children ? d.value : d.summedValue; });
    // d3.selectAll(".dashboard-taxa-tree-read-perc").text(Number.parseFloat((readCountSum/preReadCountSum)*100).toPrecision(3));


    if (dashboardTreeCircleColourType == "linear") {
      var circleColour = d3.scale.linear()
      	.domain([1, readCountMax])
      	.range(['white', '#375a7f']);
    }
    else if (dashboardTreeCircleColourType === "sqrt"){
      var circleColour = d3.scale.sqrt()
      	.domain([1, readCountMax])
      	.range(['white', '#375a7f']);
    }
    else if (dashboardTreeCircleColourType === "log10"){
      var circleColour = d3.scale.log().base(10)
        .domain([1, readCountMax])
        .range(['white', '#375a7f']);
    }
    else if (dashboardTreeCircleColourType === "ln"){
      var circleColour = d3.scale.log().base(Math.exp(1))
        .domain([1, readCountMax])
        .range(['white', '#375a7f']);
    }


  var nodeEnter = node.enter().append("g")
	  .attr("class", "node")
	  .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
	  .on("click", function(d) { click(d); treeUpdate(d); });

  nodeEnter.append("circle")
	  .attr("r", 1e-6);

  nodeEnter.append("text")
	  .attr("dy", ".35em")
	  .attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
	  .text(function(d) { return d.name; })
	  .style("visibility", "hidden");

  var nodeUpdate = node.transition()
	  .duration(duration)
	  .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

  nodeUpdate.select("circle")
    .attr("r", function(d) {
          return circleSize(d,dashboardTreeCircleSizeType);
        })
    .style("fill", function(d) {
      var nodeVal;
      if (d.children) {
        nodeVal = d.value;
      } else {
        nodeVal = d.summedValue;
      }

      if (nodeVal == 0)
          return "black";
      else
          return circleColour(nodeVal);
        })
    .style("stroke", function(d) { return d._children ? "#000" : "#858796"; });

  node.on("mousemove", function(d) {
           toolTipDiv.transition()
              .duration(0)
              .style("opacity", .95);
              toolTipDiv.html("<h5 class='mb-0'>" + d.name + "</h5><small class='text-gray-800'>" + d.ncbiRank + "</em></small><hr class='toolTipLine'/>" + plotLevelSelectorDashboardObject[plotLevelSelectedDashboardId].prefix + "s at this node: " +
              toolTipValueFormat(plotLevelSelectedDashboardId,d.value) + "<br/>Summed " + plotLevelSelectorDashboardObject[plotLevelSelectedDashboardId].prefix.toLowerCase() + " count: " + toolTipValueFormat(plotLevelSelectedDashboardId,d.summedValue))
              .style("color", "black")
              .style("left", (tooltipPos(d3.event.pageX)) + "px")
              .style("top", (d3.event.pageY - 35) + "px");
          })
              .on("mouseout", function(d) {
                  toolTipDiv.transition()
                      .duration(50)
                      .style("opacity", 0);
              });



  nodeUpdate.select("text")
    .attr("dx", function (d) {return d.children ? (-14 - circleSize(d,dashboardTreeCircleSizeType)) : (6 + circleSize(d,dashboardTreeCircleSizeType)); })
    .attr("text-anchor", function(d) { return d.children ? "end" : "start"; })
    .style("visibility", function(d) { return d.children ?  "hidden" : "visible"; });


  var nodeExit = node.exit().transition()
	  .duration(duration)
	  .attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; })
	  .remove();

  nodeExit.select("circle")
	  .attr("r", 1e-6);

  nodeExit.select("text")
    .style("visibility", "hidden");


  var link = treeSVG.selectAll("path.treeLink")
	  .data(links, function(d) {return d.target.id; });

  link.enter().insert("path", "g")
	  .attr("class", "treeLink")
	  .attr("d", function(d) {
		var o = {x: source.x0, y: source.y0};
		return diagonal({source: o, target: o});
	  });

  link.transition()
	  .duration(duration)
	  .attr("d", diagonal);

  link.exit().transition()
	  .duration(duration)
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

  oldNodes[d.ncbiID] = {
    x0:d.x,
    y0:d.y,
    hiddenClickChildren:hiddenClickChildren
  };


  });

duration = 750;
}

function click(d) {
  if (d.children) {
	d._children = d.children;
	d.children = null;
  } else {
	d.children = d._children;
	d._children = null;
  }

}


function changeTaxa(d,show) {
  if (d.children) {
	d.Tchildren = d.children;
	d.children = null;
  } else if (d._children){
	d.Tchildren = d._children;
	d._children = null;
  } else if (d.Tchildren && show == "true"){
  d.children = d.Tchildren;
  d.Tchildren = null;
}
}


function hideSpecificBranch(d,id) {

  if (d.children) {
    var splice;

    d.children.forEach((c, i) => {
      if (c.ncbiID == id) {
        if (d.branchChildren) {
          d.branchChildren.push(c);
          splice = i;
        } else {
          d.branchChildren = [c];
          splice = i;
        };

        d.children.splice(splice, 1);
      }
    });

  }

};
