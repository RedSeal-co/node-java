'use strict';

var java = require('../testHelpers').java;

var nodeunit = require('nodeunit');
var util = require('util');

exports['varargs'] = nodeunit.testCase({

  'variadic no args': function(test) {
    test.expect(1);
    var String = java.import('java.lang.String');
    test.strictEqual(String.formatSync('nothing'), 'nothing');
    test.done();
  },

  'variadic one args': function(test) {
    test.expect(1);
    var String = java.import('java.lang.String');
    test.strictEqual(String.formatSync('%s', 'hello'), 'hello');
    test.done();
  },

  'variadic two args': function(test) {
    test.expect(1);
    var String = java.import('java.lang.String');
    test.strictEqual(String.formatSync('%s--%s', 'hello', 'world'), 'hello--world');
    test.done();
  },

  // These simple array tests pass because String.format takes an Object... varargs parameter.
  // The current node-java bridge converts a plain javascript array to an Object[] array.
  // TODO: consider an enhancement that detects the best common base type.
  'simple array no args, passed to Object... varargs argument': function(test) {
    test.expect(1);
    var String = java.import('java.lang.String');
    test.strictEqual(String.formatSync('nothing', []), 'nothing');
    test.done();
  },

  'simple array one args, passed to Object... varargs argument': function(test) {
    test.expect(1);
    var String = java.import('java.lang.String');
    test.strictEqual(String.formatSync('%s', ['hello']), 'hello');
    test.done();
  },

  'simple array two args, passed to Object... varargs argument': function(test) {
    test.expect(1);
    var String = java.import('java.lang.String');
    test.strictEqual(String.formatSync('%s--%s', ['hello', 'world']), 'hello--world');
    test.done();
  },

  // These newArray tests fail because String.format takes an Object... varargs parameter,
  // add we pass a String[]
//   'newArray no args': function(test) {
//     test.expect(1);
//     var String = java.import('java.lang.String');
//     test.strictEqual(String.formatSync('nothing', java.newArray('java.lang.String', [])), 'nothing');
//     test.done();
//   },
//
//   'newArray one args': function(test) {
//     test.expect(1);
//     var String = java.import('java.lang.String');
//     test.strictEqual(String.formatSync('%s', java.newArray('java.lang.String', ['hello'])), 'hello');
//     test.done();
//   },
//
//   'newArray two args': function(test) {
//     test.expect(1);
//     var String = java.import('java.lang.String');
//     test.strictEqual(String.formatSync('%s--%s', java.newArray('java.lang.String', ['hello', 'world'])), 'hello--world');
//     test.done();
//   },

  'newArray(Object) no args passed': function(test) {
    test.expect(1);
    var String = java.import('java.lang.String');
    test.strictEqual(String.formatSync('nothing', java.newArray('java.lang.Object', [])), 'nothing');
    test.done();
  },

  'newArray(Object) one args': function(test) {
    test.expect(1);
    var String = java.import('java.lang.String');
    test.strictEqual(String.formatSync('%s', java.newArray('java.lang.Object', ['hello'])), 'hello');
    test.done();
  },

  'newArray(Object) two args': function(test) {
    test.expect(1);
    var String = java.import('java.lang.String');
    test.strictEqual(String.formatSync('%s--%s', java.newArray('java.lang.Object', ['hello', 'world'])), 'hello--world');
    test.done();
  },

  'Call static method with variadic varargs': function(test) {
    test.expect(4);
    var Test = java.import('Test');
    test.equal(Test.staticVarargsSync(5), '5');
    test.equal(Test.staticVarargsSync(5, 'a'), '5a');
    test.equal(Test.staticVarargsSync(5, 'a', 'b'), '5ab');
    test.equal(Test.staticVarargsSync(5, 'a', 'b', 'c'), '5abc');
    test.done();
  },

// This test fails because Test.staticVarargsSync requires a String[] varargs array, but
// the current node-java bridge converts a plain javascript array to an Object[] array.
// TODO: consider an enhancement that detects the best common base type.
//   'Call static varargs method with plain array': function(test) {
//     test.expect(3);
//     var Test = java.import('Test');
//     test.equal(Test.staticVarargsSync(5, ['a']), '5a');
//     test.equal(Test.staticVarargsSync(5, ['a', 'b']), '5ab');
//     test.equal(Test.staticVarargsSync(5, ['a', 'b', 'c']), '5abc');
//     test.done();
//   },

  'Call static varags method with newArray': function(test) {
    test.expect(2);
    var Test = java.import('Test');
    test.equal(Test.staticVarargsSync(5, java.newArray('java.lang.String', ['a'])), '5a');
    test.equal(Test.staticVarargsSync(5, java.newArray('java.lang.String', ['a', 'b', 'c'])), '5abc');
    test.done();
  }

});
