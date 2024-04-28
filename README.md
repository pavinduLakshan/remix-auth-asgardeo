# AsgardeoStrategy

The Asgardeo strategy, which extends the OAuth2Strategy, is used to authenticate users against an Asgardeo organization.

## Supported runtimes

| Runtime    | Has Support |
| ---------- | ----------- |
| Node.js    | ✅          |
| Cloudflare | ✅          |

## How to use

### Create an Asgardeo organization

Head over to [Asgardeo](https://wso2.com/asgardeo) and sign up for an organization.

### Register an application

Follow the steps on the [Asgardeo documentation](https://wso2.com/asgardeo/docs/guides/applications/register-oidc-web-app/) to create an application and get the client ID, and client secret.

### Create the Asgardeo strategy instance

```ts
// app/utils/asgardeo.server.ts
import { Authenticator } from "remix-auth";
import { AsgardeoStrategy } from "remix-auth-asgardeo";

// Create an instance of the authenticator, pass a generic with what your
// strategies will return and will be stored in the session
export const authenticator = new Authenticator<User>(sessionStorage);

let asgardeoStrategy = new AsgardeoStrategy(
  {
    authorizedRedirectUrl: "http://localhost:5173/auth/asgardeo/callback",
    clientID: "YOUR_ASGARDEO_CLIENT_ID",
    clientSecret: "YOUR_ASGARDEO_CLIENT_SECRET",
    baseUrl: "https://api.asgardeo.io/t/<YOUR_ASGARDEO_ORG_NAME>",
  },
  async ({ accessToken, refreshToken, extraParams, profile }) => {
    // Get the user data from your DB or API using the tokens and profile
    return User.findOrCreate({ email: profile.emails[0].value });
  }
);

authenticator.use(asgardeoStrategy);
```

### Setup application routes

```ts
// app/routes/login.tsx
export default function Login() {
  return (
    <Form action="/auth/asgardeo" method="post">
      <button>Login with Asgardeo</button>
    </Form>
  );
}
```

```ts
// app/routes/auth.asgardeo.tsx
import type { ActionFunctionArgs } from "@remix-run/node";

import { authenticator } from "~/utils/auth.server";

export let loader = () => redirect("/login");

export let action = ({ request }: ActionFunctionArgs) => {
  return authenticator.authenticate("asgardeo", request);
};
```

```ts
// app/routes/auth.asgardeo.callback.tsx
import type { LoaderFunctionArgs } from "@remix-run/node";

import { authenticator } from "~/utils/auth.server";

export let loader = ({ request }: LoaderFunctionArgs) => {
  return authenticator.authenticate("asgardeo", request, {
    successRedirect: "/dashboard",
    failureRedirect: "/login",
  });
};
```

```ts
// app/routes/auth.logout.ts
import type { ActionFunctionArgs } from "@remix-run/node";

import { redirect } from "@remix-run/node";

import { destroySession, getSession } from "~/utils/auth.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const session = await getSession(request.headers.get("Cookie"));
  const logoutURL = new URL(process.env.ASGARDEO_LOGOUT_URL); // i.e https://api.asgardeo.io/t/pavinduorg/oidc/logout

  logoutURL.searchParams.set("client_id", process.env.ASGARDEO_CLIENT_ID);
  logoutURL.searchParams.set("returnTo", process.env.ASGARDEO_RETURN_TO_URL);

  return redirect(logoutURL.toString(), {
    headers: {
      "Set-Cookie": await destroySession(session),
    },
  });
};
```

## Development

1. Clone this repo.
2. Run `npm install` to install the dependencies.
3. Run `npm link` to create a symlink.
4. Run `npm install remix-auth-asgardeo` in your remix project.
