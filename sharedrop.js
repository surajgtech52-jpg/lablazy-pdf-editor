document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements - Navigation & Roles
    const chooseSendRoleBtns = document.querySelectorAll('#chooseSendRoleBtn');
    const chooseReceiveRoleBtns = document.querySelectorAll('#chooseReceiveRoleBtn');
    const roleSelectionContainer = document.getElementById('roleSelectionContainer');
    const sendUploadContainer = document.getElementById('sendUploadContainer');
    const radarDisplayContainer = document.getElementById('radarDisplayContainer');
    const uploadBackBtn = document.getElementById('uploadBackBtn');
    const radarBackBtn = document.getElementById('radarBackBtn');

    // DOM Elements - Sender Upload Interface
    const sharedropDropZone = document.getElementById('sharedropDropZone');
    const unifiedUploadBtn = document.getElementById('unifiedUploadBtn');
    const sharedropFileInput = document.getElementById('sharedropFileInput');
    const selectedFilesSection = document.getElementById('selectedFilesSection');
    const sharedropFileCountPill = document.getElementById('sharedropFileCountPill');
    const sharedropRemoveAllBtn = document.getElementById('sharedropRemoveAllBtn');
    const sharedropFileList = document.getElementById('sharedropFileList');
    const proceedToSendBtn = document.getElementById('proceedToSendBtn');

    // DOM Elements - Sender Progress & Key Screen
    const senderTransferScreen = document.getElementById('senderTransferScreen');
    const senderUploadProgressContainer = document.getElementById('senderUploadProgressContainer');
    const senderUploadStatusText = document.getElementById('senderUploadStatusText');
    const senderUploadProgressBar = document.getElementById('senderUploadProgressBar');
    const senderUploadProgressPercent = document.getElementById('senderUploadProgressPercent');
    const senderUploadErrorContainer = document.getElementById('senderUploadErrorContainer');
    const senderUploadErrorText = document.getElementById('senderUploadErrorText');
    const senderRetryUploadBtn = document.getElementById('senderRetryUploadBtn');
    const senderErrorBackBtn = document.getElementById('senderErrorBackBtn');
    const senderKeyContainer = document.getElementById('senderKeyContainer');
    const senderPinCode = document.getElementById('senderPinCode');
    const copyPinBtn = document.getElementById('copyPinBtn');
    const pinCountdown = document.getElementById('pinCountdown');

    // DOM Elements - Receiver Input & Download Screen
    const receiverTransferScreen = document.getElementById('receiverTransferScreen');
    const pinInputSection = document.getElementById('pinInputSection');
    const receiverPinInput = document.getElementById('receiverPinInput');
    const submitPinBtn = document.getElementById('submitPinBtn');
    const receiverDownloadCard = document.getElementById('receiverDownloadCard');
    const downloadFileName = document.getElementById('downloadFileName');
    const downloadFileSize = document.getElementById('downloadFileSize');
    const downloadFileBtn = document.getElementById('downloadFileBtn');

    // DOM Elements - Active Transfer History
    const senderHistorySection = document.getElementById('senderHistorySection');
    const activeTransfersList = document.getElementById('activeTransfersList');
    const senderBackToUploadBtn = document.getElementById('senderBackToUploadBtn');

    // DOM Elements - Receivers List
    const seeReceiversBtn = document.getElementById('seeReceiversBtn');
    const receiversListContainer = document.getElementById('receiversListContainer');
    const activeReceiversCount = document.getElementById('activeReceiversCount');
    const receiversListEmpty = document.getElementById('receiversListEmpty');
    const receiversList = document.getElementById('receiversList');
    const sharedropRoomDisplay = document.getElementById('sharedropRoomDisplay');

    // DOM Elements - Incoming Modal
    const incomingTransferModal = document.getElementById('incomingTransferModal');
    const incomingSenderName = document.getElementById('incomingSenderName');
    const incomingFileName = document.getElementById('incomingFileName');
    const incomingFileSize = document.getElementById('incomingFileSize');
    const incomingCountdown = document.getElementById('incomingCountdown');
    const acceptTransferBtn = document.getElementById('acceptTransferBtn');
    const declineTransferBtn = document.getElementById('declineTransferBtn');

    // State Variables
    let selectedFiles = [];
    let currentRole = 'receiver'; // 'sender' or 'receiver'
    let countdownInterval = null;
    let incomingCountdownInterval = null;

    // Radar & Matchmaking State
    let peers = []; // Tracks classmates: { id, name, emoji, angle, radius, pulse }
    let myPeerId = '';
    let myNickname = '';
    let myEmoji = '💻';
    let myRoomDisplay = 'LOBBY';
    let currentPin = '';
    let pinExpiryTime = 0;
    let sweepAngle = 0;

    // System Availability Checks
    let systemAvailable = true;

    // Toast Notification System
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
        toast.style.animation = 'toastPopIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
        toast.textContent = message;
        
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'slideUpFade 0.3s ease-in forwards';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // Format File Size Helper
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Health Check Endpoint Trigger
    async function checkSystemHealth() {
        try {
            const res = await fetch('/api/health');
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                disableSystem(data.message || "Database connection failed or storage is unavailable.");
            } else {
                systemAvailable = true;
                const isConnected = !!(window.chatState && window.chatState.isConnected);
                updateConnectionUI(isConnected);
            }
        } catch (error) {
            disableSystem("Could not connect to the database storage backend.");
        }
    }

    function disableSystem(reason) {
        systemAvailable = false;
        console.error("Storage/Database Connection Error:", reason);
        updateConnectionUI(false);
        showToast("Storage backend offline. Transfer features disabled.", "error");
    }

    function updateConnectionUI(connected) {
        const rolesGrid = document.querySelector('.roles-grid');
        const connectionNoticeBoard = document.getElementById('connectionNoticeBoard');
        const connectionNoticeText = document.getElementById('connectionNoticeText');
        const seeReceiversBtn = document.getElementById('seeReceiversBtn');
        const receiversListContainer = document.getElementById('receiversListContainer');
        
        if (!rolesGrid || !connectionNoticeBoard) return;
        
        if (!systemAvailable) {
            // Hard block: backend storage is offline
            rolesGrid.classList.add('hidden');
            connectionNoticeBoard.classList.remove('hidden');
            
            if (connectionNoticeBoard.firstElementChild) {
                connectionNoticeBoard.firstElementChild.style.background = '#fee2e2'; // light red
                connectionNoticeBoard.firstElementChild.style.color = '#991b1b'; // dark red
                connectionNoticeBoard.firstElementChild.style.borderColor = '#f87171'; // red border
                connectionNoticeBoard.firstElementChild.style.boxShadow = '6px 6px 0 #ef4444';
            }
            
            if (connectionNoticeText) {
                connectionNoticeText.innerHTML = "Send and Receive features are not available now.<br>Storage backend/database is offline. Sorry for the inconvenience.";
            }
        } else if (!connected) {
            // Soft warning: WebSocket is offline, but manual transfers work
            rolesGrid.classList.remove('hidden');
            connectionNoticeBoard.classList.remove('hidden');
            
            if (connectionNoticeBoard.firstElementChild) {
                connectionNoticeBoard.firstElementChild.style.background = '#fef08a'; // light yellow
                connectionNoticeBoard.firstElementChild.style.color = '#854d0e'; // dark yellow
                connectionNoticeBoard.firstElementChild.style.borderColor = '#ca8a04'; // gold border
                connectionNoticeBoard.firstElementChild.style.boxShadow = '6px 6px 0 #eab308';
            }
            
            if (connectionNoticeText) {
                connectionNoticeText.innerHTML = "⚠️ Signaling server offline. Direct room sharing is unavailable, but you can still use the <strong>Manual 4-Digit Key Transfer</strong>.";
            }
            
            // Disable active receivers list button
            if (seeReceiversBtn) {
                seeReceiversBtn.disabled = true;
                seeReceiversBtn.style.opacity = '0.5';
                seeReceiversBtn.style.pointerEvents = 'none';
                seeReceiversBtn.textContent = '❌ Receivers Offline';
            }
            if (receiversListContainer) {
                receiversListContainer.classList.add('hidden');
            }
        } else {
            // Everything is healthy
            rolesGrid.classList.remove('hidden');
            connectionNoticeBoard.classList.add('hidden');
            
            // Re-enable active receivers list button
            if (seeReceiversBtn) {
                seeReceiversBtn.disabled = false;
                seeReceiversBtn.style.opacity = '1';
                seeReceiversBtn.style.pointerEvents = 'auto';
                seeReceiversBtn.textContent = 'See Active Receivers';
                seeReceiversBtn.style.background = '#a855f7';
                seeReceiversBtn.style.color = 'white';
                seeReceiversBtn.style.borderColor = '#7e22ce';
                seeReceiversBtn.style.boxShadow = '4px 4px 0 #7e22ce';
            }
        }
    }

    // Initialize health and connection checks
    checkSystemHealth();
    const isConnectedInitially = !!(window.chatState && window.chatState.isConnected);
    updateConnectionUI(isConnectedInitially);

    // Custom 4-digit input cell focus & keyboard logic
    const otpCells = document.querySelectorAll('.foc-input-cell');
    const pinHiddenInput = document.getElementById('receiverPinInput');
    
    if (otpCells.length === 4 && pinHiddenInput) {
        otpCells.forEach((cell, idx) => {
            cell.addEventListener('input', (e) => {
                let val = cell.value.replace(/[^0-9]/g, '');
                cell.value = val.slice(-1);
                
                const parent = cell.parentElement;
                if (cell.value) {
                    parent.classList.add('foc-box--filled');
                    parent.classList.remove('foc-box--tap');
                    void parent.offsetWidth; // trigger reflow
                    parent.classList.add('foc-box--tap');
                    
                    if (idx < 3) {
                        otpCells[idx + 1].focus();
                        try { otpCells[idx + 1].select(); } catch (err) {}
                    }
                } else {
                    parent.classList.remove('foc-box--filled');
                }
                updateCombinedPin();
            });
            
            cell.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace') {
                    const parent = cell.parentElement;
                    if (!cell.value && idx > 0) {
                        e.preventDefault();
                        otpCells[idx - 1].focus();
                        otpCells[idx - 1].value = '';
                        otpCells[idx - 1].parentElement.classList.remove('foc-box--filled');
                    } else if (cell.value) {
                        cell.value = '';
                        parent.classList.remove('foc-box--filled');
                    }
                    updateCombinedPin();
                } else if (e.key === 'ArrowLeft' && idx > 0) {
                    e.preventDefault();
                    otpCells[idx - 1].focus();
                } else if (e.key === 'ArrowRight' && idx < 3) {
                    e.preventDefault();
                    otpCells[idx + 1].focus();
                }
            });
            
            cell.addEventListener('paste', (e) => {
                e.preventDefault();
                const text = (e.clipboardData || window.clipboardData).getData('text');
                const digits = text.replace(/[^0-9]/g, '').slice(0, 4).split('');
                
                otpCells.forEach((c, i) => {
                    if (digits[i]) {
                        c.value = digits[i];
                        c.parentElement.classList.add('foc-box--filled');
                    } else {
                        c.value = '';
                        c.parentElement.classList.remove('foc-box--filled');
                    }
                });
                
                updateCombinedPin();
                const nextIndex = Math.min(digits.length, 3);
                if (otpCells[nextIndex]) {
                    otpCells[nextIndex].focus();
                }
            });
        });
        
        function updateCombinedPin() {
            let pinVal = '';
            otpCells.forEach(cell => {
                pinVal += cell.value;
            });
            pinHiddenInput.value = pinVal;
        }
        
        window.resetOtpCells = function(shouldFocus = true) {
            otpCells.forEach(cell => {
                cell.value = '';
                cell.parentElement.classList.remove('foc-box--filled', 'foc-box--tap');
            });
            pinHiddenInput.value = '';
            if (shouldFocus && otpCells[0]) {
                otpCells[0].focus({ preventScroll: true });
            }
        };
    }

    // Active key transfer cache logic (localStorage)
    let historyInterval = null;
    function checkActiveTransferHistory() {
        if (!senderHistorySection || !activeTransfersList) return;
        
        // Migrate old key format if present
        const oldCached = localStorage.getItem('lablazy_active_transfer');
        let transfers = [];
        const cachedTransfers = localStorage.getItem('lablazy_active_transfers');
        
        if (cachedTransfers) {
            try {
                transfers = JSON.parse(cachedTransfers);
            } catch (e) {
                console.error("Failed to parse lablazy_active_transfers:", e);
            }
        }
        
        if (oldCached) {
            try {
                const oldData = JSON.parse(oldCached);
                // Check if this old data is already in transfers array
                const exists = transfers.some(t => t.pin === oldData.pin);
                if (!exists && Date.now() < oldData.expiryTime) {
                    transfers.push(oldData);
                    localStorage.setItem('lablazy_active_transfers', JSON.stringify(transfers));
                }
            } catch (e) {
                console.error("Failed to migrate old active transfer:", e);
            }
            localStorage.removeItem('lablazy_active_transfer');
        }

        // Filter out expired transfers
        const initialCount = transfers.length;
        transfers = transfers.filter(t => Date.now() < t.expiryTime);
        if (transfers.length !== initialCount) {
            localStorage.setItem('lablazy_active_transfers', JSON.stringify(transfers));
        }

        if (transfers.length === 0) {
            senderHistorySection.classList.add('hidden');
            activeTransfersList.innerHTML = '';
            if (historyInterval) { clearInterval(historyInterval); historyInterval = null; }
            return;
        }

        senderHistorySection.classList.remove('hidden');
        activeTransfersList.innerHTML = '';

        transfers.forEach(transfer => {
            const item = document.createElement('div');
            item.className = 'card';
            item.style.padding = '1rem';
            item.style.display = 'flex';
            item.style.justifyContent = 'space-between';
            item.style.alignItems = 'center';
            item.style.background = 'var(--upload-bg)';
            item.style.borderRadius = '8px';
            item.style.border = '2px solid var(--border-color)';
            item.style.boxShadow = '3px 3px 0 var(--border-color)';
            item.style.marginBottom = '0.5rem';

            const info = document.createElement('div');
            info.style.minWidth = '0';
            info.style.flex = '1';
            info.style.marginRight = '1rem';

            const name = document.createElement('strong');
            name.style.display = 'block';
            name.style.fontSize = '0.9rem';
            name.style.marginBottom = '0.25rem';
            name.style.whiteSpace = 'nowrap';
            name.style.overflow = 'hidden';
            name.style.textOverflow = 'ellipsis';
            name.textContent = transfer.fileName;

            const meta = document.createElement('span');
            meta.style.fontSize = '0.8rem';
            meta.style.color = 'var(--text-muted)';
            meta.style.fontWeight = 'bold';
            
            const pinSpan = document.createElement('span');
            pinSpan.style.color = 'var(--accent)';
            pinSpan.style.fontWeight = '800';
            pinSpan.textContent = transfer.pin;

            const timerSpan = document.createElement('span');
            timerSpan.className = 'history-timer';
            timerSpan.setAttribute('data-expiry', transfer.expiryTime);
            timerSpan.setAttribute('data-pin', transfer.pin);
            timerSpan.textContent = 'Calculating...';

            meta.appendChild(document.createTextNode('Key: '));
            meta.appendChild(pinSpan);
            meta.appendChild(document.createTextNode(' | Expires in '));
            meta.appendChild(timerSpan);

            info.appendChild(name);
            info.appendChild(meta);

            const actions = document.createElement('div');
            actions.style.display = 'flex';
            actions.style.gap = '8px';
            actions.style.flexShrink = '0';

            const showBtn = document.createElement('button');
            showBtn.className = 'brutal-btn-small';
            showBtn.style.background = 'var(--accent)';
            showBtn.style.color = 'black';
            showBtn.textContent = 'Show Key';
            showBtn.addEventListener('click', () => {
                currentPin = transfer.pin;
                pinExpiryTime = transfer.expiryTime;

                showScreen('radar');
                setupSendScreen();

                senderPinCode.textContent = transfer.pin;
                senderUploadProgressContainer.classList.add("hidden");
                senderUploadStatusText.textContent = "Staged transfer key restored!";
                senderUploadStatusText.style.color = "#10b981";
                senderKeyContainer.classList.remove("hidden");

                const secsLeft = Math.max(0, Math.floor((pinExpiryTime - Date.now()) / 1000));
                startCountdown(secsLeft);
                
                showToast("Key details displayed successfully!", "success");
            });

            const clearBtn = document.createElement('button');
            clearBtn.className = 'brutal-btn-small';
            clearBtn.style.background = '#ef4444';
            clearBtn.style.color = 'white';
            clearBtn.style.borderColor = '#b91c1c';
            clearBtn.style.boxShadow = '2px 2px 0 #b91c1c';
            clearBtn.textContent = 'Clear';
            clearBtn.addEventListener('click', () => {
                let currentTransfers = [];
                try {
                    currentTransfers = JSON.parse(localStorage.getItem('lablazy_active_transfers') || '[]');
                } catch (e) {}
                currentTransfers = currentTransfers.filter(t => t.pin !== transfer.pin);
                localStorage.setItem('lablazy_active_transfers', JSON.stringify(currentTransfers));
                
                if (currentPin === transfer.pin) {
                    if (countdownInterval) clearInterval(countdownInterval);
                    senderKeyContainer.classList.add('hidden');
                    currentPin = '';
                }
                
                showToast("Transfer cleared.", "info");
                checkActiveTransferHistory();
            });

            actions.appendChild(showBtn);
            actions.appendChild(clearBtn);

            item.appendChild(info);
            item.appendChild(actions);
            activeTransfersList.appendChild(item);
        });

        if (historyInterval) clearInterval(historyInterval);
        const updateAllTimers = () => {
            const timerElements = activeTransfersList.querySelectorAll('.history-timer');
            let hasAnyExpired = false;
            
            timerElements.forEach(el => {
                const expiry = parseInt(el.getAttribute('data-expiry'));
                const pin = el.getAttribute('data-pin');
                const secsLeft = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
                
                if (secsLeft <= 0) {
                    hasAnyExpired = true;
                    if (currentPin === pin) {
                        if (countdownInterval) clearInterval(countdownInterval);
                        senderKeyContainer.classList.add('hidden');
                        currentPin = '';
                    }
                } else {
                    const mins = Math.floor(secsLeft / 60);
                    const secs = secsLeft % 60;
                    el.textContent = `${mins}:${secs.toString().padStart(2, "0")}`;
                }
            });

            if (hasAnyExpired) {
                // Trigger re-render which will filter out expired transfers
                checkActiveTransferHistory();
            }
        };
        updateAllTimers();
        historyInterval = setInterval(updateAllTimers, 1000);
    }

    // Toggle active receivers panel
    if (seeReceiversBtn && receiversListContainer) {
        seeReceiversBtn.addEventListener('click', () => {
            const isHidden = receiversListContainer.classList.contains('hidden');
            if (isHidden) {
                receiversListContainer.classList.remove('hidden');
                seeReceiversBtn.style.background = 'var(--accent)';
                seeReceiversBtn.style.color = '#000';
                seeReceiversBtn.style.borderColor = 'var(--border-color)';
                seeReceiversBtn.style.boxShadow = '4px 4px 0 var(--border-color)';
                renderReceiversList();
            } else {
                receiversListContainer.classList.add('hidden');
                seeReceiversBtn.style.background = '#a855f7';
                seeReceiversBtn.style.color = 'white';
                seeReceiversBtn.style.borderColor = '#7e22ce';
                seeReceiversBtn.style.boxShadow = '4px 4px 0 #7e22ce';
            }
        });
    }

    // Navigation Screens
    function showScreen(screenId) {
        if (!systemAvailable && screenId !== 'role-select') return;
        
        // Reset scrollLeft to prevent browser focus auto-scroll bugs
        const sliderContainer = document.querySelector('.views-slider-container');
        if (sliderContainer) {
            sliderContainer.scrollLeft = 0;
        }

        roleSelectionContainer.classList.add('hidden');
        sendUploadContainer.classList.add('hidden');
        radarDisplayContainer.classList.add('hidden');

        // Flipped logic for Neo-Brutalist segmented slider
        const viewsSlider = document.getElementById('viewsSlider');
        const secondaryView = document.getElementById('sharedrop-secondary-view');

        if (screenId === 'role-select') {
            roleSelectionContainer.classList.remove('hidden');
            if (viewsSlider) viewsSlider.classList.remove('shift-right');
            if (secondaryView) secondaryView.classList.remove('active');
        } else if (screenId === 'send-upload') {
            sendUploadContainer.classList.remove('hidden');
            if (viewsSlider) viewsSlider.classList.add('shift-right');
            if (secondaryView) secondaryView.classList.add('active');
            checkActiveTransferHistory();
        } else if (screenId === 'radar') {
            radarDisplayContainer.classList.remove('hidden');
            if (viewsSlider) viewsSlider.classList.add('shift-right');
            if (secondaryView) secondaryView.classList.add('active');
        }
    }

    // Handle back and role selections
    chooseSendRoleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (!systemAvailable) return;
            currentRole = 'sender';
            showScreen('send-upload');
            broadcastRoleUpdate();
        });
    });
    chooseReceiveRoleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (!systemAvailable) return;
            currentRole = 'receiver';
            showScreen('radar');
            setupReceiveScreen();
            broadcastRoleUpdate();
        });
    });
    if (uploadBackBtn) {
        uploadBackBtn.addEventListener('click', () => {
            currentRole = 'idle';
            showScreen('role-select');
            broadcastRoleUpdate();
        });
    }
    if (radarBackBtn) {
        radarBackBtn.addEventListener('click', () => {
            if (countdownInterval) clearInterval(countdownInterval);
            currentRole = 'idle';
            showScreen('role-select');
            broadcastRoleUpdate();
        });
    }

    if (senderBackToUploadBtn) {
        senderBackToUploadBtn.addEventListener('click', () => {
            if (countdownInterval) clearInterval(countdownInterval);
            selectedFiles = [];
            updateFileListUI();
            checkActiveTransferHistory();
            showScreen('send-upload');
        });
    }

    function broadcastRoleUpdate() {
        if (typeof window.sendSignalingMessage === 'function') {
            window.sendSignalingMessage({
                action: 'role-update',
                id: myPeerId,
                role: currentRole
            });
        }
    }

    // Drag & Drop
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        window.addEventListener(eventName, preventDefaults, false);
    });
    if (sharedropDropZone) {
        sharedropDropZone.addEventListener('dragenter', () => sharedropDropZone.classList.add('dragover'));
        sharedropDropZone.addEventListener('dragover', () => sharedropDropZone.classList.add('dragover'));
        sharedropDropZone.addEventListener('dragleave', () => sharedropDropZone.classList.remove('dragover'));
        sharedropDropZone.addEventListener('drop', (e) => {
            sharedropDropZone.classList.remove('dragover');
            if (e.dataTransfer && e.dataTransfer.files) {
                processFiles(Array.from(e.dataTransfer.files));
            }
        });
    }
    if (unifiedUploadBtn && sharedropFileInput) {
        unifiedUploadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sharedropFileInput.click();
        });
    }
    if (sharedropFileInput) {
        sharedropFileInput.addEventListener('change', (e) => {
            processFiles(Array.from(e.target.files));
        });
    }

    function processFiles(files) {
        const validFiles = files.filter(f => f.size > 0);
        if (validFiles.length > 0) {
            selectedFiles = selectedFiles.concat(validFiles);
            updateFileListUI();
        }
    }

    function updateFileListUI() {
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
            removeBtn.style.padding = '0.2rem 0.5rem';
            removeBtn.textContent = 'Remove';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                selectedFiles.splice(index, 1);
                updateFileListUI();
            });
            
            item.appendChild(info);
            item.appendChild(removeBtn);
            sharedropFileList.appendChild(item);
        });
    }

    if (sharedropRemoveAllBtn) {
        sharedropRemoveAllBtn.addEventListener('click', () => {
            selectedFiles = [];
            updateFileListUI();
        });
    }

    // Sender logic - Send files to B2 via Cloudflare Proxy
    if (proceedToSendBtn) {
        proceedToSendBtn.addEventListener('click', async () => {
            if (selectedFiles.length === 0) {
                showToast('Please select files first.', 'error');
                return;
            }

            // Check for low memory or mobile device constraints for zipping
            const deviceMemory = navigator.deviceMemory || 4;
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            const totalSize = selectedFiles.reduce((acc, f) => acc + f.size, 0);
            
            if (selectedFiles.length > 1 && (isMobile || deviceMemory <= 2) && totalSize > 35 * 1024 * 1024) {
                const proceed = confirm(`⚠️ Memory warning: Packaging multiple files (${formatFileSize(totalSize)}) may restart the browser tab on this device.\n\nWe recommend transferring files one-by-one instead. Do you want to proceed anyway?`);
                if (!proceed) return;
            }

            showScreen('radar');
            setupSendScreen();
            
            try {
                let fileToUpload = null;
                
                // If multiple files are selected, zip them client-side using STORE format to avoid memory crashes
                if (selectedFiles.length > 1) {
                    senderUploadStatusText.textContent = "Reading files...";
                    const zip = new JSZip();
                    const usedNames = new Set();

                    for (let i = 0; i < selectedFiles.length; i++) {
                        const file = selectedFiles[i];
                        senderUploadStatusText.textContent = `Processing file ${i + 1} of ${selectedFiles.length}: ${file.name}`;
                        
                        // Handle duplicate file names safely
                        let safeName = file.name;
                        let count = 1;
                        while (usedNames.has(safeName)) {
                            const dotIdx = file.name.lastIndexOf('.');
                            if (dotIdx !== -1) {
                                safeName = `${file.name.substring(0, dotIdx)} (${count})${file.name.substring(dotIdx)}`;
                            } else {
                                safeName = `${file.name} (${count})`;
                            }
                            count++;
                        }
                        usedNames.add(safeName);

                        // Eagerly read ArrayBuffer into memory while browser file permission is active
                        const fileBuffer = await file.arrayBuffer();
                        zip.file(safeName, fileBuffer);
                    }

                    senderUploadStatusText.textContent = "Packaging ZIP archive...";
                    const zipBlob = await zip.generateAsync({ 
                        type: "blob",
                        compression: "STORE" 
                    }, (metadata) => {
                        senderUploadStatusText.textContent = `Packaging files... ${Math.round(metadata.percent)}%`;
                    });
                    fileToUpload = new File([zipBlob], "archive.zip", { type: "application/zip" });
                } else {
                    fileToUpload = selectedFiles[0];
                }

                // Check 100 MB proxy upload size limit
                if (fileToUpload.size > 100 * 1024 * 1024) {
                    throw new Error("File exceeds the Cloudflare proxy size limit of 100 MB. Please compress or select a smaller file.");
                }

                function handleUploadFailure(errorMessage) {
                    senderUploadProgressContainer.classList.add("hidden");
                    if (senderUploadErrorContainer) {
                        senderUploadErrorContainer.classList.remove("hidden");
                        if (senderUploadErrorText) {
                            senderUploadErrorText.textContent = errorMessage;
                        }
                        if (senderRetryUploadBtn) {
                            senderRetryUploadBtn.onclick = () => {
                                senderUploadErrorContainer.classList.add("hidden");
                                senderUploadProgressContainer.classList.remove("hidden");
                                senderUploadProgressBar.style.width = "0%";
                                senderUploadProgressPercent.textContent = "0%";
                                senderUploadStatusText.textContent = "Retrying upload...";
                                performUpload(2);
                            };
                        }
                        if (senderErrorBackBtn) {
                            senderErrorBackBtn.onclick = () => {
                                showScreen('upload');
                            };
                        }
                    }
                    showToast(errorMessage, "error");
                }

                function performUpload(attemptsLeft = 2) {
                    senderUploadStatusText.textContent = "Uploading file to server...";
                    senderUploadStatusText.style.color = "";
                    if (senderUploadErrorContainer) senderUploadErrorContainer.classList.add("hidden");

                    const xhr = new XMLHttpRequest();
                    xhr.open("POST", "/api/upload");
                    xhr.setRequestHeader("x-file-name", encodeURIComponent(fileToUpload.name));
                    xhr.setRequestHeader("x-file-size", fileToUpload.size);
                    xhr.setRequestHeader("x-file-type", fileToUpload.type || "application/octet-stream");
                    xhr.setRequestHeader("x-file-count", (selectedFiles && selectedFiles.length > 0 ? selectedFiles.length : 1).toString());
                    xhr.timeout = 60000; // 60 seconds timeout

                    xhr.upload.onprogress = (e) => {
                        if (e.lengthComputable) {
                            const percent = Math.round((e.loaded / e.total) * 100);
                            senderUploadProgressBar.style.width = percent + "%";
                            senderUploadProgressPercent.textContent = percent + "%";
                            if (percent >= 100) {
                                senderUploadStatusText.textContent = "⚡ Finalizing & Generating 4-Digit Key...";
                                senderUploadStatusText.style.color = "var(--accent)";
                            } else {
                                senderUploadStatusText.textContent = `Uploading file... ${formatFileSize(e.loaded)} / ${formatFileSize(e.total)}`;
                            }
                        }
                    };

                    xhr.onload = () => {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            try {
                                const { pin } = JSON.parse(xhr.responseText);
                                currentPin = pin;
                                pinExpiryTime = Date.now() + 600 * 1000;

                                senderUploadProgressContainer.classList.add("hidden");
                                if (senderUploadErrorContainer) senderUploadErrorContainer.classList.add("hidden");
                                
                                const formattedPin = pin;
                                senderPinCode.textContent = formattedPin;
                                senderKeyContainer.classList.remove("hidden");
                                
                                // Cache active transfer to history array
                                let currentTransfers = [];
                                try {
                                    currentTransfers = JSON.parse(localStorage.getItem('lablazy_active_transfers') || '[]');
                                } catch (e) {}
                                
                                const fileList = selectedFiles.map(f => ({ name: f.name, size: f.size }));
                                const activeTransfer = {
                                    pin: pin,
                                    fileName: fileToUpload.name,
                                    files: fileList,
                                    expiryTime: pinExpiryTime
                                };
                                
                                currentTransfers.push(activeTransfer);
                                localStorage.setItem('lablazy_active_transfers', JSON.stringify(currentTransfers));
                                
                                checkActiveTransferHistory();
                                
                                startCountdown(600); // 10 minutes PIN expiry countdown
                            } catch (err) {
                                handleUploadFailure("Failed to parse server upload response.");
                            }
                        } else {
                            if (attemptsLeft > 0) {
                                console.warn(`Upload failed with status ${xhr.status}. Retrying... (${attemptsLeft} attempts left)`);
                                senderUploadStatusText.textContent = `Upload failed (${xhr.status}). Retrying in 2 seconds...`;
                                senderUploadStatusText.style.color = "#d97706";
                                setTimeout(() => performUpload(attemptsLeft - 1), 2000);
                            } else {
                                handleUploadFailure(`Upload failed: ${xhr.responseText || xhr.statusText || 'Server error'}`);
                            }
                        }
                    };

                    xhr.onerror = () => {
                        if (attemptsLeft > 0) {
                            console.warn(`Upload network error. Retrying... (${attemptsLeft} attempts left)`);
                            senderUploadStatusText.textContent = `Network dropout. Retrying in 2 seconds...`;
                            senderUploadStatusText.style.color = "#d97706";
                            setTimeout(() => performUpload(attemptsLeft - 1), 2000);
                        } else {
                            handleUploadFailure("Network error during upload. Please check your connection.");
                        }
                    };

                    xhr.ontimeout = () => {
                        if (attemptsLeft > 0) {
                            console.warn(`Upload timed out. Retrying... (${attemptsLeft} attempts left)`);
                            senderUploadStatusText.textContent = `Timeout. Retrying in 2 seconds...`;
                            senderUploadStatusText.style.color = "#d97706";
                            setTimeout(() => performUpload(attemptsLeft - 1), 2000);
                        } else {
                            handleUploadFailure("Upload timed out. The server took too long to respond.");
                        }
                    };

                    xhr.send(fileToUpload);
                }

                performUpload(2); // Start upload with 2 retries

            } catch (error) {
                console.error(error);
                if (typeof handleUploadFailure === 'function') {
                    handleUploadFailure("Transfer failed: " + error.message);
                } else {
                    senderUploadProgressContainer.classList.add("hidden");
                    showToast("Transfer failed: " + error.message, "error");
                }
            }
        });
    }

    // handlePeerRadarClick is deprecated. Direct transfers are managed via seeReceiversBtn and receiversList.

    function sendPinToPeer(pin, file, peer) {
        if (typeof window.sendSignalingMessage === 'function') {
            const secondsLeft = Math.max(0, Math.floor((pinExpiryTime - Date.now()) / 1000));
            const payload = {
                action: 'incoming_transfer',
                targetId: peer.id,
                pin: pin,
                fileName: file.name,
                fileSize: file.size,
                senderName: myNickname,
                expiresIn: secondsLeft
            };
            const sent = window.sendSignalingMessage(payload);
            if (sent) {
                showToast(`Notified ${peer.name} of incoming file!`, "success");
            } else {
                showToast("Signaling server disconnected. Share PIN code manually.", "error");
            }
        }
    }

    // IndexedDB helper to save received PDF transfers locally for PDF Editor
    function saveTransferredPdfToDB(fileName, fileBlob) {
        if (!fileName.toLowerCase().endsWith('.pdf')) return Promise.resolve();
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('LablazyTransfersDB', 1);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('transferred_pdfs')) {
                    db.createObjectStore('transferred_pdfs', { keyPath: 'name' });
                }
            };
            request.onsuccess = (e) => {
                const db = e.target.result;
                const transaction = db.transaction('transferred_pdfs', 'readwrite');
                const store = transaction.objectStore('transferred_pdfs');
                const putRequest = store.put({ name: fileName, blob: fileBlob });
                putRequest.onsuccess = () => resolve();
                putRequest.onerror = (err) => reject(err);
            };
            request.onerror = (err) => reject(err);
        });
    }

    // Handles download stream proxying, IndexedDB saving, tab switching, and native download
    async function downloadAndProcessFile(pin, fileName, fileSize) {
        showToast("Starting download...", "info");
        try {
            const res = await fetch(`/api/download?pin=${pin}`);
            if (!res.ok) throw new Error("Failed to download file stream from proxy.");

            const blob = await res.blob();

            // Save PDF to IndexedDB and switch view to Editor
            if (fileName.toLowerCase().endsWith('.pdf')) {
                await saveTransferredPdfToDB(fileName, blob);
                showToast(`${fileName} imported to PDF Editor!`, "success");
                
                if (typeof window.addFileToPDFEditor === 'function') {
                    const fileObj = new File([blob], fileName, { type: 'application/pdf' });
                    window.addFileToPDFEditor(fileObj);
                }

                // Automatically click the switchEditorBtn tab switcher
                setTimeout(() => {
                    const switchEditorBtn = document.getElementById('switchEditorBtn');
                    if (switchEditorBtn) switchEditorBtn.click();
                }, 1000);
            }

            // Trigger browser-native save dialog
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error(err);
            showToast(`Download failed: ${err.message}`, "error");
        }
    }

    function setupSendScreen() {
        senderTransferScreen.classList.remove('hidden');
        receiverTransferScreen.classList.add('hidden');
        if (senderUploadErrorContainer) senderUploadErrorContainer.classList.add('hidden');
        senderUploadProgressContainer.classList.remove('hidden');
        senderUploadProgressBar.style.width = "0%";
        senderUploadProgressPercent.textContent = "0%";
        senderUploadStatusText.textContent = "Initializing...";
        senderUploadStatusText.style.color = "";
        senderKeyContainer.classList.add('hidden');

        // Hide receivers container by default until clicked
        if (receiversListContainer) {
            receiversListContainer.classList.add('hidden');
        }
        if (seeReceiversBtn) {
            seeReceiversBtn.style.background = '#a855f7';
            seeReceiversBtn.style.color = 'white';
            seeReceiversBtn.style.borderColor = '#7e22ce';
            seeReceiversBtn.style.boxShadow = '4px 4px 0 #7e22ce';
        }

        renderSharingFilesList();
    }

    function renderSharingFilesList() {
        const sharingFilesSection = document.getElementById('senderSharingFilesSection');
        const sharingFilesList = document.getElementById('senderSharingFilesList');
        
        if (!sharingFilesSection || !sharingFilesList) return;
        sharingFilesList.innerHTML = '';
        
        // If we have selectedFiles (for a new upload)
        if (selectedFiles && selectedFiles.length > 0) {
            sharingFilesSection.style.display = 'block';
            selectedFiles.forEach(file => {
                const fileItem = document.createElement('div');
                fileItem.style.display = 'flex';
                fileItem.style.justifyContent = 'space-between';
                fileItem.style.alignItems = 'center';
                fileItem.style.fontSize = '0.85rem';
                fileItem.style.fontWeight = 'bold';
                fileItem.style.padding = '0.2rem 0';
                
                const nameSpan = document.createElement('span');
                nameSpan.textContent = file.name;
                nameSpan.style.whiteSpace = 'nowrap';
                nameSpan.style.overflow = 'hidden';
                nameSpan.style.textOverflow = 'ellipsis';
                nameSpan.style.marginRight = '1rem';
                nameSpan.style.flex = '1';
                
                const sizeSpan = document.createElement('span');
                sizeSpan.style.color = 'var(--text-muted)';
                sizeSpan.style.flexShrink = '0';
                sizeSpan.textContent = formatFileSize(file.size);
                
                fileItem.appendChild(nameSpan);
                fileItem.appendChild(sizeSpan);
                sharingFilesList.appendChild(fileItem);
            });
        } else {
            // If we are restoring from history, look up the files list from the cached transfer item
            let currentTransfers = [];
            try {
                currentTransfers = JSON.parse(localStorage.getItem('lablazy_active_transfers') || '[]');
            } catch (e) {}
            const activeTx = currentTransfers.find(t => t.pin === currentPin);
            if (activeTx && activeTx.files && activeTx.files.length > 0) {
                sharingFilesSection.style.display = 'block';
                activeTx.files.forEach(file => {
                    const fileItem = document.createElement('div');
                    fileItem.style.display = 'flex';
                    fileItem.style.justifyContent = 'space-between';
                    fileItem.style.alignItems = 'center';
                    fileItem.style.fontSize = '0.85rem';
                    fileItem.style.fontWeight = 'bold';
                    fileItem.style.padding = '0.2rem 0';
                    
                    const nameSpan = document.createElement('span');
                    nameSpan.textContent = file.name;
                    nameSpan.style.whiteSpace = 'nowrap';
                    nameSpan.style.overflow = 'hidden';
                    nameSpan.style.textOverflow = 'ellipsis';
                    nameSpan.style.marginRight = '1rem';
                    nameSpan.style.flex = '1';
                    
                    const sizeSpan = document.createElement('span');
                    sizeSpan.style.color = 'var(--text-muted)';
                    sizeSpan.style.flexShrink = '0';
                    sizeSpan.textContent = formatFileSize(file.size);
                    
                    fileItem.appendChild(nameSpan);
                    fileItem.appendChild(sizeSpan);
                    sharingFilesList.appendChild(fileItem);
                });
            } else if (activeTx) {
                // Backwards compatibility for single file backup
                sharingFilesSection.style.display = 'block';
                const fileItem = document.createElement('div');
                fileItem.style.display = 'flex';
                fileItem.style.justifyContent = 'space-between';
                fileItem.style.alignItems = 'center';
                fileItem.style.fontSize = '0.85rem';
                fileItem.style.fontWeight = 'bold';
                fileItem.style.padding = '0.2rem 0';
                
                const nameSpan = document.createElement('span');
                nameSpan.textContent = activeTx.fileName;
                nameSpan.style.whiteSpace = 'nowrap';
                nameSpan.style.overflow = 'hidden';
                nameSpan.style.textOverflow = 'ellipsis';
                nameSpan.style.flex = '1';
                
                fileItem.appendChild(nameSpan);
                sharingFilesList.appendChild(fileItem);
            } else {
                sharingFilesSection.style.display = 'none';
            }
        }
    }

    function setupReceiveScreen() {
        senderTransferScreen.classList.add('hidden');
        receiverTransferScreen.classList.remove('hidden');
        pinInputSection.classList.remove('hidden');
        
        // Clear cells but do not focus immediately to prevent layout auto-scroll shift
        if (typeof window.resetOtpCells === 'function') {
            window.resetOtpCells(false);
        } else {
            receiverPinInput.value = '';
        }
        
        // Focus the first cell after the slider slide transition completes
        setTimeout(() => {
            const firstCell = document.querySelector('.foc-input-cell');
            if (firstCell) {
                firstCell.focus({ preventScroll: true });
            }
        }, 650);

        receiverDownloadCard.classList.add('hidden');

        // Display current nickname and emoji above input
        const nameLabel = document.getElementById('receiverNameLabel');
        if (nameLabel) {
            nameLabel.innerHTML = `Your device name: <strong style="color: var(--accent);">${myEmoji} ${myNickname}</strong>`;
        }
    }

    // Countdown Timer Helper (Option A & B)
    function startCountdown(durationSeconds) {
        if (countdownInterval) clearInterval(countdownInterval);
        let timeRemaining = durationSeconds;
        
        function updateDisplay() {
            const minutes = Math.floor(timeRemaining / 60);
            const seconds = timeRemaining % 60;
            pinCountdown.textContent = `${minutes}:${seconds.toString().padStart(2, "0")}`;
            if (timeRemaining <= 0) {
                clearInterval(countdownInterval);
                senderKeyContainer.classList.add("hidden");
                senderUploadStatusText.textContent = "Key expired. Please go back and select files again.";
                senderUploadStatusText.style.color = "#ef4444";
                currentPin = '';
            }
            timeRemaining--;
        }
        updateDisplay();
        countdownInterval = setInterval(updateDisplay, 1000);
    }

    // Copy PIN Button Action
    if (copyPinBtn) {
        copyPinBtn.addEventListener('click', () => {
            const cleanPin = senderPinCode.textContent.replace(/\s/g, '');
            navigator.clipboard.writeText(cleanPin)
                .then(() => showToast('Key copied to clipboard!', 'success'))
                .catch(() => showToast('Failed to copy key', 'error'));
        });
    }

    // Helper to save a Blob to device disk
    function saveBlobToDisk(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            a.remove();
            URL.revokeObjectURL(url);
        }, 150);
    }

    // Reset Receiver Screen Button
    const receiverResetBtn = document.getElementById('receiverResetBtn');
    if (receiverResetBtn) {
        receiverResetBtn.addEventListener('click', () => {
            if (receiverDownloadCard) receiverDownloadCard.classList.add('hidden');
            if (pinInputSection) pinInputSection.classList.remove('hidden');
            if (typeof window.resetOtpCells === 'function') window.resetOtpCells();
            if (receiverPinInput) receiverPinInput.value = '';
        });
    }

    // Receiver Logic - Submit PIN, Stream Progress, Unpack ZIP & Present Separate Files
    if (submitPinBtn) {
        submitPinBtn.addEventListener('click', async () => {
            const enteredPin = receiverPinInput.value.replace(/\s/g, '');
            
            if (!enteredPin || !/^\d{4}$/.test(enteredPin)) {
                showToast('Please enter a valid 4-digit key.', 'error');
                return;
            }

            submitPinBtn.textContent = 'Verifying key...';
            submitPinBtn.disabled = true;

            try {
                let res = null;
                let attempts = 0;
                const maxAttempts = 6;
                
                while (attempts < maxAttempts) {
                    if (attempts > 0) {
                        submitPinBtn.textContent = `Syncing Database (${maxAttempts - attempts - 1}s)...`;
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                    
                    try {
                        res = await fetch(`/api/download?pin=${enteredPin}&metadata=true`);
                        if (res.ok) break;
                        if (res.status !== 404) break;
                    } catch (e) {
                        console.warn("Fetch metadata error, retrying...", e);
                    }
                    attempts++;
                }

                if (!res || !res.ok) {
                    if (res && res.status === 404) {
                        throw new Error("Invalid or expired key. Please check the digits and try again.");
                    } else {
                        const err = res ? await res.text().catch(() => "") : "";
                        throw new Error(err || "Failed to retrieve file details. Please check your connection.");
                    }
                }

                const { fileName, fileSize, fileCount } = await res.json();

                // Immediately switch to download card to show active progress instead of freezing on input screen
                const receiverCardHeader = document.getElementById('receiverCardHeader');
                const receiverProgressSection = document.getElementById('receiverDownloadProgressSection');
                const receiverProgressBar = document.getElementById('receiverProgressBar');
                const receiverProgressPercent = document.getElementById('receiverProgressPercent');
                const receiverProgressBytes = document.getElementById('receiverProgressBytes');
                const receiverProgressStatusText = document.getElementById('receiverProgressStatusText');

                const singleFileSection = document.getElementById('singleFileDownloadSection');
                const multiFileSection = document.getElementById('multiFileDownloadSection');
                const unpackedFileList = document.getElementById('receiverUnpackedFileList');
                const multiFileSummary = document.getElementById('multiFileSummaryText');
                const downloadAllOneByOneBtn = document.getElementById('downloadAllOneByOneBtn');
                const downloadZipPackageBtn = document.getElementById('downloadZipPackageBtn');
                const openAllPdfsBtn = document.getElementById('openAllPdfsBtn');

                if (pinInputSection) pinInputSection.classList.add('hidden');
                if (receiverDownloadCard) receiverDownloadCard.classList.remove('hidden');
                if (receiverProgressSection) receiverProgressSection.classList.remove('hidden');
                if (singleFileSection) singleFileSection.classList.add('hidden');
                if (multiFileSection) multiFileSection.classList.add('hidden');

                const totalItemsCount = fileCount || (fileName.toLowerCase().endsWith('.zip') ? 2 : 1);
                if (receiverCardHeader) {
                    receiverCardHeader.textContent = `📦 Receiving ${totalItemsCount > 1 ? `${totalItemsCount} Files` : fileName} (${formatFileSize(fileSize)})`;
                }
                if (receiverProgressBar) receiverProgressBar.style.width = "0%";
                if (receiverProgressPercent) receiverProgressPercent.textContent = "0%";
                if (receiverProgressBytes) receiverProgressBytes.textContent = `0 B / ${formatFileSize(fileSize)}`;
                if (receiverProgressStatusText) receiverProgressStatusText.textContent = "Connecting to storage...";

                // Download with real-time stream progress
                const downloadedBlob = await new Promise((resolve, reject) => {
                    const dlXhr = new XMLHttpRequest();
                    dlXhr.open("GET", `/api/download?pin=${enteredPin}`);
                    dlXhr.responseType = "blob";
                    dlXhr.timeout = 120000; // 2 minutes timeout for large packages

                    dlXhr.onprogress = (e) => {
                        const total = (e.lengthComputable && e.total > 0) ? e.total : fileSize;
                        const percent = total > 0 ? Math.min(100, Math.round((e.loaded / total) * 100)) : 50;

                        if (receiverProgressBar) receiverProgressBar.style.width = percent + "%";
                        if (receiverProgressPercent) receiverProgressPercent.textContent = percent + "%";
                        if (receiverProgressBytes) receiverProgressBytes.textContent = `${formatFileSize(e.loaded)} / ${formatFileSize(total)}`;
                        if (receiverProgressStatusText) {
                            receiverProgressStatusText.textContent = percent >= 100 
                                ? "⚡ Extracting files..." 
                                : `Downloading file (${percent}%)...`;
                        }
                    };

                    dlXhr.onload = () => {
                        if (dlXhr.status >= 200 && dlXhr.status < 300 && dlXhr.response) {
                            resolve(dlXhr.response);
                        } else {
                            reject(new Error(`Download failed with status ${dlXhr.status}`));
                        }
                    };

                    dlXhr.onerror = () => reject(new Error("Network error during file download."));
                    dlXhr.ontimeout = () => reject(new Error("Download timed out. Please retry."));
                    dlXhr.send();
                });

                let extractedFiles = [];

                // Check if file is a ZIP archive and can be unpacked client-side
                if ((fileName.toLowerCase().endsWith('.zip') || downloadedBlob.type.includes('zip')) && typeof JSZip !== 'undefined') {
                    try {
                        submitPinBtn.textContent = 'Extracting files...';
                        const zip = await JSZip.loadAsync(downloadedBlob);
                        const fileEntries = Object.entries(zip.files).filter(([_, entry]) => !entry.dir);

                        for (const [relPath, entry] of fileEntries) {
                            const entryBlob = await entry.async("blob");
                            const cleanName = relPath.split('/').pop();
                            extractedFiles.push({
                                name: cleanName,
                                size: entryBlob.size,
                                blob: entryBlob,
                                isPdf: cleanName.toLowerCase().endsWith('.pdf')
                            });
                        }
                    } catch (zipErr) {
                        console.warn("Failed to unpack zip archive:", zipErr);
                        extractedFiles = [];
                    }
                }

                // Hide in-flight download progress bar once downloaded and extracted
                if (receiverProgressSection) receiverProgressSection.classList.add('hidden');

                // If multiple files are inside the package
                if (extractedFiles.length > 1) {
                    if (singleFileSection) singleFileSection.classList.add('hidden');
                    if (multiFileSection) multiFileSection.classList.remove('hidden');
                    if (receiverCardHeader) receiverCardHeader.textContent = `📦 ${extractedFiles.length} Files Ready (${formatFileSize(downloadedBlob.size)})`;
                    if (multiFileSummary) multiFileSummary.textContent = `Package contains ${extractedFiles.length} files (${formatFileSize(downloadedBlob.size)}). Download files individually or all at once:`;
                    
                    if (unpackedFileList) {
                        unpackedFileList.innerHTML = '';
                        extractedFiles.forEach((f, idx) => {
                            const row = document.createElement('div');
                            row.style.display = 'flex';
                            row.style.justifyContent = 'space-between';
                            row.style.alignItems = 'center';
                            row.style.padding = '0.6rem 0.8rem';
                            row.style.background = 'var(--bg-color)';
                            row.style.border = '2px solid var(--border-color)';
                            row.style.borderRadius = '8px';
                            row.style.boxShadow = '2px 2px 0 var(--border-color)';

                            const infoDiv = document.createElement('div');
                            infoDiv.style.minWidth = '0';
                            infoDiv.style.flex = '1';
                            infoDiv.style.marginRight = '0.75rem';

                            const nameDiv = document.createElement('div');
                            nameDiv.style.fontWeight = '800';
                            nameDiv.style.fontSize = '0.9rem';
                            nameDiv.style.whiteSpace = 'nowrap';
                            nameDiv.style.overflow = 'hidden';
                            nameDiv.style.textOverflow = 'ellipsis';
                            nameDiv.textContent = `${f.isPdf ? '📄' : '📎'} ${f.name}`;

                            const sizeDiv = document.createElement('div');
                            sizeDiv.style.fontSize = '0.75rem';
                            sizeDiv.style.color = 'var(--text-muted)';
                            sizeDiv.textContent = formatFileSize(f.size);

                            infoDiv.appendChild(nameDiv);
                            infoDiv.appendChild(sizeDiv);

                            const btnDiv = document.createElement('div');
                            btnDiv.style.display = 'flex';
                            btnDiv.style.gap = '0.4rem';
                            btnDiv.style.flexShrink = '0';

                            const dlBtn = document.createElement('button');
                            dlBtn.className = 'brutal-btn-small';
                            dlBtn.style.background = 'var(--accent)';
                            dlBtn.style.color = '#000';
                            dlBtn.style.fontSize = '0.75rem';
                            dlBtn.style.padding = '0.35rem 0.6rem';
                            dlBtn.style.cursor = 'pointer';
                            dlBtn.style.fontWeight = '800';
                            dlBtn.textContent = '⬇️ Save';
                            dlBtn.onclick = () => {
                                saveBlobToDisk(f.blob, f.name);
                                showToast(`Downloaded ${f.name}`, "success");
                            };
                            btnDiv.appendChild(dlBtn);

                            if (f.isPdf) {
                                const editBtn = document.createElement('button');
                                editBtn.className = 'brutal-btn-small';
                                editBtn.style.background = '#10b981';
                                editBtn.style.color = '#fff';
                                editBtn.style.fontSize = '0.75rem';
                                editBtn.style.padding = '0.35rem 0.6rem';
                                editBtn.style.cursor = 'pointer';
                                editBtn.style.fontWeight = '800';
                                editBtn.textContent = '⚡ Edit';
                                editBtn.onclick = async () => {
                                    await saveTransferredPdfToDB(f.name, f.blob);
                                    if (typeof window.addFileToPDFEditor === 'function') {
                                        const fileObj = new File([f.blob], f.name, { type: 'application/pdf' });
                                        window.addFileToPDFEditor(fileObj);
                                    }
                                    showToast(`${f.name} opened in PDF Editor!`, "success");
                                    setTimeout(() => {
                                        const switchEditorBtn = document.getElementById('switchEditorBtn');
                                        if (switchEditorBtn) switchEditorBtn.click();
                                    }, 600);
                                };
                                btnDiv.appendChild(editBtn);
                            }

                            row.appendChild(infoDiv);
                            row.appendChild(btnDiv);
                            unpackedFileList.appendChild(row);
                        });
                    }

                    // Button 1: Download All One-by-One
                    if (downloadAllOneByOneBtn) {
                        downloadAllOneByOneBtn.onclick = () => {
                            extractedFiles.forEach((file, index) => {
                                setTimeout(() => {
                                    saveBlobToDisk(file.blob, file.name);
                                }, index * 300);
                            });
                            showToast(`Downloading ${extractedFiles.length} files one by one...`, "info");
                        };
                    }

                    // Button 2: Download Full ZIP Archive
                    if (downloadZipPackageBtn) {
                        downloadZipPackageBtn.onclick = () => {
                            saveBlobToDisk(downloadedBlob, fileName);
                            showToast("Full ZIP archive downloaded!", "success");
                        };
                    }

                    // Button 3: Open All PDFs in Editor (if PDFs exist)
                    const pdfFiles = extractedFiles.filter(f => f.isPdf);
                    if (openAllPdfsBtn) {
                        if (pdfFiles.length > 0) {
                            openAllPdfsBtn.classList.remove('hidden');
                            openAllPdfsBtn.onclick = async () => {
                                openAllPdfsBtn.textContent = 'Importing PDFs...';
                                for (const pdfFile of pdfFiles) {
                                    await saveTransferredPdfToDB(pdfFile.name, pdfFile.blob);
                                    if (typeof window.addFileToPDFEditor === 'function') {
                                        const fileObj = new File([pdfFile.blob], pdfFile.name, { type: 'application/pdf' });
                                        window.addFileToPDFEditor(fileObj);
                                    }
                                }
                                showToast(`Imported ${pdfFiles.length} PDFs to Editor!`, "success");
                                openAllPdfsBtn.textContent = '⚡ Open All PDFs in Editor';
                                setTimeout(() => {
                                    const switchEditorBtn = document.getElementById('switchEditorBtn');
                                    if (switchEditorBtn) switchEditorBtn.click();
                                }, 600);
                            };
                        } else {
                            openAllPdfsBtn.classList.add('hidden');
                        }
                    }

                } else {
                    // Single file display
                    const singleFile = extractedFiles.length === 1 ? extractedFiles[0] : { name: fileName, size: fileSize, blob: downloadedBlob, isPdf: fileName.toLowerCase().endsWith('.pdf') };

                    if (multiFileSection) multiFileSection.classList.add('hidden');
                    if (singleFileSection) singleFileSection.classList.remove('hidden');
                    if (receiverCardHeader) receiverCardHeader.textContent = `📦 File Ready (${formatFileSize(singleFile.size)})`;

                    downloadFileName.textContent = singleFile.name;
                    downloadFileSize.textContent = formatFileSize(singleFile.size);
                    
                    downloadFileBtn.onclick = (e) => {
                        e.preventDefault();
                        saveBlobToDisk(singleFile.blob, singleFile.name);
                        showToast(`Downloaded ${singleFile.name}!`, "success");
                    };

                    const importToEditorBtn = document.getElementById('importToEditorBtn');
                    if (importToEditorBtn) {
                        if (singleFile.isPdf) {
                            importToEditorBtn.classList.remove('hidden');
                            importToEditorBtn.onclick = async () => {
                                importToEditorBtn.textContent = 'Importing...';
                                importToEditorBtn.disabled = true;
                                try {
                                    await saveTransferredPdfToDB(singleFile.name, singleFile.blob);
                                    if (typeof window.addFileToPDFEditor === 'function') {
                                        const fileObj = new File([singleFile.blob], singleFile.name, { type: 'application/pdf' });
                                        window.addFileToPDFEditor(fileObj);
                                    }
                                    showToast(`${singleFile.name} opened in PDF Editor!`, "success");
                                    setTimeout(() => {
                                        const switchEditorBtn = document.getElementById('switchEditorBtn');
                                        if (switchEditorBtn) switchEditorBtn.click();
                                    }, 600);
                                } finally {
                                    importToEditorBtn.textContent = '⚡ Open in PDF Editor';
                                    importToEditorBtn.disabled = false;
                                }
                            };
                        } else {
                            importToEditorBtn.classList.add('hidden');
                        }
                    }
                }
                
                pinInputSection.classList.add('hidden');
                receiverDownloadCard.classList.remove('hidden');
                showToast("File received and ready!", "success");

            } catch (error) {
                console.error(error);
                showToast(error.message, "error");
                
                const boxesContainer = document.querySelector('.foc-boxes');
                if (boxesContainer) {
                    boxesContainer.classList.remove('foc-shake');
                    void boxesContainer.offsetWidth;
                    boxesContainer.classList.add('foc-shake');
                    setTimeout(() => {
                        boxesContainer.classList.remove('foc-shake');
                        if (typeof window.resetOtpCells === 'function') window.resetOtpCells();
                    }, 1200);
                }
            } finally {
                submitPinBtn.textContent = 'Receive File →';
                submitPinBtn.disabled = false;
            }
        });
    }

    // --- WebSocket Signaling Matchmaking Listeners (Direct Share Coordinates Mapping) ---
    window.onSignalingMessage = (payload) => {
        if (!systemAvailable) return;

        if (payload.action === 'local-join-complete') {
            myPeerId = payload.id;
            myNickname = payload.name;
            myEmoji = payload.emoji;
            myRoomDisplay = payload.room;
            
            if (sharedropRoomDisplay) {
                sharedropRoomDisplay.textContent = myRoomDisplay;
            }

            // Announce presence to other room members
            if (typeof window.sendSignalingMessage === 'function') {
                window.sendSignalingMessage({
                    action: 'announce-presence',
                    id: myPeerId,
                    name: myNickname,
                    emoji: myEmoji,
                    role: currentRole
                });
            }
        }

        else if (payload.action === 'announce-presence') {
            // Add peer if it's not us
            if (payload.id !== myPeerId) {
                addPeer(payload);
                // Reply with our presence directly
                if (typeof window.sendSignalingMessage === 'function') {
                    window.sendSignalingMessage({
                        action: 'presence-reply',
                        targetId: payload.id,
                        id: myPeerId,
                        name: myNickname,
                        emoji: myEmoji,
                        role: currentRole
                    });
                }
            }
        }

        else if (payload.action === 'presence-reply') {
            // Add peer if targeted to us
            if (payload.targetId === myPeerId && payload.id !== myPeerId) {
                addPeer(payload);
            }
        }

        else if (payload.action === 'leave') {
            // Remove peer
            peers = peers.filter(p => p.id !== payload.id);
            renderReceiversList();
        }

        else if (payload.action === 'role-update') {
            let peer = peers.find(p => p.id === payload.id);
            if (peer) {
                peer.role = payload.role;
            } else {
                addPeer(payload);
            }
            renderReceiversList();
        }

        else if (payload.action === 'incoming_transfer') {
            // Check if targeted to us
            if (payload.targetId === myPeerId) {
                showIncomingAlert(payload);
            }
        }

        else if (payload.action === 'connection-state-change') {
            updateConnectionUI(payload.connected);
        }
    };

    function addPeer(peer) {
        let existing = peers.find(p => p.id === peer.id);
        if (existing) {
            existing.role = peer.role || existing.role;
            existing.name = peer.name || existing.name;
            existing.emoji = peer.emoji || existing.emoji;
            renderReceiversList();
            return;
        }
        peers.push(peer);
        renderReceiversList();
    }

    function renderReceiversList() {
        if (!receiversList) return;
        
        // Find classmates in receiver mode
        const receivers = peers.filter(p => p.role === 'receiver');
        
        // Update count indicator
        if (activeReceiversCount) {
            activeReceiversCount.textContent = receivers.length;
        }
        
        // Clear list
        receiversList.innerHTML = '';
        
        if (receivers.length === 0) {
            if (receiversListEmpty) {
                receiversListEmpty.classList.remove('hidden');
                
                // Show room mismatch help tip if they are alone in a custom room
                const isCustomRoom = myRoomDisplay && myRoomDisplay.toUpperCase() !== 'LOBBY';
                if (isCustomRoom && peers.length === 0) {
                    receiversListEmpty.innerHTML = `
                        <p style="margin-bottom: 0.5rem;">No active receivers found in this room.</p>
                        <div style="background: rgba(234, 179, 8, 0.15); border: 2px solid #ca8a04; color: #854d0e; padding: 0.75rem; border-radius: 8px; font-size: 0.85rem; font-weight: 600; text-align: left; line-height: 1.4; margin-top: 0.75rem;">
                            💡 <strong>Tip:</strong> You are currently alone in this room. Make sure your classmate entered the exact same room code: <strong style="color: #ca8a04;">"${myRoomDisplay}"</strong>.
                        </div>
                    `;
                } else {
                    receiversListEmpty.innerHTML = `No active receivers found in this room. Make sure other devices are in <strong>Receive Mode</strong>.`;
                }
            }
            return;
        }
        
        if (receiversListEmpty) receiversListEmpty.classList.add('hidden');
        
        receivers.forEach(peer => {
            const item = document.createElement('div');
            item.className = 'receiver-item';
            item.style.display = 'flex';
            item.style.justifyContent = 'space-between';
            item.style.alignItems = 'center';
            item.style.padding = '0.75rem 1rem';
            item.style.border = '2px solid var(--border-color)';
            item.style.borderRadius = '8px';
            item.style.background = 'var(--card-bg)';
            item.style.boxShadow = '2px 2px 0 var(--border-color)';
            
            const details = document.createElement('div');
            details.style.display = 'flex';
            details.style.alignItems = 'center';
            details.style.gap = '0.5rem';
            details.style.minWidth = '0';
            
            const emojiSpan = document.createElement('span');
            emojiSpan.style.fontSize = '1.5rem';
            emojiSpan.textContent = peer.emoji || '🐱';
            
            const nameSpan = document.createElement('strong');
            nameSpan.style.whiteSpace = 'nowrap';
            nameSpan.style.overflow = 'hidden';
            nameSpan.style.textOverflow = 'ellipsis';
            nameSpan.textContent = peer.name;
            
            details.appendChild(emojiSpan);
            details.appendChild(nameSpan);
            
            const shareBtn = document.createElement('button');
            shareBtn.className = 'brutal-btn-small';
            shareBtn.style.background = 'var(--accent)';
            shareBtn.style.color = '#000';
            shareBtn.style.fontWeight = 'bold';
            shareBtn.style.cursor = 'pointer';
            shareBtn.style.padding = '0.4rem 0.8rem';
            shareBtn.style.boxShadow = '2px 2px 0 var(--border-color)';
            shareBtn.textContent = '⚡ Transfer';
            
            shareBtn.addEventListener('click', () => {
                if (!currentPin || Date.now() >= pinExpiryTime) {
                    showToast('Please wait for your file to upload and generate a key first!', 'error');
                    return;
                }
                
                let fileToUpload = null;
                if (selectedFiles.length > 1) {
                    fileToUpload = { name: selectedFiles.length + " files.zip", size: selectedFiles.reduce((sum, f) => sum + f.size, 0) };
                } else if (selectedFiles.length === 1) {
                    fileToUpload = selectedFiles[0];
                } else {
                    showToast('Please select file(s) on the left panel first!', 'error');
                    return;
                }
                
                sendPinToPeer(currentPin, fileToUpload, peer);
            });
            
            item.appendChild(details);
            item.appendChild(shareBtn);
            receiversList.appendChild(item);
        });
    }

    function showIncomingAlert(transfer) {
        if (!incomingTransferModal) return;

        incomingSenderName.textContent = transfer.senderName;
        incomingFileName.textContent = transfer.fileName;
        incomingFileSize.textContent = formatFileSize(transfer.fileSize);

        incomingTransferModal.classList.remove('hidden');

        // Start incoming synchronized countdown
        if (incomingCountdownInterval) clearInterval(incomingCountdownInterval);
        let timeRemaining = transfer.expiresIn;

        function updateIncomingCountdown() {
            const minutes = Math.floor(timeRemaining / 60);
            const seconds = timeRemaining % 60;
            incomingCountdown.textContent = `${minutes}:${seconds.toString().padStart(2, "0")}`;
            if (timeRemaining <= 0) {
                clearInterval(incomingCountdownInterval);
                incomingTransferModal.classList.add('hidden');
                showToast("Incoming transfer request expired.", "error");
            }
            timeRemaining--;
        }
        updateIncomingCountdown();
        incomingCountdownInterval = setInterval(updateIncomingCountdown, 1000);

        // Bind modal buttons
        acceptTransferBtn.onclick = async () => {
            clearInterval(incomingCountdownInterval);
            incomingTransferModal.classList.add('hidden');

            // Automatically download, save to IndexedDB if PDF, and switch tabs
            await downloadAndProcessFile(transfer.pin, transfer.fileName, transfer.fileSize);
        };

        declineTransferBtn.onclick = () => {
            clearInterval(incomingCountdownInterval);
            incomingTransferModal.classList.add('hidden');
            showToast("Transfer request declined.", "info");
        };
    }

    // Reset to role-select when leaving ShareDrop
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash || '#editor';
        if (hash === '#editor') {
            showScreen('role-select');
        }
    });

    // Check if the chat module is already connected to handle race conditions
    if (window.chatState && window.chatState.isConnected) {
        window.onSignalingMessage({
            action: 'local-join-complete',
            id: window.chatState.myPeerId,
            name: window.chatState.myNickname,
            emoji: window.chatState.myEmoji,
            room: window.chatState.myRoomDisplay
        });
    }
});
