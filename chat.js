/**
 * ==========================================================================
 * LABLAZY UNIFIED CHAT MODULE
 * ==========================================================================
 * This module provides a consistent chat experience across all pages.
 * It handles WebSocket connections, message caching, UI updates, and room management.
 */
function initializeUnifiedChat() {
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
    const USE_LOCAL_SERVER = window.location.hostname === 'localhost';
    const SIGNALING_HOST = USE_LOCAL_SERVER ? 'localhost:8080' : AppConfig.SIGNALING_HOST;

    let signalingSocket = null;
    let heartbeatIntervalId = null;
    let intentionalClose = false;
    let myRoom = localStorage.getItem('lablazy_room') || sessionStorage.getItem('lablazy_room') || 'lobby';
    let myNickname = '';
    let myPeerId = '';
    let myEmoji = '💻';
    let unreadChatCount = 0;

    // --- Emojis and Name Generation ---
    const animalEmojis = {
        "Unicorn": "🦄", "Robot": "🤖", "Ghost": "👻", "Donut": "🍩", "Rocket": "🚀",
        "Bear": "🐻", "Cat": "🐱", "Dog": "🐶", "Monkey": "🐵", "Frog": "🐸",
        "Panda": "🐼", "Koala": "🐨", "Dinosaur": "🦖", "Alien": "👽", "Octopus": "🐙",
        "Butterfly": "🦋", "Flamingo": "🦩", "Pizza": "🍕", "IceCream": "🍦", "Balloon": "🎈",
        "Heart": "💖", "Clover": "🍀", "Star": "⭐", "Crown": "👑", "Falcon": "🦅",
        "Dolphin": "🐬", "Tiger": "🐯", "Fox": "🦊", "Cheetah": "🐆", "Owl": "🦉",
        "Rabbit": "🐰", "Lion": "🦁"
    };
    const adjectives = [
        "Happy", "Sleepy", "Lazy", "Crazy", "Dancing", "Singing", "Jumping", 
        "Silly", "Cool", "Funky", "Brave", "Clever", "Shiny", "Cosmic", 
        "Magic", "Sneaky", "Jolly", "Cheeky", "Daring", "Speedy"
    ];
    const animalsList = Object.keys(animalEmojis);

    function getRandomName() {
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const ani = animalsList[Math.floor(Math.random() * animalsList.length)];
        return `${adj} ${ani}`;
    }

    function showChatToast(message, type = 'error') {
        // A simple alert can be used as a fallback for a toast notification
        alert(`Chat Info: ${message}`);
        console.warn(`Chat Toast (${type}): ${message}`);
    }
    function updateChatStatus(status) {
        // Update connection status indicator in the chat modal
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
            statusEl.textContent = '● Connected';
            statusEl.style.color = '#10b981';
            statusEl.style.background = 'rgba(16, 185, 129, 0.1)';
        } else if (status === 'reconnecting') {
            statusEl.textContent = '● Reconnecting...';
            statusEl.style.color = '#f59e0b';
            statusEl.style.background = 'rgba(245, 158, 11, 0.1)';
        } else {
            statusEl.textContent = '● Disconnected';
            statusEl.style.color = '#ef4444';
            statusEl.style.background = 'rgba(239, 68, 68, 0.1)';
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
        myEmoji = animalEmojis[selfAnimal] || '💻';

        // Close existing connections
        if (signalingSocket) {
            intentionalClose = true;
            try { signalingSocket.close(); } catch (e) {}
        }
        if (heartbeatIntervalId) {
            clearInterval(heartbeatIntervalId);
            heartbeatIntervalId = null;
        }

        // Connect WebSocket
        intentionalClose = false;
        const protocol = USE_LOCAL_SERVER ? 'ws://' : 'wss://';
        signalingSocket = new WebSocket(`${protocol}${SIGNALING_HOST}/ws`);

        signalingSocket.onopen = () => {
            console.log(`Unified Chat connected to room: ${myRoom}`);
            updateChatStatus('connected');
            signalingSocket.send(JSON.stringify({ action: 'join', room: myRoom, id: myPeerId }));

            heartbeatIntervalId = setInterval(() => {
                if (signalingSocket && signalingSocket.readyState === WebSocket.OPEN) {
                    signalingSocket.send(JSON.stringify({ action: 'ping', room: myRoom }));
                }
            }, 25000);
        };

        signalingSocket.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data);
                if (payload.action === 'chat' && payload.room === myRoom && payload.senderId !== myPeerId) {
                    handleIncomingChatMessage(payload);
                }
            } catch (e) {
                console.warn("Failed to parse chat message payload:", e);
            }
        };

        signalingSocket.onclose = () => {
            if (heartbeatIntervalId) clearInterval(heartbeatIntervalId);
            if (intentionalClose) {
                // Socket was closed on purpose (e.g. room change). Don't auto-reconnect.
                console.log("Unified Chat WebSocket closed intentionally.");
                return;
            }
            console.log("Unified Chat WebSocket disconnected. Reconnecting in 3 seconds...");
            updateChatStatus('reconnecting');
            setTimeout(initChatRoom, 3000);
        };

        signalingSocket.onerror = (err) => {
            console.warn("Unified Chat WebSocket error:", err);
            updateChatStatus('disconnected');
        };
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
        headerEl.textContent = (payload.senderEmoji || '') + ' ' + (payload.senderName || '');
        
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

    function sendChatMessage() {
        if (!signalingSocket || signalingSocket.readyState !== WebSocket.OPEN) {
            showChatToast("Cannot send message. Chat room is not connected.", "error");
            return;
        }
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

        signalingSocket.send(JSON.stringify(payload));
        appendChatMessage(payload, true);
        saveMessageToCache(payload, true);
        chatInput.value = '';
    }

    function joinCustomRoom(newRoomCode) {
        const cleanRoom = newRoomCode.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
        if (!cleanRoom || cleanRoom === myRoom) return;

        myRoom = cleanRoom;
        sessionStorage.setItem('lablazy_room', myRoom);
        localStorage.setItem('lablazy_room', myRoom);
        
        if (chatMessages) chatMessages.innerHTML = '';
        
        initChatRoom();

        if (chatRoomCode) chatRoomCode.textContent = myRoom.toUpperCase();
        if (chatInput) chatInput.placeholder = `Send a message to ${myRoom}...`;
        
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
        const transferModal = document.getElementById('transferModal'); // This modal contains the chat dialog
        const isChatHidden = !chatDialog || chatDialog.classList.contains('hidden');

        if (isChatHidden) {
            unreadChatCount = 0;
            if (navChatBadge) navChatBadge.classList.add('hidden');
            if (modalChatBadge) modalChatBadge.classList.add('hidden');
            if (chatRoomCode) chatRoomCode.textContent = myRoom.toUpperCase();
            
            loadChatHistory();

            if (transferModal) transferModal.classList.remove('hidden');
            if (chatDialog) chatDialog.classList.remove('hidden');
            
            if (window.onModalOpen) window.onModalOpen();
            setTimeout(() => {
                if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
            }, 50);
        } else {
            if (chatDialog) chatDialog.classList.add('hidden');
            const transferDialog = document.getElementById('transferDialog');
            const isTransferHidden = !transferDialog || transferDialog.classList.contains('hidden');
            if (transferModal && isTransferHidden) {
                transferModal.classList.add('hidden');
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

    // Listen for room changes from other tabs/pages
    window.addEventListener('storage', (e) => {
        if (e.key === 'lablazy_room' && e.newValue) {
            // The page-specific logic (e.g., in sharedrop.js) will handle the confirmation prompt.
            // This listener just ensures the chat client itself switches rooms.
            // The `handleRoomChangeRequest` in sharedrop.js will call `joinCustomRoom` if confirmed.
            const cleanRoom = e.newValue.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
            if (cleanRoom && cleanRoom !== myRoom) {
                // In a unified model, we can directly call joinCustomRoom if no transfer is active.
                // For simplicity, we let the page-specific logic trigger the change.
                // This avoids duplicating the "is transfer active" check.
                console.log(`Room change detected via storage event to: ${cleanRoom}`);
            }
        }
    });

    // Expose the joinCustomRoom function globally so other scripts can call it
    window.unifiedChat = {
        joinRoom: joinCustomRoom
    };

    // --- Initialization ---
    initChatRoom();
}

// Make sure to call this function after the DOM is loaded.
// Example: document.addEventListener('DOMContentLoaded', initializeUnifiedChat);