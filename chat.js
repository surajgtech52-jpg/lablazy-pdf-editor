/**
 * ==========================================================================
 * LABLAZY WHATSAPP-GRADE UNIFIED CHAT MODULE
 * ==========================================================================
 * Full WhatsApp features:
 * - Reaction bar & custom reaction drawer (👍, ❤️, 😂, 😮, 😢, 🙏, 🔥, 🚀, 💯, ➕)
 * - Copy text with animated floating "Copied! ✓" micro-toast
 * - Quoted reply preview & smooth scroll to quoted message with glowing pulse
 * - Direct @mentions with click-to-mention
 * - WhatsApp bubble tails (outgoing self vs incoming peer) with colored nicknames
 * - Timestamp & WhatsApp double-check delivery ticks (✓✓)
 * - Tabbed emoji drawer (Smileys, Gestures, Hearts, Food, Objects)
 * - Centered date badges (TODAY, YESTERDAY, formatted dates) & encryption banner
 * - Floating scroll-to-bottom button with unread counter
 * - Real-time typing indicators with animated bouncing dots
 * - Audio feedback chime on send & receive (Web Audio API)
 * - Delete for me & Clear room chat history
 * - Multi-transport sync: WebSockets (real-time) + Serverless KV HTTP fallback
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
    let chatDialog = document.getElementById('chatDialog');
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
    let unreadScrolledCount = 0;

    const QUICK_REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '🚀', '💯'];
    const EXTENDED_EMOJIS = [
        // Smileys
        '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😉', '😊', '😇',
        '🥰', '😍', '🤩', '😘', '😗', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑',
        '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄',
        '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮',
        '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟',
        '🙁', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢',
        '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠',
        // Gestures & People
        '👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '🤌',
        '🤏', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤙',
        '💪', '🦾', '🖕', '✍️', '🙏', '🤝', '👏', '🙌', '👐', '🤲', '🫡', '🫣',
        // Hearts & Fun
        '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕',
        '💞', '💓', '💗', '💖', '💘', '💝', '💟', '🔥', '✨', '🌟', '⭐', '💫',
        '⚡', '💥', '💯', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '👑', '🚀', '💎',
        // Objects & Animals
        '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮',
        '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🦄', '🐝', '🐛', '🦋', '🍕', '🍔',
        '🍟', '🌭', '🍿', '🍩', '🍪', '🎂', '☕', '🍺', '🍻', '🥤', '💻', '📱',
        '📄', '📁', '📦', '🔒', '🔑', '💡', '📌', '📢', '💬', '🔔', '🎯', '🪄'
    ];

    const EMOJI_CATEGORIES = {
        'smileys': ['😀', '😂', '🤣', '😊', '😍', '🥰', '😎', '🤔', '🥳', '🤫', '😴', '🤯', '🥺', '😇', '🤩', '😜', '🙄', '🤤', '😷', '🥵', '🥶'],
        'gestures': ['👍', '👎', '👏', '🙌', '🤝', '✌️', '🤞', '👊', '✊', '🙏', '🫡', '🤌', '🤙', '👈', '👉', '☝️', '🖐️', '💪', '👋', '✍️'],
        'hearts': ['❤️', '💖', '💙', '💜', '🖤', '💔', '💯', '🔥', '⭐', '✨', '💫', '🎉', '🎈', '🏆', '🚀', '⚡', '💎', '👑', '🥇', '🎁'],
        'nature': ['🐱', '🐶', '🐼', '🦊', '🦁', '🦄', '🍕', '🍔', '🍟', '🍦', '🍩', '☕', '🍻', '🍿', '🍎', '🍓', '🥑', '🌮', '🐸', '🐵'],
        'objects': ['💻', '📱', '📄', '📁', '📦', '🔒', '🔑', '💡', '📌', '⏰', '📢', '🎯', '🪄', '🧩', '🎵', '💬', '🔔', '🏷️', '🛡️', '⚙️']
    };

    let activeReplyTarget = null;
    let typingDebounceTimeout = null;
    let isCurrentlyTyping = false;
    const activeTypingUsers = new Map();
    let audioCtx = null;
    let lastRenderedDateString = '';

    // --- Animal Emojis and Nickname Generator ---
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

    const USER_COLORS = [
        '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', 
        '#3b82f6', '#14b8a6', '#f43f5e', '#a855f7', '#6366f1'
    ];

    function getUserColor(name) {
        if (!name) return USER_COLORS[0];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
    }

    function getRandomName() {
        const adj = adjectives.at(Math.floor(Math.random() * adjectives.length));
        const ani = animalsList.at(Math.floor(Math.random() * animalsList.length));
        return `${adj} ${ani}`;
    }

    // --- Audio Feedback (Web Audio API) ---
    function playChatSound(type = 'sent') {
        try {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
            const now = audioCtx.currentTime;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);

            if (type === 'sent') {
                // Gentle WhatsApp-like ascending sent pop
                osc.type = 'sine';
                osc.frequency.setValueAtTime(520, now);
                osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
            } else if (type === 'received') {
                // Soft dual-tone incoming ping
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.setValueAtTime(780, now + 0.06);
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
                osc.start(now);
                osc.stop(now + 0.16);
            }
        } catch (e) {
            // Audio context blocked or unsupported
        }
    }

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

    function updateChatStatus(status) {
        const subtitleEl = document.getElementById('chatSubtitleText');
        if (subtitleEl) {
            if (activeTypingUsers.size > 0) {
                // Typing text takes priority
                return;
            }
            if (status === 'connected') {
                subtitleEl.textContent = '● live & connected';
                subtitleEl.classList.remove('typing');
            } else {
                subtitleEl.textContent = '● online (synced)';
                subtitleEl.classList.remove('typing');
            }
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

    function formatMessageContent(text, myName) {
        let escaped = escapeHtml(text);
        const cleanMyName = (myName || '').trim().toLowerCase();

        // 1. Auto-link URLs
        escaped = escaped.replace(/(https?:\/\/[^\s]+)/g, (url) => {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
        });

        // 2. Direct @Mentions
        escaped = escaped.replace(/@([a-zA-Z0-9_\s]{2,25})\b/g, (match, username) => {
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
        });

        return escaped;
    }

    function getDateBadgeText(timestamp) {
        const date = new Date(timestamp);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'TODAY';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'YESTERDAY';
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
        }
    }

    // --- HTTP Polling for Campus/College Firewall Bypass ---
    async function pollHttpMessages() {
        try {
            const res = await fetch(`/api/chat?room=${encodeURIComponent(myRoom)}&after=${lastPolledTimestamp}`);
            if (!res.ok) return;
            const data = await res.json();
            if (data && data.cleared) {
                handleRemoteChatClear(data.clearTimestamp);
            }
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

        // Connect WebSocket
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

                            updateRoomHeaderUI();
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
                    } else if (payload.action === 'chat-clear') {
                        const targetRoom = (payload.room || 'all').trim().toLowerCase();
                        if (targetRoom === 'all' || targetRoom === myRoom) {
                            handleRemoteChatClear(payload.timestamp);
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

    function updateRoomHeaderUI() {
        const chatRoomCodeEl = document.getElementById('chatRoomCode');
        if (chatRoomCodeEl) chatRoomCodeEl.textContent = myRoomDisplay;
        
        const avatarEl = document.getElementById('chatRoomAvatarText');
        if (avatarEl) {
            avatarEl.textContent = (myRoomDisplay.charAt(0) || 'L').toUpperCase();
        }

        if (chatInput) chatInput.placeholder = `Type a message in ${myRoomDisplay}...`;
    }

    // --- Typing Indicators (WhatsApp Style) ---
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
        const subtitleEl = document.getElementById('chatSubtitleText');

        if (activeTypingUsers.size === 0) {
            if (typingContainer) typingContainer.classList.add('hidden');
            updateChatStatus(signalingSocket && signalingSocket.readyState === WebSocket.OPEN ? 'connected' : 'http');
        } else {
            const users = Array.from(activeTypingUsers.values());
            let statusText = '';
            if (users.length === 1) {
                statusText = `${users[0].emoji} ${users[0].name} is typing...`;
            } else if (users.length === 2) {
                statusText = `${users[0].name} & ${users[1].name} are typing...`;
            } else {
                statusText = `${users.length} people are typing...`;
            }

            if (typingContainer && typingText) {
                typingText.textContent = statusText;
                typingContainer.classList.remove('hidden');
            }

            if (subtitleEl) {
                subtitleEl.textContent = statusText;
                subtitleEl.classList.add('typing');
            }

            if (chatMessages) {
                const isNearBottom = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < 100;
                if (isNearBottom) {
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
            }
        }
    }

    // --- Replying / Quoting (WhatsApp Style) ---
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
            chatInput.placeholder = `Type a message in ${myRoomDisplay}...`;
        }
    }

    // --- Reactions (WhatsApp Style) ---
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
            pill.innerHTML = `<span>${emoji}</span> <span style="font-size: 0.68rem; opacity: 0.9;">${peers.length}</span>`;
            pill.title = peers.length === 1 ? '1 reaction' : `${peers.length} reactions`;
            pill.onclick = (e) => {
                e.stopPropagation();
                toggleReaction(msgId, emoji);
            };
            rowEl.appendChild(pill);
        });
    }

    function showQuickReactionsBar(msgEl, msgId) {
        closeAllFloatingMenus();

        const bar = document.createElement('div');
        bar.className = 'chat-quick-reaction-bar';
        
        QUICK_REACTION_EMOJIS.forEach(emoji => {
            const btn = document.createElement('span');
            btn.className = 'chat-quick-emoji';
            btn.textContent = emoji;
            btn.onclick = (e) => {
                e.stopPropagation();
                toggleReaction(msgId, emoji);
                bar.remove();
            };
            bar.appendChild(btn);
        });

        // "➕" Button for more reactions
        const moreBtn = document.createElement('span');
        moreBtn.className = 'chat-quick-emoji';
        moreBtn.textContent = '➕';
        moreBtn.title = 'More reactions';
        moreBtn.style.fontSize = '0.95rem';
        moreBtn.onclick = (e) => {
            e.stopPropagation();
            bar.remove();
            showFullReactionPicker(msgEl, msgId);
        };
        bar.appendChild(moreBtn);

        msgEl.appendChild(bar);

        setTimeout(() => {
            const closeBar = (e) => {
                if (!bar.contains(e.target)) {
                    bar.remove();
                    document.removeEventListener('click', closeBar);
                }
            };
            document.addEventListener('click', closeBar);
        }, 10);
    }

    function showFullReactionPicker(msgEl, msgId) {
        closeAllFloatingMenus();

        const picker = document.createElement('div');
        picker.className = 'chat-quick-reaction-bar';
        picker.style.maxWidth = '260px';
        picker.style.flexWrap = 'wrap';
        picker.style.maxHeight = '140px';
        picker.style.overflowY = 'auto';
        picker.style.borderRadius = '12px';

        EXTENDED_EMOJIS.forEach(emoji => {
            const btn = document.createElement('span');
            btn.className = 'chat-quick-emoji';
            btn.textContent = emoji;
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
                if (!picker.contains(e.target)) {
                    picker.remove();
                    document.removeEventListener('click', closePicker);
                }
            };
            document.addEventListener('click', closePicker);
        }, 10);
    }

    function showContextMenu(msgEl, payload, isSelf) {
        closeAllFloatingMenus();

        const menu = document.createElement('div');
        menu.className = 'chat-context-menu';

        // 1. Reply
        const replyItem = document.createElement('button');
        replyItem.type = 'button';
        replyItem.className = 'chat-context-item';
        replyItem.innerHTML = '<span>↩</span> Reply';
        replyItem.onclick = (e) => {
            e.stopPropagation();
            setReplyTarget(payload);
            menu.remove();
        };
        menu.appendChild(replyItem);

        // 2. React
        const reactItem = document.createElement('button');
        reactItem.type = 'button';
        reactItem.className = 'chat-context-item';
        reactItem.innerHTML = '<span>😊</span> React';
        reactItem.onclick = (e) => {
            e.stopPropagation();
            menu.remove();
            showQuickReactionsBar(msgEl, payload.msgId);
        };
        menu.appendChild(reactItem);

        // 3. Copy Text
        const copyItem = document.createElement('button');
        copyItem.type = 'button';
        copyItem.className = 'chat-context-item';
        copyItem.innerHTML = '<span>📋</span> Copy Text';
        copyItem.onclick = (e) => {
            e.stopPropagation();
            copyMessageText(payload.message, msgEl);
            menu.remove();
        };
        menu.appendChild(copyItem);

        // 4. @Mention (if other user)
        if (!isSelf && payload.senderName) {
            const mentionItem = document.createElement('button');
            mentionItem.type = 'button';
            mentionItem.className = 'chat-context-item';
            mentionItem.innerHTML = '<span>💬</span> Mention';
            mentionItem.onclick = (e) => {
                e.stopPropagation();
                if (chatInput) {
                    const mention = `@${payload.senderName} `;
                    if (!chatInput.value.includes(mention)) {
                        chatInput.value = mention + chatInput.value;
                    }
                    chatInput.focus();
                }
                menu.remove();
            };
            menu.appendChild(mentionItem);
        }

        // 5. Delete for Me
        const deleteItem = document.createElement('button');
        deleteItem.type = 'button';
        deleteItem.className = 'chat-context-item';
        deleteItem.style.color = '#ef4444';
        deleteItem.innerHTML = '<span>🗑️</span> Delete for me';
        deleteItem.onclick = (e) => {
            e.stopPropagation();
            deleteMessageLocally(payload.msgId, msgEl);
            menu.remove();
        };
        menu.appendChild(deleteItem);

        msgEl.appendChild(menu);

        setTimeout(() => {
            const closeMenu = (e) => {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            };
            document.addEventListener('click', closeMenu);
        }, 10);
    }

    function closeAllFloatingMenus() {
        document.querySelectorAll('.chat-quick-reaction-bar, .chat-context-menu').forEach(el => el.remove());
    }

    function copyMessageText(text, msgEl) {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            showCopiedToast(msgEl);
        }).catch(() => {
            // Fallback
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            showCopiedToast(msgEl);
        });
    }

    function showCopiedToast(msgEl) {
        if (!msgEl) return;
        const toast = document.createElement('div');
        toast.className = 'chat-copied-toast';
        toast.textContent = 'Copied! ✓';
        msgEl.appendChild(toast);
        setTimeout(() => toast.remove(), 1200);
    }

    function deleteMessageLocally(msgId, msgEl) {
        if (msgEl) {
            msgEl.style.transition = 'all 0.2s ease';
            msgEl.style.transform = 'scale(0.8)';
            msgEl.style.opacity = '0';
            setTimeout(() => msgEl.remove(), 200);
        }
        try {
            const history = JSON.parse(sessionStorage.getItem('lablazy_chat_history_' + myRoom) || '[]');
            const filtered = history.filter(h => h.payload.msgId !== msgId && `${h.payload.senderId}_${h.payload.timestamp}` !== msgId);
            sessionStorage.setItem('lablazy_chat_history_' + myRoom, JSON.stringify(filtered));
        } catch (e) {}
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
        const msgDate = new Date(payload.timestamp || Date.now());
        const dateKey = msgDate.toDateString();

        // 1. WhatsApp Date Badges
        if (dateKey !== lastRenderedDateString) {
            lastRenderedDateString = dateKey;
            const datePill = document.createElement('div');
            datePill.className = 'chat-date-pill';
            datePill.textContent = getDateBadgeText(msgDate);
            chatMessages.appendChild(datePill);
        }

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
                    currentTranslateX = Math.min(diffX, 80);
                    msgEl.style.transform = `translateX(${currentTranslateX}px)`;
                    if (currentTranslateX > 50) {
                        swipeBadge.style.opacity = '1';
                        swipeBadge.style.transform = 'translateY(-50%) scale(1.15)';
                    } else {
                        swipeBadge.style.opacity = `${currentTranslateX / 50}`;
                        swipeBadge.style.transform = 'translateY(-50%) scale(0.9)';
                    }
                }
            }
        }, { passive: true });

        const endSwipe = () => {
            if (isSwiping) {
                if (currentTranslateX > 50) {
                    setReplyTarget(payload);
                }
                msgEl.style.transition = 'transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                msgEl.style.transform = 'translateX(0px)';
                swipeBadge.style.opacity = '0';
                swipeBadge.style.transform = 'translateY(-50%) scale(0.8)';
                setTimeout(() => { msgEl.style.transition = ''; }, 260);
                isSwiping = false;
                currentTranslateX = 0;
            }
        };
        msgEl.addEventListener('touchend', endSwipe, { passive: true });
        msgEl.addEventListener('touchcancel', endSwipe, { passive: true });

        // WhatsApp Hover / Action Toolbar
        const actionsBar = document.createElement('div');
        actionsBar.className = 'chat-message-actions';

        // Quick React Button
        const reactBtn = document.createElement('button');
        reactBtn.type = 'button';
        reactBtn.className = 'chat-msg-action-btn';
        reactBtn.innerHTML = '😊';
        reactBtn.title = 'React';
        reactBtn.onclick = (e) => {
            e.stopPropagation();
            showQuickReactionsBar(msgEl, msgId);
        };
        actionsBar.appendChild(reactBtn);

        // Menu Dropdown Button (WhatsApp Chevron)
        const menuBtn = document.createElement('button');
        menuBtn.type = 'button';
        menuBtn.className = 'chat-msg-action-btn';
        menuBtn.innerHTML = '▾';
        menuBtn.title = 'Menu';
        menuBtn.onclick = (e) => {
            e.stopPropagation();
            showContextMenu(msgEl, payload, isSelf);
        };
        actionsBar.appendChild(menuBtn);

        msgEl.appendChild(actionsBar);

        // Quoted Reply Card (WhatsApp Style)
        if (payload.replyTo && payload.replyTo.text) {
            const quoteCard = document.createElement('div');
            quoteCard.className = 'chat-quote-card';
            const quoteColor = getUserColor(payload.replyTo.senderName);
            quoteCard.style.borderLeftColor = quoteColor;
            quoteCard.innerHTML = `
                <div class="chat-quote-sender" style="color: ${quoteColor};">
                    ${escapeHtml(payload.replyTo.senderEmoji || '')} ${escapeHtml(payload.replyTo.senderName || 'Anonymous')}
                </div>
                <div class="chat-quote-text">${escapeHtml(payload.replyTo.text)}</div>
            `;
            quoteCard.onclick = () => {
                const targetMsg = chatMessages.querySelector(`[data-msg-id="${CSS.escape(payload.replyTo.msgId)}"]`);
                if (targetMsg) {
                    targetMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    targetMsg.classList.add('chat-message-highlight');
                    setTimeout(() => { targetMsg.classList.remove('chat-message-highlight'); }, 1400);
                }
            };
            msgEl.appendChild(quoteCard);
        }

        // Header for incoming messages
        if (!isSelf) {
            const headerEl = document.createElement('div');
            headerEl.className = 'chat-message-header';
            
            const senderBadge = document.createElement('span');
            senderBadge.className = 'chat-sender-badge';
            const userColor = getUserColor(payload.senderName);
            senderBadge.style.color = userColor;
            senderBadge.textContent = `${payload.senderEmoji || ''} ${payload.senderName || 'Anonymous'}`;
            senderBadge.title = `Click to @mention ${payload.senderName}`;
            senderBadge.onclick = (e) => {
                e.stopPropagation();
                if (chatInput) {
                    const mentionText = `@${payload.senderName} `;
                    if (!chatInput.value.includes(mentionText)) {
                        chatInput.value = mentionText + chatInput.value;
                    }
                    chatInput.focus();
                }
            };
            headerEl.appendChild(senderBadge);
            msgEl.appendChild(headerEl);
        }

        // Message Text Content
        const textEl = document.createElement('div');
        textEl.className = 'chat-message-text';
        textEl.innerHTML = formatMessageContent(payload.message || '', myNickname);
        msgEl.appendChild(textEl);

        // WhatsApp Bottom Inline Meta (Timestamp + Double Ticks)
        const metaEl = document.createElement('div');
        metaEl.className = 'chat-message-meta';
        const formattedTime = msgDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
        
        if (isSelf) {
            metaEl.innerHTML = `<span>${formattedTime}</span> <span class="chat-tick-icon" title="Delivered">✓✓</span>`;
        } else {
            metaEl.innerHTML = `<span>${formattedTime}</span>`;
        }
        msgEl.appendChild(metaEl);

        // Render Reactions Badges Row
        if (payload.reactions && Object.keys(payload.reactions).length > 0) {
            renderReactionsRow(msgEl, payload.reactions, msgId);
        }

        chatMessages.appendChild(msgEl);

        // Auto-Scroll Handling
        const isNearBottom = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < 120;
        if (isNearBottom || isSelf) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
            updateScrollBottomBtnState();
        } else {
            unreadScrolledCount++;
            updateScrollBottomBtnState();
        }
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
        playChatSound('received');
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
        hideEmojiDrawer();
        playChatSound('sent');

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

    async function joinCustomRoom(newRoomCode) {
        const cleanRoom = newRoomCode.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
        if (!cleanRoom) return;

        if (cleanRoom === myRoom) return;

        myRoom = cleanRoom;
        myRoomDisplay = cleanRoom.toUpperCase();
        lastPolledTimestamp = 0;
        seenMsgKeys.clear();
        sessionStorage.setItem('lablazy_room', myRoom);
        localStorage.setItem('lablazy_room', myRoom);
        sessionStorage.setItem('lablazy_room_display', myRoomDisplay);
        localStorage.setItem('lablazy_room_display', myRoomDisplay);
        
        if (chatMessages) chatMessages.innerHTML = '';
        lastRenderedDateString = '';
        
        initChatRoom();
        updateRoomHeaderUI();
        
        if (isChatCurrentlyOpen()) {
            loadChatHistory();
        }
    }

    function clearRoomChat() {
        if (confirm(`Are you sure you want to clear the chat messages for ${myRoomDisplay}?`)) {
            sessionStorage.removeItem('lablazy_chat_history_' + myRoom);
            if (chatMessages) chatMessages.innerHTML = '';
            lastRenderedDateString = '';
            insertEncryptionBanner();
        }
    }

    function handleRemoteChatClear(timestamp) {
        if (chatMessages) chatMessages.innerHTML = '';
        lastRenderedDateString = '';
        seenMsgKeys.clear();
        if (timestamp) lastPolledTimestamp = timestamp;
        sessionStorage.removeItem('lablazy_chat_history_' + myRoom);
        
        insertEncryptionBanner();
        
        const notice = document.createElement('div');
        notice.className = 'chat-info-banner';
        notice.style.background = 'rgba(239, 68, 68, 0.12)';
        notice.style.borderColor = '#ef4444';
        notice.style.color = '#ef4444';
        notice.innerHTML = '🧹 Chat messages were cleared by the admin.';
        chatMessages.appendChild(notice);
    }

    function insertEncryptionBanner() {
        if (!chatMessages) return;
        const banner = document.createElement('div');
        banner.className = 'chat-info-banner';
        banner.innerHTML = '🔒 Messages in this room code are peer-to-peer and temporary.';
        chatMessages.appendChild(banner);
    }

    function loadChatHistory() {
        if (chatMessages) chatMessages.innerHTML = '';
        lastRenderedDateString = '';
        insertEncryptionBanner();

        const cachedHistory = sessionStorage.getItem('lablazy_chat_history_' + myRoom);
        if (cachedHistory) {
            try {
                JSON.parse(cachedHistory).forEach(item => appendChatMessage(item.payload, item.isSelf));
            } catch (e) {
                console.error("Failed to restore chat history:", e);
            }
        }
    }

    // --- Floating Scroll-To-Bottom Button ---
    let scrollBottomBtn = null;
    function setupScrollBottomBtn() {
        if (!chatDialog) return;
        scrollBottomBtn = document.getElementById('chatScrollBottomBtn');
        if (!scrollBottomBtn) {
            scrollBottomBtn = document.createElement('button');
            scrollBottomBtn.id = 'chatScrollBottomBtn';
            scrollBottomBtn.className = 'chat-scroll-bottom-btn hidden';
            scrollBottomBtn.title = 'Scroll to bottom';
            scrollBottomBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                <span id="chatScrollBadge" class="chat-scroll-badge hidden">0</span>
            `;
            scrollBottomBtn.onclick = () => {
                if (chatMessages) {
                    chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
                    unreadScrolledCount = 0;
                    updateScrollBottomBtnState();
                }
            };
            chatDialog.appendChild(scrollBottomBtn);
        }

        if (chatMessages) {
            chatMessages.addEventListener('scroll', () => {
                const isNearBottom = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < 80;
                if (isNearBottom) {
                    unreadScrolledCount = 0;
                }
                updateScrollBottomBtnState();
            });
        }
    }

    function updateScrollBottomBtnState() {
        if (!scrollBottomBtn || !chatMessages) return;
        const isNearBottom = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < 80;
        const badgeEl = document.getElementById('chatScrollBadge');

        if (isNearBottom) {
            scrollBottomBtn.classList.add('hidden');
        } else {
            scrollBottomBtn.classList.remove('hidden');
            if (badgeEl) {
                if (unreadScrolledCount > 0) {
                    badgeEl.textContent = unreadScrolledCount > 9 ? '9+' : unreadScrolledCount;
                    badgeEl.classList.remove('hidden');
                } else {
                    badgeEl.classList.add('hidden');
                }
            }
        }
    }

    // --- WhatsApp Emoji Drawer ---
    let emojiDrawer = null;
    let emojiToggleBtn = null;

    function setupEmojiDrawer() {
        if (!chatDialog) return;
        emojiDrawer = document.getElementById('chatEmojiDrawer');
        emojiToggleBtn = document.getElementById('chatEmojiToggleBtn');

        if (!emojiDrawer) {
            emojiDrawer = document.createElement('div');
            emojiDrawer.id = 'chatEmojiDrawer';
            emojiDrawer.className = 'chat-emoji-drawer hidden';

            // Category Tabs
            const tabsRow = document.createElement('div');
            tabsRow.className = 'chat-emoji-tabs';
            
            const tabs = [
                { id: 'smileys', icon: '😀' },
                { id: 'gestures', icon: '👍' },
                { id: 'hearts', icon: '❤️' },
                { id: 'nature', icon: '🍕' },
                { id: 'objects', icon: '💻' }
            ];

            const gridContainer = document.createElement('div');
            gridContainer.className = 'chat-emoji-grid';

            function renderCategory(catId) {
                gridContainer.innerHTML = '';
                const list = EMOJI_CATEGORIES[catId] || EXTENDED_EMOJIS;
                list.forEach(emoji => {
                    const cell = document.createElement('div');
                    cell.className = 'chat-emoji-cell';
                    cell.textContent = emoji;
                    cell.onclick = (e) => {
                        e.stopPropagation();
                        insertEmojiAtCursor(emoji);
                    };
                    gridContainer.appendChild(cell);
                });
            }

            tabs.forEach((tab, index) => {
                const tabBtn = document.createElement('button');
                tabBtn.type = 'button';
                tabBtn.className = 'chat-emoji-tab-btn' + (index === 0 ? ' active' : '');
                tabBtn.textContent = tab.icon;
                tabBtn.onclick = (e) => {
                    e.stopPropagation();
                    tabsRow.querySelectorAll('.chat-emoji-tab-btn').forEach(b => b.classList.remove('active'));
                    tabBtn.classList.add('active');
                    renderCategory(tab.id);
                };
                tabsRow.appendChild(tabBtn);
            });

            emojiDrawer.appendChild(tabsRow);
            emojiDrawer.appendChild(gridContainer);
            renderCategory('smileys');

            const inputRow = chatDialog.querySelector('.chat-input-row') || chatInput?.parentElement;
            if (inputRow && inputRow.parentElement) {
                inputRow.parentElement.insertBefore(emojiDrawer, inputRow);
            } else {
                chatDialog.appendChild(emojiDrawer);
            }
        }

        if (emojiToggleBtn) {
            emojiToggleBtn.onclick = (e) => {
                e.stopPropagation();
                toggleEmojiDrawer();
            };
        }
    }

    function toggleEmojiDrawer() {
        if (!emojiDrawer) return;
        const isHidden = emojiDrawer.classList.contains('hidden');
        if (isHidden) {
            emojiDrawer.classList.remove('hidden');
        } else {
            emojiDrawer.classList.add('hidden');
        }
    }

    function hideEmojiDrawer() {
        if (emojiDrawer) {
            emojiDrawer.classList.add('hidden');
        }
    }

    function insertEmojiAtCursor(emoji) {
        if (!chatInput) return;
        const start = chatInput.selectionStart || chatInput.value.length;
        const end = chatInput.selectionEnd || chatInput.value.length;
        const text = chatInput.value;
        chatInput.value = text.substring(0, start) + emoji + text.substring(end);
        chatInput.focus();
        chatInput.selectionStart = chatInput.selectionEnd = start + emoji.length;

        if (!isCurrentlyTyping) {
            isCurrentlyTyping = true;
            sendTypingStatus(true);
        }
    }

    // --- WhatsApp Chat Layout Initializer ---
    function ensureWhatsAppLayout() {
        if (!chatDialog) return;

        // 1. Upgrade Header
        let headerBar = chatDialog.querySelector('.chat-header-bar');
        if (!headerBar) {
            // Remove older simple headers if present
            const oldH3 = chatDialog.querySelector('h3');
            const oldP = chatDialog.querySelector('p');
            if (oldH3) oldH3.remove();
            if (oldP) oldP.remove();

            headerBar = document.createElement('div');
            headerBar.className = 'chat-header-bar';
            headerBar.innerHTML = `
                <div class="chat-header-left">
                    <div class="chat-room-avatar">
                        <span id="chatRoomAvatarText">${(myRoomDisplay.charAt(0) || 'L').toUpperCase()}</span>
                        <span class="chat-online-badge"></span>
                    </div>
                    <div class="chat-header-meta">
                        <div class="chat-header-title">
                            <span id="chatRoomCode">${myRoomDisplay}</span>
                        </div>
                        <div class="chat-header-subtitle" id="chatSubtitleText">● live & connected</div>
                    </div>
                </div>
                <div class="chat-header-actions">
                    <button id="chatChangeRoomBtn" class="chat-header-btn" title="Change Room">
                        <span>🏷️</span> Room
                    </button>
                    <button id="chatClearBtn" class="chat-header-btn" title="Clear Chat History">
                        <span>🧹</span> Clear
                    </button>
                    <button id="closeChatBtn" class="chat-header-close-btn" title="Close Chat" aria-label="Close Chat">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
            `;
            chatDialog.insertBefore(headerBar, chatDialog.firstChild);
        }

        // 2. Upgrade Input Row
        const oldInputContainer = chatInput?.parentElement;
        if (oldInputContainer && !oldInputContainer.classList.contains('chat-input-row')) {
            oldInputContainer.className = 'chat-input-row';
            
            let emojiBtn = document.getElementById('chatEmojiToggleBtn');
            if (!emojiBtn) {
                emojiBtn = document.createElement('button');
                emojiBtn.id = 'chatEmojiToggleBtn';
                emojiBtn.type = 'button';
                emojiBtn.className = 'chat-emoji-toggle-btn';
                emojiBtn.title = 'Add emoji';
                emojiBtn.innerHTML = '😊';
                oldInputContainer.insertBefore(emojiBtn, chatInput);
            }

            if (chatInput) {
                chatInput.className = 'chat-input-field';
            }

            if (sendChatBtn) {
                sendChatBtn.className = 'chat-send-btn';
                sendChatBtn.innerHTML = `
                    <span>Send</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                `;
            }
        }

        // Reconnect Header Buttons
        const changeRoomBtn = document.getElementById('chatChangeRoomBtn');
        const clearBtn = document.getElementById('chatClearBtn');
        const closeBtn = document.getElementById('closeChatBtn');

        if (changeRoomBtn) {
            changeRoomBtn.onclick = () => {
                const roomModal = document.getElementById('roomModal');
                const newRoomCodeInput = document.getElementById('newRoomCodeInput');
                if (roomModal) {
                    if (newRoomCodeInput) newRoomCodeInput.value = myRoomDisplay;
                    roomModal.classList.remove('hidden');
                    if (window.onModalOpen) window.onModalOpen();
                }
            };
        }

        if (clearBtn) {
            clearBtn.onclick = clearRoomChat;
        }

        if (closeBtn) {
            closeBtn.onclick = toggleChatModal;
        }

        setupEmojiDrawer();
        setupScrollBottomBtn();
    }

    // --- Modal State Detection ---
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
            
            updateRoomHeaderUI();
            loadChatHistory();

            // Show modal & dialog
            if (parentModal) parentModal.classList.remove('hidden');
            if (chatDialog) chatDialog.classList.remove('hidden');
            
            if (window.onModalOpen) window.onModalOpen();
            setTimeout(() => {
                if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
                if (chatInput) chatInput.focus();
            }, 50);
        } else {
            clearReplyTarget();
            hideEmojiDrawer();
            closeAllFloatingMenus();
            if (chatDialog) chatDialog.classList.add('hidden');
            
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
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage();
            } else if (e.key === 'Escape') {
                if (activeReplyTarget) {
                    clearReplyTarget();
                } else {
                    hideEmojiDrawer();
                }
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
            if (chatDialog) chatDialog.classList.add('hidden');
            const cModal = document.getElementById('chatModal');
            if (cModal) cModal.classList.add('hidden');
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

    // Global click listener to close popups
    document.addEventListener('click', (e) => {
        if (emojiDrawer && !emojiDrawer.classList.contains('hidden')) {
            if (!emojiDrawer.contains(e.target) && e.target !== emojiToggleBtn && !emojiToggleBtn?.contains(e.target)) {
                hideEmojiDrawer();
            }
        }
    });

    // Listen for room changes from other tabs/pages
    window.addEventListener('storage', (e) => {
        if (e.key === 'lablazy_room' && e.newValue) {
            const cleanRoom = e.newValue.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
            if (cleanRoom && cleanRoom !== myRoom) {
                myRoom = cleanRoom;
                myRoomDisplay = localStorage.getItem('lablazy_room_display') || myRoom.toUpperCase();
                
                if (chatMessages) chatMessages.innerHTML = '';
                lastRenderedDateString = '';
                initChatRoom();
                updateRoomHeaderUI();
                
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

    // --- Initialize Layout & Connect ---
    ensureWhatsAppLayout();
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