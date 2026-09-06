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
        const { room, senderId, senderName, senderEmoji, message, timestamp } = body;

        if (!message || !message.trim()) {
            return new Response(JSON.stringify({ error: "Empty message" }), { status: 400 });
        }

        const roomKey = (room || "lobby").trim().toLowerCase();
        const newMsg = {
            action: "chat",
            room: roomKey,
            senderId: senderId || "anonymous",
            senderName: senderName || "Anonymous",
            senderEmoji: senderEmoji || "💬",
            message: message.trim().substring(0, 500),
            timestamp: timestamp || Date.now()
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
