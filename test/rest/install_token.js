import sinon from 'sinon';
import assert from 'assert';
import bunyan from 'bunyan';
import REST from '../../src/rest';
import utils from '../../src/utils';

describe('rest.instance_token', () => {
  let log, rest;

  beforeEach(() => {
    const ringbuf = new bunyan.RingBuffer({ limit: 100 });
    log = bunyan.createLogger({ name: 'log', stream: ringbuf });
    rest = new REST({
      log: log,
    });
  });

  it('must invoke post with options', async () => {
    const stub = sinon.stub(utils, 'post').resolves({ data: 'some data' });
    const fake = sinon.fake();

    try {
      await rest.install_token('12345', fake);
    } catch (e) {
      assert.fail(e);
    }

    assert.deepEqual(
      stub.args[0],
      [
        'token/install',
        { id_workflow: '12345' },
        {
          legacy_form: true,
          log: log,
        },
      ],
      'post args',
    );
    assert.deepEqual(fake.lastCall.args, [null, { data: 'some data' }], 'callback args');
    stub.restore();
  });

  it('must handle error', async () => {
    const stub = sinon.stub(utils, 'post').rejects(new Error('token fail'));
    const fake = sinon.fake();

    try {
      await rest.install_token('12345', fake);
    } catch (e) {
      assert.fail(e);
    }

    assert(String(fake.lastCall.args[0]).match(/token fail/), 'expected error');
    stub.restore();
  });
});
