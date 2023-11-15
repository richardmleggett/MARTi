var amrHitsDonutSVG;
var amrHitsWidth = 350;
var amrHitsHeight = 350;
var amrHitsRadius = Math.min(amrHitsWidth, amrHitsHeight) / 2;
var amrHitsArc = d3.svg.arc()
  .outerRadius(amrHitsRadius * 0.8)
  .innerRadius(amrHitsRadius * 0.5);

// var dashboardAmrHitsDropdownListSelected = "All genes";

function initialiseAmrHitsDonut() {

  amrHitsDonutSVG = d3.select("#dashboardAmrHitsDonutPlot")
    .append("svg")
    .attr("id","dashboardAmrHitsDonutPlotExport")
    .attr("height", amrHitsHeight)
    .attr("width", amrHitsWidth)
    .append("g")
    .attr('transform', 'translate(' + amrHitsWidth/2 +  ',' + amrHitsHeight/2 +')');

    amrHitsDonutSVG.append("g")
        .attr("class", "slices");

    speciesDropdownListSelected = -10;

  d3.selectAll("#dashboardAmrHitsDonutShow").on("change", function(){
    speciesDropdownListSelected = d3.select(this.options[this.selectedIndex]).datum().ncbiID;
    plotAmrHitsDonut(dashboardAmrReponseData);
  });


    dashboardAmrHitsDonutPlotBy = "Drug class";

  d3.select("#dashboardAmrHitsDonutPlotBy").on("change", function(){
    dashboardAmrHitsDonutPlotBy = d3.select(this).property("value");

    // switch(dashboardAmrHitsDonutPlotBy) {
    //   case "Drug class":
    //
    //   dashboardAmrHitsDropdownListSelected = "All classes";
    //
    //     break;
    //   case "Resistance mechanism":
    //
    //   dashboardAmrHitsDropdownListSelected = "All mechanisms";
    //
    //     break;
    //   default:
    //
    // dashboardAmrHitsDropdownListSelected = "All genes";
    // };

    plotAmrHitsDonut(dashboardAmrReponseData);
  });

    d3.select("#dashboardAmrHitsDonutTopN").on("change", function(){
      plotAmrHitsDonut(dashboardAmrReponseData);
    });

    dashboardAmrHitsDonutTopN = 10;

    d3.select("#dashboardAmrHitsDonutTopN").on("input", function(){
      dashboardAmrHitsDonutTopN = d3.select(this).property("value");
      $("#dashboardAmrHitsDonutTopNNum").text(dashboardAmrHitsDonutTopN);
    });

      $("#dashboardAmrHitsDonutTopNNum").text(dashboardAmrHitsDonutTopN);
};

function getCountAtChunk(counts){

  let geneCountAtChunk = 0;

  if(counts.hasOwnProperty(dashboardAmrTableChunkSelected)){
    geneCountAtChunk = counts[dashboardAmrTableChunkSelected];
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
      geneCountAtChunk = counts[highestChunk];
    }
  }
  return geneCountAtChunk;
}

function topTaxaAmrHits(data,plotBy,speciesID){

  var plotCategoryCounts = {};

  let tempSpecies = speciesID;

  let speciesDropdownListIndex = findWithAttr(speciesDropdownList, "ncbiID", speciesID);
  if (speciesDropdownListIndex == -1){
    tempSpecies = -10;
  }

  for (const gene of data.geneList) {

    var counts = gene.count;
    var geneCountAtChunk = 0;

    if (tempSpecies == -10) {

      geneCountAtChunk = getCountAtChunk(counts);

    } else {

      if (Array.isArray(gene.species)){
        let selectedSpeciesIndex = findWithAttr(gene.species, "ncbiID", speciesID);

        if (selectedSpeciesIndex != -1) {
          geneCountAtChunk = getCountAtChunk(gene["species"][selectedSpeciesIndex]["chunkCounts"]);
        }
      } else {
        geneCountAtChunk = getCountAtChunk(counts);

      }

    }



    var genePlotByArray;

    if (plotBy == "cardId"){
      if (gene.hasOwnProperty("shortName")){
        genePlotByArray = [gene.shortName];
      } else {
        genePlotByArray = [gene.cardId];
      }
    } else {
      genePlotByArray = gene[plotBy].split(";");
    }


      for (let element of genePlotByArray) {
        element = element.charAt(0).toUpperCase() + element.slice(1);
        if (!plotCategoryCounts.hasOwnProperty(element)){
          plotCategoryCounts[element] = geneCountAtChunk;
        } else {
          plotCategoryCounts[element] += geneCountAtChunk;
        }
      };

    };

    var plotCountsArray = [];
    for (const [element, count] of Object.entries(plotCategoryCounts)) {
      plotCountsArray.push({
        name: element,
        count: count
      })
    }

    // d3.ascending(plotCountsArray, d => parseFloat(d.count));

    // plotCountsArray.sort(function(a, b) {
    //     return parseFloat(b.count) - parseFloat(a.count);
    // });

    plotCountsArray.sort(function(a, b) {
        return b.count - a.count;
    });

    var thresholdSelected = dashboardAmrHitsDonutTopN;

    for (const [i,element] of plotCountsArray.entries()) {
      if(i < thresholdSelected) {
        element.category = element.name;
      } else {
        element.category = "Other";
      };
    };

    var topCategoryArray = d3.nest()
        .key(function(d) {
            return d.category;
        })
        .rollup(function(v) {
            return d3.sum(v, function(d) {
                return d.count;
            });
        })
        .entries(plotCountsArray)
        .map(function(g) {
            return {
                label: g.key,
                value: g.values
            }
        })
        .sort(function(a, b) {
            return b.value - a.value
        });

    return topCategoryArray;

}

function generateAmrHitsSpeciesArray(data){

    for (const gene of data.geneList) {
      if (Array.isArray(gene.species)){
        for (const taxa of gene.species) {
          let geneCountAtChunk = getCountAtChunk(taxa.chunkCounts);
          if (geneCountAtChunk > 0) {
            let speciesDropdownListIndex = findWithAttr(speciesDropdownList, "ncbiID", taxa.ncbiID);
            if (speciesDropdownListIndex == -1){
              if (taxa.hasOwnProperty("rank")) {
                if (taxa.rank >= 8) {
                  speciesDropdownList.push({ncbiID:taxa.ncbiID, name:taxa.name});
                }
              } else {
                let speciesInformationIndex = findWithAttr(donutNodes, "ncbiID", taxa.ncbiID);
                if (speciesInformationIndex != -1) {
                  let speciesInfo = donutNodes[speciesInformationIndex];
                  if (speciesInfo.rank >= 8) {
                    speciesDropdownList.push({ncbiID:taxa.ncbiID, name:taxa.name})
                  }
                }
              }


            }
          }
        }
      }
    }
}


var dashboardAmrHitsDonutPlotBy = "Drug class";
var speciesDropdownListSelected = -10;
var speciesDropdownList = [];

function plotAmrHitsDonut(data) {

  var dashboardAmrHitsDonutPlotByListOptions = [{plotByProp:"drugClass",name:"Drug class"},{plotByProp:"resistanceMechanism",name:"Resistance mechanism"},{plotByProp:"cardId",name:"Gene"}]
  var dashboardAmrHitsDonutPlotByList = [];

  for (const option of dashboardAmrHitsDonutPlotByListOptions) {
    if (data.geneList[0].hasOwnProperty(option.plotByProp)) {
      dashboardAmrHitsDonutPlotByList.push(option.name);
    }
  }

  // dashboardAmrHitsDonutPlotByList.unshift("Gene");

  d3.select("#dashboardAmrHitsDonutPlotBy").selectAll("option").remove();

    var plotByOptions = d3.select("#dashboardAmrHitsDonutPlotBy").selectAll("option")
        .data(dashboardAmrHitsDonutPlotByList);

        plotByOptions.enter()
            .append("option")
            .text(function(d) {return d;});

        plotByOptions.exit()
            .remove();

  $('#dashboardAmrHitsDonutPlotBy option:contains(' + dashboardAmrHitsDonutPlotBy + ')').prop({selected: true});



  var amrHitsDonutColor = d3.scale.ordinal()
      .range(colourPalettes[selectedPalette]);


  speciesDropdownList = [];

  generateAmrHitsSpeciesArray(data);

  if(speciesDropdownList.length > 0) {
    $("#dashboardAmrHitsDonutShow").parent().show();
  } else {
    $("#dashboardAmrHitsDonutShow").parent().hide();
  }


  speciesDropdownList.sort((a, b) => a.name.localeCompare(b.name)).unshift({ncbiID:-10,name:"All taxa"});

  var plotData = [];

  switch(dashboardAmrHitsDonutPlotBy) {
    case "Drug class":
      plotData = topTaxaAmrHits(data,"drugClass",speciesDropdownListSelected);

      break;
    case "Resistance mechanism":

      plotData = topTaxaAmrHits(data,"resistanceMechanism",speciesDropdownListSelected);

      break;
    case "Gene":

      plotData = topTaxaAmrHits(data,"cardId",speciesDropdownListSelected);

      break;
  }


  d3.select("#dashboardAmrHitsDonutShow").selectAll("option").remove();

  let speciesOptions = d3.select("#dashboardAmrHitsDonutShow").selectAll("option")
      .data(speciesDropdownList);

      speciesOptions.enter()
          .append("option")
          .text(function(d) {return d.name;});

      speciesOptions.exit()
          .remove();

  d3.selectAll("#dashboardAmrHitsDonutShow option").filter(function(d) { return d.ncbiID === speciesDropdownListSelected; }).attr("selected", true);


  var legendItems = [];

  for (cat of plotData) {
    if (cat.value != 0) {
      legendItems.push(cat.label);
    };
  };

  var dataSum = d3.sum(plotData, function(d) {
      return d.value;
  });



  var slice = amrHitsDonutSVG.select(".slices").selectAll("path.slice")
      .data(amrPie(plotData), key);

      slice.enter()
          .insert("path")
          .style("fill", "white")
          .style("stroke", "white")
          .style("stroke-width", "0.5")
          .attr("class", "slice");

      slice.transition("dashboardAmrHitsDonutTrans")
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
              return amrHitsDonutColor(i % dashboardColorIndex);
          });

      slice.exit()
          .remove();


  var dashboardAmrHitsDonutLegend = d3.select("#dashboardAmrHitsDonutLegend").selectAll(".amrHitsDonutLegend")
      .data(legendItems);

      var dashboardAmrHitsDonutLegendEnter = dashboardAmrHitsDonutLegend.enter().append("svg")
          .attr("class", "amrHitsDonutLegend d-md-block")
          .attr("height", 20)
          .append("g");

      dashboardAmrHitsDonutLegendEnter.append("rect")
          .attr("width", 20)
          .attr("height", 20)
          .style("fill", "black");

      dashboardAmrHitsDonutLegendEnter.append("text")
          .attr("x", 24)
          .attr("y", 9)
          .style("font-size", "1.1em")
          .attr("dy", ".356em");

      dashboardAmrHitsDonutLegend.select("g rect")
        .style("fill", function(d, i) {
            return amrDonutColor(i % dashboardColorIndex);
        });

      dashboardAmrHitsDonutLegend.select("g text")
        .style("text-anchor", "start")
        .text(function(d) { return d; });

      dashboardAmrHitsDonutLegend
        .attr("width",function(d) { return this.firstChild.getBBox().width + 10; });

      dashboardAmrHitsDonutLegend.exit().remove();


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


          dashboardAmrHitsDonutLegend.filter(function(x) {
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


          dashboardAmrHitsDonutLegend.filter(function(x) {
              if (d.data.label == x) {
                d3.select(this).select("g text").classed("hoverDonutPlotTextHighlight", false);
              } else {
                d3.select(this).transition().duration(donutOpacityTransitionTime).style("opacity", "1");
              };
          });


          toolTipDiv.style("opacity", 0);

      });

      dashboardAmrHitsDonutLegend.on("mouseover", function(d, i) {

        slice.filter(function(x) {
          if (x.data.label != d) {
              d3.select(this).transition().duration(donutOpacityTransitionTime).style("opacity", "0.2");
          };
        });

        dashboardAmrHitsDonutLegend.filter(function(x) {
            if (d == x) {
              d3.select(this).select("g text").classed("hoverDonutPlotTextHighlight", true);
            } else {
              d3.select(this).transition().duration(donutOpacityTransitionTime).style("opacity", "0.2");
            };
        });


      });

      dashboardAmrHitsDonutLegend.on("mouseout", function(d, i) {

        slice.filter(function(x) {
          if (x.data.label != d) {
              d3.select(this).transition().duration(donutOpacityTransitionTime).style("opacity", "1");
          };
        });


        dashboardAmrHitsDonutLegend.filter(function(x) {
            if (d == x) {
              d3.select(this).select("g text").classed("hoverDonutPlotTextHighlight", false);
            } else {
              d3.select(this).transition().duration(donutOpacityTransitionTime).style("opacity", "1");
            };
        });


      });


};
