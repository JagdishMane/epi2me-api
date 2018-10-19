"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _utils = require("./utils");

var _utils2 = _interopRequireDefault(_utils);

var _os = require("os");

var _os2 = _interopRequireDefault(_os);

var _fsExtra = require("fs-extra");

var _fsExtra2 = _interopRequireDefault(_fsExtra);

var _path = require("path");

var _path2 = _interopRequireDefault(_path);

var _lodash = require("lodash");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class REST {
    constructor(options) {
        // {log, ...options}) {
        if (options.log) {
            this.log = options.log;
            //            delete options.log;
        }
        this.options = options;
    }

    _list(entity, cb) {
        return _utils2.default._get(entity, this.options, (e, json) => {
            if (e) {
                this.log.error("_list", e.error || e);
                cb(e.error || e);
                return;
            }

            entity = entity.match(/^[a-z_]+/i)[0]; // dataset?foo=bar => dataset
            cb(null, json[entity + "s"]);
        });
    }

    _read(entity, id, cb) {
        return _utils2.default._get(entity + "/" + id, this.options, cb);
    }

    user(cb) {
        if (this.options.local) {
            return cb(null, { "accounts": [{ id_user_account: "none", number: "NONE", name: "None" }] }); // fake user with accounts
        }
        return _utils2.default._get("user", this.options, cb);
    }

    instance_token(id, cb) {
        /* should this be passed a hint at what the token is for? */
        return _utils2.default._post("token", { id_workflow_instance: id }, (0, _lodash.merge)({ legacy_form: true }, this.options), cb);
    }

    install_token(id, cb) {
        return _utils2.default._post("token/install", { id_workflow: id }, (0, _lodash.merge)({ legacy_form: true }, this.options), cb);
    }

    attributes(cb) {
        return this._list("attribute", cb);
    }
    /*
    async workflows(cb) {
    if (!this.options.local) {
      return this._list("workflow", cb);
    }
    let WORKFLOW_DIR = path.join(this.options.url, "workflows");
     const data = await fs.readdir(WORKFLOW_DIR);
    const only_directories = data.filter(async id => {
      return await fs
        .statSync(path.join(WORKFLOW_DIR, id)) // ouch
        .isDirectory();
    });
     const file_contents = await Promise.all(
      only_directories.map(async id => {
        const filename = path.join(WORKFLOW_DIR, id, "workflow.json");
        return await fs.readJson(filename);
      })
    );
    return cb(file_contents);
    }*/
    workflows(cb) {
        if (!this.options.local) {
            return this._list("workflow", cb);
        }

        let WORKFLOW_DIR = _path2.default.join(this.options.url, "workflows");

        _fsExtra2.default.readdir(WORKFLOW_DIR).then(data => {
            return data.filter(id => {
                return _fsExtra2.default.statSync(_path2.default.join(WORKFLOW_DIR, id)) // ouch
                .isDirectory();
            });
        }).then(data => {
            return data.map(id => {
                const filename = _path2.default.join(WORKFLOW_DIR, id, "workflow.json");
                return require(filename); // try...catch?
            });
        }).then(data => {
            return Promise.resolve(cb(null, data));
        });
    }

    ami_images(cb) {
        if (this.options.local) {
            return cb(new Error("ami_images unsupported in local mode"));
        }

        return this._list("ami_image", cb);
    }

    ami_image(id, obj, cb) {
        if (this.options.local) {
            if (!cb) {
                cb = obj;
            }
            return cb(new Error("ami_image unsupported in local mode"));
        }

        if (cb) {
            // three args: update object
            return _utils2.default._put("ami_image", id, obj, this.options, cb);
        }

        if (id && typeof id === "object") {
            cb = obj;
            obj = id;
            return _utils2.default._post("ami_image", obj, this.options, cb);
        }

        // two args: get object
        cb = obj;

        if (!id) {
            return cb(new Error("no id_ami_image specified"), null);
        }

        this._read("ami_image", id, cb);
    }

    workflow(id, obj, cb) {
        if (cb) {
            // three args: update object: (123, {...}, func)
            return _utils2.default._put("workflow", id, obj, (0, _lodash.merge)({ legacy_form: true }, this.options), cb);
        }

        if (id && typeof id === "object") {
            // two args: create object: ({...}, func)
            cb = obj;
            obj = id;
            return _utils2.default._post("workflow", obj, (0, _lodash.merge)({ legacy_form: true }, this.options), cb);
        }

        // two args: get object: (123, func)
        cb = obj;

        if (!id) {
            return cb(new Error("no workflow id specified"));
        }

        if (this.options.local) {
            let WORKFLOW_DIR = _path2.default.join(this.options.url, "workflows");
            let filename = _path2.default.join(WORKFLOW_DIR, id, "workflow.json");
            let workflow;
            try {
                workflow = require(filename);
            } catch (readWorkflowException) {
                return cb(readWorkflowException);
            }
            return cb(null, workflow);
        }

        this._read("workflow", id, (err, details) => {
            if (!details) {
                details = {};
            }

            if (!details.params) {
                details.params = {};
            }

            let promises = [];
            promises.push(new Promise((resolve, reject) => {
                const uri = "workflow/config/" + id;
                _utils2.default._get(uri, this.options, (err, resp) => {
                    if (err) {
                        this.log.error("failed to fetch " + uri);
                        reject(err);
                        return;
                    }

                    (0, _lodash.merge)(details, resp);
                    resolve();
                });
            }));

            // MC-6483 - fetch ajax options for "AJAX drop down widget"
            let toFetch = (0, _lodash.filter)(details.params, { widget: "ajax_dropdown" });
            promises.unshift(...toFetch.map(param => {
                return new Promise((resolve, reject) => {

                    const uri = param.values.source.replace("{{EPI2ME_HOST}}", "");

                    _utils2.default._get(uri, this.options, (err, resp) => {
                        if (err) {
                            this.log.error("failed to fetch " + uri);
                            reject(err);
                            return;
                        }

                        const data_root = resp[param.values.data_root];
                        if (data_root) {
                            param.values = data_root.map(o => {
                                return {
                                    label: o[param.values.items.label_key],
                                    value: o[param.values.items.value_key]
                                };
                            });
                        }
                        resolve();
                    });
                });
            }));

            Promise.all(promises).then(() => {
                return Promise.resolve(cb(null, details));
            }).catch(err => {
                this.log.error(`${id}: error fetching config and parameters (${err.error || err})`);
                return Promise.reject(cb(err));
            });
        });

        return;
    }

    bundle_workflow(id_workflow, filepath, cb, progressCb) {
        // clean out target folder?
        // download tarball including workflow json
        // allocate install_token with STS credentials
        // initialise coastguard to perform ECR docker pull
        return _utils2.default._pipe(`workflow/bundle/${id_workflow}.tar.gz`, filepath, this.options, cb, progressCb);
    }

    start_workflow(config, cb) {
        return _utils2.default._post("workflow_instance", config, (0, _lodash.merge)({ legacy_form: true }, this.options), cb);
    }

    stop_workflow(instance_id, cb) {
        return _utils2.default._put("workflow_instance/stop", instance_id, null, (0, _lodash.merge)({ legacy_form: true }, this.options), cb);
    }

    workflow_instances(cb, query) {
        if (this.options.local) {
            if (query) {
                return cb(new Error("querying of local instances unsupported in local mode"));
            }

            let INSTANCE_DIR = _path2.default.join(this.options.url, "instances");
            return _fsExtra2.default.readdir(INSTANCE_DIR).then(data => {
                return data.filter(id => {
                    return _fsExtra2.default.statSync(_path2.default.join(INSTANCE_DIR, id)).isDirectory();
                });
            }).then(data => {
                return data.map(id => {
                    const filename = _path2.default.join(INSTANCE_DIR, id, "workflow.json");

                    let workflow;
                    try {
                        workflow = require(filename);
                    } catch (ignore) {
                        workflow = {
                            id_workflow: "-",
                            description: "-",
                            rev: "0.0"
                        };
                    }

                    workflow.id_workflow_instance = id;
                    workflow.filename = filename;
                    return workflow;
                });
            }).then(data => {
                return Promise.resolve(cb(null, data));
            });
        }

        if (query && query.run_id) {
            return _utils2.default._get("workflow_instance/wi?show=all&columns[0][name]=run_id;columns[0][searchable]=true;columns[0][search][regex]=true;columns[0][search][value]=" + query.run_id + ";", this.options, (e, json) => {
                let mapped = json.data.map(o => {
                    return {
                        id_workflow_instance: o.id_ins,
                        id_workflow: o.id_flo,
                        run_id: o.run_id,
                        description: o.desc,
                        rev: o.rev
                    };
                });
                return cb(null, mapped);
            });
        }

        return this._list("workflow_instance", cb);
    }

    workflow_instance(id, cb) {
        return this._read("workflow_instance", id, cb);
    }

    workflow_config(id, cb) {
        return _utils2.default._get("workflow/config/" + id, this.options, cb);
    }

    register(code, cb) {
        return _utils2.default._put("reg", code, {
            description: _os2.default.userInfo().username + "@" + _os2.default.hostname()
        }, (0, _lodash.merge)({ _signing: false, legacy_form: true }, this.options), cb);
    }

    datasets(cb, query) {
        if (!query) {
            query = {};
        }

        if (!query.show) {
            query.show = "mine";
        }

        if (!this.options.local) {
            return this._list(`dataset?show=${query.show}`, cb);
        }

        if (query.show !== "mine") {
            return cb(new Error("querying of local datasets unsupported in local mode"));
        }

        let DATASET_DIR = _path2.default.join(this.options.url, "datasets");
        _fsExtra2.default.readdir(DATASET_DIR).then(data => {
            return data.filter(id => {
                return _fsExtra2.default.statSync(_path2.default.join(DATASET_DIR, id)).isDirectory();
            });
        }).then(data => {
            let id_dataset = 1;
            return data.sort().map(id => {
                return {
                    is_reference_dataset: true,
                    summary: null,
                    dataset_status: {
                        status_label: "Active",
                        status_value: "active"
                    },
                    size: 0,
                    prefix: id,
                    id_workflow_instance: null,
                    id_account: null,
                    is_consented_human: null,
                    data_fields: null,
                    component_id: null,
                    uuid: id,
                    is_shared: false,
                    id_dataset: id_dataset++,
                    id_user: null,
                    last_modified: null,
                    created: null,
                    name: id,
                    source: id,
                    attributes: null
                };
            });
        }).then(data => {
            return Promise.resolve(cb(null, data));
        });
        return;
    }

    dataset(id, cb) {
        return this._read("dataset", id, cb);
    }

    fetchContent(url, cb) {
        let options = (0, _lodash.merge)({ skip_url_mangle: true }, this.options);
        _utils2.default._get(url, options, cb);
    }
}
exports.default = REST;