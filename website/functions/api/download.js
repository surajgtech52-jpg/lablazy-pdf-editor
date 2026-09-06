import { purgeExpiredFiles } from "./_cleanup_helper.js";

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

        const sessionData = JSON.parse(metadataStr);

        // Normalize files array
        let filesList = [];
        if (sessionData.files && Array.isArray(sessionData.files) && sessionData.files.length > 0) {
            filesList = sessionData.files;
        } else if (sessionData.fileName) {
            filesList = [{
                index: 0,
                name: sessionData.fileName,
                size: sessionData.fileSize,
                type: sessionData.fileType || "application/octet-stream",
                b2FileName: sessionData.b2FileName
            }];
        }

        // If client requests metadata manifest
        if (url.searchParams.get("metadata") === "true") {
            const totalSize = sessionData.totalSize || filesList.reduce((acc, f) => acc + (f.size || 0), 0);
            return new Response(JSON.stringify({ 
                pin,
                fileCount: filesList.length,
                totalSize,
                status: sessionData.status || "ready",
                files: filesList.map((f, i) => ({
                    index: f.index !== undefined ? f.index : i,
                    name: f.name,
                    size: f.size,
                    type: f.type
                }))
            }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        // Determine which file to download
        const fileIndexParam = url.searchParams.get("fileIndex");
        let targetFile = filesList[0];

        if (fileIndexParam !== null) {
            const reqIdx = parseInt(fileIndexParam, 10);
            const found = filesList.find(f => (f.index !== undefined ? f.index : 0) === reqIdx) || filesList[reqIdx];
            if (found) targetFile = found;
        }

        if (!targetFile || !targetFile.b2FileName) {
            return new Response("Requested file not found in transfer session.", { status: 404 });
        }

        const fileName = targetFile.name;
        const fileSize = targetFile.size;
        const fileType = targetFile.type || "application/octet-stream";
        const b2FileName = targetFile.b2FileName;

        // 2. Authorize B2 Account (Using 12-hour KV cache)
        let b2Auth = null;
        try {
            const cachedAuth = await KV.get("cache:b2_auth");
            if (cachedAuth) b2Auth = JSON.parse(cachedAuth);
        } catch (e) {}

        if (!b2Auth || !b2Auth.downloadUrl || !b2Auth.authorizationToken) {
            const authHeader = "Basic " + btoa(`${B2_KEY_ID}:${B2_APPLICATION_KEY}`);
            const authRes = await fetch("https://api.backblazeb2.com/b2api/v2/b2_authorize_account", {
                headers: { "Authorization": authHeader }
            });

            if (!authRes.ok) {
                const errText = await authRes.text();
                throw new Error(`B2 Authorization failed: ${errText}`);
            }

            const freshAuth = await authRes.json();
            b2Auth = {
                apiUrl: freshAuth.apiUrl,
                authorizationToken: freshAuth.authorizationToken,
                downloadUrl: freshAuth.downloadUrl
            };
            await KV.put("cache:b2_auth", JSON.stringify(b2Auth), { expirationTtl: 43200 });
        }

        const { downloadUrl, authorizationToken } = b2Auth;

        // 3. Fetch file binary stream from B2
        const b2FileUrl = `${downloadUrl}/file/${B2_BUCKET_NAME}/${encodeURIComponent(b2FileName)}`;
        const b2FileRes = await fetch(b2FileUrl, {
            headers: { "Authorization": authorizationToken }
        });

        if (!b2FileRes.ok) {
            throw new Error(`Failed to fetch file from storage: status ${b2FileRes.status}`);
        }

        // 4. Background garbage collector for expired files (older than 10 minutes)
        if (context.waitUntil) {
            context.waitUntil(purgeExpiredFiles(env));
        }

        // 5. Pipe binary stream back to client browser
        return new Response(b2FileRes.body, {
            headers: {
                "Content-Type": fileType || "application/octet-stream",
                "Content-Length": (fileSize || 0).toString(),
                "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`
            }
        });

    } catch (error) {
        console.error("Proxy Download Error:", error);
        return new Response(`Server error during file retrieval: ${error.message}`, { status: 500 });
    }
}
