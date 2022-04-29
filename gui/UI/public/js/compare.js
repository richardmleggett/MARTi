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
  $('#minimumAbundanceButtonCompare>button:contains(' + lcaAbundanceCompareUnformatted + ')').addClass("active");


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
              updateComparePlots(compareTreeDataGlobal);
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
          }
  });

  initialiseCompareStackedBar();
  initialiseCompareMultiDonut();
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


  d3.selectAll("input[name='compareStackedBarUnclassified']").on("change", function() {
  compareStackedBarUnclassified = d3.select(this).property("value");
  updateComparePlots(compareTreeDataGlobal);
});

d3.selectAll("input[name='compareDonutUnclassified']").on("change", function() {
compareDonutUnclassified = d3.select(this).property("value");
updateComparePlots(compareTreeDataGlobal);
});

  compareStackedBarUnclassified = "show",
  compareDonutUnclassified = "show";
  updateCompareSampleNameList(compareSampleObjectArray);

};

var compareStackedBarUnclassified,
compareDonutUnclassified;

var sortableCompareNames;
var manualSortCompareNames = [];

var sampleOrdertype;

var lcaAbundanceCompareUnformatted = "0.1%";
var lcaAbundanceCompare = "0.1";
var taxonomicRankSelectedCompare = 7;
var taxonomicRankSelectedCompareText = "Genus";

var compareAccumulationDataAvailable = false;

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
                    ncbiRank: g.values.ncbiRank
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
            sampleDataArray[d.label] = {value:d.value,ncbiRank:d.ncbiRank};
            // sampleDataArray[d.label] = d.value;
            tempCompareTaxa[chart].push(d.label);
        });

        formattedData[chart].push(sampleDataArray);
};

// var taxaNameNCBIRankDictCompare;
var compareDonutTopN = 10;
var compareStackedBarTopN = 10
var formattedData = {};
var tempCompareTaxa = {};

var donutCompareData = [];

function updateComparePlots(compareSampleData) {



    if(isEmpty(compareSampleData)) {

    } else {

      formattedData = {"donut":[],"stackedBar":[]};
      tempCompareTaxa = {"donut":[],"stackedBar":[]};
      // taxaNameNCBIRankDictCompare = {};


// Object.keys(compareSampleData).forEach(function(sample) {
for (var sample of compareSampleData) {


  var id = sample.id;
  var runId = sample.runId;
  var data = sample.tree;


    var thisSampleTree = d3.layout.tree().nodes(data);


    if(taxonomicRankSelectedCompare < 10) {
      var thisSampleTree = thisSampleTree.filter(function(d){
        if (d.rank == taxonomicRankSelectedCompare){
            return d;
         }
      });
    };

    var newLeafNodesArray = [];

    thisSampleTree.forEach(function(d) {
      let leafArr = labelNewLeaves(d,taxonomicRankSelectedCompare);
      newLeafNodesArray = [...newLeafNodesArray,...leafArr];
    });

    newLeafNodesArray = [...new Set(newLeafNodesArray)];

    thisSampleTree.forEach(function(d) {
      if (newLeafNodesArray.includes(d.ncbiID)){
        d.chartValue = d.summedValue;
      } else {
        d.chartValue = d.value;
      };
    });

    var taxaLevelSummedValue = d3.sum(thisSampleTree, function(d) {
        return d.chartValue;
    });


  topTaxaCompare(id,runId,thisSampleTree,"donut",compareDonutTopN,compareDonutUnclassified);

  topTaxaCompare(id,runId,thisSampleTree,"stackedBar",compareStackedBarTopN,compareStackedBarUnclassified);




  };

// var donutCompareData = formattedData["donut"];
// var stackedBarCompareData = formattedData["stackedBar"];

donutCompareData = [];
var stackedBarCompareData = [];

var sortCompareNameArray = [];

if (sampleOrdertype == "Manual" && manualSortCompareNames.length !== 0) {
  sortCompareNameArray = manualSortCompareNames;
} else if (sampleOrdertype == "ID asc"){
  // sortCompareNameArray = compareSampleObjectArray.sort(d3.ascending);
  sortCompareNameArray = compareSampleObjectArray.sort(function(x, y){
   return d3.ascending(x.name, y.name);
});
} else if (sampleOrdertype == "ID desc"){
  // sortCompareNameArray = compareSampleObjectArray.sort(d3.descending);
  sortCompareNameArray = compareSampleObjectArray.sort(function(x, y){
   return d3.descending(x.name, y.name);
});
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
  sortCompareNameArray = compareSampleObjectArray;
}

d3.select("#compareSampleNameList").selectAll("li").sort(function(a, b){
  return sortCompareNameArray.indexOf(a) - sortCompareNameArray.indexOf(b);
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

  // var indexOfSample = findWithAttr(formattedData["donut"], "sample", sample.name);
  // if (indexOfSample != -1) {
  //   donutCompareData.push(formattedData["donut"][indexOfSample]);
  //   stackedBarCompareData.push(formattedData["stackedBar"][indexOfSample]);
  // }
}

donutCompareTaxa = [...new Set(tempCompareTaxa["donut"])];
stackedBarCompareTaxa = [...new Set(tempCompareTaxa["stackedBar"])];

plotStackedBar(stackedBarCompareData,stackedBarCompareTaxa);

plotCompareDonut(donutCompareData,donutCompareTaxa);



      };

};


function updateCompareSampleNameList(names) {
  // names.sort();


  var compareSampleList = d3.select("#compareSampleNameList").selectAll("li")
      .data(names);

      compareSampleList.enter()
          .append("li")
          .attr("data-id", function(d) {
            return d.name;})
          .attr("data-run", function(d) {
              return d.runId;})
          .text(function(d) {return d.name;});
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


socket.on('compare-tree-response', function(treeData) {
  compareTreeDataGlobal = treeData;
  updateComparePlots(compareTreeDataGlobal);
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
