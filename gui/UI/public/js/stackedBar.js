var stackedSvg,
    layer1,
    layer2;

function initialiseCompareStackedBar() {

  stackedSvg = d3.select("#stackedBarPlot").append("svg")
      .attr("viewBox", function() {
        // width = widthStacked + marginStacked.left + marginStacked.right;
        // height = heightStacked + marginStacked.top + marginStacked.bottom;
        width = widthStacked + 180;
        height = heightStacked + 80;
        x = 0;
        y = 0;
          return x + " " + y + " " + width + " " + height;
      })
      // .attr("width", widthStacked + marginStacked.left + marginStacked.right)
      // .attr("height", heightStacked + marginStacked.top + marginStacked.bottom)
    .append("g")
      // .attr("transform", "translate(" + 100 + "," + marginStacked.top + ")");
      .attr("transform", "translate(" + marginStacked.left + "," + marginStacked.top + ")");

      layer1 = stackedSvg.append('g');
      layer2 = stackedSvg.append('g');

      layer2.append("g")
          .attr("class", "x axis");

      layer2.append("g")
          .attr("class", "y axis");

      layer2.append("text")
          .attr("transform", "translate("+ (-50) +","+(heightStacked/2)+")rotate(-90)")
          // .attr("y", 6)
          // .attr("dy", ".71em")
          .style("text-anchor", "middle")
          .text("Classified reads");

  percentClicked = true;

  compareStackedBarTopN = 10

  d3.select("#compareStackedBarTopN").on("change", function(){
    updateComparePlots(compareTreeDataGlobal);
  });



  d3.select("#compareStackedBarTopN").on("input", function(){
    compareStackedBarTopN = d3.select(this).property("value");
    d3.select("#compareStackedBarTopNNum").text(compareStackedBarTopN);
  });

  d3.select("#compareStackedBarTopNNum").text(compareStackedBarTopN);



  d3.selectAll("input[name='stackedBar']").on("change", percentCountSwitch);

longestSampleName = 0;


};


var longestSampleName;
var percentClicked;

// var marginStacked = {top: 20, right: 150, bottom: 50, left: 40},
//     widthStacked = 600 - marginStacked.left - marginStacked.right,
//     heightStacked = 500 - marginStacked.top - marginStacked.bottom;

    // var marginStacked = {top: 45, right: 75, bottom: 75, left: 75},
    //     widthStacked = 700 - marginStacked.left - marginStacked.right,
    //     heightStacked = 350 - marginStacked.top - marginStacked.bottom;

    var marginStacked = {top: 20, right: 80, bottom: 50, left: 60},
        widthStacked = 960 - marginStacked.left - marginStacked.right,
        heightStacked = 500 - marginStacked.top - marginStacked.bottom;


var xScale = d3.scale.ordinal()
    .rangeRoundBands([0, widthStacked], .3);
    // .rangeRoundBands([0, widthStacked-marginStacked.right], .3);
    // .rangeRoundBands([0, heightStacked + marginStacked.right + marginStacked.left], .3);

var yScale = d3.scale.linear()
    .rangeRound([heightStacked, 0]);

// var colorArray = ['#a6cee3', '#1f78b4', '#b2df8a', '#33a02c', '#fb9a99', '#e31a1c', '#fdbf6f', '#ff7f00', '#cab2d6', '#6a3d9a', '#ffed75'];
//
// var color = d3.scale.ordinal().range(colorArray);

// var colorReversed = d3.scale.ordinal().range(colorArray.reverse());

var xAxis = d3.svg.axis()
    .scale(xScale)
    .orient("bottom")
    .innerTickSize([0]);

var yAxis = d3.svg.axis()
    .scale(yScale)
    .orient("left")
    .tickFormat(d3.format(".2s")); // for the stacked totals version

var stack = d3.layout
    .stack(); // default view is "zero" for the count display.



// var tooltip = d3.select("body")
//                 .append("div")
//                 .attr("class", "tooltip");


function percentCountSwitch() {
  if (this.value === "percent") {
    percentClicked = true;
    transitionPercent();
  } else {
    percentClicked = false;
    transitionCount();
  }
}

function transitionPercent() {

  yAxis.tickFormat(d3.format("%"));
  stack.offset("expand");  // use this to get it to be relative/normalized!
  // var stacked = stack(makeData(segmentsStacked, data));
    var stacked = stack(makeData(stackedTaxa, stackedBarInputData));
  // call function to do the bars, which is same across both formats.
  transitionRects(stacked);
}

function transitionCount() {

  yAxis.tickFormat(d3.format(".2s")); // for the stacked totals version
  stack.offset("zero");
  // var stacked = stack(makeData(segmentsStacked, data));
      var stacked = stack(makeData(stackedTaxa, stackedBarInputData));
  transitionRects(stacked);

  }

function transitionRects(stacked) {

  yScale.domain([0, d3.max(stacked[stacked.length-1], function(d) { return d.y0 + d.y; })]);

  // attach new fixed data
  var sample = stackedSvg.selectAll(".taxa")
    .data(stacked);

  // same on the rects
  sample.selectAll("rect")
    .data(function(d) {
      return d;
    })  // this just gets the array for bar segment.

  stackedSvg.selectAll("g.taxa rect")
    .transition()
    .duration(350)
    .attr("x", function(d) {
      return xScale(d.x); })
    .attr("y", function(d) {
      return yScale(d.y0 + d.y); }) //
    .attr("height", function(d) {
      return yScale(d.y0) - yScale(d.y0 + d.y); });  // height is base - tallness

  stackedSvg.selectAll(".y.axis").transition().call(yAxis);
}

function makeData(segmentsStacked, data) {
  return segmentsStacked.map(function(component) {
      return data.map(function(d) {
        // var xVal = d.sample + " " + d.runId;
        if (d[component]) {
          var yVal = +d[component]["value"];
          var rank = d[component]["ncbiRank"];
        } else {
          var yVal = 0;
          var rank = "n/a";
        };
        // return {x: d["sample"], y: +d[component], component: component};
        return {x: d.index, y: yVal, sample: d.sample, runId: d.runId, component: component, readCount: yVal, totalReadCount: d["totalReadCount"], ncbiRank: rank};
      })
    });
}

var stackedBarInputData;
var stackedTaxa;
// var stacked;

function plotStackedBar(data,segmentsStacked) {

stackedBarInputData = data;
stackedTaxa = segmentsStacked;

for (var [i, sample] of data.entries()){
  sample.index = i;
};


  // var comparePlotColorPalette = d3.scale.ordinal()
  //     // .range(['#a6cee3', '#1f78b4', '#b2df8a', '#33a02c', '#fb9a99', '#e31a1c', '#fdbf6f', '#ff7f00', '#cab2d6', '#6a3d9a', '#ffed75']);
  //     .range(['#556b2f', '#a0522d', '#483d8b', '#5f9ea0', '#008000', '#9acd32', '#00008b', '#8b008b', '#ff4500', '#ffa500', '#ffff00',
  //   '#deb887', '#00ff00', '#00fa9a', '#dc143c', '#00ffff', '#00bfff', '#0000ff', '#d8bfd8', '#ff00ff', '#1e90ff', '#db7093','#ff1493', '#ee82ee']);

  // data.sort(function(a,b) { return +a.total - +b.total;});


  // var segmentsStacked = ["Escherichia","Oscillatoria","Streptomyces","Pseudomonas","Microcoleus","Arthrobacter","Polaromonas", "Bradyrhizobium"];


  var stacked = stack(makeData(segmentsStacked, data));



  // xScale.domain(data.map(function(d) { return d.sample + " " + d.runId; }));
  xScale.domain(data.map(function(d) {return d.index; }));



// this.getComputedTextLength()

if (data.length <= 2) {
  stackedSvg.select("g.x.axis")
      .attr("transform", "translate(0," + heightStacked + ")")
      .call(xAxis)
      .selectAll("text")
        .text(function(d) { return data[d].sample; })
        .attr("dy", "1em")
        .attr("dx", "0em")
        .style("text-anchor", "middle");

} else{
  stackedSvg.select("g.x.axis")
      .attr("transform", "translate(0," + heightStacked + ")")
      .call(xAxis)
      .selectAll("text")
        // .text(function(d) { return data[d].sample; })
        // .each(stackedBarTextShrink)
        .text(function(d) { var finalText = stackedBarTextShrink(d,data); return finalText })
        .attr("dy", "1em")
        .attr("dx", "1em")
        .attr("transform", "rotate(45)")
        .style("text-anchor", "start");
};

// stackedSvg.select("g.x.axis.tick.text")

  stackedSvg.select("g.y.axis")
      .call(yAxis)




  var sample = layer1.selectAll(".taxa")
      .data(stacked);

      sample.enter().append("g")
      .attr("class", "taxa");

      sample.style("fill", function(d, i) { return comparePlotColorPalette(d[0].component); });

      sample.exit().remove();

  var rectangles = sample.selectAll("rect")
      .data(function(d) {
        // console.log("array for a rectangle");
        return d; })  // this just gets the array for bar segment.
    .enter().append("rect")
        .attr("width", xScale.rangeBand());




    // checks which mode the stacked bar should be plotted in.
  if(percentClicked) {
    transitionPercent();
  } else {
    transitionCount();
  };

  // drawLegend();


// function drawLegend() {

  var stackedBarLegend = d3.select("#stackedBarLegend").selectAll(".stackedBarLegend")
      .data(segmentsStacked);

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
    .style("fill", function(d) {return comparePlotColorPalette(d); });

  stackedBarLegend.select("g text")
    .style("text-anchor", "start")
    .text(function(d) { return d; });

  stackedBarLegend
    .attr("width",function(d) { return this.firstChild.getBBox().width; });

  stackedBarLegend.exit().remove();

    stackedBarLegend.on("mouseover", function(d, i) {

        stackedSvg.selectAll("g.taxa rect").filter(function(x) {


            if (x.component == d) {
                d3.select(this).classed("hoverRect", true);
            };
        });

          d3.select(this).select("rect").classed("hoverRect", true);
          d3.select(this).select("text").style("font-weight", "bold");
    });

    stackedBarLegend.on("mouseout", function(d, i) {

      stackedSvg.selectAll("g.taxa rect").filter(function(x) {

          if (x.component == d) {
              d3.select(this).classed("hoverRect", false);
          };
      });

        d3.select(this).select("rect").classed("hoverRect", false);
        d3.select(this).select("text").style("font-weight", "normal");

    });


  // }





// ================================================================
// Mouse Events
// ================================================================

    rectangles
        .on("mouseover", mouseoverFunc)
        .on("mousemove", mousemoveFunc)
        .on("mouseout", mouseoutFunc);


    function mouseoverFunc(d) {

          d3.selectAll(".stackedBarLegend").filter(function(x) {

              if (d.component == x) {
                  d3.select(this).select("g rect").classed("hoverRect", true);
                  d3.select(this).select("g text").style("font-weight", "bold");
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
        "<hr class='toolTipLine'/>Read count: " + thousandsSeparators(d.readCount) +
        "<br/>Read %: " + Math.round(((d.readCount/d.totalReadCount)*10000))/100)
           .style("left", (d3.event.pageX) + "px")
           .style("top", (d3.event.pageY - 35) + "px");


    }

    function mouseoutFunc(d) {
      d3.selectAll(".stackedBarLegend").filter(function(x) {
        if (d.component == x) {
            d3.select(this).select("g rect").classed("hoverRect", false);
            d3.select(this).select("g text").style("font-weight", "normal");
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


// #stackedBarPlot>svg
$(".stackedBarLegend:eq(0) text").mouseenter(function(){
  $(this).css("font-weight", "bold");
});



};


function stackedBarTextShrink(d,data) {

    // var tbbox = this.getBBox();
    var maxChars = 28,
    halfMaxChars = maxChars/2;

    var text = data[d].sample,
    // var text = d3.select(this).text(),
        // chars = text.text().split("").reverse(),
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
