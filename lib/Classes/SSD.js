var EventEmitter, SSD, WatchJS, async, chokidar, completeBatch, fast5, fs, isBatch, isPartial, isProcessing, mkdirp, mv, partialBatch, path,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

fs = require('fs.extra');

mv = require('mv');

mkdirp = require('mkdirp');

path = require('path');

chokidar = require('chokidar');

async = require('async');

EventEmitter = require('events').EventEmitter;

WatchJS = require("watchjs");

fast5 = function(item) {
  return item.slice(-6) === '.fast5';
};

isBatch = function(item) {
  return item.slice(0, 6) === 'batch_';
};

isProcessing = function(item) {
  return item.slice(-11) === '.processing';
};

isPartial = function(item) {
  return item.slice(-8) === '_partial' || isProcessing(item);
};

completeBatch = function(item) {
  return isBatch(item) && !isPartial(item);
};

partialBatch = function(item) {
  return isBatch(item) && isPartial(item);
};

SSD = (function(superClass) {
  extend(SSD, superClass);

  function SSD(options) {
    this.options = options;
    this.removeEmptyBatch = bind(this.removeEmptyBatch, this);
    this.saveDownloadedFile = bind(this.saveDownloadedFile, this);
    this.moveUploadedFile = bind(this.moveUploadedFile, this);
    this.batchSize = 100;
    this.isRunning = false;
    this.sub = {
      pending: path.join(this.options.inputFolder, 'pending'),
      uploaded: path.join(this.options.inputFolder, 'uploaded'),
      upload_failed: path.join(this.options.inputFolder, 'upload_failed')
    };
  }

  SSD.prototype.start = function(done) {
    debugger;
    var key, ref, value;
    if (this.isRunning) {
      return typeof done === "function" ? done(new Error("Directory already started")) : void 0;
    }
    ref = this.sub;
    for (key in ref) {
      value = ref[key];
      mkdirp(value);
    }
    return this.initialStats((function(_this) {
      return function(error) {
        if (error) {
          return typeof done === "function" ? done(error) : void 0;
        }
        return _this.convertToBatches(true, function(error) {
          _this.watcher = chokidar.watch(_this.options.inputFolder, {
            depth: 0,
            ignoreInitial: true
          });
          _this.watcher.on('add', function(path) {
            _this.stats.pending += 1;
            if (_this.isBatching) {
              return;
            }
            _this.isBatching = true;
            return _this.convertToBatches(true, function(error) {
              return _this.isBatching = false;
            });
          });
          _this.isRunning = true;
          return typeof done === "function" ? done() : void 0;
        });
      };
    })(this));
  };

  SSD.prototype.initialStats = function(done) {
    this.stats = {};
    return fs.readdir(this.sub.pending, (function(_this) {
      return function(error, pending) {
        return fs.readdir(_this.sub.uploaded, function(error, uploaded) {
          return fs.readdir(_this.sub.upload_failed, function(error, upload_failed) {
            return fs.readdir(_this.options.inputFolder, function(error, inputFolder) {
              return fs.readdir(_this.options.outputFolder, function(error, outputFolder) {
                var batched, i, len, location, partial, ref, total;
                batched = pending.filter(completeBatch).length * _this.batchSize;
                _this.stats = {
                  pending: batched + inputFolder.filter(fast5).length,
                  uploaded: uploaded.filter(fast5).length,
                  upload_failed: upload_failed.filter(fast5).length,
                  downloaded: outputFolder.filter(fast5).length
                };
                ref = pending.filter(partialBatch);
                for (i = 0, len = ref.length; i < len; i++) {
                  partial = ref[i];
                  location = path.join(_this.sub.pending, partial);
                  _this.stats.pending += fs.readdirSync(location).filter(fast5).length;
                }
                total = _this.stats.pending + _this.stats.uploaded + _this.stats.upload_failed;
                _this.stats.total = total;
                WatchJS.watch(_this.stats, function() {
                  return _this.emit('progress');
                });
                return typeof done === "function" ? done(false) : void 0;
              });
            });
          });
        });
      };
    })(this));
  };

  SSD.prototype.convertToBatches = function(enforceBatchSize, done) {
    return fs.readdir(this.options.inputFolder, (function(_this) {
      return function(error, files) {
        var batches, createBatch, last_batch;
        if (error) {
          return typeof done === "function" ? done(error) : void 0;
        }
        files = files.filter(fast5);
        batches = ((function() {
          var results;
          results = [];
          while (files.length) {
            results.push(files.splice(0, this.batchSize));
          }
          return results;
        }).call(_this));
        last_batch = batches[batches.length - 1];
        if (enforceBatchSize && (last_batch != null ? last_batch.length : void 0) < _this.batchSize) {
          batches.pop();
        }
        if (!batches.length) {
          return typeof done === "function" ? done(false) : void 0;
        }
        createBatch = function(batch, next) {
          var destination, moveFile;
          moveFile = function(file, next) {
            return mv(file.source, file.destination, {
              mkdirp: true
            }, function(error) {
              if (error) {
                return typeof done === "function" ? done(error) : void 0;
              }
              return async.setImmediate(next);
            });
          };
          destination = path.join(_this.sub.pending, "batch_" + (Date.now()));
          if (!enforceBatchSize) {
            destination += '_partial';
          }
          batch = batch.map(function(file) {
            return file = {
              source: path.join(_this.options.inputFolder, file),
              destination: path.join(destination, file)
            };
          });
          return async.eachSeries(batch, moveFile, function(error) {
            if (error) {
              return typeof done === "function" ? done(error) : void 0;
            }
            return async.setImmediate(next);
          });
        };
        return async.eachSeries(batches, createBatch, done);
      };
    })(this));
  };

  SSD.prototype.getBatch = function(done) {
    return fs.readdir(this.sub.pending, (function(_this) {
      return function(error, batches) {
        if (error) {
          return done(error);
        }
        batches = batches != null ? batches.filter(isBatch) : void 0;
        if (!(batches != null ? batches.length : void 0)) {
          return fs.readdir(_this.options.inputFolder, function(error, files) {
            if (files.filter(fast5).length) {
              _this.convertToBatches(false);
            }
            return done();
          });
        }
        return _this.markAsProcessing(path.join(_this.sub.pending, batches[0]), function(error, batch) {
          var files, response;
          files = fs.readdirSync(batch).map(function(file) {
            return file = {
              name: file,
              source: path.join(batch, file)
            };
          });
          if (!files.length) {
            _this.emit('status', "Batch was empty, kill it and get another");
            return _this.removeEmptyBatch(batch, function() {
              return _this.getBatch(done);
            });
          }
          return done(false, response = {
            source: batch,
            files: files
          });
        });
      };
    })(this));
  };

  SSD.prototype.getFile = function(source, done) {
    return done(false, fs.readFileSync(source));
  };

  SSD.prototype.markAsProcessing = function(source, done) {
    if (isProcessing(source)) {
      return done(false, source);
    }
    return mv(source, source + ".processing", {
      mkdirp: true
    }, (function(_this) {
      return function(error) {
        if (error) {
          return done(error);
        }
        return done(false, source + ".processing");
      };
    })(this));
  };

  SSD.prototype.moveUploadedFile = function(file, success, done) {
    var destination, sub;
    sub = success ? 'uploaded' : 'upload_failed';
    destination = path.join(this.options.inputFolder, sub, file.name);
    return mv(file.source, destination, (function(_this) {
      return function(error) {
        if (error) {
          return done(error);
        }
        _this.stats[sub] += 1;
        _this.emit('status', "File uploaded");
        return done();
      };
    })(this));
  };

  SSD.prototype.saveDownloadedFile = function(stream, filename, done) {
    var localFile, preExisting;
    localFile = fs.createWriteStream(path.join(this.options.outputFolder, filename));
    preExisting = fs.existsSync(localFile);
    stream.on('error', (function(_this) {
      return function() {
        _this.emit('status', "Download Failed " + filename);
        return done(new Error("Download failed" + filename));
      };
    })(this));
    stream.on('finish', (function(_this) {
      return function() {
        if (!preExisting) {
          _this.stats.downloaded = Math.min(_this.stats.downloaded + 1, _this.stats.total);
        }
        return typeof done === "function" ? done() : void 0;
      };
    })(this));
    return stream.pipe(localFile);
  };

  SSD.prototype.removeEmptyBatch = function(batch, done) {
    if (fs.existsSync(batch)) {
      fs.rmdir(batch);
    }
    return done();
  };

  SSD.prototype.stop = function(done) {
    this.isRunning = false;
    if (this.watcher) {
      this.watcher.unwatch(this.options.inputFolder).close();
    }
    if (this.stats) {
      WatchJS.unwatch(this.stats);
    }
    this.stats = false;
    return typeof done === "function" ? done() : void 0;
  };

  SSD.prototype.reset = function(done) {
    if (this.isRunning) {
      return typeof done === "function" ? done(new Error("Cannot reset while instance is running")) : void 0;
    }
    return this.stop((function(_this) {
      return function() {
        var rootWalker;
        rootWalker = fs.walk(_this.options.inputFolder);
        rootWalker.on("file", function(directory, stat, next) {
          var full;
          full = path.join(_this.options.inputFolder, stat.name);
          return mv(path.join(directory, stat.name), full, next);
        });
        return rootWalker.on('end', function() {
          var pendingWalker;
          pendingWalker = fs.walk(path.join(_this.options.inputFolder, 'pending'));
          pendingWalker.on("directory", function(directory, stat, next) {
            try {
              return fs.rmdir(path.join(directory, stat.name), next);
            } catch (undefined) {}
          });
          return pendingWalker.on('end', function() {
            return typeof done === "function" ? done(false) : void 0;
          });
        });
      };
    })(this));
  };

  return SSD;

})(EventEmitter);

module.exports = SSD;
