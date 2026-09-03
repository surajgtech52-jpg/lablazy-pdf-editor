document.addEventListener('DOMContentLoaded', () => {

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }



    // ==============================
    // MOUSE-TRACKING 3D TILT ON CARDS
    // ==============================
    const tiltCards = document.querySelectorAll('.card:not(.card-morph-back), .upload-area');
    tiltCards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = (y - centerY) / centerY * -4;
            const rotateY = (x - centerX) / centerX * 4;
            card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
        });
    });
    // ==========================================
    // DAY/NIGHT THEME TOGGLE WITH CIRCULAR BALL RIPPLE EXPANSION
    // ==========================================
    const themeInput = document.getElementById('themeInput');
    const themeToggle = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('lablazy-theme');
    
    // Initial theme setup
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        if (themeInput) themeInput.checked = true;
    } else {
        document.body.classList.remove('dark-mode');
        if (themeInput) themeInput.checked = false;
    }

    function triggerCircularThemeTransition(e) {
        const isChecked = themeInput ? themeInput.checked : document.body.classList.contains('dark-mode');
        
        // 1. Origin fixed at the exact center of the theme toggle button
        const toggleBtn = document.getElementById('themeToggle') || document.querySelector('.tts-switch');
        let startX = window.innerWidth - 60;
        let startY = 35;

        if (toggleBtn) {
            const rect = toggleBtn.getBoundingClientRect();
            startX = rect.left + rect.width / 2;
            startY = rect.top + rect.height / 2;
        } else if (e) {
            startX = e.clientX || startX;
            startY = e.clientY || startY;
        }

        // Distance to furthest screen corner from the toggle button (+ 5% buffer for seamless corner finish)
        const maxCornerDistance = Math.hypot(
            Math.max(startX, window.innerWidth - startX),
            Math.max(startY, window.innerHeight - startY)
        );
        const endRadius = Math.ceil(maxCornerDistance * 1.05);

        const updateThemeState = () => {
            if (isChecked) {
                document.body.classList.add('dark-mode');
                localStorage.setItem('lablazy-theme', 'dark');
            } else {
                document.body.classList.remove('dark-mode');
                localStorage.setItem('lablazy-theme', 'light');
            }
        };

        // 2. View Transitions API (Continuous, fluid circle expansion to all corners)
        if (document.startViewTransition) {
            const transition = document.startViewTransition(() => {
                updateThemeState();
            });

            transition.ready.then(() => {
                const clipPathAnimation = [
                    `circle(0px at ${startX}px ${startY}px)`,
                    `circle(${endRadius}px at ${startX}px ${startY}px)`
                ];

                document.documentElement.animate(
                    {
                        clipPath: clipPathAnimation
                    },
                    {
                        duration: 1400,
                        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                        pseudoElement: '::view-transition-new(root)'
                    }
                );
            });
        } else {
            // 3. High-performance Fallback Overlay for unsupported browsers
            const overlay = document.createElement('div');
            overlay.style.position = 'fixed';
            overlay.style.inset = '0';
            overlay.style.zIndex = '9999';
            overlay.style.pointerEvents = 'none';
            overlay.style.backgroundColor = isChecked ? '#06050a' : '#f4f4f5';
            overlay.style.clipPath = `circle(0px at ${startX}px ${startY}px)`;
            overlay.style.transition = 'clip-path 1.4s cubic-bezier(0.4, 0, 0.2, 1)';
            document.body.appendChild(overlay);

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    overlay.style.clipPath = `circle(${endRadius}px at ${startX}px ${startY}px)`;
                });
            });

            setTimeout(() => {
                updateThemeState();
                overlay.remove();
            }, 1380);
        }
    }

    if (themeInput) {
        themeInput.addEventListener('change', (e) => {
            triggerCircularThemeTransition(e);
        });
    }

    // Scroll Progress
    const scrollProgress = document.getElementById('scrollProgress');
    if (scrollProgress) {
        window.addEventListener('scroll', () => {
            const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrolled = (winScroll / height) * 100;
            scrollProgress.style.width = scrolled + '%';
        });
    }
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');
    const processBtn = document.getElementById('processBtn');
    const fileCountPill = document.getElementById('fileCountPill');
    const fileListHeader = document.getElementById('fileListHeader');
    const removeAllBtn = document.getElementById('removeAllBtn');
    
    const studentNameInput = document.getElementById('studentName');
    const moodleIdInput = document.getElementById('moodleId');
    const rollNoInput = document.getElementById('rollNo');
    const divisionInput = document.getElementById('division');
    const subjectNameInput = document.getElementById('subjectName');
    const instructorNameInput = document.getElementById('instructorName');
    const datePerformanceInput = document.getElementById('datePerformance');
    const dateSubmissionInput = document.getElementById('dateSubmission');
    const experimentNoInput = document.getElementById('experimentNo');
    
    const modeSwitch = document.getElementById('modeSwitch');
    const inputGrid = document.querySelector('.input-grid');
    
    const resultsSection = document.getElementById('resultsSection');
    const processedList = document.getElementById('processedList');

    if (modeSwitch) {
        modeSwitch.addEventListener('change', (e) => {
            if (!e.target.checked) {
                inputGrid.classList.add('normal-mode');
            } else {
                inputGrid.classList.remove('normal-mode');
            }
            sessionStorage.setItem('pdf_editor_modeSwitch', e.target.checked);
        });
        
        const cachedMode = sessionStorage.getItem('pdf_editor_modeSwitch');
        if (cachedMode !== null) {
            modeSwitch.checked = cachedMode === 'true';
        }
        
        if (!modeSwitch.checked) {
            inputGrid.classList.add('normal-mode');
        } else {
            inputGrid.classList.remove('normal-mode');
        }
    }

    // Cache PDF Editor form fields in sessionStorage
    const inputsToCache = [
        studentNameInput, moodleIdInput, rollNoInput, divisionInput,
        subjectNameInput, instructorNameInput, datePerformanceInput,
        dateSubmissionInput, experimentNoInput
    ];
    
    inputsToCache.forEach(input => {
        if (!input) return;
        const cachedValue = sessionStorage.getItem(`pdf_editor_${input.id}`);
        if (cachedValue !== null) {
            input.value = cachedValue;
        }
        input.addEventListener('input', () => {
            sessionStorage.setItem(`pdf_editor_${input.id}`, input.value);
        });
    });

    let files = [];

    // ==========================================
    // INDEXEDDB CONSUMER FOR TRANSFERRED PDFS
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

    // Check for transferred PDFs from ShareDrop on startup
    getTransferredPDFs().then(items => {
        if (items && items.length > 0) {
            const loadedFiles = items.map(item => {
                return new File([item.blob], item.name, { type: 'application/pdf' });
            });
            
            files = [...files, ...loadedFiles];
            updateFileList();
            updateProcessButton();
            
            // Clean up the DB so they don't load again on refresh
            clearTransferredPDFs();
        }
    }).catch(err => {
        console.warn("Failed to retrieve transferred PDFs from ShareDrop:", err);
    });

    // --- Drag and Drop Handlers ---
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
    });

    dropZone.addEventListener('drop', handleDrop, false);
    dropZone.addEventListener('click', () => fileInput.click()); // Enable click to upload
    fileInput.addEventListener('change', handleFiles, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const droppedFiles = dt.files;
        handleFiles({ target: { files: droppedFiles } });
    }

    function handleFiles(e) {
        const selected = Array.from(e.target.files).filter(file => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
        const newFiles = selected.filter(file => {
            if (file.size === 0) {
                alert(`Skipped empty file: ${file.name}`);
                return false;
            }
            return true;
        });
        
        if (newFiles.length === 0) {
            if (selected.length > 0) {
                return;
            }
            alert('Please select valid PDF files.');
            return;
        }

        files = [...files, ...newFiles];
        updateFileList();
        updateProcessButton();
        
        // reset file input
        fileInput.value = '';
    }

    function removeFile(index) {
        files.splice(index, 1);
        updateFileList();
        updateProcessButton();
    }

    window.addFileToPDFEditor = function(file) {
        if (file.size === 0) {
            alert(`Skipped empty file: ${file.name}`);
            return;
        }
        files.push(file);
        updateFileList();
        updateProcessButton();
    };

    function updateFileList() {
        if (fileCountPill) fileCountPill.textContent = `${files.length} files`;
        
        if (fileListHeader) {
            fileListHeader.style.display = files.length > 0 ? 'flex' : 'none';
        }
        
        fileList.innerHTML = '';
        files.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'file-item';
            
            const fileNameDiv = document.createElement('div');
            fileNameDiv.className = 'file-name';
            
            const svgNS = "http://www.w3.org/2000/svg";
            const iconSvg = document.createElementNS(svgNS, "svg");
            iconSvg.setAttribute("class", "file-icon");
            iconSvg.setAttribute("width", "20");
            iconSvg.setAttribute("height", "20");
            iconSvg.setAttribute("viewBox", "0 0 24 24");
            iconSvg.setAttribute("fill", "none");
            iconSvg.setAttribute("stroke", "currentColor");
            iconSvg.setAttribute("stroke-width", "2");
            iconSvg.setAttribute("stroke-linecap", "round");
            iconSvg.setAttribute("stroke-linejoin", "round");
            
            const iconPath1 = document.createElementNS(svgNS, "path");
            iconPath1.setAttribute("d", "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z");
            iconSvg.appendChild(iconPath1);
            
            const iconPolyline1 = document.createElementNS(svgNS, "polyline");
            iconPolyline1.setAttribute("points", "14 2 14 8 20 8");
            iconSvg.appendChild(iconPolyline1);
            
            const iconLine1 = document.createElementNS(svgNS, "line");
            iconLine1.setAttribute("x1", "16");
            iconLine1.setAttribute("y1", "13");
            iconLine1.setAttribute("x2", "8");
            iconLine1.setAttribute("y2", "13");
            iconSvg.appendChild(iconLine1);
            
            const iconLine2 = document.createElementNS(svgNS, "line");
            iconLine2.setAttribute("x1", "16");
            iconLine2.setAttribute("y1", "17");
            iconLine2.setAttribute("x2", "8");
            iconLine2.setAttribute("y2", "17");
            iconSvg.appendChild(iconLine2);
            
            const iconPolyline2 = document.createElementNS(svgNS, "polyline");
            iconPolyline2.setAttribute("points", "10 9 9 9 8 9");
            iconSvg.appendChild(iconPolyline2);
            
            fileNameDiv.appendChild(iconSvg);
            
            const fileInfoDiv = document.createElement('div');
            fileInfoDiv.className = 'file-info';
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'name-text';
            nameSpan.textContent = file.name;
            
            const sizeSpan = document.createElement('span');
            sizeSpan.className = 'size-text';
            sizeSpan.textContent = formatFileSize(file.size);
            
            fileInfoDiv.appendChild(nameSpan);
            fileInfoDiv.appendChild(sizeSpan);
            fileNameDiv.appendChild(fileInfoDiv);
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'btn-remove';
            removeBtn.title = 'Remove';
            removeBtn.addEventListener('click', () => removeFile(index));
            
            const removeSvg = document.createElementNS(svgNS, "svg");
            removeSvg.setAttribute("width", "18");
            removeSvg.setAttribute("height", "18");
            removeSvg.setAttribute("viewBox", "0 0 24 24");
            removeSvg.setAttribute("fill", "none");
            removeSvg.setAttribute("stroke", "currentColor");
            removeSvg.setAttribute("stroke-width", "2");
            removeSvg.setAttribute("stroke-linecap", "round");
            removeSvg.setAttribute("stroke-linejoin", "round");
            
            const removeLine1 = document.createElementNS(svgNS, "line");
            removeLine1.setAttribute("x1", "18");
            removeLine1.setAttribute("y1", "6");
            removeLine1.setAttribute("x2", "6");
            removeLine1.setAttribute("y2", "18");
            removeSvg.appendChild(removeLine1);
            
            const removeLine2 = document.createElementNS(svgNS, "line");
            removeLine2.setAttribute("x1", "6");
            removeLine2.setAttribute("y1", "6");
            removeLine2.setAttribute("x2", "18");
            removeLine2.setAttribute("y2", "18");
            removeSvg.appendChild(removeLine2);
            
            removeBtn.appendChild(removeSvg);
            
            item.appendChild(fileNameDiv);
            item.appendChild(removeBtn);
            fileList.appendChild(item);
        });
    }

    if (removeAllBtn) {
        removeAllBtn.addEventListener('click', () => {
            files = [];
            updateFileList();
            updateProcessButton();
            fileInput.value = '';
        });
    }

    window.removeFile = removeFile;

    // --- Validation ---
    function updateProcessButton() {
        const canProcess = files.length > 0; 
        processBtn.disabled = !canProcess;
    }

    // --- Processing ---
    processBtn.addEventListener('click', async () => {
        const name = studentNameInput.value.trim();
        const moodle = moodleIdInput.value.trim();
        const roll = rollNoInput.value.trim();
        const div = divisionInput.value.trim();
        const subject = subjectNameInput.value.trim();
        const instructor = instructorNameInput.value.trim();
        const datePerf = datePerformanceInput.value.trim();
        const dateSub = dateSubmissionInput.value.trim();
        const expNo = experimentNoInput.value.trim();

        const isDetailed = modeSwitch ? modeSwitch.checked : true;

        if (!name || !moodle || !roll) {
            alert('Please fill in Name, Moodle ID, and Roll No.');
            return;
        }

        processBtn.disabled = true;
        const originalText = processBtn.textContent;
        processBtn.innerHTML = `
            <svg class="spin" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s linear infinite;"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
            Processing...
        `;

        try {
            const processedFiles = [];
            const { PDFDocument, rgb } = PDFLib;
            const zip = new window.JSZip();

            for (const file of files) {
                const arrayBuffer = await file.arrayBuffer();
                
                // 1. Convert arrayBuffer to a format pdf.js can read without consuming the main buffer
                const pdfjsTask = window.pdfjsLib.getDocument({ data: arrayBuffer.slice(0) });
                const pdfjsDoc = await pdfjsTask.promise;
                
                // Keep track of all text across all pages for experiment number detection (filename)
                let allFullTextStr = "";
                const pagesBoxes = [];
                
                for (let pageNum = 1; pageNum <= pdfjsDoc.numPages; pageNum++) {
                    const pdfjsPageVar = await pdfjsDoc.getPage(pageNum);
                    const textContent = await pdfjsPageVar.getTextContent();
                    allFullTextStr += textContent.items.map(i => i.str).join(" ") + " ";
                    
                    let nameBoxes = [];
                    let idBoxes = [];
                    let rollBoxes = [];
                    let divBoxes = [];
                    let subjectBoxes = [];
                    let instructorBoxes = [];
                    let datePerfBoxes = [];
                    let dateSubBoxes = [];
                    let expNoBoxes = [];

                    // Group text items by line (y-coordinate) with 4px tolerance to handle sub-pixel baseline shifts
                    const textLines = {};
                    for (const item of textContent.items) {
                        const str = item.str;
                        if (!str.trim()) continue;
                        
                        const x = item.transform[4];
                        const y = item.transform[5];
                        const size = Math.abs(item.transform[0]) || 11.5;
                        
                        const roundedY = Math.round(y);
                        // Match within 4 pixels tolerance for baseline
                        const lineY = Object.keys(textLines).find(k => Math.abs(k - roundedY) <= 4) || roundedY;
                        
                        if (!textLines[lineY]) textLines[lineY] = [];
                        textLines[lineY].push({ str, x, y, size });
                    }

                    // Scan combined lines for labels using Regex to support various templates
                    for (const [yStr, lineItems] of Object.entries(textLines)) {
                        // Sort items horizontally
                        lineItems.sort((a, b) => a.x - b.x);
                        
                        // Build text with whitespace preservation & token offset mapping
                        let fullText = "";
                        const tokenOffsets = [];
                        for (const item of lineItems) {
                            const start = fullText.length;
                            fullText += (fullText.length > 0 ? " " : "") + item.str;
                            const end = fullText.length;
                            tokenOffsets.push({ item, start, end });
                        }
                        
                        // Helper to precisely find the starting X position, exact Y baseline, and Font Size of a matched phrase
                        const getMatchDetails = (regex) => {
                            const match = fullText.match(regex);
                            if (!match) return null;
                            const found = tokenOffsets.find(t => match.index >= t.start && match.index <= t.end) || tokenOffsets[0];
                            return { x: found.item.x, y: found.item.y, size: found.item.size, prefix: match[0] };
                        };
                        
                        const nData = getMatchDetails(/(?:name(?:\s*of)?\s*(?:the\s*)?student|student\'?s?\s*name|student\s*name|full\s*name|name\s*(?=:)|candidate\s*name)(?:\s*[:\-]?\s*)/i);
                        if (nData) nameBoxes.push({ x: nData.x, y: nData.y, w: 320, h: nData.size || 11.5, prefix: nData.prefix });
                        
                        const iData = getMatchDetails(/(?:student\s*id|moodle\s*id|prn(?:\s*no\.?)?|id\s*no\.?|id\s*(?=:)|roll\s*id|moodle|prn)(?:\s*[:\-]?\s*)/i);
                        if (iData) idBoxes.push({ x: iData.x, y: iData.y, w: 260, h: iData.size || 11.5, prefix: iData.prefix });
                        
                        const rData = getMatchDetails(/(?:roll\s*no\.?|roll\s*number|roll\s*(?=:)|roll)(?:\s*[:\-]?\s*)/i);
                        if (rData) rollBoxes.push({ x: rData.x, y: rData.y, w: 220, h: rData.size || 11.5, prefix: rData.prefix });

                        const divMatch = fullText.match(/(Class\s*\/\s*Div\s*\/\s*Branch\s*:\s*)([^\/]+)\/\s*([^\/]+)\s*\/\s*(.*?)(?=\s*Roll|\s*Student|\s*ID|$)/i);
                        if (divMatch) {
                            const dData = getMatchDetails(/(?:class\s*\/\s*div\s*\/\s*branch\s*:)(?:\s*[:\-]?\s*)/i);
                            if (dData) {
                                divBoxes.push({
                                    x: dData.x, 
                                    y: dData.y, 
                                    w: 320, 
                                    h: dData.size || 11.5,
                                    prefix: divMatch[1],
                                    classVal: divMatch[2].trim(),
                                    branchVal: divMatch[4].trim()
                                });
                            }
                        }

                        const subData = getMatchDetails(/(?:name\s*of\s*(?:the\s*)?subject|subject\s*name|subject)(?:\s*[:\-]?\s*)/i);
                        if (subData) subjectBoxes.push({ x: subData.x, y: subData.y, w: 400, h: subData.size || 11.5, prefix: subData.prefix });

                        const instData = getMatchDetails(/(?:name\s*of\s*(?:the\s*)?instructor|instructor|faculty)(?:\s*[:\-]?\s*)/i);
                        if (instData) instructorBoxes.push({ x: instData.x, y: instData.y, w: 400, h: instData.size || 11.5, prefix: instData.prefix });

                        const dpData = getMatchDetails(/(?:date\s*of\s*performance|performance\s*date|date\s*perf)(?:\s*[:\-]?\s*)/i);
                        if (dpData) datePerfBoxes.push({ x: dpData.x, y: dpData.y, w: 260, h: dpData.size || 11.5, prefix: dpData.prefix });

                        const dsData = getMatchDetails(/(?:date\s*of\s*submission|submission\s*date|date\s*sub)(?:\s*[:\-]?\s*)/i);
                        if (dsData) dateSubBoxes.push({ x: dsData.x, y: dsData.y, w: 260, h: dsData.size || 11.5, prefix: dsData.prefix });

                        const expData = getMatchDetails(/(?:experiment\s*no\.?)(?:\s*[:\-]?\s*)/i);
                        if (expData) expNoBoxes.push({ x: expData.x, y: expData.y, w: 180, h: expData.size || 11.5, prefix: expData.prefix });
                    }
                    
                    // Synthetic fallback: if ID is found but Name or Roll is missing, calculate coordinates based on standard table baseline pitch (14pt)
                    if (idBoxes.length > 0) {
                        const primeId = idBoxes[0];
                        if (nameBoxes.length === 0) {
                            nameBoxes.push({ x: primeId.x, y: primeId.y + 14, w: 320, h: primeId.h, prefix: "Name of Student: " });
                        }
                        if (rollBoxes.length === 0) {
                            rollBoxes.push({ x: primeId.x, y: primeId.y - 14, w: 220, h: primeId.h, prefix: "Roll No: " });
                        }
                    } else if (rollBoxes.length > 0) {
                        const primeRoll = rollBoxes[0];
                        if (nameBoxes.length === 0) {
                            nameBoxes.push({ x: primeRoll.x, y: primeRoll.y + 28, w: 320, h: primeRoll.h, prefix: "Name of Student: " });
                        }
                        if (idBoxes.length === 0) {
                            idBoxes.push({ x: primeRoll.x, y: primeRoll.y + 14, w: 260, h: primeRoll.h, prefix: "Student ID: " });
                        }
                    }

                    pagesBoxes.push({ nameBoxes, idBoxes, rollBoxes, divBoxes, subjectBoxes, instructorBoxes, datePerfBoxes, dateSubBoxes, expNoBoxes });
                }
                
                // Destroy PDF.js document to prevent massive memory leaks
                try {
                    await pdfjsDoc.destroy();
                } catch (e) {
                    console.warn("Failed to destroy pdfjsDoc:", e);
                }
                
                // 3. Load PDF into pdf-lib for modification
                const pdfDoc = await PDFDocument.load(arrayBuffer);
                const pages = pdfDoc.getPages();
                
                // Embed matching font
                const timesBoldFont = await pdfDoc.embedFont(PDFLib.StandardFonts.TimesRomanBold);

                // 4 & 5. Wipe out old lines and draw new ones across ALL pages with Master Block-Wipe
                for (let pIndex = 0; pIndex < pages.length; pIndex++) {
                    const currentPage = pages.at(pIndex);
                    const pageWidth = currentPage.getWidth();
                    const { nameBoxes, idBoxes, rollBoxes, divBoxes, subjectBoxes, instructorBoxes, datePerfBoxes, dateSubBoxes, expNoBoxes } = pagesBoxes.at(pIndex) || { nameBoxes:[], idBoxes:[], rollBoxes:[], divBoxes:[], subjectBoxes:[], instructorBoxes:[], datePerfBoxes:[], dateSubBoxes:[], expNoBoxes:[] };
                    
                    // Determine anchor X for the right column to perfectly align items
                    let rightColX = null;
                    const rightCandidates = [...nameBoxes, ...idBoxes, ...rollBoxes].filter(b => b.x > 200);
                    if (rightCandidates.length > 0) {
                        rightColX = Math.min(...rightCandidates.map(b => b.x));
                    }
                    
                    // 1. MASTER RIGHT-COLUMN BLOCK WIPE: Wipe out the entire student details column in one seamless rectangle
                    if (rightCandidates.length > 0 && rightColX !== null) {
                        const allY = rightCandidates.map(b => b.y);
                        const topY = Math.max(...allY) + 14;
                        const bottomY = Math.min(...allY) - 5;
                        const wipeX = Math.max(0, rightColX - 4);
                        const wipeW = Math.max(300, pageWidth - wipeX - 20);
                        const wipeH = Math.max(45, topY - bottomY);

                        currentPage.drawRectangle({
                            x: wipeX,
                            y: bottomY,
                            width: wipeW,
                            height: wipeH,
                            color: rgb(1, 1, 1),
                        });
                    }

                    // Individual dynamic wipe for left-column and additional items
                    function drawWipe(box) {
                        const isRightCol = box.x > 200;
                        if (isRightCol && rightColX !== null) return; // Already wiped by Master Block Wipe!

                        const wipeX = Math.max(0, box.x - 3);
                        const wipeW = rightColX ? Math.max(100, rightColX - wipeX - 8) : box.w;
                        const wipeH = Math.max(box.h + 4, 14);

                        currentPage.drawRectangle({
                            x: wipeX, 
                            y: box.y - 3, 
                            width: wipeW,
                            height: wipeH,
                            color: rgb(1, 1, 1),
                        });
                    }
                    
                    function drawLine(box, text) {
                        // Snap to alignment if it's on the right side and close to the anchor
                        let drawX = box.x;
                        if (rightColX !== null && box.x > 200 && Math.abs(box.x - rightColX) < 120) {
                            drawX = rightColX;
                        }
                        
                        currentPage.drawText(text, {
                            x: drawX,
                            y: box.y - 0.5,
                            size: box.h,
                            font: timesBoldFont,
                            color: rgb(0, 0, 0),
                        });
                    }

                    // Helper to deduplicate multiple overlapping boxes (ghost text from previous edits)
                    function getCleanBoxes(boxArray) {
                        if (boxArray.length <= 1) return boxArray;
                        const clean = [];
                        boxArray.forEach(b => {
                            const exists = clean.some(c => Math.abs(c.y - b.y) <= 10);
                            if (!exists) clean.push(b);
                        });
                        return clean;
                    }

                    // Wipe left column items
                    if (isDetailed) {
                        if (div) divBoxes.forEach(drawWipe);
                        if (subject) subjectBoxes.forEach(drawWipe);
                        if (instructor) instructorBoxes.forEach(drawWipe);
                        if (datePerf) datePerfBoxes.forEach(drawWipe);
                        if (dateSub) dateSubBoxes.forEach(drawWipe);
                        if (expNo) expNoBoxes.forEach(drawWipe);
                    }
                    
                    // 2. Draw clean text only on deduplicated primary positions
                    getCleanBoxes(nameBoxes).forEach(box => {
                        const cleanPrefix = box.prefix.replace(/\s+/g, ' ').trim();
                        drawLine(box, `${cleanPrefix} ${name}`);
                    });

                    getCleanBoxes(idBoxes).forEach(box => {
                        const cleanPrefix = box.prefix.replace(/\s+/g, ' ').trim();
                        drawLine(box, `${cleanPrefix} ${moodle}`);
                    });

                    getCleanBoxes(rollBoxes).forEach(box => {
                        const cleanPrefix = box.prefix.replace(/\s+/g, ' ').trim();
                        drawLine(box, `${cleanPrefix} ${roll}`);
                    });
                    
                    if (isDetailed) {
                        if (div) getCleanBoxes(divBoxes).forEach(box => drawLine(box, `${box.prefix.trim()} ${box.classVal} / ${div} / ${box.branchVal}`));
                        if (subject) getCleanBoxes(subjectBoxes).forEach(box => drawLine(box, `${box.prefix.trim()} ${subject}`));
                        if (instructor) getCleanBoxes(instructorBoxes).forEach(box => drawLine(box, `${box.prefix.trim()} ${instructor}`));
                        if (datePerf) getCleanBoxes(datePerfBoxes).forEach(box => drawLine(box, `${box.prefix.trim()} ${datePerf}`));
                        if (dateSub) getCleanBoxes(dateSubBoxes).forEach(box => drawLine(box, `${box.prefix.trim()} ${dateSub}`));
                        if (expNo) getCleanBoxes(expNoBoxes).forEach(box => drawLine(box, `${box.prefix.trim()} ${expNo}`));
                    }
                }

                // Serialize
                const pdfBytes = await pdfDoc.save();
                // Keep track for zip
                let detectedExpNo = "1";
                const expMatch = allFullTextStr.match(/Experiment\s*No\.?\s*(\d+)/i);
                if (expMatch) {
                    detectedExpNo = expMatch[1];
                }

                let detectedSubjectName = "";
                if (isDetailed && subject) {
                    detectedSubjectName = "_" + subject.trim().replace(/\s+/g, '_').toLowerCase();
                } else {
                    const subjectMatch = allFullTextStr.match(/(?:Subject|Course)\s*[:\-]?\s*([a-zA-Z0-9\s&]+?)(?=\s+(?:Date|Experiment|Exp|Name|ID|Roll|Class|Year|Semester))/i);
                    if (subjectMatch && subjectMatch[1]) {
                        detectedSubjectName = "_" + subjectMatch[1].trim().replace(/\s+/g, '_').toLowerCase();
                    }
                }

                const safeName = name.replace(/\s+/g, '_').toLowerCase();
                // Use the user input experiment No for filename if available
                const finalExpNo = expNo || detectedExpNo;
                const newFilename = `${safeName}_exp${finalExpNo}${detectedSubjectName}.pdf`;
                
                // Create a blob & URL for individual download
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                
                // Add to ZIP
                zip.file(newFilename, pdfBytes);
                processedFiles.push({ name: newFilename, url, size: blob.size });
            }

            // Generate ZIP
            const zipBlob = await zip.generateAsync({ type: "blob" });
            const zipUrl = URL.createObjectURL(zipBlob);

            showResults(processedFiles, zipUrl);

        } catch (error) {
            console.error(error);
            alert('An error occurred while processing the PDFs.');
        } finally {
            processBtn.textContent = originalText;
            processBtn.disabled = false;
        }
    });

    function showResults(processedFiles, zipUrl) {
        resultsSection.classList.remove('hidden');
        processedList.innerHTML = '';

        processedFiles.forEach((file) => {
            const item = document.createElement('div');
            item.className = 'processed-item';
            
            const processedNameDiv = document.createElement('div');
            processedNameDiv.className = 'processed-name';
            
            const svgNS = "http://www.w3.org/2000/svg";
            const checkSvg = document.createElementNS(svgNS, "svg");
            checkSvg.setAttribute("width", "20");
            checkSvg.setAttribute("height", "20");
            checkSvg.setAttribute("viewBox", "0 0 24 24");
            checkSvg.setAttribute("fill", "none");
            checkSvg.setAttribute("stroke", "currentColor");
            checkSvg.setAttribute("stroke-width", "2");
            checkSvg.setAttribute("stroke-linecap", "round");
            checkSvg.setAttribute("stroke-linejoin", "round");
            
            const checkPath = document.createElementNS(svgNS, "path");
            checkPath.setAttribute("d", "M22 11.08V12a10 10 0 1 1-5.93-9.14");
            checkSvg.appendChild(checkPath);
            
            const checkPolyline = document.createElementNS(svgNS, "polyline");
            checkPolyline.setAttribute("points", "22 4 12 14.01 9 11.01");
            checkSvg.appendChild(checkPolyline);
            
            processedNameDiv.appendChild(checkSvg);
            
            const fileInfoDiv = document.createElement('div');
            fileInfoDiv.className = 'file-info';
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'name-text';
            nameSpan.textContent = file.name;
            
            const sizeSpan = document.createElement('span');
            sizeSpan.className = 'size-text';
            sizeSpan.textContent = formatFileSize(file.size);
            
            fileInfoDiv.appendChild(nameSpan);
            fileInfoDiv.appendChild(sizeSpan);
            processedNameDiv.appendChild(fileInfoDiv);
            
            const actionButtonsDiv = document.createElement('div');
            actionButtonsDiv.className = 'action-buttons';
            
            const previewBtn = document.createElement('button');
            previewBtn.className = 'btn-preview';
            previewBtn.textContent = 'Preview';
            previewBtn.addEventListener('click', () => previewPdf(file.url));
            
            const downloadBtn = document.createElement('a');
            downloadBtn.className = 'btn-download';
            downloadBtn.textContent = 'Download';
            downloadBtn.href = file.url;
            downloadBtn.download = file.name;
            
            actionButtonsDiv.appendChild(previewBtn);
            actionButtonsDiv.appendChild(downloadBtn);
            
            item.appendChild(processedNameDiv);
            item.appendChild(actionButtonsDiv);
            processedList.appendChild(item);
        });

        if (processedFiles.length > 0) {
            const batchActions = document.createElement('div');
            batchActions.className = 'batch-actions';

            const downloadAllBtn = document.createElement('a');
            downloadAllBtn.href = "#";
            downloadAllBtn.className = "btn-download-all";
            
            const svgNS = "http://www.w3.org/2000/svg";
            const svg = document.createElementNS(svgNS, "svg");
            svg.setAttribute("width", "20");
            svg.setAttribute("height", "20");
            svg.setAttribute("viewBox", "0 0 24 24");
            svg.setAttribute("fill", "none");
            svg.setAttribute("stroke", "currentColor");
            svg.setAttribute("stroke-width", "2");
            svg.setAttribute("stroke-linecap", "round");
            svg.setAttribute("stroke-linejoin", "round");
            svg.style.marginRight = "8px";
            svg.style.verticalAlign = "middle";
            
            const path = document.createElementNS(svgNS, "path");
            path.setAttribute("d", "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4");
            svg.appendChild(path);
            
            const polyline = document.createElementNS(svgNS, "polyline");
            polyline.setAttribute("points", "7 10 12 15 17 10");
            svg.appendChild(polyline);
            
            const line = document.createElementNS(svgNS, "line");
            line.setAttribute("x1", "12");
            line.setAttribute("y1", "15");
            line.setAttribute("x2", "12");
            line.setAttribute("y2", "3");
            svg.appendChild(line);
            
            downloadAllBtn.appendChild(svg);
            downloadAllBtn.appendChild(document.createTextNode(`Download All (${processedFiles.length})`));
            
            // Trigger sequential downloads
            downloadAllBtn.addEventListener('click', (e) => {
                e.preventDefault();
                processedFiles.forEach((file, index) => {
                    setTimeout(() => {
                        const a = document.createElement('a');
                        a.href = file.url;
                        a.download = file.name;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                    }, index * 400); // 400ms delay helps browsers allow multiple downloads safely
                });
            });

            const downloadZipBtn = document.createElement('a');
            downloadZipBtn.href = zipUrl;
            downloadZipBtn.download = "processed_lab_files.zip";
            downloadZipBtn.className = "btn-download-zip";
            downloadZipBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px; vertical-align: middle;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Download ZIP
            `;
            
            batchActions.appendChild(downloadAllBtn);
            batchActions.appendChild(downloadZipBtn);
            processedList.appendChild(batchActions);
        }

        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    // Modal Logic
    const modal = document.getElementById('previewModal');
    const iframe = document.getElementById('previewIframe');
    const closeModalBtn = document.getElementById('closeModalBtn');

    window.previewPdf = function(url) {
        // Mobile browsers cannot reliably render PDFs inside iframes.
        // We detect mobile devices and instead open the PDF in a new native tab.
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 900;
        
        if (isMobile) {
            window.open(url, '_blank');
        } else {
            iframe.src = url;
            modal.classList.remove('hidden');
            if (typeof window.onModalOpen === 'function') window.onModalOpen();
        }
    };

    closeModalBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        iframe.src = "";
        if (typeof window.onModalClose === 'function') window.onModalClose();
    });

    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
            iframe.src = "";
            if (typeof window.onModalClose === 'function') window.onModalClose();
        }
    });



    // Portal modal clicks
    const portalEditorBtn = document.getElementById('portalEditorBtn');
    const portalModal = document.getElementById('navigationPortalModal');
    if (portalEditorBtn) {
        portalEditorBtn.addEventListener('click', () => {
            if (portalModal) portalModal.classList.add('hidden');
            if (typeof window.onModalClose === 'function') window.onModalClose();
        });
    }

    // Handle button disabled state initially
    updateProcessButton();
});

// Adding keyframe style for spinner inside JS to keep it self-contained
const style = document.createElement('style');
style.innerHTML = `
    @keyframes spin {
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

// ANTI-BACK-BUTTON SESSION RE-VALIDATION (BFCACHE SECURITY)
window.addEventListener('pagehide', function () {
    if (document.body) document.body.style.opacity = '0';
});
window.addEventListener('pageshow', function (event) {
    if (event.persisted || (window.performance && window.performance.getEntriesByType && window.performance.getEntriesByType('navigation')[0]?.type === 'back_forward')) {
        window.location.replace(window.location.href);
    } else {
        if (document.body) document.body.style.opacity = '1';
    }
});

// DYNAMIC HOLOGRAPHIC FOIL SHIMMER ANIMATION (.hft-scene)
(function initHologramFoilPointerTracking() {
    let mouseX = window.innerWidth / 2;

    window.addEventListener('pointermove', (e) => {
        mouseX = e.clientX;
    }, { passive: true });

    function updateFoil() {
        const scenes = document.querySelectorAll('.hft-scene');
        scenes.forEach(scene => {
            const rect = scene.getBoundingClientRect();
            if (rect.width > 0) {
                const relX = Math.max(0, Math.min(rect.width, mouseX - rect.left));
                const pct = (relX / rect.width) * 100;
                const hue = ((mouseX / window.innerWidth) * 360) % 360;

                scene.style.setProperty('--hft-x', `${pct.toFixed(1)}%`);
                scene.style.setProperty('--hft-hue', `${hue.toFixed(1)}deg`);
            }
        });
        requestAnimationFrame(updateFoil);
    }
    updateFoil();
})();