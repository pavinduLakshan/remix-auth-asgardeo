/**
 * Copyright (c) 2024, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import * as path from 'path';
import type {Config} from '@jest/types';
// eslint-disable-next-line unicorn/prefer-node-protocol
// eslint-disable-next-line unicorn/import-style

const config: Config.InitialOptions = {
  verbose: Boolean(process.env.CI),
  rootDir: path.resolve('.'),
  collectCoverageFrom: ['<rootDir>/src/**/*.ts'],
  setupFilesAfterEnv: ['<rootDir>/config/jest/setup.ts'],
  testMatch: ['<rootDir>/test/**/*.test.ts'],
  transform: {
    '\\.[jt]sx?$': ['babel-jest', {configFile: './config/jest/babel.config.js'}],
  },
};

export default config;
