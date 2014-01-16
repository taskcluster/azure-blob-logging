suite('stream', function() {
  var azure = require('azure');
  var retryOperations = new azure.ExponentialRetryPolicyFilter();
  var blob = azure.createBlobService().withFilter(retryOperations);
  var https = require('https');
  var fs = require('fs');
  var uuid = require('uuid');
  var BlockStream = require('./block_stream');
  var Promise = require('promise');

  if (process.env.DEBUG) {
    blob.logger = new azure.Logger(azure.Logger.LogLevels.DEBUG);
  }

  /**
  Use the node http client to fetch the entire contents of the azure upload.
  */
  function fetchContents() {
    var promise = new Promise(function(accept, reject) {
      var url = blob.getBlobUrl(container, path);
      var buffer = new Buffer(0);
      var req = https.get(url, function(res) {
        if (!res.headers[BlockStream.COMPLETE_HEADER]) {
          console.log(
            'retrying fetching of resources wanted %s bytes got %s bytes',
            expectedLen,
            len
          );
          req.abort();
          return setTimeout(
            fetchContents,
            100,
            function() {
              fetchContents().then(accept, reject);
            }
          );
        }

        res.on('data', function(incoming) {
          buffer = Buffer.concat([buffer, incoming]);
        });

        res.on('end', function() {
          accept({
            content: buffer,
            headers: res.headers
          });
        });
      }).once('error', reject);
    });

    return promise;
  }

  var subject;
  var path = 'mycommitfile.txt';
  var container;
  setup(function() {
    container = uuid.v4();
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

  var fixture = __dirname + '/test/fixtures/travis_log.txt';
  suite('upload an entire file', function() {

    // setup the stream
    var blockStream;
    var manager;
    setup(function(done) {
      var url = blob.getBlobUrl(container, path);
      blockSteam = new BlockStream(
        blob,
        container,
        path
      );

      fs.createReadStream(fixture).pipe(blockSteam);

      blockSteam.once('close', done).
                 once('error', done);
    });

    test('read contents', function() {
      var expected = fs.readFileSync(fixture);
      return fetchContents().then(
        function(result) {
          var headers = result.headers;
          var content = result.content.toString();

          // content is valid
          assert.equal(expected.toString(), content);

          assert.equal(
            headers['content-type'],
            blockSteam.contentType
          );

          assert.equal(
            headers['content-encoding'],
            blockSteam.contentEncoding
          );
        }
      );
    });
  });
});

