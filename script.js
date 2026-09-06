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

                // Keep track of all text across all pages for filename detection
                let allFullTextStr = "";
                const pagesAnchors = [];
                
                for (let pageNum = 1; pageNum <= pdfjsDoc.numPages; pageNum++) {
                    const pdfjsPageVar = await pdfjsDoc.getPage(pageNum);
                    const textContent = await pdfjsPageVar.getTextContent();
                    allFullTextStr += textContent.items.map(i => i.str).join(" ") + " ";
                    
                    // Group text items by line (y-coordinate) with 4px tolerance
                    const textLines = {};
                    for (const item of textContent.items) {
                        const str = item.str;
                        if (!str.trim()) continue;
                        
                        const x = item.transform[4];
                        const y = item.transform[5];
                        const size = Math.abs(item.transform[0]) || 11.5;
                        const width = item.width || (str.length * size * 0.55);
                        
                        const roundedY = Math.round(y);
                        const lineY = Object.keys(textLines).find(k => Math.abs(k - roundedY) <= 4) || roundedY;
                        
                        if (!textLines[lineY]) textLines[lineY] = [];
                        textLines[lineY].push({ str, x, y, size, width });
                    }

                    // Field anchors detected on this page
                    const pageFields = {
                        name: null,
                        id: null,
                        roll: null,
                        classDiv: null,
                        subject: null,
                        instructor: null,
                        datePerf: null,
                        dateSub: null,
                        academicYear: null,
                        semester: null,
                        expNo: null
                    };

                    // Dynamic regex definitions for labels
                    const patterns = {
                        name: /(?:\bstudent(?:'s)?\s*name|\bname\s*of\s*(?:the\s*)?student|\bfull\s*name|\bname\b\s*:)/i,
                        id: /(?:\bstudent\s*id|\bmoodle\s*id|\bprn\s*no\.?|\bid\s*no\.?|\bstudent\s*id\b|\bid\b\s*:)/i,
                        roll: /(?:\broll\s*no\.?|\broll\s*number|\broll\s*no\b|\broll\b\s*:)/i,
                        classDiv: /(?:\bclass\s*(?:\/|\s*)\s*div(?:ision)?\s*(?:\/|\s*)\s*branch|\bclass\s*(?:\/|\s*)\s*branch\s*(?:\/|\s*)\s*div(?:ision)?|\bclass\s*(?:\/|\s*)\s*div(?:ision)?|\bdiv(?:ision)?\s*(?:\/|\s*)\s*branch)/i,
                        academicYear: /(?:\bacademic\s*year|\bacad\s*\.?\s*year|\ba\.?\s*y\.?\b)\s*[:\-]?/i,
                        semester: /(?:\bsemester\b|\bsem\b)\s*[:\-]?/i,
                        subject: /(?:\bname\s*of\s*(?:the\s*)?subject|\bsubject\s*name|\bsubject\b\s*:)/i,
                        instructor: /(?:\bname\s*of\s*(?:the\s*)?instructor|\binstructor\b\s*:|\bfaculty\b\s*:)/i,
                        datePerf: /(?:\bdate\s*of\s*performance|\bperformance\s*date|\bdate\s*of\s*perf|\bdate\s*perf)\s*[:\-]?/i,
                        dateSub: /(?:\bdate\s*of\s*submission|\bsubmission\s*date|\bdate\s*of\s*sub|\bdate\s*sub)\s*[:\-]?/i,
                        expNo: /(?:\bexperiment\s*(?:no\.?|number)?|\bexp\.?\s*(?:no\.?|number)?|\bassignment\s*(?:no\.?|number)?)\s*[:\-]?/i
                    };

                    // Scan every line dynamically without hardcoded Y limits
                    for (const [yStr, lineItems] of Object.entries(textLines)) {
                        lineItems.sort((a, b) => a.x - b.x);

                        // Build concatenated line string and offset mapping
                        let lineStr = "";
                        const tokenOffsets = [];
                        for (const item of lineItems) {
                            const start = lineStr.length;
                            lineStr += (lineStr.length > 0 ? " " : "") + item.str;
                            const end = lineStr.length;
                            tokenOffsets.push({ item, start, end });
                        }

                        // Helper to find exact anchor and bounding box for a field
                        const matchField = (fieldKey, regex) => {
                            if (pageFields[fieldKey]) return; // Already matched for this page
                            const match = lineStr.match(regex);
                            if (!match) return;

                            const matchIdx = match.index;
                            const matchEndIdx = matchIdx + match[0].length;

                            // Identify start and end tokens of the matched label
                            const startToken = tokenOffsets.find(t => matchIdx >= t.start && matchIdx <= t.end) || tokenOffsets[0];
                            const endToken = tokenOffsets.find(t => matchEndIdx >= t.start && matchEndIdx <= t.end) || startToken;

                            // Calculate exact right edge X coordinate where value starts
                            let valueStartX = endToken.item.x + endToken.item.width + 4;
                            
                            // If label and value are inside the same single token, estimate right edge
                            if (startToken === endToken && startToken.item.str.length > match[0].length) {
                                const ratio = match[0].length / startToken.item.str.length;
                                valueStartX = startToken.item.x + (startToken.item.width * ratio) + 3;
                            }

                            // Determine available width until next item on the same line or right margin
                            let availableWidth = 200;
                            const nextItem = lineItems.find(it => it.x > valueStartX + 20);
                            if (nextItem) {
                                availableWidth = Math.max(nextItem.x - valueStartX - 8, 50);
                            } else {
                                availableWidth = 595 - valueStartX - 25; // Standard page width boundary
                            }

                            // Special parsing for Class / Div / Branch components
                            let classVal = "T.E.";
                            let branchVal = "CSE(AI&ML)";
                            if (fieldKey === "classDiv") {
                                const partsMatch = lineStr.match(/[:\-]\s*([^\/|\-]+)[\/|\-]\s*([^\/|\-]+)[\/|\-]\s*([^(\n\r]+?)(?=\s*Roll|\s*Student|\s*ID|$)/i);
                                if (partsMatch) {
                                    classVal = partsMatch[1].trim();
                                    branchVal = partsMatch[3].trim();
                                } else {
                                    if (lineStr.includes("T.E") || lineStr.includes("TE")) classVal = "T.E.";
                                    else if (lineStr.includes("S.E") || lineStr.includes("SE")) classVal = "S.E.";
                                    else if (lineStr.includes("B.E") || lineStr.includes("BE")) classVal = "B.E.";
                                    else if (lineStr.includes("F.E") || lineStr.includes("FE")) classVal = "F.E.";
                                    
                                    const branchMatch = lineStr.match(/(?:CSE\s*\([^\)]+\)|AI&ML|AIML|DS|IT|EXTC|COMP|COMPS|CIVIL|MECH)/i);
                                    if (branchMatch) branchVal = branchMatch[0].trim();
                                }
                            }

                            pageFields[fieldKey] = {
                                labelStartX: startToken.item.x,
                                valueStartX: valueStartX,
                                y: startToken.item.y,
                                size: startToken.item.size,
                                prefix: match[0],
                                availableWidth: availableWidth,
                                classVal: classVal,
                                branchVal: branchVal,
                                rawLine: lineStr
                            };
                        };

                        // Match all metadata labels
                        matchField("name", patterns.name);
                        matchField("id", patterns.id);
                        matchField("roll", patterns.roll);
                        matchField("classDiv", patterns.classDiv);
                        matchField("academicYear", patterns.academicYear);
                        matchField("semester", patterns.semester);
                        matchField("subject", patterns.subject);
                        matchField("instructor", patterns.instructor);
                        matchField("datePerf", patterns.datePerf);
                        matchField("dateSub", patterns.dateSub);
                        matchField("expNo", patterns.expNo);
                    }

                    pagesAnchors.push(pageFields);
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

                // Auto-Shrink Font Drawer: prevents long text from bleeding into neighboring columns/margins
                function drawAutoShrinkText(page, text, startX, baselineY, maxWidth, defaultFontSize, color) {
                    if (!text) return;
                    let fontSize = defaultFontSize || 11.5;
                    let textWidth = timesBoldFont.widthOfTextAtSize(text, fontSize);
                    while (textWidth > maxWidth && fontSize > 7.5) {
                        fontSize -= 0.25;
                        textWidth = timesBoldFont.widthOfTextAtSize(text, fontSize);
                    }
                    page.drawText(text, {
                        x: startX,
                        y: baselineY,
                        size: fontSize,
                        font: timesBoldFont,
                        color: color || rgb(0, 0, 0),
                    });
                }

                // Surgical Whiteout Masking: wipes ONLY the value area directly after the label
                function surgicalWipe(page, anchor, customWidth) {
                    if (!anchor) return;
                    const wipeX = Math.max(0, anchor.valueStartX - 2);
                    const wipeW = customWidth || anchor.availableWidth || 120;
                    const wipeH = Math.max(anchor.size + 4, 15);
                    const wipeY = anchor.y - 3.5;

                    page.drawRectangle({
                        x: wipeX,
                        y: wipeY,
                        width: wipeW,
                        height: wipeH,
                        color: rgb(1, 1, 1),
                    });
                }

                // 4 & 5. Apply surgical wipeout and auto-shrink dynamic text replacement on all pages
                for (let pIndex = 0; pIndex < pages.length; pIndex++) {
                    const currentPage = pages.at(pIndex);
                    const anchors = pagesAnchors.at(pIndex) || {};

                    // Student Name
                    if (name && anchors.name) {
                        surgicalWipe(currentPage, anchors.name);
                        drawAutoShrinkText(currentPage, name, anchors.name.valueStartX, anchors.name.y, anchors.name.availableWidth, anchors.name.size);
                    }

                    // Student ID / Moodle ID
                    if (moodle && anchors.id) {
                        surgicalWipe(currentPage, anchors.id);
                        drawAutoShrinkText(currentPage, moodle, anchors.id.valueStartX, anchors.id.y, anchors.id.availableWidth, anchors.id.size);
                    }

                    // Roll Number
                    if (roll && anchors.roll) {
                        surgicalWipe(currentPage, anchors.roll);
                        drawAutoShrinkText(currentPage, roll, anchors.roll.valueStartX, anchors.roll.y, anchors.roll.availableWidth, anchors.roll.size);
                    }

                    // Class / Div / Branch
                    if (anchors.classDiv) {
                        if (classDivBranch) {
                            surgicalWipe(currentPage, anchors.classDiv);
                            drawAutoShrinkText(currentPage, classDivBranch, anchors.classDiv.valueStartX, anchors.classDiv.y, anchors.classDiv.availableWidth, anchors.classDiv.size);
                        } else if (div) {
                            surgicalWipe(currentPage, anchors.classDiv);
                            const updatedClassDiv = `${anchors.classDiv.classVal} / ${div} / ${anchors.classDiv.branchVal}`;
                            drawAutoShrinkText(currentPage, updatedClassDiv, anchors.classDiv.valueStartX, anchors.classDiv.y, anchors.classDiv.availableWidth, anchors.classDiv.size);
                        }
                    }

                    // Academic Year
                    if (academicYear && anchors.academicYear) {
                        surgicalWipe(currentPage, anchors.academicYear);
                        drawAutoShrinkText(currentPage, academicYear, anchors.academicYear.valueStartX, anchors.academicYear.y, anchors.academicYear.availableWidth, anchors.academicYear.size);
                    }

                    // Semester
                    if (semester && anchors.semester) {
                        surgicalWipe(currentPage, anchors.semester);
                        drawAutoShrinkText(currentPage, semester, anchors.semester.valueStartX, anchors.semester.y, anchors.semester.availableWidth, anchors.semester.size);
                    }

                    // Subject
                    if (subject && anchors.subject) {
                        surgicalWipe(currentPage, anchors.subject);
                        drawAutoShrinkText(currentPage, subject, anchors.subject.valueStartX, anchors.subject.y, anchors.subject.availableWidth, anchors.subject.size);
                    }

                    // Instructor
                    if (instructor && anchors.instructor) {
                        surgicalWipe(currentPage, anchors.instructor);
                        drawAutoShrinkText(currentPage, instructor, anchors.instructor.valueStartX, anchors.instructor.y, anchors.instructor.availableWidth, anchors.instructor.size);
                    }

                    // Date of Performance
                    if (anchors.datePerf) {
                        surgicalWipe(currentPage, anchors.datePerf);
                        if (datePerf && !isBlankPerf) {
                            drawAutoShrinkText(currentPage, datePerf, anchors.datePerf.valueStartX, anchors.datePerf.y, anchors.datePerf.availableWidth, anchors.datePerf.size);
                        }
                    }

                    // Date of Submission
                    if (anchors.dateSub) {
                        surgicalWipe(currentPage, anchors.dateSub);
                        if (dateSub && !isBlankSub) {
                            drawAutoShrinkText(currentPage, dateSub, anchors.dateSub.valueStartX, anchors.dateSub.y, anchors.dateSub.availableWidth, anchors.dateSub.size);
                        }
                    }

                    // Experiment No / Assignment No
                    if (expNo && anchors.expNo) {
                        // Title header wipe
                        const titleWipeX = Math.max(0, anchors.expNo.labelStartX - 4);
                        currentPage.drawRectangle({
                            x: titleWipeX,
                            y: anchors.expNo.y - 4,
                            width: Math.max(anchors.expNo.availableWidth + 60, 220),
                            height: Math.max(anchors.expNo.size + 6, 18),
                            color: rgb(1, 1, 1),
                        });
                        let cleanPrefix = anchors.expNo.prefix.replace(/\s+/g, ' ').replace(/\d+$/, '').trim();
                        if (!cleanPrefix.toLowerCase().includes("experiment") && !cleanPrefix.toLowerCase().includes("assignment") && !cleanPrefix.toLowerCase().includes("exp")) {
                            cleanPrefix = "Experiment No.";
                        }
                        if (!cleanPrefix.endsWith(":") && !cleanPrefix.endsWith(".")) {
                            cleanPrefix += ".";
                        }
                        drawAutoShrinkText(currentPage, `${cleanPrefix} ${expNo}`, anchors.expNo.labelStartX, anchors.expNo.y, 300, anchors.expNo.size);
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