var readCountOpacity,radiusSelected,compareDonutSampleName,compareDonutSampleLabelSize,compareDonutArea,compareDonutColor;

function initialiseCompareMultiDonut() {

compareDonutSampleName = "show";
  compareDonutSampleLabelSize = +d3.select("#compareDonutSampleLabelSize").property("value");
  d3.select("#compareDonutSampleLabelSizeNum").text(compareDonutSampleLabelSize);
  compareDonutTopN = 10;
  compareDonutArea = "equal";

radiusSelected = +d3.select("#donutRadius").property("value");
d3.select("#donutRadiusNum").text(radiusSelected);

d3.selectAll("input[name='donutArea']").on("change", function(){
  compareDonutArea = d3.select(this).property("value");
  plotCompareDonut(donutCompareData,taxaTotalCounts["donut"]);
});

d3.select("#donutRadius").on("input", function(){
  radiusSelected = +this.value;
  d3.select("#donutRadiusNum").text(radiusSelected);
});

d3.select("#donutRadius").on("change", function(){
  radiusSelected = +this.value;
  plotCompareDonut(donutCompareData,taxaTotalCounts["donut"]);
});

readCountOpacity = d3.select("#showDonutReadCount").property("checked") ? "on" : "off";

d3.select("#showDonutReadCount").on("change", function(){
  readCountOpacity = this.checked ? "on" : "off";
  plotCompareDonut(donutCompareData,taxaTotalCounts["donut"]);
});

d3.select("#compareDonutSampleName").on("change", function() {
  compareDonutSampleName = this.checked ? "show" : "hide";
  plotCompareDonut(donutCompareData,taxaTotalCounts["donut"]);
});

d3.select("#compareDonutSampleLabelSize").on("input", function() {
  compareDonutSampleLabelSize = +this.value;
  d3.select("#compareDonutSampleLabelSizeNum").text(compareDonutSampleLabelSize);
});

d3.select("#compareDonutSampleLabelSize").on("change", function() {
  compareDonutSampleLabelSize = +this.value;
  plotCompareDonut(donutCompareData,taxaTotalCounts["donut"]);
});

d3.select("#compareDonutTopN").on("change", function(){
  updateComparePlots(compareTreeDataGlobal);
});

d3.select("#compareDonutTopN").on("input", function(){
  compareDonutTopN = d3.select(this).property("value");
  d3.select("#compareDonutTopNNum").text(compareDonutTopN);
});

d3.select("#compareDonutTopNNum").text(compareDonutTopN);



};


var pieCompare = d3.layout.pie()
    .sort(function(a, b) {
        return b.taxaReadCount - a.taxaReadCount
    })
    .value(function(d) { return d.taxaReadCount; });


var maxLinesWrapped;


    function wrap(text, width) {
        text.each(function () {
            var text = d3.select(this),
                words = text.text().split("").reverse(),
                word,
                line = [],
                lineNumber = 0,
                lineHeight = 1.1,
                x = text.attr("x"),
                y = text.attr("y"),
                dy = 0,
                tspan = text.text(null)
                            .append("tspan")
                            .attr("x", x)
                            .attr("y", y)
                            .attr("dy", dy + "em");
            while (word = words.pop()) {
                line.push(word);
                tspan.text(line.join(""));
                if (tspan.node().getComputedTextLength() > width) {
                    line.pop();
                    tspan.text(line.join(""));
                    line = [word];
                    tspan = text.append("tspan")
                                .attr("x", x)
                                .attr("y", y)
                                .attr("dy", ++lineNumber * lineHeight + dy + "em")
                                .text(word);
                }
            }
            if(lineNumber > maxLinesWrapped) {
              maxLinesWrapped = lineNumber;
            };
            text.attr("data-lines", lineNumber+1);

        });

    };


function plotCompareDonut(data,taxaTotalCounts) {


donutNcbiIDs = [];

for (var taxa of taxaTotalCounts) {
    donutNcbiIDs.push(taxa.ncbiID);
}

  compareDonutColor = d3.scale.ordinal()
        .range(colourPalettes[selectedPalette]);

  data.forEach(function(d) {

    d.taxa = donutNcbiIDs.map(function(ncbiID) {
      var name, rank, yVal;
      name = compareTaxaData[ncbiID]["name"];
      rank = compareTaxaData[ncbiID]["ncbiRank"];
      if (d[ncbiID]) {
        yVal = +d[ncbiID]["value"];
      } else {
        yVal = 0;
      };

    // d.taxa = donutNcbiIDs.map(function(ncbiID) {
    //   if (d[name]) {
    //     var yVal = +d[name]["value"];
    //     var rank = d[name]["ncbiRank"];
    //   } else {
    //     var yVal = 0;
    //     var rank = "n/a";
    //   };
      return {name: name, taxaReadCount: yVal, totalReadCount: d["totalReadCount"], sample: d.sample, ncbiRank: rank, ncbiID: ncbiID};
    });
  });

var pieStartData = taxaTotalCounts.map(function(d) {
  return {name: d.name, taxaReadCount: 0, ncbiID: d.ncbiID};
});


  if (compareDonutArea == "read") {

    radiusCompare = d3.scale.sqrt()
      .range([25, radiusSelected]);

    } else {
      radiusCompare = d3.scale.sqrt()
        .range([radiusSelected, radiusSelected]);

    };

    arcCompare = d3.svg.arc()
        .outerRadius(radiusCompare)
        .innerRadius(radiusCompare * 0.6);

radiusCompare.domain([0, d3.max(data, function(d) { return d.totalReadCount; })]);


  var donutCompareLegend = d3.select("#compareDonutPlotLegend").selectAll(".donutCompareLegend")
      .data(taxaTotalCounts);

  var donutCompareLegendEnter = donutCompareLegend.enter().append("svg")
      .attr("class", "donutCompareLegend")
      .attr("height", 20)
      .append("g");


  donutCompareLegendEnter.append("rect")
      .attr("width", 20)
      .attr("height", 20)
      .style("fill", "black");

  donutCompareLegendEnter.append("text")
      .attr("x", 24)
      .attr("y", 9)
      .style("font-size", "1em")
      .attr("dy", ".356em");


  donutCompareLegend.select("g rect")
    .style("fill", function(d) {return compareDonutColor(d.ncbiID); });

  donutCompareLegend.select("g text")
    .style("text-anchor", "start")
    .text(function(d) { return d.name; });

  donutCompareLegend
    .attr("width",function(d) { return this.firstChild.getBBox().width; });



  donutCompareLegend.exit().remove();


var donutCompareSVG = d3.select("#compareDonutPlot").selectAll(".pie")
    .data(data);

    var donutCompareSVGEnter = donutCompareSVG.enter().append("svg")
        .attr("class", "pie")
        .attr("id", function(d,i) {return 'pie'+i;})
      .append("g");

      donutCompareSVGEnter.append("text")
          .attr("class", "donutName");

      donutCompareSVGEnter.append("text")
          .attr("class", "donutReadCount")
          .style("text-anchor", "middle")
          .style("opacity", function(d) {return (readCountOpacity == "on") ? 1 : 0;})
          .text(function(d) { return thousandsSeparators(d.totalReadCount); })
          .style("font-size", function(d) { d3.select(this).style("font-size", 12); return Math.floor((r * 0.6) / this.getComputedTextLength() * 22) + "px"; })
          .attr("dy", ".35em");

    var donutSlices = d3.selectAll("svg.pie g").selectAll(".arc")
        .data(function(d) { return pieCompare(pieStartData); });

        donutSlices.enter().append("path")
            .attr("class", "arc")
            .attr("d", arcCompare)
            .style("fill", "white");

            maxLinesWrapped = 0;


            for(x in data) {

              var r = parseInt(radiusCompare(data[x].totalReadCount));

              var thisSVG = d3.select("#pie"+x);

                thisSVG.attr("width", r * 2)
                  .attr("height", r * 2 + 20)
                  .select("g")
                    .attr("transform", "translate(" + r + "," + (r + 20) + ")")
                  .select("text.donutName")
                      .text(function(d) {return d.sample; })
                      .attr("y", -7 - r)
                      .attr("x", 0)
                      .style("font-size", compareDonutSampleLabelSize + "px")
                      .style("text-anchor", "middle")
                      .style("opacity", function(d) {return (compareDonutSampleName == "show") ? 1 : 0;})
                      .call(wrap, r*2);


                thisSVG.select("text.donutReadCount")
                  .text(function(d) { return thousandsSeparators(d.totalReadCount); })
                  .style("font-size", function(d) { d3.select(this).style("font-size", 12); return Math.floor((r * 0.6) / this.getComputedTextLength() * 22) + "px"; })
                .transition("cdText").duration(500)
                    .style("opacity", function(d) {return (readCountOpacity == "on") ? 1 : 0;})
                    .attr("dy", ".35em")
                    .style("text-anchor", "middle");



          		var thisSVGSlices = thisSVG.selectAll(".arc").data(pieCompare(data[x].taxa));


          		thisSVGSlices.transition("compareDonutSliceTrans").duration(500)
              .attrTween("d", function(a) {
                          this._current = this._current || a;
                          var i = d3.interpolate(this._current, a);
                          this._current = i(0);
                          return function(t) {
                            return arcCompare(i(t));
                          };
                        })
                        .style("fill", function(d) {return compareDonutColor(d.data.ncbiID); });

                  thisSVGSlices.attr("d", arcCompare.outerRadius(r).innerRadius(r * 0.6));

                  // thisSVGSlices.transition("compareDonutSliceTrans2").duration(500).attr("d", arcCompare);

                  // thisSVGSlices.attr("d", arcCompare);

                thisSVGSlices.exit().remove();

          	};



for(x in data) {

  var r = parseInt(radiusCompare(data[x].totalReadCount));

  var thisSVG = d3.select("#pie"+x);
  var numberLines = thisSVG.select("text.donutName").attr("data-lines");

var textLineHeight;

var sampleLabelLineHeight = compareDonutSampleLabelSize * 1.1;

if (compareDonutSampleName == "show") {
  textLineHeight = (maxLinesWrapped+1)*sampleLabelLineHeight;
} else {
  textLineHeight = 0;
}

        thisSVG.attr("width", r * 2)
          .attr("height", r * 2 + textLineHeight + 10)
          .select("g")
            .attr("transform", "translate(" + r + "," + (r + textLineHeight + 10) + ")")
          .select("text.donutName")
              .attr("y", -(numberLines*sampleLabelLineHeight) - r +8)
              .selectAll("tspan")
                .attr("y", -(numberLines*sampleLabelLineHeight) - r +8);
};


var allSlices = d3.select("#compareDonutPlot").selectAll("svg.pie path.arc");
var legendGroups = donutCompareLegend.select("g");

function highlightTaxon(ncbiID) {
  allSlices.interrupt().style("stroke", null).style("stroke-width", null);
  allSlices.filter(function(d) { return d.data.ncbiID == ncbiID; })
    .style("opacity", 1)
    .style("stroke", "#1f1f1f")
    .style("stroke-width", "1.5px");
  allSlices.filter(function(d) { return d.data.ncbiID != ncbiID; })
    .transition().duration(opacityTransitionTime).style("opacity", 0.3);

  legendGroups.interrupt();
  legendGroups.filter(function(d) { return d.ncbiID == ncbiID; }).style("opacity", 1);
  legendGroups.filter(function(d) { return d.ncbiID != ncbiID; })
    .transition().duration(opacityTransitionTime).style("opacity", 0.3);
  donutCompareLegend.select("g text")
    .style("font-weight", function(d) { return d.ncbiID == ncbiID ? "bold" : "normal"; });
}

function clearHighlight() {
  allSlices.interrupt().style("stroke", null).style("stroke-width", null)
    .transition().duration(opacityTransitionTime).style("opacity", 1);
  legendGroups.interrupt().transition().duration(opacityTransitionTime).style("opacity", 1);
  donutCompareLegend.select("g text").style("font-weight", "normal");
}

donutCompareLegend.on("mouseover", function(d) { highlightTaxon(d.ncbiID); })
  .on("mouseout", clearHighlight);

allSlices.on("mouseover", function(d) {
    highlightTaxon(d.data.ncbiID);
    showTooltip(d);
  })
  .on("mousemove", showTooltip)
  .on("mouseout", function() {
    clearHighlight();
    toolTipDiv.interrupt().style("opacity", 0);
  });

function showTooltip(d) {
  toolTipDiv.interrupt().style("opacity", .95)
    .html("<small class='text-gray-800'>" + d.data.sample + "</small>" +
  "<h5 class='mb-0'>" + d.data.name + "</h5>" +
  "<small class='text-gray-800'>" + d.data.ncbiRank + "</small>" +
  "<hr class='toolTipLine'/>" + plotLevelSelectedCompareTooltipPrefix + "s: " + toolTipValueFormat(plotLevelSelectedCompareId,d.data.taxaReadCount) +
  "<br/>" + plotLevelSelectedCompareTooltipPrefix + " %: " + Math.round(((d.data.taxaReadCount/d.data.totalReadCount)*10000))/100)
     .style("left", (tooltipPos(d3.event.pageX)) + "px")
     .style("top", (d3.event.pageY - 35) + "px");
}



};
