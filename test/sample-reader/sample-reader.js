import assert from 'assert';
import mock from 'mock-fs';
import SampleReader from '../../src/sample-reader';

describe('sample reader', () => {
  describe('constructor', () => {
    it('should set options', () => {
      const SR = new SampleReader();
      assert.deepEqual(SR.experiments, {});
    });
  });
  describe('getRuns', () => {
    before(() => {
      mock({
        '/data/rehan_07_01_20/VSK002_11_DEGREES/20200107_1441_X5_FAL69641_c67dbc23': {
          'sequencing_summary_FAL69641_ad7f83be.txt': 'file content here',
        },
      });
    });

    after(() => {
      mock.restore();
    });

    it('should set get all run options', async () => {
      const path = '/data';
      const SR = new SampleReader();
      const runs = await SR.getExperiments(path);
      const startDate = new Date('2020-01-07 14:41:00');
      assert.deepEqual(runs, {
        VSK002_11_DEGREES: {
          samples: [
            {
              flowcell: 'FAL69641',
              sample: '20200107_1441_X5_FAL69641_c67dbc23',
              path: '/data/rehan_07_01_20/VSK002_11_DEGREES/20200107_1441_X5_FAL69641_c67dbc23/fastq_pass',
            },
          ],
          startDate: `${startDate.toDateString()} ${startDate.toLocaleTimeString()}`,
        },
      });
    });
  });
});
