/**
 * Next.js instrumentation hook.
 * Imported once when the server starts (both Node.js and Edge runtimes).
 * Sentry uses this to initialise its server-side SDK before any request is handled.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}
