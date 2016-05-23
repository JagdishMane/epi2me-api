// Author:        rpettett
// Last Maintained: $Author$
// Last Modified: $Date$
// Id:            $Id$
// $HeadURL$
// $LastChangedRevision$
// $Revision$

/*jslint nomen: true, stupid: true */ // stupid required for cached statSync in readdir
/*global require, module, $, metrichor, Promise, const */

"use strict";
var AWS, queue, fs, path, os, mkdirp, proxy, _config, underscore, utils, request;

try {
    if ($) { // typeof $ !== 'undefined'
        // JQUERY MODE. Only Web API requests are supported (i.e. no data transfers)
        var jqWrap = function (method, params, cb) {
            /*jslint unparam: true*/
            $.ajax({
                url:     params.uri,
                type:    method,
                success: function (data,  status, jqXHR) { cb(null,   data, jqXHR.responseText); },
                error:   function (jqXHR, status, errStr) { cb(errStr, null, jqXHR.responseText); }, /* better do something sensible with this! */
                data:    params.form,
                dataType: "json"
            });
        };

        request = {
            put:  function (params, cb) { return jqWrap('PUT',  params, cb); },
            get:  function (params, cb) { return jqWrap('GET',  params, cb); },
            post: function (params, cb) { return jqWrap('POST', params, cb); }
        };
    }

} catch (exception) {
    // NODEJS MODE
    utils = require("./utils");
    underscore = require("underscore");
    AWS     = require("aws-sdk");
    fs      = require("graceful-fs"); /* MC-565 handle EMFILE gracefully */
    os      = require("os");
    queue   = require("queue-async");
    path    = require("path");
    mkdirp  = require("mkdirp");
    proxy   = require("proxy-agent");

    module.exports         = metrichor;
    module.exports.version = '2.40.1';
}

function metrichor(opt_string) {

    /* Constructor for Metrichor API object */

    var opts, logfunc;
    if (typeof opt_string === 'string' || (typeof opt_string === "object" && opt_string.constructor === String)) {
        opts = JSON.parse(opt_string);
    } else {
        opts = opt_string || {};
    }

    if (opts.log) {
        if (typeof opts.log.info === 'function' && typeof opts.log.warn === 'function' && typeof opts.log.error === 'function') {
            this.log = opts.log;
        } else {
            throw new Error('expected log object to have "error", "info" and "warn" methods');
        }
    }

    // Default log method
    if (!this.log) {
        logfunc = function (str) { console.log("[" + (new Date()).toISOString() + "] " + str); };
        this.log = {
            info:  logfunc,
            warn:  logfunc,
            error: logfunc
        };
    }

    // Container for Metrichor API configuration
    _config = {
        options: {
            agent_version          : opts.agent_version,
            agent_address          : opts.agent_address,                    // Geo location and ip
            apikey                 : opts.apikey,
            proxy                  : opts.proxy,
            url                    : opts.url || 'https://metrichor.com',
            user_agent             : opts.user_agent || 'Metrichor API',

            /* below are the consolidated harness options for 0.7.0+ */
            retention              : "on",
            telemetryCb            : opts.telemetryCb,
            dataCb                 : opts.dataCb,
            sessionGrace           : 5,
            remoteShutdownCb       : opts.remoteShutdownCb,                 // callback for remote shutdown of

             /* upload settings */
            inputFolder            : opts.inputFolder,
            inputFormat            : opts.inputFormat || 'fast5',
            sortInputFiles         : opts.sortInputFiles || false,          // MC-2535 - sort files to be uploaded
            uploadPoolSize         : 2,                                     // Parallelism of upload queue
            uploadTimeout          : 300,                                   // upload stream timeout after 300s
            uploadBatchSize        : opts.uploadBatchSize || 500,           // Size of each batch upload
            fileCheckInterval      : opts.fileCheckInterval    || 15,       // Seconds between loadUploadFiles()
            downloadCheckInterval  : 3,                                     // Seconds between loadAvailableMessages()
            stateCheckInterval     : 60,                                    // Seconds between instance state is checked in metrichor
            initDelay              : opts.initDelay || 10000,               // Seconds between loadAvailableMessages()

            /* download settings */
            outputFolder           : opts.outputFolder,
            uploadedFolder         : opts.uploadedFolder,                   // folder where files are placed once uploaded
            inFlightDelay          : opts.inFlightDelay    || 600,          // wait 5 mins before resub
            waitTimeSeconds        : opts.waitTimeSeconds  || 20,           // long-poll wait 20 seconds for messages
            waitTokenError         : opts.waitTokenError   || 30,           // wait 30 seconds if token fetch threw an error
            downloadTimeout        : opts.downloadTimeout  || 300,          // download stream timeout after 300s
            downloadPoolSize       : opts.downloadPoolSize || 3,            // MC-505 how many things to download at once
            filter                 : opts.filter           || "on",
            filterByChannel        : opts.filterByChannel  || "off",        // MC-508 filter downloads by channel
            downloadMode           : opts.downloadMode     || "data+telemetry",
            deleteOnComplete       : opts.deleteOnComplete || "off"         // MC-212
        }
    };

    this.resetStats();
    this.resetInstance({
        id_workflow_instance   : opts.id_workflow_instance,
        region                 : opts.region
    });

    return this;
}

metrichor.prototype = {

    url : function () {
        return _config.options.url;
    },

    apikey : function () {
        return _config.options.apikey;
    },

    attr : function (key, value) {

        if (_config.options.hasOwnProperty(key)) {
            if (value) {
                _config.options[key] = value;
            } else {
                return _config.options[key];
            }
        } else {
            throw new Error("config object does not contain property " + key);
        }
        return this;
    },

    resetInstance : function (options) {
        options = options || {};

        /* Container for workflow instance configuration. */
        _config.instance = {
            inputQueueName         : null,
            inputQueueURL          : null,
            outputQueueName        : null,
            outputQueueURL         : null,
            _discoverQueueCache    : {},
            id_workflow_instance   : options.id_workflow_instance || null,
            bucket                 : null,
            bucketFolder           : null,
            remote_addr            : null,
            chain                  : null,
            awssettings: {
                region: options.region || "eu-west-1"
            }
        };
    },

    stats: function (key) {
        if (this._stats[key]) {
            this._stats[key].queueLength = isNaN(this._stats[key].queueLength) ? 0 : this._stats[key].queueLength; // a little housekeeping
            // 'total' is the most up-to-date measure of the total number of reads to be uploaded
            if (key === "upload") {
                this._stats.upload.total = this._uploadedFiles.length + this._stats.upload.enqueued +  this._stats.upload.success;
            }
        }
        return this._stats[key];
    },

    user : function (cb) {
        return utils._get('user', _config.options, cb);
    },

    workflows : function (cb) {
        return this._list('workflow', cb);
    },

    workflow : function (id, obj, cb) {

        if (!cb) {
            // two args: get object
            cb = obj;
            return this._read('workflow', id, cb);
        }

        // three args: update object
        return utils._post('workflow', id, obj, _config.options, cb);
    },

    _list : function (entity, cb) {
        return utils._get(entity, _config.options, function (e, json) {
            if (cb) {
                cb(e, json[entity + "s"]);
            }
        });
    },

    _read : function (entity, id, cb) {
        return utils._get(entity + '/' + id, _config.options, cb);
    },

    start_workflow : function (config, cb) {
        return utils._post('workflow_instance', null, config, _config.options, cb);
    },

    stop_workflow : function (instance_id, cb) {
        return utils._put('workflow_instance/stop', instance_id, null, _config.options, cb);
    },

    workflow_instances : function (cb) {
        return this._list('workflow_instance', cb);
    },

    workflow_instance : function (id, cb) {
        return this._read('workflow_instance', id, cb);
    },

    workflow_config : function (id, cb) {
        return utils._get('workflow/config/' + id, _config.options, cb);
    },

    token : function (id, cb) { /* should this be passed a hint at what the token is for? */
        return utils._post('token', {id_workflow_instance: id || _config.instance.id_workflow_instance}, null, _config.options, cb);
    },

    resetStats: function () {

        this._stats = {
            upload:   {
                success: 0,
                failure: {},
                queueLength: 0,
                enqueued: 0,
                totalSize: 0
            },
            download: {
                success: 0,
                fail: 0,
                failure: {},
                queueLength: 0,
                totalSize: 0
            }
        };
    },

    stop_everything: function (cb) {
        var that = this;

        that.log.info("stopping watchers");

        // should probably use another quick queue-async here

        if (_config.instance.id_workflow_instance) {
            that.stop_workflow(_config.instance.id_workflow_instance, function () {
                that.log.info("app instance " + _config.instance.id_workflow_instance + " stopped");
            });
        }

        if (that._downloadCheckInterval) {
            that.log.info("clearing _downloadCheckInterval interval");
            clearInterval(that._downloadCheckInterval);
            that._downloadCheckInterval = null;
        }

        if (that._stateCheckInterval) {
            that.log.info("clearing stateCheckInterval interval");
            clearInterval(that._stateCheckInterval);
            that._stateCheckInterval = null;
        }

        if (that._fileCheckInterval) {
            that.log.info("clearing _fileCheckInterval interval");
            clearInterval(that._fileCheckInterval);
            that._fileCheckInterval = null;
        }

        if (that.uploadWorkerPool) {
            that.log.info("clearing uploadWorkerPool");
            that.uploadWorkerPool.drain();
            that.uploadWorkerPool = null;
        }

        if (that.downloadWorkerPool) {
            that.log.info("clearing downloadWorkerPool");
            that.downloadWorkerPool.drain();
            that.downloadWorkerPool = null;
        }

        if (cb) {
            cb();
        }
    },

    session: function () {
        var that = this;

        /* MC-1848 all session requests are serialised through that.sessionQueue to avoid multiple overlapping requests */
        if (!that.sessionQueue) {
            that.sessionQueue = queue(1);
        }

        if (!that._stats.sts_expiration ||
                (that._stats.sts_expiration
                 && that._stats.sts_expiration <= new Date() /* Ignore if session is still valid */
                 && !that.sessionQueue.remaining())) {        /* Throttle to n=1: bail out if there's already a job queued */

            /* queue a request for a new session token and hope it comes back in under _config.options.sessionGrace time */
            that.sessionQueue.defer(function (queueCb) {
                that.fetchInstanceToken(queueCb);           /* free up the sessionQueue slot   */
            });
        }

        /* carry on regardless. These will fail if the session does
         * expire and isn't refreshed in time - could consider
         * delaying them in those cases
         */
    },

    fetchInstanceToken: function (queueCb) {
        var that = this;

        if (!_config.instance.id_workflow_instance) {
            throw new Error("must specify id_workflow_instance");
        }

        if (that._stats.sts_expiration &&
                that._stats.sts_expiration > new Date()) {
            /* escape if session is still valid */
            return queueCb();
        }

        that.log.info("new instance token needed");

        that.token(_config.instance.id_workflow_instance, function (tokenError, token) {
            if (tokenError) {
                that.log.warn("failed to fetch instance token: " + tokenError.error ? tokenError.error : tokenError);
                setTimeout(queueCb, 1000 * _config.options.waitTokenError); /* delay this one 30 secs so we don't hammer the website */
                return;
            }

            that.log.info("allocated new instance token expiring at " + token.expiration);
            that._stats.sts_expiration = new Date(token.expiration); // Date object for expiration check later
            that._stats.sts_expiration.setMinutes(that._stats.sts_expiration.getMinutes() - _config.options.sessionGrace); // refresh token x mins before it expires
            // "classic" token mode no longer supported

            if (_config.options.proxy) {
                AWS.config.update({
                    httpOptions: { agent: proxy(_config.options.proxy, true) }
                });
            }

            AWS.config.update(_config.instance.awssettings);
            AWS.config.update(token);
            return queueCb();
        });
    },

    sessionedS3: function () {
        this.session();
        return new AWS.S3();
    },

    sessionedSQS: function () {
        this.session();
        return new AWS.SQS();
    },

    autoStart: function (workflow_config, cb) {
        var that = this;

        that.resetInstance();
        that.resetStats();

        that.start_workflow(workflow_config, function start_workflowCB(workflowError, instance) {
            if (workflowError) {
                var msg = "Failed to start app: " + (workflowError && workflowError.error ? workflowError.error : workflowError);
                that.log.warn(msg);
                if (cb) {
                    cb(msg);
                }
                return;
            }

            that.autoConfigure(instance, cb);
        });
    },

    autoJoin: function (id, cb) {
        var that = this;
        that.resetInstance({
            id_workflow_instance: id
        });

        that.resetStats();

        that.workflow_instance(id, function workflow_instanceCB(instanceError, instance) {
            if (instanceError) {
                var msg = "Failed to join app instance: " + (instanceError && instanceError.error ? instanceError.error : instanceError);
                that.log.warn(msg);
                if (cb) {
                    cb(msg);
                }
                return;
            }

            if (instance.state === "stopped") {
                that.log.warn("app " + id + " is already stopped");
                if (cb) {
                    cb("could not join app");
                }
                return;
            }

            that.autoConfigure(instance, cb);
        });
    },

    autoConfigure: function (instance, autoStartCb) {
        var i, blocker, telemetryLogPath, fileName,
            that = this;

        /* region
         * id_workflow_instance
         * inputqueue
         * outputqueue
         * bucket
         * remote_addr
         * description (workflow)
         * chain
         */
        _config.instance.id_workflow_instance = instance.id_workflow_instance;
        _config.instance.remote_addr          = instance.remote_addr;
        _config.instance.bucket               = instance.bucket;
        _config.instance.inputQueueName       = instance.inputqueue;
        _config.instance.outputQueueName      = instance.outputqueue;
        _config.instance.awssettings.region   = instance.region;
        _config.instance.bucketFolder         = instance.outputqueue + "/" + instance.id_user + "/" + instance.id_workflow_instance;
        _config.instance.user_defined         = instance.user_defined; // MC-2387 - parameterisation

        if (instance.chain) {
            if (typeof instance.chain === "object") { // already parsed
                _config.instance.chain = instance.chain;
            } else {
                try {
                    _config.instance.chain = JSON.parse(instance.chain);
                } catch (jsonException) {
                    throw new Error("exception parsing chain JSON " + String(jsonException));
                }
            }
        }

        if (!_config.options.inputFolder) {
            throw new Error("must set inputFolder");
        }

        if (!_config.options.outputFolder) {
            throw new Error("must set outputFolder");
        }

        if (!_config.instance.bucketFolder) {
            throw new Error("bucketFolder must be set");
        }

        if (!_config.instance.inputQueueName) {
            throw new Error("inputQueueName must be set");
        }

        if (!_config.instance.outputQueueName) {
            throw new Error("outputQueueName must be set");
        }


        /* early request for a session token */
        that.session();

        mkdirp.sync(_config.options.outputFolder);

        // MC-1828 - include instance id in telemetry file name
        fileName         = (_config.instance.id_workflow_instance) ? "telemetry-" + _config.instance.id_workflow_instance + ".log" : "telemetry.log";
        telemetryLogPath = path.join(_config.options.outputFolder, fileName);

        try {
            that.telemetryLogStream = fs.createWriteStream(telemetryLogPath, { flags: "a" });
            that.log.info("logging telemetry to " + telemetryLogPath);

        } catch (telemetryLogStreamErr) {
            that.log.error("error opening telemetry log stream: " + String(telemetryLogStreamErr));
        }

        // sqs event handler
        that._fileCheckInterval = setInterval(that.loadUploadFiles.bind(that), _config.options.fileCheckInterval * 1000);

        that.inputBatchQueue = queue(1);
        that.log.info("delaying inputBatchQueue slot");
        that.inputBatchQueue.defer(function (cb) {
            setTimeout(function () {
                that.log.info("freeing inputBatchQueue slot");
                cb();
            }, _config.options.initDelay); /* slow connections, e.g. CRP, can take > 5 secs to allocate a STS token */
        });

        that._uploadedFiles = []; // container for files that have been successfully uploaded, but failed to move
        that.loadUploadFiles(); // Trigger once at workflow instance start
        if (autoStartCb) {
            // if you didn't pass autoStart a callback, good luck finding out the instance metadata
            autoStartCb(null, _config.instance);
        }

        // MC-2068 - Don't use an interval.
        //that._downloadCheckInterval = setInterval(that.loadAvailableDownloadMessages.bind(that), _config.options.downloadCheckInterval * 1000);
        //if (!that.downloadWorkerPool) {
        //    that.downloadWorkerPool = queue(_config.options.downloadPoolSize);
        //}
        // MC-1795 - stop app when instance has been stopped remotely
        that._stateCheckInterval = setInterval(function () {
            that.workflow_instance(_config.instance.id_workflow_instance, function _stateCheckCB(instanceError, instance) {
                if (instanceError) {
                    that.log.warn("failed to check instance state: " + (instanceError && instanceError.error ? instanceError.error : instanceError));
                } else {
                    if (instance.state === "stopped") {
                        that.log.warn("instance was stopped remotely at " + instance.stop_date + ". shutting down the app.");
                        that.stop_everything(function () {
                            if (typeof _config.options.remoteShutdownCb === "function") {
                                _config.options.remoteShutdownCb("instance was stopped outside agent at " + instance.stop_date);
                            }
                        });
                    }
                }
            });
        }, _config.options.stateCheckInterval * 1000);
    },

    downloadWork: function (len, cb) {
        var that = this;

        if (!cb) {
            cb = function () { return undefined; };
        }

        if (len === undefined || len === null) {
            return cb();
        }

        that._stats.download.queueLength = len;

        if (len > 0) {
            /* only process downloads if there are downloads to process */
            that.log.info("downloads available: " + len);
            return that.downloadAvailable(cb);
        }

        that.log.info("no downloads available");
        return cb();
    },

    loadAvailableDownloadMessages: function () {
        var that = this;

        if (!that.queueLengthQueue) {
            that.queueLengthQueue = queue(1);
        }

        if (that.queueLengthQueue.remaining() > 0) {
            that.log.info("download already running"); /* don't build up a backlog by queuing another job */
            return;
        }

        that.queueLengthQueue.defer(function (cb) {
            var sqs = that.sessionedSQS();

            function queryQueueLength() {
                that.queueLength(_config.instance.outputQueueURL, function (len) { that.downloadWork(len, cb); });
            }

            if (_config.instance.outputQueueURL) {
                queryQueueLength();
            } else {
                that.discoverQueue(sqs, _config.instance.outputQueueName,
                    function onSuccess(queueURL) {
                        _config.instance.outputQueueURL = queueURL;
                        queryQueueLength();
                    },
                    function onError(err) {
                        that.log.warn("error looking up queue. " + String(err));
                        if (!that._stats.download.failure) {
                            that._stats.download.failure = {};
                        }

                        that._stats.download.failure[err] = that._stats.download.failure[err] ? that._stats.download.failure[err] + 1 : 1;
                        return cb();  // clear queueLengthQueue slot
                    });
            }
        });
    },

    downloadAvailable: function (cb) {
        var that = this,
            sqs = that.sessionedSQS(),
            downloadWorkerPoolRemaining = (that.downloadWorkerPool) ? that.downloadWorkerPool.remaining() : 0;

        if (!cb) {
            cb = function noop() { return undefined; };
        }

        if (downloadWorkerPoolRemaining >= _config.options.downloadPoolSize * 5) { /* ensure downloadPool is limited but fully utilised */
            that.log.info(downloadWorkerPoolRemaining + " downloads already queued");
            return cb();
        }

        that.discoverQueue(sqs, _config.instance.outputQueueName,
            function (queueURL) {
                that.log.info("fetching messages");
                try {
                    sqs.receiveMessage({
                        QueueUrl:            queueURL,
                        VisibilityTimeout:   _config.options.inFlightDelay,    // approximate time taken to pass/fail job before resubbing
                        MaxNumberOfMessages: _config.options.downloadPoolSize, // MC-505 - download multiple threads simultaneously
                        WaitTimeSeconds:     _config.options.waitTimeSeconds   // long-poll

                    }, function (receiveMessageErr, receiveMessageSet) {
                        that.receiveMessages(receiveMessageErr, receiveMessageSet, cb);
                    });

                    } catch (receiveMessageErr) {
                        that.log.error("receiveMessage exception: " + String(receiveMessageErr));
                        return cb();
                    }
                },
                function (reason) {
                    that._stats.download.failure[reason] = that._stats.download.failure[reason] ? that._stats.download.failure[reason] + 1 : 1;
                    return cb();
                });
    },

    loadUploadFiles: function () {

        /**
         * Entry point for new .fast5 files. Triggered on an interval
         *  - Scan the input folder files
         *      fs.readdir is resource-intensive if there are a large number of files
         *      It should only be triggered when needed
         *  - Push list of new files into uploadWorkerPool (that.enqueueFiles)
         */

        var that = this,
            fileExp = new RegExp('\\.' + _config.options.inputFormat + '$'),   // only consider files with the specified extension
            remaining = that.inputBatchQueue ? that.inputBatchQueue.remaining() : 0;

        that.log.info(remaining + ' batches in the inputBatchQueue');

        if (!that._dirScanInProgress && remaining === 0) {
            that._dirScanInProgress = true;
            that.log.info('scanning input folder for new files');

            fs.readdir(_config.options.inputFolder, function (err, files) {
                that._dirScanInProgress = false;
                if (err) {
                    return that.log.error('readdir error: ' + err);
                }

                // Filter out files that have already been uploaded or are of the wrong format
                var new_files = files.filter(function (fn) {
                    return fn.match(fileExp) && that._uploadedFiles.indexOf(fn) === -1;
                });

                that.log.info('items in input folder: ' + files.length + '\tnew ' + _config.options.inputFormat +  ' files: ' + new_files.length);

                utils.chunk(new_files, _config.options.uploadBatchSize)
                    .forEach(function (chunk) {
                        that._stats.upload.enqueued += chunk.length;

                        that.inputBatchQueue.defer(function (batch_complete) {

                            var uploadWorkerPool = queue(_config.options.uploadPoolSize);

                            chunk.forEach(function (item) {
                                uploadWorkerPool.defer(that.uploadJob.bind(that, item));
                            });

                            uploadWorkerPool.awaitAll(batch_complete)
                        });
                    });
            });
        }
    },

    uploadJob: function (item, completeCb) {
        // Initiate file upload to S3
        var that = this;
        that.uploadHandler(item, function (errorMsg) {
            completeCb(); // Release slot in upload queue
            that._stats.upload.enqueued = that._stats.upload.enqueued - 1;
            if (errorMsg) {
                that.log.error(errorMsg);
                if (!that._stats.upload.failure) {
                    that._stats.upload.failure = {};
                }
                that._stats.upload.failure[errorMsg] = that._stats.upload.failure[errorMsg] ? that._stats.upload.failure[errorMsg] + 1 : 1;
            } else {
                that._stats.upload.queueLength = that._stats.upload.queueLength ? that._stats.upload.queueLength - 1 : 0;
                that._stats.upload.success     = that._stats.upload.success     ? that._stats.upload.success     + 1 : 1;
            }
        });
    },

    receiveMessages: function (receiveMessageError, receiveMessages, cb) {
        var that = this;

        if (!cb) {
            cb = function () { return undefined; };
        }

        if (receiveMessageError) {
            that.log.warn("error in receiveMessage " + String(receiveMessageError));
            return cb();
        }

        if (!receiveMessages ||
                !receiveMessages.Messages ||
                !receiveMessages.Messages.length) {
            /* no work to do */
            that.log.info("complete (empty)");

            return cb();
        }

        if (!that.downloadWorkerPool) {
            that.log.warn("no downloadWorkerPool");
            return cb();
        }

        receiveMessages.Messages.forEach(function (message) {
            that.downloadWorkerPool.defer(function (queueCb) {
                /* queueCb *must* be called to signal queue job termination */
                var timeoutHandle;
                function done() {
                    clearTimeout(timeoutHandle);
                    queueCb();
                }

                // timeout to ensure that queueCb *always* gets called
                timeoutHandle = setTimeout(function () {
                    done();
                    that.log.error("that.downloadWorkerPool timeoutHandle. Clearing queue slot for message: " + message.Body);
                }, (60 + _config.options.downloadTimeout) * 1000);
                that.processMessage(message, done); // queueCb becomes completeCb
            });
        });

        that.log.info("downloader queued " + receiveMessages.Messages.length + " files for download");
        return cb();
    },

    deleteMessage: function (message) {
        var that = this,
            sqs = that.sessionedSQS(),
            messageBody = JSON.parse(message.Body);

        if (that.rentention === "on") {
            /* MC-622 data retention */
            try {
                that.sessionedS3().deleteObject({
                    Bucket: messageBody.bucket,
                    Key:    messageBody.path

                }, function (deleteObjectErr) {
                    if (deleteObjectErr) {
                        that.log.warn(String(deleteObjectErr) + " " + String(deleteObjectErr.stack)); // an error occurred
                    } else {
                        that.log.info("deleteObject " + messageBody.path);
                    }
                });

            } catch (deleteObjectException) {
                that.log.error("deleteObject exception: " + JSON.stringify(deleteObjectException));
            }
        }

        that.discoverQueue(sqs, _config.instance.outputQueueName,
            function (queueURL) {
                try {
                    sqs.deleteMessage({
                        QueueUrl:      queueURL,
                        ReceiptHandle: message.ReceiptHandle

                    }, function (deleteMessageError) {
                        if (deleteMessageError) {
                            that.log.warn("error in deleteMessage " + String(deleteMessageError));
                        }
                        that.log.info("deleteMessage success");
                    });

                } catch (deleteMessageErr) {
                    that.log.error("deleteMessage exception: " + String(deleteMessageErr));
                }
            },
            function (reason) {
                that._stats.download.failure[reason] = that._stats.download.failure[reason] ? that._stats.download.failure[reason] + 1 : 1;
            });
    },

    processMessage: function (message, completeCb) {
        var outputFile, messageBody, fn, folder, match, exit_status,
            that = this;

        if (!message) {
            that.log.info("empty message");
            return completeCb();
        }

        try {
            messageBody = JSON.parse(message.Body);

        } catch (jsonError) {
            that.log.error("error parsing JSON message.Body from message: " + JSON.stringify(message) + " " + String(jsonError));

            that.deleteMessage(message);
            return completeCb();
        }

        /* MC-405 telemetry log to file */
        if (messageBody.telemetry) {
            try {
                that.telemetryLogStream.write(JSON.stringify(messageBody.telemetry) + os.EOL);

            } catch (telemetryWriteErr) {
                that.log.error("error writing telemetry: " + telemetryWriteErr);
            }

            if (_config.options.telemetryCb) {
                _config.options.telemetryCb(messageBody.telemetry);
            }
        }

        if (!messageBody.path) {
            that.log.warn("invalid message: " + JSON.stringify(messageBody));
            return;
        }

        match      = messageBody.path.match(/[\w\W]*\/([\w\W]*?)$/);
        fn         = match ? match[1] : "";
        folder     = _config.options.outputFolder;

        if (_config.options.filter === 'on') {
            /* MC-940: use folder hinting if present */
            if (messageBody.telemetry &&
                    messageBody.telemetry.hints &&
                    messageBody.telemetry.hints.folder) {
                that.log.info("using folder hint");
                folder = path.join(folder, messageBody.telemetry.hints.folder);

                /* MC-508 optional split by channel id */
                if (_config.options.filterByChannel === 'on' &&
                        messageBody.telemetry.hints &&
                        messageBody.telemetry.hints.channel_id) {
                    folder = path.join(folder, messageBody.telemetry.hints.channel_id);
                }
            }

            /* MC-348 Purity Filter exit_status =~ /Workflow successful/ */
            if (messageBody.telemetry &&
                    !messageBody.telemetry.hints &&
                    messageBody.telemetry.json &&
                    messageBody.telemetry.json.exit_status) {

                exit_status = messageBody.telemetry.json.exit_status;

                if (exit_status.match(/workflow[ ]successful/i)) {
                    folder = path.join(folder, "pass");
                } else {
                    folder = path.join(folder, "fail");
                }
            }

            /* make the target folder; todo: add error check */
            mkdirp.sync(folder);
        }

        outputFile = path.join(folder, fn);

        if (_config.options.downloadMode === "data+telemetry") {
            /* download file from S3 */
            that.log.info("downloading " + messageBody.path + " to " + outputFile);

            var s3 = that.sessionedS3();
            that._initiateDownloadStream(s3, messageBody, message, outputFile, completeCb);

        } else if (_config.options.downloadMode === "telemetry") {
            /* skip download - only interested in telemetry */
            that.deleteMessage(message);

            that._stats.download.success = that._stats.download.success ? that._stats.download.success + 1 : 1; // hmm. not exactly "download", these

            /* must signal completion */
            return completeCb();
        }
    },

    _initiateDownloadStream: function (s3, messageBody, message, outputFile, completeCb) {

        var that = this,
            file,
            transferTimeout,
            rs;

        function deleteFile() {
            try {
                fs.unlink(outputFile, function (err) {
                    if (err) {
                        that.log.warn("failed to remove file: " + outputFile);
                    } else {
                        that.log.warn("removed failed download file: " + outputFile + ' ' + err);
                    }
                });
            } catch (unlinkException) {
                that.log.warn("failed to remove file. unlinkException: " + outputFile + ' ' + String(unlinkException));
            }
        }

        function onStreamError() {
            if (!file._networkStreamError) {
                try {
                    file._networkStreamError = 1; /* MC-1953 - signal the file end of the pipe that the network end of the pipe failed */
                    file.close();
                    deleteFile();
                    if (rs.destroy) { //&& !rs.destroyed) {
                        that.log.error("destroying readstream for " + outputFile);
                        rs.destroy();
                    }
                } catch (err) {
                    that.log.error("error handling sream error: " + err.message);
                }
            }
        }

        try {
            file = fs.createWriteStream(outputFile);
            rs = s3.getObject({
                Bucket: messageBody.bucket,
                Key:    messageBody.path
            }).createReadStream();

        } catch (getObjectException) {
            that.log.error("getObject/createReadStream exception: " + String(getObjectException));

            if (completeCb) {
                completeCb();
            }

            return;
        }

        rs.on("error", function (readStreamError) {
            that.log.error("error in download readstream " + readStreamError); /* e.g. socket hangup */
            try {
                onStreamError();
            } catch (e) {
                that.log.error("error handling readStreamError: " + e);
            }
        });

        file.on("finish", function () {
            if (!file._networkStreamError) {
                // SUCCESS
                that.log.info("downloaded " + outputFile);
                that._stats.download.success = that._stats.download.success ? that._stats.download.success + 1 : 1;

                // MC-1993 - store total size of downloaded files
                try {
                    fs.stat(outputFile, function fsStatCallback(err, stats) {
                        if (err) {
                            that.log.warn("failed to fs.stat file: " + err);
                        } else if (stats && stats.size) {
                            that._stats.download.totalSize += stats.size;
                            // MC-2540 : if there is some postprocessing to do( e.g fastq extraction) - call the dataCallback
                            // dataCallback might depend on the exit_status ( e.g. fastq can only be extracted from successful reads )
                            var exit_status = messageBody.telemetry.json.exit_status;
                            if (_config.options.dataCb) {
                                _config.options.dataCb(outputFile, exit_status);
                            }
                        }
                    });
                } catch (err) {
                    that.log.warn("failed to fs.stat file: " + err);
                }
                that.deleteMessage(message); /* MC-1953 - only delete message on condition neither end of the pipe failed */
            }
        });

        file.on("close", function (writeStreamError) {
            that.log.info("closing writeStream " + outputFile);
            if (writeStreamError) {
                that.log.error("error closing writestream " + writeStreamError);
                /* should we bail and return completeCb() here? */
            }

            /* must signal completion */
            clearTimeout(transferTimeout);
            // MC-2143 - check for more jobs
            setTimeout(that.loadAvailableDownloadMessages.bind(that));
            completeCb();
        });

        file.on("error", function (writeStreamError) {
            that.log.error("error in download write stream " + writeStreamError);
            onStreamError();
        });

        transferTimeout = setTimeout(function () {
            that.log.info("transfer timed out");
            onStreamError();
        }, 1000 * _config.options.downloadTimeout); /* download stream timeout in ms */

        rs.pipe(file); // initiate download stream
    },

    uploadHandler: function (item, completeCb) {
        /** open readStream and pipe to S3.upload */

        var that = this,
            s3 = that.sessionedS3(),
            rs,
            fileId   = path.join(_config.options.inputFolder, item),
            objectId = _config.instance.bucketFolder + "/" + (_config.instance.inputQueueName ? _config.instance.inputQueueName + "/" : "") + item,
            timeoutHandle,
            completed = false;

        function done(err) {
            if (!completed) {
                completed = true;
                clearTimeout(timeoutHandle);
                completeCb(err);
            }
        }

        // timeout to ensure that completeCb *always* gets called
        timeoutHandle = setTimeout(function () {
            if (rs && !rs.closed) {
                rs.close();
            }
            done("that.uploadWorkerPool timeoutHandle. Clearing queue slot for file: " + item);
        }, (_config.options.uploadTimeout + 1) * 1000);

        try {
            rs = fs.createReadStream(fileId);
        } catch (createReadStreamException) {
            return done("createReadStreamException exception" + String(createReadStreamException)); // close the queue job
        }

        rs.on("error", function (readStreamError) {
            rs.close();
            if (String(readStreamError).match(/ENOENT/)) {
                // fs.watch probably fired for something which just moved - don't tally as an error. "fs.exists is an antipattern" my arse
                done("error in upload readstream: ENOENT");
            } else {
                done("error in upload readstream: " + readStreamError)
            }
        });

        rs.on("open", function () {
            var params, options;

            params   = {
                Bucket: _config.instance.bucket,
                Key:    objectId,
                Body:   rs
            };
            options  = { partSize: 10 * 1024 * 1024, queueSize: 1};

            s3.upload(params, options, function (uploadStreamErr) {
                if (uploadStreamErr) {
                    that.log.warn("uploadStreamError " + String(uploadStreamErr));
                    return done("uploadStreamError " + String(uploadStreamErr)); // close the queue job
                }
                that.uploadComplete(objectId, item, done);
                rs.close();
            });
        });

        rs.on('end', rs.close);
        rs.on('close', function () {
            that.log.info("closing readstream");
        });
    },

    discoverQueue: function (sqs, queueName, successCb, failureCb) {
        var that = this;

        if (_config.instance._discoverQueueCache[queueName]) {
            if (successCb) {
                successCb(_config.instance._discoverQueueCache[queueName]);
            }
            return;
        }

        that.log.info("discovering queue for " + queueName);
        sqs.getQueueUrl({ QueueName: queueName }, function (getQueueErr, getQueue) {
            if (getQueueErr) {
                if (_config.options.proxy && (String(getQueueErr)).match(/Unexpected close tag/)) {
                    that.log.warn("error in getQueueUrl. Could be an aws-sdk/SSL/proxy compatibility issue");
                }

                that.log.warn("uploader: could not getQueueUrl: " + getQueueErr);
                if (failureCb) {
                    failureCb("getqueueurl error");
                }
                return;
            }

            if (!getQueue || !getQueue.QueueUrl) {
                return failureCb ? failureCb("getqueueurl error") : null;
            }

            that.log.info("found queue " + getQueue.QueueUrl);
            _config.instance._discoverQueueCache[queueName] = getQueue.QueueUrl;
            if (successCb) {
                successCb(getQueue.QueueUrl);
            }
        });
    },

    uploadComplete: function (objectId, item, successCb) {
        var that = this,
            sqs = that.sessionedSQS();
        that.log.info("uploaded " + item + " to " + objectId);

        if (_config.instance.inputQueueURL) {
            return that.sendMessage(sqs, objectId, item, successCb);
        }

        that.discoverQueue(sqs, _config.instance.inputQueueName,
            function (queueURL) {
                _config.instance.inputQueueURL = queueURL;
                return that.sendMessage(sqs, objectId, item, successCb);
            },
            function (discoverQueueErr) {
                that.log.warn(discoverQueueErr);
                successCb(discoverQueueErr);
            });
    },

    sendMessage: function (sqs, objectId, item, successCb) {
        var that    = this,
            message = {
                bucket:               _config.instance.bucket,
                outputQueue:          _config.instance.outputQueueName,
                remote_addr:          _config.instance.remote_addr,
                user_defined:         _config.instance.user_defined || null, // MC-2397 - bind param_config to each sqs message
                apikey:               _config.options.apikey,
                id_workflow_instance: _config.instance.id_workflow_instance,
                utc:                  new Date().toISOString(),
//                message.inputFolder = that.runFolder; // MC-960 folder aggregation messages
                path:                 objectId,
                // components        // chained workflow structure
                // targetComponentId // first component to run
            };

        if (_config.instance.chain) {
            try {
                message.components        = JSON.parse(JSON.stringify(_config.instance.chain.components)); // low-frills object clone
                message.targetComponentId = _config.instance.chain.targetComponentId; // first component to run
            } catch (jsonException) {
                that.log.error("exception parsing components JSON " + String(jsonException));
                return successCb("json exception");// close the queue job
            }
        }
        // MC-1304 - attach geo location and ip
        if (_config.options.agent_address) {
            message.agent_address = _config.options.agent_address;
        }

        if (message.components) {
            // optionally populate input + output queues
            Object.keys(message.components).forEach(function (o) {
                if (message.components[o].inputQueueName === 'uploadMessageQueue') {
                    message.components[o].inputQueueName = that.uploadMessageQueue;
                }

                if (message.components[o].inputQueueName === 'downloadMessageQueue') {
                    message.components[o].inputQueueName = that.downloadMessageQueue;
                }
            });
        }

        try {
            sqs.sendMessage({
                QueueUrl:    _config.instance.inputQueueURL,
                MessageBody: JSON.stringify(message)
            }, function (sendMessageError) {
                if (sendMessageError) {
                    that.log.warn("error sending message " + String(sendMessageError));
                    return successCb("sendmessage error"); // close the queue job
                }
                that._moveUploadedFile(item, successCb);
            });
        } catch (sendMessageException) {
            that.log.error("exception sending message " + String(sendMessageException));
            if (successCb) {
                successCb("sendmessage exception");
            } // close the queue job
        }
    },

    _moveUploadedFile: function (fileName, successCb) {

        var that = this, folderTo, fileTo, fileFrom, streamErrorFlag, readStream, writeStream, renameComplete;

        if (_config.options.uploadedFolder && _config.options.uploadedFolder !== '+uploaded') {
            folderTo =  _config.options.uploadedFolder;
        } else {
            folderTo = path.join(_config.options.inputFolder, "uploaded");
        }
        fileFrom = path.join(_config.options.inputFolder, fileName);
        fileTo = path.join(folderTo, fileName);

        function done(err) {
            if (err) {
                successCb(err);
                that._uploadedFiles.push(fileName); // flag as uploaded to prevent multiple uploads
            } else if (!renameComplete) {
                renameComplete = true;
                successCb();
            }
        }

        function statFile(fileName) {
            fs.stat(fileName, function fsStatCallback(err, stats) {
                if (err) {
                    that.log.warn("failed to fs.stat uploaded file: " + err);
                } else if (stats && stats.size) {
                    that._stats.upload.totalSize += stats.size;
                }
            });
        }

        function deleteFile(outputFile) {
            try {
                fs.unlink(outputFile, function (err) {
                    if (err) {
                        that._uploadedFiles[fileName] = true; // flag as uploaded
                        that.log.warn("failed to remove uploaded file " + fileFrom + " : " + err);
                    }
                });
            } catch (unlinkException) {
                that.log.warn("failed to remove file. unlinkException: " + outputFile + ' ' + String(unlinkException));
            }
        }

        function onError(err) {
            done("_moveUploadedFile error: " + err); // close the queue job
            if (err && !streamErrorFlag) {
                streamErrorFlag = true; // flag as uploaded
                try {
                    statFile(fileFrom);
                    writeStream.close();
                    if (readStream.destroy) {
                        that.log.error("destroying upload readstream for " + fileName);
                        readStream.destroy();
                    }
                    deleteFile(fileTo);
                } catch (e) {
                    that.log.error("error removing uploaded target file " + fileTo + " : " + e);
                }
            }
        }

        mkdirp(folderTo, function (mkdirException) {
            if (mkdirException && !String(mkdirException).match(/EEXIST/)) {
                done("mkdirpException " + String(mkdirException));
                streamErrorFlag = true; // flag as uploaded
                statFile(fileFrom);
            } else {
                // MC-2389 - fs.rename can cause "EXDEV, Cross-device link" exception
                // Ref: http://stackoverflow.com/questions/4568689/how-do-i-move-file-a-to-a-different-partition-or-device-in-node-js

                try {
                    readStream = fs.createReadStream(fileFrom);
                    writeStream = fs.createWriteStream(fileTo);

                    writeStream.on("error", function (writeStreamError) {
                        onError("writeStream error: " + writeStreamError);
                    });

                    readStream
                        .on('close', function () {
                            if (!streamErrorFlag) {
                                // don't delete if there's an error
                                deleteFile(fileFrom);
                            }
                            statFile(fileTo);
                            that.log.info("marked " + fileFrom + " as done");
                            done(); // close the queue job // SUCCESS
                        })
                        .on("error", function (readStreamError) {
                            onError("failed to rename uploaded file. " + readStreamError);
                        })
                        .pipe(writeStream);

                } catch (renameStreamException) {
                    onError("failed to move uploaded file into upload folder: " + String(renameStreamException));
                }
            }
        });
    },

    queueLength: function (queueURL, cb) {
        var that = this,
            sqs = that.sessionedSQS(),
            queuename;

        if (!cb) {
            cb = function () { return undefined; };
        }

        if (!queueURL) {
            return cb();
        }

        queuename = queueURL.match(/([\w\-_]+)$/)[0];
        that.log.info("querying queue length of " + queuename);

        try {
            sqs.getQueueAttributes({
                QueueUrl:       queueURL,
                AttributeNames: ['ApproximateNumberOfMessages']

            }, function (attrErr, attrs) {
                if (attrErr) {
                    that.log.warn("error in getQueueAttributes: " + String(attrErr));
                    return cb();
                }

                if (attrs &&
                        attrs.Attributes &&
                        attrs.Attributes.ApproximateNumberOfMessages) {
                    var len = attrs.Attributes.ApproximateNumberOfMessages;
                    len     = isNaN(len) ? 0 : parseInt(len, 10);

                    return cb(len);
                }
            });

        } catch (getQueueAttrException) {
            that.log.error("error in getQueueAttributes " + String(getQueueAttrException));
            return cb();
        }
    }
};