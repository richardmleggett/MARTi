var amrDonutSVG,amrArc;

function initialiseAmrDonut() {

  var width = 350;
  var height = 350;

  amrDonutSVG = d3.select("#dashboardAmrDonutPlot")
    .append("svg")
    .attr("id","dashboardAmrDonutPlotExport")
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

      dropdownListSelected = "All genes";


    d3.selectAll(".amr-donut-plot-by>select").on("change", function(){
      dropdownListSelected = d3.select(this).property("value");
      plotAmrDonut(dashboardAmrReponseData);
    });


    dashboardAmrDonutPlotBy = "Gene";

  d3.select("#dashboardAmrDonutPlotBy").on("change", function(){
    dashboardAmrDonutPlotBy = d3.select(this).property("value");

    switch(dashboardAmrDonutPlotBy) {
      case "Drug class":

      dropdownListSelected = "All classes";

        break;
      case "Resistance mechanism":

      dropdownListSelected = "All mechanisms";

        break;
      default:

    dropdownListSelected = "All genes";
    };

    plotAmrDonut(dashboardAmrReponseData);
  });

    d3.select("#dashboardAmrDonutTopN").on("change", function(){
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


  // var amrDonutColor = dashboardPlotColorPalette;
  var amrDonutColor;

function returnTaxaSeperateCounts(data){

  var taxaSeparateCounts = [];

if (Array.isArray(data)){

  for (const taxa of data) {
    var counts = taxa.chunkCounts;
    var speciesCountAtChunk = 0;
    if (counts.hasOwnProperty(dashboardAmrTableChunkSelected)) {
      speciesCountAtChunk = counts[dashboardAmrTableChunkSelected];
    } else {
      var highestChunk = 0;
      for (const [chunk, count] of Object.entries(counts)) {
        if (chunk < dashboardAmrTableChunkSelected) {
          var highestChunk = chunk;
        } else {
          break;
        }
      }
      if (highestChunk !== 0){
        speciesCountAtChunk = counts[highestChunk];
      }

    };

    taxaSeparateCounts.push({
      taxaName: taxa.name,
      count: speciesCountAtChunk
    });
  };

} else {

  for (const [taxa,counts] of Object.entries(data)) {
    var speciesCountAtChunk = 0;
    if (counts.hasOwnProperty(dashboardAmrTableChunkSelected)) {
      speciesCountAtChunk = counts[dashboardAmrTableChunkSelected];
    } else {
      var highestChunk = 0;
      for (const [chunk, count] of Object.entries(counts)) {
        if (chunk < dashboardAmrTableChunkSelected) {
          var highestChunk = chunk;
        } else {
          break;
        }
      }
      if (highestChunk !== 0){
        speciesCountAtChunk = counts[highestChunk];
      }

    };

    taxaSeparateCounts.push({
      taxaName: taxa,
      count: speciesCountAtChunk
    });
  };

}
  return taxaSeparateCounts;
}

    function topTaxaAmrByOther(data,plotBy) {

      var drugClassSpeciesCounts = {};

      for (const gene of data.geneList) {
        var taxaSeparateCounts = returnTaxaSeperateCounts(gene.species);

        var drugClassArray = gene[plotBy].split(";");

          for (const drugClass of drugClassArray) {
            if (!drugClassSpeciesCounts.hasOwnProperty(drugClass)){
              drugClassSpeciesCounts[drugClass] = taxaSeparateCounts;
            } else {
              drugClassSpeciesCounts[drugClass] = drugClassSpeciesCounts[drugClass].concat(taxaSeparateCounts);
            }

          };
        };


        var countsArray = [];


        for (const [drugClass,counts] of Object.entries(drugClassSpeciesCounts)) {
          var countSum = d3.sum(counts, function(d) {
              return d.count;
          });
          if(countSum > 0){
            dropdownList.push(drugClass);
          };
        };

        var tempDropdownListSelected;

        if (!dropdownList.includes(dropdownListSelected)){
          tempDropdownListSelected = "All classes";
        } else {
          tempDropdownListSelected = dropdownListSelected;
        }

        if (tempDropdownListSelected == "All classes"){
          for (const [drugClass,counts] of Object.entries(drugClassSpeciesCounts)) {
            countsArray = countsArray.concat(counts);
          }


        } else {

          countsArray = countsArray.concat(drugClassSpeciesCounts[dropdownListSelected]);

        }


        var taxaConsolidatedCounts = d3.nest()
            .key(function(d) {
                return d.taxaName;
            })
            .rollup(function(v) {
                return d3.sum(v, function(d) {
                    return d.count;
                });
            })
            .entries(countsArray)
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


    function topTaxaAmr(data) {

        var taxaSeparateCounts = [];
        for (const gene of data.geneList) {
          taxaSeparateCounts = taxaSeparateCounts.concat(returnTaxaSeperateCounts(gene.species));
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

var dropdownListSelected = "All genes";
var dashboardAmrDonutPlotBy = "Gene";
var dashboardAmrDonutPlotByList = [];
var dashboardAmrDonutTopN = 10;


var dropdownList = [];



function plotAmrDonut(data) {


var dashboardAmrDonutPlotByListOptions = [{plotByProp:"drugClass",name:"Drug class"},{plotByProp:"resistanceMechanism",name:"Resistance mechanism"}]
dashboardAmrDonutPlotByList = [];

for (const option of dashboardAmrDonutPlotByListOptions) {
  if (data.geneList[0].hasOwnProperty(option.plotByProp)) {
    dashboardAmrDonutPlotByList.push(option.name);
  }
}

dashboardAmrDonutPlotByList.unshift("Gene");

d3.select("#dashboardAmrDonutPlotBy").selectAll("option").remove();

  var plotByOptions = d3.select("#dashboardAmrDonutPlotBy").selectAll("option")
      .data(dashboardAmrDonutPlotByList);

      plotByOptions.enter()
          .append("option")
          .text(function(d) {return d;});

      plotByOptions.exit()
          .remove();

$('#dashboardAmrDonutPlotBy option:contains(' + dashboardAmrDonutPlotBy + ')').prop({selected: true});



amrDonutColor = d3.scale.ordinal()
    .range(colourPalettes[selectedPalette]);




  var newData = JSON.parse(JSON.stringify(data));


dropdownList = [];

var plotData = [];

$(".amr-donut-plot-by").hide();

switch(dashboardAmrDonutPlotBy) {
  case "Drug class":

  $("#dashboardAmrDonutDrugClassSelect").parent().show();

  // dropdownListSelected = "All classes";
  plotData = topTaxaAmrByOther(newData,"drugClass");

  dropdownList.sort().unshift("All classes");

  d3.select("#dashboardAmrDonutDrugClassSelect").selectAll("option").remove();

  var geneOptions = d3.select("#dashboardAmrDonutDrugClassSelect").selectAll("option")
      .data(dropdownList);

      geneOptions.enter()
          .append("option")
          .text(function(d) {return d;});

      geneOptions.exit()
          .remove();

  $('#dashboardAmrDonutDrugClassSelect option:contains(' + dropdownListSelected + ')').prop({selected: true});

    break;
  case "Resistance mechanism":

    $("#dashboardAmrDonutResMechSelect").parent().show();

    plotData = topTaxaAmrByOther(newData,"resistanceMechanism");

    dropdownList.sort().unshift("All mechanisms");

    d3.select("#dashboardAmrDonutResMechSelect").selectAll("option").remove();

    var geneOptions = d3.select("#dashboardAmrDonutResMechSelect").selectAll("option")
        .data(dropdownList);

        geneOptions.enter()
            .append("option")
            .text(function(d) {return d;});

        geneOptions.exit()
            .remove();

    $('#dashboardAmrDonutResMechSelect option:contains(' + dropdownListSelected + ')').prop({selected: true});

    break;
  default:

  $("#dashboardAmrDonutAmrSelect").parent().show();

  var geneListShortName = "cardId";

  for (const [i,gene] of data.geneList.entries()){
    if(gene.hasOwnProperty("shortName")){
      geneListShortName = "shortName";
    }
    var geneInChunkList = false;
    if (gene.averageAccuracy.hasOwnProperty(dashboardAmrTableChunkSelected) && gene.speciesCounts.length > 0) {
      dropdownList.push(gene[geneListShortName]);
      geneInChunkList = true;
    } else {
      for (var chunk of Object.keys(gene.averageAccuracy)) {
        chunk = parseInt(chunk);
        if (chunk < dashboardAmrTableChunkSelected && gene.speciesCounts.length > 0) {
          dropdownList.push(gene[geneListShortName]);
          geneInChunkList = true;
          break
        } else {
          break;
        }
      }
    }

    if (gene[geneListShortName] == dropdownListSelected && geneInChunkList) {
      newData.geneList = [data.geneList[i]];
      plotData = topTaxaAmr(newData);
    };
  };


  if (plotData.length == 0) {
    plotData = topTaxaAmr(data);
  };

  dropdownList.sort().unshift("All genes");

  d3.select("#dashboardAmrDonutAmrSelect").selectAll("option").remove();

  var geneOptions = d3.select("#dashboardAmrDonutAmrSelect").selectAll("option")
      .data(dropdownList);

      geneOptions.enter()
          .append("option")
          .text(function(d) {return d;});

      geneOptions.exit()
          .remove();

  $('#dashboardAmrDonutAmrSelect option:contains(' + dropdownListSelected + ')').prop({selected: true});

}




var legendItems = [];

for (taxa of plotData) {
  if (taxa.value != 0) {
    legendItems.push(taxa.label);
  };
};


  // var dataMax = d3.max(plotData, function(d) {
  //     return d.value;
  // });
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

      slice.transition("dashboardAmrDonutTrans")
          .duration(500)
          .attrTween("d", function(d) {
              this._current = this._current || d;
              var interpolate = d3.interpolate(this._current, d);
              this._current = interpolate(0);
              return function(t) {
                  return amrArc(interpolate(t));
              };
          })
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
                "<br/>Read %: " + Math.round(((d.value / dataSum) * 10000)) / 100)
                .style("left", (tooltipPos(d3.event.pageX)) + "px")
                .style("top", (d3.event.pageY - 35) + "px");

          });

          slice.on("mouseover", function(d, i) {

              slice.filter(function(x) {
                  if (d.data.label != x.data.label) {
                      d3.select(this).transition().duration(donutOpacityTransitionTime).style("opacity", "0.2");
                  };
              });


              dashboardAmrDonutLegend.filter(function(x) {
                  if (d.data.label == x) {
                    d3.select(this).select("g text").classed("hoverDonutPlotTextHighlight", true);
                  } else {
                    d3.select(this).transition().duration(donutOpacityTransitionTime).style("opacity", "0.2");
                  };
              });

          });

          slice.on("mouseout", function(d, i) {

              slice.filter(function(x) {
                  if (d.data.label != x.data.label) {
                      d3.select(this).transition().duration(donutOpacityTransitionTime).style("opacity", "1");
                  };
              });


              dashboardAmrDonutLegend.filter(function(x) {
                  if (d.data.label == x) {
                    d3.select(this).select("g text").classed("hoverDonutPlotTextHighlight", false);
                  } else {
                    d3.select(this).transition().duration(donutOpacityTransitionTime).style("opacity", "1");
                  };
              });


              toolTipDiv.style("opacity", 0);

          });

          dashboardAmrDonutLegend.on("mouseover", function(d, i) {

          slice.filter(function(x) {
            if (x.data.label != d) {
                d3.select(this).transition().duration(donutOpacityTransitionTime).style("opacity", "0.2");
            };
          });

          dashboardAmrDonutLegend.filter(function(x) {
              if (d == x) {
                d3.select(this).select("g text").classed("hoverDonutPlotTextHighlight", true);
              } else {
                d3.select(this).transition().duration(donutOpacityTransitionTime).style("opacity", "0.2");
              };
          });


          });

          dashboardAmrDonutLegend.on("mouseout", function(d, i) {

          slice.filter(function(x) {
            if (x.data.label != d) {
                d3.select(this).transition().duration(donutOpacityTransitionTime).style("opacity", "1");
            };
          });


          dashboardAmrDonutLegend.filter(function(x) {
              if (d == x) {
                d3.select(this).select("g text").classed("hoverDonutPlotTextHighlight", false);
              } else {
                d3.select(this).transition().duration(donutOpacityTransitionTime).style("opacity", "1");
              };
          });


          });

          if (centrifugeClassification) {
            $("#dashboardAmrDonutRow").hide();
          };


};
