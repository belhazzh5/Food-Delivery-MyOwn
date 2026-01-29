module.exports = {
testEnvironment: 'node',
coverageDirectory: 'coverage',
collectCoverageFrom: [
'controllers/**/*.js',
'middleware/**/*.js',
'models/**/*.js',
'!**/node_modules/**'
],
coverageThreshold: {
global: {
branches: 70,
functions: 80,
lines: 80,
statements: 80
}
},
testMatch: ['**/__tests__/**/*.test.js'],
verbose: true
};
