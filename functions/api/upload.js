import { registerUpload, purgeExpiredFiles } from "./_cleanup_helper.js";

export async function onRequestPost(context) {
    const { request, env } = context;
    const KV = env.PANIC_STATE;

    const B2_KEY_ID = env.B2_KEY_ID;
    const B2_APPLICATION_KEY = env.B2_APPLICATION_KEY;
    const B2_BUCKET_ID = env.B2_BUCKET_ID;

    if (!B2_KEY_ID || !B2_APPLICATION_KEY || !B2_BUCKET_ID) {
        return new Response("Missing Backblaze B2 environment variables on server.", { status: 500 });
    }

    try {
        // Read file metadata from request headers
        const encodedFileName = request.headers.get("x-file-name");
        const fileSizeStr = request.headers.get("x-file-size");
        const fileType = request.headers.get("x-file-type") || "application/octet-stream";

        if (!encodedFileName || !fileSizeStr) {
            return new Response("Missing file metadata headers (x-file-name, x-file-size).", { status: 400 });
        }

        const fileName = decodeURIComponent(encodedFileName);
        const fileSize = parseInt(fileSizeStr, 10);

        if (fileSize > 100 * 1024 * 1024) {
            return new Response("File exceeds Cloudflare proxy limit of 100 MB.", { status: 400 });
        }

        // Generate unique B2 file name to prevent collision
        const uniqueId = Math.random().toString(36).substring(2, 15);
        const b2FileName = `transfers/${uniqueId}_${fileName}`;

        // 1. Authorize B2 Account
        const authHeader = "Basic " + btoa(`${B2_KEY_ID}:${B2_APPLICATION_KEY}`);
        const authRes = await fetch("https://api.backblazeb2.com/b2api/v2/b2_authorize_account", {
            headers: { "Authorization": authHeader }
        });

        if (!authRes.ok) {
            const errText = await authRes.text();
            throw new Error(`B2 Authorization failed: ${errText}`);
        }

        const { apiUrl, authorizationToken } = await authRes.json();

        // 2. Get B2 Upload URL
        const uploadUrlRes = await fetch(`${apiUrl}/b2api/v2/b2_get_upload_url`, {
            method: "POST",
            headers: {
                "Authorization": authorizationToken,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ bucketId: B2_BUCKET_ID })
        });

        if (!uploadUrlRes.ok) {
            const errText = await uploadUrlRes.text();
            throw new Error(`B2 Get Upload URL failed: ${errText}`);
        }

        const { uploadUrl, authorizationToken: uploadToken } = await uploadUrlRes.json();

        // 3. Pipe client stream directly to Backblaze B2
        const b2UploadRes = await fetch(uploadUrl, {
            method: "POST",
            headers: {
                "Authorization": uploadToken,
                "X-Bz-File-Name": encodeURIComponent(b2FileName),
                "Content-Type": fileType,
                "Content-Length": fileSize.toString(),
                "X-Bz-Content-Sha1": "do_not_verify"
            },
            body: request.body // Streams the body from client to B2
        });

        if (!b2UploadRes.ok) {
            const errText = await b2UploadRes.text();
            throw new Error(`B2 file streaming upload failed: ${errText}`);
        }

        const b2Data = await b2UploadRes.json();
        const fileId = b2Data.fileId;

        // 4. Generate unique 4-digit PIN
        let pin = "";
        let isUnique = false;
        let attempts = 0;

        while (!isUnique && attempts < 10) {
            pin = Math.floor(1000 + Math.random() * 9000).toString();
            const existing = await KV.get(`transfer:pin:${pin}`);
            if (!existing) {
                isUnique = true;
            }
            attempts++;
        }

        if (!isUnique) {
            throw new Error("Failed to generate a unique transfer PIN. Please try again.");
        }

        // 5. Store metadata mapping in KV (10 minutes TTL)
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes from now
        const metadata = {
            fileName,
            fileSize,
            fileType,
            b2FileName,
            fileId,
            expiresAt
        };

        await KV.put(`transfer:pin:${pin}`, JSON.stringify(metadata), { expirationTtl: 600 });

        // 6. Register upload for automatic 10-minute B2 deletion & run background purge
        if (context.waitUntil) {
            context.waitUntil((async () => {
                await registerUpload(env, { pin, fileId, b2FileName, expiresAt });
                await purgeExpiredFiles(env);
            })());
        } else {
            await registerUpload(env, { pin, fileId, b2FileName, expiresAt });
        }

        // 7. Return response to browser
        return new Response(JSON.stringify({ pin }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error("Proxy Upload Error:", error);
        return new Response(`Server error during proxied transfer: ${error.message}`, { status: 500 });
    }
}
