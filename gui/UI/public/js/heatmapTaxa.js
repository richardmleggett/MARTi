var heatmapTaxaSvg,
  hmTaxaL1,
  hmTaxaL2,
  hmTaxaLegend,
  hmDefs,
  hmTaxaColourPalette,
  hmTaxaMaxRectWidth,
  compareHmTaxaGrey,
  compareHmTaxaRead,
  compareHmTaxaShowValues;

var compareHmTaxaPresets = [];
var compareHmTaxaSelectionMode = 'top';

function heatmapTaxaExportLabel() {
  return compareHmTaxaSelectionMode === 'top' ?
    taxonomicRankSelectedCompareText.toLowerCase().replace(/\s+/g, '_') :
    compareHmTaxaSelectionMode + '_ids';
}

function formatHeatmapTaxaPercent(proportion) {
  var percent = proportion * 100;
  if (percent === 0) return '0';
  if (percent < 0.001) return '<0.001';
  return percent < 1 ? percent.toFixed(3) : percent.toFixed(2);
}

function showHeatmapTaxaEmptyState(message) {
  $('#compareHeatmapTaxaPlot > svg').hide();
  $('#compareHmTaxaEmptyState').text(message).css('display', 'flex');
}

function hideHeatmapTaxaEmptyState() {
  $('#compareHmTaxaEmptyState').hide();
  $('#compareHeatmapTaxaPlot > svg').show();
}

function renderCompareHeatmapTaxa(compareSampleData) {
  if (!Array.isArray(compareSampleData)) return;
  var status = $('#compareHmTaxaSelectionStatus');
  if (compareHmTaxaSelectionMode === 'top') {
    status.text('');
    hideHeatmapTaxaEmptyState();
    plotHeatmapTaxa(hmTaxaData, hmTaxaTaxa);
    return;
  }

  var parsed = HeatmapTaxaSelection.parseTaxonIds($('#compareHmTaxaIds').val());
  var denominatorId = $('#compareHmTaxaDenominator').val().trim();
  var minimumText = $('#compareHmTaxaMinimumPercent').val();
  var minimumPercent = Number(minimumText);
  if (parsed.invalid.length || !parsed.ids.length || !/^\d+$/.test(denominatorId) ||
      minimumText === '' || !Number.isFinite(minimumPercent) || minimumPercent < 0 || minimumPercent > 100) {
    status.text('');
    showHeatmapTaxaEmptyState(parsed.invalid.length ? 'Taxon IDs must contain digits only.' :
      !parsed.ids.length ? 'Enter at least one NCBI taxon ID.' :
      !/^\d+$/.test(denominatorId) ? 'Enter a numeric denominator taxon ID.' :
      'Enter a minimum abundance between 0 and 100%.');
    return;
  }

  var preset = compareHmTaxaPresets.find(function(item) { return item.id === compareHmTaxaSelectionMode; });
  var presetNames = {};
  if (preset) preset.taxa.forEach(function(taxon) { presetNames[taxon.id] = taxon.name; });

  var selectedData = [];
  var missingDenominators = 0;
  sortCompareNameArray.forEach(function(orderedSample) {
    var source = compareSampleData.find(function(sample) {
      return sample.jsonId === orderedSample.name && sample.jsonRunId === orderedSample.runId;
    });
    if (!source || !source.tree || !source.tree[plotLevelSelectedCompareTreeName]) return;

    var result = HeatmapTaxaSelection.buildSampleCells(
      source.tree[plotLevelSelectedCompareTreeName], parsed.ids, denominatorId, minimumPercent
    );
    if (result.missingDenominator) missingDenominators++;
    parsed.ids.forEach(function(id) {
      var cell = result.cells[id];
      if (!compareTaxaData[id]) {
        compareTaxaData[id] = { name: presetNames[id] || cell.name, ncbiRank: cell.rank };
      } else if (presetNames[id]) {
        compareTaxaData[id].name = presetNames[id];
      }
      if (!compareTaxaData[id].ncbiRank && cell.rank) compareTaxaData[id].ncbiRank = cell.rank;
      if (compareTaxaData[id].name === id && cell.name !== id) compareTaxaData[id].name = cell.name;
    });
    selectedData.push({
      sample: orderedSample.name,
      runId: orderedSample.runId,
      totalReadCount: result.denominator,
      denominatorTaxonId: denominatorId,
      selectedTaxaMode: true,
      cells: result.cells
    });
  });

  hmTaxaData = selectedData;
  hmTaxaTaxa = parsed.ids;
  if (!selectedData.length) {
    status.text('');
    showHeatmapTaxaEmptyState('No selected samples have taxonomy data at the current LCA cutoff.');
    return;
  }
  var message = 'Showing ' + parsed.ids.length + ' listed taxa across ' + selectedData.length + ' samples.';
  if (missingDenominators) {
    message += ' ' + missingDenominators + ' sample(s) have no reads at denominator taxon ' + denominatorId + '; their percentages are zero.';
  }
  if (preset && lcaAbundanceCompare !== '0.0') {
    message += ' This preset was built with the 0% LCA cutoff.';
  }
  if (preset && plotLevelSelectedCompareId !== 'read') {
    message += ' This preset was built with Read count.';
  }
  status.text(message);
  hideHeatmapTaxaEmptyState();
  plotHeatmapTaxa(selectedData, parsed.ids);
}


function initialiseHeatmapTaxa() {

  compareHmTaxaSelectionMode = 'top';
  compareHmTaxaPresets = [];
  $('#compareHmTaxaSelection').val('top');
  $('.compareHmTaxaSelectedOnly').hide();
  $('.compareHmTaxaTopOnly').show();
  $('#compareHmTaxaSettingsForm').on('submit', function(event) { event.preventDefault(); });

  function setHeatmapTaxaSettingsOpen(open, returnFocus) {
    $('#compareHmTaxaSettings').prop('hidden', !open);
    $('#compareHmTaxaSettingsButton').attr('aria-expanded', String(open)).toggleClass('active', open);
    if (open) {
      $('#compareHmTaxaSettingsTitle').trigger('focus');
    } else if (returnFocus) {
      $('#compareHmTaxaSettingsButton').trigger('focus');
    }
    window.requestAnimationFrame(function() {
      plotHeatmapTaxa(hmTaxaData, hmTaxaTaxa);
    });
  }

  $('#compareHmTaxaSettingsButton').on('click', function() {
    setHeatmapTaxaSettingsOpen($('#compareHmTaxaSettings').prop('hidden'), false);
  });
  $('#compareHmTaxaSettingsClose').on('click', function() {
    setHeatmapTaxaSettingsOpen(false, true);
  });
  $('#compareHmTaxaSettings').on('keydown', function(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      setHeatmapTaxaSettingsOpen(false, true);
    }
  });

  function showHeatmapTaxaPresets(presets) {
    if (!$('#compareHmTaxaSelection').length) return;
    compareHmTaxaPresets = presets;
    $('#compareHmTaxaSelection option[data-preset]').remove();
    presets.forEach(function(preset) {
      $('<option>', { value: preset.id, text: preset.name })
        .attr('data-preset', 'true')
        .appendTo('#compareHmTaxaSelection');
    });
  }

  socket.emit('heatmap-taxa-presets-request', { clientId: uuid }, function(response) {
    if (!$('#compareHmTaxaSelection').length) return;
    if (response && Array.isArray(response.presets)) {
      showHeatmapTaxaPresets(response.presets);
      if (response.error) $('#compareHmTaxaPresetStatus').text('Project heatmap presets are invalid: ' + response.error);
      return;
    }
    $.getJSON('/data/heatmapTaxaPresets.json').done(showHeatmapTaxaPresets).fail(function() {
      $('#compareHmTaxaPresetStatus').text('Preset lists could not be loaded; custom taxon IDs are still available.');
    });
  });

  $('#compareHmTaxaSelection').on('change', function() {
    compareHmTaxaSelectionMode = this.value;
    var selectedValue = this.value;
    var preset = compareHmTaxaPresets.find(function(item) { return item.id === selectedValue; });
    if (preset) {
      $('#compareHmTaxaIds').val(preset.taxa.map(function(taxon) { return taxon.id; }).join(', '));
      $('#compareHmTaxaDenominator').val(preset.denominatorTaxonId);
      $('#compareHmTaxaMinimumPercent').val(preset.minimumRootPercent);
      compareHmTaxaRead = 'percent';
      $('#compareHmTaxaRead').prop('checked', true);
      $('#compareHmTaxaColourUnits').text('(%)');
      compareHmTaxaShowValues = true;
      $('#compareHmTaxaShowValues').prop('checked', true);
      compareHmTaxaGrey = 'on';
      $('#compareHmTaxaGrey').prop('checked', true);
      hmTaxaColourPalette = 'trafficLights';
      $("input[name='compareHmTaxaColour'][value='trafficLights']").prop('checked', true);
      $('.compareHmTaxaTrafficLightThresholds').show();
      $('#compareHmTaxaColourLow, #compareHmTaxaColourMid, #compareHmTaxaColourHigh').val('');
    }
    $('.compareHmTaxaSelectedOnly').toggle(this.value !== 'top');
    $('.compareHmTaxaTopOnly').toggle(this.value === 'top');
    if (this.value === 'top') {
      updateComparePlots(compareTreeDataGlobal);
    } else {
      renderCompareHeatmapTaxa(compareTreeDataGlobal);
    }
  });

  $('#compareHmTaxaIds').on('input', function() {
    if (compareHmTaxaSelectionMode !== 'custom') {
      compareHmTaxaSelectionMode = 'custom';
      $('#compareHmTaxaSelection').val('custom');
    }
    renderCompareHeatmapTaxa(compareTreeDataGlobal);
  });
  $('#compareHmTaxaDenominator, #compareHmTaxaMinimumPercent').on('input', function() {
    renderCompareHeatmapTaxa(compareTreeDataGlobal);
  });

  heatmapTaxaSvg = d3.select("#compareHeatmapTaxaPlot")
  .append("svg")
  .attr("id","compareHmTaxa")
    .attr("height", heightHeatmapTaxa + marginHeatmapTaxa.top + marginHeatmapTaxa.bottom)
    .attr("width", "100%")
  .append("g")
    .attr("transform",
          "translate(" + marginHeatmapTaxa.left + "," + marginHeatmapTaxa.top + ")");

  hmDefs = heatmapTaxaSvg.append("defs");

  hmDefs.append("linearGradient")
    .attr("id", "hmTaxaLegendGradient")
    .attr("x1", "0%").attr("y1", "0%")
    .attr("x2", "100%").attr("y2", "0%");

  hmTaxaL1 = heatmapTaxaSvg.append('g');
  hmTaxaL2 = heatmapTaxaSvg.append('g');
  hmTaxaLegend = heatmapTaxaSvg.append("g")
  	.attr("id", "hmTaxaLegend");

  hmTaxaL2.append("g")
    .attr("class", "x axis");

  hmTaxaL2.append("g")
    .attr("class", "y axis");

  hmTaxaLegend.append("rect")
	 .attr("class", "hmTaxaLegendRect");

  hmTaxaLegend.append("text")
  .attr("class", "hmTaxaLegendTitle")
  .attr("x", 0)
  .attr("y", -2);

  hmTaxaLegend.append("g")
  	.attr("class", "x axis");

var currentWidthHmTaxa = $('#compareHeatmapTaxaPlot').width();

      new ResizeSensor($('#heatmapTaxaRow'), function(){

        var tempWidthHmTaxa = $('#compareHeatmapTaxaPlot').width();
        if (tempWidthHmTaxa > 0) {
          if (Math.abs(currentWidthHmTaxa - tempWidthHmTaxa) >= 30) {
              currentWidthHmTaxa = tempWidthHmTaxa;
              plotHeatmapTaxa(hmTaxaData,hmTaxaTaxa);
              // if (ctCard) {
              //   plotCompareTree(newCompareTree);
              // };
              // plotCompareTree(newCompareTree);
            }
        }

        });

    compareHmTaxaTopN = 10;

    d3.select("#compareHmTaxaTopN").on("change", function(){
      updateComparePlots(compareTreeDataGlobal);
    });

    d3.select("#compareHmTaxaTopN").on("input", function(){
      compareHmTaxaTopN = parseInt(this.value);
      d3.select("#compareHmTaxaTopNNum").text(compareHmTaxaTopN);
    });

    d3.select("#compareHmTaxaTopNNum").text(compareHmTaxaTopN);

    hmTaxaColourPalette = "blue";

    d3.selectAll("input[name='compareHmTaxaColour']").on("change", function(){
    hmTaxaColourPalette = this.value;
    $('.compareHmTaxaTrafficLightThresholds').toggle(this.value === 'trafficLights');
    if (this.value === 'trafficLights') {
      compareHmTaxaGrey = 'on';
      $('#compareHmTaxaGrey').prop('checked', true);
    }
    plotHeatmapTaxa(hmTaxaData,hmTaxaTaxa);
    });

    $('#compareHmTaxaColourLow, #compareHmTaxaColourMid, #compareHmTaxaColourHigh').on('input', function() {
      plotHeatmapTaxa(hmTaxaData,hmTaxaTaxa);
    });

    d3.selectAll("input[name='compareHmTaxaMaxRectWidth']").on("change", function(){
      plotHeatmapTaxa(hmTaxaData,hmTaxaTaxa);
    });

    d3.selectAll("input[name='compareHmTaxaMaxRectWidth']").on("input", function(){
      hmTaxaMaxRectWidth = parseInt(this.value);
      d3.selectAll("#compareHmTaxaMaxRectWidthNum").text(hmTaxaMaxRectWidth);
    });

    hmTaxaMaxRectWidth = 80;

    d3.selectAll("#compareHmTaxaMaxRectWidthNum").text(hmTaxaMaxRectWidth);

    $('#compareHmTaxaGrey').on('change', function(){
      compareHmTaxaGrey = this.checked ? 'on' : 'off';
      plotHeatmapTaxa(hmTaxaData,hmTaxaTaxa);
    });

    compareHmTaxaGrey = "off";

    $('#compareHmTaxaRead').on('change', function(){
      compareHmTaxaRead = this.checked ? 'percent' : 'count';
      $('#compareHmTaxaColourUnits').text(this.checked ? '(%)' : '(count)');
      $('#compareHmTaxaColourLow, #compareHmTaxaColourMid, #compareHmTaxaColourHigh').val('');
      plotHeatmapTaxa(hmTaxaData,hmTaxaTaxa);
    });

    compareHmTaxaRead = "percent";
    compareHmTaxaShowValues = false;
    $('#compareHmTaxaShowValues').on('change', function() {
      compareHmTaxaShowValues = this.checked;
      plotHeatmapTaxa(hmTaxaData,hmTaxaTaxa);
    });



};



var hmTaxaColourPalettes = {
  blue: ['white', '#227AB5'],
  viridis:["#430D54", "#482878", "#3E4A89", "#30688E", "#25828D", "#1F9E89", "#35B779", "#6DCD59", "#B4DE2C", "#FDE724"],
  magma:["#000004", "#180f3d", "#440f76", "#721f81", "#9e2f7f", "#cd4071", "#f1605d", "#fd9668", "#feca8d", "#fcfdbf"],
  trafficLights:["#1a9850", "#ffffbf", "#d73027"]
};

var marginHeatmapTaxa = {top: 30, right: 80, bottom: 30, left: 60},
  widthHeatmapTaxa = 960 - marginHeatmapTaxa.left - marginHeatmapTaxa.right,
  heightHeatmapTaxa = 450 - marginHeatmapTaxa.top - marginHeatmapTaxa.bottom;


function plotHeatmapTaxa(data,taxa) {
if (!Array.isArray(data) || !Array.isArray(taxa)) return;

for (var [i, sample] of data.entries()){
  sample.index = i;
};

var heatmapTaxaWidth = $("#compareHeatmapTaxaPlot").width();
var maxWidth = heatmapTaxaWidth - marginHeatmapTaxa.left - marginHeatmapTaxa.right;

var taxaCount = taxa.length;
var sampleCount = data.length;


heightHeatmapTaxa = taxaCount * 24;

yScaleHmTaxa = d3.scale.ordinal()
  .rangeRoundBands([ heightHeatmapTaxa, 0 ]);

yAxisHmTaxa = d3.svg.axis()
  .scale(yScaleHmTaxa)
  .orient("left");

var yDomain = [];

for (var id of taxa) {
  yDomain.push(compareTaxaData[id]["name"]);
}

yScaleHmTaxa.domain(yDomain);

heatmapTaxaSvg.select("g.y.axis")
  .call(yAxisHmTaxa);

var yAxisWidth = heatmapTaxaSvg.select("g.y.axis")[0][0].getBBox().width;


widthHeatmapTaxa = sampleCount * hmTaxaMaxRectWidth;
if (widthHeatmapTaxa > maxWidth - yAxisWidth) {
  widthHeatmapTaxa = maxWidth - yAxisWidth;
  heatmapTaxaSvg.attr("transform","translate(" + (marginHeatmapTaxa.left + yAxisWidth) + "," + marginHeatmapTaxa.top + ")");
} else {
  heatmapTaxaSvg.attr("transform","translate(" + (heatmapTaxaWidth/2 - (widthHeatmapTaxa + yAxisWidth)/2 + yAxisWidth) + "," + marginHeatmapTaxa.top + ")");
}




var plotMaxValue = 0;
var plotMinPositiveValue = Infinity;


data.forEach(function(d) {
  var readCountToSubtractFromOther = 0;
  var propToSubtractFromOther = 0;
  d.taxa = taxa.map(function(ncbiID) {
    var name, readCount, rank, prop, plotValue;
    if (d.selectedTaxaMode) {
      name = compareTaxaData[ncbiID]["name"];
      rank = compareTaxaData[ncbiID]["ncbiRank"];
      readCount = d.cells[ncbiID].value;
      prop = d.cells[ncbiID].proportion;
    } else if (d[ncbiID]) {
      name = compareTaxaData[ncbiID]["name"];
      readCount = d[ncbiID]["value"];
      rank = compareTaxaData[ncbiID]["ncbiRank"];
      prop = d[ncbiID]["proportion"];

    } else {
      name = compareTaxaData[ncbiID]["name"];
      readCount = 0;
      rank = compareTaxaData[ncbiID]["ncbiRank"];
      prop = 0;

      if (checkNested(compareTaxaData, ncbiID, 'values', d.runId, d.sample, 'chartValue')) {
        readCount = compareTaxaData[ncbiID]["values"][d.runId][d.sample]["chartValue"];
        prop = readCount/d.totalReadCount;
        readCountToSubtractFromOther += readCount;
        propToSubtractFromOther += prop;
        };
    };

    if(compareHmTaxaRead == "percent") {
      plotValue = prop;
    } else {
      plotValue = readCount;
    };
    if (plotValue > plotMaxValue) {
      plotMaxValue = plotValue;
    };
    if (plotValue > 0 && plotValue < plotMinPositiveValue) {
      plotMinPositiveValue = plotValue;
    }

    return {name: name, taxaReadCount: readCount, totalReadCount: d["totalReadCount"], sample: d.sample, runId: d.runId, ncbiRank: rank, index: d.index, proportion: prop, plotValue: plotValue, denominatorTaxonId: d.denominatorTaxonId};
  });

  var otherIndex = d["taxa"].findIndex(e => e.name == "Other");
  if (otherIndex != -1){
    d["taxa"][otherIndex]["taxaReadCount"] -= readCountToSubtractFromOther;
    d["taxa"][otherIndex]["proportion"] -= propToSubtractFromOther;
    if(compareHmTaxaRead == "percent") {
      d["taxa"][otherIndex]["plotValue"] = d["taxa"][otherIndex]["proportion"];
    } else {
      d["taxa"][otherIndex]["plotValue"] = d["taxa"][otherIndex]["taxaReadCount"];
    };
  }

});



var hmTaxaDomain = [];
if (hmTaxaColourPalette === 'trafficLights') {
  var thresholds = HeatmapTaxaSelection.resolveColourThresholds({
    low: $('#compareHmTaxaColourLow').val(),
    mid: $('#compareHmTaxaColourMid').val(),
    high: $('#compareHmTaxaColourHigh').val()
  }, plotMinPositiveValue, plotMaxValue, compareHmTaxaRead === 'percent');
  hmTaxaDomain = thresholds.domain;
  $('#compareHmTaxaColourRangeStatus').text(thresholds.error);
} else {
  $('#compareHmTaxaColourRangeStatus').text('');
  var colourMaxValue = plotMaxValue || 1;
  var colourPaletteLength = hmTaxaColourPalettes[hmTaxaColourPalette].length;
  for (var [i,col] of hmTaxaColourPalettes[hmTaxaColourPalette].entries()) {
    var domainVal = (colourMaxValue/(colourPaletteLength-1))*i;
    hmTaxaDomain.push(domainVal);
  }
}

  var hmTaxaColour = d3.scale.linear()
    .range(hmTaxaColourPalettes[hmTaxaColourPalette])
    .domain(hmTaxaDomain)
    .clamp(true);

  hmDefs.select("#hmTaxaLegendGradient").selectAll("stop").remove();

  hmTaxaLegendGradientStops = hmDefs.select("#hmTaxaLegendGradient").selectAll("stop")
  	.data(hmTaxaColour.range());


  hmTaxaLegendGradientStops.enter().append("stop")
    .attr("offset", function(d,i) {
      return hmTaxaColourPalette === 'trafficLights' ?
        (hmTaxaDomain[i] - hmTaxaDomain[0]) / (hmTaxaDomain[2] - hmTaxaDomain[0]) :
        i / (hmTaxaColour.range().length - 1);
    })
  	.attr("stop-color", function(d) { return d; });




  var xScaleHmTaxa = d3.scale.ordinal()
    .rangeRoundBands([ 0, widthHeatmapTaxa ]);

  var xAxisHmTaxa = d3.svg.axis()
      .scale(xScaleHmTaxa)
      .orient("bottom");

  xScaleHmTaxa.domain(data.map(function(d) {return d.index; }));

if (data.length <= 10){
  heatmapTaxaSvg.select("g.x.axis")
    .attr("transform", "translate(0," + heightHeatmapTaxa + ")")
    .call(xAxisHmTaxa)
    .selectAll("text")
      .text(function(d) { var finalText = stackedBarTextShrink(d,data); return finalText })
      .attr("dx", "0.5em")
      .attr("transform", "rotate(45)")
      .style("text-anchor", "start");
} else {
  heatmapTaxaSvg.select("g.x.axis")
    .attr("transform", "translate(0," + heightHeatmapTaxa + ")")
    .call(xAxisHmTaxa)
    .selectAll("text")
      .text(function(d) { var finalText = stackedBarTextShrink(d,data); return finalText })
      .attr("dy", "-0.25em")
      .attr("dx", "0.5em")
      .attr("transform", "rotate(90)")
      .style("text-anchor", "start");
}

      var xAxisHeight = heatmapTaxaSvg.select("g.x.axis")[0][0].getBBox().height;



    var sample = hmTaxaL1.selectAll(".sample")
        .data(data);

        sample.enter().append("g")
        .attr("class", "sample");

        sample.exit().remove();

    var rectanglesHmTaxa = sample.selectAll("rect")
        .data(function(d) {
          return d.taxa; });


      rectanglesHmTaxa.enter().append("rect");

      rectanglesHmTaxa.attr("x", function(d) { return xScaleHmTaxa(d.index) })
      .attr("y", function(d) { return yScaleHmTaxa(d.name) })
      .attr("width", xScaleHmTaxa.rangeBand())
      .attr("height", yScaleHmTaxa.rangeBand())
      .style("fill", function(d) {
        return ((compareHmTaxaGrey == "on" && d.plotValue == 0) ?
          (hmTaxaColourPalette === 'trafficLights' ? '#eeeeee' : '#D3D3D3') :
          hmTaxaColour(d.plotValue))
      });

      rectanglesHmTaxa.exit().remove();

      var cellValues = sample.selectAll("text.hmTaxaCellValue")
        .data(function(d) { return d.taxa; });
      cellValues.enter().append("text").attr("class", "hmTaxaCellValue");
      cellValues
        .attr("x", function(d) { return xScaleHmTaxa(d.index) + xScaleHmTaxa.rangeBand() / 2; })
        .attr("y", function(d) { return yScaleHmTaxa(d.name) + yScaleHmTaxa.rangeBand() / 2; })
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .style("font-size", "9px")
        .style("font-weight", "600")
        .style("fill", "#222")
        .style("stroke", "white")
        .style("stroke-width", "2px")
        .style("paint-order", "stroke")
        .style("pointer-events", "none")
        .style("display", compareHmTaxaShowValues && xScaleHmTaxa.rangeBand() >= 42 ? null : "none")
        .text(function(d) {
          if (d.plotValue === 0) return "0";
          if (compareHmTaxaRead === "percent") {
            return formatHeatmapTaxaPercent(d.plotValue) + "%";
          }
          return thousandKilo(d.plotValue);
        });
      cellValues.exit().remove();

      var maxLegendWidth = 250;

      var legendWidth = maxLegendWidth;
      if (widthHeatmapTaxa < maxLegendWidth) {
        legendWidth = widthHeatmapTaxa;
      };

    	var legendHeight = 10;

var legendXTransform = (widthHeatmapTaxa - legendWidth)/2;

var legendPlotMaxVal,
legendPlotMinVal = 0,
legendTitle;

if(compareHmTaxaRead == "percent"){
  legendPlotMaxVal = plotMaxValue*100;
  legendTitle = data[0] && data[0].selectedTaxaMode ?
    plotLevelSelectedCompareTooltipPrefix + "s (% of taxon " + data[0].denominatorTaxonId + ")" :
    "Classified " + plotLevelSelectedCompareTooltipPrefix.toUpperCase().toLowerCase() + "s (%)";
} else {
  legendPlotMaxVal = plotMaxValue;
  legendTitle = "Classified " + plotLevelSelectedCompareTooltipPrefix.toUpperCase().toLowerCase() + "s";
}
if (hmTaxaColourPalette === 'trafficLights') {
  var legendFactor = compareHmTaxaRead === 'percent' ? 100 : 1;
  legendPlotMinVal = hmTaxaDomain[0] * legendFactor;
  legendPlotMaxVal = hmTaxaDomain[2] * legendFactor;
}


      var legendXScale = d3.scale.linear()
      	 .range([0, legendWidth])
        .domain([legendPlotMinVal,legendPlotMaxVal]);

      var legendXAxis = d3.svg.axis()
      	  .orient("bottom")
      	  .ticks(3)
      	  .scale(legendXScale);
      if (hmTaxaColourPalette === 'trafficLights') {
        legendXAxis.tickValues(hmTaxaDomain.map(function(value) { return value * legendFactor; }));
      }


      hmTaxaLegend.select("rect")
      .attr("y", 10)
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#hmTaxaLegendGradient)");

      hmTaxaLegend.select("text")
      .text(legendTitle);

      var legendTextWidth = $("#hmTaxaLegend text")[0].getBBox().width;

      hmTaxaLegend.select("text")
      .attr("transform", "translate(" + (legendWidth - legendTextWidth)/2  + "," + 0 + ")");

      hmTaxaLegend.select("g.x.axis")
        .attr("transform", "translate(" + 0 + "," + (10 + legendHeight) + ")")
      	.call(legendXAxis)
        .selectAll("text")
          .text(function(d) {
            return compareHmTaxaRead === 'percent' ? d3.format('.3g')(d) : thousandKilo(d);
          });

        var hmTaxaLegendHeight = $("#hmTaxaLegend")[0].getBBox().height;

        hmTaxaLegend
        	.attr("transform", "translate(" + legendXTransform + "," + -(hmTaxaLegendHeight) + ")");


      if (widthHeatmapTaxa > maxWidth - yAxisWidth) {
        heatmapTaxaSvg.attr("transform","translate(" + (marginHeatmapTaxa.left + yAxisWidth) + "," + (marginHeatmapTaxa.top + hmTaxaLegendHeight) + ")");
      } else {
        heatmapTaxaSvg.attr("transform","translate(" + (heatmapTaxaWidth/2 - (widthHeatmapTaxa + yAxisWidth)/2 + yAxisWidth) + "," + (marginHeatmapTaxa.top + hmTaxaLegendHeight) + ")");
      }

      d3.select("#compareHeatmapTaxaPlot>svg")
        .attr("height", heightHeatmapTaxa + xAxisHeight + hmTaxaLegendHeight + marginHeatmapTaxa.top + marginHeatmapTaxa.bottom);


          rectanglesHmTaxa.on("mousemove", function(d) {

            toolTipDiv.transition("HmTaxaToolTip")
               .duration(0)
               .style("opacity", .95);

            toolTipDiv.html("<small class='text-gray-800'>" + compareSampleDisplayNameHtml(d.runId, d.sample) + "</small>" +
            "<h5 class='mb-0'>" + d.name + "</h5>" +
            "<small class='text-gray-800'>" + d.ncbiRank + "</small>" +
            "<hr class='toolTipLine'/>" + plotLevelSelectedCompareTooltipPrefix + "s: " + toolTipValueFormat(plotLevelSelectedCompareId,d.taxaReadCount) +
            "<br/>" + plotLevelSelectedCompareTooltipPrefix + " % " +
            (d.denominatorTaxonId ? "of taxon " + d.denominatorTaxonId : "") +
            ": " + formatHeatmapTaxaPercent(d.proportion))
               .style("left", (tooltipPos(d3.event.pageX)) + "px")
               .style("top", (d3.event.pageY - 35) + "px");

          });

          rectanglesHmTaxa.on("mouseout", function(d) {


            toolTipDiv.transition("HmTaxaToolTip")
                .duration(50)
                .style("opacity", 0);

          });



};

function thousandKilo(num) {
var finalValue;

    if(num/1000000 > 1){
      finalValue = (num/1000000) + "M";
    } else if (num/1000 > 1){
      finalValue = (num/1000) + "k";
    } else {
      finalValue = num;
    }

    return finalValue;

};
