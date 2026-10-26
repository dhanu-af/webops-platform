// Generated wrappers: see unwrap.ts. Import these (not lib/actions) from client components.
import { unwrapAction } from "./unwrap";
import { kioskSignIn as kioskSignInRaw, kioskSignOut as kioskSignOutRaw } from "@/lib/actions/kiosk";

export const kioskSignIn = unwrapAction(kioskSignInRaw);
export const kioskSignOut = unwrapAction(kioskSignOutRaw);
