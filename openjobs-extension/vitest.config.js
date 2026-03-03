/** @type {import('vitest/config').UserConfig} */
module.exports = {
  test: {
    include: ['tests/**/*.test.mjs'],
    environment: 'node',
    reporters: ['default']
  }
};
