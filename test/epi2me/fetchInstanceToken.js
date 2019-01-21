import assert    from "assert";
import sinon     from "sinon";
import { merge } from "lodash";
import AWS       from "aws-sdk";
import REST      from "../../lib/rest";
import EPI2ME    from "../../lib/epi2me";

describe("epi2me.fetchInstanceToken", () => {

    const clientFactory = (opts) => {
	return new EPI2ME(merge({
	    url: "https://epi2me-test.local",
	    log: {
		debug: sinon.stub(),
		info: sinon.stub(),
		warn: sinon.stub(),
		error: sinon.stub(),
	    }
	}, opts));
    };

    let clock;

    beforeEach(() => {
	clock = sinon.useFakeTimers();
    });
    afterEach(() => {
	clock.restore();
    });

    it("should throw if no id_workflow_instance", () => {
	let client = clientFactory();

	assert.throws(() => {
	    client.fetchInstanceToken();
	}, new Error("must specify id_workflow_instance"), "correct error thrown");
    });

    it("should not throw if id_workflow_instance and token valid", () => {
	let client = clientFactory({
	    id_workflow_instance: 5
	});

	assert.doesNotThrow(() => {
	    let fake = sinon.fake();
	    client._stats.sts_expiration = 10000 + Date.now();
	    client.fetchInstanceToken(fake);
	    assert(fake.calledOnce, "callback fired");
	}, "error not thrown");
    });

    it("should request a token if not present", () => {
	let client = clientFactory({
	    id_workflow_instance: 5
	});

	assert.doesNotThrow(() => {
	    let stub = sinon.stub(client.REST, "instance_token").callsFake();
	    client._stats.sts_expiration = Date.now() - 10000; // expired
	    client.fetchInstanceToken(sinon.fake());
	    assert(stub.calledOnce, "callback fired if expired");
	}, "error not thrown");
    });

    it("should handle token-fetching error and retry", () => {
	let client = clientFactory({
	    id_workflow_instance: 5
	});

	assert.doesNotThrow(() => {
	    let fake = sinon.fake();
	    let stub = sinon.stub(client.REST, "instance_token").callsFake((id, callback) => {
		assert.equal(id, 5, "id passed correctly");
		callback(new Error("token error"), null);
		clock.tick(30000);
		assert(fake.calledOnce, "callback fired");
	    });

	    client._stats.sts_expiration = Date.now() - 10000; // expired
	    client.fetchInstanceToken(fake);
	    assert(stub.calledOnce, "callback fired if expired");
	}, "error not thrown");
    });

    it("should fetch token and callback", () => {
	let client = clientFactory({
	    id_workflow_instance: 5
	});

	assert.doesNotThrow(() => {
	    let token = {
		expiration: new Date(),
	    };
	    let fake = sinon.fake();
	    let stub = sinon.stub(client.REST, "instance_token").callsFake((id, callback) => {
		assert.equal(id, 5, "id passed correctly");
		callback(null, token);
		clock.tick(30000);
		assert(fake.calledOnce, "callback fired");
	    });

	    let stub2 = sinon.stub(AWS.config, "update").callsFake();
	    client._stats.sts_expiration = Date.now() - 10000; // expired
	    client.fetchInstanceToken(fake);
	    assert(stub.calledOnce, "callback fired if expired");
	    assert.ok(stub2.calledTwice);
	    assert.deepEqual(stub2.args[1][0], token, "token contents");
	    stub2.restore();
	}, "error not thrown");
    });

    it("should set proxy if configured", () => {
	let client = clientFactory({
	    id_workflow_instance: 5,
	    proxy: "http://proxy.test:3128/",
	});

	assert.doesNotThrow(() => {
	    let token = {
		expiration: new Date(),
	    };
	    let fake = sinon.fake();
	    let stub = sinon.stub(client.REST, "instance_token").callsFake((id, callback) => {
		assert.equal(id, 5, "id passed correctly");
		callback(null, token);
		clock.tick(30000);
		assert(fake.calledOnce, "callback fired");
	    });

	    let stub2 = sinon.stub(AWS.config, "update").callsFake();
	    client._stats.sts_expiration = Date.now() - 10000; // expired
	    client.fetchInstanceToken(fake);
	    assert(stub.calledOnce, "callback fired if expired");
	    assert.ok(stub2.calledThrice);
	    assert.equal(stub2.args[0][0].httpOptions.agent.proxy.href, "http://proxy.test:3128/", "tightly coupled proxy contents");
	    stub2.restore();
	}, "error not thrown");
    });
});
