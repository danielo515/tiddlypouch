(function (window) {
    'use strict';
    /***** Base TiddlyPouch module creation ****/
    const $TPouch = window.$TPouch || Object.create(null);
    if ($TPouch.supressBoot) { /** Allow external JS to avoid boot */
        return;
    }
    $TPouch._configDb = $TPouch._configDb || new PouchDB('__TP_config');
    $TPouch.splashScreen = $TPouch.splashScreen || Object.create(null);
    /*** The version section is automatically updated by build scripts,  Dont delete the below comment */
    $TPouch.VERSION = /***TPOUCH_VER*/'0.27.1'/*TPOUCH_VER***/;

    var $tw = window.$tw || Object.create(null);
    $tw.boot = $tw.boot || Object.create(null);
    $tw.boot.suppressBoot = true;

    window.$TPouch = $TPouch;
    window.$tw = $tw;

    /** Creates a new message node to be used on the splashScreen*/
    function createSplashMessageNode(message) {

        var h1 = document.createElement('h1');
        h1.setAttribute('data-text', message);
        var text = document.createTextNode(message);
        h1.appendChild(text);
        return h1;
    }

    function createSplashScreen(message) {

        /* This function waits until document.body exists*/
        function tryToAppend(node) {
            if (!document.body) {
                return setTimeout(tryToAppend.bind(null, node), 1);
            }
            document.body.appendChild(node, document.body.firstChild);
        }

        var splash = document.getElementById('TP_splash_screen');
        if (splash === null) {
            splash = document.createElement('div');
            splash.setAttribute('id', 'TP_splash_screen');
            splash.appendChild(createSplashMessageNode(message));
            tryToAppend(splash);
        } else {
            splashMessage(message);
        }

        $TPouch.splashScreen.node = splash;
    }
    /** Hides the splash screen allowing the cool css animation to execute*/
    $TPouch.splashScreen.hide = function hideSplashScreen() {
        /** We first set opacity to 0 to allow the css animations kick in
         * Two seconds later , when animation has finished
         * we set display to none so it does not takes space on the page.
         * Display none can not be animated, that's why we use opacity first.
        */
        $TPouch.splashScreen.node.style.opacity = 0;
        setTimeout(() => {

            $TPouch.splashScreen.node.style.display = 'none';
        }, 2000);

    };
    $TPouch.splashScreen.showMessage = function splashMessage(message) {

        var node = $TPouch.splashScreen.node;
        node.replaceChild(createSplashMessageNode(message), node.firstChild);
        node.style.display = 'block';
        node.style.opacity = 1;
    };

    /**
     * Checks if the current version on the database is lower than the current version
     * if so, it deletes all the indexes so they can be recreated
     * @param {string} version - The version of TiddlyPouch that the database being updated has
     * @param {PouchDB} db - The actual Pouch database that we are updating
     * @returns {promise} - promise that fulfills when all the indexes have been processed, removed or failed removing
     */
    function updater(version, db) {

        var documentsToRemove = [
            '_design/by_type',
            '_design/skinny_tiddlers',
            '_design/by_plugin_type',
            '_design/filtered_replication',
            '_design/TiddlyPouch',
            '_design/startup_tiddlers'
        ];

        if (version && !(parseInt(version.split('.').join('')) < parseInt($TPouch.VERSION.split('.').join('')))) {
            return Promise.resolve();
        }
        console.log('Starting update process...');
        $TPouch.splashScreen.showMessage('Updating database');
        return Promise.all(
            documentsToRemove
                .map((id) => {

                    return db.get(id)
                        .then((doc) => {
                            console.log('Removing index ', id);
                            return db.remove(doc);
                        })
                        .catch(console.log.bind(console, 'Error removing ', id, ' which may be totally fine if it did not exist.'));
                })
        )
            .then(() => {
                console.log('Update process complete');
            });
    }

    createSplashScreen('Loading');

    $TPouch._configDb.get('configuration') // we read the configuration to know which database should be loaded
        .then((config) => {

            if (!config.selectedDbId) {
                throw new Error('There is no DB selected, nothing to inject');
            }
            /** Create the default db, it should be wrapped later on the boot proces in a {@link DbStore} */
            $TPouch._db = new PouchDB(config.selectedDbId);
            var oldVer = config.databases[config.selectedDbId].version;
            return updater(oldVer, $TPouch._db)
                .then(() => { /** After the update process, flag the db with latest version */
                    config.databases[config.selectedDbId].version = $TPouch.VERSION;
                    return $TPouch._configDb.put(config);
                });
        })
        .then(() =>

            $TPouch._db.query('startup_tiddlers', { include_docs: true })
        )
        .then((all) => { //Actual docs are contained in the rows array

            console.log('Injecting ', all.total_rows, ' startup tiddlers into tw');
            var startupTids = all.rows.map((row) => row.doc.fields );
            window.$tw.preloadTiddlers = startupTids;
        }).catch((reason) => { // catch any possible error and continue the chain

            console.log('Something went wrong during plugin injection ', reason);
        }).then(() => {
            if ($tw.boot.boot) {
                $tw.boot.boot(); // boot when chain completes, even if we got some errors
            } else {
                console.log('Allowing TW boot itself....');
                $tw.boot.suppressBoot = false;
            }

        });

})(window);
