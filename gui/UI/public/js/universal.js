var taxonomicLevelDict = {"no rank":0, "Domain":1, "Kingdom":2, "Phylum":3, "Class":4, "Order":5, "Family":6, "Genus":7, "Species":8, "Subspecies":9, "All Levels":10};
var taxonomicLevelDictRev = {"0":"no rank", "1":"domain", "2":"kingdom", "3":"phylum", "4":"class", "5":"order", "6":"family", "7":"genus", "8":"species", "9":"subspecies", "10":"all Levels"};

var taxonomicRankSelectedText;
var taxonomicRankSelectedTextLowerCase;

var colourPalettes = {
  default11: ['#a6cee3', '#1f78b4', '#b2df8a', '#33a02c', '#fb9a99', '#e31a1c', '#fdbf6f', '#ff7f00', '#cab2d6', '#6a3d9a', '#ffed75'],
  colorgorical14:["#4f8c9d", "#a7dcf9", "#154e56", "#6ce9d3", "#069668", "#86ec5a", "#709f0f", "#c5df72", "#754819", "#d79d91", "#c64e68",
  "#f7931e", "#fd5925", "#fd1e6e", "#374e07"],
  tolColorBlindLight9: ['#77AADD','#99DDFF','#44BB99','#BBCC33','#AAAA00','#EEDD88','#EE8866','#FFAABB','#DDDDDD'],
  tolRainbow21: ["#771155", "#AA4488", "#CC99BB", "#114477", "#4477AA", "#77AADD", "#117777", "#44AAAA", "#77CCCC", "#117744", "#44AA77", "#88CCAA", "#777711", "#AAAA44", "#DDDD77", "#774411", "#AA7744", "#DDAA77", "#771122", "#AA4455", "#DD7788"],
  large24: ['#556b2f', '#a0522d', '#483d8b', '#5f9ea0', '#008000', '#9acd32', '#00008b', '#8b008b', '#ff4500', '#ffa500', '#ffff00',
    '#deb887', '#00ff00', '#00fa9a', '#dc143c', '#00ffff', '#00bfff', '#0000ff', '#d8bfd8', '#ff00ff', '#1e90ff', '#db7093','#ff1493', '#ee82ee']
};

var selectedPalette = "default11";
var comparePlotColorPalette = d3.scale.ordinal()
    .range(colourPalettes[selectedPalette]);
var dashboardPlotColorPalette = d3.scale.ordinal()
    .range(colourPalettes[selectedPalette]);

var ctColor = d3.scale.ordinal()
    .range(colourPalettes[selectedPalette]);

var dashboardColorIndex = colourPalettes[selectedPalette].length;

function thousandsSeparators(num) {
  var num_parts = num.toString().split(".");
  num_parts[0] = num_parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return num_parts.join(".");
};

function lcaFormat(lca){
  var output;
    if (lca.length == 3) {
      output = lca;
    } else {
      output = lca + ".0";
    }
    return output;
}

// function recursiveSumFunction(d) {
//             childrenSum = 0;
//             function recursiveSum(n) {
//                     if (n.children != null || n.children != undefined){
//                       n.children.forEach(function(c){
//                           childrenSum += c.value;
//                           recursiveSum(c);
//                         });
//                     }
//             };
//             recursiveSum(d);
//             summedReadCount = childrenSum + d.value;
//             return summedReadCount;
// };

// function newLeafFunction(d,rank) {
//   var dLeaves = [];
//   if (rank != 10) {
//     if (d.children != null || d.children != undefined){
//       dChildIsLeaf = false;
//       d.children.forEach(function(c){
//         if (c.rank <= rank && c.rank != d.rank && c.rank != 0) {
//           dChildIsLeaf = true;
//         };
//       });
//       if (dChildIsLeaf == false) {
//         dLeaves.push(d.name)
//       }
//     } else {
//       dLeaves.push(d.name)
//     }
// var dLeaves = [...new Set(dLeaves)];
//
//   };
//               return dLeaves;
// };

// function labelNewLeaves(d,rank) {
//   var dLeaves = [];
//   if (rank != 10) {
//     if (d.children != null || d.children != undefined){
//       var dChildIsLeaf = false;
//       console.log(d.name);
//       d.children.forEach(function(c){
//         if (c.rank <= rank && c.rank != d.rank && c.rank != 0) {
//           console.log(c.name);
//           dChildIsLeaf = true;
//         };
//       });
//       if (dChildIsLeaf == false) {
//         dLeaves.push(d.ncbiID)
//       }
//     } else {
//       dLeaves.push(d.ncbiID)
//     }
// var dLeaves = [...new Set(dLeaves)];
//
//   };
//               return dLeaves;
// };

function openFullscreen(fullScreen) {
  $(".toolTip").appendTo(fullScreen)
  if (fullScreen.requestFullscreen) {
    fullScreen.requestFullscreen();
  } else if (fullScreen.mozRequestFullScreen) { /* Firefox */
    fullScreen.mozRequestFullScreen();
  } else if (fullScreen.webkitRequestFullscreen) { /* Chrome, Safari & Opera */
    fullScreen.webkitRequestFullscreen();
  } else if (fullScreen.msRequestFullscreen) { /* IE/Edge */
    fullScreen.msRequestFullscreen();
  }
};

function closeFullscreen() {
  $(".toolTip").appendTo(document.body)
  if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if (document.mozCancelFullScreen) {
    document.mozCancelFullScreen();
  } else if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
  } else if (document.msExitFullscreen) {
    document.msExitFullscreen();
  }
};

function exitHandler() {
    if (!document.fullscreenElement && !document.webkitIsFullScreen && !document.mozFullScreen && !document.msFullscreenElement) {
      $("[id^=fullScreenCloseIcon]").hide();
      $("[id^=fullScreenOpenIcon]").show();
      $(".card-body-custom").removeClass("fullScreen");
      $(".toolTip").appendTo(document.body);
      if($("#donutPlot").length){
            toggleDonutLegendOff();
        }
    }
};


function isFullScreen () {
  if (document.fullscreenElement ||
    document.mozFullScreenElement ||
    document.webkitFullscreenElement ||
    document.msFullscreenElement ) {
    return true;
  }
  return false;
}

function fullScreenIconStart() {

  document.addEventListener('fullscreenchange', exitHandler);
  document.addEventListener('webkitfullscreenchange', exitHandler);
  document.addEventListener('mozfullscreenchange', exitHandler);
  document.addEventListener('MSFullscreenChange', exitHandler);

  $("[id^=fullScreenOpenIcon]").click(function() {
    $(this).hide();
    $("[id^=fullScreenCloseIcon]").show();
    $(".card-body-custom").addClass("fullScreen");
  });

  $("[id^=fullScreenCloseIcon]").click(function() {
    $(this).hide();
    $("[id^=fullScreenOpenIcon]").show();
    $(".card-body-custom").removeClass("fullScreen");
  });

  $("[id^=fullScreenCloseIcon]").hide();


};



function getDate(){
var d = new Date()
var monthArray = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
var month = monthArray[d.getMonth()];
var date = d.getFullYear() + "-" + month + "-" + d.getDate()
return date;
};

function getTime(){
var d = new Date()
var time = d.getHours() + "-" + d.getMinutes() + "-" + d.getSeconds()
return time;
};



$(document).ready(function() {
// $(".topbar #sidebarToggleTop").click(function() {
//   $(".topbar").toggleClass("topToggled");
//   $(".fixed-options-bar").toggleClass("topToggled");
// });


// Define the div for the tooltip
toolTipDiv = d3.select("body").append("div")
    .attr("class", "toolTip")
    .style("opacity", 0)
    .style("color", "black");

});

function isEmpty(obj) {
    for(var key in obj) {
        if(obj.hasOwnProperty(key))
            return false;
    }
    return true;
}

function findWithAttr(array, attr, value) {
    for(var i = 0; i < array.length; i += 1) {
        if(array[i][attr] == value) {
            return i;
        }
    }
    return -1;
}

function assignToObject(obj, keyPath, value) {
   lastKeyIndex = keyPath.length-1;
   for (var i = 0; i < lastKeyIndex; ++ i) {
     key = keyPath[i];
     if (!(key in obj)){
       obj[key] = {}
     }
     obj = obj[key];
   }
   obj[keyPath[lastKeyIndex]] = value;
}

function checkNested(obj) {
  var args = Array.prototype.slice.call(arguments, 1);

  for (var i = 0; i < args.length; i++) {
    if (!obj || !obj.hasOwnProperty(args[i])) {
      return false;
    }
    obj = obj[args[i]];
  }
  return true;
}

function hexToRgb(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

function rank(r) {
  var firstData = r[0];
  if (r.length > 1 ){
    return "n/a"
  } else {
    return firstData.ncbiRank
  }
};

function ncbiID(r) {
  var firstData = r[0];
  if (r.length > 1 ){
    return "n/a"
  } else {
    return firstData.ncbiID
  }
};

function thresholdName(r) {
  var firstData = r[0];
  if (firstData.threshold == "Other" ){
    return firstData.threshold;
  } else {
    return firstData.name;
  }
};

socket = io.connect();

uuid = null;
currentPage = "";
currentDashboardSampleName = "";
currentDashboardSampleRun = "";
compareSampleObjectArray = [];

socket.on('connect', () => {
  console.log("Connected to server");
  socket.emit("register-request", {
    uuid: uuid,
    // currentPage: currentPage,
    currentDashboardSampleName: currentDashboardSampleName,
    currentDashboardSampleRun: currentDashboardSampleRun,
    compareSampleObjectArray: compareSampleObjectArray
  });
});
// initiate the register from the client


socket.on('register-response', response => {
  uuid = response;
  console.log("id: " + response);
});



socket.on('hb_ping', function(data){
    socket.emit('hb_pong', {beat: 1});
    });

socket.on('current-client-count', function(data){
  console.log("current number of user: " + data);
  $("#currentClientCount").text(data);
    });

socket.on('sample-removed', function(data){
  console.log("Sample removed: " + data.runId + " " + data.sampleId);

  if(currentPage=="Samples") {
    socket.emit('meta-request',{
      clientId: uuid
    });
  } else if (currentPage == "Dashboard" && currentDashboardSampleName == data.sampleId) {
    currentDashboardSampleName = "";

    activeSidebarIcon($("#samples-item"));
    currentPage = "Samples";
    $("h1#pageTitle").text("Samples");
    $("#response").load("samples.html", function() {
    $("html, body").animate({ scrollTop: "0px" });
    initialiseSamplePage();
    });


  } else if (currentPage == "Compare" ) {
    var findSampleInCompare = compareSampleObjectArray.findIndex(e => e.name == data.sampleId && e.runId == data.runId);

    if (findSampleInCompare != -1) {
      compareSampleObjectArray.splice(findSampleInCompare,1);
      activeSidebarIcon($("#samples-item"));
      currentPage = "Samples";
      $("h1#pageTitle").text("Samples");
      $("#response").load("samples.html", function() {
      $("html, body").animate({ scrollTop: "0px" });
      initialiseSamplePage();
      });
    };

  };
if (currentDashboardSampleName == data.sampleId) {
  currentDashboardSampleName = "";
};
var findSampleInCompare = compareSampleObjectArray.findIndex(e => e.name == data.sampleId && e.runId == data.runId);

  if (findSampleInCompare != -1) {
    compareSampleObjectArray.splice(findSampleInCompare,1);
  };

    });
