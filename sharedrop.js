document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const logo = document.getElementById('sharedropLogo');
    const navChatBtn = document.getElementById('navChatBtn');
    const navChatBadge = document.getElementById('navChatBadge');
    const themeToggle = document.getElementById('themeToggle');
    const roleSelectionContainer = document.getElementById('roleSelectionContainer');
    const chooseSendRoleBtn = document.getElementById('chooseSendRoleBtn');
    const chooseReceiveRoleBtn = document.getElementById('chooseReceiveRoleBtn');
    const sendUploadContainer = document.getElementById('sendUploadContainer');
    const uploadBackBtn = document.getElementById('uploadBackBtn');
    const sharedropDropZone = document.getElementById('sharedropDropZone');
    const unifiedUploadBtn = document.getElementById('unifiedUploadBtn');
    const sharedropFileInput = document.getElementById('sharedropFileInput');
    const sharedropFolderInput = document.getElementById('sharedropFolderInput');
    const selectedFilesSection = document.getElementById('selectedFilesSection');
    const sharedropFileCountPill = document.getElementById('sharedropFileCountPill');
    const sharedropRemoveAllBtn = document.getElementById('sharedropRemoveAllBtn');
    const sharedropFileList = document.getElementById('sharedropFileList');
    const proceedToSendBtn = document.getElementById('proceedToSendBtn');
    const radarDisplayContainer = document.getElementById('radarDisplayContainer');
    const radarBackBtn = document.getElementById('radarBackBtn');
    const roomCodeInput = document.getElementById('roomCodeInput');
    const joinRoomBtn = document.getElementById('joinRoomBtn');
    const radarDropArea = document.getElementById('radarDropArea');
    const mentiCanvasBg = document.getElementById('mentiCanvasBg');
    const sendToAllContainer = document.getElementById('sendToAllContainer');
    const sendToAllBtn = document.getElementById('sendToAllBtn');
    const peerCountSpan = document.getElementById('peerCountSpan');
    const peersHub = document.getElementById('peersHub');
    const radarInstructions = document.getElementById('radarInstructions');
    const radarSubtext = document.getElementById('radarSubtext');
    const selfIcon = document.getElementById('selfIcon');
    const selfNameText = document.getElementById('selfNameText');
    const selfMetaText = document.getElementById('selfMetaText');
    const mentiParticipantCounter = document.getElementById('mentiParticipantCounter');
    const mentiCounterVal = document.getElementById('mentiCounterVal');
    const portalModal = document.getElementById('navigationPortalModal');
    const closePortalModal = document.getElementById('closePortalModal');
    const transferModal = document.getElementById('transferModal');
    const transferDialog = document.getElementById('transferDialog');
    const modalChatBtn = document.getElementById('modalChatBtn');
    const modalChatBadge = document.getElementById('modalChatBadge');
    
    const singleContainer = document.getElementById('singleTransferContainer');
    const transferIcon = document.getElementById('transferIcon');
    const transferTitle = document.getElementById('transferTitle');
    const transferFilesList = document.getElementById('transferFilesList');
    const transferFilename = document.getElementById('transferFilename');
    const transferFilesize = document.getElementById('transferFilesize');
    const transferProgressContainer = document.getElementById('transferProgressContainer');
    const transferProgressBar = document.getElementById('transferProgressBar');
    const transferProgressPercent = document.getElementById('transferProgressPercent');
    const transferActions = document.getElementById('transferActions');
    const transferDeclineBtn = document.getElementById('transferDeclineBtn');
    const transferAcceptBtn = document.getElementById('transferAcceptBtn');
    const transferFinishedActions = document.getElementById('transferFinishedActions');
    const transferCloseBtn = document.getElementById('transferCloseBtn');
    
    const multiContainer = document.getElementById('multiTransferContainer');
    const transferStatusArea = document.getElementById('transferStatusArea');
    const multiTransferCancelBtn = document.getElementById('multiTransferCancelBtn');
    const multiTransferCloseBtn = document.getElementById('multiTransferCloseBtn');
    
    const receiverContainer = document.getElementById('receiverTransferContainer');
    const receiverSenderName = document.getElementById('receiverSenderName');
    const receiverDeclineAllBtn = document.getElementById('receiverDeclineAllBtn');
    const receiverAcceptAllBtn = document.getElementById('receiverAcceptAllBtn');
    const receiverStatusArea = document.getElementById('receiverStatusArea');
    const receiverTransferCloseBtn = document.getElementById('receiverTransferCloseBtn');
    
    const chatDialog = document.getElementById('chatDialog');
    const closeChatBtn = document.getElementById('closeChatBtn');
    const chatRoomCode = document.getElementById('chatRoomCode');
    const chatChangeRoomBtn = document.getElementById('chatChangeRoomBtn');
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const sendChatBtn = document.getElementById('sendChatBtn');
    const roomModal = document.getElementById('roomModal');
    const closeRoomModal = document.getElementById('closeRoomModal');
    const newRoomCodeInput = document.getElementById('newRoomCodeInput');
    const newRoomCodeCancelBtn = document.getElementById('newRoomCodeCancelBtn');
    const newRoomCodeJoinBtn = document.getElementById('newRoomCodeJoinBtn');
    const roomConfirmModal = document.getElementById('roomConfirmModal');
    const roomConfirmCancelBtn = document.getElementById('roomConfirmCancelBtn');
    const roomConfirmYesBtn = document.getElementById('roomConfirmYesBtn');
    const generateRoomBtn = document.getElementById('generateRoomBtn');
    const verificationCodeContainer = document.getElementById('verificationCodeContainer');
    const verificationCodeValue = document.getElementById('verificationCodeValue');

    const viewHistoryBtn = document.getElementById('viewHistoryBtn');
    const historyCount = document.getElementById('historyCount');
    const historyModal = document.getElementById('historyModal');
    const closeHistoryModal = document.getElementById('closeHistoryModal');
    const closeHistoryModalBtn = document.getElementById('closeHistoryModalBtn');
    const historyTotalCountPill = document.getElementById('historyTotalCountPill');
    const downloadAllHistoryBtn = document.getElementById('downloadAllHistoryBtn');
    const historyList = document.getElementById('historyList');
    const historyEmptyState = document.getElementById('historyEmptyState');

    // App State Variables
    let peer = null;
    let myPeerId = null;
    let myNickname = '';
    let myRoom = localStorage.getItem('lablazy_room') || sessionStorage.getItem('lablazy_room') || 'lobby';
    let myRoomDisplay = localStorage.getItem('lablazy_room_display') || sessionStorage.getItem('lablazy_room_display') || 'LOBBY';
    const USE_LOCAL_SERVER = (window.location.hostname === 'localhost' || 
                              window.location.hostname === '127.0.0.1' || 
                              window.location.hostname === '[::1]') && 
                             (window.location.search.includes('local=true') || (typeof AppConfig !== 'undefined' && AppConfig.FORCE_LOCAL));
    const SIGNALING_HOST = USE_LOCAL_SERVER ? 'localhost:8080' : (typeof AppConfig !== 'undefined' ? AppConfig.SIGNALING_HOST : 'lablazy-signaling-server.onrender.com');
    let myDeviceInfo = {};
    let isInitialized = false;

    const peersInRoom = new Map();
    const activeConnections = new Map();
    const peerMissingCounts = new Map();
    const activeTransferState = new Map(); // maps peerId -> { peerName, files: [...] }

    let selectedFiles = [];
    const transferQueues = new Map(); // maps peerId -> Array of files
    const currentQueueItems = new Map(); // maps peerId -> current active file
    const fileTransferStates = new Map(); // maps peerId -> { file, reader, conn, offset, chunkIndex, retries, ackTimeout, isSending }
    let incomingTransfer = null;
    let currentRole = 'receiver';
    let unreadChatCount = 0;
    let resizeRadarCanvas = null;

    const receivedFilesHistory = [];

    const CHUNK_SIZE = 16384;

    const HIGH_RISK_EXTENSIONS = ['.exe', '.bat', '.cmd', '.sh', '.msi', '.vbs', '.js', '.scr', '.lnk', '.sys', '.com'];
    
    function isHighRiskFile(filename) {
        const ext = '.' + filename.split('.').pop().toLowerCase();
        return HIGH_RISK_EXTENSIONS.includes(ext);
    }

    function getVerificationCode(id1, id2) {
        if (!id1 || !id2) return 1000;
        const sorted = [id1, id2].sort().join(':');
        let hash = 0;
        for (let i = 0; i < sorted.length; i++) {
            hash = (hash * 33) ^ sorted.charCodeAt(i);
        }
        return Math.abs(hash % 9000) + 1000;
    }

    const animalEmojis = new Map([
        // Animals (50)
        ["Unicorn", "🦄"], ["Robot", "🤖"], ["Ghost", "👻"], ["Bear", "🐻"], ["Cat", "🐱"],
        ["Dog", "🐶"], ["Monkey", "🐵"], ["Frog", "🐸"], ["Panda", "🐼"], ["Koala", "🐨"],
        ["Dinosaur", "🦖"], ["Alien", "👽"], ["Octopus", "🐙"], ["Butterfly", "🦋"], ["Flamingo", "🦩"],
        ["Falcon", "🦅"], ["Dolphin", "🐬"], ["Tiger", "🐯"], ["Fox", "🦊"], ["Cheetah", "🐆"],
        ["Owl", "🦉"], ["Rabbit", "🐰"], ["Lion", "🦁"], ["Penguin", "🐧"], ["Wolf", "🐺"],
        ["Bee", "🐝"], ["Ladybug", "🐞"], ["Turtle", "🐢"], ["Snake", "🐍"], ["Whale", "🐳"],
        ["Shark", "🦈"], ["Parrot", "🦜"], ["Swan", "🦢"], ["Spider", "🕷️"], ["Dragon", "🐉"],
        ["Elephant", "🐘"], ["Giraffe", "🦒"], ["Hedgehog", "🦔"], ["Squirrel", "🐿️"], ["Sloth", "🦥"],
        ["Kangaroo", "🦘"], ["Badger", "🦡"], ["Crab", "🦀"], ["Lobster", "🦞"], ["Jellyfish", "🪼"],
        ["Starfish", "🌟"], ["Peacock", "🦚"], ["Chameleon", "🦎"], ["Hamster", "🐹"], ["Raccoon", "🦝"],
        // Items, Foods & Nature (50)
        ["Donut", "🍩"], ["Rocket", "🚀"], ["Pizza", "🍕"], ["IceCream", "🍦"], ["Balloon", "🎈"],
        ["Heart", "💖"], ["Clover", "🍀"], ["Star", "⭐"], ["Crown", "👑"], ["Taco", "🌮"],
        ["Burger", "🍔"], ["Fries", "🍟"], ["Cookie", "🍪"], ["Cake", "🍰"], ["Apple", "🍎"],
        ["Banana", "🍌"], ["Cherry", "🍒"], ["Avocado", "🥑"], ["Popcorn", "🍿"], ["Coffee", "☕"],
        ["Boba", "🧋"], ["Guitar", "🎸"], ["Piano", "🎹"], ["Trophy", "🏆"], ["Diamond", "💎"],
        ["Ring", "💍"], ["Gift", "🎁"], ["Magnet", "🧲"], ["Key", "🔑"], ["Shield", "🛡️"],
        ["Sword", "⚔️"], ["Hammer", "🔨"], ["Anchor", "⚓"], ["Compass", "🧭"], ["Book", "📖"],
        ["Laptop", "💻"], ["Phone", "📱"], ["Watch", "⌚"], ["Controller", "🎮"], ["Puzzle", "🧩"],
        ["Fire", "🔥"], ["Water", "💧"], ["Cloud", "☁️"], ["Sun", "☀️"], ["Moon", "🌙"],
        ["Lightning", "⚡"], ["Rainbow", "🌈"], ["Wave", "🌊"], ["Tree", "🌲"], ["Flower", "🌸"]
    ]);
    const adjectives = [
        "Happy", "Sleepy", "Lazy", "Crazy", "Dancing", "Singing", "Jumping", 
        "Silly", "Cool", "Funky", "Brave", "Clever", "Shiny", "Cosmic", 
        "Magic", "Sneaky", "Jolly", "Cheeky", "Daring", "Speedy",
        "Wobbly", "Chubby", "Friendly", "Gentle", "Silent", "Rowdy", "Glittery",
        "Sparkly", "Glowy", "Chill", "Hyper", "Feisty", "Dandy", "Fun",
        "Fancy", "Proud", "Wild", "Polite", "Kind", "Calm", "Dreamy",
        "Bright", "Loud", "Quick", "Smart", "Wise", "Bouncy", "Cuddly",
        "Fuzzy", "Spicy", "Sweet", "Salty", "Tangy", "Crispy", "Golden",
        "Silver", "Neon", "Rainbow", "Stealthy", "Crafty", "Swift", "Nimble",
        "Eager", "Zealous", "Vibrant", "Radiant", "Joyful", "Cheerful", "Mellow",
        "Fluffy", "Snuggly", "Tiny", "Giant", "Mega", "Super", "Ultra",
        "Cosmo", "Astro", "Solar", "Lunar", "Stellar", "Giga", "Turbo",
        "Retro", "Mod", "Vintage", "Classic", "Modern", "Future", "Digital",
        "Pixel", "Cyber", "Crypto", "Quantum", "Sonic", "Static", "Dynamic",
        "Electric", "Magnetic", "Atomic"
    ];
    const animalsList = Array.from(animalEmojis.keys());

    function getRandomName() {
        const adj = adjectives.at(Math.floor(Math.random() * adjectives.length));
        const ani = animalsList.at(Math.floor(Math.random() * animalsList.length));
        return `${adj} ${ani}`;
    }

    function getDeviceDetails() {
        const ua = navigator.userAgent;
        let os = "Unknown OS";
        if (ua.indexOf("Win") !== -1) os = "Windows";
        else if (ua.indexOf("Mac") !== -1) os = "macOS";
        else if (ua.indexOf("X11") !== -1) os = "UNIX";
        else if (ua.indexOf("Linux") !== -1) os = "Linux";
        else if (ua.indexOf("Android") !== -1) os = "Android";
        else if (ua.indexOf("like Mac") !== -1) os = "iOS";

        let browser = "Unknown Browser";
        if (ua.indexOf("Chrome") !== -1) browser = "Chrome";
        else if (ua.indexOf("Safari") !== -1) browser = "Safari";
        else if (ua.indexOf("Firefox") !== -1) browser = "Firefox";
        else if (ua.indexOf("MSIE") !== -1 || !!document.documentMode) browser = "IE";
        
        return { os, browser };
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function getAnimalName(fullName) {
        if (!fullName) return '';
        const parts = fullName.split(' ');
        return parts[1] || '';
    }

    // ==========================================
    // INDEXEDDB UTILITIES FOR PDF TRANSFERS
    // ==========================================
    const DB_NAME = 'LablazyTransfersDB';
    const STORE_NAME = 'transferred_pdfs';

    function openTransfersDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 1);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'name' });
                }
            };
            request.onsuccess = (e) => resolve(e.target.result);
            request.onerror = (e) => reject(e.target.error);
        });
    }

    function storeTransferredPDF(name, blob) {
        return openTransfersDB().then(db => {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(STORE_NAME, 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.put({ name, blob });
                request.onsuccess = () => resolve();
                request.onerror = (e) => reject(e.target.error);
            });
        });
    }

    function getTransferredPDFs() {
        return openTransfersDB().then(db => {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(STORE_NAME, 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.getAll();
                request.onsuccess = (e) => resolve(e.target.result);
                request.onerror = (e) => reject(e.target.error);
            });
        });
    }

    function clearTransferredPDFs() {
        return openTransfersDB().then(db => {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(STORE_NAME, 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.clear();
                request.onsuccess = () => resolve();
                request.onerror = (e) => reject(e.target.error);
            });
        });
    }

    function showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer') || (() => {
            const el = document.createElement('div');
            el.id = 'toastContainer';
            el.style.position = 'fixed';
            el.style.bottom = '2rem';
            el.style.right = '2rem';
            el.style.display = 'flex';
            el.style.flexDirection = 'column';
            el.style.gap = '0.5rem';
            el.style.zIndex = '10000';
            document.body.appendChild(el);
            return el;
        })();

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.background = type === 'error' ? '#ef4444' : (type === 'success' ? '#10b981' : '#1e293b');
        toast.style.color = '#fff';
        toast.style.padding = '0.75rem 1.5rem';
        toast.style.borderRadius = '8px';
        toast.style.fontWeight = 'bold';
        toast.style.boxShadow = '4px 4px 0 var(--border-color)';
        toast.style.border = '2px solid var(--border-color)';
        toast.style.fontFamily = "'Space Grotesk', sans-serif";
        toast.style.animation = 'popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
        toast.textContent = message;
        
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'slideUpFade 0.3s ease-in forwards';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    function showScreen(screenId) {
        roleSelectionContainer.classList.add('hidden');
        sendUploadContainer.classList.add('hidden');
        radarDisplayContainer.classList.add('hidden');
        
        if (screenId === 'role-select') {
            roleSelectionContainer.classList.remove('hidden');
        } else if (screenId === 'send-upload') {
            sendUploadContainer.classList.remove('hidden');
        } else if (screenId === 'radar') {
            radarDisplayContainer.classList.remove('hidden');
            if (resizeRadarCanvas) resizeRadarCanvas();
            // Publish presence immediately when entering the radar screen
            if (signalingSocket && signalingSocket.readyState === 1) {
                publishPresence('join');
            }
        }
    }

    function ensurePeerClientInitialized() {
        if (isInitialized) return;
        isInitialized = true;
        initializePeerClient();
    }

    // Role Selection Buttons
    if (chooseSendRoleBtn) {
        chooseSendRoleBtn.addEventListener('click', () => {
            currentRole = 'sender';
            showScreen('send-upload');
        });
    }
    if (chooseReceiveRoleBtn) {
        chooseReceiveRoleBtn.addEventListener('click', () => {
            currentRole = 'receiver';
            showScreen('radar');
            ensurePeerClientInitialized();
        });
    }

    // Back Buttons
    if (uploadBackBtn) {
        uploadBackBtn.addEventListener('click', () => {
            showScreen('role-select');
        });
    }
    if (radarBackBtn) {
        radarBackBtn.addEventListener('click', () => {
            showScreen('role-select');
        });
    }

    // File Selector listeners
    if (unifiedUploadBtn && sharedropFileInput) {
        unifiedUploadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sharedropFileInput.click();
        });
    }
    if (sharedropDropZone && sharedropFileInput) {
        sharedropDropZone.addEventListener('click', () => {
            sharedropFileInput.click();
        });
    }
    if (sharedropFileInput) {
        sharedropFileInput.addEventListener('change', (e) => {
            processSelectedFiles(Array.from(e.target.files));
        });
    }

    // Drag & Drop for Upload Container
    if (sharedropDropZone) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            sharedropDropZone.addEventListener(eventName, preventDefaults, false);
        });
        sharedropDropZone.addEventListener('dragenter', () => sharedropDropZone.classList.add('dragover'), false);
        sharedropDropZone.addEventListener('dragover', () => sharedropDropZone.classList.add('dragover'), false);
        sharedropDropZone.addEventListener('dragleave', () => sharedropDropZone.classList.remove('dragover'), false);
        sharedropDropZone.addEventListener('drop', (e) => {
            sharedropDropZone.classList.remove('dragover');
            handleDroppedItems(e.dataTransfer, (files) => {
                processSelectedFiles(files);
            });
        }, false);
    }

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    async function handleDroppedItems(dataTransfer, callback) {
        const files = [];
        const items = dataTransfer.items;
        if (!items) {
            if (dataTransfer.files) {
                callback(Array.from(dataTransfer.files));
            }
            return;
        }

        const entries = [];
        for (let i = 0; i < items.length; i++) {
            const item = items.item(i);
            if (item.kind === 'file') {
                const entry = item.webkitGetAsEntry();
                if (entry) entries.push(entry);
            }
        }

        async function traverse(entry) {
            if (entry.isFile) {
                const file = await new Promise((resolve) => entry.file(resolve));
                files.push(file);
            } else if (entry.isDirectory) {
                const reader = entry.createReader();
                const children = await new Promise((resolve) => {
                    reader.readEntries(resolve);
                });
                for (const child of children) {
                    await traverse(child);
                }
            }
        }

        for (const entry of entries) {
            await traverse(entry);
        }
        callback(files);
    }

    function processSelectedFiles(files) {
        selectedFiles = selectedFiles.concat(files);
        updateSelectedFilesUI();
    }

    function updateSelectedFilesUI() {
        if (!sharedropFileList) return;
        sharedropFileList.innerHTML = '';
        if (selectedFiles.length === 0) {
            selectedFilesSection.classList.add('hidden');
            return;
        }
        selectedFilesSection.classList.remove('hidden');
        sharedropFileCountPill.textContent = `${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''}`;
        
        selectedFiles.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'file-status-item';
            item.style.display = 'flex';
            item.style.justifyContent = 'space-between';
            item.style.alignItems = 'center';
            item.style.padding = '0.5rem 0.75rem';
            item.style.border = '2px solid var(--border-color)';
            item.style.borderRadius = '6px';
            item.style.marginBottom = '0.5rem';
            item.style.background = 'var(--card-bg)';
            
            const info = document.createElement('div');
            info.style.display = 'flex';
            info.style.flexDirection = 'column';
            info.style.minWidth = '0';
            info.style.flex = '1';
            
            const nameSpan = document.createElement('span');
            nameSpan.style.whiteSpace = 'nowrap';
            nameSpan.style.overflow = 'hidden';
            nameSpan.style.textOverflow = 'ellipsis';
            nameSpan.style.fontWeight = 'bold';
            nameSpan.textContent = file.name;
            
            const sizeSpan = document.createElement('span');
            sizeSpan.style.fontSize = '0.8rem';
            sizeSpan.style.color = 'var(--text-muted)';
            sizeSpan.textContent = formatFileSize(file.size);
            
            info.appendChild(nameSpan);
            info.appendChild(sizeSpan);
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'brutal-btn-small';
            removeBtn.style.background = '#ef4444';
            removeBtn.style.color = '#fff';
            removeBtn.style.border = '2px solid #991b1b';
            removeBtn.style.boxShadow = '2px 2px 0 #991b1b';
            removeBtn.style.cursor = 'pointer';
            removeBtn.style.fontSize = '0.85rem';
            removeBtn.style.fontWeight = 'bold';
            removeBtn.style.padding = '0.2rem 0.5rem';
            removeBtn.textContent = 'Remove';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                selectedFiles.splice(index, 1);
                updateSelectedFilesUI();
            });
            
            item.appendChild(info);
            item.appendChild(removeBtn);
            sharedropFileList.appendChild(item);
        });
    }

    if (sharedropRemoveAllBtn) {
        sharedropRemoveAllBtn.addEventListener('click', () => {
            selectedFiles = [];
            updateSelectedFilesUI();
        });
    }

    if (proceedToSendBtn) {
        proceedToSendBtn.addEventListener('click', () => {
            if (selectedFiles.length === 0) {
                showToast('Please select files first.', 'error');
                return;
            }
            showScreen('radar');
            ensurePeerClientInitialized();
        });
    }

    // Peers layout repositioning and UI helpers
    function repositionPeers() {
        if (!peersHub) return;
        const nodes = Array.from(peersHub.querySelectorAll('.peer-node'));
        if (nodes.length === 0) return;

        const containerWidth = peersHub.offsetWidth || 380;
        const containerHeight = peersHub.offsetHeight || 380;
        const centerX = containerWidth / 2;
        const centerY = containerHeight / 2;

        const radius = Math.min(containerWidth, containerHeight) * 0.35;
        nodes.forEach((node, index) => {
            const angle = (index / nodes.length) * 2 * Math.PI - Math.PI / 2;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            node.style.position = 'absolute';
            node.style.left = `${x}px`;
            node.style.top = `${y}px`;
            node.style.transform = 'translate(-50%, -50%)';
        });
    }

    function updateSendToAllUI() {
        if (!sendToAllContainer || !peerCountSpan) return;
        const peerCount = peersInRoom.size;
        if (currentRole === 'sender' && peerCount > 1) {
            sendToAllContainer.classList.remove('hidden');
            peerCountSpan.textContent = peerCount;
        } else {
            sendToAllContainer.classList.add('hidden');
        }
    }

    function updateMentiInstructions() {
        if (!radarInstructions || !mentiParticipantCounter || !mentiCounterVal) return;
        const peerCount = peersInRoom.size;
        mentiCounterVal.textContent = peerCount;
        
        if (peerCount > 0) {
            radarInstructions.classList.add('hidden');
            mentiParticipantCounter.classList.remove('hidden');
            mentiParticipantCounter.classList.add('pop');
            setTimeout(() => mentiParticipantCounter.classList.remove('pop'), 300);
        } else {
            radarInstructions.classList.remove('hidden');
            mentiParticipantCounter.classList.add('hidden');
        }
    }

    function createPeerNode(id, name, os, browser) {
        removePeerNode(id);

        const node = document.createElement('div');
        node.className = 'peer-node';
        node.id = `peer-${id}`;

        const isMobile = window.innerWidth <= 600;
        const progressRadius = isMobile ? 36 : 43;
        const circumference = 2 * Math.PI * progressRadius;

        const animal = getAnimalName(name);
        const emoji = animalEmojis.get(animal) || '💻';
        const floatAnim = `floatPeer${Math.floor(Math.random() * 4) + 1}`;

        node.innerHTML = `
            <div class="peer-float-wrapper" style="height: 100%;">
                <div class="peer-avatar"></div>
                <svg class="progress-ring-svg">
                    <circle class="progress-ring-circle"></circle>
                </svg>
                <div class="peer-name"></div>
                <div class="peer-meta"></div>
            </div>
        `;

        const floatWrapper = node.querySelector('.peer-float-wrapper');
        floatWrapper.style.animation = `${floatAnim} ${4 + Math.random() * 2}s ease-in-out infinite alternate`;

        const avatar = node.querySelector('.peer-avatar');
        avatar.textContent = emoji;

        const circle = node.querySelector('.progress-ring-circle');
        circle.setAttribute('cx', isMobile ? '38' : '46');
        circle.setAttribute('cy', isMobile ? '38' : '46');
        circle.setAttribute('r', progressRadius.toString());
        circle.setAttribute('stroke-dasharray', circumference.toString());
        circle.setAttribute('stroke-dashoffset', circumference.toString());

        const nameDiv = node.querySelector('.peer-name');
        nameDiv.textContent = name;

        const metaDiv = node.querySelector('.peer-meta');
        metaDiv.textContent = `${os} • ${browser}`;

        node.addEventListener('click', () => {
            console.log("Peer node clicked. ID:", id, "Name:", name, "Current Role:", currentRole);
            if (currentRole === 'sender') {
                if (selectedFiles.length > 0) {
                    console.log("Files to send:", selectedFiles.map(f => f.name));
                    queueFilesForTransfer(selectedFiles, id);
                } else {
                    showToast('Please select files first.', 'info');
                }
            } else {
                console.log("Click ignored. Switch to 'Send Files' role on home screen to send files to this device.");
                showToast("You are in receive-only mode. Return home and click 'Send Files' to share.", "info");
            }
        });

        // Drag & drop onto peer node
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            node.addEventListener(eventName, preventDefaults, false);
        });
        node.addEventListener('dragenter', () => node.classList.add('dragover'), false);
        node.addEventListener('dragover', () => node.classList.add('dragover'), false);
        node.addEventListener('dragleave', () => node.classList.remove('dragover'), false);
        node.addEventListener('drop', (e) => {
            node.classList.remove('dragover');
            handleDroppedItems(e.dataTransfer, (files) => {
                queueFilesForTransfer(files, id);
            });
        }, false);

        peersHub.appendChild(node);
        repositionPeers();
        updateSendToAllUI();
        updateMentiInstructions();
    }

    function removePeerNode(id) {
        const node = document.getElementById(`peer-${id}`);
        if (node) {
            node.remove();
        }
        repositionPeers();
        updateSendToAllUI();
        updateMentiInstructions();
    }

    if (sendToAllBtn) {
        sendToAllBtn.addEventListener('click', () => {
            if (selectedFiles.length === 0) {
                showToast('Please select files first.', 'info');
                return;
            }
            peersInRoom.forEach((_, peerId) => {
                queueFilesForTransfer(selectedFiles, peerId);
            });
        });
    }

    function setPeerProgress(peerId, progress) {
        const peerNode = document.getElementById(`peer-${peerId}`);
        if (!peerNode) return;
        const circle = peerNode.querySelector('.progress-ring-circle');
        if (!circle) return;
        
        const isMobile = window.innerWidth <= 600;
        const progressRadius = isMobile ? 36 : 43;
        const circumference = 2 * Math.PI * progressRadius;
        
        const offset = circumference - (progress / 100) * circumference;
        circle.style.strokeDashoffset = offset;
    }

    function updateFileTransferState(peerId, filename, status, progress = 0) {
        const state = activeTransferState.get(peerId);
        if (state) {
            let fileItem = null;
            if (status === 'sending') {
                // Find the first 'waiting' file of this name
                fileItem = state.files.find(f => f.name === filename && f.status === 'waiting');
                // Fallback to finding any 'sending' one just in case of progress updates
                if (!fileItem) {
                    fileItem = state.files.find(f => f.name === filename && f.status === 'sending');
                }
            } else if (status === 'completed') {
                // Find the one that is currently 'sending'
                fileItem = state.files.find(f => f.name === filename && f.status === 'sending');
            } else if (status === 'declined') {
                // Find the one that is 'sending' or 'waiting'
                fileItem = state.files.find(f => f.name === filename && (f.status === 'sending' || f.status === 'waiting'));
            }
            
            // Fallback to standard find if no match found
            if (!fileItem) {
                fileItem = state.files.find(f => f.name === filename);
            }

            if (fileItem) {
                fileItem.status = status;
                fileItem.progress = progress;
            }
            renderTransferDashboard();
        }
    }

    function renderTransferDashboard() {
        if (!transferStatusArea) return;
        transferStatusArea.innerHTML = '';
        
        activeTransferState.forEach((state, peerId) => {
            const card = document.createElement('div');
            card.className = 'receiver-status-card';
            
            const isActive = currentQueueItems.has(peerId);
            if (isActive) {
                card.classList.add('active');
            }
            
            const animal = getAnimalName(state.peerName);
            const emoji = animalEmojis.get(animal) || '💻';
            
            // Header
            const header = document.createElement('div');
            header.className = 'receiver-header';
            
            const info = document.createElement('div');
            info.className = 'receiver-info';
            
            const avatar = document.createElement('div');
            avatar.className = 'receiver-avatar-mini';
            avatar.textContent = emoji;
            
            const nameLabel = document.createElement('span');
            nameLabel.className = 'receiver-name-label';
            nameLabel.textContent = state.peerName;
            
            info.appendChild(avatar);
            info.appendChild(nameLabel);
            header.appendChild(info);
            card.appendChild(header);
            
            // Files List
            const filesList = document.createElement('div');
            filesList.className = 'receiver-files-list';
            
            state.files.forEach(f => {
                const item = document.createElement('div');
                item.className = 'file-status-item';
                
                const infoDiv = document.createElement('div');
                infoDiv.className = 'file-status-info';
                
                const nameSpan = document.createElement('span');
                nameSpan.style.whiteSpace = 'nowrap';
                nameSpan.style.overflow = 'hidden';
                nameSpan.style.textOverflow = 'ellipsis';
                nameSpan.style.maxWidth = '250px';
                nameSpan.textContent = f.name;
                
                const badge = document.createElement('span');
                badge.className = `status-badge ${f.status}`;
                badge.textContent = f.status;
                
                infoDiv.appendChild(nameSpan);
                infoDiv.appendChild(badge);
                
                const track = document.createElement('div');
                track.className = 'progress-bar-track';
                track.style.width = '100%';
                track.style.height = '6px';
                track.style.background = 'var(--bg-color)';
                track.style.border = '1px solid var(--border-color)';
                track.style.borderRadius = '3px';
                track.style.overflow = 'hidden';
                track.style.marginTop = '0.25rem';
                
                const bar = document.createElement('div');
                bar.style.height = '100%';
                bar.style.width = `${f.progress}%`;
                bar.style.background = 'var(--accent)';
                bar.style.transition = 'width 0.1s ease';
                
                track.appendChild(bar);
                
                item.appendChild(infoDiv);
                item.appendChild(track);
                
                filesList.appendChild(item);
            });
            
            card.appendChild(filesList);
            transferStatusArea.appendChild(card);
        });
    }

    function renderReceiverDashboard() {
        if (!receiverStatusArea) return;
        receiverStatusArea.innerHTML = '';
        
        if (incomingTransfer && incomingTransfer.files) {
            if (receiverSenderName) receiverSenderName.textContent = incomingTransfer.senderName;
            
            const pdfFiles = [];
            const otherFiles = [];
            
            incomingTransfer.files.forEach(f => {
                if (f.name.toLowerCase().endsWith('.pdf')) {
                    pdfFiles.push(f);
                } else {
                    otherFiles.push(f);
                }
            });
            
            const renderFileItem = (f) => {
                const item = document.createElement('div');
                item.className = 'file-status-item';
                item.style.display = 'flex';
                item.style.flexDirection = 'column';
                
                const topRow = document.createElement('div');
                topRow.style.display = 'flex';
                topRow.style.justifyContent = 'space-between';
                topRow.style.alignItems = 'center';
                topRow.style.width = '100%';
                
                const infoDiv = document.createElement('div');
                infoDiv.className = 'file-status-info';
                infoDiv.style.minWidth = '0';
                infoDiv.style.flex = '1';
                infoDiv.style.marginRight = '0.5rem';
                infoDiv.style.display = 'flex';
                infoDiv.style.justifyContent = 'space-between';
                infoDiv.style.alignItems = 'center';
                
                const nameSpan = document.createElement('span');
                nameSpan.style.whiteSpace = 'nowrap';
                nameSpan.style.overflow = 'hidden';
                nameSpan.style.textOverflow = 'ellipsis';
                nameSpan.style.maxWidth = '220px';
                nameSpan.style.fontWeight = 'bold';
                nameSpan.textContent = f.name;
                
                const badge = document.createElement('span');
                badge.className = `status-badge ${f.status}`;
                badge.textContent = f.status;
                
                infoDiv.appendChild(nameSpan);
                infoDiv.appendChild(badge);
                topRow.appendChild(infoDiv);
                
                if (f.status === 'completed') {
                    const checkIcon = document.createElement('span');
                    checkIcon.className = 'transfer-status-icon';
                    checkIcon.style.fontSize = '1.1rem';
                    checkIcon.style.color = '#10b981';
                    checkIcon.style.marginLeft = '0.5rem';
                    checkIcon.style.userSelect = 'none';
                    checkIcon.style.flexShrink = '0';
                    checkIcon.title = 'Transferred successfully';
                    checkIcon.textContent = '✅';
                    topRow.appendChild(checkIcon);
                } else if (f.status === 'declined') {
                    const crossIcon = document.createElement('span');
                    crossIcon.className = 'transfer-status-icon';
                    crossIcon.style.fontSize = '1.1rem';
                    crossIcon.style.color = '#ef4444';
                    crossIcon.style.marginLeft = '0.5rem';
                    crossIcon.style.userSelect = 'none';
                    crossIcon.style.flexShrink = '0';
                    crossIcon.title = 'Cancelled/Declined';
                    crossIcon.textContent = '❌';
                    topRow.appendChild(crossIcon);
                } else {
                    const cancelBtn = document.createElement('button');
                    cancelBtn.className = 'cancel-file-btn';
                    cancelBtn.style.background = 'none';
                    cancelBtn.style.border = 'none';
                    cancelBtn.style.fontSize = '1rem';
                    cancelBtn.style.color = '#ef4444';
                    cancelBtn.style.cursor = 'pointer';
                    cancelBtn.style.padding = '0 0.25rem';
                    cancelBtn.style.marginLeft = '0.5rem';
                    cancelBtn.style.display = 'flex';
                    cancelBtn.style.alignItems = 'center';
                    cancelBtn.style.justifyContent = 'center';
                    cancelBtn.style.transition = 'transform 0.2s';
                    cancelBtn.style.flexShrink = '0';
                    cancelBtn.title = 'Cancel this file transfer';
                    cancelBtn.textContent = '❌';
                    
                    cancelBtn.onclick = (e) => {
                        e.stopPropagation();
                        if (f.status === 'sending') {
                            if (incomingTransfer && incomingTransfer.conn) {
                                incomingTransfer.conn.send({ type: 'cancel-file', name: f.name });
                            }
                            f.status = 'declined';
                            processNextReceiverFile();
                        } else if (f.status === 'waiting') {
                            f.status = 'declined';
                            renderReceiverDashboard();
                        }
                    };
                    topRow.appendChild(cancelBtn);
                }
                
                const track = document.createElement('div');
                track.className = 'progress-bar-track';
                track.style.width = '100%';
                track.style.height = '6px';
                track.style.background = 'var(--bg-color)';
                track.style.border = '1px solid var(--border-color)';
                track.style.borderRadius = '3px';
                track.style.overflow = 'hidden';
                track.style.marginTop = '0.25rem';
                
                const bar = document.createElement('div');
                bar.style.height = '100%';
                bar.style.width = `${f.progress || 0}%`;
                bar.style.background = 'var(--accent)';
                bar.style.transition = 'width 0.1s ease';
                
                track.appendChild(bar);
                
                item.appendChild(topRow);
                item.appendChild(track);
                return item;
            };
            
            if (pdfFiles.length > 0) {
                const header = document.createElement('div');
                header.className = 'receiver-section-header';
                header.style.fontWeight = '800';
                header.style.marginTop = '0.75rem';
                header.style.marginBottom = '0.35rem';
                header.style.fontSize = '0.9rem';
                header.style.color = '#a855f7';
                header.style.borderBottom = '2px solid var(--border-color)';
                header.style.paddingBottom = '0.2rem';
                header.textContent = 'PDF Files';
                receiverStatusArea.appendChild(header);
                
                pdfFiles.forEach(f => {
                    receiverStatusArea.appendChild(renderFileItem(f));
                });
            }
            
            if (otherFiles.length > 0) {
                const header = document.createElement('div');
                header.className = 'receiver-section-header';
                header.style.fontWeight = '800';
                header.style.marginTop = '1.2rem';
                header.style.marginBottom = '0.35rem';
                header.style.fontSize = '0.9rem';
                header.style.color = 'var(--text-muted)';
                header.style.borderBottom = '2px solid var(--border-color)';
                header.style.paddingBottom = '0.2rem';
                header.textContent = 'Other Files';
                receiverStatusArea.appendChild(header);
                
                otherFiles.forEach(f => {
                    receiverStatusArea.appendChild(renderFileItem(f));
                });
            }
        }
    }

    function updateHistoryUI() {
        if (historyCount) historyCount.textContent = receivedFilesHistory.length;
        if (historyTotalCountPill) historyTotalCountPill.textContent = `${receivedFilesHistory.length} file${receivedFilesHistory.length !== 1 ? 's' : ''}`;
        
        if (receivedFilesHistory.length > 0) {
            if (historyEmptyState) historyEmptyState.classList.add('hidden');
            if (downloadAllHistoryBtn) downloadAllHistoryBtn.style.display = 'block';
        } else {
            if (historyEmptyState) historyEmptyState.classList.remove('hidden');
            if (downloadAllHistoryBtn) downloadAllHistoryBtn.style.display = 'none';
        }
        
        if (historyList) {
            // Clear all dynamic items
            const items = historyList.querySelectorAll('.history-item');
            items.forEach(el => el.remove());
            
            receivedFilesHistory.forEach((item, index) => {
                const el = document.createElement('div');
                el.className = 'history-item';
                el.style.display = 'flex';
                el.style.justifyContent = 'space-between';
                el.style.alignItems = 'center';
                el.style.padding = '0.75rem';
                el.style.border = '2px solid var(--border-color)';
                el.style.borderRadius = '6px';
                el.style.background = 'var(--card-bg)';
                el.style.marginBottom = '0.5rem';
                el.style.boxShadow = '2px 2px 0 var(--border-color)';
                
                const infoDiv = document.createElement('div');
                infoDiv.style.display = 'flex';
                infoDiv.style.flexDirection = 'column';
                infoDiv.style.minWidth = '0';
                infoDiv.style.flex = '1';
                infoDiv.style.textAlign = 'left';
                
                const nameSpan = document.createElement('span');
                nameSpan.style.whiteSpace = 'nowrap';
                nameSpan.style.overflow = 'hidden';
                nameSpan.style.textOverflow = 'ellipsis';
                nameSpan.style.fontWeight = 'bold';
                nameSpan.style.fontSize = '0.95rem';
                nameSpan.textContent = item.name;
                
                const metaSpan = document.createElement('span');
                metaSpan.style.fontSize = '0.75rem';
                metaSpan.style.color = 'var(--text-muted)';
                metaSpan.style.marginTop = '0.25rem';
                metaSpan.textContent = `${formatFileSize(item.size)} • Received at ${item.time}`;
                
                infoDiv.appendChild(nameSpan);
                infoDiv.appendChild(metaSpan);
                
                const dlBtn = document.createElement('button');
                dlBtn.className = 'brutal-btn-small download-single-history-btn';
                dlBtn.style.background = 'var(--accent)';
                dlBtn.style.color = '#000';
                dlBtn.style.fontWeight = 'bold';
                dlBtn.style.padding = '0.25rem 0.5rem';
                dlBtn.style.fontSize = '0.8rem';
                dlBtn.style.marginLeft = '0.5rem';
                dlBtn.style.cursor = 'pointer';
                dlBtn.style.boxShadow = '2px 2px 0 var(--border-color)';
                dlBtn.textContent = 'Download';
                
                dlBtn.onclick = () => {
                    const url = URL.createObjectURL(item.blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = item.name;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                };
                
                el.appendChild(infoDiv);
                el.appendChild(dlBtn);
                historyList.appendChild(el);
            });
        }
    }

    function processNextReceiverFile() {
        if (!incomingTransfer || !incomingTransfer.files) return;
        
        const nextFile = incomingTransfer.files.find(f => f.status === 'waiting');
        if (nextFile) {
            nextFile.status = 'sending';
            nextFile.chunks = [];
            renderReceiverDashboard();
            
            incomingTransfer.conn.send({
                type: 'request-file',
                name: nextFile.name
            });
        } else {
            // Check if there are any files cached for the PDF editor
            const transferList = incomingTransfer.files.filter(f => f.transferToEditor && f.downloadedBlob);
            if (transferList.length > 0) {
                let promiseChain = Promise.resolve();
                transferList.forEach(f => {
                    promiseChain = promiseChain.then(() => storeTransferredPDF(f.name, f.downloadedBlob));
                });
                
                promiseChain.then(() => {
                    showToast('PDF(s) saved. Redirecting to PDF editor...', 'success');
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1000);
                }).catch(err => {
                    console.error("Failed to store PDFs in IndexedDB:", err);
                    showToast("Failed to transfer files to PDF editor.", "error");
                    completeTransferState();
                });
            } else {
                completeTransferState();
            }
        }
    }

    if (receiverAcceptAllBtn) {
        receiverAcceptAllBtn.addEventListener('click', () => {
            if (incomingTransfer && incomingTransfer.conn) {
                if (incomingTransfer.files) {
                    // Check for high risk files in the batch
                    const highRiskFiles = incomingTransfer.files.filter(f => isHighRiskFile(f.name));
                    if (highRiskFiles.length > 0) {
                        const fileNamesStr = highRiskFiles.map(f => `"${f.name}"`).join(', ');
                        const proceed = confirm(`⚠️ SECURITY WARNING: The transfer contains high-risk executable or script files: ${fileNamesStr}.\n\nAre you sure you want to download them?`);
                        if (!proceed) return;
                    }

                    incomingTransfer.files.forEach(f => {
                        if (f.name.toLowerCase().endsWith('.pdf')) {
                            const yes = confirm(`Should the PDF file "${f.name}" be transferred to the PDF editor?`);
                            f.transferToEditor = yes;
                        }
                    });
                }
                incomingTransfer.conn.send({ type: 'batch-accept' });
                processNextReceiverFile();
            }
        });
    }
    if (receiverDeclineAllBtn) {
        receiverDeclineAllBtn.addEventListener('click', () => {
            if (incomingTransfer && incomingTransfer.conn) {
                incomingTransfer.conn.send({ type: 'batch-decline' });
            }
            resetTransferState();
        });
    }
    if (receiverTransferCloseBtn) {
        receiverTransferCloseBtn.addEventListener('click', () => {
            resetTransferState();
        });
    }

    // Queue sharing client routines
    function queueFilesForTransfer(files, peerId) {
        console.log("queueFilesForTransfer called for Peer:", peerId, "Connection cache:", activeConnections.has(peerId));
        const existingConn = activeConnections.get(peerId);
        if (!existingConn || !existingConn.open) {
            console.log("No open connection found. Connecting to PeerJS ID:", peerId);
            activeConnections.delete(peerId); // Clean up closed connection
            const conn = peer.connect(peerId, { label: 'file-transfer' });
            setupConnectionListeners(conn);
            conn.on('open', () => {
                console.log("PeerJS connection opened with:", peerId);
                activeConnections.set(peerId, conn);
                conn.send({
                    type: 'peer-metadata',
                    name: myNickname,
                    os: myDeviceInfo.os,
                    browser: myDeviceInfo.browser
                });
                conn.sentMetadata = true;
                enqueueFiles(files, peerId);
            });
        } else {
            console.log("Using existing open connection for:", peerId);
            enqueueFiles(files, peerId);
        }
    }

    function enqueueFiles(files, peerId) {
        const fileList = Array.from(files);
        
        // If all transfers are finished, clear the old completed files list and reset metadata send status for this peer
        const isFinished = areAllTransfersFinished();
        if (isFinished || !activeTransferState.has(peerId)) {
            const conn = activeConnections.get(peerId);
            if (conn) {
                conn.sentMetadataForQueue = false;
            }
            const peerInfo = peersInRoom.get(peerId) || { name: 'Device' };
            activeTransferState.set(peerId, {
                peerName: peerInfo.name,
                files: []
            });
        }
        const state = activeTransferState.get(peerId);
        
        if (!transferQueues.has(peerId)) {
            transferQueues.set(peerId, []);
        }
        const peerQueue = transferQueues.get(peerId);
        
        fileList.forEach(file => {
            peerQueue.push(file);
            state.files.push({
                name: file.name,
                size: file.size,
                mime: file.type || 'application/octet-stream',
                status: 'waiting',
                progress: 0
            });
        });
        
        openTransferModal('sending', null, null, peerId);
        startSequentialTransfer();
    }

    function startSequentialTransfer() {
        if (currentQueueItems.size > 0) {
            return; // Some peer is already transferring
        }
        
        for (const [peerId, queue] of transferQueues.entries()) {
            if (queue.length > 0) {
                processNextQueueItem(peerId);
                break;
            }
        }
    }

    function cancelPeerTransfer(peerId) {
        transferQueues.delete(peerId);
        currentQueueItems.delete(peerId);
        const conn = activeConnections.get(peerId);
        if (conn) {
            conn.sentMetadataForQueue = false;
        }
    }

    function processNextQueueItem(peerId) {
        if (!transferQueues.has(peerId)) return;
        const peerQueue = transferQueues.get(peerId);
        if (currentQueueItems.has(peerId) || peerQueue.length === 0) return;
        
        const activeFile = peerQueue.shift();
        currentQueueItems.set(peerId, activeFile);
        
        const conn = activeConnections.get(peerId);
        if (!conn) {
            showToast('Connection lost to target device.', 'error');
            updateFileTransferState(peerId, activeFile.name, 'declined');
            
            // Mark remaining files in this peer's queue as declined too
            const peerState = activeTransferState.get(peerId);
            if (peerState) {
                peerState.files.forEach(f => {
                    if (f.status === 'waiting' || f.status === 'sending') {
                        f.status = 'declined';
                    }
                });
            }
            cancelPeerTransfer(peerId);
            scheduleQueueAdvance(peerId, activeFile, 1000);
            return;
        }

        // Send metadata if we haven't sent it yet for this session!
        if (!conn.sentMetadataForQueue) {
            conn.sentMetadataForQueue = true;
            const peerState = activeTransferState.get(peerId);
            if (peerState) {
                const batchFiles = peerState.files.filter(f => f.status === 'waiting' || f.name === activeFile.name);
                if (batchFiles.length > 1) {
                    conn.send({
                        type: 'batch-metadata',
                        files: batchFiles.map(f => ({
                            name: f.name,
                            size: f.size,
                            mime: f.mime || 'application/octet-stream'
                        }))
                    });
                } else if (batchFiles.length === 1) {
                    conn.send({
                        type: 'file-metadata',
                        name: batchFiles[0].name,
                        size: batchFiles[0].size,
                        mime: batchFiles[0].mime || 'application/octet-stream'
                    });
                }
            }
        }
        
        updateFileTransferState(peerId, activeFile.name, 'sending', 0);
    }

    function scheduleQueueAdvance(peerId, file, delay = 100) {
        setTimeout(() => {
            const activeFile = currentQueueItems.get(peerId);
            if (activeFile && activeFile.name === file.name) {
                currentQueueItems.delete(peerId);
                processNextQueueItem(peerId);
                
                // If the peer is now completely finished with all files (its queue is empty and active file deleted)
                if (!currentQueueItems.has(peerId) && (!transferQueues.has(peerId) || transferQueues.get(peerId).length === 0)) {
                    const conn = activeConnections.get(peerId);
                    if (conn) {
                        conn.sentMetadataForQueue = false;
                    }
                    startSequentialTransfer();
                }
            }
            
            if (areAllTransfersFinished()) {
                completeTransferState();
            }
        }, delay);
    }

    function areAllTransfersFinished() {
        for (const queue of transferQueues.values()) {
            if (queue.length > 0) return false;
        }
        if (currentQueueItems.size > 0) return false;
        return true;
    }

    function sendFileChunks(file, conn) {
        const reader = new FileReader();
        const state = {
            file: file,
            reader: reader,
            conn: conn,
            offset: 0,
            chunkIndex: 0,
            retries: 0,
            ackTimeout: null,
            isSending: true
        };
        fileTransferStates.set(conn.peer, state);
    
        reader.onload = (e) => {
            if (!state.isSending) return;
    
            const chunk = e.target.result;
            conn.send({
                type: 'file-chunk',
                chunk: chunk,
                chunkIndex: state.chunkIndex
            });
    
            state.ackTimeout = setTimeout(() => {
                console.warn(`ACK timeout for chunk ${state.chunkIndex}. Retrying...`);
                state.retries++;
                if (state.retries > 5) {
                    showToast(`Transfer failed for ${file.name}. Too many retries.`, 'error');
                    updateFileTransferState(conn.peer, file.name, 'declined');
                    resetProgressCircles();
                    fileTransferStates.delete(conn.peer);
                    scheduleQueueAdvance(conn.peer, file, 1000);
                } else {
                    reader.onload(e); // Resend
                }
            }, 5000);
        };
    
        const readNextChunk = () => {
            const slice = file.slice(state.offset, state.offset + CHUNK_SIZE);
            reader.readAsArrayBuffer(slice);
        }
        
        readNextChunk();
    }

    function setupConnectionListeners(conn) {
        conn.on('data', (data) => {
            if (data.type === 'peer-metadata') {
                const peerDetails = {
                    id: conn.peer,
                    name: data.name,
                    os: data.os,
                    browser: data.browser
                };
                peersInRoom.set(conn.peer, peerDetails);
                createPeerNode(conn.peer, data.name, data.os, data.browser);
            }
            else if (data.type === 'file-metadata') {
                incomingTransfer = {
                    conn: conn,
                    name: data.name,
                    size: data.size,
                    mime: data.mime,
                    chunks: []
                };
                openTransferModal('receiving', data.name, data.size, conn.peer);
            }
            else if (data.type === 'batch-metadata') {
                incomingTransfer = {
                    conn: conn,
                    senderName: peersInRoom.get(conn.peer)?.name || 'Device',
                    files: data.files.map(f => ({
                        name: f.name,
                        size: f.size,
                        mime: f.mime,
                        status: 'waiting',
                        progress: 0,
                        chunks: []
                    }))
                };
                openTransferModal('batch-receiving', null, null, conn.peer);
            }
            else if (data.type === 'accept') {
                const activeFile = currentQueueItems.get(conn.peer);
                if (activeFile) {
                    sendFileChunks(activeFile, conn);
                }
            }
            else if (data.type === 'batch-accept') {
                console.log("Batch transfer accepted by peer:", conn.peer);
            }
            else if (data.type === 'decline' || data.type === 'batch-decline') {
                const peerName = peersInRoom.get(conn.peer)?.name || 'Device';
                showToast(`Transfer declined by peer: ${peerName}`, 'error');
                const peerState = activeTransferState.get(conn.peer);
                if (peerState) {
                    peerState.files.forEach(f => {
                        if (f.status === 'waiting' || f.status === 'sending') {
                            f.status = 'declined';
                        }
                    });
                    renderTransferDashboard();
                }
                resetProgressCircles();
                
                cancelPeerTransfer(conn.peer);
                startSequentialTransfer();
                
                if (areAllTransfersFinished()) {
                    completeTransferState();
                }
            }
            else if (data.type === 'cancel-file') {
                const activeFile = currentQueueItems.get(conn.peer);
                if (activeFile && activeFile.name === data.name) {
                    activeFile.isCanceled = true;
                } else {
                    const peerQueue = transferQueues.get(conn.peer) || [];
                    const itemIndex = peerQueue.findIndex(file => file.name === data.name);
                    if (itemIndex !== -1) {
                        peerQueue.splice(itemIndex, 1);
                    }
                }
                updateFileTransferState(conn.peer, data.name, 'declined');
            }
            else if (data.type === 'request-file') {
                const activeFile = currentQueueItems.get(conn.peer);
                if (activeFile && activeFile.name === data.name) {
                    sendFileChunks(activeFile, conn);
                } else {
                    const peerQueue = transferQueues.get(conn.peer) || [];
                    const itemIndex = peerQueue.findIndex(file => file.name === data.name);
                    if (itemIndex !== -1) {
                        const file = peerQueue.splice(itemIndex, 1)[0];
                        currentQueueItems.set(conn.peer, file);
                        sendFileChunks(file, conn);
                    }
                }
            }
            else if (data.type === 'ack') {
                const state = fileTransferStates.get(conn.peer);
                if (state && data.chunkIndex === state.chunkIndex) {
                    clearTimeout(state.ackTimeout);
                    state.retries = 0;
            
                    const chunkSize = (state.file.slice(state.offset, state.offset + CHUNK_SIZE)).size;
                    state.offset += chunkSize;
                    state.chunkIndex++;
            
                    const progress = (state.offset / state.file.size) * 100;
                    updateFileTransferState(conn.peer, state.file.name, 'sending', progress);
                    setPeerProgress(conn.peer, progress);
            
                    if (state.offset < state.file.size) {
                        const slice = state.file.slice(state.offset, state.offset + CHUNK_SIZE);
                        state.reader.readAsArrayBuffer(slice);
                    } else {
                        conn.send({ type: 'end' });
                        updateFileTransferState(conn.peer, state.file.name, 'completed', 100);
                        setPeerProgress(conn.peer, 100);
                        
                        setTimeout(() => {
                            resetProgressCircles();
                        }, 1000);
            
                        fileTransferStates.delete(conn.peer);
                        scheduleQueueAdvance(conn.peer, state.file, 500);
                    }
                }
            }
            else if (data.type === 'file-chunk') {
                if (incomingTransfer) {
                    if (incomingTransfer.files) {
                        const activeFile = incomingTransfer.files.find(f => f.status === 'sending');
                        if (activeFile) {
                            if (data.chunkIndex === (activeFile.chunks.length)) {
                                activeFile.chunks.push(data.chunk);
                                activeFile.receivedBytes = (activeFile.receivedBytes || 0) + data.chunk.byteLength;
                                const progress = (activeFile.receivedBytes / activeFile.size) * 100;
                                activeFile.progress = progress;
                                renderReceiverDashboard();
                                setPeerProgress(conn.peer, progress);
        
                                conn.send({ type: 'ack', chunkIndex: data.chunkIndex });
                            } else {
                                console.warn(`Received chunk ${data.chunkIndex}, expected ${activeFile.chunks.length}. Ignoring.`);
                            }
                        }
                    } else {
                        if (data.chunkIndex === (incomingTransfer.chunks.length)) {
                            incomingTransfer.chunks.push(data.chunk);
                            incomingTransfer.receivedBytes = (incomingTransfer.receivedBytes || 0) + data.chunk.byteLength;
                            const progress = (incomingTransfer.receivedBytes / incomingTransfer.size) * 100;
                            updateTransferProgress(progress);
                            setPeerProgress(conn.peer, progress);
    
                            conn.send({ type: 'ack', chunkIndex: data.chunkIndex });
                        } else {
                            console.warn(`Received chunk ${data.chunkIndex}, expected ${incomingTransfer.chunks.length}. Ignoring.`);
                        }
                    }
                }
            }
            else if (data.type === 'end') {
                if (incomingTransfer) {
                    if (incomingTransfer.files) {
                        const activeFile = incomingTransfer.files.find(f => f.status === 'sending');
                        if (activeFile) {
                            const blob = new Blob(activeFile.chunks, { type: activeFile.mime });
                            
                            // Log to received files history
                            receivedFilesHistory.push({
                                name: activeFile.name,
                                size: activeFile.size,
                                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                                blob: blob
                            });
                            updateHistoryUI();

                            if (activeFile.transferToEditor) {
                                activeFile.downloadedBlob = blob;
                                showToast(`File "${activeFile.name}" cached for PDF editor.`, 'info');
                            } else {
                                const blobUrl = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = blobUrl;
                                a.download = activeFile.name;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
                                showToast(`File "${activeFile.name}" downloaded!`, 'info');
                            }
                            
                            activeFile.status = 'completed';
                            activeFile.progress = 100;
                            setPeerProgress(conn.peer, 100);
                            
                            renderReceiverDashboard();
                            processNextReceiverFile();
                        }
                    } else if (incomingTransfer.chunks) {
                        const blob = new Blob(incomingTransfer.chunks, { type: incomingTransfer.mime });
                        
                        // Log to received files history
                        receivedFilesHistory.push({
                            name: incomingTransfer.name,
                            size: incomingTransfer.size,
                            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                            blob: blob
                        });
                        updateHistoryUI();

                        if (incomingTransfer.transferToEditor) {
                            storeTransferredPDF(incomingTransfer.name, blob).then(() => {
                                showToast(`PDF stored. Redirecting to PDF editor...`, 'success');
                                setTimeout(() => {
                                    window.location.href = 'index.html';
                                }, 1000);
                            }).catch(err => {
                                console.error("Failed to store PDF:", err);
                                showToast("Failed to store PDF.", "error");
                                completeTransferState();
                            });
                        } else {
                            const blobUrl = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = blobUrl;
                            a.download = incomingTransfer.name;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
                            showToast(`File "${incomingTransfer.name}" downloaded!`, 'info');
                            completeTransferState();
                        }
                    }
                }
            }
        });

        conn.on('close', () => {
            if (conn.connTimeout) {
                clearTimeout(conn.connTimeout);
                conn.connTimeout = null;
            }
            activeConnections.delete(conn.peer);
            
            // Remove connection from active connections but preserve peer presence state (let WebSocket ping handle eviction)
            
            if (conn.isTimedOut) return;
            
            const hadActive = currentQueueItems.has(conn.peer);
            const hadQueued = transferQueues.has(conn.peer);
            if (hadActive || hadQueued) {
                cancelPeerTransfer(conn.peer);
                resetProgressCircles();
                
                const peerState = activeTransferState.get(conn.peer);
                if (peerState) {
                    peerState.files.forEach(f => {
                        if (f.status === 'waiting' || f.status === 'sending') {
                            f.status = 'declined';
                        }
                    });
                    renderTransferDashboard();
                }
                
                if (hadActive) {
                    startSequentialTransfer();
                }
                
                if (areAllTransfersFinished()) {
                    completeTransferState();
                }
            } else if (incomingTransfer && incomingTransfer.conn && incomingTransfer.conn.peer === conn.peer) {
                showToast('Connection lost during incoming transfer.', 'error');
                resetTransferState();
            }
        });

        conn.on('error', (err) => {
            if (conn.connTimeout) {
                clearTimeout(conn.connTimeout);
                conn.connTimeout = null;
            }
            console.error("Connection error:", err);
            activeConnections.delete(conn.peer);
            
            // Remove connection from active connections but preserve peer presence state (let WebSocket ping handle eviction)
            
            if (conn.isTimedOut) return;
            
            const hadActive = currentQueueItems.has(conn.peer);
            const hadQueued = transferQueues.has(conn.peer);
            if (hadActive || hadQueued) {
                cancelPeerTransfer(conn.peer);
                resetProgressCircles();
                
                const peerState = activeTransferState.get(conn.peer);
                if (peerState) {
                    peerState.files.forEach(f => {
                        if (f.status === 'waiting' || f.status === 'sending') {
                            f.status = 'declined';
                        }
                    });
                    renderTransferDashboard();
                }
                
                if (hadActive) {
                    startSequentialTransfer();
                }
                
                if (areAllTransfersFinished()) {
                    completeTransferState();
                }
            } else if (incomingTransfer && incomingTransfer.conn && incomingTransfer.conn.peer === conn.peer) {
                showToast('Connection error during incoming transfer.', 'error');
                resetTransferState();
            }
        });
    }

    // ==========================================
    // TRANSFER MODAL UI ROUTINES
    // ==========================================
    function openTransferModal(state, filename, size, peerId) {
        const dialog = document.getElementById('transferDialog');
        if (dialog) dialog.classList.remove('hidden');

        // Update verification code display
        if (verificationCodeContainer && verificationCodeValue) {
            if (peerId) {
                const code = getVerificationCode(myPeerId, peerId);
                verificationCodeValue.textContent = code;
                verificationCodeContainer.classList.remove('hidden');
            } else {
                verificationCodeContainer.classList.add('hidden');
            }
        }

        const multiCancelBtn = document.getElementById('multiTransferCancelBtn');
        const multiCloseBtn = document.getElementById('multiTransferCloseBtn');
        if (multiCancelBtn) {
            multiCancelBtn.onclick = () => {
                activeConnections.forEach(conn => {
                    conn.send({ type: 'decline' });
                });
                resetTransferState();
            };
        }
        if (multiCloseBtn) {
            multiCloseBtn.onclick = () => {
                resetTransferState();
            };
        }

        if (state === 'sending') {
            const singleContainer = document.getElementById('singleTransferContainer');
            const multiContainer = document.getElementById('multiTransferContainer');
            const receiverContainer = document.getElementById('receiverTransferContainer');
            const dialog = document.getElementById('transferDialog');
            
            if (singleContainer) singleContainer.classList.add('hidden');
            if (multiContainer) multiContainer.classList.remove('hidden');
            if (receiverContainer) receiverContainer.classList.add('hidden');
            if (dialog) dialog.classList.add('wide');
            
            if (multiCancelBtn) multiCancelBtn.classList.remove('hidden');
            if (multiCloseBtn) multiCloseBtn.classList.add('hidden');
            
            renderTransferDashboard();
            
            currentQueueItems.forEach((activeFile, peerId) => {
                updateFileTransferState(peerId, activeFile.name, 'sending', 0);
            });
        } 
        else if (state === 'receiving') {
            const singleContainer = document.getElementById('singleTransferContainer');
            const multiContainer = document.getElementById('multiTransferContainer');
            const receiverContainer = document.getElementById('receiverTransferContainer');
            const dialog = document.getElementById('transferDialog');
            
            if (singleContainer) singleContainer.classList.remove('hidden');
            if (multiContainer) multiContainer.classList.add('hidden');
            if (receiverContainer) receiverContainer.classList.add('hidden');
            if (dialog) dialog.classList.remove('wide');

            transferFilename.textContent = filename;
            transferFilesize.textContent = formatFileSize(size);
            
            transferProgressContainer.classList.add('hidden');
            transferProgressBar.style.width = '0%';
            transferProgressPercent.textContent = '0%';
            
            transferActions.classList.remove('hidden');
            transferFinishedActions.classList.add('hidden');

            transferTitle.textContent = "Incoming File";
            transferIcon.textContent = "📥";
            transferAcceptBtn.classList.remove('hidden');
            transferDeclineBtn.textContent = "Decline";
            
            transferAcceptBtn.onclick = () => {
                if (incomingTransfer.conn) {
                    // Check for high-risk files
                    if (isHighRiskFile(incomingTransfer.name)) {
                        const proceed = confirm(`⚠️ SECURITY WARNING: The file "${incomingTransfer.name}" is an executable or script. Running this file could harm your device.\n\nAre you sure you want to download it?`);
                        if (!proceed) return;
                    }

                    if (incomingTransfer.name.toLowerCase().endsWith('.pdf')) {
                        const yes = confirm(`Should the PDF file "${incomingTransfer.name}" be transferred to the PDF editor?`);
                        incomingTransfer.transferToEditor = yes;
                    }
                    incomingTransfer.conn.send({ type: 'accept' });
                    updateTransferModalState('transferring');
                }
            };
            
            transferDeclineBtn.onclick = () => {
                if (incomingTransfer.conn) {
                    incomingTransfer.conn.send({ type: 'decline' });
                }
                resetTransferState();
            };
        }
        else if (state === 'batch-receiving') {
            const singleContainer = document.getElementById('singleTransferContainer');
            const multiContainer = document.getElementById('multiTransferContainer');
            const receiverContainer = document.getElementById('receiverTransferContainer');
            const dialog = document.getElementById('transferDialog');
            
            if (singleContainer) singleContainer.classList.add('hidden');
            if (multiContainer) multiContainer.classList.add('hidden');
            if (receiverContainer) receiverContainer.classList.remove('hidden');
            if (dialog) dialog.classList.add('wide');
            
            if (receiverAcceptAllBtn) receiverAcceptAllBtn.classList.remove('hidden');
            if (receiverDeclineAllBtn) receiverDeclineAllBtn.classList.remove('hidden');
            if (receiverTransferCloseBtn) receiverTransferCloseBtn.classList.add('hidden');
            
            renderReceiverDashboard();
        }

        transferModal.classList.remove('hidden');
        onModalOpen();
    }

    function updateTransferModalState(state) {
        const multiContainer = document.getElementById('multiTransferContainer');
        const receiverContainer = document.getElementById('receiverTransferContainer');
        if ((multiContainer && !multiContainer.classList.contains('hidden')) || 
            (receiverContainer && !receiverContainer.classList.contains('hidden'))) {
            return;
        }

        if (state === 'transferring') {
            transferTitle.textContent = "Transferring...";
            transferIcon.textContent = "⚡";
            transferProgressContainer.classList.remove('hidden');
            transferActions.classList.add('hidden');
        }
    }

    function updateTransferProgress(progress) {
        const multiContainer = document.getElementById('multiTransferContainer');
        const receiverContainer = document.getElementById('receiverTransferContainer');
        if ((multiContainer && !multiContainer.classList.contains('hidden')) || 
            (receiverContainer && !receiverContainer.classList.contains('hidden'))) {
            return;
        }

        transferProgressContainer.classList.remove('hidden');
        transferProgressBar.style.width = `${progress}%`;
        transferProgressPercent.textContent = `${Math.round(progress)}%`;
    }

    function completeTransferState() {
        const multiContainer = document.getElementById('multiTransferContainer');
        if (multiContainer && !multiContainer.classList.contains('hidden')) {
            const cancelBtn = document.getElementById('multiTransferCancelBtn');
            const closeBtn = document.getElementById('multiTransferCloseBtn');
            if (cancelBtn) cancelBtn.classList.add('hidden');
            if (closeBtn) closeBtn.classList.remove('hidden');
            showToast("All queued file transfers have finished!", "info");
        } else {
            transferTitle.textContent = "Finished!";
            transferIcon.textContent = "✅";
            transferProgressContainer.classList.add('hidden');
            transferActions.classList.add('hidden');
            transferFinishedActions.classList.remove('hidden');

            transferCloseBtn.onclick = () => {
                resetTransferState();
            };
        }
    }

    // Drag and drop handler over global radar card for general file transfers
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        radarDropArea.addEventListener(eventName, preventDefaults, false);
    });

    radarDropArea.addEventListener('dragenter', () => radarDropArea.classList.add('dragover'), false);
    radarDropArea.addEventListener('dragover', () => radarDropArea.classList.add('dragover'), false);
    radarDropArea.addEventListener('dragleave', () => radarDropArea.classList.remove('dragover'), false);
    radarDropArea.addEventListener('drop', (e) => {
        radarDropArea.classList.remove('dragover');
        const peerNodes = document.querySelectorAll('.peer-node');
        
        if (currentRole === 'sender') {
            handleDroppedItems(e.dataTransfer, (files) => {
                if (peerNodes.length === 1) {
                    const singlePeerId = peerNodes[0].id.replace('peer-', '');
                    processSelectedFiles(files);
                    queueFilesForTransfer(selectedFiles, singlePeerId);
                } else if (peerNodes.length > 1) {
                    showToast('Drag and drop folders/files directly onto the participant bubbles.', 'info');
                } else {
                    showToast('No active devices in this room to drop files onto.', 'error');
                }
            });
        }
    }, false);

    function resetTransferState() {
        const dialog = document.getElementById('transferDialog');
        if (dialog) dialog.classList.add('hidden');

        if (chatDialog.classList.contains('hidden')) {
            transferModal.classList.add('hidden');
            onModalClose();
        }

        resetProgressCircles();
        currentSendingFile = null;
        
        // Reset metadata flag on all connections
        activeConnections.forEach(conn => {
            conn.sentMetadataForQueue = false;
        });
        
        transferQueues.clear();
        currentQueueItems.clear();
        incomingTransfer = null;
        
        const singleContainer = document.getElementById('singleTransferContainer');
        const multiContainer = document.getElementById('multiTransferContainer');
        const receiverContainer = document.getElementById('receiverTransferContainer');
        
        if (singleContainer) singleContainer.classList.remove('hidden');
        if (multiContainer) multiContainer.classList.add('hidden');
        if (receiverContainer) receiverContainer.classList.add('hidden');
        if (dialog) dialog.classList.remove('wide');
    }

    function resetProgressCircles() {
        const circles = document.querySelectorAll('.progress-ring-circle');
        circles.forEach(c => {
            const isMobile = window.innerWidth <= 600;
            const progressRadius = isMobile ? 36 : 43;
            const circumference = 2 * Math.PI * progressRadius;
            c.style.strokeDashoffset = circumference;
        });
    }

    // ==========================================
    // LOBBY SIGNALING MATCHMAKER (WEBSOCKETS)
    // ==========================================


    let signalingSocket = null;
    let presenceHeartbeatIntervalId = null;

    function initWebSocketSignaling() {
        if (signalingSocket) {
            try {
                signalingSocket.close();
            } catch (e) {}
        }

        if (presenceHeartbeatIntervalId) {
            clearInterval(presenceHeartbeatIntervalId);
            presenceHeartbeatIntervalId = null;
        }

        const protocol = USE_LOCAL_SERVER ? 'ws://' : 'wss://';
        signalingSocket = new WebSocket(`${protocol}${SIGNALING_HOST}/ws`);

        signalingSocket.onopen = () => {
            console.log(`Connected to signaling server for room: ${myRoom}`);
            
            // Send join broadcast ONLY if we are on the radar screen
            if (!radarDisplayContainer.classList.contains('hidden')) {
                publishPresence('join');
            }
            
            // Periodically publish heartbeat ping to keep other devices updated ONLY if radar screen is active
            // Increased to 15 seconds to be much gentler on the free-tier server
            presenceHeartbeatIntervalId = setInterval(() => {
                if (!radarDisplayContainer.classList.contains('hidden')) {
                    publishPresence('ping');
                }
            }, 15000); // This is for presence, chat has its own heartbeat now.
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
                        if (roomCodeInput) roomCodeInput.value = myRoomDisplay;
                    }
                    return;
                }

                if (payload.room !== myRoom) return;

                // The unified chat module handles chat messages. This only handles presence.
                if (!payload.id || payload.id === myPeerId) return;

                if (payload.action === 'join') {
                    // Peer joined! Register them, add their node, and send presence back to them
                    registerPeer(payload);
                    // Respond with our presence ONLY if we are actively on the radar screen
                    if (!radarDisplayContainer.classList.contains('hidden')) {
                        publishPresence('presence');
                    }
                } 
                else if (payload.action === 'presence' || payload.action === 'ping') {
                    // Peer is present or pinging. Register/refresh them.
                    registerPeer(payload);
                } 
                else if (payload.action === 'leave') {
                    // Peer left. Evict them.
                    evictPeer(payload.id);
                }
            } catch (e) {
                console.warn("Failed to parse signaling payload:", e);
            }
        };

        signalingSocket.onclose = () => {
            console.log("WebSocket signaling disconnected. Reconnecting in 3 seconds...");
            setTimeout(initWebSocketSignaling, 3000);
        };

        signalingSocket.onerror = (err) => {
            console.warn("WebSocket signaling error:", err);
        };
    }

    function publishPresence(type) {
        if (!signalingSocket || signalingSocket.readyState !== 1) return;
        const presencePayload = {
            action: type,
            room: myRoom,
            id: myPeerId,
            name: myNickname,
            os: myDeviceInfo.os,
            browser: myDeviceInfo.browser
        };
        signalingSocket.send(JSON.stringify(presencePayload));
    }

    function registerPeer(peerDetails) {
        peerMissingCounts.set(peerDetails.id, 0);

        // Name Collision Handling: If another peer has the same name and their ID is lexicographically smaller than ours
        if (peerDetails.name === myNickname && peerDetails.id !== myPeerId && myPeerId > peerDetails.id) {
            let baseName = myNickname;
            let suffix = 2;
            const match = myNickname.match(/^(.*?)\s+(\d+)$/);
            if (match) {
                baseName = match[1];
                suffix = parseInt(match[2]);
            }
            
            // Gather all currently taken names in the room (excluding our old one)
            const takenNames = new Set();
            peersInRoom.forEach((p, id) => {
                if (id !== myPeerId) {
                    takenNames.add(p.name);
                }
            });
            takenNames.add(peerDetails.name); // Colliding peer's name is taken

            let newName = `${baseName} ${suffix}`;
            while (takenNames.has(newName)) {
                suffix++;
                newName = `${baseName} ${suffix}`;
            }

            myNickname = newName;
            sessionStorage.setItem('lablazy_nickname', myNickname);
            if (selfNameText) selfNameText.textContent = myNickname;
            
            // Re-publish our presence with the new resolved name
            publishPresence('presence');
        }

        if (!peersInRoom.has(peerDetails.id)) {
            peersInRoom.set(peerDetails.id, peerDetails);
            createPeerNode(peerDetails.id, peerDetails.name, peerDetails.os, peerDetails.browser);
            repositionPeers();
            updateSendToAllUI();
        } else {
            // Update node info if the peer details or resolved name changed
            const existingPeer = peersInRoom.get(peerDetails.id);
            if (existingPeer.name !== peerDetails.name) {
                existingPeer.name = peerDetails.name;
                const peerNode = document.getElementById(`peer-${peerDetails.id}`);
                if (peerNode) {
                    const nameDiv = peerNode.querySelector('.peer-name');
                    if (nameDiv) nameDiv.textContent = peerDetails.name;
                    const avatarDiv = peerNode.querySelector('.peer-avatar');
                    if (avatarDiv) {
                        const animal = getAnimalName(peerDetails.name);
                        const emoji = animalEmojis.get(animal) || '💻';
                        avatarDiv.textContent = emoji;
                    }
                }
                updateSendToAllUI();
            }
        }

        // Establish PeerJS connection if our Peer ID is smaller (lexicographically) to avoid duplicate pathways
        if (myPeerId < peerDetails.id && !activeConnections.has(peerDetails.id) && peer) {
            try {
                const conn = peer.connect(peerDetails.id, { label: 'file-transfer' });
                setupConnectionListeners(conn);
                
                const sendMetadata = () => {
                    activeConnections.set(peerDetails.id, conn);
                    conn.send({
                        type: 'peer-metadata',
                        name: myNickname,
                        os: myDeviceInfo.os,
                        browser: myDeviceInfo.browser
                    });
                    conn.sentMetadata = true;
                };

                if (conn.open) {
                    sendMetadata();
                } else {
                    conn.on('open', sendMetadata);
                }
            } catch (e) {
                console.error("Failed to connect to peer via PeerJS:", e);
            }
        }
    }

    function evictPeer(peerId) {
        if (peersInRoom.has(peerId)) {
            peersInRoom.delete(peerId);
            activeConnections.delete(peerId);
            peerMissingCounts.delete(peerId);
            removePeerNode(peerId);
            repositionPeers();
            updateSendToAllUI();
        }
    }

    // Periodically run presence check to evict dead peers who stopped pinging
    setInterval(() => {
        peersInRoom.forEach((peerDetails, id) => {
            const missing = (peerMissingCounts.get(id) || 0) + 1;
            peerMissingCounts.set(id, missing);
            
            // If peer misses 5 consecutive pings (25 seconds), evict them
            if (missing >= 5) {
                evictPeer(id);
            }
        });
    }, 5000);

    // ==========================================
    // INITIALIZATION
    // ==========================================
    function isWebRTCSupported() {
        return typeof window !== 'undefined' && (
            !!window.RTCPeerConnection || 
            !!window.webkitRTCPeerConnection || 
            !!window.mozRTCPeerConnection
        );
    }

    async function initializePeerClient() {
        myDeviceInfo = getDeviceDetails();
        
        let cachedNickname = sessionStorage.getItem('lablazy_nickname');
        if (!cachedNickname) {
            cachedNickname = getRandomName();
            sessionStorage.setItem('lablazy_nickname', cachedNickname);
        }
        myNickname = cachedNickname;
        selfNameText.textContent = myNickname;
        selfMetaText.textContent = `${myDeviceInfo.os} • ${myDeviceInfo.browser}`;
        
        // Lookup the user's own animal emoji
        const selfAnimal = getAnimalName(myNickname);
        selfIcon.textContent = animalEmojis.get(selfAnimal) || '💻';

        if (!isWebRTCSupported()) {
            const isLocalIP = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
            const msg = isLocalIP 
                ? "P2P Sharing is blocked because this page is served over insecure HTTP on a local IP. WebRTC requires HTTPS."
                : "WebRTC is not supported or is blocked on this browser.";
            showToast(msg, 'error');
            console.error(msg);
            
            // Show a visual warning on the screen so the user knows exactly what's wrong
            const warningBox = document.createElement('div');
            warningBox.className = 'note-box error-box';
            warningBox.style.margin = '1.5rem auto';
            warningBox.style.maxWidth = '600px';
            warningBox.style.background = '#fef2f2';
            warningBox.style.color = '#991b1b';
            warningBox.style.border = '2px solid #ef4444';
            warningBox.style.padding = '1.5rem';
            warningBox.style.borderRadius = '8px';
            warningBox.style.boxShadow = '4px 4px 0 #991b1b';
            warningBox.style.textAlign = 'left';
            warningBox.style.zIndex = '1000';
            warningBox.style.position = 'relative';
            warningBox.innerHTML = `
                <strong style="display:block; margin-bottom:0.75rem; font-size:1.15rem; font-family: 'Space Grotesk', sans-serif;">⚠️ HTTPS Connection Required</strong>
                You are accessing this page via insecure HTTP on a local IP (<code class="hostname-code"></code>). 
                Browsers disable peer-to-peer features (WebRTC) on insecure connections.
                <br><br>
                <strong>How to fix this:</strong>
                <ul style="margin: 0.5rem 0; padding-left: 1.2rem; line-height: 1.5;">
                    <li>Access the website via your live production deployment (which uses <strong>HTTPS</strong>).</li>
                    <li>Or, use a free secure tunnel like <strong>ngrok</strong> (e.g. <code>ngrok http 8000</code>) to access it securely on your mobile phone.</li>
                    <li>Or, treat this insecure origin as secure in Chrome. Open:
                        <br><code style="background:#fee2e2; padding:0.1rem 0.3rem; border-radius:4px; word-break:break-all;">chrome://flags/#unsafely-treat-insecure-origin-as-secure</code>
                        <br>Enable it and add your URL: <code class="url-code" style="background:#fee2e2; padding:0.1rem 0.3rem; border-radius:4px; word-break:break-all;"></code>
                    </li>
                </ul>
            `;
            warningBox.querySelector('.hostname-code').textContent = window.location.hostname;
            warningBox.querySelector('.url-code').textContent = `http://${window.location.host}`;
            const mainContent = document.querySelector('.sharedrop-main');
            if (mainContent) {
                mainContent.insertBefore(warningBox, mainContent.firstChild);
            }
            return;
        }

        createAndBindPeer();
        initWebSocketSignaling();
    }

    function createAndBindPeer() {
        let cachedPeerId = sessionStorage.getItem('lablazy_peer_id');
        if (!cachedPeerId) {
            cachedPeerId = 'lablazy-sd-' + Math.random().toString(36).substring(2, 9);
            sessionStorage.setItem('lablazy_peer_id', cachedPeerId);
        }
        myPeerId = cachedPeerId;
        selfMetaText.textContent = `${myDeviceInfo.os} • ${myDeviceInfo.browser} • Connecting...`;
        
        try {
            const defaultIceServers = [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' },
                { urls: 'stun:stun.services.mozilla.com' },
                { urls: 'stun:global.stun.twilio.com:3478' },
                {
                    urls: 'turn:openrelay.metered.ca:80',
                    username: 'openrelay',
                    credential: 'openrelay'
                },
                {
                    urls: 'turns:openrelay.metered.ca:443',
                    username: 'openrelay',
                    credential: 'openrelay'
                }
            ];

            const customIce = (typeof AppConfig !== 'undefined' && AppConfig.ICE_SERVERS) ? AppConfig.ICE_SERVERS : defaultIceServers;

            const peerOptions = {
                config: {
                    iceServers: customIce
                }
            };

            // Apply Secure P2P (relay only) configuration
            if (typeof AppConfig !== 'undefined' && AppConfig.SECURE_P2P_MODE) {
                peerOptions.config.iceTransportPolicy = 'relay';
                console.log("Secure P2P Mode Enabled: WebRTC limited to TURN relay nodes to prevent local IP leakage.");
            }

            // Apply custom PeerJS broker server settings
            if (typeof AppConfig !== 'undefined' && AppConfig.PEERJS_CONFIG) {
                peerOptions.host = AppConfig.PEERJS_CONFIG.host;
                peerOptions.port = AppConfig.PEERJS_CONFIG.port;
                peerOptions.path = AppConfig.PEERJS_CONFIG.path;
                peerOptions.secure = AppConfig.PEERJS_CONFIG.secure;
                console.log(`Using custom PeerJS Broker: ${peerOptions.host}:${peerOptions.port}${peerOptions.path}`);
            }

            peer = new Peer(myPeerId, peerOptions);
        } catch (e) {
            console.error("Failed to initialize PeerJS:", e);
            selfMetaText.textContent = `${myDeviceInfo.os} • ${myDeviceInfo.browser} • Offline (Error)`;
            showToast("Failed to initialize peer networking client.", "error");
            return;
        }

        peer.on('open', (id) => {
            selfMetaText.textContent = `${myDeviceInfo.os} • ${myDeviceInfo.browser} • Online`;
            updateMentiInstructions();
        });

        peer.on('disconnected', () => {
            console.log("PeerJS disconnected from signaling server. Reconnecting...");
            selfMetaText.textContent = `${myDeviceInfo.os} • ${myDeviceInfo.browser} • Reconnecting...`;
            peer.reconnect();
        });

        peer.on('connection', (conn) => {
            if (conn.label === 'file-transfer') {
                activeConnections.set(conn.peer, conn);
                setupConnectionListeners(conn);
                
                const sendMetadata = () => {
                    conn.send({
                        type: 'peer-metadata',
                        name: myNickname,
                        os: myDeviceInfo.os,
                        browser: myDeviceInfo.browser
                    });
                    conn.sentMetadata = true;
                };

                if (conn.open) {
                    sendMetadata();
                } else {
                    conn.on('open', sendMetadata);
                }
            }
        });

        peer.on('error', (err) => {
            console.error("PeerJS central broker error:", err);
            
            if (err.type === 'unavailable-id') {
                // Safely recreate peer with a new generated ID to resolve the conflict
                const newId = 'lablazy-sd-' + Math.random().toString(36).substring(2, 9);
                console.warn(`PeerJS ID conflict. Generating new ID: ${newId}`);
                sessionStorage.setItem('lablazy_peer_id', newId);
                myPeerId = newId;
                setTimeout(createAndBindPeer, 1000);
            } 
            else if (err.type === 'disconnected') {
                selfMetaText.textContent = `${myDeviceInfo.os} • ${myDeviceInfo.browser} • Reconnecting...`;
                peer.reconnect();
            }
            else {
                selfMetaText.textContent = `${myDeviceInfo.os} • ${myDeviceInfo.browser} • Offline (${err.type || 'disconnected'})`;
                showToast(`Signaling server connection error: ${err.type || 'offline'}`, "error");
            }
        });
    }

    let pendingRoomChangeCode = '';

    function handleRoomChangeRequest(newRoomCode) {
        const cleanRoom = newRoomCode.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
        if (!cleanRoom) {
            showToast('Invalid room name code.', 'error');
            return;
        }

        // Check if there is an active file transfer
        const isTransferActive = (currentQueueItems.size > 0 || [...transferQueues.values()].some(q => q.length > 0) || incomingTransfer !== null);
        
        if (isTransferActive) {
            pendingRoomChangeCode = cleanRoom;

            if (roomConfirmModal) {
                roomConfirmModal.classList.remove('hidden');
                onModalOpen();
            }
        } else {
            // Join immediately
            joinCustomRoom(cleanRoom);
            if (roomModal) {
                roomModal.classList.add('hidden');
                onModalClose();
            }
        }
    }

    async function getRoomKey(roomName) {
        return roomName.toLowerCase();
    }

    async function joinCustomRoom(cleanRoom) {
        if (signalingSocket) {
            intentionalClose = true;
            try { signalingSocket.close(); } catch (e) {}
        }
        if (presenceHeartbeatIntervalId) {
            clearInterval(presenceHeartbeatIntervalId);
            presenceHeartbeatIntervalId = null;
        }

        // Close peer networking client and active connections
        if (peer) {
            try { peer.destroy(); } catch (e) {}
            peer = null;
        }
        activeConnections.forEach(conn => {
            try { conn.close(); } catch (e) {}
        });
        activeConnections.clear();
        
        // Remove nodes from canvas
        const peerNodes = document.querySelectorAll('.peer-node');
        peerNodes.forEach(node => {
            node.remove();
        });
        peersInRoom.clear();
        
        // Clear peer missing counts for the old room to prevent leaks
        peerMissingCounts.clear();
        
        const roomKey = await getRoomKey(cleanRoom);
        
        myRoom = roomKey;
        myRoomDisplay = cleanRoom.toUpperCase();
        
        sessionStorage.setItem('lablazy_room', myRoom);
        localStorage.setItem('lablazy_room', myRoom);
        sessionStorage.setItem('lablazy_room_display', myRoomDisplay);
        localStorage.setItem('lablazy_room_display', myRoomDisplay);
        
        if (roomCodeInput) roomCodeInput.value = myRoomDisplay;

        // Let the unified chat module handle the room switch
        if (window.unifiedChat) window.unifiedChat.joinRoom(cleanRoom);

        // Re-create PeerJS client for the new room!
        createAndBindPeer();

        initWebSocketSignaling();
        updateMentiInstructions();
        
        // Broadcast presence immediately if we are on the radar screen
        if (!radarDisplayContainer.classList.contains('hidden')) {
            publishPresence('join');
        }
    }

    window.addEventListener('storage', (e) => {
        if (e.key === 'lablazy_room' && e.newValue) {
            const cleanRoom = e.newValue.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
            if (cleanRoom && cleanRoom !== myRoom) {
                myRoom = cleanRoom;
                myRoomDisplay = localStorage.getItem('lablazy_room_display') || myRoom.toUpperCase();
                
                if (roomCodeInput) roomCodeInput.value = myRoomDisplay;
                
                const peerNodes = document.querySelectorAll('.peer-node');
                peerNodes.forEach(node => node.remove());
                peersInRoom.clear();
                peerMissingCounts.clear();
                
                if (peer) {
                    try { peer.destroy(); } catch (e) {}
                    peer = null;
                }
                activeConnections.forEach(conn => {
                    try { conn.close(); } catch (e) {}
                });
                activeConnections.clear();
                
                // Re-create PeerJS client for the synced room!
                createAndBindPeer();

                initWebSocketSignaling();
                updateMentiInstructions();
            }
        }
    });

    joinRoomBtn.addEventListener('click', () => {
        handleRoomChangeRequest(roomCodeInput.value);
    });

    roomCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleRoomChangeRequest(roomCodeInput.value);
        }
    });

    // ==========================================
    // CHAT ROOM LOGIC
    // ==========================================
    // All chat logic is now handled by the unified chat.js module.
    // We just need to initialize it.
    initializeUnifiedChat();

    // Stagger PeerJS + signaling WebSocket init to avoid overwhelming the
    // free-tier Render server with two simultaneous WebSocket connections.
    // The chat WebSocket opens first; the signaling one opens 1.5s later.
    setTimeout(() => {
        ensurePeerClientInitialized();
    }, 1500);

    // Start matchmaking client routines
    showScreen('role-select');

    // Scroll progress bar
    if (scrollProgress) {
        window.addEventListener('scroll', () => {
            const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrolled = (winScroll / height) * 100;
            scrollProgress.style.width = scrolled + '%';
        });
    }

    // 3D Interactive Canvas Particles System
    function initCanvasBackground() {
        const canvas = document.getElementById('mentiCanvasBg');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let width = canvas.offsetWidth;
        let height = canvas.offsetHeight;
        
        function resize() {
            if (canvas.offsetWidth && canvas.offsetHeight) {
                width = canvas.offsetWidth;
                height = canvas.offsetHeight;
                canvas.width = width;
                canvas.height = height;
            }
        }
        resize();
        resizeRadarCanvas = resize;
        
        // Wait briefly for CSS and elements to settle, then resize canvas to fit card container
        setTimeout(resize, 300);

        window.addEventListener('resize', resize);

        const particles = [];
        const particleCount = 35;
        // Deep colors for radial particle glows matching the indigo gradient
        const colors = [
            'rgba(168, 85, 247, ', // Purple
            '#a855f7',
            'rgba(59, 130, 246, ', // Blue
            '#3b82f6',
            'rgba(6, 182, 212, ',  // Cyan
            '#06b6d4',
            'rgba(236, 72, 153, ', // Pink
            '#ec4899'
        ];

        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                z: Math.random() * 1.8 + 0.4, // Z depth factor
                vx: (Math.random() - 0.5) * 0.35,
                vy: (Math.random() - 0.5) * 0.35,
                radius: Math.random() * 4 + 1.5,
                colorIndex: Math.floor(Math.random() * (colors.length / 2)) * 2,
                alpha: Math.random() * 0.35 + 0.1
            });
        }

        let mouseX = width / 2;
        let mouseY = height / 2;
        const parentCard = document.getElementById('radarDropArea');
        if (parentCard) {
            parentCard.addEventListener('mousemove', (e) => {
                const rect = parentCard.getBoundingClientRect();
                mouseX = e.clientX - rect.left;
                mouseY = e.clientY - rect.top;
            });
        }

        function animate() {
            ctx.clearRect(0, 0, width, height);

            // Draw faint network lines
            ctx.lineWidth = 0.5;
            for (let i = 0; i < particleCount; i++) {
                const p1 = particles.at(i);
                for (let j = i + 1; j < particleCount; j++) {
                    const p2 = particles.at(j);
                    const dx = p1.x - p2.x;
                    const dy = p1.y - p2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist < 100) {
                        const alpha = (1 - dist / 100) * 0.1 * ((p1.z + p2.z) / 4);
                        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
                        ctx.beginPath();
                        ctx.moveTo(p1.x, p1.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                    }
                }
            }

            // Draw glowing 3D-like drifting particles
            for (let i = 0; i < particleCount; i++) {
                const p = particles.at(i);
                
                p.x += p.vx * p.z;
                p.y += p.vy * p.z;

                // Subtle parallax magnetic pull/push based on mouse
                const dx = p.x - mouseX;
                const dy = p.y - mouseY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 110) {
                    const force = (110 - dist) / 110;
                    p.x += (dx / dist) * force * 1.2 * p.z;
                    p.y += (dy / dist) * force * 1.2 * p.z;
                }

                // Bounce boundaries
                if (p.x < 0 || p.x > width) p.vx *= -1;
                if (p.y < 0 || p.y > height) p.vy *= -1;

                p.x = Math.max(0, Math.min(width, p.x));
                p.y = Math.max(0, Math.min(height, p.y));

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius * p.z, 0, Math.PI * 2);
                
                ctx.fillStyle = colors.at(p.colorIndex) + p.alpha + ')';
                
                ctx.shadowBlur = 10 * p.z;
                ctx.shadowColor = colors.at(p.colorIndex + 1);
                ctx.fill();
            }
            ctx.shadowBlur = 0;

            requestAnimationFrame(animate);
        }

        animate();
    }
    initCanvasBackground();

    // Nav logo click navigation direct
    if (logo) {
        logo.style.cursor = 'pointer';
        logo.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'index.html';
        });
    }

    if (portalModal && closePortalModal) {
        closePortalModal.addEventListener('click', () => {
            portalModal.classList.add('hidden');
            onModalClose();
        });

        portalModal.addEventListener('click', (e) => {
            if (e.target === portalModal) {
                portalModal.classList.add('hidden');
                onModalClose();
            }
        });
    }

    // Sync Theme Switcher
    const savedTheme = localStorage.getItem('lablazy-theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }
    
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            if (document.body.classList.contains('dark-mode')) {
                localStorage.setItem('lablazy-theme', 'dark');
            } else {
                localStorage.setItem('lablazy-theme', 'light');
            }
        });
    }

    // Modal Back Button History Manager for Mobile & Desktop
    let modalOpenedByHistory = false;

    function onModalOpen() {
        if (!history.state || !history.state.modalOpen) {
            history.pushState({ modalOpen: true }, "");
            modalOpenedByHistory = true;
        }
    }

    function onModalClose() {
        if (modalOpenedByHistory && history.state && history.state.modalOpen) {
            modalOpenedByHistory = false;
            history.back();
        }
    }

    // Change Room Modal Event Listeners



    if (closeRoomModal) {
        closeRoomModal.addEventListener('click', () => {
            if (roomModal) {
                roomModal.classList.add('hidden');
                onModalClose();
            }
        });
    }

    if (chatChangeRoomBtn) {
        chatChangeRoomBtn.addEventListener('click', () => {
            if (roomModal) {
                const currentRoom = sessionStorage.getItem('lablazy_room') || 'lobby';
                if (newRoomCodeInput) newRoomCodeInput.value = currentRoom.toUpperCase();
                roomModal.classList.remove('hidden');
                onModalOpen();
            }
        });
    }

    if (newRoomCodeCancelBtn) {
        newRoomCodeCancelBtn.addEventListener('click', () => {
            if (roomModal) {
                roomModal.classList.add('hidden');
                onModalClose();
            }
        });
    }

    if (newRoomCodeJoinBtn && newRoomCodeInput) {
        newRoomCodeJoinBtn.addEventListener('click', () => {
            handleRoomChangeRequest(newRoomCodeInput.value);
        });
        
        newRoomCodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleRoomChangeRequest(newRoomCodeInput.value);
            }
        });
    }

    if (roomConfirmCancelBtn) {
        roomConfirmCancelBtn.addEventListener('click', () => {
            if (roomConfirmModal) {
                roomConfirmModal.classList.add('hidden');
                onModalClose();
            }
            pendingRoomChangeCode = '';
            localStorage.setItem('lablazy_room', myRoom);
        });
    }

    if (roomConfirmYesBtn) {
        roomConfirmYesBtn.addEventListener('click', () => {
            if (roomConfirmModal) {
                roomConfirmModal.classList.add('hidden');
                onModalClose();
            }
            
            // Abort active transfers cleanly
            resetTransferState();
            
            if (pendingRoomChangeCode) {
                joinCustomRoom(pendingRoomChangeCode);
                pendingRoomChangeCode = '';
            }
            
            // Close room selection input modal if it was open
            if (roomModal) {
                roomModal.classList.add('hidden');
            }
        });
    }

    function generateRandomCode() {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        const length = Math.floor(Math.random() * 5) + 4; // 4 to 8 inclusive (random offset 0-4 + 4)
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    async function getEmptyRoomCode() {
        const httpProtocol = USE_LOCAL_SERVER ? 'http://' : 'https://';
        for (let attempt = 0; attempt < 10; attempt++) {
            const code = generateRandomCode();
            try {
                const response = await fetch(`${httpProtocol}${SIGNALING_HOST}/room-count?room=${code}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.count === 0) {
                        return code;
                    }
                }
            } catch (e) {
                console.warn("Failed to check room count, using code:", code, e);
                return code;
            }
        }
        return generateRandomCode();
    }

    if (generateRoomBtn) {
        generateRoomBtn.addEventListener('click', async () => {
            const originalText = generateRoomBtn.textContent;
            generateRoomBtn.disabled = true;
            generateRoomBtn.textContent = 'Generating...';
            
            try {
                const randomCode = await getEmptyRoomCode();
                
                // Set input values
                if (roomCodeInput) roomCodeInput.value = randomCode.toUpperCase();
                if (newRoomCodeInput) newRoomCodeInput.value = randomCode.toUpperCase();

                handleRoomChangeRequest(randomCode);
            } catch (err) {
                console.error("Failed to generate room code:", err);
            } finally {
                generateRoomBtn.disabled = false;
                generateRoomBtn.textContent = originalText;
            }
        });
    }

    window.addEventListener('popstate', (e) => {
        let modalClosed = false;
        
        if (transferModal && !transferModal.classList.contains('hidden')) {
            resetTransferState();
            modalClosed = true;
        }
        if (portalModal && !portalModal.classList.contains('hidden')) {
            portalModal.classList.add('hidden');
            onModalClose();
            modalClosed = true;
        }
        if (roomModal && !roomModal.classList.contains('hidden')) {
            roomModal.classList.add('hidden');
            onModalClose();
            modalClosed = true;
        }
        if (roomConfirmModal && !roomConfirmModal.classList.contains('hidden')) {
            roomConfirmModal.classList.add('hidden');
            onModalClose();
            pendingRoomChangeCode = '';
            localStorage.setItem('lablazy_room', myRoom);
            modalClosed = true;
        }
        if (historyModal && !historyModal.classList.contains('hidden')) {
            historyModal.classList.add('hidden');
            onModalClose();
            modalClosed = true;
        }

        if (modalClosed) {
            modalOpenedByHistory = false;
        }
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const isModalOpen = (transferModal && !transferModal.classList.contains('hidden')) ||
                                (portalModal && !portalModal.classList.contains('hidden')) ||
                                (roomModal && !roomModal.classList.contains('hidden')) ||
                                (roomConfirmModal && !roomConfirmModal.classList.contains('hidden')) ||
                                (historyModal && !historyModal.classList.contains('hidden'));
            if (isModalOpen) {
                if (history.state && history.state.modalOpen) {
                    history.back();
                } else {
                    if (transferModal) resetTransferState();
                    if (portalModal) portalModal.classList.add('hidden');
                    if (roomModal) roomModal.classList.add('hidden');
                    if (roomConfirmModal) {
                        roomConfirmModal.classList.add('hidden');
                        pendingRoomChangeCode = '';
                        localStorage.setItem('lablazy_room', myRoom);
                    }
                    if (historyModal) historyModal.classList.add('hidden');
                    onModalClose();
                }
            }
        }
    });

    // History Event Listeners
    if (viewHistoryBtn) {
        viewHistoryBtn.addEventListener('click', () => {
            if (historyModal) {
                updateHistoryUI();
                historyModal.classList.remove('hidden');
                onModalOpen();
            }
        });
    }

    const closeHistory = () => {
        if (historyModal) {
            historyModal.classList.add('hidden');
            onModalClose();
        }
    };

    if (closeHistoryModal) closeHistoryModal.addEventListener('click', closeHistory);
    if (closeHistoryModalBtn) closeHistoryModalBtn.addEventListener('click', closeHistory);

    if (downloadAllHistoryBtn) {
        downloadAllHistoryBtn.addEventListener('click', () => {
            receivedFilesHistory.forEach((item, index) => {
                setTimeout(() => {
                    const url = URL.createObjectURL(item.blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = item.name;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                }, index * 400);
            });
        });
    }
});
