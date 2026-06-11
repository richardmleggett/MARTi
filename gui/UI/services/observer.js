const chokidar = require('chokidar');
const EventEmitter = require('events').EventEmitter;
const fsExtra = require('fs-extra');
const path = require('path');
const sep = path.sep;
const flatSampleNameCache = new Map();

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

function hasMartiSegment (filePath) {
  return filePath.split(sep).includes('marti');
}

function getMartiLayoutInfo (filePath) {
  const split = filePath.split(sep);
  const martiIndex = split.lastIndexOf('marti');
  const runName = split[martiIndex - 1];
  const sampleName = split[martiIndex + 1];
  const baseDir = split.slice(0, martiIndex - 1).join(sep);
  return { runName, sampleName, baseDir };
}

async function getFlatLayoutInfo (filePath) {
  const runDir = path.dirname(filePath);
  const runName = path.basename(runDir);
  let sampleName = flatSampleNameCache.get(runName) || runName;

  if (!flatSampleNameCache.has(runName)) {
    try {
      const sampleJson = await safeJsonRead(path.join(runDir, 'sample.json'));
      if (sampleJson && sampleJson.sample && sampleJson.sample.id) {
        sampleName = sampleJson.sample.id;
        flatSampleNameCache.set(runName, sampleName);
      }
    } catch (err) {
      // Ignore missing/invalid sample.json and fall back to run name
    }
  }

  const baseDir = path.dirname(runDir);
  return { runName, sampleName, baseDir };
}

async function getRunSampleInfo (filePath) {
  if (hasMartiSegment(filePath)) {
    return getMartiLayoutInfo(filePath);
  }
  return await getFlatLayoutInfo(filePath);
}

async function emitAssociatedFiles (sampleJsonPath, isUpdate) {
  const sampleDir = path.dirname(sampleJsonPath);
  let files = [];

  try {
    files = await fsExtra.readdir(sampleDir);
  } catch (err) {
    return;
  }

  const { sampleName, runName } = await getRunSampleInfo(sampleJsonPath);
  const eventPrefix = isUpdate ? 'updated' : 'added';

  for (const name of files) {
    const fullPath = path.join(sampleDir, name);

    if (name.startsWith('tree_ms') && name.endsWith('.json')) {
      try {
        const treeData = await safeJsonRead(fullPath);
        const lca = 'lca_' + name.split('tree_ms')[1].split('.json')[0];
        this.emit(`tree-file-${eventPrefix}`, { id: sampleName, runName, lca, content: treeData });
      } catch (err) {
        console.error(`[TREE ${eventPrefix.toUpperCase()} ERROR] ${fullPath}:`, err.message);
      }
    } else if (name.startsWith('accumulation_ms') && name.endsWith('.json')) {
      try {
        const raw = await safeJsonRead(fullPath);
        const lca = 'lca_' + name.split('accumulation_ms')[1].split('.json')[0];
        this.emit(`accumulation-file-${eventPrefix}`, {
          id: sampleName,
          runName,
          lca,
          content: raw.accumulation
        });
      } catch (err) {
        console.error(`[ACCUMULATION ${eventPrefix.toUpperCase()} ERROR] ${fullPath}:`, err.message);
      }
    } else if (name === 'amr.json') {
      try {
        const fileContent = await safeJsonRead(fullPath);
        const amrData = fileContent.hasOwnProperty('amr') ? fileContent.amr : fileContent;
        this.emit(`amr-file-${eventPrefix}`, { id: sampleName, runName, content: amrData });
      } catch (err) {
        console.error(`[AMR ${eventPrefix.toUpperCase()} ERROR] ${fullPath}:`, err.message);
      }
    } else if (name === 'metadata.json') {
      try {
        const fileContent = await safeJsonRead(fullPath);
        this.emit('metadata-file-added', { id: sampleName, runId: runName, content: fileContent });
      } catch (err) {
        console.error(`[METADATA ${eventPrefix.toUpperCase()} ERROR] ${fullPath}:`, err.message);
      }
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
      const { sampleName, runName } = await getRunSampleInfo(filePath);

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
      let alertsFilesToWatch;

      const hasTopLevelMarti = fsExtra.existsSync(folder + 'marti');
      const hasSampleJsonHere = fsExtra.existsSync(path.join(folder, 'sample.json'));
      let hasChildSampleJson = false;

      try {
        const entries = fsExtra.readdirSync(folder, { withFileTypes: true });
        hasChildSampleJson = entries.some(entry =>
          entry.isDirectory() && fsExtra.existsSync(path.join(folder, entry.name, 'sample.json'))
        );
      } catch (err) {
        hasChildSampleJson = false;
      }

      if (hasTopLevelMarti) {
        console.log(`[${new Date().toLocaleString()}] WARNING: An individual run directory has been specified.`);
        filesToWatch   = folder + 'marti/**/sample.json';
        idFilesToWatch = folder + 'ids.json';
        alertsFilesToWatch = folder + 'marti/**/alerts.json';
      } else if (hasSampleJsonHere) {
        filesToWatch   = folder + 'sample.json';
        idFilesToWatch = folder + 'ids.json';
        alertsFilesToWatch = folder + 'alerts.json';
      } else if (hasChildSampleJson) {
        filesToWatch   = [
          folder + '*/sample.json',
          folder + '*/marti/**/sample.json'
        ];
        idFilesToWatch = folder + '*/ids.json';
        alertsFilesToWatch = [
          folder + '*/alerts.json',
          folder + '*/marti/**/alerts.json'
        ];
      } else {
        filesToWatch   = folder + '*/marti/**/sample.json';
        idFilesToWatch = folder + '*/ids.json';
        alertsFilesToWatch = folder + '*/marti/**/alerts.json';
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
            let dir;
            let sampleName;
            let runId;

            if (hasMartiSegment(filePath)) {
              const split = filePath.split(sep);
              dir = split.slice(0, -4).join(sep);
              sampleName = split[split.length - 2];
              runId = split[split.length - 4];
            } else {
              const runDir = path.dirname(filePath);
              dir = path.dirname(runDir);
              runId = path.basename(runDir);
              sampleName = (fileContent.sample && fileContent.sample.id) ? fileContent.sample.id : runId;
              flatSampleNameCache.set(runId, sampleName);
            }

            fileContent.sample.dir      = dir;
            fileContent.sample.pathName = sampleName;
            fileContent.sample.pathRun  = runId;

            this.emit('meta-file-added', { id: sampleName, runId, content: fileContent });
            await emitAssociatedFiles.call(this, filePath, false);
          } else if (filePath.includes('tree_ms')) {
            // no-op (tree files are emitted when sample.json changes)
          } else if (filePath.includes('accumulation_')) {
            // no-op (accumulation files are emitted when sample.json changes)
          } else if (filePath.endsWith('amr.json')) {
            // no-op (amr files are emitted when sample.json changes)
          } else if (filePath.endsWith('metadata.json')) {
            // no-op (metadata files are emitted when sample.json changes)
          } else if (filePath.endsWith('alerts.json')) {
            // alerts handled by dedicated watcher below
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
            let dir;
            let sampleName;
            let runId;

            if (hasMartiSegment(filePath)) {
              const split = filePath.split(sep);
              dir = split.slice(0, -4).join(sep);
              sampleName = split[split.length - 2];
              runId = split[split.length - 4];
            } else {
              const runDir = path.dirname(filePath);
              dir = path.dirname(runDir);
              runId = path.basename(runDir);
              sampleName = (fileContent.sample && fileContent.sample.id) ? fileContent.sample.id : runId;
              flatSampleNameCache.set(runId, sampleName);
            }

            fileContent.sample.dir      = dir;
            fileContent.sample.pathName = sampleName;
            fileContent.sample.pathRun  = runId;

            this.emit('meta-file-updated', { id: sampleName, runId, content: fileContent });
            await emitAssociatedFiles.call(this, filePath, true);
          } else if (filePath.includes('tree_ms')) {
            // no-op (tree files are emitted when sample.json changes)
          } else if (filePath.includes('accumulation_')) {
            // no-op (accumulation files are emitted when sample.json changes)
          } else if (filePath.endsWith('amr.json')) {
            // no-op (amr files are emitted when sample.json changes)
          } else if (filePath.endsWith('metadata.json')) {
            // no-op (metadata files are emitted when sample.json changes)
          } else if (filePath.endsWith('alerts.json')) {
            // alerts handled by dedicated watcher below
          }

          console.log(`[${new Date().toLocaleString()}] ${filePath} has been CHANGED.`);
        } catch (err) {
          console.error(`[CHANGE ERROR] ${filePath}:`, err.message);
        }
      });

      // --------------- UNLINK ---------------------------------------------------------
      watcher.on('unlink', async filePath => {
        if (!filePath.endsWith('sample.json')) return;

        const { sampleName, runName } = await getRunSampleInfo(filePath);

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

      // ----- alerts.json watcher (only if sample.json exists) -------------------------
      const alertsWatcher = chokidar.watch(alertsFilesToWatch, {
        persistent       : true,
        usePolling       : true,
        atomic           : true,
        awaitWriteFinish : { stabilityThreshold: 1000, pollInterval: 5000 }
      });

      const shouldProcessAlert = filePath => {
        const sampleJsonPath = path.join(path.dirname(filePath), 'sample.json');
        return fsExtra.existsSync(sampleJsonPath);
      };

      alertsWatcher.on('add', async filePath => {
        if (!shouldProcessAlert(filePath)) return;
        await this.processJsonFile(filePath, 'added', 'alerts-file-added');
      });

      alertsWatcher.on('change', async filePath => {
        if (!shouldProcessAlert(filePath)) return;
        await this.processJsonFile(filePath, 'changed', 'alerts-file-added');
      });
    } catch (err) {
      console.error(`[WATCH ERROR]`, err.message);
    }
  }
}

module.exports = Observer;
