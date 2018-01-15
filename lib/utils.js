/**
 * Created by ahurst on 17/05/2016.
 */
"use strict";
const request = require("request");
const crypto  = require("crypto");
const fs      = require('fs');
const path    = require('path');
const queue   = require("queue-async");
const mkdirp  = require('mkdirp');
const _       = require("lodash");
let utils = {};

const targetBatchSize = 4000;

utils._sign = function (req, options) {
    // common headers required for everything
    if(!req.headers) {
        req.headers = {};
    }

    if(!options) {
        options = {};
    }

    req.headers['X-EPI2ME-Client']  = options.user_agent;           // new world order
    req.headers['X-EPI2ME-Version'] = options.agent_version || '0'; // new world order
    req.headers['X-EPI2ME-ApiKey']  = options.apikey;               // better than a logged CGI parameter

    if(!options.apisecret) {
        return;
    }

    // timestamp mitigates replay attack outside a tolerance window determined by the server
    req.headers["X-EPI2ME-SignatureDate"] = (new Date()).toISOString();

    var message = [req.uri,

                   Object.keys(req.headers)
                   .sort()
                   .map(function(o) {
                       return o+":"+req.headers[o];
                   })
                   .join("\n")

                  ].join("\n");

    let digest  = crypto.createHmac('sha1', options.apisecret).update(message).digest('hex');
    req.headers["X-EPI2ME-SignatureV0"] = digest;
}

utils._get = function (uri, options, cb) {
    // do something to get/set data in metrichor
    var call, req,
        srv = options.url;

    uri  = "/" + uri + ".js";
    srv  = srv.replace(/\/+$/, "");  // clip trailing slashes
    uri  = uri.replace(/\/+/g, "/"); // clip multiple slashes
    call = srv + uri;
    req  = { uri: call };

    this._sign(req, options);

    if (options.proxy) {
        req.proxy = options.proxy;
    }

    request.get(req,
        function (res_e, r, body) {
            utils._responsehandler(res_e, r, body, cb);
        }
    );
};

utils._post = function (uri, id, obj, options, cb) {
    var srv, call, req, form = {};

    if (obj !== undefined) {
        form.json = JSON.stringify(obj); // fwiw portal > 2.47.1-538664 shouldn't require this as a named parameter any more
    }

    /* if id is an object, merge it into form post parameters */
    if (id && typeof id === 'object') {
        Object.keys(id).forEach(function (attr) {
            form[attr] = id[attr];
        });

        id = "";
    }

    srv  = options.url;
    srv  = srv.replace(/\/+$/, "");  // clip trailing slashes
    uri  = uri.replace(/\/+/g, "/"); // clip multiple slashes
    call = srv + '/' + uri + (id ? "/"+id : "") + ".js";
    req  = {
        uri:  call,
        form: form
    };

    if(!obj || obj._signing !== false) {
        this._sign(req, options);
    }

    if (options.proxy) {
        req.proxy = options.proxy;
    }

    request.post(req,
        function (res_e, r, body) {
            utils._responsehandler(res_e, r, body, cb);
        }
    );
};

utils._put = function (uri, id, obj, options, cb) {
    /* three-arg _put call (no parameters) */
    if (typeof obj === 'function') {
        cb = obj;
    }

    var srv, call, req,
        form = {
            json: JSON.stringify(obj)
        };

    srv  = options.url;
    srv  = srv.replace(/\/+$/, "");  // clip trailing slashes
    uri  = uri.replace(/\/+/g, "/"); // clip multiple slashes
    call = srv + '/' + uri + '/' + id + '.js';
    req  = {
        uri:  call,
        form: form
    };

    this._sign(req, options);

    if (options.proxy) {
        req.proxy = options.proxy;
    }

    request.put(req,
        function (res_e, r, body) {
            utils._responsehandler(res_e, r, body, cb);
        }
    );
};

utils._responsehandler = function (res_e, r, body, cb) {
    var json, msg;

    if (!cb) {
        throw new Error("callback must be specified");
    }

    if (res_e) {
        return cb(res_e, {});
    }

    if (r && r.statusCode >= 400) {
        msg = "Network error " + r.statusCode;

        try {
            json = JSON.parse(body);
            if (json.error) {
                msg = json.error;
            }
        } catch (jsn_e) {
            // ignore
        }

        if (r.statusCode === 504) {
            // always override 504 with something custom
            msg = "Please check your network connection and try again.";
        }

        return cb({"error": msg});
    }

    try {
        json = JSON.parse(body);

    } catch (jsn_e) {
        if (cb) {
            return cb(jsn_e, {});
        }
        return;
    }

    if (json.error) {
        return cb({"error": json.error}, {});
    }

    return cb(null, json);
};

utils.chunk = function chunk(files, desiredChunkLength) {
    /** split array into into chunks of size len */
    let chunks = []
    let i = 0
    let n = files.length

    while (i < n) {
        chunks.push(files.slice(i, i += desiredChunkLength));
    }

    return chunks;
};

utils.countFileReads = function (filePath) {
    return new Promise((resolve, reject) => {
        const LINES_PER_READ = 4;
        let lineCount = 1;
        let idx;
        fs.createReadStream(filePath)
            .on("data", (buffer) => {
                idx = -1;
                lineCount--;
                do {
                    idx = buffer.indexOf(10, idx + 1);
                    lineCount++;
                } while (idx !== -1);
            })
            .on("end", () => resolve(Math.floor(lineCount / LINES_PER_READ)))
            .on("error", reject);
    });
};

utils.getFileSize = (filename) => {
    return new Promise((resolve, reject) => {
        fs.stat(filename, (err, stats) => {
            if (err) {
                reject("failed to fs.stat file: " + err);
            } else if (stats) {
                resolve(stats.size || 0);
            }
        });
    });
};

// this isn't good... wtf:
// make async!
utils.findSuitableBatchIn = function (folder) {
    // For downloads without the folder split
    // Look inside `folder` and return any batch with a free slot.
    // if no suitable batches, create one and return that.
    mkdirp.sync(folder);
    const prefix = 'batch_'
    const createBatch = () => {
        const batchName = `${prefix}${Date.now()}`
        const newBatchPath = path.join(folder, batchName)
        mkdirp.sync(newBatchPath)
        return newBatchPath
    }
    let batches = fs.readdirSync(folder).filter(d => d.slice(0, prefix.length) === prefix)

    if (!batches || !batches.length) return createBatch()
    const latestBatch = path.join(folder, batches.pop())
    if (fs.readdirSync(latestBatch).length < targetBatchSize) {
        return latestBatch
    }
    return createBatch()
};

let ID_counter = 0;
utils.getFileID = () => `FILE_${++ID_counter}`;

utils.lsFolder = function (dir, ignore, filetype, rootDir = '') {
    return new Promise((onSuccess, onError) => {
        fs.readdir(dir, (err, ls) => {
            if (err) {
                if (err.Error && err.Error.match(/ENOENT/)) {
                    console.error(err.Error); // eslint-disable-line no-console
                }
                onError(err);

            } else {

                if (ignore) {
                    ls = ls.filter(ignore);
                }

                let folders    = [];
                let files      = [];
                let fileSizeQ  = queue(10);

                ls.forEach(entry => {
                    fileSizeQ.defer(done => {
                        fs.stat(path.join(dir, entry), (err, stats) => {
                            if (!err && stats) {
                                if (stats.isFile() && (!filetype || path.extname(entry) === filetype)) {
                                    /** For each file, construct a file object: */
                                    let parsed = path.parse(entry);

                                    let fileObject = {
                                        name: parsed.base,
                                        path: path.join(dir, entry),
                                        size: stats.size,
                                        id: utils.getFileID()
                                    };

                                    let batch = dir.replace(rootDir, '').replace("\\", "").replace("/","");
                                    if (_.isString(batch) && batch.length) fileObject.batch = batch;
                                    files.push(fileObject)

                                } else if (stats.isDirectory()) {
                                    folders.push(path.join(dir, entry));
                                }
                            }
                            done();
                        });
                    });
                });

                fileSizeQ.awaitAll(() => {
                    folders = folders.sort();
                    /**
                     * // It's important to load the batch folders alphabetically
                     * 1, then 2, ect.
                     */
                    onSuccess({ files, folders })
                });
            }
        });
    });
};


utils.loadInputFiles = function ({inputFolder, outputFolder, uploadedFolder, filetype}, uploaded = []) {
    /**
     * Entry point for new .fast5 / .fastq files.
     *  - Scan the input folder files
     *      fs.readdir is resource-intensive if there are a large number of files
     *      It should only be triggered when needed
     *  - Push list of new files into uploadWorkerPool (that.enqueueFiles)
     */

    return new Promise((onSuccess, onError) => {

        // function used to filter the readdir results in utils.lsFolder
        // exclude all files and folders meet any of these criteria:
        const inputFilter = (file) => {
            return !(
                path.basename(file) === "downloads" ||
                path.basename(file) === "uploaded" ||
                path.basename(file) === "skip" ||
                path.basename(file) === "fail" ||
                uploadedFolder && path.basename(file) === path.basename(uploadedFolder) ||
                outputFolder && path.basename(file) === path.basename(outputFolder) ||
                path.basename(file) === "tmp" ||
                (_.isArray(uploaded) && uploaded.indexOf(path.posix.basename(file)) > -1));
        };

        // iterate through folders
        let batchFolders = [ inputFolder ];

        const next = () => {
            if (!batchFolders || !batchFolders.length) return;
            utils.lsFolder(batchFolders.splice(0, 1)[0], inputFilter, filetype, inputFolder)
                .then(({ files, folders }) => {
                    // Keep iterating though batch folders until one with files is found
                    if (files && files.length) {
                        onSuccess(files); // Done. Resolve promise with new files
                    } else {
                        batchFolders = [ ...folders, ...batchFolders ];
                        if (batchFolders.length) {
                            next(); // iterate
                        } else {
                            onSuccess(); // Done. No new files were found
                        }
                    }
                })
                .catch(err => {
                    onError('Failed to check for new files: ' + err.message);
                });
        };

        next(); // start first iteration
    });
};

module.exports = utils;
module.exports.version = '2.50.1';
