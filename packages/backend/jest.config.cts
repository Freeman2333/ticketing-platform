module.exports = {
  displayName: 'backend',
  preset: '../../jest.preset.js',
  coverageDirectory: 'test-output/jest/coverage',
  transformIgnorePatterns: ['node_modules/(?!.*@nestjs[/+]jwt)'],
  testEnvironment: 'node',
};
