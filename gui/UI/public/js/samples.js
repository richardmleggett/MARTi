function initialiseSamplePage() {
samplePageDataTable = $('#samplePageDataTable').DataTable({
  "language": {
    "emptyTable": "WARNING: Could not find any MARTi Engine output directories in the 'MARTiSampleDirectory' specified in marti_engine_options.txt"
  },
"columns": [
  {
  "data": null,
  "orderable": false,
  className: "select-checkbox",
  "defaultContent": ""
},
null,
null,
null,
null,
null,
null,
null,
null,
null,
{
"data": null,
"orderable": false,
className: "moreInfo",
"defaultContent": ""
},
null,
null,
null
],
"columnDefs": [
    {
        "targets": [ 11,12 ],
        "visible": false,
        "searchable": false
    },
    {
        "targets": [ 13 ],
        "visible": false,
        "searchable": true
    }
],
  "dom": 't',
  "paging" : false,
  "order": [ 9, 'desc' ]
});


socket.emit('meta-request',{
  clientId: uuid
});


$('.compareSamplesInput').on('click', function() {

  // emitSelectedCompareSamples();

    if (comparePageUnlocked == false) {
      $('#compareModal').modal('show')
    } else {
    activeSidebarIcon($("#compare-item"));
    currentPage = "Compare";
    $("h1#pageTitle").text("Compare");
    $("#response").load("/compare.html", function(){
      $("html, body").animate({ scrollTop: "0px" });
      initialiseComparePage();
    });
  }
});

sampleListCurrent = [];

$("#sampleTableSearchBox").keyup(function() {
samplePageDataTable.search(this.value).draw();

var selectAllToggle = $('thead>tr').children(':first-child');

  if(selectAllToggle.hasClass('checkSelected')){
    selectAllToggle.removeClass('checkSelected');
  };

});

$("#sampleDataSampleName").on('input', function(){
  var inputName = $("#sampleDataSampleName").val();
  var placeholder = $("#sampleDataSampleName").attr('placeholder');
  var setId;
  if (inputName != ""){
      setId = inputName;
  } else {
      setId = placeholder;
  }

  socket.emit('update-sample-name-request',{
    clientId: uuid,
    newId: setId,
    pathRun: currentSampleInfoModalData.pathRun,
    pathName: currentSampleInfoModalData.pathName,
    originalId: placeholder
  });


});

initialiseExportCard();

};

var exportCardObject = {};

function initialiseExportCard(){


  var taxRankArray = ["All levels","Domain","Phylum","Class","Order","Family","Genus","Species"];
  // var defaultMaxJobs = 4;

  var taxRankOptions = d3.select("select[name='exportTaxRank']").selectAll("option")
      .data(taxRankArray);

  taxRankOptions.enter()
      .append("option")
      .text(function(d) {
          return d;
      });

  taxRankOptions.exit()
      .remove();

      $('#sampleExportButton').on("click touchstart", function() {

        if (selectedCompareMetaDataArray.length == 0){
            $('#exportModal').modal('show');
        } else {
          exportCardObject = {};

          exportCardObject.lca = $('input[type="radio"][name="exportLcaCutoffToggle"]:checked').val();
          exportCardObject.rankName = $('select[name="exportTaxRank"] option:selected').text();
          exportCardObject.rankNum = getValueCaseInsensitive(taxonomicLevelDict, exportCardObject.rankName);
          exportCardObject.columns = {};
          $("input:checkbox.export-col:checked").each(function() {
            exportCardObject.columns[$(this).data("value")] = {
              header:$(this).data("header")
            }
          });
          exportCardObject.delimiterName = $('input[type="radio"][name="exportDelimiterToggle"]:checked').val();
          exportCardObject.delimiter = $('input[type="radio"][name="exportDelimiterToggle"]:checked').data("delimiter");
          exportCardObject.extension = $('input[type="radio"][name="exportDelimiterToggle"]:checked').data("extension");

          requestExportData(exportCardObject.lca);
        }
      });


};

var selectedCompareMetaDataArray = [];
var sampleMetaDataArray = [];

function updateSampleTable(data){
dataSampleList = [];

sampleMetaDataArray = [];

samplePageDataTable.clear();

  for (const [runId, samples] of Object.entries(data)) {
    var dirRunId = runId;
    for (const [sample, value] of Object.entries(samples)) {
    var sampleData = value.sample;
    sampleData.martiVersion = value.meta.martiVersion;
    var dirSampleId = sample;
    sampleMetaDataArray.push(sampleData);
    dataSampleList.push(sample);
    var keywords = "";
    if (sampleData.hasOwnProperty("metadatafile")){
      keywords = sampleData.metadatafile.keywords;
    }
    // sampleData.readsPassBasecall = thousandsSeparators(sampleData.readsPassBasecall);
    // sampleData.readsAnalysed = thousandsSeparators(sampleData.readsAnalysed);

     sampleListCurrent.push(sampleData.id);

       samplePageDataTable.row.add([null,sampleData.id,sampleData.runId,sampleData.yieldGb.toFixed(3),thousandsSeparators(sampleData.readsPassBasecall),thousandsSeparators(sampleData.readsAnalysed),sampleData.analysis.pipeline,sampleData.martiStatus,sampleData.sequencingDate.replace('T',' '),sampleData.analysisDate.replace('T',' '),null,dirRunId,dirSampleId,keywords]);

     };
 };

samplePageDataTable.draw(false);


  $('table>tbody>tr[role="row"]>td:nth-child(2)').on('click', function() {
    var rowData = samplePageDataTable.row( $(this).closest('tr') ).data();
      var sampleName = rowData[12];
      var runId = rowData[11];

      socket.emit('selected-dashboard-sample',{
        clientId: uuid,
        name: sampleName,
        runId: runId
      });

      activeSidebarIcon($("#dashboard-item"));
      currentPage = "Dashboard";
      $("h1#pageTitle").text("Dashboard");
      $("#response").load("/dashboard.html", function(){
        $("html, body").animate({ scrollTop: "0px" });
        initialiseDashboardPage();
      });
  });


    $('tbody>tr').children(':not(:nth-child(2)):not(:last-child)').on('click', function() {
      $(this).closest('tr').toggleClass('checkSelected');
      emitSelectedCompareSamples();

    });

    $('thead>tr').children(':first-child').on('click', function() {
      if($(this).hasClass('checkSelected')){
        $(this).removeClass('checkSelected');
        $('tbody>tr').removeClass('checkSelected');
      } else{
        $(this).addClass('checkSelected');
        $('tbody>tr').addClass('checkSelected');
      }

      emitSelectedCompareSamples();

    });


$('tbody>tr').children(':last-child').on('click', function() {
    var rowData = samplePageDataTable.row( $(this).closest('tr') ).data();
    var sampleName = rowData[1];
    var runId = rowData[2];

    var thisMetaData;

    for (var sample of sampleMetaDataArray){
      if (sampleName == sample.id && runId == sample.runId){
        thisMetaData = sample;
      }
    };

    prepareSampleInfoModal(thisMetaData);

  $('#sampleInfoModal').modal('show');


});


};



// function emitSelectedCompareSamples() {
//   var selectedSamplesData = [];
//   $('#samplePageDataTable tbody tr.checkSelected').each(function() {
//     var rowData = samplePageDataTable.row( $(this) ).data();
//     var selectedRowData = {
//       name: rowData[12],
//       runId: rowData[11]
//     };
//     selectedSamplesData.push(selectedRowData);
//   });
//
//   socket.emit('selected-compare-samples', {
//     clientId: uuid,
//     data: selectedSamplesData
//   });
// }

function emitSelectedCompareSamples() {
  var prevSearchValue = $("#sampleTableSearchBox").val();
  $("#sampleTableSearchBox").val("");
  samplePageDataTable.search("").draw();

  var selectedSamplesData = [];
  $('#samplePageDataTable tbody tr.checkSelected').each(function() {
    var rowData = samplePageDataTable.row( $(this) ).data();
    var selectedRowData = {
      name: rowData[12],
      runId: rowData[11]
    };
    selectedSamplesData.push(selectedRowData);
  });

  if(isEmpty(selectedSamplesData)) {
    comparePageUnlocked = false;
  } else {
    comparePageUnlocked = true;
  };

  $("#sampleTableSearchBox").val(prevSearchValue);
  samplePageDataTable.search(prevSearchValue).draw();


  socket.emit('selected-compare-samples', {
    clientId: uuid,
    data: selectedSamplesData
  });
}

function requestExportData(lca) {

  socket.emit('compare-tree-request',{
    clientId: uuid,
    lca: "lca_"+lca
  });


}


socket.on('meta-response', function(metaData) {
  updateSampleTable(metaData);
  socket.emit('current-dashboard-sample-request',{
    clientId: uuid
  });
  socket.emit('current-compare-samples-request',{
    clientId: uuid
  });

  if(currentPage=="Dashboard") {
    socket.emit('dashboard-accumulationChart-request',{
      clientId: uuid,
      rank:taxonomicRankSelectedTextLowerCase,
      lca: "lca_"+lcaAbundanceDashboard
    });
  };
});

socket.on('meta-update-available', request => {
  if(currentPage=="Samples") {
    socket.emit('meta-request',{
      clientId: uuid
    });
  } else if(currentPage == "Dashboard" && currentDashboardSampleName == request.sampleId) {
    socket.emit('dashboard-meta-request',{
      clientId: uuid
    });
  };
});

// socket.on('metadata-file-update-available', request => {
//   if(currentPage=="Samples") {
//     socket.emit('metadata-file-request',{
//       clientId: uuid
//     });
//   }
// });



// socket.on('meta-id-file-update-available', request => {
//   if(currentPage=="Samples") {
//     socket.emit('meta-request',{
//       clientId: uuid
//     });
//   } else if(currentPage == "Dashboard" && currentDashboardSampleRun == request.runId) {
//     socket.emit('dashboard-meta-request',{
//       clientId: uuid
//     });
//   };
// });

socket.on('current-dashboard-sample-response', function(sample) {
  if(sample.name == "") {
    dashboardPageUnlocked = false;
  } else {
    dashboardPageUnlocked = true;
  };
  currentDashboardSampleRun = sample.runId;
  currentDashboardSampleName = sample.name;

  $("#samplePageDataTable tbody tr").each(function() {

    var rowData = samplePageDataTable.row( $(this) ).data();

    if (typeof rowData !== 'undefined'){

      var selectedRowData = {
        name: rowData[12],
        runId: rowData[11]
      };
      if (selectedRowData.name == currentDashboardSampleName && selectedRowData.runId == currentDashboardSampleRun){
        $("tr").removeClass("dashboardSelected");
        $(this).addClass("dashboardSelected");
      };
    };


  });

});

socket.on('current-dashboard-sample-url-switch', function(sample) {

  currentDashboardSampleRun = sample.runId;
  currentDashboardSampleName = sample.name;

  activeSidebarIcon($("#dashboard-item"));
  currentPage = "Dashboard";
  $("h1#pageTitle").text("Dashboard");
  $("#response").load("/dashboard.html", function(){
    $("html, body").animate({ scrollTop: "0px" });
    initialiseDashboardPage();
  });

});

socket.on('current-compare-samples-response', function(samples) {

  if(isEmpty(samples)) {
    comparePageUnlocked = false;
  } else {
    comparePageUnlocked = true;
  };

  selectedCompareMetaDataArray = [];


  for (const sampleMetaData of sampleMetaDataArray) {
    for (const sample of samples) {
      if (sampleMetaData.pathName == sample.name && sampleMetaData.pathRun == sample.runId) {
        selectedCompareMetaDataArray.push(sampleMetaData);

        if(currentPage=="Samples") {

          $('#samplePageDataTable tbody tr').each(function() {
            var rowData = samplePageDataTable.row( $(this) ).data();
            var selectedRowData = {
              name: rowData[12],
              runId: rowData[11]
            };
            if (selectedRowData.name == sample.name && selectedRowData.runId == sample.runId) {
              $(this).addClass("checkSelected");
            };
          });

        };

      };
    };
  };
});

var currentSampleInfoModalData;

function prepareSampleInfoModal(data){
  currentSampleInfoModalData = data;
  // $("#sampleDataSampleName").text(data.id);

  if (restrictedMode == false){
      $('#sampleDataSampleName').removeAttr('disabled');
  }

  $("#sampleDataSampleName").val(data.id);
  if(data.hasOwnProperty("originalId")){
    $("#sampleDataSampleName").attr('placeholder', data.originalId);
  } else {
    $("#sampleDataSampleName").attr('placeholder', data.id);
  }

  $("#sampleDataRunName").text(data.runId);
  $("#sampleDataSequencingDate").text(data.sequencingDate.replace('T',' '));
  $("#sampleDataAnalysisDate").text(data.analysisDate.replace('T',' '));

  $("#sampleDataYieldGb").text(data.yieldGb);
  $("#sampleDataBasecalledReads").text(thousandsSeparators(data.readsPassBasecall));
  $("#sampleDataReadsPassedFilter").text(thousandsSeparators(data.readsPassedFilter));
  $("#sampleDataReadsAnalysed").text(thousandsSeparators(data.readsAnalysed));
  $("#sampleDataReadsClassified").text(thousandsSeparators(data.readsWithClassification));
  $("#sampleDataReadsUnclassified").text(thousandsSeparators(data.readsUnclassified));
  $("#sampleDataReadsPoorAlignments").text(thousandsSeparators(data.readsWithPoorAlignments));

  $("#sampleDataMartiVersion").text(data.martiVersion);
  $("#sampleDataAnalysisStatus").text(data.martiStatus);
  $("#sampleDataAnalysisPipeline").text(data.analysis.pipeline);


}




function postToGrassroots(){
  for (var sampleData of selectedCompareMetaDataArray){
    if (sampleData.hasOwnProperty("metadatafile")){
      var missingFields = [];
      var sampleName = sampleData.id;
      var sampleUuid = sampleData.uuid;
      var siteName = "";
      if (sampleData.metadatafile.hasOwnProperty("locationName")) {
        siteName = sampleData.metadatafile.locationName;
      } else {
        missingFields.push("site name");
      }
      var keywords = "";
      if (sampleData.metadatafile.hasOwnProperty("keywords")) {
        keywords = sampleData.metadatafile.keywords;
        keywords = keywords.replace(/,\s+/g, ',');
      }
      var latitude = 0.0;
      var longitude = 0.0;
      if (sampleData.metadatafile.hasOwnProperty("location")) {
        const [lat, lon] = sampleData.metadatafile.location.split(',');
        latitude = parseFloat(lat);
        longitude = parseFloat(lon);
      } else {
        missingFields.push("location");
      }
      var date = "";
      if (sampleData.metadatafile.hasOwnProperty("sampleDate")) {
        date = sampleData.metadatafile.sampleDate;
      } else {
        missingFields.push("date");
      }
      var time = "12:00:00"
      if (sampleData.metadatafile.hasOwnProperty("sampleTime")) {
        time = sampleData.metadatafile.sampleTime;
      } else {
        missingFields.push("time");
      }

      var dateTime = date + "T" + time;
      var postTemplate = {
        "services": [
            {
                "so:name": "MARTi submission service",
                "start_service": true,
                "parameter_set": {
                    "level": "simple",
                    "parameters": [
                        {
                            "param": "Name",
                            "current_value": sampleName
                        },
                        {
                            "param": "MARTi Id",
                            "current_value": sampleUuid
                        },
                        {
                            "param": "Site Name",
                            "current_value": siteName
                        },
                        {
                            "param": "Description",
                            "current_value": keywords
                        },
                        {
                            "param": "Latitude",
                            "current_value": latitude
                        },
                        {
                            "param": "Longitude",
                            "current_value": longitude
                        },
                        {
                            "param": "Start Date",
                            "current_value": dateTime
                        }
                    ]
                }
            }
        ]
      }

      if(missingFields.length > 0) {
          console.log(sampleData.id + " not posted. Missing field(s):", missingFields.join(", "))
      } else {
        socket.emit('post-to-grassroots-request',{
          clientId: uuid,
          sample:sampleData.id,
          body: JSON.stringify(postTemplate)
        });

      }
    } else {
      console.log(sampleData.id + " not posted. No metadata found.")
    }
  }

}
