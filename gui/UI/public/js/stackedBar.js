var stackedSvg,
    layer1,
    layer2;

function initialiseCompareStackedBar() {

  stackedSvg = d3.select("#stackedBarPlot").append("svg")
      .attr("viewBox", function() {
        width = widthStacked + 180;
        height = heightStacked + 80;
        x = 0;
        y = 0;
          return x + " " + y + " " + width + " " + height;
      })
    .append("g")
      .attr("transform", "translate(" + marginStacked.left + "," + marginStacked.top + ")");

      layer1 = stackedSvg.append('g');
      layer2 = stackedSvg.append('g');

      layer2.append("g")
          .attr("class", "x axis");

      layer2.append("g")
          .attr("class", "y axis");

      layer2.append("text")
          .attr("id","compareStackedBarYAxisTitle")
          .attr("transform", "translate("+ (-50) +","+(heightStacked/2)+")rotate(-90)")
          .style("text-anchor", "middle")
          .text("Classified reads");

  percentClicked = true;

  compareStackedBarTopN = 10

  d3.select("#compareStackedBarTopN").on("change", function(){
    updateComparePlots(compareTreeDataGlobal);
  });



  d3.select("#compareStackedBarTopN").on("input", function(){
    compareStackedBarTopN = this.value;
    d3.select("#compareStackedBarTopNNum").text(compareStackedBarTopN);
  });

  d3.select("#compareStackedBarTopNNum").text(compareStackedBarTopN);


  d3.selectAll("input[name='stackedBar']").on("change", function(){
    compareStackedBarYAxis = this.value;
    plotStackedBar(stackedBarCompareData,taxaTotalCounts["stackedBar"]);
  });

longestSampleName = 0;
compareStackedBarYAxis = "percent";

};


var longestSampleName;
var percentClicked;
var compareStackedBarYAxis;
var stackedBarColor;

    var marginStacked = {top: 20, right: 80, bottom: 50, left: 60},
        widthStacked = 960 - marginStacked.left - marginStacked.right,
        heightStacked = 500 - marginStacked.top - marginStacked.bottom;


var xScale = d3.scale.ordinal()
    .rangeRoundBands([0, widthStacked], .3);

var yScale = d3.scale.linear()
    .rangeRound([heightStacked, 0]);

var xAxis = d3.svg.axis()
    .scale(xScale)
    .orient("bottom")
    .innerTickSize([0]);

var yAxis = d3.svg.axis()
    .scale(yScale)
    .orient("left")
    .tickFormat(d3.format(".2s"));

var stack = d3.layout
    .stack();


function transitionPercent() {

  yAxis.tickFormat(d3.format("%"));
  stack.offset("zero");
    var stacked = stack(makeData(stackedTaxa, stackedBarInputData));
  transitionRects(stacked);
}

function transitionCount() {

  yAxis.tickFormat(d3.format(".2s"));
  stack.offset("zero");
      var stacked = stack(makeData(stackedTaxa, stackedBarInputData));
  transitionRects(stacked);

  }

function transitionRects(stacked) {



  yScale.domain([0, d3.max(stacked[stacked.length-1], function(d) {return d.y0 + d.y; })]);



  var sample = stackedSvg.selectAll(".taxa")
    .data(stacked);

  sample.selectAll("rect")
    .data(function(d) {
      return d;
    })

  stackedSvg.selectAll("g.taxa rect")
    .transition("stackedBarRectTrans")
    .duration(350)
    .attr("x", function(d) {
      return xScale(d.x); })
    .attr("y", function(d) {
      return yScale(d.y0 + d.y); })
    .attr("height", function(d) {
      return yScale(d.y0) - yScale(d.y0 + d.y); });

  stackedSvg.selectAll(".y.axis").transition().call(yAxis);
}

function makeData(stackedTaxa, data) {
  return stackedTaxa.map(function(component) {
      return data.map(function(d) {
        var yVal,rank;
        if (d[component]) {
          var readCount = d[component]["value"];
          var proportion = d[component]["proportion"];
          if (compareStackedBarYAxis == "percent"){
            yVal = proportion;
          } else {
            yVal = readCount;
          }
          rank = d[component]["ncbiRank"];
        } else {
          yVal = 0;
          rank = "n/a";
        };

        return {x: d.index, y: yVal, sample: d.sample, runId: d.runId, component: component, readCount: readCount, totalReadCount: d["totalReadCount"], ncbiRank: rank};
      })
    });
}

var stackedBarInputData;
var stackedTaxa;


function plotStackedBar(data,taxaTotalCounts) {

  d3.select("#compareStackedBarYAxisTitle")
  .text("Classified " + plotLevelSelectedCompareTooltipPrefix.toUpperCase().toLowerCase() + "s");

stackedBarColor = d3.scale.ordinal()
      .range(colourPalettes[selectedPalette]);

stackedTaxa = [];

  if(compareStackedBarYAxis == "percent") {
    taxaTotalCounts.sort(function(a, b) {
        return b.proportionSum - a.proportionSum;
    });
  } else {
    taxaTotalCounts.sort(function(a, b) {
        return b.totalValue - a.totalValue;
    });
  };

  for (var taxa of taxaTotalCounts) {
    stackedTaxa.push(taxa.name);
  }

stackedBarInputData = data;

for (var [i, sample] of data.entries()){
  sample.index = i;
};


  var stacked = stack(makeData(stackedTaxa, data));

  xScale.domain(data.map(function(d) {return d.index; }));


if (data.length <= 2) {
  stackedSvg.select("g.x.axis")
      .attr("transform", "translate(0," + heightStacked + ")")
      .call(xAxis)
      .selectAll("text")
        .text(function(d) { return data[d].sample; })
        .attr("dy", "1em")
        .attr("dx", "0em")
        .style("text-anchor", "middle");

} else if (data.length <= 10){
  stackedSvg.select("g.x.axis")
      .attr("transform", "translate(0," + heightStacked + ")")
      .call(xAxis)
      .selectAll("text")
        .text(function(d) { var finalText = stackedBarTextShrink(d,data); return finalText })
        .attr("dy", "1em")
        .attr("dx", "1em")
        .attr("transform", "rotate(45)")
        .style("text-anchor", "start");
} else {
  stackedSvg.select("g.x.axis")
      .attr("transform", "translate(0," + heightStacked + ")")
      .call(xAxis)
      .selectAll("text")
        .text(function(d) { var finalText = stackedBarTextShrink(d,data); return finalText })
        .attr("dy", "0.25em")
        .attr("dx", "1em")
        .attr("transform", "rotate(90)")
        .style("text-anchor", "start");
};


  stackedSvg.select("g.y.axis")
      .call(yAxis)



  var sample = layer1.selectAll(".taxa")
      .data(stacked);

      sample.enter().append("g")
      .attr("class", "taxa");

      sample.style("fill", function(d, i) { return stackedBarColor(d[0].component); });

      sample.exit().remove();

  var rectangles = sample.selectAll("rect")
      .data(function(d) {
        return d; })
    .enter().append("rect")
        .attr("width", xScale.rangeBand());


  if (compareStackedBarYAxis == "percent") {
    transitionPercent();
  } else {
    transitionCount();
  };


  var stackedBarLegend = d3.select("#stackedBarLegend").selectAll(".stackedBarLegend")
      .data(stackedTaxa);

  var stackedBarLegendEnter = stackedBarLegend.enter().append("svg")
      .attr("class", "stackedBarLegend")
      .attr("height", 20)
      .append("g");

  stackedBarLegendEnter.append("rect")
      .attr("width", 20)
      .attr("height", 20)
      .style("fill", "black");

  stackedBarLegendEnter.append("text")
      .attr("x", 24)
      .attr("y", 9)
      .style("font-size", "1.1em")
      .attr("dy", ".356em");

  stackedBarLegend.select("g rect")
    .style("fill", function(d) {return stackedBarColor(d); });

  stackedBarLegend.select("g text")
    .style("text-anchor", "start")
    .text(function(d) { return d; });

  stackedBarLegend
    .attr("width",function(d) { return this.firstChild.getBBox().width; });

  stackedBarLegend.exit().remove();


  stackedBarLegend.on("mouseover", function(d, i) {

        stackedSvg.selectAll("g.taxa rect").filter(function(x) {


            if (x.component == d) {
            } else {
              d3.select(this).transition().duration(opacityTransitionTime).style("opacity", "0.2");
            };
        });

        d3.selectAll(".stackedBarLegend").filter(function(x) {
            if (x == d) {
                d3.select(this).select("g text").transition().duration(opacityTransitionTime).style("font-weight", "bold");
            } else {
              d3.select(this).select("g").transition().duration(opacityTransitionTime).style("opacity", "0.2");
            };
        });


  });

  stackedBarLegend.on("mouseout", function(d, i) {

    stackedSvg.selectAll("g.taxa rect").filter(function(x) {

        if (x.component == d) {

        } else {
          d3.select(this).transition().duration(opacityTransitionTime).style("opacity", "1");
        };
    });

    d3.selectAll(".stackedBarLegend").filter(function(x) {
        if (x == d) {
            d3.select(this).select("g text").transition().duration(opacityTransitionTime).style("font-weight", "normal");
        } else {
          d3.select(this).select("g").transition().duration(opacityTransitionTime).style("opacity", "1");
        };
    });

  });

  rectangles
      .on("mouseover", mouseoverFunc)
      .on("mousemove", mousemoveFunc)
      .on("mouseout", mouseoutFunc);





    function mouseoverFunc(d) {

          d3.selectAll(".stackedBarLegend").filter(function(x) {
              if (d.component == x) {
                  d3.select(this).select("g text").transition().duration(opacityTransitionTime).style("font-weight", "bold");
              } else {
                d3.select(this).select("g").transition().duration(opacityTransitionTime).style("opacity", "0.2");
              };
          });


          stackedSvg.selectAll("g.taxa rect").filter(function(x) {
              if (d.component == x.component) {
              } else {
                d3.select(this).transition().duration(opacityTransitionTime).style("opacity", "0.2");
              };
          });


    }

    function mousemoveFunc(d) {


        toolTipDiv.transition()
           .duration(0)
           .style("opacity", .95);

        toolTipDiv.html("<small class='text-gray-800'>" + d.sample + "</small>" +
        "<h5 class='mb-0'>" + d.component + "</h5>" +
        "<small class='text-gray-800'>" + d.ncbiRank + "</small>" +
        "<hr class='toolTipLine'/>" + plotLevelSelectedCompareTooltipPrefix + "s: " + toolTipValueFormat(plotLevelSelectedCompareId,d.readCount) +
        "<br/>" + plotLevelSelectedCompareTooltipPrefix + " %: " + Math.round(((d.readCount/d.totalReadCount)*10000))/100)
           .style("left", (tooltipPos(d3.event.pageX)) + "px")
           .style("top", (d3.event.pageY - 35) + "px");


    }

    function mouseoutFunc(d) {

      d3.selectAll(".stackedBarLegend").filter(function(x) {
          if (d.component == x) {
              d3.select(this).select("g text").transition().duration(opacityTransitionTime).style("font-weight", "normal");
          } else {
            d3.select(this).select("g").transition().duration(opacityTransitionTime).style("opacity", "1");
          };
      });


      stackedSvg.selectAll("g.taxa rect").filter(function(x) {
          if (d.component == x.component) {
          } else {
            d3.select(this).transition().duration(opacityTransitionTime).style("opacity", "1");
          };
      });


      toolTipDiv.transition()
          .duration(50)
          .style("opacity", 0);

    }




      var addedAxisHeight = stackedSvg.select("g.x.axis")[0][0].getBBox().height;

      d3.select("#stackedBarPlot>svg")
          .attr("viewBox", function() {
            width = widthStacked + 180;
            height = heightStacked + addedAxisHeight + 85;
            x = 0;
            y = 0;
              return x + " " + y + " " + width + " " + height;
          })
          .style("max-height", 500 + addedAxisHeight)

};


function stackedBarTextShrink(d,data) {


    var maxChars = 28,
    halfMaxChars = maxChars/2;

    var text = data[d].sample,
        numChars = text.length,
        middleString = "...",
        finalText;

    if (numChars > maxChars) {
      var firstString = text.slice(0,halfMaxChars);
      var endString = text.slice(-halfMaxChars);
      finalText = firstString + middleString + endString;
    } else {
      finalText = text;
    };
    return finalText;

};
