var amrHmSvg,
  amrHmL1,
  amrHmL2,
  amrHmLegend,
  defs,
  amrHmColourPalette,
  amrHmMaxRectWidth,
  compareAmrHmGrey,
  compareAmrHmRead;


function initialiseAmrHm() {

  amrHmSvg = d3.select("#compareAmrHmPlot")
  .append("svg")
  .attr("id","compareAmrHm")
    .attr("height", heightAmrHm + marginAmrHm.top + marginAmrHm.bottom)
    .attr("width", "100%")
  .append("g")
    .attr("transform",
          "translate(" + marginAmrHm.left + "," + marginAmrHm.top + ")");

  defs = amrHmSvg.append("defs");

  defs.append("linearGradient")
    .attr("id", "amrHmLegendGradient")
    .attr("x1", "0%").attr("y1", "0%")
    .attr("x2", "100%").attr("y2", "0%");

  amrHmL1 = amrHmSvg.append('g');
  amrHmL2 = amrHmSvg.append('g');
  amrHmLegend = amrHmSvg.append("g")
  	.attr("id", "amrHmLegend");

  amrHmL2.append("g")
    .attr("class", "x axis");

  amrHmL2.append("g")
    .attr("class", "y axis");

  amrHmLegend.append("rect")
	 .attr("class", "amrHmLegendRect");

  amrHmLegend.append("text")
  .attr("class", "amrHmLegendTitle")
  .attr("x", 0)
  .attr("y", -2);

  amrHmLegend.append("g")
  	.attr("class", "x axis");

var currentWidthAmrHm = $('#compareAmrHmPlot').width();

      new ResizeSensor($('#compareAmrHmRow'), function(){

        var tempWidthAmrHm = $('#compareAmrHmPlot').width();
        if (tempWidthAmrHm > 0) {
          if (Math.abs(currentWidthAmrHm - tempWidthAmrHm) >= 30) {
              currentWidthAmrHm = tempWidthAmrHm;
              plotAmrHm(orderedAmrHmData,compareAmrHmGenes);
            }
        }

        });

    compareAmrHmTopN = 10;
    amrHmColourPalette = "blue";
    amrHmMaxRectWidth = 80;
    compareAmrHmGrey = "off";
    compareAmrHmRead = "percent";

    d3.select("#compareAmrHmTopN").on("change", function(){
      updateAmrPlots(rawAmrData);
    });

    d3.select("#compareAmrHmTopN").on("input", function(){
      compareAmrHmTopN = parseInt(this.value);
      d3.select("#compareAmrHmTopNNum").text(compareAmrHmTopN);
    });

    d3.select("#compareAmrHmTopNNum").text(compareAmrHmTopN);



    d3.selectAll("input[name='compareAmrHmColour']").on("change", function(){
    amrHmColourPalette = this.value;
    plotAmrHm(orderedAmrHmData,compareAmrHmGenes);
    });

    d3.selectAll("input[name='compareAmrHmMaxRectWidth']").on("change", function(){
      plotAmrHm(orderedAmrHmData,compareAmrHmGenes);
    });

    d3.selectAll("input[name='compareAmrHmMaxRectWidth']").on("input", function(){
      amrHmMaxRectWidth = parseInt(this.value);
      d3.selectAll("#compareAmrHmMaxRectWidthNum").text(amrHmMaxRectWidth);
    });



    d3.selectAll("#compareAmrHmMaxRectWidthNum").text(amrHmMaxRectWidth);

    d3.selectAll("input[name='compareAmrHmGrey']").on("change", function(){
      compareAmrHmGrey = this.value;
      plotAmrHm(orderedAmrHmData,compareAmrHmGenes);
    });



    d3.selectAll("input[name='compareAmrHmRead']").on("change", function(){
      compareAmrHmRead = this.value;
      plotAmrHm(orderedAmrHmData,compareAmrHmGenes);
    });




    d3.select('#exportCompareAmrHmCSV').on('click', function(){
      var csvToExport = generateCompareAmrCsv(compareAmrData);
      var date = getDate() + "_" + getTime();
      var outputFilename = "compare_amr_" + date;
      export_as_csv(csvToExport,outputFilename);
    });

    d3.select('#exportCompareAmrHmSVG').on('click', function(){
      var date = getDate() + "_" + getTime();
      var outputFilename = "compare_amr_heatmap_" + date;
      var exportSVG = $("#compareAmrHm");
      var exportSVGWidth = exportSVG.width();
      $(exportSVG).attr('width',exportSVGWidth);
      save_as_svg_with_style('compareAmrHm','/css/compareAmrHeatmap.css',outputFilename,true);
    });

    d3.select('#exportCompareAmrHmPNG').on('click', function(){
      var date = getDate() + "_" + getTime();
      var outputFilename = "compare_amr_heatmap_" + date;
      var exportSVG = $("#compareAmrHm");
      var exportSVGWidth = exportSVG.width();
      $(exportSVG).attr('width',exportSVGWidth);
      save_as_raster_with_style('compareAmrHm','/css/compareAmrHeatmap.css',outputFilename,2,'png',true);
    });

    d3.select('#exportCompareAmrHmJPG').on('click', function(){
      var date = getDate() + "_" + getTime();
      var outputFilename = "compare_amr_heatmap_" + date;
      var exportSVG = $("#compareAmrHm");
      var exportSVGWidth = exportSVG.width();
      $(exportSVG).attr('width',exportSVGWidth);
      save_as_raster_with_style('compareAmrHm','/css/compareAmrHeatmap.css',outputFilename,2,'jpg',true);
    });




};

// function convertDataToCSV(data) {
//   var dataArray = [];
//   var header = [];
//   header.push('Taxon','NCBI ID','NCBI Rank');
//   for (var sample of sortCompareNameArray) {
//     var sampleNameRunCount = sample.name + " (" + sample.runId + ") Read count";
//     header.push(sampleNameRunCount);
//   };
//   for (var sample of sortCompareNameArray) {
//     var sampleNameRunSummed = sample.name + " (" + sample.runId + ") Summed read count";
//     header.push(sampleNameRunSummed);
//   };
//   dataArray.push(header);
//   for (const [key, value] of Object.entries(data)) {
//     if (key !== "n/a") {
//       var keyRow = [];
//       keyRow.push(value.name);
//       keyRow.push(key);
//       keyRow.push(value.ncbiRank);
//       for (var sample of sortCompareNameArray) {
//         if (checkNested(value.values, sample.runId, sample.name)) {
//           keyRow.push((value["values"][sample.runId][sample.name]['count']).toString());
//         } else {
//           keyRow.push('0');
//         };
//       };
//       for (var sample of sortCompareNameArray) {
//         if (checkNested(value.values, sample.runId, sample.name)) {
//           keyRow.push((value["values"][sample.runId][sample.name]['summedCount']).toString());
//         } else {
//           keyRow.push('0');
//         };
//       };
//       dataArray.push(keyRow);
//     };
//   };
//   var csvString = '';
//   dataArray.forEach(function(infoArray, index) {
//     dataString = infoArray.join(',');
//     csvString += index < dataArray.length-1 ? dataString + '\n' : dataString;
//   });
//   return csvString;
// };

var amrHmColourPalettes = {
  blue: ['white', '#227AB5'],
  viridis:["#430D54", "#482878", "#3E4A89", "#30688E", "#25828D", "#1F9E89", "#35B779", "#6DCD59", "#B4DE2C", "#FDE724"],
  magma:["#000004", "#180f3d", "#440f76", "#721f81", "#9e2f7f", "#cd4071", "#f1605d", "#fd9668", "#feca8d", "#fcfdbf"]
};

var marginAmrHm = {top: 30, right: 80, bottom: 30, left: 60},
  widthAmrHm = 960 - marginAmrHm.left - marginAmrHm.right,
  heightAmrHm = 450 - marginAmrHm.top - marginAmrHm.bottom;


function plotAmrHm(data,taxa) {


for (var [i, sample] of data.entries()){
  sample.index = i;
};

var amrHmWidth = $("#compareAmrHmPlot").width();
var maxWidth = amrHmWidth - marginAmrHm.left - marginAmrHm.right;

var taxaCount = taxa.length;
var sampleCount = data.length;


heightAmrHm = taxaCount * 24;

yScaleAmrHm = d3.scale.ordinal()
  .rangeRoundBands([ heightAmrHm, 0 ]);

yAxisAmrHm = d3.svg.axis()
  .scale(yScaleAmrHm)
  .orient("left");

var yDomain = [];


if (compareAmrHmGenesSnAvailable){
  for (var id of taxa) {
    if(id !== "Other") {
      yDomain.push(compareAmrData[id]["shortName"]);
    } else {
      yDomain.push("Other");
    }
    // yDomain.push(id);
  }
} else {
  for (var id of taxa) {
    yDomain.push(id);
  }
}


yScaleAmrHm.domain(yDomain);

amrHmSvg.select("g.y.axis")
  .call(yAxisAmrHm);

var yAxisWidth = amrHmSvg.select("g.y.axis")[0][0].getBBox().width;


widthAmrHm = sampleCount * amrHmMaxRectWidth;
if (widthAmrHm > maxWidth - yAxisWidth) {
  widthAmrHm = maxWidth - yAxisWidth;
  amrHmSvg.attr("transform","translate(" + (marginAmrHm.left + yAxisWidth) + "," + marginAmrHm.top + ")");
} else {
  amrHmSvg.attr("transform","translate(" + (amrHmWidth/2 - (widthAmrHm + yAxisWidth)/2 + yAxisWidth) + "," + marginAmrHm.top + ")");
}

var plotMaxValue = 0;

data.forEach(function(d) {
  var readCountToSubtractFromOther = 0;
  var propToSubtractFromOther = 0;
  d.taxa = taxa.map(function(aroID) {
    var name, readCount, prop, plotValue;

    if(aroID !== "Other"){
      if (compareAmrHmGenesSnAvailable){
        name = compareAmrData[aroID]["shortName"];
      } else {
        name = aroID;
      }
    } else {
      name = "Other";
    }

    if (d[aroID]) {
      readCount = d[aroID]["value"];
      prop = d[aroID]["proportion"];

    } else {
      readCount = 0;
      prop = 0;

      if (checkNested(compareAmrData, aroID, 'values', d.runId, d.sample, 'count')) {
        readCount = compareAmrData[aroID]["values"][d.runId][d.sample]["count"];
        prop = readCount/d.totalAmrReadCount;
        readCountToSubtractFromOther += readCount;
        propToSubtractFromOther += prop;
        };
    };

    if(compareAmrHmRead == "percent") {
      plotValue = prop;
    } else {
      plotValue = readCount;
    };
    if (plotValue > plotMaxValue) {
      plotMaxValue = plotValue;
    };

    return {name: name, taxaReadCount: readCount, totalAmrReadCount: d["totalAmrReadCount"], sample: d.sample, index: d.index, proportion: prop, plotValue: plotValue};
  });

  var otherIndex = d["taxa"].findIndex(e => e.name == "Other");
  if (otherIndex != -1){
    d["taxa"][otherIndex]["taxaReadCount"] -= readCountToSubtractFromOther;
    d["taxa"][otherIndex]["proportion"] -= propToSubtractFromOther;
    if(compareAmrHmRead == "percent") {
      d["taxa"][otherIndex]["plotValue"] = d["taxa"][otherIndex]["proportion"];
    } else {
      d["taxa"][otherIndex]["plotValue"] = d["taxa"][otherIndex]["taxaReadCount"];
    };
  }

});



var amrHmDomain = [];
var colourPaletteLength = amrHmColourPalettes[amrHmColourPalette].length;

for (var [i,col] of amrHmColourPalettes[amrHmColourPalette].entries()) {
  var domainVal = (plotMaxValue/(colourPaletteLength-1))*i;
  amrHmDomain.push(domainVal);
}

  var amrHmColour = d3.scale.linear()
    .range(amrHmColourPalettes[amrHmColourPalette])
    .domain(amrHmDomain);

  defs.select("#amrHmLegendGradient").selectAll("stop").remove();

  amrHmLegendGradientStops = defs.select("#amrHmLegendGradient").selectAll("stop")
  	.data(amrHmColour.range());


  amrHmLegendGradientStops.enter().append("stop")
  	.attr("offset", function(d,i) { return i/(amrHmColour.range().length-1); })
  	.attr("stop-color", function(d) { return d; });




  var xScaleAmrHm = d3.scale.ordinal()
    .rangeRoundBands([ 0, widthAmrHm ]);

  var xAxisAmrHm = d3.svg.axis()
      .scale(xScaleAmrHm)
      .orient("bottom");

  xScaleAmrHm.domain(data.map(function(d) {return d.index; }));

if (data.length <= 10){
  amrHmSvg.select("g.x.axis")
    .attr("transform", "translate(0," + heightAmrHm + ")")
    .call(xAxisAmrHm)
    .selectAll("text")
      .text(function(d) { var finalText = stackedBarTextShrink(d,data); return finalText })
      .attr("dx", "0.5em")
      .attr("transform", "rotate(45)")
      .style("text-anchor", "start");
} else {
  amrHmSvg.select("g.x.axis")
    .attr("transform", "translate(0," + heightAmrHm + ")")
    .call(xAxisAmrHm)
    .selectAll("text")
      .text(function(d) { var finalText = stackedBarTextShrink(d,data); return finalText })
      .attr("dy", "-0.25em")
      .attr("dx", "0.5em")
      .attr("transform", "rotate(90)")
      .style("text-anchor", "start");
}

      var xAxisHeight = amrHmSvg.select("g.x.axis")[0][0].getBBox().height;



    var sample = amrHmL1.selectAll(".sample")
        .data(data);

        sample.enter().append("g")
        .attr("class", "sample");

        sample.exit().remove();

    var rectanglesAmrHm = sample.selectAll("rect")
        .data(function(d) {
          return d.taxa; });


      rectanglesAmrHm.enter().append("rect");

      rectanglesAmrHm.attr("x", function(d) { return xScaleAmrHm(d.index) })
      .attr("y", function(d) { return yScaleAmrHm(d.name) })
      .attr("width", xScaleAmrHm.rangeBand())
      .attr("height", yScaleAmrHm.rangeBand())
      .style("fill", function(d) {
        return ((compareAmrHmGrey == "on" && d.plotValue == 0) ? "#D3D3D3" : amrHmColour(d.plotValue))
      });

      rectanglesAmrHm.exit().remove();

      var maxLegendWidth = 250;

      var legendWidth = maxLegendWidth;
      if (widthAmrHm < maxLegendWidth) {
        legendWidth = widthAmrHm;
      };

    	var legendHeight = 10;

var legendXTransform = (widthAmrHm - legendWidth)/2;

var legendPlotMaxVal,
legendTitle;

if(compareAmrHmRead == "percent"){
  legendPlotMaxVal = plotMaxValue*100;
  legendTitle = "AMR hits (%)";
} else {
  legendPlotMaxVal = plotMaxValue;
  legendTitle = "AMR hits";
}


      var legendXScale = d3.scale.linear()
      	 .range([0, legendWidth])
      	 .domain([0,legendPlotMaxVal]);

      var legendXAxis = d3.svg.axis()
      	  .orient("bottom")
      	  .ticks(3)
      	  .scale(legendXScale);


      amrHmLegend.select("rect")
      .attr("y", 10)
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#amrHmLegendGradient)");

      amrHmLegend.select("text")
      .text(legendTitle);

      var legendTextWidth = $("#amrHmLegend text")[0].getBBox().width;

      amrHmLegend.select("text")
      .attr("transform", "translate(" + (legendWidth - legendTextWidth)/2  + "," + 0 + ")");

      amrHmLegend.select("g.x.axis")
        .attr("transform", "translate(" + 0 + "," + (10 + legendHeight) + ")")
      	.call(legendXAxis)
        .selectAll("text")
          .text(function(d) { var finalText = thousandKilo(d); return finalText });

        var amrHmLegendHeight = $("#amrHmLegend")[0].getBBox().height;

        amrHmLegend
        	.attr("transform", "translate(" + legendXTransform + "," + -(amrHmLegendHeight) + ")");


      if (widthAmrHm > maxWidth - yAxisWidth) {
        amrHmSvg.attr("transform","translate(" + (marginAmrHm.left + yAxisWidth) + "," + (marginAmrHm.top + amrHmLegendHeight) + ")");
      } else {
        amrHmSvg.attr("transform","translate(" + (amrHmWidth/2 - (widthAmrHm + yAxisWidth)/2 + yAxisWidth) + "," + (marginAmrHm.top + amrHmLegendHeight) + ")");
      }

      d3.select("#compareAmrHmPlot>svg")
        .attr("height", heightAmrHm + xAxisHeight + amrHmLegendHeight + marginAmrHm.top + marginAmrHm.bottom);


          rectanglesAmrHm.on("mousemove", function(d) {

            toolTipDiv.transition("AmrHmToolTip")
               .duration(0)
               .style("opacity", .95);

            toolTipDiv.html("<small class='text-gray-800'>" + d.sample + "</small>" +
            "<h5 class='mb-0'>" + d.name + "</h5>" +
            // "<small class='text-gray-800'>" + d.ncbiRank + "</small>" +
            "<hr class='toolTipLine'/>Read count: " + thousandsSeparators(d.taxaReadCount) +
            "<br/>Read %: " + Math.round((d.proportion*10000))/100)
               .style("left", (tooltipPos(d3.event.pageX)) + "px")
               .style("top", (d3.event.pageY - 35) + "px");

          });

          rectanglesAmrHm.on("mouseout", function(d) {


            toolTipDiv.transition("AmrHmToolTip")
                .duration(50)
                .style("opacity", 0);

          });



};
