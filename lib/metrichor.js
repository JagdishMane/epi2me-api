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
    module.exports.version = '0.7.1';
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

             /* upload settings */
            inputFolder            : opts.inputFolder,
            uploadPoolSize         : 10,

            /* download settings */
            outputFolder           : opts.outputFolder,
            inFlightDelay          : opts.inFlightDelay    || 600,          // wait 5 mins before resub
            waitTimeSeconds        : opts.waitTimeSeconds  || 20,           // long-poll wait 20 seconds for messages
            downloadPoolSize       : opts.downloadPoolSize || 10,           // MC-505 how many things to download at once
            filter                 : opts.filter           || "on",
            downloadMode           : opts.downloadMode     || "data+telemetry",
            deleteOnComplete       : opts.deleteOnComplete || "off"         // MC-212
        }
    };

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

        /* Container for workflow instance configuration. */
        _config.instance = {
            inputQueueName         : null,
            inputQueueURL          : null,
            outputQueueName        : null,
            outputQueueURL         : null,
            _discoverQueueCache    : {},
            _queueLengthTimeStamps : {},
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
            cb(e, json[entity + "s"]);
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
        if (res_e) {
            return cb(res_e, {});
        }

        if (r && r.statusCode >= 400) {
            return cb({"error": "HTTP status " + r.statusCode}, {});
        }

        var json;
        try {
            json = JSON.parse(body);

        } catch (jsn_e) {
            return cb(jsn_e, {});
        }

        if (json.error) {
            return cb({"error": json.error}, {});
        }

        return cb(null, json);
    },

    resetStats: function () {
        this._stats = {
            upload:   { success: 0, failure: {} },
            download: { success: 0, failure: {} }
        };
        this.transfersInProgress = {}; // maybe should use _stats ?
    },

    on: function (eventName, eventHandler) {
        var that = this,
            workChecker,
            timedChecker;

        if (eventName === "folderChange") {
            if (that._fsWatcher) {
                // arbitrary limit: only one folder-watcher at a time
                that._fsWatcher.close();
            }

            that._fsWatcher = fs.watch(_config.options.inputFolder, function (event, filename) {
                eventHandler(event, filename);
            });

            return;
        }

        if (eventName === "downloadAvailable") {
            if (that._downloadQueueInterval) {
                // arbitrary limit: only one queue-timer at a time
                clearInterval(that._downloadQueueInterval);
            }
            that.log.info("setting up timer interval");

            workChecker = function (len) {
                that._stats.download.queueLength = len;

                var workClosure = function () {
                    that.log.info("unflagging running downloader");
                    that.downloaderRunning = 0;
                };

                if (len) {
                    that.log.info("download available: " + len);
                    return eventHandler(workClosure);
                }

                return workClosure();
            };

            timedChecker = function () {
                if (that.downloaderRunning) {
                    that.log.info("download already running " + that.downloaderRunning);
                    return;
                }

                that.log.info("download heartbeat");
                that.downloaderRunning = new Date();

                that.sessionedSQS(function (sessionError, sqs) {
                    if (sessionError) {
                        that.log.warn(sessionError);
                        return workChecker();
                    }

                    if (_config.instance.outputQueueURL) {
                        return that.queueLength(_config.instance.outputQueueURL, workChecker, 1);
                    }

                    that.discoverQueue(sqs, _config.instance.outputQueueName,
                        function (queueURL) {
//                            that.log.info("discovered queue " + queueURL);
                            _config.instance.outputQueueURL = queueURL;
                            return that.queueLength(_config.instance.outputQueueURL, workChecker, 1);
                        },

                        function (err) {
                            that.log.warn("error looking up queue. " + String(err));
                            if (!that._stats.download.failure) {
                                that._stats.download.failure = {};
                            }

                            that._stats.download.failure[err] = that._stats.download.failure[err] ? that._stats.download.failure[err] + 1 : 1;
                            return workChecker();
                        });
                });
            };

            that._downloadQueueInterval = setInterval(timedChecker, 4000); // Should be a setTimeout with variable delay rather than static 4000ms poll
            return;
        }

        throw new Error("unsupported event: " + eventName);
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

        if (that._fsWatcher) {
            that.log.info("stopping folder watcher");
            that._fsWatcher.close();
            that.log.info("stopped folder watcher");
        }

        if (that._downloadQueueInterval) {
            that.downloaderRunning = 0;
            that.log.info("stopping queue watcher");
            clearInterval(that._downloadQueueInterval);
            that.log.info("stopped queue watcher");
        }


        that.log.info("clearing instance config");
        that.setOptions();

        that.log.info("stopped everything");

        if (cb) {
            return cb();
        }
    },

    session: function (cb) {
        var that = this;

        if (!that._stats.sts_expiration ||
                that._stats.sts_expiration < new Date()) {

            that.log.info("new instance token needed");

            if (!_config.instance.id_workflow_instance) {
                throw new Error("must specify id_workflow_instance");
            }

            that.token(_config.instance.id_workflow_instance, function (tokenError, token) {
                if (tokenError) {
                    that.log.warn("failed to fetch instance token: " + tokenError.error ? tokenError.error : tokenError);
                    return cb("failed to fetch instance token");
                }

//                that.log.info(JSON.stringify(token));
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
                cb();
            });

            return; /* if existing instance is invalid */
        }

        cb(); /* if existing instance is valid */
    },

    sessionedS3: function (cb) {
        var that = this;
        that.session(function (sessionError) {
            var s3 = new AWS.S3();
            cb(sessionError, s3);
        });
    },

    sessionedSQS: function (cb) {
        var that = this;
        that.session(function (sessionError) {
            var sqs = new AWS.SQS();
            cb(sessionError, sqs);
        });
    },

    autoStart: function (id, cb) {
        var that = this;
        that.resetStats();
        that.start_workflow(id, function (workflowError, instance) {
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
        that.resetStats();
        that.workflow_instance(id, function (instanceError, instance) {
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
        var i, blocker, telemetryLogPath,
            that = this;

        if (!_config.options.inputFolder) {
            throw new Error("must set inputFolder");
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
            that.uploadWorkerPool = queue(_config.options.uploadPoolSize + 1);
            that.uploadWorkerPool.defer(function () { that.log.info("initialising upload worker pool"); }); // first slot never allows that.uploadWorkerPool to complete
        }

        blocker = function (i) {
            that.uploadWorkerPool.defer(function (cb) {
                setTimeout(function () {
                    that.log.info("freeing slot " + i);
                    cb();
                }, 5000);
            });
        };

        for (i = 1; i < _config.options.uploadPoolSize; i += 1) {
            that.log.info("delaying slot " + i);
            blocker(i);
        }

        // fs.watch event handler
        that.on("folderChange", function (event, item) {
            if (item.match(/fast5$/)) {
                // file might be newly created / touched / deleted / moved
                that.log.info("fs.watch " + event + " " + item);
                that.enqueueUploadJob(item);
            }
        });

        // initial folder-scan for existing files which won't trigger the fs.watch event. only run once.
        fs.readdir(_config.options.inputFolder, function (readdirErr, files) {
            if (readdirErr) {
                that.log.warn("error reading folder " + String(readdirErr));
            }

            files.forEach(function (item) {
                if (item.match(/fast5$/)) {
                    that.enqueueUploadJob(item);
                }
            });
        });

        if (!that.downloadWorkerPool) {
            that.downloadWorkerPool = queue(_config.options.downloadPoolSize + 1);
            that.downloadWorkerPool.defer(function () { that.log.info("initialising download worker pool"); }); // first slot never allows that.downloadWorkerPool to complete
        }

        mkdirp.sync(_config.options.outputFolder);
        telemetryLogPath = path.join(_config.options.outputFolder, "telemetry.log");

        try {
            that.telemetryLogStream = fs.createWriteStream(telemetryLogPath, { flags: "a" });
            that.log.info("logging telemetry to " + telemetryLogPath);

        } catch (telemetryLogStreamErr) {
            that.log.error("error opening telemetry log stream: " + String(telemetryLogStreamErr));
        }

        // sqs event handler
        that.on("downloadAvailable", function (cb) {
            that.downloadAvailable(cb);
        });

        if (autoStartCb) {
            // if you didn't pass autoStart a callback, good luck finding out the instance metadata
            autoStartCb(null, instance);
        }
    },

    downloadAvailable: function (cb) {
        var that = this;

        that.sessionedSQS(function (sessionError, sqs) {
            if (sessionError) {
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

    receiveMessages: function (receiveMessageError, receiveMessages, cb) {
        var that = this;

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
            that.downloadWorkerPool.defer(function (completeCb) {
                that.transfersInProgress[message.ReceiptHandle] = new Date(); // should use that._stats here?
                /* cb *must* be called to signal queue job termination */
                that.processMessage(message, function () {
                    delete that.transfersInProgress[message.ReceiptHandle]; // should use that._stats here?
                    return completeCb();
                });
            });

            return;
        });

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
        var outputFile, messageBody, fn, folder, match, exit_status, file, rs, transferTimeout,
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

//        that.log.info("telemetry:" + JSON.stringify(messageBody.telemetry));

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
                    that.log.warn("error in readstream " + readStreamError); /* e.g. socket hangup */
                    try {
                        fs.unlink(outputFile); /* likely to be corrupt */
                    } catch (ignore) {
                    }

                    /* figure out how to cleanly requeue a download
                     * message - as soon as file is closed here it will
                     * call deleteMessage unrecoverably */
                    file.close();

                    /* must signal completion */
                    clearTimeout(transferTimeout);
                    return completeCb();
                });

                file.on("close", function (writeStreamError) {
                    if (writeStreamError) {
                        that.log.warn("error closing writestream " + writeStreamError);
                        /* should we bail and return completeCb() here? */
                    }

                    that.deleteMessage(message);

                    that.log.info("downloaded " + messageBody.path);

                    that._stats.download.success = that._stats.download.success ? that._stats.download.success + 1 : 1;

                    // MC-212 delete uploaded file on successful analysis
                    var fileFrom = path.join(_config.options.inputFolder, "uploaded", fn);

                    if (_config.options.deleteOnComplete === "on") {
                        fs.unlink(fileFrom, function (unlinkException) {
                            if (unlinkException) {
                                that.log.warn("unlinkException " + String(unlinkException));
                            }

                            that.log.info("deleted uploaded/" + fn + " as complete");
                        });
                    }

                    /* must signal completion */
                    clearTimeout(transferTimeout);
                    return completeCb();
                });

                transferTimeout = setTimeout(function () {
                    that.log.info("transfer timed out");
                    rs.emit("error", new Error("downloader: transfer timed out"));
                }, 300000); /* 5 minute timeout in ms */

                transferTimeout.id = fn;

                rs.pipe(file);
            });

        } else {
            /* skip download - only interested in telemetry */
            that.deleteMessage(message);

            that._stats.download.success = that._stats.download.success ? that._stats.download.success + 1 : 1; // hmm. not exactly "download", these

            /* must signal completion */
            return completeCb();
        }
    },

    enqueueUploadJob: function (item, requeue) {
        var that = this;

        if (requeue) {
            that.log.info("requeuing " + item);
        }

        that._stats.upload.enqueueCount = that._stats.upload.enqueueCount ? that._stats.upload.enqueueCount + 1 : 1;

        that.uploadWorkerPool.defer(function (completeCb) {
            that.queueLength(_config.instance.inputQueueURL, function (len) {
                that._stats.upload.queueLength = len;
            }); // async request for upload queue length

            that.uploadHandler(item, function (result) {
                if (isNaN(result)) {
                    if (!that._stats.upload.failure) {
                        that._stats.upload.failure = {};
                    }

                    that._stats.upload.failure[result] = that._stats.upload.failure[result] ? that._stats.upload.failure[result] + 1 : 1;

                } else {
                    that._stats.upload.success = that._stats.upload.success ? that._stats.upload.success + 1 : 1;
                }

                return completeCb();
            });
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

                that.log.warn("error in readstream: " + readStreamError);
                return successCb("readstream error"); // close the queue job
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
                            that.enqueueUploadJob(item, 1);
                            return successCb("upload error"); // close the queue job
                        }

                        that.uploadComplete(objectId, item, successCb);
                    });

                } catch (uploadStreamException) {
                    that.log.error("failed to upload: " + String(uploadStreamException));
                    that.enqueueUploadJob(item, 1);

                    return successCb("upload exception"); // close the queue job
                }
            });
        });
    },

    discoverQueue: function (sqs, queueName, successCb, failureCb) {
        var that = this;

        if (_config.instance._discoverQueueCache[queueName]) {
            return successCb(_config.instance._discoverQueueCache[queueName]);
        }

        that.log.info("discovering queue for " + queueName);

        try {
            sqs.getQueueUrl({ QueueName: queueName }, function (getQueueErr, getQueue) {
                if (getQueueErr) {
                    if (_config.options.proxy && (String(getQueueErr)).match(/Unexpected close tag/)) {
                        that.log.warn("error in getQueueUrl. Could be an aws-sdk/SSL/proxy compatibility issue");
                    }

                    that.log.warn("uploader: could not getQueueUrl: " + getQueueErr);
                    return failureCb("getqueueurl error");
                }

                that.log.info("found queue " + getQueue.QueueUrl);
                _config.instance._discoverQueueCache[queueName] = getQueue.QueueUrl;

                return successCb(getQueue.QueueUrl);
            });

        } catch (getQueueException) {
            that.log.error("exception in getQueueUrl: " + String(getQueueException));

            return failureCb("getqueueurl exception");
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
                function (err) {
                    that.enqueueUploadJob(item, 1);
                    return successCb(err);
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
                that.enqueueUploadJob(item, 1);

                return successCb("json exception"); // close the queue job
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
                    that.enqueueUploadJob(item, 1);

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
                        }

                        that.log.info("marked " + item + " as done");
                        return successCb(1); // close the queue job // SUCCESS
                    });
                });
            });

        } catch (sendMessageException) {
            that.log.error("exception sending message " + String(sendMessageException));
            that.enqueueUploadJob(item, 1);

            return successCb("sendmessage exception"); // close the queue job
        }
    },

    queueLength: function (queueURL, cb, forceUpdate) {
        var that      = this,
            now       = new Date(),
            queuename;

        if (queueURL &&
                (forceUpdate ||
                    (!_config.instance._queueLengthTimeStamps[queueURL] ||
                     _config.instance._queueLengthTimeStamps[queueURL] < now))) {

            _config.instance._queueLengthTimeStamps[queueURL] = now;
            _config.instance._queueLengthTimeStamps[queueURL].setMinutes(_config.instance._queueLengthTimeStamps[queueURL].getMinutes() + 1);
        } else {
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

//                        that.log.info("found queue length of " + queueURL + " = " + len); // + " querying again no sooner than " + _config.instance._queueLengthTimeStamps[queueURL]);
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
