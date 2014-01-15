var AzureStream = require('./azure_stream');


function BlockStream() {
  AzureStream.apply(this, arguments);

  // incremented for each block pushed
  this._blockOffset = 0;
  // the output is the block id (an object / not buffer)
  this._readableState.objectMode = true;
}

BlockStream.prototype = {
  __proto__: AzureStream.prototype,

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
