const chokidar = require('chokidar');
const EventEmitter = require('events').EventEmitter;
const fsExtra = require('fs-extra');
var path = require('path');
var sep = path.sep;

class Observer extends EventEmitter {
  constructor() {
    super();
  }

  watchFolder(folder) {
    try {


      var filesToWatch;
      var idFilesToWatch;

      if (!folder.endsWith("/")) {
        folder = folder + "/";
      };

      console.log(
        `[${new Date().toLocaleString()}] Attempting to monitor MARTi run directories in the following location: ${folder}`
      );

      var dirToMonitor;
        if (fsExtra.existsSync(folder + "marti")) {
          console.log(
            `[${new Date().toLocaleString()}] WARNING: An individual run directory has been specified.`
          );
            filesToWatch = folder + "marti/**/*.json";
            dirToMonitor = folder + "marti/";
            idFilesToWatch = folder + "ids.json"
            console.log(
              `[${new Date().toLocaleString()}] Monitoring MARTi Engine output files in the following directory: ${dirToMonitor}`
            );
        } else {
            filesToWatch = folder + "*/marti/**/*.json";
            idFilesToWatch = folder + "*/ids.json";
            console.log(
              `[${new Date().toLocaleString()}] Monitoring MARTi run directories in the following location: ${folder}`
            );
        }


      var watcher = chokidar.watch(filesToWatch, { persistent: true, usePolling: true, atomic: true, awaitWriteFinish: {stabilityThreshold: 1000, pollInterval: 100 }});

      watcher.on('add', async filePath => {
        if (filePath.includes('sample.json')) {

          var fileContent = await fsExtra.readFile(filePath);

          fileContent = JSON.parse(fileContent);

          var split = filePath.split(sep);

          var dir = split.slice(0,-4).join('/');

          var sampleName = split[split.length - 2]

          var runId = split[split.length - 4];
          fileContent.sample.dir = dir;
          fileContent.sample.pathName = sampleName;
          fileContent.sample.pathRun = runId;


          // var idFilePath = split.slice(0,-3).join('/') + "/ids.json";
          //
          // if (fsExtra.existsSync(idFilePath)) {
          //
          //   var idFileContent = await fsExtra.readFile(idFilePath);
          //
          //   idFileContent = JSON.parse(idFileContent);
          //
          //
          //   if (idFileContent.hasOwnProperty(sampleName)){
          //     fileContent.sample.originalId = fileContent.sample.id;
          //     fileContent.sample.id = idFileContent[sampleName];
          //   }
          //
          //
          //
          //   console.log(
          //     `[${new Date().toLocaleString()}] ${idFilePath} has been ADDED.`
          //   );
          // }

          this.emit('meta-file-added', {
            id: sampleName,
            runId: runId,
            content: fileContent
          });

          console.log(
            `[${new Date().toLocaleString()}] ${filePath} has been ADDED.`
          );

        } else if (filePath.includes('tree_ms')) {

          var fileContent = await fsExtra.readFile(filePath);

          fileContent = JSON.parse(fileContent);

          var treeData = fileContent.tree;

          var split = filePath.split(sep);

          var sampleName = split[split.length - 2]

          var runName = split[split.length - 4];

          var lca = "lca_" + filePath.split("ms")[1].split(".json")[0];

          this.emit('tree-file-added', {
            id: sampleName,
            runName: runName,
            lca: lca,
            content: treeData
          });

          console.log(
            `[${new Date().toLocaleString()}] ${filePath} has been ADDED.`
          );

        } else if (filePath.includes('accumulation_')) {


          var fileContent = await fsExtra.readFile(filePath);

          var split = filePath.split(sep);

          var sampleName = split[split.length - 2]

          var runName = split[split.length - 4];

          var lca = "lca_" + filePath.split("ms")[1].split(".json")[0];

          this.emit('accumulation-file-added', {
            id: sampleName,
            runName: runName,
            lca: lca,
            content: JSON.parse(fileContent).accumulation
          });

          console.log(
            `[${new Date().toLocaleString()}] ${filePath} has been ADDED.`
          );

        }else if (filePath.includes('amr.json')) {

          var fileContent = await fsExtra.readFile(filePath);

          // Temporary code to handle old file format
          fileContent = JSON.parse(fileContent);

          var amrData;

          if (fileContent.hasOwnProperty("amr")) {
            amrData = fileContent.amr;
          } else {
            amrData = fileContent;
          }

          var split = filePath.split(sep);

          var sampleName = split[split.length - 2]

          var runName = split[split.length - 4];

          this.emit('amr-file-added', {
            id: sampleName,
            runName: runName,
            content: amrData
          });

          console.log(
            `[${new Date().toLocaleString()}] ${filePath} has been ADDED.`
          );

        }
      });

      watcher.on('change', async filePath => {
        if (filePath.includes('sample.json')) {

          var fileContent = await fsExtra.readFile(filePath);

          fileContent = JSON.parse(fileContent);

          var split = filePath.split(sep);

          var dir = split.slice(0,-4).join('/');

          var sampleName = split[split.length - 2]

          var runId = split[split.length - 4];

          fileContent.sample.dir = dir;
          fileContent.sample.pathName = sampleName;
          fileContent.sample.pathRun = runId;

          this.emit('meta-file-updated', {
            id: sampleName,
            runId: runId,
            content: fileContent
          });

          console.log(
            `[${new Date().toLocaleString()}] ${filePath} has been CHANGED.`
          );


        } else if (filePath.includes('tree_ms')) {


            var fileContent = await fsExtra.readFile(filePath);

            // Temporary code to handle old file format
            fileContent = JSON.parse(fileContent);

            var treeData = fileContent.tree;

            var split = filePath.split(sep);

            var sampleName = split[split.length - 2]

            var runName = split[split.length - 4];

            var lca = "lca_" + filePath.split("ms")[1].split(".json")[0];

            this.emit('tree-file-updated', {
              id: sampleName,
              runName: runName,
              lca: lca,
              content: treeData
            });

            console.log(
              `[${new Date().toLocaleString()}] ${filePath} has been CHANGED.`
            );


        } else if (filePath.includes('accumulation_')) {

          var fileContent = await fsExtra.readFile(filePath);

          var split = filePath.split(sep);

          var sampleName = split[split.length - 2]

          var runName = split[split.length - 4];

          var lca = "lca_" + filePath.split("ms")[1].split(".json")[0];

          this.emit('accumulation-file-updated', {
            id: sampleName,
            runName: runName,
            lca: lca,
            content: JSON.parse(fileContent).accumulation
          });

          console.log(
            `[${new Date().toLocaleString()}] ${filePath} has been CHANGED.`
          );


        } else if (filePath.includes('amr.json')) {

          var fileContent = await fsExtra.readFile(filePath);

          // Temporary code to handle old file format
          fileContent = JSON.parse(fileContent);

          var amrData;

          if (fileContent.hasOwnProperty("amr")) {
            amrData = fileContent.amr;
          } else {
            amrData = fileContent;
          }

          var split = filePath.split(sep);

          var sampleName = split[split.length - 2]

          var runName = split[split.length - 4];

          this.emit('amr-file-updated', {
            id: sampleName,
            runName: runName,
            content: amrData
          });

          console.log(
            `[${new Date().toLocaleString()}] ${filePath} has been CHANGED.`
          );
        }
      });

      watcher.on('unlink', async filePath => {
        if (filePath.includes('sample.json')) {

          var split = filePath.split(sep);

          var sampleName = split[split.length - 2]

          var runName = split[split.length - 4];

          if(fsExtra.existsSync(filePath)) {
            console.log(
              `[${new Date().toLocaleString()}] ${filePath} still exists. Network delay.`
            );
          } else {

            console.log(
              `[${new Date().toLocaleString()}] ${filePath} has been REMOVED.`
            );

            this.emit('meta-file-removed', {
              id: sampleName,
              runName: runName,
              content: filePath
            });

          }



        }
      });

      var idFileWatcher = chokidar.watch(idFilesToWatch, { persistent: true, usePolling: true, atomic: true, awaitWriteFinish: {stabilityThreshold: 1000, pollInterval: 100 }});

      idFileWatcher.on('add', async filePath => {

          var idFileContent = await fsExtra.readFile(filePath);

          // idFileContent = JSON.parse(idFileContent);

          try {
            idFileContent = JSON.parse(idFileContent);
          } catch (error) {
            // fsExtra.unlinkSync(filePath);
            console.error(error);
            return;
          }

          var split = filePath.split(sep);
          var dir = split.slice(0,-2).join('/');

          var runId = split[split.length - 2];

          console.log(
            `[${new Date().toLocaleString()}] ${filePath} has been ADDED.`
          );

          this.emit('id-file-added', {
            runId: runId,
            content: idFileContent
          });


      })

      idFileWatcher.on('change', async filePath => {

          var idFileContent = await fsExtra.readFile(filePath);

          idFileContent = JSON.parse(idFileContent);

          var split = filePath.split(sep);
          var dir = split.slice(0,-2).join('/');

          var runId = split[split.length - 2];

          console.log(
            `[${new Date().toLocaleString()}] ${filePath} has been CHANGED.`
          );

          this.emit('id-file-added', {
            runId: runId,
            content: idFileContent
          });


      })

      idFileWatcher.on('unlink', async filePath => {

        var split = filePath.split(sep);
        var dir = split.slice(0,-2).join('/');

        var runId = split[split.length - 2];

          console.log(
            `[${new Date().toLocaleString()}] ${filePath} has been REMOVED.`
          );

          this.emit('id-file-removed', {
            runId: runId
          });


      });


    } catch (error) {
      console.log(error);
    }



  }


}

module.exports = Observer;
