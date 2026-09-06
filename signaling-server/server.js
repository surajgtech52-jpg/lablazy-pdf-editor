const http = require('http');
const { WebSocketServer } = require('ws');

const port = process.env.PORT || 8080;

let panicState = false;

// Create HTTP server for health checks & panic controls
const server = http.createServer((req, res) => {
    const url = req.url;
    
    if (url === '/health' || url === '/') {
        if (panicState) {
            res.writeHead(503, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
            res.end('Panic Mode Active');
            return;
        }
        res.writeHead(200, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
        res.end('OK');
        return;
    }

    if (url.startsWith('/room-count')) {
        try {
            const parsedUrl = new URL(url, `http://${req.headers.host || 'localhost'}`);
            const targetRoom = (parsedUrl.searchParams.get('room') || '').trim().toLowerCase();
            const count = rooms[targetRoom] ? rooms[targetRoom].size : 0;
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ room: targetRoom, count }));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
            res.end('Error retrieving room count');
        }
        return;
    }
    
    if (url.startsWith('/panic')) {
        panicState = true;
        console.warn("⚠️ PANIC STATE ENABLED: Disconnecting all clients and entering lockdown.");
        
        // Broadcast panic message to all clients
        const payload = JSON.stringify({ action: 'panic' });
        wss.clients.forEach((client) => {
            if (client.readyState === 1) { // 1 = OPEN
                try {
                    client.send(payload);
                    client.close(1008, "Panic Lockdown");
                } catch (e) {}
            }
        });
        
        res.writeHead(200, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
        res.end('Panic Lockdown Triggered');
        return;
    }

    if (url.startsWith('/unpanic')) {
        panicState = false;
        console.log("🟢 PANIC STATE DISABLED: Accepting connections again.");
        res.writeHead(200, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
        res.end('Lockdown Lifted');
        return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
});

// Set up WebSocket Server for Room Discovery & Chat
const wss = new WebSocketServer({ noServer: true });
const rooms = {};
const wsRateLimits = new Map(); // tracks ws -> { count, startTime }
const bannedIPs = new Map(); // tracks ip -> banExpirationTime

const getClientIp = (request) => {
    if (request && request.headers && request.headers['x-forwarded-for']) {
        return request.headers['x-forwarded-for'].split(',')[0].trim();
    }
    return request && request.socket ? request.socket.remoteAddress : 'unknown-ip';
};

wss.on('connection', (ws, request) => {
    let currentRoom = null;
    let myPeerId = null;

    ws.on('message', (message) => {
        try {
            const ip = getClientIp(request);
            const banExpires = bannedIPs.get(ip);
            if (banExpires && Date.now() < banExpires) {
                console.warn(`Ignoring message from banned IP: ${ip}`);
                ws.close(1008, "Banned for 5 minutes");
                return;
            }

            // 1. Limit message payload size to 32KB
            if (message.length > 32768) {
                console.warn(`WebSocket message length limit exceeded (size: ${message.length}) by IP: ${ip}. Banning for 5 minutes.`);
                bannedIPs.set(ip, Date.now() + 300000); // 5 minutes ban
                ws.close(1009, "Message size limit exceeded");
                return;
            }

            // 2. Simple Rate Limiting: max 40 messages per 10 seconds
            const now = Date.now();
            let limit = wsRateLimits.get(ws);
            if (!limit) {
                limit = { count: 1, startTime: now };
                wsRateLimits.set(ws, limit);
            } else {
                limit.count++;
                if (now - limit.startTime < 10000) { // 10s window
                    if (limit.count > 40) {
                        console.warn(`Rate limit exceeded by IP: ${ip}. Banning for 5 minutes.`);
                        bannedIPs.set(ip, Date.now() + 300000); // 5 minutes ban
                        ws.close(1008, "Rate limit exceeded");
                        return;
                    }
                } else {
                    limit.count = 1;
                    limit.startTime = now;
                }
            }

            // Safely convert buffer to string before parsing
            const data = JSON.parse(message.toString());
            
            if (data.action === 'join') {
                // Defensive cleanup: remove client from old room if they rejoin on same socket context
                if (currentRoom && rooms[currentRoom]) {
                    rooms[currentRoom].delete(ws);
                    if (rooms[currentRoom].size === 0) {
                        delete rooms[currentRoom];
                    }
                }

                const targetRoom = data.room.trim().toLowerCase();
                let chosenRoom = targetRoom;
                let suffix = 0;

                // Loop to find the first room key that has less than 25 clients
                while (rooms[chosenRoom] && rooms[chosenRoom].size >= 25) {
                    suffix++;
                    chosenRoom = targetRoom + suffix;
                }

                currentRoom = chosenRoom;
                myPeerId = data.id;
                
                if (!rooms[currentRoom]) {
                    rooms[currentRoom] = new Set();
                }
                rooms[currentRoom].add(ws);
                console.log(`Peer ${myPeerId} joined room: ${currentRoom}. Total: ${rooms[currentRoom].size}`);

                // Inform the client of the actual room they joined
                ws.send(JSON.stringify({
                    action: 'joined-room-info',
                    originalRoom: data.room,
                    joinedRoom: currentRoom
                }));
            }

            // Broadcast message to all other clients in the same room
            if (currentRoom && rooms[currentRoom]) {
                const payload = JSON.stringify(data);
                rooms[currentRoom].forEach((client) => {
                    if (client !== ws && client.readyState === 1) { // 1 = OPEN
                        try {
                            client.send(payload);
                        } catch (sendError) {
                            console.error("Error sending message during broadcast:", sendError);
                        }
                    }
                });
            }
        } catch (e) {
            console.error("Error processing message:", e);
        }
    });

    ws.on('close', () => {
        wsRateLimits.delete(ws);
        if (currentRoom && rooms[currentRoom]) {
            rooms[currentRoom].delete(ws);
            console.log(`Peer ${myPeerId || 'unknown'} disconnected from room: ${currentRoom}. Remaining: ${rooms[currentRoom].size}`);
            
            // Broadcast leave to remaining room peers
            if (myPeerId) {
                const leavePayload = JSON.stringify({ action: 'leave', id: myPeerId, room: currentRoom });
                rooms[currentRoom].forEach((client) => {
                    if (client.readyState === 1) { // 1 = OPEN
                        try {
                            client.send(leavePayload);
                        } catch (e) {}
                    }
                });
            }

            if (rooms[currentRoom].size === 0) {
                delete rooms[currentRoom];
            }
        }
    });
});

// Handle HTTP upgrades: route '/ws' or '/ws/' to WebSocket, ignore rest (crash-proofed)
server.on('upgrade', (request, socket, head) => {
    try {
        if (panicState) {
            console.warn("Rejecting WebSocket upgrade: Panic Mode is active.");
            socket.destroy();
            return;
        }

        const ip = getClientIp(request);
        const banExpires = bannedIPs.get(ip);
        if (banExpires && Date.now() < banExpires) {
            const remaining = Math.round((banExpires - Date.now()) / 1000);
            console.warn(`Rejecting connection upgrade from banned IP: ${ip}. Remaining: ${remaining}s`);
            socket.destroy();
            return;
        }

        const host = request.headers.host || 'localhost';
        const url = new URL(request.url, `http://${host}`);
        
        if (url.pathname === '/ws' || url.pathname === '/ws/') {
            wss.handleUpgrade(request, socket, head, (ws) => {
                wss.emit('connection', ws, request);
            });
        } else {
            socket.destroy();
        }
    } catch (err) {
        console.error("HTTP Upgrade Error:", err);
        socket.destroy();
    }
});

server.listen(port, () => {
    console.log(`WebSocket Signaling Server is listening on port ${port}`);
});
