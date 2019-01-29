/* global describe, it, beforeEach, afterEach */
import assert from 'assert';
import sinon from 'sinon';
import axios from 'axios';
import utils from '../../src/utils';

describe('utils.post', () => {
  let stub1;
  let stub2;

  beforeEach(() => {
    stub1 = sinon.stub(axios, 'post').resolves({ data: { data: 'data' } });
    sinon.stub(utils, 'version').callsFake(() => {
      return '3.0.0';
    });
  });

  afterEach(() => {
    stub1.restore();
    utils.version.restore();
  });

  it('should invoke post', async () => {
    let data = await utils.post(
      'entity',
      {
        id_entity: 123,
        name: 'test entity',
      },
      {
        apikey: 'foo',
        url: 'http://epi2me.test',
      },
    );

    assert.deepEqual(data, { data: 'data' });

    assert.deepEqual(stub1.args[0], [
      'http://epi2me.test/entity',
      {
        uri: 'http://epi2me.test/entity',
        body: '{"id_entity":123,"name":"test entity"}',
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

  it('should invoke post with legacy form params', async () => {
    let data = await utils.post(
      'entity',
      {
        id_entity: 123,
        name: 'test entity',
      },
      {
        apikey: 'foo',
        url: 'http://epi2me.test',
        legacy_form: true,
      },
    );

    assert.deepEqual(data, { data: 'data' });

    assert.deepEqual(stub1.args[0], [
      'http://epi2me.test/entity',
      {
        uri: 'http://epi2me.test/entity',
        body: '{"id_entity":123,"name":"test entity"}',
        form: { json: '{"id_entity":123,"name":"test entity"}', id_entity: 123, name: 'test entity' },
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

  it('should invoke post with proxy', async () => {
    let data = await utils.post(
      'entity',
      {
        id_entity: 123,
        name: 'test entity',
      },
      {
        apikey: 'foo',
        url: 'http://epi2me.test',
        proxy: 'http://proxy.internal:3128/',
      },
    );
    assert.deepEqual(data, { data: 'data' });

    assert.deepEqual(stub1.args[0], [
      'http://epi2me.test/entity',
      {
        uri: 'http://epi2me.test/entity',
        body: '{"id_entity":123,"name":"test entity"}',
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
});
