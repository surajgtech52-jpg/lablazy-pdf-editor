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
                updateConnectionUI(true);
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
            // Manual PIN transfers remain available without live presence.
            rolesGrid.classList.remove('hidden');
            connectionNoticeBoard.classList.remove('hidden');
            
            if (connectionNoticeBoard.firstElementChild) {
                connectionNoticeBoard.firstElementChild.style.background = '#fef08a'; // light yellow
                connectionNoticeBoard.firstElementChild.style.color = '#854d0e'; // dark yellow
                connectionNoticeBoard.firstElementChild.style.borderColor = '#ca8a04'; // gold border
                connectionNoticeBoard.firstElementChild.style.boxShadow = '6px 6px 0 #eab308';
            }
            
            if (connectionNoticeText) {
                connectionNoticeText.innerHTML = "ℹ️ Live receiver discovery is disabled. Share the generated <strong>Manual 4-Digit Key</strong> with the receiving device.";
            }
        } else {
            // Everything is healthy
            rolesGrid.classList.remove('hidden');
            connectionNoticeBoard.classList.add('hidden');
            
        }
    }

    // Initialize health and connection checks
    checkSystemHealth();
    updateConnectionUI(false);

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
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    if (submitPinBtn && !submitPinBtn.disabled) {
                        submitPinBtn.click();
                    }
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

    if (pinInputSection) {
        pinInputSection.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target !== submitPinBtn) {
                e.preventDefault();
                if (submitPinBtn && !submitPinBtn.disabled) {
                    submitPinBtn.click();
                }
            }
        });
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

    // Navigation Screens
    function showScreen(screenId) {
        if (!systemAvailable && screenId !== 'role-select') return;
        
        // Reset scrollLeft to prevent browser focus auto-scroll bugs
        const sliderContainer = document.querySelector('.views-slider-container');
        if (sliderContainer) {
            sliderContainer.scrollLeft = 0;
        }

        const resultsSection = document.getElementById('resultsSection');
        if (resultsSection) resultsSection.classList.add('hidden');

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
        });
    });
    chooseReceiveRoleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (!systemAvailable) return;
            currentRole = 'receiver';
            showScreen('radar');
            setupReceiveScreen();
        });
    });
    if (uploadBackBtn) {
        uploadBackBtn.addEventListener('click', () => {
            currentRole = 'idle';
            showScreen('role-select');
        });
    }
    if (radarBackBtn) {
        radarBackBtn.addEventListener('click', () => {
            if (countdownInterval) clearInterval(countdownInterval);
            currentRole = 'idle';
            showScreen('role-select');
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
        sharedropDropZone.addEventListener('drop', async (e) => {
            e.preventDefault();
            sharedropDropZone.classList.remove('dragover');
            if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                await processFiles(Array.from(e.dataTransfer.files));
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
        sharedropFileInput.addEventListener('change', async (e) => {
            if (e.target.files && e.target.files.length > 0) {
                await processFiles(Array.from(e.target.files));
                e.target.value = ''; // Reset input so user can pick more or re-select
            }
        });
    }

    async function processFiles(files) {
        const validFiles = files.filter(f => f && f.size > 0);
        if (validFiles.length === 0) return;

        for (const file of validFiles) {
            try {
                let buffer;
                if (file.data instanceof ArrayBuffer) {
                    buffer = file.data;
                } else if (typeof file.arrayBuffer === 'function') {
                    buffer = await file.arrayBuffer();
                } else {
                    buffer = await new Response(file).arrayBuffer();
                }

                selectedFiles.push({
                    name: file.name,
                    size: buffer.byteLength,
                    type: file.type || 'application/octet-stream',
                    data: buffer
                });
            } catch (err) {
                console.error("Error reading file into memory:", file.name, err);
                showToast(`Could not read ${file.name}: ${err.message}`, "error");
            }
        }
        updateFileListUI();
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

        const nameLabel = document.getElementById('receiverNameLabel');
        if (nameLabel) {
            nameLabel.textContent = 'Enter the 4-digit key shared by the sender.';
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

    // Sender logic - Multi-File Manifest Pipeline (Zero Zipping Overhead, Infinite File Stability)
    if (proceedToSendBtn) {
        proceedToSendBtn.addEventListener('click', async () => {
            if (selectedFiles.length === 0) {
                showToast('Please select files first.', 'error');
                return;
            }

            showScreen('radar');
            setupSendScreen();

            const totalBatchSize = selectedFiles.reduce((acc, f) => acc + (f.size || 0), 0);

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
                            senderUploadStatusText.textContent = "Restarting transfer...";
                            startManifestUpload();
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

            async function startManifestUpload() {
                try {
                    senderUploadStatusText.textContent = "Initializing secure transfer session...";
                    senderUploadStatusText.style.color = "";
                    if (senderUploadErrorContainer) senderUploadErrorContainer.classList.add("hidden");

                    // 1. Initialize Transfer Session to immediately obtain 4-digit PIN
                    const initRes = await fetch("/api/upload?action=init-session", {
                        method: "POST",
                        headers: {
                            "x-file-count": selectedFiles.length.toString(),
                            "x-total-size": totalBatchSize.toString()
                        }
                    });

                    if (!initRes.ok) {
                        const err = await initRes.text().catch(() => "");
                        throw new Error(err || "Failed to initialize upload session.");
                    }

                    const { pin, expiresAt } = await initRes.json();
                    currentPin = pin;
                    pinExpiryTime = expiresAt || (Date.now() + 600 * 1000);

                    // Ensure PIN card stays hidden until 100% completion
                    senderKeyContainer.classList.add("hidden");
                    senderUploadProgressContainer.classList.remove("hidden");

                    const senderUploadBytesText = document.getElementById('senderUploadBytesText');
                    const senderUploadFileName = document.getElementById('senderUploadFileName');

                    // 2. Stream upload each file sequentially (Zero client-side ZIP memory crash)
                    let uploadedBytes = 0;
                    let maxObservedPercent = 0;

                    for (let i = 0; i < selectedFiles.length; i++) {
                        const file = selectedFiles[i];
                        let attempts = 0;
                        let success = false;

                        if (senderUploadStatusText) {
                            senderUploadStatusText.textContent = `Uploading file ${i + 1} of ${selectedFiles.length}`;
                        }
                        if (senderUploadFileName) {
                            senderUploadFileName.textContent = `📄 ${file.name}`;
                            senderUploadFileName.title = file.name;
                        }

                        while (!success && attempts < 3) {
                            if (attempts > 0) {
                                if (senderUploadStatusText) {
                                    senderUploadStatusText.textContent = `Retrying file ${i + 1} (${attempts}/3)...`;
                                }
                                await new Promise(r => setTimeout(r, 1500));
                            }

                            try {
                                await new Promise((resolve, reject) => {
                                    const xhr = new XMLHttpRequest();
                                    xhr.open("POST", `/api/upload?action=upload-file&pin=${pin}&fileIndex=${i}`);
                                    xhr.setRequestHeader("x-file-name", encodeURIComponent(file.name));
                                    xhr.setRequestHeader("x-file-size", file.size.toString());
                                    xhr.setRequestHeader("x-file-type", file.type || "application/octet-stream");
                                    xhr.timeout = 120000;

                                    xhr.upload.onprogress = (e) => {
                                        const loadedForThisFile = (e.lengthComputable && e.loaded) ? e.loaded : 0;
                                        const currentTotalLoaded = Math.min(totalBatchSize, uploadedBytes + loadedForThisFile);
                                        const rawPercent = totalBatchSize > 0 ? (currentTotalLoaded / totalBatchSize) * 100 : 0;

                                        // Strictly monotonic: Never decrease percentage value
                                        const percent = Math.min(99, Math.max(maxObservedPercent, Math.round(rawPercent)));
                                        maxObservedPercent = percent;

                                        senderUploadProgressBar.style.width = percent + "%";
                                        senderUploadProgressPercent.textContent = percent + "%";
                                        if (senderUploadBytesText) {
                                            senderUploadBytesText.textContent = `${formatFileSize(currentTotalLoaded)} / ${formatFileSize(totalBatchSize)}`;
                                        }
                                    };

                                    xhr.onload = () => {
                                        if (xhr.status >= 200 && xhr.status < 300) {
                                            resolve();
                                        } else {
                                            reject(new Error(xhr.responseText || `Status ${xhr.status}`));
                                        }
                                    };
                                    xhr.onerror = () => reject(new Error("Network error"));
                                    xhr.ontimeout = () => reject(new Error("Timeout"));

                                    xhr.send(file.data || file);
                                });

                                uploadedBytes += file.size;
                                const fileDonePercent = totalBatchSize > 0 ? (uploadedBytes / totalBatchSize) * 100 : 0;
                                maxObservedPercent = Math.min(99, Math.max(maxObservedPercent, Math.round(fileDonePercent)));
                                senderUploadProgressBar.style.width = maxObservedPercent + "%";
                                senderUploadProgressPercent.textContent = maxObservedPercent + "%";
                                if (senderUploadBytesText) {
                                    senderUploadBytesText.textContent = `${formatFileSize(uploadedBytes)} / ${formatFileSize(totalBatchSize)}`;
                                }

                                success = true;
                            } catch (err) {
                                console.warn(`Error uploading file ${file.name}:`, err);
                                attempts++;
                                if (attempts >= 3) {
                                    throw new Error(`Failed to upload ${file.name}: ${err.message}`);
                                }
                            }
                        }
                    }

                    // 3. Finalize Transfer Session
                    if (senderUploadStatusText) senderUploadStatusText.textContent = "Finalizing package in storage...";
                    if (senderUploadFileName) senderUploadFileName.textContent = "⚡ Securing files...";
                    await fetch(`/api/upload?action=finalize-session&pin=${pin}`, { method: "POST" });

                    senderUploadProgressBar.style.width = "100%";
                    senderUploadProgressPercent.textContent = "100%";
                    senderUploadProgressContainer.classList.add("hidden");
                    if (senderUploadErrorContainer) senderUploadErrorContainer.classList.add("hidden");

                    // Show the 4-digit PIN ONLY now that 100% upload is complete!
                    senderPinCode.textContent = pin;
                    senderKeyContainer.classList.remove("hidden");
                    startCountdown(600);

                    // Cache active transfer to history array
                    let currentTransfers = [];
                    try {
                        currentTransfers = JSON.parse(localStorage.getItem('lablazy_active_transfers') || '[]');
                    } catch (e) {}

                    const fileList = selectedFiles.map(f => ({ name: f.name, size: f.size }));
                    currentTransfers.push({
                        pin: pin,
                        fileName: selectedFiles.length > 1 ? `${selectedFiles.length} files` : selectedFiles[0].name,
                        files: fileList,
                        expiryTime: pinExpiryTime
                    });
                    localStorage.setItem('lablazy_active_transfers', JSON.stringify(currentTransfers));
                    checkActiveTransferHistory();

                    showToast(`All ${selectedFiles.length} files uploaded successfully!`, "success");

                } catch (error) {
                    console.error("Manifest upload error:", error);
                    handleUploadFailure(error.message);
                }
            }

            startManifestUpload();
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

    // Receiver Logic - Query Manifest & Stream Individual/Batch Files
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

                const manifest = await res.json();
                let filesList = manifest.files && manifest.files.length > 0 
                    ? manifest.files 
                    : [{ index: 0, name: manifest.fileName || "downloaded_file", size: manifest.fileSize || 0, type: manifest.fileType }];
                let totalPackageSize = manifest.totalSize || filesList.reduce((acc, f) => acc + (f.size || 0), 0);

                const receiverCardHeader = document.getElementById('receiverCardHeader');
                const receiverProgressSection = document.getElementById('receiverDownloadProgressSection');
                const singleFileSection = document.getElementById('singleFileDownloadSection');
                const multiFileSection = document.getElementById('multiFileDownloadSection');
                const unpackedFileList = document.getElementById('receiverUnpackedFileList');
                const multiFileSummary = document.getElementById('multiFileSummaryText');
                const downloadAllOneByOneBtn = document.getElementById('downloadAllOneByOneBtn');
                const downloadZipPackageBtn = document.getElementById('downloadZipPackageBtn');
                const openAllPdfsBtn = document.getElementById('openAllPdfsBtn');

                if (pinInputSection) pinInputSection.classList.add('hidden');
                if (receiverDownloadCard) receiverDownloadCard.classList.remove('hidden');

                // Check if it's a single ZIP file that should be unpacked into individual files
                let cachedZipBlob = null;
                if (filesList.length === 1 && (filesList[0].name || '').toLowerCase().endsWith('.zip')) {
                    if (receiverProgressSection) receiverProgressSection.classList.remove('hidden');
                    const receiverProgressStatusText = document.getElementById('receiverProgressStatusText');
                    if (receiverProgressStatusText) receiverProgressStatusText.textContent = "Extracting ZIP archive...";

                    try {
                        const zipRes = await fetch(`/api/download?pin=${enteredPin}&fileIndex=0`);
                        cachedZipBlob = await zipRes.blob();

                        if (typeof JSZip !== 'undefined') {
                            const zip = await JSZip.loadAsync(cachedZipBlob);
                            const zipEntries = Object.entries(zip.files).filter(([_, entry]) => !entry.dir);

                            if (zipEntries.length > 0) {
                                const unpacked = [];
                                for (let i = 0; i < zipEntries.length; i++) {
                                    const [relPath, entry] = zipEntries[i];
                                    const entryBlob = await entry.async("blob");
                                    const cleanName = relPath.split('/').pop();
                                    unpacked.push({
                                        index: i,
                                        name: cleanName,
                                        size: entryBlob.size,
                                        type: cleanName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
                                        blob: entryBlob
                                    });
                                }
                                filesList = unpacked;
                                totalPackageSize = filesList.reduce((acc, f) => acc + f.size, 0);
                            }
                        }
                    } catch (zipErr) {
                        console.warn("Could not unpack zip:", zipErr);
                    }
                }

                if (receiverProgressSection) receiverProgressSection.classList.add('hidden');

                // Helper to get Blob for a file item (either cached from unpacked zip or fetched from server)
                async function getFileBlob(fileItem) {
                    if (fileItem.blob) return fileItem.blob;
                    const fileRes = await fetch(`/api/download?pin=${enteredPin}&fileIndex=${fileItem.index}`);
                    if (!fileRes.ok) throw new Error(`HTTP ${fileRes.status}`);
                    return await fileRes.blob();
                }

                // If multiple files are present
                if (filesList.length > 1) {
                    if (singleFileSection) singleFileSection.classList.add('hidden');
                    if (multiFileSection) multiFileSection.classList.remove('hidden');
                    if (receiverCardHeader) receiverCardHeader.textContent = `📦 ${filesList.length} Files Ready (${formatFileSize(totalPackageSize)})`;
                    if (multiFileSummary) multiFileSummary.textContent = `Package contains ${filesList.length} files (${formatFileSize(totalPackageSize)}). Download files individually or all at once:`;

                    if (unpackedFileList) {
                        unpackedFileList.innerHTML = '';
                        filesList.forEach((f) => {
                            const isPdf = (f.name || '').toLowerCase().endsWith('.pdf');
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
                            nameDiv.textContent = `${isPdf ? '📄' : '📎'} ${f.name}`;

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
                            dlBtn.onclick = async () => {
                                dlBtn.textContent = '...';
                                try {
                                    const blob = await getFileBlob(f);
                                    saveBlobToDisk(blob, f.name);
                                    showToast(`Downloaded ${f.name}`, "success");
                                } catch (e) {
                                    showToast(`Download failed: ${e.message}`, "error");
                                } finally {
                                    dlBtn.textContent = '⬇️ Save';
                                }
                            };
                            btnDiv.appendChild(dlBtn);

                            if (isPdf) {
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
                                    editBtn.textContent = '...';
                                    try {
                                        const blob = await getFileBlob(f);
                                        await saveTransferredPdfToDB(f.name, blob);
                                        if (typeof window.addFileToPDFEditor === 'function') {
                                            const fileObj = new File([blob], f.name, { type: 'application/pdf' });
                                            window.addFileToPDFEditor(fileObj);
                                        }
                                        showToast(`${f.name} opened in PDF Editor!`, "success");
                                        setTimeout(() => {
                                            const switchEditorBtn = document.getElementById('switchEditorBtn');
                                            if (switchEditorBtn) switchEditorBtn.click();
                                        }, 600);
                                    } catch (e) {
                                        showToast(`Failed to open PDF: ${e.message}`, "error");
                                    } finally {
                                        editBtn.textContent = '⚡ Edit';
                                    }
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
                        downloadAllOneByOneBtn.onclick = async () => {
                            downloadAllOneByOneBtn.disabled = true;
                            downloadAllOneByOneBtn.textContent = `Downloading 0 / ${filesList.length}...`;
                            showToast(`Starting sequential downloads for ${filesList.length} files...`, "info");

                            for (let i = 0; i < filesList.length; i++) {
                                const f = filesList[i];
                                downloadAllOneByOneBtn.textContent = `Downloading ${i + 1} / ${filesList.length}...`;
                                try {
                                    const blob = await getFileBlob(f);
                                    saveBlobToDisk(blob, f.name);
                                } catch (e) {
                                    console.error(`Failed to download ${f.name}:`, e);
                                }
                                await new Promise(r => setTimeout(r, 350));
                            }

                            downloadAllOneByOneBtn.disabled = false;
                            downloadAllOneByOneBtn.textContent = "⚡ Download All (One by One)";
                            showToast("All files downloaded!", "success");
                        };
                    }

                    // Button 2: Download Full ZIP Archive
                    if (downloadZipPackageBtn) {
                        downloadZipPackageBtn.onclick = async () => {
                            if (cachedZipBlob) {
                                saveBlobToDisk(cachedZipBlob, `sharedrop_package_${enteredPin}.zip`);
                                showToast("ZIP archive downloaded!", "success");
                                return;
                            }

                            downloadZipPackageBtn.disabled = true;
                            downloadZipPackageBtn.textContent = "📦 Creating ZIP archive...";
                            showToast("Fetching files to build ZIP package...", "info");

                            try {
                                if (typeof JSZip === 'undefined') throw new Error("JSZip library not available.");
                                const zip = new JSZip();

                                for (let i = 0; i < filesList.length; i++) {
                                    const f = filesList[i];
                                    downloadZipPackageBtn.textContent = `Packaging ${i + 1} of ${filesList.length}...`;
                                    const blob = await getFileBlob(f);
                                    zip.file(f.name, blob);
                                }

                                const zipBlob = await zip.generateAsync({ type: "blob", compression: "STORE" });
                                saveBlobToDisk(zipBlob, `sharedrop_package_${enteredPin}.zip`);
                                showToast("ZIP archive downloaded!", "success");
                            } catch (zipErr) {
                                console.error("Failed to build ZIP:", zipErr);
                                showToast(`Failed to build ZIP: ${zipErr.message}`, "error");
                            } finally {
                                downloadZipPackageBtn.disabled = false;
                                downloadZipPackageBtn.textContent = "📦 Download Full ZIP Archive";
                            }
                        };
                    }

                    // Button 3: Open All PDFs in Editor
                    const pdfFiles = filesList.filter(f => (f.name || '').toLowerCase().endsWith('.pdf'));
                    if (openAllPdfsBtn) {
                        if (pdfFiles.length > 0) {
                            openAllPdfsBtn.classList.remove('hidden');
                            openAllPdfsBtn.onclick = async () => {
                                openAllPdfsBtn.textContent = 'Importing PDFs...';
                                for (const pdfFile of pdfFiles) {
                                    try {
                                        const blob = await getFileBlob(pdfFile);
                                        await saveTransferredPdfToDB(pdfFile.name, blob);
                                        if (typeof window.addFileToPDFEditor === 'function') {
                                            const fileObj = new File([blob], pdfFile.name, { type: 'application/pdf' });
                                            window.addFileToPDFEditor(fileObj);
                                        }
                                    } catch (e) {
                                        console.error("PDF import error:", e);
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
                    // Single non-zip file display
                    const singleFile = filesList[0];

                    if (multiFileSection) multiFileSection.classList.add('hidden');
                    if (singleFileSection) singleFileSection.classList.remove('hidden');
                    if (receiverCardHeader) receiverCardHeader.textContent = `📦 File Ready (${formatFileSize(singleFile.size)})`;

                    downloadFileName.textContent = singleFile.name;
                    downloadFileSize.textContent = formatFileSize(singleFile.size);

                    const isPdf = (singleFile.name || '').toLowerCase().endsWith('.pdf');

                    downloadFileBtn.onclick = async (e) => {
                        e.preventDefault();
                        downloadFileBtn.textContent = 'Downloading...';
                        try {
                            const blob = await getFileBlob(singleFile);
                            saveBlobToDisk(blob, singleFile.name);
                            showToast(`Downloaded ${singleFile.name}!`, "success");
                        } catch (err) {
                            showToast(`Download failed: ${err.message}`, "error");
                        } finally {
                            downloadFileBtn.textContent = '📥 Save to Device';
                        }
                    };

                    const importToEditorBtn = document.getElementById('importToEditorBtn');
                    if (importToEditorBtn) {
                        if (isPdf) {
                            importToEditorBtn.classList.remove('hidden');
                            importToEditorBtn.onclick = async () => {
                                importToEditorBtn.textContent = 'Importing...';
                                importToEditorBtn.disabled = true;
                                try {
                                    const blob = await getFileBlob(singleFile);
                                    await saveTransferredPdfToDB(singleFile.name, blob);
                                    if (typeof window.addFileToPDFEditor === 'function') {
                                        const fileObj = new File([blob], singleFile.name, { type: 'application/pdf' });
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
                showToast("Files retrieved successfully!", "success");

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

});
