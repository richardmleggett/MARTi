
var radius, pie, arc, outerArc, key;

function initialiseDashboardDonut() {

  var width = "350";
  var height = "350";

  donutSVG = d3.select("#dashboardTaxaDonutPlot")
    .append("svg")
    .attr("id","dashboardTaxaDonutPlotExport")
    // .attr("viewBox", function() {
    //   width = $("#dashboardTaxaDonutPlot").parent().parent().width();
    //   height = $("#dashboardTaxaDonutPlot").parent().parent().height();
    //   x = 0-width/2;
    //   y = 0-height/2;
    //     return x + " " + y + " " + width + " " + height;
    // })
    .attr("height", height)
    .attr("width", width)
    .append("g")
    .attr("id","donutExport")
    .attr('transform', 'translate(' + width/2 +  ',' + height/2 +')');

donutSVG.append("g")
    .attr("class", "slices");


radius = Math.min(width, height) / 2;

pie = d3.layout.pie()
    // .sort(null)
    .value(function(d) {
        return d.value;
    });

arc = d3.svg.arc()
    .outerRadius(radius * 0.8)
    .innerRadius(radius * 0.5);



// outerArc = d3.svg.arc()
//     .innerRadius(radius * 0.9)
//     .outerRadius(radius * 0.9);

key = function(d) {
    return d.data.label;
    };

    // d3.selectAll("input[name='donutLegend']").on("change", function() {
    //     if (this.value === "off")
    //         donutLegendOff();
    //     else
    //         donutLegendOn();
    // });
    //
    // d3.selectAll("input[name='donutTaxa']").on("change", function() {
    //     if (this.value === "less")
    //         donutTaxaLess();
    //     else
    //         donutTaxaMore();
    // });


    dashboardTaxaDonutTopN = 10;

    d3.selectAll("input[name='dashboardTaxaDonutTopN']").on("change", function(){
      donutUpdate(returnTopTaxa(donutNodes));
    });

    d3.selectAll("input[name='dashboardTaxaDonutTopN']").on("input", function(){
      dashboardTaxaDonutTopN = d3.select(this).property("value");
      d3.selectAll("input[name='dashboardTaxaDonutTopN']").property("value",dashboardTaxaDonutTopN);
      // $("#dashboardTaxaDonutTopNNum").text(dashboardTaxaDonutTopN);
      d3.selectAll(".dashboard-taxa-donut-top-n").text(dashboardTaxaDonutTopN);
    });

      // $("#dashboardTaxaDonutTopNNum").text(dashboardTaxaDonutTopN);
      d3.selectAll(".dashboard-taxa-donut-top-n").text(dashboardTaxaDonutTopN);



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



// function donutLegendOff() {
//
//     donutSVG.selectAll('#dashboardTaxaDonutPlot .legend')
//         .transition()
//         .duration(minorTransition)
//         // .style("opacity", 0);
//         .style("visibility", "hidden");
//
//
//         if (!document.fullscreenElement && !document.webkitIsFullScreen && !document.mozFullScreen && !document.msFullscreenElement) {
//       // Display result inside a div element
//       smallScreenDonutViewBox();
//
//         }
//         else {
//       fullScreenDonutViewBox();
//         }
//
//
// };

// function donutLegendOn() {
//
//     donutSVG.selectAll('#dashboardTaxaDonutPlot .legend')
//         .transition()
//         .duration(minorTransition)
//         // .style("opacity", 1);
//         .style("visibility", "visible");
//
//         if (!document.fullscreenElement && !document.webkitIsFullScreen && !document.mozFullScreen && !document.msFullscreenElement) {
//       // Display result inside a div element
//       smallScreenDonutViewBox();
//
//         }
//         else {
//       fullScreenDonutViewBox();
//         }
//
// };

// function toggleDonutLegendOn() {
//   $("input[name='donutLegend'][value='on']").prop("checked",true);
//   donutLegendOn();
// };
// function toggleDonutLegendOff() {
//   $("input[name='donutLegend'][value='off']").prop("checked",true);
//   donutLegendOff();
// };

// function returnCorrectReadValue(n) {
//   if (newLeafNodes.includes(n.data.label)){
//     return n.summedValue;
//   } else {
//     return n.value;
//   }
// };




function findOtherIndex(item) {
  if (item.label == "Other"){
    return item;
  }
};

// function topTwenty(item) {
//     return (item.donutValue >= topTwentyThreshold) ? item.name : "Other";
// };
//
// function topTen(item) {
//     return (item.donutValue >= topTenThreshold) ? item.name : "Other";
// };


// function indexOfDonutOtherCategory(){
//   // nodeArray = []
//
//   if ($("input[name='donutTaxa'][value='less']").is(':checked')) {
//       // return topTenArrayNest.findIndex(findOtherIndex);
//       // console.log(topTenArrayNest.findIndex(findOtherIndex))
//       // console.log(findWithAttr(topTenArrayNest,"label","Other"))
//         return findWithAttr(topTenArrayNest,"label","Other");
//
//   }
//   else {
//       // return topTwentyArrayNest.findIndex(findOtherIndex);
//       return findWithAttr(topTwentyArrayNest,"label","Other");
//   }
//
// };

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
        // taxa.threshold = taxa.name;
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
            })
          }
        })
        .entries(sorted)
        .map(function(g) {
            return {
                label: g.values.thresholdName,
                value: g.values.donutValue,
                ncbiRank: g.values.ncbiRank,
                ncbiID: g.values.ncbiID
            }
        })
        .sort(function(a, b) {
            return b.value - a.value
        });


    return topTaxaDonutArray;
};



// var color = d3.scale.ordinal()
//
//     .range(['#a6cee3', '#1f78b4', '#b2df8a', '#33a02c', '#fb9a99', '#e31a1c', '#fdbf6f', '#ff7f00', '#cab2d6', '#6a3d9a', '#ffed75']);

var color = dashboardPlotColorPalette;


function donutUpdate(data) {


  color = dashboardPlotColorPalette;

    // var dataMax = d3.max(data, function(d) {
    //     return d.value;
    // });
    var dataSum = d3.sum(data, function(d) {
        return d.value;
    });


    var legendItems = [];

    // for (taxa of data) {
    //   if (taxa.value != 0) {
    //     legendItems.push(taxa.label);
    //   };
    // };


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
        .duration(1000)
        .attrTween("d", function(d) {
            this._current = this._current || d;
            var interpolate = d3.interpolate(this._current, d);
            this._current = interpolate(0);
            return function(t) {
                return arc(interpolate(t));
            };
        })
        .style("fill", function(d, i) {
            return color(i % dashboardColorIndex);
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
            // .style("font-size", "24px")
            .attr("dy", ".356em");

        dashboardTaxaDonutLegend.select("g rect")
          .style("fill", function(d, i) {
              return color(i % dashboardColorIndex);
          });
          // .style("fill", function(d) {return taxaDonutColor(d); });

        dashboardTaxaDonutLegend.select("g text")
          .style("text-anchor", "start")
          .text(function(d) { return d.label; });

        dashboardTaxaDonutLegend
          .attr("width",function(d) { var getWidth = this.firstChild.getBBox().width + 10; if (getWidth != 10) { return getWidth;} else {return "200"} });

        dashboardTaxaDonutLegend.exit().remove();



        slice.on("mousemove", function(d) {

            toolTipDiv.style("opacity", .95)
                .html("<h5 class='mb-0'>" + d.data.label + "</h5><small class='text-gray-800'>" + d.data.ncbiRank +
                "</em></small><hr class='toolTipLine'/>Read count: " + thousandsSeparators(d.value) +
                // "<br/>Summed read count: " + thousandsSeparators(d.summedValue))
                "<br/>Read %: " + Math.round(((d.value / dataSum) * 10000)) / 100)

                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 35) + "px");


        });

        slice.on("mouseover", function(d, i) {
            d3.select(this).classed("goldFill", true);


            dashboardTaxaDonutLegend.filter(function(x) {
                var tempID = x.ncbiID;
                var match = "ncbiID";
                if (tempID == "n/a"){
                  tempID = x.label;
                  match = "label";
                };
                if (d["data"][match] == tempID) {
                  d3.select(this).select("rect").classed("goldFill", true);
                  d3.select(this).select("g text").classed("hoverDonutPlotTextHighlight", true);
                  d3.select(this).attr("width",function(d) { var getWidth = this.firstChild.getBBox().width + 10; if (getWidth != 10) { return getWidth;} else {return "200"} });
                };
            });

            d3.selectAll("#selectedColumn tbody tr").filter(function(x) {
              var tempID = taxonomyDataTable.row(this).data()[4];
              var match = "ncbiID";
              if (tempID == "n/a"){
                tempID = x.label;
                match = "label";
              };
                if (tempID == d["data"][match]) {
                    d3.select(this).select("rect").classed("goldFill", true);
                    d3.select(this).classed("donut-table-hover", true);
                };
            });


        });

        slice.on("mouseout", function(d, i) {
            d3.select(this).classed("goldFill", false);


            dashboardTaxaDonutLegend.filter(function(x) {
              var tempID = x.ncbiID;
              var match = "ncbiID";
              if (tempID == "n/a"){
                tempID = x.label;
                match = "label";
              };
                if (d["data"][match] == tempID) {
                  d3.select(this).select("rect").classed("goldFill", false);
                  d3.select(this).select("g text").classed("hoverDonutPlotTextHighlight", false);
                  // d3.select(this).attr("width",function(d) { return this.firstChild.getBBox().width; });
                };
            });


            d3.selectAll("#selectedColumn tbody tr").filter(function(x) {
              var tempID = taxonomyDataTable.row(this).data()[4];
              var match = "ncbiID";
              if (tempID == "n/a"){
                tempID = x.label;
                match = "label";
              };
                if (tempID == d["data"][match]) {
                    d3.select(this).select("rect").classed("goldFill", false);
                    d3.select(this).classed("donut-table-hover", false);
                };
            });



            toolTipDiv.style("opacity", 0);



        });

        dashboardTaxaDonutLegend.on("mouseover", function(d, i) {

        slice.filter(function(x) {
          var tempID = x.data.ncbiID;
          var match = "ncbiID";
          if (tempID == "n/a"){
            tempID = x.data.label;
            match = "label";
          };
            if (tempID == d[match]) {
                d3.select(this).classed("goldFill", true);
            };
        });

          d3.select(this).select("g rect").classed("goldFill", true);
          d3.select(this).select("g text").classed("hoverDonutPlotTextHighlight", true);
          d3.select(this).attr("width",function(d) { var getWidth = this.firstChild.getBBox().width + 10; if (getWidth != 10) { return getWidth;} else {return "200"} });

        });

        dashboardTaxaDonutLegend.on("mouseout", function(d, i) {

        slice.filter(function(x) {
          var tempID = x.data.ncbiID;
          var match = "ncbiID";
          if (tempID == "n/a"){
            tempID = x.data.label;
            match = "label";
          };
            if (tempID == d[match]) {
                d3.select(this).classed("goldFill", false);
            };
        });

          d3.select(this).select("g rect").classed("goldFill", false);
          d3.select(this).select("g text").classed("hoverDonutPlotTextHighlight", false);
          // d3.select(this).attr("width",function(d) { return this.firstChild.getBBox().width; });

        });


updateTaxTableColors();

};
