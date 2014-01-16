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
