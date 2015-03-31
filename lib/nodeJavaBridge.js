'use strict';

process.env.PATH += require('../build/jvm_dll_path.json');

var _ = require('lodash');
var async = require('async');
var path = require('path');
var binaryPath = path.resolve(path.join(__dirname, "../build/Release/nodejavabridge_bindings.node"));
var bindings = require(binaryPath);

var java = module.exports = new bindings.Java();
java.classpath.push(path.resolve(__dirname, "../commons-lang3-node-java.jar"));
java.classpath.push(path.resolve(__dirname, __dirname, "../src-java"));
java.nativeBindingLocation = binaryPath;

var syncSuffix = undefined;
var asyncSuffix = undefined;

var SyncCall = function(obj, method) {
  if (syncSuffix === undefined)
    throw new Error('Sync call made before jvm created');
  var syncMethodName = method + syncSuffix;
  if (syncMethodName in obj)
    return obj[syncMethodName].bind(obj);
  else
    throw new Error('Sync method not found:' + syncMethodName);
}

java.isJvmCreated = function() {
  return typeof java.onJvmCreated !== 'function';
}

var clients = [];

// A client can register function hooks to be called before and after the JVM is created.
// If the client doesn't need to be called back for either function, it can pass null or undefined.
java.registerClient = function(before, after) {
  if (java.isJvmCreated()) {
    throw new Error('java.registerClient() called after JVM already created.');
  }
  clients.push({before: before, after: after});
}

function runBeforeHooks(done) {
  async.series(_.filter(_.pluck(clients, 'before')), done);
}

function createJVMAsync(callback) {
  var ignore = java.newLong(0); // called just for the side effect that it will create the JVM
  callback();
}

function runAfterHooks(done) {
  async.series(_.filter(_.pluck(clients, 'after')), done);
}

function initializeAll(done) {
  async.series([runBeforeHooks, createJVMAsync, runAfterHooks], done);
}

// This function launches the JVM asynchronously. The application can be notified
// when the JVM is fully created via either a node callback function, or via a promise.
// If the parameter `callback` is provided, it is assume be a node callback function.
// If the parameter is not provided, and java.asyncOptions.promisify has been specified,
// then this function will return a promise, by promisifying itself and then calling that
// promisified function.
java.launchJvm = function(callback) {

  // First see if the promise-style API should be used.
  // This must be done first in order to ensure the proper API is used.
  if (_.isUndefined(callback) && java.asyncOptions && _.isFunction(java.asyncOptions.promisify)) {
    // Create a promisified version of this function.
    var launchJvmPromise = java.asyncOptions.promisify(java.launchJvm.bind(java));
    // Call the promisified function, returning its result, which should be a promise.
    return launchJvmPromise();
  }

  // Now check if the JVM has already been created, and if so return an error.
  else if (java.isJvmCreated()) {
    return setImmediate(callback, new Error('java.launchJvm(cb) called after JVM already created.'));
  }

  // If we get here, callback must be a node-style callback function. If not, return an error.
  else if (!_.isFunction(callback)) {
    return setImmediate(callback, new Error('java.launchJvm(cb) requires its one argument to be a callback function.'));
  }

  // Finally, queue the initializeAll function.
  else {
    return setImmediate(initializeAll, callback);
  }
}

java.onJvmCreated = function() {
  if (java.asyncOptions) {
    syncSuffix = java.asyncOptions.syncSuffix;
    asyncSuffix = java.asyncOptions.asyncSuffix;
    if (typeof syncSuffix !== 'string') {
      throw new Error('In asyncOptions, syncSuffix must be defined and must a string');
    }
    var promiseSuffix = java.asyncOptions.promiseSuffix;
    var promisify = java.asyncOptions.promisify;
    if (typeof promiseSuffix === 'string' && typeof promisify === 'function') {
      var methods = ['newInstance', 'callMethod', 'callStaticMethod'];
      methods.forEach(function (name) {
        java[name + promiseSuffix] = promisify(java[name]);
      });
    } else if (typeof promiseSuffix === 'undefined' && typeof promisify === 'undefined') {
      // no promises
    } else {
      throw new Error('In asyncOptions, if either promiseSuffix or promisify is defined, both most be.');
    }
  } else {
    syncSuffix = 'Sync';
    asyncSuffix = '';
  }
}

var MODIFIER_PUBLIC = 1;
var MODIFIER_STATIC = 8;


java.import = function(name) {
  var clazz = java.findClassSync(name); // TODO: change to Class.forName when classloader issue is resolved.
  var result = function() {
    var args = [name];
    for (var i = 0; i < arguments.length; i++) {
      args.push(arguments[i]);
    }
    return java.newInstanceSync.apply(java, args);
  };
  var i;

  result.class = clazz;

  // copy static fields
  var fields = SyncCall(clazz, 'getDeclaredFields')();
  for (i = 0; i < fields.length; i++) {
    var modifiers = SyncCall(fields[i], 'getModifiers')();
    if (((modifiers & MODIFIER_PUBLIC) === MODIFIER_PUBLIC)
      && ((modifiers & MODIFIER_STATIC) === MODIFIER_STATIC)) {
      var fieldName = SyncCall(fields[i], 'getName')();
      result.__defineGetter__(fieldName, function(name, fieldName) {
        return java.getStaticFieldValue(name, fieldName);
      }.bind(this, name, fieldName));
      result.__defineSetter__(fieldName, function(name, fieldName, val) {
        java.setStaticFieldValue(name, fieldName, val);
      }.bind(this, name, fieldName));
    }
  }

  var promisify = undefined;
  var promiseSuffix;
  if (java.asyncOptions && java.asyncOptions.promisify) {
    promisify = java.asyncOptions.promisify;
    promiseSuffix = java.asyncOptions.promiseSuffix;
  }

  // copy static methods
  var methods = SyncCall(clazz, 'getDeclaredMethods')();
  for (i = 0; i < methods.length; i++) {
    var modifiers = SyncCall(methods[i], 'getModifiers')();
    if (((modifiers & MODIFIER_PUBLIC) === MODIFIER_PUBLIC)
      && ((modifiers & MODIFIER_STATIC) === MODIFIER_STATIC)) {
      var methodName = SyncCall(methods[i], 'getName')();
      result[methodName + syncSuffix] = java.callStaticMethodSync.bind(java, name, methodName);
      if (typeof asyncSuffix === 'string') {
        result[methodName + asyncSuffix] = java.callStaticMethod.bind(java, name, methodName);
      }
      if (promisify) {
        result[methodName + promiseSuffix] = promisify(java.callStaticMethod.bind(java, name, methodName));
      }
    }
  }

  // copy static classes/enums
  var classes = SyncCall(clazz, 'getDeclaredClasses')();
  for (i = 0; i < classes.length; i++) {
    var modifiers = SyncCall(classes[i], 'getModifiers')();
    if (((modifiers & MODIFIER_PUBLIC) === MODIFIER_PUBLIC)
      && ((modifiers & MODIFIER_STATIC) === MODIFIER_STATIC)) {
      var className = SyncCall(classes[i], 'getName')();
      var simpleName = SyncCall(classes[i], 'getSimpleName')();
      Object.defineProperty(result, simpleName, {
        get: function(result, simpleName, className) {
          var c = java.import(className);

          // memoize the import
          var d = Object.getOwnPropertyDescriptor(result, simpleName);
          d.get = function(c) { return c; }.bind(null, c);
          Object.defineProperty(result, simpleName, d);

          return c;
        }.bind(this, result, simpleName, className),
        enumerable: true,
        configurable: true
      });
    }
  }

  return result;
};
