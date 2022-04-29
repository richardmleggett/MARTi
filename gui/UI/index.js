#!/usr/bin/env node

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
const { v4: uuidv4 } = require('uuid');
// var fs = require('fs');
const fsExtra = require('fs-extra');
const homedir = require('os').homedir();

const myArgs = process.argv.slice(2);

/* Check if number is a valid port number */
function checkIfValidPortnumber(num) {
  // Regular expression to check if number is a valid port number
  const regexExp = /^((6553[0-5])|(655[0-2][0-9])|(65[0-4][0-9]{2})|(6[0-4][0-9]{3})|([1-5][0-9]{4})|([0-5]{0,5})|([0-9]{1,4}))$/gi;
  return regexExp.test(num);
}

// Use the function
var slectedPort = 3000;

if (myArgs.length == 1) {
  var portCandidate = parseInt(myArgs[0]);
  if (checkIfValidPortnumber(portCandidate)){
    slectedPort = portCandidate;
  }
}



var serverOptions = {};
serverOptions["MinKNOWRunDirectory"] = "";
serverOptions["MARTiSampleDirectory"] = [];
serverOptions["BlastDatabaseDirectory"] = "";
serverOptions["TaxonomyDirectory"] = "";
serverOptions["MaxSimultaneousAnalyses"] = 10;
var numAnalyses = 0;

var serverOptionsPath = "";
if(fsExtra.existsSync("./marti_server_options.txt")) {
  serverOptionsPath = "./marti_server_options.txt";
} else if(fsExtra.existsSync(homedir + "/marti_server_options.txt")) {
  serverOptionsPath = homedir + "/marti_server_options.txt";
} else if (fsExtra.existsSync(homedir + "/.marti_server_options.txt")) {
  serverOptionsPath = homedir + "/.marti_server_options.txt";
} else {
  console.log("Warning: Could not find marti_server_options.txt.");
  console.log("You must have the file marti_server_options.txt in either the working directory or your home directory to start new analyses.");
}

try {
  const MARTiServerOptions = fsExtra.readFileSync(serverOptionsPath, 'UTF-8');
  const lines = MARTiServerOptions.split(/\r?\n/);
  lines.forEach((line) => {
      if(line.charAt(0) != '#') {
        const fields = line.split("\t");
        if(fields[0] == "MinKNOWRunDirectory") {
          serverOptions["MinKNOWRunDirectory"] = fields[1];
        } else if(fields[0] == "MARTiSampleDirectory") {
          const dirs = fields[1].split(":");
          for (const dir of dirs) {
            var finalDir;
            if (dir.endsWith('/')){
              finalDir = dir.slice(0, -1);
            } else {
              finalDir = dir;
            };
            serverOptions["MARTiSampleDirectory"].push(finalDir);
          }
          // serverOptions["MARTiSampleDirectory"] = fields[1];

        } else if (fields[0] == "BlastDatabaseDirectory") {
          serverOptions["BlastDatabaseDirectory"] = fields[1];
        } else if (fields[0] == "TaxonomyDirectory") {
          serverOptions["TaxonomyDirectory"] = fields[1];
        } else if (fields[0] == "MaxSimultaneousAnalyses") {
          serverOptions["MaxSimultaneousAnalyses"] = parseInt(fields[1]);
        }
      }
  });
  if( serverOptions["MinKNOWRunDirectory"] == "" ||
      serverOptions["MARTiSampleDirectory"].length < 1 ||
      serverOptions["BlastDatabaseDirectory"] == "" ||
      serverOptions["TaxonomyDirectory"] == "") {
    console.log("Warning: Could not find all fields in " + serverOptionsPath + ".");
    console.log("Please check this file and restart to start new analyses.");
  }
} catch (err) {
  //console.log(err);
}

function getSubDirectories(path) {
  return fsExtra.readdirSync(path).filter(function (file) {
    return fsExtra.statSync(path+'/'+file).isDirectory();
  });
}

function scanMinKNOWRunDirectory() {
  var minKNOWSampleNames = [];
  if(serverOptions["MinKNOWRunDirectory"] != "") {
    try {
      const MinKNOWRunDirectory = serverOptions["MinKNOWRunDirectory"];
      var sampleDirs = [];
      var list = getSubDirectories(MinKNOWRunDirectory);
      list.forEach(function(dir) {
        var newList = getSubDirectories(MinKNOWRunDirectory + "/" + dir);
        if(newList.length == 1) {
          const sampleDir = newList[0];
          newList = getSubDirectories(MinKNOWRunDirectory + "/" + dir + "/" + sampleDir);
          if(newList.length == 1) {
            const uid_dir = newList[0];
            newList = getSubDirectories(MinKNOWRunDirectory + "/" + dir + "/" + sampleDir + "/" + uid_dir);
            if(newList.includes("fastq_pass")) {
              minKNOWSampleNames.push(dir);
            }
          }
        }
      });
    } catch (err) {
      console.error(err);
    }
  }
  serverOptions["minKNOWSampleNames"] = minKNOWSampleNames;
}

function makeConfigFileString(form_object) {
  var configFileString = "";
  var dir1 = getSubDirectories(serverOptions["MinKNOWRunDirectory"] + "/" + form_object["sampleName"])[0];
  var dir2 = getSubDirectories(serverOptions["MinKNOWRunDirectory"] + "/" + form_object["sampleName"] + "/" + dir1)[0];
  configFileString += "SampleName:" + form_object["martiName"] + "\n";
  configFileString += "RawDataDir:" + serverOptions["MinKNOWRunDirectory"] + "/" + form_object["sampleName"] + "/" + dir1 + "/" + dir2 + "\n";
  configFileString += "SampleDir:" + form_object["outputDir"] + "/" + form_object["martiName"] + "\n";
  if(form_object.hasOwnProperty('processBarcodeCheck') && form_object["processBarcodeCheck"] == "on") {
    if(Array.isArray(form_object["barcodeCheck"])) {
      configFileString += "ProcessBarcodes:";
      for(var i = 0; i < form_object["barcodeCheck"].length; i++) {
        configFileString += form_object["barcodeCheck"][i] + ",";
      }
      configFileString = configFileString.slice(0, -1) + "\n";
      for(var i = 0; i < form_object["barcodeName"].length; i++) {
        configFileString += "BarcodeId" + parseInt(form_object["barcodeCheck"][i]).toString() + ":" + form_object["barcodeName"][i] + "\n";
      }
    } else {
      configFileString += "ProcessBarcodes:" + form_object["barcodeCheck"] + "\n";
      configFileString += "BarcodeId" + parseInt(form_object["barcodeCheck"]).toString() + ":" + form_object["barcodeName"] + "\n";
    }
  }
  configFileString += "Scheduler:" + "local" + "\n";
  configFileString += "LocalSchedulerMaxJobs:" + form_object["maxJobs"] + "\n";
  configFileString += "InactivityTimeout:" + form_object["inactivityTimeout"] + "\n";
  configFileString += "StopProcessingAfter:" + form_object["stopProcessingAfter"] + "\n";
  configFileString += "TaxonomyDir:" + serverOptions["TaxonomyDirectory"] + "\n";
  configFileString += "LCAMaxHits:" + form_object["maxHits"] + "\n";
  configFileString += "LCAScorePercent:" + form_object["scorePercent"] + "\n";
  configFileString += "LCAMinIdentity:" + form_object["minimumIdentity"] + "\n";
  configFileString += "LCAMinQueryCoverage:" + form_object["minQueryCoverage"] + "\n";
  configFileString += "LCAMinCombinedScore:" + form_object["minCombinedScore"] + "\n";
  configFileString += "ReadsPerBlast:" + form_object["readsPerChunk"] + "\n";
  configFileString += "ReadFilterMinQ:" + form_object["readFilterMinQ"] + "\n";
  configFileString += "ReadFilterMinLength:" + form_object["minimumReadLength"] + "\n";
  if(form_object.hasOwnProperty("processName")) {
    if(Array.isArray(form_object["processName"])) {
    for(var i = 0; i < form_object["processName"].length; i++) {
        configFileString += "BlastProcess\n";
        configFileString += "\tName:" + form_object["processName"][i] + "\n";
        configFileString += "\tProgram:" + form_object["blastProgram"][i] + "\n";
        configFileString += "\tDatabase:" + form_object["databaseDir"][i] + "/" + form_object["blastDatabase"][i] + "\n";
        if(form_object["taxaFilter"][i].length > 0) {
          configFileString += "\tTaxaFilter:" + form_object["taxaFilter"][i] + "\n";
        }
        configFileString += "\tMaxE:" + form_object["maxE"][i] + "\n";
        configFileString += "\tMaxTargetSeqs:" + form_object["maxTargetSeqs"][i] + "\n";
        configFileString += "\tBlastThreads:" + form_object["blastThreads"][i] + "\n";
        if(form_object.hasOwnProperty("useToClassify") && form_object["useToClassify"][i] == "on") {
          configFileString += "\tUseToClassify\n";
        }
      }
    } else {
      configFileString += "BlastProcess\n";
      configFileString += "\tName:" + form_object["processName"] + "\n";
      configFileString += "\tProgram:" + form_object["blastProgram"] + "\n";
      configFileString += "\tDatabase:" + form_object["databaseDir"] + "/" + form_object["blastDatabase"] + "\n";
      if(form_object["taxaFilter"].length > 0 ) {
        configFileString += "\tTaxaFilter:" + form_object["taxaFilter"] + "\n";
      }
      configFileString += "\tMaxE:" + form_object["maxE"] + "\n";
      configFileString += "\tMaxTargetSeqs:" + form_object["maxTargetSeqs"] + "\n";
      configFileString += "\tBlastThreads:" + form_object["blastThreads"] + "\n";
      if(form_object.hasOwnProperty("useToClassify") && form_object["useToClassify"] == "on") {
        configFileString += "\tUseToClassify\n";
      }
    }
  }
  return configFileString;
}

// var fsExtra = require('fs-extra');
// var EventEmitter = require('events').EventEmitter;
// var chokidar = require('chokidar');
// var path = require('path');
var Obserser = require('./services/observer');

app.use(express.static(__dirname + '/public'));

app.use(express.urlencoded({ extended: true }));

var obserser = new Obserser();



function metaDataUpdate(meta) {

var data = meta.content;
var id = meta.id;
var runId = meta.runId;

if (!data.sample.hasOwnProperty("runId")) {
  data.sample.runId = runId;
}



  if (sampleMetaDict[runId]) {
    sampleMetaDict[runId][id] = data;
  } else {
    sampleMetaDict[runId] = {};
    sampleMetaDict[runId][id] = data;
  }


  io.sockets.emit('meta-update-available', {
    runId: runId,
    sampleId: id
  });
}

obserser.on('meta-file-added', meta => {
  // sampleMetaDict[meta.sample.id]=meta;
  // io.sockets.emit('meta-update-available', {
  //   sampleId: meta.sample.id
  // });

  // if (!meta.sample.hasOwnProperty("runId")) {
  //   meta.sample.runId = meta.sample.id;
  // }
  //
  // if (sampleMetaDict[meta.sample.runId]) {
  //   sampleMetaDict[meta.sample.runId][meta.sample.id] = meta;
  // } else {
  //   sampleMetaDict[meta.sample.runId] = {};
  //   sampleMetaDict[meta.sample.runId][meta.sample.id] = meta;
  // }
  //
  //
  // io.sockets.emit('meta-update-available', {
  //   runId: meta.sample.runId,
  //   sampleId: meta.sample.id
  // });

  metaDataUpdate(meta);

});

obserser.on('meta-file-updated', meta => {
  // sampleMetaDict[meta.sample.id]=meta;
  //
  // io.sockets.emit('meta-update-available', {
  //   runId: meta.sample.runId,
  //   sampleId: meta.sample.id
  // });
  metaDataUpdate(meta);
});

obserser.on('tree-file-added', tree => {


  if (sampleTreeDict[tree.runName]) {
    if (sampleTreeDict[tree.runName][tree.id]) {
      sampleTreeDict[tree.runName][tree.id][tree.lca]=tree.content;
    } else {
      sampleTreeDict[tree.runName][tree.id] = {};
      sampleTreeDict[tree.runName][tree.id][tree.lca]=tree.content;
    }
  } else {
    sampleTreeDict[tree.runName] = {};
    sampleTreeDict[tree.runName][tree.id] = {};
    sampleTreeDict[tree.runName][tree.id][tree.lca]=tree.content;
  }

});

obserser.on('tree-file-updated', tree => {
  sampleTreeDict[tree.runName][tree.id][tree.lca]=tree.content;

  for (const [id, data] of Object.entries(clientData)) {
    if ((tree.id == data.selectedDashboardSample.name && tree.runName == data.selectedDashboardSample.runId) || (data.selectedCompareSamples.includes(tree.id) )) {
      io.to(id).emit('tree-update-available');
      console.log(`[${new Date().toLocaleString()}][${id}] Tree update notification sent`);
    };
  };

});



obserser.on('accumulation-file-added', data => {

  var accumulationData = data.content;
  var id = data.id;
  var runId = data.runName;
  var lca = data.lca;

    if (sampleAccumulationDict[runId]) {
      if (sampleAccumulationDict[runId][id]) {
        sampleAccumulationDict[runId][id][lca]=accumulationData;
      } else {
        sampleAccumulationDict[runId][id] = {};
        sampleAccumulationDict[runId][id][lca]=accumulationData;
      }
    } else {
      sampleAccumulationDict[runId] = {};
      sampleAccumulationDict[runId][id] = {};
      sampleAccumulationDict[runId][id][lca]=accumulationData;
    }

    for (const [uuid, entryData] of Object.entries(clientData)) {
      if ((id == entryData.selectedDashboardSample.name && runId == entryData.selectedDashboardSample.runId) || entryData.selectedCompareSamples.filter(e => e.name == id && e.runId == runId).length > 0) {
        io.to(uuid).emit('accumulation-update-available');
        console.log(`[${new Date().toLocaleString()}][${uuid}] Accumulation update notification sent`);
      };
    };

});

obserser.on('accumulation-file-updated', data => {

  var accumulationData = data.content;
  var id = data.id;
  var runId = data.runName;
  var lca = data.lca;

sampleAccumulationDict[runId][id][lca]=accumulationData;

  for (const [uuid, entryData] of Object.entries(clientData)) {
    // console.log(entryData.selectedCompareSamples);
    // console.log("filter");
    // console.log(entryData.selectedCompareSamples.filter(e => e.name == id && e.runId == runId));
    if ((id == entryData.selectedDashboardSample.name && runId == entryData.selectedDashboardSample.runId) || entryData.selectedCompareSamples.filter(e => e.name == id && e.runId == runId).length > 0) {
      io.to(uuid).emit('accumulation-update-available');
      console.log(`[${new Date().toLocaleString()}][${uuid}] Accumulation update notification sent`);
    };
  };

});


obserser.on('amr-file-added', data => {

  var amrData = data.content;
  var id = data.id;
  var runId = data.runName;

  if (sampleAmrDict[runId]) {
    sampleAmrDict[runId][id] = amrData;
  } else {
    sampleAmrDict[runId] = {};
    sampleAmrDict[runId][id] = amrData;
  }


  for (const [uuid, entryData] of Object.entries(clientData)) {
    if (id == entryData.selectedDashboardSample.name && runId == entryData.selectedDashboardSample.runId) {
      io.to(uuid).emit('amr-update-available');
      console.log(`[${new Date().toLocaleString()}][${uuid}] Amr update notification sent`);
    };
  };


});

obserser.on('amr-file-updated', data => {

  var amrData = data.content;
  var id = data.id;
  var runId = data.runName;

  sampleAmrDict[runId][id] = amrData;

  for (const [uuid, entryData] of Object.entries(clientData)) {
    if (id == entryData.selectedDashboardSample.name && runId == entryData.selectedDashboardSample.runId) {
      io.to(uuid).emit('amr-update-available');
      console.log(`[${new Date().toLocaleString()}][${uuid}] Amr update notification sent`);
    };
  };

});

var martiDirs = [];

if(serverOptions["MARTiSampleDirectory"].length > 0){
  for (var dir of serverOptions["MARTiSampleDirectory"]) {
    obserser.watchFolder(dir);
  }

} else {
  console.log("MARTiSampleDirectory not specified.");
}



// const folder = serverOptions["MARTiSampleDirectory"];
// obserser.watchFolder(folder);


var sampleMetaDict = {};
var sampleTreeDict = {};
var sampleAccumulationDict = {};
var sampleAmrDict = {};

var clientData = {};


app.get('/', function(req, res){
  res.sendFile(__dirname + '/indexNode.html');
});

http.listen(slectedPort, '0.0.0.0', function(){
  console.log(`[${new Date().toLocaleString()}] listening on port ${slectedPort}`);
});



app.get('/:runId/:sampleId/:lca/csv', function (req, res) {
  var run = req.params.runId;
  var name = req.params.sampleId;
  var lca = req.params.lca;
  var dir = sampleMetaDict[run][name].sample.dir;
  const file = dir + '/'+ run + '/marti/' + name + '/assignments_ms' + lca + '.csv';
  res.download(file);
})

app.post('/new',(req, res) => {
  console.log(req.body);
  if(numAnalyses < serverOptions["MaxSimultaneousAnalyses"] ) {
    // check output dir exists, create if not
    //TODO: What if it already exists? Return to client with failure and request new marti name?
    const outputDir = req.body["outputDir"] + "/" + req.body["martiName"];
    if (!fsExtra.existsSync(outputDir)) {
      fsExtra.mkdirSync(outputDir);
    }

    // write the config file
    const configFileString = makeConfigFileString(req.body);
    fsExtra.writeFile(outputDir + "/config.txt", configFileString, err => {
      if (err) {
        console.error(err)
      }
    })

    //start MARTi
    var logStream = fsExtra.createWriteStream(outputDir + "/output.txt", {flags: 'a'});
    var spawn = require('child_process').spawn,
      marti_process = spawn('marti', ['-config', outputDir + '/config.txt']);
      numAnalyses += 1;
      marti_process.stdout.pipe(logStream);
      marti_process.stderr.pipe(logStream);

      marti_process.on('close', function (code) {
        numAnalyses -= 1;
        console.log('child process exited with code ' + code);
      });
    } else {
    console.log("Max number of analyses reached. Could not start new analysis.");
  }

  res.end();
});

function sendHeartbeat(){
    io.sockets.emit('hb_ping', { beat : 1 });
    setTimeout(sendHeartbeat, 8000);
}


var clientCount;

io.on('connect', function(socket){

  clientCount = socket.client.conn.server.clientsCount;
  console.log(`[${new Date().toLocaleString()}] Connection added - users connected: ${clientCount}`);
  io.sockets.emit('current-client-count', clientCount);

  socket.on('hb_pong', function(data){
    // console.log(data);
    //   console.log("Pong received from client");
  });

  socket.on('register-request', function(data){ // a client requests registration
    var id;

    if (data.uuid == null) {
      id = uuidv4();
    } else {
      id = data.uuid;
    }

    if(!clientData.hasOwnProperty(id)) {
      clientData[id] = {
        selectedDashboardSample: {
          name: data.currentDashboardSampleName,
          runId: data.currentDashboardSampleRun
        },
        selectedCompareSamples: data.compareSampleObjectArray
      };
      console.log(`[${new Date().toLocaleString()}][${id}] New client ID`);
    } else {
      console.log(`[${new Date().toLocaleString()}][${id}] Already exists in object`);
    }

      // var id = clientId == null? uuidv4() : clientId; // create an id if client doesn't already have one

      socket.join(id); //subscribe this socket to room id

      io.to(id).emit('register-response', id);

      console.log(`[${new Date().toLocaleString()}][${id}] Client registered`);
      sendHeartbeat();


  });



//   console.log(`[${new Date().toLocaleString()}] Client connected`);
//
  socket.on('meta-request', request => {
    var id = request.clientId;
    io.to(id).emit('meta-response', sampleMetaDict);
    console.log(`[${new Date().toLocaleString()}][${id}] Metadata sent`);
  });


  socket.on('default-server-options-request', request => {
    var id = request.clientId;
    scanMinKNOWRunDirectory();
    io.to(id).emit('default-server-options-response', serverOptions);
    console.log(`[${new Date().toLocaleString()}][${id}] Default server options sent`);
  });

  socket.on('selected-dashboard-sample', sample => {
        var id = sample.clientId;
        var sampleId = sample.name;
        var runId = sample.runId;
        clientData[id].selectedDashboardSample = {
          name: sampleId,
          runId: runId
        };
        io.to(id).emit('current-dashboard-sample-response', clientData[id].selectedDashboardSample);
        console.log(`[${new Date().toLocaleString()}][${id}] Dashboard sample selected: ${runId} - ${sampleId}`);
  });

  socket.on('selected-compare-samples', samples => {
      var id = samples.clientId;
      console.log(samples);
      var samples = samples.data;
      clientData[id].selectedCompareSamples = samples;
      console.log(samples);
      io.to(id).emit('current-compare-samples-response', clientData[id].selectedCompareSamples);
      var sampleNames = [];
      for (const sample of samples) {
        sampleNames.push(sample.name);
      }
      console.log(`[${new Date().toLocaleString()}][${id}] Compare samples selected: ${sampleNames}`);
  });

  socket.on('current-dashboard-sample-request', request => {
      var id = request.clientId;
      io.to(id).emit('current-dashboard-sample-response', clientData[id].selectedDashboardSample);
  });

  socket.on('current-compare-samples-request', request => {
      var id = request.clientId;
      io.to(id).emit('current-compare-samples-response', clientData[id].selectedCompareSamples);
  });

  socket.on('dashboard-tree-request', request => {
    var id = request.clientId;
    var lca = request.lca;
    var selectedDashboardSample = clientData[id].selectedDashboardSample.name;
    var selectedDashboardRun = clientData[id].selectedDashboardSample.runId;

    if (sampleTreeDict.hasOwnProperty(selectedDashboardRun)) {
          if (sampleTreeDict[selectedDashboardRun].hasOwnProperty(selectedDashboardSample)) {
            io.to(id).emit('dashboard-tree-response', {
              id: selectedDashboardSample,
              run: selectedDashboardRun,
              treeData: sampleTreeDict[selectedDashboardRun][selectedDashboardSample][lca],
              treeData2: sampleTreeDict[selectedDashboardRun][selectedDashboardSample][lca]
              });
            console.log(`[${new Date().toLocaleString()}][${id}] Dasboard tree data sent at lca: ${lca}`);
          }
        };

    });

  socket.on('dashboard-meta-request', request => {
    var id = request.clientId;
    var selectedDashboardSampleName = clientData[id].selectedDashboardSample.name;
    var selectedDashboardSampleRunId = clientData[id].selectedDashboardSample.runId;
    io.to(id).emit('dashboard-meta-response', sampleMetaDict[selectedDashboardSampleRunId][selectedDashboardSampleName]);
    console.log(`[${new Date().toLocaleString()}][${id}] Dasboard meta data sent`);
    });

socket.on('compare-tree-request', request => {
  var id = request.clientId;
  var lca = request.lca;
  var selectedCompareSamples = clientData[id].selectedCompareSamples;
  compareTreeData = [];
  console.log(sampleTreeDict);
  for (var sample of selectedCompareSamples){
    if (sampleTreeDict.hasOwnProperty(sample.runId)) {
      if (sampleTreeDict[sample.runId].hasOwnProperty(sample.name)) {
        compareTreeData.push({
          id: sample.name,
          runId: sample.runId,
          tree: sampleTreeDict[sample.runId][sample.name][lca]
        });
        };
      };
    };
  io.to(id).emit('compare-tree-response', compareTreeData);
  console.log(`[${new Date().toLocaleString()}][${id}] Compare tree data sent at lca: ${lca}`);
  });

  socket.on('compare-accumulation-request', request => {
    var id = request.clientId;
    var rank = request.rank;
    var lca = request.lca;

    var compareAccumulationData = [];
    var selectedCompareSamples = clientData[id].selectedCompareSamples;

    for (var sample of selectedCompareSamples){
      if (sampleAccumulationDict.hasOwnProperty(sample.runId)) {
        if (sampleAccumulationDict[sample.runId].hasOwnProperty(sample.name)) {
          compareAccumulationData.push({
            id: sample.name,
            runId: sample.runId,
            data: sampleAccumulationDict[sample.runId][sample.name][lca][rank]
          });
        }
      }
    };


    if (compareAccumulationData.length != 0) {
      io.to(id).emit('compare-accumulation-response', compareAccumulationData);
      console.log(`[${new Date().toLocaleString()}][${id}] Compare accumulation data sent`);
    };

    });

    socket.on('dashboard-accumulationChart-request', request => {
      var id = request.clientId;
      var rank = request.rank;
      var lca = request.lca;
      // var dashboardAccumulationData = [];


      var selectedDashboardSample = clientData[id].selectedDashboardSample.name;
      var selectedDashboardRun = clientData[id].selectedDashboardSample.runId;

      if (sampleAccumulationDict.hasOwnProperty(selectedDashboardRun)) {
            if (sampleAccumulationDict[selectedDashboardRun].hasOwnProperty(selectedDashboardSample)) {
              if (sampleAccumulationDict[selectedDashboardRun][selectedDashboardSample].hasOwnProperty(lca)) {
                io.to(id).emit('dashboard-accumulationChart-response', [{
                  id: selectedDashboardSample,
                  runId: selectedDashboardRun,
                  data: sampleAccumulationDict[selectedDashboardRun][selectedDashboardSample][lca][rank]
                }]);
                console.log(`[${new Date().toLocaleString()}][${id}] Dashboard accumulation data sent`);
              }
            }
          };

      });

      socket.on('dashboard-dashboardAmrTable-request', request => {
        var uuid = request.clientId;

        var selectedDashboardSample = clientData[uuid].selectedDashboardSample.name;
        var selectedDashboardRun = clientData[uuid].selectedDashboardSample.runId;

        // console.log(selectedDashboardSample);
        // console.log(selectedDashboardRun);
        // console.log(sampleAmrDict[selectedDashboardRun][selectedDashboardSample]);

        if (sampleAmrDict.hasOwnProperty(selectedDashboardRun)) {
              if (sampleAmrDict[selectedDashboardRun].hasOwnProperty(selectedDashboardSample)) {
                io.to(uuid).emit('dashboard-dashboardAmrTable-response', sampleAmrDict[selectedDashboardRun][selectedDashboardSample]);
                console.log(`[${new Date().toLocaleString()}][${uuid}] Dashboard amr data sent`);
              }
            };

        });



        socket.on('disconnect', () => {
          clientCount = socket.client.conn.server.clientsCount;
          console.log(`[${new Date().toLocaleString()}] Connection removed - users connected: ${clientCount}`);
          io.sockets.emit('current-client-count', clientCount);
        });

        socket.on('disconnecting', () => {
          const rooms = Object.keys(socket.rooms);
          var property = rooms[1];
          console.log(`[${new Date().toLocaleString()}] Client disconnecting: ${property}`);
          // delete clientData[property];
        });



});
