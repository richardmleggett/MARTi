
var dashboardTreeLinkType,
dashboardTreeType,
dashboardTreeCircleSizeType,
dashboardTreeCircleColourType;

function initialiseDashboardTree() {

  treeSVG = d3.select("#dendrogram").append("svg")
  	// .attr("width", width + margin.right + margin.left)
  	.attr("id", "dashboardTreeSVG")
  	.attr("height", "440")
    .attr("width", "100%")
    // .attr("height", "100%")
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
    dashboardTaxaTreeTopN = parseInt(d3.select(this).property("value"));
    d3.selectAll("input[name='dashboardTaxaTreeTopN']").property("value",dashboardTaxaTreeTopN);
    d3.selectAll(".dashboard-taxa-tree-top-n-text").text(dashboardTaxaTreeTopN);
  });

    d3.selectAll(".dashboard-taxa-tree-top-n-text").text(dashboardTaxaTreeTopN);


    dashboardTreeLinkType = "curve";
    dashboardTreeType = "tree";
    dashboardTreeCircleSizeType = "linear";
    dashboardTreeCircleColourType = "linear";


  //
  // d3.selectAll("input[name='horizontalNodeDistRange']").on("change", function() {
  //   console.log("horizontal distance: "+this.value);
  //   horizontalSeparationBetweenNodes = this.value;
  //   treeUpdate(data,1000);
  // });
  //
  //
  //
  // d3.selectAll("input[name='verticalNodeDistRange']").on("change", function() {
  //   console.log("vertical distance: "+this.value);
  //   verticalSeparationBetweenNodes = this.value;
  //   treeUpdate(data,1000);
  // });
  //
  // d3.selectAll("input[name='fontSizeRange']").on("change", function() {
  //   console.log("font size: "+this.value);
  //   node.selectAll('.node text')
  //     // .transition()
  //     // .duration(minorTransition)
  //     .style("font-size", this.value+"rem");
  //     treeUpdate(data,1000);
  //
  // });
  //
  // d3.selectAll("input[name='nodeSizeRange']").on("change", function() {
  //   console.log("Tree scale: "+this.value);
  //
  //     maxCircleSize = 13*this.value;
  //     treeUpdate(data,1000);
  //
  // });

};





var dashboardTreeMargin = {top: 20, right: 120, bottom: 20, left: 120}
	// width = 960 - dashboardTreeMargin.right - dashboardTreeMargin.left
	// height = 500 - dashboardTreeMargin.top - dashboardTreeMargin.bottom;

var i = 0,
	duration = 750;

  // var verticalSeparationBetweenNodes = 60;
  // var horizontalSeparationBetweenNodes = 125;

// var tree = d3.layout.tree()
// 	.size([height, width]);

// var tree = d3.layout.tree()
//     .size([height, width]);
    // .nodeSize([verticalSeparationBetweenNodes, horizontalSeparationBetweenNodes])
    // .separation(function(a, b) {
    //     return a.parent == b.parent ? 1 : 2;
    // }).sort(function(a,b){
    //   return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    // });

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


    // if (d.value == 0)
    //     return minCircleSize;
    // else if (type === "log")
    //     return ((Math.log(d.value)/Math.log(readCountMax))*maxCircleSize)+minCircleSize;
    // else if (type === "linear")
    //     return ((d.value/readCountMax)*maxCircleSize)+minCircleSize;

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
            // return summedReadCount;
};




function copyCollapseState(tree) {
            function recursiveCopy(d) {

              if (oldNodes.hasOwnProperty(d.name)) {

                if (oldNodes[d.name]["hiddenClickChildren"] == true) {
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



function taxonomicRankFilt(tree) {
   dashboardTreeLeafCount = 0;
   var hideBranchList = [];
            function recursiveRankFilt(d) {

              if (d.rank < taxonomicRankSelected) {

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
                  dashboardTreeLeafCount += 1;
                }
              } else if (d.rank == taxonomicRankSelected) {
                  dashboardTreeLeafCount += 1;
                  changeTaxa(d,"false");
              } else if (d.rank > taxonomicRankSelected) {
                  hideBranchList.push(d);
              };

              if (d.name == "other sequences" && taxonomicRankSelected < 8) {
                dashboardTreeLeafCount += 1;
                changeTaxa(d,"false");
              }

            };
            recursiveRankFilt(tree);

            hideBranchList.forEach(function(d){
              hideSpecificBranch(d.parent,d.name);
              });


};


// function recursivUnclick(tree) {
//
//             function recursiveFunc(d) {
//
//                 if (d.children) {
//                   d.children.forEach(function(c){
//                       recursiveFunc(c);
//                     });
//                 } else if (d._children) {
//                   click(d);
//                   d.children.forEach(function(c){
//                       recursiveFunc(c);
//                     });
//                 }
//
//             };
//             recursiveFunc(tree);
// };

var dashboardTreeLeafCount;
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


  // recursivUnclick(tree);

  var allNodes = d3.layout.tree().nodes(tree);


  // allNodes.forEach(function(d) {
  //   d.keep = "false";
  //   if (d.branchChildren) {
  //     if (typeof d.children !== 'undefined') {
  //         d.children = d.children.concat(d.branchChildren);
  //     }
  //     delete d.branchChildren;
  //   }
  // });

};

function topNLeaves(tree) {

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

  var thresholdSelected = dashboardTaxaTreeTopN;

  for (const [i,taxa] of leafNodes.entries()) {
    if(i < thresholdSelected) {
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
          hideSpecificBranch(d.parent,d.name);
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
  // preReadCountSum = d3.sum(preNodes, function(d) { return d.value; });
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
  taxonomicRankFilt(root);
  updateDashboardTaxaTreeTopNMax();
  topNLeaves(root);
} else if (dashboardTaxaTreeTopNChanged == true) {
  resetTreeBranches(root);
  topNLeaves(root);
}

if (newTreeData == true && Object.keys(oldNodes).length !== 0) {
copyCollapseState(root);
duration = 0;
};


  // Compute the new tree layout.
  var tempNodes = d3.layout.tree().nodes(root).reverse(),
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

      // Compute the new tree layout.
  var nodes = tree.nodes(root).reverse();
	var links = tree.links(nodes);
}
else {

  // var tempHeight = dashboardTreeLeafCount * 17;
  //   if (tempHeight < 400) {
  //     var tempHeight = 400;
  //   };
  //
  // d3.select("#dendrogram>svg").transition().duration(duration).attr("height", tempHeight + dashboardTreeMargin.top + dashboardTreeMargin.bottom);
  //
  // var treeDivWidth = $("#dendrogram").width() - dashboardTreeMargin.right - dashboardTreeMargin.left - 180;

  var cluster = d3.layout.cluster()
      .size([tempHeight, treeDivWidth]);


  var nodes = cluster.nodes(root).reverse();
  var links = cluster.links(nodes);
}


  // Update the nodes…
  var node = treeSVG.selectAll("g.node")
	  .data(nodes, function(d) { return d.id || (d.id = ++i); });


    readCountMax = d3.max(nodes, function(d) { return d.children ? d.value : d.summedValue; });
    // readCountSum = d3.sum(nodes, function(d) { return d.value; });
    readCountSum = d3.sum(nodes, function(d) { return d.children ? d.value : d.summedValue; });

// var string;
//
// for (var spec of nodes) {
//   var usedVal;
//   if (spec.children) {
//     usedVal = spec.value;
//   } else {
//     usedVal = spec.summedValue;
//   }
//   string += spec.name + "," + spec.value + "," + spec.summedValue + "," + usedVal + "\n";
// }
//
// console.log(string);
//
var nodesWithoutChildren = nodes.filter(function(d) {
    return !d.children;
  });

  var nodesWithChildren = nodes.filter(function(d) {
      return d.children;
    });


// console.log(nodesWithoutChildren);
// console.log(nodesWithChildren);
//
// console.log(readCountSum);
// console.log(preReadCountSum);

// console.log("With no children sum:");
// console.log(d3.sum(nodesWithoutChildren, function(d) {return d.summedValue}));

// console.log("With children sum:");
// console.log(d3.sum(nodesWithChildren, function(d) {return d.value}));

// console.log(d3.sum(nodesWithoutChildren, function(d) {return d.summedValue}) + d3.sum(nodesWithChildren, function(d) {return d.value}));

if (readCountSum > preReadCountSum) {
  // console.log("True");
  // console.log("Difference: " + (readCountSum-preReadCountSum));
      // console.log(readCountSum-preReadCountSum);
} else {
    // console.log("False");

}


    // d3.selectAll(".dashboard-taxa-tree-read-showing").text(thousandsSeparators(readCountSum));
    // d3.selectAll(".dashboard-taxa-tree-read-sum").text(thousandsSeparators(preReadCountSum));
    d3.selectAll(".dashboard-taxa-tree-read-perc").text(Number.parseFloat((readCountSum/preReadCountSum)*100).toPrecision(3));


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



  // Enter any new nodes at the parent's previous position.
  var nodeEnter = node.enter().append("g")
	  .attr("class", "node")
	  .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
	  .on("click", function(d) { click(d); treeUpdate(d); });

  nodeEnter.append("circle")
	  .attr("r", 1e-6);
	  // .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });

  nodeEnter.append("text")
	  // .attr("x", function(d) { return d.children || d._children ? -13 : 13; })
	  .attr("dy", ".35em")
	  .attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
	  .text(function(d) { return d.name; })
	  // .style("fill-opacity", 1e-6);
	  .style("visibility", "hidden");

  // Transition nodes to their new position.
  var nodeUpdate = node.transition()
	  .duration(duration)
	  .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

  nodeUpdate.select("circle")
	  // .attr("r", 8)
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
	  // .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; })
    .style("stroke", function(d) { return d._children ? "#000" : "#858796"; });

  node.on("mousemove", function(d) {
  // node.select("circle").on("mousemove", function(d) {
           toolTipDiv.transition()
              .duration(0)
              .style("opacity", .95);

              toolTipDiv.html("<h5 class='mb-0'>" + d.name + "</h5><small class='text-gray-800'>" + d.ncbiRank + "</em></small><hr class='toolTipLine'/>Reads at this node: " +
              thousandsSeparators(d.value) + "<br/>Summed read count: " + thousandsSeparators(d.summedValue))
              .style("color", "black")
              .style("left", (d3.event.pageX) + "px")
              .style("top", (d3.event.pageY - 35) + "px");
          })
              .on("mouseout", function(d) {
                  toolTipDiv.transition()
                      .duration(50)
                      .style("opacity", 0);
              });



  nodeUpdate.select("text")
    // .transition()
	  // .duration(0)
	  // .attr("x", function(d) { return d.children ? -13 : 13; })
    .attr("dx", function (d) {return d.children ? (-14 - circleSize(d,dashboardTreeCircleSizeType)) : (6 + circleSize(d,dashboardTreeCircleSizeType)); })
    .attr("text-anchor", function(d) { return d.children ? "end" : "start"; })
	  // .style("fill-opacity", function(d) { return d.children ?  1e-6 : 1; });
    .style("visibility", function(d) { return d.children ?  "hidden" : "visible"; });


  // Transition exiting nodes to the parent's new position.
  var nodeExit = node.exit().transition()
	  .duration(duration)
	  .attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; })
	  .remove();

  nodeExit.select("circle")
	  .attr("r", 1e-6);

  nodeExit.select("text")
	  // .style("fill-opacity", 1e-6);
    .style("visibility", "hidden");


  // Update the links…
  var link = treeSVG.selectAll("path.treeLink")
	  .data(links, function(d) { return d.target.id; });

  // Enter any new links at the parent's previous position.
  link.enter().insert("path", "g")
	  .attr("class", "treeLink")
	  .attr("d", function(d) {
		var o = {x: source.x0, y: source.y0};
		return diagonal({source: o, target: o});
	  });

  // Transition links to their new position.
  link.transition()
	  .duration(duration)
	  .attr("d", diagonal);

  // Transition exiting nodes to the parent's new position.
  link.exit().transition()
	  .duration(duration)
	  .attr("d", function(d) {
		var o = {x: source.x, y: source.y};
		return diagonal({source: o, target: o});
	  })
	  .remove();

  // Stash the old positions for transition.
  nodes.forEach(function(d) {
	d.x0 = d.x;
	d.y0 = d.y;


  var hiddenClickChildren = false;
  if (d._children) {
    hiddenClickChildren = true;
  };

  oldNodes[d.name] = {
    x0:d.x,
    y0:d.y,
    hiddenClickChildren:hiddenClickChildren
  };


  });

duration = 750;

// console.log("Tree updated");
}

// Toggle children on click.
function click(d) {
  if (d.children) {
	d._children = d.children;
	d.children = null;
  } else {
	d.children = d._children;
	d._children = null;
  }
  // treeUpdate(d);
}

// hide all children of selected taxa
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

// hide specific branch of tree
function hideSpecificBranch(d,name) {

  if (d.children) {
    var splice;

    d.children.forEach((c, i) => {
      if (c.name == name) {
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
