var java = require("../testHelpers").java;

var nodeunit = require("nodeunit");

exports['ArrayList'] = nodeunit.testCase({
  setUp: function(callback) {
    var ArrayList = java.import('java.util.ArrayList');
    this.list = new ArrayList();
    callback();
  },

  "instantiate": function(test) {
    test.done();
  },

  "iterate empty": function(test) {
    var iterator = this.list.iteratorSync();
    test.equal(iterator.hasNextSync(), false);
    test.done();
  }
});
