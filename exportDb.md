This is just a note to myself to remember how was I exporting the database

```js
  var options = {
    variables:
    {
      filename: $TPouch.config.currentDB.getName() + '.json'
    }
  };
  var allTiddlers = [];
  var self = this;
  // There is no other way to get all the documents except the desig ones http://stackoverflow.com/a/25744823/1734815
  Promise.all([ /** get all documents except the design ones */
    $TPouch.database._db.allDocs({ include_docs: true, endkey: '_design' }),
    $TPouch.database._db.allDocs({ include_docs: true, startkey: '_design\uffff' })
  ])
    .then(function (allDocuments) {
      return allDocuments[0].rows.concat(allDocuments[1].rows);
    })
    .then(function (allDocuments) {
      allDocuments.forEach(function (row) {
        allTiddlers.push($TPouch.database._convertFromCouch(row.doc));
      });
      var toDownload = JSON.stringify(allTiddlers, null, $tw.config.preferences.jsonSpaces);
      self.downloader.save(toDownload, method, callback, options);
    });
````
