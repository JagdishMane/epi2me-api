import sinon from 'sinon';
import assert from 'assert';
import utils from '../../src/utils';
import REST from '../../src/rest';

describe('rest.amiImage', () => {
  let client;

  beforeEach(() => {
    client = new REST({
      url: 'http://metrichor.local:8080',
      apikey: 'FooBar02',
    });
  });

  it('should not support local mode', () => {
    client.options.local = true;
    const data = { aws_id: 'ami-12345', name: 'mon ami', description: 'foo bar baz', id_region: 1, is_active: 1 };
    assert.doesNotThrow(() => {
      client.amiImage('ami-12345', data, err => {
        assert.ok(err instanceof Error, 'local-mode unsupported error');
      });
    });
  });

  it('should update an amiImage', () => {
    const data = { aws_id: 'ami-12345', name: 'mon ami', description: 'foo bar baz', id_region: 1, is_active: 1 };
    const stub = sinon.stub(utils, 'put').resolves({ status: 'success' });

    assert.doesNotThrow(async () => {
      await client.amiImage('ami-12345', data, (err, obj) => {
        assert.equal(err, null, 'no error reported');
        assert.deepEqual(obj, { status: 'success' });
      });
    });

    stub.restore();
  });

  it('should create an amiImage', () => {
    const data = { aws_id: 'ami-12345', name: 'mon ami', description: 'foo bar baz', id_region: 1, is_active: 1 };
    const stub = sinon.stub(utils, 'post').resolves({ status: 'success' });

    assert.doesNotThrow(async () => {
      await client.amiImage(data, (err, obj) => {
        assert.equal(err, null, 'no error reported');
        assert.deepEqual(obj, { status: 'success' });
      });
    });

    stub.restore();
  });

  it('should read an amiImage', () => {
    const data = { aws_id: 'ami-12345', name: 'mon ami', description: 'foo bar baz', id_region: 1, is_active: 1 };
    const stub = sinon.stub(client, 'read').resolves(data);

    assert.doesNotThrow(async () => {
      await client.amiImage('ami-12345', (err, obj) => {
        assert.equal(err, null, 'no error reported');
        assert.deepEqual(obj, data);
      });
    });

    stub.restore();
  });

  it('should bail without an id', () => {
    const data = { aws_id: 'ami-12345', name: 'mon ami', description: 'foo bar baz', id_region: 1, is_active: 1 };
    const stub = sinon.stub(client, 'read').resolves(data);

    const fake = sinon.fake();
    assert.doesNotThrow(async () => {
      await client.amiImage(null, fake);
    });
    assert(fake.calledOnce, 'callback invoked');
    assert(fake.firstCall.args[0] instanceof Error);

    stub.restore();
  });
});
