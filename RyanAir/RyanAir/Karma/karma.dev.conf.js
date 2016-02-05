// Karma configuration
// Generated on Thu Sep 25 2014 10:29:51 GMT+0200 (Paris, Madrid (heure d’été))

module.exports = function(config) {
    config.set({

        // base path that will be used to resolve all patterns (eg. files, exclude)
        basePath: '../',


        // frameworks to use
        // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
        frameworks: ['jasmine'],

        plugins: [
            'karma-coverage',
            'karma-junit-reporter',
			'karma-verbose-reporter',
            'karma-phantomjs-launcher',
            'karma-jasmine',
            'karma-ng-html2js-preprocessor'
        ],

        // list of files / patterns to load in the browser
        files: [
            "tests/scripts/jquery-1.9.1.min.js",
            "tests/scripts/footable.js",
            "tests/scripts/angular.js",
            "tests/scripts/angular-route.js",
            "tests/scripts/angular-sanitize.js",
            "tests/scripts/angular-mocks.js",
            "tests/scripts/angular-validation.debug.js",
            "app/main.js",
            "tests/controllers/*.js",
            "tests/directives/*.js",
            "tests/services/*.js",
            "tests/filters/*.js",
            { pattern: "app/controllers/*.js", included: true },
            { pattern: "app/directives/*.js", included: true },
            { pattern: "app/services/*.js", included: true },
            { pattern: "app/filters/*.js", included: true },
            "app/templates/**/*.html"
        ],


        // list of files to exclude
        exclude: [
        ],


        // preprocess matching files before serving them to the browser
        // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
        preprocessors: {
            "app/**/*.js": ['coverage'],
            "app/templates/**/*.html": 'html2js'
        },


        // test results reporter to use
        // possible values: 'dots', 'progress'
        // available reporters: https://npmjs.org/browse/keyword/karma-reporter
        reporters: ['progress', 'junit', 'coverage'],


        // web server port
        port: 9876,

        /**
         * Paramétrage spécifique sonar 5
         */
        //coverageReporter: {
        //    type: 'lcov',
        //    dir: 'Karma/results/',
        //    subdir: 'coverage'
        //},
        coverageReporter: {
            type: 'text'
        },

        //junitReporter: {
        //    outputFile: 'Karma/test-results/test-results.xml',
        //    suite: ''
        //},

        //htmlReporter: {
        //    outputFile: 'Karma/test-results/test-results.html'
        //},

        // enable / disable colors in the output (reporters and logs)
        colors: true,


        // level of logging
        // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
        logLevel: config.LOG_DISABLE,


        // enable / disable watching file and executing tests whenever any file changes
        autoWatch: true,


        // start these browsers
        // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
        browsers: ['PhantomJS'],

        // Continuous Integration mode
        // if true, Karma captures browsers, runs the tests and exits
        singleRun: false
    });
};