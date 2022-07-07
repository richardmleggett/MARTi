var dashboardTreeMapShape,
dashboardTreeMapBg,
dashboardTreeMapPadding,
dashboardTreeMapUnclassified,
dashboardTreeMapHigherTaxaNode,
dashboardTreeMapRevealHigherTaxa,
dashboardTreeMapMinTextSize;

function initialiseDashboardTreeMap() {

  treeMapSvg = d3.select("#treeMapPlot").append("svg")
    .attr("id","treeMapSvg")
		// .attr("width", treeMapWidth + treeMapMargin.left + treeMapMargin.right)
		.attr("height", treeMapHeight + treeMapMargin.bottom + treeMapMargin.top)
    // .attr("height", "440")
    .attr("width", "100%")
	  .append("g")
		.attr("transform", "translate(" + treeMapMargin.left + "," + treeMapMargin.top + ")");

    treeMapBg = d3.select("#treeMapPlot svg").insert("rect","g");


    d3.selectAll("input[name='dashboardTreeMapTopN']").on("change", function(){
      dashboardTreeMapTopNChanged = true;
      treeMapUpdate(treeMapData);
      dashboardTreeMapTopNChanged = false;
    });

    d3.selectAll("input[name='dashboardTreeMapTopN']").on("input", function(){
      dashboardTreeMapTopN = parseInt(d3.select(this).property("value"));
      d3.selectAll("input[name='dashboardTreeMapTopN']").property("value",dashboardTreeMapTopN);
      d3.selectAll(".dashboard-treemap-top-n-text").text(dashboardTreeMapTopN);
    });

      d3.selectAll(".dashboard-treemap-top-n-text").text(dashboardTreeMapTopN);

      d3.selectAll("input[name='dashboardTreeMapShape']").on("change", function() {
        dashboardTreeMapShape = d3.select(this).property("value");
        treeMapUpdate(treeMapData);
      });

      d3.selectAll("input[name='dashboardTreeMapBg']").on("change", function() {
        dashboardTreeMapBg = d3.select(this).property("value");
        treeMapUpdate(treeMapData);
      });

      d3.selectAll("input[name='dashboardTreeMapPadding']").on("change", function() {
        dashboardTreeMapPadding = d3.select(this).property("value");
        treeMapUpdate(treeMapData);
      });

      d3.selectAll("input[name='dashboardTreeMapUnclassified']").on("change", function() {
        dashboardTreeMapUnclassified = d3.select(this).property("value");
        taxonomicRankChanged = true;
        treeMapUpdate(treeMapData);
        taxonomicRankChanged = false;
      });

      d3.selectAll("input[name='dashboardTreeMapHigherTaxaNode']").on("change", function() {
        dashboardTreeMapHigherTaxaNode = d3.select(this).property("value");
        taxonomicRankChanged = true;
        treeMapUpdate(treeMapData);
        taxonomicRankChanged = false;
      });

      d3.selectAll("input[name='dashboardTreeMapRevealHigherTaxa']").on("change", function() {
        dashboardTreeMapRevealHigherTaxa = d3.select(this).property("value");
        taxonomicRankChanged = true;
        treeMapUpdate(treeMapData);
        taxonomicRankChanged = false;
      });

      d3.selectAll("input[name='dashboardTreeMapMinTextSize']").on("change", function(){
        treeMapUpdate(treeMapData);
      });

      d3.selectAll("input[name='dashboardTreeMapMinTextSize']").on("input", function(){
        dashboardTreeMapMinTextSize = parseInt(d3.select(this).property("value"));
        d3.selectAll(".dashboard-tree-map-min-text-size").text(dashboardTreeMapMinTextSize);
      });


      dashboardTreeMapShape = "rectangle";
      dashboardTreeMapBg = "black";
      dashboardTreeMapPadding = "off";
      dashboardTreeMapUnclassified = "show";
      dashboardTreeMapHigherTaxaNode = "show";
      dashboardTreeMapRevealHigherTaxa = "hide"
      dashboardTreeMapMinTextSize = 6;

      d3.selectAll(".dashboard-tree-map-min-text-size").text(dashboardTreeMapMinTextSize);
};


var dashboardTreeMapLeafCount;
var dashboardTreeMapTopNChanged = false;
var dashboardTreeMapTopNDefault = 30;
var dashboardTreeMapTopN = dashboardTreeMapTopNDefault;
var dashboardTreeMapTopNMaxSelected = true;



function updateDashboardTreeMapTopNMax() {

  d3.selectAll("input[name='dashboardTreeMapTopN']").property("max", parseInt(dashboardTreeMapLeafCount));

  if (dashboardTreeMapLeafCount < dashboardTreeMapTopNDefault) {
    dashboardTreeMapTopN = dashboardTreeMapLeafCount;
  } else {
    dashboardTreeMapTopN = dashboardTreeMapTopNDefault;
  }

  d3.selectAll("input[name='dashboardTreeMapTopN']").property("value",dashboardTreeMapTopN);
  d3.selectAll(".dashboard-treemap-top-n-text").text(dashboardTreeMapTopN);
  d3.selectAll(".dashboard-treemap-total-n-text").text(dashboardTreeMapLeafCount);

};

var treeMapSvg;
var treeMapBg;

var treeMapMargin = {top: 20, right: 120, bottom: 20, left: 120},
      treeMapWidth = 960 - treeMapMargin.left - treeMapMargin.right,
      treeMapHeight = 700 - treeMapMargin.top - treeMapMargin.bottom;

var x = d3.scale.linear().range([0, treeMapWidth]),
    y = d3.scale.linear().range([0, treeMapHeight]),
    treeMapColor = dashboardPlotColorPalette,
    treeMapRoot,
    treeMapNode;

// var treemap = d3.layout.treemap()
//     .round(false)
//     .size([treeMapWidth, treeMapHeight])
//     .padding(1)
//     // .sticky(true)
// //    .value(function(d) { return d["好き度"]; });
//     .value(function(d) { return d.treeMapValue; });

var treemap;
var higherTaxaNodes = [];

function treeMapUpdate(data) {



var treeCardWidth = $("#treeMapPlot").width();
var widthGap = 0;

if (dashboardTreeMapShape == "rectangle") {
    treeMapWidth = treeCardWidth - dashboardTreeMargin.right - dashboardTreeMargin.left;
    var maxWidth = treeMapHeight * (.5 * (1 + Math.sqrt(5)));

    if (treeMapWidth > maxWidth) {
      treeMapWidth = maxWidth;
      widthGap = treeCardWidth - treeMapWidth;
      // treeMapSvg.attr("transform", "translate(" + widthGap/2 + "," + treeMapMargin.top + ")");
    }
} else {
  treeMapWidth = treeMapHeight;
  widthGap = treeCardWidth - treeMapWidth;
  // treeMapSvg.attr("transform", "translate(" + widthGap/2 + "," + treeMapMargin.top + ")");
}
var translateRectX;
if (widthGap > 0) {
  translateRectX = widthGap/2;
} else {
  translateRectX = treeMapMargin.left;
}



treeMapBg.attr("width", treeMapWidth)
.attr("height", treeMapHeight)
.style("fill", dashboardTreeMapBg)
.attr("transform", "translate(" + translateRectX + "," + treeMapMargin.top + ")");

treeMapSvg.attr("transform", "translate(" + translateRectX + "," + treeMapMargin.top + ")");


      if (dashboardTreeMapPadding == "on") {
        treemap = d3.layout.treemap()
            .round(false)
            .size([treeMapWidth, treeMapHeight])
            .padding(0.5)
            .value(function(d) { return d.treeMapValue; });
      } else {
        treemap = d3.layout.treemap()
            .round(false)
            .size([treeMapWidth, treeMapHeight])
            .value(function(d) { return d.treeMapValue; });
      }

  treeMapColor = dashboardPlotColorPalette;

    treeMapNode = treeMapRoot = data;

    var copiedData1 = JSON.parse(JSON.stringify(data));
    var copiedData = JSON.parse(JSON.stringify(data));


      prepareTreeMapData(copiedData1,copiedData);
      if (newTreeData == true || taxonomicRankChanged == true) {
        updateDashboardTreeMapTopNMax();
      };
      topNLeavesTreeMap(copiedData);



    var nodes = treemap.nodes(copiedData);
        // var nodes = treemap.nodes(newTree);



      // if (taxonomicRankSelected < 10){
      //
      // nodes = nodes.filter(function(d){
      // if (d.rank == taxonomicRankSelected){
      //        return d;
      //      }
      //    });
      //
      // } else {
      //
      //   nodes = nodes.filter(function(d) {
      //     return !d.children;
      //   });
      //
      // };

// if (taxonomicRankSelected !== 10) {
  nodes = nodes.filter(function(d) {
    return !d.children;
  });
// }

// console.log(nodes);


    // var leafCount = nodes.length;

      // if (newTreeData == true || taxonomicRankChanged == true) {
      //   taxonomicRankFilt(treeMapNode);
      // };
      //
      // var nodes = treemap.nodes(data)
      //     .filter(function(d) {return !d.children; });
// console.log(data);
// console.log(copiedData);
//                 console.log(nodes);


      // console.log(nodes);

      var cell = treeMapSvg.selectAll("g")
          .data(nodes);

      var cellEnter = cell.enter().append("g")
          .attr("class", "cell");
          // .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
          // .on("click", function(d) { return zoom(treeMapNode == d.parent ? treeMapRoot : d.parent); });


      cellEnter.append("rect");

          // .attr("width", function(d) { return d.dx; })
          // .attr("height", function(d) { return d.dy; })
          // .style("fill", function(d) {return treeMapColor(d.parent.name); });

      cellEnter.append("text")
          // .attr("x", function(d) { return d.dx / 2; })
          // .attr("y", function(d) { return d.dy / 2; })
          .attr("class","cursor-default")
          .attr("dy", ".35em")
          .attr("text-anchor", "middle");
          // .text(function(d) { return d.name; })
          // .style("opacity", function(d) { d.w = this.getComputedTextLength(); return d.dx > d.w && d.dy > 22 ? 1 : 0; });

      cell.exit().remove();

      // cell.select(".cell")
      //     .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
          // .on("click", function(d) { return zoom(treeMapNode == d.parent ? treeMapRoot : d.parent); });



  cell.transition()
      .duration(750)
      .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

      cell.select("rect")
        .attr("width", function(d) { return d.dx; })
        .attr("height", function(d) { return d.dy; })
        .style("stroke", dashboardTreeMapBg)
        .style("fill", function(d) {
          var colourName;
          if (d.name !== "root") {
            colourName = d.parent.name;
          } else {
            colourName = "root";
          }
          return treeMapColor(colourName); });

      cell.select("text")
        .attr("x", function(d) { return d.dx / 2; })
        .attr("y", function(d) { return d.dy / 2; })
        // .attr("dy", ".35em")
        // .attr("text-anchor", "middle")
        .text(function(d) { return d.name; })
        // .style("opacity", function(d) { d.w = this.getComputedTextLength(); return d.dx > d.w && d.dy > 22 ? 1 : 0; })
        // .style("visibility", function(d) { d.w = this.getComputedTextLength(); return d.dx > d.w && d.dy > 22 ? "visible" : "hidden"; });
        .style("font-size", "1px")
        .each(treeMapWrap)
        // .each(getFontSize)
        .style("font-size", function(d) { return d.scale + "px"; });
        // .style("font-size", function(d) { console.log(d.name);console.log(d.dx);console.log(this.getComputedTextLength());
        //   return (d.dx - 10) / this.getComputedTextLength() * 1 + "px"; });

          // function getFontSize(d) {
          //   var tbbox = this.getBBox(),
          //       cbbox = this.parentNode.getBBox(),
          //       cbboxWidth = cbbox.width - 25 - (0.05 * cbbox.width),
          //       cbboxHeight = cbbox.height - 30 - (0.05 * cbbox.height),
          //       scale = Math.min(cbboxWidth/tbbox.width, cbboxHeight/tbbox.height),
          //       maxSize = 38,
          //       minSize = 6;
          //
          //   var finalScale = scale;
          //
          //   if (scale > maxSize) {
          //     finalScale = maxSize;
          //   } else if (scale < minSize) {
          //     finalScale = 0;
          //   }
          //
          //   d.scale = finalScale;
          // }

// zoom(treeMapRoot);


// tspan bug fix for Safari...
cell.select("tspan")
   .attr("x", function(d) { return parseInt(d3.select(this).attr("x"))+0.01; });


  cell.on("mousemove", function(d) {
  // node.select("circle").on("mousemove", function(d) {
           toolTipDiv.transition()
              .duration(0)
              .style("opacity", .95);

              toolTipDiv.html("<h5 class='mb-0'>" + d.name + "</h5><small class='text-gray-800'>" + d.ncbiRank + "</em></small><hr class='toolTipLine'/>Reads at this node: " +
              thousandsSeparators(d.count) + "<br/>Summed read count: " + thousandsSeparators(d.summedValue))
              .style("color", "black")
              .style("left", (d3.event.pageX) + "px")
              .style("top", (d3.event.pageY - 35) + "px");
          })
              .on("mouseout", function(d) {
                  toolTipDiv.transition()
                      .duration(50)
                      .style("opacity", 0);
              });

};


// function zoom(d) {
//   var kx = treeMapWidth / d.dx, ky = treeMapHeight / d.dy;
//   x.domain([d.x, d.x + d.dx]);
//   y.domain([d.y, d.y + d.dy]);
//
//   var t = treeMapSvg.selectAll("g.cell").transition()
//       // .duration(d3.event.altKey ? 7500 : 750)
//       .duration(750)
//       .attr("transform", function(d) { return "translate(" + x(d.x) + "," + y(d.y) + ")"; });
//
//   t.select("rect")
//       .attr("width", function(d) { return kx * d.dx - 1; })
//       .attr("height", function(d) { return ky * d.dy - 1; })
//
//   t.select("text")
//       .attr("x", function(d) { return kx * d.dx / 2; })
//       .attr("y", function(d) { return ky * d.dy / 2; })
//       .style("opacity", function(d) { return kx * d.dx > d.w ? 1 : 0; });
//
//   treeMapNode = d;
//   d3.event.stopPropagation();
// }

function topNLeavesTreeMap(tree) {

  var nodes = treemap.nodes(tree);

  nodes.forEach((node) => {
    node.keep = "false";
  });


  var leafNodes = nodes.filter(function(d) {
      return !d.children;
    });


  var leaves = [];

  leafNodes.sort(function(a, b) {
      return b.summedValue - a.summedValue
  });

  var thresholdSelected = dashboardTreeMapTopN;

  for (const [i,taxa] of leafNodes.entries()) {
    if(i < thresholdSelected) {
      taxa.keep = "true";
      taxa.threshold = taxa.ncbiID.toString();
    } else {
      taxa.threshold = "Other";
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



//
// var topTaxaTreeMapArray = d3.nest()
//         .key(function(d) {
//             return d.threshold;
//         })
//         .rollup(function(v) {
//             return {
//               thresholdName: thresholdName(v),
//               ncbiRank: rank(v),
//               donutValue: d3.sum(v, function(d) {
//                 return d.donutValue;
//             })
//           }
//         })
//         .entries(sorted)
//         .map(function(g) {
//             return {
//                 label: g.values.thresholdName,
//                 value: g.values.donutValue,
//                 ncbiRank: g.values.ncbiRank
//             }
//         })
//         .sort(function(a, b) {
//             return b.value - a.value
//         });

 // console.log(keepNodes);
 // console.log(removeLeaves);

var leafSummedValue = 0;
var hiddenLeafSummedValue = 0;

keepNodes.forEach((keepNode) => {
  leafSummedValue += keepNode.summedValue;
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

// console.log(removeLeaves);

removeLeaves.forEach((removeLeaf) => {
  hiddenLeafSummedValue += removeLeaf.summedValue;
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

  // console.log(leafSummedValue);
var rootValMinusLeafVal = tree.summedValue - leafSummedValue - hiddenLeafSummedValue;

var hiddenLeavesNode = {
  name: "Hidden leaves",
  count: 0,
  ncbiRank: "no rank",
  rank: 0,
  // summedValue: rootValMinusLeafVal,
  // treeMapValue: rootValMinusLeafVal
  summedValue: hiddenLeafSummedValue,
  treeMapValue: hiddenLeafSummedValue
}

var higherTaxaNode = {
  name: "Higher taxa",
  count: 0,
  ncbiRank: "no rank",
  rank: 0,
  summedValue: rootValMinusLeafVal,
  treeMapValue: rootValMinusLeafVal
}

tree.children.push(hiddenLeavesNode);




if (dashboardTreeMapRevealHigherTaxa == "show") {
  higherTaxaNode.treeMapValue = 0;
  higherTaxaNode.children = [];

  for (node of higherTaxaNodes) {
    higherTaxaNode.children.push(node);
  }


}

if (dashboardTreeMapHigherTaxaNode == "show") {
  tree.children.push(higherTaxaNode);
}
// console.log(tree);

};



function prepareTreeMapData(data,finalData){

  var hideBranchList = [];
  var newLeafNodes = [];
  // var leavesBeforeLevel = [];
  var higherTaxaIdArray = [];
  higherTaxaNodes = [];
// console.log(taxonomicRankSelected);
   var parentNodeId;
           function recursiveRankFilt(d) {

             if (d.rank < taxonomicRankSelected) {
               if (d.children && d.children.length > 0) {
                 parentNodeId = d.ncbiID;
                 higherTaxaIdArray.push(d.ncbiID);
                 d.children.forEach(function(c){
                     recursiveRankFilt(c);
                   });
               } else if (d.name == "unclassified" && dashboardTreeMapUnclassified == "hide"){

               } else {

                  newLeafNodes.push(d.ncbiID);
                  // if (taxonomicRankSelected !== 10) {
                  // leavesBeforeLevel.push(d.name);
                  // }
               };
             } else if (d.rank == taxonomicRankSelected) {
                 newLeafNodes.push(d.ncbiID);
             } else if (d.rank > taxonomicRankSelected) {
                 newLeafNodes.push(parentNodeId);
                 // hideBranchList.push(d.ncbiID);
             };

             if (d.name == "other sequences" && taxonomicRankSelected < 8) {
                newLeafNodes.push(d.ncbiID);
             }
             parentNodeId = d.ncbiID;
           };
           recursiveRankFilt(data);

           // hideBranchList.forEach(function(d){
           //   hideSpecificBranch(d.parent,d.name);
           //   });

// console.log(newLeafNodes);
// console.log(hideBranchList);
// console.log(leavesBeforeLevel);
if (dashboardTreeMapUnclassified == "hide") {
  dashboardTreeMapLeafCount = newLeafNodes.length + 1 ;
} else {
  dashboardTreeMapLeafCount = newLeafNodes.length;
}


function recursiveSetValue(d) {
    d.count = d.value;
    if (newLeafNodes.includes(d.ncbiID)) {
      d.treeMapValue = d.summedValue;
      changeTaxa(d,"false");
    } else if (higherTaxaIdArray.includes(d.ncbiID) && dashboardTreeMapRevealHigherTaxa == "show") {
      d.treeMapValue = d.count;
      higherTaxaNodes.push({
        name: d.name,
        count: d.count,
        ncbiRank: d.ncbiRank,
        rank: d.rank,
        summedValue: d.summedValue,
        treeMapValue: d.count
      });
    } else {
      d.treeMapValue = 0;
    };
    if (hideBranchList.includes(d.ncbiID)) {
      // hideSpecificBranch(d.parent,d.name);
    };
    if (d.children) {
      d.children.forEach(function(c){
          recursiveSetValue(c);
        });
    };
  };

recursiveSetValue(finalData);


};


function treeMapWrap(d) {
    // text.each(function () {
    var tbbox = this.getBBox(),
        cbbox = this.parentNode.getBBox(),
        cbboxWidth = cbbox.width - 15 - (0.1 * cbbox.width),
        cbboxHeight = cbbox.height - 25 - (0.05 * cbbox.height),
        widthScale = cbboxWidth/tbbox.width,
        heightScale = cbboxHeight/tbbox.height,
        scale = Math.min(widthScale, heightScale),
        maxSize = 30,
        minSize = dashboardTreeMapMinTextSize;


        var finalScale = scale;

var text = d3.select(this),
    words = text.text().split(" ").reverse(),
    numWords = words.length;

    if (scale < 15 && numWords >= 2 && heightScale > widthScale) {
      var word,
          width = tbbox.width/2,
          line = [],
          lineNumber = 0,
          lineHeight = 1.1, // ems
          x = text.attr("x"),
          y = text.attr("y"),
          dy = -.3;
           //parseFloat(text.attr("dy")),

          var tspan = text.text(null)
                      .append("tspan")
                      .attr("x", x)
                      .attr("y", y)
                      .attr("dy", dy + "em");

          var longestWord = "";
          var compLongestWord;

          if (numWords > 2) {
            for (word of words) {
              if (word.length > longestWord.length) {
                longestWord = word;
              };
            };
            tspan.text(longestWord);
            compLongestWord = tspan.node().getComputedTextLength();
          }



      while (word = words.pop()) {
          line.push(word);
          tspan.text(line.join(" "));
          if (numWords > 2) {
            if (tspan.node().getComputedTextLength() > compLongestWord * 1.2) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan")
                            .attr("x", x)
                            .attr("y", y)
                            .attr("dy", ++lineNumber * lineHeight + dy + "em")
                            .text(word);
            }
          } else {
            // if (tspan.node().getComputedTextLength() > width) {
            if (line.length > 1) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan")
                            .attr("x", x)
                            .attr("y", y)
                            .attr("dy", ++lineNumber * lineHeight + dy + "em")
                            .text(word);
            }
          }


      }

      var wrappedTbbox = this.getBBox();
      var wrappedWidthScale = cbboxWidth/wrappedTbbox.width,
      wrappedHeightScale = cbboxHeight/wrappedTbbox.height,
      wrappedScale = Math.min(wrappedWidthScale, wrappedHeightScale),
      maxSize = 22;

      scale = wrappedScale;
      finalScale = scale;

                // console.log(wrappedtbbox.width);

      // if(lineNumber > maxLinesWrapped) {
      //   maxLinesWrapped = lineNumber;
      // };
      text.attr("data-lines", lineNumber+1);
      d.numberLines = lineNumber+1;

  // });
    }

if (cbboxWidth < 400 && maxSize == 30) {
  maxSize = 28;
}

    if (scale > maxSize) {
      finalScale = maxSize;
    } else if (scale < minSize) {
      finalScale = 0;
    }

    d.scale = finalScale;

};


// function prepareTreeMapData(data,finalData){
// var newLeafNodes = [];
// var nodes = d3.layout.treemap().nodes(data);
// // var nodes = treemap.nodes(data);
//
// if (taxonomicRankSelected < 10){
//
// nodes = nodes.filter(function(d){
// if (d.rank == taxonomicRankSelected){
//        return d;
//      }
//    });
//
//    newLeafNodes = [];
//
//    nodes.forEach(function(d) {
//    let leafArr = labelNewLeaves(d,taxonomicRankSelected);
//    newLeafNodes = [...newLeafNodes,...leafArr];
//    });
//
//    newLeafNodes = [...new Set(newLeafNodes)];
//
// } else {
//
//   newLeafNodes = [];
//   nodes = nodes.filter(function(d) {
//     return !d.children;
//   });
//
//   nodes.forEach(function(d) {
//     newLeafNodes.push(d.ncbiID);
//   })
// };
//
//
// function recursiveSetValue(d) {
//
//     if (newLeafNodes.includes(d.ncbiID)) {
//       d.treeMapValue = d.summedValue;
//       d.count = d.value;
//       changeTaxa(d,"false");
//       // if (!newTree.children.some(e => e.ncbiID === parent.ncbiID)) {
//       //   newTree.children.push(parent);
//       // }
//
//     } else {
//       d.treeMapValue = 0;
//       d.count = d.value;
//     };
//     if (d.children) {
//       // var parentNode = d;
//       d.children.forEach(function(c){
//           recursiveSetValue(c);
//         });
//     };
//   };
//
// recursiveSetValue(finalData);
//
//
// };
