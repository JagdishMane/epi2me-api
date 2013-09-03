var proxyquire     = require('proxyquire');
var assert         = require("assert")
var extRequestStub = {};
var metrichor      = proxyquire('../lib/ONT/metrichor', { 'request' : extRequestStub });

describe('Array', function(){
    describe('metrichor', function(){

	it('should create a metrichor from constructor with defaults and allow overwriting', function() {
	    var Client;
	    assert.doesNotThrow( function () {
		Client = new metrichor();
	    }, Error, 'Client obtained');

	    assert.equal(Client.url(),     'http://metrichor.oxfordnanolabs.local', 'default url');
	    assert.equal(Client.apikey(),  null, 'default apikey');
	    assert.equal(Client.url('http://metrichor.local:90'), 'http://metrichor.local:90', 'accessor overwrites url');
	    assert.equal(Client.apikey('FooBar01'),               'FooBar01',                  'accessor overwrites apikey');
	});

	it('should create a metrichor with opts', function() {
	    var Client;
	    assert.doesNotThrow( function () {
		Client = new metrichor({
		    url:     'https://metrichor.local:8000',
		    apikey:  'FooBar02'
		});
	    }, Error, 'Client obtained');
	    assert.equal(Client.url(),    'https://metrichor.local:8000', 'url built from constructor');
	    assert.equal(Client.apikey(), 'FooBar02',                     'apikey built from constructor');
	});

	it('should list workflows', function() {
	    extRequestStub.get = function(obj, cb) {
		assert.equal(obj.uri, "http://metrichor.local:8080/workflow.js?apikey=FooBar02");
		cb(null, null, '{"workflows":[{"description":"a workflow"}]}');
	    };

	    var Client = new metrichor({
		"url"    : "http://metrichor.local:8080",
		"apikey" : "FooBar02"
	    });

	    Client.workflows(function(err, obj) {
		assert.equal(err, null, 'no error reported');
		assert.deepEqual(obj, [{"description":"a workflow"}], 'workflow list');
	    });
	});

	it('should read a workflow', function() {
	    extRequestStub.get = function(obj, cb) {
		assert.equal(obj.uri, "http://metrichor.local:8080/workflow/test.js?apikey=FooBar02");
		cb(null, null, '{"description":"a workflow","rev":"1.0"}');
	    };

	    var Client = new metrichor({
		"url"    : "http://metrichor.local:8080",
		"apikey" : "FooBar02"
	    });

	    Client.workflow('test', function(err, obj) {
		assert.equal(err, null, 'no error reported');
		assert.deepEqual(obj, {"description":"a workflow","rev":"1.0"}, 'workflow read');
	    });
	});

	it('should update a workflow', function() {
	    extRequestStub.post = function(obj, cb) {
		assert.equal(obj.uri,    "http://metrichor.local:8080/workflow/test.js");
		assert.equal(obj.apikey, "FooBar02");
		assert.deepEqual(JSON.parse(obj.json), {"description":"test workflow", "rev":"1.1"});
		cb(null, null, '{"description":"a workflow","rev":"1.0"}');
	    };

	    var Client = new metrichor({
		"url"    : "http://metrichor.local:8080",
		"apikey" : "FooBar02"
	    });

	    Client.workflow('test', {"description":"test workflow", "rev":"1.1"}, function(err, obj) {
		assert.equal(err, null, 'no error reported');
		assert.deepEqual(obj, {"description":"a workflow","rev":"1.0"}, 'workflow read');
	    });
	});

	it('should start a workflow_instance', function() {
	    extRequestStub.post = function(obj, cb) {
		assert.equal(obj.uri,    "http://metrichor.local:8080/workflow_instance.js");
		assert.equal(obj.apikey, "FooBar02");
		assert.equal(JSON.parse(obj.json).workflow, "test");
		cb(null, null, '{"id_workflow_instance":"1","id_user":"1"}');
	    };

	    var Client = new metrichor({
		"url"    : "http://metrichor.local:8080",
		"apikey" : "FooBar02"
	    });

	    Client.start_workflow('test', function(err, obj) {
		assert.equal(err, null, 'no error reported');
		assert.deepEqual(obj, {"id_workflow_instance":"1","id_user":"1"}, 'workflow_instance start response');
	    });
	});

	it('should stop a workflow_instance', function() {
	    extRequestStub.put = function(obj, cb) {
		assert.equal(obj.uri,    "http://metrichor.local:8080/workflow_instance/stop/test.js");
		assert.equal(obj.apikey, "FooBar02");
		cb(null, null, '{"id_workflow_instance":"1","id_user":"1","stop_requested_date":"2013-09-03 15:17:00"}');
	    };

	    var Client = new metrichor({
		"url"    : "http://metrichor.local:8080",
		"apikey" : "FooBar02"
	    });

	    Client.stop_workflow('test', function(err, obj) {
		assert.equal(err, null, 'no error reported');
		assert.deepEqual(obj, {"id_workflow_instance":"1","id_user":"1","stop_requested_date":"2013-09-03 15:17:00"}, 'workflow_instance stop response');
	    });
	});

    });
});
