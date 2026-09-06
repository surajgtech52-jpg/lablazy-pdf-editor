const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const htmlPath = path.join(__dirname, 'website', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

// Load page in JSDOM
const dom = new JSDOM(html, {
    runScripts: "dangerously",
    url: "http://localhost/",
    beforeParse(window) {
        // Mock WebSocket
        window.WebSocket = class {
            constructor() {}
            addEventListener() {}
            removeEventListener() {}
        };
        // Mock fetch to succeed
        window.fetch = (url) => {
            console.log("Mock fetch called for:", url);
            return Promise.resolve({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ status: "healthy", fileName: "test.pdf", fileSize: 1024 })
            });
        };
    }
});

const { window } = dom;

console.log("JSDOM initialized");

// Evaluate sharedrop.js in JSDOM context
const sharedropJs = fs.readFileSync(path.join(__dirname, 'website', 'sharedrop.js'), 'utf8');
try {
    window.eval(sharedropJs);
    console.log("sharedrop.js evaluated successfully");
} catch (e) {
    console.error("Evaluation error:", e);
}

// Dispatch DOMContentLoaded
const event = window.document.createEvent("Event");
event.initEvent("DOMContentLoaded", true, true);
window.document.dispatchEvent(event);
console.log("DOMContentLoaded event dispatched");

// Wait for a short moment to let checkSystemHealth resolve
setTimeout(() => {
    // Find elements
    const chooseReceiveRoleBtn = window.document.getElementById('chooseReceiveRoleBtn');
    console.log("chooseReceiveRoleBtn element exists:", !!chooseReceiveRoleBtn);

    const viewsSlider = window.document.getElementById('viewsSlider');
    console.log("viewsSlider class before click:", viewsSlider.classList.toString());

    const secondaryView = window.document.getElementById('sharedrop-secondary-view');
    console.log("secondaryView class before click:", secondaryView.classList.toString());

    // Simulate click
    if (chooseReceiveRoleBtn) {
        chooseReceiveRoleBtn.click();
        console.log("Clicked chooseReceiveRoleBtn");
        console.log("viewsSlider class after click:", viewsSlider.classList.toString());
        console.log("secondaryView class after click:", secondaryView.classList.toString());
        
        // Check which containers are hidden/shown inside secondaryView
        const roleSelectionContainer = window.document.getElementById('roleSelectionContainer');
        const sendUploadContainer = window.document.getElementById('sendUploadContainer');
        const radarDisplayContainer = window.document.getElementById('radarDisplayContainer');
        
        console.log("roleSelectionContainer hidden:", roleSelectionContainer.classList.contains('hidden'));
        console.log("sendUploadContainer hidden:", sendUploadContainer.classList.contains('hidden'));
        console.log("radarDisplayContainer hidden:", radarDisplayContainer.classList.contains('hidden'));
        
        // Check receiverTransferScreen visibility
        const receiverTransferScreen = window.document.getElementById('receiverTransferScreen');
        console.log("receiverTransferScreen hidden:", receiverTransferScreen.classList.contains('hidden'));
    } else {
        console.log("Could not find chooseReceiveRoleBtn");
    }
}, 100);
