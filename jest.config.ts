import type { Config } from 'jest';

const config: Config = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/node_modules/zone.js/bundles/zone.umd.js', '<rootDir>/node_modules/zone.js/bundles/zone-testing.umd.js', '<rootDir>/projects/ngx-oauth/setup-jest.ts'],
  testMatch: ['<rootDir>/projects/ngx-oauth/**/*.spec.ts'],
  transform: {
    '^.+\\.(ts|js|mjs|html|svg)$': [
      'jest-preset-angular',
      { tsconfig: '<rootDir>/projects/ngx-oauth/tsconfig.spec.json' }
    ]
  }
};

export default config;
