MAKE     := make

ifeq ($(OS),Windows_NT)
    MAKE     = gmake
endif

deps:
	npm install

test_common:
	node node_modules/jslint/bin/jslint metrichor.js

test: deps
	$(MAKE) test_common
	node node_modules/mocha/bin/mocha --reporter xunit-file

just_test: test_common
	node node_modules/mocha/bin/mocha

cover: deps
	$(MAKE) just_cover

just_cover:
	node_modules/.bin/istanbul cover node_modules//mocha/bin/_mocha -- --reporter xunit-file test/*js
