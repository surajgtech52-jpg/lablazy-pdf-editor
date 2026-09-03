/**
 * ==========================================================================
 * LABLAZY UNIFIED CHAT MODULE
 * ==========================================================================
 * This module provides a consistent chat experience across all pages.
 * It handles WebSocket connections, message caching, UI updates, and room management.
 */
function initializeUnifiedChat() {
    if (window.chatInitialized) {
        console.log("Unified Chat already initialized.");
        return;
    }
    window.chatInitialized = true;

    // --- DOM Elements ---
    const navChatBtn = document.getElementById('navChatBtn');
    const navChatBadge = document.getElementById('navChatBadge');
    const modalChatBtn = document.getElementById('modalChatBtn');
    const modalChatBadge = document.getElementById('modalChatBadge');
    const chatModal = document.getElementById('chatModal');
    const chatDialog = document.getElementById('chatDialog');
    const closeChatBtn = document.getElementById('closeChatBtn');
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const sendChatBtn = document.getElementById('sendChatBtn');
    const chatRoomCode = document.getElementById('chatRoomCode');
    const chatChangeRoomBtn = document.getElementById('chatChangeRoomBtn');

    // --- App State ---
    const USE_LOCAL_SERVER = (window.location.hostname === 'localhost' || 
                              window.location.hostname === '127.0.0.1' || 
                              window.location.hostname === '[::1]') && 
                             (window.location.search.includes('local=true') || (typeof AppConfig !== 'undefined' && AppConfig.FORCE_LOCAL));
    const SIGNALING_HOST = USE_LOCAL_SERVER ? 'localhost:8080' : (typeof AppConfig !== 'undefined' ? AppConfig.SIGNALING_HOST : 'lablazy-signaling-server.onrender.com');

    let signalingSocket = null;
    let heartbeatIntervalId = null;
    let reconnectTimeoutId = null;
    let httpPollInterval = null;
    let lastPolledTimestamp = 0;
    const seenMsgKeys = new Set();
    let intentionalClose = false;
    let myRoom = localStorage.getItem('lablazy_room') || sessionStorage.getItem('lablazy_room') || 'lobby';
    let myRoomDisplay = localStorage.getItem('lablazy_room_display') || sessionStorage.getItem('lablazy_room_display') || 'LOBBY';
    let myNickname = '';
    let myPeerId = '';
    let myEmoji = '💻';
    let unreadChatCount = 0;

    function createBackgroundInterval(callback, delay) {
        try {
            const blob = new Blob([`
                let intervalId = null;
                self.onmessage = function(e) {
                    if (e.data.action === 'start') {
                        if (intervalId) clearInterval(intervalId);
                        intervalId = setInterval(() => {
                            self.postMessage('tick');
                        }, e.data.delay);
                    } else if (e.data.action === 'stop') {
                        if (intervalId) clearInterval(intervalId);
                    }
                };
            `], { type: 'application/javascript' });
            const worker = new Worker(URL.createObjectURL(blob));
            worker.onmessage = function() {
                callback();
            };
            worker.postMessage({ action: 'start', delay: delay });
            return {
                clear: () => {
                    worker.postMessage({ action: 'stop' });
                    worker.terminate();
                }
            };
        } catch (e) {
            console.warn("Background Web Worker not supported, falling back to setInterval:", e);
            const intervalId = setInterval(callback, delay);
            return {
                clear: () => clearInterval(intervalId)
            };
        }
    }

    // --- Emojis and Name Generation ---
    const animalEmojis = new Map([
        ["Unicorn", "🦄"], ["Robot", "🤖"], ["Ghost", "👻"], ["Donut", "🍩"], ["Rocket", "🚀"],
        ["Bear", "🐻"], ["Cat", "🐱"], ["Dog", "🐶"], ["Monkey", "🐵"], ["Frog", "🐸"],
        ["Panda", "🐼"], ["Koala", "🐨"], ["Dinosaur", "🦖"], ["Alien", "👽"], ["Octopus", "🐙"],
        ["Butterfly", "🦋"], ["Flamingo", "🦩"], ["Pizza", "🍕"], ["IceCream", "🍦"], ["Balloon", "🎈"],
        ["Heart", "💖"], ["Clover", "🍀"], ["Star", "⭐"], ["Crown", "👑"], ["Falcon", "🦅"],
        ["Dolphin", "🐬"], ["Tiger", "🐯"], ["Fox", "🦊"], ["Cheetah", "🐆"], ["Owl", "🦉"],
        ["Rabbit", "🐰"], ["Lion", "🦁"]
    ]);
    const adjectives = [
        "Happy", "Sleepy", "Lazy", "Crazy", "Dancing", "Singing", "Jumping", 
        "Silly", "Cool", "Funky", "Brave", "Clever", "Shiny", "Cosmic", 
        "Magic", "Sneaky", "Jolly", "Cheeky", "Daring", "Speedy"
    ];
    const animalsList = Array.from(animalEmojis.keys());

    function getRandomName() {
        const adj = adjectives.at(Math.floor(Math.random() * adjectives.length));
        const ani = animalsList.at(Math.floor(Math.random() * animalsList.length));
        return `${adj} ${ani}`;
    }

    function showChatToast(message, type = 'error') {
        console.warn(`Chat (${type}): ${message}`);
    }

    function updateChatStatus(status) {
        const chatRoomCodeEl = document.getElementById('chatRoomCode');
        if (!chatRoomCodeEl) return;
        let statusEl = document.getElementById('chatConnStatus');
        if (!statusEl) {
            statusEl = document.createElement('span');
            statusEl.id = 'chatConnStatus';
            statusEl.style.fontSize = '0.7rem';
            statusEl.style.fontWeight = '700';
            statusEl.style.padding = '0.15rem 0.4rem';
            statusEl.style.borderRadius = '4px';
            statusEl.style.marginLeft = '0.5rem';
            statusEl.style.verticalAlign = 'middle';
            chatRoomCodeEl.parentNode.appendChild(statusEl);
        }
        if (status === 'connected') {
            statusEl.textContent = '● Live';
            statusEl.style.color = '#10b981';
            statusEl.style.background = 'rgba(16, 185, 129, 0.1)';
        } else {
            statusEl.textContent = '● Online (Sync)';
            statusEl.style.color = '#10b981';
            statusEl.style.background = 'rgba(16, 185, 129, 0.1)';
        }
    }

    // --- HTTP Polling for Campus/College Firewall Bypass ---
    async function pollHttpMessages() {
        try {
            const res = await fetch(`/api/chat?room=${encodeURIComponent(myRoom)}&after=${lastPolledTimestamp}`);
            if (!res.ok) return;
            const data = await res.json();
            if (data && Array.isArray(data.messages)) {
                data.messages.forEach(msg => {
                    const msgKey = `${msg.senderId}_${msg.timestamp}_${msg.message}`;
                    if (!seenMsgKeys.has(msgKey)) {
                        seenMsgKeys.add(msgKey);
                        if (msg.senderId !== myPeerId) {
                            handleIncomingChatMessage(msg);
                        }
                    }
                    if (msg.timestamp > lastPolledTimestamp) {
                        lastPolledTimestamp = msg.timestamp;
                    }
                });
            }
        } catch (e) {
            // Silently ignore network poll dropouts
        }
    }

    // --- Core Chat Logic ---
    function initChatRoom() {
        // Initialize Peer ID
        let cachedPeerId = sessionStorage.getItem('lablazy_peer_id');
        if (!cachedPeerId) {
            cachedPeerId = 'lablazy-sd-' + Math.random().toString(36).substring(2, 9);
            sessionStorage.setItem('lablazy_peer_id', cachedPeerId);
        }
        myPeerId = cachedPeerId;

        // Initialize Nickname
        let cachedNickname = sessionStorage.getItem('lablazy_nickname');
        if (!cachedNickname) {
            cachedNickname = getRandomName();
            sessionStorage.setItem('lablazy_nickname', cachedNickname);
        }
        myNickname = cachedNickname;
        const selfAnimal = myNickname.split(' ').pop();
        myEmoji = animalEmojis.get(selfAnimal) || '💻';

        if (reconnectTimeoutId) {
            clearTimeout(reconnectTimeoutId);
            reconnectTimeoutId = null;
        }

        // Close existing connections
        if (signalingSocket) {
            intentionalClose = true;
            try {
                signalingSocket.onclose = null;
                signalingSocket.close();
            } catch (e) {}
        }
        if (heartbeatIntervalId) {
            heartbeatIntervalId.clear();
            heartbeatIntervalId = null;
        }

        // Start background HTTP sync immediately (Firewall-proof)
        if (httpPollInterval) clearInterval(httpPollInterval);
        pollHttpMessages();
        httpPollInterval = setInterval(pollHttpMessages, 2500);
        updateChatStatus('http');

        // Connect WebSocket (Attempts real-time WS connection; fails gracefully to HTTP on strict firewalls)
        intentionalClose = false;
        try {
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = USE_LOCAL_SERVER 
                ? `ws://${SIGNALING_HOST}/ws` 
                : `${wsProtocol}//${SIGNALING_HOST}/ws`;
            
            signalingSocket = new WebSocket(wsUrl);

            signalingSocket.onopen = () => {
                console.log(`Unified Chat connected to room: ${myRoom}`);
                updateChatStatus('connected');
                signalingSocket.send(JSON.stringify({ action: 'join', room: myRoom, id: myPeerId }));

                if (window.onSignalingMessage) {
                    window.onSignalingMessage({ action: 'connection-state-change', connected: true });
                }

                heartbeatIntervalId = createBackgroundInterval(() => {
                    if (signalingSocket && signalingSocket.readyState === WebSocket.OPEN) {
                        signalingSocket.send(JSON.stringify({ action: 'ping', room: myRoom }));
                    }
                }, 25000);
            };

            signalingSocket.onmessage = (event) => {
                try {
                    const payload = JSON.parse(event.data);
                    if (!payload) return;

                    if (payload.action === 'panic') {
                        console.warn("⚠️ PANIC LOCKDOWN: Reloading website directly to apply Cloudflare middleware.");
                        window.location.reload(true);
                        return;
                    }

                    if (payload.action === 'joined-room-info') {
                        const cleanJoined = payload.joinedRoom.toLowerCase().replace(/[^a-z0-9_-]/g, '');
                        if (cleanJoined !== myRoom) {
                            myRoom = cleanJoined;
                            if (payload.originalRoom.toLowerCase() === 'lobby') {
                                myRoomDisplay = payload.joinedRoom.toUpperCase();
                            } else {
                                const suffixMatch = payload.joinedRoom.match(/\d+$/);
                                if (suffixMatch) {
                                    myRoomDisplay = payload.originalRoom.toUpperCase() + suffixMatch[0];
                                } else {
                                    myRoomDisplay = payload.originalRoom.toUpperCase();
                                }
                            }
                            sessionStorage.setItem('lablazy_room', myRoom);
                            localStorage.setItem('lablazy_room', myRoom);
                            sessionStorage.setItem('lablazy_room_display', myRoomDisplay);
                            localStorage.setItem('lablazy_room_display', myRoomDisplay);

                            if (chatRoomCode) chatRoomCode.textContent = myRoomDisplay;
                            if (chatInput) chatInput.placeholder = `Send a message to ${myRoomDisplay}...`;
                        }
                        
                        if (window.onSignalingMessage) {
                            window.onSignalingMessage({
                                action: 'local-join-complete',
                                id: myPeerId,
                                name: myNickname,
                                emoji: myEmoji,
                                room: myRoomDisplay
                            });
                        }
                        return;
                    }

                    if (window.onSignalingMessage) {
                        window.onSignalingMessage(payload);
                    }

                    if (payload.action === 'chat' && payload.room === myRoom && payload.senderId !== myPeerId) {
                        const msgKey = `${payload.senderId}_${payload.timestamp}_${payload.message}`;
                        if (!seenMsgKeys.has(msgKey)) {
                            seenMsgKeys.add(msgKey);
                            handleIncomingChatMessage(payload);
                        }
                    }
                } catch (e) {
                    console.warn("Failed to parse chat message payload:", e);
                }
            };

            signalingSocket.onclose = () => {
                if (heartbeatIntervalId) {
                    heartbeatIntervalId.clear();
                    heartbeatIntervalId = null;
                }
                
                updateChatStatus('http');

                if (window.onSignalingMessage) {
                    window.onSignalingMessage({ action: 'connection-state-change', connected: false });
                }

                if (!intentionalClose && !reconnectTimeoutId) {
                    reconnectTimeoutId = setTimeout(initChatRoom, 8000);
                }
            };

            signalingSocket.onerror = (err) => {
                console.warn("WebSocket unavailable (using HTTP firewall-safe mode):", err);
                updateChatStatus('http');
            };
        } catch (err) {
            console.warn("WebSocket init error (using HTTP mode):", err);
            updateChatStatus('http');
        }
    }

    function saveMessageToCache(payload, isSelf) {
        try {
            const history = JSON.parse(sessionStorage.getItem('lablazy_chat_history_' + myRoom) || '[]');
            history.push({ payload, isSelf });
            sessionStorage.setItem('lablazy_chat_history_' + myRoom, JSON.stringify(history));
        } catch (e) {
            console.warn("Failed to save chat message to cache:", e);
        }
    }

    function appendChatMessage(payload, isSelf) {
        if (!chatMessages) return;
        const msgEl = document.createElement('div');
        msgEl.className = 'chat-message-item ' + (isSelf ? 'self' : 'other');
        
        const headerEl = document.createElement('div');
        headerEl.className = 'chat-message-header';
        headerEl.textContent = (payload.senderEmoji || '') + ' ' + (payload.senderName || '') + ' ';

        const timestamp = payload.timestamp ? new Date(payload.timestamp) : new Date();
        const formattedTime = timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

        const timeSpan = document.createElement('span');
        timeSpan.className = 'chat-message-time';
        timeSpan.style.fontSize = '0.75rem';
        timeSpan.style.color = 'var(--text-muted)';
        timeSpan.style.marginLeft = '0.5rem';
        timeSpan.style.fontWeight = 'normal';
        timeSpan.textContent = formattedTime;
        headerEl.appendChild(timeSpan);
        
        const textEl = document.createElement('div');
        textEl.className = 'chat-message-text';
        textEl.textContent = payload.message || '';
        
        msgEl.appendChild(headerEl);
        msgEl.appendChild(textEl);
        
        chatMessages.appendChild(msgEl);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function handleIncomingChatMessage(payload) {
        const isChatHidden = !chatDialog || chatDialog.classList.contains('hidden');
        if (isChatHidden) {
            unreadChatCount++;
            if (navChatBadge) navChatBadge.classList.remove('hidden');
            if (modalChatBadge) modalChatBadge.classList.remove('hidden');
        }
        appendChatMessage(payload, false);
        saveMessageToCache(payload, false);
    }

    async function sendChatMessage() {
        const msg = chatInput.value.trim();
        if (!msg) return;

        const payload = {
            action: 'chat',
            room: myRoom,
            senderId: myPeerId,
            senderName: myNickname,
            senderEmoji: myEmoji,
            message: msg,
            timestamp: Date.now()
        };

        const msgKey = `${myPeerId}_${payload.timestamp}_${payload.message}`;
        seenMsgKeys.add(msgKey);

        // Immediate UI feedback & caching
        appendChatMessage(payload, true);
        saveMessageToCache(payload, true);
        chatInput.value = '';

        // 1. Send via WebSocket if live
        if (signalingSocket && signalingSocket.readyState === WebSocket.OPEN) {
            try {
                signalingSocket.send(JSON.stringify(payload));
            } catch (e) {
                console.warn("WebSocket send failed:", e);
            }
        }

        // 2. Always persist via Serverless HTTP (Firewall-safe)
        try {
            await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (e) {
            console.warn("HTTP Chat POST error:", e);
        }
    }

    async function getRoomKey(roomName) {
        return roomName.toLowerCase();
    }

    async function joinCustomRoom(newRoomCode) {
        const cleanRoom = newRoomCode.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
        if (!cleanRoom) return;

        const roomKey = await getRoomKey(cleanRoom);
        if (roomKey === myRoom) return;

        myRoom = roomKey;
        myRoomDisplay = cleanRoom.toUpperCase();
        lastPolledTimestamp = 0;
        seenMsgKeys.clear();
        sessionStorage.setItem('lablazy_room', myRoom);
        localStorage.setItem('lablazy_room', myRoom);
        sessionStorage.setItem('lablazy_room_display', myRoomDisplay);
        localStorage.setItem('lablazy_room_display', myRoomDisplay);
        
        if (chatMessages) chatMessages.innerHTML = '';
        
        initChatRoom();

        if (chatRoomCode) chatRoomCode.textContent = myRoomDisplay;
        if (chatInput) chatInput.placeholder = `Send a message to ${myRoomDisplay}...`;
        
        const isChatVisible = chatDialog && !chatDialog.classList.contains('hidden');
        if (isChatVisible) {
            loadChatHistory();
        }
    }

    function loadChatHistory() {
        if (chatMessages) chatMessages.innerHTML = '';
        const cachedHistory = sessionStorage.getItem('lablazy_chat_history_' + myRoom);
        if (cachedHistory) {
            try {
                JSON.parse(cachedHistory).forEach(item => appendChatMessage(item.payload, item.isSelf));
            } catch (e) {
                console.error("Failed to restore chat history:", e);
            }
        }
    }

    function toggleChatModal() {
        const transferModal = document.getElementById('transferModal'); // For ShareDrop page
        const isChatHidden = !chatDialog || chatDialog.classList.contains('hidden');

        if (isChatHidden) {
            unreadChatCount = 0;
            if (navChatBadge) navChatBadge.classList.add('hidden');
            if (modalChatBadge) modalChatBadge.classList.add('hidden');
            const displayVal = localStorage.getItem('lablazy_room_display') || sessionStorage.getItem('lablazy_room_display') || myRoom.toUpperCase();
            if (chatRoomCode) chatRoomCode.textContent = displayVal.toUpperCase();
            
            loadChatHistory();

            // Show the appropriate container modal
            if (chatModal) chatModal.classList.remove('hidden');
            if (transferModal) transferModal.classList.remove('hidden');
            
            if (chatDialog) chatDialog.classList.remove('hidden');
            
            if (window.onModalOpen) window.onModalOpen();
            setTimeout(() => {
                if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
            }, 50);
        } else {
            if (chatDialog) chatDialog.classList.add('hidden');
            
            // Hide the appropriate container modal
            if (chatModal) {
                chatModal.classList.add('hidden');
            }
            if (transferModal) {
                const transferDialog = document.getElementById('transferDialog');
                const isTransferHidden = !transferDialog || transferDialog.classList.contains('hidden');
                if (isTransferHidden) {
                    transferModal.classList.add('hidden');
                }
            }
            if (window.onModalClose) window.onModalClose();
        }
    }

    // --- Event Listeners ---
    if (navChatBtn) navChatBtn.addEventListener('click', toggleChatModal);
    if (modalChatBtn) modalChatBtn.addEventListener('click', toggleChatModal);
    if (closeChatBtn) closeChatBtn.addEventListener('click', toggleChatModal);

    if (sendChatBtn && chatInput) {
        sendChatBtn.addEventListener('click', sendChatMessage);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendChatMessage();
        });
    }

    // --- Global Room Changer Event Listeners ---
    const roomModal = document.getElementById('roomModal');
    const closeRoomModal = document.getElementById('closeRoomModal');
    const newRoomCodeCancelBtn = document.getElementById('newRoomCodeCancelBtn');
    const newRoomCodeJoinBtn = document.getElementById('newRoomCodeJoinBtn');
    const newRoomCodeInput = document.getElementById('newRoomCodeInput');

    if (chatChangeRoomBtn) {
        chatChangeRoomBtn.addEventListener('click', () => {
            if (roomModal) {
                const currentRoom = sessionStorage.getItem('lablazy_room') || 'lobby';
                if (newRoomCodeInput) newRoomCodeInput.value = currentRoom.toUpperCase();
                roomModal.classList.remove('hidden');
                if (window.onModalOpen) window.onModalOpen();
            }
        });
    }

    if (closeRoomModal) {
        closeRoomModal.addEventListener('click', () => {
            if (roomModal) {
                roomModal.classList.add('hidden');
                if (window.onModalClose) window.onModalClose();
            }
        });
    }

    if (newRoomCodeCancelBtn) {
        newRoomCodeCancelBtn.addEventListener('click', () => {
            if (roomModal) {
                roomModal.classList.add('hidden');
                if (window.onModalClose) window.onModalClose();
            }
        });
    }

    if (newRoomCodeJoinBtn && newRoomCodeInput) {
        const handleJoinAction = () => {
            const roomCode = newRoomCodeInput.value;
            joinCustomRoom(roomCode);
            if (roomModal) {
                roomModal.classList.add('hidden');
                if (window.onModalClose) window.onModalClose();
            }
            
            // Auto-hide the chat modals/dialogs so the user goes straight back to the clean dashboard page
            if (chatDialog) chatDialog.classList.add('hidden');
            const chatModal = document.getElementById('chatModal');
            if (chatModal) chatModal.classList.add('hidden');
            const transferModal = document.getElementById('transferModal');
            if (transferModal) {
                const transferDialog = document.getElementById('transferDialog');
                const isTransferHidden = !transferDialog || transferDialog.classList.contains('hidden');
                if (isTransferHidden) {
                    transferModal.classList.add('hidden');
                }
            }
        };

        newRoomCodeJoinBtn.addEventListener('click', handleJoinAction);
        
        newRoomCodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleJoinAction();
            }
        });
    }

    // Listen for room changes from other tabs/pages
    window.addEventListener('storage', (e) => {
        if (e.key === 'lablazy_room' && e.newValue) {
            const cleanRoom = e.newValue.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
            if (cleanRoom && cleanRoom !== myRoom) {
                myRoom = cleanRoom;
                myRoomDisplay = localStorage.getItem('lablazy_room_display') || myRoom.toUpperCase();
                
                if (chatMessages) chatMessages.innerHTML = '';
                initChatRoom();

                if (chatRoomCode) chatRoomCode.textContent = myRoomDisplay;
                if (chatInput) chatInput.placeholder = `Send a message to ${myRoomDisplay}...`;
                
                const isChatVisible = chatDialog && !chatDialog.classList.contains('hidden');
                if (isChatVisible) {
                    loadChatHistory();
                }
            }
        }
    });

    // Expose signaling methods globally
    window.sendSignalingMessage = (payload) => {
        if (signalingSocket && signalingSocket.readyState === WebSocket.OPEN) {
            signalingSocket.send(JSON.stringify(payload));
            return true;
        }
        return false;
    };

    window.chatState = {
        get myPeerId() { return myPeerId; },
        get myNickname() { return myNickname; },
        get myEmoji() { return myEmoji; },
        get myRoomDisplay() { return myRoomDisplay; },
        get isConnected() { return !!(signalingSocket && signalingSocket.readyState === WebSocket.OPEN); }
    };

    // Expose the joinCustomRoom function globally so other scripts can call it
    window.unifiedChat = {
        joinRoom: joinCustomRoom
    };

    // --- Initialization ---
    initChatRoom();
}