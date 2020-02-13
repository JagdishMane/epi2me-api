/**
 * Copyright Metrichor Ltd. (An Oxford Nanopore Technologies Company) 2020
 */

import{merge as e,assign as t,filter as s,every as r,isFunction as o,defaults as i}from"lodash";import{BehaviorSubject as n}from"rxjs";import{scan as a}from"rxjs/operators";import l from"graphql-tag";import{InMemoryCache as c}from"apollo-cache-inmemory";import u from"apollo-client";import{ApolloLink as h,execute as p}from"apollo-link";import{createHttpLink as d}from"apollo-link-http";import g from"axios";import{buildAxiosFetch as f}from"@lifeomic/axios-fetch";import w from"crypto";import{httpsOverHttps as m,httpsOverHttp as y}from"tunnel";import k from"os";import $ from"socket.io-client";var I="https://epi2me.nanoporetech.com",b={local:!1,url:I,user_agent:"EPI2ME API",region:"eu-west-1",sessionGrace:5,uploadTimeout:1200,downloadTimeout:1200,fileCheckInterval:5,downloadCheckInterval:3,stateCheckInterval:60,inFlightDelay:600,waitTimeSeconds:20,waitTokenError:30,transferPoolSize:3,downloadMode:"data+telemetry",filetype:[".fastq",".fq",".fastq.gz",".fq.gz"],signing:!0};function S(e,t,s){return t in e?Object.defineProperty(e,t,{value:s,enumerable:!0,configurable:!0,writable:!0}):e[t]=s,e}const v="\npage\npages\nhasNext\nhasPrevious\ntotalCount\n",E="\nidWorkflowInstance\nstartDate\nworkflowImage{\n  workflow\n  {\n    rev\n    name\n  }\n}\n";const P=function(){const t=(e,t)=>{e.headers||(e.headers={});let s=t;if(s||(s={}),!s.apikey||!s.apisecret)return;e.headers["X-EPI2ME-APIKEY"]=s.apikey,e.headers["X-EPI2ME-SIGNATUREDATE"]=(new Date).toISOString();const r=[Object.keys(e.headers).sort().filter(e=>e.match(/^x-epi2me/i)).map(t=>`${t}:${e.headers[t]}`).join("\n"),e.body].join("\n"),o=w.createHmac("sha1",s.apisecret).update(r).digest("hex");e.headers["X-EPI2ME-SIGNATUREV0"]=o};return{version:"3.0.1438",setHeaders:(s,r)=>{const{log:o}=e({log:{debug:()=>{}}},r);let i=r;if(i||(i={}),s.headers=e({Accept:"application/json","Content-Type":"application/json","X-EPI2ME-CLIENT":i.user_agent||"api","X-EPI2ME-VERSION":i.agent_version||P.version},s.headers,i.headers),"signing"in i&&!i.signing||t(s,i),i.proxy){const e=i.proxy.match(/https?:\/\/((\S+):(\S+)@)?(\S+):(\d+)/),t=e[2],r=e[3],n={host:e[4],port:e[5]};t&&r&&(n.proxyAuth=`${t}:${r}`),i.proxy.match(/^https/)?(o.debug("using HTTPS over HTTPS proxy",JSON.stringify(n)),s.httpsAgent=m({proxy:n})):(o.debug("using HTTPS over HTTP proxy",JSON.stringify(n)),s.httpsAgent=y({proxy:n})),s.proxy=!1}}}}(),T=f(g),_=(e,t)=>{const{apikey:s,apisecret:r}=t.headers.keys;return delete t.headers.keys,P.setHeaders(t,{apikey:s,apisecret:r,signing:!0}),T(e,t)},j=new u({link:new h(e=>{const{apikey:t,apisecret:s,url:r}=e.getContext(),o=d({uri:`${r}/graphql`,fetch:_,headers:{keys:{apikey:t,apisecret:s}}});return p(o,e)}),cache:new c});g.defaults.validateStatus=e=>e<=504;const x=function(){const t=(e,t)=>{e.headers||(e.headers={});let s=t;if(s||(s={}),!s.apikey)return;if(e.headers["X-EPI2ME-ApiKey"]=s.apikey,!s.apisecret)return;e.headers["X-EPI2ME-SignatureDate"]=(new Date).toISOString(),e.url.match(/^https:/)&&(e.url=e.url.replace(/:443/,"")),e.url.match(/^http:/)&&(e.url=e.url.replace(/:80/,""));const r=[e.url,Object.keys(e.headers).sort().filter(e=>e.match(/^x-epi2me/i)).map(t=>`${t}:${e.headers[t]}`).join("\n")].join("\n"),o=w.createHmac("sha1",s.apisecret).update(r).digest("hex");e.headers["X-EPI2ME-SignatureV0"]=o},s=async e=>{const t=e?e.data:null;if(!t)return Promise.reject(new Error("unexpected non-json response"));if(e&&e.status>=400){let s=`Network error ${e.status}`;return t.error&&(s=t.error),504===e.status&&(s="Please check your network connection and try again."),Promise.reject(new Error(s))}return t.error?Promise.reject(new Error(t.error)):Promise.resolve(t)};return{version:"3.0.1438",headers:(s,r)=>{const{log:o}=e({log:{debug:()=>{}}},r);let i=r;if(i||(i={}),s.headers=e({Accept:"application/json","Content-Type":"application/json","X-EPI2ME-Client":i.user_agent||"api","X-EPI2ME-Version":i.agent_version||x.version},s.headers,i.headers),"signing"in i&&!i.signing||t(s,i),i.proxy){const e=i.proxy.match(/https?:\/\/((\S+):(\S+)@)?(\S+):(\d+)/),t=e[2],r=e[3],n={host:e[4],port:e[5]};t&&r&&(n.proxyAuth=`${t}:${r}`),i.proxy.match(/^https/)?(o.debug("using HTTPS over HTTPS proxy",JSON.stringify(n)),s.httpsAgent=m({proxy:n})):(o.debug("using HTTPS over HTTP proxy",JSON.stringify(n)),s.httpsAgent=y({proxy:n})),s.proxy=!1}},get:async(t,r)=>{const{log:o}=e({log:{debug:()=>{}}},r);let i,n=r.url,a=t;r.skip_url_mangle?i=a:(a=`/${a}`,n=n.replace(/\/+$/,""),a=a.replace(/\/+/g,"/"),i=n+a);const l={url:i,gzip:!0};let c;x.headers(l,r);try{o.debug(`GET ${l.url}`),c=await g.get(l.url,l)}catch(u){return Promise.reject(u)}return s(c,r)},post:async(t,r,o)=>{const{log:i}=e({log:{debug:()=>{}}},o);let n=o.url;n=n.replace(/\/+$/,"");const a={url:`${n}/${t.replace(/\/+/g,"/")}`,gzip:!0,data:r,headers:{}};if(o.legacy_form){const t=[],s=e({json:JSON.stringify(r)},r);Object.keys(s).sort().forEach(e=>{t.push(`${e}=${escape(s[e])}`)}),a.data=t.join("&"),a.headers["Content-Type"]="application/x-www-form-urlencoded"}x.headers(a,o);const{data:l}=a;let c;delete a.data;try{i.debug(`POST ${a.url}`),c=await g.post(a.url,l,a)}catch(u){return Promise.reject(u)}return o.handler?o.handler(c):s(c,o)},put:async(t,r,o,i)=>{const{log:n}=e({log:{debug:()=>{}}},i);let a=i.url;a=a.replace(/\/+$/,"");const l={url:`${a}/${t.replace(/\/+/g,"/")}/${r}`,gzip:!0,data:o,headers:{}};if(i.legacy_form){const t=[],s=e({json:JSON.stringify(o)},o);Object.keys(s).sort().forEach(e=>{t.push(`${e}=${escape(s[e])}`)}),l.data=t.join("&"),l.headers["Content-Type"]="application/x-www-form-urlencoded"}x.headers(l,i);const{data:c}=l;let u;delete l.data;try{n.debug(`PUT ${l.url}`),u=await g.put(l.url,c,l)}catch(h){return Promise.reject(h)}return s(u,i)}}}();class O{constructor(s){S(this,"createContext",t=>{const{apikey:s,apisecret:r,url:o}=this.options;return e({apikey:s,apisecret:r,url:o},t)}),S(this,"query",e=>({context:t={},variables:s={},options:r={}}={})=>{const o=this.createContext(t);let i;return i="string"===typeof e?l`
        ${e}
      `:"function"===typeof e?l`
        ${e(v)}
      `:e,this.client.query({query:i,variables:s,...r,context:o})}),S(this,"mutate",e=>({context:t={},variables:s={},options:r={}}={})=>{const o=this.createContext(t);let i;return i="string"===typeof e?l`
        ${e}
      `:e,this.client.mutate({mutation:i,variables:s,...r,context:o})}),S(this,"resetCache",()=>{this.client.resetStore()}),S(this,"workflows",this.query(l`
    query allWorkflows($page: Int, $pageSize: Int, $isActive: Int, $orderBy: String) {
      allWorkflows(page: $page, pageSize: $pageSize, isActive: $isActive, orderBy: $orderBy) {
        ${v}
        results {
          ${"\nidWorkflow\nname\ndescription\nsummary\nrev\n"}
        }
      }
    }
  `)),S(this,"workflowPages",async e=>{let t=e,s=await this.workflows({variables:{page:t}});const r=async e=>(t=e,s=await this.workflows({variables:{page:t}}),s);return{data:s,next:()=>r(t+1),previous:()=>r(t-1),first:()=>r(1),last:()=>r(0)}}),S(this,"workflow",this.query(l`
    query workflow($idWorkflow: ID!) {
      workflow(idWorkflow: $idWorkflow) {
        ${"\nidWorkflow\nname\ndescription\nsummary\nrev\n"}
      }
    }
   `)),S(this,"workflowInstances",this.query(l`
  query allWorkflowInstances($page: Int, $pageSize: Int, $shared: Boolean, $idUser: ID, $orderBy: String) {
    allWorkflowInstances(page: $page, pageSize: $pageSize, shared: $shared, idUser: $idUser, orderBy: $orderBy) {
      ${v}
      results {
        ${E}
      }
    }
  }
   `)),S(this,"workflowInstance",this.query(l`
      query workflowInstance($idWorkflowInstance: ID!) {
        workflowInstance(idWorkflowInstance: $idWorkflowInstance) {
          ${E}
        }
      }
   `)),S(this,"startWorkflow",this.mutate(l`
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
  `)),S(this,"user",this.query(l`
    query user {
      me {
        username
        realname
        useraccountSet {
          idUserAccount
        }
      }
    }
  `)),S(this,"register",this.mutate(l`
    mutation registerToken($code: String!, $description: String) {
      registerToken(code: $code, description: $description) {
        apikey
        apisecret
        description
      }
    }
  `)),this.options=t({agent_version:x.version,local:!1,url:I,user_agent:"EPI2ME API",signing:!0},s),this.options.url=this.options.url.replace(/:\/\//,"://graphql."),this.log=this.options.log,this.client=j}}const W=(e,t)=>{const s=["","K","M","G","T","P","E","Z"];let r=t||0,o=e||0;return o>=1e3?(o/=1e3,r+=1,r>=s.length?"???":W(o,r)):0===r?`${o}${s[r]}`:`${o.toFixed(1)}${s[r]}`};class C{constructor(e){this.options=t({agent_version:x.version,local:!1,url:I,user_agent:"EPI2ME API",signing:!0},e),this.log=this.options.log}async list(e){const t=e.match(/^[a-z_]+/i)[0];return x.get(e,this.options).then(e=>e[`${t}s`])}async read(e,t){return x.get(`${e}/${t}`,this.options)}async user(){return this.options.local?{accounts:[{id_user_account:"none",number:"NONE",name:"None"}]}:x.get("user",this.options)}async status(){return x.get("status",this.options)}async jwt(){return x.post("authenticate",{},e({handler:e=>e.headers["x-epi2me-jwt"]?Promise.resolve(e.headers["x-epi2me-jwt"]):Promise.reject(new Error("failed to fetch JWT"))},this.options))}async instanceToken(s,r){return x.post("token",e(r,{id_workflow_instance:s}),t({},this.options,{legacy_form:!0}))}async installToken(e){return x.post("token/install",{id_workflow:e},t({},this.options,{legacy_form:!0}))}async attributes(){return this.list("attribute")}async workflows(){return this.list("workflow")}async amiImages(){if(this.options.local)throw new Error("amiImages unsupported in local mode");return this.list("ami_image")}async amiImage(e,t){let s,r,o;if(e&&t instanceof Object?(s=e,r=t,o="update"):e instanceof Object&&!t?(r=e,o="create"):(o="read",s=e),this.options.local)throw new Error("ami_image unsupported in local mode");if("update"===o)return x.put("ami_image",s,r,this.options);if("create"===o)return x.post("ami_image",r,this.options);if(!s)throw new Error("no id_ami_image specified");return this.read("ami_image",s)}async workflow(t,r,o){let i,n,a,l;if(t&&r&&o instanceof Function?(i=t,n=r,a=o,l="update"):t&&r instanceof Object&&!(r instanceof Function)?(i=t,n=r,l="update"):t instanceof Object&&r instanceof Function?(n=t,a=r,l="create"):t instanceof Object&&!r?(n=t,l="create"):(l="read",i=t,a=r instanceof Function?r:null),"update"===l)try{const e=await x.put("workflow",i,n,this.options);return a?a(null,e):Promise.resolve(e)}catch(p){return a?a(p):Promise.reject(p)}if("create"===l)try{const e=await x.post("workflow",n,this.options);return a?a(null,e):Promise.resolve(e)}catch(p){return a?a(p):Promise.reject(p)}if(!i){const e=new Error("no workflow id specified");return a?a(e):Promise.reject(e)}const c={};try{const t=await this.read("workflow",i);if(t.error)throw new Error(t.error);e(c,t)}catch(p){return this.log.error(`${i}: error fetching workflow ${String(p)}`),a?a(p):Promise.reject(p)}e(c,{params:{}});try{const t=await x.get(`workflow/config/${i}`,this.options);if(t.error)throw new Error(t.error);e(c,t)}catch(p){return this.log.error(`${i}: error fetching workflow config ${String(p)}`),a?a(p):Promise.reject(p)}const u=s(c.params,{widget:"ajax_dropdown"}),h=[...u.map((e,t)=>{const s=u[t];return new Promise((e,t)=>{const r=s.values.source.replace("{{EPI2ME_HOST}}","").replace(/&?apikey=\{\{EPI2ME_API_KEY\}\}/,"");x.get(r,this.options).then(t=>{const r=t[s.values.data_root];return r&&(s.values=r.map(e=>({label:e[s.values.items.label_key],value:e[s.values.items.value_key]}))),e()}).catch(e=>(this.log.error(`failed to fetch ${r}`),t(e)))})})];try{return await Promise.all(h),a?a(null,c):Promise.resolve(c)}catch(p){return this.log.error(`${i}: error fetching config and parameters ${String(p)}`),a?a(p):Promise.reject(p)}}async startWorkflow(e){return x.post("workflow_instance",e,t({},this.options,{legacy_form:!0}))}async stopWorkflow(e){return x.put("workflow_instance/stop",e,null,t({},this.options,{legacy_form:!0}))}async workflowInstances(e){return e&&e.run_id?x.get(`workflow_instance/wi?show=all&columns[0][name]=run_id;columns[0][searchable]=true;columns[0][search][regex]=true;columns[0][search][value]=${e.run_id};`,this.options).then(e=>e.data.map(e=>({id_workflow_instance:e.id_ins,id_workflow:e.id_flo,run_id:e.run_id,description:e.desc,rev:e.rev}))):this.list("workflow_instance")}async workflowInstance(e){return this.read("workflow_instance",e)}async workflowConfig(e){return x.get(`workflow/config/${e}`,this.options)}async register(e,s){return x.put("reg",e,{description:s||`${k.userInfo().username}@${k.hostname()}`},t({},this.options,{signing:!1}))}async datasets(e){let t=e;return t||(t={}),t.show||(t.show="mine"),this.list(`dataset?show=${t.show}`)}async dataset(e){return this.options.local?this.datasets().then(t=>t.find(t=>t.id_dataset===e)):this.read("dataset",e)}async fetchContent(e){const s=t({},this.options,{skip_url_mangle:!0,headers:{"Content-Type":""}});return x.get(e,s)}}class A{constructor(t,s){this.debounces={},this.debounceWindow=e({debounceWindow:2e3},s).debounceWindow,this.log=e({log:{debug:()=>{}}},s).log,t.jwt().then(e=>{this.socket=$(s.url,{transportOptions:{polling:{extraHeaders:{Cookie:`x-epi2me-jwt=${e}`}}}}),this.socket.on("connect",()=>{this.log.debug("socket ready")})})}debounce(t,s){const r=e(t)._uuid;if(r){if(this.debounces[r])return;this.debounces[r]=1,setTimeout(()=>{delete this.debounces[r]},this.debounceWindow)}s&&s(t)}watch(e,t){if(!this.socket)return this.log.debug(`socket not ready. requeueing watch on ${e}`),void setTimeout(()=>{this.watch(e,t)},1e3);this.socket.on(e,e=>this.debounce(e,t))}emit(e,t){if(!this.socket)return this.log.debug(`socket not ready. requeueing emit on ${e}`),void setTimeout(()=>{this.emit(e,t)},1e3);this.log.debug(`socket emit ${e} ${JSON.stringify(t)}`),this.socket.emit(e,t)}}class q{constructor(t){let s;if(s="string"===typeof t||"object"===typeof t&&t.constructor===String?JSON.parse(t):t||{},s.endpoint&&(s.url=s.endpoint,delete s.endpoint),s.log){if(!r([s.log.info,s.log.warn,s.log.error,s.log.debug,s.log.json],o))throw new Error("expected log object to have error, debug, info, warn and json methods");this.log=s.log}else this.log={info:e=>{console.info(`[${(new Date).toISOString()}] INFO: ${e}`)},debug:e=>{console.debug(`[${(new Date).toISOString()}] DEBUG: ${e}`)},warn:e=>{console.warn(`[${(new Date).toISOString()}] WARN: ${e}`)},error:e=>{console.error(`[${(new Date).toISOString()}] ERROR: ${e}`)},json:e=>{console.log(JSON.stringify(e))}};this.stopped=!0,this.runningStatesSubject=new n({uploading:!1,analysing:!1,telemetry:!1}),this.runningStates$=this.runningStatesSubject.pipe(a((e,t)=>({...e,...t}))),this.states={upload:{filesCount:0,success:{files:0,bytes:0,reads:0},types:{},niceTypes:"",progress:{bytes:0,total:0}},download:{progress:{},success:{files:0,reads:0,bytes:0},fail:0,types:{},niceTypes:""},warnings:[]},this.liveStates$=new n(this.states),this.config={options:i(s,b),instance:{id_workflow_instance:s.id_workflow_instance,inputQueueName:null,outputQueueName:null,outputQueueURL:null,discoverQueueCache:{},bucket:null,bucketFolder:null,remote_addr:null,chain:null,key_id:null}},this.config.instance.awssettings={region:this.config.options.region},this.REST=new C(e({log:this.log},this.config.options)),this.graphQL=new O(e({log:this.log},this.config.options)),this.timers={downloadCheckInterval:null,stateCheckInterval:null,fileCheckInterval:null,transferTimeouts:{},visibilityIntervals:{},summaryTelemetryInterval:null}}async socket(){return this.mySocket?this.mySocket:(this.mySocket=new A(this.REST,e({log:this.log},this.config.options)),this.mySocket)}async realtimeFeedback(e,t){(await this.socket()).emit(e,t)}stopTimer(e){this.timers[e]&&(this.log.debug(`clearing ${e} interval`),clearInterval(this.timers[e]),this.timers[e]=null)}async stopAnalysis(){this.stopUpload();const{id_workflow_instance:e}=this.config.instance;if(e){try{await this.REST.stopWorkflow(e),this.runningStates$.next({analysing:!1})}catch(t){return this.log.error(`Error stopping instance: ${String(t)}`),Promise.reject(t)}this.log.info(`workflow instance ${e} stopped`)}return Promise.resolve()}async stopUpload(){return this.stopped=!0,this.log.debug("stopping watchers"),["downloadCheckInterval","stateCheckInterval","fileCheckInterval"].forEach(e=>this.stopTimer(e)),this.runningStates$.next({uploading:!1}),Object.keys(this.timers.transferTimeouts).forEach(e=>{this.log.debug(`clearing transferTimeout for ${e}`),clearTimeout(this.timers.transferTimeouts[e]),delete this.timers.transferTimeouts[e]}),Object.keys(this.timers.visibilityIntervals).forEach(e=>{this.log.debug(`clearing visibilityInterval for ${e}`),clearInterval(this.timers.visibilityIntervals[e]),delete this.timers.visibilityIntervals[e]}),this.downloadWorkerPool&&(this.log.debug("clearing downloadWorkerPool"),await Promise.all(Object.values(this.downloadWorkerPool)),this.downloadWorkerPool=null),Promise.resolve()}async stopEverything(){this.stopAnalysis(),this.stopTimer("summaryTelemetryInterval")}reportProgress(){const{upload:e,download:t}=this.states;this.log.json({progress:{download:t,upload:e}})}storeState(e,t,s,r){const o=r||{};this.states[e]||(this.states[e]={}),this.states[e][t]||(this.states[e][t]={}),"incr"===s?Object.keys(o).forEach(s=>{this.states[e][t][s]=this.states[e][t][s]?this.states[e][t][s]+parseInt(o[s],10):parseInt(o[s],10)}):Object.keys(o).forEach(s=>{this.states[e][t][s]=this.states[e][t][s]?this.states[e][t][s]-parseInt(o[s],10):-parseInt(o[s],10)});try{this.states[e].success.niceReads=W(this.states[e].success.reads)}catch(n){this.states[e].success.niceReads=0}try{this.states[e].progress.niceSize=W(this.states[e].success.bytes+this.states[e].progress.bytes||0)}catch(n){this.states[e].progress.niceSize=0}try{this.states[e].success.niceSize=W(this.states[e].success.bytes)}catch(n){this.states[e].success.niceSize=0}this.states[e].niceTypes=Object.keys(this.states[e].types||{}).sort().map(t=>`${this.states[e].types[t]} ${t}`).join(", ");const i=Date.now();(!this.stateReportTime||i-this.stateReportTime>2e3)&&(this.stateReportTime=i,this.reportProgress()),this.liveStates$.next({...this.states})}uploadState(e,t,s){return this.storeState("upload",e,t,s)}downloadState(e,t,s){return this.storeState("download",e,t,s)}url(){return this.config.options.url}apikey(){return this.config.options.apikey}attr(e,t){if(!(e in this.config.options))throw new Error(`config object does not contain property ${e}`);return t?(this.config.options[e]=t,this):this.config.options[e]}stats(e){return this.states[e]}}q.version=x.version,q.Profile=class{constructor(t,s){this.allProfileData={},this.defaultEndpoint=process.env.METRICHOR||b.endpoint||b.url,this.raiseExceptions=s,t&&(this.allProfileData=e(t,{profiles:{}})),this.allProfileData.endpoint&&(this.defaultEndpoint=this.allProfileData.endpoint)}profile(t){return t?e({endpoint:this.defaultEndpoint},this.allProfileData.profiles[t]):{}}profiles(){return Object.keys(this.allProfileData.profiles||{})}},q.REST=C,q.utils=x;export default q;
