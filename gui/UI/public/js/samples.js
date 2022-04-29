function initialiseSamplePage() {
samplePageDataTable = $('#samplePageDataTable').DataTable({
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
null,
null
],
"columnDefs": [
    {
        "targets": [ 10,11 ],
        "visible": false,
        "searchable": false
    }
],
  "dom": 't',
  "paging" : false,
  "order": [ 9, 'desc' ]
});


socket.emit('meta-request',{
  clientId: uuid
});

// Function compare samples button
$('.compareSamplesInput').on('click', function() {
    if (comparePageUnlocked == false) {
      $('#compareModal').modal('show')
    } else {
    activeSidebarIcon($("#compare-item"));
    currentPage = "Compare";
    $("h1#pageTitle").text("Compare");
    $("#response").load("compare.html", function(){
      $("html, body").animate({ scrollTop: "0px" });
      initialiseComparePage();
    });
  }
});

sampleListCurrent = [];

$("#sampleTableSearchBox").keyup(function() {
samplePageDataTable.search(this.value).draw();
});

};


var selectedCompareMetaDataArray = [];
var sampleMetaDataArray = [];

function updateSampleTable(data){

dataSampleList = [];
// removeSampleRowList = [];

sampleMetaDataArray = [];

// for (const [key, value] of Object.entries(data)) {
//   var sampleData = value.sample;
//   dataSampleList.push(key);
//   sampleData.readsPassBasecall = thousandsSeparators(sampleData.readsPassBasecall);
//   sampleData.readsAnalysed = thousandsSeparators(sampleData.readsAnalysed);
// };

// // Remove sample data if no longer exists
// sampleListCurrent.forEach(function(d) {
//   if (!dataSampleList.includes(d)){
//     sampleListCurrent = sampleListCurrent.filter(function(ele){
//        return ele != d;
//    })
//     samplePageDataTable.rows().every( function () {
//         var row = this.data();
//         if (row[1] == d) {
//           removeSampleRowList.push(this.node());
//         }
//     } );
//   }
// });
//
// // Remove rows from sample table
// removeSampleRowList.forEach(function(d) {
//     samplePageDataTable.row(d).remove()
//   });

samplePageDataTable.clear();

// Add new rows to sample list table
  for (const [runId, samples] of Object.entries(data)) {
    var dirRunId = runId;
    for (const [sample, value] of Object.entries(samples)) {
    var sampleData = value.sample;
    var dirSampleId = sample;
    sampleMetaDataArray.push(sampleData);
    dataSampleList.push(sample);
    sampleData.readsPassBasecall = thousandsSeparators(sampleData.readsPassBasecall);
    sampleData.readsAnalysed = thousandsSeparators(sampleData.readsAnalysed);

   //  if (sampleListCurrent.includes(value.id)){
   //    samplePageDataTable.rows().every( function () {
   //        var row = this.data();
   //        if (row[1] == value.id) {
   //          row[2] = value.yield;
   //          row[3] = value.reads_sequenced;
   //          row[4] = value.reads_classified;
   //          row[5] = value.MARTi_status;
   //          this.invalidate(); // invalidate the data DataTables has cached for this row
   //        }
   //    });
   //  }
   // else {
     sampleListCurrent.push(sampleData.id);

       samplePageDataTable.row.add([null,sampleData.id,sampleData.runId,sampleData.yieldGb.toFixed(3),sampleData.readsPassBasecall,sampleData.readsAnalysed,sampleData.analysis.pipeline,sampleData.martiStatus,sampleData.sequencingDate.replace('T',' '),sampleData.analysisDate.replace('T',' '),dirRunId,dirSampleId]);

     };
   // }
 };

samplePageDataTable.draw(false);




// if (runJqueryFuncs == true) {

  // Function to select dashboard sample and emit the location to server
  $('table>tbody>tr[role="row"]>td:nth-child(2)').on('click', function() {
    var rowData = samplePageDataTable.row( $(this).closest('tr') ).data();
      // var sampleName = $(this).text();
      var sampleName = rowData[11];
      var runId = rowData[10];

      socket.emit('selected-dashboard-sample',{
        clientId: uuid,
        name: sampleName,
        runId: runId
      });

      activeSidebarIcon($("#dashboard-item"));
      currentPage = "Dashboard";
      $("h1#pageTitle").text("Dashboard");
      $("#response").load("dashboard.html", function(){
        $("html, body").animate({ scrollTop: "0px" });
        initialiseDashboardPage();
      });
  });


    $('tbody>tr').children(':not(:nth-child(2))').on('click', function() {
      $(this).closest('tr').toggleClass('checkSelected');
      emitSelectedCompareSamples()
      // var selectedSamplesData = [];

      // $('#samplePageDataTable tbody tr.checkSelected').each(function() {
      //   var rowData = samplePageDataTable.row( $(this) ).data();
      //   var selectedRowData = {
      //     name: rowData[1],
      //     runId: rowData[2]
      //   };
      //   selectedSamplesData.push(selectedRowData);
      // });
      //
      // socket.emit('selected-compare-samples', {
      //   clientId: uuid,
      //   data: selectedSamplesData
      // });
      // var sampleNames = [];
      // $('#samplePageDataTable tbody tr.checkSelected td:nth-child(2)').each(function() {
      //     sampleNames.push($(this).text());
      // });
      // socket.emit('selected-compare-samples', {
      //   clientId: uuid,
      //   data: sampleNames
      // });
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
      // var sampleNames = [];
      // $('#samplePageDataTable tbody tr.checkSelected td:nth-child(2)').each(function() {
      //     sampleNames.push($(this).text());
      // });
      // socket.emit('selected-compare-samples', {
      //   clientId: uuid,
      //   data: sampleNames
      // });
    });

  // runJqueryFuncs = false;

  // };

};

function emitSelectedCompareSamples() {
  var selectedSamplesData = [];
  $('#samplePageDataTable tbody tr.checkSelected').each(function() {
    var rowData = samplePageDataTable.row( $(this) ).data();
    var selectedRowData = {
      name: rowData[11],
      runId: rowData[10]
    };
    selectedSamplesData.push(selectedRowData);
  });

  socket.emit('selected-compare-samples', {
    clientId: uuid,
    data: selectedSamplesData
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
        name: rowData[11],
        runId: rowData[10]
      };
      if (selectedRowData.name == currentDashboardSampleName && selectedRowData.runId == currentDashboardSampleRun){
        $("tr").removeClass("dashboardSelected");
        $(this).addClass("dashboardSelected");
      };
    };


  });

});

// var compareSampleObjectArray;

// Function to select rows of sample table based on information from server
socket.on('current-compare-samples-response', function(samples) {
  if(isEmpty(samples)) {
    comparePageUnlocked = false;
  } else {
    comparePageUnlocked = true;
  };

  selectedCompareMetaDataArray = [];

  // for (const sample of sampleMetaDataArray) {
  //   if (samples.includes(sample.id)) {
  //       selectedCompareMetaDataArray.push(sample);
  //   }
  // };

  for (const sampleMetaData of sampleMetaDataArray) {
    for (const sample of samples) {
      if (sampleMetaData.pathName == sample.name && sampleMetaData.pathRun == sample.runId) {
        selectedCompareMetaDataArray.push(sampleMetaData);

        if(currentPage=="Samples") {

          $('#samplePageDataTable tbody tr').each(function() {
            var rowData = samplePageDataTable.row( $(this) ).data();
            var selectedRowData = {
              name: rowData[11],
              runId: rowData[10]
            };
            if (selectedRowData.name == sample.name && selectedRowData.runId == sample.runId) {
              $(this).addClass("checkSelected");
            };
          });

        };

      };
    };
  };

  compareSampleObjectArray = samples.sort(d3.ascending);

  // if(currentPage=="Samples") {
  //
  //
  //   samples.forEach(function(sample) {
  //   compareSampleRow = $("#samplePageDataTable td:nth-child(2)").filter(function() {
  //     return $(this).text() == sample;
  //   }).closest("tr");
  //   compareSampleRow.addClass("checkSelected");
  //   });
  //
  // };


});
