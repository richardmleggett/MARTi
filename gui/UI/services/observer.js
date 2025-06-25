const chokidar = require('chokidar');
const EventEmitter = require('events').EventEmitter;
const fsExtra = require('fs-extra');
const path = require('path');
const sep = path.sep;

/**
 * Safely read and parse a JSON file that may still be growing on disk.
 * Retries a few times before ultimately throwing the error so callers can
 * decide what to do next (e.g. log and ignore, delete, etc.).
 *
 * @param {string} filePath  Absolute path to JSON file
 * @param {number} retries   How many attempts before giving up
 * @param {number} delay     Delay (ms) between attempts
 * @returns {Promise<object>} Parsed JSON object
 */
async function safeJsonRead (filePath, retries = 5, delay = 500) {
  for (let i = 0; i < retries; i++) {
    try {
      const raw = await fsExtra.readFile(filePath, 'utf-8');
      return JSON.parse(raw);
    } catch (err) {
      // Re‑throw on last attempt; otherwise wait then retry
      if (i === retries - 1) throw err;
      await new Promise(res => setTimeout(res, delay));
    }
  }
}

class Observer extends EventEmitter {
  constructor () {
    super();
  }

  /**
   * Simplified helper that wraps reading + emitting for alerts.json etc.
   */
  async processJsonFile (filePath, eventType, eventName) {
    try {
      const fileContent = await safeJsonRead(filePath);
      const split = filePath.split(sep);
      const sampleName = split[split.length - 2];
      const runName = split[split.length - 4];

      this.emit(eventName, {
        id: sampleName,
        runId: runName,
        content: fileContent
      });

      console.log(`[${new Date().toLocaleString()}] ${filePath} has been ${eventType.toUpperCase()}.`);
    } catch (error) {
      console.error(`[ERROR] Failed to process ${filePath}:`, error.message);
    }
  }

  watchFolder (folder) {
    try {
      // ----- Determine glob patterns --------------------------------------------------
      if (!folder.endsWith(path.sep)) folder += path.sep;

      let filesToWatch;
      let idFilesToWatch;

      if (fsExtra.existsSync(folder + 'marti')) {
        console.log(`[${new Date().toLocaleString()}] WARNING: An individual run directory has been specified.`);
        filesToWatch   = folder + 'marti/**/*.json';
        idFilesToWatch = folder + 'ids.json';
      } else {
        filesToWatch   = folder + '*/marti/**/*.json';
        idFilesToWatch = folder + '*/ids.json';
      }

      console.log(`[${new Date().toLocaleString()}] Monitoring MARTi run directories in: ${folder}`);

      // ----- Main watcher -------------------------------------------------------------
      const watcher = chokidar.watch(filesToWatch, {
        persistent       : true,
        usePolling       : true,
        atomic           : true,
        awaitWriteFinish : { stabilityThreshold: 1000, pollInterval: 5000 }
      });

      // --------------- ADD ------------------------------------------------------------
      watcher.on('add', async filePath => {
        try {
          if (filePath.endsWith('sample.json')) {
            const fileContent = await safeJsonRead(filePath);
            const split       = filePath.split(sep);
            const dir         = split.slice(0, -4).join('/');
            const sampleName  = split[split.length - 2];
            const runId       = split[split.length - 4];

            fileContent.sample.dir      = dir;
            fileContent.sample.pathName = sampleName;
            fileContent.sample.pathRun  = runId;

            this.emit('meta-file-added', { id: sampleName, runId, content: fileContent });
          } else if (filePath.includes('tree_ms')) {
            const treeData   = await safeJsonRead(filePath);
            const split      = filePath.split(sep);
            const sampleName = split[split.length - 2];
            const runName    = split[split.length - 4];
            const lca        = 'lca_' + filePath.split('tree_ms')[1].split('.json')[0];

            this.emit('tree-file-added', { id: sampleName, runName, lca, content: treeData });
          } else if (filePath.includes('accumulation_')) {
            const raw        = await safeJsonRead(filePath);
            const split      = filePath.split(sep);
            const sampleName = split[split.length - 2];
            const runName    = split[split.length - 4];
            const lca        = 'lca_' + filePath.split('accumulation_ms')[1].split('.json')[0];

            this.emit('accumulation-file-added', {
              id: sampleName,
              runName,
              lca,
              content: raw.accumulation
            });
          } else if (filePath.endsWith('amr.json')) {
            let fileContent = await safeJsonRead(filePath);
            const split      = filePath.split(sep);
            const sampleName = split[split.length - 2];
            const runName    = split[split.length - 4];
            const amrData    = fileContent.hasOwnProperty('amr') ? fileContent.amr : fileContent;

            this.emit('amr-file-added', { id: sampleName, runName, content: amrData });
          } else if (filePath.endsWith('metadata.json')) {
            const fileContent = await safeJsonRead(filePath);
            const split       = filePath.split(sep);
            const sampleName  = split[split.length - 2];
            const runName     = split[split.length - 4];

            this.emit('metadata-file-added', { id: sampleName, runId: runName, content: fileContent });
          } else if (filePath.endsWith('alerts.json')) {
            await this.processJsonFile(filePath, 'added', 'alerts-file-added');
          }

          console.log(`[${new Date().toLocaleString()}] ${filePath} has been ADDED.`);
        } catch (err) {
          console.error(`[ADD ERROR] ${filePath}:`, err.message);
        }
      });

      // --------------- CHANGE ---------------------------------------------------------
      watcher.on('change', async filePath => {
        try {
          if (filePath.endsWith('sample.json')) {
            const fileContent = await safeJsonRead(filePath);
            const split       = filePath.split(sep);
            const dir         = split.slice(0, -4).join('/');
            const sampleName  = split[split.length - 2];
            const runId       = split[split.length - 4];

            fileContent.sample.dir      = dir;
            fileContent.sample.pathName = sampleName;
            fileContent.sample.pathRun  = runId;

            this.emit('meta-file-updated', { id: sampleName, runId, content: fileContent });
          } else if (filePath.includes('tree_ms')) {
            const treeData   = await safeJsonRead(filePath);
            const split      = filePath.split(sep);
            const sampleName = split[split.length - 2];
            const runName    = split[split.length - 4];
            const lca        = 'lca_' + filePath.split('tree_ms')[1].split('.json')[0];

            this.emit('tree-file-updated', { id: sampleName, runName, lca, content: treeData });
          } else if (filePath.includes('accumulation_')) {
            const raw        = await safeJsonRead(filePath);
            const split      = filePath.split(sep);
            const sampleName = split[split.length - 2];
            const runName    = split[split.length - 4];
            const lca        = 'lca_' + filePath.split('accumulation_ms')[1].split('.json')[0];

            this.emit('accumulation-file-updated', {
              id: sampleName,
              runName,
              lca,
              content: raw.accumulation
            });
          } else if (filePath.endsWith('amr.json')) {
            let fileContent = await safeJsonRead(filePath);
            const split      = filePath.split(sep);
            const sampleName = split[split.length - 2];
            const runName    = split[split.length - 4];
            const amrData    = fileContent.hasOwnProperty('amr') ? fileContent.amr : fileContent;

            this.emit('amr-file-updated', { id: sampleName, runName, content: amrData });
          } else if (filePath.endsWith('metadata.json')) {
            const fileContent = await safeJsonRead(filePath);
            const split       = filePath.split(sep);
            const sampleName  = split[split.length - 2];
            const runName     = split[split.length - 4];

            this.emit('metadata-file-added', { id: sampleName, runId: runName, content: fileContent });
          } else if (filePath.endsWith('alerts.json')) {
            await this.processJsonFile(filePath, 'changed', 'alerts-file-added');
          }

          console.log(`[${new Date().toLocaleString()}] ${filePath} has been CHANGED.`);
        } catch (err) {
          console.error(`[CHANGE ERROR] ${filePath}:`, err.message);
        }
      });

      // --------------- UNLINK ---------------------------------------------------------
      watcher.on('unlink', async filePath => {
        if (!filePath.endsWith('sample.json')) return;

        const split      = filePath.split(sep);
        const sampleName = split[split.length - 2];
        const runName    = split[split.length - 4];

        if (fsExtra.existsSync(filePath)) {
          console.log(`[${new Date().toLocaleString()}] ${filePath} still exists. Network delay.`);
          return;
        }

        console.log(`[${new Date().toLocaleString()}] ${filePath} has been REMOVED.`);
        this.emit('meta-file-removed', { id: sampleName, runName, content: filePath });
      });

      // ----- ids.json watcher ---------------------------------------------------------
      const idFileWatcher = chokidar.watch(idFilesToWatch, {
        persistent       : true,
        usePolling       : true,
        atomic           : true,
        awaitWriteFinish : { stabilityThreshold: 1000, pollInterval: 5000 }
      });

      idFileWatcher.on('add', async filePath => {
        try {
          const idFileContent = await safeJsonRead(filePath);
          const split         = filePath.split(sep);
          const runId         = split[split.length - 2];

          this.emit('id-file-added', { runId, content: idFileContent });
          console.log(`[${new Date().toLocaleString()}] ${filePath} has been ADDED.`);
        } catch (err) {
          console.error(`[ID ADD ERROR] ${filePath}:`, err.message);
        }
      });

      idFileWatcher.on('change', async filePath => {
        try {
          const idFileContent = await safeJsonRead(filePath);
          const split         = filePath.split(sep);
          const runId         = split[split.length - 2];

          this.emit('id-file-added', { runId, content: idFileContent });
          console.log(`[${new Date().toLocaleString()}] ${filePath} has been CHANGED.`);
        } catch (err) {
          console.error(`[ID CHANGE ERROR] ${filePath}:`, err.message);
        }
      });

      idFileWatcher.on('unlink', async filePath => {
        const split  = filePath.split(sep);
        const runId  = split[split.length - 2];

        console.log(`[${new Date().toLocaleString()}] ${filePath} has been REMOVED.`);
        this.emit('id-file-removed', { runId });
      });
    } catch (err) {
      console.error(`[WATCH ERROR]`, err.message);
    }
  }
}

module.exports = Observer;
