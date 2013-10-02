// Author:        rpettett
// Last Maintained: $Author$
// Last Modified: $Date$
// Id:            $Id$
// $HeadURL$
// $LastChangedRevision$
// $Revision$

module.exports = metrichor;
module.exports.version = '0.3.2';

var fs         = require('fs');
var extRequest = require('request');
var path       = require('path');

function metrichor (opt_string) {
  this.className = 'metrichor';
  opt_string = opt_string || '{}';
  var opts;

  if ( typeof opt_string === 'string' ||
       (typeof opt_string === "object" &&
        opt_string.constructor === String) ) {
    opts = JSON.parse(opt_string);
  } else {
    opts = opt_string;
  }

  this.file_backed = false;
  this._url    = opts.url ? opts.url : 'http://metrichor.oxfordnanolabs.local';
  this._apikey = opts.apikey;

  if ( ! this._url.match( /^http/ ) ) {
    this.file_backed = true;
    this._url = this._url.replace(/\\/g,'/');
    this._url = this._url.replace('file://','');
  }
};

metrichor.prototype = {
  _accessor : function(field, value) {
    var store = '_'+field;
    if ( typeof value !== 'undefined' ) {
      this[store] = value;
    }
    return this[store];
  },

  url : function(url) {
    return this._accessor('url', url);
  },

  apikey : function(apikey) {
    return this._accessor('apikey', apikey);
  },

  user : function(cb) {
    
    if ( this.file_backed ) {
      return {username: "offline"};
    }
    
    return this._get('user', cb);
  },
  
  workflows : function(cb) {

    if ( ! this.file_backed ) {
      return this._list('workflow', cb);
    }

    if ( this._url.match('\.js') ) {
      return cb(null, [{
        "filename":path.basename(this._url),
        "description":path.basename(this._url)
      }]);
    }

    return fs.readdir(this._url, function (err, files) {
      var arr = [];
      files.forEach( function (filename) {
        arr.push( {
          "filename": filename, "description": filename
        } );
      } );
      cb(null, arr);
    } );
  },

  workflow  : function(id, obj, cb) {

    if ( ! this.file_backed ) {
      if(cb == null) {
        // two args: get object
        cb=obj;
        return this._read('workflow', id, cb);

      } else {
        // three args: update object
        return this._post('workflow', id, obj, cb);
      }
    }

    if ( cb == null ) {
      cb = obj;
      var file;

      if ( cb == null ) {
        cb = id;
        file = this._url;

      } else {
        file = this._url;

        if ( id ) {
          if ( file.match(id) ) {

          } else if ( file.match('.js') ) {
            return cb( "id's don't match" );

          } else {
            file = file + '/' + id;
          }
        }
      }

      return this._responsehandler(null, null, fs.readFileSync( file ), cb);

    } else {

      if ( ! id ) {
        return cb( 'No id');
      }
      
      if ( id && this._url.match('.js') && ! this._url.match(id) ) {
        return cb( "id's don't match" );
      }

      return cb( null, obj ); // for now, ro
    }
  },

  start_workflow : function(workflow_id, cb) {

    if ( this.file_backed ) {
      return cb('start_workflow not applicable to file_backed resource (offline)', workflow_id);
    }
    
    return this._post('workflow_instance', null, { "workflow": workflow_id }, cb);
  },
  
  stop_workflow : function(instance_id, cb) {
    
    if ( this.file_backed ) {
      return cb('stop_workflow not applicable to file_backed resource (offline)', instance_id);
    }
    
    return this._put('workflow_instance/stop', instance_id, cb);
  },
  
  workflow_instances : function(cb) {
    
    if ( this.file_backed ) {
      return cb('workflow_instances not applicable to file_backed resource (offline)');
    }
    
    return this._list('workflow_instance', cb);
  },
  
  workflow_instance : function(id, cb) {
    
    if ( this.file_backed ) {
      return cb('workflow_instance not applicable to file_backed resource (offline)', id);
    }
    
    return this._read('workflow_instance', id, cb);
  },
  
  component_vitals: function (id, obj, cb) {
    if ( this.file_backed ) {
      return cb('component_vitals not applicable to file_backed resource (offline)', id);
    }

    var control;
    if(obj.workflowManagerHost && obj.workflowManagerPort) {
      control = obj.workflowManagerHost + ":" + obj.workflowManagerPort;
    }

    var data;
    if(obj.webSocketHost && obj.webSocketPort) {
      data = "ws://" + obj.webSocketHost + ":" + obj.webSocketPort;
    }

    if(obj.webSocketURL) {
      data = obj.webSocketURL;
    }

    if(obj.control) {
      control = obj.control;
    }

    if(obj.data) {
      data = obj.data;
    }

    return this._put('workflow_instance/receivers', id, { "data" : data, "control" : control }, cb);
  },
  
  telemetry : function(id_workflow_instance, obj, cb) {
    if ( this.file_backed ) {
      return cb('workflow_instance not applicable to file_backed resource (offline)', id);
    }
    
    if(cb == null) {
      // two args: get object
      cb=obj;
      return this._read('workflow_instance/telemetry', id_workflow_instance, cb);
      
    } else {
      // three args: update object
      return this._post('workflow_instance/telemetry', id_workflow_instance, obj, cb);
    }
  },
  
  _list : function ( entity, cb ) {
    
    if ( ! this.file_backed ) {
      return this._get( entity, function(e, json) {
        cb(e, json[entity+"s"]);
      });
    }
  },
  
  _read : function ( entity, id, cb ) {
    
    if ( ! this.file_backed ) {
      return this._get ( entity + '/' + id, cb );
    }
  },

  _get : function (uri, cb) {
    // do something to get/set data in metrichor
    var srv  = this.url();
    srv      = srv.replace(/\/+$/, ""); // clip trailing /s
    var uri  = '/' + uri + '.js?apikey='+this.apikey();
    uri      = uri.replace(/\/+/g, "/");
    var call = srv + uri;
    var mc   = this;
    
    extRequest.get(
      { 'uri' : call },
      function (e,r,body) { mc._responsehandler( e,r,body,cb ) }
    );
  },
  
  _post : function(uri, id, obj, cb) {
    
    if ( this.file_backed ) {
      cb('no post available offline', null);
    }

    var form = {
      'apikey' : this.apikey(),
      'json'   : JSON.stringify(obj)
    };
      
    /* if id is an object, merge it into form post parameters */
    if(typeof id === 'object') {
      for (var attr in id) {
	form[attr] = id[attr];
      }
      id="";
    }
      
    var srv  = this.url();
    srv      = srv.replace(/\/+$/, ""); // clip trailing /s
    uri      = uri.replace(/\/+/g, "/");
    var call = srv + '/' + uri;
      
    if ( id ) {
      call = call + '/' + id;
    }
    call += '.js';
      
    var mc   = this;
      
    extRequest.post(
      {
        'uri'    : call,
        'form'   : form,
      },
      function ( e,r,body ){ mc._responsehandler( e,r,body,cb ) }
    );
  },

  _put : function(uri, id, obj, cb) {

    /* three-arg _put call (no parameters) */
    if(typeof obj === 'function') {
      cb = obj;
    }
    
    if ( this.file_backed ) {
      cb('no put available offline', null);
    }

    var form = {
      'apikey' : this.apikey(),
      'json'   : JSON.stringify(obj)
    };
      
    var srv  = this.url();
    srv      = srv.replace(/\/+$/, ""); // clip trailing /s
    uri      = uri.replace(/\/+/g, "/");
    var call = srv + '/' + uri + '/' + id + '.js';
    var mc   = this;
    extRequest.put(
      {
        'uri'    : call,
        'form'   : form
      },
      function ( e,r,body ){ mc._responsehandler( e,r,body,cb ) }
    );
  },
  
  _responsehandler : function(e,r,body, cb) {
    if ( e ) {
      return cb( e, {} );
    }
    var json;
    try {
      json=JSON.parse( body );

    } catch(e) {
      return cb( e, {} );
    }
    
    if ( json.error ) {
      return cb({"error":json.error}, {});
    }
    
    return cb(e, json);
  }
};
