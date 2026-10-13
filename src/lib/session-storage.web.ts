/** Where the sign-in session is kept. Undefined during static rendering, which runs outside a browser. */
export const sessionStorage: Storage | undefined = typeof window === 'undefined' ? undefined : window.localStorage;
