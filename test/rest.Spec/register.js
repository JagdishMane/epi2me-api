import REST from "../../lib/rest";
import utils from "../../lib/utils";

const sinon  = require("sinon");
const assert = require("assert");
const bunyan = require("bunyan");

describe("rest.register", () => {
    it("must invoke post with details", () => {
	let ringbuf    = new bunyan.RingBuffer({ limit: 100 });
        let log        = bunyan.createLogger({ name: "log", stream: ringbuf });
	let stub = sinon.stub(utils, "_post").callsFake((type, code, payload, options, cb) => {
	    assert.equal(type, "reg", "type passed");
	    assert.equal(code, "abcdefg", "code passed");
	    assert.ok(payload.description.match(/^\S+@\S+$/), "payload description");
	    assert.equal(payload._signing, false, "signing off");
	    cb();
	});
	let fake = sinon.fake();
	let rest = new REST({log: log});
	assert.doesNotThrow(() => {
	    rest.register("abcdefg", fake);
	});
	assert(fake.calledOnce, "callback invoked");
	stub.restore();
    });
});
