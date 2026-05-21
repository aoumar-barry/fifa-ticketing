module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],
  moduleNameMapper: {
    '\\.(css|less|scss)$': '<rootDir>/__mocks__/styleMock.cjs',
  },
  testMatch: ['<rootDir>/src/__tests__/**/*.test.{js,jsx}'],
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
};
