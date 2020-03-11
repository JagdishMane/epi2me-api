/**
 * Copyright Metrichor Ltd. (An Oxford Nanopore Technologies Company) 2020
 */

"use strict";function e(e){return e&&"object"===typeof e&&"default"in e?e.default:e}var t=require("os"),i=require("lodash"),r=e(require("fs-extra")),a=e(require("path")),l={local:!1,url:"https://epi2me.nanoporetech.com",user_agent:"EPI2ME API",region:"eu-west-1",sessionGrace:5,uploadTimeout:1200,downloadTimeout:1200,fileCheckInterval:5,downloadCheckInterval:3,stateCheckInterval:60,inFlightDelay:600,waitTimeSeconds:20,waitTokenError:30,transferPoolSize:3,downloadMode:"data+telemetry",filetype:[".fastq",".fq",".fastq.gz",".fq.gz"],signing:!0,sampleDirectory:"/data"};class o extends class{constructor(e){this.allProfileData={},this.defaultEndpoint=process.env.METRICHOR||l.endpoint||l.url,e&&(this.allProfileData=i.merge(e,{profiles:{}})),this.allProfileData.endpoint&&(this.defaultEndpoint=this.allProfileData.endpoint)}profile(e){return e?i.merge({endpoint:this.defaultEndpoint},this.allProfileData.profiles[e]):{}}profiles(){return Object.keys(this.allProfileData.profiles||{})}}{constructor(e,t){super({}),this.raiseExceptions=t,this.prefsFile=e||o.profilePath(),this.allProfileData={};try{this.allProfileData=i.merge(r.readJSONSync(this.prefsFile),{profiles:{}}),this.allProfileData.endpoint&&(this.defaultEndpoint=this.allProfileData.endpoint)}catch(a){if(this.raiseExceptions)throw a}}static profilePath(){return a.join(t.homedir(),".epi2me.json")}profile(e,t){if(e&&t){i.merge(this.allProfileData,{profiles:{[e]:t}});try{r.writeJSONSync(this.prefsFile,this.allProfileData)}catch(a){if(this.raiseExceptions)throw a}}return e?i.merge({endpoint:this.defaultEndpoint},this.allProfileData.profiles[e]):{}}}module.exports=o;
