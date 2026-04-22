document.addEventListener('DOMContentLoaded', () => {
    // Theme Toggle Logic
    const themeToggle = document.getElementById('themeToggle');
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
        });
        
        if (!modeSwitch.checked) {
            inputGrid.classList.add('normal-mode');
        }
    }

    let files = [];

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
        const newFiles = Array.from(e.target.files).filter(file => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
        
        if (newFiles.length === 0) {
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

    function updateFileList() {
        if (fileCountPill) fileCountPill.textContent = `${files.length} files`;
        
        if (fileListHeader) {
            fileListHeader.style.display = files.length > 0 ? 'flex' : 'none';
        }
        
        fileList.innerHTML = '';
        files.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'file-item';
            
            item.innerHTML = `
                <div class="file-name">
                    <svg class="file-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    <span>${file.name}</span>
                </div>
                <button class="btn-remove" title="Remove" onclick="window.removeFile(${index})">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            `;
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
        const originalText = processBtn.innerHTML;
        processBtn.innerHTML = `
            <svg class="spin" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s linear infinite;"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
            Processing...
        `;

        try {
            const processedFiles = [];
            const { PDFDocument, rgb } = PDFLib;
            const zip = new window.JSZip();

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
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

                    // Group text items by line (y-coordinate) to handle PDF.js text fragmentation
                    const textLines = {};
                    for (const item of textContent.items) {
                        const str = item.str;
                        if (!str.trim()) continue;
                        
                        const x = item.transform[4];
                        const y = item.transform[5];
                        const size = Math.abs(item.transform[0]) || 11.5;
                        
                        const roundedY = Math.round(y);
                        // Match within 2 pixels tolerance for baseline
                        const lineY = Object.keys(textLines).find(k => Math.abs(k - roundedY) <= 2) || roundedY;
                        
                        if (!textLines[lineY]) textLines[lineY] = [];
                        textLines[lineY].push({ str, x, y, size });
                    }

                    // Scan combined lines for labels using Regex to support various templates
                    for (const [yStr, lineItems] of Object.entries(textLines)) {
                        // Sort items horizontally
                        lineItems.sort((a, b) => a.x - b.x);
                        const origFullText = lineItems.map(i => i.str).join("");
                        const fullText = origFullText.toLowerCase();
                        
                        // Helper to precisely find the starting X position and Font Size of a matched phrase
                        const getMatchDetails = (regex) => {
                            const searchRegex = new RegExp(regex.source + "\\s*[:\\-]?\\s*", "i");
                            const match = origFullText.match(searchRegex);
                            if (!match) return null;
                            
                            const prefixStr = match[0];
                            
                            const lowerMatch = fullText.match(new RegExp(regex.source, "i"));
                            let currentLen = 0;
                            for (const i of lineItems) {
                                if (currentLen + i.str.length > lowerMatch.index) {
                                    return { x: i.x, size: i.size, prefix: prefixStr };
                                }
                                currentLen += i.str.length;
                            }
                            return { x: lineItems[0].x, size: lineItems[0].size, prefix: prefixStr };
                        };
                        
                        const nData = getMatchDetails(/(name\s*of\s*student|student\'?s?\s*name|name\s*(?=:))/);
                        if (nData) nameBoxes.push({ x: nData.x, y: lineItems[0].y, w: 300, h: nData.size || 11.5, prefix: nData.prefix });
                        
                        const iData = getMatchDetails(/(student\s*id|moodle\s*id|prn|id\s*no|id\s*(?=:))/);
                        if (iData) idBoxes.push({ x: iData.x, y: lineItems[0].y, w: 230, h: iData.size || 11.5, prefix: iData.prefix });
                        
                        const rData = getMatchDetails(/(roll\s*no|roll\s*number|roll\s*(?=:))/);
                        if (rData) rollBoxes.push({ x: rData.x, y: lineItems[0].y, w: 200, h: rData.size || 11.5, prefix: rData.prefix });

                        const divMatch = origFullText.match(/(Class\s*\/\s*Div\s*\/\s*Branch\s*:\s*)([^\/]+)\/\s*([^\/]+)\s*\/\s*(.*?)(?=\s*Roll|\s*Student|\s*ID|$)/i);
                        if (divMatch) {
                            const dData = getMatchDetails(/(class\s*\/\s*div\s*\/\s*branch\s*:)/);
                            if (dData) {
                                divBoxes.push({
                                    x: dData.x, 
                                    y: lineItems[0].y, 
                                    w: 300, 
                                    h: dData.size || 11.5,
                                    prefix: divMatch[1],
                                    classVal: divMatch[2].trim(),
                                    branchVal: divMatch[4].trim()
                                });
                            }
                        }

                        const subData = getMatchDetails(/(name\s*of\s*(?:the\s*)?subject|subject\s*name|subject)/);
                        if (subData) subjectBoxes.push({ x: subData.x, y: lineItems[0].y, w: 400, h: subData.size || 11.5, prefix: subData.prefix });

                        const instData = getMatchDetails(/(name\s*of\s*(?:the\s*)?instructor|instructor|faculty)/);
                        if (instData) instructorBoxes.push({ x: instData.x, y: lineItems[0].y, w: 400, h: instData.size || 11.5, prefix: instData.prefix });

                        const dpData = getMatchDetails(/(date\s*of\s*performance)/);
                        if (dpData) datePerfBoxes.push({ x: dpData.x, y: lineItems[0].y, w: 250, h: dpData.size || 11.5, prefix: dpData.prefix });

                        const dsData = getMatchDetails(/(date\s*of\s*submission)/);
                        if (dsData) dateSubBoxes.push({ x: dsData.x, y: lineItems[0].y, w: 250, h: dsData.size || 11.5, prefix: dsData.prefix });

                        const expData = getMatchDetails(/(experiment\s*no\.?)/);
                        if (expData) expNoBoxes.push({ x: expData.x, y: lineItems[0].y, w: 150, h: expData.size || 11.5, prefix: expData.prefix });
                    }
                    
                    pagesBoxes.push({ nameBoxes, idBoxes, rollBoxes, divBoxes, subjectBoxes, instructorBoxes, datePerfBoxes, dateSubBoxes, expNoBoxes });
                }
                
                // 3. Load PDF into pdf-lib for modification
                const pdfDoc = await PDFDocument.load(arrayBuffer);
                const pages = pdfDoc.getPages();
                
                // Embed matching font
                const timesBoldFont = await pdfDoc.embedFont(PDFLib.StandardFonts.TimesRomanBold);

                // 4 & 5. Wipe out old lines and draw new ones across ALL pages
                for (let pIndex = 0; pIndex < pages.length; pIndex++) {
                    const currentPage = pages[pIndex];
                    const { nameBoxes, idBoxes, rollBoxes, divBoxes, subjectBoxes, instructorBoxes, datePerfBoxes, dateSubBoxes, expNoBoxes } = pagesBoxes[pIndex] || { nameBoxes:[], idBoxes:[], rollBoxes:[], divBoxes:[], subjectBoxes:[], instructorBoxes:[], datePerfBoxes:[], dateSubBoxes:[], expNoBoxes:[] };
                    
                    // Determine anchor X for the right column to perfectly align items
                    let rightColX = null;
                    if (nameBoxes.length > 0 && nameBoxes[0].x > 200) {
                        rightColX = nameBoxes[0].x;
                    } else if (idBoxes.length > 0 && idBoxes[0].x > 200) {
                        rightColX = idBoxes[0].x;
                    }
                    
                    function drawWipe(box) {
                        currentPage.drawRectangle({
                            x: box.x - 2, 
                            y: box.y - 2.5, 
                            width: box.w,
                            height: box.h + 2, // Tighter height to prevent wiping the line above
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

                    nameBoxes.forEach(drawWipe);
                    idBoxes.forEach(drawWipe);
                    rollBoxes.forEach(drawWipe);
                    
                    if (isDetailed) {
                        if (div) divBoxes.forEach(drawWipe);
                        if (subject) subjectBoxes.forEach(drawWipe);
                        if (instructor) instructorBoxes.forEach(drawWipe);
                        if (datePerf) datePerfBoxes.forEach(drawWipe);
                        if (dateSub) dateSubBoxes.forEach(drawWipe);
                        if (expNo) expNoBoxes.forEach(drawWipe);
                    }
                    
                    nameBoxes.forEach(box => drawLine(box, box.prefix.trim() + " " + name));
                    idBoxes.forEach(box => drawLine(box, box.prefix.trim() + " " + moodle));
                    rollBoxes.forEach(box => drawLine(box, box.prefix.trim() + " " + roll));
                    
                    if (isDetailed) {
                        if (div) divBoxes.forEach(box => drawLine(box, `${box.prefix.trim()} ${box.classVal} / ${div} / ${box.branchVal}`));
                        if (subject) subjectBoxes.forEach(box => drawLine(box, box.prefix.trim() + " " + subject));
                        if (instructor) instructorBoxes.forEach(box => drawLine(box, box.prefix.trim() + " " + instructor));
                        if (datePerf) datePerfBoxes.forEach(box => drawLine(box, box.prefix.trim() + " " + datePerf));
                        if (dateSub) dateSubBoxes.forEach(box => drawLine(box, box.prefix.trim() + " " + dateSub));
                        if (expNo) expNoBoxes.forEach(box => drawLine(box, box.prefix.trim() + " " + expNo));
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

                processedFiles.push({ name: newFilename, url });
            }

            // Generate ZIP
            const zipBlob = await zip.generateAsync({ type: "blob" });
            const zipUrl = URL.createObjectURL(zipBlob);

            showResults(processedFiles, zipUrl);

        } catch (error) {
            console.error(error);
            alert('An error occurred while processing the PDFs.');
        } finally {
            processBtn.innerHTML = originalText;
            processBtn.disabled = false;
        }
    });

    function showResults(processedFiles, zipUrl) {
        resultsSection.classList.remove('hidden');
        processedList.innerHTML = '';

        processedFiles.forEach((file) => {
            const item = document.createElement('div');
            item.className = 'processed-item';
            item.innerHTML = `
                <div class="processed-name">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    <span>${file.name}</span>
                </div>
                <div class="action-buttons">
                    <button class="btn-preview" onclick="window.previewPdf('${file.url}')">Preview</button>
                    <a href="${file.url}" download="${file.name}" class="btn-download">Download</a>
                </div>
            `;
            processedList.appendChild(item);
        });

        if (processedFiles.length > 0) {
            const batchActions = document.createElement('div');
            batchActions.className = 'batch-actions';

            const downloadAllBtn = document.createElement('a');
            downloadAllBtn.href = "#";
            downloadAllBtn.className = "btn-download-all";
            downloadAllBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px; vertical-align: middle;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Download All (${processedFiles.length})
            `;
            
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
        iframe.src = url;
        modal.classList.remove('hidden');
    };

    closeModalBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        iframe.src = "";
    });

    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
            iframe.src = "";
        }
    });

    // Report Modal Logic
    const reportIssueBtn = document.getElementById('reportIssueBtn');
    const reportModal = document.getElementById('reportModal');
    const closeReportModal = document.getElementById('closeReportModal');

    if (reportIssueBtn && reportModal) {
        reportIssueBtn.addEventListener('click', () => {
            reportModal.classList.remove('hidden');
        });
    }

    if (closeReportModal && reportModal) {
        closeReportModal.addEventListener('click', () => {
            reportModal.classList.add('hidden');
        });
    }

    if (reportModal) {
        reportModal.addEventListener('click', (e) => {
            if (e.target === reportModal) {
                reportModal.classList.add('hidden');
            }
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
