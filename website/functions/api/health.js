import { purgeExpiredFiles } from "./_cleanup_helper.js";

export async function onRequestGet(context) {
    const { env } = context;
    const KV = env.PANIC_STATE;

    const B2_KEY_ID = env.B2_KEY_ID;
    const B2_APPLICATION_KEY = env.B2_APPLICATION_KEY;
    const B2_BUCKET_ID = env.B2_BUCKET_ID;
    const B2_BUCKET_NAME = env.B2_BUCKET_NAME;

    // Check if configuration exists
    if (!KV || !B2_KEY_ID || !B2_APPLICATION_KEY || !B2_BUCKET_ID || !B2_BUCKET_NAME) {
        return new Response(JSON.stringify({
            status: "error",
            errorType: "CONFIGURATION_ERROR",
            message: "Cloudflare Pages environment variables or KV bindings are missing."
        }), {
            status: 503,
            headers: { "Content-Type": "application/json" }
        });
    }

    try {
        // Run background garbage collection for expired files (>10 minutes)
        if (context.waitUntil) {
            context.waitUntil(purgeExpiredFiles(env));
        }

        // Run a quick authentication check to verify B2 credentials and endpoint reachability
        const authHeader = "Basic " + btoa(`${B2_KEY_ID}:${B2_APPLICATION_KEY}`);
        
        // Add a 5-second timeout to prevent stalling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const authRes = await fetch("https://api.backblazeb2.com/b2api/v2/b2_authorize_account", {
            headers: { "Authorization": authHeader },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!authRes.ok) {
            return new Response(JSON.stringify({
                status: "error",
                errorType: "STORAGE_AUTH_ERROR",
                message: "Failed to authenticate with Backblaze B2 storage provider."
            }), {
                status: 503,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Test KV availability by performing a simple query
        await KV.get("panic_lock_state"); // Verify KV reads work

        return new Response(JSON.stringify({ status: "ok" }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        return new Response(JSON.stringify({
            status: "error",
            errorType: "DATABASE_CONNECTION_ERROR",
            message: `Storage database connection failed: ${error.message}`
        }), {
            status: 503,
            headers: { "Content-Type": "application/json" }
        });
    }
}
