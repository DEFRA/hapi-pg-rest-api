'use strict'
// default settings for lab test runs.
//
// This is overridden if arguments are passed to lab via the command line.
module.exports = {
  verbose: true,
  coverage: true,
  // Means when we use *.only() in our tests we just get the output for what we've flagged rather than all output but
  // greyed out to show it was skipped
  'silent-skips': true,
  // lcov reporter required for SonarQube
  reporter: ['console', 'html', 'lcov'],
  output: ['stdout', 'coverage/coverage.html', 'coverage/lcov.info'],
  globals: ['globalThis'].join(',')
};
