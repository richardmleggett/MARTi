var readCountOpacity,radiusSelected,compareDonutSampleName,compareDonutArea,compareDonutColor;

function initialiseCompareMultiDonut() {

compareDonutSampleName = "show";
  compareDonutTopN = 10;
  compareDonutArea = "equal";

radiusSelected = d3.select("input[name='donutRadius']").property("value");

d3.selectAll("input[name='donutArea']").on("change", function(){
  compareDonutArea = d3.select(this).property("value");
  plotCompareDonut(donutCompareData,donutCompareTaxa);
});

d3.selectAll("input[name='donutRadius']").on("change", function(){
  radiusSelected = d3.select(this).property("value");
  plotCompareDonut(donutCompareData,donutCompareTaxa);
});

readCountOpacity = d3.selectAll("input[name='showDonutReadCount']:checked").property("value");
radiusSelected = d3.select("input[name='donutRadius']").property("value");

d3.selectAll("input[name='showDonutReadCount']").on("change", function(){
  readCountOpacity = d3.select(this).property("value");
  plotCompareDonut(donutCompareData,donutCompareTaxa);
});

d3.selectAll("input[name='compareDonutSampleName']").on("change", function() {
  compareDonutSampleName = d3.select(this).property("value");
  plotCompareDonut(donutCompareData,donutCompareTaxa);
});

d3.select("#compareDonutTopN").on("change", function(){
  updateComparePlots(compareTreeDataGlobal);
});

d3.select("#compareDonutTopN").on("input", function(){
  compareDonutTopN = d3.select(this).property("value");
  d3.select("#compareDonutTopNNum").text(compareDonutTopN);
});

d3.select("#compareDonutTopNNum").text(compareDonutTopN);


};


var pieCompare = d3.layout.pie()
    .sort(function(a, b) {
        return b.taxaReadCount - a.taxaReadCount
    })
    .value(function(d) { return d.taxaReadCount; });


var maxLinesWrapped;


    function wrap(text, width) {
        text.each(function () {
            var text = d3.select(this),
                words = text.text().split("").reverse(),
                word,
                line = [],
                lineNumber = 0,
                lineHeight = 1.1,
                x = text.attr("x"),
                y = text.attr("y"),
                dy = 0,
                tspan = text.text(null)
                            .append("tspan")
                            .attr("x", x)
                            .attr("y", y)
                            .attr("dy", dy + "em");
            while (word = words.pop()) {
                line.push(word);
                tspan.text(line.join(""));
                if (tspan.node().getComputedTextLength() > width) {
                    line.pop();
                    tspan.text(line.join(""));
                    line = [word];
                    tspan = text.append("tspan")
                                .attr("x", x)
                                .attr("y", y)
                                .attr("dy", ++lineNumber * lineHeight + dy + "em")
                                .text(word);
                }
            }
            if(lineNumber > maxLinesWrapped) {
              maxLinesWrapped = lineNumber;
            };
            text.attr("data-lines", lineNumber+1);

        });

    };



function plotCompareDonut(data,segmentsStacked) {

  compareDonutColor = d3.scale.ordinal()
        .range(colourPalettes[selectedPalette]);

  data.forEach(function(d) {
    d.taxa = segmentsStacked.map(function(name) {
      if (d[name]) {
        var yVal = +d[name]["value"];
        var rank = d[name]["ncbiRank"];
      } else {
        var yVal = 0;
        var rank = "n/a";
      };
      return {name: name, taxaReadCount: yVal, totalReadCount: d["totalReadCount"], sample: d.sample, ncbiRank: rank};
    });
  });

var pieStartData = segmentsStacked.map(function(name) {
  return {name: name, taxaReadCount: 0};
});


var segmentsStackedLength = segmentsStacked.length;



  if (compareDonutArea == "read") {

    radiusCompare = d3.scale.sqrt()
      .range([25, radiusSelected]);

      arcCompare = d3.svg.arc()
          .outerRadius(radiusCompare)
          .innerRadius(radiusCompare - 30);
    }
    else {
      radiusCompare = d3.scale.sqrt()
        .range([radiusSelected, radiusSelected]);

        arcCompare = d3.svg.arc()
            .outerRadius(radiusCompare)
            .innerRadius(radiusCompare - 30);

};




radiusCompare.domain([0, d3.max(data, function(d) { return d.totalReadCount; })]);

  var donutCompareLegend = d3.select("#compareDonutPlotLegend").selectAll(".donutCompareLegend")
      .data(segmentsStacked);

  var donutCompareLegendEnter = donutCompareLegend.enter().append("svg")
      .attr("class", "donutCompareLegend")
      .attr("height", 20)
      .append("g");


  donutCompareLegendEnter.append("rect")
      .attr("width", 20)
      .attr("height", 20)
      .style("fill", "black");

  donutCompareLegendEnter.append("text")
      .attr("x", 24)
      .attr("y", 9)
      .style("font-size", "1.1em")
      .attr("dy", ".356em");


  donutCompareLegend.select("g rect")
    .style("fill", function(d) {return compareDonutColor(d); });

  donutCompareLegend.select("g text")
    .style("text-anchor", "start")
    .text(function(d) { return d; });

  donutCompareLegend
    .attr("width",function(d) { return this.firstChild.getBBox().width; });



  donutCompareLegend.exit().remove();


var donutCompareSVG = d3.select("#compareDonutPlot").selectAll(".pie")
    .data(data);

    var donutCompareSVGEnter = donutCompareSVG.enter().append("svg")
        .attr("class", "pie")
        .attr("id", function(d,i) {return 'pie'+i;})
      .append("g");

      donutCompareSVGEnter.append("text")
          .attr("class", "donutName");

      donutCompareSVGEnter.append("text")
          .attr("class", "donutReadCount")
          .style("text-anchor", "middle")
          .style("opacity", function(d) {return (readCountOpacity == "on") ? 1 : 0;})
          .text(function(d) { return thousandsSeparators(d.totalReadCount); })
          .style("font-size", function(d) { d3.select(this).style("font-size", 12); return Math.floor((r * 0.6) / this.getComputedTextLength() * 22) + "px"; })
          .attr("dy", ".35em");

    var donutSlices = d3.selectAll("svg.pie g").selectAll(".arc")
        .data(function(d) { return pieCompare(pieStartData); });

        donutSlices.enter().append("path")
            .attr("class", "arc")
            .attr("d", arcCompare)
            .style("fill", "white");

            maxLinesWrapped = 0;

            for(x in data) {

              var r = parseInt(radiusCompare(data[x].totalReadCount));

              var thisSVG = d3.select("#pie"+x);

                thisSVG.attr("width", r * 2)
                  .attr("height", r * 2 + 20)
                  .select("g")
                    .attr("transform", "translate(" + r + "," + (r + 20) + ")")
                  .select("text.donutName")
                      .text(function(d) {return d.sample; })
                      .attr("y", -7 - r)
                      .attr("x", 0)
                      .style("text-anchor", "middle")
                      .style("opacity", function(d) {return (compareDonutSampleName == "show") ? 1 : 0;})
                      .call(wrap, r*2);


                thisSVG.select("text.donutReadCount")
                  .text(function(d) { return thousandsSeparators(d.totalReadCount); })
                  .style("font-size", function(d) { d3.select(this).style("font-size", 12); return Math.floor((r * 0.6) / this.getComputedTextLength() * 22) + "px"; })
                .transition().duration(500)
                    .style("opacity", function(d) {return (readCountOpacity == "on") ? 1 : 0;})
                    .attr("dy", ".35em")
                    .style("text-anchor", "middle");



          		var thisSVGSlices = thisSVG.selectAll(".arc").data(pieCompare(data[x].taxa));


          		thisSVGSlices.transition("compareDonutSliceTrans").duration(500).attrTween("d", function(a) {
                          var i = d3.interpolate(this._current, a);
                          this._current = i(0);
                          return function(t) {
                            return arcCompare(i(t));
                          };
                        })
                        .attr("d", arcCompare.outerRadius(r).innerRadius(r * 0.6))
                        .style("fill", function(d) {return compareDonutColor(d.data.name); });

                thisSVGSlices.exit().remove();

          	};



for(x in data) {

  var r = parseInt(radiusCompare(data[x].totalReadCount));

  var thisSVG = d3.select("#pie"+x);
  var numberLines = thisSVG.select("text.donutName").attr("data-lines");

var textLineHeight;

if (compareDonutSampleName == "show") {
  textLineHeight = (maxLinesWrapped+1)*17;
} else {
  textLineHeight = 0;
}

        thisSVG.attr("width", r * 2)
          .attr("height", r * 2 + textLineHeight + 10)
          .select("g")
            .attr("transform", "translate(" + r + "," + (r + textLineHeight + 10) + ")")
          .select("text.donutName")
              .attr("y", -(numberLines*17) - r +8)
              .selectAll("tspan")
                .attr("y", -(numberLines*17) - r +8);
};


donutCompareLegend.on("mouseover", function(d, i) {

    donutSlices.filter(function(x) {
        if (x.data.name == d) {
        } else {
          d3.select(this).transition().duration(opacityTransitionTime).style("opacity", "0.2");
        };
    });

    donutCompareLegend.filter(function(x) {
        if (x == d) {
            d3.select(this).select("g text").transition().duration(opacityTransitionTime).style("font-weight", "bold");
        } else {
          d3.select(this).select("g").transition().duration(opacityTransitionTime).style("opacity", "0.2");
        };
    });

});

donutCompareLegend.on("mouseout", function(d, i) {


  donutSlices.filter(function(x) {
      if (x.data.name == d) {
      } else {
        d3.select(this).transition().duration(opacityTransitionTime).style("opacity", "1");
      };
  });

  donutCompareLegend.filter(function(x) {
      if (x == d) {
          d3.select(this).select("g text").transition().duration(opacityTransitionTime).style("font-weight", "normal");
      } else {
        d3.select(this).select("g").transition().duration(opacityTransitionTime).style("opacity", "1");
      };
  });


});


donutSlices.on("mouseover", function(d, i) {


  donutCompareLegend.filter(function(x) {
      if (d.data.name == x) {
          d3.select(this).select("g text").transition().duration(opacityTransitionTime).style("font-weight", "bold");
      } else {
        d3.select(this).select("g").transition().duration(opacityTransitionTime).style("opacity", "0.2");
      };
  });


  donutSlices.filter(function(x) {
      if (d.data.name == x.data.name) {
      } else {
        d3.select(this).transition().duration(opacityTransitionTime).style("opacity", "0.2");
      };
  });


});

donutSlices.on("mousemove", function(d, i) {

  toolTipDiv.transition()
     .duration(0)
     .style("opacity", .95);



  toolTipDiv.html("<small class='text-gray-800'>" + d.data.sample + "</small>" +
  "<h5 class='mb-0'>" + d.data.name + "</h5>" +
  "<small class='text-gray-800'>" + d.data.ncbiRank + "</small>" +
  "<hr class='toolTipLine'/>" + plotLevelSelectedCompareTooltipPrefix + "s: " + toolTipValueFormat(plotLevelSelectedCompareId,d.data.taxaReadCount) +
  "<br/>" + plotLevelSelectedCompareTooltipPrefix + " %: " + Math.round(((d.data.taxaReadCount/d.data.totalReadCount)*10000))/100)
     .style("left", (tooltipPos(d3.event.pageX)) + "px")
     .style("top", (d3.event.pageY - 35) + "px");

});

donutSlices.on("mouseout", function(d, i) {

donutCompareLegend.filter(function(x) {
    if (d.data.name == x) {
        d3.select(this).select("g text").transition().duration(opacityTransitionTime).style("font-weight", "normal");
    } else {
      d3.select(this).select("g").transition().duration(opacityTransitionTime).style("opacity", "1");
    };
});


donutSlices.filter(function(x) {
    if (d.data.name == x.data.name) {
    } else {
      d3.select(this).transition().duration(opacityTransitionTime).style("opacity", "1");
    };
});

  toolTipDiv.transition()
      .duration(50)
      .style("opacity", 0);


});



};
