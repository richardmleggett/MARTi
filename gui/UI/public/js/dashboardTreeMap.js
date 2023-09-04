var dashboardTreeMapShape,
dashboardTreeMapBg,
dashboardTreeMapPadding,
dashboardTreeMapUnclassified,
dashboardTreeMapRoot,
dashboardTreeMapHigherTaxaNode,
dashboardTreeMapRevealHigherTaxa,
dashboardTreeMapMinTextSize,
dashboardTreeMapGroupTitle;

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

    cellLayer = treeMapSvg.append('g').attr("class","cellLayer");
    titleLayer = treeMapSvg.append('g').attr("class","titleLayer");

    d3.selectAll("input[name='dashboardTreeMapTopN']").on("change", function(){
      // dashboardTreeMapTopNChanged = true;
      treeMapUpdate(treeMapData);
      // dashboardTreeMapTopNChanged = false;
    });

    d3.selectAll("input[name='dashboardTreeMapTopN']").on("input", function(){
      dashboardTreeMapTopN = parseInt(this.value);
      d3.selectAll("input[name='dashboardTreeMapTopN']").property("value",dashboardTreeMapTopN);
      d3.selectAll(".dashboard-treemap-top-n-text").text(dashboardTreeMapTopN);
    });

      d3.selectAll(".dashboard-treemap-top-n-text").text(dashboardTreeMapTopN);

      d3.selectAll("input[name='dashboardTreeMapShape']").on("change", function() {
        dashboardTreeMapShape = this.value;
        treeMapUpdate(treeMapData);
      });

      d3.selectAll("input[name='dashboardTreeMapBg']").on("change", function() {
        dashboardTreeMapBg = this.value;
        treeMapUpdate(treeMapData);
      });

      // d3.selectAll("input[name='dashboardTreeMapPadding']").on("change", function() {
      //   dashboardTreeMapPadding = this.value;
      //   treeMapUpdate(treeMapData);
      // });

      d3.selectAll("input[name='dashboardTreeMapUnclassified']").on("change", function() {
        dashboardTreeMapUnclassified = this.value;
        taxonomicRankChanged = true;
        treeMapUpdate(treeMapData);
        taxonomicRankChanged = false;
      });

      d3.selectAll("input[name='dashboardTreeMapRoot']").on("change", function() {
        dashboardTreeMapRoot = this.value;
        taxonomicRankChanged = true;
        treeMapUpdate(treeMapData);
        taxonomicRankChanged = false;
      });

      d3.selectAll("input[name='dashboardTreeMapHigherTaxaNode']").on("change", function() {
        dashboardTreeMapHigherTaxaNode = this.value;
        taxonomicRankChanged = true;
        treeMapUpdate(treeMapData);
        taxonomicRankChanged = false;
      });

      // d3.selectAll("input[name='dashboardTreeMapRevealHigherTaxa']").on("change", function() {
      //   dashboardTreeMapRevealHigherTaxa = this.value;
      //   taxonomicRankChanged = true;
      //   treeMapUpdate(treeMapData);
      //   taxonomicRankChanged = false;
      // });

      d3.selectAll("input[name='dashboardTreeMapMinTextSize']").on("change", function(){
        treeMapUpdate(treeMapData);
      });

      d3.selectAll("input[name='dashboardTreeMapMinTextSize']").on("input", function(){
        dashboardTreeMapMinTextSize = parseInt(this.value);
        d3.selectAll(".dashboard-tree-map-min-text-size").text(dashboardTreeMapMinTextSize);
      });

      d3.selectAll("#dashboardTreeMapColourBy").on("change", function(){
        dashboardTreeMapColourBy = this.value;
        taxonomicRankChanged = true;
        treeMapUpdate(treeMapData);
        taxonomicRankChanged = false;
      });

      d3.selectAll("#dashboardTreeMapShowDomain").on("change", function(){
        dashboardTreeMapShowDomain = parseInt(this.value);
        taxonomicRankChanged = true;
        treeMapUpdate(treeMapData);
        taxonomicRankChanged = false;
      });

      d3.selectAll("input[name='dashboardTreeMapGroupTitle']").on("change", function() {
        dashboardTreeMapGroupTitle = this.value;
        treeMapUpdate(treeMapData);
      });

      dashboardTreeMapShape = "rectangle";
      dashboardTreeMapBg = "black";
      // dashboardTreeMapPadding = "off";
      dashboardTreeMapUnclassified = "hide";
      dashboardTreeMapRoot = "hide";
      dashboardTreeMapHigherTaxaNode = "show";
      // dashboardTreeMapRevealHigherTaxa = "hide";
      dashboardTreeMapMinTextSize = 5;
      dashboardTreeMapColourBy = "Phylum";
      dashboardTreeMapGroupTitle = "show";
      dashboardTreeMapShowDomain = 0;

      d3.selectAll(".dashboard-tree-map-min-text-size").text(dashboardTreeMapMinTextSize);
};

var dashboardTreeMapShowDomain;
var dashboardTreeMapLeafCount;
// var dashboardTreeMapTopNChanged = false;
var dashboardTreeMapTopNDefault = 250;
var dashboardTreeMapTopN = dashboardTreeMapTopNDefault;
var dashboardTreeMapTopNMaxSelected = true;
var dashboardTreeMapColourBy;




function updateDashboardTreeMapTopNMax() {

  d3.selectAll("input[name='dashboardTreeMapTopN']").property("max", parseInt(dashboardTreeMapLeafCount));

  if (dashboardTreeMapLeafCount < dashboardTreeMapTopNDefault) {
    dashboardTreeMapTopN = dashboardTreeMapLeafCount;
  } else {
    dashboardTreeMapTopN = dashboardTreeMapTopNDefault;
    // dashboardTreeMapTopN = dashboardTreeMapLeafCount;
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
    treeMapColor = d3.scale.ordinal()
    .range(colourPalettes[selectedPalette]),
    treeMapRoot,
    treeMapNode;

var treemap;
// var higherTaxaNodes = [];
var newTreeMap;

function treeMapUpdate(data) {

treeMapGroupTitleData = {};
treeMapGroupTitleArray = [];

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


      // if (dashboardTreeMapPadding == "on") {
      //   treemap = d3.layout.treemap()
      //       .round(false)
      //       .size([treeMapWidth, treeMapHeight])
      //       .padding(0.5)
      //       .mode("squarify")
      //       .ratio(1)
      //       .value(function(d) { return d.treeMapValue; });
      //
      // } else {
        treemap = d3.layout.treemap()
            .round(false)
            .size([treeMapWidth, treeMapHeight])
            .mode("squarify")
            .ratio(1)
            .value(function(d) { return d.treeMapValue; })
            .sort(function(a, b) {
                return a.treeMapValue - b.treeMapValue
            });

      // }

  treeMapColor = d3.scale.ordinal()
    .range(colourPalettes[selectedPalette]);

    treeMapNode = treeMapRoot = data;

    var copiedData1 = JSON.parse(JSON.stringify(data));
    var copiedData = JSON.parse(JSON.stringify(data));


      prepareTreeMapData(copiedData1,copiedData);

      // if (newTreeData == true || taxonomicRankChanged == true) {
      //   updateDashboardTreeMapTopNMax();
      //
      // };
      topNNodesTreeMap(copiedData);


    // var nodes = treemap.nodes(copiedData);

    var nodes = treemap.nodes(newTreeMap);

        // for (var node of nodes) {
        //
        //   var lineage = {
        //       domain: "n/a",
        //       phylum: "n/a",
        //       class: "n/a",
        //       order: "n/a",
        //       family: "n/a",
        //       genus: "n/a",
        //       species: "n/a"
        //   };
        //
        //   function recursiveLineage(d) {
        //
        //     var capNcbiRank = d.ncbiRank.charAt(0).toUpperCase() + d.ncbiRank.slice(1);
        //     if (taxonomicLevelDict.hasOwnProperty(capNcbiRank)){
        //       lineage[d.ncbiRank] = d.name;
        //     } else if (d.ncbiRank == "superkingdom") {
        //       lineage.domain = d.name;
        //     };
        //
        //     if (d.parent) {
        //           recursiveLineage(d.parent);
        //     };
        //   };
        //
        //   if(!node.hasOwnProperty("higherNode") && node.name !== "root"){
        //     recursiveLineage(node);
        //     node.lineage = lineage;
        //   };
        //
        // }


  nodes = nodes.filter(function(d) {
    return !d.children;
  });





      var cell = cellLayer.selectAll("g")
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
        .style("fill", function(d) { var col = treeMapRectColour(d); return col; });

      cell.select("text")
        .attr("x", function(d) { return d.dx / 2; })
        .attr("y", function(d) { return d.dy / 2; })
        // .attr("dy", ".35em")
        // .attr("text-anchor", "middle")
        .text(function(d) { var textFirstCap = d.name.charAt(0).toUpperCase() + d.name.slice(1); return textFirstCap; })
        // .style("opacity", function(d) { d.w = this.getComputedTextLength(); return d.dx > d.w && d.dy > 22 ? 1 : 0; })
        // .style("visibility", function(d) { d.w = this.getComputedTextLength(); return d.dx > d.w && d.dy > 22 ? "visible" : "hidden"; });
        .style("font-size", "1px")
        // .each(treeMapWrap(this.getBBox(),this.parentNode.getBBox()))
        // .style("font-size", function(d) { return d.scale + "px"; });
        .style("font-size", function(d) {
          var cbbox = this.parentNode.getBBox();
          var tbbox = this.getBBox();
          var cbboxWidth = cbbox.width - 15 - (0.1 * cbbox.width),
              cbboxHeight = cbbox.height - 25 - (0.05 * cbbox.height)
          var ele = this;
          var scale = treeMapWrap(d,ele,tbbox,cbbox,30,cbboxWidth,cbboxHeight);
          return scale });




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
              .style("left", (tooltipPos(d3.event.pageX)) + "px")
              .style("top", (d3.event.pageY - 35) + "px");
          })
              .on("mouseout", function(d) {
                  toolTipDiv.transition()
                      .duration(50)
                      .style("opacity", 0);
              });


    var title = titleLayer.selectAll("g")
        .data(treeMapGroupTitleArray);

    var titleEnter = title.enter().append("g")
        .attr("class", "title");

    titleEnter.append("rect");

    titleEnter.append("text")
        .attr("class","cursor-default")
        .attr("dy", ".35em")
        .attr("text-anchor", "middle");

        title.select("text")
          .attr("x", function(d) { return ((d.rightmost - d.leftmost) / 2) + d.leftmost; })
          .attr("y", function(d) { return ((d.bottommost - d.topmost) / 2) + d.topmost; })
          .text(function(d) {textFirstCap = d.name.charAt(0).toUpperCase() + d.name.slice(1); return textFirstCap;})
          .style("font-size", "1px")
          .style("font-weight", "bold")
          .style("font-size", function(d) {
            var cbbox = {x:d.topmost,y:d.leftmost,width:d.rightmost - d.leftmost,height:d.bottommost - d.topmost};
            var tbbox = this.getBBox();
            var cbboxWidth = cbbox.width - 5 - (0.05 * cbbox.width),
                cbboxHeight = cbbox.height - 2 - (0.05 * cbbox.height)
            var ele = this;
            var scale = treeMapWrap(d,ele,tbbox,cbbox,40,cbboxWidth,cbboxHeight);
            return scale })
          .style("visibility", function(d) { return dashboardTreeMapGroupTitle == "show" ? "visible" : "hidden"; });

        title.select("rect")
          .attr("x", function(d) {var textWidth = this.parentNode.childNodes[1].getBBox().width; return ((d.rightmost - d.leftmost) / 2) + d.leftmost - textWidth/2 - 2; })
          .attr("y", function(d) {var textHeight = this.parentNode.childNodes[1].getBBox().height; return ((d.bottommost - d.topmost) / 2) + d.topmost - textHeight/2 +3; })
          .attr("width", function(d) {var textWidth = this.parentNode.childNodes[1].getBBox().width; var rectWidth = textWidth + 4; return rectWidth; })
          .attr("height", function(d) {var textHeight = this.parentNode.childNodes[1].getBBox().height;
            var rectHeight;
            if (textHeight - 6 <= 0) {rectHeight = 0}
            else {rectHeight = textHeight - 6;};
            return rectHeight; })
          .style("opacity", .92)
          // .style("stroke", dashboardTreeMapBg)
          .style("fill", function(d) {

            var rgb = hexToRgb(treeMapColor(d.name));
            var whiterRgb = {r:rgb.r,g:rgb.g,b:rgb.b};
            for (var [col,val] of Object.entries(whiterRgb)){
              if(val + 25 <= 255){
                val += 25;
              } else {
                val = 255;
              }
              whiterRgb[col] = val;
            };
            return "rgb("+whiterRgb.r+","+whiterRgb.g+","+whiterRgb.b+")"})
            .style("visibility", function(d) { return dashboardTreeMapGroupTitle == "show" ? "visible" : "hidden"; });

//Fix Safari bug..
    title.select("text")
      .attr("y", function(d) { return parseInt(d3.select(this).attr("y"))+0.01; });

    title.exit().remove();

};

function topNNodesTreeMap(tree) {

  var nodes = treemap.nodes(tree);

  for (var node of nodes) {

    var lineage = {
        domain: "n/a",
        phylum: "n/a",
        class: "n/a",
        order: "n/a",
        family: "n/a",
        genus: "n/a",
        species: "n/a"
    };

    function recursiveLineage(d) {

      var capNcbiRank = d.ncbiRank.charAt(0).toUpperCase() + d.ncbiRank.slice(1);
      if (taxonomicLevelDict.hasOwnProperty(capNcbiRank)){
        lineage[d.ncbiRank] = d.name;
      } else if (d.ncbiRank == "superkingdom") {
        lineage.domain = d.name;
      };

      if (d.parent) {
        recursiveLineage(d.parent);
      };
    };

    if(node.name !== "root"){
      recursiveLineage(node);
      node.lineage = lineage;
    } else{
      node.lineage = lineage;
    };

  }

var treeMapGroups = [];

  nodes.forEach((node) => {
    node.keep = "false";

      if (node.children){
        changeTaxa(node,"false");
      };

      if (node.name == "unclassified"){
        node.lineage = {
            domain: "unclassified",
            phylum: "unclassified",
            class: "unclassified",
            order: "unclassified",
            family: "unclassified",
            genus: "unclassified",
            species: "unclassified"
        };
      };

      if (node.name == "root"){
        node.lineage = {
            domain: "root",
            phylum: "root",
            class: "root",
            order: "root",
            family: "root",
            genus: "root",
            species: "root"
        };
      };



      var group = node["lineage"][dashboardTreeMapColourBy.toLowerCase()];
      if (group == "n/a"){
        group = "higher taxa";
      };
      var groupIndex = findWithAttr(treeMapGroups,"name",group);
      if(groupIndex != -1){
        treeMapGroups[groupIndex].children.push(node);
        treeMapGroups[groupIndex].groupSum += node.treeMapValue;
      } else {
        treeMapGroups.push({
            name: group,
            count: 0,
            ncbiRank: "no rank",
            ncbiID: "n/a",
            rank: 0,
            treeMapValue: 0,
            groupSum: node.treeMapValue,
            children: [node]
        });

      }

      if(node.name == group){
        var newGroupIndex = findWithAttr(treeMapGroups,"name",group);
        treeMapGroups[newGroupIndex].ncbiRank = node.ncbiRank;
        treeMapGroups[newGroupIndex].ncbiID = node.ncbiID;
        treeMapGroups[newGroupIndex].rank = node.rank;
      }
  });

treeMapGroups.sort(function(a, b) {
    return a.groupSum - b.groupSum
});


if (dashboardTreeMapHigherTaxaNode == "hide") {

  var higherTaxaGroupIndex = findWithAttr(treeMapGroups,"name","higher taxa");
  var higherTaxaNodeCountOverZero = 0;

  for (var child of treeMapGroups[higherTaxaGroupIndex].children){
    if (child.treeMapValue > 0) {
      higherTaxaNodeCountOverZero += 1;
    }
  };

  treeMapGroups.splice(higherTaxaGroupIndex,1)
  dashboardTreeMapLeafCount -= higherTaxaNodeCountOverZero;
}

  if (newTreeData == true || taxonomicRankChanged == true) {
    updateDashboardTreeMapTopNMax();

  };


  newTreeMap = {
    name: "treeRoot",
    count: 0,
    ncbiRank: "no rank",
    rank: 0,
    treeMapValue: 0,
    children: []
  };


  treeMapGroups.forEach((node) =>{
    newTreeMap.children.push(node);
  });



nodes = treemap.nodes(newTreeMap);

  var leafNodes = nodes.filter(function(d) {
      return !d.children;
    });



  leafNodes.sort(function(a, b) {
      return b.treeMapValue - a.treeMapValue
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


var leafSummedValue = 0;
var hiddenNodeSummedValue = 0;

keepNodes.forEach((keepNode) => {
  leafSummedValue += keepNode.treeMapValue;
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
  hiddenNodeSummedValue += removeLeaf.treeMapValue;
  if(removeLeaf.treeMapValue > 0){
  }
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


var hiddenLeavesNode = {
  name: "Hidden leaves",
  count: 0,
  ncbiRank: "no rank",
  rank: 0,
  summedValue: hiddenNodeSummedValue,
  treeMapValue: hiddenNodeSummedValue
}


newTreeMap.children.push(hiddenLeavesNode);


};


function prepareTreeMapData(data,finalData){

  var domainIdArray = [2,2157,2759,10239];

  var domainToShow = dashboardTreeMapShowDomain;
  var domainIdsToHide = [];
  if (domainToShow == 1){
    domainIdsToHide = [2759,10239]
  } else if (domainToShow !== 0){
    domainIdsToHide = domainIdArray.filter(element => element !== domainToShow);
  }

  var newLeafNodeIds = [];
  var higherTaxaIdArray = [];

   var parentNodeId;




function recursiveRankFilt(d) {


  if (!domainIdsToHide.includes(d.ncbiID)) {

    if (d.rank < taxonomicRankSelected) {
      if (d.children && d.children.length > 0) {
        parentNodeId = d.ncbiID;
        if (d.name == "root" && dashboardTreeMapRoot == "hide"){
        } else {
          higherTaxaIdArray.push(d.ncbiID);
        }

        d.children.forEach(function(c){
            recursiveRankFilt(c);
          });
      } else if (d.name == "unclassified" && dashboardTreeMapUnclassified == "hide"){

      } else {
         newLeafNodeIds.push(d.ncbiID);
      };
    } else if (d.rank == taxonomicRankSelected) {
        newLeafNodeIds.push(d.ncbiID);
    } else if (d.rank > taxonomicRankSelected) {
        newLeafNodeIds.push(parentNodeId);
    };


  }



  if (d.name == "other sequences" && taxonomicRankSelected < 8) {
     newLeafNodeIds.push(d.ncbiID);
  }
  parentNodeId = d.ncbiID;
};
recursiveRankFilt(data);



dashboardTreeMapLeafCount = 0;

  function recursiveSetValue(d) {
      d.count = d.value;
      if (newLeafNodeIds.includes(d.ncbiID)) {
        d.treeMapValue = d.summedValue;
        if(d.treeMapValue > 0){
          dashboardTreeMapLeafCount += 1;
        }
        changeTaxa(d,"false");
      } else if (higherTaxaIdArray.includes(d.ncbiID)) {
        d.treeMapValue = d.count;
        if(d.treeMapValue > 0){
          dashboardTreeMapLeafCount += 1;
        }
      } else {
        d.treeMapValue = 0;
      };
      if (d.children) {
        d.children.forEach(function(c){
            recursiveSetValue(c);
          });
      };
    };

recursiveSetValue(finalData);

};



function treeMapWrap(d,ele,tbbox,cbbox,maxSize,cbboxWidth,cbboxHeight) {

    var widthScale = cbboxWidth/tbbox.width,
        heightScale = cbboxHeight/tbbox.height,
        scale = Math.min(widthScale, heightScale),
        minSize = dashboardTreeMapMinTextSize;


    var finalScale = scale;

    var text = d3.select(ele),
      words = text.text().split(" ").reverse(),
      numWords = words.length;

    if (scale < 15 && numWords >= 2 && heightScale > widthScale) {
      var word,
          width = tbbox.width/2,
          line = [],
          lineNumber = 0,
          lineHeight = 1.1,
          x = text.attr("x"),
          y = text.attr("y"),
          dy = -.3;


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

      var wrappedTbbox = ele.getBBox();
      var wrappedWidthScale = cbboxWidth/wrappedTbbox.width,
      wrappedHeightScale = cbboxHeight/wrappedTbbox.height,
      wrappedScale = Math.min(wrappedWidthScale, wrappedHeightScale),
      maxSize = 22;

      scale = wrappedScale;
      finalScale = scale;

      text.attr("data-lines", lineNumber+1);
      d.numberLines = lineNumber+1;

    }

if (cbboxWidth < 400 && maxSize == 30) {
  maxSize = 28;
}

    if (scale > maxSize) {
      finalScale = maxSize;
    } else if (scale < minSize) {
      finalScale = 0.01;
    }

    d.scale = finalScale;
    return finalScale + "px";
};

var treeMapGroupTitleData = {};
var treeMapGroupTitleArray = [];

function treeMapRectColour(d) {

  var colourName;

    colourName = d.parent.name;


  var ignoreNodes = ["n/a","root","treeRoot","unclassified"];

  if(!ignoreNodes.includes(colourName)) {

    var width = d.dx;
    var left = d.x;
    var right = left + width;

    var height = d.dy;
    var top = d.y;
    var bottom = top + height;

    var groupNameIndex = findWithAttr(treeMapGroupTitleArray, "name", colourName);

    if(groupNameIndex == -1){
      treeMapGroupTitleArray.push({
        name: colourName,
        leftmost: left,
        rightmost: right,
        topmost: top,
        bottommost: bottom
      });
      groupNameIndex = treeMapGroupTitleArray.length - 1;
    }

    if(left < treeMapGroupTitleArray[groupNameIndex]["leftmost"]){
      treeMapGroupTitleArray[groupNameIndex].leftmost = left;
    };

    if(right > treeMapGroupTitleArray[groupNameIndex]["rightmost"]){
      treeMapGroupTitleArray[groupNameIndex].rightmost = right;
    };

    if(top < treeMapGroupTitleArray[groupNameIndex]["topmost"]){
      treeMapGroupTitleArray[groupNameIndex].topmost = top;
    };

    if(bottom > treeMapGroupTitleArray[groupNameIndex]["bottommost"]){
      treeMapGroupTitleArray[groupNameIndex].bottommost = bottom;
    };


  };


  return treeMapColor(colourName);

};
