export async function onRequestGet(context) {
    const { request, env } = context;
    const KV = env.PANIC_STATE;

    if (!KV) {
        return new Response(JSON.stringify({ error: "KV binding missing" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }

    try {
        const url = new URL(request.url);
        const room = (url.searchParams.get("room") || "lobby").trim().toLowerCase();
        const after = parseInt(url.searchParams.get("after") || "0", 10);

        const rawChat = await KV.get(`chat:room:${room}`);
        const allMessages = rawChat ? JSON.parse(rawChat) : [];

        // Return only messages created after the client's last known timestamp
        const newMessages = after > 0 
            ? allMessages.filter(m => m.timestamp > after)
            : allMessages.slice(-30); // Return latest 30 messages on first load

        return new Response(JSON.stringify({ messages: newMessages }), {
            headers: { 
                "Content-Type": "application/json",
                "Cache-Control": "no-cache, no-store, must-revalidate"
            }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message, messages: [] }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}

export async function onRequestPost(context) {
    const { request, env } = context;
    const KV = env.PANIC_STATE;

    if (!KV) {
        return new Response(JSON.stringify({ error: "KV binding missing" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }

    try {
        const body = await request.json();

        if (body.action === 'reaction') {
            const { msgId, emoji, senderId } = body;
            const roomKey = (body.room || "lobby").trim().toLowerCase();
            const rawChat = await KV.get(`chat:room:${roomKey}`);
            let allMessages = rawChat ? JSON.parse(rawChat) : [];
            const targetMsg = allMessages.find(m => m.msgId === msgId);
            if (targetMsg) {
                targetMsg.reactions = targetMsg.reactions || {};
                targetMsg.reactions[emoji] = targetMsg.reactions[emoji] || [];
                const idx = targetMsg.reactions[emoji].indexOf(senderId);
                if (idx > -1) {
                    targetMsg.reactions[emoji].splice(idx, 1);
                    if (targetMsg.reactions[emoji].length === 0) {
                        delete targetMsg.reactions[emoji];
                    }
                } else {
                    targetMsg.reactions[emoji].push(senderId);
                }
                await KV.put(`chat:room:${roomKey}`, JSON.stringify(allMessages), { expirationTtl: 7200 });
                return new Response(JSON.stringify({ success: true, reactions: targetMsg.reactions, msgId }), {
                    headers: { "Content-Type": "application/json" }
                });
            }
            return new Response(JSON.stringify({ error: "Message not found" }), { status: 404 });
        }

        const { room, senderId, senderName, senderEmoji, message, timestamp, replyTo, reactions } = body;

        if (!message || !message.trim()) {
            return new Response(JSON.stringify({ error: "Empty message" }), { status: 400 });
        }

        const roomKey = (room || "lobby").trim().toLowerCase();
        const newMsg = {
            action: "chat",
            room: roomKey,
            msgId: body.msgId ? String(body.msgId).substring(0, 100) : `${senderId || 'anon'}_${timestamp || Date.now()}`,
            senderId: senderId || "anonymous",
            senderName: senderName || "Anonymous",
            senderEmoji: senderEmoji || "💬",
            message: message.trim().substring(0, 500),
            timestamp: timestamp || Date.now(),
            reactions: reactions && typeof reactions === 'object' ? reactions : {},
            replyTo: replyTo && typeof replyTo === 'object' ? {
                msgId: replyTo.msgId ? String(replyTo.msgId).substring(0, 100) : '',
                senderId: replyTo.senderId ? String(replyTo.senderId).substring(0, 100) : '',
                senderName: replyTo.senderName ? String(replyTo.senderName).substring(0, 50) : 'Anonymous',
                senderEmoji: replyTo.senderEmoji ? String(replyTo.senderEmoji).substring(0, 10) : '💬',
                text: replyTo.text ? String(replyTo.text).substring(0, 300) : ''
            } : null
        };

        const rawChat = await KV.get(`chat:room:${roomKey}`);
        let allMessages = rawChat ? JSON.parse(rawChat) : [];

        // Add message & keep latest 50 messages to prevent bloat
        allMessages.push(newMsg);
        if (allMessages.length > 50) {
            allMessages = allMessages.slice(-50);
        }

        // Store with 2-hour TTL
        await KV.put(`chat:room:${roomKey}`, JSON.stringify(allMessages), { expirationTtl: 7200 });

        return new Response(JSON.stringify({ success: true, message: newMsg }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
