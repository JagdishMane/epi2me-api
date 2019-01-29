import os from 'os';
import path from 'path';
import { merge, filter } from 'lodash';
import utils from './utils';

export default class REST {
  constructor(options) {
    // {log, ...options}) {
    if (options.log) {
      this.log = options.log;
      //            delete options.log;
    }
    this.options = options;
    Object.keys(utils);
  }

  _list(entity, cb) {
    return utils._get(entity, this.options, (e, json) => {
      if (e) {
        this.log.error('_list', e.error || e);
        cb(e.error || e);
        return;
      }

      entity = entity.match(/^[a-z_]+/i)[0]; // dataset?foo=bar => dataset
      cb(null, json[`${entity}s`]);
    });
  }

  _read(entity, id, cb) {
    return utils._get(`${entity}/${id}`, this.options, cb);
  }

  user(cb) {
    if (this.options.local) {
      return cb(null, { accounts: [{ id_user_account: 'none', number: 'NONE', name: 'None' }] }); // fake user with accounts
    }
    return utils._get('user', this.options, cb);
  }

  instance_token(id, cb) {
    /* should this be passed a hint at what the token is for? */
    return utils._post('token', { id_workflow_instance: id }, merge({ legacy_form: true }, this.options), cb);
  }

  install_token(id, cb) {
    return utils._post('token/install', { id_workflow: id }, merge({ legacy_form: true }, this.options), cb);
  }

  attributes(cb) {
    return this._list('attribute', cb);
  }

  workflows(cb) {
    if (!this.options.local) {
      return this._list('workflow', cb);
    }
  }

  ami_images(cb) {
    if (this.options.local) {
      return cb(new Error('ami_images unsupported in local mode'));
    }

    return this._list('ami_image', cb);
  }

  ami_image(id, obj, cb) {
    if (this.options.local) {
      return cb(new Error('ami_image unsupported in local mode'));
    }

    if (cb) {
      // three args: update object
      return utils._put('ami_image', id, obj, this.options, cb);
    }

    if (id && typeof id === 'object') {
      cb = obj;
      obj = id;
      return utils._post('ami_image', obj, this.options, cb);
    }

    // two args: get object
    cb = obj;

    if (!id) {
      return cb(new Error('no id_ami_image specified'), null);
    }

    this._read('ami_image', id, cb);
  }

  workflow(id, obj, cb) {
    if (cb) {
      // three args: update object: (123, {...}, func)
      return utils._put('workflow', id, obj, merge({ legacy_form: true }, this.options), cb);
    }

    if (id && typeof id === 'object') {
      // two args: create object: ({...}, func)
      cb = obj;
      obj = id;
      return utils._post('workflow', obj, merge({ legacy_form: true }, this.options), cb);
    }

    // two args: get object: (123, func)
    cb = obj;

    if (!id) {
      return cb(new Error('no workflow id specified'));
    }

    if (this.options.local) {
      const WORKFLOW_DIR = path.join(this.options.url, 'workflows');
      const filename = path.join(WORKFLOW_DIR, id, 'workflow.json');
      let workflow;
      try {
        workflow = require(filename);
      } catch (readWorkflowException) {
        return cb(readWorkflowException);
      }
      return cb(null, workflow);
    }

    this._read('workflow', id, (err, details) => {
      if (!details) {
        details = {};
      }

      if (!details.params) {
        details.params = {};
      }

      const promises = [];
      promises.push(
        new Promise((resolve, reject) => {
          const uri = `workflow/config/${id}`;
          utils._get(uri, this.options, (err, resp) => {
            if (err) {
              this.log.error(`failed to fetch ${uri}`);
              reject(err);
              return;
            }

            merge(details, resp);
            resolve();
          });
        }),
      );

      // MC-6483 - fetch ajax options for "AJAX drop down widget"
      const toFetch = filter(details.params, { widget: 'ajax_dropdown' });
      promises.unshift(
        ...toFetch.map(
          param =>
            new Promise((resolve, reject) => {
              const uri = param.values.source.replace('{{EPI2ME_HOST}}', '');

              utils._get(uri, this.options, (err, resp) => {
                if (err) {
                  this.log.error(`failed to fetch ${uri}`);
                  reject(err);
                  return;
                }

                const data_root = resp[param.values.data_root];
                if (data_root) {
                  param.values = data_root.map(o => ({
                    label: o[param.values.items.label_key],
                    value: o[param.values.items.value_key],
                  }));
                }
                resolve();
              });
            }),
        ),
      );

      Promise.all(promises)
        .then(() => cb(null, details))
        .catch(err => {
          this.log.error(`${id}: error fetching config and parameters (${err.error || err})`);
          return cb(err);
        });
    });
  }

  start_workflow(config, cb) {
    return utils._post('workflow_instance', config, merge({ legacy_form: true }, this.options), cb);
  }

  stop_workflow(instance_id, cb) {
    return utils._put('workflow_instance/stop', instance_id, null, merge({ legacy_form: true }, this.options), cb);
  }

  workflow_instances(cb, query) {
    if (query && query.run_id) {
      return utils._get(
        `workflow_instance/wi?show=all&columns[0][name]=run_id;columns[0][searchable]=true;columns[0][search][regex]=true;columns[0][search][value]=${
          query.run_id
        };`,
        this.options,
        (e, json) => {
          const mapped = json.data.map(o => ({
            id_workflow_instance: o.id_ins,
            id_workflow: o.id_flo,
            run_id: o.run_id,
            description: o.desc,
            rev: o.rev,
          }));
          return cb(null, mapped);
        },
      );
    }

    return this._list('workflow_instance', cb);
  }

  workflow_instance(id, cb) {
    return this._read('workflow_instance', id, cb);
  }

  workflow_config(id, cb) {
    return utils._get(`workflow/config/${id}`, this.options, cb);
  }

  register(code, cb) {
    return utils._put(
      'reg',
      code,
      {
        description: `${os.userInfo().username}@${os.hostname()}`,
      },
      merge({ _signing: false, legacy_form: true }, this.options),
      cb,
    );
  }

  datasets(cb, query) {
    if (!query) {
      query = {};
    }

    if (!query.show) {
      query.show = 'mine';
    }

    return this._list(`dataset?show=${query.show}`, cb);
  }

  dataset(id, cb) {
    if (!this.options.local) {
      return this._read('dataset', id, cb);
    }

    this.datasets((err, data) =>
      // READ response has the same structure as LIST, so just
      // fish out the matching id
      cb(err, data.find(o => o.id_dataset === id)),
    );
  }

  fetchContent(url, cb) {
    const options = merge({ skip_url_mangle: true }, this.options);
    utils._get(url, options, cb);
  }
}
