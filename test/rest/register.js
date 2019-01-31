import sinon from 'sinon';
import assert from 'assert';
import bunyan from 'bunyan';
import os from 'os';
import REST from '../../src/rest';
import utils from '../../src/utils';

describe('rest.register', () => {
  let ringbuf;
  let log;
  let stubs;
  let rest;

  beforeEach(() => {
    ringbuf = new bunyan.RingBuffer({ limit: 100 });
    log = bunyan.createLogger({ name: 'log', stream: ringbuf });
    rest = new REST({ log });
    stubs = [];
  });

  afterEach(() => {
    stubs.forEach(s => {
      s.restore();
    });
  });

  it('must invoke post with details', async () => {
    const stub = sinon.stub(utils, 'put').resolves({});
    stubs.push(stub);
    stubs.push(
      sinon.stub(os, 'userInfo').callsFake(() => ({
        username: 'testuser',
      })),
    );
    stubs.push(sinon.stub(os, 'hostname').callsFake(() => 'testhost'));
    const fake = sinon.fake();

    try {
      await rest.register('abcdefg', fake);
    } catch (e) {
      assert.fail(e);
    }

    //    assert(fake.calledOnce, 'callback invoked');
    assert.deepEqual(
      stub.lastCall.args,
      ['reg', 'abcdefg', { description: 'testuser@testhost' }, { log, signing: false, legacy_form: true }],
      'put args',
    );
  });
});
