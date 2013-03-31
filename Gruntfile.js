module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    meta: {
      gruntfile: 'Gruntfile.js',
      src: 'lib/conjoiners.js',
      test: 'test/**/*.js'
    },

    nodeunit: {
      all: '<%= meta.test %>'
    }
  });

  grunt.loadNpmTasks('grunt-contrib-nodeunit');

  // Default task
  grunt.registerTask('default', ['nodeunit']);
};