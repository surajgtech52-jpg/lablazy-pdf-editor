export async function onRequestGet(context) {
    const { request, env } = context;
    const KV = env.PANIC_STATE;

    const B2_KEY_ID = env.B2_KEY_ID;
    const B2_APPLICATION_KEY = env.B2_APPLICATION_KEY;
    const B2_BUCKET_NAME = env.B2_BUCKET_NAME;

    if (!B2_KEY_ID || !B2_APPLICATION_KEY || !B2_BUCKET_NAME) {
        return new Response("Missing Backblaze B2 environment variables on server.", { status: 500 });
    }

    try {
        const url = new URL(request.url);
        const pin = url.searchParams.get("pin");

        if (!pin || !/^\d{4}$/.test(pin)) {
            return new Response("Invalid or missing transfer key PIN.", { status: 400 });
        }

        // 1. Retrieve metadata from KV
        const metadataStr = await KV.get(`transfer:pin:${pin}`);
        if (!metadataStr) {
            return new Response("Key has expired or is invalid.", { status: 404 });
        }

        const { fileName, fileSize, fileType, b2FileName } = JSON.parse(metadataStr);

        // If client only requests metadata (to display file details in UI before download)
        if (url.searchParams.get("metadata") === "true") {
            return new Response(JSON.stringify({ fileName, fileSize, fileType }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        // 2. Authorize B2 Account
        const authHeader = "Basic " + btoa(`${B2_KEY_ID}:${B2_APPLICATION_KEY}`);
        const authRes = await fetch("https://api.backblazeb2.com/b2api/v2/b2_authorize_account", {
            headers: { "Authorization": authHeader }
        });

        if (!authRes.ok) {
            const errText = await authRes.text();
            throw new Error(`B2 Authorization failed: ${errText}`);
        }

        const { downloadUrl, authorizationToken } = await authRes.json();

        // 3. Fetch file binary stream from B2
        const b2FileUrl = `${downloadUrl}/file/${B2_BUCKET_NAME}/${encodeURIComponent(b2FileName)}`;
        const b2FileRes = await fetch(b2FileUrl, {
            headers: { "Authorization": authorizationToken }
        });

        if (!b2FileRes.ok) {
            throw new Error(`Failed to fetch file from storage: status ${b2FileRes.status}`);
        }

        // 4. Pipe binary stream back to client browser
        return new Response(b2FileRes.body, {
            headers: {
                "Content-Type": fileType || "application/octet-stream",
                "Content-Length": fileSize.toString(),
                "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`
            }
        });

    } catch (error) {
        console.error("Proxy Download Error:", error);
        return new Response(`Server error during file retrieval: ${error.message}`, { status: 500 });
    }
}
