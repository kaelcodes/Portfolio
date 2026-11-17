/**
 * terminal.js  —  Interactive Terminal  (Phase 1.1)
 * Portfolio site · vanilla JS · no framework · no backend
 *
 * Shared engine:  TerminalEngine
 * Embedded shell: HomeTerminal  (#homeTerminal)
 * Floating shell: FloatingTerminal (#floatingTerminal)
 *
 * Keyboard shortcut: Ctrl+Shift+K  (toggle floating terminal)
 */

(function () {
  'use strict';

  /* --------------------------------------------------------
     Safe text helper — never use innerHTML with user input
     -------------------------------------------------------- */
  function esc(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML; // safe: textContent escapes, innerHTML reads it back
  }

  /* --------------------------------------------------------
     Data — project info used by commands
     -------------------------------------------------------- */
  const PROJECTS = {
    supercalendar: {
      name  : 'SuperCalendar',
      year  : '2025',
      stack : 'React · Google Calendar API',
      desc  : 'Offline-first calendar with event/task management, media support, and no cloud dependency.',
      url   : 'https://kaelcodes.github.io/supercalendar/',
    },
    'ai-task-manager': {
      name  : 'AI Task Manager',
      year  : '2026',
      stack : 'React · TypeScript · Tauri v2 · Rust · SQLite · Gemini API',
      desc  : 'Local-first desktop app that integrates Gemini API for task automation, scheduling, and analytics.',
      url   : 'https://github.com/kaelcodes',
    },
    neighbornet: {
      name  : 'NeighborNet',
      year  : '2024',
      stack : 'Figma · Bootstrap · MySQL',
      desc  : 'Lightweight social network for connecting neighbours and building local community.',
      url   : null,
    },
  };

  const PROFILE = {
    name    : 'Karl Burgos',
    role    : 'Full-Stack & AI Engineer',
    location: 'Tuguegarao City, PH',
    email   : 'karlburgos36@gmail.com',
    github  : 'https://github.com/kaelcodes',
    linkedin: 'https://linkedin.com/in/karl-burgos',
    edu     : 'BS Information Technology · University of Saint Louis Tuguegarao · Expected May 2027',
  };

  /* --------------------------------------------------------
     Shared command history  (persisted in sessionStorage)
     -------------------------------------------------------- */
  const HISTORY_KEY = 'krl_term_history';

  function loadHistory() {
    try {
      return JSON.parse(sessionStorage.getItem(HISTORY_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveHistory(arr) {
    try {
      sessionStorage.setItem(HISTORY_KEY, JSON.stringify(arr.slice(-100)));
    } catch (e) { /* storage may be blocked */ }
  }

  /* --------------------------------------------------------
     TerminalEngine  — shared command dispatcher
     Returns an array of { text, cls } line descriptors.
     cls maps to CSS classes on .term-line:
       cmd-echo, out-info, out-teal, out-rust, out-green, out-err, out-blank
     -------------------------------------------------------- */
  const TerminalEngine = (function () {

    /* helper builders */
    function line(text, cls) { return { text: text, cls: cls || 'out-info' }; }
    function teal(text)  { return line(text, 'out-teal');  }
    function rust(text)  { return line(text, 'out-rust');  }
    function info(text)  { return line(text, 'out-info');  }
    function green(text) { return line(text, 'out-green'); }
    function err(text)   { return line(text, 'out-err');   }
    function blank()     { return line('', 'out-blank');   }

    /* ---- commands ---- */

    function cmdHelp() {
      return [
        teal('Available commands:'),
        blank(),
        info('  help          Show this help'),
        info('  about         Who is Karl'),
        info('  skills        Technical skill set'),
        info('  projects      List all projects'),
        info('  ai            AI & ML work'),
        info('  contact       Contact information'),
        info('  github        Open GitHub profile'),
        info('  whoami        Quick identity card'),
        blank(),
        info('  project <name>  Detail for a specific project'),
        info('    names: supercalendar · ai-task-manager · neighbornet'),
        blank(),
        info('  open <url|name>  Open a URL or named destination'),
        info('    names: github · linkedin · email · supercalendar'),
        blank(),
        info('  history       Show command history'),
        info('  clear         Clear the terminal'),
      ];
    }

    function cmdAbout() {
      return [
        teal(PROFILE.name + '  —  ' + PROFILE.role),
        blank(),
        info('Building high-leverage local-first software and intelligent'),
        info('systems. Passionate about effective altruism, modern web'),
        info('tech, and AI integration.'),
        blank(),
        info('Location : ' + PROFILE.location),
        info('Education: ' + PROFILE.edu),
      ];
    }

    function cmdSkills() {
      return [
        teal('Technical skills:'),
        blank(),
        info('Languages   : Python · Java · C++ · TypeScript · SQL · Bash'),
        info('Frontend    : React · Angular · HTML & CSS'),
        info('Backend     : Node.js · REST · GraphQL'),
        info('AI / ML     : LLM integration · RAG pipelines · Gemini API · OpenAI API'),
        info('Desktop     : Tauri v2 · Rust'),
        info('Database    : SQLite · MySQL · PostgreSQL · Supabase'),
        info('Tools       : Figma · Git · VS Code'),
      ];
    }

    function cmdProjects() {
      var out = [teal('Projects:'), blank()];
      Object.values(PROJECTS).forEach(function (p) {
        out.push(info('  ' + p.name + '  (' + p.year + ')'));
        out.push(info('  ' + p.stack));
        out.push(info('  ' + p.desc));
        out.push(p.url
          ? green('  ' + p.url)
          : rust( '  (not yet public)'));
        out.push(blank());
      });
      out.push(info('Tip: run  project <name>  for full detail.'));
      return out;
    }

    function cmdAI() {
      return [
        teal('AI & Machine Learning:'),
        blank(),
        info('Integrating large language models into production-grade'),
        info('tools — from RAG pipelines to on-device inference.'),
        blank(),
        info('AI Task Manager  (2026)'),
        info('  Tauri v2 + Rust desktop app. Gemini API for task'),
        info('  automation, scheduling, and analytics. Local SQLite'),
        info('  storage with real-time LLM state sync.'),
        blank(),
        info('Techniques: prompt engineering · RAG · tool calling'),
        info('            context management · streaming responses'),
      ];
    }

    function cmdContact() {
      return [
        teal('Contact:'),
        blank(),
        info('  Email   : ' + PROFILE.email),
        info('  GitHub  : ' + PROFILE.github),
        info('  LinkedIn: ' + PROFILE.linkedin),
        info('  Location: ' + PROFILE.location),
        blank(),
        info('Use  open email   to compose an email.'),
        info('Use  open github  to visit GitHub.'),
      ];
    }

    function cmdGithub() {
      window.open(PROFILE.github, '_blank', 'noopener,noreferrer');
      return [
        green('Opening ' + PROFILE.github + ' …'),
      ];
    }

    function cmdWhoami() {
      return [
        teal(PROFILE.name),
        info(PROFILE.role + '  ·  ' + PROFILE.location),
        info(PROFILE.edu),
      ];
    }

    function cmdHistory(hist) {
      if (hist.length === 0) {
        return [info('No history yet.')];
      }
      var out = [teal('Command history:'), blank()];
      hist.forEach(function (cmd, i) {
        var idx = String(i + 1).padStart(3, ' ');
        out.push(info(idx + '  ' + cmd));
      });
      return out;
    }

    function cmdProject(args) {
      var key = (args[0] || '').toLowerCase().replace(/\s+/g, '-');
      var p = PROJECTS[key];
      if (!p) {
        return [
          err('Unknown project: ' + (args[0] || '(none)')),
          info('Known names: ' + Object.keys(PROJECTS).join(' · ')),
        ];
      }
      var out = [
        teal(p.name + '  (' + p.year + ')'),
        blank(),
        info(p.desc),
        blank(),
        info('Stack : ' + p.stack),
      ];
      if (p.url) {
        out.push(blank());
        out.push(green('URL   : ' + p.url));
        out.push(info('Run  open ' + key + '  to launch it.'));
      } else {
        out.push(rust('Not yet public.'));
      }
      return out;
    }

    var NAMED_URLS = {
      github    : PROFILE.github,
      linkedin  : PROFILE.linkedin,
      email     : 'mailto:' + PROFILE.email,
      supercalendar: PROJECTS.supercalendar.url,
    };

    function cmdOpen(args) {
      var target = (args[0] || '').toLowerCase();
      var url = NAMED_URLS[target] || target;

      if (!url) {
        return [err('Usage: open <url | name>  (names: github · linkedin · email · supercalendar)')];
      }

      // basic sanity check — only allow http/https/mailto schemes
      if (!/^(https?|mailto):/.test(url)) {
        return [err('Only http/https/mailto URLs are allowed.')];
      }

      window.open(url, '_blank', 'noopener,noreferrer');
      return [green('Opening ' + url + ' …')];
    }

    /* ---- public dispatch ---- */
    function run(raw, history) {
      var trimmed = raw.trim();
      if (!trimmed) return [];

      var parts = trimmed.split(/\s+/);
      var cmd   = parts[0].toLowerCase();
      var args  = parts.slice(1);

      switch (cmd) {
        case 'help'   : return cmdHelp();
        case 'about'  : return cmdAbout();
        case 'skills' : return cmdSkills();
        case 'projects': return cmdProjects();
        case 'ai'     : return cmdAI();
        case 'contact': return cmdContact();
        case 'github' : return cmdGithub();
        case 'whoami' : return cmdWhoami();
        case 'history': return cmdHistory(history);
        case 'project': return cmdProject(args);
        case 'open'   : return cmdOpen(args);
        case 'clear'  : return null; // signal caller to clear
        default:
          return [
            err('Command not found: ' + cmd),
            info('Type  help  for a list of commands.'),
          ];
      }
    }

    return { run: run };
  })();

  /* --------------------------------------------------------
     TerminalShell  — creates one terminal instance
     params:
       outputEl  — .term-output element
       inputEl   — .term-input element
       clearFn   — function to call when cmd is 'clear'
     -------------------------------------------------------- */
  function TerminalShell(outputEl, inputEl, clearFn) {
    var history    = loadHistory();
    var histCursor = history.length;  // position in history navigation

    /* render an array of line descriptors */
    function render(lines) {
      lines.forEach(function (l) {
        var p = document.createElement('p');
        p.className = 'term-line ' + l.cls;
        p.textContent = l.text; // safe — no innerHTML
        outputEl.appendChild(p);
      });
      // scroll to bottom
      outputEl.scrollTop = outputEl.scrollHeight;
    }

    /* render the echoed command line */
    function renderCmd(cmd) {
      var p = document.createElement('p');
      p.className = 'term-line cmd-echo';
      p.textContent = '> ' + cmd;
      outputEl.appendChild(p);
    }

    /* clear all output */
    function clear() {
      while (outputEl.firstChild) {
        outputEl.removeChild(outputEl.firstChild);
      }
    }

    /* handle submitted command */
    function submit(raw) {
      var trimmed = raw.trim();
      if (!trimmed) return;

      // record in shared history
      if (history[history.length - 1] !== trimmed) {
        history.push(trimmed);
        saveHistory(history);
      }
      histCursor = history.length;

      renderCmd(trimmed);

      var result = TerminalEngine.run(trimmed, history);
      if (result === null) {
        // clear signal
        clear();
        if (typeof clearFn === 'function') clearFn();
        return;
      }
      render(result);
    }

    /* keyboard handler */
    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var val = inputEl.value;
        inputEl.value = '';
        submit(val);
        e.preventDefault();
        return;
      }

      /* history navigation — ArrowUp / ArrowDown */
      if (e.key === 'ArrowUp') {
        if (histCursor > 0) {
          histCursor--;
          inputEl.value = history[histCursor] || '';
          // move caret to end
          var len = inputEl.value.length;
          inputEl.setSelectionRange(len, len);
        }
        e.preventDefault();
        return;
      }

      if (e.key === 'ArrowDown') {
        if (histCursor < history.length - 1) {
          histCursor++;
          inputEl.value = history[histCursor] || '';
        } else {
          histCursor = history.length;
          inputEl.value = '';
        }
        e.preventDefault();
        return;
      }

      /* Tab completion — complete first matching command */
      if (e.key === 'Tab') {
        e.preventDefault();
        var partial = inputEl.value.trim().toLowerCase();
        if (!partial) return;
        var COMMANDS = [
          'help','about','skills','projects','ai','contact',
          'github','whoami','history','project','open','clear',
        ];
        var match = COMMANDS.find(function (c) { return c.startsWith(partial); });
        if (match) inputEl.value = match + ' ';
      }
    });

    /* expose render for welcome message */
    return { render: render, clear: clear };
  }

  /* --------------------------------------------------------
     WELCOME banner  — shown once per terminal instance
     -------------------------------------------------------- */
  function welcomeLines() {
    var now  = new Date();
    var ts   = now.toLocaleDateString('en-PH', { weekday:'short', year:'numeric', month:'short', day:'numeric' });
    return [
      { text: '┌─────────────────────────────────────────┐', cls: 'out-teal' },
      { text: '│  krl.emman terminal  v1.0               │', cls: 'out-teal' },
      { text: '└─────────────────────────────────────────┘', cls: 'out-teal' },
      { text: ts + '  ·  Tuguegarao City, PH',               cls: 'out-info' },
      { text: '',                                             cls: 'out-blank' },
      { text: "Type  help  to see available commands.",       cls: 'out-info' },
      { text: '',                                             cls: 'out-blank' },
    ];
  }

  /* --------------------------------------------------------
     Initialise EMBEDDED terminal  (#homeTerminal)
     -------------------------------------------------------- */
  function initHomeTerminal() {
    var container  = document.getElementById('homeTerminal');
    if (!container) return;

    var outputEl   = container.querySelector('.term-output');
    var inputEl    = container.querySelector('.term-input');
    if (!outputEl || !inputEl) return;

    var shell = TerminalShell(outputEl, inputEl, function () {
      /* after clear, re-show a compact prompt */
    });
    shell.render(welcomeLines());

    /* clicking anywhere in the terminal focusses the input */
    container.addEventListener('click', function () {
      inputEl.focus();
    });
  }

  /* --------------------------------------------------------
     Initialise FLOATING terminal  (#floatingTerminal)
     -------------------------------------------------------- */
  function initFloatingTerminal() {
    var trigger    = document.getElementById('termTrigger');
    var floatTerm  = document.getElementById('floatingTerminal');
    var ftClose    = document.getElementById('ftClose');
    if (!trigger || !floatTerm || !ftClose) return;

    var outputEl   = floatTerm.querySelector('.term-output');
    var inputEl    = floatTerm.querySelector('.term-input');
    if (!outputEl || !inputEl) return;

    var shell      = TerminalShell(outputEl, inputEl, null);
    var welcomed   = false;

    function openFloat() {
      // use rAF two-frame trick so CSS transition fires after display:flex
      floatTerm.style.display = 'flex';
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          floatTerm.classList.add('ft-open');
          if (!welcomed) {
            shell.render(welcomeLines());
            welcomed = true;
          }
          inputEl.focus();
        });
      });
      trigger.setAttribute('aria-expanded', 'true');
      trigger.setAttribute('aria-label', 'Close terminal (Ctrl+Shift+K)');
    }

    function closeFloat() {
      floatTerm.classList.remove('ft-open');
      // wait for transition then hide
      floatTerm.addEventListener('transitionend', function handler() {
        floatTerm.style.display = 'none';
        floatTerm.removeEventListener('transitionend', handler);
      }, { once: true });
      trigger.setAttribute('aria-expanded', 'false');
      trigger.setAttribute('aria-label', 'Open terminal (Ctrl+Shift+K)');
      trigger.focus();
    }

    function isOpen() {
      return floatTerm.classList.contains('ft-open');
    }

    function toggle() {
      if (isOpen()) closeFloat(); else openFloat();
    }

    trigger.addEventListener('click', toggle);
    ftClose.addEventListener('click', closeFloat);

    /* clicking the terminal container focusses input */
    floatTerm.addEventListener('click', function (e) {
      if (e.target !== ftClose) inputEl.focus();
    });

    /* Ctrl+Shift+K global shortcut */
    document.addEventListener('keydown', function (e) {
      if (e.ctrlKey && e.shiftKey && e.key === 'K') {
        e.preventDefault();
        toggle();
      }
    });

    /* Escape closes if floating term is open */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) {
        closeFloat();
      }
    });
  }

  /* --------------------------------------------------------
     Boot — wait for DOM ready
     -------------------------------------------------------- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  function boot() {
    initHomeTerminal();
    initFloatingTerminal();
  }

})();
