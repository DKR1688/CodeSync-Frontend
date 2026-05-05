const { createCjsPreset } = require('jest-preset-angular/presets');

module.exports = {
  ...createCjsPreset(),
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  collectCoverageFrom: [
    'src/app/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/main.ts'
  ],
  coverageDirectory: '<rootDir>/coverage/codesync-frontend',
  coverageReporters: ['text-summary', 'lcov', 'html'],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1'
  }
};
