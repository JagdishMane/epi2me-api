import REST from '../../src/rest';
import * as utils from '../../src/utils';

const sinon = require('sinon');
const assert = require('assert');
const bunyan = require('bunyan');

describe('rest._list', () => {
  let ringbuf;
  let log;
  let stubs;
  beforeEach(() => {
    ringbuf = new bunyan.RingBuffer({ limit: 100 });
    log = bunyan.createLogger({ name: 'log', stream: ringbuf });
    stubs = [];
  });

  afterEach(() => {
    stubs.forEach(s => {
      s.restore();
    });
  });

  it('must invoke get with options', () => {
    const fake = sinon.fake();
    const rest = new REST({ log });
    const stub = sinon.stub(utils, '_get').callsFake((uri, options, cb) => {
      assert.deepEqual(options, { log });
      assert.equal(uri, 'thing', 'url passed');
      cb(null, { things: [{ foo: 'id' }] });
    });
    stubs.push(stub);

    assert.doesNotThrow(() => {
      rest._list('thing', fake);
    });
    assert(fake.calledOnce, 'callback invoked');
    sinon.assert.calledWith(fake, null, [{ foo: 'id' }]);
  });

  it('must catch request failure with structured error', () => {
    const fake = sinon.fake();
    const rest = new REST({ log });
    const stub = sinon.stub(utils, '_get').callsFake((uri, options, cb) => {
      assert.deepEqual(options, { log });
      assert.equal(uri, 'thing', 'url passed');
      cb({ error: 'request failure' });
    });
    stubs.push(stub);

    assert.doesNotThrow(() => {
      rest._list('thing', fake);
    });
    assert(fake.calledOnce, 'callback invoked');
    sinon.assert.calledWith(fake, 'request failure');
  });

  it('must catch request failure with unstructured', () => {
    const fake = sinon.fake();
    const rest = new REST({ log });
    const stub = sinon.stub(utils, '_get').callsFake((uri, options, cb) => {
      assert.deepEqual(options, { log });
      assert.equal(uri, 'thing', 'url passed');
      cb('request failure');
    });
    stubs.push(stub);

    assert.doesNotThrow(() => {
      rest._list('thing', fake);
    });
    assert(fake.calledOnce, 'callback invoked');
    sinon.assert.calledWith(fake, 'request failure');
  });
});
