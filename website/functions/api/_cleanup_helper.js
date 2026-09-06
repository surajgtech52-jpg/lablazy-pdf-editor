/**
 * Helper to record an upload and automatically purge files older than 10 minutes from Backblaze B2.
 */

export async function registerUpload(env, { pin, fileId, b2FileName, expiresAt, files }) {
    const KV = env.PANIC_STATE;
    if (!KV) return;

    try {
        const rawList = await KV.get("transfer:active_list");
        let list = rawList ? JSON.parse(rawList) : [];
        list.push({ pin, fileId, b2FileName, expiresAt, files });
        await KV.put("transfer:active_list", JSON.stringify(list), { expirationTtl: 86400 });
    } catch (err) {
        console.error("Failed to register active upload:", err);
    }
}

export async function purgeExpiredFiles(env) {
    const KV = env.PANIC_STATE;
    const B2_KEY_ID = env.B2_KEY_ID;
    const B2_APPLICATION_KEY = env.B2_APPLICATION_KEY;

    if (!KV || !B2_KEY_ID || !B2_APPLICATION_KEY) return;

    try {
        const rawList = await KV.get("transfer:active_list");
        if (!rawList) return;

        let list = JSON.parse(rawList);
        const now = Date.now();

        const expired = list.filter(item => now >= item.expiresAt);
        const remaining = list.filter(item => now < item.expiresAt);

        if (expired.length === 0) return;

        // Authorize B2 Account
        const authHeader = "Basic " + btoa(`${B2_KEY_ID}:${B2_APPLICATION_KEY}`);
        const authRes = await fetch("https://api.backblazeb2.com/b2api/v2/b2_authorize_account", {
            headers: { "Authorization": authHeader }
        });

        if (!authRes.ok) {
            console.error("B2 Authorization failed during cleanup");
            return;
        }

        const { apiUrl, authorizationToken } = await authRes.json();

        for (const item of expired) {
            try {
                // Purge all files in multi-file manifest
                if (item.files && Array.isArray(item.files)) {
                    for (const f of item.files) {
                        if (f.fileId && f.b2FileName) {
                            await fetch(`${apiUrl}/b2api/v2/b2_delete_file_version`, {
                                method: "POST",
                                headers: {
                                    "Authorization": authorizationToken,
                                    "Content-Type": "application/json"
                                },
                                body: JSON.stringify({
                                    fileId: f.fileId,
                                    fileName: f.b2FileName
                                })
                            }).catch(() => {});
                        }
                    }
                } else if (item.fileId && item.b2FileName) {
                    await fetch(`${apiUrl}/b2api/v2/b2_delete_file_version`, {
                        method: "POST",
                        headers: {
                            "Authorization": authorizationToken,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            fileId: item.fileId,
                            fileName: item.b2FileName
                        })
                    }).catch(() => {});
                }

                if (item.pin) {
                    await KV.delete(`transfer:pin:${item.pin}`);
                }
            } catch (delErr) {
                console.error("Failed to purge expired files from B2:", delErr);
            }
        }

        await KV.put("transfer:active_list", JSON.stringify(remaining), { expirationTtl: 86400 });
    } catch (err) {
        console.error("Purge expired files routine error:", err);
    }
}
