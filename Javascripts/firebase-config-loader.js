// Offline stub for Firebase in the pomopop-offline branch.
// Exports remain for compatibility, but no network calls are made.

let firebaseInitialized = true;
const firebaseError = null;

export async function waitForFirebase() {
  return { initialized: firebaseInitialized, error: firebaseError };
}

export const auth = null;
export const googleProvider = null;
export const githubProvider = null;
export const analytics = null;
export const db = null;
