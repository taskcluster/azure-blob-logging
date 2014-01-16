/**
This file is the abstract stream for both the block and commit streams.
*/
var stream = require('stream'),
    assert = require('assert'),
    Promise = require('promise');

/**
Initialize a stream to upload content to block blob storage.

@param {BlobService} service blob service from the azure module.
@param {String} container to upload into.
@param {String} blob to upload to.
@param {Object} [options] for the stream.
*/
function BlockStream(service, container, blob, options) {
  assert(service, 'service is required');
  assert(container, 'container is required');
  assert(blob, 'path is required');

  this.service = service;
  this.container = container;
  this.blob = blob;

  // incremented for each block pushed
  this._blockOffset = 0;

  // the previously committed blocks
  this._committedBlocks = [];

  stream.Writable.call(this, options);

  this._putBlock = Promise.denodeify(
    service.createBlobBlockFromText.bind(service)
  );

  this._commitBlocks = Promise.denodeify(
    service.commitBlobBlocks.bind(service)
  );
}

BlockStream.prototype = {
  __proto__: stream.Writable.prototype,

  _write: function(buffer, encoding, done) {
    var blockId = this.service.getBlockId(
      this.blob,
      this._blockOffset++
    );

    this._putBlock(
      blockId,
      this.container,
      this.blob,
      buffer
    ).then(
      function commitBlock() {
        // commits discard all blocks not listed by the commit so its important
        // to commit only while we are not also putting a block.

        var blockList = {
          // the blocks not yet seen in a commit
          UncommittedBlocks: [blockId]
        };

        if (this._committedBlocks.length) {
          // all the blocks we have already committed
          blockList.CommittedBlocks = this._committedBlocks;
        }

        return this._commitBlocks(
          this.container,
          this.blob,
          blockList,
          // XXX: This is a hack we should expose this as options
          { contentType: 'text/plain', contentEncoding: 'utf8' }
        );
      }.bind(this)
    ).then(
      function markBlockCommitted() {
        this._committedBlocks.push(blockId);
        done();
      }.bind(this),
      // handle errors
      done
    );
  }
};

module.exports = BlockStream;
