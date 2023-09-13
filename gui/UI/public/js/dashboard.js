function initialiseDashboardPage() {

    taxonomyDataTable = $('#selectedColumn').DataTable({
      "columns": [
        { "title": "Name" },
        { "title": "Rank" },
        { "title": "Read Count" },
        { "title": "Read Proportion"},
        null
      ],
      "columnDefs": [
        { "targets": [0,1,2,3], "className": "dt-center"},
          {
              "targets": [ 4 ],
              "visible": false,
              "searchable": false
          }
      ],
      "dom": 'Bt',
      "paging" : false,
      "order": [[ 3, "desc" ]],
      "buttons": [{
                  extend: 'copy',
                  title: function(){
                                  var d = getDate();
                                  var t = getTime();
                                  return dashboardSampleName + '_Taxonomic_Table_' + d + "_" + t;
                              },
                  className: 'd-none',
                  attr:  {
                      id: 'taxaCopyButton'
                      }
                  },
                  {
                  extend: 'csv',
                  filename: function(){
                                  var d = getDate();
                                  var t = getTime();
                                  return dashboardSampleName + '_Taxonomic_Table_' + d + "_" + t;
                              },
                  className: 'd-none',
                  attr:  {
                      id: 'taxaCsvButton'
                      }
                }]
    });

    $("#dataTableSearchBox").keyup(function() {
    taxonomyDataTable.search(this.value).draw();
    updateTaxTable();
    });


        dashboardAmrTable = $('#dashboardAmrTable').DataTable({
          "language": {
            "emptyTable": "No AMR hits identified."
          },
        "columns": [
          { "title": "Name","className": "wideColumn"},
          { "title": "Antibiotic Resistance Ontology"},
          { "title": "Count"},
          { "title": "Putative host taxa" },
          { "title": "Putative plasmid hits" },
          { "title": "Average Accuracy"},
          { "title": "Description","className": "widerColumn"},
          { "title": "Resistance Mechanism"},
          { "title": "Gene Family"},
          { "title": "Drug Class","className": "widerColumn"}
        ],
          columnDefs: [
            { targets: "_all", "className": "dt-center"}
          ],
          "dom": 'Bt',
          "paging" : false,
          "order": [ 2, 'desc' ],
          "buttons": [{
                      extend: 'copy',
                      title: function(){
                                      var d = getDate();
                                      var t = getTime();
                                      return dashboardSampleName + '_chunk_' + dashboardAmrTableChunkSelected + '_AMR_' + d + "_" + t;
                                  },
                      className: 'd-none',
                      attr:  {
                          id: 'amrCopyButton'
                          }
                      },
                      {
                      extend: 'csv',
                      filename: function(){
                                      var d = getDate();
                                      var t = getTime();
                                      return dashboardSampleName + '_chunk_' + dashboardAmrTableChunkSelected + '_AMR_' + d + "_" + t;
                                  },
                      className: 'd-none',
                      attr:  {
                          id: 'amrCsvButton'
                          }}]
        });

        $("#dashboardAmrDataTableSearchBox").keyup(function() {
        dashboardAmrTable.search(this.value).draw();
        });

        $("#amrCsvExport").on("click", function() {
           $("#amrCsvButton").trigger("click");
        });

        $("#amrCopyExport").on("click", function() {
           $("#amrCopyButton").trigger("click");
        });

        $("#taxaCsvExport").on("click", function() {
           $("#taxaCsvButton").trigger("click");
        });

        $("#taxaCopyExport").on("click", function() {
           $("#taxaCopyButton").trigger("click");
        });

amrTableInitiated = false;
amrListCurrent = [];

resizeOptionsFullscreen();
initialiseDashboardDonut();
initialiseDashboardTree();
initialiseDashboardTreeMap();

initialiseReadsDonut();
initialiseAmrDonut();
initialiseAmrHitsDonut()

dashboardAccumulationDataAvailable = false;

socket.emit('dashboard-meta-request',{
  clientId: uuid
});
socket.emit('dashboard-tree-request',{
  clientId: uuid,
  lca: "lca_"+lcaAbundanceDashboard
});


socket.emit('dashboard-accumulationChart-request',{
  clientId: uuid,
  rank:taxonomicRankSelectedTextLowerCase,
  lca: "lca_"+lcaAbundanceDashboard
});

socket.emit('dashboard-dashboardAmrTable-request',{
  clientId: uuid
});

d3.selectAll("input[name='includeAncestorNodes']").on("change", function() {
  globUpdate(globDonutData);
  });


  d3.select('#downloadClassifications').on('click', function(){
  var csvToExport = convertDashboardDataToCSV(dashboardTaxaData);
  var date = getDate() + "_" + getTime();
  var levelSelected = taxonomicRankSelectedText.toLowerCase().replace(" ", "_")
  var outputFilename = currentDashboardSampleName + "_taxa_assignments_lca_" + lcaAbundanceDashboard + "_" + levelSelected + "_" + date;
  export_as_csv(csvToExport,outputFilename);
  });


  d3.select('#exportAmrDonutSVG').on('click', function(){
    dashboardAmrDonutExport("dashboardAmrDonutPlot","amrDonutLegend");
    var date = getDate() + "_" + getTime();
    var outputFilename = currentDashboardSampleName + "_amr_donut_lca_" + lcaAbundanceDashboard + "_" + date;
    save_as_svg_with_style('mergedAmrDonut','/css/dashboardAmrDonut.css',outputFilename,false,'merged-div');
  });

  d3.select('#exportAmrDonutPNG').on('click', function(){
    dashboardAmrDonutExport("dashboardAmrDonutPlot","amrDonutLegend");
    var date = getDate() + "_" + getTime();
    var outputFilename = currentDashboardSampleName + "_amr_donut_lca_" + lcaAbundanceDashboard + "_" + date;
    save_as_raster_with_style('mergedAmrDonut','/css/dashboardAmrDonut.css',outputFilename,2,'png',false,'merged-div');
  });

  d3.select('#exportAmrDonutJPG').on('click', function(){
    dashboardAmrDonutExport("dashboardAmrDonutPlot","amrDonutLegend");
    var date = getDate() + "_" + getTime();
    var outputFilename = currentDashboardSampleName + "_amr_donut_lca_" + lcaAbundanceDashboard + "_" + date;
    save_as_raster_with_style('mergedAmrDonut','/css/dashboardAmrDonut.css',outputFilename,2,'jpg',false,'merged-div');
  });


  d3.select('#exportDashboardAmrHitsDonutSVG').on('click', function(){
    dashboardAmrDonutExport("dashboardAmrHitsDonutPlot","amrHitsDonutLegend");
    var date = getDate() + "_" + getTime();
    var outputFilename = currentDashboardSampleName + "_amr_donut_lca_" + lcaAbundanceDashboard + "_" + date;
    save_as_svg_with_style('mergedAmrDonut','/css/dashboardAmrDonut.css',outputFilename,false,'merged-div');
  });

  d3.select('#exportDashboardAmrHitsDonutPNG').on('click', function(){
    dashboardAmrDonutExport("dashboardAmrHitsDonutPlot","amrHitsDonutLegend");
    var date = getDate() + "_" + getTime();
    var outputFilename = currentDashboardSampleName + "_amr_donut_lca_" + lcaAbundanceDashboard + "_" + date;
    save_as_raster_with_style('mergedAmrDonut','/css/dashboardAmrDonut.css',outputFilename,2,'png',false,'merged-div');
  });

  d3.select('#exportDashboardAmrHitsDonutJPG').on('click', function(){
    dashboardAmrDonutExport("dashboardAmrHitsDonutPlot","amrHitsDonutLegend");
    var date = getDate() + "_" + getTime();
    var outputFilename = currentDashboardSampleName + "_amr_donut_lca_" + lcaAbundanceDashboard + "_" + date;
    save_as_raster_with_style('mergedAmrDonut','/css/dashboardAmrDonut.css',outputFilename,2,'jpg',false,'merged-div');
  });


  d3.select('#exportTaxaDonutJPG').on('click', function(){
    dashboardTaxaDonutExport();
    var date = getDate() + "_" + getTime();
    var levelSelected = taxonomicRankSelectedText.toLowerCase().replace(" ", "_");
    var outputFilename = currentDashboardSampleName + "_" + levelSelected + "_taxa_donut_lca_" + lcaAbundanceDashboard + "_" + date;
    save_as_raster_with_style('mergedTaxaDonut','/css/dashboardTaxaDonut.css',outputFilename,2,'jpg',false,'merged-div');
  });

  d3.select('#exportTaxaDonutPNG').on('click', function(){
    dashboardTaxaDonutExport();
    var date = getDate() + "_" + getTime();
    var levelSelected = taxonomicRankSelectedText.toLowerCase().replace(" ", "_");
    var outputFilename = currentDashboardSampleName + "_" + levelSelected + "_taxa_donut_lca_" + lcaAbundanceDashboard + "_" + date;
    save_as_raster_with_style('mergedTaxaDonut','/css/dashboardTaxaDonut.css',outputFilename,2,'png',false,'merged-div');
  });

  d3.select('#exportTaxaDonutSVG').on('click', function(){
    dashboardTaxaDonutExport();
    var date = getDate() + "_" + getTime();
    var levelSelected = taxonomicRankSelectedText.toLowerCase().replace(" ", "_");
    var outputFilename = currentDashboardSampleName + "_" + levelSelected + "_taxa_donut_lca_" + lcaAbundanceDashboard + "_" + date;
    save_as_svg_with_style('mergedTaxaDonut','/css/dashboardTaxaDonut.css',outputFilename,false,'merged-div');
  });

  d3.select('#exportTaxaTreeSVG').on('click', function(){

    var date = getDate() + "_" + getTime();
    var levelSelected = taxonomicRankSelectedText.toLowerCase().replace(" ", "_");
    var outputFilename = currentDashboardSampleName + "_" + levelSelected + "_tree_lca_" + lcaAbundanceDashboard + "_" + date;
    var exportSVG = $("#dashboardTreeSVG")[0];
    var exportSVGWidth = exportSVG.getBBox().width + 200;
    $(exportSVG).attr('width',exportSVGWidth);

    save_as_svg_with_style('dashboardTreeSVG','/css/dashboardTree.css',outputFilename,true);
  });

  d3.select('#exportTaxaTreePNG').on('click', function(){

    var date = getDate() + "_" + getTime();
    var levelSelected = taxonomicRankSelectedText.toLowerCase().replace(" ", "_");
    var outputFilename = currentDashboardSampleName + "_" + levelSelected + "_tree_lca_" + lcaAbundanceDashboard + "_" + date;
    var exportSVG = $("#dashboardTreeSVG")[0];
    var exportSVGWidth = exportSVG.getBBox().width + 200;
    $(exportSVG).attr('width',exportSVGWidth);

    save_as_raster_with_style('dashboardTreeSVG','/css/dashboardTree.css',outputFilename,2,'png',true);
  });

  d3.select('#exportTaxaTreeJPG').on('click', function(){

    var date = getDate() + "_" + getTime();
    var levelSelected = taxonomicRankSelectedText.toLowerCase().replace(" ", "_");
    var outputFilename = currentDashboardSampleName + "_" + levelSelected + "_tree_lca_" + lcaAbundanceDashboard + "_" + date;
    var exportSVG = $("#dashboardTreeSVG")[0];
    var exportSVGWidth = exportSVG.getBBox().width + 200;
    $(exportSVG).attr('width',exportSVGWidth);

    save_as_raster_with_style('dashboardTreeSVG','/css/dashboardTree.css',outputFilename,2,'jpg',true);
  });

  d3.select('#exportTreeMapSVG').on('click', function(){

    var date = getDate() + "_" + getTime();
    var levelSelected = taxonomicRankSelectedText.toLowerCase().replace(" ", "_");
    var outputFilename = currentDashboardSampleName + "_" + levelSelected + "_treemap_lca_" + lcaAbundanceDashboard + "_" + date;
    var exportSVG = $("#treeMapSvg");
    var exportSVGWidth = exportSVG.width();
    $(exportSVG).attr('width',exportSVGWidth);

    save_as_svg_with_style('treeMapSvg','/css/dashboardTreeMap.css',outputFilename,true);
  });

  d3.select('#exportTreeMapPNG').on('click', function(){

    var date = getDate() + "_" + getTime();
    var levelSelected = taxonomicRankSelectedText.toLowerCase().replace(" ", "_");
    var outputFilename = currentDashboardSampleName + "_" + levelSelected + "_treemap_lca_" + lcaAbundanceDashboard + "_" + date;
    var exportSVG = $("#treeMapSvg");
    var exportSVGWidth = exportSVG.width();
    $(exportSVG).attr('width',exportSVGWidth);

    save_as_raster_with_style('treeMapSvg','/css/dashboardTreeMap.css',outputFilename,2,'png',true);
  });

  d3.select('#exportTreeMapJPG').on('click', function(){

    var date = getDate() + "_" + getTime();
    var levelSelected = taxonomicRankSelectedText.toLowerCase().replace(" ", "_");
    var outputFilename = currentDashboardSampleName + "_" + levelSelected + "_treemap_lca_" + lcaAbundanceDashboard + "_" + date;
    var exportSVG = $("#treeMapSvg");
    var exportSVGWidth = exportSVG.width();
    $(exportSVG).attr('width',exportSVGWidth);

    save_as_raster_with_style('treeMapSvg','/css/dashboardTreeMap.css',outputFilename,2,'jpg',true);
  });

  d3.select('#exportAccumulationSVG').on('click', function(){
    dashboardAccumulationExport();
    var date = getDate() + "_" + getTime();
    var levelSelected = taxonomicRankSelectedText.toLowerCase().replace(" ", "_");
    var outputFilename = currentDashboardSampleName + "_" + levelSelected + "_accumulation_" + lcaAbundanceDashboard + "_" + date;
    save_as_svg_with_style('mergedAccumulationPlot','/css/rarefactionCompare.css',outputFilename,false,'merged-div');
  });

  d3.select('#exportAccumulationPNG').on('click', function(){
    dashboardAccumulationExport();
    var date = getDate() + "_" + getTime();
    var levelSelected = taxonomicRankSelectedText.toLowerCase().replace(" ", "_");
    var outputFilename = currentDashboardSampleName + "_" + levelSelected + "_accumulation_" + lcaAbundanceDashboard + "_" + date;
    save_as_raster_with_style('mergedAccumulationPlot','/css/rarefactionCompare.css',outputFilename,2,'png',false,'merged-div');
  });

  d3.select('#exportAccumulationJPG').on('click', function(){
    dashboardAccumulationExport();
    var date = getDate() + "_" + getTime();
    var levelSelected = taxonomicRankSelectedText.toLowerCase().replace(" ", "_");
    var outputFilename = currentDashboardSampleName + "_" + levelSelected + "_accumulation_" + lcaAbundanceDashboard + "_" + date;
    save_as_raster_with_style('mergedAccumulationPlot','/css/rarefactionCompare.css',outputFilename,2,'jpg',false,'merged-div');
  });


  $("#reportGenerator").click(function() {
    var element = $('#response')[0];
    var opt = {
      filename:     'MARTi_dashboard.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale:2,
        windowWidth: 800
      },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf(element, opt);
  });

  var dateTime = getDate() + "_" + getTime();

$("#taxaTableAndDonutRow").hide();
$("#taxaTreeRow").hide();
$("#treeMapRow").hide();


$('input.toggle-vis').on('click', function (e) {
    // e.preventDefault();
    // Get the column API object
    let column = dashboardAmrTable.column($(this).attr('data-column'));
    // Toggle the visibility
    column.visible(!column.visible());
});

$("#dashboardSampleNameEdit").on("click", function() {
  $("#dashboardSampleNameInput").show();
  $("#dashboardSampleName").hide();
  $("#dashboardSampleNameInput").focus();
});

$("#dashboardSampleNameInput").on("blur", function() {

  $("#dashboardSampleNameInput").hide();
  $("#dashboardSampleName").show();
  $("#dashboardSampleName").text(dashboardSampleNameUserInput);
});


$("#dashboardSampleNameInput").on('input', function(){

    var inputName = $("#dashboardSampleNameInput").val();
    var placeholder = $("#dashboardSampleNameInput").attr('placeholder');
    var setId;
    if (inputName != ""){
        setId = inputName;
    } else {
        setId = placeholder;
    }

    dashboardSampleNameUserInput = setId;

    socket.emit('update-sample-name-request',{
      clientId: uuid,
      newId: setId,
      pathRun: dashboardSampleData.pathRun,
      pathName: dashboardSampleData.pathName,
      originalId: placeholder
    });
  });

  if (restrictedMode){
      $("#dashboardSampleNameEdit").hide();
  }

};

function prepareSampleNameInput(data){

  $("#dashboardSampleNameInput").val(data.id);
  if(data.hasOwnProperty("originalId")){
    $("#dashboardSampleNameInput").attr('placeholder', data.originalId);
  } else {
    $("#dashboardSampleNameInput").attr('placeholder', data.id);
  }
}

var taxonomicRankSelected = 10;
var taxonomicRankSelectedDashboardText = "All Levels";


var taxonomicRankChanged = false;
var dashboardSampleName;
var dashboardSampleRunId;
var newTreeData;
var dashboardSampleData;
var dashboardAccumulationDataAvailable = false;

var lcaAbundanceDashboard = "0.1";
var lcaAbundanceDashboardUnformatted = "0.1%";

var dashboardSampleNameUserInput;

socket.on('dashboard-meta-response', function(data) {
  dashboardSampleData = data.sample;
  let martiVersion = data.meta.martiVersion;

  $("#dashboardSampleName").text(dashboardSampleData.id);

  prepareSampleNameInput(dashboardSampleData);

  let displaybc;
  if (dashboardSampleData.hasOwnProperty("barcode")){
    if (dashboardSampleData.barcode == 0){
      displaybc = "None";
    } else {
      displaybc = "BC" + dashboardSampleData.barcode;
    }
  }
  $("#dashboardInfoCardBarcode").text(displaybc);

  $("#dashboardInfoCardEngineVersion").text(martiVersion);
  $("#dashboardInfoCardPipeline").text(dashboardSampleData.analysis.pipeline);

  $("#dashboardInfoCardMartiStatus").text(dashboardSampleData.martiStatus);

  $("#dashboardInfoCardReadsSequenced").text(thousandsSeparators(dashboardSampleData.readsPassBasecall));

  $("#dashboardInfoCardReadsClassified").text(thousandsSeparators(dashboardSampleData.readsWithClassification));

  let readsUnclassified = dashboardSampleData.readsAnalysed - dashboardSampleData.readsWithClassification;

  $("#dashboardInfoCardReadsUnclassified").text(thousandsSeparators(readsUnclassified));

  let classificationDb;
  let dbPath = dashboardSampleData.analysis.classification.database;
  let dbPathSegments = dbPath.split('/');
  if (dbPathSegments.length > 1){
    classificationDb = dbPathSegments.pop() || dbPathSegments.pop();
  } else {
    classificationDb = "-";
  }

  $("#dashboardInfoCardDatabase").text(classificationDb);


  plotReadsDonut(dashboardSampleData);

});

var root;
var globDonutData;
var treeMapData;
var dashboardTaxaData;

socket.on('dashboard-tree-response', function(treeData) {

  if ($("#awaitingAnalysisCard").is(":visible")) {
    $("#taxaTableAndDonutRow").show();
    $("#taxaTreeRow").show();
    $("#treeMapRow").show();
    $("#awaitingAnalysisCard").hide();
  }

  var target = {};
  dashboardSampleName = treeData.id;
  dashboardSampleRunId = treeData.run;
  root = treeData.treeData;
  treeMapData = JSON.parse(JSON.stringify(root));
  root.x0 = 0;
  root.y0 = 0;
  newTreeData = true;
  treeUpdate(root);
  treeMapUpdate(treeMapData);
  globDonutData = treeData.treeData2;

  globUpdate(globDonutData);

  newTreeData = false;

});



var readCountAtLevelMax;
var readCountAtLevelSum;
var newLeafNodes;

function globUpdate(data) {

  dashboardTaxaData = {"n/a":{name: "Other", ncbiRank: "n/a"}};

var donutLeaves = [];
var donutTaxaAtRank = [];

function taxaAtRank(d) {

  if (d.rank < taxonomicRankSelected) {
    if(taxonomicRankSelected == 10){
      donutTaxaAtRank.push(d);
    };
    if (d.children) {
      d.children.forEach(function(c){
          taxaAtRank(c);
        });
    } else {
      donutLeaves.push(d.ncbiID);
    };
  } else if (d.rank == taxonomicRankSelected) {
    donutLeaves.push(d.ncbiID);
    donutTaxaAtRank.push(d);
  };



};
taxaAtRank(data);



donutNodes = donutTaxaAtRank;

donutNodes.forEach(function(d) {
  if (donutLeaves.includes(d.ncbiID)){
    d.donutValue = d.summedValue;
  } else {
    d.donutValue = d.value;
  };
});

donutUpdate(returnTopTaxa(donutNodes));



  readCountAtLevelMax = d3.max(donutNodes, function(d) {return d.donutValue; });
  readCountAtLevelSum = d3.sum(donutNodes, function(d) { return d.donutValue; });
  levelMaxProportion = readCountAtLevelMax/readCountAtLevelSum * 100;

  taxonomyDataTable.clear();


  donutNodes.forEach(function(d) {

    if (d.donutValue > 0) {

    d.proportionClassifiedReads = d.donutValue/readCountAtLevelSum * 100;

    if (d.ncbiID != 0 && typeof d.ncbiID !== "undefined" ) {
      var ncbiUrl = '<a href="https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?mode=Info&id=' + d.ncbiID + '" target="_blank">'+ d.name +'</a>';
    } else {
      var ncbiUrl = '<a href="https://www.ncbi.nlm.nih.gov/Taxonomy' + '" target="_blank">'+ d.name +'</a>';
    }

    var rowID = d.name.replace(/ /g, "_").replace(/\./g, "_");

     taxonomyDataTable.row.add([ncbiUrl,d.ncbiRank,thousandsSeparators(d.donutValue),d.proportionClassifiedReads,d.ncbiID]).node().id = rowID;

 };

});

taxonomyDataTable.draw(false);


updateTaxTable()

};


var tableOpacityTransitionTime = 100;

function updateTaxTable(){



tr = d3.select("#selectedColumn tbody").selectAll("tr")

 tr.select(":nth-child(4)").each(function() {
   if (this.childNodes.length > 1) {

   }
   else {

     d3.select(this).append("svg")
       .attr("height", 12)
       .style("width", "100%")
       .append("rect")
         .attr("height", 12);
   }
 })

        tr.select(":nth-child(4)")
            .attr("class", "hidden-text")
            .style("vertical-align", "middle")
            .select("svg")
              .attr("height", 12)
              .style("width", "100%")
              .select("rect")
                .attr("height", 12)
                .style("width", function(d) { return (this.parentNode.parentNode.textContent/levelMaxProportion) * 100 + "%"; })
                .on("mousemove", function(d) {
             toolTipDiv.transition("donutSlice")
                .duration(0)
                .style("opacity", .95);


             toolTipDiv.html("<h5 class='mb-0'>" + this.parentNode.parentNode.parentNode.firstChild.textContent +
            "</h5><small class='text-gray-800'>" + this.parentNode.parentNode.parentNode.childNodes[1].textContent +
             "</em></small><hr class='toolTipLine'/>Read count: " + thousandsSeparators(this.parentNode.parentNode.parentNode.childNodes[2].textContent) +
             "<br/>Read %: " + Math.round((this.parentNode.parentNode.textContent*100))/100)
                .style("left", (tooltipPos(d3.event.pageX)) + "px")
                .style("top", (d3.event.pageY - 35) + "px");
            })
                .on("mouseout", function(d) {
                    toolTipDiv.transition()
                        .duration(50)
                        .style("opacity", 0);
                });

                tr.on("mouseover", function(d) {

                            var rowTaxa = this.firstChild.textContent;
                            var tempID = taxonomyDataTable.row(this).data()[4];
                            var match = "ncbiID";
                            if (tempID == "n/a"){
                              tempID = x.label;
                              match = "label";
                            };

                            d3.select("#dashboardTaxaDonutPlot").select(".slices").selectAll(".slice").filter(function(x) {
                              var sliceID = x.data.ncbiID;
                              var sliceMatch = "ncbiID";
                              if (sliceID == "n/a"){
                                sliceID = x.data.label;
                                sliceMatch = "label";
                              };

                                if (tempID != sliceID) {
                                    d3.select(this).transition("donutSlice").duration(tableOpacityTransitionTime).style("opacity", "0.2");
                                };
                            });


                          }).on("mouseout", function(d) {
                            var rowTaxa = this.firstChild.textContent;
                            var tempID = taxonomyDataTable.row(this).data()[4];
                            var match = "ncbiID";
                            if (tempID == "n/a"){
                              tempID = x.label;
                              match = "label";
                            };


                            d3.select("#dashboardTaxaDonutPlot").select(".slices").selectAll(".slice").filter(function(x) {
                              var sliceID = x.data.ncbiID;
                              var sliceMatch = "ncbiID";
                              if (sliceID == "n/a"){
                                sliceID = x.data.label;
                                sliceMatch = "label";
                              };

                                if (tempID != sliceID) {
                                    d3.select(this).transition("donutSlice").duration(tableOpacityTransitionTime).style("opacity", "1");
                                };
                            });


                          })

updateTaxTableColors()



};


function updateTaxTableColors() {
  d3.selectAll("#selectedColumn tbody tr td rect").style("fill", function(d) {
    var ind = findWithAttr(sorted,"name",this.parentNode.parentNode.parentNode.firstChild.textContent);

    return ((ind < indexOfDonutOtherCategory()) || (indexOfDonutOtherCategory() == -1)) ? dashboardDonutColor(ind % dashboardColorIndex) : dashboardDonutColor((ind+1) % dashboardColorIndex);
  });

};


function pathHighlight(taxa,selected,toggle){
  var nodePath = [];
  node.filter(function(y){
    if(y.name == taxa) {
      thisNode = this;
      nodePath.push(y);
      p = y;
    }
  })
  while(p.parent) {
    p = p.parent;
    nodePath.push(p);
  }

if(toggle == true){

  treeLine.filter(function(d) {
    if(nodePath.indexOf(d.target) > -1) {
      if (d3.select(this).classed("treeLineToggled")){
        d3.select(this).classed("treeLineToggled", false);
        d3.select(this).classed("treeLineSelected", false);

        d3.select(thisNode).select("text").style("font-weight", "normal");

      }
      else{
        d3.select(this).classed("treeLineToggled", true);
        d3.select(this).classed("treeLineSelected", true);
        d3.select(thisNode).select("text").style("font-weight", "bold");
      }
    }
  })

  node.filter(function(d) {
  if(nodePath.indexOf(d) > -1) {
    if (d3.select(this).select("circle").classed("treeLineToggled")){
      d3.select(this).select("circle").classed("treeLineToggled", false);
      d3.select(this).select("circle").classed("treeLineSelected", false);
    }
    else {
      d3.select(this).select("circle").classed("treeLineToggled", true);
      d3.select(this).select("circle").classed("treeLineSelected", true);
    }
    }
  });

}
else {


  treeLine.filter(function(d) {
    if(nodePath.indexOf(d.target) > -1) {
      if (d3.select(this).classed("treeLineToggled")){
        d3.select(this).classed("treeLineSelected", true);


        d3.select(thisNode).select("text").style("font-weight", "bold");
      }
      else{
        d3.select(this).classed("treeLineSelected", selected);


        if(selected == true){
          d3.select(thisNode).select("text").style("font-weight", "bold");
        }
        else{
          d3.select(thisNode).select("text").style("font-weight", "normal");
        }

      }
    }
  })

  node.filter(function(d) {
  if(nodePath.indexOf(d) > -1) {
    if (d3.select(this).select("circle").classed("treeLineToggled")){
      d3.select(this).select("circle").classed("treeLineSelected", true);
    }
    else {
      d3.select(this).select("circle").classed("treeLineSelected", selected);
    }
    }
  });


}

d3.select(thisNode).select("rect")
.attr("x", function(d) { return d.children ? this.nextSibling.getBBox().x - 2 : this.nextSibling.getBBox().x - 2; })
.attr("y", function(d) { return this.nextSibling.getBBox().y - 0.5; })
.attr("width",function(d) { return this.nextSibling.getBBox().width + 4; })
.attr("height", function(d) { return this.nextSibling.getBBox().height + 1 ; });

}





var dashboardChartVisibility = {};


function initialisePlotVisibility(chart,visible) {

        if (visible) {
          $("#"+chart+"Row").show();
          $("#"+chart+"Add").hide();
        } else {
          $("#"+chart+"Row").hide();
          $("#"+chart+"Add").show();
        };

        hideAddChartsRow();

        $("#"+chart+"Close").click(function() {
           dashboardChartVisibility[chart] = false;
           $("#"+chart+"Row").hide();
           $("#"+chart+"Add").show();
           hideAddChartsRow();
        });

        $("#"+chart+"Add").click(function() {
           dashboardChartVisibility[chart] = true;

           if (dashboardAmrPlots.includes(chart)) {
             socket.emit('dashboard-dashboardAmrTable-request',{
               clientId: uuid
             });
           } else if (chart == "accumulationChart") {
             socket.emit('dashboard-accumulationChart-request',{
               clientId: uuid,
               rank:taxonomicRankSelectedTextLowerCase,
               lca: "lca_"+lcaAbundanceDashboard
             });
           }
           else {
             socket.emit('dashboard-' + chart + '-request',{
               clientId: uuid
             });
           }
           $("#"+chart+"Row").show();
           $("#"+chart+"Add").hide();
           $("#addChartOptions, #addChartPlusSign").toggle();
           hideAddChartsRow();
       });

};



function hideAddChartsRow() {
  var hideAddCharts = true;
  for (const bool of Object.values(dashboardChartVisibility)) {
    if (!bool) {
      hideAddCharts = false;
      break;
    }
  };
  if (hideAddCharts) {
    $(".row > div > #addChart").hide();
  } else {
    $(".row > div > #addChart").show();
  };
};

function resizeOptionsFullscreen() {



new ResizeSensor($('#taxaTable'), function(){
updateTaxTable()

});


  $('#taxonomicLevelSelectorDashboard').text(taxonomicRankSelectedDashboardText);
  taxonomicRankSelectedText = taxonomicRankSelectedDashboardText;

$('#rarefactionCardTitleDashboard').text("Taxa accumulation - " + taxonomicRankSelectedText);

    taxonomicRankSelectedTextLowerCase = taxonomicRankSelectedText.toLowerCase().replace(" ", "");

  $('#taxonomicLevelSelectorMenu a.rank:contains(' + taxonomicRankSelectedDashboardText + ')').addClass("active");


$('#taxonomicLevelSelectorMenu').on( 'click', 'a.rank', function () {
        if ( $(this).hasClass('active') ) {

        }
        else {
            $('#taxonomicLevelSelectorMenu a.rank').removeClass('active');
            taxonomicRankSelectedDashboardText = this.textContent;
            taxonomicRankSelectedText = taxonomicRankSelectedDashboardText;

              taxonomicRankSelectedTextLowerCase = taxonomicRankSelectedText.toLowerCase().replace(" ", "");


            $('#taxonomicLevelSelectorDashboard').text(taxonomicRankSelectedText);
            $('#rarefactionCardTitleDashboard').text("Taxa accumulation - " + taxonomicRankSelectedText);
            $(this).addClass('active');
            taxonomicRankSelected = taxonomicLevelDict[taxonomicRankSelectedDashboardText];
            taxonomicRankChanged = true;
            treeUpdate(root);
            if(taxonomicRankSelectedDashboardText == "Domain"){
              $("#dashboardTreeMapColourBy").prop("selectedIndex",1);
              dashboardTreeMapColourBy = $("#dashboardTreeMapColourBy").val();
              treeMapUpdate(treeMapData);
            } else {
              $("#dashboardTreeMapColourBy").prop("selectedIndex",0);
              dashboardTreeMapColourBy = $("#dashboardTreeMapColourBy").val();
              treeMapUpdate(treeMapData);
            }
            taxonomicRankChanged = false;
            globUpdate(globDonutData);
            socket.emit('dashboard-accumulationChart-request',{
              clientId: uuid,
              rank:taxonomicRankSelectedTextLowerCase,
              lca: "lca_"+lcaAbundanceDashboard
            });

        }

});

$('#minimumAbundanceButtonDashboard').on( 'click', 'button', function () {
        if ( $(this).hasClass('active') ) {


        }
        else {
            $('#minimumAbundanceButtonDashboard>button').removeClass('active');
            $(this).addClass('active');
            lcaAbundanceDashboardUnformatted = this.textContent;
            lcaAbundanceDashboard = lcaFormat(this.textContent.slice(0, -1));
            socket.emit('dashboard-tree-request',{
              clientId: uuid,
              lca: "lca_"+lcaAbundanceDashboard
            });
            socket.emit('dashboard-accumulationChart-request',{
              clientId: uuid,
              rank:taxonomicRankSelectedTextLowerCase,
              lca: "lca_"+lcaAbundanceDashboard
            });
        }

});

$('#minimumAbundanceButtonDashboard>button').removeClass('active');

$("#minimumAbundanceButtonDashboard>button").filter(function() {
    return $(this).text() == lcaAbundanceDashboardUnformatted;
}).addClass("active");

dashboardChartVisibility = {};

$(".row > div > #addChart").hide();
$("#addChartOptions").hide();

$("#accumulationChartRow").hide();
$("#dashboardAmrTableRow").hide();
$("#dashboardAmrDonutRow").hide();
$("#dashboardAmrHitsDonutRow").hide();

$("#accumulationChartAdd").hide();
$("#dashboardAmrTableAdd").hide();
$("#dashboardAmrDonutAdd").hide();
$("#dashboardAmrHitsDonutAdd").hide();

$('#addChartPlusSign').on("click touchstart", function(e){
   $("#addChartOptions, #addChartPlusSign").toggle();
});



$(document).mouseup(function (e) {
     if ($(e.target).closest("#addChartOptions").length === 0) {
        $("#addChartOptions").hide();
        $("#addChartPlusSign").show();
     }
 });


fullScreenIconStart();

};


socket.on('tree-update-available', request => {
  if(currentPage=="Dashboard") {
    socket.emit('dashboard-tree-request',{
      clientId: uuid,
      lca: "lca_"+lcaAbundanceDashboard
    });
  };
});

socket.on('dashboard-accumulationChart-response', function(data) {

  if (!dashboardChartVisibility.hasOwnProperty("accumulationChart")) {
    dashboardChartVisibility["accumulationChart"] = true;
    initialisePlotVisibility("accumulationChart",true);
  };
  if (!dashboardAccumulationDataAvailable) {
    initialiseCompareAccumulation();
    dashboardAccumulationDataAvailable = true;
  }
  rareData = data;
  $('#no-data-accumulation').addClass('d-none');
  plotRarefactionCompare(rareData);

});

socket.on('accumulation-update-available', request => {

  if (!dashboardChartVisibility.hasOwnProperty("accumulationChart")) {
    dashboardChartVisibility["accumulationChart"] = true;
    initialisePlotVisibility("accumulationChart",true);
  };


  if(currentPage=="Dashboard" && dashboardChartVisibility["accumulationChart"] == true) {
    socket.emit('dashboard-accumulationChart-request',{
      clientId: uuid,
      rank:taxonomicRankSelectedTextLowerCase,
      lca: "lca_"+lcaAbundanceDashboard
    });
  };
});



socket.on('dashboard-dashboardAmrTable-response', function(data) {
    dashboardAmrReponseData = data;

    if (!dashboardChartVisibility.hasOwnProperty("dashboardAmrTable")) {
      dashboardChartVisibility["dashboardAmrTable"] = true;
      initialisePlotVisibility("dashboardAmrTable",true);
    }

    updateAmrTable(dashboardAmrReponseData);

    if (dashboardAmrReponseData["geneList"].length > 0){
      if (!dashboardChartVisibility.hasOwnProperty("dashboardAmrDonut")) {
        dashboardChartVisibility["dashboardAmrDonut"] = true;
        initialisePlotVisibility("dashboardAmrDonut",true);
      }


      plotAmrDonut(dashboardAmrReponseData);

      if (!dashboardChartVisibility.hasOwnProperty("dashboardAmrHitsDonut")) {
        dashboardChartVisibility["dashboardAmrHitsDonut"] = true;
        initialisePlotVisibility("dashboardAmrHitsDonut",true);
      }

      plotAmrHitsDonut(dashboardAmrReponseData);
    }

  });

  const dashboardAmrPlots = ["dashboardAmrTable","dashboardAmrDonut","dashboardAmrHitsDonut"];


  socket.on('amr-update-available', request => {


    for (const plot of dashboardAmrPlots){
      if (!dashboardChartVisibility.hasOwnProperty(plot)) {
        dashboardChartVisibility[plot] = true;
        initialisePlotVisibility(plot,true);
      }
    }

    for (const plot of dashboardAmrPlots){
      if(currentPage=="Dashboard" && dashboardChartVisibility[plot] == true) {
        socket.emit('dashboard-dashboardAmrTable-request',{
          clientId: uuid
        });
        break;
      }
    }


  });



var dashboardAmrTableChunkSelected = 10;
var dashboardAmrTableChunkTotal = 10;


function firstAmrTableRun() {

    d3.selectAll("input[name='dashboardAmrTableChunk']").property("value",dashboardAmrTableChunkSelected);


  d3.selectAll("input[name='dashboardAmrTableChunk']").on("input", function(){
    var chunkSelected = d3.select(this).property("value");
    d3.selectAll("input[name='dashboardAmrTableChunk']").property("value",chunkSelected);
    d3.selectAll(".dashboard-amr-chunk-value").text(chunkSelected+"/"+dashboardAmrTableChunkTotal);
    d3.selectAll(".dashboard-amr-chunk-time").text(dashboardAmrTableChunkTime[chunkSelected]);
  });

  d3.selectAll("input[name='dashboardAmrTableChunk']").on("change", function(){
    dashboardAmrTableChunkSelected = parseInt(d3.select(this).property("value"));
    updateAmrTable(dashboardAmrReponseData);
    if (dashboardAmrReponseData["geneList"].length > 0){
      plotAmrDonut(dashboardAmrReponseData);
      plotAmrHitsDonut(dashboardAmrReponseData);
    }

  });

}


function updateAmrTable(amrData){


  dashboardAmrTableChunkTotal = amrData.currentChunk;
  dashboardAmrTableChunkTime = amrData.chunkTime;

d3.selectAll("input[name='dashboardAmrTableChunk']").property("max", parseInt(dashboardAmrTableChunkTotal));

if(amrTableInitiated == false){
  dashboardAmrTableChunkSelected = dashboardAmrTableChunkTotal;
  firstAmrTableRun();
}

amrTableInitiated = true;


d3.selectAll(".dashboard-amr-chunk-value").text(dashboardAmrTableChunkSelected+"/"+dashboardAmrTableChunkTotal);
d3.selectAll(".dashboard-amr-chunk-time").text(dashboardAmrTableChunkTime[dashboardAmrTableChunkSelected]);


  for (const gene of amrData.geneList){


      if (gene.count.hasOwnProperty(dashboardAmrTableChunkSelected)) {
        var totalCountAtChunk = gene.count[dashboardAmrTableChunkSelected];
      } else {
        var highestChunk = 0;
        for (const [chunk, count] of Object.entries(gene.count)) {
          if (chunk < dashboardAmrTableChunkSelected) {
            var highestChunk = chunk;
          } else {
            break;
          }
        }
        var totalCountAtChunk = gene.count[highestChunk];
      }

      gene.totalGeneCount = totalCountAtChunk;

      if (gene.averageAccuracy.hasOwnProperty(dashboardAmrTableChunkSelected)) {
        var averageAccuracyAtChunk = gene.averageAccuracy[dashboardAmrTableChunkSelected];
      } else {
        var highestChunk = 0;
        for (const [chunk, accuracy] of Object.entries(gene.averageAccuracy)) {
          if (chunk < dashboardAmrTableChunkSelected) {
            var highestChunk = chunk;
          } else {
            break;
          }
        }
        var averageAccuracyAtChunk = gene.averageAccuracy[highestChunk];
      }

      gene.averageAccuracyAtChunk = averageAccuracyAtChunk;

    gene.speciesCounts = [];
    gene.plasmidCounts = [];

    if (Array.isArray(gene.species)){
      for (const species of gene.species) {
        var counts = species.chunkCounts;
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
        }

        if (speciesCountAtChunk !== 0) {
          gene.speciesCounts.push(species.name+" ("+speciesCountAtChunk+")");
        }

        if (species.hasOwnProperty("chunkPlasmidCounts")){
          var plasmidCountAtChunk = getCountAtChunk(species.chunkPlasmidCounts);
          if (plasmidCountAtChunk !== 0) {
            gene.plasmidCounts.push(species.name+" ("+plasmidCountAtChunk+")");
          }
        }


      }

    } else {
      for (const [species, counts] of Object.entries(gene.species)) {
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
        }

        if (speciesCountAtChunk !== 0) {
          gene.speciesCounts.push(species+" ("+speciesCountAtChunk+")");
        }

      }
    }


    sortCounts(gene.speciesCounts);
    sortCounts(gene.plasmidCounts);

    if (gene.plasmidCounts.length == 0 ){
      gene.plasmidCounts.push("n/a")
    }

  };





  dashboardAmrTable.clear();

    for (const gene of amrData.geneList) {
      if (gene.totalGeneCount > 0) {
        var aroNum = gene.cardId.split(":")[1];
        var cardUrl = '<a href="https://card.mcmaster.ca/aro/' + aroNum + '" target="_blank">'+ aroNum +'</a>';

       amrListCurrent.push(gene.name);

       var resMech = "n/a";
       var geneFam = "n/a";
       var drugClass = "n/a";
       if(gene.hasOwnProperty("shortName")){
         resMech = gene.resistanceMechanism;
         geneFam = gene.geneFamily;
         drugClass = gene.drugClass.replaceAll(";","; ");
       }

       dashboardAmrTable.row.add([gene.name,cardUrl,gene.totalGeneCount,gene.speciesCounts.join(", "),gene.plasmidCounts.join(", "),gene.averageAccuracyAtChunk,gene.description,resMech,geneFam,drugClass]);
    };
   };

  dashboardAmrTable.draw(false);

  };

  function sortCounts(array) {
    var regExp = /\(([^)]*)\)[^(]*$/;
    array.sort(function(a, b) {
      var countA = parseInt(regExp.exec(a)[1]);
      var countB = parseInt(regExp.exec(b)[1]);
      if (countA > countB) {
        return -1;
      } else if (countA < countB) {
        return 1;
      }
      return 0;
    });
  }

  function convertDashboardDataToCSV(data) {

    var run = dashboardSampleData.runId;
    var sample = dashboardSampleData.id;

    var dataArray = [];
    var header = [];
    header.push('Taxon','NCBI ID','NCBI Rank','Read count','Summed read count');
    // for (var sample of sortCompareNameArray) {
      // var sampleNameRunCount = sample + " (" + run + ") Read count";
      // header.push(sampleNameRunCount);
    // };
    // for (var sample of sortCompareNameArray) {
      // var sampleNameRunSummed = sample + " (" + run + ") Summed read count";
      // header.push(sampleNameRunSummed);
    // };
    dataArray.push(header);
    for (const [key, value] of Object.entries(data)) {
      if (key !== "n/a") {
        var keyRow = [];
        keyRow.push(value.name);
        keyRow.push(key);
        keyRow.push(value.ncbiRank);
        keyRow.push(value.count);
        keyRow.push(value.summedCount);
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
  // function prepareAmrInfoModal(data){
  //
  //   var aroNum = data.cardId.split(":")[1];
  //
  //   $("#amrInfoGeneName").text(data.name);
  //   $("#amrInfoAccession").text(aroNum);
  //
  //   if(data.hasOwnProperty("shortName")) {
  //     $("#amrInfoShortName").text(data.shortName);
  //     $("#amrInfoGeneFamily").text(data.geneFamily);
  //     $("#amrInfoDrugClass").text(data.drugClass.replaceAll(";","; "));
  //     $("#amrInfoResMech").text(data.resistanceMechanism);
  //   } else {
  //     $("#amrInfoShortName").text("n/a");
  //     $("#amrInfoGeneFamily").text("n/a");
  //     $("#amrInfoDrugClass").text("n/a");
  //     $("#amrInfoResMech").text("n/a");
  //   }
  //
  //   $("#amrInfoDescription").text(data.description);
  //   var cardUrl = "https://card.mcmaster.ca/aro/" + aroNum;
  //   $("#amrInfoUrl").html('<a href="' + cardUrl + '" target="_blank">'+ cardUrl +'</a>');
  //
  // }
