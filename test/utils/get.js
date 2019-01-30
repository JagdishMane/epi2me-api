import assert from 'assert';
import sinon from 'sinon';
import axios from 'axios';
import utils from '../../src/utils';

describe('utils.get', () => {
  let stubs;

  beforeEach(() => {
    stubs = [];
    stubs.push(
      sinon.stub(utils, 'version').callsFake(() => {
        return '3.0.0';
      }),
    );
  });

  afterEach(() => {
    stubs.forEach(s => {
      s.restore();
    });
  });

  it('should invoke get', async () => {
    stubs.push(sinon.stub(axios, 'get').resolves({ data: { data: 'data' } }));
    let data = await utils.get('entity/123', {
      apikey: 'foo',
      url: 'http://epi2me.test',
    });

    assert.deepEqual(data, { data: 'data' });

    assert.deepEqual(axios.get.args[0], [
      'http://epi2me.test/entity/123',
      {
        uri: 'http://epi2me.test/entity/123',
        gzip: true,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-EPI2ME-ApiKey': 'foo',
          'X-EPI2ME-Client': 'api',
          'X-EPI2ME-Version': '3.0.0',
        },
      },
    ]);
  });

  it('should invoke get without url mangling', async () => {
    stubs.push(sinon.stub(axios, 'get').resolves({ data: { data: 'data' } }));
    let data = await utils.get('https://epi2me.internal/entity/123', {
      skip_url_mangle: true,
      apikey: 'foo',
      url: 'http://epi2me.test',
    });

    assert.deepEqual(data, { data: 'data' });

    assert.deepEqual(axios.get.args[0], [
      'https://epi2me.internal/entity/123',
      {
        uri: 'https://epi2me.internal/entity/123',
        gzip: true,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-EPI2ME-ApiKey': 'foo',
          'X-EPI2ME-Client': 'api',
          'X-EPI2ME-Version': '3.0.0',
        },
      },
    ]);
  });

  it('should invoke get with proxy', async () => {
    stubs.push(sinon.stub(axios, 'get').resolves({ data: { data: 'data' } }));
    let data = await utils.get('entity/123', {
      proxy: 'http://proxy.internal:3128/',
      apikey: 'foo',
      url: 'http://epi2me.test',
    });

    assert.deepEqual(data, { data: 'data' });

    assert.deepEqual(axios.get.args[0], [
      'http://epi2me.test/entity/123',
      {
        uri: 'http://epi2me.test/entity/123',
        proxy: 'http://proxy.internal:3128/',
        gzip: true,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-EPI2ME-ApiKey': 'foo',
          'X-EPI2ME-Client': 'api',
          'X-EPI2ME-Version': '3.0.0',
        },
      },
    ]);
  });

  it('should handle request failure', async () => {
    stubs.push(sinon.stub(axios, 'get').rejects(new Error('request failed')));
    try {
      let data = await utils.get('entity/123', {
        apikey: 'foo',
        url: 'http://epi2me.test',
      });
      assert.fail('unexpected success');
    } catch (err) {
      assert(String(err).match(/request failed/), 'expected error message');
    }
  });
});
