import type { Config } from "jest";

const config: Config = {
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  clearMocks: true,
  // Default 5000ms leaves little headroom running --runInBand across 100+
  // suites sequentially; otherwise-healthy tests can blow past it under
  // CPU/GC contention from preceding tests.
  testTimeout: 15000,
  transform: {
    "^.+\\.[tj]sx?$": ["ts-jest", { diagnostics: false, allowJs: true }],
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(@scure|@otplib|otplib)/)",
  ],
};

export default config;
