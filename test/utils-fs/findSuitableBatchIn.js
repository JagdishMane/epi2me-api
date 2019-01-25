import assert from 'assert';
import sinon from 'sinon';
import tmp from 'tmp';
import fs from 'fs-extra';
import path from 'path';
import utils from '../../src/utils-fs';

describe('utils-fs.findSuitablebatchIn', () => {
  let clock;
  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });
  afterEach(() => {
    clock.restore();
  });

  it('should create new if none found', async () => {
    const dir = tmp.dirSync().name;
    assert.equal(utils.findSuitableBatchIn(dir), path.join(dir, 'batch_0'), 'new batch');
  });

  it('should create new if none matching', async () => {
    const dir = tmp.dirSync().name;
    fs.mkdirpSync(path.join(dir, 'random_other'));
    assert.equal(utils.findSuitableBatchIn(dir), path.join(dir, 'batch_0'), 'new batch');
  });

  it('should create new if latest is full', async () => {
    const dir = tmp.dirSync().name;
    fs.mkdirpSync(path.join(dir, 'batch_0'));
    for (let i = 0; i <= 4000; i++) {
      // const targetBatchSize
      fs.writeFileSync(path.join(dir, 'batch_0', `file${i}.fast5`));
    }
    clock.tick(1000);
    assert.equal(utils.findSuitableBatchIn(dir), path.join(dir, 'batch_1000'), 'new batch');
  });

  it('should return latest if free', async () => {
    const dir = tmp.dirSync().name;
    fs.mkdirpSync(path.join(dir, 'batch_0'));
    fs.mkdirpSync(path.join(dir, 'batch_1000'));
    for (let i = 0; i <= 1000; i++) {
      // const targetBatchSize
      fs.writeFileSync(path.join(dir, 'batch_1000', `file${i}.fast5`));
    }
    clock.tick(1000);
    assert.equal(utils.findSuitableBatchIn(dir), path.join(dir, 'batch_1000'), 'new batch');
  });
});
