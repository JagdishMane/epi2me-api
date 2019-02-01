import assert from 'assert';
import sinon from 'sinon';
import axios from 'axios';
import utils from '../../src/utils';

describe('utils.put', () => {
  let stubs = [];
  const versionBackup = `${utils.version}`;

  before(() => {
    utils.version = '3.0.0';
  });

  after(() => {
    utils.version = versionBackup;
  });

  beforeEach(() => {
    stubs = [];
  });

  afterEach(() => {
    stubs.forEach(s => {
      s.restore();
    });
  });

  it('should invoke put', async () => {
    stubs.push(sinon.stub(axios, 'put').resolves({ data: { data: 'data' } }));

    const data = await utils.put(
      'entity',
      123,
      {
        name: 'test entity',
      },
      {
        apikey: 'foo',
        url: 'http://epi2me.test',
      },
    );

    assert.deepEqual(data, { data: 'data' });
    assert.deepEqual(axios.put.args[0], [
      'http://epi2me.test/entity/123',
      { name: 'test entity' },
      {
        url: 'http://epi2me.test/entity/123',
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

  it('should invoke put with legacy form params - TO FIX', async () => {
    stubs.push(sinon.stub(axios, 'put').resolves({ data: { data: 'data' } }));

    const data = await utils.put(
      'entity',
      123,
      {
        name: 'test entity',
      },
      {
        apikey: 'foo',
        url: 'http://epi2me.test',
        legacy_form: true,
      },
    );

    assert.deepEqual(data, { data: 'data' });

    assert.deepEqual(axios.put.args[0], [
      'http://epi2me.test/entity/123',
      'json=%7B%22name%22%3A%22test%20entity%22%7D',
      {
        url: 'http://epi2me.test/entity/123',
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

  it('should invoke put with proxy', async () => {
    stubs.push(sinon.stub(axios, 'put').resolves({ data: { data: 'data' } }));

    const data = await utils.put(
      'entity',
      123,
      {
        name: 'test entity',
      },
      {
        apikey: 'foo',
        url: 'http://epi2me.test',
        proxy: 'http://proxy.internal:3128/',
      },
    );

    assert.deepEqual(data, { data: 'data' });

    assert.deepEqual(axios.put.args[0], [
      'http://epi2me.test/entity/123',
      { name: 'test entity' },
      {
        url: 'http://epi2me.test/entity/123',
        gzip: true,
        proxy: 'http://proxy.internal:3128/',
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

  it('should handle put exception', async () => {
    stubs.push(sinon.stub(axios, 'put').rejects(new Error('request failed')));

    try {
      await utils.put(
        'entity',
        123,
        {
          name: 'test entity',
        },
        {
          apikey: 'foo',
          url: 'http://epi2me.test',
        },
      );
      assert.fail('unexpected success');
    } catch (err) {
      assert(String(err).match(/request failed/), 'expected error message');
    }
  });
});
