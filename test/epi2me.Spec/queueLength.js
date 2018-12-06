import EPI2ME from "../../lib/epi2me";

const assert = require("assert");
const sinon  = require("sinon");
const bunyan = require("bunyan");

describe('epi2me.queueLength', () => {
    let client, queueUrl = 'queueUrl';

    beforeEach((done) => {
        client = new EPI2ME({});
        sinon.stub(client.log, "warn");
        sinon.stub(client.log, "error");
        sinon.stub(client.log, "info");
	done();
    });

    it('should return sqs queue', function (done) {
        client.sessionedSQS = function (cb) {
	    return {
                getQueueAttributes: function (opts, cb) {
		    assert.equal(opts.QueueUrl, queueUrl);
		    cb(null, { Attributes: { ApproximateNumberOfMessages: 10 } });
		    assert(completeCb.calledOnce);
		    assert.equal(completeCb.lastCall.args[0], 10);
		    cb("Error");
		    assert(client.log.warn.calledOnce);
		    assert(completeCb.calledTwice);
		    done();
                }
	    };
        };

        var completeCb = sinon.spy();
        client.queueLength(queueUrl, completeCb);
    });

    it('should handle sessionedSQS errors', () => {
        client.sessionedSQS = () => {
	    return {
                getQueueAttributes: function (opts, cb) {
		    throw Error;
                }
	    };
        };

        var completeCb = sinon.spy();
        client.queueLength(queueUrl, completeCb);
        // assert(completeCb.calledTwice, 'call callback even for errors');
        assert.equal(completeCb.firstCall.args[0], undefined);
        // assert.equal(completeCb.secondCall.args[0], undefined);
        assert(client.log.error.calledOnce);
        assert.doesNotThrow(() => {
	    client.queueLength(queueUrl);
	    client.queueLength();
        }, 'Error');
    });
});
