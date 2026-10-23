
var radius, pie, arc, outerArc, key, dashboardTaxaDonutUnclassified, dashboardTaxaDonutHigherTaxaNode;

function initialiseDashboardDonut() {

  var width = "350";
  var height = "350";

  donutSVG = d3.select("#dashboardTaxaDonutPlot")
    .append("svg")
    .attr("id","dashboardTaxaDonutPlotExport")
    .attr("height", height)
    .attr("width", width)
    .append("g")
    .attr("id","donutExport")
    .attr('transform', 'translate(' + width/2 +  ',' + height/2 +')');

donutSVG.append("g")
    .attr("class", "slices");


radius = Math.min(width, height) / 2;

pie = d3.layout.pie()
    .value(function(d) {
        return d.value;
    });

arc = d3.svg.arc()
    .outerRadius(radius * 0.8)
    .innerRadius(radius * 0.5);


key = function(d) {
    return d.data.label;
    };


    dashboardTaxaDonutTopN = 10;

    d3.selectAll("input[name='dashboardTaxaDonutTopN']").on("change", function(){
      // donutUpdate(returnTopTaxa(donutNodes));
      globUpdate(globDonutData);
    });

    d3.selectAll("input[name='dashboardTaxaDonutTopN']").on("input", function(){
      dashboardTaxaDonutTopN = d3.select(this).property("value");
      d3.selectAll("input[name='dashboardTaxaDonutTopN']").property("value",dashboardTaxaDonutTopN);
      d3.selectAll(".dashboard-taxa-donut-top-n").text(dashboardTaxaDonutTopN);
    });

      d3.selectAll(".dashboard-taxa-donut-top-n").text(dashboardTaxaDonutTopN);

      d3.selectAll("input[name='dashboardTaxaDonutUnclassified']").on("change", function() {
        dashboardTaxaDonutUnclassified = this.checked ? 'show' : 'hide';
        globUpdate(globDonutData);
      });

      d3.selectAll("input[name='dashboardTaxaDonutHigherTaxaNode']").on("change", function() {
        dashboardTaxaDonutHigherTaxaNode = this.checked ? 'show' : 'hide';
        globUpdate(globDonutData);
      });

      dashboardTaxaDonutUnclassified = "show";
      dashboardTaxaDonutHigherTaxaNode = "show";

};

function donutAncestorsOff() {
  donutNodes = globNodes.filter(function(d){
  if (d.rank == taxonomicRankSelected){
         return d;
       }
     });
};

function donutAncestorsOn() {
  donutNodes = globNodes.filter(function(d){
  if (d.rank <= taxonomicRankSelected){
         return d;
       }
       });
};

var minorTransition = 200;

var dashboardTaxaDonutTopN = 10;



function findOtherIndex(item) {
  if (item.label == "Other"){
    return item;
  }
};


function indexOfDonutOtherCategory(){
      return findWithAttr(topTaxaDonutArray,"label","Other");
};





function returnTopTaxa(data) {



  sorted = data.sort(function(a, b) {
      return b.donutValue - a.donutValue
  })

    var thresholdSelected = dashboardTaxaDonutTopN;

    for (const [i,taxa] of sorted.entries()) {
      if(i < thresholdSelected) {
        taxa.threshold = taxa.ncbiID.toString();
      } else {
        taxa.threshold = "Other";
      };


    };


    topTaxaDonutArray = d3.nest()
        .key(function(d) {
            return d.threshold;
        })
        .rollup(function(v) {
            return {
              thresholdName: thresholdName(v),
              ncbiRank: rank(v),
              ncbiID: ncbiID(v),
              donutValue: d3.sum(v, function(d) {
                return d.donutValue;
              }),
              percOfRootTotal: d3.sum(v, function(d) {
                return d.percOfRootTotal;
              })
          }
        })
        .entries(sorted)
        .map(function(g) {
            return {
                label: g.values.thresholdName,
                value: g.values.donutValue,
                ncbiRank: g.values.ncbiRank,
                ncbiID: g.values.ncbiID,
                percOfRootTotal: g.values.percOfRootTotal
            }
        })
        .sort(function(a, b) {
            return b.value - a.value
        });


    return topTaxaDonutArray;
};


var dashboardDonutColor = dashboardPlotColorPalette;


function donutUpdate(data) {


  // dashboardDonutColor = dashboardPlotColorPalette;
  dashboardDonutColor = d3.scale.ordinal()
    .range(colourPalettes[selectedPalette]);

    var dataSum = d3.sum(data, function(d) {
        return d.value;
    });


    var legendItems = [];



    for (taxa of data) {
      if (taxa.value != 0) {
        legendItems.push(taxa);
      };
    };

    /* ------- PIE SLICES -------*/
    var slice = donutSVG.select(".slices").selectAll("path.slice")
        .data(pie(data), key);


    slice.enter()
        .insert("path")
        .style("fill", "white")
        .style("stroke", "white")
        .style("stroke-width", "0.5")
        .attr("class", "slice");

    slice.transition()
        .duration(500)
        .attrTween("d", function(d) {
            this._current = this._current || d;
            var interpolate = d3.interpolate(this._current, d);
            this._current = interpolate(0);
            return function(t) {
                return arc(interpolate(t));
            };
        })
        .style("fill", function(d, i) {
            return dashboardDonutColor(i % dashboardColorIndex);
        });




    slice.exit()
        .remove();


    var dashboardTaxaDonutLegend = d3.select("#dashboardTaxaDonutLegend").selectAll(".taxaDonutLegend")
        .data(legendItems);

        var dashboardTaxaDonutLegendEnter = dashboardTaxaDonutLegend.enter().append("svg")
            .attr("class", "taxaDonutLegend d-md-block")
            .attr("height", 20)
            .append("g");

        dashboardTaxaDonutLegendEnter.append("rect")
            .attr("width", 20)
            .attr("height", 20)
            .style("fill", "black");

        dashboardTaxaDonutLegendEnter.append("text")
            .attr("x", 24)
            .attr("y", 9)
            .style("font-size", "1.1em")
            .attr("dy", ".356em");

        dashboardTaxaDonutLegend.select("g rect")
          .style("fill", function(d, i) {
              return dashboardDonutColor(i % dashboardColorIndex);
          });

        dashboardTaxaDonutLegend.select("g text")
          .style("text-anchor", "start")
          .text(function(d) { return d.label; });

        dashboardTaxaDonutLegend
          .attr("width",function(d) { var getWidth = this.firstChild.getBBox().width + 10; if (getWidth != 10) { return getWidth;} else {return "200"} });

        dashboardTaxaDonutLegend.exit().remove();



        var allSlices = donutSVG.select(".slices").selectAll("path.slice");
        var hoverDuration = 150;
        allSlices.interrupt("donutSlice")
            .style("opacity", 1).style("stroke", "white").style("stroke-width", "0.5px");
        dashboardTaxaDonutLegend.interrupt("donutSlice").style("opacity", 1);
        dashboardTaxaDonutLegend.select("g text")
            .classed("hoverDonutPlotTextHighlight", false);

        function taxonKey(d) {
            return d.ncbiID == "n/a" ? "label:" + d.label : "id:" + d.ncbiID;
        }

        function highlightTaxon(selectedKey) {
            allSlices.interrupt("donutSlice")
                .style("stroke", "white").style("stroke-width", "0.5px");
            allSlices.filter(function(d) { return taxonKey(d.data) == selectedKey; })
                .style("opacity", 1)
                .style("stroke", "#1f1f1f").style("stroke-width", "1.5px");
            allSlices.filter(function(d) { return taxonKey(d.data) != selectedKey; })
                .transition("donutSlice").duration(hoverDuration).style("opacity", 0.3);

            dashboardTaxaDonutLegend.interrupt("donutSlice");
            dashboardTaxaDonutLegend.filter(function(d) { return taxonKey(d) == selectedKey; })
                .style("opacity", 1);
            dashboardTaxaDonutLegend.filter(function(d) { return taxonKey(d) != selectedKey; })
                .transition("donutSlice").duration(hoverDuration).style("opacity", 0.3);
            dashboardTaxaDonutLegend.select("g text")
                .classed("hoverDonutPlotTextHighlight", function(d) {
                    return taxonKey(d) == selectedKey;
                });
            dashboardTaxaDonutLegend.filter(function(d) { return taxonKey(d) == selectedKey; })
                .attr("width", function() { return this.firstChild.getBBox().width + 10; });
        }

        function clearTaxonHighlight() {
            allSlices.interrupt("donutSlice")
                .style("stroke", "white").style("stroke-width", "0.5px")
                .transition("donutSlice").duration(hoverDuration).style("opacity", 1);
            dashboardTaxaDonutLegend.interrupt("donutSlice")
                .transition("donutSlice").duration(hoverDuration).style("opacity", 1);
            dashboardTaxaDonutLegend.select("g text")
                .classed("hoverDonutPlotTextHighlight", false);
        }

        function showTaxonTooltip(d) {
            toolTipDiv.interrupt().style("opacity", .95)
                .html("<h5 class='mb-0'>" + d.data.label + "</h5><small class='text-gray-800'>" + d.data.ncbiRank +
                "</em></small><hr class='toolTipLine'/>" + plotLevelSelectorDashboardObject[plotLevelSelectedDashboardId].prefix + "s: " + toolTipValueFormat(plotLevelSelectedDashboardId, d.value) +
                "<br/>Donut %: " + Math.round(((d.value / dataSum) * 10000)) / 100 +
                "<br/>% of analysed: " + Math.round(d.data.percOfRootTotal * 100) / 100)
                .style("left", tooltipPos(d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 35) + "px");
        }

        allSlices
            .on("mouseover", function(d) {
                highlightTaxon(taxonKey(d.data));
                showTaxonTooltip(d);
            })
            .on("mousemove", showTaxonTooltip)
            .on("mouseout", function() {
                clearTaxonHighlight();
                toolTipDiv.interrupt().style("opacity", 0);
            });

        dashboardTaxaDonutLegend
            .on("mouseover", function(d) { highlightTaxon(taxonKey(d)); })
            .on("mouseout", clearTaxonHighlight);


updateTaxTableColors();

};
var donutOpacityTransitionTime = 250;
