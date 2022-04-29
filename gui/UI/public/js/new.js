function initialiseNewPage() {

  socket.emit('default-server-options-request',{
    clientId: uuid,
  });


  d3.select("#maxJobs").selectAll("option").remove();

var maxJobsArray = [];
var defaultMaxJobs = 4;

for (var i = 1; i <= 16; i++) {
   maxJobsArray.push(i);
}

    var maxJobsOptions = d3.select("select[name='maxJobs']").selectAll("option")
        .data(maxJobsArray);

        maxJobsOptions.enter()
            .append("option")
            .text(function(d) {return d;});

        maxJobsOptions.exit()
            .remove();

var defaultMaxJobsOption = $("select[name='maxJobs'] option").filter(function() { return $(this).text() == defaultMaxJobs });

  $(defaultMaxJobsOption).prop({selected: true});

// var readFilterMinQArray = [];
// var defaultReadFilterMinQ = 0;
//
// for (var i = 0; i <= 30; i++) {
//    readFilterMinQArray.push(i);
// }
//
// var readFilterMinQOptions = d3.select("#readFilterMinQ").selectAll("option")
//     .data(readFilterMinQArray);
//
//     readFilterMinQOptions.enter()
//         .append("option")
//         .text(function(d) {return d;});



var divsToAppend = "";
for (i = 1; i <= 96; i++) {
  var num;
  if(i<10) {
    num = "0" + i;
  } else {
    num = i;
  }
    divsToAppend += '<div class="row mb-2">' +
        '<div class="barcode-options col-4 d-flex align-items-center">' +
          '<input class="" type="checkbox" value="'+ num +'" name="barcodeCheck">'+
          '<label for="barcode'+num+'Check" class="">Barcode'+num+'</label>'+
        '</div>'+
        '<div class="col-8">'+
          '<input disabled class="form-control" type="text" name="barcodeName" value="Barcode'+num+'">'+
        '</div>'+
    '</div>';
}
$('#barcodeOptions').append(divsToAppend);


$("input[name='maxHits'], input[name='minCombinedScore']").on("input", function(){
  var slider = $(this);
  var val = slider.val();
  slider.prev("a").text(val);
});

$("input[name='scorePercent'], input[name='minimumIdentity'], input[name='minQueryCoverage']").on("input", function(){
  var slider = $(this);
  var val = slider.val();
  slider.prev("a").text(val+" %");
});


$("#processBarcodeCheck").change(function() {
    if(this.checked) {
      $(selectBarcodesRow).removeClass("d-none")
    } else {
      $(selectBarcodesRow).addClass("d-none")
    }
});

$("input[name='barcodeCheck']").change(function() {
  var textField = $(this).parent().parent().find("input[name='barcodeName']");
    if(this.checked) {
      textField.prop("disabled", false);
      // $('.inputDisabled');
    } else {
      textField.prop("disabled", true);
    }
});

$('.barcode-options').on("click touchstart", function(e){
  var checkBox = $(this).children(":first");
  checkBox.prop("checked", !checkBox.prop("checked")).change();
});

$(".barcode-options>input[name='barcodeCheck']").click(function(e) {
     e.stopPropagation();
});


$(document).on('change', "input[name='useToClassify']", function(event){
  if(this.checked) {
    $("input[name='useToClassify']").prop("checked", false);
    $(this).prop("checked", true);
  }

});

$("#readsPerChunkSelect").change(function() {
  var currentOption = $('#readsPerChunkSelect option:selected').text();
  var readsPerChunkInput = $("#readsPerChunk");

  if (currentOption == "Other") {
    readsPerChunkInput.removeClass("d-none");
  } else {
    readsPerChunkInput.addClass("d-none");
    readsPerChunkInput.val(parseInt(currentOption));
  }

});



$('#addBlastCard').on("click touchstart", function(e){
  var clone = $('#blastProcessCard>.row').clone();
  $('#addAnalysis').before(clone);
  infoIconInitialise();
});

$('#addBlastNt').on("click touchstart", function(e){
  var clone = $('#blastProcessNt>.row').clone();
  $('#addAnalysis').before(clone);
  infoIconInitialise();
});

$('#addBlastOther').on("click touchstart", function(e){
  var clone = $('#blastProcessTemplate>.row').clone();
  $('#addAnalysis').before(clone);
  infoIconInitialise();
});

$('#loadDefaultBlastLca').on("click touchstart", function(e){
resetForm();

// StopProcessingAfter:10000000
$("input[name='stopProcessingAfter']").val(10000000);

// LCAMinIdentity:60
$("input[name='minimumIdentity']").val(60);
$("input[name='minimumIdentity']").trigger("input");

// LCAMinLength:100

// readsPerChunk:8000
$("#readsPerChunkSelect option").filter(function() { return $(this).text() == "8000" }).prop({selected: true});
$("#readsPerChunkSelect").trigger("change");

// ReadFilterMinQ:9
$("input[name='readFilterMinQ']").val(9);

// ReadFilterMinLength:500
$("input[name='minimumReadLength']").val(500);

$('#addBlastNt').click();


});

$('#loadDefaultBlastLcaCard').on("click touchstart", function(e){
resetForm();

// StopProcessingAfter:10000000
$("input[name='stopProcessingAfter']").val(10000000);

// LCAMinIdentity:60
$("input[name='minimumIdentity']").val(60);
$("input[name='minimumIdentity']").trigger("input");

// LCAMinLength:100

// readsPerChunk:8000
$("#readsPerChunkSelect option").filter(function() { return $(this).text() == "8000" }).prop({selected: true});
$("#readsPerChunkSelect").trigger("change");

// ReadFilterMinQ:9
$("input[name='readFilterMinQ']").val(9);

// ReadFilterMinLength:500
$("input[name='minimumReadLength']").val(500);

  $('#addBlastNt').click();
  $('#addBlastCard').click();
});

$('#resetForm').on("click touchstart", function(){
resetForm();

});

$(document).on('click touchstart', '.removeRow', function(event){
  $(event.target).closest(".row").remove();
});


    // Fetch all the forms we want to apply custom Bootstrap validation styles to
    var forms = document.getElementsByClassName('needs-validation');
    // Loop over them and prevent submission
    var validation = Array.prototype.filter.call(forms, function(form) {
      form.addEventListener('submit', function(event) {
        if (form.checkValidity() === false) {
          event.preventDefault();
          event.stopPropagation();
        }
        form.classList.add('was-validated');
      }, false);
    });


    // this is the id of the form
    $("#newForm").submit(function(e) {

      if (e.isDefaultPrevented()) {
          alert('Form is not valid');
      } else {
        e.preventDefault(); // avoid to execute the actual submit of the form.


        $("input[name='useToClassify'].useToClassifyVis:visible").each(function () {
          if(this.checked) {
            $(this).prev().prop("disabled", true);
          }
        });


        var form = $(this);
        var url = form.attr('action');

console.log(form.serialize());

        $.ajax({
               type: "POST",
               url: url,
               data: form.serialize(), // serializes the form's elements.
               success: function(data)
               {
                   alert("Success! You'll now be redirected to the samples page where you will find your new analysis in a few minutes time.");

                   activeSidebarIcon($("#dashboard-item"));
                   currentPage = "Samples";
                   $("h1#pageTitle").text("Samples");
                   $("#response").load("samples.html", function(){
                     $("html, body").animate({ scrollTop: "0px" });
                     initialiseSamplePage();
                   });

               },
               error: function (data) {
                alert('An error occurred.');
              }
             });
      }




    });

    $("#sampleName").change(function() {
      updateMartiNameField();
      $("input[name='martiName']").trigger('input');
    });

    $("#outputDir").change(function() {
      updateOutputPathField();
    });

    $("#martiName").on('input', function() {
      updateOutputPathField();
      updateBarcodeNameFields();
    });

    $("#martiName").change(function() {
      // console.log($("#martiName").val());

    });


    $("input[name='databaseDir']").val(martiDatabaseDirPath);


infoIconInitialise();



};

var martiOutputBasePath = "/path/to/marti/dir/sample";
var martiDatabaseDirPath = "/path/to/database/dir";

function updateSampleNameOptions(options) {

  var sampleNameOptions = d3.select("select[name='sampleName']").selectAll("option")
      .data(options);

      sampleNameOptions.enter()
          .append("option")
          .text(function(d) {return d;});

      sampleNameOptions.exit()
          .remove();


}

function updateMartiOutputDirOptions(options) {

  var options = d3.select("select[name='outputDir']").selectAll("option")
      .data(options);

      options.enter()
          .append("option")
          .text(function(d) {return d;});

      options.exit()
          .remove();

}

function updateMartiNameField() {
  var currentOption = $('#sampleName option:selected').text();
  $("input[name='martiName']").val(currentOption);
}

function updateOutputPathField() {
var martiName = $("input[name='martiName']").val();
martiOutputBasePath = $('#outputDir option:selected').text();
var path = martiOutputBasePath + "/" + martiName;
$("input[name='outputPath']").val(path);

}


function updateBarcodeNameFields() {
var martiName = $("input[name='martiName']").val();
  $("input[name='barcodeName']:disabled").each(function () {
    var num = $(this).parent().prev().children().first().val();
     $(this).val(martiName+"_"+"bc"+num);
  });
}




socket.on('default-server-options-response', response => {
  console.log(response);
  // martiOutputBasePath = response.MARTiSampleDirectory;
  martiDatabaseDirPath = response.BlastDatabaseDirectory + "/[DATABASE_DIRECTORY]";
  // $("input[name='rawDataDir']").val(response.MinKNOWRunDirectory);
  // $("input[name='outputDir']").val(response.MARTiSampleDirectory);
  // $("input[name='taxonomyDir']").val(response.TaxonomyDirectory);
  $("input[name='databaseDir']").val(martiDatabaseDirPath);
  updateSampleNameOptions(response.minKNOWSampleNames);
  updateMartiOutputDirOptions(response.MARTiSampleDirectory);
  updateMartiNameField();
  updateOutputPathField();
  updateBarcodeNameFields();
});

function resetForm() {
  $("input[name='readFilterMinQ']").val(0);
  $("input[name='minimumReadLength']").val(0);

  $("#readsPerChunkSelect option").filter(function() { return $(this).text() == "1000" }).prop({selected: true});
  $("#readsPerChunkSelect").trigger("change");

  $("input[name='maxHits']").val(20);
  $("input[name='maxHits']").trigger("input");

  $("input[name='scorePercent']").val(90);
  $("input[name='scorePercent']").trigger("input");

  $("input[name='minimumIdentity']").val(0);
  $("input[name='minimumIdentity']").trigger("input");

  $("input[name='minQueryCoverage']").val(0);
  $("input[name='minQueryCoverage']").trigger("input");

  $("input[name='minCombinedScore']").val(0);
  $("input[name='minCombinedScore']").trigger("input");

  $("input[name='inactivityTimeout']").val(10);
  $("input[name='stopProcessingAfter']").val(0);

  $("input[name='maxJobs'] option").filter(function() { return $(this).text() == "4" }).prop({selected: true});

  $(".removeRow:visible").click();
};

function infoIconInitialise() {

  var infoIcons = d3.selectAll('.fa-info-circle');

      infoIcons.on("mousemove", function(d) {

       toolTipDiv.transition()
          .duration(0)
          .style("opacity", .95);

          var toolTipText = d3.select(this).attr("data-tooltip");

         toolTipDiv.html("<div class='tooltip-content-wrapper'><div class='tooltip-content' style='text-align:left;'><h5 class='mb-0'>" + this.parentNode.firstChild.nextSibling.textContent +
         "</h5><small class='text-wrap text-gray-800'>" + toolTipText +
         "</small></div></div>")
            .style("left", (d3.event.pageX) + "px")
            .style("top", (d3.event.pageY - 35) + "px");
  })
      .on("mouseout", function(d) {
          toolTipDiv.transition()
              .duration(50)
              .style("opacity", 0);
      });

}
