function initialiseCompareAccumulation() {

  rarefactionCompareSVG = d3.select("#compareRarefactionPlot").append("svg")
      .attr("viewBox", function() {
        var width = rareWidth + 180;
        var height = rareHeight + 80;
        var x = 0;
        var y = 0;
          return x + " " + y + " " + width + " " + height;
      })
    .append("g")
      .attr("transform", "translate(" + rareMargin.left + "," + rareMargin.top + ")");


      rarefactionCompareSVG.append("g")
          .attr("class", "x axis");

      rarefactionCompareSVG.append("g")
          .attr("class", "y axis");

      rarefactionCompareSVG.append("text")
          .attr("id", "yAxisLabelAccumulation")
          .attr("text-anchor", "middle")  // this makes it easy to centre the text as the transform is applied to the anchor
          .attr("transform", "translate("+ (-40) +","+(rareHeight/2)+")rotate(-90)")  // text is drawn off the screen top left, move down and out and rotate
          .text("Taxa");

      rarefactionCompareSVG.append("text")
          .attr("id", "xAxisLabelAccumulation")
          .attr("text-anchor", "middle")  // this makes it easy to centre the text as the transform is applied to the anchor
          .attr("transform", "translate("+ (rareWidth/2) +","+(rareHeight+45)+")")
          .text("Reads");




      d3.selectAll("input[name='rareLine']").on("change", function(){
        plotRarefactionCompare(rareData);
      });

      // d3.selectAll("input[name='rareXAxis']").on("change", function(){
      //   plotRarefactionCompare(rareData);
      // });



      d3.selectAll("input[name='rareXAxisMax']").on("change", function(){
        // dashboardTaxaTreeTopNChanged = true;
        plotRarefactionCompare(rareData);
        // dashboardTaxaTreeTopNChanged = false;
      });

      d3.selectAll("input[name='rareXAxisMax']").on("input", function(){
        rareXAxisMaxNum = parseInt(d3.select(this).property("value"));
        // d3.selectAll("input[name='rareXAxisMax']").property("value",rareXAxisMaxNum);
        d3.selectAll("#rareXAxisMaxNum").text(rareXAxisMaxNum);
      });

        d3.selectAll("#rareXAxisMaxNum").text(rareXAxisMaxNum);

        d3.select('#downloadAccumulationData').on('click', function(){
        var csvToExport = convertAccumulationDataToCSV(accumulationData);
        var date = getDate() + "_" + getTime();
        var levelSelected = taxonomicRankSelectedText.toLowerCase().replace(" ", "_");
        var outputFilename = "compare_accumulation_data_lca_" + lcaAbundanceCompare + "_" + levelSelected + "_" + date;
        export_as_csv(csvToExport,outputFilename);
        });

};

var rareXAxisMaxDefault = 100000;
var rareXAxisMaxNum = rareXAxisMaxDefault;

var rareMargin = {top: 20, right: 80, bottom: 50, left: 60},
    rareWidth = 960 - rareMargin.left - rareMargin.right,
    rareHeight = 500 - rareMargin.top - rareMargin.bottom;

var parseDate = d3.time.format("%Y%m%d").parse;

var rc_x = d3.scale.linear()
    .range([0, rareWidth]);

var rc_y = d3.scale.linear()
    .range([rareHeight, 0]);

// var rarefactionLineColour = d3.scale.category10();
// var rarefactionLineColour = d3.scale.ordinal()
//     .range(['#556b2f', '#a0522d', '#483d8b', '#5f9ea0', '#008000', '#9acd32', '#00008b', '#8b008b', '#ff4500', '#ffa500', '#ffff00',
//   '#deb887', '#00ff00', '#00fa9a', '#dc143c', '#00ffff', '#00bfff', '#0000ff', '#d8bfd8', '#ff00ff', '#1e90ff', '#db7093','#ff1493', '#ee82ee']);

  var rarefactionLineColour = dashboardPlotColorPalette;

var rc_xAxis = d3.svg.axis()
    .scale(rc_x)
    .ticks(8)
    .orient("bottom");

var yAxisTicks;

var rc_yAxis = d3.svg.axis()
    .scale(rc_y)
    .orient("left")
    // .tickValues(yAxisTicks)
    .tickFormat(d3.format("d"));



    var accumulationData;

    function convertAccumulationDataToCSV(data) {
      var levelSelected = taxonomicRankSelectedText.toLowerCase().replace(" ", "_");
      var dataArray = [];
      var header = [];
      // header.push('Read count','Taxa count');
      console.log(data);
      var maxRow = 0;
      for (var sample of data) {
        header.push(sample.name + " read count");
        header.push(sample.name + " " + levelSelected + " count");
        var valLength = sample.values.length;
        if (valLength > maxRow){
          maxRow = valLength;
        }
      }
      dataArray.push(header);

      for (var i = 0; i < maxRow; i++) {
        var rowData = [];
        for (var sample of data) {
          if (sample.values[i] !== undefined) {
          rowData.push(sample.values[i].readCount);
          rowData.push(sample.values[i].taxaCount);
        } else {
          rowData.push("");
          rowData.push("");
        }
      }
        dataArray.push(rowData);
    }

      var csvString = '';
      dataArray.forEach(function(infoArray, index) {
        dataString = infoArray.join(',');
        csvString += index < dataArray.length-1 ? dataString + '\n' : dataString;
      });
      return csvString;
    };



function plotRarefactionCompare(data) {



data.sort(function(a, b){
  return sortCompareNameArray.findIndex(e => e.name == a.id && e.runId == a.runId) - sortCompareNameArray.findIndex(e => e.name == b.id && e.runId == b.runId);
})

  var compareAccumulationLine;
  var rareXAxis;
  var xAxisLabel;

  rarefactionLineColour = dashboardPlotColorPalette;

  var selectedLca;

  if(currentPage=="Dashboard") {
    selectedLca = lcaAbundanceDashboard;
  } else if (currentPage=="Compare") {
    selectedLca = lcaAbundanceCompare;
  }


  if (selectedLca == "0.0") {
    $("#accumulationPlotWarning").hide();
  } else {
    $("#accumulationPlotWarning").show();
  }

  if ($("input[name='rareLine'][value='monotone']").is(':checked')) {
    compareAccumulationLine = d3.svg.line()
        // .interpolate("basis")
        .interpolate("monotone")
        .y(function(d) { return rc_y(d.taxaCount); })
        .x(function(d) { return rc_x(d.readCount); });
    }
    else {
      compareAccumulationLine = d3.svg.line()
          .y(function(d) { return rc_y(d.taxaCount); })
          .x(function(d) { return rc_x(d.readCount); });
    };

    // if ($("input[name='rareXAxis'][value='reads']").is(':checked')) {
    //   rareXAxis = "reads";
    //   xAxisLabel = "Reads analysed";
    // } else {
    //   rareXAxis = "time";
    //   xAxisLabel = "Time (min)";
    // }

    rareXAxis = "reads";
    xAxisLabel = "Reads analysed";

    var yAxisLabel = taxonomicRankSelectedText;
    $("#yAxisLabelAccumulation").text(yAxisLabel+" count");

    $("#xAxisLabelAccumulation").text(xAxisLabel);

    var idList = [];
    var multilineData = [];


    // for (const [key, value] of Object.entries(data)) {
    for (const sample of data) {
      var sampleIdPlot;
      for (const sampleMetaData of sampleMetaDataArray) {
        if (sampleMetaData.pathName == sample.id && sampleMetaData.pathRun == sample.runId) {
          sampleIdPlot = sampleMetaData.id;
          idList.push(sampleIdPlot);
          var line = {
              name: sampleIdPlot,
              values: sample.data[rareXAxis].map(function(c) {
                return {readCount: c[0], taxaCount: c[1]};
              })
          };
          line.values.unshift({readCount: 0, taxaCount: 0});
          multilineData.push(line);

          break;
        }
      };

      // idList.push(sample.id);
      // var line = {
      //     name: sample.id,
      //     values: sample.data[rareXAxis].map(function(c) {
      //       return {readCount: c[0], taxaCount: c[1]};
      //     })
      // };
      // line.values.unshift({readCount: 0, taxaCount: 0});
      // multilineData.push(line);
    };


      rarefactionLineColour.domain(idList);

var readCountMax = d3.max(multilineData, function(c) { return d3.max(c.values, function(v) { return v.readCount; }); });
d3.selectAll("input[name='rareXAxisMax']").property("max", parseInt(readCountMax));

if (readCountMax < rareXAxisMaxDefault) {
  rareXAxisMaxNum = readCountMax;
}
// else {
//   rareXAxisMax = rareXAxisMaxDefault;
// }

// d3.selectAll("input[name='rareXAxisMax']").property("value",rareXAxisMaxNum);
// d3.selectAll("#rareXAxisMaxNum").text(rareXAxisMaxNum);
// d3.selectAll("#rareXAxisMaxNumTotal").text(dashboardTreeLeafCount);


for (var line of multilineData) {
  var indexOfMax = findWithAttr(line.values,"readCount",rareXAxisMaxNum);
  if (indexOfMax != -1) {
    line.values.length = indexOfMax + 1;
  } else {
    for (var [i,chunk] of line.values.entries()) {
      if (chunk.readCount < rareXAxisMaxNum){
        indexOfMax = i;
      } else {
        break;
      }
    }
    line.values.length = indexOfMax + 1;
  }
}

accumulationData = multilineData;

var rarefactionCompareLegend = d3.select("#compareRarefactionPlotLegend").selectAll(".rarefactionCompareLegend")
    .data(idList);

var rarefactionCompareLegendEnter = rarefactionCompareLegend.enter().append("svg")
    .attr("class", "rarefactionCompareLegend")
    .attr("height", 20)
    .append("g");

rarefactionCompareLegendEnter.append("rect")
    .attr("width", 20)
    .attr("height", 20)
    .style("fill", "black");

rarefactionCompareLegendEnter.append("text")
    .attr("x", 24)
    .attr("y", 9)
    .style("font-size", "1.1em")
    .attr("dy", ".356em");


rarefactionCompareLegend.select("g rect")
  .style("fill", function(d) {return rarefactionLineColour(d); });

rarefactionCompareLegend.select("g text")
  .style("text-anchor", "start")
  .text(function(d) { return d; });

rarefactionCompareLegend
  .attr("width",function(d) { return this.firstChild.getBBox().width; });


rarefactionCompareLegend.exit().remove();


rc_x.domain([
  d3.min(multilineData, function(c) { return d3.min(c.values, function(v) { return v.readCount; }); }),
  rareXAxisMaxNum
]);

rc_y.domain([
  d3.min(multilineData, function(c) { return d3.min(c.values, function(v) { return v.taxaCount; }); }),
  d3.max(multilineData, function(c) { return d3.max(c.values, function(v) { return v.taxaCount; }); })
]);

rarefactionCompareSVG.select("g.axis.x")
    .attr("transform", "translate(0," + rareHeight + ")")
    .call(rc_xAxis);


    // yAxisTicks = rc_y.ticks()
    // .filter(tick => Number.isInteger(tick));

rarefactionCompareSVG.select("g.axis.y")
    .call(rc_yAxis);

var yAxisWidth = rarefactionCompareSVG.select("g.axis.y").node().getBBox().width;

rarefactionCompareSVG.select("#yAxisLabelAccumulation")
  .attr("transform", "translate("+ (-yAxisWidth-10) +","+(rareHeight/2)+")rotate(-90)")


var sampleLine = rarefactionCompareSVG.selectAll(".sampleLine")
    .data(multilineData);

var sampleLineEnter = sampleLine.enter().append("g")
    .attr("class", "sampleLine");

    sampleLineEnter.append("path")
        .attr("class", "line");

    sampleLine.select("path.line")
        .attr("d", function(d) { return compareAccumulationLine(d.values); })
        .style("stroke", function(d) { return rarefactionLineColour(d.name); });

    sampleLine.exit().remove();


// sampleLine.append("text")
//     .datum(function(d) { return {name: d.name, value: d.values[d.values.length - 1]}; })
//     .attr("transform", function(d) { return "translate(" + rc_x(d.value.readCount) + "," + rc_y(d.value.taxaCount) + ")"; })
//     .attr("x", 3)
//     .attr("dy", ".35em")
//     .text(function(d) { return d.name; });

d3.select(".mouse-over-effects").remove();

var mouseG = rarefactionCompareSVG.append("g")
  .attr("class", "mouse-over-effects");

// this is the vertical line
mouseG.append("path")
  .attr("class", "mouse-line")
  .style("stroke", "black")
  .style("stroke-width", "1px")
  .style("opacity", "0");

  mouseG.append('svg:rect')
    .attr('width', rareWidth)
    .attr('height', rareHeight)
    .attr('fill', 'none')
    .attr('pointer-events', 'all');


// keep a reference to all our lines
var lines = document.getElementsByClassName('line');

  mouseG.selectAll('.mouse-per-line').remove();

// here's a g for each circle and text on the line
var mousePerLine = mouseG.selectAll('.mouse-per-line')
  .data(multilineData);


var mousePerLineEnter =
  mousePerLine.enter()
  .append("g")
  .attr("class", "mouse-per-line");


// the circle
mousePerLineEnter.append("circle")
  .attr("r", 7)
  .style("stroke", function(d) { return rarefactionLineColour(d.name); })
  // .style("stroke", function(d) {
  //   return color(d.name);
  // })
  .style("fill", "none")
  .style("stroke-width", "1px")
  .style("opacity", "0");

// the text
mousePerLineEnter.append("text")
  // .attr("transform", "translate(10,3)")
  .attr("transform", "translate(10,14)")
  .style("font-size", "1.3em");

  mousePerLine.exit().remove();

// rect to capture mouse movements
mouseG.select('rect')
  .on('mouseout', function() { // on mouse out hide line, circles and text
    d3.select(".mouse-line")
      .style("opacity", "0");
    d3.selectAll(".mouse-per-line circle")
      .style("opacity", "0");
    d3.selectAll(".mouse-per-line text")
      .style("opacity", "0");
  })
  .on('mouseover', function() { // on mouse in show line, circles and text
    d3.select(".mouse-line")
      .style("opacity", "1");
    d3.selectAll(".mouse-per-line circle")
      .style("opacity", "1");
    d3.selectAll(".mouse-per-line text")
      .style("opacity", "1");
  })
  .on('mousemove', function() { // mouse moving over canvas
    var mouse = d3.mouse(this);

    // move the vertical line
    // d3.select(".mouse-line")
    //   .attr("d", function() {
    //     var d = "M" + mouse[0] + "," + rareHeight;
    //     d += " " + mouse[0] + "," + 0;
    //     return d;
    //   });

 var largestX = {readCount: 0, taxaCount: 0};

    // position the circle and text
    d3.selectAll(".mouse-per-line")
      .attr("transform", function(d, i) {


        var xMouse = rc_x.invert(mouse[0]);
            // bisect = d3.bisector(function(d) { return d.date; }).right;
            var bisect = d3.bisector(function(d) { return d.readCount; }).right;

            // idx = bisect(d.values, xDate);
            var iBisect = bisect(d.values, xMouse);

            var d0 = d.values[iBisect - 1];
            var d1 = d.values[iBisect];
            if (d0 === undefined) {
              d0 = {readCount: 0, taxaCount: 0};
            }
            if (d1 === undefined) {
              d1 = d0;
            }
            var dx = xMouse - d0.readCount > d1.readCount - xMouse ? d1 : d0;
            if (dx.readCount > largestX.readCount) {
              largestX = dx;
            }


          // update the text with y value
          d3.select(this).select('text')
            .text(dx.taxaCount);


        // return position
        // return "translate(" + mouse[0] + "," + pos.y +")";
        return "translate(" + rc_x(dx.readCount) + "," + rc_y(dx.taxaCount) +")";
      });


      d3.select(".mouse-line")
        .attr("d", function() {
          var d = "M" + rc_x(largestX.readCount) + "," + rareHeight;
          d += " " + rc_x(largestX.readCount) + "," + 0;
          return d;
        });

  });

  rarefactionCompareLegend.on("mouseover", function(d, i) {

      // sampleLine.filter(function(x) {
      //     if (x.name == d) {
      //         d3.select(this).classed("hoverRect", true);
      //     };
      // });
      //
      //   d3.select(this).select("g rect").classed("hoverRect", true);
      //   d3.select(this).select("g text").style("font-weight", "bold");

      sampleLine.filter(function(x) {
          if (x.name == d) {
          } else {
            d3.select(this).transition().duration(opacityTransitionTime).style("opacity", "0.2");
          };
      });

      rarefactionCompareLegend.filter(function(x) {
          if (x == d) {
              d3.select(this).select("g text").transition().duration(opacityTransitionTime).style("font-weight", "bold");
          } else {
            d3.select(this).select("g").transition().duration(opacityTransitionTime).style("opacity", "0.2");
          };
      });

  });

  rarefactionCompareLegend.on("mouseout", function(d, i) {

    // sampleLine.filter(function(x) {
    //     if (x.name == d) {
    //         d3.select(this).classed("hoverRect", false);
    //     };
    // });
    //
    //   d3.select(this).select("g rect").classed("hoverRect", false);
    //   d3.select(this).select("g text").style("font-weight", "normal");

    sampleLine.filter(function(x) {
        if (x.name == d) {
        } else {
          d3.select(this).transition().duration(opacityTransitionTime).style("opacity", "1");
        };
    });

    rarefactionCompareLegend.filter(function(x) {
        if (x == d) {
            d3.select(this).select("g text").transition().duration(opacityTransitionTime).style("font-weight", "normal");
        } else {
          d3.select(this).select("g").transition().duration(opacityTransitionTime).style("opacity", "1");
        };
    });

  });


    };
