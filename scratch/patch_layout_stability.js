import fs from 'fs';
import { resolve } from 'path';

function main() {
    console.log("Running patch_layout_stability.js...");

    // 1. PATCH admin.html
    const htmlPath = resolve('admin.html');
    let htmlContent = fs.readFileSync(htmlPath, 'utf-8');
    htmlContent = htmlContent.replace(/\r\n/g, '\n');

    // Add scrollbar-gutter stable to html tag styling, and max-width + margin to tab-panel
    const old_body_style = `        body {
            margin: 0;
            padding: 0;
            background: var(--dark-bg);
            color: #fff;
            font-family: 'Cairo', sans-serif;
            overflow-x: hidden;
        }`;

    const new_body_style = `        html {
            scrollbar-gutter: stable;
        }
        body {
            margin: 0;
            padding: 0;
            background: var(--dark-bg);
            color: #fff;
            font-family: 'Cairo', sans-serif;
            overflow-x: hidden;
        }`;

    if (htmlContent.includes(old_body_style)) {
        htmlContent = htmlContent.replace(old_body_style, new_body_style);
    } else {
        console.log("WARNING: old_body_style not found!");
    }

    const old_tab_panel_style = `        .tab-panel { display: none; padding: 0 15px 30px; }`;
    const new_tab_panel_style = `        .tab-panel { display: none; padding: 0 15px 30px; max-width: 1200px; margin: 0 auto; }`;

    if (htmlContent.includes(old_tab_panel_style)) {
        htmlContent = htmlContent.replace(old_tab_panel_style, new_tab_panel_style);
    } else {
        console.log("WARNING: old_tab_panel_style not found!");
    }

    fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
    console.log("SUCCESS: admin.html styling updated for screen stability and max-width container bounds!");

    // 2. PATCH admin.js
    const jsPath = resolve('admin.js');
    let jsContent = fs.readFileSync(jsPath, 'utf-8');
    jsContent = jsContent.replace(/\r\n/g, '\n');

    // Replace smooth scrolls with instant scrolls in admin.js
    const old_scroll_smooth_1 = `    window.scrollTo({ top: 0, behavior: 'smooth' });`;
    // We want to replace all occurrences. Let's do a global replace or target specific functions
    jsContent = jsContent.replace(/window\.scrollTo\(\{\s*top:\s*0,\s*behavior:\s*'smooth'\s*\}\);/g, `window.scrollTo(0, 0);`);

    fs.writeFileSync(jsPath, jsContent, 'utf-8');
    console.log("SUCCESS: admin.js tab-transition scrolls set to instant (scrollTo(0, 0)) for snappier and stable display!");
}

main();
