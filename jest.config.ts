import { createConfig } from '@umijs/max/test';

export default async () => {
  const config = createConfig({
    target: 'browser',
    jsTransformer: 'ts-jest',
  });

  return {
    ...config,
    transform: {
      '^.+\\.(t|j)sx?$': [
        'ts-jest',
        {
          tsconfig: '<rootDir>/tsconfig.jest.json',
        },
      ],
    },
    moduleNameMapper: {
      ...(config.moduleNameMapper || {}),
      '^@/(.*)$': '<rootDir>/src/$1',
      '^@@/(.*)$': '<rootDir>/tests/umi/$1',
    },
    testEnvironmentOptions: {
      ...(config?.testEnvironmentOptions || {}),
      url: 'http://localhost:8000',
    },
    setupFiles: [...(config.setupFiles || []), './tests/setupTests.jsx'],
    globals: {
      ...config.globals,
      localStorage: null,
    },
  };
};
