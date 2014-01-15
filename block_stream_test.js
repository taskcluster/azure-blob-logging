suite('stream', function() {
  var azure = require('azure');
  var blob = azure.createBlobService();
  var uuid = require('uuid');
  var BlockStream = require('./block_stream');

  var subject;
  var path = 'mytestfile.txt';
  var container;
  setup(function() {
    container = 'test-' + uuid.v4();
    subject = new BlockStream(blob, container, path);
  });

  // create the container on azure
  setup(function(done) {
    blob.createContainerIfNotExists(
      container,
      // allow any public GET operations
      { publicAccessLevel: 'container' },
      done
    );
  });

  // ensure we are always in a clean state
  teardown(function(done) {
    blob.deleteContainer(container, done);
  });

  suite('put some blocks', function() {
    var blockIds;
    var buffers = [
      // we dont want to fetch the contents of the chunk so we fetch
      // the size instead
      new Buffer('0'),
      new Buffer('000')
    ];

    setup(function(done) {
      blockIds = [];

      subject.on('data', function(blockId) {
        blockIds.push(blockId);
      });

      subject.on('end', done);

      // two distinct writes so we have two block ids.
      subject.write(buffers[0], null, function() {
        subject.end(buffers[1]);
      });
    });

    test('has block ids', function(done) {
      assert.equal(blockIds.length, 2);

      blockIds.forEach(function(id) {
        assert.ok(id.indexOf(path) !== -1);
      });

      var expected = [];

      buffers.forEach(function(buffer, idx) {
        var name = new Buffer(blockIds[idx]).toString('base64');
        var size = buffer.length;

        expected.push({
          Name: name,
          Size: size
        });
      });

      blob.listBlobBlocks(
        container,
        path,
        'all',
        function(err, list) {
          if (err) return done(err);
          var blocks = list.UncommittedBlocks;
          assert.deepEqual(expected, blocks);
          done();
        }
      );
    });
  });
});
