import type { Config } from '@jest/types';

// Sync object
const config: Config.InitialOptions = {
  testEnvironment: 'jsdom',
  // roots: ['<rootDir>/src'],
  // rootDir: '__test__',
  // Jest transformations -- this adds support for TypeScript
  // using ts-jest
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },

  // // Runs special logic, such as cleaning up components
  // // when using React Testing Library and adds special
  // // extended assertions to Jest
  // setupFilesAfterEnv: [
  //   '@testing-library/react/cleanup-after-each',
  //   '@testing-library/jest-dom/extend-expect',
  // ],

  // Test spec file resolution pattern
  // Matches parent folder `__tests__` and filename
  // should contain `test` or `spec`.
  // testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',

  // NOTE 이미지 파일 mocked
  moduleNameMapper: {
    '\\.(jpg|ico|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/mocks/fileMock.js',
    // '\\.(css|less)$': '<rootDir>/mocks/fileMock.js',
  },

  // Module file extensions for importing
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  verbose: true,
};
export default config;
