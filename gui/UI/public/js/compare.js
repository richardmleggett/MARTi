function initialiseComparePage() {

  // stackedBarFullScreen = document.getElementById("stackedBarCard");
  // compareDonutFullScreen = document.getElementById("compareDonutCard");
  // compareRarefactionFullScreen = document.getElementById("compareRarefactionCard");
  //
  // fullScreenIconStart();

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
  // $('#minimumAbundanceButtonCompare>button:contains(' + lcaAbundanceCompareUnformatted + ')').addClass("active");

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
              // switch (sampleOrdertype) {
              //   case "ID asc":
              //       d3.select("#compareSampleNameList").selectAll("li").sort(d3.ascending)
              //       break;
              //   case "ID desc":
              //       d3.select("#compareSampleNameList").selectAll("li").sort(d3.descending)
              //       break;
              //   case "Manual":
              //       d3.select("#compareSampleNameList").selectAll("li").sort(function(a, b){
              //         return manualSortCompareNames.indexOf(a) - manualSortCompareNames.indexOf(b);
              //       })
              //       break;
              //
              //   }

              updateComparePlots(compareTreeDataGlobal);
              plotRarefactionCompare(rareData);
          }
  });

  initialiseCompareStackedBar();
  initialiseCompareMultiDonut();

  initialiseHeatmapTaxa();
  initialiseCompareTree();

  compareAccumulationDataAvailable = false;

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

  manualSortCompareNames = [];

  sortableCompareNames = new Sortable(compareSampleNameList, {
      animation: 150,
      // handle: ".compareSampleHandle",
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
        // manualSortCompareNames = sortableCompareNames.toArray();

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
  // updateCompareSampleNameList(compareSampleObjectArray);
  updateCompareSampleNameList(selectedCompareMetaDataArray);



d3.select('#downloadCompareAssignments').on('click', function(){
var csvToExport = convertDataToCSV(compareTaxaData);
var date = getDate() + "_" + getTime();
var levelSelected = taxonomicRankSelectedText.toLowerCase().replace(" ", "_")
var outputFilename = "compare_taxa_assignments_lca_" + lcaAbundanceCompare + "_" + levelSelected + "_" + date;
export_as_csv(csvToExport,outputFilename);
});

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

// var taxonomicRankSelectedCompare = 10;
// var taxonomicRankSelectedCompareText = "All levels";

var compareAccumulationDataAvailable = false;

var opacityTransitionTime = 450;


// function topTaxa(node,dataSum) {
//     return (node.chartValue / dataSum * 100 >= 1) ? node.name : "Other";
// };




    function topTaxaCompare(sample,run,thisSampleTree,chart,thresholdSelected,unclassified) {


    if (unclassified == "hide") {
      var unclassifiedIndex = findWithAttr(thisSampleTree, "name", "unclassified");
      if (unclassifiedIndex != -1) {

        thisSampleTree.splice(unclassifiedIndex,1);
      };
    };

      var sorted = thisSampleTree.sort(function(a, b) {
          return b.chartValue - a.chartValue
      })

      var topTaxaArray = [];

      for (const [i,taxa] of sorted.entries()) {

        var thresholdVal;

        // if(i < thresholdSelected) {
        //   taxa.threshold = taxa.name;
        // } else {
        //   taxa.threshold = "Other";
        // };

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
            //     return d3.sum(v, function(d) {
            //         return d.value;
            //     });
            })
            .entries(topTaxaArray)
            .map(function(g) {
                // return {
                //     label: g.key,
                //     value: g.values
                // }
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

// var taxaNameNCBIRankDictCompare;
var compareDonutTopN = 10;
var compareStackedBarTopN = 10;
var compareHmTaxaTopN = 10;
var formattedData = {};
// var tempCompareTaxa = {};


var taxaTotalCounts = {"donut":[],"stackedBar":[]};

var donutCompareData = [];

function updateComparePlots(compareSampleData) {

compareTaxaData = {"n/a":{name: "Other", ncbiRank: "n/a"}};

    if(isEmpty(compareSampleData)) {

    } else {

      formattedData = {"donut":[],"stackedBar":[],"hmTaxa":[]};
      // tempCompareTaxa = {"donut":[],"stackedBar":[]};
      // taxaNameNCBIRankDictCompare = {};
      taxaTotalCounts = {"donut":[],"stackedBar":[],"hmTaxa":[]};

// Object.keys(compareSampleData).forEach(function(sample) {


for (var sample of compareSampleData) {

  var id;
  var runId;

for (var sampleData of selectedCompareMetaDataArray) {
  if (sample.id == sampleData.pathName && sample.runId == sampleData.pathRun) {
    id = sampleData.id;
    runId = sampleData.runId;
  }
};



  sample.jsonId = id;
  sample.jsonRunId = runId;

  var data = sample.tree;


  var sampleLeaves = [];
  var sampleTaxaAtRank = [];

  function taxaAtRank(d) {

    if (d.rank < taxonomicRankSelectedCompare) {
      if(taxonomicRankSelectedCompare == 10){
        sampleTaxaAtRank.push(d);
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





    // var thisSampleTree = d3.layout.tree().nodes(data);


    // if(taxonomicRankSelectedCompare < 10) {
    //   var thisSampleTree = thisSampleTree.filter(function(d){
    //     if (d.rank == taxonomicRankSelectedCompare){
    //         return d;
    //      }
    //   });
    // };

    // var newLeafNodesArray = [];
    //
    // thisSampleTree.forEach(function(d) {
    //   let leafArr = labelNewLeaves(d,taxonomicRankSelectedCompare);
    //   newLeafNodesArray = [...newLeafNodesArray,...leafArr];
    // });
    //
    // newLeafNodesArray = [...new Set(newLeafNodesArray)];
    //
    // thisSampleTree.forEach(function(d) {
    //   if (newLeafNodesArray.includes(d.ncbiID)){
    //     d.chartValue = d.summedValue;
    //   } else {
    //     d.chartValue = d.value;
    //   };
    // });

    thisSampleTree = sampleTaxaAtRank;

    thisSampleTree.forEach(function(d) {
      if (sampleLeaves.includes(d.ncbiID)){
        d.chartValue = d.summedValue;
      } else {
        d.chartValue = d.value;
      };
    });


  topTaxaCompare(id,runId,thisSampleTree,"donut",compareDonutTopN,compareDonutUnclassified);

  topTaxaCompare(id,runId,thisSampleTree,"stackedBar",compareStackedBarTopN,compareStackedBarUnclassified);

  topTaxaCompare(id,runId,thisSampleTree,"hmTaxa",compareHmTaxaTopN,compareHmTaxaUnclassified);


  };

// var donutCompareData = formattedData["donut"];
// var stackedBarCompareData = formattedData["stackedBar"];

donutCompareData = [];
stackedBarCompareData = [];
hmTaxaData = [];

sortCompareNameArray = [];

if (sampleOrdertype == "Manual" && manualSortCompareNames.length !== 0) {
  sortCompareNameArray = manualSortCompareNames;
} else if (sampleOrdertype == "ID asc"){
//   sortCompareNameArray = compareSampleObjectArray.sort(function(x, y){
//    return d3.ascending(x.name, y.name);
// });
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
//   sortCompareNameArray = compareSampleObjectArray.sort(function(x, y){
//    return d3.descending(x.name, y.name);
// });

selectedCompareMetaDataArray.sort(function(x, y){
 return d3.descending(x.id, y.id);
})
  for (const sample of selectedCompareMetaDataArray) {
    sortCompareNameArray.push({
      name: sample.id,
      runId: sample.runId
    });
  };

} else if (sampleOrdertype == "Sequencing date asc"){
  selectedCompareMetaDataArray.sort(function(x, y){
   return d3.ascending(x.sequencingDate, y.sequencingDate);
})
    for (const sample of selectedCompareMetaDataArray) {
      // sortCompareNameArray.push(sample.id);
      sortCompareNameArray.push({
        name: sample.id,
        runId: sample.runId
      });
    };
} else if (sampleOrdertype == "Sequencing date desc"){
  selectedCompareMetaDataArray.sort(function(x, y){
   return d3.descending(x.sequencingDate, y.sequencingDate);
})
    for (const sample of selectedCompareMetaDataArray) {
      sortCompareNameArray.push({
        name: sample.id,
        runId: sample.runId
      });
    };
} else if (sampleOrdertype == "Yield asc"){
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
  // sortCompareNameArray = compareSampleObjectArray;
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

// d3.select("#compareSampleNameList").selectAll("li").sort(function(a, b){
//   return sortCompareNameArray.indexOf(a) - sortCompareNameArray.indexOf(b);
// })

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
  // var indexOfSample = findWithAttr(formattedData["donut"], "sample", sample.name);
  // if (indexOfSample != -1) {
  //   donutCompareData.push(formattedData["donut"][indexOfSample]);
  //   stackedBarCompareData.push(formattedData["stackedBar"][indexOfSample]);
  // }
}

// donutCompareTaxa = [...new Set(tempCompareTaxa["donut"])];
// stackedBarCompareTaxa = [...new Set(tempCompareTaxa["stackedBar"])];



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

// if (newCompareTreeData == true) {
  buildCompareTree(compareSampleData)
// };


plotCompareTree(newCompareTree);

// plotHeatmapTaxa(stackedBarCompareData,hmTaxaTaxa);

      };

};


function updateCompareSampleNameList(names) {
  // names.sort();


  var compareSampleList = d3.select("#compareSampleNameList").selectAll("li")
      .data(names);

      compareSampleList.enter()
          .append("li")
          .attr("data-id", function(d) {
            return d.id;})
          .attr("data-run", function(d) {
              return d.runId;})
          .text(function(d) {return d.id;});
          // .append("span").attr("class","fa-li")
          // .append("i").attr("class","fas fa-arrows-alt-v");

      compareSampleList.exit()
          .remove();


      compareSampleList.on("click", function(d) {
              var sampleName = $(this).data().id;
              var runId = $(this).data().run;

              socket.emit('selected-dashboard-sample',{
                clientId: uuid,
                name: sampleName,
                runId: runId
              });

              activeSidebarIcon($("#dashboard-item"));
              currentPage = "Dashboard";
              $("h1#pageTitle").text("Dashboard");
              $("#response").load("dashboard.html", function(){
                initialiseDashboardPage();
              });

            });



};

var newCompareTreeData = false;

socket.on('compare-tree-response', function(treeData) {
  compareTreeDataGlobal = treeData;
  newCompareTreeData = true;
  updateComparePlots(compareTreeDataGlobal);
  newCompareTreeData = false;
  // socket.emit('current-compare-samples-request',{
  //   clientId: uuid
  // });
  // updateCompareSampleNameList(compareSampleObjectArray);

});

socket.on('tree-update-available', request => {
  if(currentPage=="Compare") {
    socket.emit('compare-tree-request',{
      clientId: uuid,
      lca: "lca_"+lcaAbundanceCompare
    });
  };
});





// socket.on('compareSampleDataServer', function(compareSampleData) {
//
//   if ($('#stackedBarCard').length) {
//   compareTreeDataGlobal = compareSampleData.compareSampleData;
//   updateComparePlots(compareTreeDataGlobal);
//   };
// });

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

// socket.on('rarefactionData', function(data) {
//
//   if ($('#stackedBarCard').length) {
//   rareData = data;
//   plotRarefactionCompare(rareData);
//
//   };
// });

  var newCompareTree = {};

function buildCompareTree(data){

console.log("Build new compare tree")
  newCompareTree = {};
  var newCompareTreeTaxa = [];
  compareTreeSampleNodes = {};

    for (var sample of data) {
      var tree = sample.tree;
      // var sampleRun = sample.id + "_" + sample.runId;

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
              // var sampleRun = sample.name + "_" + sample.runId;


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
