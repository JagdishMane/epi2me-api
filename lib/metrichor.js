// Author:        rpettett
// Last Maintained: $Author$
// Last Modified: $Date$
// Id:            $Id$
// $HeadURL$
// $LastChangedRevision$
// $Revision$

/*jslint nomen: true*/
/*global require, module, $, metrichor */

"use strict";
var request, AWS, queue, fs, path, os, mkdirp, proxy, _config;

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
    request = require("request");
    AWS     = require("aws-sdk");
    fs      = require("graceful-fs"); /* MC-565 handle EMFILE gracefully */
    os      = require("os");
    queue   = require("queue-async");
    path    = require("path");
    mkdirp  = require("mkdirp");
    proxy   = require("proxy-agent");

    module.exports         = metrichor;
    module.exports.version = '0.8.10';
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
            apikey                 : opts.apikey,
            proxy                  : opts.proxy,
            url                    : opts.url || 'https://metrichor.com',

            /* below are the consolidated harness options for 0.7.0 */
            retention              : "on",
            telemetryCb            : opts.telemetryCb,
            dataCb                 : opts.dataCb,

             /* upload settings */
            inputFolder            : opts.inputFolder,
            inputFormat            : opts.inputFormat || 'fast5',
            uploadPoolSize         : 5,                                     // Parallelism of upload queue
            uploadQueueThreshold   : opts.uploadQueueThreshold || 500,      // Threshold used to trigger more files loading
            fileCheckInterval      : 15,                                    // Seconds between loadUploadFiles()
            downloadCheckInterval  : 5,                                     // Seconds between loadAvailableMessages()

            /* download settings */
            outputFolder           : opts.outputFolder,
            inFlightDelay          : opts.inFlightDelay    || 600,          // wait 5 mins before resub
            waitTimeSeconds        : opts.waitTimeSeconds  || 20,           // long-poll wait 20 seconds for messages
            downloadPoolSize       : opts.downloadPoolSize || 10,           // MC-505 how many things to download at once
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
        }
        return this._stats[key];
    },

    user : function (cb) {
        return this._get('user', cb);
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
        return this._post('workflow', id, obj, cb);
    },

    start_workflow : function (workflow_id, cb) {
        return this._post('workflow_instance', null, { "workflow": workflow_id }, cb);
    },

    stop_workflow : function (instance_id, cb) {
        return this._put('workflow_instance/stop', instance_id, cb);
    },

    workflow_instances : function (cb) {
        return this._list('workflow_instance', cb);
    },

    workflow_instance : function (id, cb) {
        return this._read('workflow_instance', id, cb);
    },

    token : function (id, cb) { /* should this be passed a hint at what the token is for? */
        var that = this;
        return that._post('token', {id_workflow_instance: id || _config.instance.id_workflow_instance}, null, cb);
    },

    telemetry : function (id_workflow_instance, obj, cb) {
        if (cb === null) {
            // two args: get object
            cb = obj;
            return this._read('workflow_instance/telemetry', id_workflow_instance, cb);
        }

        // three args: update object
        return this._post('workflow_instance/telemetry', id_workflow_instance, obj, cb);
    },

    _list : function (entity, cb) {
        return this._get(entity, function (e, json) {
            if (cb) {
                cb(e, json[entity + "s"]);
            }
        });
    },

    _read : function (entity, id, cb) {
        return this._get(entity + '/' + id, cb);
    },

    _get : function (uri, cb) {
        // do something to get/set data in metrichor
        var call, mc,
            srv = _config.options.url;

        uri = "/" + uri + ".js?apikey=" + _config.options.apikey;
        srv = srv.replace(/\/+$/, ""); // clip trailing /s
        uri = uri.replace(/\/+/g, "/");

        if (_config.options.agent_version) {
            uri = uri + ";agent_version=" + _config.options.agent_version;
        }

        call = srv + uri;
        mc   = this;

        request.get(
            {
                uri   : call,
                proxy : _config.options.proxy
            },
            function (e, r, body) {
                mc._responsehandler(e, r, body, cb);
            }
        );
    },

    _post : function (uri, id, obj, cb) {
        var srv, call, that = this,
            form = {
                apikey: _config.options.apikey,
            };

        if (obj !== undefined) {
            form.json = JSON.stringify(obj);
        }

        if (_config.options.agent_version) {
            form.agent_version = _config.options.agent_version;
        }

        /* if id is an object, merge it into form post parameters */
        if (id && typeof id === 'object') {
            Object.keys(id).forEach(function (attr) {
                form[attr] = id[attr];
            });

            id = "";
        }

        srv  = _config.options.url;
        srv  = srv.replace(/\/+$/, ""); // clip trailing /s
        uri  = uri.replace(/\/+/g, "/");
        call = srv + '/' + uri;

        if (id) {
            call = call + '/' + id;
        }
        call += '.js';

        request.post(
            {
                uri   : call,
                form  : form,
                proxy : _config.options.proxy
            },
            function (e, r, body) {
                that._responsehandler(e, r, body, cb);
            }
        );
    },

    _put : function (uri, id, obj, cb) {
        /* three-arg _put call (no parameters) */
        if (typeof obj === 'function') {
            cb = obj;
        }

        var srv, call, that = this,
            form = {
                apikey: _config.options.apikey,
                json:   JSON.stringify(obj)
            };

        if (_config.options.agent_version) {
            form.agent_version = _config.options.agent_version;
        }

        srv  = _config.options.url;
        srv  = srv.replace(/\/+$/, ""); // clip trailing /s
        uri  = uri.replace(/\/+/g, "/");
        call = srv + '/' + uri + '/' + id + '.js';

        request.put(
            {
                uri   : call,
                form  : form,
                proxy : _config.options.proxy
            },
            function (e, r, body) {
                that._responsehandler(e, r, body, cb);
            }
        );
    },

    _responsehandler : function (res_e, r, body, cb) {
        var json;
        if (res_e) {
            if (cb) {
                cb(res_e, {});
            }
            return;
        }

        if (r && r.statusCode >= 400) {
            if (cb) {
                cb({"error": "HTTP status " + r.statusCode}, {});
            }
            return;
        }

        try {
            json = JSON.parse(body);

        } catch (jsn_e) {
            if (cb) {
                cb(jsn_e, {});
            }
            return;
        }

        if (json.error) {
            if (cb) {
                cb({"error": json.error}, {});
            }
            return;
        }

        if (cb) {
            cb(null, json);
        }
    },

    resetStats: function () {

        this._stats = {
            upload:   {
                success: 0,
                failure: {},
                queueLength: 0,
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
                that.log.info("workflow instance " + _config.instance.id_workflow_instance + " stopped");
            });
        }

        if (that._downloadCheckInterval) {
            that.log.info("clearing _downloadCheckInterval interval");
            clearInterval(that._downloadCheckInterval);
            that._downloadCheckInterval = null;
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

    session: function (sessionCb) {
        var that = this;

        /* MC-1848 all session requests are serialised through that.sessionQueue to avoid multiple overlapping requests */
        if (!that.sessionQueue) {
            that.sessionQueue = queue(1);
        }

        if (!sessionCb) {
            sessionCb = function () { return undefined; };
        }

        if (that.sessionQueue.remaining() > 0) {
            that.log.info("session request already in progress");
            return sessionCb();
        }

        if (that._stats.sts_expiration &&
                that._stats.sts_expiration > new Date()) {
            /* quick escape if session is still valid */
            return sessionCb();
        }

        that.sessionQueue.defer(function (queueCb) {
            that.log.info("new instance token needed");

            if (!_config.instance.id_workflow_instance) {
                throw new Error("must specify id_workflow_instance");
            }

            that.token(_config.instance.id_workflow_instance, function (tokenError, token) {
                if (tokenError) {
                    that.log.warn("failed to fetch instance token: " + tokenError.error ? tokenError.error : tokenError);
                    setTimeout(function () { sessionCb("failed to fetch instance token"); }, 0);
                    return queueCb(); /* free up the sessionQueue slot */
                }

                that.log.info("allocated new instance token expiring at " + token.expiration);
                that._stats.sts_expiration = new Date(token.expiration); // Date object for expiration check later
                that._stats.sts_expiration.setMinutes(that._stats.sts_expiration.getMinutes() - 2); // refresh token 2 mins before it expires
                // "classic" token mode no longer supported

                if (_config.options.proxy) {
                    AWS.config.update({
                        httpOptions: { agent: proxy(_config.options.proxy, true) }
                    });
                }

                AWS.config.update(_config.instance.awssettings);
                AWS.config.update(token);
                setTimeout(sessionCb, 0);
                return queueCb(); /* free up the sessionQueue slot */
            });

            return; /* if existing instance is invalid. sessionCb is called on success+failure in that.token callback, above */
        });
    },

    sessionedS3: function (cb) {
        var that = this;
        that.session(function (sessionError) {
            var s3 = new AWS.S3();
            if (cb) {
                cb(sessionError, s3);
            }
        });
    },

    sessionedSQS: function (cb) {
        var that = this;
        that.session(function (sessionError) {
            var sqs = new AWS.SQS();
            if (cb) {
                cb(sessionError, sqs);
            }
        });
    },

    autoStart: function (id, cb) {
        var that = this;
        that.resetInstance();
        that.resetStats();
        that.start_workflow(id, function start_workflowCB(workflowError, instance) {
            if (workflowError) {
                that.log.warn("failed to start workflow: " + (workflowError && workflowError.error ? workflowError.error : workflowError));
                if (cb) {
                    cb("failed to start workflow");
                }
                return;
            }

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
            _config.instance.chain               = instance.chain;
            _config.instance.remote_addr         = instance.remote_addr;
            _config.instance.bucket              = instance.bucket;
            _config.instance.inputQueueName      = instance.inputqueue;
            _config.instance.outputQueueName     = instance.outputqueue;
            _config.instance.awssettings.region  = instance.region;
            _config.instance.bucketFolder        = instance.outputqueue + "/" + instance.id_user + "/" + instance.id_workflow_instance;

            that.autoConfigure(_config.instance, cb);
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
                that.log.warn("failed to join workflow: " + (instanceError && instanceError.error ? instanceError.error : instanceError));
                if (cb) {
                    cb("failed to join workflow");
                }
                return;
            }

            if (instance.state === "stopped") {
                that.log.warn("workflow " + id + " is already stopped");
                if (cb) {
                    cb("could not join workflow");
                }
                return;
            }

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
            _config.instance.chain               = instance.chain;
            _config.instance.remote_addr         = instance.remote_addr;
            _config.instance.bucket              = instance.bucket;
            _config.instance.inputQueueName      = instance.inputqueue;
            _config.instance.outputQueueName     = instance.outputqueue;
            _config.instance.awssettings.region  = instance.region;
            _config.instance.bucketFolder        = instance.outputqueue + "/" + instance.id_user + "/" + instance.id_workflow_instance;

            that.autoConfigure(_config.instance, cb);
        });
    },

    autoConfigure: function (instance, autoStartCb) {
        var i, blocker, telemetryLogPath, fileName,
            that = this;

        if (!_config.options.inputFolder) {
            throw new Error("must set inputFolder");
        }

        if (!_config.options.outputFolder) {
            throw new Error("must set outputFolder");
        }

        if (!instance.bucketFolder) {
            throw new Error("bucketFolder must be set");
        }

        if (!instance.inputQueueName) {
            throw new Error("inputQueueName must be set");
        }

        if (!instance.outputQueueName) {
            throw new Error("outputQueueName must be set");
        }

        // configure the upload queue, but start slowly (artificially occupied slots for a few seconds)
        if (!that.uploadWorkerPool) {
            that.uploadWorkerPool = queue(_config.options.uploadPoolSize);
        }

        blocker = function (i) {
            that.uploadWorkerPool.defer(function (cb) {
                setTimeout(function () {
                    that.log.info("freeing slot " + i);
                    if (cb) {
                        cb();
                    }
                }, 10000); /* slow connections, e.g. CRP, can take > 5 secs to allocate a STS token */
            });
        };

        /* early request for a session token */
        that.session();

        for (i = 0; i < _config.options.uploadPoolSize; i += 1) {
            that.log.info("delaying slot " + i);
            blocker(i);
        }

        if (!that.downloadWorkerPool) {
            that.downloadWorkerPool = queue(_config.options.downloadPoolSize);
        }

        mkdirp.sync(_config.options.outputFolder);

        // MC-1828 - include instance id in telemetry file name
        fileName = (instance.id_workflow_instance) ? "telemetry-" + instance.id_workflow_instance + ".log" : "telemetry.log";
        telemetryLogPath = path.join(_config.options.outputFolder, fileName);

        try {
            that.telemetryLogStream = fs.createWriteStream(telemetryLogPath, { flags: "a" });
            that.log.info("logging telemetry to " + telemetryLogPath);

        } catch (telemetryLogStreamErr) {
            that.log.error("error opening telemetry log stream: " + String(telemetryLogStreamErr));
        }

        // sqs event handler
        that._downloadCheckInterval = setInterval(that.loadAvailableMessages.bind(that), _config.options.downloadCheckInterval * 1000);
        that._fileCheckInterval = setInterval(that.loadUploadFiles.bind(that), _config.options.fileCheckInterval * 1000);
        that.loadUploadFiles(); // Trigger once at workflow instance start
        if (autoStartCb) {
            // if you didn't pass autoStart a callback, good luck finding out the instance metadata
            autoStartCb(null, instance);
        }
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

    loadAvailableMessages: function () {
        var that = this;

        // MC-1993 - don't check for files if all files have been downloaded
        if (that._stats.download.success >= that._stats.upload.success && that._stats.download.queueLength === 0) {
            return;
        }

        if (!that.queueLengthQueue) {
            that.queueLengthQueue = queue(1);
        }

        that.log.info("download heartbeat");

        if (that.queueLengthQueue.remaining() > 0) {
            that.log.info("download already running"); /* don't build up a backlog by queuing another job */
            return;
        }

        that.queueLengthQueue.defer(function (cb) {
            that.sessionedSQS(function (sessionError, sqs) {
                if (sessionError) {
                    that.log.warn(sessionError);
                    return cb();
                }

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
                            return that.downloadWork(null, cb);
                        });
                }
            });
        });
    },

    downloadAvailable: function (cb) {
        var that = this,
            downloadWorkerPoolRemaining = (that.downloadWorkerPool) ? that.downloadWorkerPool.remaining() : 0;

        if (!cb) {
            cb = function noop() { return undefined; };
        }

        if (downloadWorkerPoolRemaining >= _config.options.downloadPoolSize * 5) { /* ensure downloadPool is limited but fully utilised */
            that.log.info(downloadWorkerPoolRemaining + " downloads already queued");
            return cb();
        }

        that.sessionedSQS(function (sessionError, sqs) {
            if (sessionError) {
                that.log.warn(sessionError);
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
        });
    },

    loadUploadFiles: function () {

        var that = this,
            fileExp = new RegExp('\\.' + _config.options.inputFormat + '\\b'),   // only consider files with the specified extension
            remaining = that.uploadWorkerPool ? that.uploadWorkerPool.remaining() : 0;

        that._fileStash = that._fileStash || [];

        if (!that._dirScanInProgress && remaining === 0) {
            that._dirScanInProgress = true;

            fs.readdir(_config.options.inputFolder, function (err, files) {

                if (err) {
                    that._dirScanInProgress = false;
                    return that.log.info('readdir error: ' + err);
                }

                // Filter is much faster than a for loop or forEach
                that._fileStash = files.filter(function (fn) {
                    return fn.match(fileExp);
                });

                // make sure something is on the queue to avoid the readdir coming back around again too quickly
                that._fileStash
                    .splice(0, _config.options.uploadQueueThreshold)
                    .forEach(function unstashFiles(fn) {
                        return that.enqueueUploadJob(fn);
                    });
                that._dirScanInProgress = false;
            });
        }

        // Enqueue files; attempt to throttle call stack size
        if (remaining < 1000) {
            that._fileStash
                .splice(0, _config.options.uploadQueueThreshold)
                .forEach(function unstashFiles(fn) {
                    return that.enqueueUploadJob(fn);
                });
        }
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

        receiveMessages.Messages.forEach(function (message) {
            that.downloadWorkerPool.defer(function (queueCb) {
                /* queueCb *must* be called to signal queue job termination */
                that.processMessage(message, queueCb); // queueCb becomes completeCb
            });
        });

        that.log.info("downloader queued " + receiveMessages.Messages.length + " files for download");

        /* wait for downloadWorkerPool to finish ? could use
         * that.downloadWorkerPool.awaitAll here but if any one worker
         * blocks the awaitAll won't fire. Could also just setTimeout
         * delay the reset by the average transfer time */
        return cb();
    },

    deleteMessage: function (message) {
        var that = this,
            messageBody = JSON.parse(message.Body);

        if (that.rentention === "on") {
            /* MC-622 data retention */
            that.sessionedS3(function (sessionError, s3) {
                if (sessionError) {
                    that.log.warn(sessionError);
                }

                try {
                    s3.deleteObject({
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
            });
        }

        that.sessionedSQS(function (sessionError, sqs) {
            if (sessionError) {
                that.log.warn(sessionError);
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
        });
    },

    processMessage: function (message, completeCb) {
        var outputFile, messageBody, fn, folder, match, exit_status,
            that = this;

        if (!completeCb) {
            completeCb = function () { return undefined; };
        }

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

            that.sessionedS3(function (sessionError, s3) {
                if (sessionError) {
                    that.log.warn(sessionError);
                    return completeCb();
                }
                that._initiateDownloadStream(s3, messageBody, message, outputFile, completeCb);
            });

        } else if (_config.options.downloadMode === "telemetry") {
            /* skip download - only interested in telemetry */
            that.deleteMessage(message);

            that._stats.download.success = that._stats.download.success ? that._stats.download.success + 1 : 1; // hmm. not exactly "download", these

            /* must signal completion */
            return completeCb();
        }
    },

    _initiateDownloadStream: function (s3, messageBody, message, outputFile, completeCb) {
        // MC-1993 -

        var that = this,
            file,
            transferTimeout,
            rs;

        function deleteFile() {
            fs.unlink(outputFile, function (err) {
                if (err) {
                    that.log.warn("failed to remove file: " + outputFile + ' ' + err);
                }
            });
        }

        file = fs.createWriteStream(outputFile);
        try {
            rs = s3.getObject({
                Bucket: messageBody.bucket,
                Key:    messageBody.path
            }).createReadStream();

        } catch (getObjectErr) {
            that.log.error("getObject/createReadStream exception: " + String(getObjectErr));
            file.close();
            return completeCb();
        }

        rs.on("error", function (readStreamError) {
            that.log.warn("error in download readstream " + readStreamError); /* e.g. socket hangup */
            /* figure out how to cleanly requeue a download
             * message - as soon as file is closed here it will
             * call deleteMessage unrecoverably */
            this.end();
            file.close();
            file.networkStreamError = 1; /* MC-1953 - signal the file end of the pipe that the network end of the pipe failed */
            return deleteFile();
        });

        /**
         * MC-1843 - distinguish between 'end' and 'close' events
         * 'end' event equals success
         * 'close' is called after error or if file.destroy is called
         */
        file
            .on("finish", function () {
                that.log.info("downloaded " + outputFile);
                that._stats.download.success = that._stats.download.success ? that._stats.download.success + 1 : 1;

                // MC-1993 - store total size of downloaded files
                try {
                    fs.stat(outputFile, function fsStatCallback(err, stats) {
                        if (err) {
                            that.log.warn("failed to fs.stat file: " + err);
                        } else if (stats && stats.size) {
                            that._stats.download.totalSize += stats.size;
                        }
                    });
                } catch (err) {
                    that.log.warn("failed to fs.stat file: " + err);
                }

                if (!file.networkStreamError) {  /* file == this? might be more explicit */
                    that.deleteMessage(message); /* MC-1953 - only delete message on condition neither end of the pipe failed */
                }
            })

            .on("close", function (writeStreamError) {
                that.log.info("closing writeStream " + outputFile);
                if (writeStreamError) {
                    that.log.warn("error closing writestream " + writeStreamError);
                    /* should we bail and return completeCb() here? */
                }

                /* must signal completion */
                clearTimeout(transferTimeout);
                return completeCb();
            })

            .on("error", function () {
                this.end();
                return deleteFile();
            });

        transferTimeout = setTimeout(function () {
            that.log.info("transfer timed out");
            return rs.emit("error", new Error("downloader: transfer timed out"));
        }, 300000); /* 5 minute timeout in ms */

        rs.pipe(file);
    },

    enqueueUploadJob: function (item, requeue) {
        var that = this;
        setTimeout(function () { that.timedEnqueueUploadJob(item, requeue); }, 0); /* attempt to avoid large call stacks */
    },

    timedEnqueueUploadJob: function (item) {
        var that = this;
        that._stats.upload.queueLength += 1;
        that._stats.upload.enqueueCount = that._stats.upload.enqueueCount ? that._stats.upload.enqueueCount + 1 : 1;

        that.uploadWorkerPool.defer(function (completeCb) {
            try {
                that.uploadHandler(item, function (result) {
                    if (isNaN(result)) {
                        if (!that._stats.upload.failure) {
                            that._stats.upload.failure = {};
                        }
                        that._stats.upload.failure[result] = that._stats.upload.failure[result] ? that._stats.upload.failure[result] + 1 : 1;

                    } else {
                        that._stats.upload.queueLength = that._stats.upload.queueLength ? that._stats.upload.queueLength - 1 : 0;
                        that._stats.upload.success     = that._stats.upload.success ? that._stats.upload.success + 1 : 1;
                    }

                    completeCb(); // Release slot in upload queue
                });
            } catch (uploadException) {
                that.log.error("failed to upload: " + String(uploadException));
                completeCb(); // Ensure the queue slot is freed up on exception
            }
        });
    },

    uploadHandler: function (item, successCb) {
        var that = this;

        that.sessionedS3(function (sessionError, s3) {
            if (sessionError) {
                that.log.warn(sessionError);
                return successCb("instance error");
            }

            var rs,
                fileId   = path.join(_config.options.inputFolder, item),
                objectId = _config.instance.bucketFolder + "/" + (_config.instance.inputQueueName ? _config.instance.inputQueueName + "/" : "") + item;

            try {
                rs = fs.createReadStream(fileId);
            } catch (readStreamException) {
                that.log.error("failed to createReadStream " + String(readStreamException));
                return successCb("readstream exception"); // close the queue job
            }

            rs.on("error", function (readStreamError) {
                if (String(readStreamError).match(/ENOENT/)) {
                    // fs.watch probably fired for something which just moved - don't tally as an error. "fs.exists is an antipattern" my arse
                    return successCb("ignore");
                }

                that.log.warn("error in upload readstream: " + readStreamError);
                successCb("readstream error");
                 // close the queue job
            });

            rs.on("open", function () {
                var params, options;

                params   = {
                    Bucket: _config.instance.bucket,
                    Key:    objectId,
                    Body:   rs
                };
                options  = { partSize: 10 * 1024 * 1024, queueSize: 1};

                try {
                    s3.upload(params, options, function (uploadStreamErr) {
                        if (uploadStreamErr) {
                            that.log.warn("uploadStreamError " + String(uploadStreamErr));
                            return successCb("upload error"); // close the queue job
                        }
                        that.uploadComplete(objectId, item, successCb);
                    });

                } catch (uploadStreamException) {
                    that.log.error("failed to upload: " + String(uploadStreamException));
                    successCb("upload exception"); // close the queue job
                }
            });
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

        try {
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

                that.log.info("found queue " + getQueue.QueueUrl);
                _config.instance._discoverQueueCache[queueName] = getQueue.QueueUrl;
                if (successCb) {
                    successCb(getQueue.QueueUrl);
                }
            });

        } catch (getQueueException) {
            that.log.error("exception in getQueueUrl: " + String(getQueueException));
            if (failureCb) {
                failureCb("getqueueurl exception");
            }
        }
    },

    uploadComplete: function (objectId, item, successCb) {
        var that = this;
        that.log.info("uploaded " + item + " to " + objectId);

        /* initialise SQS on autoConfigure or after first upload ? */
        that.sessionedSQS(function (sessionError, sqs) {
            if (sessionError) {
                that.log.warn(sessionError);
                return successCb(sessionError);
            }

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
        });
    },

    sendMessage: function (sqs, objectId, item, successCb) {
        var that    = this,
            message = {
                bucket:               _config.instance.bucket,
                outputQueue:          _config.instance.outputQueueName,
                remote_addr:          _config.instance.remote_addr,
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

//        that.log.info("sending message " + JSON.stringify(message));

        try {
            sqs.sendMessage({
                QueueUrl:    _config.instance.inputQueueURL,
                MessageBody: JSON.stringify(message)
            }, function (sendMessageError) {
                var fileFrom = path.join(_config.options.inputFolder, item),
                    folderTo = path.join(_config.options.inputFolder, "uploaded"),
                    fileTo   = path.join(folderTo, item);

                if (sendMessageError) {
                    that.log.warn("error sending message " + String(sendMessageError));
                    return successCb("sendmessage error"); // close the queue job
                }

                //                that.log.info("message sent " + JSON.stringify(message));
                mkdirp(folderTo, function (mkdirException) {
                    if (mkdirException && !String(mkdirException).match(/EEXIST/)) {
                        that.log.error("mkdirpException " + String(mkdirException));
                    }

                    fs.rename(fileFrom, fileTo, function (renameException) {
                        if (renameException) {
                            that.log.warn("renameException " + String(renameException));
                        } else {
                            // MC-1993 - store total size of all uploaded files
                            try {
                                fs.stat(fileTo, function fsStatCallback(err, stats) {
                                    if (err) {
                                        that.log.warn("failed to fs.stat uploaded file: " + err);
                                    } else if (stats && stats.size) {
                                        that._stats.upload.totalSize += stats.size;
                                    }
                                });
                            } catch (err) {
                                that.log.warn("failed to fs.stat uploaded file: " + err);
                            }
                        }

                        that.log.info("marked " + fileFrom + " as done");
                        successCb(true); // close the queue job // SUCCESS
                    });
                });
            });

        } catch (sendMessageException) {
            that.log.error("exception sending message " + String(sendMessageException));
            if (successCb) {
                successCb("sendmessage exception");
            } // close the queue job
        }
    },

    queueLength: function (queueURL, cb) {
        var that      = this,
            queuename;

        if (!cb) {
            cb = function () { return undefined; };
        }

        if (!queueURL) {
            return cb();
        }

        queuename = queueURL.match(/([\w\-_]+)$/)[0];
        that.log.info("querying queue length of " + queuename);

        that.sessionedSQS(function (sessionError, sqs) {
            if (sessionError) {
                return cb();
            }

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
        });
    }
};
