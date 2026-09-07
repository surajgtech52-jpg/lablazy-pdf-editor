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
    const semesterInput = document.getElementById('semester');
    const academicYearInput = document.getElementById('academicYear');
    const classDivBranchInput = document.getElementById('classDivBranch');
    
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
        dateSubmissionInput, experimentNoInput, semesterInput, academicYearInput,
        classDivBranchInput
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

    // Quick "Blank" toggles for dates
    document.querySelectorAll('.btn-quick-blank').forEach(btn => {
        const targetId = btn.getAttribute('data-target');
        const targetInput = document.getElementById(targetId);
        
        function updateBtnState() {
            if (!targetInput) return;
            const val = targetInput.value.trim().toLowerCase();
            if (val === '[blank]' || val === 'blank' || val === 'none') {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }
        
        if (targetInput) {
            updateBtnState();
            targetInput.addEventListener('input', updateBtnState);
        }

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (!targetInput) return;
            if (targetInput.value === '[Blank]') {
                targetInput.value = '';
            } else {
                targetInput.value = '[Blank]';
            }
            targetInput.dispatchEvent(new Event('input'));
            sessionStorage.setItem(`pdf_editor_${targetInput.id}`, targetInput.value);
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
        const name = studentNameInput ? studentNameInput.value.trim() : '';
        const moodle = moodleIdInput ? moodleIdInput.value.trim() : '';
        const roll = rollNoInput ? rollNoInput.value.trim() : '';
        const div = divisionInput ? divisionInput.value.trim() : '';
        const subject = subjectNameInput ? subjectNameInput.value.trim() : '';
        const instructor = instructorNameInput ? instructorNameInput.value.trim() : '';
        const datePerf = datePerformanceInput ? datePerformanceInput.value.trim() : '';
        const dateSub = dateSubmissionInput ? dateSubmissionInput.value.trim() : '';
        const isBlankPerf = datePerf && ['[blank]', 'blank', 'none', 'hide', 'empty', '-'].includes(datePerf.toLowerCase());
        const isBlankSub = dateSub && ['[blank]', 'blank', 'none', 'hide', 'empty', '-'].includes(dateSub.toLowerCase());
        const expNo = experimentNoInput ? experimentNoInput.value.trim() : '';
        const semester = semesterInput ? semesterInput.value.trim() : '';
        const academicYear = academicYearInput ? academicYearInput.value.trim() : '';
        const classDivBranch = classDivBranchInput ? classDivBranchInput.value.trim() : '';

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
                
                // Check for Scanned PDFs (Text Layer Validation)
                const firstPage = await pdfjsDoc.getPage(1);
                const firstPageContent = await firstPage.getTextContent();
                const totalFirstPageChars = firstPageContent.items.map(i => i.str).join("").trim().length;
                if (totalFirstPageChars === 0) {
                    alert(`Warning: "${file.name}" appears to be a scanned image without a text layer. Text replacement requires searchable text in the PDF.`);
                }

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
                    let semesterBoxes = [];
                    let academicYearBoxes = [];

                    // Group text items by line (y-coordinate) with 4px tolerance to handle sub-pixel baseline shifts
                    const textLines = {};
                    for (const item of textContent.items) {
                        const str = item.str;
                        if (!str.trim()) continue;
                        
                        const x = item.transform[4];
                        const y = item.transform[5];
                        const size = Math.abs(item.transform[0]) || 11.5;
                        
                        const roundedY = Math.round(y);
                        const lineY = Object.keys(textLines).find(k => Math.abs(k - roundedY) <= 4) || roundedY;
                        
                        if (!textLines[lineY]) textLines[lineY] = [];
                        textLines[lineY].push({ str, x, y, size });
                    }

                    // Scan lines in the HEADER & TITLE ZONE (Y >= 560)
                    for (const [yStr, lineItems] of Object.entries(textLines)) {
                        const lineY = lineItems[0].y;
                        if (lineY < 560) continue; // Never touch aim, lab outcomes, or program body text

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
                        
                        // Helper to precisely find starting X position, exact Y baseline, and Font Size
                        const getMatchDetails = (regex) => {
                            const match = fullText.match(regex);
                            if (!match) return null;
                            const found = tokenOffsets.find(t => match.index >= t.start && match.index <= t.end) || tokenOffsets[0];
                            return { x: found.item.x, y: found.item.y, size: found.item.size, prefix: match[0] };
                        };
                        
                        // Table metadata fields are in the table grid (Y >= 600)
                        if (lineY >= 600) {
                            const nData = getMatchDetails(/(?:\bname(?:\s*of)?\s*(?:the\s*)?student|\bstudent\'?s?\s*name|\bstudent\s*name|\bfull\s*name|\bname\b\s*:)(?:\s*[:\-]?\s*)/i);
                            if (nData) nameBoxes.push({ x: nData.x, y: nData.y, w: 320, h: nData.size || 11.5, prefix: nData.prefix });
                            
                            const iData = getMatchDetails(/(?:\bstudent\s*id|\bmoodle\s*id|\bprn\s*no\.?|\bid\s*no\.?|\bstudent\s*id\b|\bid\b\s*:)(?:\s*[:\-]?\s*)/i);
                            if (iData) idBoxes.push({ x: iData.x, y: iData.y, w: 260, h: iData.size || 11.5, prefix: iData.prefix });
                            
                            const rData = getMatchDetails(/(?:\broll\s*no\.?|\broll\s*number|\broll\s*no\b|\broll\b\s*:)(?:\s*[:\-]?\s*)/i);
                            if (rData) rollBoxes.push({ x: rData.x, y: rData.y, w: 220, h: rData.size || 11.5, prefix: rData.prefix });

                            const dData = getMatchDetails(/(?:\bclass\s*(?:\/|\s*)\s*div(?:ision)?\s*(?:\/|\s*)\s*branch|\bclass\s*(?:\/|\s*)\s*branch\s*(?:\/|\s*)\s*div(?:ision)?|\bclass\s*(?:\/|\s*)\s*div(?:ision)?|\bdiv(?:ision)?\s*(?:\/|\s*)\s*branch)\s*[:\-]?\s*/i);
                            if (dData) {
                                let classVal = "T.E.";
                                let branchVal = "CSE(AI&ML)";
                                
                                const partsMatch = fullText.match(/[:\-]\s*([^\/|\-]+)[\/|\-]\s*([^\/|\-]+)[\/|\-]\s*([^(\n\r]+?)(?=\s*Roll|\s*Student|\s*ID|$)/i);
                                if (partsMatch) {
                                    classVal = partsMatch[1].trim();
                                    branchVal = partsMatch[3].trim();
                                } else {
                                    if (fullText.includes("T.E") || fullText.includes("TE")) classVal = "T.E.";
                                    else if (fullText.includes("S.E") || fullText.includes("SE")) classVal = "S.E.";
                                    else if (fullText.includes("B.E") || fullText.includes("BE")) classVal = "B.E.";
                                    else if (fullText.includes("F.E") || fullText.includes("FE")) classVal = "F.E.";
                                    
                                    const branchMatch = fullText.match(/(?:CSE\s*\([^\)]+\)|AI&ML|AIML|DS|IT|EXTC|COMP|COMPS|CIVIL|MECH)/i);
                                    if (branchMatch) branchVal = branchMatch[0].trim();
                                }
                                
                                divBoxes.push({
                                    x: dData.x, 
                                    y: dData.y, 
                                    w: 320, 
                                    h: dData.size || 11.5,
                                    prefix: dData.prefix,
                                    classVal: classVal,
                                    branchVal: branchVal
                                });
                            }

                            const subData = getMatchDetails(/(?:\bname\s*of\s*(?:the\s*)?subject|\bsubject\s*name|\bsubject\b\s*:)(?:\s*[:\-]?\s*)/i);
                            if (subData) subjectBoxes.push({ x: subData.x, y: subData.y, w: 400, h: subData.size || 11.5, prefix: subData.prefix });

                            const instData = getMatchDetails(/(?:\bname\s*of\s*(?:the\s*)?instructor|\binstructor\b\s*:|\bfaculty\b\s*:)(?:\s*[:\-]?\s*)/i);
                            if (instData) instructorBoxes.push({ x: instData.x, y: instData.y, w: 400, h: instData.size || 11.5, prefix: instData.prefix });

                            const dpData = getMatchDetails(/(?:\bdate\s*of\s*performance|\bperformance\s*date|\bdate\s*of\s*perf|\bdate\s*perf)(?:\s*[:\-]?\s*)/i);
                            if (dpData) datePerfBoxes.push({ x: dpData.x, y: dpData.y, w: 260, h: dpData.size || 11.5, prefix: dpData.prefix });

                            const dsData = getMatchDetails(/(?:\bdate\s*of\s*submission|\bsubmission\s*date|\bdate\s*of\s*sub|\bdate\s*sub)(?:\s*[:\-]?\s*)/i);
                            if (dsData) dateSubBoxes.push({ x: dsData.x, y: dsData.y, w: 260, h: dsData.size || 11.5, prefix: dsData.prefix });

                            const semData = getMatchDetails(/(?:\bsemester\b|\bsem\b)\s*[:\-]?\s*/i);
                            if (semData) semesterBoxes.push({ x: semData.x, y: semData.y, w: 220, h: semData.size || 11.5, prefix: semData.prefix });

                            const ayData = getMatchDetails(/(?:\bacademic\s*year|\bacad\s*\.?\s*year|\ba\.?\s*y\.?\b)\s*[:\-]?\s*/i);
                            if (ayData) academicYearBoxes.push({ x: ayData.x, y: ayData.y, w: 260, h: ayData.size || 11.5, prefix: ayData.prefix });
                        }

                        // Experiment / Assignment Title heading (between Y=560 and Y=600)
                        if (lineY >= 560 && lineY < 600) {
                            const expData = getMatchDetails(/(?:\bexperiment\s*(?:no\.?|number)?|\bexp\.?\s*(?:no\.?|number)?|\bassignment\s*(?:no\.?|number))\s*[:\-]?\s*/i);
                            if (expData) expNoBoxes.push({ x: expData.x, y: expData.y, w: 260, h: expData.size || 14, prefix: expData.prefix });
                        }
                    }
                    
                    // Synthetic fallback: strictly if right header column is found
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

                    // Fallback for Date of Performance (Row 4) if missing in PDF
                    if (datePerfBoxes.length === 0) {
                        let perfY = null;
                        if (subjectBoxes.length > 0) {
                            perfY = subjectBoxes[0].y;
                        } else if (rollBoxes.length > 0 && dateSubBoxes.length > 0) {
                            perfY = (rollBoxes[0].y + dateSubBoxes[0].y) / 2;
                        } else if (rollBoxes.length > 0) {
                            perfY = rollBoxes[0].y - 14.0;
                        }
                        if (perfY !== null) {
                            const primeX = idBoxes[0] ? idBoxes[0].x : (rollBoxes[0] ? rollBoxes[0].x : 328.7);
                            datePerfBoxes.push({
                                x: primeX,
                                y: perfY,
                                w: 260,
                                h: 11.5,
                                prefix: "Date of Performance:"
                            });
                        }
                    }

                    // Fallback for Date of Submission (Row 5) if missing in PDF
                    if (dateSubBoxes.length === 0) {
                        let subY = null;
                        if (instructorBoxes.length > 0) {
                            subY = instructorBoxes[0].y;
                        } else if (datePerfBoxes.length > 0) {
                            subY = datePerfBoxes[0].y - 14.0;
                        } else if (rollBoxes.length > 0) {
                            subY = rollBoxes[0].y - 28.0;
                        }
                        if (subY !== null) {
                            const primeX = idBoxes[0] ? idBoxes[0].x : (rollBoxes[0] ? rollBoxes[0].x : 328.7);
                            dateSubBoxes.push({
                                x: primeX,
                                y: subY,
                                w: 260,
                                h: 11.5,
                                prefix: "Date of Submission:"
                            });
                        }
                    }

                    pagesBoxes.push({ nameBoxes, idBoxes, rollBoxes, divBoxes, subjectBoxes, instructorBoxes, datePerfBoxes, dateSubBoxes, expNoBoxes, semesterBoxes, academicYearBoxes });
                }
                
                // Destroy PDF.js document to prevent memory leaks
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

                // 4 & 5. Wipe out old lines and draw new ones across ALL pages
                for (let pIndex = 0; pIndex < pages.length; pIndex++) {
                    const currentPage = pages.at(pIndex);
                    const pageWidth = currentPage.getWidth();
                    const { nameBoxes, idBoxes, rollBoxes, divBoxes, subjectBoxes, instructorBoxes, datePerfBoxes, dateSubBoxes, expNoBoxes, semesterBoxes, academicYearBoxes } = pagesBoxes.at(pIndex) || { nameBoxes:[], idBoxes:[], rollBoxes:[], divBoxes:[], subjectBoxes:[], instructorBoxes:[], datePerfBoxes:[], dateSubBoxes:[], expNoBoxes:[], semesterBoxes:[], academicYearBoxes:[] };
                    
                    const rightCandidates = [...nameBoxes, ...idBoxes, ...rollBoxes, ...datePerfBoxes, ...dateSubBoxes].filter(b => b.x > 200);
                    const allHeaderBoxes = [...nameBoxes, ...idBoxes, ...rollBoxes, ...divBoxes, ...subjectBoxes, ...instructorBoxes, ...datePerfBoxes, ...dateSubBoxes, ...semesterBoxes, ...academicYearBoxes];

                    let rightColX = null;
                    if (rightCandidates.length > 0) {
                        rightColX = Math.min(...rightCandidates.map(b => b.x));
                    }
                    
                    // 1. MASTER RIGHT-COLUMN BLOCK WIPE: Wipe out the right column in one seamless clean rectangle
                    // bottomY uses -1.2 to strictly preserve the thick bottom table border line
                    if (allHeaderBoxes.length > 0 && rightColX !== null) {
                        const allY = allHeaderBoxes.map(b => b.y);
                        const topY = Math.max(...allY) + 12;
                        const bottomY = Math.min(...allY) - 1.2; // Perfectly above the thick table border line
                        const wipeX = Math.max(0, rightColX - 4);
                        const wipeW = Math.max(300, pageWidth - wipeX - 20);
                        const wipeH = Math.max(50, topY - bottomY);

                        currentPage.drawRectangle({
                            x: wipeX,
                            y: bottomY,
                            width: wipeW,
                            height: wipeH,
                            color: rgb(1, 1, 1),
                        });
                    }

                    // Individual dynamic wipe for left-column, dates, titles
                    function drawWipe(box) {
                        const isRightCol = box.x > 200 && box.y >= 600;
                        const isTitleOrExp = box.y < 600;
                        const wipeX = Math.max(0, box.x - 4);
                        const wipeW = isTitleOrExp 
                            ? Math.max(box.w, 240)
                            : (isRightCol 
                                ? Math.max(box.w, pageWidth - wipeX - 20) 
                                : (rightColX ? Math.max(100, rightColX - wipeX - 8) : box.w));
                        const wipeH = Math.max(box.h + 2.5, 13.5);

                        currentPage.drawRectangle({
                            x: wipeX, 
                            y: box.y - 1.2, 
                            width: wipeW,
                            height: wipeH,
                            color: rgb(1, 1, 1),
                        });
                    }
                    
                    // Auto-Shrink Text Drawer
                    function drawLine(box, text, maxW) {
                        let drawX = box.x;
                        if (rightColX !== null && box.x > 200 && box.y >= 600 && Math.abs(box.x - rightColX) < 120) {
                            drawX = rightColX;
                        }
                        
                        let fontSize = box.h || 11.5;
                        const limitW = maxW || (box.x > 200 ? (pageWidth - drawX - 20) : (rightColX ? (rightColX - drawX - 10) : box.w));
                        let textWidth = timesBoldFont.widthOfTextAtSize(text, fontSize);
                        while (textWidth > limitW && fontSize > 7.5) {
                            fontSize -= 0.25;
                            textWidth = timesBoldFont.widthOfTextAtSize(text, fontSize);
                        }

                        currentPage.drawText(text, {
                            x: drawX,
                            y: box.y,
                            size: fontSize,
                            font: timesBoldFont,
                            color: rgb(0, 0, 0),
                        });
                    }

                    // Helper to deduplicate multiple overlapping boxes
                    function getCleanBoxes(boxArray) {
                        if (boxArray.length <= 1) return boxArray;
                        const clean = [];
                        boxArray.forEach(b => {
                            const exists = clean.some(c => Math.abs(c.y - b.y) <= 8);
                            if (!exists) clean.push(b);
                        });
                        return clean;
                    }

                    // Wipe left fields & exp title
                    if (classDivBranch || div) divBoxes.forEach(drawWipe);
                    if (subject) subjectBoxes.forEach(drawWipe);
                    if (instructor) instructorBoxes.forEach(drawWipe);
                    if (expNo) expNoBoxes.forEach(drawWipe);
                    if (semester) semesterBoxes.forEach(drawWipe);
                    if (academicYear) academicYearBoxes.forEach(drawWipe);
                    
                    // 2. Draw clean text only on deduplicated primary positions
                    getCleanBoxes(nameBoxes).forEach(box => {
                        drawLine(box, `Name of Student: ${name}`);
                    });

                    getCleanBoxes(idBoxes).forEach(box => {
                        drawLine(box, `Student ID: ${moodle}`);
                    });

                    getCleanBoxes(rollBoxes).forEach(box => {
                        drawLine(box, `Roll No: ${roll}`);
                    });
                    
                    if (classDivBranch) {
                        getCleanBoxes(divBoxes).forEach(box => drawLine(box, `Class / Div / Branch: ${classDivBranch}`));
                    } else if (div) {
                        getCleanBoxes(divBoxes).forEach(box => drawLine(box, `Class / Div / Branch: ${box.classVal} / ${div} / ${box.branchVal}`));
                    }
                    if (subject) getCleanBoxes(subjectBoxes).forEach(box => drawLine(box, `Subject: ${subject}`));
                    if (instructor) getCleanBoxes(instructorBoxes).forEach(box => drawLine(box, `Name of Instructor: ${instructor}`));
                    if (semester) getCleanBoxes(semesterBoxes).forEach(box => drawLine(box, `Semester: ${semester}`));
                    if (academicYear) getCleanBoxes(academicYearBoxes).forEach(box => drawLine(box, `Academic Year: ${academicYear}`));
                    
                    if (datePerf) {
                        if (isBlankPerf) {
                            getCleanBoxes(datePerfBoxes).forEach(box => drawLine(box, `Date of Performance:`));
                        } else {
                            getCleanBoxes(datePerfBoxes).forEach(box => drawLine(box, `Date of Performance: ${datePerf}`));
                        }
                    } else if (datePerfBoxes.length > 0) {
                        getCleanBoxes(datePerfBoxes).forEach(box => drawLine(box, `Date of Performance:`));
                    }

                    if (dateSub) {
                        if (isBlankSub) {
                            getCleanBoxes(dateSubBoxes).forEach(box => drawLine(box, `Date of Submission:`));
                        } else {
                            getCleanBoxes(dateSubBoxes).forEach(box => drawLine(box, `Date of Submission: ${dateSub}`));
                        }
                    } else if (dateSubBoxes.length > 0) {
                        getCleanBoxes(dateSubBoxes).forEach(box => drawLine(box, `Date of Submission:`));
                    }

                    if (expNo) {
                        getCleanBoxes(expNoBoxes).forEach(box => {
                            let cleanPrefix = box.prefix.replace(/\s+/g, ' ').replace(/\d+$/, '').trim();
                            if (!cleanPrefix.toLowerCase().includes("experiment") && !cleanPrefix.toLowerCase().includes("assignment") && !cleanPrefix.toLowerCase().includes("exp")) {
                                cleanPrefix = "Experiment No.";
                            }
                            if (!cleanPrefix.endsWith(":") && !cleanPrefix.endsWith(".")) {
                                cleanPrefix += ".";
                            }
                            drawLine(box, `${cleanPrefix} ${expNo}`);
                        });
                    }
                }

                // File naming helper
                let detectedExpNo = "1";
                const expMatch = allFullTextStr.match(/Experiment\s*No\.?\s*(\d+)/i) || allFullTextStr.match(/Assignment\s*No\.?\s*(\d+)/i);
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
                const finalExpNo = expNo || detectedExpNo;
                const newFilename = `${safeName}_exp${finalExpNo}${detectedSubjectName}.pdf`;
                const cleanTitle = newFilename.replace(/\.pdf$/i, '');

                // Overwrite PDF Metadata (Title, Author, Subject) so browser tab & viewer show user's file name
                try {
                    pdfDoc.setTitle(cleanTitle);
                    pdfDoc.setAuthor(name);
                    if (subject) pdfDoc.setSubject(subject);
                    pdfDoc.setProducer("LabLazy PDF Editor");
                    pdfDoc.setCreator("LabLazy PDF Editor");
                } catch (metaErr) {
                    console.warn("Could not set PDF metadata:", metaErr);
                }

                // Seal and flatten any interactive form fields to ensure consistent rendering
                try {
                    const form = pdfDoc.getForm();
                    if (form) form.flatten();
                } catch (e) {
                    // Form flattening not applicable or already static
                }

                // Serialize
                const pdfBytes = await pdfDoc.save();
                
                // Create a blob & URL for individual download
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                
                // Add to ZIP
                zip.file(newFilename, pdfBytes);
                processedFiles.push({ name: newFilename, url, size: blob.size, pdfBytes: pdfBytes });
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

    function showResults(processedFiles, initialZipUrl) {
        resultsSection.classList.remove('hidden');
        processedList.innerHTML = '';

        let currentZipUrl = initialZipUrl;
        let downloadZipBtnRef = null;

        function updateZipArchive() {
            if (!downloadZipBtnRef) return;
            const updatedZip = new window.JSZip();
            processedFiles.forEach(f => {
                updatedZip.file(f.name, f.pdfBytes);
            });
            updatedZip.generateAsync({ type: "blob" }).then(b => {
                currentZipUrl = URL.createObjectURL(b);
                downloadZipBtnRef.href = currentZipUrl;
            });
        }

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
            fileInfoDiv.style.width = '100%';
            
            const nameRow = document.createElement('div');
            nameRow.className = 'name-row';
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'name-text';
            nameSpan.textContent = file.name;
            
            const renameBtn = document.createElement('button');
            renameBtn.className = 'btn-rename';
            renameBtn.title = 'Edit file name';
            renameBtn.setAttribute('aria-label', 'Edit file name');
            renameBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            `;

            let isEditing = false;
            renameBtn.addEventListener('click', () => {
                if (isEditing) return;
                isEditing = true;
                
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'rename-input';
                input.value = file.name.replace(/\.pdf$/i, '');
                
                nameRow.replaceChild(input, nameSpan);
                renameBtn.style.display = 'none';
                input.focus();
                input.select();
                
                const finishRename = () => {
                    let val = input.value.trim();
                    if (!val) val = file.name.replace(/\.pdf$/i, '');
                    if (!val.toLowerCase().endsWith('.pdf')) val += '.pdf';
                    
                    file.name = val;
                    nameSpan.textContent = val;
                    downloadBtn.download = val;
                    
                    if (input.parentNode === nameRow) {
                        nameRow.replaceChild(nameSpan, input);
                    }
                    renameBtn.style.display = 'inline-flex';
                    isEditing = false;
                    updateZipArchive();
                };
                
                input.addEventListener('blur', finishRename);
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        input.blur();
                    } else if (e.key === 'Escape') {
                        input.value = file.name.replace(/\.pdf$/i, '');
                        input.blur();
                    }
                });
            });

            nameRow.appendChild(nameSpan);
            nameRow.appendChild(renameBtn);

            const sizeSpan = document.createElement('span');
            sizeSpan.className = 'size-text';
            sizeSpan.textContent = formatFileSize(file.size);
            
            fileInfoDiv.appendChild(nameRow);
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
            downloadZipBtn.href = initialZipUrl;
            downloadZipBtn.download = "processed_lab_files.zip";
            downloadZipBtn.className = "btn-download-zip";
            downloadZipBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px; vertical-align: middle;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Download ZIP
            `;
            downloadZipBtnRef = downloadZipBtn;
            
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