/**
 * LabLazy PDF Editor - Format 2 Processing Module
 * Dedicated handler for Format 2 layout (Modern Lab Manual Header)
 */
(function() {
    window.processFormat2Pdf = async function(file, options, PDFLib, pdfjsLib) {
        const {
            name,
            moodle,
            roll,
            isDetailed,
            courseName,
            semester,
            academicYear,
            classVal,
            pattern,
            expNo,
            dateVal,
            isBlankDate
        } = options;

        const { PDFDocument, rgb } = PDFLib;
        const arrayBuffer = await file.arrayBuffer();

        // 1. Text extraction with PDF.js (scan first 2 pages)
        const pdfjsTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
        const pdfjsDoc = await pdfjsTask.promise;

        // Check for Scanned PDFs
        const firstPage = await pdfjsDoc.getPage(1);
        const firstPageContent = await firstPage.getTextContent();
        const totalFirstPageChars = firstPageContent.items.map(i => i.str).join("").trim().length;
        if (totalFirstPageChars === 0) {
            alert(`Warning: "${file.name}" appears to be a scanned image without a searchable text layer.`);
        }

        let allFullTextStr = "";
        const pagesBoxes = [];
        const scanPageCount = Math.min(2, pdfjsDoc.numPages);

        for (let pageNum = 1; pageNum <= scanPageCount; pageNum++) {
            const pdfjsPageVar = await pdfjsDoc.getPage(pageNum);
            const textContent = await pdfjsPageVar.getTextContent();
            allFullTextStr += textContent.items.map(i => i.str).join(" ") + " ";

            let nameBoxes = [];
            let moodleBoxes = [];
            let rollBoxes = [];
            let dateBoxes = [];
            let expNoBoxes = [];
            let courseBoxes = [];
            let semBoxes = [];
            let yearBoxes = [];
            let classBoxes = [];
            let patternBoxes = [];

            // Group text items by line (y-coordinate with 4px tolerance)
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

            // Scan lines across the page (Y >= 200)
            for (const [yStr, lineItems] of Object.entries(textLines)) {
                const lineY = lineItems[0].y;
                if (lineY < 200) continue;

                lineItems.sort((a, b) => a.x - b.x);

                let fullText = "";
                const tokenOffsets = [];
                for (const item of lineItems) {
                    const start = fullText.length;
                    fullText += (fullText.length > 0 ? " " : "") + item.str;
                    const end = fullText.length;
                    tokenOffsets.push({ item, start, end });
                }

                const getMatchDetails = (regex) => {
                    const match = fullText.match(regex);
                    if (!match) return null;
                    const matchStart = match.index;
                    const matchEnd = match.index + match[0].length;
                    const matchedTokens = tokenOffsets.filter(t => t.end > matchStart && t.start < matchEnd);
                    if (matchedTokens.length === 0) return null;

                    const startX = Math.min(...matchedTokens.map(t => t.item.x));
                    const endX = Math.max(...matchedTokens.map(t => t.item.x + (t.item.width || (t.item.str.length * (t.item.size || 11.5) * 0.55))));
                    const width = Math.max(30, endX - startX);
                    const size = Math.max(...matchedTokens.map(t => t.item.size || 11.5));
                    const y = matchedTokens[0].item.y;

                    return { x: startX, startX, width, y, size, prefix: match[0], fullLineText: fullText };
                };

                // 1. Upper Header Section:
                const courseData = getMatchDetails(/(?:\bcourse\s*name|\bname\s*of\s*(?:the\s*)?course|\bsubject\s*name|\bsubject\b\s*:|\bcourse\b\s*:)(?:\s*[:\-]?\s*)/i);
                if (courseData) courseBoxes.push({ x: courseData.x, y: courseData.y, w: 320, h: courseData.size || 11.5, prefix: courseData.prefix });

                const semData = getMatchDetails(/(?:\bsemester\b|\bsem\b)\s*[:\-]?\s*/i);
                if (semData && !courseData) semBoxes.push({ x: semData.x, y: semData.y, w: 200, h: semData.size || 11.5, prefix: semData.prefix });

                const yrData = getMatchDetails(/(?:\byear\b|\bacademic\s*year|\bacad\s*\.?\s*year|\ba\.?\s*y\.?\b)\s*[:\-]?\s*/i);
                if (yrData && !courseData && !semData) yearBoxes.push({ x: yrData.x, y: yrData.y, w: 260, h: yrData.size || 11.5, prefix: yrData.prefix });

                const clsData = getMatchDetails(/(?:\bclass\b\s*[:\-]?\s*)(?!.*div.*branch)/i);
                if (clsData && clsData.x > 250) {
                    classBoxes.push({ x: clsData.x, y: clsData.y, w: 260, h: clsData.size || 11.5, prefix: clsData.prefix });
                }

                const patData = getMatchDetails(/(?:\bpattern\b\s*[:\-]?\s*)/i);
                if (patData && patData.x > 250) {
                    patternBoxes.push({ x: patData.x, y: patData.y, w: 260, h: patData.size || 11.5, prefix: patData.prefix });
                }

                // 2. Middle Section: Experiment No
                const expData = getMatchDetails(/(?:(?:\bexperiment|\bassignment|\bexp\b)\s*(?:no\.?|number)?\s*[:\-]?\s*(\d+|[ivxlcdm]+)?)/i);
                if (expData && !courseData && !semData && !yrData && !clsData && !patData) {
                    expNoBoxes.push({
                        x: expData.startX,
                        y: expData.y,
                        w: expData.width,
                        h: expData.size || 13,
                        prefix: expData.prefix
                    });
                }

                // 3. Lower Student Info Block (Strictly if not an upper header or experiment line)
                if (!courseData && !semData && !yrData && !clsData && !patData && !expData) {
                    const nData = getMatchDetails(/(?:\bname(?:\s*of)?\s*(?:the\s*)?student|\bstudent\'?s?\s*name|\bstudent\s*name|\bfull\s*name|\bname\b\s*:)(?:\s*[:\-]?\s*)/i);
                    if (nData) nameBoxes.push({ x: nData.x, y: nData.y, w: 340, h: nData.size || 11.5, prefix: nData.prefix });

                    const mData = getMatchDetails(/(?:\bmoodle\s*no\.?|\bmoodle\s*id|\bstudent\s*id|\bprn\s*no\.?|\bid\s*no\.?|\bmoodle\b\s*:|\bid\b\s*:)(?:\s*[:\-]?\s*)/i);
                    if (mData) moodleBoxes.push({ x: mData.x, y: mData.y, w: 300, h: mData.size || 11.5, prefix: mData.prefix });

                    const rData = getMatchDetails(/(?:\broll\s*no\.?(?:\s*[:\-]*)?|\broll\s*number|\broll\s*no\b|\broll\b\s*:)(?:\s*[:\-]?\s*)/i);
                    if (rData) rollBoxes.push({ x: rData.x, y: rData.y, w: 260, h: rData.size || 11.5, prefix: rData.prefix });

                    const dData = getMatchDetails(/(?:\bdate\b\s*[:\-]?\s*)/i);
                    if (dData && !nData && !mData && !rData) {
                        dateBoxes.push({ x: dData.x, y: dData.y, w: 260, h: dData.size || 11.5, prefix: dData.prefix });
                    }
                }
            }

            // Synthetic fallback if lower left section has partial matches
            if (moodleBoxes.length > 0) {
                const primeM = moodleBoxes[0];
                if (nameBoxes.length === 0) {
                    nameBoxes.push({ x: primeM.x, y: primeM.y + 14, w: 340, h: primeM.h, prefix: "Name of the Student:" });
                }
                if (rollBoxes.length === 0) {
                    rollBoxes.push({ x: primeM.x, y: primeM.y - 14, w: 260, h: primeM.h, prefix: "Roll No. :-" });
                }
                if (dateBoxes.length === 0) {
                    dateBoxes.push({ x: primeM.x, y: primeM.y - 28, w: 260, h: primeM.h, prefix: "Date:" });
                }
            } else if (nameBoxes.length > 0) {
                const primeN = nameBoxes[0];
                if (moodleBoxes.length === 0) {
                    moodleBoxes.push({ x: primeN.x, y: primeN.y - 14, w: 300, h: primeN.h, prefix: "Moodle No:" });
                }
                if (rollBoxes.length === 0) {
                    rollBoxes.push({ x: primeN.x, y: primeN.y - 28, w: 260, h: primeN.h, prefix: "Roll No. :-" });
                }
                if (dateBoxes.length === 0) {
                    dateBoxes.push({ x: primeN.x, y: primeN.y - 42, w: 260, h: primeN.h, prefix: "Date:" });
                }
            }

            pagesBoxes.push({
                nameBoxes,
                moodleBoxes,
                rollBoxes,
                dateBoxes,
                expNoBoxes,
                courseBoxes,
                semBoxes,
                yearBoxes,
                classBoxes,
                patternBoxes
            });
        }

        try {
            await pdfjsDoc.destroy();
        } catch (e) {
            console.warn("Failed to destroy pdfjsDoc:", e);
        }

        // 2. Load PDF into pdf-lib and apply modifications
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const pages = pdfDoc.getPages();
        const timesBoldFont = await pdfDoc.embedFont(PDFLib.StandardFonts.TimesRomanBold);

        for (let pIndex = 0; pIndex < Math.min(pages.length, pagesBoxes.length); pIndex++) {
            const currentPage = pages[pIndex];
            const pageWidth = currentPage.getWidth();
            const pBoxes = pagesBoxes[pIndex] || {};

            const {
                nameBoxes = [],
                moodleBoxes = [],
                rollBoxes = [],
                dateBoxes = [],
                expNoBoxes = [],
                courseBoxes = [],
                semBoxes = [],
                yearBoxes = [],
                classBoxes = [],
                patternBoxes = []
            } = pBoxes;

            function getCleanBoxes(boxArray) {
                if (!boxArray || boxArray.length <= 1) return boxArray || [];
                const clean = [];
                boxArray.forEach(b => {
                    const exists = clean.some(c => Math.abs(c.y - b.y) <= 8 && Math.abs(c.x - b.x) <= 30);
                    if (!exists) clean.push(b);
                });
                return clean;
            }

            function formatPrefix(rawPrefix, defaultLabel) {
                if (!rawPrefix) return defaultLabel;
                let clean = rawPrefix.replace(/\s+/g, ' ').trim();
                clean = clean.replace(/[:\-]+$/, '').trim();
                if (!clean) return defaultLabel;
                return `${clean}:`;
            }

            function drawWipe(box, customW) {
                const wipeX = Math.max(0, box.x - 4);
                const wipeW = customW || Math.max(box.w + 10, 240);
                const wipeH = Math.max(box.h + 3.5, 14.5);
                const wipeY = box.y - 3.5;

                currentPage.drawRectangle({
                    x: wipeX,
                    y: wipeY,
                    width: Math.min(wipeW, pageWidth - wipeX - 10),
                    height: wipeH,
                    color: rgb(1, 1, 1)
                });
            }

            function drawLine(box, text, maxW) {
                let fontSize = box.h || 11.5;
                const limitW = maxW || Math.min(box.w || 320, pageWidth - box.x - 20);
                let textWidth = timesBoldFont.widthOfTextAtSize(text, fontSize);
                while (textWidth > limitW && fontSize > 7.5) {
                    fontSize -= 0.25;
                    textWidth = timesBoldFont.widthOfTextAtSize(text, fontSize);
                }

                currentPage.drawText(text, {
                    x: box.x,
                    y: box.y,
                    size: fontSize,
                    font: timesBoldFont,
                    color: rgb(0, 0, 0)
                });
            }

            // ==========================================
            // PHASE 1: EXECUTE ALL WIPES FIRST
            // ==========================================
            // 1. Lower Student Info Wipes
            getCleanBoxes(nameBoxes).forEach(box => drawWipe(box, 340));
            getCleanBoxes(moodleBoxes).forEach(box => drawWipe(box, 300));
            getCleanBoxes(rollBoxes).forEach(box => drawWipe(box, 260));

            // 2. Date Wipe (if provided)
            if (isDetailed && dateVal) {
                getCleanBoxes(dateBoxes).forEach(box => drawWipe(box, 260));
            }

            // 3. Experiment No Wipe (if provided)
            if (isDetailed && expNo) {
                getCleanBoxes(expNoBoxes).forEach(box => {
                    let cleanPrefix = box.prefix || "Experiment No:";
                    cleanPrefix = cleanPrefix.replace(/\s+/g, ' ').replace(/[:\-\s\d]+$/, '').trim();
                    if (!cleanPrefix.toLowerCase().includes("experiment") && !cleanPrefix.toLowerCase().includes("exp")) {
                        cleanPrefix = "Experiment No";
                    }
                    const fullExpText = `${cleanPrefix}: ${expNo}`;
                    const textW = timesBoldFont.widthOfTextAtSize(fullExpText, box.h || 13);
                    const wipeW = Math.max(box.w + 20, textW + 20);
                    drawWipe(box, wipeW);
                });
            }

            // 4. Upper Header Section Wipes (if provided)
            if (isDetailed && courseName) {
                getCleanBoxes(courseBoxes).forEach(box => drawWipe(box, 300));
            }
            if (isDetailed && semester) {
                getCleanBoxes(semBoxes).forEach(box => drawWipe(box, 200));
            }
            if (isDetailed && academicYear) {
                getCleanBoxes(yearBoxes).forEach(box => drawWipe(box, 260));
            }
            if (isDetailed && classVal) {
                getCleanBoxes(classBoxes).forEach(box => drawWipe(box, 260));
            }
            if (isDetailed && pattern) {
                getCleanBoxes(patternBoxes).forEach(box => drawWipe(box, 260));
            }

            // ==========================================
            // PHASE 2: DRAW ALL REPLACEMENT TEXT
            // ==========================================
            // 1. Name of Student
            getCleanBoxes(nameBoxes).forEach(box => {
                const prefix = formatPrefix(box.prefix, "Name of the Student:");
                drawLine(box, `${prefix} ${name}`, 360);
            });

            // 2. Moodle No
            getCleanBoxes(moodleBoxes).forEach(box => {
                const prefix = formatPrefix(box.prefix, "Moodle No:");
                drawLine(box, `${prefix} ${moodle}`, 320);
            });

            // 3. Roll No
            getCleanBoxes(rollBoxes).forEach(box => {
                let prefix = box.prefix || "Roll No. :-";
                if (!prefix.includes(":-") && !prefix.includes(":")) prefix += ":";
                prefix = prefix.replace(/\s+/g, ' ').trim();
                drawLine(box, `${prefix} ${roll}`, 280);
            });

            // 4. Date (if detailed mode and dateVal provided)
            if (isDetailed && dateVal) {
                getCleanBoxes(dateBoxes).forEach(box => {
                    const prefix = formatPrefix(box.prefix, "Date:");
                    if (isBlankDate) {
                        drawLine(box, `${prefix}`, 280);
                    } else {
                        drawLine(box, `${prefix} ${dateVal}`, 280);
                    }
                });
            }

            // 5. Experiment No
            if (isDetailed && expNo) {
                getCleanBoxes(expNoBoxes).forEach(box => {
                    let cleanPrefix = box.prefix || "Experiment No:";
                    cleanPrefix = cleanPrefix.replace(/\s+/g, ' ').replace(/[:\-\s\d]+$/, '').trim();
                    if (!cleanPrefix.toLowerCase().includes("experiment") && !cleanPrefix.toLowerCase().includes("exp")) {
                        cleanPrefix = "Experiment No";
                    }
                    const fullExpText = `${cleanPrefix}: ${expNo}`;
                    drawLine(box, fullExpText, pageWidth - box.x - 20);
                });
            }

            // 6. Upper Header Fields
            if (isDetailed && courseName) {
                getCleanBoxes(courseBoxes).forEach(box => {
                    const prefix = formatPrefix(box.prefix, "COURSE NAME:");
                    drawLine(box, `${prefix} ${courseName}`, 320);
                });
            }

            if (isDetailed && semester) {
                getCleanBoxes(semBoxes).forEach(box => {
                    const prefix = formatPrefix(box.prefix, "SEM:");
                    drawLine(box, `${prefix} ${semester}`, 220);
                });
            }

            if (isDetailed && academicYear) {
                getCleanBoxes(yearBoxes).forEach(box => {
                    const prefix = formatPrefix(box.prefix, "YEAR:");
                    drawLine(box, `${prefix} ${academicYear}`, 280);
                });
            }

            if (isDetailed && classVal) {
                getCleanBoxes(classBoxes).forEach(box => {
                    const prefix = formatPrefix(box.prefix, "Class:");
                    drawLine(box, `${prefix} ${classVal}`, 280);
                });
            }

            if (isDetailed && pattern) {
                getCleanBoxes(patternBoxes).forEach(box => {
                    const prefix = formatPrefix(box.prefix, "Pattern:");
                    drawLine(box, `${prefix} ${pattern}`, 280);
                });
            }
        }

        // Determine filename
        let detectedExpNo = "1";
        const expMatch = allFullTextStr.match(/Experiment\s*No\.?\s*[:\-]?\s*(\d+)/i) || allFullTextStr.match(/Exp\s*No\.?\s*[:\-]?\s*(\d+)/i);
        if (expMatch) {
            detectedExpNo = expMatch[1];
        }

        let detectedCourse = "";
        if (isDetailed && courseName) {
            detectedCourse = "_" + courseName.trim().replace(/\s+/g, '_').toLowerCase();
        } else {
            const courseMatch = allFullTextStr.match(/(?:COURSE\s*NAME|Course\s*Name|Subject)\s*[:\-]?\s*([a-zA-Z0-9\s&]+?)(?=\s+(?:SEM|Class|Pattern|YEAR|Experiment|Exp|Name|Date))/i);
            if (courseMatch && courseMatch[1]) {
                detectedCourse = "_" + courseMatch[1].trim().replace(/\s+/g, '_').toLowerCase();
            }
        }

        const safeName = name.replace(/\s+/g, '_').toLowerCase();
        const finalExpNo = (isDetailed && expNo) ? expNo : detectedExpNo;
        const newFilename = `${safeName}_exp${finalExpNo}${detectedCourse}.pdf`;
        const cleanTitle = newFilename.replace(/\.pdf$/i, '');

        try {
            pdfDoc.setTitle(cleanTitle);
            pdfDoc.setAuthor(name);
            if (courseName) pdfDoc.setSubject(courseName);
            pdfDoc.setProducer("LabLazy PDF Editor");
            pdfDoc.setCreator("LabLazy PDF Editor");
        } catch (metaErr) {
            console.warn("Could not set PDF metadata:", metaErr);
        }

        try {
            const form = pdfDoc.getForm();
            if (form) form.flatten();
        } catch (e) {}

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        return {
            newFilename,
            pdfBytes,
            item: { name: newFilename, url, size: blob.size, pdfBytes }
        };
    };
})();
