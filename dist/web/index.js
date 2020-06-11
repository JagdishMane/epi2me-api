/**
 * Copyright Metrichor Ltd. (An Oxford Nanopore Technologies Company) 2020
 */

"use strict";function e(e){return e&&"object"===typeof e&&"default"in e?e.default:e}var t=require("lodash"),s=require("rxjs"),r=e(require("graphql-tag")),o=require("apollo-cache-inmemory"),i=e(require("apollo-client")),n=require("apollo-link"),a=require("apollo-link-http"),l=require("url"),c=require("@lifeomic/axios-fetch"),u=e(require("axios")),h=e(require("crypto")),p=require("tunnel"),d=e(require("os")),g=e(require("socket.io-client")),f="https://epi2me.nanoporetech.com",w={local:!1,url:f,user_agent:"EPI2ME API",region:"eu-west-1",sessionGrace:5,uploadTimeout:1200,downloadTimeout:1200,fileCheckInterval:5,downloadCheckInterval:3,stateCheckInterval:60,inFlightDelay:600,waitTimeSeconds:20,waitTokenError:30,transferPoolSize:3,downloadMode:"data+telemetry",filetype:[".fastq",".fq",".fastq.gz",".fq.gz"],signing:!0,sampleDirectory:"/data"};const y="\npage\npages\nhasNext\nhasPrevious\ntotalCount\n",m="\nidWorkflowInstance\nstartDate\nworkflowImage{\n  workflow\n  {\n    rev\n    name\n  }\n}\n";const k=function(){const e=(e,t)=>{e.headers||(e.headers={});let s=t;if(s||(s={}),!s.apikey||!s.apisecret)return;e.headers["X-EPI2ME-APIKEY"]=s.apikey,e.headers["X-EPI2ME-SIGNATUREDATE"]=(new Date).toISOString();const r=[Object.keys(e.headers).sort().filter(e=>e.match(/^x-epi2me/i)).map(t=>`${t}:${e.headers[t]}`).join("\n"),e.body].join("\n"),o=h.createHmac("sha1",s.apisecret).update(r).digest("hex");e.headers["X-EPI2ME-SIGNATUREV0"]=o};return{version:"3.0.1336",setHeaders:(s,r)=>{const{log:o}=t.merge({log:{debug:()=>{}}},r);let i=r;if(i||(i={}),s.headers=t.merge({Accept:"application/json","Content-Type":"application/json","X-EPI2ME-CLIENT":i.user_agent||"api","X-EPI2ME-VERSION":i.agent_version||k.version},s.headers,i.headers),"signing"in i&&!i.signing||e(s,i),i.proxy){const e=i.proxy.match(/https?:\/\/((\S+):(\S+)@)?(\S+):(\d+)/),t=e[2],r=e[3],n={host:e[4],port:e[5]};t&&r&&(n.proxyAuth=`${t}:${r}`),i.proxy.match(/^https/)?(o.debug("using HTTPS over HTTPS proxy",JSON.stringify(n)),s.httpsAgent=p.httpsOverHttps({proxy:n})):(o.debug("using HTTPS over HTTP proxy",JSON.stringify(n)),s.httpsAgent=p.httpsOverHttp({proxy:n})),s.proxy=!1}}}}(),$=c.buildAxiosFetch(u),_=(e,t)=>{const{apikey:s,apisecret:r}=t.headers.keys;return delete t.headers.keys,k.setHeaders(t,{apikey:s,apisecret:r,signing:!0}),$(e,t)},I=new i({link:new n.ApolloLink(e=>{const{apikey:t,apisecret:s,url:r}=e.getContext(),o=a.createHttpLink({uri:l.resolve(r,"/graphql"),fetch:_,headers:{keys:{apikey:t,apisecret:s}}});return n.execute(o,e)}),cache:new o.InMemoryCache});u.defaults.validateStatus=e=>e<=504;const S=function(){const e=(e,t)=>{e.headers||(e.headers={});let s=t;if(s||(s={}),!s.apikey)return;if(e.headers["X-EPI2ME-ApiKey"]=s.apikey,!s.apisecret)return;e.headers["X-EPI2ME-SignatureDate"]=(new Date).toISOString(),e.url.match(/^https:/)&&(e.url=e.url.replace(/:443/,"")),e.url.match(/^http:/)&&(e.url=e.url.replace(/:80/,""));const r=[e.url,Object.keys(e.headers).sort().filter(e=>e.match(/^x-epi2me/i)).map(t=>`${t}:${e.headers[t]}`).join("\n")].join("\n"),o=h.createHmac("sha1",s.apisecret).update(r).digest("hex");e.headers["X-EPI2ME-SignatureV0"]=o},s=async e=>{const t=e?e.data:null;if(!t)return Promise.reject(new Error("unexpected non-json response"));if(e&&e.status>=400){let s=`Network error ${e.status}`;return t.error&&(s=t.error),504===e.status&&(s="Please check your network connection and try again."),Promise.reject(new Error(s))}return t.error?Promise.reject(new Error(t.error)):Promise.resolve(t)};return{version:"3.0.1336",headers:(s,r)=>{const{log:o}=t.merge({log:{debug:()=>{}}},r);let i=r;if(i||(i={}),s.headers=t.merge({Accept:"application/json","Content-Type":"application/json","X-EPI2ME-Client":i.user_agent||"api","X-EPI2ME-Version":i.agent_version||S.version},s.headers,i.headers),"signing"in i&&!i.signing||e(s,i),i.proxy){const e=i.proxy.match(/https?:\/\/((\S+):(\S+)@)?(\S+):(\d+)/),t=e[2],r=e[3],n={host:e[4],port:e[5]};t&&r&&(n.proxyAuth=`${t}:${r}`),i.proxy.match(/^https/)?(o.debug("using HTTPS over HTTPS proxy",JSON.stringify(n)),s.httpsAgent=p.httpsOverHttps({proxy:n})):(o.debug("using HTTPS over HTTP proxy",JSON.stringify(n)),s.httpsAgent=p.httpsOverHttp({proxy:n})),s.proxy=!1}},head:async(e,s)=>{const{log:r}=t.merge({log:{debug:()=>{}}},s);let o,i=s.url,n=e;s.skip_url_mangle?o=n:(n=`/${n}`,i=i.replace(/\/+$/,""),n=n.replace(/\/+/g,"/"),o=i+n);const a={url:o,gzip:!0};let l;S.headers(a,s);try{if(r.debug(`HEAD ${a.url}`),l=await u.head(a.url,a),l&&l.status>=400){let e=`Network error ${l.status}`;return 504===l.status&&(e="Please check your network connection and try again."),Promise.reject(new Error(e))}}catch(c){return Promise.reject(c)}return Promise.resolve(l)},get:async(e,r)=>{const{log:o}=t.merge({log:{debug:()=>{}}},r);let i,n=r.url,a=e;r.skip_url_mangle?i=a:(a=`/${a}`,n=n.replace(/\/+$/,""),a=a.replace(/\/+/g,"/"),i=n+a);const l={url:i,gzip:!0};let c;S.headers(l,r);try{o.debug(`GET ${l.url}`),c=await u.get(l.url,l)}catch(h){return Promise.reject(h)}return s(c,r)},post:async(e,r,o)=>{const{log:i}=t.merge({log:{debug:()=>{}}},o);let n=o.url;n=n.replace(/\/+$/,"");const a={url:`${n}/${e.replace(/\/+/g,"/")}`,gzip:!0,data:r,headers:{}};if(o.legacy_form){const e=[],s=t.merge({json:JSON.stringify(r)},r);Object.keys(s).sort().forEach(t=>{e.push(`${t}=${escape(s[t])}`)}),a.data=e.join("&"),a.headers["Content-Type"]="application/x-www-form-urlencoded"}S.headers(a,o);const{data:l}=a;let c;delete a.data;try{i.debug(`POST ${a.url}`),c=await u.post(a.url,l,a)}catch(h){return Promise.reject(h)}return o.handler?o.handler(c):s(c,o)},put:async(e,r,o,i)=>{const{log:n}=t.merge({log:{debug:()=>{}}},i);let a=i.url;a=a.replace(/\/+$/,"");const l={url:`${a}/${e.replace(/\/+/g,"/")}/${r}`,gzip:!0,data:o,headers:{}};if(i.legacy_form){const e=[],s=t.merge({json:JSON.stringify(o)},o);Object.keys(s).sort().forEach(t=>{e.push(`${t}=${escape(s[t])}`)}),l.data=e.join("&"),l.headers["Content-Type"]="application/x-www-form-urlencoded"}S.headers(l,i);const{data:c}=l;let h;delete l.data;try{n.debug(`PUT ${l.url}`),h=await u.put(l.url,c,l)}catch(p){return Promise.reject(p)}return s(h,i)},convertResponseToObject(e){if("object"===typeof e)return e;try{return JSON.parse(e)}catch(t){throw new Error(`exception parsing chain JSON ${String(t)}`)}}}}();class b{constructor(e){b.prototype.__init.call(this),b.prototype.__init2.call(this),b.prototype.__init3.call(this),b.prototype.__init4.call(this),b.prototype.__init5.call(this),b.prototype.__init6.call(this),b.prototype.__init7.call(this),b.prototype.__init8.call(this),b.prototype.__init9.call(this),b.prototype.__init10.call(this),b.prototype.__init11.call(this),b.prototype.__init12.call(this),b.prototype.__init13.call(this),b.prototype.__init14.call(this),b.prototype.__init15.call(this),b.prototype.__init16.call(this),b.prototype.__init17.call(this),this.options=t.assign({agent_version:S.version,local:!1,url:f,user_agent:"EPI2ME API",signing:!0},e),this.options.url=this.options.url.replace(/:\/\//,"://graphql."),this.options.url=this.options.url.replace(/\/$/,""),this.log=this.options.log,this.client=I}__init(){this.createContext=e=>{const{apikey:s,apisecret:r,url:o}=this.options;return t.merge({apikey:s,apisecret:r,url:o},e)}}__init2(){this.query=e=>({context:t={},variables:s={},options:o={}}={})=>{const i=this.createContext(t);let n;return n="string"===typeof e?r`
        ${e}
      `:"function"===typeof e?r`
        ${e(y)}
      `:e,this.client.query({query:n,variables:s,...o,context:i})}}__init3(){this.mutate=e=>({context:t={},variables:s={},options:o={}}={})=>{const i=this.createContext(t);let n;return n="string"===typeof e?r`
        ${e}
      `:e,this.client.mutate({mutation:n,variables:s,...o,context:i})}}__init4(){this.resetCache=()=>{this.client.resetStore()}}__init5(){this.workflows=this.query(r`
    query allWorkflows($page: Int, $pageSize: Int, $isActive: Int, $orderBy: String, region: String) {
      allWorkflows(page: $page, pageSize: $pageSize, isActive: $isActive, orderBy: $orderBy, region: $region) {
        ${y}
        results {
          ${"\nidWorkflow\nname\ndescription\nsummary\nrev\n"}
        }
      }
    }
  `)}__init6(){this.workflowPages=async e=>{let t=e,s=await this.workflows({variables:{page:t}});const r=async e=>(t=e,s=await this.workflows({variables:{page:t}}),s);return{data:s,next:()=>r(t+1),previous:()=>r(t-1),first:()=>r(1),last:()=>r(0)}}}__init7(){this.workflow=this.query(r`
    query workflow($idWorkflow: ID!) {
      workflow(idWorkflow: $idWorkflow) {
        ${"\nidWorkflow\nname\ndescription\nsummary\nrev\n"}
      }
    }
   `)}__init8(){this.workflowInstances=this.query(r`
  query allWorkflowInstances($page: Int, $pageSize: Int, $shared: Boolean, $idUser: ID, $orderBy: String) {
    allWorkflowInstances(page: $page, pageSize: $pageSize, shared: $shared, idUser: $idUser, orderBy: $orderBy) {
      ${y}
      results {
        ${m}
      }
    }
  }
   `)}__init9(){this.workflowInstance=this.query(r`
      query workflowInstance($idWorkflowInstance: ID!) {
        workflowInstance(idWorkflowInstance: $idWorkflowInstance) {
          ${m}
        }
      }
   `)}__init10(){this.startWorkflow=this.mutate(r`
    mutation startWorkflow(
      $idWorkflow: ID!
      $computeAccountId: ID!
      $storageAccountId: ID
      $isConsentedHuman: Boolean = false
      $idDataset: ID
      $storeResults: Boolean = false
      $userDefined: GenericScalar
      $instanceAttributes: [GenericScalar]
      $region: String
    ) {
      startData: startWorkflowInstance(
        idWorkflow: $idWorkflow
        computeAccountId: $computeAccountId
        storageAccountId: $storageAccountId
        isConsentedHuman: $isConsentedHuman
        idDataset: $idDataset
        storeResults: $storeResults
        userDefined: $userDefined
        instanceAttributes: $instanceAttributes
        region: $region
      ) {
        bucket
        idUser
        remoteAddr
        instance {
          idWorkflowInstance
          chain
          keyId
          outputqueue
          mappedTelemetry
          workflowImage {
            inputqueue
            workflow {
              idWorkflow
            }
            region {
              name
            }
          }
        }
      }
    }
  `)}__init11(){this.stopWorkflow=this.mutate(r`
    mutation stopWorkflowInstance($idWorkflowInstance: ID!) {
      stopData: stopWorkflowInstance(idWorkflowInstance: $idWorkflowInstance) {
        success
        message
      }
    }
  `)}__init12(){this.instanceToken=this.mutate(r`
    mutation getInstanceToken($idWorkflowInstance: ID!) {
      token: getInstanceToken(idWorkflowInstance: $idWorkflowInstance) {
        id_workflow_instance: idWorkflowInstance
        accessKeyId
        secretAccessKey
        sessionToken
        expiration
        region
      }
    }
  `)}__init13(){this.user=this.query(r`
    query user {
      me {
        username
        realname
        useraccountSet {
          idUserAccount
        }
      }
    }
  `)}__init14(){this.updateUser=this.mutate(r`
    mutation updateUser($idRegionPreferred: ID!) {
      updateUser(idRegionPreferred: $idRegionPreferred) {
        idRegionPreferred
      }
    }
  `)}__init15(){this.register=this.mutate(r`
    mutation registerToken($code: String!, $description: String) {
      registerToken(code: $code, description: $description) {
        apikey
        apisecret
        description
      }
    }
  `)}__init16(){this.healthCheck=()=>S.get("/status",this.options)}__init17(){this.regions=this.query(r`
    query regions {
      regions {
        idRegion
        description
        name
      }
    }
  `)}}const v=(e,t)=>{const s=["","K","M","G","T","P","E","Z"];let r=t||0,o=e||0;return o>=1e3?(o/=1e3,r+=1,r>=s.length?"???":v(o,r)):0===r?`${o}${s[r]}`:`${o.toFixed(1)}${s[r]}`};class P{constructor(e){this.options=t.assign({agent_version:S.version,local:!1,url:f,user_agent:"EPI2ME API",signing:!0},e),this.log=this.options.log,this.cachedResponses={}}async list(e){const t=e.match(/^[a-z_]+/i)[0];return S.get(e,this.options).then(e=>e[`${t}s`])}async read(e,t){return S.get(`${e}/${t}`,this.options)}async user(){return this.options.local?{accounts:[{id_user_account:"none",number:"NONE",name:"None"}]}:S.get("user",this.options)}async status(){return S.get("status",this.options)}async jwt(){return S.post("authenticate",{},t.merge({handler:e=>e.headers["x-epi2me-jwt"]?Promise.resolve(e.headers["x-epi2me-jwt"]):Promise.reject(new Error("failed to fetch JWT"))},this.options))}async instanceToken(e,s){return S.post("token",t.merge(s,{id_workflow_instance:e}),t.assign({},this.options,{legacy_form:!0}))}async installToken(e){return S.post("token/install",{id_workflow:e},t.assign({},this.options,{legacy_form:!0}))}async attributes(){return this.list("attribute")}async workflows(){return this.list("workflow")}async amiImages(){if(this.options.local)throw new Error("amiImages unsupported in local mode");return this.list("ami_image")}async amiImage(e,t){let s,r,o;if(e&&t instanceof Object?(s=e,r=t,o="update"):e instanceof Object&&!t?(r=e,o="create"):(o="read",s=e),this.options.local)throw new Error("ami_image unsupported in local mode");if("update"===o)return S.put("ami_image",s,r,this.options);if("create"===o)return S.post("ami_image",r,this.options);if(!s)throw new Error("no id_ami_image specified");return this.read("ami_image",s)}async workflow(e,s,r){let o,i,n,a;if(e&&s&&r instanceof Function?(o=e,i=s,n=r,a="update"):e&&s instanceof Object&&!(s instanceof Function)?(o=e,i=s,a="update"):e instanceof Object&&s instanceof Function?(i=e,n=s,a="create"):e instanceof Object&&!s?(i=e,a="create"):(a="read",o=e,n=s instanceof Function?s:null),"update"===a)try{const e=await S.put("workflow",o,i,this.options);return n?n(null,e):Promise.resolve(e)}catch(h){return n?n(h):Promise.reject(h)}if("create"===a)try{const e=await S.post("workflow",i,this.options);return n?n(null,e):Promise.resolve(e)}catch(h){return n?n(h):Promise.reject(h)}if(!o){const e=new Error("no workflow id specified");return n?n(e):Promise.reject(e)}const l={};try{const e=await this.read("workflow",o);if(e.error)throw new Error(e.error);t.merge(l,e)}catch(h){return this.log.error(`${o}: error fetching workflow ${String(h)}`),n?n(h):Promise.reject(h)}t.merge(l,{params:{}});try{const e=await S.get(`workflow/config/${o}`,this.options);if(e.error)throw new Error(e.error);t.merge(l,e)}catch(h){return this.log.error(`${o}: error fetching workflow config ${String(h)}`),n?n(h):Promise.reject(h)}const c=t.filter(l.params,{widget:"ajax_dropdown"}),u=[...c.map((e,t)=>{const s=c[t];return new Promise((e,t)=>{const r=s.values.source.replace("{{EPI2ME_HOST}}","").replace(/&?apikey=\{\{EPI2ME_API_KEY\}\}/,"");S.get(r,this.options).then(t=>{const r=t[s.values.data_root];return r&&(s.values=r.map(e=>({label:e[s.values.items.label_key],value:e[s.values.items.value_key]}))),e()}).catch(e=>(this.log.error(`failed to fetch ${r}`),t(e)))})})];try{return await Promise.all(u),n?n(null,l):Promise.resolve(l)}catch(h){return this.log.error(`${o}: error fetching config and parameters ${String(h)}`),n?n(h):Promise.reject(h)}}async startWorkflow(e){return S.post("workflow_instance",e,t.assign({},this.options,{legacy_form:!0}))}async stopWorkflow(e){return S.put("workflow_instance/stop",e,null,t.assign({},this.options,{legacy_form:!0}))}async workflowInstances(e){return e&&e.run_id?S.get(`workflow_instance/wi?show=all&columns[0][name]=run_id;columns[0][searchable]=true;columns[0][search][regex]=true;columns[0][search][value]=${e.run_id};`,this.options).then(e=>e.data.map(e=>({id_workflow_instance:e.id_ins,id_workflow:e.id_flo,run_id:e.run_id,description:e.desc,rev:e.rev}))):this.list("workflow_instance")}async workflowInstance(e){return this.read("workflow_instance",e)}async workflowConfig(e){return S.get(`workflow/config/${e}`,this.options)}async register(e,s){return S.put("reg",e,{description:s||`${d.userInfo().username}@${d.hostname()}`},t.assign({},this.options,{signing:!1}))}async datasets(e){let t=e;return t||(t={}),t.show||(t.show="mine"),this.list(`dataset?show=${t.show}`)}async dataset(e){return this.options.local?this.datasets().then(t=>t.find(t=>t.id_dataset===e)):this.read("dataset",e)}async fetchContent(e){const s=t.assign({},this.options,{skip_url_mangle:!0,headers:{"Content-Type":""}});let r;try{if(r=(await S.head(e,s)).headers.etag,r&&this.cachedResponses[e]&&this.cachedResponses[e].etag===r)return this.cachedResponses[e].response}catch(i){this.log.warn(`Failed to HEAD request ${e}: ${String(i)}`)}const o=await S.get(e,s);return r&&(this.cachedResponses[e]={etag:r,response:o}),o}}class E{constructor(e,s){this.debounces={},this.debounceWindow=t.merge({debounceWindow:2e3},s).debounceWindow,this.log=t.merge({log:{debug:()=>{}}},s).log,e.jwt().then(e=>{this.socket=g(s.url,{transportOptions:{polling:{extraHeaders:{Cookie:`x-epi2me-jwt=${e}`}}}}),this.socket.on("connect",()=>{this.log.debug("socket ready")})})}debounce(e,s){const r=t.merge(e)._uuid;if(r){if(this.debounces[r])return;this.debounces[r]=1,setTimeout(()=>{delete this.debounces[r]},this.debounceWindow)}s&&s(e)}watch(e,t){if(!this.socket)return this.log.debug(`socket not ready. requeueing watch on ${e}`),void setTimeout(()=>{this.watch(e,t)},1e3);this.socket.on(e,e=>this.debounce(e,t))}emit(e,t){if(!this.socket)return this.log.debug(`socket not ready. requeueing emit on ${e}`),void setTimeout(()=>{this.emit(e,t)},1e3);this.log.debug(`socket emit ${e} ${JSON.stringify(t)}`),this.socket.emit(e,t)}}class T{constructor(e){let r;if(r="string"===typeof e||"object"===typeof e&&e.constructor===String?JSON.parse(e):e||{},r.endpoint&&(r.url=r.endpoint,delete r.endpoint),r.log){if(!t.every([r.log.info,r.log.warn,r.log.error,r.log.debug,r.log.json],t.isFunction))throw new Error("expected log object to have error, debug, info, warn and json methods");this.log=r.log}else this.log={info:e=>{console.info(`[${(new Date).toISOString()}] INFO: ${e}`)},debug:e=>{console.debug(`[${(new Date).toISOString()}] DEBUG: ${e}`)},warn:e=>{console.warn(`[${(new Date).toISOString()}] WARN: ${e}`)},error:e=>{console.error(`[${(new Date).toISOString()}] ERROR: ${e}`)},json:e=>{console.log(JSON.stringify(e))}};this.stopped=!0,this.uploadState$=new s.BehaviorSubject(!1),this.analyseState$=new s.BehaviorSubject(!1),this.reportState$=new s.BehaviorSubject(!1),this.instanceTelemetry$=new s.BehaviorSubject(null),this.runningStates$=s.combineLatest(this.uploadState$,this.analyseState$,this.reportState$),this.states={upload:{filesCount:0,success:{files:0,bytes:0,reads:0},types:{},niceTypes:"",progress:{bytes:0,total:0}},download:{progress:{},success:{files:0,reads:0,bytes:0},fail:0,types:{},niceTypes:""},warnings:[]},this.liveStates$=new s.BehaviorSubject(this.states),this.config={options:t.defaults(r,w),instance:{id_workflow_instance:r.id_workflow_instance,inputQueueName:null,outputQueueName:null,outputQueueURL:null,discoverQueueCache:{},bucket:null,bucketFolder:null,remote_addr:null,chain:null,key_id:null}},this.config.instance.awssettings={region:this.config.options.region},this.REST=new P(t.merge({log:this.log},this.config.options)),this.graphQL=new b(t.merge({log:this.log},this.config.options)),this.timers={downloadCheckInterval:null,stateCheckInterval:null,fileCheckInterval:null,transferTimeouts:{},visibilityIntervals:{},summaryTelemetryInterval:null}}async socket(){return this.mySocket?this.mySocket:(this.mySocket=new E(this.REST,t.merge({log:this.log},this.config.options)),this.mySocket)}async realtimeFeedback(e,t){(await this.socket()).emit(e,t)}stopTimer(e){this.timers[e]&&(this.log.debug(`clearing ${e} interval`),clearInterval(this.timers[e]),this.timers[e]=null)}async stopAnalysis(){this.stopUpload(),this.stopped=!0;const{id_workflow_instance:e}=this.config.instance;if(e){try{this.config.options.graphQL?await this.graphQL.stopWorkflow({variables:{idWorkflowInstance:e}}):await this.REST.stopWorkflow(e),this.analyseState$.next(!1)}catch(t){return this.log.error(`Error stopping instance: ${String(t)}`),Promise.reject(t)}this.log.info(`workflow instance ${e} stopped`)}return Promise.resolve()}async stopUpload(){this.log.debug("stopping watchers"),["stateCheckInterval","fileCheckInterval"].forEach(e=>this.stopTimer(e)),this.uploadState$.next(!1)}async stopEverything(){this.stopAnalysis(),Object.keys(this.timers.transferTimeouts).forEach(e=>{this.log.debug(`clearing transferTimeout for ${e}`),clearTimeout(this.timers.transferTimeouts[e]),delete this.timers.transferTimeouts[e]}),Object.keys(this.timers.visibilityIntervals).forEach(e=>{this.log.debug(`clearing visibilityInterval for ${e}`),clearInterval(this.timers.visibilityIntervals[e]),delete this.timers.visibilityIntervals[e]}),this.downloadWorkerPool&&(this.log.debug("clearing downloadWorkerPool"),await Promise.all(Object.values(this.downloadWorkerPool)),this.downloadWorkerPool=null),["summaryTelemetryInterval","downloadCheckInterval"].forEach(e=>this.stopTimer(e))}reportProgress(){const{upload:e,download:t}=this.states;this.log.json({progress:{download:t,upload:e}})}storeState(e,t,s,r){const o=r||{};this.states[e]||(this.states[e]={}),this.states[e][t]||(this.states[e][t]={}),"incr"===s?Object.keys(o).forEach(s=>{this.states[e][t][s]=this.states[e][t][s]?this.states[e][t][s]+parseInt(o[s],10):parseInt(o[s],10)}):Object.keys(o).forEach(s=>{this.states[e][t][s]=this.states[e][t][s]?this.states[e][t][s]-parseInt(o[s],10):-parseInt(o[s],10)});try{this.states[e].success.niceReads=v(this.states[e].success.reads)}catch(n){this.states[e].success.niceReads=0}try{this.states[e].progress.niceSize=v(this.states[e].success.bytes+this.states[e].progress.bytes||0)}catch(n){this.states[e].progress.niceSize=0}try{this.states[e].success.niceSize=v(this.states[e].success.bytes)}catch(n){this.states[e].success.niceSize=0}this.states[e].niceTypes=Object.keys(this.states[e].types||{}).sort().map(t=>`${this.states[e].types[t]} ${t}`).join(", ");const i=Date.now();(!this.stateReportTime||i-this.stateReportTime>2e3)&&(this.stateReportTime=i,this.reportProgress()),this.liveStates$.next({...this.states})}uploadState(e,t,s){return this.storeState("upload",e,t,s)}downloadState(e,t,s){return this.storeState("download",e,t,s)}url(){return this.config.options.url}apikey(){return this.config.options.apikey}attr(e,t){if(!(e in this.config.options))throw new Error(`config object does not contain property ${e}`);return t?(this.config.options[e]=t,this):this.config.options[e]}stats(e){return this.states[e]}}T.version=S.version,T.Profile=class{constructor(e){this.allProfileData={},this.defaultEndpoint=process.env.METRICHOR||w.url,e&&(this.allProfileData=t.merge({profiles:{}},e)),this.allProfileData.endpoint&&(this.defaultEndpoint=this.allProfileData.endpoint)}profile(e){return e?t.merge({endpoint:this.defaultEndpoint},t.merge({profiles:{}},this.allProfileData).profiles[e]):{}}profiles(){return Object.keys(this.allProfileData.profiles||{})}},T.REST=P,T.utils=S,module.exports=T;
