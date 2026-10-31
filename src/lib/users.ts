// The people who can log in. Must match the `users` table (see the users migration).
// Each one needs a PASSWORD_<ID> environment variable, e.g. PASSWORD_ANAS.
export const USERS = [
  { id: "anas", name: "Anas" },
  { id: "atef", name: "Atef" },
];

export const userName = (id: string) => USERS.find((u) => u.id === id)?.name ?? id;
