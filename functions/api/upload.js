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
        const url = new URL(request.url);
        const action = url.searchParams.get("action");

        // Helper: Get or refresh cached B2 authorization
        async function getB2Auth() {
            let b2Auth = null;
            try {
                const cachedAuth = await KV.get("cache:b2_auth");
                if (cachedAuth) b2Auth = JSON.parse(cachedAuth);
            } catch (e) {}

            if (!b2Auth || !b2Auth.apiUrl || !b2Auth.authorizationToken) {
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
            return b2Auth;
        }

        // Helper: Generate a unique 4-digit PIN
        async function generateUniquePin() {
            let pin = "";
            let isUnique = false;
            let attempts = 0;
            while (!isUnique && attempts < 10) {
                pin = Math.floor(1000 + Math.random() * 9000).toString();
                const existing = await KV.get(`transfer:pin:${pin}`);
                if (!existing) isUnique = true;
                attempts++;
            }
            if (!isUnique) throw new Error("Failed to generate a unique transfer PIN.");
            return pin;
        }

        // ACTION 1: Init Multi-File Transfer Session
        if (action === "init-session") {
            const pin = await generateUniquePin();
            const fileCount = parseInt(request.headers.get("x-file-count") || "1", 10);
            const totalSize = parseInt(request.headers.get("x-total-size") || "0", 10);
            const expiresAt = Date.now() + 10 * 60 * 1000;

            const sessionMetadata = {
                pin,
                fileCount,
                totalSize,
                status: "uploading",
                files: [],
                expiresAt
            };

            await KV.put(`transfer:pin:${pin}`, JSON.stringify(sessionMetadata), { expirationTtl: 600 });

            return new Response(JSON.stringify({ pin, expiresAt }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        // ACTION 2: Upload Individual File into Session Manifest
        if (action === "upload-file") {
            const pin = url.searchParams.get("pin");
            const fileIndex = parseInt(url.searchParams.get("fileIndex") || "0", 10);

            if (!pin || !/^\d{4}$/.test(pin)) {
                return new Response("Invalid or missing session PIN.", { status: 400 });
            }

            const rawMetadata = await KV.get(`transfer:pin:${pin}`);
            if (!rawMetadata) {
                return new Response("Transfer session not found or expired.", { status: 404 });
            }

            const sessionMetadata = JSON.parse(rawMetadata);
            const encodedFileName = request.headers.get("x-file-name");
            const fileSizeStr = request.headers.get("x-file-size");
            const fileType = request.headers.get("x-file-type") || "application/octet-stream";

            if (!encodedFileName || !fileSizeStr) {
                return new Response("Missing file headers.", { status: 400 });
            }

            const fileName = decodeURIComponent(encodedFileName);
            const fileSize = parseInt(fileSizeStr, 10);
            const b2FileName = `transfers/${pin}_${fileIndex}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

            const { apiUrl, authorizationToken } = await getB2Auth();

            // Get B2 Upload URL
            const uploadUrlRes = await fetch(`${apiUrl}/b2api/v2/b2_get_upload_url`, {
                method: "POST",
                headers: {
                    "Authorization": authorizationToken,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ bucketId: B2_BUCKET_ID })
            });

            if (!uploadUrlRes.ok) {
                await KV.delete("cache:b2_auth");
                const errText = await uploadUrlRes.text();
                throw new Error(`B2 Get Upload URL failed: ${errText}`);
            }

            const { uploadUrl, authorizationToken: uploadToken } = await uploadUrlRes.json();

            // Pipe file stream directly to Backblaze B2
            const b2UploadRes = await fetch(uploadUrl, {
                method: "POST",
                headers: {
                    "Authorization": uploadToken,
                    "X-Bz-File-Name": encodeURIComponent(b2FileName),
                    "Content-Type": fileType,
                    "Content-Length": fileSize.toString(),
                    "X-Bz-Content-Sha1": "do_not_verify"
                },
                body: request.body
            });

            if (!b2UploadRes.ok) {
                const errText = await b2UploadRes.text();
                throw new Error(`B2 file streaming upload failed: ${errText}`);
            }

            const b2Data = await b2UploadRes.json();
            const fileId = b2Data.fileId;

            // Append to session manifest in KV
            if (!sessionMetadata.files) sessionMetadata.files = [];
            sessionMetadata.files.push({
                index: fileIndex,
                name: fileName,
                size: fileSize,
                type: fileType,
                fileId,
                b2FileName
            });

            await KV.put(`transfer:pin:${pin}`, JSON.stringify(sessionMetadata), { expirationTtl: 600 });

            return new Response(JSON.stringify({ success: true, fileIndex, fileId }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        // ACTION 3: Finalize Multi-File Transfer Session
        if (action === "finalize-session") {
            const pin = url.searchParams.get("pin");
            if (!pin || !/^\d{4}$/.test(pin)) {
                return new Response("Invalid PIN.", { status: 400 });
            }

            const rawMetadata = await KV.get(`transfer:pin:${pin}`);
            if (!rawMetadata) {
                return new Response("Transfer session not found.", { status: 404 });
            }

            const sessionMetadata = JSON.parse(rawMetadata);
            sessionMetadata.status = "ready";

            await KV.put(`transfer:pin:${pin}`, JSON.stringify(sessionMetadata), { expirationTtl: 600 });

            // Register for 10-minute automated cleanup
            if (context.waitUntil) {
                context.waitUntil((async () => {
                    await registerUpload(env, {
                        pin,
                        files: sessionMetadata.files,
                        expiresAt: sessionMetadata.expiresAt
                    });
                    await purgeExpiredFiles(env);
                })());
            } else {
                await registerUpload(env, {
                    pin,
                    files: sessionMetadata.files,
                    expiresAt: sessionMetadata.expiresAt
                });
            }

            return new Response(JSON.stringify({ success: true, pin, status: "ready" }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        // DEFAULT: Legacy Single-File Direct Upload
        const encodedFileName = request.headers.get("x-file-name");
        const fileSizeStr = request.headers.get("x-file-size");
        const fileType = request.headers.get("x-file-type") || "application/octet-stream";

        if (!encodedFileName || !fileSizeStr) {
            return new Response("Missing file metadata headers.", { status: 400 });
        }

        const fileName = decodeURIComponent(encodedFileName);
        const fileSize = parseInt(fileSizeStr, 10);
        const uniqueId = Math.random().toString(36).substring(2, 15);
        const b2FileName = `transfers/${uniqueId}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

        const { apiUrl, authorizationToken } = await getB2Auth();

        const uploadUrlRes = await fetch(`${apiUrl}/b2api/v2/b2_get_upload_url`, {
            method: "POST",
            headers: {
                "Authorization": authorizationToken,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ bucketId: B2_BUCKET_ID })
        });

        if (!uploadUrlRes.ok) {
            await KV.delete("cache:b2_auth");
            const errText = await uploadUrlRes.text();
            throw new Error(`B2 Get Upload URL failed: ${errText}`);
        }

        const { uploadUrl, authorizationToken: uploadToken } = await uploadUrlRes.json();

        const b2UploadRes = await fetch(uploadUrl, {
            method: "POST",
            headers: {
                "Authorization": uploadToken,
                "X-Bz-File-Name": encodeURIComponent(b2FileName),
                "Content-Type": fileType,
                "Content-Length": fileSize.toString(),
                "X-Bz-Content-Sha1": "do_not_verify"
            },
            body: request.body
        });

        if (!b2UploadRes.ok) {
            const errText = await b2UploadRes.text();
            throw new Error(`B2 file streaming upload failed: ${errText}`);
        }

        const b2Data = await b2UploadRes.json();
        const fileId = b2Data.fileId;
        const pin = await generateUniquePin();

        const expiresAt = Date.now() + 10 * 60 * 1000;
        const metadata = {
            fileName,
            fileSize,
            fileType,
            fileCount: 1,
            files: [{ index: 0, name: fileName, size: fileSize, type: fileType, fileId, b2FileName }],
            b2FileName,
            fileId,
            expiresAt
        };

        await KV.put(`transfer:pin:${pin}`, JSON.stringify(metadata), { expirationTtl: 600 });

        if (context.waitUntil) {
            context.waitUntil((async () => {
                await registerUpload(env, { pin, fileId, b2FileName, expiresAt, files: metadata.files });
                await purgeExpiredFiles(env);
            })());
        } else {
            await registerUpload(env, { pin, fileId, b2FileName, expiresAt, files: metadata.files });
        }

        return new Response(JSON.stringify({ pin }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error("Proxy Upload Error:", error);
        return new Response(`Server error during proxied transfer: ${error.message}`, { status: 500 });
    }
}
