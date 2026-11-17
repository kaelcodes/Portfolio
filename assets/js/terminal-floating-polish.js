/**
 * terminal-floating-polish.js
 * Keeps the homepage terminal compact while the floating terminal is open.
 * The existing terminal.js remains the single source of open/close behavior.
 */
(function () {
  'use strict';

  function init() {
    var homeWrap = document.querySelector('.home-terminal-wrap');
    var floating = document.getElementById('floatingTerminal');
    var trigger = document.getElementById('termTrigger');

    if (!homeWrap || !floating || !trigger) return;

    var compactButton = document.createElement('button');
    compactButton.type = 'button';
    compactButton.className = 'home-terminal-compact';
    compactButton.textContent = '›_';
    compactButton.setAttribute('aria-label', 'Open floating terminal');
    compactButton.setAttribute('title', 'Open floating terminal');
    compactButton.hidden = true;
    homeWrap.appendChild(compactButton);

    function syncCollapsedState() {
      var isOpen = floating.classList.contains('ft-open');
      homeWrap.classList.toggle('is-collapsed', isOpen);
      compactButton.hidden = !isOpen;
    }

    compactButton.addEventListener('click', function () {
      if (!floating.classList.contains('ft-open')) {
        trigger.click();
      } else {
        var input = floating.querySelector('.term-input');
        if (input) input.focus();
      }
    });

    var observer = new MutationObserver(syncCollapsedState);
    observer.observe(floating, {
      attributes: true,
      attributeFilter: ['class']
    });

    syncCollapsedState();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
