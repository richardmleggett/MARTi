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
      console.log(
        `[${new Date().toLocaleString()}] Monitoring MARTi files in: ${folder}`
      );

      var filesToWatch;

      if (folder.endsWith("/")) {
        filesToWatch = folder + "*/marti/**/*.json";
      } else {
        filesToWatch = folder + "/*/marti/**/*.json";
      }

      var watcher = chokidar.watch(filesToWatch, { persistent: true, usePolling: true });

      watcher.on('add', async filePath => {
        if (filePath.includes('sample.json')) {

          // Read content of new file
          var fileContent = await fsExtra.readFile(filePath);

          fileContent = JSON.parse(fileContent);

          var split = filePath.split(sep);

          var dir = split.slice(0,-4).join('/');

          var sampleName = split[split.length - 2]

          var runId = split[split.length - 4];
          fileContent.sample.dir = dir;
          fileContent.sample.pathName = sampleName;
          fileContent.sample.pathRun = runId;

          // emit an event when new file has been added
          // this.emit('meta-file-added', JSON.parse(fileContent));
          this.emit('meta-file-added', {
            id: sampleName,
            runId: runId,
            content: fileContent
          });

          console.log(
            `[${new Date().toLocaleString()}] ${filePath} has been ADDED.`
          );

        } else if (filePath.includes('tree_ms')) {

          // Read content of new file
          var fileContent = await fsExtra.readFile(filePath);

          // Temporary code to handle old file format
          fileContent = JSON.parse(fileContent);

          var treeData = fileContent.tree;

          var split = filePath.split(sep);

          var sampleName = split[split.length - 2]

          var runName = split[split.length - 4];

          var lca = "lca_" + filePath.split("ms")[1].split(".json")[0];

          // emit an event when new file has been added
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

          // Read content of new file
          var fileContent = await fsExtra.readFile(filePath);

          var split = filePath.split(sep);

          var sampleName = split[split.length - 2]

          var runName = split[split.length - 4];

          var lca = "lca_" + filePath.split("ms")[1].split(".json")[0];

          // emit an event when new file has been added
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

          // Read content of new file
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

          // emit an event when new file has been added
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

          // Read content of new file
          var fileContent = await fsExtra.readFile(filePath);

          fileContent = JSON.parse(fileContent);

          var split = filePath.split(sep);

          var dir = split.slice(0,-4).join('/');

          var sampleName = split[split.length - 2]

          var runId = split[split.length - 4];

          fileContent.sample.dir = dir;
          fileContent.sample.pathName = sampleName;
          fileContent.sample.pathRun = runId;

          // emit an event when new file has been added
          // this.emit('meta-file-added', JSON.parse(fileContent));
          this.emit('meta-file-updated', {
            id: sampleName,
            runId: runId,
            content: fileContent
          });

          console.log(
            `[${new Date().toLocaleString()}] ${filePath} has been CHANGED.`
          );


        } else if (filePath.includes('tree_ms')) {


            // Read content of new file
            var fileContent = await fsExtra.readFile(filePath);

            // Temporary code to handle old file format
            fileContent = JSON.parse(fileContent);

            var treeData = fileContent.tree;

            var split = filePath.split(sep);

            var sampleName = split[split.length - 2]

            var runName = split[split.length - 4];

            var lca = "lca_" + filePath.split("ms")[1].split(".json")[0];

            // emit an event when new file has been added
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

          // Read content of new file
          var fileContent = await fsExtra.readFile(filePath);

          var split = filePath.split(sep);

          var sampleName = split[split.length - 2]

          var runName = split[split.length - 4];

          var lca = "lca_" + filePath.split("ms")[1].split(".json")[0];

          // emit an event when new file has been added
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
          // Read content of new file
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

          // emit an event when new file has been added
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
          console.log(
            `[${new Date().toLocaleString()}] ${filePath} has been REMOVED.`
          );

          this.emit('meta-file-removed', {
            content: filePath
          });

        }
      });



    } catch (error) {
      console.log(error);
    }
  }


}

module.exports = Observer;
