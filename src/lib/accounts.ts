import type { GoogleProfile } from "./google";

export type Account = { id: string; name: string };

/** The few database operations sign-in needs (see supabaseAccounts in accounts-db.ts). */
export type AccountStore = {
  findBySub(sub: string): Promise<Account | null>;
  /** Links `sub` to the user with this email, only if no Google account is linked to it yet. */
  claimByEmail(email: string, sub: string): Promise<Account | null>;
  create(account: Account & { email: string; sub: string }): Promise<Account>;
};

/**
 * The user a Google account signs in as:
 * 1. the user already linked to it,
 * 2. else an existing user whose email was set by hand and isn't linked yet (how the
 *    users from before Google sign-in, like 'anas', keep their id and data),
 * 3. else a new user.
 * If the email belongs to a user linked to another Google account, `create` fails
 * on the unique email: the account is never taken over.
 */
export async function resolveAccount(store: AccountStore, profile: GoogleProfile, newId: () => string): Promise<Account> {
  return (
    (await store.findBySub(profile.sub)) ??
    (await store.claimByEmail(profile.email, profile.sub)) ??
    (await store.create({ id: newId(), name: profile.name, email: profile.email, sub: profile.sub }))
  );
}
