#!/usr/bin/env node
var express = require('express');
var app = express();
const { v4: uuidv4 } = require('uuid');
const fsExtra = require('fs-extra');
const homedir = require('os').homedir();

var argv = require('minimist')(process.argv.slice(2));

var serverOptions = {};
serverOptions["MinKNOWRunDirectory"] = "";
serverOptions["MARTiSampleDirectory"] = [];
serverOptions["TaxonomyDirectory"] = "";
serverOptions["MaxSimultaneousAnalyses"] = 10;
serverOptions["Port"] = "";
serverOptions["https"] = "false";
serverOptions["Key"] = "";
serverOptions["Certificate"] = "";
var numAnalyses = 0;

var engineOptionsPath = "";
if (argv.options) {
  if(fsExtra.existsSync(argv.options)) {
    engineOptionsPath = argv.options;
  }
} else if(fsExtra.existsSync("./marti_engine_options.txt")) {
    engineOptionsPath = "./marti_engine_options.txt";
  } else if(fsExtra.existsSync(homedir + "/marti_engine_options.txt")) {
    engineOptionsPath = homedir + "/marti_engine_options.txt";
  } else if (fsExtra.existsSync(homedir + "/.marti_engine_options.txt")) {
    engineOptionsPath = homedir + "/.marti_engine_options.txt";
  } else {
    console.log("Warning: Could not find marti_engine_options.txt");
  }

engineOptionsObject = {processes:[]};

try {
  const martiEngineOptions = fsExtra.readFileSync(engineOptionsPath, 'UTF-8');
  const lines = martiEngineOptions.split(/\r?\n/);
  var newProcess = false;
  var processFound = false;
  var currentProcess = {text:""};
  lines.forEach((line) => {
      if(line.charAt(0) != '#') {
        if (newProcess == true) {
          if (line == "") {
            newProcess = false;
            engineOptionsObject.processes.push(currentProcess);
            currentProcess = {text:""};
          } else {
            var key = line.split(":")[0].trim();
            var value;
            if (key == "UseToClassify") {
              currentProcess.text += "    " + key + "\n";
              value = "true";
            } else {
              value = line.split(":")[1].trim();
              currentProcess.text += "    " + key + ":" + value + "\n";
            }
            currentProcess[key] = value;
          }
        } else if (line.search("BlastProcess") != -1) {
          newProcess = true;
          processFound = true;
        } else {
          const fields = line.split(":");
          if(fields[0] == "MARTiSampleDirectory") {
            const dirs = fields[1].split(";");
            for (const dir of dirs) {
              var finalDir;
              if (dir.endsWith('/')){
                finalDir = dir.slice(0, -1);
              } else {
                finalDir = dir;
              };
              serverOptions["MARTiSampleDirectory"].push(finalDir);
            }
          } else if (fields[0] == "MaxSimultaneousAnalyses") {
            serverOptions["MaxSimultaneousAnalyses"] = parseInt(fields[1]);
          } else {
            serverOptions[fields[0]] = fields[1];
          }
        };
      }
  });
  if( serverOptions["MinKNOWRunDirectory"] == "" ||
      serverOptions["MARTiSampleDirectory"].length < 1 ||
      serverOptions["TaxonomyDirectory"] == "") {
    console.log("Warning: Could not find all fields in " + serverOptionsPath + ".");
    console.log("Please check this file and restart to start new analyses.");
  }
  if (newProcess == true) {
    newProcess = false;
    engineOptionsObject.processes.push(currentProcess);
    currentProcess = {text:""};
  }

if(processFound == false) {
    console.log("Warning: Could not find any processes in " + engineOptionsPath);
}
} catch (err) {
}

function checkIfValidPortnumber(num) {
  const regexExp = /^((6553[0-5])|(655[0-2][0-9])|(65[0-4][0-9]{2})|(6[0-4][0-9]{3})|([1-5][0-9]{4})|([0-5]{0,5})|([0-9]{1,4}))$/gi;
  return regexExp.test(num);
}


  if(serverOptions["Port"] && checkIfValidPortnumber(serverOptions["Port"])) {
      var selectedPort = serverOptions["Port"];
  } else {
    var selectedPort = 3000;
    console.log("No or invalid entry for port. Set to default (3000)");
  }

  //Check for port flag and override server options if valid port provided.
  const portFlag = argv.p;
  if (typeof portFlag !== 'undefined') {
    if (checkIfValidPortnumber(portFlag)) {
      var selectedPort = portFlag;
    }
  }


//Check if https is true
if (serverOptions["https"].toLowerCase() === 'true') {
    //Create https server and include certificate.
    const httpsOptions = {
      key: fsExtra.readFileSync(serverOptions["Key"]),
      cert: fsExtra.readFileSync(serverOptions["Certificate"]),
    };
    var http = require('https').createServer(httpsOptions, app);
  } else {
    var http = require('http').createServer(app);
  }

  var io = require('socket.io')(http);

const restrictedMode = argv.r || false;

const martiGuiVersion = "0.19.6";

if (argv.v || argv.version) {
  console.log(martiGuiVersion);
  process.exit();
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
        if(newList.includes("fastq_pass") || newList.includes("pass")) {
          minKNOWSampleNames.push(MinKNOWRunDirectory + "/" + dir);
        }
        else if(newList.length == 1) {
          const sampleDir = newList[0];
          newList = getSubDirectories(MinKNOWRunDirectory + "/" + dir + "/" + sampleDir);
          if(newList.length == 1) {
            const uid_dir = newList[0];
            newList = getSubDirectories(MinKNOWRunDirectory + "/" + dir + "/" + sampleDir + "/" + uid_dir);
            if(newList.includes("fastq_pass")) {
              minKNOWSampleNames.push(MinKNOWRunDirectory + "/" + dir + "/" + sampleDir + "/" + uid_dir);
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
  configFileString += "RawDataDir:" + form_object["rawDataDir"] + "\n";
  configFileString += "SampleName:" + form_object["martiName"] + "\n";
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

  if(form_object.hasOwnProperty("analysisName")) {
        if(Array.isArray(form_object["analysisName"])) {
          for (var [i, process] of form_object["analysisName"].entries()) {
              configFileString += process;
              configFileString += "\n";
            }
        } else {
              configFileString += form_object["analysisName"];
              configFileString += "\n";
        }
  }
  return configFileString;
}


var Observer = require('./services/observer');

app.use(express.static(__dirname + '/public'));

app.use(express.urlencoded({ extended: true }));

var observer = new Observer();


observer.on('id-file-added', meta => {
  metaDataUpdateId(meta);
});

observer.on('id-file-removed', meta => {

  var runId = meta.runId;

  if(sampleMetaDict[runId]){

    for (const [name, newName] of Object.entries(sampleNamesDict[runId])) {
      if (sampleMetaDict[runId][name]) {
        sampleMetaDict[runId][name]["sample"]["id"] = sampleMetaDict[runId][name]["sample"]["originalId"];
      }
    }

    io.sockets.emit('meta-update-available', {
      runId: runId,
      sampleId: ""
    });
  }

    delete sampleNamesDict[runId];

});

function metaDataUpdate(meta) {

var data = meta.content;
var sampleId = meta.id;
var runId = meta.runId;

if (!data.sample.hasOwnProperty("runId")) {
  data.sample.runId = runId;
}


  if (sampleMetaDict[runId]) {
    sampleMetaDict[runId][sampleId] = data;
  } else {
    sampleMetaDict[runId] = {};
    sampleMetaDict[runId][sampleId] = data;
  }
  if(sampleNamesDict[runId]){
    updateMetaDataSampleNames(runId);
  }

  if (sampleMetadataDict[runId]) {
    if (sampleMetadataDict[runId][sampleId]){
      sampleMetaDict[runId][sampleId]["sample"]["metadatafile"] = sampleMetadataDict[runId][sampleId];
    }
  }

  io.sockets.emit('meta-update-available', {
    runId: runId,
    sampleId: sampleId
  });
}

function updateMetaDataSampleNames(runId) {

    for (const [name, newName] of Object.entries(sampleNamesDict[runId])) {
      if (sampleMetaDict[runId][name]) {
        sampleMetaDict[runId][name]["sample"]["id"] = newName;
        sampleMetaDict[runId][name]["sample"]["originalId"] = name;

      } else {

      }
    }


}

var runIdsToUpdate = [];

function metaDataUpdateId(meta) {

  var data = meta.content;
  var runId = meta.runId;

  sampleNamesDict[runId] = data;

  if(sampleMetaDict[runId]){
  updateMetaDataSampleNames(runId);

  io.sockets.emit('meta-update-available', {
    runId: runId,
    sampleId: ""
  });
  }

}

function handleSampleUrl(clientId,uuid) {

  for (var [run, samples] of Object.entries(sampleMetaDict)) {
    for (var [sample, data] of Object.entries(samples)) {
      if (data["sample"].hasOwnProperty("uuid")) {
        if (data.sample.uuid == uuid) {
          clientData[clientId]["selectedDashboardSample"]["name"] = sample;
          clientData[clientId]["selectedDashboardSample"]["runId"] = run;
          io.to(clientId).emit('current-dashboard-sample-url-switch', clientData[clientId].selectedDashboardSample);
        }
      }
    }
  }
}

observer.on('meta-file-added', meta => {
  metaDataUpdate(meta);
});

observer.on('meta-file-updated', meta => {
  metaDataUpdate(meta);
});

observer.on('meta-file-removed', meta => {

  var sampleId = meta.id;
  var runId = meta.runName;

  if (sampleMetaDict.hasOwnProperty(runId) && sampleMetaDict[runId].hasOwnProperty(sampleId)) {
    delete sampleMetaDict[runId][sampleId];
  }

  if (sampleTreeDict.hasOwnProperty(runId) && sampleTreeDict[runId].hasOwnProperty(sampleId)) {
    delete sampleTreeDict[runId][sampleId];
  }

  if (sampleAccumulationDict.hasOwnProperty(runId) && sampleAccumulationDict[runId].hasOwnProperty(sampleId)) {
    delete sampleAccumulationDict[runId][sampleId];
  }

  if (sampleAmrDict.hasOwnProperty(runId) && sampleAmrDict[runId].hasOwnProperty(sampleId)) {
    delete sampleAmrDict[runId][sampleId];
  }

  for (const [uuid, entryData] of Object.entries(clientData)) {
    if (sampleId == entryData.selectedDashboardSample.name && runId == entryData.selectedDashboardSample.runId) {
      entryData.selectedDashboardSample.name = "";
      entryData.selectedDashboardSample.runId = "";
    };

    var findSampleInCompare = entryData.selectedCompareSamples.findIndex(e => e.name == sampleId && e.runId == runId);

    if (findSampleInCompare != -1) {
      entryData.selectedCompareSamples.splice(findSampleInCompare,1);
    };

  };

  io.sockets.emit('sample-removed', {
    runId: runId,
    sampleId: sampleId
  });


});



observer.on('metadata-file-added', data => {
  metadataFileUpdate(data);
});

function metadataFileUpdate(meta) {

var data = meta.content;
var sampleId = meta.id;
var runId = meta.runId;

  if (sampleMetadataDict[runId]) {
    sampleMetadataDict[runId][sampleId] = data;
  } else {
    sampleMetadataDict[runId] = {};
    sampleMetadataDict[runId][sampleId] = data;
  }

  if (sampleMetaDict[runId]) {
    if (sampleMetaDict[runId][sampleId]){

      sampleMetaDict[runId][sampleId]["sample"]["metadatafile"] = data;

      io.sockets.emit('meta-update-available', {
        runId: runId,
        sampleId: sampleId
      });
    }
  }

}

observer.on('tree-file-added', tree => {


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

observer.on('tree-file-updated', tree => {
  sampleTreeDict[tree.runName][tree.id][tree.lca]=tree.content;

  for (const [id, data] of Object.entries(clientData)) {
    if ((tree.id == data.selectedDashboardSample.name && tree.runName == data.selectedDashboardSample.runId) || (data.selectedCompareSamples.filter(e => e.name == tree.id && e.runId == tree.runName).length > 0)) {
      io.to(id).emit('tree-update-available');
      console.log(`[${new Date().toLocaleString()}][${id}] Tree update notification sent`);
    };
  };

});



observer.on('accumulation-file-added', data => {

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

observer.on('accumulation-file-updated', data => {

  var accumulationData = data.content;
  var id = data.id;
  var runId = data.runName;
  var lca = data.lca;

sampleAccumulationDict[runId][id][lca]=accumulationData;

  for (const [uuid, entryData] of Object.entries(clientData)) {
    if ((id == entryData.selectedDashboardSample.name && runId == entryData.selectedDashboardSample.runId) || entryData.selectedCompareSamples.filter(e => e.name == id && e.runId == runId).length > 0) {
      io.to(uuid).emit('accumulation-update-available');
      console.log(`[${new Date().toLocaleString()}][${uuid}] Accumulation update notification sent`);
    };
  };

});


observer.on('amr-file-added', data => {

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

observer.on('amr-file-updated', data => {

  var amrData = data.content;
  var id = data.id;
  var runId = data.runName;

  sampleAmrDict[runId][id] = amrData;

  for (const [uuid, entryData] of Object.entries(clientData)) {
    if ((id == entryData.selectedDashboardSample.name && runId == entryData.selectedDashboardSample.runId) || entryData.selectedCompareSamples.filter(e => e.name == id && e.runId == runId).length > 0) {
      io.to(uuid).emit('amr-update-available');
      console.log(`[${new Date().toLocaleString()}][${uuid}] Amr update notification sent`);
    };
  };

});

var martiDirs = [];
var projectsEnabled = false;
var projectsDatabase = {};

if(serverOptions["MARTiSampleDirectory"].length > 0){
  for (var dir of serverOptions["MARTiSampleDirectory"]) {
    if (!dir.endsWith("/")) {
      dir = dir + "/";
    };

    try {
      const projectsObj = fsExtra.readJsonSync(dir + "projects.json");
      for (const [project,selectors] of Object.entries(projectsObj)){
        var projectRuns = [];
        var projectDirectories = [];
        var projectSamples = [];

        for (const [selector,values] of Object.entries(selectors)){
          if (selector == "directories"){
            projectDirectories = values;
          } else if (selector == "runs") {
            projectRuns = values;
          } else if (selector == "samples") {
            projectSamples = values;
          }
        }
        projectsDatabase[project] = {
          "directories":projectDirectories,
          "runs":projectRuns,
          "samples":projectSamples
        };
      }
      projectsEnabled = true;
    } catch (err) {
    }

    observer.watchFolder(dir);
  }

} else {
  console.log("MARTiSampleDirectory not specified.");
}


var sampleMetaDict = {};
var sampleMetadataDict = {};
var sampleNamesDict = {};
var sampleTreeDict = {};
var sampleAccumulationDict = {};
var sampleAmrDict = {};

var database = [];


var clientData = {};


app.get('/', function(req, res){
  res.sendFile(__dirname + '/indexNode.html');
});

http.listen(selectedPort, '0.0.0.0', function(){
  console.log(`[${new Date().toLocaleString()}] listening on port ${selectedPort}`);
});



app.get('/:runId/:sampleId/:lca/csv', function (req, res) {
  var run = req.params.runId;
  var name = req.params.sampleId;
  var lca = req.params.lca;
  var dir = sampleMetaDict[run][name].sample.dir;
  const file = dir + '/'+ run + '/marti/' + name + '/assignments_ms' + lca + '.csv';
  res.download(file);
})

app.get('/project/:project', function (req, res) {
  res.sendFile(__dirname + '/indexNode.html');
})

app.get('/sample/:sample', function (req, res) {
  res.sendFile(__dirname + '/indexNode.html');
})


app.post('/new',(req, res) => {
  if(numAnalyses < serverOptions["MaxSimultaneousAnalyses"] ) {
    // check output dir exists, create if not
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

    // start MARTi
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
  var guiVersionAndClientCount = {
    clientCount: clientCount,
    guiVersion: martiGuiVersion
  }
  io.sockets.emit('current-client-count', guiVersionAndClientCount);

  socket.on('hb_pong', function(data){
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
        selectedCompareSamples: data.compareSampleObjectArray,
        project: data.clientProject,
        sample: data.clientSample
      };
      console.log(`[${new Date().toLocaleString()}][${id}] New client ID`);
    } else {
      console.log(`[${new Date().toLocaleString()}][${id}] Already exists in object`);
    }

      socket.join(id);
      // io.to(id).emit('register-response', id);

      handleSampleUrl(id,data.clientSample);


      io.to(id).emit('register-response', {
        id: id,
        mode: restrictedMode
      });

      console.log(`[${new Date().toLocaleString()}][${id}] Client registered`);
      sendHeartbeat();


  });


  socket.on('meta-request', request => {
    var id = request.clientId;

    if (!projectsEnabled){
    io.to(id).emit('meta-response', sampleMetaDict);
    console.log(`[${new Date().toLocaleString()}][${id}] Metadata sent`);
  } else {
    if (clientData[id]["project"]){
      var project = clientData[id]["project"];
      if(projectsDatabase.hasOwnProperty(project)){
        var customMetaDict = {};
        for (const [run,samples] of Object.entries(sampleMetaDict)){

          if(projectsDatabase[project]["runs"].includes(run)){
            customMetaDict[run] = samples;
          } else {
            for (const [sample,info] of Object.entries(samples)){

              if (projectsDatabase[project]["samples"].includes(sample)){
                if (customMetaDict.hasOwnProperty(run)) {
                  customMetaDict[run][sample] = info;
                } else {
                  customMetaDict[run] = {};
                  customMetaDict[run][sample] = info;
                }
              } else if (projectsDatabase[project]["directories"].includes(info.sample.dir)){
                if (customMetaDict.hasOwnProperty(run)) {
                  customMetaDict[run][sample] = info;
                } else {
                  customMetaDict[run] = {};
                  customMetaDict[run][sample] = info;
                }
              }
            }
          }
        }
        io.to(id).emit('meta-response', customMetaDict);
        console.log(`[${new Date().toLocaleString()}][${id}] Metadata sent`);
      }
    }
  }
  });

  socket.on('update-sample-name-request', request => {
    var newId = request.newId;
    var originalId = request.originalId;
    var sampleId = request.pathName;
    var runId = request.pathRun;

    var dir;
    var idFileContent={};
      if (sampleMetaDict[runId]) {
        dir = sampleMetaDict[runId][sampleId]["sample"]["dir"];
        var idFilePath = dir + "/" + runId + "/ids.json";

        if (fsExtra.existsSync(idFilePath)) {
          idFileContentTemp = fsExtra.readFileSync(idFilePath);
          try {
            idFileContentTemp = JSON.parse(idFileContentTemp);
            idFileContent = idFileContentTemp;

          } catch (error) {
            console.error(error);
          }
        }

        idFileContent[originalId] = newId;

        fsExtra.writeJson(idFilePath, idFileContent, (err) => {
          if (err) throw err;

        });

      }

  })

  socket.on('default-server-options-request', request => {
    var id = request.clientId;
    scanMinKNOWRunDirectory();
    serverOptions.processes = engineOptionsObject.processes;
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
  });

  socket.on('selected-compare-samples', samples => {
      var id = samples.clientId;
      var samples = samples.data;
      clientData[id].selectedCompareSamples = samples;
      io.to(id).emit('current-compare-samples-response', clientData[id].selectedCompareSamples);
      var sampleNames = [];
      for (const sample of samples) {
        sampleNames.push(sample.name);
      }
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
            console.log(`[${new Date().toLocaleString()}][${id}] Dashboard tree data sent at lca: ${lca}`);
          }
        };

    });

  socket.on('dashboard-meta-request', request => {
    var id = request.clientId;
    var selectedDashboardSampleName = clientData[id].selectedDashboardSample.name;
    var selectedDashboardSampleRunId = clientData[id].selectedDashboardSample.runId;
    io.to(id).emit('dashboard-meta-response', sampleMetaDict[selectedDashboardSampleRunId][selectedDashboardSampleName]);
    console.log(`[${new Date().toLocaleString()}][${id}] Dashboard meta data sent`);
    });


socket.on('compare-tree-request', request => {
  var id = request.clientId;
  var lca = request.lca;
  var selectedCompareSamples = clientData[id].selectedCompareSamples;
  compareTreeData = [];
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

    socket.on('compare-amr-request', request => {
      var id = request.clientId;
      var selectedCompareSamples = clientData[id].selectedCompareSamples;
      var compareAmrData = [];
      for (var sample of selectedCompareSamples){
        if (sampleAmrDict.hasOwnProperty(sample.runId)) {
          if (sampleAmrDict[sample.runId].hasOwnProperty(sample.name)) {
            compareAmrData.push({
              id: sample.name,
              runId: sample.runId,
              data: sampleAmrDict[sample.runId][sample.name]
            });
            };
          };
        };
      if (compareAmrData.length != 0) {
      io.to(id).emit('compare-amr-response', compareAmrData);
      console.log(`[${new Date().toLocaleString()}][${id}] Compare amr data sent`);
      };
      });

    socket.on('dashboard-accumulationChart-request', request => {
      var id = request.clientId;
      var rank = request.rank;
      var lca = request.lca;


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
          io.sockets.emit('current-client-count', guiVersionAndClientCount);
        });

        socket.on('disconnecting', () => {
          const rooms = Object.keys(socket.rooms);
          var property = rooms[1];
          console.log(`[${new Date().toLocaleString()}] Client disconnecting: ${property}`);

        });



});
