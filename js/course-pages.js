(function () {
  const body = document.body;
  const navbar = document.querySelector('.course-navbar');
  const navMount = document.getElementById('courseNavMount');
  const mainMount = document.getElementById('coursePageContent');
  const inlineData = window.__COURSE_PAGES__ || null;
  const storageKey = 'site_lang';

  if (!body || !body.classList.contains('course-page') || !mainMount) {
    return;
  }

  function looksLikeMojibake(value) {
    return typeof value === 'string' && /(?:Ã.|Â.|Ð.|Ñ.|Ò.|Ó.|Ô.|Õ.|Ö.|×.|Ø.|Ù.|Ú.|Û.|Ü.|Ý.|Þ.|ß.|ðŸ)/.test(value);
  }

  function countLocalizedLetters(value) {
    const matches = typeof value === 'string' && value.match(/[А-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүІі]/g);
    return matches ? matches.length : 0;
  }

  function repairMojibake(value) {
    if (!looksLikeMojibake(value)) {
      return value;
    }

    try {
      const bytes = Uint8Array.from(Array.from(value), function (char) {
        return char.charCodeAt(0) & 255;
      });
      const repaired = new TextDecoder('utf-8').decode(bytes);
      return countLocalizedLetters(repaired) >= countLocalizedLetters(value) ? repaired : value;
    } catch (error) {
      return value;
    }
  }

  function normalizePageData(value) {
    if (typeof value === 'string') {
      return repairMojibake(value);
    }

    if (Array.isArray(value)) {
      return value.map(normalizePageData);
    }

    if (value && typeof value === 'object') {
      return Object.keys(value).reduce(function (result, key) {
        result[key] = normalizePageData(value[key]);
        return result;
      }, {});
    }

    return value;
  }

  function updateHeaderOffset() {
    if (!navbar) {
      return;
    }

    const headerHeight = Math.ceil(navbar.getBoundingClientRect().height);
    body.style.setProperty('--course-header-offset', `${headerHeight}px`);
  }

  function readSavedLanguage() {
    try {
      return localStorage.getItem(storageKey);
    } catch (error) {
      return null;
    }
  }

  function saveLanguage(lang) {
    try {
      localStorage.setItem(storageKey, lang);
    } catch (error) {
      // Ignore storage errors.
    }
  }

  function isElementAllowedForLanguage(element, lang) {
    const languages = (element.getAttribute('data-show-langs') || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    return !languages.length || languages.includes(lang);
  }

  function ensureMetaAttribute(selector, attribute, value) {
    let node = document.head.querySelector(selector);
    if (!node) {
      node = document.createElement('meta');
      if (selector.includes('property=')) {
        node.setAttribute('property', selector.match(/property="([^"]+)"/)[1]);
      }
      if (selector.includes('name=')) {
        node.setAttribute('name', selector.match(/name="([^"]+)"/)[1]);
      }
      document.head.appendChild(node);
    }
    node.setAttribute(attribute, value || '');
  }

  function applyHead(meta) {
    if (!meta) {
      return;
    }

    document.title = meta.title || 'AI agents';
    document.documentElement.lang = body.getAttribute('data-default-lang') || meta.defaultLang || 'ru';

    ensureMetaAttribute('meta[name="description"]', 'content', meta.description || '');
    ensureMetaAttribute('meta[property="og:title"]', 'content', meta.property && meta.property['og:title'] || meta.title || '');
    ensureMetaAttribute('meta[property="og:description"]', 'content', meta.property && meta.property['og:description'] || meta.description || '');
    ensureMetaAttribute('meta[property="og:type"]', 'content', meta.property && meta.property['og:type'] || 'website');
    ensureMetaAttribute('meta[property="og:url"]', 'content', meta.property && meta.property['og:url'] || meta.canonical || '');
    ensureMetaAttribute('meta[property="og:image"]', 'content', meta.property && meta.property['og:image'] || '');
    ensureMetaAttribute('meta[name="twitter:card"]', 'content', meta.named && meta.named['twitter:card'] || 'summary_large_image');
    ensureMetaAttribute('meta[name="twitter:title"]', 'content', meta.named && meta.named['twitter:title'] || meta.title || '');
    ensureMetaAttribute('meta[name="twitter:description"]', 'content', meta.named && meta.named['twitter:description'] || meta.description || '');
    ensureMetaAttribute('meta[name="twitter:image"]', 'content', meta.named && meta.named['twitter:image'] || '');

    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', meta.canonical || '');

    const structuredData = document.getElementById('pageStructuredData');
    if (structuredData) {
      structuredData.textContent = meta.structuredData || '';
    }
  }

  function applyCurrentCourseNavState() {
    const pageKey = body.getAttribute('data-page-key');
    const map = {
      'course-home': 'course-home',
      'lite-group': 'course-lite',
      'standard-group': 'course-standard',
      'standard-plus-group': 'course-standard-plus',
      'vip-group': 'course-vip'
    };
    const currentKey = map[pageKey];

    if (!currentKey) {
      return;
    }

    document.querySelectorAll('[data-course-nav]').forEach((element) => {
      const isActive = element.getAttribute('data-course-nav') === currentKey;
      element.classList.toggle('active', isActive);
      if (element.classList.contains('dropdown-item')) {
        element.classList.toggle('active', isActive);
      }
    });
  }

  function applyVisibleBranding() {
    if (body.getAttribute('data-page-key') !== 'course-home') {
      return;
    }

    const courseDropdown = navbar && navbar.querySelector('#coursesDropdown');
    if (courseDropdown) {
      courseDropdown.textContent = 'JustAidyn Courses';
      courseDropdown.setAttribute('data-en', 'JustAidyn Courses');
      courseDropdown.setAttribute('data-ru', 'Курсы JustAidyn');
      courseDropdown.setAttribute('data-kk', 'JustAidyn курстары');
    }

    const heroTitleRu = mainMount.querySelector('.hero-title [data-lang="ru"]');
    const heroTitleKk = mainMount.querySelector('.hero-title [data-lang="kk"]');
    const heroSubtitleRu = mainMount.querySelector('h2.mb-4 [data-lang="ru"]');
    const heroSubtitleKk = mainMount.querySelector('h2.mb-4 [data-lang="kk"]');
    const heroCopyRu = mainMount.querySelector('.hero-copy [data-lang="ru"]');
    const heroCopyKk = mainMount.querySelector('.hero-copy [data-lang="kk"]');

    if (heroTitleRu) {
      heroTitleRu.textContent = 'JustAidyn Courses: AI-агенты';
    }
    if (heroTitleKk) {
      heroTitleKk.textContent = 'JustAidyn Courses: AI агенттер';
    }
    if (heroSubtitleRu) {
      heroSubtitleRu.textContent = '';
    }
    if (heroSubtitleKk) {
      heroSubtitleKk.textContent = '';
    }
    if (heroCopyRu) {
      heroCopyRu.textContent = 'Это официальная страница JustAidyn Courses по AI-агентам: форматы групп, ссылки на Lite, Standard и VIP, а также посты, факты и прикладные заметки об AI.';
    }
    if (heroCopyKk) {
      heroCopyKk.textContent = 'Бұл JustAidyn Courses-тың AI агенттерге арналған ресми беті: топ форматтары, Lite, Standard және VIP сілтемелері, сонымен бірге AI туралы жазбалар, фактілер және қолданбалы материалдар.';
    }
  }

  function bindLanguageButtons() {
    function setLanguage(lang) {
      const uiLang = lang === 'kk' ? 'kk' : lang === 'en' ? 'en' : 'ru';
      const contentLang = uiLang === 'kk' ? 'kk' : 'ru';

      body.classList.add('lang-ready');
      body.setAttribute('data-active-lang', contentLang);

      document.querySelectorAll('[data-lang]').forEach((node) => {
        node.hidden = node.getAttribute('data-lang') !== contentLang;
      });

      document.querySelectorAll('[data-lang-btn]').forEach((button) => {
        const buttonLang = button.getAttribute('data-lang-btn');
        const isActive = buttonLang === contentLang;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });

      document.querySelectorAll('[data-lang-option]').forEach((button) => {
        const isActive = button.getAttribute('data-lang-option') === uiLang;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });

      document.querySelectorAll('[data-en][data-ru][data-kk]').forEach((element) => {
        const value = element.getAttribute('data-' + uiLang);
        if (value !== null) {
          element.textContent = value;
        }
      });

      document.querySelectorAll('[data-show-langs]').forEach((element) => {
        element.style.display = isElementAllowedForLanguage(element, uiLang) ? '' : 'none';
      });

      applyVisibleBranding();

      document.documentElement.lang = uiLang;
      saveLanguage(uiLang);
    }

    document.querySelectorAll('[data-lang-btn]').forEach((button) => {
      button.addEventListener('click', function () {
        setLanguage(this.getAttribute('data-lang-btn'));
      });
    });

    window.changeLanguage = function (lang) {
      setLanguage(lang);
    };

    const savedLanguage = readSavedLanguage();
    setLanguage(savedLanguage || body.getAttribute('data-default-lang') || 'ru');
  }

  function enhanceMobileHeader() {
    const mobileTools = navbar && navbar.querySelector('.d-flex.align-items-center.d-lg-none');
    const toggler = navbar && navbar.querySelector('.navbar-toggler');

    if (toggler) {
      toggler.classList.add('course-mobile-toggler');
    }

    if (!mobileTools) {
      return;
    }

    mobileTools.classList.add('course-mobile-tools');

    if (!mobileTools.querySelector('.course-mobile-langs')) {
      const langGroup = document.createElement('div');
      langGroup.className = 'course-mobile-langs';
      langGroup.setAttribute('role', 'group');
      langGroup.setAttribute('aria-label', 'Language selector');
      langGroup.innerHTML = `
        <button aria-label="Russian" class="lang-flag-btn" data-lang-option="ru" onclick="changeLanguage('ru')" title="Russian" type="button">RU</button>
        <button aria-label="English" class="lang-flag-btn" data-lang-option="en" onclick="changeLanguage('en')" title="English" type="button">EN</button>
        <button aria-label="Kazakh" class="lang-flag-btn" data-lang-option="kk" onclick="changeLanguage('kk')" title="Kazakh" type="button">KK</button>
      `;
      mobileTools.appendChild(langGroup);
    }
  }

  function enhanceMobileComparisonTables() {
    document.querySelectorAll('.course-table').forEach((table) => {
      const tableWrap = table.closest('.course-table-wrap');
      const headCells = Array.from(table.querySelectorAll('thead th'));
      const bodyRows = Array.from(table.querySelectorAll('tbody tr'));

      if (!tableWrap || headCells.length < 2 || !bodyRows.length) {
        return;
      }

      const existing = tableWrap.parentElement.querySelector('.course-mobile-groups');
      if (existing) {
        existing.remove();
      }

      const mobileGroups = document.createElement('div');
      mobileGroups.className = 'course-mobile-groups';

      headCells.slice(1).forEach((headCell, columnIndex) => {
        const card = document.createElement('article');
        const columnNumber = columnIndex + 1;
        const isVip = headCell.classList.contains('course-table-vip');

        card.className = isVip ? 'course-mobile-group-card course-mobile-group-card-vip' : 'course-mobile-group-card';
        card.innerHTML = `
          <div class="course-mobile-group-head">${headCell.innerHTML}</div>
          <div class="course-mobile-group-body"></div>
        `;

        const cardBody = card.querySelector('.course-mobile-group-body');

        bodyRows.forEach((row) => {
          const labelCell = row.querySelector('th');
          const valueCell = row.querySelectorAll('td')[columnIndex];

          if (!labelCell || !valueCell) {
            return;
          }

          const item = document.createElement('div');
          item.className = 'course-mobile-group-item';

          if (row === bodyRows[bodyRows.length - 1]) {
            item.classList.add('course-mobile-group-item-price');
          }

          item.innerHTML = `
            <div class="course-mobile-group-label">${labelCell.innerHTML}</div>
            <div class="course-mobile-group-value ${isVip ? 'course-mobile-group-value-vip' : ''}">${valueCell.innerHTML}</div>
          `;

          cardBody.appendChild(item);
        });

        mobileGroups.appendChild(card);
      });

      tableWrap.insertAdjacentElement('afterend', mobileGroups);
    });
  }
  function shiftWeekCardEvents(weekBlock, direction) {
    const cards = Array.from(weekBlock.querySelectorAll('.course-day-card'));

    if (!cards.length) {
      return;
    }

    const originalEvents = cards.map(function (card) {
      const event = card.querySelector('.course-day-event');
      return event ? event.innerHTML : null;
    });

    const shiftedEvents = cards.map(function (_, index) {
      if (direction > 0) {
        return index === 0 ? null : originalEvents[index - 1];
      }

      return index === cards.length - 1 ? null : originalEvents[index + 1];
    });

    cards.forEach(function (card, index) {
      const existingEvent = card.querySelector('.course-day-event');
      const nextEvent = shiftedEvents[index];

      if (!nextEvent) {
        if (existingEvent) {
          existingEvent.remove();
        }
        return;
      }

      if (existingEvent) {
        existingEvent.innerHTML = nextEvent;
        return;
      }

      const eventNode = document.createElement('div');
      eventNode.className = 'course-day-event';
      eventNode.innerHTML = nextEvent;
      card.appendChild(eventNode);
    });
  }

  function applyStandardScheduleShift() {
    if (body.getAttribute('data-page-key') !== 'standard-group') {
      return;
    }

    const paramsList = mainMount.querySelector('.course-params-list');
    if (paramsList) {
      Array.from(paramsList.querySelectorAll('li')).forEach(function (item) {
        const label = item.querySelector('strong');
        const value = item.querySelector('span');

        if (!label || !value) {
          return;
        }

        const key = label.textContent.trim();
        if (key === 'RU') {
          value.textContent = '14.04.2026 - 30.04.2026';
        }
        if (key === 'Qazaq') {
          value.textContent = '13.04.2026 - 29.04.2026';
        }
      });
    }

    const scheduleSection = mainMount.querySelector('#section_4');
    if (!scheduleSection) {
      return;
    }

    const ruBlock = scheduleSection.querySelector('div[data-lang="ru"]');
    const kkBlock = scheduleSection.querySelector('div[data-lang="kk"]');

    if (ruBlock) {
      const noteLines = ruBlock.querySelectorAll('.course-note p');
      if (noteLines[0]) {
        noteLines[0].textContent = noteLines[0].textContent.replace('13.04.2026 - 29.04.2026', '14.04.2026 - 30.04.2026');
      }
      if (noteLines[1]) {
        noteLines[1].textContent = noteLines[1].textContent.replace('14.04.2026 - 30.04.2026', '13.04.2026 - 29.04.2026');
      }

      ruBlock.querySelectorAll('.course-week-block').forEach(function (weekBlock) {
        shiftWeekCardEvents(weekBlock, 1);
      });
    }

    if (kkBlock) {
      const noteLines = kkBlock.querySelectorAll('.course-note p');
      if (noteLines[0]) {
        noteLines[0].textContent = noteLines[0].textContent.replace('13.04.2026 - 29.04.2026', '14.04.2026 - 30.04.2026');
      }
      if (noteLines[1]) {
        noteLines[1].textContent = noteLines[1].textContent.replace('14.04.2026 - 30.04.2026', '13.04.2026 - 29.04.2026');
      }

      kkBlock.querySelectorAll('.course-week-block').forEach(function (weekBlock) {
        shiftWeekCardEvents(weekBlock, -1);
      });
    }
  }

  function renderPage(data) {
      const page = data.pages && data.pages[body.getAttribute('data-page-key')];
      if (!page) {
        throw new Error('Missing course page data');
      }

      applyHead(page.meta);
      body.setAttribute('data-default-lang', page.defaultLang || body.getAttribute('data-default-lang') || 'ru');
      if (navbar) {
        navbar.innerHTML = typeof window.getSharedStaticNavHtml === 'function'
          ? window.getSharedStaticNavHtml('courses')
          : (page.navHtml || '');
      }
      mainMount.innerHTML = page.mainHtml || '';
      enhanceMobileHeader();
      enhanceMobileComparisonTables();
      applyStandardScheduleShift();
      applyCurrentCourseNavState();
      applyVisibleBranding();
      bindLanguageButtons();
      updateHeaderOffset();
      window.addEventListener('resize', updateHeaderOffset);

      if (window.ResizeObserver && navbar) {
        const resizeObserver = new ResizeObserver(updateHeaderOffset);
        resizeObserver.observe(navbar);
      }
  }

  function renderError(error) {
      console.error(error);
      if (navbar) {
        navbar.innerHTML = typeof window.getSharedStaticNavHtml === 'function'
          ? window.getSharedStaticNavHtml('courses')
          : '<a class="navbar-brand" href="/courses/ai-agents-course.html">JustAidyn</a>';
      }
      mainMount.innerHTML = '<section class="section-padding"><div class="container"><div class="profile-thumb"><h3>Content failed to load</h3><p>Open the site through static hosting or a local server so JSON files can be loaded.</p></div></div></section>';
  }

  function loadJsonData() {
    const source = body.getAttribute('data-content-src');
    if (!source) {
      return Promise.reject(new Error('Missing course data source'));
    }

    return fetch(source, { cache: 'no-cache' }).then(function (response) {
      if (!response.ok) {
        throw new Error('Failed to load course page data');
      }
      return response.json();
    });
  }

  if (inlineData) {
    try {
      renderPage(normalizePageData(inlineData));
    } catch (inlineError) {
      renderError(inlineError);
    }
  } else {
    loadJsonData()
      .then(function (data) {
        renderPage(normalizePageData(data));
      })
      .catch(function (fetchError) {
        renderError(fetchError);
      });
  }
}());
