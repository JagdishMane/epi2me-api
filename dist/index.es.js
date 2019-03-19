/**
 * Copyright Metrichor Ltd. (An Oxford Nanopore Technologies Company) 2019
 */

import{merge as e,isString as t,isArray as o,assign as s,filter as i,every as r,isFunction as n,defaults as a,chain as l}from"lodash";import c from"aws-sdk";import u from"fs-extra";import d,{EOL as h}from"os";import g from"path";import p from"proxy-agent";import f from"axios";import m from"crypto";import{httpsOverHttps as w,httpsOverHttp as y}from"tunnel";f.defaults.validateStatus=(e=>e<=504);const k=function(){const t=(e,t)=>{e.headers||(e.headers={});let o=t;if(o||(o={}),!o.apikey)return;if(e.headers["X-EPI2ME-ApiKey"]=o.apikey,!o.apisecret)return;e.headers["X-EPI2ME-SignatureDate"]=(new Date).toISOString(),e.url.match(/^https:/)&&(e.url=e.url.replace(/:443/,"")),e.url.match(/^http:/)&&(e.url=e.url.replace(/:80/,""));const s=[e.url,Object.keys(e.headers).sort().filter(e=>e.match(/^x-epi2me/i)).map(t=>`${t}:${e.headers[t]}`).join("\n")].join("\n"),i=m.createHmac("sha1",o.apisecret).update(s).digest("hex");e.headers["X-EPI2ME-SignatureV0"]=i},o=async e=>{const t=e?e.data:null;if(!t)return Promise.reject(new Error("unexpected non-json response"));if(e&&e.status>=400){let o=`Network error ${e.status}`;return t.error&&(o=t.error),504===e.status&&(o="Please check your network connection and try again."),Promise.reject(new Error(o))}return t.error?Promise.reject(new Error(t.error)):Promise.resolve(t)};return{version:"3.0.0",headers:(o,s)=>{const{log:i}=e({log:{debug:()=>{}}},s);let r=s;if(r||(r={}),o.headers=e({Accept:"application/json","Content-Type":"application/json","X-EPI2ME-Client":r.user_agent||"api","X-EPI2ME-Version":r.agent_version||k.version},o.headers),"signing"in r&&!r.signing||t(o,r),r.proxy){const e=r.proxy.match(/https?:\/\/((\S+):(\S+)@)?(\S+):(\d+)/),t=e[2],s=e[3],n={host:e[4],port:e[5]};t&&s&&(n.proxyAuth=`${t}:${s}`),r.proxy.match(/^https/)?(i.debug("using HTTPS over HTTPS proxy",JSON.stringify(n)),o.httpsAgent=w({proxy:n})):(i.debug("using HTTPS over HTTP proxy",JSON.stringify(n)),o.httpsAgent=y({proxy:n})),o.proxy=!1}},get:async(t,s)=>{const{log:i}=e({log:{debug:()=>{}}},s);let r,n=s.url,a=t;s.skip_url_mangle?r=a:(a=`/${a}`,r=(n=n.replace(/\/+$/,""))+(a=a.replace(/\/+/g,"/")));const l={url:r,gzip:!0};let c;k.headers(l,s);try{i.debug("GET",l.url,JSON.stringify(l)),c=await f.get(l.url,l)}catch(u){return Promise.reject(u)}return o(c,s)},post:async(t,s,i)=>{const{log:r}=e({log:{debug:()=>{}}},i);let n=i.url;const a={url:`${n=n.replace(/\/+$/,"")}/${t.replace(/\/+/g,"/")}`,gzip:!0,data:s,headers:{}};if(i.legacy_form){const t=[],o=e({json:JSON.stringify(s)},s);Object.keys(o).sort().forEach(e=>{t.push(`${e}=${escape(o[e])}`)}),a.data=t.join("&"),a.headers["Content-Type"]="application/x-www-form-urlencoded"}k.headers(a,i);const{data:l}=a;let c;delete a.data;try{r.debug("POST",a.url,l,JSON.stringify(a)),c=await f.post(a.url,l,a)}catch(u){return Promise.reject(u)}return o(c,i)},put:async(t,s,i,r)=>{const{log:n}=e({log:{debug:()=>{}}},r);let a=r.url;const l={url:`${a=a.replace(/\/+$/,"")}/${t.replace(/\/+/g,"/")}/${s}`,gzip:!0,data:i,headers:{}};if(r.legacy_form){const t=[],o=e({json:JSON.stringify(i)},i);Object.keys(o).sort().forEach(e=>{t.push(`${e}=${escape(o[e])}`)}),l.data=t.join("&"),l.headers["Content-Type"]="application/x-www-form-urlencoded"}k.headers(l,r);const{data:c}=l;let u;delete l.data;try{n.debug("PUT",l.url,c,JSON.stringify(l)),u=await f.put(l.url,c,l)}catch(d){return Promise.reject(d)}return o(u,r)}}}();const S={fastq:async function(e){return new Promise((t,o)=>{let s,i=1;u.createReadStream(e).on("data",e=>{s=-1,i-=1;do{s=e.indexOf(10,s+1),i+=1}while(-1!==s)}).on("end",()=>t({type:"fastq",reads:Math.floor(i/4)})).on("error",o)})},fasta:async function(e){return new Promise((t,o)=>{let s,i=1;u.createReadStream(e).on("data",e=>{s=-1,i-=1;do{s=e.indexOf(62,s+1),i+=1}while(-1!==s)}).on("end",()=>t({type:"fasta",sequences:Math.floor(i/2)})).on("error",o)})},default:async function(e){return u.stat(e).then(e=>({type:"bytes",bytes:e.size}))}};function P(e){if("string"!==typeof e&&!(e instanceof String))return Promise.resolve({});let t=g.extname(e).toLowerCase().replace(/^[.]/,"");return"fq"===t?t="fastq":"fa"===t&&(t="fasta"),S[t]||(t="default"),S[t](e)}k.pipe=(async(e,t,o,s)=>{let i=o.url,r=`/${e}`;const n={uri:(i=i.replace(/\/+$/,""))+(r=r.replace(/\/+/g,"/")),gzip:!0,headers:{"Accept-Encoding":"gzip",Accept:"application/gzip"}};return k.headers(n,o),o.proxy&&(n.proxy=o.proxy),s&&(n.onUploadProgress=s),n.responseType="stream",new Promise(async(e,o)=>{try{const i=u.createWriteStream(t);(await f.get(n.uri,n)).data.pipe(i),i.on("finish",e(t)),i.on("error",o(new Error("writer failed")))}catch(s){o(s)}})}),k.countFileReads=(e=>P(e).then(e=>e.reads)),k.findSuitableBatchIn=(async e=>{await u.mkdirp(e);const t=async()=>{const t=`batch_${Date.now()}`,o=g.join(e,t);return u.mkdirp(o)};let o=await u.readdir(e);if(!(o=o.filter(e=>"batch_"===e.slice(0,"batch_".length)))||!o.length)return t();const s=g.join(e,o.pop());return u.readdirSync(s).length<4e3?s:t()});let v=0;k.getFileID=(()=>`FILE_${v+=1}`),k.lsFolder=((e,o,s,i="")=>u.readdir(e).then(r=>{let n=r;o&&(n=n.filter(o));let a=[];const l=[],c=n.map(o=>u.stat(g.join(e,o)).then(r=>{if(r.isDirectory())return a.push(g.join(e,o)),Promise.resolve();if(r.isFile()&&(!s||g.extname(o)===s)){const s={name:g.parse(o).base,path:g.join(e,o),size:r.size,id:k.getFileID()},n=e.replace(i,"").replace("\\","").replace("/","");return t(n)&&n.length&&(s.batch=n),l.push(s),Promise.resolve()}return Promise.resolve()}));return Promise.all(c).then(()=>(a=a.sort(),Promise.resolve({files:l,folders:a}))).catch(e=>Promise.reject(new Error(`error listing folder ${e}`)))})),k.loadInputFiles=(({inputFolder:e,outputFolder:t,uploadedFolder:s,filetype:i},r=[])=>new Promise((n,a)=>{const l=e=>{const i=g.basename(e);return!("downloads"===i||"uploaded"===i||"skip"===i||"fail"===i||s&&i===g.basename(s)||t&&i===g.basename(t)||"tmp"===i||o(r)&&r.indexOf(g.posix.basename(e))>-1)};let c=[e];const u=()=>{c&&c.length&&k.lsFolder(c.splice(0,1)[0],l,i,e).then(({files:e,folders:t})=>{e&&e.length?n(e):(c=[...t,...c]).length?u():n()}).catch(e=>{a(new Error(`Failed to check for new files: ${e.message}`))})};u()}));var _=!1,$="https://epi2me.nanoporetech.com",b="EPI2ME API",j=!0,I={local:_,url:$,user_agent:b,region:"eu-west-1",retention:"on",sessionGrace:5,sortInputFiles:!1,uploadTimeout:1200,downloadTimeout:1200,fileCheckInterval:5,downloadCheckInterval:3,stateCheckInterval:60,inFlightDelay:600,waitTimeSeconds:20,waitTokenError:30,downloadPoolSize:1,filter:"on",filterByChannel:"off",downloadMode:"data+telemetry",deleteOnComplete:"off",filetype:".fastq",signing:j};class E{constructor(e){this.options=s({agent_version:k.version,local:_,url:$,user_agent:b,signing:j},e),this.log=this.options.log}async list(e){try{const o=await k.get(e,this.options),s=e.match(/^[a-z_]+/i)[0];return Promise.resolve(o[`${s}s`])}catch(t){return this.log.error(`list error ${String(t)}`),Promise.reject(t)}}async read(e,t){try{const s=await k.get(`${e}/${t}`,this.options);return Promise.resolve(s)}catch(o){return this.log.error("read",o),Promise.reject(o)}}async user(e){let t;if(this.options.local)t={accounts:[{id_user_account:"none",number:"NONE",name:"None"}]};else try{t=await k.get("user",this.options)}catch(o){return e?e(o):Promise.reject(o)}return e?e(null,t):Promise.resolve(t)}async instanceToken(e,t){try{const i=await k.post("token",{id_workflow_instance:e},s({},this.options,{legacy_form:!0}));return t?t(null,i):Promise.resolve(i)}catch(o){return t?t(o):Promise.reject(o)}}async installToken(e,t){try{const i=await k.post("token/install",{id_workflow:e},s({},this.options,{legacy_form:!0}));return t?t(null,i):Promise.resolve(i)}catch(o){return t?t(o):Promise.reject(o)}}async attributes(e){try{const o=await this.list("attribute");return e?e(null,o):Promise.resolve(o)}catch(t){return e?e(t):Promise.reject(t)}}async workflows(e){try{const o=await this.list("workflow");return e?e(null,o):Promise.resolve(o)}catch(t){return e?e(t):Promise.reject(t)}}async amiImages(e){if(this.options.local){const t=new Error("amiImages unsupported in local mode");return e?e(t):Promise.reject(t)}try{const o=this.list("ami_image");return e?e(null,o):Promise.resolve(o)}catch(t){return e?e(t):Promise.reject(t)}}async amiImage(e,t,o){let s,i,r,n;if(e&&t&&o instanceof Function?(s=e,i=t,r=o,n="update"):e&&t instanceof Object&&!(t instanceof Function)?(s=e,i=t,n="update"):e instanceof Object&&t instanceof Function?(i=e,r=t,n="create"):e instanceof Object&&!t?(i=e,n="create"):(n="read",s=e,r=t instanceof Function?t:null),this.options.local){const e=new Error("ami_image unsupported in local mode");return r?r(e):Promise.reject(e)}if("update"===n)try{const e=await k.put("ami_image",s,i,this.options);return r?r(null,e):Promise.resolve(e)}catch(a){return r?r(a):Promise.reject(a)}if("create"===n)try{const e=await k.post("ami_image",i,this.options);return r?r(null,e):Promise.resolve(e)}catch(a){return r?r(a):Promise.reject(a)}if(!s){const e=new Error("no id_ami_image specified");return r?r(e):Promise.reject(e)}try{const e=await this.read("ami_image",s);return r?r(null,e):Promise.resolve(e)}catch(a){return r?r(a):Promise.reject(a)}}async workflow(t,o,r){let n,a,l,c;if(t&&o&&r instanceof Function?(n=t,a=o,l=r,c="update"):t&&o instanceof Object&&!(o instanceof Function)?(n=t,a=o,c="update"):t instanceof Object&&o instanceof Function?(a=t,l=o,c="create"):t instanceof Object&&!o?(a=t,c="create"):(c="read",n=t,l=o instanceof Function?o:null),"update"===c)try{const e=await k.put("workflow",n,a,s({},this.options,{legacy_form:!0}));return l?l(null,e):Promise.resolve(e)}catch(g){return l?l(g):Promise.reject(g)}if("create"===c)try{const e=await k.post("workflow",a,s({},this.options,{legacy_form:!0}));return l?l(null,e):Promise.resolve(e)}catch(g){return l?l(g):Promise.reject(g)}if(!n){const e=new Error("no workflow id specified");return l?l(e):Promise.reject(e)}const u={};try{const t=await this.read("workflow",n);if(t.error)throw new Error(t.error);e(u,t)}catch(g){return this.log.error(`${n}: error fetching workflow ${String(g)}`),l?l(g):Promise.reject(g)}e(u,{params:{}});try{const t=await k.get(`workflow/config/${n}`,this.options);if(t.error)throw new Error(t.error);e(u,t)}catch(g){return this.log.error(`${n}: error fetching workflow config ${String(g)}`),l?l(g):Promise.reject(g)}const d=i(u.params,{widget:"ajax_dropdown"}),h=[...d.map((e,t)=>{const o=d[t];return new Promise(async(e,t)=>{const s=o.values.source.replace("{{EPI2ME_HOST}}","");try{const i=(await k.get(s,this.options))[o.values.data_root];return i&&(o.values=i.map(e=>({label:e[o.values.items.label_key],value:e[o.values.items.value_key]}))),e()}catch(g){return this.log.error(`failed to fetch ${s}`),t(g)}})})];try{return await Promise.all(h),l?l(null,u):Promise.resolve(u)}catch(g){return this.log.error(`${n}: error fetching config and parameters ${String(g)}`),l?l(g):Promise.reject(g)}}async startWorkflow(e,t){return k.post("workflow_instance",e,s({},this.options,{legacy_form:!0}),t)}stopWorkflow(e,t){return k.put("workflow_instance/stop",e,null,s({},this.options,{legacy_form:!0}),t)}async workflowInstances(e,t){let o,s;if(!e||e instanceof Function||void 0!==t?(o=e,s=t):s=e,s&&s.run_id)try{const e=(await k.get(`workflow_instance/wi?show=all&columns[0][name]=run_id;columns[0][searchable]=true;columns[0][search][regex]=true;columns[0][search][value]=${s.run_id};`,this.options)).data.map(e=>({id_workflow_instance:e.id_ins,id_workflow:e.id_flo,run_id:e.run_id,description:e.desc,rev:e.rev}));return o?o(null,e):Promise.resolve(e)}catch(i){return o?o(i):Promise.reject(i)}try{const e=await this.list("workflow_instance");return o?o(null,e):Promise.resolve(e)}catch(i){return o?o(i):Promise.reject(i)}}async workflowInstance(e,t){try{const s=await this.read("workflow_instance",e);return t?t(null,s):Promise.resolve(s)}catch(o){return t?t(o):Promise.reject(o)}}workflowConfig(e,t){return k.get(`workflow/config/${e}`,this.options,t)}async register(e,t,o){let i,r;t&&t instanceof Function?r=t:(i=t,r=o);try{const t=await k.put("reg",e,{description:i||`${d.userInfo().username}@${d.hostname()}`},s({},this.options,{signing:!1}));return r?r(null,t):Promise.resolve(t)}catch(n){return r?r(n):Promise.reject(n)}}async datasets(e,t){let o,s;!e||e instanceof Function||void 0!==t?(o=e,s=t):s=e,s||(s={}),s.show||(s.show="mine");try{const e=await this.list(`dataset?show=${s.show}`);return o?o(null,e):Promise.resolve(e)}catch(i){return o?o(i):Promise.reject(i)}}async dataset(e,t){if(!this.options.local)try{const s=await this.read("dataset",e);return t?t(null,s):Promise.resolve(s)}catch(o){return t?t(o):Promise.reject(o)}try{const s=(await this.datasets()).find(t=>t.id_dataset===e);return t?t(null,s):Promise.resolve(s)}catch(o){return t?t(o):Promise.reject(o)}}async fetchContent(e,t){const o=s({},this.options,{skip_url_mangle:!0});try{const s=await k.get(e,o);return t?t(null,s):Promise.resolve(s)}catch(i){return t?t(i):Promise.reject(i)}}}class F extends E{async workflows(e){if(!this.options.local)return super.workflows(e);const t=g.join(this.options.url,"workflows");let o;try{return o=(await u.readdir(t)).filter(e=>u.statSync(g.join(t,e)).isDirectory()).map(e=>g.join(t,e,"workflow.json")).map(e=>u.readJsonSync(e)),e?e(null,o):Promise.resolve(o)}catch(s){return this.log.warn(s),e?e(void 0):Promise.reject(void 0)}}async workflow(e,t,o){if(!this.options.local||!e||"object"===typeof e||o)return super.workflow(e,t,o);const s=g.join(this.options.url,"workflows"),i=g.join(s,e,"workflow.json");try{const e=await u.readJson(i);return o?o(null,e):Promise.resolve(e)}catch(r){return o?o(r):Promise.reject(r)}}async workflowInstances(e,t){if(!this.options.local)return super.workflowInstances(e,t);let o,s;if(!e||e instanceof Function||void 0!==t?(o=e,s=t):s=e,s){const e=new Error("querying of local instances unsupported in local mode");return o?o(e):Promise.reject(e)}const i=g.join(this.options.url,"instances");try{let e=await u.readdir(i);return e=(e=e.filter(e=>u.statSync(g.join(i,e)).isDirectory())).map(e=>{const t=g.join(i,e,"workflow.json");let o;try{o=u.readJsonSync(t)}catch(s){o={id_workflow:"-",description:"-",rev:"0.0"}}return o.id_workflow_instance=e,o.filename=t,o}),o?o(null,e):Promise.resolve(e)}catch(r){return o?o(r):Promise.reject(r)}}async datasets(e,t){if(!this.options.local)return super.datasets(e,t);let o,s;if(!e||e instanceof Function||void 0!==t?(o=e,s=t):s=e,s||(s={}),s.show||(s.show="mine"),"mine"!==s.show)return o(new Error("querying of local datasets unsupported in local mode"));const i=g.join(this.options.url,"datasets");try{let e=await u.readdir(i);e=e.filter(e=>u.statSync(g.join(i,e)).isDirectory());let t=0;return e=e.sort().map(e=>({is_reference_dataset:!0,summary:null,dataset_status:{status_label:"Active",status_value:"active"},size:0,prefix:e,id_workflow_instance:null,id_account:null,is_consented_human:null,data_fields:null,component_id:null,uuid:e,is_shared:!1,id_dataset:t+=1,id_user:null,last_modified:null,created:null,name:e,source:e,attributes:null})),o?o(null,e):Promise.resolve(e)}catch(r){return this.log.warn(r),o?o(null,[]):Promise.resolve([])}}async bundleWorkflow(e,t,o){return k.pipe(`workflow/bundle/${e}.tar.gz`,t,this.options,o)}}class x{constructor(t){let o;if((o="string"===typeof t||"object"===typeof t&&t.constructor===String?JSON.parse(t):t||{}).log){if(!r([o.log.info,o.log.warn,o.log.error,o.log.debug],n))throw new Error('expected log object to have "error", "debug", "info" and "warn" methods');this.log=o.log}else this.log={info:e=>{console.info(`[${(new Date).toISOString()}] INFO: ${e}`)},debug:e=>{console.debug(`[${(new Date).toISOString()}] DEBUG: ${e}`)},warn:e=>{console.warn(`[${(new Date).toISOString()}] WARN: ${e}`)},error:e=>{console.error(`[${(new Date).toISOString()}] ERROR: ${e}`)}};this.states={upload:{filesCount:0,success:{files:0},failure:{},queueLength:{files:0},enqueued:{files:0},total:{files:0,bytes:0}},download:{success:0,fail:0,failure:{},queueLength:0,totalSize:0},warnings:[]},this.config={options:a(o,I),instance:{id_workflow_instance:o.id_workflow_instance,inputQueueName:null,outputQueueName:null,outputQueueURL:null,discoverQueueCache:{},bucket:null,bucketFolder:null,remote_addr:null,chain:null,key_id:null}},this.config.instance.awssettings={region:this.config.options.region},this.config.options.inputFolder&&(this.config.options.uploadedFolder&&"+uploaded"!==this.config.options.uploadedFolder?this.uploadTo=this.config.options.uploadedFolder:this.uploadTo=g.join(this.config.options.inputFolder,"uploaded"),this.skipTo=g.join(this.config.options.inputFolder,"skip")),this.REST=new F(e({},{log:this.log},this.config.options))}async stopEverything(){this.log.debug("stopping watchers"),this.downloadCheckInterval&&(this.log.debug("clearing downloadCheckInterval interval"),clearInterval(this.downloadCheckInterval),this.downloadCheckInterval=null),this.stateCheckInterval&&(this.log.debug("clearing stateCheckInterval interval"),clearInterval(this.stateCheckInterval),this.stateCheckInterval=null),this.fileCheckInterval&&(this.log.debug("clearing fileCheckInterval interval"),clearInterval(this.fileCheckInterval),this.fileCheckInterval=null),this.uploadWorkerPool&&(this.log.debug("clearing uploadWorkerPool"),await Promise.all(this.uploadWorkerPool),this.uploadWorkerPool=null),this.downloadWorkerPool&&(this.log.debug("clearing downloadWorkerPool"),await Promise.all(this.downloadWorkerPool),this.downloadWorkerPool=null);const{id_workflow_instance:e}=this.config.instance;if(e){try{await this.REST.stopWorkflow(e)}catch(t){return this.log.error(`Error stopping instance: ${String(t)}`),Promise.reject(t)}this.log.info(`workflow instance ${e} stopped`)}return Promise.resolve()}async session(){if(this.sessioning)return Promise.resolve();if(!this.states.sts_expiration||this.states.sts_expiration&&this.states.sts_expiration<=Date.now()){this.sessioning=!0;try{await this.fetchInstanceToken(),this.sessioning=!1}catch(e){return this.sessioning=!1,this.log.error(`session error ${String(e)}`),Promise.reject(e)}}return Promise.resolve()}async fetchInstanceToken(){if(!this.config.instance.id_workflow_instance)return Promise.reject(new Error("must specify id_workflow_instance"));if(this.states.sts_expiration&&this.states.sts_expiration>Date.now())return Promise.resolve();this.log.debug("new instance token needed");try{const t=await this.REST.instanceToken(this.config.instance.id_workflow_instance);this.log.debug(`allocated new instance token expiring at ${t.expiration}`),this.states.sts_expiration=new Date(t.expiration).getTime()-60*this.config.options.sessionGrace,this.config.options.proxy&&c.config.update({httpOptions:{agent:p(this.config.options.proxy,!0)}}),c.config.update(this.config.instance.awssettings),c.config.update(t)}catch(e){this.log.warn(`failed to fetch instance token: ${String(e)}`)}return Promise.resolve()}async sessionedS3(){return await this.session(),new c.S3({useAccelerateEndpoint:"on"===this.config.options.awsAcceleration})}async sessionedSQS(){return await this.session(),new c.SQS}async autoStart(e,t){let o;try{o=await this.REST.startWorkflow(e)}catch(s){const e=`Failed to start workflow: ${String(s)}`;return this.log.warn(e),t?t(e):Promise.reject(s)}return this.config.workflow=JSON.parse(JSON.stringify(e)),this.log.debug("instance",JSON.stringify(o)),this.log.debug("workflow config",JSON.stringify(this.config.workflow)),this.autoConfigure(o,t)}async autoJoin(e,t){let o;this.config.instance.id_workflow_instance=e;try{o=await this.REST.workflowInstance(e)}catch(s){const e=`Failed to join workflow instance: ${String(s)}`;return this.log.warn(e),t?t(e):Promise.reject(s)}return"stopped"===o.state?(this.log.warn(`workflow ${e} is already stopped`),t?t("could not join workflow"):Promise.reject(new Error("could not join workflow"))):(this.config.workflow=this.config.workflow||{},this.log.debug("instance",JSON.stringify(o)),this.log.debug("workflow config",JSON.stringify(this.config.workflow)),this.autoConfigure(o,t))}async autoConfigure(e,t){if(["id_workflow_instance","id_workflow","remote_addr","key_id","bucket","user_defined"].forEach(t=>{this.config.instance[t]=e[t]}),this.config.instance.inputQueueName=e.inputqueue,this.config.instance.outputQueueName=e.outputqueue,this.config.instance.awssettings.region=e.region||this.config.options.region,this.config.instance.bucketFolder=`${e.outputqueue}/${e.id_user}/${e.id_workflow_instance}`,e.chain)if("object"===typeof e.chain)this.config.instance.chain=e.chain;else try{this.config.instance.chain=JSON.parse(e.chain)}catch(r){throw new Error(`exception parsing chain JSON ${String(r)}`)}if(!this.config.options.inputFolder)throw new Error("must set inputFolder");if(!this.config.options.outputFolder)throw new Error("must set outputFolder");if(!this.config.instance.bucketFolder)throw new Error("bucketFolder must be set");if(!this.config.instance.inputQueueName)throw new Error("inputQueueName must be set");if(!this.config.instance.outputQueueName)throw new Error("outputQueueName must be set");u.mkdirpSync(this.config.options.outputFolder);const o=this.config.instance.id_workflow_instance?`telemetry-${this.config.instance.id_workflow_instance}.log`:"telemetry.log",s=g.join(this.config.options.outputFolder,"epi2me-logs"),i=g.join(s,o);return u.mkdirp(s,e=>{if(e&&!String(e).match(/EEXIST/))this.log.error(`error opening telemetry log stream: mkdirpException:${String(e)}`);else try{this.telemetryLogStream=u.createWriteStream(i,{flags:"a"}),this.log.info(`logging telemetry to ${i}`)}catch(t){this.log.error(`error opening telemetry log stream: ${String(t)}`)}}),t&&t(null,this.config.instance),this.downloadCheckInterval=setInterval(()=>{this.loadAvailableDownloadMessages()},1e3*this.config.options.downloadCheckInterval),this.stateCheckInterval=setInterval(async()=>{try{const o=await this.REST.workflowInstance(this.config.instance.id_workflow_instance);if("stopped"===o.state){this.log.warn(`instance was stopped remotely at ${o.stop_date}. shutting down the workflow.`);try{const t=await this.stopEverything();"function"===typeof t.config.options.remoteShutdownCb&&t.config.options.remoteShutdownCb(`instance was stopped remotely at ${o.stop_date}`)}catch(e){this.log.error(`Error whilst stopping: ${String(e)}`)}}}catch(t){this.log.warn(`failed to check instance state: ${t&&t.error?t.error:t}`)}},1e3*this.config.options.stateCheckInterval),await this.session(),this.loadUploadFiles(),this.fileCheckInterval=setInterval(this.loadUploadFiles.bind(this),1e3*this.config.options.fileCheckInterval),Promise.resolve(e)}async loadAvailableDownloadMessages(){try{const t=await this.discoverQueue(this.config.instance.outputQueueName),o=await this.queueLength(t);if(void 0!==o&&null!==o&&(this.states.download.queueLength=o,o>0))return this.log.debug(`downloads available: ${o}`),this.downloadAvailable();this.log.debug("no downloads available")}catch(e){this.log.warn(`loadAvailableDownloadMessages error ${String(e)}`),this.states.download.failure||(this.states.download.failure={}),this.states.download.failure[e]=this.states.download.failure[e]?this.states.download.failure[e]+1:1}return Promise.resolve()}async downloadAvailable(){const e=this.downloadWorkerPool?this.downloadWorkerPool.remaining:0;if(e>=5*this.config.options.downloadPoolSize)return this.log.debug(`${e} downloads already queued`),Promise.resolve();let t;try{const e=await this.discoverQueue(this.config.instance.outputQueueName);this.log.debug("fetching messages");const s=await this.sessionedSQS();t=await s.receiveMessage({AttributeNames:["All"],QueueUrl:e,VisibilityTimeout:this.config.options.inFlightDelay,MaxNumberOfMessages:this.config.options.downloadPoolSize,WaitTimeSeconds:this.config.options.waitTimeSeconds}).promise()}catch(o){return this.log.error(`receiveMessage exception: ${String(o)}`),this.states.download.failure[o]=this.states.download.failure[o]?this.states.download.failure[o]+1:1,Promise.reject(o)}return this.receiveMessages(t)}async loadUploadFiles(){const e=this.inputBatchQueue?this.inputBatchQueue.remaining:0;if(this.log.debug(`loadUploadFiles: ${e} batches in the inputBatchQueue`),this.dirScanInProgress||0!==e)this.log.debug("directory scan already in progress");else{this.dirScanInProgress=!0,this.log.debug("scanning input folder for new files");try{const e=await k.loadInputFiles(this.config.options,this.log);await this.enqueueUploadFiles(e)}catch(t){this.log.error(String(t))}this.dirScanInProgress=!1}return Promise.resolve()}uploadState(e,t,o){const s=o||{};"incr"===t?Object.keys(s).forEach(t=>{this.states.upload[e][t]=this.states.upload[e][t]?this.states.upload[e][t]+parseInt(s[t],10):parseInt(s[t],10)}):Object.keys(s).forEach(t=>{this.states.upload[e][t]=this.states.upload[e][t]?this.states.upload[e][t]-parseInt(s[t],10):-parseInt(s[t],10)})}async enqueueUploadFiles(t){let s,i=0,r=0,n={};if(!o(t)||!t.length)return Promise.resolve();if("workflow"in this.config)if("workflow_attributes"in this.config.workflow)n=this.config.workflow.workflow_attributes;else if("attributes"in this.config.workflow){let{attributes:e}=this.config.workflow.attributes;if(e||(e={}),"epi2me:max_size"in e&&(n.max_size=parseInt(e["epi2me:max_size"],10)),"epi2me:max_files"in e&&(n.max_files=parseInt(e["epi2me:max_files"],10)),"epi2me:category"in e){e["epi2me:category"].includes("storage")&&(n.requires_storage=!0)}}if("requires_storage"in n&&n.requires_storage&&!("storage_account"in this.config.workflow))return s="ERROR: Workflow requires storage enabled. Please provide a valid storage account [ --storage ].",this.log.error(s),this.states.warnings.push(s),Promise.resolve();if("max_size"in n&&(r=parseInt(n.max_size,10)),"max_files"in n&&(i=parseInt(n.max_files,10),t.length>i))return s=`ERROR: ${t.length} files found. Workflow can only accept ${i}. Please move the extra files away.`,this.log.error(s),this.states.warnings.push(s),Promise.resolve();this.log.info(`enqueueUploadFiles: ${t.length} new files`),this.states.upload.filesCount+=t.length,this.inputBatchQueue=[],this.inputBatchQueue.remaining=0,t.forEach(async t=>{const o=t;if(this.inputBatchQueue.remaining+=1,i&&this.states.upload.filesCount>i)s=`Maximum ${i} file(s) already uploaded. Moving ${o.name} into skip folder`,this.log.error(s),this.states.warnings.push(s),this.states.upload.filesCount-=1,o.skip="SKIP_TOO_MANY";else if(r&&o.size>r)s=`${o.name} is over ${r.toString().replace(/\B(?=(\d{3})+(?!\d))/g,",")}. Moving into skip folder`,o.skip="SKIP_TOO_BIG",this.states.upload.filesCount-=1,this.log.error(s),this.states.warnings.push(s);else{const t=await P(o.path);o.stats=t,this.uploadState("enqueued","incr",e({files:1},t))}return this.inputBatchQueue.remaining-=1,this.uploadJob(o)});try{return await Promise.all(this.inputBatchQueue),this.log.info("inputBatchQueue slot released. trigger loadUploadFiles"),this.loadUploadFiles(),Promise.resolve()}catch(a){return this.log.error(`enqueueUploadFiles exception ${String(a)}`),Promise.reject(a)}}async uploadJob(t){if("skip"in t){this.uploadState("enqueued","decr",e({files:1},t.stats)),this.uploadState("queueLength","decr",t.stats);try{await this.moveFile(t,"skip")}catch(i){return Promise.reject(i)}return Promise.resolve()}let o,s;try{o=await this.uploadHandler(t),this.log.info(`${o.id} completely done. releasing uploadWorkerPool queue slot`)}catch(r){s=r,this.log.info(`${t.id} done, but failed: ${String(s)}`)}return o||(o={}),this.uploadState("enqueued","decr",e({files:1},o.stats)),s?(this.log.error(`uploadHandler ${s}`),this.states.upload.failure||(this.states.upload.failure={}),this.states.upload.failure[s]=this.states.upload.failure[s]?this.states.upload.failure[s]+1:1):(this.uploadState("queueLength","decr",o.stats),this.uploadState("success","incr",e({files:1},o.stats))),Promise.resolve()}async receiveMessages(e){return e&&e.Messages&&e.Messages.length?(this.downloadWorkerPool||(this.downloadWorkerPool=[],this.downloadWorkerPool.remaining=0),e.Messages.forEach(e=>{const t=new Promise((t,o)=>{const s=setTimeout(()=>{clearTimeout(s),this.log.error(`this.downloadWorkerPool timeoutHandle. Clearing queue slot for message: ${e.Body}`),this.downloadWorkerPool.remaining-=1,o()},1e3*(60+this.config.options.downloadTimeout));this.processMessage(e).then(()=>{this.downloadWorkerPool.remaining-=1,clearTimeout(s),t()}).catch(e=>{this.log.error(`processMessage ${String(e)}`),this.downloadWorkerPool.remaining-=1,clearTimeout(s),t()})});this.downloadWorkerPool.remaining+=1,this.downloadWorkerPool.push(t)}),this.log.info(`downloader queued ${e.Messages.length} messages for processing`),Promise.all(this.downloadWorkerPool)):(this.log.info("complete (empty)"),Promise.resolve())}async deleteMessage(e){try{const o=await this.discoverQueue(this.config.instance.outputQueueName),s=await this.sessionedSQS();await s.deleteMessage({QueueUrl:o,ReceiptHandle:e.ReceiptHandle}).promise()}catch(t){this.log.error(`deleteMessage exception: ${String(t)}`),this.states.download.failure[t]=this.states.download.failure[t]?this.states.download.failure[t]+1:1}}async processMessage(e){let t,o;if(!e)return this.log.debug("download.processMessage: empty message"),Promise.resolve();"Attributes"in e&&("ApproximateReceiveCount"in e.Attributes?this.log.info(`download.processMessage: ${e.MessageId} / ${e.Attributes.ApproximateReceiveCount}`):this.log.info(`download.processMessage: ${e.MessageId} / NA `));try{t=JSON.parse(e.Body)}catch(a){return this.log.error(`error parsing JSON message.Body from message: ${JSON.stringify(e)} ${String(a)}`),this.deleteMessage(e),Promise.resolve()}if(t.telemetry){const{telemetry:e}=t;if(e.tm_path)try{const o=await this.sessionedS3(),s=await o.getObject({Bucket:t.bucket,Key:e.tm_path}).promise();e.batch=s.Body.toString("utf-8").split("\n").filter(e=>e&&e.length>0).map(e=>{try{return JSON.parse(e)}catch(t){return this.log.error(`Telemetry Batch JSON Parse error: ${String(t)}`),e}})}catch(l){this.log.error(`Could not fetch telemetry JSON: ${String(l)}`)}try{this.telemetryLogStream.write(JSON.stringify(e)+h)}catch(c){this.log.error(`error writing telemetry: ${c}`)}this.config.options.telemetryCb&&this.config.options.telemetryCb(e)}if(!t.path)return this.log.warn("nothing to download"),Promise.resolve();const s=t.path.match(/[\w\W]*\/([\w\W]*?)$/),i=s?s[1]:"";if(o=this.config.options.outputFolder,"on"===this.config.options.filter&&t.telemetry&&t.telemetry.hints&&t.telemetry.hints.folder){this.log.debug(`using folder hint ${t.telemetry.hints.folder}`);const e=t.telemetry.hints.folder.split("/").map(e=>e.toUpperCase());o=g.join.apply(null,[o,...e])}".fast5"===this.config.options.filetype&&(o=k.findSuitableBatchIn(o)),u.mkdirpSync(o);const r=g.join(o,i);if("data+telemetry"===this.config.options.downloadMode){this.log.info(`downloading ${t.path} to ${r}`);const o=await this.sessionedS3(),s=new Promise(async s=>{this.initiateDownloadStream(o,t,e,r,s)});return await s,Promise.resolve()}this.deleteMessage(e);const n=t.telemetry.batch_summary&&t.telemetry.batch_summary.reads_num?t.telemetry.batch_summary.reads_num:1;return this.states.download.success=this.states.download.success?this.states.download.success+n:n,Promise.resolve()}initiateDownloadStream(e,t,o,s,i){let r,n,a,c;const d=()=>{if("on"===this.config.options.filter)try{u.remove(s,e=>{e?this.log.warn(`failed to remove file: ${s}`):this.log.warn(`removed failed download file: ${s} ${e}`)})}catch(e){this.log.warn(`failed to remove file. unlinkException: ${s} ${String(e)}`)}},h=()=>{if(!r.networkStreamError)try{r.networkStreamError=1,r.close(),d(),c.destroy&&(this.log.error(`destroying readstream for ${s}`),c.destroy())}catch(e){this.log.error(`error handling sream error: ${e.message}`)}};try{const o={Bucket:t.bucket,Key:t.path};r=u.createWriteStream(s);const n=e.getObject(o);c=n.createReadStream()}catch(p){return this.log.error(`getObject/createReadStream exception: ${String(p)}`),void(i&&i())}c.on("error",e=>{this.log.error(`error in download readstream ${e}`);try{h()}catch(t){this.log.error(`error handling readStreamError: ${t}`)}}),r.on("finish",async()=>{if(!r.networkStreamError){this.log.debug(`downloaded ${s}`);const i=t.telemetry&&t.telemetry.batch_summary&&t.telemetry.batch_summary.reads_num?t.telemetry.batch_summary.reads_num:1;this.states.download.success?this.states.download.success+=i:this.states.download.success=i;try{const t=await u.stat(s);this.states.download.totalSize+=t.size}catch(e){this.log.warn(`failed to stat file: ${String(e)}`)}try{const o=()=>{this.log.info(`Uploads: ${JSON.stringify(this.states.upload)}`),this.log.info(`Downloads: ${JSON.stringify(this.states.download)}`)};if(".fastq"===this.config.options.filetype||".fq"===this.config.options.filetype){this.downloadedFileSizes||(this.downloadedFileSizes={});try{const t=await u.stat(s);this.downloadedFileSizes[s]=t.size||0,this.states.download.totalSize=l(this.downloadedFileSizes).values().sum().value(),o()}catch(e){this.log.error(`finish, getFileSize (fastq) ${String(e)}`)}}else try{const t=await k.getFileSize(s);this.states.download.totalSize+=t.size||0,o()}catch(e){this.log.error(`finish, getFileSize (other) ${String(e)}`)}const i=!(!t.telemetry||!t.telemetry.json)&&t.telemetry.json.exit_status;i&&this.config.options.dataCb&&this.config.options.dataCb(s,i)}catch(e){this.log.warn(`failed to fs.stat file: ${e}`)}this.deleteMessage(o)}}),r.on("close",e=>{this.log.debug(`closing writeStream ${s}`),e&&this.log.error(`error closing writestream ${e}`),clearTimeout(n),clearInterval(a),setTimeout(this.loadAvailableDownloadMessages.bind(this)),i()}),r.on("error",e=>{this.log.error(`error in download write stream ${e}`),h()});const g=()=>{this.log.warn("transfer timed out"),h()};n=setTimeout(g,1e3*this.config.options.downloadTimeout),console.log("downloadTimeout",1e3*this.config.options.downloadTimeout);a=setInterval(async()=>{const e=this.config.instance.outputQueueURL,t=o.ReceiptHandle;this.log.debug({message_id:o.MessageId},"updateVisibility");try{await this.sqs.changeMessageVisibility({QueueUrl:e,ReceiptHandle:t,VisibilityTimeout:this.config.options.inFlightDelay}).promise()}catch(s){this.log.error({message_id:o.MessageId,queue:e,error:s},"Error setting visibility"),clearInterval(a)}},900*this.config.options.inFlightDelay),c.on("data",()=>{clearTimeout(n),n=setTimeout(g,1e3*this.config.options.downloadTimeout)}).pipe(r)}async uploadHandler(e){const t=await this.sessionedS3();let o;const s=e.batch||"",i=g.join(this.config.options.inputFolder,s,e.name),r=`${this.config.instance.bucketFolder}/component-0/${e.name}/${e.name}`;let n;return new Promise((s,a)=>{const l=()=>(o&&!o.closed&&o.close(),a(new Error(`${e.name} timed out`)));n=setTimeout(l,1e3*(this.config.options.uploadTimeout+5));try{o=u.createReadStream(i)}catch(c){return clearTimeout(n),void a(c)}o.on("error",e=>{o.close();let t="error in upload readstream";return e&&e.message&&(t+=`: ${e.message}`),clearTimeout(n),a(new Error(t))}),o.on("open",()=>{const i={Bucket:this.config.instance.bucket,Key:r,Body:o};this.config.instance.key_id&&(i.SSEKMSKeyId=this.config.instance.key_id,i.ServerSideEncryption="aws:kms"),e.size&&(i["Content-Length"]=e.size);const c=t.upload(i,{partSize:10485760,queueSize:1});c.on("httpUploadProgress",e=>{this.log.debug(`upload progress ${e.key} ${e.loaded} / ${e.total}`),clearTimeout(n),n=setTimeout(l,1e3*(this.config.options.uploadTimeout+5))}),c.promise().then(()=>{this.log.info(`${e.id} S3 upload complete`),this.uploadComplete(r,e).then(()=>{o.close(),clearTimeout(n),s(e)}).catch(e=>{clearTimeout(n),a(e)})}).catch(t=>{this.log.warn(`${e.id} uploadStreamError ${t}`),clearTimeout(n),a(t)})}),o.on("end",o.close),o.on("close",()=>this.log.debug("closing readstream"))})}async discoverQueue(e){if(this.config.instance.discoverQueueCache[e])return Promise.resolve(this.config.instance.discoverQueueCache[e]);let t;this.log.debug(`discovering queue for ${e}`);try{const s=await this.sessionedSQS();t=await s.getQueueUrl({QueueName:e}).promise()}catch(o){return this.log.error(`Error: failed to find queue for ${e}: ${String(o)}`),Promise.reject(o)}return this.log.debug(`found queue ${t.QueueUrl}`),this.config.instance.discoverQueueCache[e]=t.QueueUrl,Promise.resolve(t.QueueUrl)}async uploadComplete(e,t){this.log.info(`${t.id} uploaded to S3: ${e}`);const o={bucket:this.config.instance.bucket,outputQueue:this.config.instance.outputQueueName,remote_addr:this.config.instance.remote_addr,user_defined:this.config.instance.user_defined||null,apikey:this.config.options.apikey,id_workflow_instance:this.config.instance.id_workflow_instance,id_master:this.config.instance.id_workflow,utc:(new Date).toISOString(),path:e,prefix:e.substring(0,e.lastIndexOf("/"))};if(this.config.instance.chain)try{o.components=JSON.parse(JSON.stringify(this.config.instance.chain.components)),o.targetComponentId=this.config.instance.chain.targetComponentId}catch(s){return this.log.error(`${t.id} exception parsing components JSON ${String(s)}`),Promise.reject(s)}if(this.config.instance.key_id&&(o.key_id=this.config.instance.key_id),this.config.options.agent_address)try{o.agent_address=JSON.parse(this.config.options.agent_address)}catch(i){this.log.error(`${t.id} Could not parse agent_address ${String(i)}`)}o.components&&Object.keys(o.components).forEach(e=>{"uploadMessageQueue"===o.components[e].inputQueueName&&(o.components[e].inputQueueName=this.uploadMessageQueue),"downloadMessageQueue"===o.components[e].inputQueueName&&(o.components[e].inputQueueName=this.downloadMessageQueue)});try{const e=await this.discoverQueue(this.config.instance.inputQueueName),s=await this.sessionedSQS();this.log.info(`${t.id} sending SQS message to input queue`),await s.sendMessage({QueueUrl:e,MessageBody:JSON.stringify(o)}).promise()}catch(r){return this.log.error(`${t.id} exception sending SQS message: ${String(r)}`),Promise.reject(r)}this.log.info(`${t.id} SQS message sent. Move to uploaded`);try{return await this.moveFile(t,"upload"),Promise.resolve()}catch(n){return Promise.reject(n)}}async moveFile(e,t){const o="upload"===t?this.uploadTo:this.skipTo,s=e.name,i=e.batch||"",r=e.path||g.join(this.config.options.inputFolder,i,s),n=g.join(o,i,s);try{await u.mkdirp(g.join(o,i)),await u.move(r,n),this.log.debug(`${e.id}: ${t} and mv done`),"upload"===t&&this.uploadState("total","incr",{bytes:e.size})}catch(a){this.log.debug(`${e.id} ${t} move error: ${String(a)}`);try{await u.remove(n)}catch(l){this.log.warn(`${e.id} ${t} additionally failed to delete ${n}: ${String(l)}`)}return Promise.reject(a)}return Promise.resolve()}async queueLength(e){if(!e)return Promise.resolve();const t=e.match(/([\w\-_]+)$/)[0];this.log.debug(`querying queue length of ${t}`);try{const t=await this.sessionedSQS(),s=await t.getQueueAttributes({QueueUrl:e,AttributeNames:["ApproximateNumberOfMessages"]}).promise();if(s&&s.Attributes&&"ApproximateNumberOfMessages"in s.Attributes){let e=s.Attributes.ApproximateNumberOfMessages;return e=parseInt(e,10)||0,Promise.resolve(e)}}catch(o){return this.log.error(`error in getQueueAttributes ${String(o)}`),Promise.reject(o)}return Promise.resolve()}url(){return this.config.options.url}apikey(){return this.config.options.apikey}attr(e,t){if(!(e in this.config.options))throw new Error(`config object does not contain property ${e}`);return t?(this.config.options[e]=t,this):this.config.options[e]}stats(e){return this.states[e]&&"upload"===e&&(this.states.upload.total={files:0+parseInt(this.states.upload.enqueued.files,10)+parseInt(this.states.upload.success.files,10)}),this.states[e]}}x.version=k.version,x.REST=F;export default x;
