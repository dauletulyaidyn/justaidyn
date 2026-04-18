(function () {
  const body = document.body;
  const navbar = document.querySelector('.course-navbar');
  const navMount = document.getElementById('courseNavMount');
  const mainMount = document.getElementById('coursePageContent');
  const footerMount = document.getElementById('courseFooterMount');
  const inlineData = window.__COURSE_PAGES__ || null;
  const storageKey = 'site_lang';

  if (!body || !body.classList.contains('course-page') || !navMount || !mainMount || !footerMount) {
    return;
  }

  function looksLikeMojibake(value) {
    return typeof value === 'string' && /(?:Ãƒ.|Ã‚.|Ã.|Ã‘.|Ã’.|Ã“.|Ã”.|Ã•.|Ã–.|Ã—.|Ã˜.|Ã™.|Ãš.|Ã›.|Ãœ.|Ã.|Ãž.|ÃŸ.|Ã°Å¸)/.test(value);
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

  function extractCourseMenuItem(navHtml) {
    if (!navHtml) {
      return '';
    }

    const match = navHtml.match(/<li class="nav-item dropdown" data-show-langs="ru,kk">[\s\S]*?<\/li>/);
    return match ? match[0] : '';
  }

  function getUnifiedCourseNavHtml(navHtml) {
    const courseMenuItem = extractCourseMenuItem(navHtml);

    return `
      <button aria-controls="courseNavbar" aria-expanded="false" aria-label="Toggle navigation" class="navbar-toggler" data-bs-target="#courseNavbar" data-bs-toggle="collapse" type="button">
        <span class="navbar-toggler-icon"></span>
      </button>
      <a class="navbar-brand mx-auto mx-lg-0" href="https://justaidyn.com/">JustAidyn</a>
      <div class="d-flex align-items-center d-lg-none">
        <i class="navbar-icon bi-envelope me-3"></i>
        <a class="custom-btn btn" href="mailto:aidyn.daulet@gmail.com">Email</a>
      </div>
      <div class="collapse navbar-collapse" id="courseNavbar">
        <div class="navbar-split-layout w-100">
          <div class="navbar-top-contact d-none d-lg-flex">
            <div class="navbar-top-contact-left">
              <a class="navbar-top-contact-link" href="mailto:aidyn.daulet@gmail.com" aria-label="Write to me by email" title="Write to me by email"><i class="bi bi-envelope"></i></a>
              <a class="navbar-top-contact-link" href="tel:+77769889889" aria-label="Call me" title="Call me"><i class="bi bi-telephone"></i></a>
              <a class="navbar-top-contact-link" href="https://wa.me/77769889889" target="_blank" rel="noopener" aria-label="Write to me on WhatsApp" title="Write to me on WhatsApp"><i class="bi bi-whatsapp"></i></a>
              <a class="navbar-top-contact-link" href="https://t.me/justaidyn" target="_blank" rel="noopener" aria-label="Write to me on Telegram" title="Write to me on Telegram"><i class="bi bi-telegram"></i></a>
            </div>
            <div class="navbar-top-tools">
              <div aria-label="Language selector" class="language-selector navbar-top-lang language-flags" role="group">
                <button aria-label="Kazakh" class="lang-flag-btn" data-lang-option="kk" onclick="changeLanguage('kk')" title="Kazakh" type="button">KK</button>
                <button aria-label="English" class="lang-flag-btn" data-lang-option="en" onclick="changeLanguage('en')" title="English" type="button">EN</button>
                <button aria-label="Russian" class="lang-flag-btn" data-lang-option="ru" onclick="changeLanguage('ru')" title="Russian" type="button">RU</button>
              </div>
              <div class="nav-item dropdown">
                <a class="nav-link dropdown-toggle navbar-top-tool-link" href="#" id="projectsDropdownTop" role="button" data-bs-toggle="dropdown" aria-expanded="false">JustAidyn Projects</a>
                <ul class="dropdown-menu" aria-labelledby="projectsDropdownTop">
                  <li><a class="dropdown-item" href="https://justaidyn.com/">JustAidyn Home</a></li>
                  <li><hr class="dropdown-divider"></li>
                  <li><a class="dropdown-item" href="https://skillsminds.justaidyn.com/">SkillsMinds</a></li>
                  <li><a class="dropdown-item" href="https://nofacethinker.justaidyn.com/">NoFaceThinker</a></li>
                  <li><a class="dropdown-item" href="https://courses.justaidyn.com/">Courses</a></li>
                  <li><a class="dropdown-item" href="https://apps.justaidyn.com/">Apps</a></li>
                  <li><a class="dropdown-item" href="https://games.justaidyn.com/">Games</a></li>
                  <li><a class="dropdown-item" href="https://shop.justaidyn.com/">Shop</a></li>
                  <li><a class="dropdown-item" href="https://api.justaidyn.com/">API</a></li>
                </ul>
              </div>
              <a class="nav-link navbar-top-tool-link" href="https://justaidyn.com/articles/">Posts and Articles</a>
            </div>
          </div>
          <ul class="navbar-nav ms-lg-0 nav-row-primary">
            <li class="nav-item"><a class="nav-link" href="https://justaidyn.com/">Home</a></li>
            <li class="nav-item"><a class="nav-link" href="https://justaidyn.com/projects">Projects</a></li>
            <li class="nav-item"><a class="nav-link" href="https://justaidyn.com/#section_5">Contact</a></li>
            ${courseMenuItem}
          </ul>
          <div class="nav-row-secondary d-none"></div>
        </div>
      </div>
    `;
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

  function normalizeCourseRelativeLinks(container) {
    if (!container) {
      return;
    }

    const rootOrigin = 'https://justaidyn.com/';
    const rootPrefixes = ['articles/', 'downloads/', 'images/', 'data/', 'css/', 'js/', 'fonts/'];

    container.querySelectorAll('[href]').forEach((element) => {
      const href = element.getAttribute('href');
      if (!href || /^(?:[a-z]+:|#|\/\/)/i.test(href)) {
        return;
      }

      if (rootPrefixes.some((prefix) => href.startsWith(prefix))) {
        element.setAttribute('href', rootOrigin + href);
        return;
      }

      if (href === 'projects.html') {
        element.setAttribute('href', rootOrigin + href);
        return;
      }

      if (href === 'sitemap.xml') {
        element.setAttribute('href', rootOrigin + href);
      }
    });

    container.querySelectorAll('[src]').forEach((element) => {
      const src = element.getAttribute('src');
      if (!src || /^(?:[a-z]+:|\/\/)/i.test(src)) {
        return;
      }

      if (rootPrefixes.some((prefix) => src.startsWith(prefix))) {
        element.setAttribute('src', rootOrigin + src);
      }
    });
  }

  function applyCurrentCourseNavState() {
    const pageKey = body.getAttribute('data-page-key');
    const map = {
      'course-home': 'course-home',
      'lite-group': 'course-lite',
      'standard-group': 'course-standard',
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

    const courseDropdown = navMount.querySelector('#coursesDropdown');
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
    document.querySelectorAll('[data-lang-option="en"]').forEach((button) => {
      button.disabled = true;
      button.hidden = true;
      button.setAttribute('aria-disabled', 'true');
      button.setAttribute('tabindex', '-1');
    });

    function setLanguage(lang) {
      const uiLang = lang === 'kk' ? 'kk' : lang === 'en' ? 'en' : 'ru';
      const contentLang = uiLang;

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

    setLanguage(readSavedLanguage() || body.getAttribute('data-default-lang') || 'ru');
  }

  function enhanceMobileHeader() {
    const mobileTools = navMount.querySelector('.d-flex.align-items-center.d-lg-none');
    const toggler = navMount.querySelector('.navbar-toggler');

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
        <button aria-label="Kazakh" class="lang-flag-btn" data-lang-option="kk" onclick="changeLanguage('kk')" title="Kazakh" type="button">KK</button>
        <button aria-label="English" class="lang-flag-btn" data-lang-option="en" onclick="changeLanguage('en')" title="English" type="button">EN</button>
        <button aria-label="Russian" class="lang-flag-btn" data-lang-option="ru" onclick="changeLanguage('ru')" title="Russian" type="button">RU</button>
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
  function getCourseFooterHtml() {
    return `
      <div class="row g-4 align-items-start text-start">
        <div class="col-lg-4 col-md-6 col-12">
          <strong class="site-footer-title d-block mb-3" data-en="JustAidyn" data-ru="JustAidyn" data-kk="JustAidyn">JustAidyn</strong>
          <p class="mb-0"
             data-en="Applied AI, research, engineering, and educational projects by Dauletuly Aidyn."
             data-ru="Прикладной ИИ, исследования, инженерия и образовательные проекты Даулетулы Айдына."
             data-kk="Дәулетұлы Айдынның қолданбалы AI, зерттеу, инженерия және білім беру жобалары.">
            Applied AI, research, engineering, and educational projects by Dauletuly Aidyn.
          </p>
        </div>
        <div class="col-lg-2 col-md-6 col-12">
          <strong class="site-footer-title d-block mb-3" data-en="Basic Links" data-ru="Основные ссылки" data-kk="Негізгі сілтемелер">Basic Links</strong>
          <ul class="footer-menu">
            <li class="footer-menu-item"><a class="footer-menu-link" href="index.html" data-en="Main" data-ru="Главная" data-kk="Басты бет">Main</a></li>
            <li class="footer-menu-item"><a class="footer-menu-link" href="projects.html" data-en="Projects" data-ru="Проекты" data-kk="Жобалар">Projects</a></li>
            <li class="footer-menu-item"><a class="footer-menu-link" href="index.html?dl=pdf" data-en="CV PDF" data-ru="CV PDF" data-kk="CV PDF">CV PDF</a></li>
          </ul>
        </div>
        <div class="col-lg-3 col-md-6 col-12">
          <strong class="site-footer-title d-block mb-3" data-en="Sitemap" data-ru="Карта сайта" data-kk="Сайт картасы">Sitemap</strong>
          <ul class="footer-menu">
            <li class="footer-menu-item"><a class="footer-menu-link" href="articles/index.html" data-en="Articles" data-ru="Статьи" data-kk="Мақалалар">Articles</a></li>
            <li class="footer-menu-item"><a class="footer-menu-link" href="faq.html" data-en="FAQ" data-ru="FAQ" data-kk="ЖҚС">FAQ</a></li>
            <li class="footer-menu-item"><a class="footer-menu-link" href="sitemap.xml">Sitemap.xml</a></li>
            <li class="footer-menu-item"><a class="footer-menu-link" href="ai-agents-course.html" data-en="AI Agents" data-ru="AI-агенты" data-kk="AI агенттер">AI Agents</a></li>
          </ul>
        </div>
        <div class="col-lg-3 col-md-6 col-12">
          <strong class="site-footer-title d-block mb-3" data-en="Contact" data-ru="Контакты" data-kk="Байланыс">Contact</strong>
          <ul class="footer-menu">
            <li class="footer-menu-item"><a class="footer-menu-link" href="https://wa.me/77769889889" rel="noopener" target="_blank">WhatsApp</a></li>
            <li class="footer-menu-item"><a class="footer-menu-link" href="mailto:aidyn.daulet@gmail.com">Email</a></li>
          </ul>
        </div>
      </div>
      <div class="row mt-4">
        <div class="col-lg-12 col-12">
          <div class="copyright-text-wrap">
            <p class="mb-0">
              <span class="copyright-text" data-en="Copyright &#169; Dauletuly Aidyn" data-ru="Copyright &#169; Dauletuly Aidyn" data-kk="Copyright &#169; Dauletuly Aidyn">Copyright &#169; Dauletuly Aidyn</span>
              <span data-en="All rights reserved." data-ru="All rights reserved." data-kk="All rights reserved.">All rights reserved.</span>
              <span class="ms-2"><span data-en="Designed by" data-ru="Designed by" data-kk="Designed by">Designed by</span> <a href="https://templatemo.com/" rel="noopener" target="_blank">TemplateMo</a></span>
            </p>
          </div>
        </div>
      </div>
    `;
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
      navMount.innerHTML = getUnifiedCourseNavHtml(page.navHtml || '');
      mainMount.innerHTML = page.mainHtml || '';
      footerMount.innerHTML = getCourseFooterHtml();
      normalizeCourseRelativeLinks(navMount);
      normalizeCourseRelativeLinks(mainMount);
      normalizeCourseRelativeLinks(footerMount);
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
      navMount.innerHTML = '<a class="navbar-brand" href="ai-agents-course.html">AI agents</a>';
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

  loadJsonData()
    .then(function (data) {
      renderPage(normalizePageData(data));
    })
    .catch(function (fetchError) {
      if (!inlineData) {
        renderError(fetchError);
        return;
      }

      try {
        renderPage(normalizePageData(inlineData));
      } catch (inlineError) {
        renderError(inlineError);
      }
    });
}());

