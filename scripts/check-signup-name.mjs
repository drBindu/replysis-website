// The name typed at sign-up must reach the account record (bug round 36, 2026-11-07).
// Sign-up set the name with updateProfile and then sent the token made before it, which has no name in it, so the
// session route stored the "User" placeholder. The token has to be refreshed after the name is set.
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../components/AuthModal.tsx", import.meta.url), "utf8");
const setName = source.indexOf("await updateProfile(result.user");
const refresh = source.indexOf("getIdToken(true)", setName);
const finish = source.indexOf("await finishAuthentication(result.user)", setName);

if (setName < 0 || refresh < 0 || finish < 0 || refresh > finish) {
  console.error("components/AuthModal.tsx: sign-up must call getIdToken(true) after updateProfile and before finishAuthentication");
  process.exit(1);
}
console.log("sign-up name reaches the session ok");
