azure-blob-logging
==================

"Live" logging built on top of the azure blob  service.

Documentation is very sparse at a high level while I am tuning the performance...

## Strategy

The algorithm is very simple (dumb)

 - let node stream handle buffering/backpressure
 - write block (BlobBlock) and commit it in same write operation (_write in node streams)
 - now that block is readable
 
Due to how node streams work while we are writing the readable side will buffer its writes up to the high water mark.

## Example

```js
// XXX: name will change very soon
var AzureStream = require('azure-upload');

var azure = require('azure');
var blobService = azure.createBlobService();

var azureWriter = new AzureStream(
  blobService,
  'mycontainer',
  'myfile.txt'
);

// any kind of node readable stream here
var nodeStream;

nodeStream.pipe(azureWriter);
azureWriter.once('finish', function() {
  // yey data was written
  // get the url
  console.log(blobService.getBlobUrl('mycontainer', 'myfile.txt'));
});

```

## RANDOM NOTES

the `azure` module is very slow to load (330ms) and takes up 33mb of
memory (as of 0.7.19). We don't use very many azure blob api calls so
ideally we could extract (or help the primary lib extract) the url
signing part of authentication into its own lib and then just directly
call http for our operations... The ultimate goal here is to consume
around 5mb (including https overhead) of memory and load in under 20ms.

To correctly consume the url from azure the `x-ms-version` header must
be set to something like `2013-08-15` this allows open ended range
requests (`range: byte=500-`). In combination with etags (and if
conditions) we can build a very fast client (even a fast polling
client).
