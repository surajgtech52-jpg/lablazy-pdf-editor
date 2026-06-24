// ==========================================================================
// SHAREDROP P2P SHARING CLIENT (MENTIMETER PRESENTATION LOBBY STYLE)
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    // UI Navigation & Theme Elements
    const logo = document.getElementById('sharedropLogo');
    const portalModal = document.getElementById('navigationPortalModal');
    const closePortalModal = document.getElementById('closePortalModal');
    const themeToggle = document.getElementById('themeToggle');
    const scrollProgress = document.getElementById('scrollProgress');

    // 1. Role Selection Container Elements
    const roleSelectionContainer = document.getElementById('roleSelectionContainer');
    const chooseSendRoleBtn = document.getElementById('chooseSendRoleBtn');
    const chooseReceiveRoleBtn = document.getElementById('chooseReceiveRoleBtn');

    // 2. Send Upload Container Elements
    const sendUploadContainer = document.getElementById('sendUploadContainer');
    const uploadBackBtn = document.getElementById('uploadBackBtn');
    const sharedropDropZone = document.getElementById('sharedropDropZone');
    const fileInput = document.getElementById('sharedropFileInput');
    const selectedFilesSection = document.getElementById('selectedFilesSection');
    const sharedropFileCountPill = document.getElementById('sharedropFileCountPill');
    const sharedropRemoveAllBtn = document.getElementById('sharedropRemoveAllBtn');
    const sharedropFileList = document.getElementById('sharedropFileList');
    const proceedToSendBtn = document.getElementById('proceedToSendBtn');

    // 3. Radar Display Container Elements
    const radarDisplayContainer = document.getElementById('radarDisplayContainer');
    const radarBackBtn = document.getElementById('radarBackBtn');
    const roomCodeInput = document.getElementById('roomCodeInput');
    const joinRoomBtn = document.getElementById('joinRoomBtn');
    const peersHub = document.getElementById('peersHub');
    const radarInstructions = document.getElementById('radarInstructions');
    const radarSubtext = document.getElementById('radarSubtext');
    const radarDropArea = document.getElementById('radarDropArea');
    const sendToAllContainer = document.getElementById('sendToAllContainer');
    const sendToAllBtn = document.getElementById('sendToAllBtn');
    const peerCountSpan = document.getElementById('peerCountSpan');

    // 4. Footer & Identity Elements
    const selfNameText = document.getElementById('selfNameText');
    const selfMetaText = document.getElementById('selfMetaText');
    const selfIcon = document.getElementById('selfIcon');

    // 5. Transfer Modal Elements
    const transferModal = document.getElementById('transferModal');
    const transferTitle = document.getElementById('transferTitle');
    const transferFilename = document.getElementById('transferFilename');
    const transferFilesize = document.getElementById('transferFilesize');
    const transferProgressContainer = document.getElementById('transferProgressContainer');
    const transferProgressBar = document.getElementById('transferProgressBar');
    const transferProgressPercent = document.getElementById('transferProgressPercent');
    const transferActions = document.getElementById('transferActions');
    const transferAcceptBtn = document.getElementById('transferAcceptBtn');
    const transferDeclineBtn = document.getElementById('transferDeclineBtn');
    const transferFinishedActions = document.getElementById('transferFinishedActions');
    const transferCloseBtn = document.getElementById('transferCloseBtn');
    const transferIcon = document.getElementById('transferIcon');

    // ==========================================
    // STATE LOGIC
    // ==========================================
    let currentRole = null;       // 'sender' | 'receiver'
    let selectedFiles = [];       // List of valid selected File objects
    let peer = null;
    let myPeerId = '';
    let myNickname = '';
    let myRoom = 'lobby';
    let myDeviceInfo = {};
    
    let activeConnections = {};   // peerId -> connection object
    let peersInRoom = {};         // peerId -> peerDetails registration
    let heartbeatTimeoutId = null;
    let resizeRadarCanvas = null;
    let currentSendingFile = null;
    let serverTimeSkew = 0;
    const peerMissingCounts = {};

    // Queue-based File Transfer State
    let transferQueue = [];       // Queue items: { file, targetPeerId }
    let currentQueueItem = null;
    let incomingTransfer = null;  // For receiving file: { name, size, mime, chunks, receivedSize, conn }
    let queueTimeoutId = null;


    const deviceIcons = {
        'Windows': '💻',
        'macOS': '🍎',
        'Linux': '🐧',
        'Mobile': '📱',
        'Device': '⚙️'
    };

    // Mentimeter bubble neon colors
    const bubbleColors = [
        '#ff6b6b', // Coral
        '#51cf66', // Mint
        '#fcc419', // Gold
        '#339af0', // Sky
        '#b197fc', // Lavender
        '#fcc2d7', // Pink
        '#20c997', // Teal
        '#ff922b'  // Orange
    ];

    // Mentimeter-style participant icons to emoji conversions
    const animalEmojis = {
        "Unicorn": "🦄",
        "Robot": "🤖",
        "Ghost": "👻",
        "Donut": "🍩",
        "Rocket": "🚀",
        "Bear": "🐻",
        "Cat": "🐱",
        "Dog": "🐶",
        "Monkey": "🐵",
        "Frog": "🐸",
        "Panda": "🐼",
        "Koala": "🐨",
        "Dinosaur": "🦖",
        "Alien": "👽",
        "Octopus": "🐙",
        "Butterfly": "🦋",
        "Flamingo": "🦩",
        "Pizza": "🍕",
        "IceCream": "🍦",
        "Balloon": "🎈",
        "Heart": "💖",
        "Clover": "🍀",
        "Star": "⭐",
        "Crown": "👑",
        "Falcon": "🦅",
        "Dolphin": "🐬",
        "Tiger": "🐯",
        "Fox": "🦊",
        "Cheetah": "🐆",
        "Owl": "🦉",
        "Rabbit": "🐰",
        "Lion": "🦁"
    };

    // ==========================================
    // UTILITIES
    // ==========================================
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

    // Grid system to position up to 30 peers organically without overlapping
    const gridPositions = [];
    const cols = 6;
    const rows = 5;
    const assignedPositions = {}; // peerId -> positionIndex

    function initGridPositions() {
        gridPositions.length = 0;
        for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
                // Jitter adds a small organic random offset so it doesn't look like a rigid grid
                const jitterX = (Math.random() * 3 - 1.5);
                const jitterY = (Math.random() * 3 - 1.5);
                gridPositions.push({
                    left: 9 + (c * 16.4) + jitterX,  // 9% to 91%
                    top: 20 + (r * 13.5) + jitterY   // 20% to 74%
                });
            }
        }
    }

    function allocatePosition(peerId) {
        if (gridPositions.length === 0) {
            initGridPositions();
        }

        const usedIndices = new Set(Object.values(assignedPositions));
        const availableIndices = [];
        for (let i = 0; i < gridPositions.length; i++) {
            if (!usedIndices.has(i)) {
                availableIndices.push(i);
            }
        }

        let chosenIndex;
        if (availableIndices.length > 0) {
            // Choose a random available index
            chosenIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
        } else {
            // Fallback: choose a completely random index
            chosenIndex = Math.floor(Math.random() * gridPositions.length);
        }

        assignedPositions[peerId] = chosenIndex;
        return gridPositions[chosenIndex];
    }

    function freePosition(peerId) {
        delete assignedPositions[peerId];
    }

    function getDeviceDetails() {
        const ua = navigator.userAgent;
        let os = "Device";
        if (ua.indexOf("Win") !== -1) os = "Windows";
        else if (ua.indexOf("Mac") !== -1) os = "macOS";
        else if (ua.indexOf("Linux") !== -1) os = "Linux";
        else if (/Android|iPhone|iPad|iPod/.test(ua)) os = "Mobile";
        
        let browser = "Browser";
        if (ua.indexOf("Chrome") !== -1) browser = "Chrome";
        else if (ua.indexOf("Safari") !== -1) browser = "Safari";
        else if (ua.indexOf("Firefox") !== -1) browser = "Firefox";
        else if (ua.indexOf("Edge") !== -1) browser = "Edge";
        
        return { os, browser };
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = 'note-box toast-notification';
        toast.style.position = 'fixed';
        toast.style.bottom = '24px';
        toast.style.left = '24px';
        toast.style.zIndex = '10000';
        toast.style.maxWidth = '300px';
        toast.style.margin = '0';
        toast.style.background = type === 'error' ? '#ef4444' : 'var(--upload-bg)';
        toast.style.color = type === 'error' ? 'white' : 'var(--text-color)';
        toast.style.borderColor = type === 'error' ? '#991b1b' : 'var(--border-color)';
        toast.style.boxShadow = '4px 4px 0 var(--border-color)';
        toast.style.animation = 'slideUpFade 0.4s ease-out forwards';
        toast.innerHTML = `<strong>${type === 'error' ? 'Error' : 'Info'}:</strong> ${message}`;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'slideUpFade 0.4s ease-out reverse forwards';
            setTimeout(() => toast.remove(), 400);
        }, 3500);
    }

    // Check file extension (always allow all files)
    function isValidDocument(file) {
        return true;
    }

    // ==========================================
    // SCREEN STATE ROUTER
    // ==========================================
    function showScreen(screenName) {
        roleSelectionContainer.classList.add('hidden');
        sendUploadContainer.classList.add('hidden');
        radarDisplayContainer.classList.add('hidden');

        if (screenName === 'role-select') {
            roleSelectionContainer.classList.remove('hidden');
            currentRole = null;
        } else if (screenName === 'send-upload') {
            sendUploadContainer.classList.remove('hidden');
            currentRole = 'sender';
            updateSelectedFilesUI();
        } else if (screenName === 'radar') {
            radarDisplayContainer.classList.remove('hidden');
            
            if (currentRole === 'sender') {
                radarSubtext.textContent = "Choose a participant bubble below (or click Send to All) to share your selected files.";
            } else {
                radarSubtext.textContent = "Your device is visible. Waiting to receive documents...";
            }
            
            repositionPeers();
            updateSendToAllUI();

            // Settle width/height dimensions when DOM renders and scale canvas immediately
            if (resizeRadarCanvas) {
                resizeRadarCanvas();
                setTimeout(resizeRadarCanvas, 50);
                setTimeout(resizeRadarCanvas, 150);
            }
        }
    }

    // Role Selection Click Actions
    chooseSendRoleBtn.addEventListener('click', () => showScreen('send-upload'));
    chooseReceiveRoleBtn.addEventListener('click', () => {
        currentRole = 'receiver';
        showScreen('radar');
    });

    // Back Buttons
    uploadBackBtn.addEventListener('click', () => {
        selectedFiles = [];
        updateSelectedFilesUI();
        showScreen('role-select');
    });
    radarBackBtn.addEventListener('click', () => {
        if (currentRole === 'sender') {
            showScreen('send-upload');
        } else {
            showScreen('role-select');
        }
    });

    // ==========================================
    // DOCUMENT SELECTION & UPLOAD ZONE
    // ==========================================
    sharedropDropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileInputChange);

    function handleFileInputChange(e) {
        if (e.target.files.length > 0) {
            processSelectedFiles(e.target.files);
            fileInput.value = ''; // reset file selector
        }
    }

    // File Drag & Drop in Send Screen
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        sharedropDropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    sharedropDropZone.addEventListener('dragenter', () => sharedropDropZone.classList.add('dragover'), false);
    sharedropDropZone.addEventListener('dragover', () => sharedropDropZone.classList.add('dragover'), false);
    sharedropDropZone.addEventListener('dragleave', () => sharedropDropZone.classList.remove('dragover'), false);
    sharedropDropZone.addEventListener('drop', (e) => {
        sharedropDropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            processSelectedFiles(e.dataTransfer.files);
        }
    }, false);

    function processSelectedFiles(fileListObject) {
        const fileArray = Array.from(fileListObject);
        if (fileArray.length > 0) {
            selectedFiles = [...selectedFiles, ...fileArray];
            showToast(`Added ${fileArray.length} file${fileArray.length > 1 ? 's' : ''}.`, 'info');
        }
        updateSelectedFilesUI();
    }

    function updateSelectedFilesUI() {
        if (selectedFiles.length === 0) {
            selectedFilesSection.classList.add('hidden');
            return;
        }

        selectedFilesSection.classList.remove('hidden');
        sharedropFileCountPill.textContent = `${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''}`;
        sharedropFileList.innerHTML = '';

        selectedFiles.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'file-item';
            item.innerHTML = `
                <div class="file-name">
                    <svg class="file-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    <div class="file-info">
                        <span class="name-text">${file.name}</span>
                        <span class="size-text">${formatFileSize(file.size)}</span>
                    </div>
                </div>
                <button class="btn-remove" title="Remove" id="remove-doc-${index}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            `;

            item.querySelector(`#remove-doc-${index}`).addEventListener('click', (e) => {
                e.stopPropagation();
                selectedFiles.splice(index, 1);
                updateSelectedFilesUI();
            });

            sharedropFileList.appendChild(item);
        });
    }

    sharedropRemoveAllBtn.addEventListener('click', () => {
        selectedFiles = [];
        updateSelectedFilesUI();
    });

    proceedToSendBtn.addEventListener('click', () => {
        if (selectedFiles.length === 0) {
            showToast('Please upload at least one document before sending.', 'error');
            return;
        }
        showScreen('radar');
    });

    // ==========================================
    // REPOSITION PEERS (INSTRUCTIONS MANAGER ONLY)
    // ==========================================
    function updateMentiInstructions() {
        const mentiUrl = document.getElementById('mentiUrlDisplay');
        const mentiCode = document.getElementById('mentiCodeDisplay');
        const mentiCounter = document.getElementById('mentiCounterVal');

        if (mentiUrl) {
            mentiUrl.textContent = window.location.host + window.location.pathname;
        }
        if (mentiCode) {
            mentiCode.textContent = myRoom.toUpperCase();
        }
        if (mentiCounter) {
            const count = Object.keys(peersInRoom).length;
            const currentVal = parseInt(mentiCounter.textContent) || 0;
            if (currentVal !== count) {
                const parent = document.getElementById('mentiParticipantCounter');
                if (parent) {
                    parent.classList.add('pop');
                    setTimeout(() => parent.classList.remove('pop'), 300);
                }
            }
            mentiCounter.textContent = count;
        }
    }

    function repositionPeers() {
        const peerNodes = document.querySelectorAll('.peer-node');
        const count = peerNodes.length;
        
        const pulseText = radarInstructions.querySelector('.pulse-text');
        const subtext = radarInstructions.querySelector('.subtext');
        
        if (count === 0) {
            if (pulseText) pulseText.style.display = 'block';
            if (subtext) subtext.style.display = 'block';
        } else {
            if (pulseText) pulseText.style.display = 'none';
            if (subtext) subtext.style.display = 'none';
        }
        updateSendToAllUI();
        updateMentiInstructions();
    }

    // ==========================================
    // CREATE MENTIMETER BUBBLE PEER NODE
    // ==========================================
    function createPeerNode(id, nickname, os, browser) {
        const existingNode = document.getElementById(`peer-${id}`);
        if (existingNode) return existingNode;

        const node = document.createElement('div');
        node.className = 'peer-node';
        node.id = `peer-${id}`;
        
        // Position absolutely inside peersHub using our dynamic grid allocator
        const pos = allocatePosition(id);
        node.style.position = 'absolute';
        node.style.left = `${pos.left}%`;
        node.style.top = `${pos.top}%`;
        node.style.transform = 'translate(-50%, -50%)';

        // Randomize float delays, durations and selection to achieve independent drift animations
        const floatAnimIndex = Math.floor(Math.random() * 4) + 1;
        const floatDelay = (Math.random() * -5).toFixed(2);
        const floatDuration = (5 + Math.random() * 3).toFixed(2);

        // Match animal name suffix to its emoji conversion
        const animalName = nickname.split(' ').pop();
        const emoji = animalEmojis[animalName] || '💻';

        // Pick a random Neo-Brutalist color for the bubble
        const bubbleBgColor = bubbleColors[Math.floor(Math.random() * bubbleColors.length)];

        // Progress ring circumferences based on window sizes
        const isMobile = window.innerWidth <= 600;
        const progressRadius = isMobile ? 36 : 43;
        const circumference = 2 * Math.PI * progressRadius;

        node.innerHTML = `
            <div class="peer-float-wrapper" style="animation: floatPeer${floatAnimIndex} ${floatDuration}s ease-in-out ${floatDelay}s infinite;">
                <svg class="progress-ring-svg">
                    <circle class="progress-ring-circle" cx="${isMobile ? '38' : '46'}" cy="${isMobile ? '38' : '46'}" r="${progressRadius}" style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${circumference};" />
                </svg>
                <div class="peer-avatar" style="background-color: ${bubbleBgColor};">${emoji}</div>
                <div class="peer-name">${nickname}</div>
                <div class="peer-meta">${os} • ${browser}</div>
            </div>
        `;

        // Click peer avatar to send selected files to them
        node.addEventListener('click', () => {
            if (currentRole === 'sender') {
                if (selectedFiles.length === 0) {
                    showToast('Go back and select documents to send first.', 'error');
                    return;
                }
                queueFilesForTransfer(selectedFiles, id);
            } else {
                showToast('You are in RECEIVE mode. Only senders can initiate file transfers.', 'info');
            }
        });

        // Setup Drag & Drop directly over peer bubble
        setupPeerDragAndDrop(node, id);

        peersHub.appendChild(node);
        repositionPeers();
        return node;
    }

    function removePeerNode(id) {
        const node = document.getElementById(`peer-${id}`);
        if (node) {
            node.remove();
            freePosition(id);
            repositionPeers();
        }
    }

    function setPeerProgress(peerId, progress) {
        const node = document.getElementById(`peer-${peerId}`);
        if (!node) return;
        const circle = node.querySelector('.progress-ring-circle');
        if (!circle) return;
        
        const isMobile = window.innerWidth <= 600;
        const progressRadius = isMobile ? 36 : 43;
        const circumference = 2 * Math.PI * progressRadius;
        
        const offset = circumference - (progress / 100) * circumference;
        circle.style.strokeDashoffset = offset;
        
        if (progress >= 100) {
            setTimeout(() => {
                circle.style.strokeDashoffset = circumference;
            }, 1000);
        }
    }

    // Individual Drag and Drop over peer nodes
    function setupPeerDragAndDrop(node, id) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            node.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });

        node.addEventListener('dragenter', () => node.classList.add('dragover'), false);
        node.addEventListener('dragover', () => node.classList.add('dragover'), false);
        node.addEventListener('dragleave', () => node.classList.remove('dragover'), false);
        node.addEventListener('drop', (e) => {
            node.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                if (currentRole === 'sender') {
                    // Process files and send to this peer directly
                    processSelectedFiles(files);
                    queueFilesForTransfer(selectedFiles, id);
                } else {
                    showToast('Only senders can drop files onto peers.', 'error');
                }
            }
        }, false);
    }

    // Dynamic visibility check for "Send to All"
    function updateSendToAllUI() {
        const activePeerCount = Object.keys(peersInRoom).length;
        peerCountSpan.textContent = activePeerCount;

        if (currentRole === 'sender' && activePeerCount >= 2) {
            sendToAllContainer.classList.remove('hidden');
        } else {
            sendToAllContainer.classList.add('hidden');
        }
    }

    // ==========================================
    // QUEUED FILE SHARING WORKFLOW
    // ==========================================
    function queueFilesForTransfer(files, targetPeerId) {
        files.forEach(file => {
            transferQueue.push({
                file: file,
                targetPeerId: targetPeerId
            });
        });

        if (!currentQueueItem) {
            processNextQueueItem();
        }
    }

    function scheduleQueueAdvance(delay = 1000) {
        if (queueTimeoutId) {
            clearTimeout(queueTimeoutId);
        }
        queueTimeoutId = setTimeout(() => {
            queueTimeoutId = null;
            processNextQueueItem();
        }, delay);
    }

    function processNextQueueItem() {
        if (transferQueue.length === 0) {
            currentQueueItem = null;
            completeTransferState();
            return;
        }

        currentQueueItem = transferQueue.shift();
        
        const conn = activeConnections[currentQueueItem.targetPeerId];
        if (!conn) {
            showToast('Connecting directly to peer...', 'info');
            
            let newConn = null;
            // 8-second connection timeout to prevent head-of-line queue deadlock
            const connTimeout = setTimeout(() => {
                const targetId = currentQueueItem.targetPeerId;
                showToast(`Connection to ${peersInRoom[targetId]?.name || 'peer'} timed out. Skipping.`, 'error');
                if (peersInRoom[targetId]) {
                    delete peersInRoom[targetId];
                    removePeerNode(targetId);
                }
                if (newConn) {
                    newConn.isTimedOut = true;
                    newConn.close();
                }
                scheduleQueueAdvance(500);
            }, 8000);

            newConn = peer.connect(currentQueueItem.targetPeerId, { label: 'file-transfer' });
            newConn.connTimeout = connTimeout;
            setupConnectionListeners(newConn);
            newConn.on('open', () => {
                if (newConn.connTimeout) {
                    clearTimeout(newConn.connTimeout);
                    newConn.connTimeout = null;
                }
                activeConnections[currentQueueItem.targetPeerId] = newConn;
                sendQueueMetadata(newConn, currentQueueItem.file);
            });
        } else {
            sendQueueMetadata(conn, currentQueueItem.file);
        }
    }

    function sendQueueMetadata(conn, file) {
        openTransferModal('sending', file.name, file.size);
        
        conn.send({
            type: 'metadata',
            name: file.name,
            size: file.size,
            mime: file.type
        });
    }

    const CHUNK_SIZE = 64 * 1024; // 64 KB binary packet slice

    function startSendingQueueChunks(conn, file) {
        let offset = 0;
        const reader = new FileReader();

        reader.onload = function(e) {
            if (!activeConnections[conn.peer]) {
                showToast('Connection lost during transfer. Skipping to next.', 'error');
                resetProgressCircles();
                scheduleQueueAdvance(1000);
                return;
            }

            const buffer = e.target.result;
            conn.send({
                type: 'chunk',
                data: buffer,
                offset: offset
            });

            offset += buffer.byteLength;
            const progress = Math.min((offset / file.size) * 100, 100);
            
            setPeerProgress(conn.peer, progress);
            updateTransferProgress(progress);

            if (offset < file.size) {
                setTimeout(readNextChunk, 1);
            } else {
                conn.send({ type: 'end' });
                showToast(`Sent "${file.name}" successfully!`, 'info');
                
                // Proceed to next queued file immediately
                scheduleQueueAdvance(1000);
            }
        };

        function readNextChunk() {
            const slice = file.slice(offset, offset + CHUNK_SIZE);
            reader.readAsArrayBuffer(slice);
        }

        readNextChunk();
    }

    // Send to All broadcast trigger
    sendToAllBtn.addEventListener('click', () => {
        if (selectedFiles.length === 0) {
            showToast('Go back and select files first.', 'error');
            return;
        }

        const peerIds = Object.keys(peersInRoom);
        if (peerIds.length === 0) return;

        showToast(`Broadcasting selected files to all ${peerIds.length} connected devices...`, 'info');

        // Queue all selected files for all peers
        peerIds.forEach(peerId => {
            queueFilesForTransfer(selectedFiles, peerId);
        });
    });

    // ==========================================
    // CONNECTION LISTENERS
    // ==========================================
    function setupConnectionListeners(conn) {
        conn.on('data', (data) => {
            if (data.type === 'metadata') {
                incomingTransfer = {
                    name: data.name,
                    size: data.size,
                    mime: data.mime,
                    chunks: [],
                    receivedSize: 0,
                    conn: conn
                };
                openTransferModal('receiving', data.name, data.size);
            } 
            else if (data.type === 'accept') {
                updateTransferModalState('transferring');
                startSendingQueueChunks(conn, currentQueueItem.file);
            } 
            else if (data.type === 'decline') {
                showToast(`Transfer declined by peer: ${peersInRoom[conn.peer]?.name || 'Device'}`, 'error');
                transferModal.classList.add('hidden');
                resetProgressCircles();
                scheduleQueueAdvance(1000);
            } 
            else if (data.type === 'chunk') {
                if (incomingTransfer && incomingTransfer.chunks) {
                    incomingTransfer.chunks.push(data.data);
                    incomingTransfer.receivedSize += data.data.byteLength;
                    
                    const progress = Math.min((incomingTransfer.receivedSize / incomingTransfer.size) * 100, 100);
                    setPeerProgress(conn.peer, progress);
                    updateTransferProgress(progress);
                }
            } 
            else if (data.type === 'end') {
                if (incomingTransfer && incomingTransfer.chunks) {
                    const blob = new Blob(incomingTransfer.chunks, { type: incomingTransfer.mime });
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
        });

        conn.on('close', () => {
            if (conn.connTimeout) {
                clearTimeout(conn.connTimeout);
                conn.connTimeout = null;
            }
            delete activeConnections[conn.peer];
            
            // Remove the user from our local registry and DOM immediately
            if (peersInRoom[conn.peer]) {
                delete peersInRoom[conn.peer];
                removePeerNode(conn.peer);
            }
            
            if (conn.isTimedOut) return;
            if (currentQueueItem && currentQueueItem.targetPeerId === conn.peer) {
                showToast('Target connection closed during transfer. Skipping to next.', 'error');
                transferModal.classList.add('hidden');
                resetProgressCircles();
                scheduleQueueAdvance(1000);
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
            delete activeConnections[conn.peer];
            
            // Remove the user from our local registry and DOM immediately
            if (peersInRoom[conn.peer]) {
                delete peersInRoom[conn.peer];
                removePeerNode(conn.peer);
            }
            
            if (conn.isTimedOut) return;
            if (currentQueueItem && currentQueueItem.targetPeerId === conn.peer) {
                showToast('Connection error during transfer. Skipping to next.', 'error');
                transferModal.classList.add('hidden');
                resetProgressCircles();
                scheduleQueueAdvance(1000);
            } else if (incomingTransfer && incomingTransfer.conn && incomingTransfer.conn.peer === conn.peer) {
                showToast('Connection error during incoming transfer.', 'error');
                resetTransferState();
            }
        });
    }

    // ==========================================
    // TRANSFER MODAL UI ROUTINES
    // ==========================================
    function openTransferModal(state, filename, size) {
        transferFilename.textContent = filename;
        transferFilesize.textContent = formatFileSize(size);
        
        transferProgressContainer.classList.add('hidden');
        transferProgressBar.style.width = '0%';
        transferProgressPercent.textContent = '0%';
        
        transferActions.classList.remove('hidden');
        transferFinishedActions.classList.add('hidden');

        if (state === 'sending') {
            transferTitle.textContent = "Sending File...";
            transferIcon.textContent = "📤";
            transferAcceptBtn.classList.add('hidden');
            transferDeclineBtn.textContent = "Cancel";
            
            transferDeclineBtn.onclick = () => {
                const conn = activeConnections[currentQueueItem.targetPeerId];
                if (conn) conn.send({ type: 'decline' });
                resetTransferState();
            };
        } 
        else if (state === 'receiving') {
            transferTitle.textContent = "Incoming File";
            transferIcon.textContent = "📥";
            transferAcceptBtn.classList.remove('hidden');
            transferDeclineBtn.textContent = "Decline";
            
            transferAcceptBtn.onclick = () => {
                if (incomingTransfer.conn) {
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

        transferModal.classList.remove('hidden');
    }

    function updateTransferModalState(state) {
        if (state === 'transferring') {
            transferTitle.textContent = "Transferring...";
            transferIcon.textContent = "⚡";
            transferProgressContainer.classList.remove('hidden');
            transferActions.classList.add('hidden');
        }
    }

    function updateTransferProgress(progress) {
        transferProgressContainer.classList.remove('hidden');
        transferProgressBar.style.width = `${progress}%`;
        transferProgressPercent.textContent = `${Math.round(progress)}%`;
    }

    function completeTransferState() {
        if (transferQueue.length > 0) {
            processNextQueueItem();
            return;
        }

        transferTitle.textContent = "Finished!";
        transferIcon.textContent = "✅";
        transferProgressContainer.classList.add('hidden');
        transferActions.classList.add('hidden');
        transferFinishedActions.classList.remove('hidden');

        transferCloseBtn.onclick = () => {
            resetTransferState();
        };
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
        const files = e.dataTransfer.files;
        const peerNodes = document.querySelectorAll('.peer-node');
        
        if (currentRole === 'sender') {
            if (peerNodes.length === 1) {
                const singlePeerId = peerNodes[0].id.replace('peer-', '');
                processSelectedFiles(files);
                queueFilesForTransfer(selectedFiles, singlePeerId);
            } else if (peerNodes.length > 1) {
                showToast('Drag and drop files directly onto the participant bubbles.', 'info');
            } else {
                showToast('No active devices in this room to drop files onto.', 'error');
            }
        }
    }, false);

    function resetTransferState() {
        transferModal.classList.add('hidden');
        resetProgressCircles();
        currentSendingFile = null;
        transferQueue = [];
        currentQueueItem = null;
        incomingTransfer = null;
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
    // LOBBY SIGNALING MATCHMAKER (KVDB)
    // ==========================================
    const KVDB_BUCKET = 'lablazy_sd_bucket_99881';
    
    async function publishLobbyState() {
        if (!myPeerId) return;
        const url = `https://kvdb.io/${KVDB_BUCKET}/room_${myRoom}`;
        
        try {
            const getResponse = await fetch(url);
            let registry = [];
            
            // Sync clock skew using the HTTP Date response header
            const dateStr = getResponse.headers.get('Date');
            if (dateStr) {
                const serverTime = new Date(dateStr).getTime();
                const localTime = Date.now();
                serverTimeSkew = Math.floor((serverTime - localTime) / 1000);
            }

            if (getResponse.ok) {
                const text = await getResponse.text();
                try {
                    registry = JSON.parse(text);
                } catch (e) {
                    registry = [];
                }
            }

            const currentSyncedTime = Math.floor(Date.now() / 1000) + serverTimeSkew;

            // Filter out stale peers using the synced time difference
            registry = registry.filter(p => {
                if (p.id === myPeerId) return false;
                const diff = currentSyncedTime - p.timestamp;
                return diff < 15 && diff > -15; // Within 15 seconds window
            });

            registry.push({
                id: myPeerId,
                name: myNickname,
                os: myDeviceInfo.os,
                browser: myDeviceInfo.browser,
                timestamp: currentSyncedTime
            });

            await fetch(url, {
                method: 'POST',
                body: JSON.stringify(registry)
            });

            updateActiveRadarPeers(registry);

        } catch (error) {
            console.warn("Matchmaking directory poll failed. Retrying next interval.", error);
        }
    }

    function updateActiveRadarPeers(lobbyList) {
        const currentActiveIds = new Set();
        
        lobbyList.forEach(peerDetails => {
            if (peerDetails.id === myPeerId) return;
            currentActiveIds.add(peerDetails.id);
            
            // Reset missing count since peer is present in active lobby list
            peerMissingCounts[peerDetails.id] = 0;

            if (!peersInRoom[peerDetails.id]) {
                peersInRoom[peerDetails.id] = peerDetails;
                createPeerNode(peerDetails.id, peerDetails.name, peerDetails.os, peerDetails.browser);
                
                if (myPeerId < peerDetails.id) {
                    setTimeout(() => {
                        const conn = peer.connect(peerDetails.id, { label: 'file-transfer' });
                        setupConnectionListeners(conn);
                        conn.on('open', () => {
                            activeConnections[peerDetails.id] = conn;
                        });
                    }, 500);
                }
            }
        });

        // Evict stale peers only after 3 consecutive missed polls (grace period)
        Object.keys(peersInRoom).forEach(id => {
            if (!currentActiveIds.has(id)) {
                peerMissingCounts[id] = (peerMissingCounts[id] || 0) + 1;
                if (peerMissingCounts[id] >= 3) {
                    delete peersInRoom[id];
                    delete activeConnections[id];
                    delete peerMissingCounts[id];
                    removePeerNode(id);
                }
            }
        });
    }

    function scheduleHeartbeat() {
        if (heartbeatTimeoutId) {
            clearTimeout(heartbeatTimeoutId);
        }
        // Stagger poll intervals by randomizing delay (4500ms to 6500ms)
        const delay = 4500 + Math.random() * 2000;
        heartbeatTimeoutId = setTimeout(async () => {
            await publishLobbyState();
            scheduleHeartbeat();
        }, delay);
    }

    async function triggerHeartbeatNow() {
        if (heartbeatTimeoutId) {
            clearTimeout(heartbeatTimeoutId);
        }
        await publishLobbyState();
        scheduleHeartbeat();
    }

    // ==========================================
    // INITIALIZATION
    // ==========================================
    function initializePeerClient() {
        myDeviceInfo = getDeviceDetails();
        myNickname = getRandomName();
        selfNameText.textContent = myNickname;
        selfMetaText.textContent = `${myDeviceInfo.os} • ${myDeviceInfo.browser}`;
        
        // Lookup the user's own animal emoji
        const selfAnimal = myNickname.split(' ').pop();
        selfIcon.textContent = animalEmojis[selfAnimal] || '💻';

        createAndBindPeer();
    }

    function createAndBindPeer() {
        myPeerId = 'lablazy-sd-' + Math.random().toString(36).substring(2, 9);
        peer = new Peer(myPeerId);

        peer.on('open', (id) => {
            triggerHeartbeatNow();
            updateMentiInstructions();
        });

        peer.on('connection', (conn) => {
            if (conn.label === 'file-transfer') {
                activeConnections[conn.peer] = conn;
                setupConnectionListeners(conn);
            }
        });

        peer.on('error', (err) => {
            console.error("PeerJS central broker error:", err);
            if (err.type === 'unavailable-id') {
                // Safely recreate peer and re-bind event listeners recursively
                setTimeout(createAndBindPeer, 1000);
            }
        });
    }

    function joinCustomRoom(newRoomCode) {
        const cleanRoom = newRoomCode.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
        if (!cleanRoom) {
            showToast('Invalid room name code.', 'error');
            return;
        }

        showToast(`Switching to Room: ${cleanRoom}...`, 'info');
        
        Object.keys(activeConnections).forEach(id => {
            activeConnections[id].close();
        });
        activeConnections = {};
        
        Object.keys(peersInRoom).forEach(id => {
            removePeerNode(id);
        });
        peersInRoom = {};
        
        // Clear peer missing counts for the old room to prevent leaks
        for (const key in peerMissingCounts) {
            delete peerMissingCounts[key];
        }
        
        myRoom = cleanRoom;
        triggerHeartbeatNow();
        updateMentiInstructions();
    }

    joinRoomBtn.addEventListener('click', () => {
        joinCustomRoom(roomCodeInput.value);
    });

    roomCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            joinCustomRoom(roomCodeInput.value);
        }
    });

    // Start matchmaking client routines
    initializePeerClient();
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
                const p1 = particles[i];
                for (let j = i + 1; j < particleCount; j++) {
                    const p2 = particles[j];
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
                const p = particles[i];
                
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
                
                ctx.fillStyle = colors[p.colorIndex] + p.alpha + ')';
                
                ctx.shadowBlur = 10 * p.z;
                ctx.shadowColor = colors[p.colorIndex + 1];
                ctx.fill();
            }
            ctx.shadowBlur = 0;

            requestAnimationFrame(animate);
        }

        animate();
    }
    initCanvasBackground();

    // Nav logo click modal toggle
    if (logo && portalModal && closePortalModal) {
        logo.addEventListener('click', (e) => {
            e.preventDefault();
            portalModal.classList.remove('hidden');
        });

        closePortalModal.addEventListener('click', () => {
            portalModal.classList.add('hidden');
        });

        portalModal.addEventListener('click', (e) => {
            if (e.target === portalModal) {
                portalModal.classList.add('hidden');
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
});
