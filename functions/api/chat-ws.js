export async function onRequestGet(context) {
    const { request } = context;

    // Check if the request is a WebSocket upgrade request
    const upgradeHeader = request.headers.get("Upgrade");
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== "websocket") {
        return new Response("Expected Upgrade: websocket", { status: 426 });
    }

    try {
        const targetWsUrl = "wss://lablazy-signaling-server.onrender.com/ws";
        
        // Create a WebSocket pair for the client-server bridge
        const [client, server] = new WebSocketPair();

        // Accept the websocket connection on Cloudflare's side
        server.accept();

        // Connect to the target Render WebSocket server in the background
        const renderWs = new WebSocket(targetWsUrl);

        // Relays messages from the user browser to the Render server
        server.addEventListener("message", (event) => {
            if (renderWs.readyState === WebSocket.OPEN) {
                renderWs.send(event.data);
            }
        });

        server.addEventListener("close", (event) => {
            try {
                renderWs.close(event.code, event.reason);
            } catch (e) {}
        });

        // Relays messages from the Render server back to the user browser
        renderWs.addEventListener("message", (event) => {
            try {
                server.send(event.data);
            } catch (e) {}
        });

        renderWs.addEventListener("close", (event) => {
            try {
                server.close(event.code, event.reason);
            } catch (e) {}
        });

        renderWs.addEventListener("error", () => {
            try {
                server.close(1011, "Target signaling server connection error");
            } catch (e) {}
        });

        // Respond with 101 Switching Protocols status and pass client socket
        return new Response(null, {
            status: 101,
            webSocket: client
        });

    } catch (error) {
        console.error("WebSocket proxy error:", error);
        return new Response(`Error establishing WebSocket tunnel: ${error.message}`, { status: 500 });
    }
}
