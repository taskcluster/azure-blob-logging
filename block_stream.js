var stream = require('stream'),
    azure = require('azure'),
    assert = require('assert');

/**
Initialize a stream to upload content to block blob storage.

@param {BlobService} service blob service from the azure module.
@param {String} container to upload into.
@param {String} path to upload to.
@param {Object} [options] for the stream.
*/
function BlockStream(service, container, path, options) {
  stream.Transform.call(this, options);

  assert(service, 'service is required');
  assert(container, 'must pass container');
  assert(path, 'must provide path');

  this.service = service;
  this.container = container;
  this.path = path;


  // incremented for each block pushed
  this._blockOffset = 0;

  this._readableState.objectMode = true;
}

BlockStream.prototype = {
  __proto__: stream.Transform.prototype,

  _transform: function(buffer, encoding, done) {
    var blockId = this.service.getBlockId(
      this.path,
      this._blockOffset++
    );

    this.service.createBlobBlockFromText(
      blockId,
      this.container,
      this.path,
      buffer,
      function handleBlockUpload(err) {
        // let the stream handle the error
        if (err) return done();

        // add the block to the commit list
        this.push(blockId);

        // notify that a commit can be made
        done();
      }.bind(this)
    );
  }
};

module.exports = BlockStream;
