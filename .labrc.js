// default settings for lab test runs.
//
// This is overridden if arguments are passed to lab via the command line.
module.exports = {
  globals: 'globalThis',
  verbose: true,
  'coverage-exclude': [
    'node_modules',
    'test'
  ]
};
