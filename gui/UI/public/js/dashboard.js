function initialiseDashboardPage() {

    taxonomyDataTable = $('#selectedColumn').DataTable({
      // "data": existingTaxa,
      "columns": [
        { "title": "Name" },
        { "title": "Rank" },
        { "title": "Read Count" },
        { "title": "Read Proportion"}
      ],
        columnDefs: [
      { targets: "_all", "className": "dt-center"}
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

    // $('#selectedColumn tbody').on( 'click', 'tr', function () {
    //         if ( $(this).hasClass('selected') ) {
    //             $(this).removeClass('selected');
    //
    //         }
    //         else {
    //
    //             taxonomyDataTable.$('tr.selected').removeClass('selected');
    //             $(this).addClass('selected');
    //
    //         }
    //
    //         //Tree
    //         var rowTaxa = this.firstChild.textContent
    //         // pathHighlight(rowTaxa,true,true)
    //     } );

        dashboardAmrTable = $('#dashboardAmrTable').DataTable({
        "columns": [
          { "title": "Name" , "width": "10%"},
          { "title": "Antibiotic Resistance Ontology", "width": "2%"},
          { "title": "Count", "width": "2%"},
          { "title": "Average Accuracy", "width": "2%"},
          { "title": "Walkout Species" },
          { "title": "Description"}
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
// existingTaxa = [];

resizeOptionsFullscreen();
initialiseDashboardDonut();
initialiseDashboardTree();
initialiseDashboardTreeMap();

initialiseAmrDonut();
initialiseReadsDonut();

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
    window.open("/"+ dashboardSampleRunId + "/"+ dashboardSampleName + "/" + lcaAbundanceDashboard + "/csv");
  });


  d3.select('#exportAmrDonutSVG').on('click', function(){
    dashboardAmrDonutExport();
    var date = getDate() + "_" + getTime();
    var outputFilename = currentDashboardSampleName + "_amr_donut_lca_" + lcaAbundanceDashboard + "_" + date;
    save_as_svg_with_style('mergedAmrDonut','/css/dashboardAmrDonut.css',outputFilename,false,'merged-div');
  });

  d3.select('#exportAmrDonutPNG').on('click', function(){
    dashboardAmrDonutExport();
    var date = getDate() + "_" + getTime();
    var outputFilename = currentDashboardSampleName + "_amr_donut_lca_" + lcaAbundanceDashboard + "_" + date;
    save_as_raster_with_style('mergedAmrDonut','/css/dashboardAmrDonut.css',outputFilename,2,'png',false,'merged-div');
  });

  d3.select('#exportAmrDonutJPG').on('click', function(){
    dashboardAmrDonutExport();
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
    // setInlineStyles(element);
    var opt = {
      filename:     'MARTi_dashboard.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale:2,
        // width: 950,
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



};



var taxonomicRankSelected = 10;
var taxonomicRankSelectedDashboardText = "All Levels";


var taxonomicRankChanged = false;
var dashboardSampleName;
var dashboardSampleRunId;
var newTreeData;
var dashboardSampleData;
// var existingTaxa;
var dashboardAccumulationDataAvailable = false;

var lcaAbundanceDashboard = "0.1";
var lcaAbundanceDashboardUnformatted = "0.1%";

socket.on('dashboard-meta-response', function(data) {
  dashboardSampleData = data.sample;
  // $("#dashboardInfoCardYield").text(thousandsSeparators(sampleData.yieldGb.toFixed(3)));
  $("#dashboardSampleName").text(dashboardSampleData.id);
  $("#dashboardInfoCardMartiStatus").text(dashboardSampleData.martiStatus);
  $("#dashboardInfoCardReadsSequenced").text(thousandsSeparators(dashboardSampleData.readsPassBasecall));
  $("#dashboardInfoCardPipeline").text(thousandsSeparators(dashboardSampleData.analysis.pipeline));
  // $("#dashboardInfoCardPassedFilter").text(thousandsSeparators(sampleData.readsPassedFilter));
  plotReadsDonut(dashboardSampleData);

});

var root;
var globDonutData;
var treeMapData;

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
  // $("#dashboardSampleName").text(dashboardSampleName);
  root = treeData.treeData;
  treeMapData = JSON.parse(JSON.stringify(root));
  root.x0 = 0;
  root.y0 = 0;
  newTreeData = true;
  // setTreeRoot(root);
  treeUpdate(root);
  treeMapUpdate(treeMapData);
  // data = root;
  globDonutData = treeData.treeData2;

  globUpdate(globDonutData);

  newTreeData = false;

});



var readCountAtLevelMax;
var readCountAtLevelSum;
var newLeafNodes;

function globUpdate(data) {

  // globNodes = tree.nodes(data);
  donutNodes = d3.layout.tree().nodes(data);

  //Read Count Card
  // totalClassifiedReads = d3.sum(globNodes, function(d) {
  //   return d.value;
  // });

  // document.getElementById("totalReadCountCard").innerHTML = thousandsSeparators(totalClassifiedReads);

  //Taxonomy Count Card

    // totalTaxonomyCount = d3.selectAll(globNodes).size()
    // document.getElementById("totalTaxonomyCountCard").innerHTML = thousandsSeparators(totalTaxonomyCount);


   // globNodes = globNodes.filter(function(d){
   //   if (d.rank <= taxonomicRankSelected){
   //      // globNodeLevelNames.push(d.name);
   //       return d;
   //    }
   //      });



// excludedLeavesList = [];
//
// globNodes.forEach(function(d) {
//   let leafArr = excludedLeavesListFunction(d,taxonomicRankSelected);
//   excludedLeavesList = [...excludedLeavesList,...leafArr];
// });
//
//
// globNodes = globNodes.filter(function(d){
//   if (!excludedLeavesList.includes(d.ncbiID) && d.rank != 0){
//       return d;
//    }
//      });


if (taxonomicRankSelected < 10){

  donutNodes = donutNodes.filter(function(d){
  if (d.rank == taxonomicRankSelected){
         return d;
       }
     });
};


newLeafNodes = [];

donutNodes.forEach(function(d) {
  let leafArr = labelNewLeaves(d,taxonomicRankSelected);
  newLeafNodes = [...newLeafNodes,...leafArr];
});

newLeafNodes = [...new Set(newLeafNodes)];


// if (taxonomicRankSelected < 10){
//
//   if ($("input[name='includeAncestorNodes'][value='off']").is(':checked')) {
//     donutAncestorsOff();
//         }
//       else {
//     donutAncestorsOn();
//              }
// }
// else{
//   donutNodes = globNodes;
// };




donutNodes.forEach(function(d) {
  if (newLeafNodes.includes(d.ncbiID)){
    d.donutValue = d.summedValue;
  } else {
    d.donutValue = d.value;
  };
});



donutUpdate(returnTopTaxa(donutNodes));



      // if (taxonomicRankSelected == 10) {
      //   levelTaxonomyCount = totalTaxonomyCount;
      //   // document.getElementById("levelTaxonomyCountCard").innerHTML = thousandsSeparators(levelTaxonomyCount);
      // } else {
      //   levelTaxonomyCount = d3.selectAll(donutNodes).size()
      //   // document.getElementById("levelTaxonomyCountCard").innerHTML = thousandsSeparators(levelTaxonomyCount);
      // }


  readCountAtLevelMax = d3.max(donutNodes, function(d) {return d.donutValue; });
  readCountAtLevelSum = d3.sum(donutNodes, function(d) { return d.donutValue; });
  levelMaxProportion = readCountAtLevelMax/readCountAtLevelSum * 100;

// var nodeNames = []
// var removeRowList = []

// donutNodes.forEach(function(d) {
//   nodeNames.push(d.name);
// });


  // existingTaxa = [];
  taxonomyDataTable.clear();




// Add new rows to taxa table
  donutNodes.forEach(function(d) {

    if (d.donutValue > 0) {

    d.proportionClassifiedReads = d.donutValue/readCountAtLevelSum * 100;

    if (d.ncbiID != 0 && typeof d.ncbiID !== "undefined" ) {
      var ncbiUrl = '<a href="https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?mode=Info&id=' + d.ncbiID + '" target="_blank">'+ d.name +'</a>';
    } else {
      var ncbiUrl = '<a href="https://www.ncbi.nlm.nih.gov/Taxonomy' + '" target="_blank">'+ d.name +'</a>';
    }

    var rowID = d.name.replace(/ /g, "_").replace(/\./g, "_");


     // existingTaxa.push(d.name)
     taxonomyDataTable.row.add([ncbiUrl,d.ncbiRank,thousandsSeparators(d.donutValue),d.proportionClassifiedReads]).node().id = rowID;

 };

});

taxonomyDataTable.draw(false);


updateTaxTable()

};


function excludedLeavesListFunction(d,rank) {
          var dLeaves = [];

  if (d.rank == rank) {
    if (d.parent != null || d.parent != undefined){
      if (d.parent.rank == d.rank) {
        dLeaves.push(d.ncbiID)
      };
    };
  };
        var dLeaves = [...new Set(dLeaves)];
        return dLeaves;
};



function updateTaxTable(){



tr = d3.select("#selectedColumn tbody").selectAll("tr")

  // tr.select("td.sorting_1")
  //     // .text(function(d) {return d.value/readCountAtLevelMax * 100; })
  //     .attr("class", "hidden-text")
  //     .style("vertical-align", "middle")
  //     .append("svg")
  //       .attr("height", 12)
  //       .style("width", "100%")

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
                // .style("fill", function(d,i) {return (i < indexOfDonutOtherCategory()) ? color(i % 11) : color((i+1) % 11); })
                // .style("stroke","black");
                .on("mousemove", function(d) {
             toolTipDiv.transition()
                .duration(0)
                .style("opacity", .95);


             toolTipDiv.html("<h5 class='mb-0'>" + this.parentNode.parentNode.parentNode.firstChild.textContent +
            "</h5><small class='text-gray-800'>" + this.parentNode.parentNode.parentNode.childNodes[1].textContent +
             "</em></small><hr class='toolTipLine'/>Read count: " + thousandsSeparators(this.parentNode.parentNode.parentNode.childNodes[2].textContent) +
             "<br/>Read %: " + Math.round((this.parentNode.parentNode.textContent*100))/100)
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 35) + "px");
            })
                .on("mouseout", function(d) {
                    toolTipDiv.transition()
                        .duration(50)
                        .style("opacity", 0);
                });

                tr.on("mouseover", function(d) {

                            //Table
                            d3.select(this).select("rect").classed("goldFill", true);
                            var rowTaxa = this.firstChild.textContent

                            //Donut
                            d3.select("#dashboardTaxaDonutPlot").select(".slices").selectAll(".slice").filter(function(x) {

                                if (x.data.label == rowTaxa) {
                                    d3.select(this).classed("goldFill", true);
                                };
                            });

                            //Tree

                            // pathHighlight(rowTaxa,true,false)

                          }).on("mouseout", function(d) {

                            //Table
                            d3.select(this).select("rect").classed("goldFill", false);
                            var rowTaxa = this.firstChild.textContent

                            //Donut
                            d3.select("#dashboardTaxaDonutPlot").select(".slices").selectAll(".slice").filter(function(x) {

                                if (x.data.label == rowTaxa) {
                                    d3.select(this).classed("goldFill", false);
                                };
                            });

                            //Tree

                              // pathHighlight(rowTaxa,false,false)


                          })

updateTaxTableColors()



};


function updateTaxTableColors() {
d3.selectAll("#selectedColumn tbody tr td rect").style("fill", function(d) {
  var ind = findWithAttr(sorted,"name",this.parentNode.parentNode.parentNode.firstChild.textContent);

  // return ((ind < indexOfDonutOtherCategory()) || (indexOfDonutOtherCategory() == -1)) ? color(ind % 11) : color((ind+1) % 11);
  return ((ind < indexOfDonutOtherCategory()) || (indexOfDonutOtherCategory() == -1)) ? color(ind % dashboardColorIndex) : color((ind+1) % dashboardColorIndex);
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

  //color the links
  treeLine.filter(function(d) {
    if(nodePath.indexOf(d.target) > -1) {
      if (d3.select(this).classed("treeLineToggled")){
        d3.select(this).classed("treeLineToggled", false);
        d3.select(this).classed("treeLineSelected", false);

        //font
        d3.select(thisNode).select("text").style("font-weight", "normal");

      }
      else{
        d3.select(this).classed("treeLineToggled", true);
        d3.select(this).classed("treeLineSelected", true);
        //font
        d3.select(thisNode).select("text").style("font-weight", "bold");
      }
    }
  })

  //color the nodes
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

  //color the links
  treeLine.filter(function(d) {
    if(nodePath.indexOf(d.target) > -1) {
      if (d3.select(this).classed("treeLineToggled")){
        d3.select(this).classed("treeLineSelected", true);

        //font
        d3.select(thisNode).select("text").style("font-weight", "bold");
      }
      else{
        d3.select(this).classed("treeLineSelected", selected);

        //font
        if(selected == true){
          d3.select(thisNode).select("text").style("font-weight", "bold");
        }
        else{
          d3.select(thisNode).select("text").style("font-weight", "normal");
        }

      }
    }
  })

  //color the nodes
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
           if (chart == "dashboardAmrTable" || chart == "dashboardAmrDonut") {
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

// function initialisePlotVisibility() {
//
//   if (Object.keys(dashboardChartVisibility).length != 0) {
//
//     for (const [chart,visible] of Object.entries(dashboardChartVisibility)) {
//         if (visible) {
//           $("#"+chart+"Row").show();
//           $("#"+chart+"Add").hide();
//         } else {
//           $("#"+chart+"Row").hide();
//         };
//
//         hideAddChartsRow();
//
//         $("#"+chart+"Close").click(function() {
//            dashboardChartVisibility[chart] = false;
//            $("#"+chart+"Row").hide();
//            $("#"+chart+"Add").show();
//            hideAddChartsRow();
//         });
//
//         $("#"+chart+"Add").click(function() {
//            dashboardChartVisibility[chart] = true;
//            socket.emit('dashboard-' + chart + '-request');
//            $("#"+chart+"Row").show();
//            $("#"+chart+"Add").hide();
//            $("#addChartOptions, #addChartPlusSign").toggle();
//            hideAddChartsRow();
//        });
//
//       };
//
//   } else {
//     $(".row > div > #addChart").hide();
//   };
// };



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

// new ResizeSensor($('.donut-card'), function(){
//   if (!document.fullscreenElement && !document.webkitIsFullScreen && !document.mozFullScreen && !document.msFullscreenElement) {
// // Display result inside a div element
// smallScreenDonutViewBox();
//
//   }
//   else {
// fullScreenDonutViewBox();
//   }
//
// });

new ResizeSensor($('#taxaTable'), function(){
updateTaxTable()

});


// new ResizeSensor($('#dendrogram'), function(){
//   d3.select("#dendrogram svg")
//       .attr("viewBox", function() {
//         width = $("#dendrogram").parent().parent().width();
//         height = $("#dendrogram").parent().parent().height();
//         x = 0-width/4;
//         y = 0-height/2;
//           return x + " " + y + " " + width + " " + height;
//       })
// });

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
            treeMapUpdate(treeMapData);
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
$('#minimumAbundanceButtonDashboard>button:contains(' + lcaAbundanceDashboardUnformatted + ')').addClass("active");

// Empty chart visibility object when switching samples
dashboardChartVisibility = {};

$(".row > div > #addChart").hide();
$("#addChartOptions").hide();

$("#accumulationChartRow").hide();
$("#dashboardAmrTableRow").hide();
$("#dashboardAmrDonutRow").hide();

$("#accumulationChartAdd").hide();
$("#dashboardAmrTableAdd").hide();
$("#dashboardAmrDonutAdd").hide();

$('#addChartPlusSign').on("click touchstart", function(e){
   $("#addChartOptions, #addChartPlusSign").toggle();
});



$(document).mouseup(function (e) {
     if ($(e.target).closest("#addChartOptions").length === 0) {
        $("#addChartOptions").hide();
        $("#addChartPlusSign").show();
     }
 });

 // initialisePlotVisibility();



// treeFullScreen = document.getElementById("taxonomicTreeCard");
// donutFullScreen = document.getElementById("donutCard");
// compareRarefactionFullScreen = document.getElementById("compareRarefactionCard");
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
  if (!dashboardChartVisibility.hasOwnProperty("dashboardAmrTable")) {
    dashboardChartVisibility["dashboardAmrTable"] = true;
    initialisePlotVisibility("dashboardAmrTable",true);
  }

  if (!dashboardChartVisibility.hasOwnProperty("dashboardAmrDonut")) {
    dashboardChartVisibility["dashboardAmrDonut"] = true;
    initialisePlotVisibility("dashboardAmrDonut",true);
  }
  // dashboardAmrReponseData = data[Object.keys(data)[0]];
    dashboardAmrReponseData = data;

  updateAmrTable(dashboardAmrReponseData);
  plotAmrDonut(dashboardAmrReponseData);
  });



  socket.on('amr-update-available', request => {

    if (!dashboardChartVisibility.hasOwnProperty("dashboardAmrTable")) {
      dashboardChartVisibility["dashboardAmrTable"] = true;
      initialisePlotVisibility("dashboardAmrTable",true);
    }

    if (!dashboardChartVisibility.hasOwnProperty("dashboardAmrDonut")) {
      dashboardChartVisibility["dashboardAmrDonut"] = true;
      initialisePlotVisibility("dashboardAmrDonut",true);
    }

    if(currentPage=="Dashboard" && dashboardChartVisibility["dashboardAmrTable"] == true) {
      socket.emit('dashboard-dashboardAmrTable-request',{
        clientId: uuid
      });
    } else if (currentPage=="Dashboard" && dashboardChartVisibility["dashboardAmrDonut"] == true) {
      socket.emit('dashboard-dashboardAmrTable-request',{
        clientId: uuid
      });
    };
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
    plotAmrDonut(dashboardAmrReponseData);
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

  // var dataAmrList = [];
  // var removeAmrRowList = [];



d3.selectAll(".dashboard-amr-chunk-value").text(dashboardAmrTableChunkSelected+"/"+dashboardAmrTableChunkTotal);
d3.selectAll(".dashboard-amr-chunk-time").text(dashboardAmrTableChunkTime[dashboardAmrTableChunkSelected]);



  for (const gene of amrData.geneList){

    // dataAmrList.push(gene.name);

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
    for (const [species, counts] of Object.entries(gene.species)) {

      if (counts.hasOwnProperty(dashboardAmrTableChunkSelected)) {
        var speciesCountAtChunk = counts[dashboardAmrTableChunkSelected];
      } else {
        var highestChunk = 0;
        for (const [chunk, count] of Object.entries(counts)) {
          if (chunk < dashboardAmrTableChunkSelected) {
            var highestChunk = chunk;
          } else {
            break;
          }
        }
        var speciesCountAtChunk = counts[highestChunk];
      }

      if (speciesCountAtChunk !== undefined) {

        gene.speciesCounts.push(species+" ("+speciesCountAtChunk+")");
      }

    }


    gene.speciesCounts.sort(function(a, b) {
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

  };



  // // Remove amr data if no longer exists
  // amrListCurrent.forEach(function(d) {
  //   if (!dataAmrList.includes(d)){
  //     amrListCurrent = amrListCurrent.filter(function(ele){
  //        return ele != d;
  //    })
  //     dashboardAmrTable.rows().every( function () {
  //         var row = this.data();
  //         if (row[0].split(">")[1].split("<")[0] == d) {
  //           removeAmrRowList.push(this.node());
  //         }
  //     } );
  //   }
  // });
  //
  // // Remove rows from amr table
  // removeAmrRowList.forEach(function(d) {
  //     dashboardAmrTable.row(d).remove()
  //   });


  dashboardAmrTable.clear();

  // Add new rows to amr list table
    for (const gene of amrData.geneList) {
      if (gene.totalGeneCount > 0) {
        var aroNum = gene.cardId.split(":")[1];
        var cardUrl = '<a href="https://card.mcmaster.ca/aro/' + aroNum + '" target="_blank">'+ aroNum +'</a>';
      // var cardUrl = '<a href="https://card.mcmaster.ca/aro/' + aroNum + '" target="_blank">'+ gene.name +'</a>';
     //  if (amrListCurrent.includes(gene.name)){
     //    dashboardAmrTable.rows().every( function () {
     //        var row = this.data();
     //        if (row[0] == cardUrl) {
     //          row[1] = gene.totalGeneCount;
     //          row[2] = gene.averageAccuracy[dashboardAmrTableChunkSelected];
     //          row[3] = gene.speciesCounts.join(", ");
     //          row[4] = gene.description;
     //          this.invalidate(); // invalidate the data DataTables has cached for this row
     //        }
     //    });
     //  }
     // else {
       amrListCurrent.push(gene.name);
       dashboardAmrTable.row.add([gene.name,cardUrl,gene.totalGeneCount,gene.averageAccuracyAtChunk,gene.speciesCounts.join(", "),gene.description]);
     // }
    };
   };

  dashboardAmrTable.draw(false);

  };
