const fs = require('fs');
const pdfjsLib = require('pdfjs-dist');

async function main() {
    const data = new Uint8Array(fs.readFileSync('d:\\PDF\\parag_gupta_exp9.pdf'));
    const pdfjsDoc = await pdfjsLib.getDocument({data}).promise;
    const pdfjsPage = await pdfjsDoc.getPage(1);
    const textContent = await pdfjsPage.getTextContent();
    
    let nameBoxes = [];

    const textLines = {};
    for (const item of textContent.items) {
        const str = item.str;
        if (!str.trim()) continue;
        
        const x = item.transform[4];
        const y = item.transform[5];
        const size = Math.abs(item.transform[0]) || 11.5;
        
        const roundedY = Math.round(y);
        const lineY = Object.keys(textLines).find(k => Math.abs(k - roundedY) <= 2) || roundedY;
        
        if (!textLines[lineY]) textLines[lineY] = [];
        textLines[lineY].push({ str, x, y, size });
    }

    for (const [yStr, lineItems] of Object.entries(textLines)) {
        lineItems.sort((a, b) => a.x - b.x);
        
        // Log lineItems that refer to Name or Student to debug
        const fullText = lineItems.map(i => i.str).join("").toLowerCase();
        if (fullText.includes("name") || fullText.includes("student")) {
            console.log("Found line at Y", yStr, ": ", fullText);
            console.log("Items:", lineItems.map(i => `'${i.str}' (x:${i.x.toFixed(1)})`).join(", "));
        }
        
        const getStartX = (regex) => {
            const match = fullText.match(regex);
            if (!match) return null;
            
            let currentLen = 0;
            for (const i of lineItems) {
                if (currentLen + i.str.length > match.index) {
                    return i.x;
                }
                currentLen += i.str.length;
            }
            return lineItems[0].x;
        };
        
        const nX = getStartX(/(name\s*of\s*student|student\s*name|^name\s*:)/);
        if (nX !== null) nameBoxes.push({ x: nX, y: lineItems[0].y, w: 230, h: lineItems[0].size || 11.5, fullText });
    }
    
    console.log("nameBoxes:", nameBoxes);
}
main().catch(console.error);
