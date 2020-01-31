/**
 * Copyright Metrichor Ltd. (An Oxford Nanopore Technologies Company) 2020
 */

"use strict";function e(e){return e&&"object"===typeof e&&"default"in e?e.default:e}var t=require("lodash"),s=e(require("axios")),r=e(require("crypto")),o=require("tunnel"),i=e(require("os")),n=e(require("graphql-tag")),a=require("apollo-cache-inmemory"),c=e(require("apollo-client")),l=require("apollo-link"),u=require("apollo-link-http"),h=require("@lifeomic/axios-fetch"),p=e(require("socket.io-client"));s.defaults.validateStatus=e=>e<=504;const d=function(){const e=(e,t)=>{e.headers||(e.headers={});let s=t;if(s||(s={}),!s.apikey)return;if(e.headers["X-EPI2ME-ApiKey"]=s.apikey,!s.apisecret)return;e.headers["X-EPI2ME-SignatureDate"]=(new Date).toISOString(),e.url.match(/^https:/)&&(e.url=e.url.replace(/:443/,"")),e.url.match(/^http:/)&&(e.url=e.url.replace(/:80/,""));const o=[e.url,Object.keys(e.headers).sort().filter(e=>e.match(/^x-epi2me/i)).map(t=>`${t}:${e.headers[t]}`).join("\n")].join("\n"),i=r.createHmac("sha1",s.apisecret).update(o).digest("hex");e.headers["X-EPI2ME-SignatureV0"]=i},i=async e=>{const t=e?e.data:null;if(!t)return Promise.reject(new Error("unexpected non-json response"));if(e&&e.status>=400){let s=`Network error ${e.status}`;return t.error&&(s=t.error),504===e.status&&(s="Please check your network connection and try again."),Promise.reject(new Error(s))}return t.error?Promise.reject(new Error(t.error)):Promise.resolve(t)};return{version:"3.0.958",headers:(s,r)=>{const{log:i}=t.merge({log:{debug:()=>{}}},r);let n=r;if(n||(n={}),s.headers=t.merge({Accept:"application/json","Content-Type":"application/json","X-EPI2ME-Client":n.user_agent||"api","X-EPI2ME-Version":n.agent_version||d.version},s.headers,n.headers),"signing"in n&&!n.signing||e(s,n),n.proxy){const e=n.proxy.match(/https?:\/\/((\S+):(\S+)@)?(\S+):(\d+)/),t=e[2],r=e[3],a={host:e[4],port:e[5]};t&&r&&(a.proxyAuth=`${t}:${r}`),n.proxy.match(/^https/)?(i.debug("using HTTPS over HTTPS proxy",JSON.stringify(a)),s.httpsAgent=o.httpsOverHttps({proxy:a})):(i.debug("using HTTPS over HTTP proxy",JSON.stringify(a)),s.httpsAgent=o.httpsOverHttp({proxy:a})),s.proxy=!1}},get:async(e,r)=>{const{log:o}=t.merge({log:{debug:()=>{}}},r);let n,a=r.url,c=e;r.skip_url_mangle?n=c:(c=`/${c}`,a=a.replace(/\/+$/,""),c=c.replace(/\/+/g,"/"),n=a+c);const l={url:n,gzip:!0};let u;d.headers(l,r);try{o.debug(`GET ${l.url}`),u=await s.get(l.url,l)}catch(h){return Promise.reject(h)}return i(u,r)},post:async(e,r,o)=>{const{log:n}=t.merge({log:{debug:()=>{}}},o);let a=o.url;a=a.replace(/\/+$/,"");const c={url:`${a}/${e.replace(/\/+/g,"/")}`,gzip:!0,data:r,headers:{}};if(o.legacy_form){const e=[],s=t.merge({json:JSON.stringify(r)},r);Object.keys(s).sort().forEach(t=>{e.push(`${t}=${escape(s[t])}`)}),c.data=e.join("&"),c.headers["Content-Type"]="application/x-www-form-urlencoded"}d.headers(c,o);const{data:l}=c;let u;delete c.data;try{n.debug(`POST ${c.url}`),u=await s.post(c.url,l,c)}catch(h){return Promise.reject(h)}return o.handler?o.handler(u):i(u,o)},put:async(e,r,o,n)=>{const{log:a}=t.merge({log:{debug:()=>{}}},n);let c=n.url;c=c.replace(/\/+$/,"");const l={url:`${c}/${e.replace(/\/+/g,"/")}/${r}`,gzip:!0,data:o,headers:{}};if(n.legacy_form){const e=[],s=t.merge({json:JSON.stringify(o)},o);Object.keys(s).sort().forEach(t=>{e.push(`${t}=${escape(s[t])}`)}),l.data=e.join("&"),l.headers["Content-Type"]="application/x-www-form-urlencoded"}d.headers(l,n);const{data:u}=l;let h;delete l.data;try{a.debug(`PUT ${l.url}`),h=await s.put(l.url,u,l)}catch(p){return Promise.reject(p)}return i(h,n)}}}(),g=(e,t)=>{const s=["","K","M","G","T","P","E","Z"];let r=t||0,o=e||0;return o>=1e3?(o/=1e3,r+=1,r>=s.length?"???":g(o,r)):0===r?`${o}${s[r]}`:`${o.toFixed(1)}${s[r]}`};var f="https://epi2me.nanoporetech.com",w={local:!1,url:f,user_agent:"EPI2ME API",region:"eu-west-1",sessionGrace:5,uploadTimeout:1200,downloadTimeout:1200,fileCheckInterval:5,downloadCheckInterval:3,stateCheckInterval:60,inFlightDelay:600,waitTimeSeconds:20,waitTokenError:30,transferPoolSize:3,downloadMode:"data+telemetry",filetype:[".fastq",".fq",".fastq.gz",".fq.gz"],signing:!0};class m{constructor(e){this.options=t.assign({agent_version:d.version,local:!1,url:f,user_agent:"EPI2ME API",signing:!0},e),this.log=this.options.log}async list(e){const t=e.match(/^[a-z_]+/i)[0];return d.get(e,this.options).then(e=>e[`${t}s`])}async read(e,t){return d.get(`${e}/${t}`,this.options)}async user(){return this.options.local?{accounts:[{id_user_account:"none",number:"NONE",name:"None"}]}:d.get("user",this.options)}async status(){return d.get("status",this.options)}async jwt(){return d.post("authenticate",{},t.merge({handler:e=>e.headers["x-epi2me-jwt"]?Promise.resolve(e.headers["x-epi2me-jwt"]):Promise.reject(new Error("failed to fetch JWT"))},this.options))}async instanceToken(e,s){return d.post("token",t.merge(s,{id_workflow_instance:e}),t.assign({},this.options,{legacy_form:!0}))}async installToken(e){return d.post("token/install",{id_workflow:e},t.assign({},this.options,{legacy_form:!0}))}async attributes(){return this.list("attribute")}async workflows(){return this.list("workflow")}async amiImages(){if(this.options.local)throw new Error("amiImages unsupported in local mode");return this.list("ami_image")}async amiImage(e,t){let s,r,o;if(e&&t instanceof Object?(s=e,r=t,o="update"):e instanceof Object&&!t?(r=e,o="create"):(o="read",s=e),this.options.local)throw new Error("ami_image unsupported in local mode");if("update"===o)return d.put("ami_image",s,r,this.options);if("create"===o)return d.post("ami_image",r,this.options);if(!s)throw new Error("no id_ami_image specified");return this.read("ami_image",s)}async workflow(e,s,r){let o,i,n,a;if(e&&s&&r instanceof Function?(o=e,i=s,n=r,a="update"):e&&s instanceof Object&&!(s instanceof Function)?(o=e,i=s,a="update"):e instanceof Object&&s instanceof Function?(i=e,n=s,a="create"):e instanceof Object&&!s?(i=e,a="create"):(a="read",o=e,n=s instanceof Function?s:null),"update"===a)try{const e=await d.put("workflow",o,i,this.options);return n?n(null,e):Promise.resolve(e)}catch(h){return n?n(h):Promise.reject(h)}if("create"===a)try{const e=await d.post("workflow",i,this.options);return n?n(null,e):Promise.resolve(e)}catch(h){return n?n(h):Promise.reject(h)}if(!o){const e=new Error("no workflow id specified");return n?n(e):Promise.reject(e)}const c={};try{const e=await this.read("workflow",o);if(e.error)throw new Error(e.error);t.merge(c,e)}catch(h){return this.log.error(`${o}: error fetching workflow ${String(h)}`),n?n(h):Promise.reject(h)}t.merge(c,{params:{}});try{const e=await d.get(`workflow/config/${o}`,this.options);if(e.error)throw new Error(e.error);t.merge(c,e)}catch(h){return this.log.error(`${o}: error fetching workflow config ${String(h)}`),n?n(h):Promise.reject(h)}const l=t.filter(c.params,{widget:"ajax_dropdown"}),u=[...l.map((e,t)=>{const s=l[t];return new Promise((e,t)=>{const r=s.values.source.replace("{{EPI2ME_HOST}}","").replace(/&?apikey=\{\{EPI2ME_API_KEY\}\}/,"");d.get(r,this.options).then(t=>{const r=t[s.values.data_root];return r&&(s.values=r.map(e=>({label:e[s.values.items.label_key],value:e[s.values.items.value_key]}))),e()}).catch(e=>(this.log.error(`failed to fetch ${r}`),t(e)))})})];try{return await Promise.all(u),n?n(null,c):Promise.resolve(c)}catch(h){return this.log.error(`${o}: error fetching config and parameters ${String(h)}`),n?n(h):Promise.reject(h)}}async startWorkflow(e){return d.post("workflow_instance",e,t.assign({},this.options,{legacy_form:!0}))}async stopWorkflow(e){return d.put("workflow_instance/stop",e,null,t.assign({},this.options,{legacy_form:!0}))}async workflowInstances(e){return e&&e.run_id?d.get(`workflow_instance/wi?show=all&columns[0][name]=run_id;columns[0][searchable]=true;columns[0][search][regex]=true;columns[0][search][value]=${e.run_id};`,this.options).then(e=>e.data.map(e=>({id_workflow_instance:e.id_ins,id_workflow:e.id_flo,run_id:e.run_id,description:e.desc,rev:e.rev}))):this.list("workflow_instance")}async workflowInstance(e){return this.read("workflow_instance",e)}async workflowConfig(e){return d.get(`workflow/config/${e}`,this.options)}async register(e,s){return d.put("reg",e,{description:s||`${i.userInfo().username}@${i.hostname()}`},t.assign({},this.options,{signing:!1}))}async datasets(e){let t=e;return t||(t={}),t.show||(t.show="mine"),this.list(`dataset?show=${t.show}`)}async dataset(e){return this.options.local?this.datasets().then(t=>t.find(t=>t.id_dataset===e)):this.read("dataset",e)}async fetchContent(e){const s=t.assign({},this.options,{skip_url_mangle:!0,headers:{"Content-Type":""}});return d.get(e,s)}}function y(e,t,s){return t in e?Object.defineProperty(e,t,{value:s,enumerable:!0,configurable:!0,writable:!0}):e[t]=s,e}const k="\npage\npages\nhasNext\nhasPrevious\ntotalCount\n",$="\nidWorkflowInstance\nstartDate\nworkflowImage{\n  workflow\n  {\n    rev\n    name\n  }\n}\n",I=function(){const e=(e,t)=>{e.headers||(e.headers={});let s=t;if(s||(s={}),!s.apikey||!s.apisecret)return;e.headers["X-EPI2ME-APIKEY"]=s.apikey,e.headers["X-EPI2ME-SIGNATUREDATE"]=(new Date).toISOString();const o=[Object.keys(e.headers).sort().filter(e=>e.match(/^x-epi2me/i)).map(t=>`${t}:${e.headers[t]}`).join("\n"),e.body].join("\n"),i=r.createHmac("sha1",s.apisecret).update(o).digest("hex");e.headers["X-EPI2ME-SIGNATUREV0"]=i};return{version:"3.0.958",setHeaders:(s,r)=>{const{log:i}=t.merge({log:{debug:()=>{}}},r);let n=r;if(n||(n={}),s.headers=t.merge({Accept:"application/json","Content-Type":"application/json","X-EPI2ME-CLIENT":n.user_agent||"api","X-EPI2ME-VERSION":n.agent_version||I.version},s.headers,n.headers),"signing"in n&&!n.signing||e(s,n),n.proxy){const e=n.proxy.match(/https?:\/\/((\S+):(\S+)@)?(\S+):(\d+)/),t=e[2],r=e[3],a={host:e[4],port:e[5]};t&&r&&(a.proxyAuth=`${t}:${r}`),n.proxy.match(/^https/)?(i.debug("using HTTPS over HTTPS proxy",JSON.stringify(a)),s.httpsAgent=o.httpsOverHttps({proxy:a})):(i.debug("using HTTPS over HTTP proxy",JSON.stringify(a)),s.httpsAgent=o.httpsOverHttp({proxy:a})),s.proxy=!1}}}}(),b=h.buildAxiosFetch(s),v=(e,t)=>{const{apikey:s,apisecret:r}=t.headers.keys;return delete t.headers.keys,I.setHeaders(t,{apikey:s,apisecret:r,signing:!0}),b(e,t)},E=new c({link:new l.ApolloLink(e=>{const{apikey:t,apisecret:s,url:r}=e.getContext(),o=u.createHttpLink({uri:`${r}/graphql`,fetch:v,headers:{keys:{apikey:t,apisecret:s}}});return l.execute(o,e)}),cache:new a.InMemoryCache});class P{constructor(e){y(this,"createContext",e=>{const{apikey:s,apisecret:r,url:o}=this.options;return t.merge({apikey:s,apisecret:r,url:o},e)}),y(this,"query",e=>({context:t={},variables:s={}}={})=>{const r=this.createContext(t);let o;return o="string"===typeof e?n`
        ${e}
      `:e,this.client.query({query:o,variables:s,context:r})}),y(this,"mutate",e=>({context:t={},variables:s={}}={})=>{const r=this.createContext(t);let o;return o="string"===typeof e?n`
        ${e}
      `:e,this.client.mutate({mutation:o,variables:s,context:r})}),y(this,"workflows",this.query(n`
    query allWorkflows($page: Int, $isActive: Int) {
      allWorkflows(page: $page, isActive: $isActive) {
        ${k}
        results {
          ${"\nidWorkflow\nname\ndescription\nsummary\nrev\n"}
        }
      }
    }
  `)),y(this,"workflowPages",async e=>{let t=e,s=await this.workflows({variables:{page:t}});const r=async e=>(t=e,s=await this.workflows({variables:{page:t}}),s);return{data:s,next:()=>r(t+1),previous:()=>r(t-1),first:()=>r(1),last:()=>r(0)}}),y(this,"workflow",this.query(n`
    query workflow($idWorkflow: ID!) {
      workflow(idWorkflow: $idWorkflow) {
        ${"\nidWorkflow\nname\ndescription\nsummary\nrev\n"}
      }
    }
   `)),y(this,"workflowInstances",this.query(n`
  query allWorkflowInstances($page: Int, $shared: Boolean, $idUser: Int) {
    allWorkflowInstances(page: $page, shared: $shared, idUser: $idUser) {
      ${k}
      results {
        ${$}
      }
    }
  }
   `)),y(this,"workflowInstance",this.query(n`
      query workflowInstance($idWorkflowInstance: ID!) {
        workflowInstance(idWorkflowInstance: $idWorkflowInstance) {
          ${$}
        }
      }
   `)),y(this,"startWorkflow",this.mutate(n`
    mutation startWorkflow(
      $idWorkflow: ID!
      $computeAccountId: Int!
      $storageAccountId: Int
      $isConsentedHuman: Int = 0
    ) {
      startWorkflowInstance(
        idWorkflow: $idWorkflow
        computeAccountId: $computeAccountId
        storageAccountId: $storageAccountId
        isConsentedHuman: $isConsentedHuman
      ) {
        bucket
        idUser
        idWorkflowInstance
        inputqueue
        outputqueue
        region
        keyId
        chain
      }
    }
  `)),y(this,"user",this.query(n`
    query user {
      me {
        username
        realname
        useraccountSet {
          idUserAccount
        }
      }
    }
  `)),y(this,"register",this.mutate(n`
    mutation registerToken($code: String!, $description: String) {
      registerToken(code: $code, descripton: $description) {
        apikey
        apisecret
        description
      }
    }
  `)),this.options=t.assign({agent_version:d.version,local:!1,url:f,user_agent:"EPI2ME API",signing:!0},e),this.options.url=this.options.url.replace(/:\/\//,"://graphql."),this.log=this.options.log,this.client=E}}class S{constructor(e,s){this.debounces={},this.debounceWindow=t.merge({debounceWindow:2e3},s).debounceWindow,this.log=t.merge({log:{debug:()=>{}}},s).log,e.jwt().then(e=>{this.socket=p(s.url,{transportOptions:{polling:{extraHeaders:{Cookie:`x-epi2me-jwt=${e}`}}}}),this.socket.on("connect",()=>{this.log.debug("socket ready")})})}debounce(e,s){const r=t.merge(e)._uuid;if(r){if(this.debounces[r])return;this.debounces[r]=1,setTimeout(()=>{delete this.debounces[r]},this.debounceWindow)}s&&s(e)}watch(e,t){if(!this.socket)return this.log.debug(`socket not ready. requeueing watch on ${e}`),void setTimeout(()=>{this.watch(e,t)},1e3);this.socket.on(e,e=>this.debounce(e,t))}emit(e,t){if(!this.socket)return this.log.debug(`socket not ready. requeueing emit on ${e}`),void setTimeout(()=>{this.emit(e,t)},1e3);this.log.debug(`socket emit ${e} ${JSON.stringify(t)}`),this.socket.emit(e,t)}}class _{constructor(e){let s;if(s="string"===typeof e||"object"===typeof e&&e.constructor===String?JSON.parse(e):e||{},s.endpoint&&(s.url=s.endpoint,delete s.endpoint),s.log){if(!t.every([s.log.info,s.log.warn,s.log.error,s.log.debug,s.log.json],t.isFunction))throw new Error("expected log object to have error, debug, info, warn and json methods");this.log=s.log}else this.log={info:e=>{console.info(`[${(new Date).toISOString()}] INFO: ${e}`)},debug:e=>{console.debug(`[${(new Date).toISOString()}] DEBUG: ${e}`)},warn:e=>{console.warn(`[${(new Date).toISOString()}] WARN: ${e}`)},error:e=>{console.error(`[${(new Date).toISOString()}] ERROR: ${e}`)},json:e=>{console.log(JSON.stringify(e))}};this.stopped=!0,this.states={upload:{filesCount:0,success:{files:0,bytes:0,reads:0},types:{},niceTypes:"",progress:{bytes:0,total:0}},download:{progress:{},success:{files:0,reads:0,bytes:0},fail:0,types:{},niceTypes:""},warnings:[]},this.config={options:t.defaults(s,w),instance:{id_workflow_instance:s.id_workflow_instance,inputQueueName:null,outputQueueName:null,outputQueueURL:null,discoverQueueCache:{},bucket:null,bucketFolder:null,remote_addr:null,chain:null,key_id:null}},this.config.instance.awssettings={region:this.config.options.region},this.REST=new m(t.merge({log:this.log},this.config.options)),this.graphQL=new P(t.merge({log:this.log},this.config.options)),this.timers={downloadCheckInterval:null,stateCheckInterval:null,fileCheckInterval:null,transferTimeouts:{},visibilityIntervals:{},summaryTelemetryInterval:null}}async socket(){return this.mySocket?this.mySocket:(this.mySocket=new S(this.REST,t.merge({log:this.log},this.config.options)),this.mySocket)}async realtimeFeedback(e,t){(await this.socket()).emit(e,t)}async stopEverything(){this.stopped=!0,this.log.debug("stopping watchers"),["downloadCheckInterval","stateCheckInterval","fileCheckInterval","summaryTelemetryInterval"].forEach(e=>{this.timers[e]&&(this.log.debug(`clearing ${e} interval`),clearInterval(this.timers[e]),this.timers[e]=null)}),Object.keys(this.timers.transferTimeouts).forEach(e=>{this.log.debug(`clearing transferTimeout for ${e}`),clearTimeout(this.timers.transferTimeouts[e]),delete this.timers.transferTimeouts[e]}),Object.keys(this.timers.visibilityIntervals).forEach(e=>{this.log.debug(`clearing visibilityInterval for ${e}`),clearInterval(this.timers.visibilityIntervals[e]),delete this.timers.visibilityIntervals[e]}),this.downloadWorkerPool&&(this.log.debug("clearing downloadWorkerPool"),await Promise.all(Object.values(this.downloadWorkerPool)),this.downloadWorkerPool=null);const{id_workflow_instance:e}=this.config.instance;if(e){try{await this.REST.stopWorkflow(e)}catch(t){return this.log.error(`Error stopping instance: ${String(t)}`),Promise.reject(t)}this.log.info(`workflow instance ${e} stopped`)}return Promise.resolve()}reportProgress(){const{upload:e,download:t}=this.states;this.log.json({progress:{download:t,upload:e}})}storeState(e,t,s,r){const o=r||{};this.states[e]||(this.states[e]={}),this.states[e][t]||(this.states[e][t]={}),"incr"===s?Object.keys(o).forEach(s=>{this.states[e][t][s]=this.states[e][t][s]?this.states[e][t][s]+parseInt(o[s],10):parseInt(o[s],10)}):Object.keys(o).forEach(s=>{this.states[e][t][s]=this.states[e][t][s]?this.states[e][t][s]-parseInt(o[s],10):-parseInt(o[s],10)});try{this.states[e].success.niceReads=g(this.states[e].success.reads)}catch(n){this.states[e].success.niceReads=0}try{this.states[e].progress.niceSize=g(this.states[e].success.bytes+this.states[e].progress.bytes||0)}catch(n){this.states[e].progress.niceSize=0}try{this.states[e].success.niceSize=g(this.states[e].success.bytes)}catch(n){this.states[e].success.niceSize=0}this.states[e].niceTypes=Object.keys(this.states[e].types||{}).sort().map(t=>`${this.states[e].types[t]} ${t}`).join(", ");const i=Date.now();(!this.stateReportTime||i-this.stateReportTime>2e3)&&(this.stateReportTime=i,this.reportProgress())}uploadState(e,t,s){return this.storeState("upload",e,t,s)}downloadState(e,t,s){return this.storeState("download",e,t,s)}url(){return this.config.options.url}apikey(){return this.config.options.apikey}attr(e,t){if(!(e in this.config.options))throw new Error(`config object does not contain property ${e}`);return t?(this.config.options[e]=t,this):this.config.options[e]}stats(e){return this.states[e]}}_.version=d.version,_.Profile=class{constructor(e,s){this.allProfileData={},this.defaultEndpoint=process.env.METRICHOR||w.endpoint||w.url,this.raiseExceptions=s,e&&(this.allProfileData=t.merge(e,{profiles:{}})),this.allProfileData.endpoint&&(this.defaultEndpoint=this.allProfileData.endpoint)}profile(e){return e?t.merge({endpoint:this.defaultEndpoint},this.allProfileData.profiles[e]):{}}profiles(){return Object.keys(this.allProfileData.profiles||{})}},_.REST=m,_.utils=d,module.exports=_;
