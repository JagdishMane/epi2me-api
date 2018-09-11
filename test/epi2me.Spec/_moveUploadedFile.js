"use strict";
const proxyquire = require('proxyquire');
const assert     = require("assert");
const sinon      = require("sinon");
const path       = require("path");
const fs         = require('fs');
const tmp        = require('tmp');
let requestProxy = {};
let awsProxy     = {};
let fsProxy      = {};
proxyquire('../../build/lib/utils', {
    'request' : requestProxy
});
const EPI2ME = proxyquire('../../build/lib/epi2me', {
    'aws-sdk'  : awsProxy,
    'request'  : requestProxy,
    'fs-extra' : fsProxy
}).default;

describe('._moveUploadedFile method', function () {

    var fileName = 'input.txt',
        readStream,
        writeStream,
        tmpfile, tmpdir, tmpdirOut, tmpfileOut;

    function stub(client) {
        client._uploadedFiles = [];
        sinon.stub(client.log, "error");
        sinon.stub(client.log, "warn");
        sinon.stub(client.log, "info");
        sinon.stub(client.log, "debug");
    }

    beforeEach((done) => {
        tmpdir     = tmp.dirSync({unsafeCleanup: true});
        tmpfile    = path.join(tmpdir.name, fileName);
        tmpfileOut = path.join(tmpdir.name, 'uploaded', fileName);

        fs.writeFileSync(tmpfile, new Array(5e5).join('aaa'));

        fsProxy.createReadStream = function (fn) {
            readStream = fs.createReadStream.apply(this, arguments);
            return readStream;
        };
        fsProxy.createWriteStream = function () {
            writeStream = fs.createWriteStream.apply(this, arguments);
            return writeStream;
        };
        setTimeout(done, 100);
    });

    afterEach(function cleanup() {
        readStream = null;
        delete fsProxy.createWriteStream;
        delete fsProxy.createReadStream;
    });

    it('should move file to upload folder', (done) => {
        var client = new EPI2ME({
            inputFolder: tmpdir.name,
            uploadedFolder:'+uploaded'
        });
        stub(client);
        client._moveUploadedFile({name: fileName}, (msg) => {
            fs.stat(tmpfileOut, (err, stats) => {
                if (err) {
                    console.log(err);
                }
                //assert(client.log.error.notCalled, 'logs no error messages');
                assert(!err, 'throws no errors: ' + err);

                fs.stat(tmpfile, (err, stats) => {
                    //assert(err && err.code === 'ENOENT', 'file should not exist');
                    done();
                });
            });
        });
    });
/*
    it('should handle writeStream errors and flag the file as uploaded', function (done) {
        var client = new EPI2ME({
            inputFolder: tmpdir.name,
            uploadedFolder:'+uploaded'
        });

        stub(client);

        client._moveUploadedFile({name: fileName}, function (errorMsg) {
            assert.equal(typeof errorMsg, "string", "pass error message to successCb: " + errorMsg);
            //assert(file.uploaded, "flag file as uploaded");
            fs.stat(tmpfileOut, function fsStatCallback(err, stat) {
                // assert(err && err.code === 'ENOENT', 'clean up target file. should not exist ' + err || stat);

                done();
            });
        });

        writeStream.emit("error", new Error("Test"));
    });
*/

    it('should handle non-existing input file', (done) => {
        var client = new EPI2ME({
            inputFolder: tmpdir.name,
            uploadedFolder:'+uploaded'
        });
        stub(client);
        var file = 'fileName';
        client._moveUploadedFile({name: file}, (errorMsg) => {
            assert(errorMsg.match(/ENOENT/), "pass error message to successCb: " + errorMsg, 'passes ENOENT error code');
            done();
        });
    });
});
