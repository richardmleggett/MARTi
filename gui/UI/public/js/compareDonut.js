var readCountOpacity,radiusSelected,compareDonutSampleName,compareDonutArea;

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



// var comparePlotColorPalette = d3.scale.ordinal()
//     .range(['#a6cee3', '#1f78b4', '#b2df8a', '#33a02c', '#fb9a99', '#e31a1c', '#fdbf6f', '#ff7f00', '#cab2d6', '#6a3d9a', '#ffed75']);

var pieCompare = d3.layout.pie()
    .sort(function(a, b) {
        return b.taxaReadCount - a.taxaReadCount
    })
    // .sort(null)
    .value(function(d) { return d.taxaReadCount; });


var maxLinesWrapped;


    function wrap(text, width) {
        text.each(function () {
            var text = d3.select(this),
                words = text.text().split("").reverse(),
                word,
                line = [],
                lineNumber = 0,
                lineHeight = 1.1, // ems
                x = text.attr("x"),
                y = text.attr("y"),
                dy = 0, //parseFloat(text.attr("dy")),
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


  // var comparePlotColorPalette = d3.scale.ordinal()
  //     // .range(['#a6cee3', '#1f78b4', '#b2df8a', '#33a02c', '#fb9a99', '#e31a1c', '#fdbf6f', '#ff7f00', '#cab2d6', '#6a3d9a', '#ffed75']);
  //     .range(['#556b2f', '#a0522d', '#483d8b', '#5f9ea0', '#008000', '#9acd32', '#00008b', '#8b008b', '#ff4500', '#ffa500', '#ffff00',
  //   '#deb887', '#00ff00', '#00fa9a', '#dc143c', '#00ffff', '#00bfff', '#0000ff', '#d8bfd8', '#ff00ff', '#1e90ff', '#db7093','#ff1493', '#ee82ee']);

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


      // donutCompareLegendSVG.attr("width", function(d) {var rows = Math.ceil(segmentsStackedLength / 7 ); return radius * 2 * rows; });
  // donutCompareLegendSVG.attr("width", $("#compareDonutPlot").parent().parent().width());

  var donutCompareLegend = d3.select("#compareDonutPlotLegend").selectAll(".donutCompareLegend")
      .data(segmentsStacked);

  var donutCompareLegendEnter = donutCompareLegend.enter().append("svg")
      .attr("class", "donutCompareLegend")
      .attr("height", 20)
      .append("g");


  // var donutCompareLegend = donutCompareLegendSVG.selectAll("g")
  //     .data(segmentsStacked);


      // .data(comparePlotColorPalette.domain().slice().reverse());

  // var donutCompareLegendEnter = donutCompareLegend.enter().append("g");

  donutCompareLegendEnter.append("rect")
      .attr("width", 20)
      .attr("height", 20)
      .style("fill", "black");
      // .style("fill", comparePlotColorPalette);

  donutCompareLegendEnter.append("text")
      .attr("x", 24)
      .attr("y", 9)
      .style("font-size", "1.1em")
      .attr("dy", ".356em");
      // .text(function(d) { return d; });


  donutCompareLegend.select("g rect")
    .style("fill", function(d) {return comparePlotColorPalette(d); });

  donutCompareLegend.select("g text")
    .style("text-anchor", "start")
    .text(function(d) { return d; });

  donutCompareLegend
    .attr("width",function(d) { return this.firstChild.getBBox().width; });

  // donutCompareLegend.attr("transform", function(d, i) { var row = Math.floor(i / 7 );return "translate(" + radius * 2 * row + "," + (i-7*row) * 20 + ")"; });
  // donutCompareLegend.attr("transform", function(d, i) { var row = Math.floor(i / 7 );return "translate(" + 74 * 2 * row + "," + (i-7*row) * 20 + ")"; });


  donutCompareLegend.exit().remove();


var donutCompareSVG = d3.select("#compareDonutPlot").selectAll(".pie")
    .data(data);
    // .data(data.sort(function(a, b) { return b.totalReadCount - a.totalReadCount; }));

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
            // .each(function(d) {this._current = d; })
            .style("fill", "white");

            maxLinesWrapped = 0;

            for(x in data) {

              var r = parseInt(radiusCompare(data[x].totalReadCount));

              var thisSVG = d3.select("#pie"+x);

                // thisSVG.transition().duration(500).attr("width", r * 2)
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
                // .style("font-size", function(d) { return Math.floor((r * 0.6) / this.getComputedTextLength() * 22) + "px"; })
                .transition().duration(500)
                    .style("opacity", function(d) {return (readCountOpacity == "on") ? 1 : 0;})
                    // .style("font-size", 12)
                    // .style("font-size", function(d) { return Math.floor((r * 0.6) / this.getComputedTextLength() * 22) + "px"; })
                    .attr("dy", ".35em")
                    .style("text-anchor", "middle");



          		var thisSVGSlices = thisSVG.selectAll(".arc").data(pieCompare(data[x].taxa));

              // thisSVGSlices.each(function(d) {this._current = d; });


          		thisSVGSlices.transition().duration(500).attrTween("d", function(a) {
                          var i = d3.interpolate(this._current, a);
                          this._current = i(0);
                          return function(t) {
                            return arcCompare(i(t));
                          };
                        })
                        .attr("d", arcCompare.outerRadius(r).innerRadius(r * 0.6))
                        .style("fill", function(d) {return comparePlotColorPalette(d.data.name); });

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


        // thisSVG.transition().duration(500).attr("width", r * 2)
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
            d3.select(this).classed("hoverRect", true);
        };
    });

      d3.select(this).select("g rect").classed("hoverRect", true);
      d3.select(this).select("g text").style("font-weight", "bold");
});

donutCompareLegend.on("mouseout", function(d, i) {

  donutSlices.filter(function(x) {
      if (x.data.name == d) {
          d3.select(this).classed("hoverRect", false);
      };
  });

    d3.select(this).select("g rect").classed("hoverRect", false);
    d3.select(this).select("g text").style("font-weight", "normal");

});


donutSlices.on("mouseover", function(d, i) {

  donutCompareLegend.filter(function(x) {
      if (d.data.name == x) {
          d3.select(this).select("rect").classed("hoverRect", true);
          d3.select(this).select("text").style("font-weight", "bold");
      };
  });

    d3.select(this).classed("hoverRect", true);

});

donutSlices.on("mousemove", function(d, i) {

  toolTipDiv.transition()
     .duration(0)
     .style("opacity", .95);



  toolTipDiv.html("<small class='text-gray-800'>" + d.data.sample + "</small>" +
  "<h5 class='mb-0'>" + d.data.name + "</h5>" +
  "<small class='text-gray-800'>" + d.data.ncbiRank + "</small>" +
  "<hr class='toolTipLine'/>Read count: " + thousandsSeparators(d.data.taxaReadCount) +
  "<br/>Read %: " + Math.round(((d.data.taxaReadCount/d.data.totalReadCount)*10000))/100)
     .style("left", (d3.event.pageX) + "px")
     .style("top", (d3.event.pageY - 35) + "px");

});

donutSlices.on("mouseout", function(d, i) {

  donutCompareLegend.filter(function(x) {
      if (d.data.name == x) {
          d3.select(this).select("rect").classed("hoverRect", false);
          d3.select(this).select("text").style("font-weight", "normal");
      };
  });

d3.select(this).classed("hoverRect", false);

  toolTipDiv.transition()
      .duration(50)
      .style("opacity", 0);


});



};
