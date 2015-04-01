// testClientBeforeError.js

var _ = require('lodash');
var java = require("../");
var nodeunit = require("nodeunit");

module.exports = {

  clientBeforeError: function(test) {
    test.expect(6);
    test.ok(!java.isJvmCreated());

    java.asyncOptions = {
      syncSuffix: "Sync",
    };

    function before(callback) {
      test.ok(!java.isJvmCreated());
      callback(new Error('dummy error'));
    }

    java.registerClient(before);

    java.launchJvm(function(err) {
      test.ok(_.isObject(err));
      test.ok(err instanceof Error);
      test.strictEqual(err.message, 'dummy error');
      test.ok(!java.isJvmCreated());
      test.done();
    });
  }

}
