/**
 * Copyright Metrichor Ltd. (An Oxford Nanopore Technologies Company) 2019
 */

import{merge as e,isString as t,isArray as o,assign as s,filter as r,every as i,isFunction as n,defaults as a}from"lodash";import l from"aws-sdk";import c from"fs-extra";import u,{EOL as d}from"os";import h from"path";import g from"proxy-agent";import p from"axios";import f from"crypto";import{httpsOverHttps as m,httpsOverHttp as w}from"tunnel";p.defaults.validateStatus=(e=>e<=504);const y=["B","KB","MB","GB","TB","PB","EB","ZB"],k=function(){const t=(e,t)=>{e.headers||(e.headers={});let o=t;if(o||(o={}),!o.apikey)return;if(e.headers["X-EPI2ME-ApiKey"]=o.apikey,!o.apisecret)return;e.headers["X-EPI2ME-SignatureDate"]=(new Date).toISOString(),e.url.match(/^https:/)&&(e.url=e.url.replace(/:443/,"")),e.url.match(/^http:/)&&(e.url=e.url.replace(/:80/,""));const s=[e.url,Object.keys(e.headers).sort().filter(e=>e.match(/^x-epi2me/i)).map(t=>`${t}:${e.headers[t]}`).join("\n")].join("\n"),r=f.createHmac("sha1",o.apisecret).update(s).digest("hex");e.headers["X-EPI2ME-SignatureV0"]=r},o=async e=>{const t=e?e.data:null;if(!t)return Promise.reject(new Error("unexpected non-json response"));if(e&&e.status>=400){let o=`Network error ${e.status}`;return t.error&&(o=t.error),504===e.status&&(o="Please check your network connection and try again."),Promise.reject(new Error(o))}return t.error?Promise.reject(new Error(t.error)):Promise.resolve(t)};return{version:"3.0.0",headers:(o,s)=>{const{log:r}=e({log:{debug:()=>{}}},s);let i=s;if(i||(i={}),o.headers=e({Accept:"application/json","Content-Type":"application/json","X-EPI2ME-Client":i.user_agent||"api","X-EPI2ME-Version":i.agent_version||k.version},o.headers),"signing"in i&&!i.signing||t(o,i),i.proxy){const e=i.proxy.match(/https?:\/\/((\S+):(\S+)@)?(\S+):(\d+)/),t=e[2],s=e[3],n={host:e[4],port:e[5]};t&&s&&(n.proxyAuth=`${t}:${s}`),i.proxy.match(/^https/)?(r.debug("using HTTPS over HTTPS proxy",JSON.stringify(n)),o.httpsAgent=m({proxy:n})):(r.debug("using HTTPS over HTTP proxy",JSON.stringify(n)),o.httpsAgent=w({proxy:n})),o.proxy=!1}},get:async(t,s)=>{const{log:r}=e({log:{debug:()=>{}}},s);let i,n=s.url,a=t;s.skip_url_mangle?i=a:(a=`/${a}`,i=(n=n.replace(/\/+$/,""))+(a=a.replace(/\/+/g,"/")));const l={url:i,gzip:!0};let c;k.headers(l,s);try{r.debug(`GET ${l.url}`),c=await p.get(l.url,l)}catch(u){return Promise.reject(u)}return o(c,s)},post:async(t,s,r)=>{const{log:i}=e({log:{debug:()=>{}}},r);let n=r.url;const a={url:`${n=n.replace(/\/+$/,"")}/${t.replace(/\/+/g,"/")}`,gzip:!0,data:s,headers:{}};if(r.legacy_form){const t=[],o=e({json:JSON.stringify(s)},s);Object.keys(o).sort().forEach(e=>{t.push(`${e}=${escape(o[e])}`)}),a.data=t.join("&"),a.headers["Content-Type"]="application/x-www-form-urlencoded"}k.headers(a,r);const{data:l}=a;let c;delete a.data;try{i.debug(`POST ${a.url}`),c=await p.post(a.url,l,a)}catch(u){return Promise.reject(u)}return o(c,r)},put:async(t,s,r,i)=>{const{log:n}=e({log:{debug:()=>{}}},i);let a=i.url;const l={url:`${a=a.replace(/\/+$/,"")}/${t.replace(/\/+/g,"/")}/${s}`,gzip:!0,data:r,headers:{}};if(i.legacy_form){const t=[],o=e({json:JSON.stringify(r)},r);Object.keys(o).sort().forEach(e=>{t.push(`${e}=${escape(o[e])}`)}),l.data=t.join("&"),l.headers["Content-Type"]="application/x-www-form-urlencoded"}k.headers(l,i);const{data:c}=l;let u;delete l.data;try{n.debug(`PUT ${l.url}`),u=await p.put(l.url,c,l)}catch(d){return Promise.reject(d)}return o(u,i)},niceSize(e,t){let o=t||0,s=e||0;return s>1e3?(s/=1e3,(o+=1)>=y.length?"???":this.niceSize(s,o)):0===o?`${s} ${y[o]}`:`${s.toFixed(2)} ${y[o]}`}}}();const S={fastq:function(e){return new Promise(async(t,o)=>{let s,r=1,i={size:0};try{i=await c.stat(e)}catch(n){o(n)}c.createReadStream(e).on("data",e=>{s=-1,r-=1;do{s=e.indexOf(10,s+1),r+=1}while(-1!==s)}).on("end",()=>t({type:"fastq",bytes:i.size,reads:Math.floor(r/4)})).on("error",o)})},fasta:function(e){return new Promise(async(t,o)=>{let s,r=1,i={size:0};try{i=await c.stat(e)}catch(n){o(n)}c.createReadStream(e).on("data",e=>{s=-1,r-=1;do{s=e.indexOf(62,s+1),r+=1}while(-1!==s)}).on("end",()=>t({type:"fasta",bytes:i.size,sequences:Math.floor(r/2)})).on("error",o)})},default:async function(e){return c.stat(e).then(e=>({type:"bytes",bytes:e.size}))}};function v(e){if("string"!==typeof e&&!(e instanceof String))return Promise.resolve({});let t=h.extname(e).toLowerCase().replace(/^[.]/,"");return"fq"===t?t="fastq":"fa"===t&&(t="fasta"),S[t]||(t="default"),S[t](e)}k.pipe=(async(e,t,o,s)=>{let r=o.url,i=`/${e}`;const n={uri:(r=r.replace(/\/+$/,""))+(i=i.replace(/\/+/g,"/")),gzip:!0,headers:{"Accept-Encoding":"gzip",Accept:"application/gzip"}};return k.headers(n,o),o.proxy&&(n.proxy=o.proxy),s&&(n.onUploadProgress=s),n.responseType="stream",new Promise(async(e,o)=>{try{const r=c.createWriteStream(t);(await p.get(n.uri,n)).data.pipe(r),r.on("finish",e(t)),r.on("error",o(new Error("writer failed")))}catch(s){o(s)}})}),k.countFileReads=(e=>v(e).then(e=>e.reads)),k.findSuitableBatchIn=(async e=>{await c.mkdirp(e);const t=async()=>{const t=`batch_${Date.now()}`,o=h.join(e,t);return c.mkdirp(o)};let o=await c.readdir(e);if(!(o=o.filter(e=>"batch_"===e.slice(0,"batch_".length)))||!o.length)return t();const s=h.join(e,o.pop());return c.readdirSync(s).length<4e3?s:t()});let $=0;k.getFileID=(()=>`FILE_${$+=1}`),k.lsFolder=((e,o,s,r="")=>c.readdir(e).then(i=>{let n=i;o&&(n=n.filter(o));let a=[];const l=[],u=n.map(o=>c.stat(h.join(e,o)).then(i=>{if(i.isDirectory())return a.push(h.join(e,o)),Promise.resolve();if(i.isFile()&&(!s||h.extname(o)===s)){const s={name:h.parse(o).base,path:h.join(e,o),size:i.size,id:k.getFileID()},n=e.replace(r,"").replace("\\","").replace("/","");return t(n)&&n.length&&(s.batch=n),l.push(s),Promise.resolve()}return Promise.resolve()}));return Promise.all(u).then(()=>(a=a.sort(),Promise.resolve({files:l,folders:a}))).catch(e=>Promise.reject(new Error(`error listing folder ${e}`)))})),k.loadInputFiles=(({inputFolder:e,outputFolder:t,uploadedFolder:s,filetype:r},i=[])=>new Promise((n,a)=>{const l=e=>{const r=h.basename(e);return!("downloads"===r||"uploaded"===r||"skip"===r||"fail"===r||s&&r===h.basename(s)||t&&r===h.basename(t)||"tmp"===r||o(i)&&i.indexOf(h.posix.basename(e))>-1)};let c=[e];const u=()=>{c&&c.length&&k.lsFolder(c.splice(0,1)[0],l,r,e).then(({files:e,folders:t})=>{e&&e.length?n(e):(c=[...t,...c]).length?u():n()}).catch(e=>{a(new Error(`Failed to check for new files: ${e.message}`))})};u()}));var P=!1,_="https://epi2me.nanoporetech.com",b="EPI2ME API",j=!0,I={local:P,url:_,user_agent:b,region:"eu-west-1",retention:"on",sessionGrace:5,sortInputFiles:!1,uploadTimeout:1200,downloadTimeout:1200,fileCheckInterval:5,downloadCheckInterval:3,stateCheckInterval:60,inFlightDelay:600,waitTimeSeconds:20,waitTokenError:30,downloadPoolSize:1,filter:"on",filterByChannel:"off",downloadMode:"data+telemetry",deleteOnComplete:"off",filetype:".fastq",signing:j};class E{constructor(e){this.options=s({agent_version:k.version,local:P,url:_,user_agent:b,signing:j},e),this.log=this.options.log}async list(e){try{const o=await k.get(e,this.options),s=e.match(/^[a-z_]+/i)[0];return Promise.resolve(o[`${s}s`])}catch(t){return this.log.error(`list error ${String(t)}`),Promise.reject(t)}}async read(e,t){try{const s=await k.get(`${e}/${t}`,this.options);return Promise.resolve(s)}catch(o){return this.log.error("read",o),Promise.reject(o)}}async user(e){let t;if(this.options.local)t={accounts:[{id_user_account:"none",number:"NONE",name:"None"}]};else try{t=await k.get("user",this.options)}catch(o){return e?e(o):Promise.reject(o)}return e?e(null,t):Promise.resolve(t)}async instanceToken(e,t){try{const r=await k.post("token",{id_workflow_instance:e},s({},this.options,{legacy_form:!0}));return t?t(null,r):Promise.resolve(r)}catch(o){return t?t(o):Promise.reject(o)}}async installToken(e,t){try{const r=await k.post("token/install",{id_workflow:e},s({},this.options,{legacy_form:!0}));return t?t(null,r):Promise.resolve(r)}catch(o){return t?t(o):Promise.reject(o)}}async attributes(e){try{const o=await this.list("attribute");return e?e(null,o):Promise.resolve(o)}catch(t){return e?e(t):Promise.reject(t)}}async workflows(e){try{const o=await this.list("workflow");return e?e(null,o):Promise.resolve(o)}catch(t){return e?e(t):Promise.reject(t)}}async amiImages(e){if(this.options.local){const t=new Error("amiImages unsupported in local mode");return e?e(t):Promise.reject(t)}try{const o=this.list("ami_image");return e?e(null,o):Promise.resolve(o)}catch(t){return e?e(t):Promise.reject(t)}}async amiImage(e,t,o){let s,r,i,n;if(e&&t&&o instanceof Function?(s=e,r=t,i=o,n="update"):e&&t instanceof Object&&!(t instanceof Function)?(s=e,r=t,n="update"):e instanceof Object&&t instanceof Function?(r=e,i=t,n="create"):e instanceof Object&&!t?(r=e,n="create"):(n="read",s=e,i=t instanceof Function?t:null),this.options.local){const e=new Error("ami_image unsupported in local mode");return i?i(e):Promise.reject(e)}if("update"===n)try{const e=await k.put("ami_image",s,r,this.options);return i?i(null,e):Promise.resolve(e)}catch(a){return i?i(a):Promise.reject(a)}if("create"===n)try{const e=await k.post("ami_image",r,this.options);return i?i(null,e):Promise.resolve(e)}catch(a){return i?i(a):Promise.reject(a)}if(!s){const e=new Error("no id_ami_image specified");return i?i(e):Promise.reject(e)}try{const e=await this.read("ami_image",s);return i?i(null,e):Promise.resolve(e)}catch(a){return i?i(a):Promise.reject(a)}}async workflow(t,o,i){let n,a,l,c;if(t&&o&&i instanceof Function?(n=t,a=o,l=i,c="update"):t&&o instanceof Object&&!(o instanceof Function)?(n=t,a=o,c="update"):t instanceof Object&&o instanceof Function?(a=t,l=o,c="create"):t instanceof Object&&!o?(a=t,c="create"):(c="read",n=t,l=o instanceof Function?o:null),"update"===c)try{const e=await k.put("workflow",n,a,s({},this.options,{legacy_form:!0}));return l?l(null,e):Promise.resolve(e)}catch(g){return l?l(g):Promise.reject(g)}if("create"===c)try{const e=await k.post("workflow",a,s({},this.options,{legacy_form:!0}));return l?l(null,e):Promise.resolve(e)}catch(g){return l?l(g):Promise.reject(g)}if(!n){const e=new Error("no workflow id specified");return l?l(e):Promise.reject(e)}const u={};try{const t=await this.read("workflow",n);if(t.error)throw new Error(t.error);e(u,t)}catch(g){return this.log.error(`${n}: error fetching workflow ${String(g)}`),l?l(g):Promise.reject(g)}e(u,{params:{}});try{const t=await k.get(`workflow/config/${n}`,this.options);if(t.error)throw new Error(t.error);e(u,t)}catch(g){return this.log.error(`${n}: error fetching workflow config ${String(g)}`),l?l(g):Promise.reject(g)}const d=r(u.params,{widget:"ajax_dropdown"}),h=[...d.map((e,t)=>{const o=d[t];return new Promise(async(e,t)=>{const s=o.values.source.replace("{{EPI2ME_HOST}}","");try{const r=(await k.get(s,this.options))[o.values.data_root];return r&&(o.values=r.map(e=>({label:e[o.values.items.label_key],value:e[o.values.items.value_key]}))),e()}catch(g){return this.log.error(`failed to fetch ${s}`),t(g)}})})];try{return await Promise.all(h),l?l(null,u):Promise.resolve(u)}catch(g){return this.log.error(`${n}: error fetching config and parameters ${String(g)}`),l?l(g):Promise.reject(g)}}async startWorkflow(e,t){return k.post("workflow_instance",e,s({},this.options,{legacy_form:!0}),t)}stopWorkflow(e,t){return k.put("workflow_instance/stop",e,null,s({},this.options,{legacy_form:!0}),t)}async workflowInstances(e,t){let o,s;if(!e||e instanceof Function||void 0!==t?(o=e,s=t):s=e,s&&s.run_id)try{const e=(await k.get(`workflow_instance/wi?show=all&columns[0][name]=run_id;columns[0][searchable]=true;columns[0][search][regex]=true;columns[0][search][value]=${s.run_id};`,this.options)).data.map(e=>({id_workflow_instance:e.id_ins,id_workflow:e.id_flo,run_id:e.run_id,description:e.desc,rev:e.rev}));return o?o(null,e):Promise.resolve(e)}catch(r){return o?o(r):Promise.reject(r)}try{const e=await this.list("workflow_instance");return o?o(null,e):Promise.resolve(e)}catch(r){return o?o(r):Promise.reject(r)}}async workflowInstance(e,t){try{const s=await this.read("workflow_instance",e);return t?t(null,s):Promise.resolve(s)}catch(o){return t?t(o):Promise.reject(o)}}workflowConfig(e,t){return k.get(`workflow/config/${e}`,this.options,t)}async register(e,t,o){let r,i;t&&t instanceof Function?i=t:(r=t,i=o);try{const t=await k.put("reg",e,{description:r||`${u.userInfo().username}@${u.hostname()}`},s({},this.options,{signing:!1}));return i?i(null,t):Promise.resolve(t)}catch(n){return i?i(n):Promise.reject(n)}}async datasets(e,t){let o,s;!e||e instanceof Function||void 0!==t?(o=e,s=t):s=e,s||(s={}),s.show||(s.show="mine");try{const e=await this.list(`dataset?show=${s.show}`);return o?o(null,e):Promise.resolve(e)}catch(r){return o?o(r):Promise.reject(r)}}async dataset(e,t){if(!this.options.local)try{const s=await this.read("dataset",e);return t?t(null,s):Promise.resolve(s)}catch(o){return t?t(o):Promise.reject(o)}try{const s=(await this.datasets()).find(t=>t.id_dataset===e);return t?t(null,s):Promise.resolve(s)}catch(o){return t?t(o):Promise.reject(o)}}async fetchContent(e,t){const o=s({},this.options,{skip_url_mangle:!0});try{const s=await k.get(e,o);return t?t(null,s):Promise.resolve(s)}catch(r){return t?t(r):Promise.reject(r)}}}class x extends E{async workflows(e){if(!this.options.local)return super.workflows(e);const t=h.join(this.options.url,"workflows");let o;try{return o=(await c.readdir(t)).filter(e=>c.statSync(h.join(t,e)).isDirectory()).map(e=>h.join(t,e,"workflow.json")).map(e=>c.readJsonSync(e)),e?e(null,o):Promise.resolve(o)}catch(s){return this.log.warn(s),e?e(void 0):Promise.reject(void 0)}}async workflow(e,t,o){if(!this.options.local||!e||"object"===typeof e||o)return super.workflow(e,t,o);const s=h.join(this.options.url,"workflows"),r=h.join(s,e,"workflow.json");try{const e=await c.readJson(r);return o?o(null,e):Promise.resolve(e)}catch(i){return o?o(i):Promise.reject(i)}}async workflowInstances(e,t){if(!this.options.local)return super.workflowInstances(e,t);let o,s;if(!e||e instanceof Function||void 0!==t?(o=e,s=t):s=e,s){const e=new Error("querying of local instances unsupported in local mode");return o?o(e):Promise.reject(e)}const r=h.join(this.options.url,"instances");try{let e=await c.readdir(r);return e=(e=e.filter(e=>c.statSync(h.join(r,e)).isDirectory())).map(e=>{const t=h.join(r,e,"workflow.json");let o;try{o=c.readJsonSync(t)}catch(s){o={id_workflow:"-",description:"-",rev:"0.0"}}return o.id_workflow_instance=e,o.filename=t,o}),o?o(null,e):Promise.resolve(e)}catch(i){return o?o(i):Promise.reject(i)}}async datasets(e,t){if(!this.options.local)return super.datasets(e,t);let o,s;if(!e||e instanceof Function||void 0!==t?(o=e,s=t):s=e,s||(s={}),s.show||(s.show="mine"),"mine"!==s.show)return o(new Error("querying of local datasets unsupported in local mode"));const r=h.join(this.options.url,"datasets");try{let e=await c.readdir(r);e=e.filter(e=>c.statSync(h.join(r,e)).isDirectory());let t=0;return e=e.sort().map(e=>({is_reference_dataset:!0,summary:null,dataset_status:{status_label:"Active",status_value:"active"},size:0,prefix:e,id_workflow_instance:null,id_account:null,is_consented_human:null,data_fields:null,component_id:null,uuid:e,is_shared:!1,id_dataset:t+=1,id_user:null,last_modified:null,created:null,name:e,source:e,attributes:null})),o?o(null,e):Promise.resolve(e)}catch(i){return this.log.warn(i),o?o(null,[]):Promise.resolve([])}}async bundleWorkflow(e,t,o){return k.pipe(`workflow/bundle/${e}.tar.gz`,t,this.options,o)}}class F{constructor(t){let o;if((o="string"===typeof t||"object"===typeof t&&t.constructor===String?JSON.parse(t):t||{}).log){if(!i([o.log.info,o.log.warn,o.log.error,o.log.debug],n))throw new Error('expected log object to have "error", "debug", "info" and "warn" methods');this.log=o.log}else this.log={info:e=>{console.info(`[${(new Date).toISOString()}] INFO: ${e}`)},debug:e=>{console.debug(`[${(new Date).toISOString()}] DEBUG: ${e}`)},warn:e=>{console.warn(`[${(new Date).toISOString()}] WARN: ${e}`)},error:e=>{console.error(`[${(new Date).toISOString()}] ERROR: ${e}`)}};this.states={upload:{filesCount:0,success:{files:0},failure:{},queueLength:{files:0},enqueued:{files:0},total:{files:0,bytes:0}},download:{success:{files:0,reads:0,bytes:0},fail:0,failure:{},types:{}},warnings:[]},this.config={options:a(o,I),instance:{id_workflow_instance:o.id_workflow_instance,inputQueueName:null,outputQueueName:null,outputQueueURL:null,discoverQueueCache:{},bucket:null,bucketFolder:null,remote_addr:null,chain:null,key_id:null}},this.config.instance.awssettings={region:this.config.options.region},this.config.options.inputFolder&&(this.config.options.uploadedFolder&&"+uploaded"!==this.config.options.uploadedFolder?this.uploadTo=this.config.options.uploadedFolder:this.uploadTo=h.join(this.config.options.inputFolder,"uploaded"),this.skipTo=h.join(this.config.options.inputFolder,"skip")),this.REST=new x(e({},{log:this.log},this.config.options))}async stopEverything(){this.log.debug("stopping watchers"),this.downloadCheckInterval&&(this.log.debug("clearing downloadCheckInterval interval"),clearInterval(this.downloadCheckInterval),this.downloadCheckInterval=null),this.stateCheckInterval&&(this.log.debug("clearing stateCheckInterval interval"),clearInterval(this.stateCheckInterval),this.stateCheckInterval=null),this.fileCheckInterval&&(this.log.debug("clearing fileCheckInterval interval"),clearInterval(this.fileCheckInterval),this.fileCheckInterval=null),this.downloadWorkerPool&&(this.log.debug("clearing downloadWorkerPool"),await Promise.all(Object.values(this.downloadWorkerPool)),this.downloadWorkerPool=null);const{id_workflow_instance:e}=this.config.instance;if(e){try{await this.REST.stopWorkflow(e)}catch(t){return this.log.error(`Error stopping instance: ${String(t)}`),Promise.reject(t)}this.log.info(`workflow instance ${e} stopped`)}return Promise.resolve()}async session(){if(this.sessioning)return Promise.resolve();if(!this.states.sts_expiration||this.states.sts_expiration&&this.states.sts_expiration<=Date.now()){this.sessioning=!0;try{await this.fetchInstanceToken(),this.sessioning=!1}catch(e){return this.sessioning=!1,this.log.error(`session error ${String(e)}`),Promise.reject(e)}}return Promise.resolve()}async fetchInstanceToken(){if(!this.config.instance.id_workflow_instance)return Promise.reject(new Error("must specify id_workflow_instance"));if(this.states.sts_expiration&&this.states.sts_expiration>Date.now())return Promise.resolve();this.log.debug("new instance token needed");try{const t=await this.REST.instanceToken(this.config.instance.id_workflow_instance);this.log.debug(`allocated new instance token expiring at ${t.expiration}`),this.states.sts_expiration=new Date(t.expiration).getTime()-60*this.config.options.sessionGrace,this.config.options.proxy&&l.config.update({httpOptions:{agent:g(this.config.options.proxy,!0)}}),l.config.update(this.config.instance.awssettings),l.config.update(t)}catch(e){this.log.warn(`failed to fetch instance token: ${String(e)}`)}return Promise.resolve()}async sessionedS3(){return await this.session(),new l.S3({useAccelerateEndpoint:"on"===this.config.options.awsAcceleration})}async sessionedSQS(){return await this.session(),new l.SQS}async autoStart(e,t){let o;try{o=await this.REST.startWorkflow(e)}catch(s){const e=`Failed to start workflow: ${String(s)}`;return this.log.warn(e),t?t(e):Promise.reject(s)}return this.config.workflow=JSON.parse(JSON.stringify(e)),this.log.debug("instance",JSON.stringify(o)),this.log.debug("workflow config",JSON.stringify(this.config.workflow)),this.autoConfigure(o,t)}async autoJoin(e,t){let o;this.config.instance.id_workflow_instance=e;try{o=await this.REST.workflowInstance(e)}catch(s){const e=`Failed to join workflow instance: ${String(s)}`;return this.log.warn(e),t?t(e):Promise.reject(s)}return"stopped"===o.state?(this.log.warn(`workflow ${e} is already stopped`),t?t("could not join workflow"):Promise.reject(new Error("could not join workflow"))):(this.config.workflow=this.config.workflow||{},this.log.debug("instance",JSON.stringify(o)),this.log.debug("workflow config",JSON.stringify(this.config.workflow)),this.autoConfigure(o,t))}async autoConfigure(e,t){if(["id_workflow_instance","id_workflow","remote_addr","key_id","bucket","user_defined"].forEach(t=>{this.config.instance[t]=e[t]}),this.config.instance.inputQueueName=e.inputqueue,this.config.instance.outputQueueName=e.outputqueue,this.config.instance.awssettings.region=e.region||this.config.options.region,this.config.instance.bucketFolder=`${e.outputqueue}/${e.id_user}/${e.id_workflow_instance}`,e.chain)if("object"===typeof e.chain)this.config.instance.chain=e.chain;else try{this.config.instance.chain=JSON.parse(e.chain)}catch(i){throw new Error(`exception parsing chain JSON ${String(i)}`)}if(!this.config.options.inputFolder)throw new Error("must set inputFolder");if(!this.config.options.outputFolder)throw new Error("must set outputFolder");if(!this.config.instance.bucketFolder)throw new Error("bucketFolder must be set");if(!this.config.instance.inputQueueName)throw new Error("inputQueueName must be set");if(!this.config.instance.outputQueueName)throw new Error("outputQueueName must be set");c.mkdirpSync(this.config.options.outputFolder);const o=this.config.instance.id_workflow_instance?`telemetry-${this.config.instance.id_workflow_instance}.log`:"telemetry.log",s=h.join(this.config.options.outputFolder,"epi2me-logs"),r=h.join(s,o);return c.mkdirp(s,e=>{if(e&&!String(e).match(/EEXIST/))this.log.error(`error opening telemetry log stream: mkdirpException:${String(e)}`);else try{this.telemetryLogStream=c.createWriteStream(r,{flags:"a"}),this.log.info(`logging telemetry to ${r}`)}catch(t){this.log.error(`error opening telemetry log stream: ${String(t)}`)}}),t&&t(null,this.config.instance),this.downloadCheckInterval=setInterval(()=>{this.checkForDownloads()},1e3*this.config.options.downloadCheckInterval),this.stateCheckInterval=setInterval(async()=>{try{const o=await this.REST.workflowInstance(this.config.instance.id_workflow_instance);if("stopped"===o.state){this.log.warn(`instance was stopped remotely at ${o.stop_date}. shutting down the workflow.`);try{const t=await this.stopEverything();"function"===typeof t.config.options.remoteShutdownCb&&t.config.options.remoteShutdownCb(`instance was stopped remotely at ${o.stop_date}`)}catch(e){this.log.error(`Error whilst stopping: ${String(e)}`)}}}catch(t){this.log.warn(`failed to check instance state: ${t&&t.error?t.error:t}`)}},1e3*this.config.options.stateCheckInterval),await this.session(),this.loadUploadFiles(),this.fileCheckInterval=setInterval(this.loadUploadFiles.bind(this),1e3*this.config.options.fileCheckInterval),Promise.resolve(e)}async checkForDownloads(){if(this.checkForDownloadsRunning)return this.log.debug("checkForDownloads already running"),Promise.resolve();this.checkForDownloadsRunning=!0;try{const t=await this.discoverQueue(this.config.instance.outputQueueName),o=await this.queueLength(t);if(o)return this.log.debug(`downloads available: ${o}`),this.checkForDownloadsRunning=!1,this.downloadAvailable();this.log.debug("no downloads available")}catch(e){this.log.warn(`checkForDownloads error ${String(e)}`),this.states.download.failure||(this.states.download.failure={}),this.states.download.failure[e]=this.states.download.failure[e]?this.states.download.failure[e]+1:1}return this.checkForDownloadsRunning=!1,Promise.resolve()}async downloadAvailable(){const e=Object.keys(this.downloadWorkerPool||{}).length;if(e>=this.config.options.downloadPoolSize)return this.log.debug(`${e} downloads already queued`),Promise.resolve();let t;try{const s=await this.discoverQueue(this.config.instance.outputQueueName);this.log.debug("fetching messages");const r=await this.sessionedSQS();t=await r.receiveMessage({AttributeNames:["All"],QueueUrl:s,VisibilityTimeout:this.config.options.inFlightDelay,MaxNumberOfMessages:this.config.options.downloadPoolSize-e,WaitTimeSeconds:this.config.options.waitTimeSeconds}).promise()}catch(o){return this.log.error(`receiveMessage exception: ${String(o)}`),this.states.download.failure[o]=this.states.download.failure[o]?this.states.download.failure[o]+1:1,Promise.reject(o)}return this.receiveMessages(t)}storeState(e,t,o,s){const r=s||{};"incr"===o?Object.keys(r).forEach(o=>{this.states[e][t][o]=this.states[e][t][o]?this.states[e][t][o]+parseInt(r[o],10):parseInt(r[o],10)}):Object.keys(r).forEach(o=>{this.states[e][t][o]=this.states[e][t][o]?this.states[e][t][o]-parseInt(r[o],10):-parseInt(r[o],10)}),this.states[e].success.niceSize=k.niceSize(this.states[e].success.bytes),this.states[e].niceTypes=Object.keys(this.states[e].types||{}).sort().map(t=>`${this.states[e].types[t]} ${t}`).join(", ")}uploadState(e,t,o){return this.storeState("upload",e,t,o)}downloadState(e,t,o){return this.storeState("download",e,t,o)}async loadUploadFiles(){if(this.dirScanInProgress)return this.log.debug("upload: directory scan already in progress"),Promise.resolve();this.dirScanInProgress=!0,this.log.debug("upload: scanning input folder for new files");try{const t=await k.loadInputFiles(this.config.options,this.log);await this.enqueueUploadFiles(t)}catch(e){this.log.error(String(e))}return this.dirScanInProgress=!1,Promise.resolve()}async enqueueUploadFiles(t){let s,r=0,i=0,n={};if(!o(t)||!t.length)return Promise.resolve();if("workflow"in this.config)if("workflow_attributes"in this.config.workflow)n=this.config.workflow.workflow_attributes;else if("attributes"in this.config.workflow){let{attributes:e}=this.config.workflow.attributes;if(e||(e={}),"epi2me:max_size"in e&&(n.max_size=parseInt(e["epi2me:max_size"],10)),"epi2me:max_files"in e&&(n.max_files=parseInt(e["epi2me:max_files"],10)),"epi2me:category"in e){e["epi2me:category"].includes("storage")&&(n.requires_storage=!0)}}if("requires_storage"in n&&n.requires_storage&&!("storage_account"in this.config.workflow))return s="ERROR: Workflow requires storage enabled. Please provide a valid storage account [ --storage ].",this.log.error(s),this.states.warnings.push(s),Promise.resolve();if("max_size"in n&&(i=parseInt(n.max_size,10)),"max_files"in n&&(r=parseInt(n.max_files,10),t.length>r))return s=`ERROR: ${t.length} files found. Workflow can only accept ${r}. Please move the extra files away.`,this.log.error(s),this.states.warnings.push(s),Promise.resolve();this.log.info(`upload: enqueueUploadFiles: ${t.length} new files`),this.states.upload.filesCount+=t.length;const a=t.map(async t=>{const o=t;return r&&this.states.upload.filesCount>r?(s=`Maximum ${r} file(s) already uploaded. Moving ${o.name} into skip folder`,this.log.error(s),this.states.warnings.push(s),this.states.upload.filesCount-=1,o.skip="SKIP_TOO_MANY"):i&&o.size>i?(s=`${o.name} is over ${i.toString().replace(/\B(?=(\d{3})+(?!\d))/g,",")}. Moving into skip folder`,o.skip="SKIP_TOO_BIG",this.states.upload.filesCount-=1,this.log.error(s),this.states.warnings.push(s)):(o.stats=await v(o.path),this.uploadState("enqueued","incr",e({files:1},o.stats))),this.uploadJob(o)});try{return await Promise.all(a),this.log.info(`upload: inputBatchQueue (${a.length} jobs) complete`),this.loadUploadFiles()}catch(l){return this.log.error(`upload: enqueueUploadFiles exception ${String(l)}`),Promise.reject(l)}}async uploadJob(t){if("skip"in t){this.uploadState("enqueued","decr",e({files:1},t.stats)),this.uploadState("queueLength","decr",t.stats);try{await this.moveFile(t,"skip")}catch(r){return Promise.reject(r)}return Promise.resolve()}let o,s;try{this.log.info(`upload: ${t.id} starting`),o=await this.uploadHandler(t),this.log.info(`upload: ${o.id} uploaded and notified`)}catch(i){s=i,this.log.error(`upload: ${t.id} done, but failed: ${String(s)}`)}return o||(o={}),this.uploadState("enqueued","decr",e({files:1},o.stats)),s?(this.log.error(`uploadJob ${s}`),this.states.upload.failure||(this.states.upload.failure={}),this.states.upload.failure[s]=this.states.upload.failure[s]?this.states.upload.failure[s]+1:1):(this.uploadState("queueLength","decr",o.stats),this.uploadState("success","incr",e({files:1},o.stats))),Promise.resolve()}async receiveMessages(e){return e&&e.Messages&&e.Messages.length?(this.downloadWorkerPool||(this.downloadWorkerPool={}),e.Messages.forEach(e=>{const t=new Promise((t,o)=>{const s=setTimeout(()=>{clearTimeout(s),this.log.error(`this.downloadWorkerPool timeoutHandle. Clearing queue slot for message: ${e.Body}`),delete this.downloadWorkerPool[e.MessageId],o(new Error("download timed out"))},1e3*(60+this.config.options.downloadTimeout));this.processMessage(e).then(()=>{delete this.downloadWorkerPool[e.MessageId],clearTimeout(s),t()}).catch(o=>{this.log.error(`processMessage ${String(o)}`),delete this.downloadWorkerPool[e.MessageId],clearTimeout(s),t()})});this.downloadWorkerPool[e.MessageId]=t}),this.log.info(`downloader queued ${e.Messages.length} messages for processing`),Promise.resolve()):(this.log.info("complete (empty)"),Promise.resolve())}async deleteMessage(e){try{const o=await this.discoverQueue(this.config.instance.outputQueueName);return(await this.sessionedSQS()).deleteMessage({QueueUrl:o,ReceiptHandle:e.ReceiptHandle}).promise()}catch(t){return this.log.error(`deleteMessage exception: ${String(t)}`),this.states.download.failure[t]=this.states.download.failure[t]?this.states.download.failure[t]+1:1,Promise.reject(t)}}async processMessage(e){let t,o;if(!e)return this.log.debug("download.processMessage: empty message"),Promise.resolve();"Attributes"in e&&("ApproximateReceiveCount"in e.Attributes?this.log.info(`download.processMessage: ${e.MessageId} / ${e.Attributes.ApproximateReceiveCount}`):this.log.info(`download.processMessage: ${e.MessageId} / NA `));try{t=JSON.parse(e.Body)}catch(a){this.log.error(`error parsing JSON message.Body from message: ${JSON.stringify(e)} ${String(a)}`);try{await this.deleteMessage(e)}catch(l){this.log.error(`Exception deleting message: ${String(l)}`)}return Promise.resolve()}if(t.telemetry){const{telemetry:e}=t;if(e.tm_path)try{const o=await this.sessionedS3(),s=await o.getObject({Bucket:t.bucket,Key:e.tm_path}).promise();e.batch=s.Body.toString("utf-8").split("\n").filter(e=>e&&e.length>0).map(e=>{try{return JSON.parse(e)}catch(l){return this.log.error(`Telemetry Batch JSON Parse error: ${String(l)}`),e}})}catch(u){this.log.error(`Could not fetch telemetry JSON: ${String(u)}`)}try{this.telemetryLogStream.write(JSON.stringify(e)+d)}catch(g){this.log.error(`error writing telemetry: ${g}`)}this.config.options.telemetryCb&&this.config.options.telemetryCb(e)}if(!t.path)return this.log.warn("nothing to download"),Promise.resolve();const s=t.path.match(/[\w\W]*\/([\w\W]*?)$/),r=s?s[1]:"";if(o=this.config.options.outputFolder,"on"===this.config.options.filter&&t.telemetry&&t.telemetry.hints&&t.telemetry.hints.folder){this.log.debug(`using folder hint ${t.telemetry.hints.folder}`);const e=t.telemetry.hints.folder.split("/").map(e=>e.toUpperCase());o=h.join.apply(null,[o,...e])}".fast5"===this.config.options.filetype&&(o=k.findSuitableBatchIn(o)),c.mkdirpSync(o);const i=h.join(o,r);if("data+telemetry"===this.config.options.downloadMode){this.log.info(`downloading ${t.path} to ${i}`);const o=await this.sessionedS3(),s=new Promise(async s=>{this.initiateDownloadStream(o,t,e,i,s)});return await s,Promise.resolve()}try{await this.deleteMessage(e)}catch(l){this.log.error(`Exception deleting message: ${String(l)}`)}const n=t.telemetry.batch_summary&&t.telemetry.batch_summary.reads_num?t.telemetry.batch_summary.reads_num:1;return this.downloadState("success","incr",{files:1,reads:n}),Promise.resolve()}initiateDownloadStream(e,t,o,s,r){let i,n,a,l;const u=()=>{if("on"===this.config.options.filter)try{c.remove(s,e=>{e?this.log.warn(`failed to remove file: ${s}`):this.log.warn(`removed failed download file: ${s} ${e}`)})}catch(e){this.log.warn(`failed to remove file. unlinkException: ${s} ${String(e)}`)}},d=()=>{if(!i.networkStreamError)try{i.networkStreamError=1,i.close(),u(),l.destroy&&(this.log.error(`destroying readstream for ${s}`),l.destroy())}catch(e){this.log.error(`error handling sream error: ${e.message}`)}};try{const o={Bucket:t.bucket,Key:t.path};i=c.createWriteStream(s);const n=e.getObject(o);l=n.createReadStream()}catch(p){return this.log.error(`getObject/createReadStream exception: ${String(p)}`),void(r&&r())}l.on("error",e=>{this.log.error(`error in download readstream ${e}`);try{d()}catch(t){this.log.error(`error handling readStreamError: ${t}`)}}),i.on("finish",async()=>{if(!i.networkStreamError){this.log.debug(`downloaded ${s}`);const i=t.telemetry&&t.telemetry.batch_summary&&t.telemetry.batch_summary.reads_num?t.telemetry.batch_summary.reads_num:1,n=h.extname(s);this.downloadState("success","incr",{files:1,reads:i}),this.downloadState("types","incr",{[n]:1});try{const t=await v(s);this.downloadState("success","incr",{bytes:t.bytes})}catch(e){this.log.warn(`failed to stat file: ${String(e)}`)}try{this.log.info(`Uploads: ${JSON.stringify(this.states.upload)}`),this.log.info(`Downloads: ${JSON.stringify(this.states.download)}`);const o=!(!t.telemetry||!t.telemetry.json)&&t.telemetry.json.exit_status;o&&this.config.options.dataCb&&this.config.options.dataCb(s,o)}catch(e){this.log.warn(`failed to fs.stat file: ${e}`)}try{await this.deleteMessage(o)}catch(r){this.log.error(`Exception deleting message: ${String(r)}`)}}}),i.on("close",e=>{this.log.debug(`closing writeStream ${s}`),e&&this.log.error(`error closing writestream ${e}`),clearTimeout(n),clearInterval(a),setTimeout(this.checkForDownloads.bind(this)),r()}),i.on("error",e=>{this.log.error(`error in download write stream ${e}`),d()});const g=()=>{this.log.warn("transfer timed out"),d()};n=setTimeout(g,1e3*this.config.options.downloadTimeout);a=setInterval(async()=>{const e=this.config.instance.outputQueueURL,t=o.ReceiptHandle;this.log.debug({message_id:o.MessageId},"updateVisibility");try{await this.sqs.changeMessageVisibility({QueueUrl:e,ReceiptHandle:t,VisibilityTimeout:this.config.options.inFlightDelay}).promise()}catch(s){this.log.error({message_id:o.MessageId,queue:e,error:s},"Error setting visibility"),clearInterval(a)}},900*this.config.options.inFlightDelay),l.on("data",()=>{clearTimeout(n),n=setTimeout(g,1e3*this.config.options.downloadTimeout)}).pipe(i)}async uploadHandler(e){const t=await this.sessionedS3();let o;const s=e.batch||"",r=h.join(this.config.options.inputFolder,s,e.name),i=`${this.config.instance.bucketFolder}/component-0/${e.name}/${e.name}`;let n;return new Promise((s,a)=>{const l=()=>{o&&!o.closed&&o.close(),a(new Error(`${e.name} timed out`))};n=setTimeout(l,1e3*(this.config.options.uploadTimeout+5));try{o=c.createReadStream(r)}catch(u){return clearTimeout(n),void a(u)}o.on("error",e=>{o.close();let t="error in upload readstream";e&&e.message&&(t+=`: ${e.message}`),clearTimeout(n),a(new Error(t))}),o.on("open",()=>{const r={Bucket:this.config.instance.bucket,Key:i,Body:o};this.config.instance.key_id&&(r.SSEKMSKeyId=this.config.instance.key_id,r.ServerSideEncryption="aws:kms"),e.size&&(r["Content-Length"]=e.size);const c=t.upload(r,{partSize:10485760,queueSize:1});c.on("httpUploadProgress",e=>{this.log.debug(`upload progress ${e.key} ${e.loaded} / ${e.total}`),clearTimeout(n),n=setTimeout(l,1e3*(this.config.options.uploadTimeout+5))}),c.promise().then(()=>{this.log.info(`${e.id} S3 upload complete`),o.close(),clearTimeout(n),this.uploadComplete(i,e).then(()=>{s(e)}).catch(e=>{a(e)})}).catch(t=>{this.log.warn(`${e.id} uploadStreamError ${t}`),a(t)})})})}async discoverQueue(e){if(this.config.instance.discoverQueueCache[e])return Promise.resolve(this.config.instance.discoverQueueCache[e]);let t;this.log.debug(`discovering queue for ${e}`);try{const s=await this.sessionedSQS();t=await s.getQueueUrl({QueueName:e}).promise()}catch(o){return this.log.error(`Error: failed to find queue for ${e}: ${String(o)}`),Promise.reject(o)}return this.log.debug(`found queue ${t.QueueUrl}`),this.config.instance.discoverQueueCache[e]=t.QueueUrl,Promise.resolve(t.QueueUrl)}async uploadComplete(e,t){this.log.info(`${t.id} uploaded to S3: ${e}`);const o={bucket:this.config.instance.bucket,outputQueue:this.config.instance.outputQueueName,remote_addr:this.config.instance.remote_addr,user_defined:this.config.instance.user_defined||null,apikey:this.config.options.apikey,id_workflow_instance:this.config.instance.id_workflow_instance,id_master:this.config.instance.id_workflow,utc:(new Date).toISOString(),path:e,prefix:e.substring(0,e.lastIndexOf("/"))};if(this.config.instance.chain)try{o.components=JSON.parse(JSON.stringify(this.config.instance.chain.components)),o.targetComponentId=this.config.instance.chain.targetComponentId}catch(s){return this.log.error(`${t.id} exception parsing components JSON ${String(s)}`),Promise.reject(s)}if(this.config.instance.key_id&&(o.key_id=this.config.instance.key_id),this.config.options.agent_address)try{o.agent_address=JSON.parse(this.config.options.agent_address)}catch(r){this.log.error(`${t.id} Could not parse agent_address ${String(r)}`)}o.components&&Object.keys(o.components).forEach(e=>{"uploadMessageQueue"===o.components[e].inputQueueName&&(o.components[e].inputQueueName=this.uploadMessageQueue),"downloadMessageQueue"===o.components[e].inputQueueName&&(o.components[e].inputQueueName=this.downloadMessageQueue)});try{const e=await this.discoverQueue(this.config.instance.inputQueueName),s=await this.sessionedSQS();this.log.info(`${t.id} sending SQS message to input queue`),await s.sendMessage({QueueUrl:e,MessageBody:JSON.stringify(o)}).promise()}catch(i){return this.log.error(`${t.id} exception sending SQS message: ${String(i)}`),Promise.reject(i)}this.log.info(`${t.id} SQS message sent. Move to uploaded`);try{return await this.moveFile(t,"upload"),Promise.resolve()}catch(n){return Promise.reject(n)}}async moveFile(e,t){const o="upload"===t?this.uploadTo:this.skipTo,s=e.name,r=e.batch||"",i=e.path||h.join(this.config.options.inputFolder,r,s),n=h.join(o,r,s);try{await c.mkdirp(h.join(o,r)),await c.move(i,n),this.log.debug(`${e.id} ${t} and mv done`),"upload"===t&&this.uploadState("total","incr",{bytes:e.size})}catch(a){this.log.debug(`${e.id} ${t} move error: ${String(a)}`);try{await c.remove(n)}catch(l){this.log.warn(`${e.id} ${t} additionally failed to delete ${n}: ${String(l)}`)}return Promise.reject(a)}return Promise.resolve()}async queueLength(e){if(!e)return Promise.resolve();const t=e.match(/([\w\-_]+)$/)[0];this.log.debug(`querying queue length of ${t}`);try{const t=await this.sessionedSQS(),s=await t.getQueueAttributes({QueueUrl:e,AttributeNames:["ApproximateNumberOfMessages"]}).promise();if(s&&s.Attributes&&"ApproximateNumberOfMessages"in s.Attributes){let e=s.Attributes.ApproximateNumberOfMessages;return e=parseInt(e,10)||0,Promise.resolve(e)}}catch(o){return this.log.error(`error in getQueueAttributes ${String(o)}`),Promise.reject(o)}return Promise.resolve()}url(){return this.config.options.url}apikey(){return this.config.options.apikey}attr(e,t){if(!(e in this.config.options))throw new Error(`config object does not contain property ${e}`);return t?(this.config.options[e]=t,this):this.config.options[e]}stats(e){return this.states[e]&&"upload"===e&&(this.states.upload.total={files:0+parseInt(this.states.upload.enqueued.files,10)+parseInt(this.states.upload.success.files,10)}),this.states[e]}}F.version=k.version,F.REST=x;export default F;
