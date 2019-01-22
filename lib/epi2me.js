/*
 * Copyright (c) 2018 Metrichor Ltd.
 * Author: rpettett
 * When: A long time ago, in a galaxy far, far away
 *
 */
/*global console */

import _        from "lodash";
import AWS      from "aws-sdk";
import fs       from "fs-extra"; /* MC-565 handle EMFILE & EXDIR gracefully; use Promises */
import os       from "os";
import path     from "path";
import proxy    from "proxy-agent";
import queue    from "queue-async";
import utils    from "./utils-fs";
import _REST    from "./rest-fs";
import defaults from "./default_options.json";

export const REST    = _REST;
export const version = require("../package.json").version;

export default class EPI2ME {
    constructor(opt_string) {
        let opts;
        if (typeof opt_string === "string" || (typeof opt_string === "object" && opt_string.constructor === String)) {
            opts = JSON.parse(opt_string);
        } else {
            opts = opt_string || {};
        }

        if (opts.log) {
            if (_.every([opts.log.info, opts.log.warn, opts.log.error], _.isFunction)) {
                this.log = opts.log;
            } else {
                throw new Error("expected log object to have \"error\", \"debug\", \"info\" and \"warn\" methods");
            }
        } else {
            this.log = {
                info:   (msg) => { console.log("["   + (new Date()).toISOString() + `] INFO: ${msg}`); },  // eslint-disable-line no-console
                debug:  (msg) => { console.debug("[" + (new Date()).toISOString() + `] DEBUG: ${msg}`); }, // eslint-disable-line no-console
                warn:   (msg) => { console.warn("["  + (new Date()).toISOString() + `] WARN: ${msg}`); },  // eslint-disable-line no-console
                error:  (msg) => { console.error("[" + (new Date()).toISOString() + `] ERROR: ${msg}`); }  // eslint-disable-line no-console
            };
        }

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
            },
            warnings: []
        };

        // if (opts.filter === 'on') defaults.downloadPoolSize = 5;

        this.config = {
            options: _.defaults(opts, defaults),
            instance: {
                id_workflow_instance : opts.id_workflow_instance,
                inputQueueName       : null,
                inputQueueURL        : null,
                outputQueueName      : null,
                outputQueueURL       : null,
                _discoverQueueCache  : {},
                bucket               : null,
                bucketFolder         : null,
                remote_addr          : null,
                chain                : null,
                key_id               : null
            }
        };

        this.config.instance.awssettings = {
            region: this.config.options.region
        };

        if (this.config.options.inputFolder) {
            if (this.config.options.uploadedFolder && this.config.options.uploadedFolder !== "+uploaded") {
                this.uploadTo = this.config.options.uploadedFolder;
            } else {
                this.uploadTo = path.join(this.config.options.inputFolder, "uploaded");
            }
            this.skipTo = path.join(this.config.options.inputFolder, "skip");
        }

        this.REST = new _REST(_.merge({}, {log: this.log}, this.config.options));
    }

    stop_everything(cb) {
        this.log.debug("stopping watchers");

        if (this._downloadCheckInterval) {
            this.log.debug("clearing _downloadCheckInterval interval");
            clearInterval(this._downloadCheckInterval);
            this._downloadCheckInterval = null;
        }

        if (this._stateCheckInterval) {
            this.log.debug("clearing stateCheckInterval interval");
            clearInterval(this._stateCheckInterval);
            this._stateCheckInterval = null;
        }

        if (this._fileCheckInterval) {
            this.log.debug("clearing _fileCheckInterval interval");
            clearInterval(this._fileCheckInterval);
            this._fileCheckInterval = null;
        }

        if (this.uploadWorkerPool) {
            this.log.debug("clearing uploadWorkerPool");
            this.uploadWorkerPool.drain();
            this.uploadWorkerPool = null;
        }

        if (this.downloadWorkerPool) {
            this.log.debug("clearing downloadWorkerPool");
            this.downloadWorkerPool.drain();
            this.downloadWorkerPool = null;
        }

        let id_workflow_instance = this.config.instance.id_workflow_instance;
        if (id_workflow_instance) {
            this.REST.stop_workflow(id_workflow_instance, () => {
                this.log.info(`workflow instance ${id_workflow_instance} stopped`);
                if (cb) cb(this);
            });
        } else {
            if (cb) cb(this);
        }
    }

    session(cb) {
        /* MC-1848 all session requests are serialised through that.sessionQueue to avoid multiple overlapping requests */
        if (!this.sessionQueue) {
            this.sessionQueue = queue(1);
        }

        if (!this._stats.sts_expiration ||
            (this._stats.sts_expiration
             && this._stats.sts_expiration <= Date.now() /* Ignore if session is still valid */
            && !this.sessionQueue.remaining())) {       /* Throttle to n=1: bail out if there's already a job queued */
            /* queue a request for a new session token and hope it comes back in under this.config.options.sessionGrace time */
            this.sessionQueue.defer(queueCb => {
                this.fetchInstanceToken(e => {
                    if (e) {
                        this.log.error(e);
                    }
                    queueCb();
                    if (cb) cb(e);
                });
            });
        } else if (cb) {
            cb();
        }

        /* carry on regardless. These will fail if the session does
         * expire and isn't refreshed in time - could consider
         * delaying them in those cases
         */
    }

    fetchInstanceToken(queueCb) {

        if (!this.config.instance.id_workflow_instance) {
            throw new Error("must specify id_workflow_instance");
        }

        if (this._stats.sts_expiration &&
            this._stats.sts_expiration > Date.now()) {
            /* escape if session is still valid */
            return queueCb();
        }

        this.log.debug("new instance token needed");

        this.REST.instance_token(this.config.instance.id_workflow_instance, (tokenError, token) => {
            if (tokenError) {
                this.log.warn("failed to fetch instance token: " + tokenError.error ? tokenError.error : tokenError);
                setTimeout(queueCb, 1000 * this.config.options.waitTokenError); /* delay this one 30 secs so we don't hammer the website */
                return;
            }

            this.log.debug("allocated new instance token expiring at " + token.expiration);
            this._stats.sts_expiration = new Date(token.expiration).getTime() - (60 * this.config.options.sessionGrace); // refresh token x mins before it expires
            // "classic" token mode no longer supported

            if (this.config.options.proxy) {
                AWS.config.update({
                    httpOptions: { agent: proxy(this.config.options.proxy, true) }
                });
            }

            // MC-5418 - This needs to be done before the process starts uploading messages!
            AWS.config.update(this.config.instance.awssettings);
            AWS.config.update(token);
            return queueCb();
        });
    }

    sessionedS3() {
        this.session();
        return new AWS.S3({
            useAccelerateEndpoint: this.config.options.awsAcceleration === "on"
        });
    }

    sessionedSQS() {
        this.session();
        return new AWS.SQS();
    }

    autoStart(workflow_config, cb) {
        this.REST.start_workflow(workflow_config, (workflowError, instance) => {
            if (workflowError) {
                let msg = "Failed to start workflow: " + (workflowError && workflowError.error ? workflowError.error : workflowError);
                this.log.warn(msg);
                if (cb) cb(msg);
                return;
            }
            this.config.workflow = JSON.parse(JSON.stringify(workflow_config));
            this.autoConfigure(instance, cb);
        });
    }

    autoJoin(id, cb) {
        this.config.instance.id_workflow_instance = id;

        this.REST.workflow_instance(id, (instanceError, instance) => {
            if (instanceError) {
                let msg = "Failed to join workflow instance: " + (instanceError && instanceError.error ? instanceError.error : instanceError);
                this.log.warn(msg);
                if (cb) cb(msg);
                return;
            }

            if (instance.state === "stopped") {
                this.log.warn("workflow " + id + " is already stopped");
                if (cb) cb("could not join workflow");
                return;
            }
            
            /* it could be useful to populate this as autoStart does */
            this.config.workflow = this.config.workflow || {};
            
            this.autoConfigure(instance, cb);
        });
    }

    autoConfigure(instance, autoStartCb) {
        let telemetryLogPath, telemetryLogFolder, fileName;

        /* region
         * id_workflow_instance
         * inputqueue
         * outputqueue
         * bucket
         * remote_addr
         * description (workflow)
         * chain
         */
        this.config.instance.id_workflow_instance = instance.id_workflow_instance;
        this.config.instance.id_workflow          = instance.id_workflow;
        this.config.instance.remote_addr          = instance.remote_addr;
        this.config.instance.key_id               = instance.key_id;
        this.config.instance.bucket               = instance.bucket;
        this.config.instance.inputQueueName       = instance.inputqueue;
        this.config.instance.outputQueueName      = instance.outputqueue;
        this.config.instance.awssettings.region   = instance.region || this.config.options.region;
        this.config.instance.bucketFolder         = instance.outputqueue + "/" + instance.id_user + "/" + instance.id_workflow_instance;
        this.config.instance.user_defined         = instance.user_defined; // MC-2387 - parameterisation

        if (instance.chain) {
            if (typeof instance.chain === "object") { // already parsed
                this.config.instance.chain = instance.chain;
            } else {
                try {
                    this.config.instance.chain = JSON.parse(instance.chain);
                } catch (jsonException) {
                    throw new Error("exception parsing chain JSON " + String(jsonException));
                }
            }
        }

        if (!this.config.options.inputFolder) throw new Error("must set inputFolder");
        if (!this.config.options.outputFolder) throw new Error("must set outputFolder");
        if (!this.config.instance.bucketFolder) throw new Error("bucketFolder must be set");
        if (!this.config.instance.inputQueueName) throw new Error("inputQueueName must be set");
        if (!this.config.instance.outputQueueName) throw new Error("outputQueueName must be set");

        fs.mkdirpSync(this.config.options.outputFolder);

        // MC-1828 - include instance id in telemetry file name
        fileName           = (this.config.instance.id_workflow_instance)
            ? `telemetry-${this.config.instance.id_workflow_instance}.log`
            : "telemetry.log";
        telemetryLogFolder = path.join(this.config.options.outputFolder, "epi2me-logs");
        telemetryLogPath   = path.join(telemetryLogFolder, fileName);

        fs.mkdirp(telemetryLogFolder, (mkdirException) => {
            if (mkdirException && !String(mkdirException).match(/EEXIST/)) {
                this.log.error("error opening telemetry log stream: mkdirpException:" + String(mkdirException));
            } else {
                try {
                    this.telemetryLogStream = fs.createWriteStream(telemetryLogPath, { flags: "a" });
                    this.log.info("logging telemetry to " + telemetryLogPath);
                } catch (telemetryLogStreamErr) {
                    this.log.error("error opening telemetry log stream: " + String(telemetryLogStreamErr));
                }
            }
        });

        this._uploadedFiles = []; // container for files that have been successfully uploaded, but failed to move
        if (autoStartCb) autoStartCb(null, this.config.instance);

        // MC-2068 - Don't use an interval.
        this._downloadCheckInterval = setInterval(this.loadAvailableDownloadMessages.bind(this), this.config.options.downloadCheckInterval * 1000);

        // MC-1795 - stop workflow when instance has been stopped remotely
        this._stateCheckInterval = setInterval(() => {
            this.REST.workflow_instance(this.config.instance.id_workflow_instance, (instanceError, instance) => {
                if (instanceError) {
                    this.log.warn("failed to check instance state: " + (instanceError && instanceError.error ? instanceError.error : instanceError));
                } else {
                    if (instance.state === "stopped") {
                        this.log.warn("instance was stopped remotely at " + instance.stop_date + ". shutting down the workflow.");
                        this.stop_everything((that) => {
                            if (typeof that.config.options.remoteShutdownCb === "function") {
                                that.config.options.remoteShutdownCb("instance was stopped remotely at " + instance.stop_date);
                            }
                        });
                    }
                }
            });
        }, this.config.options.stateCheckInterval * 1000);

        /* Request session token */
        this.session(() => {
            // MC-5418: ensure that the session has been established before starting the upload
            this.loadUploadFiles(); // Trigger once at workflow instance start
            this._fileCheckInterval = setInterval(this.loadUploadFiles.bind(this), this.config.options.fileCheckInterval * 1000);
        });
    }

    downloadWork(len, cb) {
        if (!cb) cb = () => { return; };
        if (len === undefined || len === null) return cb();

        this._stats.download.queueLength = len;

        if (len > 0) {
            /* only process downloads if there are downloads to process */
            this.log.debug(`downloads available: ${len}`);
            return this.downloadAvailable(cb);
        }

        this.log.debug("no downloads available");
        return cb();
    }

    loadAvailableDownloadMessages() {
        if (!this.queueLengthQueue) this.queueLengthQueue = queue(1);
        if (this.queueLengthQueue.remaining() > 0) {
            /* don't build up a backlog by queuing another job */
            return;
        }

        this.queueLengthQueue.defer((cb) => {
            let sqs = this.sessionedSQS(),
                queryQueueLength = () => {
                    this.queueLength(this.config.instance.outputQueueURL, len => this.downloadWork(len, cb));
                };

            if (this.config.instance.outputQueueURL) {
                queryQueueLength();
            } else {
                this.discoverQueue(sqs, this.config.instance.outputQueueName,
                    (queueURL) => {
                        this.config.instance.outputQueueURL = queueURL;
                        queryQueueLength();
                    },
                    (err) => {
                        this.log.warn("error looking up queue. " + String(err));
                        if (!this._stats.download.failure) this._stats.download.failure = {};
                        this._stats.download.failure[err] = this._stats.download.failure[err] ? this._stats.download.failure[err] + 1 : 1;
                        return cb();  // clear queueLengthQueue slot
                    });
            }
        });
    }

    downloadAvailable(cb) {
        let sqs = this.sessionedSQS(),
            downloadWorkerPoolRemaining = (this.downloadWorkerPool) ? this.downloadWorkerPool.remaining() : 0;

        if (!cb) cb = () => {};

        if (downloadWorkerPoolRemaining >= this.config.options.downloadPoolSize * 5) { /* ensure downloadPool is limited but fully utilised */
            this.log.debug(downloadWorkerPoolRemaining + " downloads already queued");
            return cb();
        }

        this.discoverQueue(sqs, this.config.instance.outputQueueName,
            (queueURL) => {
                this.log.debug("fetching messages");
                try {
                    sqs.receiveMessage({
                        AttributeNames: ["All"], // to check if the same message is received multiple times
                        QueueUrl:            queueURL,
                        VisibilityTimeout:   this.config.options.inFlightDelay,    // approximate time taken to pass/fail job before resubbing
                        MaxNumberOfMessages: this.config.options.downloadPoolSize, // MC-505 - download multiple threads simultaneously
                        WaitTimeSeconds:     this.config.options.waitTimeSeconds   // long-poll

                    }, (receiveMessageErr, receiveMessageSet) => {
                        this.receiveMessages(receiveMessageErr, receiveMessageSet, cb);
                    });

                } catch (receiveMessageErr) {
                    this.log.error("receiveMessage exception: " + String(receiveMessageErr));
                    return cb();
                }
            },
            (reason) => {
                this._stats.download.failure[reason] = this._stats.download.failure[reason] ? this._stats.download.failure[reason] + 1 : 1;
                return cb();
            });
    }

    loadUploadFiles() {
        /**
         * Entry point for new .fast5 files. Triggered on an interval
         *  - Scan the input folder files
         *      fs.readdir is resource-intensive if there are a large number of files
         *      It should only be triggered when needed
         *  - Push list of new files into uploadWorkerPool (that.enqueueFiles)
         */

        // const fileExp = new RegExp('\\.' + this.config.options.inputFormat + '$');   // only consider files with the specified extension
        const remaining = this.inputBatchQueue ? this.inputBatchQueue.remaining() : 0;

        // if remaining > 0, there are still files in the inputBatchQueue
        if (!this._dirScanInProgress && remaining === 0) {
            this.log.debug(`loadUploadFiles: ${remaining} batches in the inputBatchQueue`);
            this._dirScanInProgress = true;
            this.log.debug("scanning input folder for new files");
            utils.loadInputFiles(this.config.options, this.log)
                .then(files => {
                    this._dirScanInProgress = false;
                    if (files && files.length) {
                        this.enqueueUploadFiles(files);
                    }
                })
                .catch(err => {
                    this._dirScanInProgress = false;
                    this.log.error(err);
                });
        }
    }

    enqueueUploadFiles(files) {
        let maxFiles = 0, maxFileSize = 0, settings = {}, msg, attrs = {};
        
        if (!_.isArray(files) || !files.length) return;
        
        if (this.config.hasOwnProperty("workflow")) {
            if (this.config.workflow.hasOwnProperty("workflow_attributes")) {
                // started from GUI agent
                settings = this.config.workflow.workflow_attributes;
            } else {
                // started from CLI
                if (this.config.workflow.hasOwnProperty("attributes")) {
                    attrs = this.config.workflow.attributes;
                    if (attrs.hasOwnProperty("epi2me:max_size")) {
                        settings.max_size = parseInt(attrs["epi2me:max_size"]);
                    }
                    if (attrs.hasOwnProperty("epi2me:max_files")) {
                        settings.max_files = parseInt(attrs["epi2me:max_files"]);
                    }
                    if (attrs.hasOwnProperty("epi2me:category")) {
                        let epi2me_category = attrs["epi2me:category"];
                        if (epi2me_category.includes("storage")) {
                            settings.requires_storage = true;
                        }
                    }
                }
            }
        }
        if (settings.hasOwnProperty("requires_storage")) {
            if (settings.requires_storage) {
                if (! this.config.workflow.hasOwnProperty("storage_account")) {
                    msg = "ERROR: Workflow requires storage enabled. Please provide a valid storage account [ --storage ].";
                    this.log.error(msg);
                    this._stats.warnings.push(msg);
                    return;
                }
            }
        }

        if (settings.hasOwnProperty("max_size")) {
            maxFileSize = parseInt(settings.max_size);
        }

        if (settings.hasOwnProperty("max_files")) {
            maxFiles = parseInt(settings.max_files);
            if (files.length > maxFiles) {
                msg = "ERROR: " + files.length + " files found. Workflow can only accept " + maxFiles + ". Please move the extra files away.";
                this.log.error(msg);
                this._stats.warnings.push(msg);
                return;
            }
        }
        
        this.log.info(`enqueueUploadFiles: ${files.length} new files`);
        this.inputBatchQueue = queue(1);
        
        this._stats.upload.filesCount = this._stats.upload.filesCount ? this._stats.upload.filesCount + files.length : files.length;
     
        if (this.config.options.filetype === ".fastq" || this.config.options.filetype === ".fq") {
            this.inputBatchQueue.defer(batch_complete => {
                let uploadWorkerPool = queue(this.config.options.uploadPoolSize);
                let statQ = queue(1);
                this.log.debug("enqueueUploadFiles.countFileReads: counting FASTQ reads per file");

                files.forEach(file => {
                    if (maxFiles && (this._stats.upload.filesCount > maxFiles)) {   
                        msg = "Maximum " + maxFiles + " file(s) already uploaded. Moving " + file.name + " into skip folder";
                        this.log.error(msg);
                        this._stats.warnings.push(msg);
                        this._stats.upload.filesCount -=1;
                        file.skip = "SKIP_TOO_MANY";
                        uploadWorkerPool.defer(this.uploadJob.bind(this, file));
                        return;

                    } else if (maxFileSize && (file.size > maxFileSize)) {
                        msg = file.name + " is over " + maxFileSize.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")+ ". Moving into skip folder";
                        file.skip = "SKIP_TOO_BIG";
                        this._stats.upload.filesCount -= 1;
                    
                        this.log.error(msg);
                        this._stats.warnings.push(msg);
                        uploadWorkerPool.defer(this.uploadJob.bind(this, file));
                        return;
                    } 
                    
                    statQ.defer(releaseQSlot => {
                        utils.countFileReads(file.path)
                            .then((count) => {
                                file.readCount = count;
                                this._stats.upload.enqueued += count;
                                this._stats.upload.readsCount = this._stats.upload.readsCount ? this._stats.upload.readsCount + count : count;
                                uploadWorkerPool.defer(this.uploadJob.bind(this, file));
                                releaseQSlot();
                            })
                            .catch(err => {
                                this.log.error("statQ, countFileReads " + err);
                                releaseQSlot();
                            });
                    });
                });

                statQ.awaitAll(() => {
                    this.log.debug(`enqueueUploadFiles.enqueued: ${this._stats.upload.enqueued}`);
                    uploadWorkerPool.awaitAll(batch_complete);
                });
            });

        } else {
            this._stats.upload.enqueued += files.length;
            this.inputBatchQueue.defer(batch_complete => {
                let uploadWorkerPool = queue(this.config.options.uploadPoolSize);
                files.forEach(item => {
                    if (maxFiles && (this._stats.upload.filesCount > maxFiles)) {   
                        msg = "Maximum " + maxFiles + " file(s) already uploaded. Moving " + item.name + " into skip folder";
                        this.log.error(msg);
                        this._stats.warnings.push(msg);
                        this._stats.upload.filesCount -=1;
                        item.skip = "SKIP_TOO_MANY";

                    } else if (maxFileSize && (item.size > maxFileSize)) {
                        msg = item.name + " is over " + maxFileSize.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")+ ". Moving into skip folder";
                        this.log.error(msg);
                        this._stats.warnings.push(msg);
                        this._stats.upload.filesCount -=1;
                        item.skip = "SKIP_TOO_BIG";
                    }

                    uploadWorkerPool.defer((completeCb) => {
                        this.uploadJob(item, completeCb);
                    });
                });

                uploadWorkerPool.awaitAll(batch_complete);
            });
        }

        this.inputBatchQueue.awaitAll(() => {
            this.log.info("inputBatchQueue slot released. trigger loadUploadFiles");
            this.loadUploadFiles(); // immediately load more files!
        });
    }

    uploadJob(file, completeCb) {
        // Initiate file upload to S3
        try {
            this.log.info(JSON.stringify(file));
        } catch (e) {
            this.log.error(`${file.id} could not stringify fileObject!`);
        } // ignore
        
        if (file.hasOwnProperty("skip")) {
            let readCount = file.readCount || 1;
            this._stats.upload.enqueued = this._stats.upload.enqueued - readCount ;
            this._stats.upload.queueLength = this._stats.upload.queueLength ? this._stats.upload.queueLength - readCount : 0;
            this._moveSkippedFile(file, completeCb);
            return;
        }
        
        this.uploadHandler(file, (errorMsg, file) => {
            if (errorMsg) {
                this.log.info(`${file.id} done, but failed: ${String(errorMsg)}`);
            } else {
                this.log.info(`${file.id} completely done. releasing uploadWorkerPool queue slot`);
            }
            setTimeout(completeCb); // Release uploadWorkerPool queue slot

            let readCount = file.readCount || 1;
            this._stats.upload.enqueued = this._stats.upload.enqueued - readCount;

            if (errorMsg) {
                this.log.error(`uploadHandler ${errorMsg}`);
                if (!this._stats.upload.failure) {
                    this._stats.upload.failure = {};
                }

                this._stats.upload.failure[errorMsg] = this._stats.upload.failure[errorMsg] ? this._stats.upload.failure[errorMsg] + 1 : 1;

            } else {
                this._stats.upload.queueLength = this._stats.upload.queueLength ? this._stats.upload.queueLength - readCount : 0;
                this._stats.upload.success     = this._stats.upload.success     ? this._stats.upload.success     + readCount : readCount;
            }
        });
    }

    receiveMessages(receiveMessageError, receiveMessages, cb) {
        if (!cb) {
            cb = () => { return undefined; };
        }

        if (receiveMessageError) {
            this.log.warn("error in receiveMessage " + String(receiveMessageError));
            return cb();
        }

        if (!receiveMessages ||
            !receiveMessages.Messages ||
            !receiveMessages.Messages.length) {
            /* no work to do */
            this.log.info("complete (empty)");

            return cb();
        }

        if (!this.downloadWorkerPool) {
            this.downloadWorkerPool = queue(this.config.options.downloadPoolSize);
        }

        receiveMessages.Messages.forEach(message => {
            this.downloadWorkerPool.defer(queueCb => {
                /* queueCb *must* be called to signal queue job termination */
                let timeoutHandle;
                const done = () => {
                    clearTimeout(timeoutHandle);
                    setTimeout(queueCb); // MC-5459 - setTimeout to clear callstack
                };

                // timeout to ensure this queueCb *always* gets called
                timeoutHandle = setTimeout(() => {
                    done();
                    this.log.error("this.downloadWorkerPool timeoutHandle. Clearing queue slot for message: " + message.Body);
                }, (60 + this.config.options.downloadTimeout) * 1000);
                setTimeout(() => this.processMessage(message, done));
            });
        });

        this.log.info("downloader queued " + receiveMessages.Messages.length + " files for download");
        return cb();
    }

    deleteMessage(message) {
        let sqs = this.sessionedSQS();

        this.discoverQueue(sqs, this.config.instance.outputQueueName,
            (queueURL) => {
                try {
                    sqs.deleteMessage({
                        QueueUrl:      queueURL,
                        ReceiptHandle: message.ReceiptHandle

                    }, (deleteMessageError) => {
                        if(deleteMessageError) {
                            this.log.warn("error in deleteMessage " + String(deleteMessageError));
                        }
                    });

                } catch (deleteMessageException) {
                    this.log.error("deleteMessage exception: " + String(deleteMessageException));
                }
            },
            (reason) => {
                this._stats.download.failure[reason] = this._stats.download.failure[reason] ? this._stats.download.failure[reason] + 1 : 1;
            });
    }

    processMessage(message, completeCb) {
        let outputFile, messageBody, fn, folder, match, s3, that = this;

        const writeTelemetry = (telemetry) => {
            try {
                this.telemetryLogStream.write(JSON.stringify(telemetry) + os.EOL);
            } catch (telemetryWriteErr) {
                this.log.error("error writing telemetry: " + telemetryWriteErr);
            }
            if (that.config.options.telemetryCb) {
                this.config.options.telemetryCb(telemetry);
            }
        };

        if (!message) {
            this.log.debug("download.processMessage: empty message");
            return completeCb();
        }
        
        if ("Attributes" in message) {
            if ("ApproximateReceiveCount" in message.Attributes) {
                this.log.info("download.processMessage : " + message.MessageId + " / " + message.Attributes.ApproximateReceiveCount);
            } else {
                this.log.info("download.processMessage : " + message.MessageId + " / NA ");
            }
        }
        try {
            messageBody = JSON.parse(message.Body);
        } catch (jsonError) {
            this.log.error("error parsing JSON message.Body from message: " + JSON.stringify(message) + " " + String(jsonError));
            this.deleteMessage(message);
            return completeCb();
        }

        /* MC-405 telemetry log to file */
        if (messageBody.telemetry) {
            let telemetry = messageBody.telemetry;
            if (telemetry.tm_path) {
                this.sessionedS3()
                    .getObject({
                        Bucket: messageBody.bucket,
                        Key: telemetry.tm_path
                    }, (err, data) => {
                        if (err) {
                            this.log.error("Could not fetch telemetry JSON: " + err.message);
                            writeTelemetry(telemetry);
                        } else {
                            telemetry.batch = data.Body.toString("utf-8")
                                .split("\n")
                                .filter(d => d && d.length > 0)
                                .map(row => {
                                    try {
                                        return JSON.parse(row);
                                    } catch (e) {
                                        this.log.error("Telemetry Batch JSON Parse error: " + e.message);
                                        return row;
                                    }
                                });
                            writeTelemetry(telemetry);
                        }
                    });
            } else {
                writeTelemetry(telemetry);
            }
        }

        if (!messageBody.path) {
            this.log.warn("invalid message: " + JSON.stringify(messageBody));
            return;
        }

        match      = messageBody.path.match(/[\w\W]*\/([\w\W]*?)$/);
        fn         = match ? match[1] : "";
        folder     = this.config.options.outputFolder;

        if (this.config.options.filter === "on") {
            /* MC-940: use folder hinting if present */
            if (messageBody.telemetry &&
                messageBody.telemetry.hints &&
                messageBody.telemetry.hints.folder) {
                this.log.debug("using folder hint " + messageBody.telemetry.hints.folder);
                // MC-4987 - folder hints may now be nested.
                // eg: HIGH_QUALITY/CLASSIFIED/ALIGNED
                // or: LOW_QUALITY
                let codes = messageBody
                    .telemetry
                    .hints
                    .folder
                    .split("/") // hints are always unix-style
                    .map((o) => { return o.toUpperCase(); }); // MC-5612 cross-platform uppercase "pass" folder
                folder = path.join.apply(null, [ folder, ...codes ]);
            }
        }

        if (this.config.options.filetype === ".fast5") {
            // MC-5240: .fast5 files always need to be batched
            // eg: HIGH_QUALITY/CLASSIFIED/ALIGNED/BATCH-1
            folder = utils.findSuitableBatchIn(folder);
        }

        fs.mkdirpSync(folder);
        outputFile = path.join(folder, fn);

        if (this.config.options.downloadMode === "data+telemetry") {
            /* download file from S3 */
            this.log.info("downloading " + messageBody.path + " to " + outputFile);

            s3 = this.sessionedS3();
            this._initiateDownloadStream(s3, messageBody, message, outputFile, completeCb);

        } else if (this.config.options.downloadMode === "telemetry") {
            /* skip download - only interested in telemetry */
            this.deleteMessage(message);

            let readCount = messageBody.telemetry.batch_summary && messageBody.telemetry.batch_summary.reads_num ?
                messageBody.telemetry.batch_summary.reads_num : 1;

            this._stats.download.success = this._stats.download.success ? this._stats.download.success + readCount : readCount; // hmm. not exactly "download", these

            /* must signal completion */
            return completeCb();
        }
    }

    _initiateDownloadStream(s3, messageBody, message, outputFile, completeCb) {

        let file,
            transferTimeout,
            visibilityInterval,
            rs;

        const deleteFile = () => {
            // cleanup on exception
            if (this.config.options.filter !== "on") {
                return;
            }

            // don't delete the file if the stream is in append mode
            // ideally the file should be restored to it's original state
            // if the write stream has already written data to disk, the downloaded dataset would be inaccurate
            //
            try {
                // if (file && file.bytesWritten > 0)
                fs
                    .remove(outputFile, (err) => {
                        if (err) {
                            this.log.warn("failed to remove file: " + outputFile);
                        } else {
                            this.log.warn("removed failed download file: " + outputFile + " " + err);
                        }
                    });
            } catch (unlinkException) {
                this.log.warn("failed to remove file. unlinkException: " + outputFile + " " + String(unlinkException));
            }
        };

        const onStreamError = () => {
            if (!file._networkStreamError) {
                try {
                    file._networkStreamError = 1; /* MC-1953 - signal the file end of the pipe this the network end of the pipe failed */
                    file.close();
                    deleteFile();
                    if (rs.destroy) { //&& !rs.destroyed) {
                        this.log.error("destroying readstream for " + outputFile);
                        rs.destroy();
                    }
                } catch (err) {
                    this.log.error("error handling sream error: " + err.message);
                }
            }
        };

        try {
            let params = {
                Bucket: messageBody.bucket,
                Key:    messageBody.path
            };

            if (this.config.instance.key_id) {
                // MC-4996 support (optional, for now) encryption
                /* Apparently putting these parameters in for download results in errors like this:
                 * UnexpectedParameter: Unexpected key 'SSEKMSKeyId' found in params
                 * UnexpectedParameter: Unexpected key 'ServerSideEncryption' found in params

                 params.SSEKMSKeyId          = this.config.instance.key_id;
                 params.ServerSideEncryption = "aws:kms";
                */
            }

            // MC-6270 : disable append to avoid appending the same data 
            // file = fs.createWriteStream(outputFile, { "flags": "a" });
            file = fs.createWriteStream(outputFile);
            let req = s3.getObject(params);

            /* track request/response bytes expected
            req.on('httpHeaders', (status, headers, response) => {
                this._stats.download.totalBytes += parseInt(headers['content-length']);
            });
            */

            rs   = req.createReadStream();

        } catch (getObjectException) {
            this.log.error("getObject/createReadStream exception: " + String(getObjectException));
            if (completeCb) completeCb();
            return;
        }

        rs.on("error", (readStreamError) => {
            this.log.error("error in download readstream " + readStreamError); /* e.g. socket hangup */
            try {
                onStreamError();
            } catch (e) {
                this.log.error("error handling readStreamError: " + e);
            }
        });

        file.on("finish", () => {
            if (!file._networkStreamError) {
                // SUCCESS
                this.log.debug("downloaded " + outputFile);

                let readCount = messageBody.telemetry && messageBody.telemetry.batch_summary && messageBody.telemetry.batch_summary.reads_num ?
                    messageBody.telemetry.batch_summary.reads_num :
                    1;

                if (!this._stats.download.success) {
                    this._stats.download.success = readCount;
                } else {
                    this._stats.download.success += readCount;
                }

                // MC-1993 - store total size of downloaded files
                setTimeout(() => {
                    fs.stat(outputFile, (err, stats) => {
                        if (err) {
                            this.log.warn("failed to fs.stat file: " + err);
                        } else if (stats && stats.size) {
                            // doesn't make sense if file already exists...
                            this._stats.download.totalSize += stats.size;
                            // MC-2540 : if there is some postprocessing to do( e.g fastq extraction) - call the dataCallback
                            // dataCallback might depend on the exit_status ( e.g. fastq can only be extracted from successful reads )
                        }
                    });
                });

                try {
                    const logStats = () => {
                        this.log.info("Uploads: " + JSON.stringify(this._stats.upload));
                        this.log.info("Downloads: " + JSON.stringify(this._stats.download));
                    };

                    if (this.config.options.filetype === ".fastq" || this.config.options.filetype === ".fq") {
                        // files may be appended, so can't increment the totalSize
                        if (!this._downloadedFileSizes) this._downloadedFileSizes = {};
                        fs.stat(outputFile)
                            .then(stats => stats.size || 0)
                            .then(size => {
                                this._downloadedFileSizes[outputFile] = size;
                                this._stats.download.totalSize = _.chain(this._downloadedFileSizes).values().sum().value();
                                logStats();
                            })
                            .catch(err => this.log.error("finish, getFileSize (fastq) " + err));
                    } else {
                        utils.getFileSize(outputFile)
                            .then(stats => stats.size || 0)
                            .then(size => {
                                this._stats.download.totalSize += size;
                                logStats();
                            })
                            .catch(err => this.log.error("finish, getFileSize (other) " + err));
                    }

                    // MC-2540 : if there is some postprocessing to do( e.g fastq extraction) - call the dataCallback
                    // dataCallback might depend on the exit_status ( e.g. fastq can only be extracted from successful reads )
                    let exit_status = messageBody.telemetry && messageBody.telemetry.json ? messageBody.telemetry.json.exit_status : false;
                    if (exit_status && this.config.options.dataCb) {
                        this.config.options.dataCb(outputFile, exit_status);
                    }
                } catch (err) {
                    this.log.warn("failed to fs.stat file: " + err);
                }
                this.deleteMessage(message); /* MC-1953 - only delete message on condition neither end of the pipe failed */
            }
        });

        file.on("close", (writeStreamError) => {
            this.log.debug("closing writeStream " + outputFile);
            if (writeStreamError) {
                this.log.error("error closing writestream " + writeStreamError);
                /* should we bail and return completeCb() here? */
            }

            /* must signal completion */
            clearTimeout(transferTimeout);
            clearInterval(visibilityInterval);
            // MC-2143 - check for more jobs
            setTimeout(this.loadAvailableDownloadMessages.bind(this));
            completeCb();
        });

        file.on("error", (writeStreamError) => {
            this.log.error("error in download write stream " + writeStreamError);
            onStreamError();
        });

        const transferTimeoutFunc = () => {
            this.log.warn("transfer timed out");
            onStreamError();
        };
        transferTimeout = setTimeout(transferTimeoutFunc, 1000 * this.config.options.downloadTimeout); /* download stream timeout in ms */

        const updateVisibilityFunc = () => {
            const queueUrl      = this.config.instance.outputQueueURL;
            const receiptHandle = message.ReceiptHandle;

            this.log.debug({message_id: message.MessageId}, "updateVisibility");

            this.sqs.changeMessageVisibility({
                QueueUrl:          queueUrl,
                ReceiptHandle:     receiptHandle,
                VisibilityTimeout: this.config.options.inFlightDelay,
            }, (err, data) => {
                if (err) {
                    this.log.error({message_id: message.MessageId, queue: queueUrl, error: err, data: data}, "Error setting visibility");
                    clearInterval(visibilityInterval);
                }
            });
        };
        visibilityInterval = setInterval(updateVisibilityFunc, 900 * this.config.options.inFlightDelay); /* message in flight timeout in ms, less 10% */

        rs
            .on("data", () => {
                //bytesLoaded += chunk.length;
                clearTimeout(transferTimeout);
                transferTimeout = setTimeout(transferTimeoutFunc, 1000 * this.config.options.downloadTimeout); /* download stream timeout in ms */
                //                this.log.debug(`downloaded ${chunk.length} bytes. resetting transferTimeout`);
            })
            .pipe(file); // initiate download stream
    }

    uploadHandler(file, completeCb) {
        /** open readStream and pipe to S3.upload */
        let s3 = this.sessionedS3(),
            rs,
            batch = file.batch || "",
            fileId   = path.join(this.config.options.inputFolder, batch, file.name),
            objectId = this.config.instance.bucketFolder + "/component-0/" + file.name + "/" + file.name,
            timeoutHandle,
            completed = false;

        const done = (err) => {
            if (!completed) {
                completed = true;
                clearTimeout(timeoutHandle);
                completeCb(err, file);
            }
        };

        // timeout to ensure this completeCb *always* gets called
        timeoutHandle = setTimeout(() => {
            if (rs && !rs.closed) rs.close();
            done("this.uploadWorkerPool timeoutHandle. Clearing queue slot for file: " + file.name);
        }, (this.config.options.uploadTimeout + 5) * 1000);

        try {
            rs = fs.createReadStream(fileId);
        } catch (createReadStreamException) {
            return done("createReadStreamException exception" + String(createReadStreamException)); // close the queue job
        }

        rs.on("error", (readStreamError) => {
            rs.close();
            let errstr = "error in upload readstream";
            if (readStreamError && readStreamError.message) {
                errstr += ": " + readStreamError.message;
            }
            done(errstr);
        });

        rs.on("open", () => {
            let params = {
                    Bucket: this.config.instance.bucket,
                    Key:    objectId,
                    Body:   rs
                }, options = { partSize: 10 * 1024 * 1024, queueSize: 1};

            if (this.config.instance.key_id) {
                // MC-4996 support (optional, for now) encryption
                params.SSEKMSKeyId          = this.config.instance.key_id;
                params.ServerSideEncryption = "aws:kms";
            }

            if (file.size) {
                params["Content-Length"] = file.size;
            }

            let managedupload = s3.upload(params, options, (uploadStreamErr) => {
                if (uploadStreamErr) {
                    this.log.warn(`${file.id} uploadStreamError ${uploadStreamErr}`);
                    return done("uploadStreamError " + String(uploadStreamErr)); // close the queue job
                }
                this.log.info(`${file.id} S3 upload complete`);
                this.uploadComplete(objectId, file, done);
                rs.close();
            });

            managedupload.on("httpUploadProgress", (progress) => {
                // MC-6789 - reset upload timeout
                this.log.debug(`upload progress ${progress.key} ${progress.loaded} / ${progress.total}`);

                clearTimeout(timeoutHandle);
                timeoutHandle = setTimeout(() => {
                    if (rs && !rs.closed) rs.close();
                    done("this.uploadWorkerPool timeoutHandle. Clearing queue slot for file: " + file.name);
                }, (this.config.options.uploadTimeout + 5) * 1000);
            });
        });

        rs.on("end", rs.close);
        rs.on("close", () => this.log.debug("closing readstream"));
    }

    discoverQueue(sqs, queueName, successCb, failureCb) {

        if (this.config.instance._discoverQueueCache[queueName]) {
            if (successCb) successCb(this.config.instance._discoverQueueCache[queueName]);
            return;
        }

        this.log.debug("discovering queue for " + queueName);
        sqs.getQueueUrl({ QueueName: queueName }, (getQueueErr, getQueue) => {
            if (getQueueErr) {
                if (this.config.options.proxy && (String(getQueueErr)).match(/Unexpected close tag/)) {
                    this.log.warn("error in getQueueUrl. Could be an aws-sdk/SSL/proxy compatibility issue");
                }
                this.log.warn("uploader: could not getQueueUrl: " + getQueueErr);
                if (failureCb) failureCb("getqueueurl error");
                return;
            }

            if (!getQueue || !getQueue.QueueUrl) return failureCb ? failureCb("getqueueurl error") : null;

            this.log.debug("found queue " + getQueue.QueueUrl);
            this.config.instance._discoverQueueCache[queueName] = getQueue.QueueUrl;
            if (successCb) successCb(getQueue.QueueUrl);
        });
    }

    uploadComplete(objectId, file, successCb) {
        let sqs = this.sessionedSQS();
        this.log.info(`${file.id} uploaded to S3: ${objectId}`);

        if (this.config.instance.inputQueueURL) {
            return this.sendMessage(sqs, objectId, file, successCb);
        }

        this.discoverQueue(sqs, this.config.instance.inputQueueName,
            (queueURL) => {
                this.config.instance.inputQueueURL = queueURL;
                return this.sendMessage(sqs, objectId, file, successCb);
            },
            (discoverQueueErr) => {
                this.log.warn(`${file.id} discoverQueueErr: ${discoverQueueErr}`);
                successCb(discoverQueueErr);
            });
    }

    sendMessage(sqs, objectId, file, successCb) {
        this.log.info(`${file.id} sending SQS message to input queue`);

        let message = {
            bucket:               this.config.instance.bucket,
            outputQueue:          this.config.instance.outputQueueName,
            remote_addr:          this.config.instance.remote_addr,
            user_defined:         this.config.instance.user_defined || null, // MC-2397 - bind paramthis.config to each sqs message
            apikey:               this.config.options.apikey,
            id_workflow_instance: this.config.instance.id_workflow_instance,
            id_master:            this.config.instance.id_workflow,
            utc:                  new Date().toISOString(),
            path:                 objectId,
            prefix:               objectId.substring(0, objectId.lastIndexOf("/"))
        };

        if (this.config.instance.chain) {
            try {
                message.components        = JSON.parse(JSON.stringify(this.config.instance.chain.components)); // low-frills object clone
                message.targetComponentId = this.config.instance.chain.targetComponentId; // first component to run
            } catch (jsonException) {
                this.log.error(`${file.id} exception parsing components JSON ${String(jsonException)}`);
                return successCb("json exception");// close the queue job
            }
        }

        // MC-5943 support (optional, for now) #SSE #crypto!
        if (this.config.instance.key_id) {
            message.key_id = this.config.instance.key_id;
        }

        // MC-1304 - attach geo location and ip
        try {
            if (this.config.options.agent_address) message.agent_address = JSON.parse(this.config.options.agent_address);
        } catch (exception) {
            this.log.error(`${file.id} Could not parse agent_address ${String(exception)}`);
        }

        if (message.components) {
            // optionally populate input + output queues
            Object.keys(message.components).forEach((o) => {
                if (message.components[o].inputQueueName === "uploadMessageQueue") {
                    message.components[o].inputQueueName = this.uploadMessageQueue;
                }
                if (message.components[o].inputQueueName === "downloadMessageQueue") {
                    message.components[o].inputQueueName = this.downloadMessageQueue;
                }
            });
        }

        try {
            sqs.sendMessage({
                QueueUrl:    this.config.instance.inputQueueURL,
                MessageBody: JSON.stringify(message)
            }, (sendMessageError) => {
                if (sendMessageError) {
                    this.log.warn(`${file.id} error sending SQS message: ${String(sendMessageError)}`);
                    return successCb("SQS sendmessage error"); // close the queue job
                }
                this.log.info(`${file.id} SQS message sent. Move to uploaded`);
                this._moveUploadedFile(file, successCb);
            });
        } catch (sendMessageException) {
            this.log.error(`${file.id} exception sending SQS message: ${String(sendMessageException)}`);
            return successCb("SQS sendmessage exception"); // close the queue job
        }
    }

    async _moveFile(file, successCb, type) {
        let moveTo    = (type === "upload") ? this.uploadTo : this.skipTo;
        let fileName  = file.name;
        let fileBatch = file.batch || "";
        let fileFrom  = file.path  || path.join(this.config.options.inputFolder, fileBatch, fileName);
        let fileTo    = path.join(moveTo, fileBatch, fileName);
        let err       = "";

        await fs
            .mkdirp(path.join(moveTo, fileBatch))
            .then(async () => {
                await fs
                    .move(fileFrom, fileTo)
                    .then(() => {
                        this.log.debug(`${file.id}: ${type} and mv done`);
                    })
                    .catch((moveError) => {
                        err = `${file.id} ${type} move error: ${String(moveError)}`;
                    });
            })
            .catch((mkdirpException) => {
                err = `${file.id} ${type} mkdirp exception ${String(mkdirpException)}`;
            });

        if(type === "upload") {
            this._stats.upload.totalSize += file.size;
        }
        this._uploadedFiles.push(fileName); // flag as uploaded to prevent multiple uploads

        if(!err) {
            return successCb();
        }

        this.log.debug(err);

        await fs
            .remove(fileTo)
            .catch((unlinkError) => {
                this.log.warn(`${file.id} {$type} failed to delete ${fileTo}: ${String(unlinkError)}`);
            });

        return successCb(err);
    }

    _moveSkippedFile(file, successCb) {
        return this._moveFile(file, successCb, "skip");
    }

    _moveUploadedFile(file, successCb) {
        return this._moveFile(file, successCb, "upload");
    }

    queueLength(queueURL, cb) {
        let sqs = this.sessionedSQS(),
            queuename;

        if (!cb) cb = () => { return; };
        if (!queueURL) return cb();

        queuename = queueURL.match(/([\w\-_]+)$/)[0];
        this.log.debug("querying queue length of " + queuename);

        try {
            sqs.getQueueAttributes({
                QueueUrl:       queueURL,
                AttributeNames: ["ApproximateNumberOfMessages"]

            }, (attrErr, attrs) => {
                if (attrErr) {
                    this.log.warn("error in getQueueAttributes: " + String(attrErr));
                    return cb();
                }

                if (attrs && attrs.Attributes && attrs.Attributes.hasOwnProperty("ApproximateNumberOfMessages")) {
                    let len = attrs.Attributes.ApproximateNumberOfMessages;
                    len = isNaN(len) ? 0 : parseInt(len, 10);
                    return cb(len);
                }
            });
        } catch (getQueueAttrException) {
            this.log.error("error in getQueueAttributes " + String(getQueueAttrException));
            return cb();
        }
    }

    url() {
        return this.config.options.url;
    }

    apikey() {
        return this.config.options.apikey;
    }

    attr(key, value) {
        if (this.config.options.hasOwnProperty(key)) {
            if (value) {
                this.config.options[key] = value;
            } else {
                return this.config.options[key];
            }
        } else {
            throw new Error("config object does not contain property " + key);
        }
        return this;
    }

    stats(key) {
        if (this._stats[key]) {
            this._stats[key].queueLength = isNaN(this._stats[key].queueLength) ? 0 : this._stats[key].queueLength; // a little housekeeping
            // 'total' is the most up-to-date measure of the total number of reads to be uploaded
            if (key === "upload" && this._uploadedFiles && this._stats.upload) {
                this._stats.upload.total = this._uploadedFiles.length + this._stats.upload.enqueued + this._stats.upload.success;
            }
        }
        return this._stats[key];
    }
}
