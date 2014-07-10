var azure = require('azure-storage');
var co = require('co');
var fs = require('fs');
var uuid = require('uuid');
var service = azure.createBlobService();

var BlockStream = require('../');
var Promise = require('promise');

function thunkEvent(listener, event) {
  return function(callback) {
    listener.once(event, callback.bind(this, null));
  };
}

co(function* () {
  if (process.env.DEBUG) {
    service.logger = new azure.Logger(azure.Logger.LogLevels.DEBUG);
  }

  var path = uuid.v4() + '-mycommitfile.txt';
  var container = 'benchmark-testing';
  var stream = new BlockStream(service, container, path);

  console.log('writing to url:', service.getUrl(container, path));

  yield service.createContainerIfNotExists.bind(service, container, {
    publicAccessLevel: 'container'
  });

  // Total number of incremental writes to make...
  var pendingWrites = 100;

  stream.on('write performance', function(time) {
    console.log(
      'write done in %d ms pending: %s',
      time, stream._writableState.buffer.length
    );
  });

  function write(callback) {
    var nth = pendingWrites--;

    // We are getting a rough measure of latency and stream throughput. So size
    // of the write should not matter too much here.
    var writeStartTime = Date.now();
    stream.write(new Buffer('xfoo\n woot\n do stuff\n'));

    // issue another write _without_ waiting for the write to finish (or not
    // finish but also not in the same tick of the event loop.
    if (pendingWrites) {
      // Space each write out 100ms
      setTimeout(write, 100, callback);
    } else {
      callback();
    }
  }

  // Begin the async write loop.
  var start = Date.now();
  yield write.bind(this);

  // Wait for all the writes to finish...
  yield stream.end.bind(stream);
  console.log('Finished all writes in %s', Date.now() - start);

})(function() {
  console.log('!! done');
});
