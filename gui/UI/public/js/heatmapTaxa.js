var heatmapTaxaSvg,
  hmTaxaL1,
  hmTaxaL2,
  hmTaxaLegend,
  hmDefs,
  hmTaxaColourPalette,
  hmTaxaMaxRectWidth,
  compareHmTaxaGrey,
  compareHmTaxaRead;


function initialiseHeatmapTaxa() {

  heatmapTaxaSvg = d3.select("#compareHeatmapTaxaPlot")
  .append("svg")
  .attr("id","compareHmTaxa")
    .attr("height", heightHeatmapTaxa + marginHeatmapTaxa.top + marginHeatmapTaxa.bottom)
    .attr("width", "100%")
  .append("g")
    .attr("transform",
          "translate(" + marginHeatmapTaxa.left + "," + marginHeatmapTaxa.top + ")");

  hmDefs = heatmapTaxaSvg.append("defs");

  hmDefs.append("linearGradient")
    .attr("id", "hmTaxaLegendGradient")
    .attr("x1", "0%").attr("y1", "0%")
    .attr("x2", "100%").attr("y2", "0%");

  hmTaxaL1 = heatmapTaxaSvg.append('g');
  hmTaxaL2 = heatmapTaxaSvg.append('g');
  hmTaxaLegend = heatmapTaxaSvg.append("g")
  	.attr("id", "hmTaxaLegend");

  hmTaxaL2.append("g")
    .attr("class", "x axis");

  hmTaxaL2.append("g")
    .attr("class", "y axis");

  hmTaxaLegend.append("rect")
	 .attr("class", "hmTaxaLegendRect");

  hmTaxaLegend.append("text")
  .attr("class", "hmTaxaLegendTitle")
  .attr("x", 0)
  .attr("y", -2);

  hmTaxaLegend.append("g")
  	.attr("class", "x axis");

var currentWidthHmTaxa = $('#compareHeatmapTaxaPlot').width();

      new ResizeSensor($('#heatmapTaxaRow'), function(){

        var tempWidthHmTaxa = $('#compareHeatmapTaxaPlot').width();
        if (tempWidthHmTaxa > 0) {
          if (Math.abs(currentWidthHmTaxa - tempWidthHmTaxa) >= 30) {
              currentWidthHmTaxa = tempWidthHmTaxa;
              plotHeatmapTaxa(hmTaxaData,hmTaxaTaxa);
              // if (ctCard) {
              //   plotCompareTree(newCompareTree);
              // };
              // plotCompareTree(newCompareTree);
            }
        }

        });

    compareHmTaxaTopN = 10;

    d3.select("#compareHmTaxaTopN").on("change", function(){
      updateComparePlots(compareTreeDataGlobal);
    });

    d3.select("#compareHmTaxaTopN").on("input", function(){
      compareHmTaxaTopN = parseInt(this.value);
      d3.select("#compareHmTaxaTopNNum").text(compareHmTaxaTopN);
    });

    d3.select("#compareHmTaxaTopNNum").text(compareHmTaxaTopN);

    hmTaxaColourPalette = "blue";

    d3.selectAll("input[name='compareHmTaxaColour']").on("change", function(){
    hmTaxaColourPalette = this.value;
    plotHeatmapTaxa(hmTaxaData,hmTaxaTaxa);
    });

    d3.selectAll("input[name='compareHmTaxaMaxRectWidth']").on("change", function(){
      plotHeatmapTaxa(hmTaxaData,hmTaxaTaxa);
    });

    d3.selectAll("input[name='compareHmTaxaMaxRectWidth']").on("input", function(){
      hmTaxaMaxRectWidth = parseInt(this.value);
      d3.selectAll("#compareHmTaxaMaxRectWidthNum").text(hmTaxaMaxRectWidth);
    });

    hmTaxaMaxRectWidth = 80;

    d3.selectAll("#compareHmTaxaMaxRectWidthNum").text(hmTaxaMaxRectWidth);

    d3.selectAll("input[name='compareHmTaxaGrey']").on("change", function(){
      compareHmTaxaGrey = this.value;
      plotHeatmapTaxa(hmTaxaData,hmTaxaTaxa);
    });

    compareHmTaxaGrey = "off";

    d3.selectAll("input[name='compareHmTaxaRead']").on("change", function(){
      compareHmTaxaRead = this.value;
      plotHeatmapTaxa(hmTaxaData,hmTaxaTaxa);
    });

    compareHmTaxaRead = "percent";



};



var hmTaxaColourPalettes = {
  blue: ['white', '#227AB5'],
  viridis:["#430D54", "#482878", "#3E4A89", "#30688E", "#25828D", "#1F9E89", "#35B779", "#6DCD59", "#B4DE2C", "#FDE724"],
  magma:["#000004", "#180f3d", "#440f76", "#721f81", "#9e2f7f", "#cd4071", "#f1605d", "#fd9668", "#feca8d", "#fcfdbf"]
};

var marginHeatmapTaxa = {top: 30, right: 80, bottom: 30, left: 60},
  widthHeatmapTaxa = 960 - marginHeatmapTaxa.left - marginHeatmapTaxa.right,
  heightHeatmapTaxa = 450 - marginHeatmapTaxa.top - marginHeatmapTaxa.bottom;


function plotHeatmapTaxa(data,taxa) {

for (var [i, sample] of data.entries()){
  sample.index = i;
};

var heatmapTaxaWidth = $("#compareHeatmapTaxaPlot").width();
var maxWidth = heatmapTaxaWidth - marginHeatmapTaxa.left - marginHeatmapTaxa.right;

var taxaCount = taxa.length;
var sampleCount = data.length;


heightHeatmapTaxa = taxaCount * 24;

yScaleHmTaxa = d3.scale.ordinal()
  .rangeRoundBands([ heightHeatmapTaxa, 0 ]);

yAxisHmTaxa = d3.svg.axis()
  .scale(yScaleHmTaxa)
  .orient("left");

var yDomain = [];

for (var id of taxa) {
  yDomain.push(compareTaxaData[id]["name"]);
}

yScaleHmTaxa.domain(yDomain);

heatmapTaxaSvg.select("g.y.axis")
  .call(yAxisHmTaxa);

var yAxisWidth = heatmapTaxaSvg.select("g.y.axis")[0][0].getBBox().width;


widthHeatmapTaxa = sampleCount * hmTaxaMaxRectWidth;
if (widthHeatmapTaxa > maxWidth - yAxisWidth) {
  widthHeatmapTaxa = maxWidth - yAxisWidth;
  heatmapTaxaSvg.attr("transform","translate(" + (marginHeatmapTaxa.left + yAxisWidth) + "," + marginHeatmapTaxa.top + ")");
} else {
  heatmapTaxaSvg.attr("transform","translate(" + (heatmapTaxaWidth/2 - (widthHeatmapTaxa + yAxisWidth)/2 + yAxisWidth) + "," + marginHeatmapTaxa.top + ")");
}




var plotMaxValue = 0;



data.forEach(function(d) {
  var readCountToSubtractFromOther = 0;
  var propToSubtractFromOther = 0;
  d.taxa = taxa.map(function(ncbiID) {
    var name, readCount, rank, prop, plotValue;
    if (d[ncbiID]) {
      name = d[ncbiID]["name"];
      readCount = d[ncbiID]["value"];
      rank = d[ncbiID]["ncbiRank"];
      prop = d[ncbiID]["proportion"];

    } else {
      name = compareTaxaData[ncbiID]["name"];
      readCount = 0;
      rank = compareTaxaData[ncbiID]["ncbiRank"];
      prop = 0;

      if (checkNested(compareTaxaData, ncbiID, 'values', d.runId, d.sample, 'chartValue')) {
        readCount = compareTaxaData[ncbiID]["values"][d.runId][d.sample]["chartValue"];
        prop = readCount/d.totalReadCount;
        readCountToSubtractFromOther += readCount;
        propToSubtractFromOther += prop;
        };
    };

    if(compareHmTaxaRead == "percent") {
      plotValue = prop;
    } else {
      plotValue = readCount;
    };
    if (plotValue > plotMaxValue) {
      plotMaxValue = plotValue;
    };

    return {name: name, taxaReadCount: readCount, totalReadCount: d["totalReadCount"], sample: d.sample, ncbiRank: rank, index: d.index, proportion: prop, plotValue: plotValue};
  });

  var otherIndex = d["taxa"].findIndex(e => e.name == "Other");
  if (otherIndex != -1){
    d["taxa"][otherIndex]["taxaReadCount"] -= readCountToSubtractFromOther;
    d["taxa"][otherIndex]["proportion"] -= propToSubtractFromOther;
    if(compareHmTaxaRead == "percent") {
      d["taxa"][otherIndex]["plotValue"] = d["taxa"][otherIndex]["proportion"];
    } else {
      d["taxa"][otherIndex]["plotValue"] = d["taxa"][otherIndex]["taxaReadCount"];
    };
  }

});



var hmTaxaDomain = [];
var colourPaletteLength = hmTaxaColourPalettes[hmTaxaColourPalette].length;

for (var [i,col] of hmTaxaColourPalettes[hmTaxaColourPalette].entries()) {
  var domainVal = (plotMaxValue/(colourPaletteLength-1))*i;
  hmTaxaDomain.push(domainVal);
}

  var hmTaxaColour = d3.scale.linear()
    .range(hmTaxaColourPalettes[hmTaxaColourPalette])
    .domain(hmTaxaDomain);

  hmDefs.select("#hmTaxaLegendGradient").selectAll("stop").remove();

  hmTaxaLegendGradientStops = hmDefs.select("#hmTaxaLegendGradient").selectAll("stop")
  	.data(hmTaxaColour.range());


  hmTaxaLegendGradientStops.enter().append("stop")
  	.attr("offset", function(d,i) { return i/(hmTaxaColour.range().length-1); })
  	.attr("stop-color", function(d) { return d; });




  var xScaleHmTaxa = d3.scale.ordinal()
    .rangeRoundBands([ 0, widthHeatmapTaxa ]);

  var xAxisHmTaxa = d3.svg.axis()
      .scale(xScaleHmTaxa)
      .orient("bottom");

  xScaleHmTaxa.domain(data.map(function(d) {return d.index; }));

if (data.length <= 10){
  heatmapTaxaSvg.select("g.x.axis")
    .attr("transform", "translate(0," + heightHeatmapTaxa + ")")
    .call(xAxisHmTaxa)
    .selectAll("text")
      .text(function(d) { var finalText = stackedBarTextShrink(d,data); return finalText })
      .attr("dx", "0.5em")
      .attr("transform", "rotate(45)")
      .style("text-anchor", "start");
} else {
  heatmapTaxaSvg.select("g.x.axis")
    .attr("transform", "translate(0," + heightHeatmapTaxa + ")")
    .call(xAxisHmTaxa)
    .selectAll("text")
      .text(function(d) { var finalText = stackedBarTextShrink(d,data); return finalText })
      .attr("dy", "-0.25em")
      .attr("dx", "0.5em")
      .attr("transform", "rotate(90)")
      .style("text-anchor", "start");
}

      var xAxisHeight = heatmapTaxaSvg.select("g.x.axis")[0][0].getBBox().height;



    var sample = hmTaxaL1.selectAll(".sample")
        .data(data);

        sample.enter().append("g")
        .attr("class", "sample");

        sample.exit().remove();

    var rectanglesHmTaxa = sample.selectAll("rect")
        .data(function(d) {
          return d.taxa; });


      rectanglesHmTaxa.enter().append("rect");

      rectanglesHmTaxa.attr("x", function(d) { return xScaleHmTaxa(d.index) })
      .attr("y", function(d) { return yScaleHmTaxa(d.name) })
      .attr("width", xScaleHmTaxa.rangeBand())
      .attr("height", yScaleHmTaxa.rangeBand())
      .style("fill", function(d) {
        return ((compareHmTaxaGrey == "on" && d.plotValue == 0) ? "#D3D3D3" : hmTaxaColour(d.plotValue))
      });

      rectanglesHmTaxa.exit().remove();

      var maxLegendWidth = 250;

      var legendWidth = maxLegendWidth;
      if (widthHeatmapTaxa < maxLegendWidth) {
        legendWidth = widthHeatmapTaxa;
      };

    	var legendHeight = 10;

var legendXTransform = (widthHeatmapTaxa - legendWidth)/2;

var legendPlotMaxVal,
legendTitle;

if(compareHmTaxaRead == "percent"){
  legendPlotMaxVal = plotMaxValue*100;
  legendTitle = "Classified " + plotLevelSelectedCompareTooltipPrefix.toUpperCase().toLowerCase() + "s (%)";
} else {
  legendPlotMaxVal = plotMaxValue;
  legendTitle = "Classified " + plotLevelSelectedCompareTooltipPrefix.toUpperCase().toLowerCase() + "s";
}


      var legendXScale = d3.scale.linear()
      	 .range([0, legendWidth])
      	 .domain([0,legendPlotMaxVal]);

      var legendXAxis = d3.svg.axis()
      	  .orient("bottom")
      	  .ticks(3)
      	  .scale(legendXScale);


      hmTaxaLegend.select("rect")
      .attr("y", 10)
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#hmTaxaLegendGradient)");

      hmTaxaLegend.select("text")
      .text(legendTitle);

      var legendTextWidth = $("#hmTaxaLegend text")[0].getBBox().width;

      hmTaxaLegend.select("text")
      .attr("transform", "translate(" + (legendWidth - legendTextWidth)/2  + "," + 0 + ")");

      hmTaxaLegend.select("g.x.axis")
        .attr("transform", "translate(" + 0 + "," + (10 + legendHeight) + ")")
      	.call(legendXAxis)
        .selectAll("text")
          .text(function(d) { var finalText = thousandKilo(d); return finalText });

        var hmTaxaLegendHeight = $("#hmTaxaLegend")[0].getBBox().height;

        hmTaxaLegend
        	.attr("transform", "translate(" + legendXTransform + "," + -(hmTaxaLegendHeight) + ")");


      if (widthHeatmapTaxa > maxWidth - yAxisWidth) {
        heatmapTaxaSvg.attr("transform","translate(" + (marginHeatmapTaxa.left + yAxisWidth) + "," + (marginHeatmapTaxa.top + hmTaxaLegendHeight) + ")");
      } else {
        heatmapTaxaSvg.attr("transform","translate(" + (heatmapTaxaWidth/2 - (widthHeatmapTaxa + yAxisWidth)/2 + yAxisWidth) + "," + (marginHeatmapTaxa.top + hmTaxaLegendHeight) + ")");
      }

      d3.select("#compareHeatmapTaxaPlot>svg")
        .attr("height", heightHeatmapTaxa + xAxisHeight + hmTaxaLegendHeight + marginHeatmapTaxa.top + marginHeatmapTaxa.bottom);


          rectanglesHmTaxa.on("mousemove", function(d) {

            toolTipDiv.transition("HmTaxaToolTip")
               .duration(0)
               .style("opacity", .95);

            toolTipDiv.html("<small class='text-gray-800'>" + d.sample + "</small>" +
            "<h5 class='mb-0'>" + d.name + "</h5>" +
            "<small class='text-gray-800'>" + d.ncbiRank + "</small>" +
            "<hr class='toolTipLine'/>" + plotLevelSelectedCompareTooltipPrefix + "s: " + toolTipValueFormat(plotLevelSelectedCompareId,d.taxaReadCount) +
            "<br/>" + plotLevelSelectedCompareTooltipPrefix + " %: " + Math.round((d.proportion*10000))/100)
               .style("left", (tooltipPos(d3.event.pageX)) + "px")
               .style("top", (d3.event.pageY - 35) + "px");

          });

          rectanglesHmTaxa.on("mouseout", function(d) {


            toolTipDiv.transition("HmTaxaToolTip")
                .duration(50)
                .style("opacity", 0);

          });



};

function thousandKilo(num) {
var finalValue;

    if(num/1000000 > 1){
      finalValue = (num/1000000) + "M";
    } else if (num/1000 > 1){
      finalValue = (num/1000) + "k";
    } else {
      finalValue = num;
    }

    return finalValue;

};
