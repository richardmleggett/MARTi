var readsDonutSVG,readsArc;

function initialiseReadsDonut() {

  var width = "175";
  var height = "175";

  readsDonutSVG = d3.select("#dashboardReadsDonutPlot")
    .append("svg")
    .attr("height", height)
    .attr("width", width)
    .append("g")
    .attr('transform', 'translate(' + width/2 +  ',' + height/2 +')');

    readsDonutSVG.append("g")
        .attr("class", "slices");

    var readsRadius = Math.min(width, height) / 2;

    readsArc = d3.svg.arc()
      .outerRadius(readsRadius * 0.8)
      .innerRadius(readsRadius * 0.5);


    // d3.select("#dashboardReadsDonutSelect").on("change", function(){
    //   dropdownGeneListSelected = d3.select(this).property("value");
    //   plotReadsDonut(dashboardReadsReponseData);
    // });
    //
    // d3.select("#dashboardReadsDonutTopN").on("change", function(){
    //   plotReadsDonut(dashboardReadsReponseData);
    // });
    //
    // d3.select("#dashboardReadsDonutTopN").on("input", function(){
    //   dashboardReadsDonutTopN = d3.select(this).property("value");
    //   $("#dashboardReadsDonutTopNNum").text(dashboardReadsDonutTopN);
    // });
    //
    //   $("#dashboardReadsDonutTopNNum").text(dashboardReadsDonutTopN);
};



var readsPie = d3.layout.pie()
    .value(function(d) {
        return d.value;
    });

var key = function(d) {
    return d.data.label;
    };

var readsDonutColor = d3.scale.ordinal()
    .range(['#33a02c','#1f78b4','#ff7f00','#e31a1c']);


var dropdownGeneList = [];
var dropdownGeneListSelected = "All genes";
var dashboardAmrDonutTopN = 10;


function plotReadsDonut(data) {



    var passedFilterAwaitingAnalysis = data.readsPassedFilter - data.readsAnalysed;
    var awaitingFilter = data.readsPassBasecall - (data.readsFailedFilter + data.readsPassedFilter);


    var plotData = [
    {label: "Passed filter and analysed", value: data.readsAnalysed},
    {label: "Passed filter, awaiting analysis", value: passedFilterAwaitingAnalysis},
    {label: "Awaiting filter", value: awaitingFilter},
    {label: "Failed filter", value: data.readsFailedFilter}
    ];


  var legendItems = [];

  for (taxa of plotData) {
      legendItems.push(taxa.label);
  };




  var dataMax = d3.max(plotData, function(d) {
      return d.value;
  });
  var dataSum = d3.sum(plotData, function(d) {
      return d.value;
  });



  var slice = readsDonutSVG.select(".slices").selectAll("path.slice")
      .data(readsPie(plotData), key);

      slice.enter()
          .insert("path")
          .style("fill", "white")
          .style("stroke", "white")
          .style("stroke-width", "0.5")
          .attr("class", "slice");

      slice.transition("dashboardReadsDonutSliceTrans")
          .duration(500)
          .attrTween("d", function(d) {
              this._current = this._current || d;
              var interpolate = d3.interpolate(this._current, d);
              this._current = interpolate(0);
              return function(t) {
                  return readsArc(interpolate(t));
              };
          })
          .style("fill", function(d) {
              return readsDonutColor(d.data.label);
          });


      slice.exit()
          .remove();





      var dashboardReadsDonutLegend = d3.select("#dashboardReadsDonutLegend").selectAll(".readsDonutLegend")
          .data(plotData);
          // .data(legendItems);

          var dashboardReadsDonutLegendEnter = dashboardReadsDonutLegend.enter().append("svg")
              .attr("class", "readsDonutLegend d-block")
              .attr("height", 40)
              .append("g");

          dashboardReadsDonutLegendEnter.append("rect")
              .attr("width", 20)
              .attr("height", 20)
              .style("fill", "black");

          dashboardReadsDonutLegendEnter.append("text")
              .attr("x", 24)
              .attr("y", 9)
              .style("font-size", "1em")
              .style("fill", "#858796")
              .attr("dy", ".356em")
              .attr("class","readClass");

          dashboardReadsDonutLegendEnter.append("text")
              .attr("x", 24)
              .attr("y", 9)
              .style("font-size", "1em")
              .style("fill", "black")
              .attr("dy", "1.456em")
              .attr("class","readInfo");

          dashboardReadsDonutLegend.select("g rect")
            .style("fill", function(d) {return readsDonutColor(d.label); });

          dashboardReadsDonutLegend.select("g text.readClass")
            .style("text-anchor", "start")
            .text(function(d) { return d.label; });

          dashboardReadsDonutLegend.select("g text.readInfo")
            .style("text-anchor", "start")
            .text(function(d) { return thousandsSeparators(d.value) + " reads (" + Math.round(((d.value / dataSum) * 10000)) / 100 + "%)"; });

          dashboardReadsDonutLegend
            .attr("width",function(d) { return this.firstChild.getBBox().width + 10; });

          dashboardReadsDonutLegend.exit().remove();


          var allSlices = readsDonutSVG.select(".slices").selectAll("path.slice");
          var hoverDuration = 150;
          allSlices.interrupt("donutSlice")
              .style("opacity", 1).style("stroke", "white").style("stroke-width", "0.5px");
          dashboardReadsDonutLegend.interrupt("donutSlice").style("opacity", 1);
          dashboardReadsDonutLegend.select("g text.readClass")
              .classed("hoverDonutPlotTextHighlight", false);

          function highlightReadClass(label) {
              allSlices.interrupt("donutSlice")
                  .style("stroke", "white").style("stroke-width", "0.5px");
              allSlices.filter(function(d) { return d.data.label == label; })
                  .style("opacity", 1)
                  .style("stroke", "#1f1f1f").style("stroke-width", "1.5px");
              allSlices.filter(function(d) { return d.data.label != label; })
                  .transition("donutSlice").duration(hoverDuration).style("opacity", 0.3);

              dashboardReadsDonutLegend.interrupt("donutSlice");
              dashboardReadsDonutLegend.filter(function(d) { return d.label == label; })
                  .style("opacity", 1);
              dashboardReadsDonutLegend.filter(function(d) { return d.label != label; })
                  .transition("donutSlice").duration(hoverDuration).style("opacity", 0.3);
              dashboardReadsDonutLegend.select("g text.readClass")
                  .classed("hoverDonutPlotTextHighlight", function(d) { return d.label == label; });
          }

          function clearReadClassHighlight() {
              allSlices.interrupt("donutSlice")
                  .style("stroke", "white").style("stroke-width", "0.5px")
                  .transition("donutSlice").duration(hoverDuration).style("opacity", 1);
              dashboardReadsDonutLegend.interrupt("donutSlice")
                  .transition("donutSlice").duration(hoverDuration).style("opacity", 1);
              dashboardReadsDonutLegend.select("g text.readClass")
                  .classed("hoverDonutPlotTextHighlight", false);
          }

          function showReadClassTooltip(d) {
              toolTipDiv.interrupt().style("opacity", .95)
                  .html("<h5 class='mb-0'>" + d.data.label + "</h5>Reads: " +
                      thousandsSeparators(d.data.value) +
                      "<br/>Donut %: " + (dataSum ? Math.round(d.data.value / dataSum * 10000) / 100 : 0))
                  .style("left", tooltipPos(d3.event.pageX) + "px")
                  .style("top", (d3.event.pageY - 35) + "px");
          }

          dashboardReadsDonutLegend
              .on("mouseover", function(d) { highlightReadClass(d.label); })
              .on("mouseout", clearReadClassHighlight);
          allSlices
              .on("mouseover", function(d) {
                  highlightReadClass(d.data.label);
                  showReadClassTooltip(d);
              })
              .on("mousemove", showReadClassTooltip)
              .on("mouseout", function() {
                  clearReadClassHighlight();
                  toolTipDiv.interrupt().style("opacity", 0);
              });

};
