import express from 'express';
import { ExpressAuth } from '@auth/express';
import Google from '@auth/express/providers/google';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import db from '../db/client.js';
import { users, accounts, sessions, verificationTokens } from '../db/schema.js';

const authExpressHandler = ExpressAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  callbacks: {
    async session({ session, user }) {
      if (session.user && user) {
        (session.user as typeof session.user & { id: string }).id = user.id;
      }
      return session;
    },
  },
});

// Express 5 requires named wildcards (/*p0) instead of bare /*.
// Express Router reconstructs req.params for each middleware layer in a route, deleting custom additions.
// To bypass this, we wrap the ExpressAuth handler in a single middleware where we join and set req.params[0]
// and immediately call authExpressHandler in the same execution scope.
const authRouter = express.Router();

authRouter.use('/*p0', (req, res, next) => {
  const params = req.params as Record<string | number, any>;
  if (params.p0) {
    params[0] = Array.isArray(params.p0) ? params.p0.join('/') : params.p0;
  } else {
    params[0] = '';
  }
  // Execute the handler immediately without leaving the middleware layer
  (authExpressHandler as express.RequestHandler)(req, res, next);
});

export { authRouter };
export default authRouter;
