/**
This file is the abstract stream for both the block and commit streams.
*/
var stream = require('stream'),
    assert = require('assert');

/**
Initialize a stream to upload content to block blob storage.

@param {BlobService} service blob service from the azure module.
@param {String} container to upload into.
@param {String} path to upload to.
@param {Object} [options] for the stream.
*/
function AzureStream(service, container, path, options) {
  stream.Transform.call(this, options);

  assert(service, 'service is required');
  assert(container, 'must pass container');
  assert(path, 'must provide path');

  this.service = service;
  this.container = container;
  this.path = path;
}

AzureStream.prototype = {
  __proto__: stream.Transform.prototype
};

module.exports = AzureStream;
