import assert    from "assert";
import sinon     from "sinon";
import bunyan    from "bunyan";
import queue     from "queue-async";
import fs        from "fs-extra";
import tmp       from "tmp";
import path      from "path";
import { merge } from "lodash";
import AWS       from "aws-sdk";
import EPI2ME    from "../../lib/epi2me";

describe('epi2me.enqueueUploadFiles', () => {

    let debug, info, warn, error;
    let type = "upload";

    const clientFactory = (opts) => {
        return new EPI2ME(merge({
            url: "https://epi2me-test.local",
            log: {
                debug: debug,
                info:  info,
                warn:  warn,
                error: error,
            }
        }, opts));
    };

    beforeEach(() => {
        // reset loggers
        debug = sinon.stub();
        info  = sinon.stub();
        warn  = sinon.stub();
        error = sinon.stub();
    });

    it("should bail if arg is not an array", () => {
	let client = clientFactory();
	assert.doesNotThrow(() => {
	    let result = client.enqueueUploadFiles({});
	    assert.equal(result, undefined); // hate tests like this
	});
    });

    it("should bail if array is empty", () => {
	let client = clientFactory();
	assert.doesNotThrow(() => {
	    let result = client.enqueueUploadFiles([]);
	    assert.equal(result, undefined); // still hate tests like this
	});
    });

    it("should process", async () => { // This test is failing even though the code is exercised.. async fun.
	let client          = clientFactory();
	let loadUploadFiles = sinon.stub(client, "loadUploadFiles").callsFake();
	sinon.stub(client, "uploadJob").resolves();

	try {
	    await client.enqueueUploadFiles([
		{}
	    ]);
	} catch (e) {
	    assert.fail(e);
	}

	assert.ok(info.lastCall.args[0].match(/slot released/), "logged as complete");
	assert.ok(loadUploadFiles.calledOnce, "loadUploadFiles fired");
    });

    it("should process. storage required from workflow attributes. no account provided", async () => {
	let client = clientFactory();
	client.config.workflow = {
	    workflow_attributes: {
		requires_storage: true
	    }
	}
	let loadUploadFiles = sinon.stub(client, "loadUploadFiles").callsFake();
	sinon.stub(client, "uploadJob").resolves();

	try {
	    await client.enqueueUploadFiles([
		{}
	    ]);

	    assert.ok(error.args[0][0].match(/provide a valid storage account/), "storage-required error");
	} catch (e) {
	    assert.fail(e);
	}
    });

    it("should process. storage required from workflow attributes. account provided", async () => {
	let client = clientFactory();
	client.config.workflow = {
	    workflow_attributes: {
		requires_storage: true
	    },
	    storage_account: "C000000",
	}
	let loadUploadFiles = sinon.stub(client, "loadUploadFiles").callsFake();
	sinon.stub(client, "uploadJob").resolves();

	try {
	    await client.enqueueUploadFiles([
		{}
	    ]);

	    assert.ok(error.notCalled, "no errors raised");
	    assert.ok(loadUploadFiles.calledOnce, "loadUploadFiles fired");
	} catch (e) {
	    assert.fail(e);
	}
    });
});
