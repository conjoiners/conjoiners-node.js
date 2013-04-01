module.exports = function(grunt) {
    'use strict';

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        meta: {
            gruntfile: 'Gruntfile.js',
            src: 'lib/conjoiners.js',
            test: 'test/**/*.js',
            all: ['<%= meta.src %>',
                  '<%= meta.test %>',
                  '<%= meta.gruntfile %>']
        },

        nodeunit: {
            all: '<%= meta.test %>'
        },

        jshint: {
            options: {
                bitwise: true,
                boss: true,
                curly: true,
                camelcase: true,
                eqeqeq: true,
                eqnull: true,
                forin: true,
                immed: true,
                indent: 4,
                latedef: true,
                maxcomplexity: 4,
                maxdepth: 3,
                maxparams: 4,
                maxstatements: 10,
                maxlen: 80,
                newcap: true,
                noarg: true,
                noempty: true,
                nonew: true,
                quotmark: 'single',
                sub: true,
                strict: true,
                trailing: true,
                undef: true,
                unused: true,
                node: true
            },
            defaults: '<%= meta.all %>'

        },

        watch: {
            all: {
                files: '<%= meta.all %>',
                tasks: ['nodeunit', 'jshint']
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-nodeunit');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.registerTask('default', ['nodeunit', 'jshint']);
    grunt.registerTask('travis', ['default']);
};