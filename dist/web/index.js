/**
 * Copyright Metrichor Ltd. (An Oxford Nanopore Technologies Company) 2020
 */

"use strict";function _interopDefault(e){return e&&"object"===typeof e&&"default"in e?e.default:e}var lodash=require("lodash"),axios=_interopDefault(require("axios")),crypto=_interopDefault(require("crypto")),tunnel=require("tunnel"),os=_interopDefault(require("os")),gql=_interopDefault(require("graphql-tag")),apolloClient=require("apollo-client"),apolloCacheInmemory=require("apollo-cache-inmemory"),apolloLink=require("apollo-link"),apolloLinkHttp=require("apollo-link-http"),axiosFetch=require("@lifeomic/axios-fetch"),io=_interopDefault(require("socket.io-client")),version="3.0.1611";axios.defaults.validateStatus=e=>e<=504;const utils=function(){const e=(e,t)=>{e.headers||(e.headers={});let s=t;if(s||(s={}),!s.apikey)return;if(e.headers["X-EPI2ME-ApiKey"]=s.apikey,!s.apisecret)return;e.headers["X-EPI2ME-SignatureDate"]=(new Date).toISOString(),e.url.match(/^https:/)&&(e.url=e.url.replace(/:443/,"")),e.url.match(/^http:/)&&(e.url=e.url.replace(/:80/,""));const o=[e.url,Object.keys(e.headers).sort().filter(e=>e.match(/^x-epi2me/i)).map(t=>`${t}:${e.headers[t]}`).join("\n")].join("\n"),r=crypto.createHmac("sha1",s.apisecret).update(o).digest("hex");e.headers["X-EPI2ME-SignatureV0"]=r},t=async e=>{const t=e?e.data:null;if(!t)return Promise.reject(new Error("unexpected non-json response"));if(e&&e.status>=400){let s=`Network error ${e.status}`;return t.error&&(s=t.error),504===e.status&&(s="Please check your network connection and try again."),Promise.reject(new Error(s))}return t.error?Promise.reject(new Error(t.error)):Promise.resolve(t)};return{version:version,headers:(t,s)=>{const{log:o}=lodash.merge({log:{debug:()=>{}}},s);let r=s;if(r||(r={}),t.headers=lodash.merge({Accept:"application/json","Content-Type":"application/json","X-EPI2ME-Client":r.user_agent||"api","X-EPI2ME-Version":r.agent_version||utils.version},t.headers,r.headers),"signing"in r&&!r.signing||e(t,r),r.proxy){const e=r.proxy.match(/https?:\/\/((\S+):(\S+)@)?(\S+):(\d+)/),s=e[2],n=e[3],i={host:e[4],port:e[5]};s&&n&&(i.proxyAuth=`${s}:${n}`),r.proxy.match(/^https/)?(o.debug("using HTTPS over HTTPS proxy",JSON.stringify(i)),t.httpsAgent=tunnel.httpsOverHttps({proxy:i})):(o.debug("using HTTPS over HTTP proxy",JSON.stringify(i)),t.httpsAgent=tunnel.httpsOverHttp({proxy:i})),t.proxy=!1}},get:async(e,s)=>{const{log:o}=lodash.merge({log:{debug:()=>{}}},s);let r,n=s.url,i=e;s.skip_url_mangle?r=i:(i=`/${i}`,r=(n=n.replace(/\/+$/,""))+(i=i.replace(/\/+/g,"/")));const a={url:r,gzip:!0};let l;utils.headers(a,s);try{o.debug(`GET ${a.url}`),l=await axios.get(a.url,a)}catch(c){return Promise.reject(c)}return t(l,s)},post:async(e,s,o)=>{const{log:r}=lodash.merge({log:{debug:()=>{}}},o);let n=o.url;const i={url:`${n=n.replace(/\/+$/,"")}/${e.replace(/\/+/g,"/")}`,gzip:!0,data:s,headers:{}};if(o.legacy_form){const e=[],t=lodash.merge({json:JSON.stringify(s)},s);Object.keys(t).sort().forEach(s=>{e.push(`${s}=${escape(t[s])}`)}),i.data=e.join("&"),i.headers["Content-Type"]="application/x-www-form-urlencoded"}utils.headers(i,o);const{data:a}=i;let l;delete i.data;try{r.debug(`POST ${i.url}`),l=await axios.post(i.url,a,i)}catch(c){return Promise.reject(c)}return o.handler?o.handler(l):t(l,o)},put:async(e,s,o,r)=>{const{log:n}=lodash.merge({log:{debug:()=>{}}},r);let i=r.url;const a={url:`${i=i.replace(/\/+$/,"")}/${e.replace(/\/+/g,"/")}/${s}`,gzip:!0,data:o,headers:{}};if(r.legacy_form){const e=[],t=lodash.merge({json:JSON.stringify(o)},o);Object.keys(t).sort().forEach(s=>{e.push(`${s}=${escape(t[s])}`)}),a.data=e.join("&"),a.headers["Content-Type"]="application/x-www-form-urlencoded"}utils.headers(a,r);const{data:l}=a;let c;delete a.data;try{n.debug(`PUT ${a.url}`),c=await axios.put(a.url,l,a)}catch(u){return Promise.reject(u)}return t(c,r)}}}(),niceSize=(e,t)=>{const s=["","K","M","G","T","P","E","Z"];let o=t||0,r=e||0;return r>=1e3?(r/=1e3,(o+=1)>=s.length?"???":niceSize(r,o)):0===o?`${r}${s[o]}`:`${r.toFixed(1)}${s[o]}`};var local=!1,url="https://epi2me.nanoporetech.com",user_agent="EPI2ME API",region="eu-west-1",sessionGrace=5,uploadTimeout=1200,downloadTimeout=1200,fileCheckInterval=5,downloadCheckInterval=3,stateCheckInterval=60,inFlightDelay=600,waitTimeSeconds=20,waitTokenError=30,transferPoolSize=3,downloadMode="data+telemetry",filetype=[".fastq",".fq",".fastq.gz",".fq.gz"],signing=!0,DEFAULTS={local:local,url:url,user_agent:user_agent,region:region,sessionGrace:sessionGrace,uploadTimeout:uploadTimeout,downloadTimeout:downloadTimeout,fileCheckInterval:fileCheckInterval,downloadCheckInterval:downloadCheckInterval,stateCheckInterval:stateCheckInterval,inFlightDelay:inFlightDelay,waitTimeSeconds:waitTimeSeconds,waitTokenError:waitTokenError,transferPoolSize:transferPoolSize,downloadMode:downloadMode,filetype:filetype,signing:signing};class REST{constructor(e){this.options=lodash.assign({agent_version:utils.version,local:local,url:url,user_agent:user_agent,signing:signing},e),this.log=this.options.log}async list(e){try{const t=await utils.get(e,this.options),s=e.match(/^[a-z_]+/i)[0];return Promise.resolve(t[`${s}s`])}catch(t){return this.log.error(`list error ${String(t)}`),Promise.reject(t)}}async read(e,t){try{const s=await utils.get(`${e}/${t}`,this.options);return Promise.resolve(s)}catch(s){return this.log.error("read",s),Promise.reject(s)}}async user(){return this.options.local?{accounts:[{id_user_account:"none",number:"NONE",name:"None"}]}:utils.get("user",this.options)}async status(){return utils.get("status",this.options)}async jwt(){try{const e=e=>e.headers["x-epi2me-jwt"]?Promise.resolve(e.headers["x-epi2me-jwt"]):Promise.reject(new Error("failed to fetch JWT")),t=await utils.post("authenticate",{},lodash.merge({handler:e},this.options));return Promise.resolve(t)}catch(e){return Promise.reject(e)}}async instanceToken(e,t){return utils.post("token",lodash.merge(t,{id_workflow_instance:e}),lodash.assign({},this.options,{legacy_form:!0}))}async installToken(e){return utils.post("token/install",{id_workflow:e},lodash.assign({},this.options,{legacy_form:!0}))}async attributes(){return this.list("attribute")}async workflows(){return this.list("workflow")}async amiImages(){if(this.options.local)throw new Error("amiImages unsupported in local mode");return this.list("ami_image")}async amiImage(e,t,s){let o,r,n,i;if(e&&t&&s instanceof Function?(o=e,r=t,n=s,i="update"):e&&t instanceof Object&&!(t instanceof Function)?(o=e,r=t,i="update"):e instanceof Object&&t instanceof Function?(r=e,n=t,i="create"):e instanceof Object&&!t?(r=e,i="create"):(i="read",o=e,n=t instanceof Function?t:null),this.options.local){const e=new Error("ami_image unsupported in local mode");return n?n(e):Promise.reject(e)}if("update"===i)try{const e=await utils.put("ami_image",o,r,this.options);return n?n(null,e):Promise.resolve(e)}catch(a){return n?n(a):Promise.reject(a)}if("create"===i)try{const e=await utils.post("ami_image",r,this.options);return n?n(null,e):Promise.resolve(e)}catch(a){return n?n(a):Promise.reject(a)}if(!o){const e=new Error("no id_ami_image specified");return n?n(e):Promise.reject(e)}try{const e=await this.read("ami_image",o);return n?n(null,e):Promise.resolve(e)}catch(a){return n?n(a):Promise.reject(a)}}async workflow(e,t,s){let o,r,n,i;if(e&&t&&s instanceof Function?(o=e,r=t,n=s,i="update"):e&&t instanceof Object&&!(t instanceof Function)?(o=e,r=t,i="update"):e instanceof Object&&t instanceof Function?(r=e,n=t,i="create"):e instanceof Object&&!t?(r=e,i="create"):(i="read",o=e,n=t instanceof Function?t:null),"update"===i)try{const e=await utils.put("workflow",o,r,this.options);return n?n(null,e):Promise.resolve(e)}catch(u){return n?n(u):Promise.reject(u)}if("create"===i)try{const e=await utils.post("workflow",r,this.options);return n?n(null,e):Promise.resolve(e)}catch(u){return n?n(u):Promise.reject(u)}if(!o){const e=new Error("no workflow id specified");return n?n(e):Promise.reject(e)}const a={};try{const e=await this.read("workflow",o);if(e.error)throw new Error(e.error);lodash.merge(a,e)}catch(u){return this.log.error(`${o}: error fetching workflow ${String(u)}`),n?n(u):Promise.reject(u)}lodash.merge(a,{params:{}});try{const e=await utils.get(`workflow/config/${o}`,this.options);if(e.error)throw new Error(e.error);lodash.merge(a,e)}catch(u){return this.log.error(`${o}: error fetching workflow config ${String(u)}`),n?n(u):Promise.reject(u)}const l=lodash.filter(a.params,{widget:"ajax_dropdown"}),c=[...l.map((e,t)=>{const s=l[t];return new Promise((e,t)=>{const o=s.values.source.replace("{{EPI2ME_HOST}}","").replace(/&?apikey=\{\{EPI2ME_API_KEY\}\}/,"");utils.get(o,this.options).then(t=>{const o=t[s.values.data_root];return o&&(s.values=o.map(e=>({label:e[s.values.items.label_key],value:e[s.values.items.value_key]}))),e()}).catch(e=>(this.log.error(`failed to fetch ${o}`),t(e)))})})];try{return await Promise.all(c),n?n(null,a):Promise.resolve(a)}catch(u){return this.log.error(`${o}: error fetching config and parameters ${String(u)}`),n?n(u):Promise.reject(u)}}async startWorkflow(e){return utils.post("workflow_instance",e,lodash.assign({},this.options,{legacy_form:!0}))}async stopWorkflow(e){return utils.put("workflow_instance/stop",e,null,lodash.assign({},this.options,{legacy_form:!0}))}async workflowInstances(e){if(e&&e.run_id)try{const t=(await utils.get(`workflow_instance/wi?show=all&columns[0][name]=run_id;columns[0][searchable]=true;columns[0][search][regex]=true;columns[0][search][value]=${e.run_id};`,this.options)).data.map(e=>({id_workflow_instance:e.id_ins,id_workflow:e.id_flo,run_id:e.run_id,description:e.desc,rev:e.rev}));return Promise.resolve(t)}catch(t){return Promise.reject(t)}return this.list("workflow_instance")}async workflowInstance(e){return this.read("workflow_instance",e)}async workflowConfig(e){return utils.get(`workflow/config/${e}`,this.options)}async register(e,t){return utils.put("reg",e,{description:t||`${os.userInfo().username}@${os.hostname()}`},lodash.assign({},this.options,{signing:!1}))}async datasets(e){let t=e;return t||(t={}),t.show||(t.show="mine"),this.list(`dataset?show=${t.show}`)}async dataset(e){return this.options.local?this.datasets().then(t=>t.find(t=>t.id_dataset===e)):this.read("dataset",e)}async fetchContent(e,t){const s=lodash.assign({},this.options,{skip_url_mangle:!0,headers:{"Content-Type":""}});try{const o=await utils.get(e,s);return t?t(null,o):Promise.resolve(o)}catch(o){return t?t(o):Promise.reject(o)}}}const gqlUtils=function(){const e=(e,t)=>{e.headers||(e.headers={});let s=t;if(s||(s={}),!s.apikey||!s.apisecret)return;e.headers["X-EPI2ME-APIKEY"]=s.apikey,e.headers["X-EPI2ME-SIGNATUREDATE"]=(new Date).toISOString();const o=[Object.keys(e.headers).sort().filter(e=>e.match(/^x-epi2me/i)).map(t=>`${t}:${e.headers[t]}`).join("\n"),e.body].join("\n"),r=crypto.createHmac("sha1",s.apisecret).update(o).digest("hex");e.headers["X-EPI2ME-SIGNATUREV0"]=r};return{version:version,setHeaders:(t,s)=>{const{log:o}=lodash.merge({log:{debug:()=>{}}},s);let r=s;if(r||(r={}),t.headers=lodash.merge({Accept:"application/json","Content-Type":"application/json","X-EPI2ME-CLIENT":r.user_agent||"api","X-EPI2ME-VERSION":r.agent_version||gqlUtils.version},t.headers,r.headers),"signing"in r&&!r.signing||e(t,r),r.proxy){const e=r.proxy.match(/https?:\/\/((\S+):(\S+)@)?(\S+):(\d+)/),s=e[2],n=e[3],i={host:e[4],port:e[5]};s&&n&&(i.proxyAuth=`${s}:${n}`),r.proxy.match(/^https/)?(o.debug("using HTTPS over HTTPS proxy",JSON.stringify(i)),t.httpsAgent=tunnel.httpsOverHttps({proxy:i})):(o.debug("using HTTPS over HTTP proxy",JSON.stringify(i)),t.httpsAgent=tunnel.httpsOverHttp({proxy:i})),t.proxy=!1}}}}(),fetcher=axiosFetch.buildAxiosFetch(axios),customFetcher=(e,t)=>{const{apikey:s,apisecret:o}=t.headers.keys;return delete t.headers.keys,gqlUtils.setHeaders(t,{apikey:s,apisecret:o,signing:!0}),fetcher(e,t)},link=new apolloLink.ApolloLink(e=>{const{apikey:t,apisecret:s,url:o}=e.getContext(),r=apolloLinkHttp.createHttpLink({uri:`${o}/graphql`,fetch:customFetcher,headers:{keys:{apikey:t,apisecret:s}}});return apolloLink.execute(r,e)}),cache=new apolloCacheInmemory.InMemoryCache,client=new apolloClient.ApolloClient({link:link,cache:cache}),PageFragment="\npage\npages\nhasNext\nhasPrevious\ntotalCount\n",WorkflowFragment="\nidWorkflow\nname\ndescription\nsummary\n",WorkflowInstanceFragment="\nidWorkflowInstance\noutputqueue\nstartDate\n";class GraphQL{constructor(e){this.options=lodash.assign({agent_version:utils.version,local:local,url:url,user_agent:user_agent,signing:signing},e),this.options.url=this.options.url.replace(/:\/\//,"://graphql."),this.log=this.options.log,this.client=client}createContext(e){const{apikey:t,apisecret:s,url:o}=this.options;return lodash.merge({apikey:t,apisecret:s,url:o},e)}workflows(e={},t={}){const s=gql`
      query allWorkflows($page: Int) {
        allWorkflows(page: $page) {
          ${PageFragment}
          results {
            ${WorkflowFragment}
          }
        }
      }
    `,o=this.createContext(e);return this.client.query({query:s,variables:t,context:o})}workflow(e){const t=gql`
      query workflow($idWorkflow: ID!) {
        workflow(idWorkflow: $idWorkflow) {
          ${WorkflowFragment}
        }
      }
    `;return this.client.query({query:t,variables:e})}workflowInstances(e){const t=gql`
      query allWorkflowInstances($page: Int) {
        allWorkflowInstances(page: $page) {
          ${PageFragment}
          results {
            ${WorkflowInstanceFragment}
          }
        }
      }
    `;return this.client.query({query:t,variables:e})}workflowInstance(e){const t=gql`
      query workflowInstance($idWorkflowInstance: ID!) {
        workflowInstance(idWorkflowInstance: $idWorkflowInstance) {
          ${WorkflowInstanceFragment}
        }
      }
    `;return this.client.query({query:t,variables:e})}startWorkflow(e){const t=gql`
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
    `;return this.client.mutate({mutation:t,variables:e})}async register(e,t,s){let o,r;t&&t instanceof Function?r=t:(o=t,r=s);try{const t=await utils.post("apiaccess",{code:e,description:o||`${os.userInfo().username}@${os.hostname()}`},this.options);return r?r(null,t):Promise.resolve(t)}catch(n){return r?r(n):Promise.reject(n)}}}class Socket{constructor(e,t){this.debounces={},this.debounceWindow=lodash.merge({debounceWindow:2e3},t).debounceWindow,this.log=lodash.merge({log:{debug:()=>{}}},t).log,e.jwt().then(e=>{this.socket=io(t.url,{transportOptions:{polling:{extraHeaders:{Cookie:`x-epi2me-jwt=${e}`}}}}),this.socket.on("connect",()=>{this.log.debug("socket ready")})})}debounce(e,t){const s=lodash.merge(e)._uuid;if(s){if(this.debounces[s])return;this.debounces[s]=1,setTimeout(()=>{delete this.debounces[s]},this.debounceWindow)}t&&t(e)}watch(e,t){if(!this.socket)return this.log.debug(`socket not ready. requeueing watch on ${e}`),void setTimeout(()=>{this.watch(e,t)},1e3);this.socket.on(e,e=>this.debounce(e,t))}emit(e,t){if(!this.socket)return this.log.debug(`socket not ready. requeueing emit on ${e}`),void setTimeout(()=>{this.emit(e,t)},1e3);this.log.debug(`socket emit ${e} ${JSON.stringify(t)}`),this.socket.emit(e,t)}}class EPI2ME{constructor(e){let t;if((t="string"===typeof e||"object"===typeof e&&e.constructor===String?JSON.parse(e):e||{}).log){if(!lodash.every([t.log.info,t.log.warn,t.log.error,t.log.debug,t.log.json],lodash.isFunction))throw new Error("expected log object to have error, debug, info, warn and json methods");this.log=t.log}else this.log={info:e=>{console.info(`[${(new Date).toISOString()}] INFO: ${e}`)},debug:e=>{console.debug(`[${(new Date).toISOString()}] DEBUG: ${e}`)},warn:e=>{console.warn(`[${(new Date).toISOString()}] WARN: ${e}`)},error:e=>{console.error(`[${(new Date).toISOString()}] ERROR: ${e}`)},json:e=>{console.log(JSON.stringify(e))}};this.stopped=!0,this.states={upload:{filesCount:0,success:{files:0,bytes:0,reads:0},types:{},niceTypes:"",progress:{bytes:0,total:0}},download:{progress:{},success:{files:0,reads:0,bytes:0},fail:0,types:{},niceTypes:""},warnings:[]},this.config={options:lodash.defaults(t,DEFAULTS),instance:{id_workflow_instance:t.id_workflow_instance,inputQueueName:null,outputQueueName:null,outputQueueURL:null,discoverQueueCache:{},bucket:null,bucketFolder:null,remote_addr:null,chain:null,key_id:null}},this.config.instance.awssettings={region:this.config.options.region},this.REST=new REST(lodash.merge({log:this.log},this.config.options)),this.graphQL=new GraphQL(lodash.merge({log:this.log},this.config.options)),this.timers={downloadCheckInterval:null,stateCheckInterval:null,fileCheckInterval:null,transferTimeouts:{},visibilityIntervals:{},summaryTelemetryInterval:null}}async socket(){return this.mySocket?this.mySocket:(this.mySocket=new Socket(this.REST,lodash.merge({log:this.log},this.config.options)),this.mySocket)}async realtimeFeedback(e,t){(await this.socket()).emit(e,t)}async stopEverything(){this.stopped=!0,this.log.debug("stopping watchers"),["downloadCheckInterval","stateCheckInterval","fileCheckInterval","summaryTelemetryInterval"].forEach(e=>{this.timers[e]&&(this.log.debug(`clearing ${e} interval`),clearInterval(this.timers[e]),this.timers[e]=null)}),Object.keys(this.timers.transferTimeouts).forEach(e=>{this.log.debug(`clearing transferTimeout for ${e}`),clearTimeout(this.timers.transferTimeouts[e]),delete this.timers.transferTimeouts[e]}),Object.keys(this.timers.visibilityIntervals).forEach(e=>{this.log.debug(`clearing visibilityInterval for ${e}`),clearInterval(this.timers.visibilityIntervals[e]),delete this.timers.visibilityIntervals[e]}),this.downloadWorkerPool&&(this.log.debug("clearing downloadWorkerPool"),await Promise.all(Object.values(this.downloadWorkerPool)),this.downloadWorkerPool=null);const{id_workflow_instance:e}=this.config.instance;if(e){try{await this.REST.stopWorkflow(e)}catch(t){return this.log.error(`Error stopping instance: ${String(t)}`),Promise.reject(t)}this.log.info(`workflow instance ${e} stopped`)}return Promise.resolve()}reportProgress(){const{upload:e,download:t}=this.states;this.log.json({progress:{download:t,upload:e}})}storeState(e,t,s,o){const r=o||{};this.states[e]||(this.states[e]={}),this.states[e][t]||(this.states[e][t]={}),"incr"===s?Object.keys(r).forEach(s=>{this.states[e][t][s]=this.states[e][t][s]?this.states[e][t][s]+parseInt(r[s],10):parseInt(r[s],10)}):Object.keys(r).forEach(s=>{this.states[e][t][s]=this.states[e][t][s]?this.states[e][t][s]-parseInt(r[s],10):-parseInt(r[s],10)});try{this.states[e].success.niceReads=niceSize(this.states[e].success.reads)}catch(i){this.states[e].success.niceReads=0}try{this.states[e].progress.niceSize=niceSize(this.states[e].success.bytes+this.states[e].progress.bytes||0)}catch(i){this.states[e].progress.niceSize=0}try{this.states[e].success.niceSize=niceSize(this.states[e].success.bytes)}catch(i){this.states[e].success.niceSize=0}this.states[e].niceTypes=Object.keys(this.states[e].types||{}).sort().map(t=>`${this.states[e].types[t]} ${t}`).join(", ");const n=Date.now();(!this.stateReportTime||n-this.stateReportTime>2e3)&&(this.stateReportTime=n,this.reportProgress())}uploadState(e,t,s){return this.storeState("upload",e,t,s)}downloadState(e,t,s){return this.storeState("download",e,t,s)}url(){return this.config.options.url}apikey(){return this.config.options.apikey}attr(e,t){if(!(e in this.config.options))throw new Error(`config object does not contain property ${e}`);return t?(this.config.options[e]=t,this):this.config.options[e]}stats(e){return this.states[e]}}EPI2ME.version=utils.version,EPI2ME.REST=REST,EPI2ME.utils=utils,module.exports=EPI2ME;
