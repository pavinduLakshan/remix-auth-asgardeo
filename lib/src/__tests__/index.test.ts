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

import { createCookieSessionStorage } from "@remix-run/node";
import { AuthenticateOptions } from "remix-auth";
import fetchMock, { enableFetchMocks } from "jest-fetch-mock";

import { AsgardeoProfile, AsgardeoStrategy } from "..";

enableFetchMocks();

const BASE_OPTIONS: AuthenticateOptions = {
  name: "form",
  sessionKey: "user",
  sessionErrorKey: "error",
  sessionStrategyKey: "strategy",
};

describe(AsgardeoStrategy, () => {
  let verify = jest.fn();
  let sessionStorage = createCookieSessionStorage({
    cookie: { secrets: ["s3cr3t"] },
  });

  beforeEach(() => {
    jest.resetAllMocks();
    fetchMock.resetMocks();
  });

  test("should allow changing the scope", async () => {
    let strategy = new AsgardeoStrategy(
      {
        baseUrl: "https://api.asgardeo.io/t/demoorg",
        clientID: "CLIENT_ID",
        clientSecret: "CLIENT_SECRET",
        authorizedRedirectUrl: "https://example.app/callback",
        scope: "custom",
      },
      verify,
    );

    let request = new Request("https://example.app/auth/Asgardeo");

    try {
      await strategy.authenticate(request, sessionStorage, BASE_OPTIONS);
    } catch (error) {
      if (!(error instanceof Response)) throw error;
      let location = error.headers.get("Location");

      if (!location) throw new Error("No redirect header");

      let redirectUrl = new URL(location);

      expect(redirectUrl.searchParams.get("scope")).toBe("custom");
    }
  });

  test("should have the scope `openid profile email` as default", async () => {
    let strategy = new AsgardeoStrategy(
      {
        baseUrl: "https://api.asgardeo.io/t/demoorg",
        clientID: "CLIENT_ID",
        clientSecret: "CLIENT_SECRET",
        authorizedRedirectUrl: "https://example.app/callback",
      },
      verify,
    );

    let request = new Request("https://example.app/auth/asgardeo");

    try {
      await strategy.authenticate(request, sessionStorage, BASE_OPTIONS);
    } catch (error) {
      if (!(error instanceof Response)) throw error;
      let location = error.headers.get("Location");

      if (!location) throw new Error("No redirect header");

      let redirectUrl = new URL(location);

      expect(redirectUrl.searchParams.get("scope")).toBe(
        "openid profile email",
      );
    }
  });

  test("should correctly format the authorization URL", async () => {
    let strategy = new AsgardeoStrategy(
      {
        baseUrl: "https://api.asgardeo.io/t/demoorg",
        clientID: "CLIENT_ID",
        clientSecret: "CLIENT_SECRET",
        authorizedRedirectUrl: "https://example.app/callback",
      },
      verify,
    );

    let request = new Request("https://example.app/auth/Asgardeo");

    try {
      await strategy.authenticate(request, sessionStorage, BASE_OPTIONS);
    } catch (error) {
      if (!(error instanceof Response)) throw error;

      let location = error.headers.get("Location");

      if (!location) throw new Error("No redirect header");

      let redirectUrl = new URL(location);

      expect(redirectUrl.hostname).toBe("api.asgardeo.io");
      expect(redirectUrl.pathname).toBe("/t/demoorg/oauth2/authorize");
    }
  });

  test("should allow changing the audience", async () => {
    let strategy = new AsgardeoStrategy(
      {
        baseUrl: "https://api.asgardeo.io/t/demoorg",
        clientID: "CLIENT_ID",
        clientSecret: "CLIENT_SECRET",
        authorizedRedirectUrl: "https://example.app/callback",
        scope: "custom",
        audience: "SOME_AUDIENCE",
      },
      verify,
    );

    let request = new Request("https://example.app/auth/Asgardeo");

    try {
      await strategy.authenticate(request, sessionStorage, BASE_OPTIONS);
    } catch (error) {
      if (!(error instanceof Response)) throw error;
      let location = error.headers.get("Location");

      if (!location) throw new Error("No redirect header");

      let redirectUrl = new URL(location);

      expect(redirectUrl.searchParams.get("audience")).toBe("SOME_AUDIENCE");
    }
  });

  test("should allow changing the organization", async () => {
    let strategy = new AsgardeoStrategy(
      {
        baseUrl: "https://api.asgardeo.io/t/demoorg",
        clientID: "CLIENT_ID",
        clientSecret: "CLIENT_SECRET",
        authorizedRedirectUrl: "https://example.app/callback",
        scope: "custom",
        audience: "SOME_AUDIENCE",
        organization: "SOME_ORG",
      },
      verify,
    );

    let request = new Request("https://example.app/auth/Asgardeo");

    try {
      await strategy.authenticate(request, sessionStorage, BASE_OPTIONS);
    } catch (error) {
      if (!(error instanceof Response)) throw error;
      let location = error.headers.get("Location");

      if (!location) throw new Error("No redirect header");

      let redirectUrl = new URL(location);

      expect(redirectUrl.searchParams.get("organization")).toBe("SOME_ORG");
    }
  });

  test("should not fetch user profile when openid scope is not present", async () => {
    let strategy = new AsgardeoStrategy(
      {
        baseUrl: "https://api.asgardeo.io/t/demoorg",
        clientID: "CLIENT_ID",
        clientSecret: "CLIENT_SECRET",
        authorizedRedirectUrl: "https://example.app/callback",
        scope: "custom",
      },
      verify,
    );

    let session = await sessionStorage.getSession();
    session.set("oauth2:state", "random-state");

    let request = new Request(
      "https://example.com/callback?state=random-state&code=random-code",
      {
        headers: { cookie: await sessionStorage.commitSession(session) },
      },
    );

    fetchMock.once(
      JSON.stringify({
        access_token: "access_token",
        scope: "custom",
        expires_in: 86_400,
        token_type: "Bearer",
      }),
    );

    let context = { test: "some context" };

    await strategy.authenticate(request, sessionStorage, {
      ...BASE_OPTIONS,
      context,
    });

    expect(verify).toHaveBeenLastCalledWith({
      accessToken: "access_token",
      refreshToken: undefined,
      request,
      extraParams: {
        scope: "custom",
        expires_in: 86_400,
        token_type: "Bearer",
      },
      profile: {
        provider: "asgardeo",
      },
      context,
    });
  });

  test("should fetch minimal user profile when only openid scope is present", async () => {
    let strategy = new AsgardeoStrategy(
      {
        baseUrl: "https://api.asgardeo.io/t/demoorg",
        clientID: "CLIENT_ID",
        clientSecret: "CLIENT_SECRET",
        authorizedRedirectUrl: "https://example.app/callback",
        scope: "openid",
      },
      verify,
    );

    let session = await sessionStorage.getSession();
    session.set("oauth2:state", "random-state");

    let request = new Request(
      "https://example.com/callback?state=random-state&code=random-code",
      {
        headers: { cookie: await sessionStorage.commitSession(session) },
      },
    );

    let userInfo: AsgardeoProfile["_json"] = {
      sub: "subject",
    };

    fetchMock
      .once(
        JSON.stringify({
          access_token: "access_token",
          id_token: "id token",
          scope: "openid",
          expires_in: 86_400,
          token_type: "Bearer",
        }),
      )
      .once(JSON.stringify(userInfo));

    let context = { test: "some context" };

    await strategy.authenticate(request, sessionStorage, {
      ...BASE_OPTIONS,
      context,
    });

    const profile: AsgardeoProfile = {
      provider: "asgardeo",
      _json: userInfo,
      id: "subject",
    };

    expect(verify).toHaveBeenLastCalledWith({
      accessToken: "access_token",
      refreshToken: undefined,
      request,
      extraParams: {
        id_token: "id token",
        scope: "openid",
        expires_in: 86_400,
        token_type: "Bearer",
      },
      profile,
      context,
    });
  });

  test("should fetch full user profile when openid, profile, and email scopes are present", async () => {
    let strategy = new AsgardeoStrategy(
      {
        baseUrl: "https://api.asgardeo.io/t/demoorg",
        clientID: "CLIENT_ID",
        clientSecret: "CLIENT_SECRET",
        authorizedRedirectUrl: "https://example.app/callback",
        scope: "openid profile email",
      },
      verify,
    );

    let session = await sessionStorage.getSession();
    session.set("oauth2:state", "random-state");

    let request = new Request(
      "https://example.com/callback?state=random-state&code=random-code",
      {
        headers: { cookie: await sessionStorage.commitSession(session) },
      },
    );

    let userInfo: AsgardeoProfile["_json"] = {
      sub: "248289761001",
      name: "John Doe",
      given_name: "John",
      family_name: "Doe",
      middle_name: "Alexander",
      nickname: "JJ",
      preferred_username: "j.doe",
      profile: "http://exampleco.com/janedoe",
      picture: "http://exampleco.com/janedoe/me.jpg",
      website: "http://exampleco.com",
      email: "janedoe@exampleco.com",
      email_verified: true,
      gender: "female",
      birthdate: "1972-03-31",
      zoneinfo: "America/Los_Angeles",
      locale: "en-US",
      phone_number: "+1 (111) 222-3434",
      phone_number_verified: false,
      org_id: "some-Asgardeo-organization-id",
      org_name: "some-Asgardeo-organization-name",
      address: {
        country: "us",
      },
      updated_at: "1556845729",
    };

    fetchMock
      .once(
        JSON.stringify({
          access_token: "access_token",
          id_token: "id token",
          scope: "openid profile email",
          expires_in: 86_400,
          token_type: "Bearer",
        }),
      )
      .once(JSON.stringify(userInfo));

    let context = { test: "some context" };

    await strategy.authenticate(request, sessionStorage, {
      ...BASE_OPTIONS,
      context,
    });

    const profile: AsgardeoProfile = {
      provider: "asgardeo",
      _json: userInfo,
      id: "248289761001",
      displayName: "John Doe",
      name: {
        familyName: "Doe",
        givenName: "John",
        middleName: "Alexander",
      },
      emails: [{ value: "janedoe@exampleco.com" }],
      photos: [{ value: "http://exampleco.com/janedoe/me.jpg" }],
      organizationId: "some-Asgardeo-organization-id",
      organizationName: "some-Asgardeo-organization-name",
    };

    expect(verify).toHaveBeenLastCalledWith({
      accessToken: "access_token",
      refreshToken: undefined,
      request,
      extraParams: {
        id_token: "id token",
        scope: "openid profile email",
        expires_in: 86_400,
        token_type: "Bearer",
      },
      profile,
      context,
    });
  });

  test("should allow additional search params", async () => {
    let strategy = new AsgardeoStrategy(
      {
        baseUrl: "https://api.asgardeo.io/t/demoorg",
        clientID: "CLIENT_ID",
        clientSecret: "CLIENT_SECRET",
        authorizedRedirectUrl: "https://example.app/callback",
      },
      verify,
    );

    let request = new Request("https://example.app/auth/Asgardeo?test=1");
    try {
      await strategy.authenticate(request, sessionStorage, BASE_OPTIONS);
    } catch (error) {
      if (!(error instanceof Response)) throw error;
      let location = error.headers.get("Location");

      if (!location) throw new Error("No redirect header");

      let redirectUrl = new URL(location);

      expect(redirectUrl.searchParams.get("test")).toBe("1");
    }
  });
});
