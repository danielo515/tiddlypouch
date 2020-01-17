# Tiddlypouch plugin for tiddlywiki
This is the repository of the tiddlypouch plugin for tiddlywiki.
This plugin adds a layer between pouchdb and tiddlywiki to store tiddlers as documents on a pouchdb database.
This plugin is a key and core part of the NoteSelf project.

## Development
This repository uses gulp to bundle the code and make it ready for tiddlywiki usage.
Due to the special requirements of tiddlywiki the development process is a little bit special.
Normal code lives under the `src` folder, but we compile it to `dist` and tell tiddlywiki to look for it there using `TIDDLYWIKI_PLUGIN_PATH`. When live-reload is active every change on `src` file will trigger a rebundle to `dist` folder.
We also use `tw-pouchdb` **npm package** as a direct dependency.

To start the dev process just run `yarn start` or `npm start`

### Structure of the code
All the code is under the `src/plugins/danielo515/tiddlypouch` folder.
This is how the build system was created a long time ago and works, so it will not be changed soon.

### Life-cycle code
Life-cycle related code is under `../startup`.
Here you will find configuration startup, sync methods declarations and initializations, splash screen removal, event listeners such as delete
database and so on.
This is required because this is quite a low level plugin and needs to hook up into several tiddlywiki internals.
