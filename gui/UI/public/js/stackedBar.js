var stackedSvg,
    layer1,
    layer2,
    stackedBarHighlightLayer,
    stackedBarResizeObserver;

function initialiseCompareStackedBar() {

    stackedSvg = d3.select("#stackedBarPlot").append("svg")
        .attr("viewBox", function() {
            return "0 0 " + (widthStacked + marginStacked.left + marginStacked.right) +
                " " + (heightStacked + 80);
        })
        .append("g")
        .attr("transform", "translate(" + marginStacked.left + "," + marginStacked.top + ")");

    layer1 = stackedSvg.append('g');
    layer2 = stackedSvg.append('g');

    layer2.append("g")
        .attr("class", "x axis");

    layer2.append("g")
        .attr("class", "y axis");

    layer2.append("text")
        .attr("id", "compareStackedBarYAxisTitle")
        .attr("transform", "translate(" + (-50) + "," + (heightStacked / 2) + ")rotate(-90)")
        .style("text-anchor", "middle")
        .text("Classified reads");

    stackedBarHighlightLayer = stackedSvg.append("g")
        .attr("class", "stackedBarHighlightMarks")
        .style("pointer-events", "none");

    percentClicked = true;

    compareStackedBarTopN = 10

    d3.select("#compareStackedBarTopN").on("change", function() {
        updateComparePlots(compareTreeDataGlobal);
    });



    d3.select("#compareStackedBarTopN").on("input", function() {
        compareStackedBarTopN = this.value;
        d3.select("#compareStackedBarTopNNum").text(compareStackedBarTopN);
    });

    d3.select("#compareStackedBarTopNNum").text(compareStackedBarTopN);


    d3.select("#compareStackedBarRead").on("change", function() {
        compareStackedBarYAxis = this.checked ? "percent" : "read";
        plotStackedBar(stackedBarCompareData, taxaTotalCounts["stackedBar"]);
    });

    d3.select("#compareStackedBarArea").on("change", function() {
        compareStackedBarStyle = this.checked ? "area" : "bar";
        plotStackedBar(stackedBarCompareData, taxaTotalCounts["stackedBar"]);
    });

    longestSampleName = 0;
    compareStackedBarYAxis = "percent";
    compareStackedBarStyle = "bar";

    if (stackedBarResizeObserver) stackedBarResizeObserver.disconnect();
    if (typeof ResizeObserver === 'function') {
        stackedBarResizeObserver = new ResizeObserver(function() {
            var plotWidth = Math.round($('#stackedBarPlot').width() || 0);
            if (plotWidth <= marginStacked.left + marginStacked.right + 100 ||
                Math.abs(plotWidth - widthStacked - marginStacked.left - marginStacked.right) < 2 ||
                currentPage !== 'Compare' || !stackedBarCompareData || !stackedBarCompareData.length ||
                !taxaTotalCounts || !taxaTotalCounts.stackedBar || !taxaTotalCounts.stackedBar.length) return;
            plotStackedBar(stackedBarCompareData, taxaTotalCounts.stackedBar);
        });
        stackedBarResizeObserver.observe(document.getElementById('stackedBarPlot'));
    }

    var resizeTimer;
    $(window).off('resize.compareStackedBar').on('resize.compareStackedBar', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            if (currentPage === 'Compare' && stackedBarCompareData && stackedBarCompareData.length &&
                taxaTotalCounts && taxaTotalCounts.stackedBar && taxaTotalCounts.stackedBar.length &&
                $('#stackedBarPlot').is(':visible')) {
                plotStackedBar(stackedBarCompareData, taxaTotalCounts.stackedBar);
            }
        }, 120);
    });

};
function stackedBarTextShrink(d, data) {

    var maxChars = 28,
        halfMaxChars = maxChars / 2;

    var text = compareSampleDisplayNameById(data[d].runId, data[d].sample),
        numChars = text.length,
        middleString = "...",
        finalText;

    if (numChars > maxChars) {
        var firstString = text.slice(0, halfMaxChars);
        var endString = text.slice(-halfMaxChars);
        finalText = firstString + middleString + endString;
    } else {
        finalText = text;
    };
    return finalText;

};
var longestSampleName;
var percentClicked;
var compareStackedBarYAxis;
var compareStackedBarStyle;
var stackedBarColor;

var marginStacked = {
        top: 20,
        right: 80,
        bottom: 50,
        left: 60
    },
    widthStacked = 960 - marginStacked.left - marginStacked.right,
    heightStacked = 500 - marginStacked.top - marginStacked.bottom;


var xScale = d3.scale.ordinal()
    .rangeBands([0, widthStacked], .15, .075);

var yScale = d3.scale.linear()
    .rangeRound([heightStacked, 0]);

var xAxis = d3.svg.axis()
    .scale(xScale)
    .orient("bottom")
    .innerTickSize(6);

var yAxis = d3.svg.axis()
    .scale(yScale)
    .orient("left")
    .tickFormat(d3.format(".2s"));

var stack = d3.layout
    .stack();


function transitionPercent(stacked) {

    yAxis.tickFormat(function(d) { return d * 100; });
    d3.select("#compareStackedBarYAxisTitle")
    .text("Classified " + plotLevelSelectedCompareTooltipPrefix.toUpperCase().toLowerCase() + "s (%)");
    // yAxis.tickFormat(d3.format("%"));
    renderStackedLayers(stacked);
}

function transitionCount(stacked) {

    yAxis.tickFormat(d3.format(".2s"));
    d3.select("#compareStackedBarYAxisTitle")
    .text("Classified " + plotLevelSelectedCompareTooltipPrefix.toUpperCase().toLowerCase() + "s");
    renderStackedLayers(stacked);

}

function renderStackedLayers(stacked) {
    yScale.domain([0, d3.max(stacked[stacked.length - 1], function(d) {
        return d.y0 + d.y;
    }) || 0]);

    var sample = layer1.selectAll("g.taxa");
    if (compareStackedBarStyle === "area") {
        sample.selectAll("rect").remove();
        var area = d3.svg.area()
            .x(function(d) {
                return d.xEdge === undefined ? xScale(d.x) + xScale.rangeBand() / 2 : d.xEdge;
            })
            .y0(function(d) { return yScale(d.y0); })
            .y1(function(d) { return yScale(d.y0 + d.y); });
        sample.each(function(layer) {
            var first = layer[0], last = layer[layer.length - 1];
            var points = [Object.assign({}, first, { xEdge: xScale(first.x) })]
                .concat(layer, [Object.assign({}, last, {
                    xEdge: xScale(last.x) + xScale.rangeBand()
                })]);
            var path = d3.select(this).selectAll("path.stackedBarArea").data([points]);
            path.enter().append("path").attr("class", "stackedBarArea");
            path.attr("d", area);
        });
    } else {
        sample.selectAll("path.stackedBarArea").remove();
        var rectangles = sample.selectAll("rect")
            .data(function(d) { return d; });
        rectangles.enter().append("rect");
        rectangles.exit().remove();
        rectangles.attr("width", xScale.rangeBand())
            .transition("stackedBarRectTrans")
            .duration(350)
            .attr("x", function(d) { return xScale(d.x); })
            .attr("y", function(d) { return yScale(d.y0 + d.y); })
            .attr("height", function(d) { return yScale(d.y0) - yScale(d.y0 + d.y); });
    }

    stackedSvg.selectAll(".y.axis").transition("sbYAxis").call(yAxis);
}

// function makeData(stackedTaxa, data) {
//   return stackedTaxa.map(function(component) {
//       return data.map(function(d) {
//         var yVal,rank;
//         if (d[component]) {
//           var readCount = d[component]["value"];
//           var proportion = d[component]["proportion"];
//           if (compareStackedBarYAxis == "percent"){
//             yVal = proportion;
//           } else {
//             yVal = readCount;
//           }
//           rank = d[component]["ncbiRank"];
//         } else {
//           yVal = 0;
//           rank = "n/a";
//         };
//
//         return {x: d.index, y: yVal, sample: d.sample, runId: d.runId, component: component, readCount: readCount, totalReadCount: d["totalReadCount"], ncbiRank: rank};
//       })
//     });
// }


function makeData(data, ids) {
    var dataArray = [];
    var otherValues = {};
    for (var run of data) {
        if (!otherValues.hasOwnProperty(run.runId)) {
            otherValues[run.runId] = {};
        }
        otherValues[run.runId][run.sample] = {
            proportion: 0,
            readCount: 0
        }
    }

    ids.forEach(function(ncbiID) {
        var array = data.map(function(d) {
            var yVal, rank, readCount, proportion, name;
            if (d[ncbiID]) {
                readCount = d[ncbiID]["value"];
                proportion = d[ncbiID]["proportion"];
                name = compareTaxaData[ncbiID]["name"];
                if (compareStackedBarYAxis == "percent") {
                    yVal = proportion;
                } else {
                    yVal = readCount;
                }
                rank = compareTaxaData[ncbiID]["ncbiRank"];
            } else {
                name = compareTaxaData[ncbiID]["name"];
                readCount = 0;
                rank = compareTaxaData[ncbiID]["ncbiRank"];
                proportion = 0;
                yVal = 0;

                if (checkNested(compareTaxaData, ncbiID, 'values', d.runId, d.sample, 'chartValue')) {
                    readCount = compareTaxaData[ncbiID]["values"][d.runId][d.sample]["chartValue"];
                    proportion = readCount / d.totalReadCount;
                    if (compareStackedBarYAxis == "percent") {
                        yVal = proportion;
                    } else {
                        yVal = readCount;
                    }
                    otherValues[d.runId][d.sample]["readCount"] += readCount;
                    otherValues[d.runId][d.sample]["proportion"] += proportion;
                };

            };

            return {
                x: d.index,
                y: yVal,
                sample: d.sample,
                runId: d.runId,
                component: name,
                ncbiID:ncbiID,
                readCount: readCount,
                totalReadCount: d["totalReadCount"],
                ncbiRank: rank
            };
        })



        dataArray.push(array);


    });


    var otherIndex = dataArray.findIndex(e => e[0]["component"] == "Other");
    if (otherIndex != -1) {
        for (var run of dataArray[otherIndex]) {
            if (compareStackedBarYAxis == "percent") {
                run.y -= otherValues[run.runId][run.sample]["proportion"];
            } else {
                run.y -= otherValues[run.runId][run.sample]["readCount"];
            }
            run.readCount -= otherValues[run.runId][run.sample]["readCount"];
        }
    }

    return dataArray;
}

// var stackedTaxa;
var stackedBarNcbiIDs = [];


function plotStackedBar(data, taxaTotalCounts) {
    if (!data || !data.length || !taxaTotalCounts || !taxaTotalCounts.length) {
        if (layer1) layer1.selectAll("*").remove();
        if (layer2) layer2.selectAll(".axis").selectAll("*").remove();
        d3.select("#stackedBarLegend").selectAll("*").remove();
        if (stackedBarHighlightLayer) stackedBarHighlightLayer.selectAll("*").remove();
        return;
    }
    var plotWidth = Math.round($('#stackedBarPlot').width() || 0);
    if (plotWidth > marginStacked.left + marginStacked.right + 100) {
        widthStacked = Math.max(plotWidth - marginStacked.left - marginStacked.right, data.length * 8);
        xScale.rangeBands([0, widthStacked], .15, .075);
    }
    stackedBarHighlightLayer.selectAll("*").remove();
    var streamgraph = compareStackedBarStyle === "area" && compareStackedBarYAxis === "read";
    d3.select("#compareStackedBarTitle").text(compareStackedBarStyle === "area"
        ? (streamgraph ? "Streamgraph (counts)" : "Proportional area")
        : "Stacked bar");
    d3.select("#compareStackedBarYAxisTitle")
        .style("display", streamgraph ? "none" : null)
        .text("Classified " + plotLevelSelectedCompareTooltipPrefix.toUpperCase().toLowerCase() + "s");
    stackedSvg.select("g.y.axis").style("display", streamgraph ? "none" : null);

    stackedBarColor = d3.scale.ordinal()
        .range(colourPalettes[selectedPalette]);

    // stackedTaxa = [];


    if (compareStackedBarYAxis == "percent") {
        taxaTotalCounts.sort(function(a, b) {
            return b.proportionSum - a.proportionSum;
        });
    } else {
        taxaTotalCounts.sort(function(a, b) {
            return b.totalValue - a.totalValue;
        });
    };

    stackedBarNcbiIDs = [];

    for (var taxa of taxaTotalCounts) {
        // stackedTaxa.push(taxa.name);
        stackedBarNcbiIDs.push(taxa.ncbiID);
    }

    for (var [i, sample] of data.entries()) {
        sample.index = i;
    };

    stack.offset(streamgraph ? "silhouette" : "zero");
    var stacked = stack(makeData(data, stackedBarNcbiIDs));
    // var stacked = stack(makeData(stackedTaxa, data));

    xScale.domain(data.map(function(d) {
        return d.index;
    }));


    var stackedAxis = stackedSvg.select("g.x.axis")
        .attr("transform", "translate(0," + heightStacked + ")")
        .call(xAxis);
    formatCompareSampleAxis(stackedAxis, data, xScale);


    stackedSvg.select("g.y.axis")
        .call(yAxis)



    var sample = layer1.selectAll(".taxa")
        .data(stacked);

    sample.enter().append("g")
        .attr("class", "taxa");

    sample.style("fill", function(d, i) {
        return stackedBarColor(d[0].component);
    });

    sample.exit().remove();

    if (compareStackedBarYAxis == "percent") {
        transitionPercent(stacked);
    } else {
        transitionCount(stacked);
    };


    var stackedBarLegend = d3.select("#stackedBarLegend").selectAll(".stackedBarLegend")
        // .data(stackedTaxa);
        .data(taxaTotalCounts);

    var stackedBarLegendEnter = stackedBarLegend.enter().append("svg")
        .attr("class", "stackedBarLegend")
        .attr("height", 20)
        .append("g");

    stackedBarLegendEnter.append("rect")
        .attr("width", 16)
        .attr("height", 12)
        .attr("y", 4)
        .style("fill", "black");

    stackedBarLegendEnter.append("text")
        .attr("x", 21)
        .attr("y", 14)
        .style("font-size", "13px");

    stackedBarLegend.select("g rect")
        .style("fill", function(d) {
            return stackedBarColor(d.name);
        });

    stackedBarLegend.select("g text")
        .style("text-anchor", "start")
        .text(function(d) {
            return d.name;
        });

    stackedBarLegend
        .attr("width", function(d) {
            return compactLegendWidth(this);
        });

    stackedBarLegend.exit().remove();


    var allMarks = stackedSvg.selectAll(compareStackedBarStyle === "area"
        ? "g.taxa path.stackedBarArea" : "g.taxa rect");
    var legendGroups = stackedBarLegend.select("g");

    function markTaxonId(d) {
        return Array.isArray(d) ? d[0].ncbiID : d.ncbiID;
    }

    function highlightTaxon(ncbiID) {
        allMarks.interrupt().style("stroke", null).style("stroke-width", null);
        allMarks.filter(function(d) { return markTaxonId(d) == ncbiID; })
            .style("opacity", 1)
            .style("stroke", "#1f1f1f")
            .style("stroke-width", "1.5px");
        allMarks.filter(function(d) { return markTaxonId(d) != ncbiID; })
            .transition().duration(opacityTransitionTime).style("opacity", 0.3);

        var svg = stackedSvg.node().ownerSVGElement;
        var pixelsPerUnit = svg.viewBox.baseVal.height
            ? svg.getBoundingClientRect().height / svg.viewBox.baseVal.height : 1;
        var thinSegments = [];
        allMarks.filter(function(d) { return compareStackedBarStyle !== "area" && d.ncbiID == ncbiID; })
            .each(function(d) {
                var segmentHeight = Math.abs(yScale(d.y0) - yScale(d.y0 + d.y)) * pixelsPerUnit;
                if (d.y > 0 && segmentHeight < 3) thinSegments.push(d);
            });
        var markers = stackedBarHighlightLayer.selectAll("g.stackedBarThinMarker")
            .data(thinSegments, function(d) { return d.x; });
        var markerEnter = markers.enter().append("g").attr("class", "stackedBarThinMarker");
        markerEnter.append("line").attr("class", "markerHalo")
            .attr("stroke", "white").attr("stroke-width", 4)
            .attr("vector-effect", "non-scaling-stroke");
        markerEnter.append("line").attr("class", "markerCentre")
            .attr("stroke", "#1f1f1f").attr("stroke-width", 2)
            .attr("vector-effect", "non-scaling-stroke");
        markers.exit().remove();
        stackedBarHighlightLayer.selectAll("g.stackedBarThinMarker")
            .attr("transform", function(d) {
                return "translate(" + xScale(d.x) + "," + yScale(d.y0 + d.y / 2) + ")";
            })
            .selectAll("line")
            .attr("x1", 0).attr("x2", xScale.rangeBand())
            .attr("y1", 0).attr("y2", 0);

        legendGroups.interrupt();
        legendGroups.filter(function(d) { return d.ncbiID == ncbiID; }).style("opacity", 1);
        legendGroups.filter(function(d) { return d.ncbiID != ncbiID; })
            .transition().duration(opacityTransitionTime).style("opacity", 0.3);
        stackedBarLegend.select("g text")
            .style("font-weight", function(d) { return d.ncbiID == ncbiID ? "bold" : "normal"; });
    }

    function clearHighlight() {
        stackedBarHighlightLayer.selectAll("*").remove();
        allMarks.interrupt().style("stroke", null).style("stroke-width", null)
            .transition().duration(opacityTransitionTime).style("opacity", 1);
        legendGroups.interrupt().transition().duration(opacityTransitionTime).style("opacity", 1);
        stackedBarLegend.select("g text").style("font-weight", "normal");
    }

    stackedBarLegend.on("mouseover", function(d) { highlightTaxon(d.ncbiID); })
        .on("mouseout", clearHighlight);

    allMarks.on("mouseover", function(d) {
            highlightTaxon(markTaxonId(d));
            showTooltip(compareStackedBarStyle === "area" ? nearestAreaPoint(d) : d);
        })
        .on("mousemove", function(d) {
            showTooltip(compareStackedBarStyle === "area" ? nearestAreaPoint(d) : d);
        })
        .on("mouseout", function() {
            clearHighlight();
            toolTipDiv.interrupt().style("opacity", 0);
        });

    function nearestAreaPoint(layer) {
        var mouseX = d3.mouse(stackedSvg.node())[0];
        return layer.reduce(function(closest, point) {
            return Math.abs(xScale(point.x) + xScale.rangeBand() / 2 - mouseX) <
                Math.abs(xScale(closest.x) + xScale.rangeBand() / 2 - mouseX) ? point : closest;
        });
    }

    function showTooltip(d) {
        toolTipDiv.interrupt().style("opacity", .95)
            .html("<small class='text-gray-800'>" + compareSampleDisplayNameHtml(d.runId, d.sample) + "</small>" +
                "<h5 class='mb-0'>" + d.component + "</h5>" +
                "<small class='text-gray-800'>" + d.ncbiRank + "</small>" +
                "<hr class='toolTipLine'/>" + plotLevelSelectedCompareTooltipPrefix + "s: " + toolTipValueFormat(plotLevelSelectedCompareId, d.readCount) +
                "<br/>" + plotLevelSelectedCompareTooltipPrefix + " %: " + Math.round(((d.readCount / d.totalReadCount) * 10000)) / 100)
            .style("left", (tooltipPos(d3.event.pageX)) + "px")
            .style("top", (d3.event.pageY - 35) + "px");
    }




    var xAxisBounds = stackedAxis.node().getBBox();
    var addedAxisHeight = xAxisBounds.height;

    var svgWidth = Math.max(widthStacked + marginStacked.left + marginStacked.right,
        marginStacked.left + xAxisBounds.x + xAxisBounds.width + marginStacked.right);
    var svgHeight = heightStacked + addedAxisHeight + 85;
    d3.select("#stackedBarPlot>svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight)
        .attr("viewBox", "0 0 " + svgWidth + " " + svgHeight)
        .style("min-width", svgWidth + "px")

};
