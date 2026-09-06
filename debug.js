const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const htmlPath = path.join(__dirname, 'website', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const dom = new JSDOM(html);
const { window } = dom;

console.log("DOM loaded successfully!");
const chooseReceiveRoleBtn = window.document.getElementById('chooseReceiveRoleBtn');
console.log("chooseReceiveRoleBtn element exists:", !!chooseReceiveRoleBtn);

const viewsSlider = window.document.getElementById('viewsSlider');
console.log("viewsSlider classList before:", viewsSlider.classList.toString());

const secondaryView = window.document.getElementById('sharedrop-secondary-view');
console.log("secondaryView classList before:", secondaryView.classList.toString());
