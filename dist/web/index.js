/**
 * Copyright Metrichor Ltd. (An Oxford Nanopore Technologies Company) 2019
 */

"use strict";function _interopDefault(e){return e&&"object"===typeof e&&"default"in e?e.default:e}var os=_interopDefault(require("os")),lodash=require("lodash"),axios=_interopDefault(require("axios")),crypto=_interopDefault(require("crypto")),version="3.0.0";axios.defaults.validateStatus=(e=>e<=504);const utils=function(){const e=(e,t)=>{e.headers||(e.headers={});let r=t;if(r||(r={}),!r.apikey)return;if(e.headers["X-EPI2ME-ApiKey"]=r.apikey,!r.apisecret)return;e.headers["X-EPI2ME-SignatureDate"]=(new Date).toISOString(),e.url.match(/^https:/)&&(e.url=e.url.replace(/:443/,"")),e.url.match(/^http:/)&&(e.url=e.url.replace(/:80/,""));const o=[e.url,Object.keys(e.headers).sort().filter(e=>e.match(/^x-epi2me/i)).map(t=>`${t}:${e.headers[t]}`).join("\n")].join("\n"),s=crypto.createHmac("sha1",r.apisecret).update(o).digest("hex");e.headers["X-EPI2ME-SignatureV0"]=s},t=async e=>{const t=e?e.data:null;if(!t)return Promise.reject(new Error("unexpected non-json response"));if(e&&e.status>=400){let r=`Network error ${e.status}`;return t.error&&(r=t.error),504===e.status&&(r="Please check your network connection and try again."),Promise.reject(new Error(r))}return t.error?Promise.reject(new Error(t.error)):Promise.resolve(t)};return{version:version,headers:(t,r)=>{let o=r;o||(o={}),t.headers=lodash.merge({Accept:"application/json","Content-Type":"application/json","X-EPI2ME-Client":o.user_agent||"api","X-EPI2ME-Version":o.agent_version||utils.version},t.headers),"signing"in o&&!o.signing||e(t,o),o.proxy&&(t.proxy=o.proxy)},get:async(e,r)=>{let o,s=r.url,n=e;r.skip_url_mangle?o=n:(n=`/${n}`,o=(s=s.replace(/\/+$/,""))+(n=n.replace(/\/+/g,"/")));const i={url:o,gzip:!0};let a;utils.headers(i,r);try{a=await axios.get(i.url,i)}catch(c){return Promise.reject(c)}return t(a,r)},post:async(e,r,o)=>{let s=o.url;const n={url:`${s=s.replace(/\/+$/,"")}/${e.replace(/\/+/g,"/")}`,gzip:!0,data:r};o.legacy_form&&(n.data=`json=${escape(JSON.stringify(r))}`),utils.headers(n,o);const i=n.data;let a;delete n.data;try{a=await axios.post(n.url,i,n)}catch(c){return Promise.reject(c)}return t(a,o)},put:async(e,r,o,s)=>{let n=s.url;const i={url:`${n=n.replace(/\/+$/,"")}/${e.replace(/\/+/g,"/")}/${r}`,gzip:!0,data:o};s.legacy_form&&(i.data=`json=${escape(JSON.stringify(o))}`),utils.headers(i,s);const a=i.data;let c;delete i.data;try{c=await axios.put(i.url,a,i)}catch(l){return Promise.reject(l)}return t(c,s)}}}();var local=!1,url="https://epi2me.nanoporetech.com",user_agent="EPI2ME API",signing=!0;class REST{constructor(e){this.options=lodash.assign({agent_version:utils.version,local:local,url:url,user_agent:user_agent,signing:signing},e);const{log:t}=this.options;if(t){if(!lodash.every([t.info,t.warn,t.error],lodash.isFunction))throw new Error('expected log object to have "error", "debug", "info" and "warn" methods');this.log=t}else this.log={info:e=>{console.info(`[${(new Date).toISOString()}] INFO: ${e}`)},debug:e=>{console.debug(`[${(new Date).toISOString()}] DEBUG: ${e}`)},warn:e=>{console.warn(`[${(new Date).toISOString()}] WARN: ${e}`)},error:e=>{console.error(`[${(new Date).toISOString()}] ERROR: ${e}`)}}}async list(e){try{const r=await utils.get(e,this.options),o=e.match(/^[a-z_]+/i)[0];return Promise.resolve(r[`${o}s`])}catch(t){return this.log.error(`list error ${String(t)}`),Promise.reject(t)}}async read(e,t){try{const o=await utils.get(`${e}/${t}`,this.options);return Promise.resolve(o)}catch(r){return this.log.error("read",r),Promise.reject(r)}}async user(e){let t;if(this.options.local)t={accounts:[{id_user_account:"none",number:"NONE",name:"None"}]};else try{t=await utils.get("user",this.options)}catch(r){return e?e(r):Promise.reject(r)}return e?e(null,t):Promise.resolve(t)}async instance_token(e,t){try{const o=await utils.post("token",{id_workflow_instance:e},lodash.assign({},this.options,{legacy_form:!0}));return t?t(null,o):Promise.resolve(o)}catch(r){return t?t(r):Promise.reject(r)}}async install_token(e,t){try{const o=await utils.post("token/install",{id_workflow:e},lodash.assign({},this.options,{legacy_form:!0}));return t?t(null,o):Promise.resolve(o)}catch(r){return t?t(r):Promise.reject(r)}}async attributes(e){try{const r=await this.list("attribute");return e?e(null,r):Promise.resolve(r)}catch(t){return e?e(t):Promise.reject(t)}}async workflows(e){try{const r=await this.list("workflow");return e?e(null,r):Promise.resolve(r)}catch(t){return e?e(t):Promise.reject(t)}}async ami_images(e){if(this.options.local){const t=new Error("ami_images unsupported in local mode");return e?e(t):Promise.reject(t)}try{const r=this.list("ami_image");return e?e(null,r):Promise.resolve(r)}catch(t){return e?e(t):Promise.reject(t)}}async ami_image(e,t,r){let o,s,n,i;if(e&&t&&r instanceof Function?(o=e,s=t,n=r,i="update"):e&&t instanceof Object&&!(t instanceof Function)?(o=e,s=t,i="update"):e instanceof Object&&t instanceof Function?(s=e,n=t,i="create"):e instanceof Object&&!t?(s=e,i="create"):(i="read",o=e,n=t instanceof Function?t:null),this.options.local){const e=new Error("ami_image unsupported in local mode");return n?n(e):Promise.reject(e)}if("update"===i)try{const e=await utils.put("ami_image",o,s,this.options);return n?n(null,e):Promise.resolve(e)}catch(a){return n?n(a):Promise.reject(a)}if("create"===i)try{const e=await utils.post("ami_image",s,this.options);return n?n(null,e):Promise.resolve(e)}catch(a){return n?n(a):Promise.reject(a)}if(!o){const e=new Error("no id_ami_image specified");return n?n(e):Promise.reject(e)}try{const e=await this.read("ami_image",o);return n?n(null,e):Promise.resolve(e)}catch(a){return n?n(a):Promise.reject(a)}}async workflow(e,t,r){let o,s,n,i;if(e&&t&&r instanceof Function?(o=e,s=t,n=r,i="update"):e&&t instanceof Object&&!(t instanceof Function)?(o=e,s=t,i="update"):e instanceof Object&&t instanceof Function?(s=e,n=t,i="create"):e instanceof Object&&!t?(s=e,i="create"):(i="read",o=e,n=t instanceof Function?t:null),"update"===i)try{const e=await utils.put("workflow",o,s,lodash.assign({},this.options,{legacy_form:!0}));return n?n(null,e):Promise.resolve(e)}catch(u){return n?n(u):Promise.reject(u)}if("create"===i)try{const e=await utils.post("workflow",s,lodash.assign({},this.options,{legacy_form:!0}));return n?n(null,e):Promise.resolve(e)}catch(u){return n?n(u):Promise.reject(u)}if(!o){const e=new Error("no workflow id specified");return n?n(e):Promise.reject(e)}const a={};try{const e=await this.read("workflow",o);if(e.error)throw new Error(e.error);lodash.merge(a,e)}catch(u){return this.log.error(`${o}: error fetching workflow ${String(u)}`),n?n(u):Promise.reject(u)}lodash.merge(a,{params:{}});try{const e=await utils.get(`workflow/config/${o}`,this.options);if(e.error)throw new Error(e.error);lodash.merge(a,e)}catch(u){return this.log.error(`${o}: error fetching workflow config ${String(u)}`),n?n(u):Promise.reject(u)}const c=lodash.filter(a.params,{widget:"ajax_dropdown"}),l=[...c.map((e,t)=>{const r=c[t];return new Promise(async(e,t)=>{const o=r.values.source.replace("{{EPI2ME_HOST}}","");try{const s=(await utils.get(o,this.options))[r.values.data_root];return s&&(r.values=s.map(e=>({label:e[r.values.items.label_key],value:e[r.values.items.value_key]}))),e()}catch(u){return this.log.error(`failed to fetch ${o}`),t(u)}})})];try{return await Promise.all(l),n?n(null,a):Promise.resolve(a)}catch(u){return this.log.error(`${o}: error fetching config and parameters ${String(u)}`),n?n(u):Promise.reject(u)}}start_workflow(e,t){return utils.post("workflow_instance",e,lodash.assign({},this.options,{legacy_form:!0}),t)}stop_workflow(e,t){return utils.put("workflow_instance/stop",e,null,lodash.assign({},this.options,{legacy_form:!0}),t)}async workflow_instances(e,t){let r,o;if(!e||e instanceof Function||void 0!==t?(r=e,o=t):o=e,o&&o.run_id)try{const e=(await utils.get(`workflow_instance/wi?show=all&columns[0][name]=run_id;columns[0][searchable]=true;columns[0][search][regex]=true;columns[0][search][value]=${o.run_id};`,this.options)).data.map(e=>({id_workflow_instance:e.id_ins,id_workflow:e.id_flo,run_id:e.run_id,description:e.desc,rev:e.rev}));return r?r(null,e):Promise.resolve(e)}catch(s){return r?r(s):Promise.reject(s)}try{const e=await this.list("workflow_instance");return r?r(null,e):Promise.resolve(e)}catch(s){return r?r(s):Promise.reject(s)}}async workflow_instance(e,t){try{const o=await this.read("workflow_instance",e);return t?t(null,o):Promise.resolve(o)}catch(r){return t?t(r):Promise.reject(r)}}workflow_config(e,t){return utils.get(`workflow/config/${e}`,this.options,t)}async register(e,t,r){let o,s;t&&t instanceof Function?s=t:(o=t,s=r);try{const t=await utils.put("reg",e,{description:o||`${os.userInfo().username}@${os.hostname()}`},lodash.assign({},this.options,{signing:!1}));return s?s(null,t):Promise.resolve(t)}catch(n){return s?s(n):Promise.reject(n)}}async datasets(e,t){let r,o;!e||e instanceof Function||void 0!==t?(r=e,o=t):o=e,o||(o={}),o.show||(o.show="mine");try{const e=await this.list(`dataset?show=${o.show}`);return r?r(null,e):Promise.resolve(e)}catch(s){return r?r(s):Promise.reject(s)}}async dataset(e,t){if(!this.options.local)try{const o=await this.read("dataset",e);return t?t(null,o):Promise.resolve(o)}catch(r){return t?t(r):Promise.reject(r)}try{const o=(await this.datasets()).find(t=>t.id_dataset===e);return t?t(null,o):Promise.resolve(o)}catch(r){return t?t(r):Promise.reject(r)}}async fetchContent(e,t){const r=lodash.assign({},this.options,{skip_url_mangle:!0});try{const s=await utils.get(e,r);return t?t(null,s):Promise.resolve(s)}catch(o){return t?t(o):Promise.reject(o)}}}module.exports=REST;
