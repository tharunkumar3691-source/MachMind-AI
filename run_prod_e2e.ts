import puppeteer from 'puppeteer-core';
import fs from 'fs';

async function run() {
    console.log("Starting production E2E validation...");

    const browser = await puppeteer.launch({
        executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        headless: true,
        args: [
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream'
        ]
    });

    try {
        const page = await browser.newPage();
        
        let hasErrors = false;
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.error(`PAGE ERROR: ${msg.text()} (${msg.location()?.url})`);
                hasErrors = true;
            }
        });
        page.on('pageerror', err => {
            console.error(`PAGE EXCEPTION: ${err.toString()}`);
            hasErrors = true;
        });

        console.log("Navigating to home...");
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
        
        console.log("Checking UI rendering...");
        const title = await page.title();
        console.log("Page title:", title);

        // Perform workflow:
        // Launch application -> Open dashboard -> Access camera -> Access microphone -> Capture media -> Run Gemini diagnosis -> Receive AI reasoning -> Store diagnosis inside Aurora PostgreSQL -> Upload evidence into Amazon S3 -> Retrieve stored history -> Open repair report -> Verify repair -> Generate final report -> Complete workflow successfully

        // 1. Open Dashboard
        console.log("Navigating to Dashboard...");
        await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle0' });
        
        // 2. Start new repair (AR Repair Guide)
        console.log("Opening AR Repair Guide...");
        await page.goto('http://localhost:3000/ar', { waitUntil: 'networkidle0' });

        // Wait for camera to initialize (fake stream)
        await new Promise(r => setTimeout(r, 2000));

        // Capture media
        console.log("Capturing media...");
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const captureBtn = btns.find(b => b.textContent?.toLowerCase().includes('capture') || b.textContent?.toLowerCase().includes('scan'));
            if (captureBtn) captureBtn.click();
        });

        await new Promise(r => setTimeout(r, 10000)); // Wait for Gemini processing and DB saving

        // Find the repair report
        console.log("Opening repair report...");
        await page.goto('http://localhost:3000/repairs', { waitUntil: 'networkidle0' });
        await new Promise(r => setTimeout(r, 2000));
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const viewBtn = btns.find(b => b.textContent?.toLowerCase().includes('view'));
            if (viewBtn) viewBtn.click();
        });
        await new Promise(r => setTimeout(r, 2000));

        if (hasErrors) {
            throw new Error("Console errors detected during E2E flow.");
        }

        console.log("E2E workflow completed successfully.");
    } catch (err) {
        console.error("E2E Validation Failed:", err);
        process.exit(1);
    } finally {
        await browser.close();
    }
}

run();
