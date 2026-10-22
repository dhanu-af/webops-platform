// The running release (URS-19). Version comes from package.json at build time
// (see next.config.ts); the short git SHA pins it to an exact deployment.
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0-dev";
export const APP_BUILD = process.env.NEXT_PUBLIC_GIT_SHA ?? "";

/** What gets stored on records and signatures: "0.2.0+a1b2c3d" (or "0.2.0" locally). */
export const APP_VERSION_STAMP = APP_BUILD ? `${APP_VERSION}+${APP_BUILD}` : APP_VERSION;
