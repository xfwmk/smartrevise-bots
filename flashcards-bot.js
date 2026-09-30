// ==UserScript==
// @name         smartrevise-bots
// @namespace    https://github.com/xfwmk/smartrevise-bots/
// @version      1
// @description  Smartrevise autosolver
// @match        https://smartrevise.online/student/reviseterminology/*
// @connect      api.groq.com
// @copyright    xfwmk - opel - kian
// @grant        GM_xmlhttpRequest
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    let running = false;

    const sleep = ms =>
        new Promise(resolve => setTimeout(resolve, ms));


    // Find the actual Flip button
    function getFlipButton() {

        const buttons = [
            ...document.querySelectorAll('button')
        ];

        return buttons.find(button =>
            button.offsetParent !== null &&
            button.innerText.trim().toLowerCase() === 'flip'
        );
    }


    // Find the three assessment buttons.
    // The happy/green face is the RIGHTMOST one.
    function getHappyButton() {

        // Find the "Assessment" heading
        const headings = [
            ...document.querySelectorAll('h1,h2,h3,h4,h5,h6,div')
        ];

        const heading = headings.find(el =>
            el.offsetParent !== null &&
            el.innerText.trim() === 'Assessment'
        );

        if (!heading) {
            console.log('[BOT] Assessment heading not found');
            return null;
        }

        // Walk upwards until we find a container containing
        // several visible buttons.
        let container = heading;

        for (let i = 0; i < 8; i++) {

            if (!container.parentElement)
                break;

            container = container.parentElement;

            const buttons = [
                ...container.querySelectorAll('button')
            ].filter(button =>
                button.offsetParent !== null
            );

            // The assessment area should contain at least
            // the three face buttons.
            if (buttons.length >= 3) {

                // Remove obvious "Last Answer" button.
                const faceButtons = buttons.filter(button => {

                    const text =
                        button.innerText
                            .trim()
                            .toLowerCase();

                    return !text.includes('last answer');
                });

                if (faceButtons.length >= 3) {

                    // Sort by horizontal position.
                    faceButtons.sort((a, b) =>
                        a.getBoundingClientRect().left -
                        b.getBoundingClientRect().left
                    );

                    // Rightmost = happy face.
                    return faceButtons[faceButtons.length - 1];
                }
            }
        }

        console.log('[BOT] Could not find assessment buttons');
        return null;
    }


    // The Next control is the button beside Flip.
    function getNextButton() {

        const flip = getFlipButton();

        if (!flip) {
            console.log('[BOT] Flip button not found');
            return null;
        }

        // Look around the Flip button for its sibling button.
        let parent = flip.parentElement;

        for (let i = 0; i < 5; i++) {

            if (!parent)
                break;

            const buttons = [
                ...parent.querySelectorAll('button')
            ].filter(button =>
                button.offsetParent !== null
            );

            if (buttons.length >= 2) {

                // The buttons are:
                // Flip | Next
                const next = buttons.find(button =>
                    button !== flip
                );

                if (next)
                    return next;
            }

            parent = parent.parentElement;
        }

        console.log('[BOT] Next button not found');
        return null;
    }


    async function doOneCard() {

        // ------------------------------------------------
        // 1. Find and click Flip
        // ------------------------------------------------

        const flip = getFlipButton();

        if (!flip) {
            throw new Error('Could not find Flip button.');
        }

        console.log('[BOT] Flipping card...');

        flip.click();

        await sleep(1000);


        // ------------------------------------------------
        // 2. Click the happy/green face
        // ------------------------------------------------

        const happy = getHappyButton();

        if (!happy) {
            throw new Error(
                'Could not find the happy/green assessment button.'
            );
        }

        console.log('[BOT] Clicking happy/green face...');

        happy.click();

        await sleep(1000);


        // ------------------------------------------------
        // 3. Click Next
        // ------------------------------------------------

        const next = getNextButton();

        if (!next) {
            throw new Error(
                'Could not find the Next button.'
            );
        }

        console.log('[BOT] Clicking Next...');

        next.click();

        await sleep(1500);
    }


    async function startBot() {

        if (running)
            return;

        running = true;

        console.log(
            '========================================'
        );

        console.log(
            '[BOT] Smart Revise terminology bot STARTED'
        );

        console.log(
            '========================================'
        );


        while (running) {

            try {

                await doOneCard();

            } catch (error) {

                console.error(
                    '[BOT] STOPPED:',
                    error
                );

                running = false;

                alert(
                    'Bot stopped:\n\n' +
                    error.message
                );
            }
        }
    }


    function stopBot() {

        running = false;

        console.log(
            '[BOT] STOPPED'
        );
    }


    // ------------------------------------------------
    // Create controls
    // ------------------------------------------------

    function createPanel() {

        // Don't create it twice.
        if (
            document.querySelector(
                '#smart-revise-terminology-bot'
            )
        ) {
            return;
        }

        const panel =
            document.createElement('div');

        panel.id =
            'smart-revise-terminology-bot';

        panel.style.cssText = `
            position: fixed;
            right: 20px;
            bottom: 20px;
            z-index: 999999;
            background: white;
            border: 2px solid black;
            border-radius: 8px;
            padding: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,.3);
            font-family: Arial, sans-serif;
        `;


        const start =
            document.createElement('button');

        start.textContent =
            'START TERMINOLOGY BOT';

        start.style.cssText = `
            padding: 8px 12px;
            margin-right: 5px;
            cursor: pointer;
        `;

        start.onclick =
            startBot;


        const stop =
            document.createElement('button');

        stop.textContent =
            'STOP';

        stop.style.cssText = `
            padding: 8px 12px;
            cursor: pointer;
        `;

        stop.onclick =
            stopBot;


        panel.appendChild(start);
        panel.appendChild(stop);

        document.body.appendChild(panel);
    }


    createPanel();

})();
