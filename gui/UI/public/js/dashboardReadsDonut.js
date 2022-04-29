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

      slice.transition()
          .duration(1000)
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


          dashboardReadsDonutLegend.on("mouseover", function(d, i) {

          slice.filter(function(x) {
              if (x.data.label == d.label) {
                  d3.select(this).classed("hoverRect", true);
              };
          });

            d3.select(this).select("g rect").classed("hoverRect", true);
            // d3.select(this).select("g text").style("font-weight", "bold");
            d3.select(this).select("g text").classed("hoverDonutPlotTextHighlight", true);

          });

          dashboardReadsDonutLegend.on("mouseout", function(d, i) {

          slice.filter(function(x) {
              if (x.data.label == d.label) {
                  d3.select(this).classed("hoverRect", false);
              };
          });

            d3.select(this).select("g rect").classed("hoverRect", false);
            // d3.select(this).select("g text").style("font-weight", "normal");
            d3.select(this).select("g text").classed("hoverDonutPlotTextHighlight", false);

          });

          slice.on("mouseover", function(d) {

            dashboardReadsDonutLegend.filter(function(x) {
                if (d.data.label == x.label) {
                    d3.select(this).select("rect").classed("hoverRect", true);
                    // d3.select(this).select("text").style("font-weight", "bold");
                    d3.select(this).select("text").classed("hoverDonutPlotTextHighlight", true);
                };
            });

              d3.select(this).classed("hoverRect", true);

          });



          slice.on("mouseout", function(d, i) {

            dashboardReadsDonutLegend.filter(function(x) {
                if (d.data.label == x.label) {
                    d3.select(this).select("rect").classed("hoverRect", false);
                    // d3.select(this).select("text").style("font-weight", "normal");
                    d3.select(this).select("text").classed("hoverDonutPlotTextHighlight", false);
                };
            });

          d3.select(this).classed("hoverRect", false);

          });

};
