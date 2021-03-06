var amrDonutSVG,amrArc;

function initialiseAmrDonut() {

  var width = "350";
  var height = "350";

  amrDonutSVG = d3.select("#dashboardAmrDonutPlot")
    .append("svg")
    .attr("id","dashboardAmrDonutPlotExport")
    // .attr("viewBox", function() {
    //   var x = 0-width/2;
    //   var y = 0-height/2;
    //     return x + " " + y + " " + width + " " + height;
    // })
    .attr("height", height)
    .attr("width", width)
    .append("g")
    .attr('transform', 'translate(' + width/2 +  ',' + height/2 +')');

    amrDonutSVG.append("g")
        .attr("class", "slices");

    var amrRadius = Math.min(width, height) / 2;

    amrArc = d3.svg.arc()
      .outerRadius(amrRadius * 0.8)
      .innerRadius(amrRadius * 0.5);

      dropdownGeneListSelected = "All genes";

    d3.select("#dashboardAmrDonutAmrSelect").on("change", function(){
      dropdownGeneListSelected = d3.select(this).property("value");
      plotAmrDonut(dashboardAmrReponseData);
    });

    d3.select("#dashboardAmrDonutTopN").on("change", function(){
      // dashboardAmrDonutTopN = d3.select(this).property("value");
      plotAmrDonut(dashboardAmrReponseData);
    });

    dashboardAmrDonutTopN = 10;

    d3.select("#dashboardAmrDonutTopN").on("input", function(){
      dashboardAmrDonutTopN = d3.select(this).property("value");
      $("#dashboardAmrDonutTopNNum").text(dashboardAmrDonutTopN);
    });

      $("#dashboardAmrDonutTopNNum").text(dashboardAmrDonutTopN);
};



var amrPie = d3.layout.pie()
    .value(function(d) {
        return d.value;
    });

var key = function(d) {
    return d.data.label;
    };

// var amrDonutColor = d3.scale.ordinal()
//     .range(['#a6cee3', '#1f78b4', '#b2df8a', '#33a02c', '#fb9a99', '#e31a1c', '#fdbf6f', '#ff7f00', '#cab2d6', '#6a3d9a', '#ffed75']);

  var amrDonutColor = dashboardPlotColorPalette;


    function topTaxaAmr(data) {

        var taxaSeparateCounts = [];
        for (const gene of data.geneList) {

          for (const [taxa,counts] of Object.entries(gene.species)) {

            if (counts.hasOwnProperty(dashboardAmrTableChunkSelected)) {
              var speciesCountAtChunk = counts[dashboardAmrTableChunkSelected];
            } else {
              var highestChunk = 0;
              for (const [chunk, count] of Object.entries(counts)) {
                if (chunk < dashboardAmrTableChunkSelected) {
                  var highestChunk = chunk;
                } else {
                  break;
                }
              }
              if (counts.hasOwnProperty(highestChunk)) {
                var speciesCountAtChunk = counts[highestChunk];
              } else {
                var speciesCountAtChunk = "0";
              }

            };

            taxaSeparateCounts.push({
              taxaName: taxa,
              count: speciesCountAtChunk
            });
          };
        };


        var taxaConsolidatedCounts = d3.nest()
            .key(function(d) {
                return d.taxaName;
            })
            .rollup(function(v) {
                return d3.sum(v, function(d) {
                    return d.count;
                });
            })
            .entries(taxaSeparateCounts)
            .map(function(g) {
                return {
                    taxaName: g.key,
                    count: g.values
                }
            })
            .sort(function(a, b) {
                return b.count - a.count
            });


        var thresholdSelected = dashboardAmrDonutTopN;

        for (const [i,taxa] of taxaConsolidatedCounts.entries()) {
          if(i < thresholdSelected) {
            taxa.threshold = taxa.taxaName;
          } else {
            taxa.threshold = "Other";
          };
        };


        var topTaxaArray = d3.nest()
            .key(function(d) {
                return d.threshold;
            })
            .rollup(function(v) {
                return d3.sum(v, function(d) {
                    return d.count;
                });
            })
            .entries(taxaConsolidatedCounts)
            .map(function(g) {
                return {
                    label: g.key,
                    value: g.values
                }
            })
            .sort(function(a, b) {
                return b.value - a.value
            });

        return topTaxaArray;
};

var dropdownGeneList = [];
var dropdownGeneListSelected = "All genes";
var dashboardAmrDonutTopN = 10;


function plotAmrDonut(data) {

amrDonutColor = dashboardPlotColorPalette;

dropdownGeneList = [];


  var newData = JSON.parse(JSON.stringify(data));



var plotData = [];


  for (const [i,gene] of data.geneList.entries()) {
    var geneInChunkList = false;
    if (gene.averageAccuracy.hasOwnProperty(dashboardAmrTableChunkSelected) && gene.speciesCounts.length > 0) {
      dropdownGeneList.push(gene.cardId);
      geneInChunkList = true;
    } else {
      for (var chunk of Object.keys(gene.averageAccuracy)) {
        chunk = parseInt(chunk);
        if (chunk < dashboardAmrTableChunkSelected && gene.speciesCounts.length > 0) {
          dropdownGeneList.push(gene.cardId);
          geneInChunkList = true;
          break
        } else {
          break;
        }
      }
    }

    if (gene.cardId == dropdownGeneListSelected && geneInChunkList) {
      newData.geneList = [data.geneList[i]];
      plotData = topTaxaAmr(newData);
    };


  };


  // if (gene.name == dropdownGeneListSelected) {
  //   newData.geneList = [data.geneList[i]];
  //   plotData = topTaxaAmr(newData);
  // };

  if (plotData.length == 0) {
    plotData = topTaxaAmr(data);
  };


  dropdownGeneList.sort().unshift("All genes");

  var legendItems = [];

  for (taxa of plotData) {
    if (taxa.value != 0) {
      legendItems.push(taxa.label);
    };
  };


d3.select("#dashboardAmrDonutAmrSelect").selectAll("option").remove();

  var geneOptions = d3.select("#dashboardAmrDonutAmrSelect").selectAll("option")
      .data(dropdownGeneList);

      geneOptions.enter()
          .append("option")
          .text(function(d) {return d;});

      geneOptions.exit()
          .remove();

$('#dashboardAmrDonutAmrSelect option:contains(' + dropdownGeneListSelected + ')').prop({selected: true});

  var dataMax = d3.max(plotData, function(d) {
      return d.value;
  });
  var dataSum = d3.sum(plotData, function(d) {
      return d.value;
  });



  var slice = amrDonutSVG.select(".slices").selectAll("path.slice")
      .data(amrPie(plotData), key);

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
                  return amrArc(interpolate(t));
              };
          })
          // .style("fill", function(d) {
          //     return amrDonutColor(d.data.label);
          // });
          .style("fill", function(d, i) {
              return amrDonutColor(i % dashboardColorIndex);
          });

      slice.exit()
          .remove();



      var dashboardAmrDonutLegend = d3.select("#dashboardAmrDonutLegend").selectAll(".amrDonutLegend")
          .data(legendItems);

          var dashboardAmrDonutLegendEnter = dashboardAmrDonutLegend.enter().append("svg")
              .attr("class", "amrDonutLegend d-md-block")
              .attr("height", 20)
              .append("g");

          dashboardAmrDonutLegendEnter.append("rect")
              .attr("width", 20)
              .attr("height", 20)
              .style("fill", "black");

          dashboardAmrDonutLegendEnter.append("text")
              .attr("x", 24)
              .attr("y", 9)
              .style("font-size", "1.1em")
              .attr("dy", ".356em");

          dashboardAmrDonutLegend.select("g rect")
            // .style("fill", function(d) {return amrDonutColor(d); });
            .style("fill", function(d, i) {
                return amrDonutColor(i % dashboardColorIndex);
            });

          dashboardAmrDonutLegend.select("g text")
            .style("text-anchor", "start")
            .text(function(d) { return d; });

          dashboardAmrDonutLegend
            .attr("width",function(d) { return this.firstChild.getBBox().width + 10; });

          dashboardAmrDonutLegend.exit().remove();


          slice.on("mousemove", function(d) {

            toolTipDiv.style("opacity", .95)
                .html("<h5 class='mb-0'>" + d.data.label + "</h5>" +
                "<hr class='toolTipLine'/>Read count: " + thousandsSeparators(d.value) +
                // "<br/>Summed read count: " + thousandsSeparators(d.summedValue))
                "<br/>Read %: " + Math.round(((d.value / dataSum) * 10000)) / 100)
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 35) + "px");

          });

          slice.on("mouseover", function(d, i) {
              d3.select(this).classed("goldFill", true);


              dashboardAmrDonutLegend.filter(function(x) {
                  if (d.data.label == x) {
                    d3.select(this).select("rect").classed("goldFill", true);
                    d3.select(this).select("g text").classed("hoverDonutPlotTextHighlight", true);
                  };
              });


          });

          slice.on("mouseout", function(d, i) {
              d3.select(this).classed("goldFill", false);


              dashboardAmrDonutLegend.filter(function(x) {
                  if (d.data.label == x) {
                    d3.select(this).select("rect").classed("goldFill", false);
                    d3.select(this).select("g text").classed("hoverDonutPlotTextHighlight", false);
                  };
              });

              toolTipDiv.style("opacity", 0);

          });

          dashboardAmrDonutLegend.on("mouseover", function(d, i) {

          slice.filter(function(x) {
              if (x.data.label == d) {
                  d3.select(this).classed("goldFill", true);
              };
          });

            d3.select(this).select("g rect").classed("goldFill", true);
            d3.select(this).select("g text").classed("hoverDonutPlotTextHighlight", true);

          });

          dashboardAmrDonutLegend.on("mouseout", function(d, i) {

          slice.filter(function(x) {
              if (x.data.label == d) {
                  d3.select(this).classed("goldFill", false);
              };
          });

            d3.select(this).select("g rect").classed("goldFill", false);
            d3.select(this).select("g text").classed("hoverDonutPlotTextHighlight", false);

          });


};
