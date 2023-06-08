function export_as_csv(csv,filename) {
  const csvData = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

  saveAs(csvData, filename+'.csv');
}


function save_as_svg_with_style(id,css,filename,resetWidth,remove){
fetch(css)
.then(response => response.text())
.then(text => {
    var svgElement = document.getElementById(id);
    var svg_data = document.getElementById(id).innerHTML;
    var head = '<svg id="'+ id +'Export" title="graph" version="1.1" xmlns="http://www.w3.org/2000/svg">';
    var style = "<style>" + text + "</style>";
    var full_svg = head +  style + svg_data + "</svg>";

    var blob = new Blob([full_svg], {type: "image/svg+xml"});
    saveAs(blob, filename+".svg");

    if (typeof remove !== 'undefined') {
      $("#"+remove).remove();
    }
    if(resetWidth == true) {
      $("#"+id).attr('width','100%');
    }
})
};

function save_as_raster_with_style(id,css,filename,scale,type,resetWidth,remove){
fetch(css)
.then(response => response.text())
.then(text => {
    var svgElement = document.getElementById(id);
    var svg_data = document.getElementById(id).innerHTML;
    var head = '<svg id="'+ id +'Export" title="graph" version="1.1" style="transform: scale('+scale+')" xmlns="http://www.w3.org/2000/svg">';
    var style = "<style>" + text + "</style>";
    var full_svg = head +  style + svg_data + "</svg>";

    var canvas = document.createElement('canvas');
      canvas.width = svgElement.getAttribute("width")*scale;
      canvas.height = svgElement.getAttribute("height")*scale;
    var ctx = canvas.getContext('2d');

    v = canvg.Canvg.fromString(ctx, full_svg);
    v.start();

    if (type == "jpg") {
      ctx.globalCompositeOperation = 'destination-over'
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      canvas.toBlob(function(blob) {
          saveAs(blob, filename+".jpg");
      },'image/jpeg');

    } else {
      canvas.toBlob(function(blob) {
          saveAs(blob, filename+".png");
      });
    }


    canvas.remove();
    if (typeof remove !== 'undefined') {
      $("#"+remove).remove();
    }
    if(resetWidth == true) {
      $("#"+id).attr('width','100%');
    }
})
};

function save_as_svg(svg,style){
var date = getDate() + "_" + getTime()
var svg_data = document.getElementById(svg).innerHTML
var head = '<svg title="graph" version="1.1" xmlns="http://www.w3.org/2000/svg" width="2200" height="2000">'
var g = '<g transform="translate(100,20) scale(1)">'
var style = style
var full_svg = head + style + g + svg_data + "</g></svg>"
var blob = new Blob([full_svg], {type: "image/svg+xml"});
saveAs(blob, svg + "_" + date + ".svg");
};


function svg_data(svg,style,g){
var svg_data = document.getElementById(svg).innerHTML
var head = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="2200" height="2000">'
var g_close = '</g>'
var style = style
var full_svg = head + style + g + svg_data + g_close + "</svg>"
return full_svg;
};



function dashboardAmrDonutExport(donutE,legendE){

  var svgNS = "http://www.w3.org/2000/svg";
  var outer = document.getElementById('response');

  var chartSvg = $('#' + donutE + ' svg')[0];
  var chartContent = chartSvg.childNodes[0];

  var legendArray = $('.' + legendE);

  var merged = document.createElement('div');
  $(merged).attr('id', 'merged-div');
  outer.appendChild(merged);

  var mergedSvg = document.createElementNS(svgNS, 'svg');
  $(mergedSvg).attr('id', 'mergedAmrDonut');
  $(mergedSvg).attr('height', '300');
  $(mergedSvg).attr('width', '700');

  merged.appendChild(mergedSvg);


  var clonedTaxaDonutLegend = d3.select("#mergedAmrDonut").append("g")
    .attr('id', 'clonedAmrDonutLegend');

    var clonedNode = chartContent.cloneNode(true);
      $(clonedNode).attr('id','amrDonutDonut')

    mergedSvg.appendChild(clonedNode);

  var legendY;

  legendArray.each(function(item) {
  var legendContent = Array.from($(this)[0].childNodes);

  for (const [i, child] of legendContent.entries()){
    var clonedNode = legendContent[i].cloneNode(true);
    legendY = item*25;
    var x =0;
    $(clonedNode).attr("transform","translate("+x+","+legendY+")");
    $('#clonedAmrDonutLegend')[0].appendChild(clonedNode);
  }

  });

  var border = 5;
  var legendHeight = $("#clonedAmrDonutLegend")[0].getBBox().height;
  var legendWidth = $("#clonedAmrDonutLegend")[0].getBBox().width;
  var plotX = legendWidth + 140 + 60 + border;
  if (legendHeight > 300 + (border*2)) {
    $(mergedSvg).attr('height', legendHeight+(border*2));
  }
  $(mergedSvg).attr('width', plotX+border+140);
  $('#clonedAmrDonutLegend').attr("transform","translate("+border+","+border+")");
  $('#amrDonutDonut').attr("transform","translate("+plotX+","+(140+border)+")");

}



function dashboardTaxaDonutExport(){

  var svgNS = "http://www.w3.org/2000/svg";
  var outer = document.getElementById('response');

  var chart = document.getElementById('dashboardTaxaDonutPlot');
  var chartSvg = chart.getElementsByTagName('svg')[0];
  var chartContent = Array.from(chartSvg.childNodes);

  var legendArray = $(".taxaDonutLegend");

  var merged = document.createElement('div');
  $(merged).attr('id', 'merged-div');
  outer.appendChild(merged);

  var mergedSvg = document.createElementNS(svgNS, 'svg');
  $(mergedSvg).attr('id', 'mergedTaxaDonut');
  $(mergedSvg).attr('height', '300');
  $(mergedSvg).attr('width', '700');

  merged.appendChild(mergedSvg);


  var clonedTaxaDonutLegend = d3.select("#mergedTaxaDonut").append("g")
    .attr('id', 'clonedTaxaDonutLegend');

  for (const [i, child] of chartContent.entries()){
    var clonedNode = chartContent[i].cloneNode(true);
    if ($(clonedNode).attr('id') == 'donutExport') {
      $(clonedNode).attr('id','taxaDonutDonut')
    }
    mergedSvg.appendChild(clonedNode);
  }

  var legendY;

  legendArray.each(function(item) {
  var legendContent = Array.from($(this)[0].childNodes);

  for (const [i, child] of legendContent.entries()){
    var clonedNode = legendContent[i].cloneNode(true);
    legendY = item*25;
    var x =0;
    $(clonedNode).attr("transform","translate("+x+","+legendY+")");
    $('#clonedTaxaDonutLegend')[0].appendChild(clonedNode);
  }

  });

  var border = 5;
  var legendHeight = $("#clonedTaxaDonutLegend")[0].getBBox().height;
  var legendWidth = $("#clonedTaxaDonutLegend")[0].getBBox().width;
  var plotX = legendWidth + 140 + 60 + border;
  if (legendHeight > 300 + (border*2)) {
    $(mergedSvg).attr('height', legendHeight+(border*2));
  }
  $(mergedSvg).attr('width', plotX+border+140);
  $('#clonedTaxaDonutLegend').attr("transform","translate("+border+","+border+")");
  $('#taxaDonutDonut').attr("transform","translate("+plotX+","+(140+border)+")");

}


function compareTaxaDonutExport(){

      var svgNS = "http://www.w3.org/2000/svg";
      var outer = document.getElementById('response');


      var legendArray = $(".donutCompareLegend");
      var compareDonuts = $("#compareDonutPlot .pie");

      var merged = document.createElement('div');
      $(merged).attr('id', 'merged-div');
      outer.appendChild(merged);

      var mergedSvg = document.createElementNS(svgNS, 'svg');
      $(mergedSvg).attr('id', 'mergedCompareDonutPlot');
      $(mergedSvg).attr('height', '500');
      $(mergedSvg).attr('width', '900');

      merged.appendChild(mergedSvg);


        var clonedDonutComparePlot = d3.select("#mergedCompareDonutPlot").append("g")
          .attr('id', 'clonedDonutComparePlot');

        var clonedDonutCompareLegend = d3.select("#mergedCompareDonutPlot").append("g")
          .attr('id', 'clonedDonutCompareLegend');

                var numberDonutLines = 1;

                var donutSpacing = 20;
                var currentDonutLinePosition = 0;
                var currentDonutCount = 0;

                clonedDonutComparePlot.append("g")
                  .attr('id', 'clonedDonutComparePlot_line_'+numberDonutLines);

              var donutArray = [];

              compareDonuts.each(function() {
                donutArray.unshift(this);
              });

              var line = [];
              var donutCount = 0;
              var donutWidth = 0;

              var largestDonutRad = 0;
              var tallestElementDonutRad = 0;
              var tallestElement = 0;
              var lineData = {};

              while (donut = donutArray.pop()) {
                  var donutChildElement = donut.firstChild;
                  var clonedChildElement = donutChildElement.cloneNode(true);
                  line.push(clonedChildElement);

                  donutWidth = Math.ceil(donutChildElement.getBBox().width);
                  var elementHeight = Math.ceil(donutChildElement.getBBox().height);

                  var previousDonutLinePosition = currentDonutLinePosition + donutWidth/2;
                  donutCount += 1;

                  if (donutWidth/2 > largestDonutRad){
                    largestDonutRad = donutWidth/2;
                  }

                  if (compareDonutArea == "equal" && donutCount > 3) {
                      line.pop();
                      numberDonutLines += 1;
                      clonedDonutComparePlot.append("g")
                        .attr('id', 'clonedDonutComparePlot_line_'+numberDonutLines);
                      currentDonutLinePosition = donutWidth + donutSpacing;
                      line = [clonedChildElement];
                      previousDonutLinePosition = donutWidth/2;
                      donutCount = 1;
                      largestDonutRad = 0;
                      tallestElement = 0;
                      tallestElementDonutRad = 0;
                  } else if (compareDonutArea == "read" && previousDonutLinePosition > 1024){
                    line.pop();
                    numberDonutLines += 1;
                    clonedDonutComparePlot.append("g")
                      .attr('id', 'clonedDonutComparePlot_line_'+numberDonutLines);
                    currentDonutLinePosition = donutWidth + donutSpacing;
                    line = [clonedChildElement];
                    previousDonutLinePosition = donutWidth/2;
                    donutCount = 1;
                    largestDonutRad = 0;
                    tallestElement = 0;
                    tallestElementDonutRad = 0;
                  } else {

                    currentDonutLinePosition = previousDonutLinePosition + donutWidth/2 + donutSpacing;
                  }

                  if (donutWidth/2 > largestDonutRad){
                    largestDonutRad = donutWidth/2;
                  }
                  if (elementHeight > tallestElement){
                    tallestElement = elementHeight;
                    tallestElementDonutRad = donutWidth/2;
                  }

                  lineData["r"+numberDonutLines] = {largestDonutRad: largestDonutRad, tallestElementDonutRad: tallestElementDonutRad};

                  $(clonedChildElement).attr("transform","translate("+previousDonutLinePosition+",0)");
                  $("#clonedDonutComparePlot_line_"+numberDonutLines)[0].appendChild(clonedChildElement);


              }


                var donutLines = d3.selectAll('#clonedDonutComparePlot>g');

                var linePosition = 0;
                var firstLineHeight;

                donutLines.attr("transform",function(d,i) {
                  var thisHeight = this.getBBox().height;
                  var yPos;
                  if (i==0) {
                    firstLineHeight = thisHeight;
                    yPos = 0;
                  } else {
                    var toAdd = lineData["r"+(i)]["largestDonutRad"] + thisHeight - lineData["r"+(i+1)]["tallestElementDonutRad"] + donutSpacing;
                    yPos = linePosition + toAdd;
                    linePosition += toAdd;
                  }

                  return "translate(0,"+yPos+")"
                });


        var numberLines = 1;
        var lineHeight = 30;
        var legendSpacing = 10;
        var currentLineLength = 0;
        var maxLineLength = $("#clonedDonutComparePlot")[0].getBBox().width;

        clonedDonutCompareLegend.append("g")
          .attr('id', 'clonedDonutCompareLegend_line_'+numberLines);

      legendArray.each(function(item) {
      var legendContent = Array.from($(this)[0].childNodes);

      for (const [i, child] of legendContent.entries()){
        var clonedNode = legendContent[i].cloneNode(true);
        var clonedNodeWidth = legendContent[i].getBBox().width;
        var previousLineLength = currentLineLength;
        if ((currentLineLength + clonedNodeWidth) > maxLineLength) {
          previousLineLength = 0;
          currentLineLength = clonedNodeWidth + legendSpacing;
          numberLines += 1;
          clonedDonutCompareLegend.append("g")
            .attr('id', 'clonedDonutCompareLegend_line_'+numberLines);
        } else {
          currentLineLength += clonedNodeWidth + legendSpacing;
        }
        var x = previousLineLength;
        var y = lineHeight * (numberLines-1);
        $(clonedNode).attr("transform","translate("+x+",0)");
        $("#clonedDonutCompareLegend_line_"+numberLines)[0].appendChild(clonedNode);
      }

      });

      var legendLines = d3.selectAll('#clonedDonutCompareLegend>g');

      legendLines.attr("transform",function(d,i) {
        var thisLength = this.getBBox().width;
        var xPos = (maxLineLength - thisLength) / 2;
        var yPos = lineHeight * i;
        return "translate("+xPos+","+yPos+")"
      });


      var legendHeight = $("#clonedDonutCompareLegend")[0].getBBox().height;
      var donutPlotHeight = $("#clonedDonutComparePlot")[0].getBBox().height;
      $('#clonedDonutCompareLegend').attr("transform","translate(20,20)");
      var newHeight = legendHeight + donutPlotHeight + 60;
      var newWidth = maxLineLength + 40;
      $(mergedSvg).attr('height', newHeight);
      $(mergedSvg).attr('width', newWidth);
      var plotX = 20;
      var plotY = legendHeight + 40 + firstLineHeight - lineData["r1"]["tallestElementDonutRad"];

      $('#clonedDonutComparePlot').attr("transform","translate("+plotX+","+plotY+")");

};



function compareTaxaStackedBarExport(){

      var svgNS = "http://www.w3.org/2000/svg";
      var outer = document.getElementById('response');

      var chartSvg = $('#stackedBarPlot svg')[0];
      var chartContent = chartSvg.childNodes[0];

      var chartSvgViewBox = $(chartSvg).attr('viewBox');

      var legendArray = $(".stackedBarLegend");

      var merged = document.createElement('div');
      $(merged).attr('id', 'merged-div');
      outer.appendChild(merged);

      var mergedSvg = document.createElementNS(svgNS, 'svg');
      $(mergedSvg).attr('id', 'mergedStackedBarPlot');
      $(mergedSvg).attr('height', '500');
      $(mergedSvg).attr('width', '920');

      merged.appendChild(mergedSvg);

        var clonedChart = chartContent.cloneNode(true);
          $(clonedChart).attr('id','clonedStackedBarPlot')

        mergedSvg.appendChild(clonedChart);


        var clonedStackedBarLegend = d3.select("#mergedStackedBarPlot").append("g")
          .attr('id', 'clonedStackedBarLegend');

        var numberLines = 1;
        var lineHeight = 30;
        var legendSpacing = 10;
        var currentLineLength = 0;
        var maxLineLength = 840;

        clonedStackedBarLegend.append("g")
          .attr('id', 'clonedStackedBarLegend_line_'+numberLines);

      legendArray.each(function(item) {
      var legendContent = Array.from($(this)[0].childNodes);

      for (const [i, child] of legendContent.entries()){
        var clonedNode = legendContent[i].cloneNode(true);
        var clonedNodeWidth = legendContent[i].getBBox().width;
        var previousLineLength = currentLineLength;
        if ((currentLineLength + clonedNodeWidth) > 840) {
          previousLineLength = 0;
          currentLineLength = clonedNodeWidth + legendSpacing;
          numberLines += 1;
          clonedStackedBarLegend.append("g")
            .attr('id', 'clonedStackedBarLegend_line_'+numberLines);
        } else {
          currentLineLength += clonedNodeWidth + legendSpacing;
        }
        var x = previousLineLength;
        var y = lineHeight * (numberLines-1);
        $(clonedNode).attr("transform","translate("+x+",0)");
        $("#clonedStackedBarLegend_line_"+numberLines)[0].appendChild(clonedNode);
      }

      });

      var legendLines = d3.selectAll('#clonedStackedBarLegend>g');

      legendLines.attr("transform",function(d,i) {
        var thisLength = this.getBBox().width;
        var xPos = (maxLineLength - thisLength) / 2;
        var yPos = lineHeight * i;
        return "translate("+xPos+","+yPos+")"
      });

      var yTrans = 35 + $("#clonedStackedBarLegend")[0].getBBox().height;
      var xAxisHeight = $("#clonedStackedBarPlot g.x.axis")[0].getBBox().height;
      $('#clonedStackedBarLegend').attr("transform","translate(40,15)");
      var newHeight = 500 + yTrans + xAxisHeight;
      $(mergedSvg).attr('height', newHeight);
      $('#clonedStackedBarPlot').attr("transform","translate(80,"+yTrans+")");


};



function dashboardAccumulationExport(){

      var svgNS = "http://www.w3.org/2000/svg";
      var outer = document.getElementById('response');

      var chartSvg = $('#compareRarefactionPlot svg')[0];
      var chartContent = chartSvg.childNodes[0];

      var legendArray = $(".rarefactionCompareLegend");

      var merged = document.createElement('div');
      $(merged).attr('id', 'merged-div');
      outer.appendChild(merged);

      var mergedSvg = document.createElementNS(svgNS, 'svg');
      $(mergedSvg).attr('id', 'mergedAccumulationPlot');
      $(mergedSvg).attr('height', '500');
      $(mergedSvg).attr('width', '920');

      merged.appendChild(mergedSvg);

        var clonedChart = chartContent.cloneNode(true);
          $(clonedChart).attr('id','clonedAccumulationPlot')

        mergedSvg.appendChild(clonedChart);


        var clonedAccumulationLegend = d3.select("#mergedAccumulationPlot").append("g")
          .attr('id', 'clonedAccumulationLegend')
          .attr("transform","translate(60,0)");

        var numberLines = 1;
        var lineHeight = 30;
        var legendSpacing = 15;
        var currentLineLength = 0;
        var maxLineLength = 840;

        clonedAccumulationLegend.append("g")
          .attr('id', 'clonedAccumulationLegend_line_'+numberLines);

      legendArray.each(function(item) {
      var legendContent = Array.from($(this)[0].childNodes);

      for (const [i, child] of legendContent.entries()){
        var clonedNode = legendContent[i].cloneNode(true);
        var clonedNodeWidth = legendContent[i].getBBox().width;
        var previousLineLength = currentLineLength;
        if ((currentLineLength + clonedNodeWidth) > maxLineLength) {
          previousLineLength = 0;
          currentLineLength = clonedNodeWidth + legendSpacing;
          numberLines += 1;
          clonedAccumulationLegend.append("g")
            .attr('id', 'clonedAccumulationLegend_line_'+numberLines);
        } else {
          currentLineLength += clonedNodeWidth + legendSpacing;
        }
        var x = previousLineLength;
        var y = lineHeight * (numberLines-1);
        $(clonedNode).attr("transform","translate("+x+",0)");
        $("#clonedAccumulationLegend_line_"+numberLines)[0].appendChild(clonedNode);
      }

      });

      var legendLines = d3.selectAll('#clonedAccumulationLegend>g');

      legendLines.attr("transform",function(d,i) {
        var thisLength = this.getBBox().width;
        var xPos = (maxLineLength - thisLength) / 2;
        var yPos = lineHeight * i;
        return "translate("+xPos+","+yPos+")"});

      var yTrans = 35 + $("#clonedAccumulationLegend")[0].getBBox().height;
      $('#clonedAccumulationLegend').attr("transform","translate(60,15)");
      var newHeight = 500 + yTrans;
      $(mergedSvg).attr('height', newHeight);
      $('#clonedAccumulationPlot').attr("transform","translate(60,"+yTrans+")");


};
