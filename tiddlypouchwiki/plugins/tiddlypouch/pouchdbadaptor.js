/*\
title: $:/plugins/danielo515/tiddlypouch/pouchadaptor.js
type: application/javascript
module-type: syncadaptor

A sync adaptor module for synchronising with local PouchDB

\*/
(function(){

/*jslint node: false, browser: true */
/*global $tw: false */
"use strict";

// var CONFIG_PREFIX = "$:/plugins/wshallum/PouchAdaptor/config/";
var debug_mode=true;

function PouchAdaptor(options) {
	this.wiki = options.wiki;
	this.logger = new $tw.utils.Logger("PouchAdaptor");
	// this.readConfig();
}

/*
Reads config and sets up URLs.
*/
PouchAdaptor.prototype.readConfig = function() {
	var url = this.wiki.getTiddlerText(CONFIG_PREFIX + "Url", "AUTO").trim(),
	    designDocName = this.wiki.getTiddlerText(CONFIG_PREFIX + "DesignDocumentName", "AUTO").trim(),
	    requiresWithCreds = this.wiki.getTiddlerText(CONFIG_PREFIX + "RequiresWithCredentials", "no").trim(),
	    docUrl = document.location.href,
	    pathParts = document.location.pathname.split("/");
	if (url === "AUTO") {
		// assume loaded as PREFIX/_design/DESIGNDOCNAME/HTMLFILENAME
		this.urlPrefix = pathParts.slice(0, -3).join("/");
		if (designDocName === "AUTO") {
			this.designDocName = pathParts[pathParts.length - 2];
		}
		else {
			this.designDocName = designDocName;
		}
		this.sessionUrl = '/_session';
	}
	else {
		this.urlPrefix = url;
		if (this.urlPrefix.substring(this.urlPrefix.length - 1) === "/") {
			this.urlPrefix = this.urlPrefix.substring(0, this.urlPrefix.length - 1);
		}
		if (designDocName === "AUTO") {
			// there is no sensible way to "AUTO" a design document name from a custom URL
			// so just use the default
			this.designDocName = "tw";
		}
		else {
			this.designDocName = designDocName;
		}
		// urlPrefix is ...../dbname so _session is obtained by replacing the dbname with _session
		this.sessionUrl = this.urlPrefix.substring(0, this.urlPrefix.lastIndexOf("/")) + "/_session";
	}
	this.xhrNeedsWithCredentials = (requiresWithCreds === "yes");
};

PouchAdaptor.prototype.getUrlForTitle = function(title) {
	return this.urlPrefix +  "/" + encodeURIComponent(this.mangleTitle(title));
};

PouchAdaptor.prototype.getUrlForView = function(viewName) {
	return this.urlPrefix +  "/_design/" + this.designDocName + "/_view/" + viewName;
};

/*
Copied from TiddlyWiki5 core/modules/utils/dom/http.js to add support for xhr.withCredentials
*/
function httpRequest(options) {
	var type = options.type || "GET",
		headers = options.headers || {accept: "application/json"},
		request = new XMLHttpRequest(),
		data = "",
		f,results;
	// Massage the data hashmap into a string
	if(options.data) {
		if(typeof options.data === "string") { // Already a string
			data = options.data;
		} else { // A hashmap of strings
			results = [];
			$tw.utils.each(options.data,function(dataItem,dataItemTitle) {
				results.push(dataItemTitle + "=" + encodeURIComponent(dataItem));
			});
			data = results.join("&");
		}
	}
	// for CORS if required
	if (options.withCredentials) {
		request.withCredentials = true;
	}
	// Set up the state change handler
	request.onreadystatechange = function() {
		if(this.readyState === 4) {
			if(this.status === 200 || this.status === 201 || this.status === 204) {
				// Success!
				options.callback(null,this.responseText,this);
				return;
			}
		// Something went wrong
		options.callback("XMLHttpRequest error code: " + this.status);
		}
	};
	// Make the request
	request.open(type,options.url,true);
	if(headers) {
		$tw.utils.each(headers,function(header,headerTitle,object) {
			request.setRequestHeader(headerTitle,header);
		});
	}
	if(data && !$tw.utils.hop(headers,"Content-type")) {
		request.setRequestHeader("Content-type","application/x-www-form-urlencoded; charset=UTF-8");
	}
	request.send(data);
	return request;
};

/*
getTiddlerInfo(tiddler)
getSkinnyTiddlers(callback(err,data)) data is array of {title: ..., revision: ...}
saveTiddler(tiddler, callback(err, adaptorInfo, revision), options) options has options.tiddlerInfo
deleteTiddler(title, callback(err), options) options has options.tiddlerInfo
*/

PouchAdaptor.prototype.getTiddlerInfo = function(tiddler) {
	return {_rev: tiddler.fields.revision};
};


PouchAdaptor.prototype.getSkinnyTiddlers = function(callback) {
	var self = this;
    $tw.TiddlyPouch.database.query("tw/skinny-tiddlers").then(function (tiddlersList) {
        var tiddlers = tiddlersList.rows
        console.log("Skinnytiddlers: ",tiddlers);
        for(var i=0; i < tiddlers.length; i++) {
				tiddlers[i] = self.convertFromSkinnyTiddler(tiddlers[i]);
			}
        callback(null, tiddlers);
        }).catch(function (err) {
            // some error
            });

};

PouchAdaptor.prototype.saveTiddler = function(tiddler, callback, options) {
	var self = this;
	var convertedTiddler = this.convertToCouch(tiddler);
	var tiddlerInfo = options.tiddlerInfo;
	if (tiddlerInfo.adaptorInfo && tiddlerInfo.adaptorInfo._rev) {
        delete convertedTiddler._rev;
		convertedTiddler._rev = tiddlerInfo.adaptorInfo._rev;
	}
    debug_mode && console.log(tiddlerInfo);
    this.logger.log("Saving ",convertedTiddler);
    $tw.TiddlyPouch.database.put(convertedTiddler,function (error, saveInfo) {
        if (error) {
            // oh noes! we got an error
            console.log(error);
            callback(error);
        } else {
            callback(null,{ _rev: saveInfo.rev}, saveInfo.rev);
               }
    });
};

PouchAdaptor.prototype.loadTiddler = function(title, callback) {
	var self = this;
    $tw.TiddlyPouch.database.get(title, function (error, doc) {
      if (error) {
        callback(error);
      } else {
        // okay, doc contains our document
        callback(null, self.convertFromCouch(doc));
      }
    });
};

/*
CouchDB does not like document IDs starting with '_'.
Convert leading '_' to '%5f' and leading '%' to '%25'
Only used to compute _id / URL for a tiddler. Does not affect 'title' field.
*/
PouchAdaptor.prototype.mangleTitle = function(title) {
	if (title.length == 0) {
		return title;
	}
	var firstChar = title.charAt(0);
	var restOfIt = title.substring(1);
	if (firstChar === '_') {
		return '%5f' + restOfIt;
	}
	else if (firstChar === '%') {
		return '%25' + restOfIt;
	}
	else {
		return title;
	}
}

/*
Reverse what mangleTitle does. Used to obtain title from _id (in convertFromSkinnyTiddler).
*/
PouchAdaptor.prototype.demangleTitle = function(title) {
	if (title.length < 3) {
		return title;
	}
	var firstThree = title.substring(0, 3);
	var restOfIt = title.substring(3);
	if (firstThree === '%5f') {
		return '_' + restOfIt;
	}
	else if (firstThree === '%25') {
		return '%' + restOfIt;
	}
	else {
		return title;
	}
}

PouchAdaptor.prototype.deleteTiddler = function(title, callback, options) {
	var self = this;
	if (!options.tiddlerInfo || !options.tiddlerInfo.adaptorInfo || typeof options.tiddlerInfo.adaptorInfo._rev == "undefined") {
		/* not on server, just return OK */
		callback(null);
	}
    $tw.TiddlyPouch.database.get(title).then(function (doc) {
        return $tw.TiddlyPouch.database.remove(doc);
    }).then(function(){callback(null)}).catch(
        function(err){ callback(err)}
    );
};

/* The response should include the tiddler fields as an object in the value property*/
PouchAdaptor.prototype.convertFromSkinnyTiddler = function(row) {
	row.value.title=this.demangleTitle(row.id); //inject the title because is not included in the fields
	return row.value;
}


/*
 * Copy all fields to "fields" sub-object except for the "revision" field.
 * See also: TiddlyWebAdaptor.prototype.convertTiddlerToTiddlyWebFormat.
 */
PouchAdaptor.prototype.convertToCouch = function(tiddler) {
	var result = { fields: {} };
	if (tiddler) {
		$tw.utils.each(tiddler.fields,function(element,title,object) {
			if (title === "revision") {
				/* do not store revision as a field */
				return;
			}
			if(title === "_attachments" && !tiddler.isDraft()){
			  //Since the draft and the original tiddler are not the same document
				//the draft does not has the attachments
					result._attachments = element; //attachments should be stored out of fields object
				return;
			}
			// Convert fields to string except for tags, which
			// must stay as an array.
			// Fields that must be properly stringified include:
			// modified, created (see boot/boot.js)
			var fieldString = title === "tags" ?
				tiddler.fields.tags :
				tiddler.getFieldString(title);
			result.fields[title] = fieldString;
		});
	}
	// Default the content type
	result.fields.type = result.fields.type || "text/vnd.tiddlywiki";
    result._id = tiddler.fields.title;
    result._rev = tiddler.fields.revision; //Temporary workaround. Remove
	return result;
}

/* for this version just copy all fields across except _rev and _id */
PouchAdaptor.prototype.convertFromCouch = function(tiddlerFields) {
	var self = this, result = {};
    console.log("Converting from ",tiddlerFields);
	// Transfer the fields, pulling down the `fields` hashmap
	$tw.utils.each(tiddlerFields, function(element, title, object) {
		if(title === "fields") {
			$tw.utils.each(element,function(element, subTitle, object) {
				result[subTitle] = element;
			});
		} else if (title === "_id" || title === "_rev") {
			/* skip these */
		} else {
			result[title] = tiddlerFields[title];
		}
	});
	result["revision"] = tiddlerFields["_rev"];
    console.log("Conversion result ",result);
	return result;
}

/* --- TEMP COMMENTED 
PouchAdaptor.prototype.getStatus = function(callback) {
	httpRequest({
		url: this.sessionUrl,
		withCredentials: this.xhrNeedsWithCredentials,
		callback: function(err, data) {
			if (err) {
				return callback(err);
			}
			var json = null;
			var isLoggedIn = false;
			var username = null;
			try {
				json = JSON.parse(data);
			} catch (e) {
			}
			if (json && json.userCtx) {
				username = json.userCtx.name;
				isLoggedIn = (username !== null);
				if (!isLoggedIn && json.userCtx.roles.length == 1 && json.userCtx.roles[0] === '_admin') {
					/* admin party mode */
/* --- TEMP COMMENTED                     
					isLoggedIn = true;
				}
			}
			callback(null, isLoggedIn, username);
		}
	});
}

PouchAdaptor.prototype.login = function(username, password, callback) {
	var options = {
		url: this.sessionUrl,
		type: "POST",
		data: {
			name: username,
			password: password
		},
		withCredentials: this.xhrNeedsWithCredentials,
		callback: function(err, data) {
			callback(err);
		}
	};
	httpRequest(options);
}

PouchAdaptor.prototype.logout = function(callback) {
	var options = {
		url: this.sessionUrl,
		type: "DELETE",
		withCredentials: this.xhrNeedsWithCredentials,
		callback: function(err) {
			callback(err);
		}
	};
	httpRequest(options);
}



PouchAdaptor.prototype.loadSystemTiddlers = function(callback) {
	var self = this;
	httpRequest({
		// according to the Unicode Collation CouchDB uses, after "/" is "\"
		url: this.getUrlForView("skinny-tiddlers") + "?include_docs=true&startkey=\"$:/\"&endkey=\"$:\\\\\"&inclusive_end=false",
		withCredentials: this.xhrNeedsWithCredentials,
		callback: function(err, data) {
			// Check for errors
			if(err) {
				self.logger.alert("Error in loadSystemTiddlers:", err);
				return callback(err);
			}
			// Process the tiddlers
			var tiddlers = JSON.parse(data).rows;
			var convertedTiddlers = [];
			for(var i=0; i < tiddlers.length; i++) {
				// just in case the filter on the view isn't good enough
				if (tiddlers[i].id.indexOf("$:/") === 0) {
					convertedTiddlers.push(self.convertFromCouch(tiddlers[i].doc));
				}
			}
			// Invoke the callback
			callback(null, convertedTiddlers);
		}
	});
}
--- END TEMPT COMMENT */ 

if($tw.browser && $tw.TiddlyPouch.database) {
    /*Only works if we are on browser and there is a database*/
	exports.adaptorClass = PouchAdaptor;
}

})();
