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
const authorName = 'danielo515';
const pluginName = 'tiddlypouch';

/**** Imports ******************************************************/

// node modules

const path = require('path');
const fs = require('fs');

// additional modules

const tw = require('tiddlywiki');
const argv = require('yargs').argv;
const del = require('del');
// why on earth is fs.exists depreciated anyway by node?
const exists = require('is-there');
const SemVer = require('semver/classes/semver');
// once gulp 4.0 is out: remove runSequence and update
const runSequence = require('gulp4-run-sequence');
const gulp = require('gulp');
const babel = require('gulp-babel');
const sourcemaps = require('gulp-sourcemaps');
const gulpif = require('gulp-if');
const sass = require('gulp-sass');
const replace = require('gulp-replace');
const uglify = require('gulp-uglify');
const jsdoc = require('gulp-jsdoc3');
const esprima = require('gulp-esprima');
const debug = require('gulp-debug');
const tag_version = require('gulp-tag-version');
const conventionalRecommendedBump = require('conventional-recommended-bump');
const { promisify } = require('util');
const { log } = require('console');
const recommendedBump = promisify(conventionalRecommendedBump);

/**** Preprocessing ************************************************/

const pluginSrc = './src/plugins/';
const pluginNamespace = `${authorName}/${pluginName}`; // no trailing slash!
const pluginTiddler = `$:/plugins/${pluginNamespace}`;
const pluginInfoPath = path.resolve(pluginSrc, pluginNamespace, 'plugin.info');
const pluginInfo = JSON.parse(fs.readFileSync(pluginInfoPath, 'utf8'));
const pckgJSON = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const updaterSrc = './src/plugins/danielo515/tiddlypouch/boot/tpouch-boot.js';
let updater = fs.readFileSync(updaterSrc, 'utf8');

// build paths where we output our results
const outPath = {
    bundle: './bundle/',
    dist: './dist/',
    docs: './docs/',
    maps: './maps/',
};

// a quick sanity check
if (pluginTiddler !== pluginInfo.title) {
    const msg = 'Gulp settings do not match the plugin.info';
    throw new Error(msg);
}

/**** Replacements *************************************************/

const replaceAfterSass = {
    __breakpoint__:
        '{{$:/themes/tiddlywiki/vanilla/metrics/sidebarbreakpoint}}',
};

const replaceInJs = { '@plugin': `$:/plugins/${pluginNamespace}` };

/**** Helper functions *********************/

async function bumpVersion() {
    console.log('Bumping from version ', pluginInfo.version);
    const v = new SemVer(pluginInfo.version);
    const recommended = await recommendedBump({ preset: 'angular' });
    log({ bump: recommended });
    const bump_type = argv.major
        ? 'major'
        : argv.minor
            ? 'minor'
            : argv.patch
                ? 'patch'
                : recommended.releaseType;
    v.inc(bump_type);
    pluginInfo.version = v.version;
    pluginInfo.released = new Date().toUTCString();
    pckgJSON.version = pluginInfo.version;

    updater = updater.replace(
        /\/\**TPOUCH_VER.*\*\//,
        `/***TPOUCH_VER*/'${pluginInfo.version}'/*TPOUCH_VER***/`
    );

    fs.writeFileSync(pluginInfoPath, JSON.stringify(pluginInfo, null, 4));
    fs.writeFileSync('./package.json', JSON.stringify(pckgJSON, null, 4));
    fs.writeFileSync(updaterSrc, updater);
    console.log('New version is', pluginInfo.version);
}

/**** Tasks ********************************************************/

/**
 * Remove all output paths.
 */
gulp.task('perform cleanup', function () {
    const cleanupPaths = [];
    for (const path in outPath) {
        cleanupPaths.push(outPath[path]);
    }

    return del(cleanupPaths, { force: true });
});

/**
 * Override the version of the plugin specified in the plugin.info
 * file. If `isIncrBuild` is true, then the build number is
 * incremented as well.
 */
gulp.task('bump_version', bumpVersion);

/**
 * Labels with the current tag of the plugin
 */
gulp.task('tag', function (cb) {
    gulp.src(pluginInfoPath).pipe(tag_version(pluginInfo));
    cb();
});

/**
 * Copy everything that doesn't need further processing to the
 * dist directory
 */
gulp.task('copy vanilla files', function () {
    return gulp
        .src(`${pluginSrc}/**/!(*.scss|*.js)`)
        .pipe(gulp.dest(outPath.dist));
});

/**
 * Will compile the scss stylesheets and minify the code if
 * in production mode. After the sass compiler finished, the
 * placeholders are replaced. Eventually, the files are moved
 * to the dist directory.
 */
gulp.task('compile and move styles', function () {
    const opts = {
        outputStyle: argv.production ? 'compressed' : 'nested',
        sourceComments: false,
    };

    let stream = gulp.src(`${pluginSrc}/**/*.scss`).pipe(sass(opts));

    for (const str in replaceAfterSass) {
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
gulp.task('compile and move scripts', () => {
    const uglifyOpts = {
        compress: false, // no further optimization
        output: {
            comments: 'some',
        },
    };

    const sourceMapOpts = {
        destPath: outPath.maps,
        sourceMappingURLPrefix: '.',
    };

    const babelCfg = {
        plugins: [
            [
                require.resolve('babel-plugin-module-resolver'),
                {
                    root: [ './src/' ],
                    alias: replaceInJs,
                },
            ],
        ],
    };

    return gulp
        .src(`${pluginSrc}/**/*.js`)
        .pipe(sourcemaps.init())
        .pipe(babel(babelCfg))
        .pipe(gulpif(argv.production, uglify(uglifyOpts)))
        .pipe(sourcemaps.write('./maps', sourceMapOpts))
        .pipe(gulp.dest(outPath.dist));
});

/**
 * Syntax validation.
 */
gulp.task('Javascript validation', function () {
    return gulp.src(`${pluginSrc}/**/*.js`).pipe(debug()).pipe(esprima());
});

/**
 * Create the docs if in production mode.
 */
gulp.task('create docs', function (cb) {
    // if(!argv.production) { cb(); return; }

    // use require to load the jsdoc config;
    // note the extension is discarted when loading json with require!
    const config = require('./src/jsdoc/config');
    config.opts.destination = outPath.docs;

    gulp.src([ `${pluginSrc}/**/*.js`, './src/jsdoc/README.md' ]).pipe(
        jsdoc(config, cb)
    );
});

/**
 * Basically what we are doing now is to move all compiled plugin
 * files in the plugin directory of the tiddlywiki node module,
 * then start a tiddlywiki instance to load and pack the plugin as
 * json tiddler and then save it to the filesystem into the bundle
 * dir.
 */
gulp.task('bundle the plugin', function (cb) {
    // init the tw environment
    const $tw = tw.TiddlyWiki();

    // set the output to verbose;
    // Attention: argv always needs to contain at least one element,
    // otherwise the wiki instance will issue a help output.
    // @see https://github.com/Jermolene/TiddlyWiki5/issues/2238
    $tw.boot.argv = [ '--verbose' ];

    // trigger the startup; since we are not in a browser environment,
    // we need to call boot() explicitly.
    $tw.boot.boot();

    // bundle from the plugin files as json
    const plugin = $tw.loadPluginFolder(
        path.resolve(outPath.dist, pluginNamespace)
    );

    //make sure the bundle path exists
    if (!exists(outPath.bundle)) fs.mkdirSync(outPath.bundle);

    // write the json to the dist dir;
    // note: tw requires the json to be wrapped in an array, since
    // a collection of tiddlers are possible.
    const outName = `${pluginName}_${pluginInfo.version}.json`;
    fs.writeFileSync(
        path.resolve(outPath.bundle, outName),
        JSON.stringify([ plugin ], null, 2)
    );

    cb();
});

function buildWiki(cb) {
    process.env.TIDDLYWIKI_PLUGIN_PATH = `${outPath.dist}:./node_modules/tw-pouchdb/`;
    const $tw = tw.TiddlyWiki();
    $tw.boot.argv = [ './wiki', '--verbose', '--build', 'index' ];
    $tw.boot.boot();
    cb();
}

const basicBuild = gulp.parallel(
    'copy vanilla files',
    'compile and move styles',
    'compile and move scripts'
);

/**
 * Execute the default task.
 */
gulp.task('default', function (cb) {
    runSequence(
        'Javascript validation',
        'perform cleanup',
        'bump_version',
        [
            // 'create docs', // There is a problem because TS imports on JSDOC
            'copy vanilla files',
            'compile and move styles',
            'compile and move scripts',
        ],
        'bundle the plugin',
        'tag',
        cb
    );
});

/* Just builds the dist folder, no tagging, no bump version... Just for other projects that depends on this one */
gulp.task('travis', function (cb) {
    runSequence(
        'Javascript validation',
        'perform cleanup',
        basicBuild,
        'bundle the plugin',
        cb
    );
});

gulp.task('build-wiki', gulp.series('travis', buildWiki));

gulp.task('watch', () => {
    const path = `${pluginSrc}**`;
    log({ path });
    return gulp.watch(path, { ignoreInitial: false }, basicBuild);
});
