import assert from 'assert';
import EPI2ME from '../../src/epi2me';

describe('epi2me.stats', () => {
  it('should stat', () => {
    const client = new EPI2ME({});

    assert.doesNotThrow(() => {
      client.stats();
    });
  });

  it('should stat a null value', () => {
    const client = new EPI2ME({});
    client.states = { fake: {} };
    assert.doesNotThrow(() => {
      // const stat =
      client.stats('fake');
      //      assert.deepEqual(stat, { queueLength: { files: 0 } });
    });
  });

  it('should stat a regular value', () => {
    const client = new EPI2ME({});
    client.states = { fake: { queueLength: { files: 10 } } };
    assert.doesNotThrow(() => {
      const stat = client.stats('fake');
      assert.deepEqual(stat, { queueLength: { files: 10 } });
    });
  });

  it('should stat special upload behaviour', () => {
    const client = new EPI2ME({});
    client.states = { upload: { total: {}, success: {} } };
    assert.doesNotThrow(() => {
      const stat = client.stats('upload');
      assert.deepEqual(stat, { total: {}, success: {} });
    });
  });

  it('should stat special upload behaviour with upload queue', () => {
    const client = new EPI2ME({});
    client.states = {
      upload: { total: {}, success: { files: 7 } },
    };

    assert.doesNotThrow(() => {
      const stat = client.stats('upload');
      assert.deepEqual(stat, { total: {}, success: { files: 7 } });
    });
  });
});
