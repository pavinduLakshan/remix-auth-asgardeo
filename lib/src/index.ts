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

import type {StrategyVerifyCallback} from 'remix-auth';
import {OAuth2Profile, OAuth2Strategy, OAuth2StrategyVerifyParams} from 'remix-auth-oauth2';

export interface AsgardeoStrategyOptions {
  audience?: string;
  authorizedRedirectUrl: string;
  baseUrl: string;
  clientID: string;
  clientSecret: string;
  organization?: string;
  scope?: AsgardeoScope[] | string;
}

/**
 * standard claims
 */
export type AsgardeoScope = 'openid' | 'profile' | 'email' | string;

export interface AsgardeoProfile extends OAuth2Profile {
  _json?: AsgardeoUserInfo;
  organizationId?: string;
  organizationName?: string;
}

export interface AsgardeoExtraParams extends Record<string, unknown> {
  expires_in: number;
  id_token?: string;
  scope: string;
  token_type: 'Bearer';
}

interface AsgardeoUserInfo {
  address?: {
    country?: string;
  };
  birthdate?: string;
  email?: string;
  email_verified?: boolean;
  family_name?: string;
  gender?: string;
  given_name?: string;
  locale?: string;
  middle_name?: string;
  name?: string;
  nickname?: string;
  org_id?: string;
  org_name?: string;
  phone_number?: string;
  phone_number_verified?: boolean;
  picture?: string;
  preferred_username?: string;
  profile?: string;
  sub?: string;
  updated_at?: string;
  website?: string;
  zoneinfo?: string;
}

export const AsgardeoStrategyDefaultName = 'asgardeo';
export const AsgardeoStrategyDefaultScope: AsgardeoScope = 'openid profile email';
export const AsgardeoStrategyScopeSeperator = ' ';

export class AsgardeoStrategy<User> extends OAuth2Strategy<User, AsgardeoProfile, AsgardeoExtraParams> {
  override name = AsgardeoStrategyDefaultName;

  private userInfoURL: string;

  private scope: AsgardeoScope[];

  private audience?: string;

  private organization?: string;

  private invitation?: string;

  private connection?: string;

  private fetchProfile: boolean;

  constructor(
    options: AsgardeoStrategyOptions,
    verify: StrategyVerifyCallback<User, OAuth2StrategyVerifyParams<AsgardeoProfile, AsgardeoExtraParams>>,
  ) {
    super(
      {
        authorizationURL: `${options.baseUrl}/oauth2/authorize`,
        tokenURL: `${options.baseUrl}/oauth2/token`,
        clientID: options.clientID,
        clientSecret: options.clientSecret,
        callbackURL: options.authorizedRedirectUrl,
      },
      verify,
    );

    this.userInfoURL = `${options.baseUrl}/oauth2/userinfo`;
    this.scope = this.getScope(options.scope);
    this.audience = options.audience;
    this.organization = options.organization;
    this.fetchProfile = this.scope.join(AsgardeoStrategyScopeSeperator).includes('openid');
  }

  // Allow users the option to pass a scope string, or typed array
  private getScope(scope: AsgardeoStrategyOptions['scope']) {
    if (!scope) {
      return [AsgardeoStrategyDefaultScope];
    }
    if (typeof scope === 'string') {
      return scope.split(AsgardeoStrategyScopeSeperator) as AsgardeoScope[];
    }

    return scope;
  }

  protected override authorizationParams(params: URLSearchParams) {
    params.set('scope', this.scope.join(AsgardeoStrategyScopeSeperator));
    if (this.audience) {
      params.set('audience', this.audience);
    }
    if (this.organization) {
      params.set('organization', this.organization);
    }

    return params;
  }

  protected override async userProfile(accessToken: string): Promise<AsgardeoProfile> {
    const profile: AsgardeoProfile = {
      provider: AsgardeoStrategyDefaultName,
    };

    if (!this.fetchProfile) {
      return profile;
    }

    const response = await fetch(this.userInfoURL, {
      headers: {Authorization: `Bearer ${accessToken}`},
    });
    const data: AsgardeoUserInfo = await response.json();

    profile._json = data;

    if (data.sub) {
      profile.id = data.sub;
    }

    if (data.name) {
      profile.displayName = data.name;
    }

    if (data.family_name || data.given_name || data.middle_name) {
      profile.name = {};

      if (data.family_name) {
        profile.name.familyName = data.family_name;
      }

      if (data.given_name) {
        profile.name.givenName = data.given_name;
      }

      if (data.middle_name) {
        profile.name.middleName = data.middle_name;
      }
    }

    if (data.email) {
      profile.emails = [{value: data.email}];
    }

    if (data.picture) {
      profile.photos = [{value: data.picture}];
    }

    if (data.org_id) {
      profile.organizationId = data.org_id;
    }

    if (data.org_name) {
      profile.organizationName = data.org_name;
    }

    return profile;
  }
}
