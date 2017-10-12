// ==UserScript==
// @name         GitHub Enhancements
// @namespace    http://github.mheducation.com/
// @version      0.1
// @description
// @author       Christopher Carman
// @match        https://github.mheducation.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const APPROVALS_REQUIRED = 2;

    function customStyles() {
        let style = document.createElement('style');
        style.type = 'text/css';
        style.innerText = `
.badge {
    color: white;
    padding: 2px 4px;
    margin: 0 4px;
    font-size: smaller;
}

.no-dec {
    text-decoration: none !important;
}

.task-progress .progress {
    float: left;
}
        `;
        document.body.appendChild(style);
    }

    function progressBar(bars) {
        let wrapper = document.createElement('span');
        wrapper.setAttribute('data-monkey-cleanup', true);
        wrapper.classList.add('task-progress');
        let bar = document.createElement('span');
        bar.classList.add('progress-bar');
        let percentLeft = 1;
        bars.forEach(function(info) {
            let percent = info[0];
            let color = info[1];
            let progress = document.createElement('span');
            let physicalPercent = Math.min(percent, percentLeft, 1);
            progress.classList.add('progress');
            progress.style.width = `${physicalPercent * 100}%`;
            percentLeft -= physicalPercent;
            if (color) {
                progress.style.backgroundColor = color;
            }
            bar.appendChild(progress);
        });
        wrapper.appendChild(bar);
        return wrapper;
    }

    function approvalsComboBar(approvals, rejections) {
        let container = document.createElement('span');
        container.setAttribute('data-monkey-cleanup', true);
        let text = document.createElement('span');
        let barcolor;
        let badgecolor;
        if(approvals < APPROVALS_REQUIRED) {
            barcolor = 'cornflowerblue';
        } else {
            barcolor = 'limegreen';
        }

        if (rejections) {
            badgecolor = 'darkorange';
        } else {
            badgecolor = barcolor;
        }

        text.classList.add('badge');
        text.style.backgroundColor = badgecolor;
        text.innerText = `${approvals + rejections} of ${APPROVALS_REQUIRED}`;

        let progress = progressBar([[rejections/APPROVALS_REQUIRED, 'darkorange'], [approvals/APPROVALS_REQUIRED, barcolor]]);
        container.appendChild(text);
        container.appendChild(progress);
        return container;
    }

    function expandReviewTooltips() {
        if (window.location.pathname.includes('/pulls')) {
            const reviewLinks = document.querySelectorAll('.js-issue-row .d-inline-block a.tooltipped[aria-label]');
            for(let i = 0, n = reviewLinks.length; i < n; i++) {
                const label = reviewLinks[i].getAttribute('aria-label');
                if (label) {
                    if (label.match(/(?:(\d+)\s+review approval)|(?:(\d+)\s+reviews? requesting change)|review required/i)) {
                        const approvals = Number(RegExp.$1);
                        const rejections = Number(RegExp.$2);
                        reviewLinks[i].classList.remove('muted-link');
                        reviewLinks[i].classList.add('no-dec');
                        reviewLinks[i].innerHTML = '';
                        reviewLinks[i].appendChild(approvalsComboBar(approvals, rejections));
                    }
                }
            }
        }

        if(window.location.pathname.includes("/pull/")) {
            const container = document.querySelector('.js-review-requests-menu');
            if (!container) {
                return;
            }
            const list = container.nextElementSibling;
            const approvals = list.querySelectorAll('.octicon-check').length;
            const rejections = list.querySelectorAll('.octicon-x').length;
            const progress = approvalsComboBar(approvals, rejections);
            container.children[0].appendChild(progress);
        }
    }

    function cleanup() {
        Array.from(document.querySelectorAll(`[data-monkey-cleanup]`)).map(function(element) {
            element.remove();
        });
    }

    function run() {
        customStyles();
        expandReviewTooltips();
    }

    function setupXHRProxy(callback) {
        // Proxy XHR requests so we can hook in callbacks
        // Yanked from https://stackoverflow.com/a/28303226/4175944
        var oldXHR = window.XMLHttpRequest;

        function newXHR() {
            var realXHR = new oldXHR();
            realXHR.addEventListener("readystatechange", function() {
                if(realXHR.readyState === 4 && realXHR.status === 200){
                    setTimeout(callback, 1);
                }
            }, false);

            return realXHR;
        }
        window.XMLHttpRequest = newXHR;
    }

    run();
    setupXHRProxy(function() {
        cleanup();
        run();
    });

})();