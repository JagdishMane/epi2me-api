/**
 * Copyright Metrichor Ltd. (An Oxford Nanopore Technologies Company) 2020
 */

"use strict";function e(e){return e&&"object"===typeof e&&"default"in e?e.default:e}var t=require("rxjs"),r=e(require("graphql-tag")),s=require("apollo-cache-inmemory"),o=e(require("apollo-client")),n=require("apollo-link"),i=require("apollo-link-http"),a=require("@lifeomic/axios-fetch"),c=e(require("axios")),l=e(require("crypto")),h=require("lodash"),u=require("tunnel"),p=e(require("os")),d=e(require("socket.io-client")),f=!1,g="https://epi2me.nanoporetech.com",w="EPI2ME API",m="eu-west-1",y=5,v=1200,k=1200,b=5,$=3,S=60,I=600,T=20,j=30,E=3,x="data+telemetry",O=[".fastq",".fq",".fastq.gz",".fq.gz"],_=!0,A="/data";const P="\npage\npages\nhasNext\nhasPrevious\ntotalCount\n",C="\nidWorkflowInstance\nstartDate\nworkflowImage{\n  workflow\n  {\n    rev\n    name\n  }\n}\n";var q="undefined"!==typeof globalThis?globalThis:"undefined"!==typeof window?window:"undefined"!==typeof global?global:"undefined"!==typeof self?self:{};function R(e,t,r){return e(r={path:t,exports:{},require:function(e,t){return function(){throw new Error("Dynamic requires are not currently supported by @rollup/plugin-commonjs")}((void 0===t||null===t)&&r.path)}},r.exports),r.exports}var W=R((function(e,t){!function(r){var s=t&&!t.nodeType&&t,o=e&&!e.nodeType&&e,n="object"==typeof q&&q;n.global!==n&&n.window!==n&&n.self!==n||(r=n);var i,a,c=2147483647,l=/^xn--/,h=/[^\x20-\x7E]/,u=/[\x2E\u3002\uFF0E\uFF61]/g,p={overflow:"Overflow: input needs wider integers to process","not-basic":"Illegal input >= 0x80 (not a basic code point)","invalid-input":"Invalid input"},d=Math.floor,f=String.fromCharCode;function g(e){throw RangeError(p[e])}function w(e,t){for(var r=e.length,s=[];r--;)s[r]=t(e[r]);return s}function m(e,t){var r=e.split("@"),s="";return r.length>1&&(s=r[0]+"@",e=r[1]),s+w((e=e.replace(u,".")).split("."),t).join(".")}function y(e){for(var t,r,s=[],o=0,n=e.length;o<n;)(t=e.charCodeAt(o++))>=55296&&t<=56319&&o<n?56320==(64512&(r=e.charCodeAt(o++)))?s.push(((1023&t)<<10)+(1023&r)+65536):(s.push(t),o--):s.push(t);return s}function v(e){return w(e,(function(e){var t="";return e>65535&&(t+=f((e-=65536)>>>10&1023|55296),e=56320|1023&e),t+=f(e)})).join("")}function k(e,t){return e+22+75*(e<26)-((0!=t)<<5)}function b(e,t,r){var s=0;for(e=r?d(e/700):e>>1,e+=d(e/t);e>455;s+=36)e=d(e/35);return d(s+36*e/(e+38))}function $(e){var t,r,s,o,n,i,a,l,h,u,p,f=[],w=e.length,m=0,y=128,k=72;for((r=e.lastIndexOf("-"))<0&&(r=0),s=0;s<r;++s)e.charCodeAt(s)>=128&&g("not-basic"),f.push(e.charCodeAt(s));for(o=r>0?r+1:0;o<w;){for(n=m,i=1,a=36;o>=w&&g("invalid-input"),((l=(p=e.charCodeAt(o++))-48<10?p-22:p-65<26?p-65:p-97<26?p-97:36)>=36||l>d((c-m)/i))&&g("overflow"),m+=l*i,!(l<(h=a<=k?1:a>=k+26?26:a-k));a+=36)i>d(c/(u=36-h))&&g("overflow"),i*=u;k=b(m-n,t=f.length+1,0==n),d(m/t)>c-y&&g("overflow"),y+=d(m/t),m%=t,f.splice(m++,0,y)}return v(f)}function S(e){var t,r,s,o,n,i,a,l,h,u,p,w,m,v,$,S=[];for(w=(e=y(e)).length,t=128,r=0,n=72,i=0;i<w;++i)(p=e[i])<128&&S.push(f(p));for(s=o=S.length,o&&S.push("-");s<w;){for(a=c,i=0;i<w;++i)(p=e[i])>=t&&p<a&&(a=p);for(a-t>d((c-r)/(m=s+1))&&g("overflow"),r+=(a-t)*m,t=a,i=0;i<w;++i)if((p=e[i])<t&&++r>c&&g("overflow"),p==t){for(l=r,h=36;!(l<(u=h<=n?1:h>=n+26?26:h-n));h+=36)$=l-u,v=36-u,S.push(f(k(u+$%v,0))),l=d($/v);S.push(f(k(l,0))),n=b(r,m,s==o),r=0,++s}++r,++t}return S.join("")}if(i={version:"1.3.2",ucs2:{decode:y,encode:v},decode:$,encode:S,toASCII:function(e){return m(e,(function(e){return h.test(e)?"xn--"+S(e):e}))},toUnicode:function(e){return m(e,(function(e){return l.test(e)?$(e.slice(4).toLowerCase()):e}))}},s&&o)if(e.exports==s)o.exports=i;else for(a in i)i.hasOwnProperty(a)&&(s[a]=i[a]);else r.punycode=i}(q)}));function D(e,t){return Object.prototype.hasOwnProperty.call(e,t)}var U=function(e,t,r,s){t=t||"&",r=r||"=";var o={};if("string"!==typeof e||0===e.length)return o;var n=/\+/g;e=e.split(t);var i=1e3;s&&"number"===typeof s.maxKeys&&(i=s.maxKeys);var a=e.length;i>0&&a>i&&(a=i);for(var c=0;c<a;++c){var l,h,u,p,d=e[c].replace(n,"%20"),f=d.indexOf(r);f>=0?(l=d.substr(0,f),h=d.substr(f+1)):(l=d,h=""),u=decodeURIComponent(l),p=decodeURIComponent(h),D(o,u)?Array.isArray(o[u])?o[u].push(p):o[u]=[o[u],p]:o[u]=p}return o},z=function(e){switch(typeof e){case"string":return e;case"boolean":return e?"true":"false";case"number":return isFinite(e)?e:"";default:return""}},H=function(e,t,r,s){return t=t||"&",r=r||"=",null===e&&(e=void 0),"object"===typeof e?Object.keys(e).map((function(s){var o=encodeURIComponent(z(s))+r;return Array.isArray(e[s])?e[s].map((function(e){return o+encodeURIComponent(z(e))})).join(t):o+encodeURIComponent(z(e[s]))})).join(t):s?encodeURIComponent(z(s))+r+encodeURIComponent(z(e)):""},F=R((function(e,t){t.decode=t.parse=U,t.encode=t.stringify=H})),L=function(e,t){return te(e,!1,!0).resolve(t)};function M(){this.protocol=null,this.slashes=null,this.auth=null,this.host=null,this.port=null,this.hostname=null,this.hash=null,this.search=null,this.query=null,this.pathname=null,this.path=null,this.href=null}var N=/^([a-z0-9.+-]+:)/i,B=/:[0-9]*$/,G=["{","}","|","\\","^","`"].concat(["<",">",'"',"`"," ","\r","\n","\t"]),J=["'"].concat(G),X=["%","/","?",";","#"].concat(J),K=["/","?","#"],Q=/^[a-z0-9A-Z_-]{0,63}$/,V=/^([a-z0-9A-Z_-]{0,63})(.*)$/,Z={javascript:!0,"javascript:":!0},Y={javascript:!0,"javascript:":!0},ee={http:!0,https:!0,ftp:!0,gopher:!0,file:!0,"http:":!0,"https:":!0,"ftp:":!0,"gopher:":!0,"file:":!0};function te(e,t,r){if(e&&se(e)&&e instanceof M)return e;var s=new M;return s.parse(e,t,r),s}function re(e){return"string"===typeof e}function se(e){return"object"===typeof e&&null!==e}function oe(e){return null===e}M.prototype.parse=function(e,t,r){if(!re(e))throw new TypeError("Parameter 'url' must be a string, not "+typeof e);var s=e;s=s.trim();var o=N.exec(s);if(o){var n=(o=o[0]).toLowerCase();this.protocol=n,s=s.substr(o.length)}if(r||o||s.match(/^\/\/[^@\/]+@[^@\/]+/)){var i="//"===s.substr(0,2);!i||o&&Y[o]||(s=s.substr(2),this.slashes=!0)}if(!Y[o]&&(i||o&&!ee[o])){for(var a,c,l=-1,h=0;h<K.length;h++){-1!==(u=s.indexOf(K[h]))&&(-1===l||u<l)&&(l=u)}-1!==(c=-1===l?s.lastIndexOf("@"):s.lastIndexOf("@",l))&&(a=s.slice(0,c),s=s.slice(c+1),this.auth=decodeURIComponent(a)),l=-1;for(h=0;h<X.length;h++){var u;-1!==(u=s.indexOf(X[h]))&&(-1===l||u<l)&&(l=u)}-1===l&&(l=s.length),this.host=s.slice(0,l),s=s.slice(l),this.parseHost(),this.hostname=this.hostname||"";var p="["===this.hostname[0]&&"]"===this.hostname[this.hostname.length-1];if(!p)for(var d=this.hostname.split(/\./),f=(h=0,d.length);h<f;h++){var g=d[h];if(g&&!g.match(Q)){for(var w="",m=0,y=g.length;m<y;m++)g.charCodeAt(m)>127?w+="x":w+=g[m];if(!w.match(Q)){var v=d.slice(0,h),k=d.slice(h+1),b=g.match(V);b&&(v.push(b[1]),k.unshift(b[2])),k.length&&(s="/"+k.join(".")+s),this.hostname=v.join(".");break}}}if(this.hostname.length>255?this.hostname="":this.hostname=this.hostname.toLowerCase(),!p){var $=this.hostname.split("."),S=[];for(h=0;h<$.length;++h){var I=$[h];S.push(I.match(/[^A-Za-z0-9_-]/)?"xn--"+W.encode(I):I)}this.hostname=S.join(".")}var T=this.port?":"+this.port:"",j=this.hostname||"";this.host=j+T,this.href+=this.host,p&&(this.hostname=this.hostname.substr(1,this.hostname.length-2),"/"!==s[0]&&(s="/"+s))}if(!Z[n])for(h=0,f=J.length;h<f;h++){var E=J[h],x=encodeURIComponent(E);x===E&&(x=escape(E)),s=s.split(E).join(x)}var O=s.indexOf("#");-1!==O&&(this.hash=s.substr(O),s=s.slice(0,O));var _=s.indexOf("?");if(-1!==_?(this.search=s.substr(_),this.query=s.substr(_+1),t&&(this.query=F.parse(this.query)),s=s.slice(0,_)):t&&(this.search="",this.query={}),s&&(this.pathname=s),ee[n]&&this.hostname&&!this.pathname&&(this.pathname="/"),this.pathname||this.search){T=this.pathname||"",I=this.search||"";this.path=T+I}return this.href=this.format(),this},M.prototype.format=function(){var e=this.auth||"";e&&(e=(e=encodeURIComponent(e)).replace(/%3A/i,":"),e+="@");var t=this.protocol||"",r=this.pathname||"",s=this.hash||"",o=!1,n="";this.host?o=e+this.host:this.hostname&&(o=e+(-1===this.hostname.indexOf(":")?this.hostname:"["+this.hostname+"]"),this.port&&(o+=":"+this.port)),this.query&&se(this.query)&&Object.keys(this.query).length&&(n=F.stringify(this.query));var i=this.search||n&&"?"+n||"";return t&&":"!==t.substr(-1)&&(t+=":"),this.slashes||(!t||ee[t])&&!1!==o?(o="//"+(o||""),r&&"/"!==r.charAt(0)&&(r="/"+r)):o||(o=""),s&&"#"!==s.charAt(0)&&(s="#"+s),i&&"?"!==i.charAt(0)&&(i="?"+i),t+o+(r=r.replace(/[?#]/g,(function(e){return encodeURIComponent(e)})))+(i=i.replace("#","%23"))+s},M.prototype.resolve=function(e){return this.resolveObject(te(e,!1,!0)).format()},M.prototype.resolveObject=function(e){if(re(e)){var t=new M;t.parse(e,!1,!0),e=t}var r=new M;if(Object.keys(this).forEach((function(e){r[e]=this[e]}),this),r.hash=e.hash,""===e.href)return r.href=r.format(),r;if(e.slashes&&!e.protocol)return Object.keys(e).forEach((function(t){"protocol"!==t&&(r[t]=e[t])})),ee[r.protocol]&&r.hostname&&!r.pathname&&(r.path=r.pathname="/"),r.href=r.format(),r;if(e.protocol&&e.protocol!==r.protocol){if(!ee[e.protocol])return Object.keys(e).forEach((function(t){r[t]=e[t]})),r.href=r.format(),r;if(r.protocol=e.protocol,e.host||Y[e.protocol])r.pathname=e.pathname;else{for(var s=(e.pathname||"").split("/");s.length&&!(e.host=s.shift()););e.host||(e.host=""),e.hostname||(e.hostname=""),""!==s[0]&&s.unshift(""),s.length<2&&s.unshift(""),r.pathname=s.join("/")}if(r.search=e.search,r.query=e.query,r.host=e.host||"",r.auth=e.auth,r.hostname=e.hostname||e.host,r.port=e.port,r.pathname||r.search){var o=r.pathname||"",n=r.search||"";r.path=o+n}return r.slashes=r.slashes||e.slashes,r.href=r.format(),r}var i=r.pathname&&"/"===r.pathname.charAt(0),a=e.host||e.pathname&&"/"===e.pathname.charAt(0),c=a||i||r.host&&e.pathname,l=c,h=r.pathname&&r.pathname.split("/")||[],u=(s=e.pathname&&e.pathname.split("/")||[],r.protocol&&!ee[r.protocol]);if(u&&(r.hostname="",r.port=null,r.host&&(""===h[0]?h[0]=r.host:h.unshift(r.host)),r.host="",e.protocol&&(e.hostname=null,e.port=null,e.host&&(""===s[0]?s[0]=e.host:s.unshift(e.host)),e.host=null),c=c&&(""===s[0]||""===h[0])),a)r.host=e.host||""===e.host?e.host:r.host,r.hostname=e.hostname||""===e.hostname?e.hostname:r.hostname,r.search=e.search,r.query=e.query,h=s;else if(s.length)h||(h=[]),h.pop(),h=h.concat(s),r.search=e.search,r.query=e.query;else if(null!=e.search){if(u)r.hostname=r.host=h.shift(),(w=!!(r.host&&r.host.indexOf("@")>0)&&r.host.split("@"))&&(r.auth=w.shift(),r.host=r.hostname=w.shift());return r.search=e.search,r.query=e.query,oe(r.pathname)&&oe(r.search)||(r.path=(r.pathname?r.pathname:"")+(r.search?r.search:"")),r.href=r.format(),r}if(!h.length)return r.pathname=null,r.search?r.path="/"+r.search:r.path=null,r.href=r.format(),r;for(var p=h.slice(-1)[0],d=(r.host||e.host)&&("."===p||".."===p)||""===p,f=0,g=h.length;g>=0;g--)"."==(p=h[g])?h.splice(g,1):".."===p?(h.splice(g,1),f++):f&&(h.splice(g,1),f--);if(!c&&!l)for(;f--;f)h.unshift("..");!c||""===h[0]||h[0]&&"/"===h[0].charAt(0)||h.unshift(""),d&&"/"!==h.join("/").substr(-1)&&h.push("");var w,m=""===h[0]||h[0]&&"/"===h[0].charAt(0);u&&(r.hostname=r.host=m?"":h.length?h.shift():"",(w=!!(r.host&&r.host.indexOf("@")>0)&&r.host.split("@"))&&(r.auth=w.shift(),r.host=r.hostname=w.shift()));return(c=c||r.host&&h.length)&&!m&&h.unshift(""),h.length?r.pathname=h.join("/"):(r.pathname=null,r.path=null),oe(r.pathname)&&oe(r.search)||(r.path=(r.pathname?r.pathname:"")+(r.search?r.search:"")),r.auth=e.auth||r.auth,r.slashes=r.slashes||e.slashes,r.href=r.format(),r},M.prototype.parseHost=function(){var e=this.host,t=B.exec(e);t&&(":"!==(t=t[0])&&(this.port=t.substr(1)),e=e.substr(0,e.length-t.length)),e&&(this.hostname=e)};const ne=(...e)=>{},ie={debug:ne,error:ne,info:ne,warn:ne},ae={info(...e){console.info(`[${(new Date).toISOString()}] INFO:`,...e)},debug(...e){console.debug(`[${(new Date).toISOString()}] DEBUG:`,...e)},warn(...e){console.warn(`[${(new Date).toISOString()}] WARN:`,...e)},error(...e){console.error(`[${(new Date).toISOString()}] ERROR:`,...e)}},ce=(()=>{const e=(e,t={})=>{if(e.headers||(e.headers={}),!t.apikey||!t.apisecret)return;e.headers["X-EPI2ME-APIKEY"]=t.apikey,e.headers["X-EPI2ME-SIGNATUREDATE"]=(new Date).toISOString();const r=[Object.keys(e.headers).sort().filter(e=>e.match(/^x-epi2me/i)).map(t=>`${t}:${e.headers[t]}`).join("\n"),e.body].join("\n"),s=l.createHmac("sha1",t.apisecret).update(r).digest("hex");e.headers["X-EPI2ME-SIGNATUREV0"]=s};return{version:"3.0.1749",setHeaders:(t,r={})=>{var s,o;if(t.headers=h.merge({Accept:"application/json","Content-Type":"application/json","X-EPI2ME-CLIENT":r.user_agent||"api","X-EPI2ME-VERSION":r.agent_version||ce.version},t.headers,r.headers),(null===(s=r.signing)||void 0===s||s)&&e(t,r),r.proxy){const e=r.proxy.match(/https?:\/\/((\S+):(\S+)@)?(\S+):(\d+)/);if(!e)throw new Error("Failed to parse Proxy URL");const s=e[2],n=e[3],i={host:e[4],port:+e[5]};s&&n&&(i.proxyAuth=`${s}:${n}`);const a=null!==(o=r.log)&&void 0!==o?o:ie;r.proxy.match(/^https/)?(a.debug("using HTTPS over HTTPS proxy",JSON.stringify(i)),t.httpsAgent=u.httpsOverHttps({proxy:i})):(a.debug("using HTTPS over HTTP proxy",JSON.stringify(i)),t.httpsAgent=u.httpsOverHttp({proxy:i})),t.proxy=!1}}}})(),le=a.buildAxiosFetch(c),he=new Set(["get","delete","head","options","post","put","patch","link","unlink"]);function ue({apikey:e,apisecret:t}){return(r,s={})=>{let o;if(s.method&&(n=s.method,!he.has(n.toLowerCase())))throw new Error(`Invalid method ${s.method}`);var n;return o=s,ce.setHeaders(o,{apikey:e,apisecret:t,signing:!0}),le(r,s)}}const pe=new o({link:new n.ApolloLink(e=>{const{apikey:t,apisecret:r,url:s}=e.getContext(),o=ue({apikey:t,apisecret:r}),a=i.createHttpLink({uri:L(s,"/graphql"),fetch:o,headers:{keys:{apikey:t,apisecret:r}}});return n.execute(a,e)}),cache:new s.InMemoryCache});function de(e){return"object"===typeof e&&!1===Array.isArray(e)}function fe(e){return"function"===typeof e}function ge(e){return Array.isArray(e)}function we(e){return"undefined"===typeof e}function me(e){return null===e||"undefined"===typeof e}function ye(e,t){if(function(e){return"string"===typeof e}(e))return e;if(me(e)&&"undefined"!==typeof t)return t;throw new Error(`Unable to cast ${typeof e} to String`)}function ve(e,t){if(function(e){return"number"===typeof e}(e))return e;if(me(e)&&"undefined"!==typeof t)return t;throw new Error(`Unable to cast ${typeof e} to Number`)}function ke(e,t){if(function(e){return"number"===typeof e||"string"===typeof e}(e))return e;if(me(e)&&"undefined"!==typeof t)return t;throw new Error(`Unable to cast ${typeof e} to Index`)}function be(e,t){if(de(e))return e;if(me(e)&&"undefined"!==typeof t)return t;throw new Error(`Unable to cast ${typeof e} to Indexable`)}function $e(e,t){if(function(e){return"boolean"===typeof e}(e))return e;if(me(e)&&"undefined"!==typeof t)return t;throw new Error(`Unable to cast ${typeof e} to Boolean`)}function Se(e,t){if(ge(e))return e;if(me(e)&&"undefined"!==typeof t)return t;throw new Error(`Unable to cast ${typeof e} to Array`)}function Ie(e,t){if(de(e))return e;if(me(e)&&"undefined"!==typeof t)return t;throw new Error(`Unable to cast ${typeof e} to Record`)}function Te(e,t){if(fe(e))return e;if(me(e)&&"undefined"!==typeof t)return t;throw new Error(`Unable to cast ${typeof e} to Function`)}function je(e,t,r){if(me(e)&&"undefined"!==typeof r)return r;if(ge(e))return e.map(t);throw new Error(`Unable to cast ${typeof e} to Array`)}function Ee(e){if(!me(e))return ye(e)}function xe(e){if(!me(e))return ve(e)}function Oe(e){if(!me(e))return ke(e)}function _e(e){if(!me(e))return $e(e)}function Ae(e){if(!me(e))return Te(e)}c.defaults.validateStatus=e=>e<=504;const Pe=function(){const e={sign:(e,t)=>{var r,s;if(!t)return;if(e.headers||(e.headers={}),!t.apikey)return;if(e.headers["X-EPI2ME-ApiKey"]=t.apikey,!t.apisecret)return;e.headers["X-EPI2ME-SignatureDate"]=(new Date).toISOString(),(null===(r=e.url)||void 0===r?void 0:r.match(/^https:/))&&(e.url=e.url.replace(/:443/,"")),(null===(s=e.url)||void 0===s?void 0:s.match(/^http:/))&&(e.url=e.url.replace(/:80/,""));const o=[e.url,Object.keys(e.headers).sort().filter(e=>e.match(/^x-epi2me/i)).map(t=>`${t}:${e.headers[t]}`).join("\n")].join("\n"),n=l.createHmac("sha1",t.apisecret).update(o).digest("hex");e.headers["X-EPI2ME-SignatureV0"]=n},responseHandler(e){const t=e?Ie(e.data):null;if(!t)throw new Error("unexpected non-json response");if(e&&e.status>=400){let r=`Network error ${e.status}`;throw t.error&&(r=t.error+""),504===e.status&&(r="Please check your network connection and try again."),new Error(r)}if(t.error)throw new Error(t.error+"");return t}};return{version:"3.0.1749",headers(t,r){var s,o;if(t.headers=h.merge({Accept:"application/json","Content-Type":"application/json","X-EPI2ME-Client":r.user_agent||"api","X-EPI2ME-Version":r.agent_version||Pe.version},t.headers,r.headers),(null===(s=r.signing)||void 0===s||s)&&e.sign(t,r),r.proxy){const e=r.proxy.match(/https?:\/\/((\S+):(\S+)@)?(\S+):(\d+)/);if(!e)throw new Error("Failed to parse Proxy URL");const s=e[2],n=e[3],i={host:e[4],port:parseInt(e[5],10)};s&&n&&(i.proxyAuth=`${s}:${n}`);const a=null!==(o=r.log)&&void 0!==o?o:ie;r.proxy.match(/^https/)?(a.debug("using HTTPS over HTTPS proxy",JSON.stringify(i)),t.httpsAgent=u.httpsOverHttps({proxy:i})):(a.debug("using HTTPS over HTTP proxy",JSON.stringify(i)),t.httpsAgent=u.httpsOverHttp({proxy:i})),t.proxy=!1}},async head(e,t){var r;const s={url:this.mangleURL(e,t)};if(this.headers(s,t),!s.url)throw new Error("unreachable: url argument in HEAD was deleted");(null!==(r=t.log)&&void 0!==r?r:ie).debug("HEAD",s.url);const o=await c.head(s.url,s);if(o&&o.status>=400){if(504===o.status)throw new Error("Please check your network connection and try again.");throw new Error(`Network error ${o.status}`)}return o},async get(t,r){var s;const o={url:this.mangleURL(t,r)};if(this.headers(o,r),!o.url)throw new Error("unreachable: url argument in GET was deleted");(null!==(s=r.log)&&void 0!==s?s:ie).debug("GET",o.url);const n=await c.get(o.url,o);return e.responseHandler(n)},async post(t,r,s){var o;let n=s.url;n=n.replace(/\/+$/,"");const i={url:`${n}/${t.replace(/\/+/g,"/")}`,data:r,headers:{}};s.legacy_form&&this.processLegacyForm(i,r),this.headers(i,s);const{data:a}=i;delete i.data;const l=null!==(o=s.log)&&void 0!==o?o:ie;if(!i.url)throw new Error("unreachable: url argument in POST was deleted");l.debug("POST",i.url);const h=await c.post(i.url,a,i);return s.handler?s.handler(h):e.responseHandler(h)},async put(t,r,s,o){var n;let i=o.url;i=i.replace(/\/+$/,"");const a={url:`${i}/${t.replace(/\/+/g,"/")}/${r}`,data:s,headers:{}};o.legacy_form&&this.processLegacyForm(a,s),this.headers(a,o);const{data:l}=a;delete a.data;const h=null!==(n=o.log)&&void 0!==n?n:ie;if(!a.url)throw new Error("unreachable: url argument in PUT was deleted");h.debug("PUT",a.url);const u=await c.put(a.url,l,a);return e.responseHandler(u)},mangleURL(e,t){let r=t.url;return t.skip_url_mangle?e:(e=`/${e}`,r=r.replace(/\/+$/,""),r+(e=e.replace(/\/+/g,"/")))},processLegacyForm(e,t){const r=[],s=h.merge({json:JSON.stringify(t)},t);Object.keys(s).sort().forEach(e=>{r.push(`${e}=${escape(s[e]+"")}`)}),e.data=r.join("&"),e.headers["Content-Type"]="application/x-www-form-urlencoded"},convertResponseToObject(e){if("object"===typeof e)return e;try{return JSON.parse(e)}catch(t){throw new Error(`exception parsing chain JSON ${String(t)}`)}}}}();class Ce{constructor(e){this.client=pe,this.createContext=e=>{const{apikey:t,apisecret:r,url:s}=this.options;return Object.assign({apikey:t,apisecret:r,url:s},e)},this.resetCache=()=>{this.client.resetStore()},this.workflows=this.query(r`
    query allWorkflows($page: Int, $pageSize: Int, $isActive: Int, $orderBy: String, $region: String) {
      allWorkflows(page: $page, pageSize: $pageSize, isActive: $isActive, orderBy: $orderBy, region: $region) {
        ${P}
        results {
          ${"\nidWorkflow\nname\ndescription\nsummary\nrev\n"}
        }
      }
    }
  `),this.workflowPages=async e=>{let t=e,r=await this.workflows({variables:{page:t}});const s=async e=>(t=e,r=await this.workflows({variables:{page:t}}),r);return{data:r,next:()=>s(t+1),previous:()=>s(t-1),first:()=>s(1),last:()=>s(0)}},this.workflow=this.query(r`
    query workflow($idWorkflow: ID!) {
      workflow(idWorkflow: $idWorkflow) {
        ${"\nidWorkflow\nname\ndescription\nsummary\nrev\n"}
      }
    }
   `),this.workflowInstances=this.query(r`
  query allWorkflowInstances($page: Int, $pageSize: Int, $shared: Boolean, $idUser: ID, $orderBy: String) {
    allWorkflowInstances(page: $page, pageSize: $pageSize, shared: $shared, idUser: $idUser, orderBy: $orderBy) {
      ${P}
      results {
        ${C}
      }
    }
  }
   `),this.workflowInstance=this.query(r`
      query workflowInstance($idWorkflowInstance: ID!) {
        workflowInstance(idWorkflowInstance: $idWorkflowInstance) {
          ${C}
        }
      }
   `),this.startWorkflow=this.mutate(r`
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
  `),this.stopWorkflow=this.mutate(r`
    mutation stopWorkflowInstance($idWorkflowInstance: ID!) {
      stopData: stopWorkflowInstance(idWorkflowInstance: $idWorkflowInstance) {
        success
        message
      }
    }
  `),this.instanceToken=this.mutate(r`
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
  `),this.user=this.query(r`
    query user {
      me {
        username
        realname
        useraccountSet {
          idUserAccount
        }
      }
    }
  `),this.updateUser=this.mutate(r`
    mutation updateUser($idRegionPreferred: ID!) {
      updateUser(idRegionPreferred: $idRegionPreferred) {
        idRegionPreferred
      }
    }
  `),this.register=this.mutate(r`
    mutation registerToken($code: String!, $description: String) {
      registerToken(code: $code, description: $description) {
        apikey
        apisecret
        description
      }
    }
  `),this.status=this.query(r`
    query status {
      status {
        portalVersion
        remoteAddr
        serverTime
        minimumAgent
        dbVersion
      }
    }
  `),this.regions=this.query(r`
    query regions {
      regions {
        idRegion
        description
        name
      }
    }
  `);let t=e.url;t=t.replace(/:\/\//,"://graphql."),t=t.replace(/\/$/,"");const{apikey:s,apisecret:o,log:n,local:i,signing:a}=e;this.options={url:t,agent_version:e.agent_version,local:i,user_agent:e.user_agent,signing:a,apikey:s,apisecret:o},this.log=n}query(e){return t=>{var s,o,n;const i=null!==(s=null===t||void 0===t?void 0:t.context)&&void 0!==s?s:{},a=null!==(o=null===t||void 0===t?void 0:t.variables)&&void 0!==o?o:{},c=null!==(n=null===t||void 0===t?void 0:t.options)&&void 0!==n?n:{},l=this.createContext(i);let h;return h="string"===typeof e?r`
          ${e}
        `:"function"===typeof e?r`
          ${e(P)}
        `:e,this.client.query(Object.assign(Object.assign({query:h,variables:a},c),{context:l}))}}mutate(e){return t=>{var s,o,n;const i=null!==(s=null===t||void 0===t?void 0:t.context)&&void 0!==s?s:{},a=null!==(o=null===t||void 0===t?void 0:t.variables)&&void 0!==o?o:{},c=null!==(n=null===t||void 0===t?void 0:t.options)&&void 0!==n?n:{},l=this.createContext(i);let h;return h="string"===typeof e?r`
          ${e}
        `:e,this.client.mutate(Object.assign(Object.assign({mutation:h,variables:a},c),{context:l}))}}async healthCheck(){return{status:$e((await Pe.get("/status",Object.assign(Object.assign({},this.options),{log:{debug:ne}}))).status)}}}const qe=(e,t)=>{const r=["","K","M","G","T","P","E","Z"];let s=t||0,o=e||0;return o>=1e3?(o/=1e3,s+=1,s>=r.length?"???":qe(o,s)):0===s?`${o}${r[s]}`:`${o.toFixed(1)}${r[s]}`};class Re{constructor(e){this.cachedResponses=new Map,this.options=e,this.log=this.options.log}async list(e){const t=e.match(/^[a-z_]+/i);if(!t)throw new Error("Failed to parse entity identifier");return Se((await Pe.get(e,this.options))[`${t[0]}s`])}read(e,t){return Pe.get(`${e}/${t}`,this.options)}async user(){return this.options.local?{accounts:[{id_user_account:"none",number:"NONE",name:"None"}]}:Pe.get("user",this.options)}async status(){return Pe.get("status",this.options)}async jwt(){return ye(await Pe.post("authenticate",{},Object.assign(Object.assign({},this.options),{handler:async e=>{if(e.headers["x-epi2me-jwt"])return e.headers["x-epi2me-jwt"];throw new Error("failed to fetch JWT")}})))}async instanceToken(e,t){return Pe.post("token",h.merge(t,{id_workflow_instance:e}),h.assign({},this.options,{legacy_form:!0}))}async installToken(e){return Pe.post("token/install",{id_workflow:e},h.assign({},this.options,{legacy_form:!0}))}attributes(){return this.list("attribute")}async workflows(e){const t=this.list("workflow");if(e)try{e(null,await t)}catch(r){e(r,null)}return t}amiImages(){if(this.options.local)throw new Error("amiImages unsupported in local mode");return this.list("ami_image")}amiImage(e,t){if(this.options.local)throw new Error("ami_image unsupported in local mode");return t instanceof Object?this.updateAmiImage(ye(e),Ie(t)):e instanceof Object?Pe.post("ami_image",Ie(e),this.options):this.read("ami_image",ye(e))}updateAmiImage(e,t){return Pe.put("ami_image",e,t,this.options)}createAmiImage(e){return Pe.post("ami_image",e,this.options)}readAmiImage(e){return this.read("ami_image",e)}async workflow(e,t,r){if(e&&t&&r instanceof Function)return this.updateWorkflow(ye(e),Ie(t),r);if(e&&t instanceof Object&&!(t instanceof Function))return this.updateWorkflow(ye(e),Ie(t));if(e instanceof Object&&t instanceof Function)return this.createWorkflow(Ie(e),t);if(e instanceof Object&&!t)return this.createWorkflow(Ie(e));const s=Ee(e),o=Ae(t);if(!s){const e=new Error("no workflow id specified");return o?o(e):Promise.reject(e)}const n={};try{const e=await this.read("workflow",s);if(e.error)throw new Error(e.error+"");h.merge(n,e)}catch(c){return this.log.error(`${s}: error fetching workflow ${String(c)}`),o?o(c):Promise.reject(c)}h.merge(n,{params:{}});try{const e=await Pe.get(`workflow/config/${s}`,this.options);if(e.error)throw new Error(e.error+"");h.merge(n,e)}catch(c){return this.log.error(`${s}: error fetching workflow config ${String(c)}`),o?o(c):Promise.reject(c)}const i=ge(n.params)?Se(n.params):Ie(n.params),a=[...Object.values(i).map(e=>Ie(e)).filter(e=>"ajax_dropdown"===e.widget).map(e=>new Promise((t,r)=>{if(we(e))throw new Error("parameter is undefined");const s=Ie(e.values),o=Ie(s.items),n=ye(s.source).replace("{{EPI2ME_HOST}}","").replace(/&?apikey=\{\{EPI2ME_API_KEY\}\}/,"");Pe.get(n,this.options).then(r=>{const n=Oe(s.data_root),i=function(e,t){if(!me(e))return je(e,t)}(we(n)?n:r[n],be);return i&&(e.values=i.map(e=>({label:e[ke(o.label_key)],value:e[ke(o.value_key)]}))),t()}).catch(e=>(this.log.error(`failed to fetch ${n}`),r(e)))}))];try{return await Promise.all(a),o?o(null,n):n}catch(c){return this.log.error(`${s}: error fetching config and parameters ${String(c)}`),o?o(c):Promise.reject(c)}}async updateWorkflow(e,t,r){const s=Pe.put("workflow",e,t,this.options);if(r)try{r(null,await s)}catch(o){r(o)}return s}async createWorkflow(e,t){const r=Pe.post("workflow",e,this.options);if(t)try{t(null,await r)}catch(s){h.countBy(s)}return r}async startWorkflow(e){return Pe.post("workflow_instance",e,Object.assign(Object.assign({},this.options),{legacy_form:!0}))}async stopWorkflow(e){return Pe.put("workflow_instance/stop",e.toString(),{},Object.assign(Object.assign({},this.options),{legacy_form:!0}))}async workflowInstances(e){if(!e||!e.run_id)return this.list("workflow_instance");return je((await Pe.get(`workflow_instance/wi?show=all&columns[0][name]=run_id;columns[0][searchable]=true;columns[0][search][regex]=true;columns[0][search][value]=${e.run_id};`,this.options)).data,Ie).map(e=>({id_workflow_instance:e.id_ins,id_workflow:e.id_flo,run_id:e.run_id,description:e.desc,rev:e.rev}))}async workflowInstance(e){return this.read("workflow_instance",e+"")}async workflowConfig(e){return Pe.get(`workflow/config/${e}`,this.options)}async register(e,t){return Pe.put("reg",e,{description:t||`${p.userInfo().username}@${p.hostname()}`},h.assign({},this.options,{signing:!1}))}async datasets(e={}){if(fe(e))throw new Error("Unexpected callback instead of query");return e.show||(e.show="mine"),je(await this.list(`dataset?show=${e.show}`),Ie)}async dataset(e){if(!this.options.local)return this.read("dataset",e);return je(await this.datasets(),Ie).find(t=>t.id_dataset===e)}async fetchContent(e){const t=h.assign({},this.options,{skip_url_mangle:!0,headers:{"Content-Type":""}});let r;try{r=(await Pe.head(e,t)).headers.etag;const s=this.cachedResponses.get(e);if(r&&s&&s.etag===r)return s.response}catch(o){this.log.warn(`Failed to HEAD request ${e}: ${String(o)}`)}const s=await Pe.get(e,t);return r&&this.cachedResponses.set(e,{etag:r,response:s}),s}}class We{constructor(e,t){var r;this.debounces=new Set,this.debounceWindow=null!==(r=t.debounceWindow)&&void 0!==r?r:2e3,this.log=t.log,this.initialise(e,t.url)}async initialise(e,t){try{const r=await e.jwt();this.socket=d(t,{transportOptions:{polling:{extraHeaders:{Cookie:`x-epi2me-jwt=${r}`}}}}),this.socket.on("connect",()=>{this.log.debug("socket ready")})}catch(r){this.log.error("socket connection failed - JWT authentication error")}}debounce(e,t){const r=h.merge(e)._uuid;if(r){if(this.debounces.has(r))return;this.debounces.add(r),setTimeout(()=>{this.debounces.delete(r)},this.debounceWindow)}t&&t(e)}watch(e,t){if(!this.socket)return this.log.debug(`socket not ready. requeueing watch on ${e}`),void setTimeout(()=>{this.watch(e,t)},1e3);this.socket.on(e,e=>this.debounce(e,t))}emit(e,t){if(!this.socket)return this.log.debug(`socket not ready. requeueing emit on ${e}`),void setTimeout(()=>{this.emit(e,t)},1e3);this.log.debug(`socket emit ${e} ${JSON.stringify(t)}`),this.socket.emit(e,t)}}class De{constructor(e={}){let r;if(this.stopped=!0,this.uploadState$=new t.BehaviorSubject(!1),this.analyseState$=new t.BehaviorSubject(!1),this.reportState$=new t.BehaviorSubject(!1),this.runningStates$=t.combineLatest(this.uploadState$,this.analyseState$,this.reportState$),this.instanceTelemetry$=new t.BehaviorSubject(null),this.experimentalWorkerStatus$=new t.BehaviorSubject(null),this.states={download:{progress:{bytes:0,total:0,niceSize:0},success:{files:0,bytes:0,reads:0,niceReads:0,niceSize:0},types:{},fail:0,niceTypes:""},upload:{progress:{bytes:0,total:0,niceSize:0},success:{files:0,bytes:0,reads:0,niceReads:0,niceSize:0},types:{},filesCount:0,niceTypes:""},warnings:[]},this.timers={transferTimeouts:{},visibilityIntervals:{}},this.liveStates$=new t.BehaviorSubject(this.states),"string"===typeof e){const t=Ie(JSON.parse(e));r=De.parseOptObject(t)}else r=De.parseOptObject(e);this.config={options:r,instance:{id_workflow_instance:r.id_workflow_instance,discoverQueueCache:{},awssettings:{region:r.region}}},this.log=r.log,this.REST=new Re(r),this.graphQL=new Ce(r)}static parseOptObject(e){const t=ye(e.url,g),r={agent_version:ye(e.agent_version,Pe.version),log:this.resolveLogger(e.log),local:$e(e.local,f),url:ye(e.endpoint,t),region:ye(e.region,m),user_agent:ye(e.user_agent,w),sessionGrace:ve(e.sessionGrace,y),uploadTimeout:ve(e.uploadTimeout,v),downloadTimeout:ve(e.downloadTimeout,k),fileCheckInterval:ve(e.fileCheckInterval,b),downloadCheckInterval:ve(e.downloadCheckInterval,$),stateCheckInterval:ve(e.stateCheckInterval,S),inFlightDelay:ve(e.inFlightDelay,I),waitTimeSeconds:ve(e.waitTimeSeconds,T),waitTokenError:ve(e.waitTokenError,j),transferPoolSize:ve(e.transferPoolSize,E),downloadMode:ye(e.downloadMode,x),filetype:je(e.filetype,ye,O),signing:$e(e.signing,_),sampleDirectory:ye(e.sampleDirectory,A),useGraphQL:_e(e.useGraphQL),apikey:Ee(e.apikey),apisecret:Ee(e.apisecret),id_workflow_instance:Oe(e.id_workflow_instance),debounceWindow:xe(e.debounceWindow),proxy:Ee(e.proxy),inputFolders:je(e.inputFolders,ye,[]),outputFolder:Ee(e.outputFolder),awsAcceleration:Ee(e.awsAcceleration),agent_address:Ee(e.agent_address),telemetryCb:Ae(e.telemetryCb),dataCb:Ae(e.dataCb),remoteShutdownCb:Ae(e.remoteShutdownCb)};return e.inputFolder&&r.inputFolders.push(ye(e.inputFolder)),r}static resolveLogger(e){if(!de(e))return ae;try{return{info:Te(e.info),debug:Te(e.debug),warn:Te(e.warn),error:Te(e.error)}}catch(t){throw new Error("expected log object to have error, debug, info and warn methods")}}async socket(){if(this.mySocket)return this.mySocket;this.mySocket=new We(this.REST,this.config.options);const{id_workflow_instance:e}=this.config.instance;return e&&this.mySocket.watch(`workflow_instance:state:${e}`,e=>{var t,r;const{instance:s}=this.config,o=function(e){if(!me(e))return Ie(e)}(null===(t=s.chain)||void 0===t?void 0:t.components);if(o){const t=Ie(s.summaryTelemetry),n=Object.entries(o).sort((e,t)=>parseInt(e[0],10)-parseInt(t[0],10)),i=be(e),a=[];for(const[e,s]of n)if(e in i){const o=+e,n=ke(Ie(s).wid),c=null!==(r=o&&Object.keys(je(t[n],Ie)[0]))&&void 0!==r?r:"ROOT",[l,h,u]=ye(i[e]).split(",").map(e=>Math.max(0,+e));a.push({running:l,complete:h,error:u,step:o,name:c})}this.experimentalWorkerStatus$.next(a)}}),this.mySocket}async realtimeFeedback(e,t){(await this.socket()).emit(e,t)}setTimer(e,t,r){if(this.timers[e])throw new Error(`An interval with the name ${e} has already been created`);this.timers[e]=function(e,t){const r=setInterval(t,e);return()=>clearInterval(r)}(t,r)}stopTimer(e){const t=this.timers[e];t&&(this.log.debug(`clearing ${e} interval`),t(),delete this.timers[e])}stopTimeout(e,t){const r=this.timers[e][t];r&&(r(),delete this.timers[e][t])}async stopAnalysis(){this.stopUpload(),this.stopped=!0;const{id_workflow_instance:e}=this.config.instance;if(e){try{this.config.options.useGraphQL?await this.graphQL.stopWorkflow({variables:{idWorkflowInstance:e}}):await this.REST.stopWorkflow(e),this.analyseState$.next(!1)}catch(t){throw this.log.error(`Error stopping instance: ${String(t)}`),t}this.log.info(`workflow instance ${e} stopped`)}}stopUpload(){this.log.debug("stopping watchers"),this.stopTimer("stateCheckInterval"),this.stopTimer("fileCheckInterval"),this.uploadState$.next(!1)}async stopEverything(){this.stopAnalysis();for(const e in this.timers.transferTimeouts){this.log.debug(`clearing transferTimeout for ${e}`);const t=this.timers.transferTimeouts[e];t&&t(),delete this.timers.transferTimeouts[e]}for(const e in this.timers.visibilityIntervals){this.log.debug(`clearing visibilityInterval for ${e}`);const t=this.timers.visibilityIntervals[e];t&&t(),delete this.timers.visibilityIntervals[e]}this.downloadWorkerPool&&(this.log.debug("clearing downloadWorkerPool"),await Promise.all(Object.values(this.downloadWorkerPool)),delete this.downloadWorkerPool),this.stopTimer("summaryTelemetryInterval"),this.stopTimer("downloadCheckInterval")}reportProgress(){const{upload:e,download:t}=this.states;this.log.debug({progress:{download:t,upload:e}})}uploadState(e,t,r){var s,o;const n=null!==(s=this.states.upload)&&void 0!==s?s:{progress:{bytes:0,total:0,niceSize:0},success:{files:0,bytes:0,reads:0,niceReads:0,niceSize:0},types:{},filesCount:0,niceTypes:""};"success"===e?this.updateSuccessState(n.success,t,r):"types"===e?this.updateTypesState(n.types,t,r):this.updateProgressState(n.progress,t,r);try{n.success.niceReads=qe(this.states.upload.success.reads)}catch(a){n.success.niceReads=0}try{n.progress.niceSize=qe(null!==(o=n.success.bytes+n.progress.bytes)&&void 0!==o?o:0)}catch(a){n.progress.niceSize=0}try{n.success.niceSize=qe(this.states.upload.success.bytes)}catch(a){n.success.niceSize=0}n.niceTypes=Object.keys(this.states.upload.types||{}).sort().map(e=>`${this.states.upload.types[e]} ${e}`).join(", ");const i=Date.now();(!this.stateReportTime||i-this.stateReportTime>2e3)&&(this.stateReportTime=i,this.reportProgress()),this.liveStates$.next(Object.assign({},this.states))}downloadState(e,t,r){var s,o;const n=null!==(s=this.states.download)&&void 0!==s?s:{progress:{bytes:0,total:0,niceSize:0},success:{files:0,bytes:0,reads:0,niceReads:0,niceSize:0},types:{},fail:0,niceTypes:""};"success"===e?this.updateSuccessState(n.success,t,r):"types"===e?this.updateTypesState(n.types,t,r):this.updateProgressState(n.progress,t,r);try{n.success.niceReads=qe(this.states.upload.success.reads)}catch(a){n.success.niceReads=0}try{n.progress.niceSize=qe(null!==(o=n.success.bytes+n.progress.bytes)&&void 0!==o?o:0)}catch(a){n.progress.niceSize=0}try{n.success.niceSize=qe(this.states.upload.success.bytes)}catch(a){n.success.niceSize=0}n.niceTypes=Object.keys(this.states.upload.types||{}).sort().map(e=>`${this.states.upload.types[e]} ${e}`).join(", ");const i=Date.now();(!this.stateReportTime||i-this.stateReportTime>2e3)&&(this.stateReportTime=i,this.reportProgress()),this.liveStates$.next(Object.assign({},this.states))}updateSuccessState(e,t,r){var s;const o=new Set(["files","bytes","reads"]);for(const n of Object.keys(r)){const i=("incr"===t?1:-1)*(null!==(s=r[n])&&void 0!==s?s:0);if(o.has(n)){const t=n;e[t]=e[t]+i}}}updateTypesState(e,t,r){var s;for(const o of Object.keys(r)){const n=("incr"===t?1:-1)*(null!==(s=r[o])&&void 0!==s?s:0);e[o]=ve(e[o],0)+n}}updateProgressState(e,t,r){var s;const o=new Set(["bytes","total"]);for(const n of Object.keys(r)){const i=("incr"===t?1:-1)*(null!==(s=r[n])&&void 0!==s?s:0);if(o.has(n)){const t=n;e[t]=e[t]+i}}}url(){return this.config.options.url}apikey(){return this.config.options.apikey}attr(e,t){if(!t)return this.config.options[e];switch(e){case"url":case"region":case"user_agent":case"downloadMode":case"sampleDirectory":case"apikey":case"apisecret":this.config.options[e]=ye(t);break;case"id_workflow_instance":case"sessionGrace":case"uploadTimeout":case"fileCheckInterval":case"downloadCheckInterval":case"stateCheckInterval":case"inFlightDelay":case"waitTimeSeconds":case"waitTokenError":case"transferPoolSize":case"debounceWindow":this.config.options[e]=ve(t);break;case"signing":case"useGraphQL":case"local":this.config.options[e]=$e(t);break;case"filetype":this.config.options[e]=je(t,ye);break;default:throw new Error('Cannot modify the "log" attribute')}return this}stats(e){return this.states[e]}}De.version=Pe.version,De.Profile=class{constructor(e){this.allProfileData={},this.defaultEndpoint=process.env.METRICHOR||g,e&&(this.allProfileData=h.merge({profiles:{}},e)),this.allProfileData.endpoint&&(this.defaultEndpoint=this.allProfileData.endpoint)}profile(e){return e?h.merge({endpoint:this.defaultEndpoint},h.merge({profiles:{}},this.allProfileData).profiles[e]):{}}profiles(){return Object.keys(this.allProfileData.profiles||{})}},De.REST=Re,De.utils=Pe,module.exports=De;
