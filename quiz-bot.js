// ==UserScript==
// @name         smartrevise-bots
// @namespace    https://github.com/xfwmk/smartrevise-bots/
// @version      1
// @description  Smartrevise autosolver
// @match        https://smartrevise.online/student/revise/*
// @connect      api.groq.com
// @copyright    xfwmk - opel - kian
// @grant        GM_xmlhttpRequest
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // ============================================================
    // PUT YOUR GROQ API KEY BETWEEN THE QUOTES BELOW
    // ============================================================

    const GROQ_API_KEY = 'GROQ_API_KEY';

    // ============================================================

    const MODEL = 'openai/gpt-oss-20b';

    let running = false;

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function askGroq(question, answers) {
        return new Promise((resolve, reject) => {

            const numberedAnswers = answers
                .map((answer, index) => `${index}: ${answer}`)
                .join('\n');

            const prompt = `
You are answering a multiple-choice computer science question.

Question:
${question}

Possible answers:
${numberedAnswers}

Determine the correct answer.

IMPORTANT:
Reply with ONLY the number of the correct answer.
For example, if the second answer is correct, reply:
1

Do not explain your answer.
Do not write anything except the number.
`;

            GM_xmlhttpRequest({
                method: 'POST',
                url: 'https://api.groq.com/openai/v1/chat/completions',

                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GROQ_API_KEY}`
                },

                data: JSON.stringify({
                    model: MODEL,

                    messages: [
                        {
                            role: 'system',
                            content: 'You answer multiple-choice questions. Output only the answer number.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],

                    temperature: 0
                }),

                onload: function (response) {

                    if (response.status < 200 || response.status >= 300) {
                        reject(
                            new Error(
                                `Groq HTTP ${response.status}: ${response.responseText}`
                            )
                        );
                        return;
                    }

                    try {
                        const data = JSON.parse(response.responseText);

                        const text =
                            data?.choices?.[0]?.message?.content?.trim();

                        if (!text) {
                            reject(new Error('Groq returned an empty answer.'));
                            return;
                        }

                        const match = text.match(/\d+/);

                        if (!match) {
                            reject(
                                new Error(
                                    `Groq did not return an answer number: ${text}`
                                )
                            );
                            return;
                        }

                        resolve(Number(match[0]));

                    } catch (error) {
                        reject(error);
                    }
                },

                onerror: function () {
                    reject(new Error('Could not connect to Groq.'));
                }
            });
        });
    }


    function getQuestion() {

        const questionElement =
            document.querySelector('#questiontext');

        if (!questionElement) {
            return null;
        }

        const question =
            questionElement.innerText.trim();

        const answerElements = [
            ...document.querySelectorAll(
                '#answercontainer .col-12.mb-1'
            )
        ];

        const answers = answerElements
            .map(element => {

                const button =
                    element.querySelector('.js_answerButton');

                if (!button) {
                    return null;
                }

                return {
                    text: element.innerText.trim(),
                    element: element
                };
            })
            .filter(Boolean);

        // Remove "I don't know"
        const realAnswers =
            answers.filter(answer =>
                !/^i\s*don't\s*know$/i.test(answer.text)
            );

        if (!question || realAnswers.length === 0) {
            return null;
        }

        return {
            question,
            answers: realAnswers
        };
    }


    async function waitForQuestion() {

        for (;;) {

            if (!running) {
                return null;
            }

            const data = getQuestion();

            if (data) {
                return data;
            }

            await sleep(500);
        }
    }


    async function answerCurrentQuestion() {

        const data = await waitForQuestion();

        if (!data) {
            return;
        }

        console.log('================================');
        console.log('Question:', data.question);
        console.log('Answers:', data.answers.map(a => a.text));

        console.log('Asking Groq...');

        const answerIndex =
            await askGroq(
                data.question,
                data.answers.map(a => a.text)
            );

        console.log('AI chose:', answerIndex);

        if (
            answerIndex < 0 ||
            answerIndex >= data.answers.length
        ) {
            throw new Error(
                `AI returned invalid answer index: ${answerIndex}`
            );
        }

        const chosen =
            data.answers[answerIndex];

        console.log('Clicking:', chosen.text);

        await sleep(1000);

        const button =
            chosen.element.querySelector('.js_answerButton');

        if (!button) {
            throw new Error('Could not find answer button.');
        }

        button.click();

        console.log('Answer clicked.');

        // Wait for Smart Revise's result/advice.
        for (let i = 0; i < 100; i++) {

            const advice =
                document.querySelector('#advicecontainer');

            if (
                advice &&
                !advice.classList.contains('kt-hidden')
            ) {
                break;
            }

            await sleep(200);
        }

        console.log('Result received.');

        await sleep(1500);

        const next =
            document.querySelector('#lnkNext');

        if (!next) {
            console.log('No Next Question button found.');
            console.log('Stopping.');
            running = false;
            return;
        }

        console.log('Going to next question...');

        next.click();

        // Wait for the next question to appear.
        await sleep(1500);
    }


    async function runBot() {

        if (running) {
            return;
        }

        if (
            !GROQ_API_KEY ||
            GROQ_API_KEY === 'PASTE_YOUR_GROQ_KEY_HERE'
        ) {
            alert(
                'You have not entered your Groq API key in the script.'
            );
            return;
        }

        running = true;

        console.log('================================');
        console.log('SMART REVISE AI BOT STARTED');
        console.log('================================');

        while (running) {

            try {

                await answerCurrentQuestion();

            } catch (error) {

                console.error(
                    'BOT ERROR:',
                    error
                );

                running = false;

                alert(
                    'Smart Revise AI bot stopped.\n\n' +
                    error.message
                );
            }
        }
    }


    function stopBot() {

        running = false;

        console.log(
            'SMART REVISE AI BOT STOPPED'
        );
    }


    // Add a small control panel.
    function createPanel() {

        const panel =
            document.createElement('div');

        panel.id = 'smart-revise-ai-panel';

        panel.style.position = 'fixed';
        panel.style.bottom = '20px';
        panel.style.right = '20px';
        panel.style.zIndex = '999999';
        panel.style.background = 'white';
        panel.style.border = '2px solid black';
        panel.style.padding = '10px';
        panel.style.borderRadius = '8px';
        panel.style.fontFamily = 'Arial';

        const start =
            document.createElement('button');

        start.innerText = 'START AI BOT';

        start.style.padding = '10px';
        start.style.marginRight = '5px';
        start.style.cursor = 'pointer';

        start.onclick = runBot;


        const stop =
            document.createElement('button');

        stop.innerText = 'STOP';

        stop.style.padding = '10px';
        stop.style.cursor = 'pointer';

        stop.onclick = stopBot;


        panel.appendChild(start);
        panel.appendChild(stop);

        document.body.appendChild(panel);
    }


    if (
        location.pathname
            .toLowerCase()
            .startsWith('/student/revise/')
    ) {
        createPanel();
    }

})();
