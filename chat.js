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

    const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];
    let activeReplyTarget = null;
    let typingDebounceTimeout = null;
    let isCurrentlyTyping = false;
    const activeTypingUsers = new Map();

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

    function escapeHtml(str) {
        return (str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function formatMessageWithMentions(text, myName) {
        const escaped = escapeHtml(text);
        const cleanMyName = (myName || '').trim().toLowerCase();
        
        return {
            formattedHtml: escaped.replace(/@([a-zA-Z0-9_\s]{2,25})\b/g, (match, username) => {
                const trimmedUser = username.trim();
                const isSelfMention = cleanMyName && (
                    trimmedUser.toLowerCase() === cleanMyName ||
                    cleanMyName.includes(trimmedUser.toLowerCase()) ||
                    trimmedUser.toLowerCase() === cleanMyName.split(' ').pop().toLowerCase()
                );
                
                if (isSelfMention) {
                    return `<span class="chat-mention self-mention" title="You were mentioned">@${escapeHtml(trimmedUser)}</span>`;
                }
                return `<span class="chat-mention" title="Mentioned user">@${escapeHtml(trimmedUser)}</span>`;
            }),
            hasSelfMention: cleanMyName ? (text.toLowerCase().includes('@' + cleanMyName) || text.toLowerCase().includes('@' + cleanMyName.split(' ').pop().toLowerCase())) : false
        };
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
                    } else if (payload.action === 'chat-reaction' && payload.room === myRoom) {
                        handleIncomingReaction(payload);
                    } else if (payload.action === 'chat-typing' && payload.room === myRoom) {
                        handleIncomingTyping(payload);
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

    // --- Typing Indicators ---
    function sendTypingStatus(isTyping) {
        if (signalingSocket && signalingSocket.readyState === WebSocket.OPEN) {
            try {
                signalingSocket.send(JSON.stringify({
                    action: 'chat-typing',
                    room: myRoom,
                    senderId: myPeerId,
                    senderName: myNickname,
                    senderEmoji: myEmoji,
                    isTyping: isTyping
                }));
            } catch (e) {}
        }
    }

    function handleIncomingTyping(payload) {
        if (payload.senderId === myPeerId || payload.room !== myRoom) return;

        if (payload.isTyping) {
            const existing = activeTypingUsers.get(payload.senderId);
            if (existing) clearTimeout(existing.timeoutId);

            const timeoutId = setTimeout(() => {
                activeTypingUsers.delete(payload.senderId);
                updateTypingIndicatorUI();
            }, 3500);

            activeTypingUsers.set(payload.senderId, {
                name: payload.senderName || 'Someone',
                emoji: payload.senderEmoji || '💬',
                timeoutId: timeoutId
            });
        } else {
            const existing = activeTypingUsers.get(payload.senderId);
            if (existing) clearTimeout(existing.timeoutId);
            activeTypingUsers.delete(payload.senderId);
        }
        updateTypingIndicatorUI();
    }

    function updateTypingIndicatorUI() {
        const typingContainer = document.getElementById('chatTypingContainer');
        const typingText = document.getElementById('chatTypingText');
        if (!typingContainer || !typingText) return;

        if (activeTypingUsers.size === 0) {
            typingContainer.classList.add('hidden');
        } else {
            const users = Array.from(activeTypingUsers.values());
            if (users.length === 1) {
                typingText.textContent = `${users[0].emoji} ${users[0].name} is typing`;
            } else if (users.length === 2) {
                typingText.textContent = `${users[0].name} and ${users[1].name} are typing`;
            } else {
                typingText.textContent = `${users.length} people are typing`;
            }
            typingContainer.classList.remove('hidden');
            if (chatMessages) {
                const isNearBottom = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < 120;
                if (isNearBottom) {
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
            }
        }
    }

    // --- Replying / Quoting ---
    function setReplyTarget(msgData) {
        if (!msgData) return;
        const targetText = (msgData.message || msgData.text || '').trim();
        if (!targetText) return;

        const targetId = msgData.msgId || `${msgData.senderId || 'anon'}_${msgData.timestamp || Date.now()}`;
        activeReplyTarget = {
            msgId: targetId,
            senderId: msgData.senderId || '',
            senderName: msgData.senderName || 'Anonymous',
            senderEmoji: msgData.senderEmoji || '💬',
            text: targetText
        };

        const previewEl = document.getElementById('chatReplyPreview');
        const targetNameEl = document.getElementById('chatReplyTargetName');
        const targetTextEl = document.getElementById('chatReplyTargetText');

        if (previewEl && targetNameEl && targetTextEl) {
            targetNameEl.textContent = `${activeReplyTarget.senderEmoji} ${activeReplyTarget.senderName}`;
            targetTextEl.textContent = activeReplyTarget.text;
            previewEl.classList.remove('hidden');
        }

        if (chatInput) {
            chatInput.focus();
            chatInput.placeholder = `Reply to ${activeReplyTarget.senderName}...`;
        }
    }

    function clearReplyTarget() {
        activeReplyTarget = null;
        const previewEl = document.getElementById('chatReplyPreview');
        if (previewEl) {
            previewEl.classList.add('hidden');
        }
        if (chatInput) {
            chatInput.placeholder = `Send a message to ${myRoomDisplay}...`;
        }
    }

    // --- Reactions ---
    function updateReactionInCache(msgId, reactions) {
        try {
            const history = JSON.parse(sessionStorage.getItem('lablazy_chat_history_' + myRoom) || '[]');
            const item = history.find(h => (h.payload.msgId === msgId || `${h.payload.senderId}_${h.payload.timestamp}` === msgId));
            if (item) {
                item.payload.reactions = reactions;
                sessionStorage.setItem('lablazy_chat_history_' + myRoom, JSON.stringify(history));
            }
        } catch (e) {
            console.warn("Failed to update reaction in cache:", e);
        }
    }

    function toggleReaction(msgId, emoji) {
        const msgEl = chatMessages ? chatMessages.querySelector(`[data-msg-id="${CSS.escape(msgId)}"]`) : null;
        if (!msgEl) return;

        let reactions = JSON.parse(msgEl.dataset.reactions || '{}');
        reactions[emoji] = reactions[emoji] || [];
        const idx = reactions[emoji].indexOf(myPeerId);
        if (idx > -1) {
            reactions[emoji].splice(idx, 1);
            if (reactions[emoji].length === 0) delete reactions[emoji];
        } else {
            reactions[emoji].push(myPeerId);
        }

        msgEl.dataset.reactions = JSON.stringify(reactions);
        renderReactionsRow(msgEl, reactions, msgId);
        updateReactionInCache(msgId, reactions);

        const payload = {
            action: 'chat-reaction',
            room: myRoom,
            msgId: msgId,
            emoji: emoji,
            senderId: myPeerId,
            reactions: reactions
        };

        if (signalingSocket && signalingSocket.readyState === WebSocket.OPEN) {
            try {
                signalingSocket.send(JSON.stringify(payload));
            } catch (e) {}
        }

        try {
            fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reaction', room: myRoom, msgId, emoji, senderId: myPeerId })
            }).catch(() => {});
        } catch (e) {}
    }

    function handleIncomingReaction(payload) {
        if (!chatMessages) return;
        const msgEl = chatMessages.querySelector(`[data-msg-id="${CSS.escape(payload.msgId)}"]`);
        if (!msgEl) return;

        let reactions = payload.reactions;
        if (!reactions) {
            reactions = JSON.parse(msgEl.dataset.reactions || '{}');
            reactions[payload.emoji] = reactions[payload.emoji] || [];
            const idx = reactions[payload.emoji].indexOf(payload.senderId);
            if (idx > -1) {
                reactions[payload.emoji].splice(idx, 1);
                if (reactions[payload.emoji].length === 0) delete reactions[payload.emoji];
            } else {
                reactions[payload.emoji].push(payload.senderId);
            }
        }

        msgEl.dataset.reactions = JSON.stringify(reactions);
        renderReactionsRow(msgEl, reactions, payload.msgId);
        updateReactionInCache(payload.msgId, reactions);
    }

    function renderReactionsRow(msgEl, reactions, msgId) {
        let rowEl = msgEl.querySelector('.chat-reactions-row');
        const entries = Object.entries(reactions || {});
        if (entries.length === 0) {
            if (rowEl) rowEl.remove();
            return;
        }
        if (!rowEl) {
            rowEl = document.createElement('div');
            rowEl.className = 'chat-reactions-row';
            msgEl.appendChild(rowEl);
        }
        rowEl.innerHTML = '';
        entries.forEach(([emoji, peers]) => {
            if (!peers || peers.length === 0) return;
            const pill = document.createElement('span');
            pill.className = 'chat-reaction-pill' + (peers.includes(myPeerId) ? ' reacted' : '');
            pill.innerHTML = `<span>${emoji}</span> <span style="font-size: 0.68rem; opacity: 0.85;">${peers.length}</span>`;
            pill.title = peers.length === 1 ? '1 reaction' : `${peers.length} reactions`;
            pill.onclick = (e) => {
                e.stopPropagation();
                toggleReaction(msgId, emoji);
            };
            rowEl.appendChild(pill);
        });
    }

    function showReactionPicker(msgEl, msgId, anchorBtn) {
        document.querySelectorAll('.chat-reaction-picker').forEach(p => p.remove());

        const picker = document.createElement('div');
        picker.className = 'chat-reaction-picker';
        
        REACTION_EMOJIS.forEach(emoji => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'chat-reaction-btn';
            btn.textContent = emoji;
            btn.title = `React with ${emoji}`;
            btn.onclick = (e) => {
                e.stopPropagation();
                toggleReaction(msgId, emoji);
                picker.remove();
            };
            picker.appendChild(btn);
        });

        msgEl.appendChild(picker);

        setTimeout(() => {
            const closePicker = (e) => {
                if (!picker.contains(e.target) && e.target !== anchorBtn) {
                    picker.remove();
                    document.removeEventListener('click', closePicker);
                }
            };
            document.addEventListener('click', closePicker);
        }, 10);
    }

    // --- Message Storage and Rendering ---
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
        const msgId = payload.msgId || `${payload.senderId || 'anon'}_${payload.timestamp || Date.now()}`;
        
        const msgEl = document.createElement('div');
        msgEl.className = 'chat-message-item ' + (isSelf ? 'self' : 'other');
        msgEl.dataset.msgId = msgId;
        msgEl.dataset.reactions = JSON.stringify(payload.reactions || {});

        // Touch Swipe-to-Reply Badge & Gestures
        const swipeBadge = document.createElement('div');
        swipeBadge.className = 'chat-swipe-badge';
        swipeBadge.innerHTML = '<span>↩</span>';
        msgEl.appendChild(swipeBadge);

        let touchStartX = 0;
        let touchStartY = 0;
        let currentTranslateX = 0;
        let isSwiping = false;

        msgEl.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                isSwiping = false;
            }
        }, { passive: true });

        msgEl.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1) {
                const diffX = e.touches[0].clientX - touchStartX;
                const diffY = Math.abs(e.touches[0].clientY - touchStartY);
                if (diffX > 15 && diffX > diffY) {
                    isSwiping = true;
                    currentTranslateX = Math.min(diffX, 90);
                    msgEl.style.transform = `translateX(${currentTranslateX}px)`;
                    if (currentTranslateX > 55) {
                        swipeBadge.style.opacity = '1';
                        swipeBadge.style.transform = 'scale(1.15)';
                    } else {
                        swipeBadge.style.opacity = `${currentTranslateX / 55}`;
                        swipeBadge.style.transform = 'scale(0.9)';
                    }
                }
            }
        }, { passive: true });

        const endSwipe = () => {
            if (isSwiping) {
                if (currentTranslateX > 55) {
                    setReplyTarget(payload);
                }
                msgEl.style.transition = 'transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                msgEl.style.transform = 'translateX(0px)';
                swipeBadge.style.opacity = '0';
                swipeBadge.style.transform = 'scale(0.8)';
                setTimeout(() => {
                    msgEl.style.transition = '';
                }, 260);
                isSwiping = false;
                currentTranslateX = 0;
            }
        };
        msgEl.addEventListener('touchend', endSwipe, { passive: true });
        msgEl.addEventListener('touchcancel', endSwipe, { passive: true });

        // Quoted Reply Card
        if (payload.replyTo && payload.replyTo.text) {
            const quoteCard = document.createElement('div');
            quoteCard.className = 'chat-quote-card';
            quoteCard.innerHTML = `
                <div class="chat-quote-sender">↩ ${escapeHtml(payload.replyTo.senderEmoji || '')} ${escapeHtml(payload.replyTo.senderName || 'Anonymous')}</div>
                <div class="chat-quote-text">${escapeHtml(payload.replyTo.text)}</div>
            `;
            quoteCard.onclick = () => {
                const targetMsg = chatMessages.querySelector(`[data-msg-id="${CSS.escape(payload.replyTo.msgId)}"]`);
                if (targetMsg) {
                    targetMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    targetMsg.style.transition = 'box-shadow 0.3s ease';
                    targetMsg.style.boxShadow = '0 0 0 3px var(--accent)';
                    setTimeout(() => { targetMsg.style.boxShadow = ''; }, 1200);
                }
            };
            msgEl.appendChild(quoteCard);
        }

        // Header (Emoji + Nickname + Time + Click to mention)
        const headerEl = document.createElement('div');
        headerEl.className = 'chat-message-header';
        
        const senderBadge = document.createElement('span');
        senderBadge.className = 'chat-sender-badge';
        senderBadge.textContent = `${payload.senderEmoji || ''} ${payload.senderName || 'Anonymous'}`;
        senderBadge.title = isSelf ? 'You' : `Click to @mention ${payload.senderName}`;
        senderBadge.onclick = (e) => {
            if (!isSelf && chatInput) {
                e.stopPropagation();
                const mentionText = `@${payload.senderName} `;
                if (!chatInput.value.includes(mentionText)) {
                    chatInput.value = mentionText + chatInput.value;
                }
                chatInput.focus();
            }
        };
        headerEl.appendChild(senderBadge);

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

        // Text with Mentions
        const textEl = document.createElement('div');
        textEl.className = 'chat-message-text';
        const mentionParsed = formatMessageWithMentions(payload.message || '', myNickname);
        textEl.innerHTML = mentionParsed.formattedHtml;

        // Hover / Action Toolbar (Reply & React)
        const actionsBar = document.createElement('div');
        actionsBar.className = 'chat-message-actions';

        const replyBtn = document.createElement('button');
        replyBtn.type = 'button';
        replyBtn.className = 'chat-action-btn';
        replyBtn.innerHTML = '↩';
        replyBtn.title = 'Reply';
        replyBtn.onclick = (e) => {
            e.stopPropagation();
            setReplyTarget(payload);
        };
        actionsBar.appendChild(replyBtn);

        const reactBtn = document.createElement('button');
        reactBtn.type = 'button';
        reactBtn.className = 'chat-action-btn';
        reactBtn.innerHTML = '😊+';
        reactBtn.title = 'React';
        reactBtn.onclick = (e) => {
            e.stopPropagation();
            showReactionPicker(msgEl, msgId, reactBtn);
        };
        actionsBar.appendChild(reactBtn);

        msgEl.appendChild(headerEl);
        msgEl.appendChild(textEl);
        msgEl.appendChild(actionsBar);

        // Render Reactions Row
        if (payload.reactions && Object.keys(payload.reactions).length > 0) {
            renderReactionsRow(msgEl, payload.reactions, msgId);
        }

        chatMessages.appendChild(msgEl);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function handleIncomingChatMessage(payload) {
        const isOpen = isChatCurrentlyOpen();
        if (!isOpen) {
            unreadChatCount++;
            if (navChatBadge) {
                navChatBadge.textContent = unreadChatCount > 9 ? '9+' : unreadChatCount;
                navChatBadge.classList.remove('hidden');
            }
            if (modalChatBadge) {
                modalChatBadge.textContent = unreadChatCount > 9 ? '9+' : unreadChatCount;
                modalChatBadge.classList.remove('hidden');
            }
        }
        appendChatMessage(payload, false);
        saveMessageToCache(payload, false);
    }

    async function sendChatMessage() {
        const msg = chatInput.value.trim();
        if (!msg) return;

        const msgId = `${myPeerId}_${Date.now()}`;
        const payload = {
            action: 'chat',
            room: myRoom,
            msgId: msgId,
            senderId: myPeerId,
            senderName: myNickname,
            senderEmoji: myEmoji,
            message: msg,
            timestamp: Date.now(),
            replyTo: activeReplyTarget ? {
                msgId: activeReplyTarget.msgId,
                senderId: activeReplyTarget.senderId,
                senderName: activeReplyTarget.senderName,
                senderEmoji: activeReplyTarget.senderEmoji,
                text: activeReplyTarget.text
            } : null,
            reactions: {}
        };

        const msgKey = `${myPeerId}_${payload.timestamp}_${payload.message}`;
        seenMsgKeys.add(msgKey);

        // Immediate UI feedback & caching
        appendChatMessage(payload, true);
        saveMessageToCache(payload, true);
        chatInput.value = '';
        clearReplyTarget();

        // Clear typing indicator status
        if (isCurrentlyTyping) {
            isCurrentlyTyping = false;
            sendTypingStatus(false);
        }

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
        
        if (isChatCurrentlyOpen()) {
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

    // --- Robust 1-Click Modal State Detection ---
    function getChatParentModal() {
        if (chatDialog) {
            const modal = chatDialog.closest('.modal');
            if (modal) return modal;
        }
        return document.getElementById('chatModal') || document.getElementById('transferModal');
    }

    function isChatCurrentlyOpen() {
        const parentModal = getChatParentModal();
        if (parentModal && parentModal.classList.contains('hidden')) {
            return false;
        }
        if (chatDialog && chatDialog.classList.contains('hidden')) {
            return false;
        }
        return parentModal ? !parentModal.classList.contains('hidden') : (chatDialog ? !chatDialog.classList.contains('hidden') : false);
    }

    function toggleChatModal() {
        const parentModal = getChatParentModal();
        const isOpen = isChatCurrentlyOpen();

        if (!isOpen) {
            unreadChatCount = 0;
            if (navChatBadge) navChatBadge.classList.add('hidden');
            if (modalChatBadge) modalChatBadge.classList.add('hidden');
            const displayVal = localStorage.getItem('lablazy_room_display') || sessionStorage.getItem('lablazy_room_display') || myRoom.toUpperCase();
            if (chatRoomCode) chatRoomCode.textContent = displayVal.toUpperCase();
            
            loadChatHistory();

            // Show the parent modal and the chat dialog
            if (parentModal) parentModal.classList.remove('hidden');
            if (chatDialog) chatDialog.classList.remove('hidden');
            
            if (window.onModalOpen) window.onModalOpen();
            setTimeout(() => {
                if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
                if (chatInput) chatInput.focus();
            }, 50);
        } else {
            clearReplyTarget();
            if (chatDialog) chatDialog.classList.add('hidden');
            
            // Hide the parent modal if transferDialog is also hidden (or not present)
            const transferDialog = document.getElementById('transferDialog');
            const isTransferHidden = !transferDialog || transferDialog.classList.contains('hidden');
            if (parentModal && isTransferHidden) {
                parentModal.classList.add('hidden');
            }
            if (window.onModalClose) window.onModalClose();
        }
    }

    // --- Event Listeners ---
    if (navChatBtn) navChatBtn.addEventListener('click', toggleChatModal);
    if (modalChatBtn) modalChatBtn.addEventListener('click', toggleChatModal);
    if (closeChatBtn) closeChatBtn.addEventListener('click', toggleChatModal);

    const cancelReplyBtn = document.getElementById('chatCancelReplyBtn');
    if (cancelReplyBtn) {
        cancelReplyBtn.addEventListener('click', clearReplyTarget);
    }

    if (sendChatBtn && chatInput) {
        sendChatBtn.addEventListener('click', sendChatMessage);
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendChatMessage();
            } else if (e.key === 'Escape' && activeReplyTarget) {
                clearReplyTarget();
            }
        });

        chatInput.addEventListener('input', () => {
            if (chatInput.value.trim().length > 0) {
                if (!isCurrentlyTyping) {
                    isCurrentlyTyping = true;
                    sendTypingStatus(true);
                }
                if (typingDebounceTimeout) clearTimeout(typingDebounceTimeout);
                typingDebounceTimeout = setTimeout(() => {
                    if (isCurrentlyTyping) {
                        isCurrentlyTyping = false;
                        sendTypingStatus(false);
                    }
                }, 3000);
            } else if (isCurrentlyTyping) {
                isCurrentlyTyping = false;
                sendTypingStatus(false);
            }
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
                
                if (isChatCurrentlyOpen()) {
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
        joinRoom: joinCustomRoom,
        openChat: () => {
            if (!isChatCurrentlyOpen()) toggleChatModal();
        },
        closeChat: () => {
            if (isChatCurrentlyOpen()) toggleChatModal();
        },
        toggleChat: toggleChatModal
    };

    // --- Initialization ---
    initChatRoom();
}

// Auto-run when DOM is ready across all pages
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeUnifiedChat);
    } else {
        initializeUnifiedChat();
    }
}