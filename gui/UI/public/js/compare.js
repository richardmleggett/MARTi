var plotLevelSelectedCompareText = "Read count";
var plotLevelSelectedCompareId = "read";
var plotLevelSelectedCompareTooltipPrefix;
var plotLevelSelectedCompareTreeName = "tree";

function initialiseComparePage() {


  $('#taxonomicLevelSelectorCompare').text(taxonomicRankSelectedCompareText);
  taxonomicRankSelectedText = taxonomicRankSelectedCompareText;

    taxonomicRankSelectedTextLowerCase = taxonomicRankSelectedText.toLowerCase().replace(" ", "");

    $('#rarefactionCardTitleCompare').text("Taxa accumulation - " + taxonomicRankSelectedText);

  $('#taxonomicLevelSelectorCompareMenu a.rank:contains(' + taxonomicRankSelectedCompareText + ')').addClass("active");

  $('#minimumAbundanceButtonCompare').on( 'click', 'button', function () {
          if ( $(this).hasClass('active') ) {


          }
          else {
              $('#minimumAbundanceButtonCompare>button').removeClass('active');
              $(this).addClass('active');
              lcaAbundanceCompareUnformatted = this.textContent;
              lcaAbundanceCompare = lcaFormat(this.textContent.slice(0, -1));
              socket.emit('compare-tree-request',{
                clientId: uuid,
                lca: "lca_"+lcaAbundanceCompare
              });
              socket.emit('compare-accumulation-request',{
                clientId: uuid,
                rank:taxonomicRankSelectedTextLowerCase,
                lca: "lca_"+lcaAbundanceCompare
              });
          }

  });

  $('#minimumAbundanceButtonCompare>button').removeClass('active');

  $("#minimumAbundanceButtonCompare>button").filter(function() {
      return $(this).text() == lcaAbundanceCompareUnformatted;
  }).addClass("active");


  $('#taxonomicLevelSelectorCompareMenu').on( 'click', 'a.rank', function () {
          if ( $(this).hasClass('active') ) {
          }
          else {
              $('#taxonomicLevelSelectorCompareMenu a.rank').removeClass('active');
              $(this).addClass('active');
              taxonomicRankSelectedCompareText = this.textContent;
              taxonomicRankSelectedText = taxonomicRankSelectedCompareText;

                taxonomicRankSelectedTextLowerCase = taxonomicRankSelectedText.toLowerCase().replace(" ", "");

              $('#taxonomicLevelSelectorCompare').text(taxonomicRankSelectedText);
              $('#rarefactionCardTitleCompare').text("Taxa accumulation - " + taxonomicRankSelectedText);
              taxonomicRankSelectedCompare = taxonomicLevelDict[taxonomicRankSelectedCompareText];
              taxonomicRankChangedCompare = true;
              updateComparePlots(compareTreeDataGlobal);
              taxonomicRankChangedCompare = false;
              socket.emit('compare-accumulation-request',{
                clientId: uuid,
                rank:taxonomicRankSelectedTextLowerCase,
                lca: "lca_"+lcaAbundanceCompare
              });
          }
  });


  plotLevelSelectedCompareText = "Read count";
  plotLevelSelectedCompareId = "read";
  plotLevelSelectorChanged = true;
  plotLevelSelectedCompareTooltipPrefix = plotLevelSelectorDashboardObject[plotLevelSelectedCompareId].prefix;
  plotLevelSelectedCompareTreeName = "tree";

  $('#plotLevelSelectorCompare').text(plotLevelSelectedCompareText);

  $('#plotLevelSelectorMenu a.rank:contains(' + plotLevelSelectedCompareText + ')').addClass("active");
  // replacePlotLevelText();

  $('#plotLevelSelectorMenu').on( 'click', 'a.rank', function () {
          if ( $(this).hasClass('active') ) {

          }
          else {
            $('#plotLevelSelectorMenu a.rank').removeClass('active');
            plotLevelSelectedCompareText = this.textContent;
            plotLevelSelectedCompareId = $(this).data('id');
            $('#plotLevelSelectorCompare').text(plotLevelSelectedCompareText);
            $(this).addClass('active');
            plotLevelSelectedCompareTooltipPrefix = plotLevelSelectorDashboardObject[plotLevelSelectedCompareId].prefix;
            plotLevelSelectedCompareTreeName = plotLevelSelectorDashboardObject[plotLevelSelectedCompareId]["treeName"];
            plotLevelSelectorChanged = true;
            updateComparePlots(compareTreeDataGlobal);
            plotLevelSelectorChanged = false;
          }
    });



  sampleOrdertype = "ID ascending";

  $('#sampleOrderCompareButton').text(sampleOrdertype);
  $('#sampleOrderCompareMenu a.rank:contains(' + sampleOrdertype + ')').addClass("active");


  $('#sampleOrderCompareMenu').on( 'click', 'a.rank', function () {
          if ( $(this).hasClass('active') ) {
          }
          else {
              $('#sampleOrderCompareMenu a.rank').removeClass('active');
              $(this).addClass('active');
              sampleOrdertype = this.textContent;
              $('#sampleOrderCompareButton').text(sampleOrdertype);

              updateComparePlots(compareTreeDataGlobal);
              plotRarefactionCompare(rareData);
          }
  });

  initialiseCompareStackedBar();
  initialiseCompareMultiDonut();

  initialiseHeatmapTaxa();
  initialiseCompareTree();



  compareAccumulationDataAvailable = false;
  compareAmrDataAvailable = false;

  socket.emit('compare-tree-request',{
    clientId: uuid,
    lca: "lca_"+lcaAbundanceCompare
  });



  socket.emit('compare-accumulation-request',{
    clientId: uuid,
    rank:taxonomicRankSelectedTextLowerCase,
    lca: "lca_"+lcaAbundanceCompare
  });

  $("#accumulationChartRow").hide();

  $("#compareAmrHmRow").hide();

  socket.emit('compare-amr-request',{
    clientId: uuid
  });

  manualSortCompareNames = [];

  sortableCompareNames = new Sortable(compareSampleNameList, {
      animation: 150,
      ghostClass: 'compareSampleGhostClass',
      onUpdate: function () {
          manualSortCompareNames = [];
        $('#compareSampleNameList li').each(function() {
          var runId = $(this).data().run;
          var name = $(this).data().id;
          manualSortCompareNames.push({
            name: name,
            runId: runId
          });
        });

        $('#sampleOrderCompareMenu a.rank').removeClass('active');
        sampleOrdertype = "Manual";
        $('#sampleOrderCompareMenu a.rank:contains(' + sampleOrdertype + ')').addClass("active");
        $('#sampleOrderCompareButton').text(sampleOrdertype);
        updateComparePlots(compareTreeDataGlobal);
        plotRarefactionCompare(rareData);
      }

  });



d3.select('#exportCompareDonutSVG').on('click', function(){
  compareTaxaDonutExport();
  var date = getDate() + "_" + getTime();
  var levelSelected = taxonomicRankSelectedText.toLowerCase().replace(" ", "_")
  var outputFilename = "compare_taxa_donuts_lca_" + lcaAbundanceCompare + "_" + levelSelected + "_" + date;
  save_as_svg_with_style('mergedCompareDonutPlot','/css/compareDonut.css',outputFilename,false,'merged-div');
});

d3.select('#exportCompareDonutPNG').on('click', function(){
  compareTaxaDonutExport();
  var date = getDate() + "_" + getTime();
  var levelSelected = taxonomicRankSelectedText.toLowerCase().replace(" ", "_")
  var outputFilename = "compare_taxa_donuts_lca_" + lcaAbundanceCompare + "_" + levelSelected + "_" + date;
  save_as_raster_with_style('mergedCompareDonutPlot','/css/compareDonut.css',outputFilename,2,'png',false,'merged-div');
});

d3.select('#exportCompareDonutJPG').on('click', function(){
  compareTaxaDonutExport();
  var date = getDate() + "_" + getTime();
  var levelSelected = taxonomicRankSelectedText.toLowerCase().replace(" ", "_")
  var outputFilename = "compare_taxa_donuts_lca_" + lcaAbundanceCompare + "_" + levelSelected + "_" + date;
  save_as_raster_with_style('mergedCompareDonutPlot','/css/compareDonut.css',outputFilename,2,'jpg',false,'merged-div');
});


  d3.select('#exportTaxaStackedBarSVG').on('click', function(){
    compareTaxaStackedBarExport();
    var date = getDate() + "_" + getTime();
    var levelSelected = taxonomicRankSelectedText.toLowerCase().replace(" ", "_")
    var outputFilename = "compare_taxa_stacked_bar_lca_" + lcaAbundanceCompare + "_" + levelSelected + "_" + date;
    save_as_svg_with_style('mergedStackedBarPlot','/css/stackedBar.css',outputFilename,false,'merged-div');
  });

  d3.select('#exportTaxaStackedBarPNG').on('click', function(){
    compareTaxaStackedBarExport();
    var date = getDate() + "_" + getTime();
    var levelSelected = taxonomicRankSelectedText.toLowerCase().replace(" ", "_")
    var outputFilename = "compare_taxa_stacked_bar_lca_" + lcaAbundanceCompare + "_" + levelSelected + "_" + date;
    save_as_raster_with_style('mergedStackedBarPlot','/css/stackedBar.css',outputFilename,2,'png',false,'merged-div');
  });

  d3.select('#exportTaxaStackedBarJPG').on('click', function(){
    compareTaxaStackedBarExport();
    var date = getDate() + "_" + getTime();
    var levelSelected = taxonomicRankSelectedText.toLowerCase().replace(" ", "_")
    var outputFilename = "compare_taxa_stacked_bar_lca_" + lcaAbundanceCompare + "_" + levelSelected + "_" + date;
    save_as_raster_with_style('mergedStackedBarPlot','/css/stackedBar.css',outputFilename,2,'jpg',false,'merged-div');
  });




  d3.select('#exportAccumulationSVG').on('click', function(){
    dashboardAccumulationExport();
    var date = getDate() + "_" + getTime();
    var levelSelected = taxonomicRankSelectedText.toLowerCase().replace(" ", "_")
    var outputFilename = "compare_" + levelSelected + "_accumulation_" + lcaAbundanceCompare + "_" + date;
    save_as_svg_with_style('mergedAccumulationPlot','/css/rarefactionCompare.css',outputFilename,false,'merged-div');
  });

  d3.select('#exportAccumulationPNG').on('click', function(){
    dashboardAccumulationExport();
    var date = getDate() + "_" + getTime();
    var levelSelected = taxonomicRankSelectedText.toLowerCase().replace(" ", "_")
    var outputFilename = "compare_" + levelSelected + "_accumulation_" + lcaAbundanceCompare + "_" + date;
    save_as_raster_with_style('mergedAccumulationPlot','/css/rarefactionCompare.css',outputFilename,2,'png',false,'merged-div');
  });

  d3.select('#exportAccumulationJPG').on('click', function(){
    dashboardAccumulationExport();
    var date = getDate() + "_" + getTime();
    var levelSelected = taxonomicRankSelectedText.toLowerCase().replace(" ", "_")
    var outputFilename = "compare_" + levelSelected + "_accumulation_" + lcaAbundanceCompare + "_" + date;
    save_as_raster_with_style('mergedAccumulationPlot','/css/rarefactionCompare.css',outputFilename,2,'jpg',false,'merged-div');
  });


  d3.select('#exportCompareHmTaxaSVG').on('click', function(){

    var date = getDate() + "_" + getTime();
    var levelSelected = taxonomicRankSelectedText.toLowerCase().replace(" ", "_")
    var outputFilename = "compare_taxa_heatmap_lca_" + lcaAbundanceCompare + "_" + levelSelected + "_" + date;
    var exportSVG = $("#compareHmTaxa");
    var exportSVGWidth = exportSVG.width();
    $(exportSVG).attr('width',exportSVGWidth);

    save_as_svg_with_style('compareHmTaxa','/css/heatmapTaxa.css',outputFilename,true);

  });

  d3.select('#exportCompareHmTaxaPNG').on('click', function(){

    var date = getDate() + "_" + getTime();
    var levelSelected = taxonomicRankSelectedText.toLowerCase().replace(" ", "_")
    var outputFilename = "compare_taxa_heatmap_lca_" + lcaAbundanceCompare + "_" + levelSelected + "_" + date;
    var exportSVG = $("#compareHmTaxa");
    var exportSVGWidth = exportSVG.width();
    $(exportSVG).attr('width',exportSVGWidth);

    save_as_raster_with_style('compareHmTaxa','/css/heatmapTaxa.css',outputFilename,2,'png',true);
  });

  d3.select('#exportCompareHmTaxaJPG').on('click', function(){

    var date = getDate() + "_" + getTime();
    var levelSelected = taxonomicRankSelectedText.toLowerCase().replace(" ", "_")
    var outputFilename = "compare_taxa_heatmap_lca_" + lcaAbundanceCompare + "_" + levelSelected + "_" + date;
    var exportSVG = $("#compareHmTaxa");
    var exportSVGWidth = exportSVG.width();
    $(exportSVG).attr('width',exportSVGWidth);

    save_as_raster_with_style('compareHmTaxa','/css/heatmapTaxa.css',outputFilename,2,'jpg',true);
  });



  d3.select('#exportCompareTreeSVG').on('click', function(){

    var date = getDate() + "_" + getTime();
    var levelSelected = taxonomicRankSelectedText.toLowerCase().replace(" ", "_");
    var outputFilename = "compare_taxa_tree_lca_" + levelSelected + "_tree_lca_" + lcaAbundanceCompare + "_" + date;
    var exportSVG = $("#compareTreeSvg")[0];
    var exportSVGWidth = exportSVG.getBBox().width + 200;
    $(exportSVG).attr('width',exportSVGWidth);

    save_as_svg_with_style('compareTreeSvg','/css/compareTree.css',outputFilename,true);
  });

  d3.select('#exportCompareTreePNG').on('click', function(){

    var date = getDate() + "_" + getTime();
    var levelSelected = taxonomicRankSelectedText.toLowerCase().replace(" ", "_");
    var outputFilename = "compare_taxa_tree_lca_" + levelSelected + "_tree_lca_" + lcaAbundanceCompare + "_" + date;
    var exportSVG = $("#compareTreeSvg")[0];
    var exportSVGWidth = exportSVG.getBBox().width + 200;
    $(exportSVG).attr('width',exportSVGWidth);

    save_as_raster_with_style('compareTreeSvg','/css/compareTree.css',outputFilename,2,'png',true);
  });

  d3.select('#exportCompareTreeJPG').on('click', function(){

    var date = getDate() + "_" + getTime();
    var levelSelected = taxonomicRankSelectedText.toLowerCase().replace(" ", "_");
    var outputFilename = "compare_taxa_tree_lca_" + levelSelected + "_tree_lca_" + lcaAbundanceCompare + "_" + date;
    var exportSVG = $("#compareTreeSvg")[0];
    var exportSVGWidth = exportSVG.getBBox().width + 200;
    $(exportSVG).attr('width',exportSVGWidth);

    save_as_raster_with_style('compareTreeSvg','/css/compareTree.css',outputFilename,2,'jpg',true);
  });


  d3.selectAll("input[name='compareStackedBarUnclassified']").on("change", function() {
  compareStackedBarUnclassified = this.value;
  updateComparePlots(compareTreeDataGlobal);
});

d3.selectAll("input[name='compareDonutUnclassified']").on("change", function() {
compareDonutUnclassified = this.value;
updateComparePlots(compareTreeDataGlobal);
});

d3.selectAll("input[name='compareHmTaxaUnclassified']").on("change", function() {
compareHmTaxaUnclassified = this.value;
updateComparePlots(compareTreeDataGlobal);
});

  compareStackedBarUnclassified = "show",
  compareDonutUnclassified = "show",
  compareHmTaxaUnclassified = "show";

  $(document).ready(function () {
      updateCompareSampleNameList(selectedCompareMetaDataArray);
  });


d3.select('#downloadCompareAssignments').on('click', function(){
var csvToExport = convertDataToCSV(compareTaxaData);
var date = getDate() + "_" + getTime();
var levelSelected = taxonomicRankSelectedText.toLowerCase().replace(" ", "_")
var outputFilename = "compare_taxa_assignments_lca_" + lcaAbundanceCompare + "_" + levelSelected + "_" + date;
export_as_csv(csvToExport,outputFilename);
});


$('#compareTaxaTreeCard div.card-header:not(dropdown)').on('click', function() {

  var ctIsExpanded = $('#compareTaxaTreeCard div.card-header').attr("aria-expanded");
  if (ctIsExpanded == "false") {
  ctCard = true;
  // $('#dropdownMenuCompareTaxaTree').removeClass('disabled');
  // buildCompareTree(compareTreeDataGlobal);
  // plotCompareTree(newCompareTree);
  taxonomicRankChangedCompare = true;

    setTimeout(function () {
      buildCompareTree(compareTreeDataGlobal);
      plotCompareTree(newCompareTree);
      taxonomicRankChangedCompare = false;
      $("#generatingTreeNotice").hide();

}, 50);


  } else {
  ctCard = false;


  // $('#dropdownMenuCompareTaxaTree').addClass('disabled');
  }



  });


  $('#dropdownMenuCompareTaxaTree').on('click',function() {
    var ctIsExpanded = $('#compareTaxaTreeCard div.card-header').attr("aria-expanded");
    if (ctIsExpanded == "false") {
      $('#dropdownMenuCompareTaxaTree').addClass('disabled');
    } else {
    $('#dropdownMenuCompareTaxaTree').removeClass('disabled');
    }
});

ctCard = false;



};

var compareStackedBarUnclassified,
compareDonutUnclassified,
compareHmTaxaUnclassified;

var taxonomicRankChangedCompare = false;

var sortableCompareNames;
var manualSortCompareNames = [];

var sampleOrdertype;

var stackedBarCompareData,
sortCompareNameArray;

var hmTaxaData;

var compareTaxaData;

var lcaAbundanceCompareUnformatted = "0.1%";
var lcaAbundanceCompare = "0.1";
var taxonomicRankSelectedCompare = 7;
var taxonomicRankSelectedCompareText = "Genus";


var compareAccumulationDataAvailable = false;
var compareAmrDataAvailable = false;

var opacityTransitionTime = 450;





    function topTaxaCompare(sample,run,thisSampleTree,chart,thresholdSelected,unclassified,unclassifiedNode) {

    var unclassifiedIndex = findWithAttr(thisSampleTree, "name", "unclassified");
    if (unclassified == "hide" && unclassifiedIndex != -1) {
        thisSampleTree.splice(unclassifiedIndex,1);
    } else if (unclassified == "show" && unclassifiedIndex == -1){
        if (unclassifiedNode !== undefined) {
        thisSampleTree.push(unclassifiedNode);
        }
    };

      var sorted = thisSampleTree.sort(function(a, b) {
          return b.chartValue - a.chartValue
      })

      var topTaxaArray = [];

      for (const [i,taxa] of sorted.entries()) {

        var thresholdVal;

        if(i < thresholdSelected) {
          thresholdVal = taxa.ncbiID;
        } else {
          thresholdVal = "Other";
        };

        if (!compareTaxaData.hasOwnProperty(taxa.ncbiID)){
          compareTaxaData[taxa.ncbiID] = {
            name: taxa.name,
            values: {},
            ncbiRank: taxa.ncbiRank
          };
        };

        assignToObject(compareTaxaData, [taxa.ncbiID, 'values', run, sample, 'count'], taxa.value);
        assignToObject(compareTaxaData, [taxa.ncbiID, 'values', run, sample, 'summedCount'], taxa.summedValue);
        assignToObject(compareTaxaData, [taxa.ncbiID, 'values', run, sample, 'chartValue'], taxa.chartValue);


        topTaxaArray.push({
            name: taxa.name,
            value: taxa.chartValue,
            ncbiRank: taxa.ncbiRank,
            ncbiID: taxa.ncbiID,
            threshold: thresholdVal
        });

      };



        var topTaxaCompareArray = d3.nest()
            .key(function(d) {
                return d.threshold;
            })
            .rollup(function(v) {
              return {
                thresholdName: thresholdName(v),
                ncbiRank: rank(v),
                ncbiID: ncbiID(v),
                value: d3.sum(v, function(d) {
                  return d.value;
              })
            }
            })
            .entries(topTaxaArray)
            .map(function(g) {
                return {
                    label: g.values.thresholdName,
                    value: g.values.value,
                    ncbiRank: g.values.ncbiRank,
                    ncbiID: g.values.ncbiID
                }
            })
            .sort(function(a, b) {
                return b.value - a.value
            });


        var sampleReadCount = d3.sum(topTaxaCompareArray, function(d) {
            return d.value;
        });

        var sampleDataArray = {sample:sample,totalReadCount:sampleReadCount,runId:run};


        topTaxaCompareArray.forEach(function(d) {
          var proportion = d.value/sampleReadCount;
            sampleDataArray[d.label] = {value:d.value,ncbiRank:d.ncbiRank,ncbiID:d.ncbiID,proportion:proportion};
            sampleDataArray[d.ncbiID] = {name:d.label,value:d.value,ncbiRank:d.ncbiRank,ncbiID:d.ncbiID,proportion:proportion};


            var findTaxa = taxaTotalCounts[chart].findIndex(taxa => taxa.name == d.label);

            if (findTaxa != -1) {
              taxaTotalCounts[chart][findTaxa].totalValue += d.value;
              taxaTotalCounts[chart][findTaxa].proportionSum += proportion;
            } else {
              taxaTotalCounts[chart].push({name: d.label,ncbiID:d.ncbiID,totalValue: d.value,proportionSum: proportion});
            };


        });

        formattedData[chart].push(sampleDataArray);
};


var compareDonutTopN = 10;
var compareStackedBarTopN = 10;
var compareAmrHmTopN = 10;
var formattedData = {};


var taxaTotalCounts = {"donut":[],"stackedBar":[]};

var donutCompareData = [];

function updateComparePlots(compareSampleData) {

compareTaxaData = {"n/a":{name: "Other", ncbiRank: "n/a"}};

    if(isEmpty(compareSampleData)) {

    } else {

      formattedData = {"donut":[],"stackedBar":[],"hmTaxa":[]};
      taxaTotalCounts = {"donut":[],"stackedBar":[],"hmTaxa":[]};


for (var sample of compareSampleData) {

  var id;
  var runId;

for (var sampleData of selectedCompareMetaDataArray) {
  if (sample.id == sampleData.pathName && sample.runId == sampleData.pathRun) {
    id = sampleData.id;
    runId = sampleData.runId;
  }
};

  var unclassifiedNode;

  sample.jsonId = id;
  sample.jsonRunId = runId;

  var data = sample["tree"][plotLevelSelectedCompareTreeName];

  if (plotLevelSelectorChanged) {
    plotLevelDataManipulation(plotLevelSelectedCompareId,data);
  }

  var sampleLeaves = [];
  var sampleTaxaAtRank = [];

  function taxaAtRank(d) {

    if (d.rank < taxonomicRankSelectedCompare) {
      if(taxonomicRankSelectedCompare == 10){
        sampleTaxaAtRank.push(d);
      };
      if (d.name == "unclassified") {
        unclassifiedNode = d;
        unclassifiedNode.chartValue = unclassifiedNode.value;
      };
      if (d.children) {
        d.children.forEach(function(c){
            taxaAtRank(c);
          });
      } else {
        sampleLeaves.push(d.ncbiID);
      };
    } else if (d.rank == taxonomicRankSelectedCompare) {
      sampleLeaves.push(d.ncbiID);
      sampleTaxaAtRank.push(d);
    };



  };
  taxaAtRank(data);


    thisSampleTree = sampleTaxaAtRank;

    thisSampleTree.forEach(function(d) {
      if (sampleLeaves.includes(d.ncbiID)){
        d.chartValue = d.summedValue;
      } else {
        d.chartValue = d.value;
      };
    });


  topTaxaCompare(id,runId,thisSampleTree,"donut",compareDonutTopN,compareDonutUnclassified,unclassifiedNode);

  topTaxaCompare(id,runId,thisSampleTree,"stackedBar",compareStackedBarTopN,compareStackedBarUnclassified,unclassifiedNode);

  topTaxaCompare(id,runId,thisSampleTree,"hmTaxa",compareHmTaxaTopN,compareHmTaxaUnclassified,unclassifiedNode);


  };


donutCompareData = [];
stackedBarCompareData = [];
hmTaxaData = [];

sortCompareNameArray = [];

if (sampleOrdertype == "Manual" && manualSortCompareNames.length !== 0) {
  sortCompareNameArray = manualSortCompareNames;
} else if (sampleOrdertype == "ID asc"){
selectedCompareMetaDataArray.sort(function(x, y){
 return d3.ascending(x.id, y.id);
})
  for (const sample of selectedCompareMetaDataArray) {
    sortCompareNameArray.push({
      name: sample.id,
      runId: sample.runId
    });
  };
} else if (sampleOrdertype == "ID desc"){


selectedCompareMetaDataArray.sort(function(x, y){
 return d3.descending(x.id, y.id);
})
  for (const sample of selectedCompareMetaDataArray) {
    sortCompareNameArray.push({
      name: sample.id,
      runId: sample.runId
    });
  };

} else if (sampleOrdertype == "Run asc"){
selectedCompareMetaDataArray.sort(function(x, y){
  var result = d3.ascending(x.runId, y.runId);
  if (result === 0) {
    result = d3.ascending(x.id, x.id);
  }
return result;
 // return d3.ascending(x.runId, y.runId);
})
  for (const sample of selectedCompareMetaDataArray) {
    sortCompareNameArray.push({
      name: sample.id,
      runId: sample.runId
    });
  };
} else if (sampleOrdertype == "Run desc"){
selectedCompareMetaDataArray.sort(function(x, y){
  var result = d3.descending(x.runId, y.runId);
  if (result === 0) {
    result = d3.descending(x.id, x.id);
  }
return result;
 // return d3.descending(x.runId, y.runId);
})
  for (const sample of selectedCompareMetaDataArray) {
    sortCompareNameArray.push({
      name: sample.id,
      runId: sample.runId
    });
  };

}
// else if (sampleOrdertype == "Sequencing date asc"){
//   selectedCompareMetaDataArray.sort(function(x, y){
//    return d3.ascending(x.sequencingDate, y.sequencingDate);
// })
//     for (const sample of selectedCompareMetaDataArray) {
//       sortCompareNameArray.push({
//         name: sample.id,
//         runId: sample.runId
//       });
//     };
// } else if (sampleOrdertype == "Sequencing date desc"){
//   selectedCompareMetaDataArray.sort(function(x, y){
//    return d3.descending(x.sequencingDate, y.sequencingDate);
// })
//     for (const sample of selectedCompareMetaDataArray) {
//       sortCompareNameArray.push({
//         name: sample.id,
//         runId: sample.runId
//       });
//     };
// }
else if (sampleOrdertype == "Yield asc"){
  selectedCompareMetaDataArray.sort(function(x, y){
   return d3.ascending(x.yieldBases, y.yieldBases);
})
    for (const sample of selectedCompareMetaDataArray) {
      sortCompareNameArray.push({
        name: sample.id,
        runId: sample.runId
      });
    };
} else if (sampleOrdertype == "Yield desc"){
  selectedCompareMetaDataArray.sort(function(x, y){
   return d3.descending(x.yieldBases, y.yieldBases);
})
    for (const sample of selectedCompareMetaDataArray) {
      sortCompareNameArray.push({
        name: sample.id,
        runId: sample.runId
      });
    };
} else if (sampleOrdertype == "Reads analysed asc"){
  selectedCompareMetaDataArray.sort(function(x, y){
   return d3.ascending(x.readsAnalysed, y.readsAnalysed);
})
    for (const sample of selectedCompareMetaDataArray) {
      sortCompareNameArray.push({
        name: sample.id,
        runId: sample.runId
      });
    };
} else if (sampleOrdertype == "Reads analysed desc"){
  selectedCompareMetaDataArray.sort(function(x, y){
   return d3.descending(x.readsAnalysed, y.readsAnalysed);
})
    for (const sample of selectedCompareMetaDataArray) {
      sortCompareNameArray.push({
        name: sample.id,
        runId: sample.runId
      });
    };
} else {
  selectedCompareMetaDataArray.sort(function(x, y){
   return d3.ascending(x.id, y.id);
  })
    for (const sample of selectedCompareMetaDataArray) {
      sortCompareNameArray.push({
        name: sample.id,
        runId: sample.runId
      });
    };
}


d3.select("#compareSampleNameList").selectAll("li").sort(function(a, b){
  return sortCompareNameArray.findIndex(e => e.name == a.id && e.runId == a.runId) - sortCompareNameArray.findIndex(e => e.name == b.id && e.runId == b.runId);
})


for (const sample of sortCompareNameArray){

  for (const sampleData of formattedData.donut) {
    if (sampleData.sample == sample.name && sampleData.runId == sample.runId) {
      donutCompareData.push(sampleData);
    }
  }

  for (const sampleData of formattedData.stackedBar) {
    if (sampleData.sample == sample.name && sampleData.runId == sample.runId) {
      stackedBarCompareData.push(sampleData);
    }
  }

for (const sampleData of formattedData.hmTaxa) {
  if (sampleData.sample == sample.name && sampleData.runId == sample.runId) {
    hmTaxaData.push(sampleData);
  }
}
}




taxaTotalCounts["donut"].sort(function(a, b) {
    return b.proportionSum - a.proportionSum;
});

taxaTotalCounts["stackedBar"].sort(function(a, b) {
    return b.proportionSum - a.proportionSum;
});

taxaTotalCounts["hmTaxa"].sort(function(a, b) {
    return b.proportionSum - a.proportionSum;
});



donutCompareTaxa = [];
stackedBarCompareTaxa = [];
hmTaxaTaxa = [];

for (var taxa of taxaTotalCounts["stackedBar"]) {
  stackedBarCompareTaxa.push(taxa.name);
}

for (var taxa of taxaTotalCounts["donut"]) {
  donutCompareTaxa.push(taxa.name);
}

for (var taxa of taxaTotalCounts["hmTaxa"]) {
  hmTaxaTaxa.push(taxa.ncbiID);
}


plotStackedBar(stackedBarCompareData,taxaTotalCounts["stackedBar"]);

plotCompareDonut(donutCompareData,donutCompareTaxa);


plotHeatmapTaxa(hmTaxaData,hmTaxaTaxa);




  if (sortCompareNameArray.length <= 6){
    ctCard = true;

    var ctIsExpanded = $('#compareTaxaTreeCard div.card-header').attr("aria-expanded");
    if (ctIsExpanded == "false") {
      $('#compareTaxaTreeCard div.card-header:not(dropdown)').trigger('click');
    }

  }
  if (ctCard) {
    buildCompareTree(compareSampleData)
    plotCompareTree(newCompareTree);
  };



      };

};


function updateCompareSampleNameList(names) {

  var compareSampleList = d3.select("#compareSampleNameList").selectAll("li")
      .data(names);

      compareSampleList.enter()
          .append("li")
          .attr("data-id", function(d) {
            return d.id;})
          .attr("data-run", function(d) {
              return d.runId;})
          .attr("data-pathname", function(d) {
              return d.pathName;})
          .attr("data-pathrun", function(d) {
              return d.pathRun;})
          // .text(function(d) {return d.id + " - " + d.runId;});
          .html(function(d) {return "<a>" + d.id + "</a><br>" + "<a class='compareSampleNameListRun'>" + d.runId + "</a>";});

      compareSampleList.exit()
          .remove();


      compareSampleList.on("click", function(d) {
              var sampleName = $(this).data().pathname;
              var runId = $(this).data().pathrun;

              socket.emit('selected-dashboard-sample',{
                clientId: uuid,
                name: sampleName,
                runId: runId
              });

              activeSidebarIcon($("#dashboard-item"));
              currentPage = "Dashboard";
              $("h1#pageTitle").text("Dashboard");
              $("#response").load("/dashboard.html", function(){
                initialiseDashboardPage();
              });

            });



};

var newCompareTreeData = false;

socket.on('compare-tree-response', function(treeData) {
  compareTreeDataGlobal = treeData;
  let yieldCheck = true;

  for (const sample of treeData) {
    if (!sample.tree.hasOwnProperty("treeYield")) {
      yieldCheck = false;
      break;
    }
  }

  if (yieldCheck) {
    $("#plotLevelSelectorMenu > a[data-id='base']").show();
  } else {
    $("#plotLevelSelectorMenu > a[data-id='base']").hide();
  }

  newCompareTreeData = true;
  plotLevelSelectorChanged = true;
  updateComparePlots(compareTreeDataGlobal);
  newCompareTreeData = false;
  plotLevelSelectorChanged = false;

});

socket.on('tree-update-available', request => {
  if(currentPage=="Compare") {
    socket.emit('compare-tree-request',{
      clientId: uuid,
      lca: "lca_"+lcaAbundanceCompare
    });
  };
});


socket.on('compare-accumulation-response', function(data) {

  if (!compareAccumulationDataAvailable) {
    $("#accumulationChartRow").show();
    initialiseCompareAccumulation();
    compareAccumulationDataAvailable = true;
  }
  rareData = data;
  $('#no-data-accumulation').addClass('d-none');
  plotRarefactionCompare(rareData);

});

socket.on('accumulation-update-available', request => {
  if(currentPage=="Compare") {
    socket.emit('compare-accumulation-request',{
      clientId: uuid,
      rank:taxonomicRankSelectedTextLowerCase,
      lca: "lca_"+lcaAbundanceCompare
    });
  };
});


  var newCompareTree = {};

var rawAmrData;

socket.on('amr-update-available', request => {
  if(currentPage=="Compare") {
    socket.emit('compare-amr-request',{
      clientId: uuid
    });
  };
});

socket.on('compare-amr-response', function(amrData) {
  rawAmrData = amrData;
  if (!compareAmrDataAvailable) {
    $("#compareAmrHmRow").show();
    initialiseAmrHm();
    compareAmrDataAvailable = true;
  }

  updateAmrPlots(rawAmrData);
});

function buildCompareTree(data){

  newCompareTree = {};
  var newCompareTreeTaxa = [];
  compareTreeSampleNodes = {};

    for (var sample of data) {
      // var tree = sample.tree;
      var tree = sample["tree"][plotLevelSelectedCompareTreeName];

      var sampleRun = sample.jsonId + "_" + sample.jsonRunId;
      var nodes = d3.layout.tree().nodes(tree);
      compareTreeSampleNodes[sampleRun] = nodes;

      var sampleAssignedReadTotal = d3.sum(nodes, function(d) { return d.value; });

      function recursiveTreeCheck(d) {
        var taxa = d.ncbiID;
        var proportion = d.value/sampleAssignedReadTotal;
        var summedProportion = d.summedValue/sampleAssignedReadTotal;
        if(!newCompareTreeTaxa.includes(taxa)){
          newCompareTreeTaxa.push(taxa);

          if(taxa == 1){
            newCompareTree = {
              depth:d.depth,
              name:d.name,
              ncbiID:1,
              rank:d.rank,
              ncbiRank:d.ncbiRank,
              values: []
            };
            newCompareTree.values.push({sampleId: sample.jsonId, runId: sample.jsonRunId, readCount:d.value, summedCount:d.summedValue, proportion:proportion, summedProportion:summedProportion});
          } else {
            function addTaxaToTree(treeNode,newTaxa){
              if (newTaxa.parent.ncbiID == treeNode.ncbiID){
                if (!treeNode.hasOwnProperty("children")){
                  treeNode.children = [];
                };
                var newCompareTreeNode = {
                  depth:newTaxa.depth,
                  name:newTaxa.name,
                  ncbiID:newTaxa.ncbiID,
                  rank:newTaxa.rank,
                  ncbiRank:newTaxa.ncbiRank,
                  values: []
                };
                newCompareTreeNode.values.push({sampleId: sample.jsonId, runId: sample.jsonRunId, readCount:d.value, summedCount:d.summedValue, proportion:proportion, summedProportion:summedProportion});
                treeNode.children.push(newCompareTreeNode);


              } else if (treeNode.children){
                treeNode.children.forEach(function(c){
                    addTaxaToTree(c,newTaxa);
                  });
              }

            }
            addTaxaToTree(newCompareTree,d);
          };

        } else {
          function updateTaxaInTree(treeNode,newTaxa){
            if (newTaxa.ncbiID == treeNode.ncbiID){

              treeNode.values.push({sampleId: sample.jsonId, runId: sample.jsonRunId, readCount:d.value, summedCount:d.summedValue, proportion:proportion, summedProportion:summedProportion});

            } else if (treeNode.children){
              treeNode.children.forEach(function(c){
                  updateTaxaInTree(c,newTaxa);
                });
            }

          }
          updateTaxaInTree(newCompareTree,d);
        };

        if (d.children) {
          d.children.forEach(function(c){
              recursiveTreeCheck(c);
            });
        }
      };
      recursiveTreeCheck(tree);

      compareTreeSampleNodes[sampleRun] = nodes.sort(function(a, b) {
          return b.summedValue - a.summedValue;
      });



    }

    newCompareTree.x0 = 0;
    newCompareTree.y0 = 0;


          function recursiveMissingValueSet(d) {

            for (var sample of sortCompareNameArray) {

              if (d.values.findIndex(e => e.sampleId == sample.name && e.runId == sample.runId) == -1) {
                d.values.push({sampleId: sample.name, runId: sample.runId, readCount:0, summedCount:0, proportion:0, summedProportion:0});
              }
            }

            if (d.children) {
              d.children.forEach(function(c){
                  recursiveMissingValueSet(c);
                });
            }
          };

          recursiveMissingValueSet(newCompareTree);

}

// function requestCompareAmrData(){
//
//   socket.emit('compare-amr-request',{
//     clientId: uuid
//   });
//
// }

var compareAmrData;
// var compareAmrGeneArrays;
var compareAmrHmGenes;
var compareAmrHmGenesSnAvailable = true;

function updateAmrPlots(amrData){
  compareAmrData = {};
  // compareAmrGeneArrays = [];
  compareAmrHmGenes = [];
  compareAmrHmGenesSnAvailable = true;


  formattedAmrData = [];


  for (var sample of amrData) {

    var id;
    var runId;

  for (var sampleData of selectedCompareMetaDataArray) {
    if (sample.id == sampleData.pathName && sample.runId == sampleData.pathRun) {
      id = sampleData.id;
      runId = sampleData.runId;
    }
  };


  if (sample.data.geneList.length > 0) {
    if (!sample.data.geneList[0].hasOwnProperty("shortName")){
      compareAmrHmGenesSnAvailable = false;
    }

    var geneDataArray = [];

      for (const gene of sample.data.geneList) {
        var aroNum = gene.cardId.split(":")[1];

        if (!compareAmrData.hasOwnProperty(aroNum)){
          compareAmrData[aroNum] = {
            name: gene.name,
            resMech: gene.resistanceMechanism,
            geneFam: gene.geneFamily,
            drugClass: gene.drugClass,
            shortName: gene.shortName,
            values: {}
          };
        };



          var highestChunk = 0;
          for (const [chunk, count] of Object.entries(gene.count)) {
            if (chunk > highestChunk) {
              var highestChunk = chunk;
            }
          }
          var totalCountAtChunk = gene.count[highestChunk];

          var speciesCounts = [];

          for (const [species, counts] of Object.entries(gene.species)) {
            var speciesCountAtChunk;
            if (counts.hasOwnProperty(highestChunk)) {
              speciesCountAtChunk = counts[highestChunk];
            } else {
              var highestSpeciesChunk = 0;
              for (const [chunk, count] of Object.entries(counts)) {
                if (chunk > highestSpeciesChunk) {
                  var highestSpeciesChunk = chunk;
                }
              }
              speciesCountAtChunk = counts[highestSpeciesChunk];
            }

              speciesCounts.push(species+" ("+speciesCountAtChunk+")");
          }

          speciesCounts.sort(function(a, b) {
            var regExp = /\(([^)]*)\)[^(]*$/;
            var countA = parseInt(regExp.exec(a)[1]);
            var countB = parseInt(regExp.exec(b)[1]);
            if (countA > countB) {
              return -1;
            } else if (countA < countB) {
              return 1;
            }
            return 0;
          });

          var geneData = {
            name: gene.name,
            aro: aroNum,
            resMech: gene.resistanceMechanism,
            geneFam: gene.geneFamily,
            drugClass: gene.drugClass,
            shortName: gene.shortName,
            count: totalCountAtChunk
          }

          geneDataArray.push(geneData);

        assignToObject(compareAmrData, [aroNum, 'values', runId, id, 'count'], totalCountAtChunk);
        assignToObject(compareAmrData, [aroNum, 'values', runId, id, 'species'], speciesCounts);
      };

      // compareAmrGeneArrays.push({
      //   id: id,
      //   runId: runId,
      //   data: geneDataArray
      // })


      topNCompareAmrHm(id,runId,geneDataArray,compareAmrHmTopN);
  }


  }


orderedAmrHmData = [];

  for (const sample of sortCompareNameArray){
    for (const sampleData of formattedAmrData) {
      if (sampleData.sample == sample.name && sampleData.runId == sample.runId) {
        orderedAmrHmData.push(sampleData);
      }
    }
  }




plotAmrHm(orderedAmrHmData,compareAmrHmGenes);


}

var formattedAmrData;
var orderedAmrHmData;

function topNCompareAmrHm(sample,run,data,threshold){


  data.sort(function(a, b) {
      return b.count - a.count
  })

  var topAmrArray = [];

  for (const [i,amr] of data.entries()) {

    var thresholdGroup;

    if(i < threshold) {
      thresholdGroup = amr.aro;
    } else {
      thresholdGroup = "Other";
    };

    topAmrArray.push({
      name: amr.name,
      aro: amr.aro,
      resMech: amr.resMech,
      geneFam: amr.geneFam,
      drugClass: amr.drugClass,
      count: amr.count,
      thresholdGroup: thresholdGroup
    });

  };

  var topAmrArrayNested = d3.nest()
      .key(function(d) {
          return d.thresholdGroup;
      })
      .rollup(function(v) {
        return {
          thresholdGroup: v[0].thresholdGroup,
          name: rollupValue(v,"name"),
          value: d3.sum(v, function(d) {
            return d.count;
        })
      }
      })
      .entries(topAmrArray)
      .map(function(g) {
          return {
              label: g.values.thresholdGroup,
              value: g.values.value,
              name: g.values.name
          }
      })
      .sort(function(a, b) {
          return b.value - a.value
      });


      var sampleAmrReadCount = d3.sum(topAmrArrayNested, function(d) {
          return d.value;
      });

      var sampleDataArray = {sample:sample,totalAmrReadCount:sampleAmrReadCount,runId:run};


      topAmrArrayNested.forEach(function(d) {
        var proportion = d.value/sampleAmrReadCount;
          sampleDataArray[d.label] = {value:d.value,proportion:proportion};

        if (!compareAmrHmGenes.includes(d.label)){
          compareAmrHmGenes.push(d.label);
        }
      });

  formattedAmrData.push(sampleDataArray);

}

function convertDataToCSV(data) {
  var dataArray = [];
  var header = [];
  var abundanceLevel = plotLevelSelectedCompareTooltipPrefix;
  header.push('Taxon','NCBI ID','NCBI Rank');
  for (var sample of sortCompareNameArray) {
    var sampleNameRunCount = sample.name + " (" + sample.runId + ") " + abundanceLevel + " count";
    header.push(sampleNameRunCount);
  };
  for (var sample of sortCompareNameArray) {
    var sampleNameRunSummed = sample.name + " (" + sample.runId + ") Summed " + abundanceLevel.toUpperCase().toLowerCase() + " count";
    header.push(sampleNameRunSummed);
  };
  dataArray.push(header);
  for (const [key, value] of Object.entries(data)) {
    if (key !== "n/a") {
      var keyRow = [];
      keyRow.push(value.name);
      keyRow.push(key);
      keyRow.push(value.ncbiRank);
      for (var sample of sortCompareNameArray) {
        if (checkNested(value.values, sample.runId, sample.name)) {
          keyRow.push((value["values"][sample.runId][sample.name]['count']).toString());
        } else {
          keyRow.push('0');
        };
      };
      for (var sample of sortCompareNameArray) {
        if (checkNested(value.values, sample.runId, sample.name)) {
          keyRow.push((value["values"][sample.runId][sample.name]['summedCount']).toString());
        } else {
          keyRow.push('0');
        };
      };
      dataArray.push(keyRow);
    };
  };
  var csvString = '';
  dataArray.forEach(function(infoArray, index) {
    dataString = infoArray.join(',');
    csvString += index < dataArray.length-1 ? dataString + '\n' : dataString;
  });
  return csvString;
};

function generateCompareAmrCsv(data) {
  var dataArray = [];
  var header = [];
  header.push('Name','ARO','Resistance mechanism','Gene family','Drug class');
  for (var sample of sortCompareNameArray) {
    var sampleNameRunCount = sample.name + " (" + sample.runId + ") Read count";
    header.push(sampleNameRunCount);
  };
  for (var sample of sortCompareNameArray) {
    var sampleNameRunSpecies = sample.name + " (" + sample.runId + ") Walkout species";
    header.push(sampleNameRunSpecies);
  };
  dataArray.push(header);
  for (const [key, value] of Object.entries(data)) {
    if (key !== "n/a") {
      var keyRow = [];
      keyRow.push(value.name);
      keyRow.push(key);
      keyRow.push(value.resMech);
      keyRow.push(value.geneFam);
      keyRow.push(value.drugClass);
      for (var sample of sortCompareNameArray) {
        if (checkNested(value.values, sample.runId, sample.name)) {
          keyRow.push((value["values"][sample.runId][sample.name]['count']).toString());
        } else {
          keyRow.push('0');
        };
      };
      for (var sample of sortCompareNameArray) {
        if (checkNested(value.values, sample.runId, sample.name)) {
          keyRow.push((value["values"][sample.runId][sample.name]['species'].join(';')));
        } else {
          keyRow.push('n/a');
        };
      };
      dataArray.push(keyRow);
    };
  };
  var csvString = '';
  dataArray.forEach(function(infoArray, index) {
    var dataString = infoArray.join(',');
    csvString += index < dataArray.length-1 ? dataString + '\n' : dataString;
  });
  return csvString;
};
