/********************************************************************
 * README
 ********************************************************************
 *
 * This gulp file bundles a tiddlywiki plugin folder as a tid file
 * that may be installed in a wiki using drag & drop. In production
 * mode, all styles and scripts are uglified and docs are produced.
 *
 * ------------------------------------------------------------------
 *
 * Usage: gulp [OPTION...]
 *
 * Options:
 *   --production    Run in production mode
 *   --mode          The mode of the compilation, e.g. "develop" or
 *                   "testing". The mode will be inserted into
 *                   the version string (e.g. "1.2.5-develop+371").
 *                   Exception: If mode is "master", then it will
 *                   be ignored and not added to the version string.
 *
 * ------------------------------------------------------------------
 *
 * The following directory structure is required by the script:
 *
 * src
 * ├── plugins
 * │   └── <author>
 * │       └── <pluginname>
 * │           ├── plugin.info
 * │           └── * // all further plugin files and folders
 * └── jsdoc
 *     └── * // jsdoc settings
 *
 * ------------------------------------------------------------------
 *
 * The following output is produced
 *
 * dist
 * └── <author>
 *     └── <pluginname>
 *         ├── plugin.info
 *         └── * // compiled plugin files
 *
 * bundle
 * └── <pluginname>_<version>.json // bundled plugin for drag & drop
 *
 * docs
 * └── * // docs generated by jsdoc
 *
 *******************************************************************/

/**** Script config ************************************************/

// the author and pluginname; lowercase letters and no spaces!
var authorName = 'danielo515';
var pluginName = 'tiddlypouch';

// whether or not to create/increment the build number automatically
var isIncrBuild = true;

/**** Imports ******************************************************/

// node modules

var path = require('path');
var util = require('util');
var fs = require('fs');

// additional modules

var tw = require('tiddlywiki');
var argv = require('yargs').argv;
var del = require('del');
// why on earth is fs.exists depreciated anyway by node?
var exists = require('is-there');
var SemVer = require('semver');
// once gulp 4.0 is out: remove runSequence and update
var runSequence = require('run-sequence');
import babel from 'gulp-babel';
import sourcemaps from 'gulp-sourcemaps';
var gulp = require('gulp');
var gulpif = require('gulp-if');
var gutil = require('gulp-util');
var sass = require('gulp-sass');
var replace = require('gulp-replace');
var uglify = require('gulp-uglify');
var jsdoc = require('gulp-jsdoc3');
var esprima = require('gulp-esprima');
var debug = require('gulp-debug');
var tag_version = require('gulp-tag-version');
var watch = require('gulp-watch');

/**** Preprocessing ************************************************/

var pluginSrc = './src/plugins/';
var pluginNamespace = authorName + '/' + pluginName; // no trailing slash!
var pluginTiddler = '$:/plugins/' + pluginNamespace;
var pluginInfoPath = path.resolve(pluginSrc, pluginNamespace, 'plugin.info');
var pluginInfo = JSON.parse(fs.readFileSync(pluginInfoPath, 'utf8'));
var pckgJSON = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
var updaterSrc = './src/plugins/danielo515/tiddlypouch/boot/boot.html.tid';
var updater = fs.readFileSync(updaterSrc, 'utf8');

// build paths where we output our results
var outPath = {
  bundle: './bundle/',
  dist: './dist/',
  docs: './docs/',
  maps: './maps/'
};

// a quick sanity check
if (pluginTiddler !== pluginInfo.title) {
  var msg = 'Gulp settings do not match the plugin.info';
  throw new Error(msg);
}

/**** Replacements *************************************************/

var replaceAfterSass = {
  '__breakpoint__': '{{$:/themes/tiddlywiki/vanilla/metrics/sidebarbreakpoint}}'
};

/**** Helper functions *********************/

function bumpVersion(){

  console.log('Bumping from version ', pluginInfo.version);
  var v = new SemVer(pluginInfo.version);
  var build = (isIncrBuild ? '+' + (parseInt(v.build[0] || 0) + 1) : '');
  var bump_type = argv.major ? 'major' : argv.minor ? 'minor' : argv.patch ? 'patch' : 'prerelease';
  v.inc(bump_type);
  pluginInfo.version = v.version;
  pluginInfo.released = new Date().toUTCString();
  pckgJSON.version = pluginInfo.version;

  updater = updater.replace(/\/\**TPOUCH_VER.*\*\// , '/***TPOUCH_VER*/\'' + pluginInfo.version + '\'/*TPOUCH_VER***/');

  fs.writeFileSync(pluginInfoPath, JSON.stringify(pluginInfo, null, 4));
  fs.writeFileSync('./package.json', JSON.stringify(pckgJSON,null,4));
  fs.writeFileSync(updaterSrc,updater);
  console.log('New version is', pluginInfo.version);
}


/**** Tasks ********************************************************/

/**
 * Remove all output paths.
 */
gulp.task('perform cleanup', function() {

  var cleanupPaths = [];
  for (var path in outPath) {
    cleanupPaths.push(outPath[path]);
  }

  return del(cleanupPaths, { force: true });

});

/**
 * Bump version on every sourcecode change
 * */
gulp.task('watch', function () {

    // return watch('src/plugins/**/!(boot.html.tid|plugin.info)', bumpVersion);
  gulp.watch('src/plugins/**/!(boot.html.tid|plugin.info)',[
    'copy vanilla files',
    'compile and move styles',
    'compile and move scripts'
  ]);
});


/**
 * Override the version of the plugin specified in the plugin.info
 * file. If `isIncrBuild` is true, then the build number is
 * incremented as well.
 */
gulp.task('bump_version', function(cb) {

  bumpVersion();
  cb();
});

/**
 * Override the version of the plugin specified in the plugin.info
 *.
 */
gulp.task('patch', function(cb) {

  var v = new SemVer(pluginInfo.version);
  v.patch++;
  pluginInfo.version = v.major + '.' + v.minor + '.' + v.patch;
  pluginInfo.released = new Date().toUTCString();
  fs.writeFileSync(pluginInfoPath, JSON.stringify(pluginInfo, null, 4));

  cb();
});

/**
 * Labels with the current tag of the plugin
 */
gulp.task('tag', function(cb){
  gulp.src(pluginInfoPath).pipe(
            tag_version(pluginInfo)
            );
  cb();
});

/**
 * Copy everything that doesn't need further processing to the
 * dist directory
 */
gulp.task('copy vanilla files', function() {

  return gulp.src(pluginSrc + '/**/!(*.scss|*.js)')
             .pipe(gulp.dest(outPath.dist));

});

gulp.task('copy libraries', function() {

  return gulp.src(pluginSrc + '/**/*.min.js')
             .pipe(gulp.dest(outPath.dist));

});

/**
 * Will compile the scss stylesheets and minify the code if
 * in production mode. After the sass compiler finished, the
 * placeholders are replaced. Eventually, the files are moved
 * to the dist directory.
 */
gulp.task('compile and move styles', function() {

  var opts = {
    outputStyle: (argv.production ? 'compressed' : 'nested'),
    sourceComments: false
  };

  var stream = gulp.src(pluginSrc + '/**/*.scss')
                   .pipe(sass(opts));

  for (var str in replaceAfterSass) {
    stream = stream.pipe(replace(str, replaceAfterSass[str]));
  }

  return stream.pipe(gulp.dest(outPath.dist));

});

/**
 * Will uglify the js code if in production mode and move the
 * files to the dist directory.
 *
 * Note: We do not tell uglify to do any code optimization, as
 * this caused troubles in the past.
 */
gulp.task('compile and move scripts', function() {

  var opts = {
    compress: false, // no further optimization
    preserveComments: 'some'
  };

  return gulp.src([ pluginSrc + '/**/*.js','!' + pluginSrc + '/**/*.min.js' ])
             .pipe(gulpif(argv.production, uglify(opts)))
             .pipe(gulp.dest(outPath.dist));

});


/**
 * Will uglify the js code if in production mode and move the
 * files to the dist directory.
 *
 * Note: We do not tell uglify to do any code optimization, as
 * this caused troubles in the past.
 */
gulp.task('compile and move scripts', () => {

  const uglifyOpts = {
    compress: false, // no further optimization
    preserveComments: 'some',
  };

  const sourceMapOpts = {
    destPath: outPath.maps,
    sourceMappingURLPrefix: '.'
  };

  return gulp.src(pluginSrc + '/**/*.js')
    .pipe(sourcemaps.init())
    .pipe(babel())
    .pipe(gulpif (argv.production, uglify(uglifyOpts)))
    .pipe(sourcemaps.write('./maps', sourceMapOpts))
    .pipe(gulp.dest(outPath.dist));

});


/**
 * Syntax validation.
 */
gulp.task('Javascript validation', function() {

  return gulp.src(pluginSrc + '/**/*.js')
             .pipe(debug())
             .pipe(esprima());

});

/**
 * Create the docs if in production mode.
 */
gulp.task('create docs', function(cb) {

  // if(!argv.production) { cb(); return; }

  // use require to load the jsdoc config;
  // note the extension is discarted when loading json with require!
  var config = require('./src/jsdoc/config');
  config.opts.destination = outPath.docs;

  gulp.src([ pluginSrc + '/**/*.js', './src/jsdoc/README.md' ])
      .pipe(jsdoc(config, cb));

});

/**
 * Basically what we are doing now is to move all compiled plugin
 * files in the plugin directory of the tiddlywiki node module,
 * then start a tiddlywiki instance to load and pack the plugin as
 * json tiddler and then save it to the filesystem into the bundle
 * dir.
 */
gulp.task('bundle the plugin', function(cb) {

  // init the tw environment
  var $tw = tw.TiddlyWiki();

  // set the output to verbose;
  // Attention: argv always needs to contain at least one element,
  // otherwise the wiki instance will issue a help output.
  // @see https://github.com/Jermolene/TiddlyWiki5/issues/2238
  $tw.boot.argv = [
    '--verbose'
  ];

  // trigger the startup; since we are not in a browser environment,
  // we need to call boot() explicitly.
  $tw.boot.boot();

  // bundle from the plugin files as json
  var plugin = $tw.loadPluginFolder(path.resolve(outPath.dist, pluginNamespace));

  //make sure the bundle path exists
  if (!exists(outPath.bundle)) fs.mkdirSync(outPath.bundle);

  // write the json to the dist dir;
  // note: tw requires the json to be wrapped in an array, since
  // a collection of tiddlers are possible.
  var outName = pluginName + '_' + pluginInfo.version + '.json';
  fs.writeFileSync(path.resolve(outPath.bundle, outName),
                   JSON.stringify([ plugin ], null, 2));

  cb();

});

/**
 * Execute the default task.
 */
gulp.task('default', function(cb) {

  runSequence(
    'Javascript validation',
    'perform cleanup',
    'bump_version',
    [
      'create docs',
      'copy vanilla files',
      'copy libraries',
      'compile and move styles',
      'compile and move scripts'
    ],
    'bundle the plugin',
    'tag',
    cb
  );

});

/* Just builds the dist folder, no tagging, no bump version... Just for other projects that depends on this one */
gulp.task('travis', function(cb) {

  runSequence(
    'Javascript validation',
    'perform cleanup',
    [
      'copy vanilla files',
      'copy libraries',
      'compile and move styles',
      'compile and move scripts'
    ],
    'bundle the plugin',
    cb
  );

});
