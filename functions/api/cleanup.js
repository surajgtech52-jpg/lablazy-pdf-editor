import { purgeExpiredFiles } from "./_cleanup_helper.js";

export async function onRequestGet(context) {
    const { env } = context;
    try {
        await purgeExpiredFiles(env);
        return new Response(JSON.stringify({ success: true, message: "Expired files purged." }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
