import fs from 'fs';
import { resolve } from 'path';

function main() {
    console.log("Running patch_bigfarm_timer.js to set countdown to 20 seconds...");

    const filePath = resolve('public/games/bigfarm/app.js');
    let content = fs.readFileSync(filePath, 'utf-8');

    // Normalize newlines to LF
    content = content.replace(/\r\n/g, '\n');

    // 1. Update finishSpin background cycle restart
    content = content.replace(`        timerCount = 29;`, `        timerCount = 19;`);

    // 2. Update closeNotificationAndReset
    content = content.replace(`    // Restart timer
    timerCount = 29;`, `    // Restart timer
    timerCount = 19;`);

    // 3. Update timer countdown simulation variables and calculations
    const old_timer_sim = `// Timer countdown simulation
let timerCount = 29;
let roundNumber = parseInt(localStorage.getItem('currentRoundNumber')) || 1;

// Simulate background rounds progression based on elapsed time since last visit
(function() {
    const lastTime = parseInt(localStorage.getItem('masoudi_last_round_time'));
    if (lastTime) {
        const diffMs = Date.now() - lastTime;
        if (diffMs > 0) {
            const roundsPassed = Math.floor(diffMs / 35000); // 35 seconds per round cycle
            if (roundsPassed > 0) {
                roundNumber += roundsPassed;
                if (roundNumber > 3200) {
                    roundNumber = (roundNumber - 1) % 3200 + 1;
                }
                localStorage.setItem('currentRoundNumber', roundNumber);
            }
            const remainingMs = diffMs % 35000;
            if (remainingMs < 30000) {
                timerCount = 30 - Math.floor(remainingMs / 1000);
            } else {
                timerCount = 29; // Fallback during spin action
            }
        }
    }
    localStorage.setItem('masoudi_last_round_time', Date.now() - (30 - timerCount) * 1000);
})();`;

    const new_timer_sim = `// Timer countdown simulation
let timerCount = 19;
let roundNumber = parseInt(localStorage.getItem('currentRoundNumber')) || 1;

// Simulate background rounds progression based on elapsed time since last visit
(function() {
    const lastTime = parseInt(localStorage.getItem('masoudi_last_round_time'));
    if (lastTime) {
        const diffMs = Date.now() - lastTime;
        if (diffMs > 0) {
            const roundsPassed = Math.floor(diffMs / 25000); // 25 seconds per round cycle
            if (roundsPassed > 0) {
                roundNumber += roundsPassed;
                if (roundNumber > 3200) {
                    roundNumber = (roundNumber - 1) % 3200 + 1;
                }
                localStorage.setItem('currentRoundNumber', roundNumber);
            }
            const remainingMs = diffMs % 25000;
            if (remainingMs < 20000) {
                timerCount = 20 - Math.floor(remainingMs / 1000);
            } else {
                timerCount = 19; // Fallback during spin action
            }
        }
    }
    localStorage.setItem('masoudi_last_round_time', Date.now() - (20 - timerCount) * 1000);
})();`;

    content = content.replace(old_timer_sim, new_timer_sim);

    // 4. Update updateTimerPill function
    const old_timer_pill = `    if (isSpinning || isResultShowing || isSplashShowing) {
        // Update baseline time forward so background simulation behaves correctly during active game phases or loading screen
        localStorage.setItem('masoudi_last_round_time', Date.now() - (30 - timerCount) * 1000);
        return;
    }

    if (timerCount > 0) {
        timerCount--;
        const timerPill = document.getElementById('timer-display-pill');
        if (timerPill) timerPill.textContent = \`\${timerCount}s\`;
        localStorage.setItem('masoudi_last_round_time', Date.now() - (30 - timerCount) * 1000);
    } else {
        // Countdown finished! Trigger auto-spin
        timerCount = 30; // reset
        const timerPill = document.getElementById('timer-display-pill');
        if (timerPill) timerPill.textContent = \`0s\`;

        spin();
    }`;

    const new_timer_pill = `    if (isSpinning || isResultShowing || isSplashShowing) {
        // Update baseline time forward so background simulation behaves correctly during active game phases or loading screen
        localStorage.setItem('masoudi_last_round_time', Date.now() - (20 - timerCount) * 1000);
        return;
    }

    if (timerCount > 0) {
        timerCount--;
        const timerPill = document.getElementById('timer-display-pill');
        if (timerPill) timerPill.textContent = \`\${timerCount}s\`;
        localStorage.setItem('masoudi_last_round_time', Date.now() - (20 - timerCount) * 1000);
    } else {
        // Countdown finished! Trigger auto-spin
        timerCount = 20; // reset
        const timerPill = document.getElementById('timer-display-pill');
        if (timerPill) timerPill.textContent = \`0s\`;

        spin();
    }`;

    content = content.replace(old_timer_pill, new_timer_pill);

    fs.writeFileSync(filePath, content, 'utf-8');
    console.log("SUCCESS: bigfarm/app.js patched with 20 seconds countdown timer!");
}

main();
