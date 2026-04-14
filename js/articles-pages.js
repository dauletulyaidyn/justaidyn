(function () {
  const body = document.body;
  const navMount = document.getElementById('articlesNavMount');
  const mainMount = document.getElementById('articlesPageContent');
  const footerMount = document.getElementById('articlesFooterMount');
  const inlineData = window.__ARTICLES_PAGES__ || null;
  let currentPage = null;
  let currentFilterController = null;

  if (!body || !body.classList.contains('articles-page') || !navMount || !mainMount || !footerMount) {
    return;
  }

  const storageKey = 'site_lang';

  function isArticlesHubPage(page) {
    return !page || body.getAttribute('data-page-key') === 'articles-hub';
  }

  function brandTitle(title) {
    const value = (title || '').trim();
    if (!value) {
      return 'JustAidyn Articles | JustAidyn Courses';
    }
    if (/JustAidyn Courses/i.test(value)) {
      return value;
    }
    return `${value} | JustAidyn Courses`;
  }

  function brandDescription(description) {
    const value = (description || '').trim();
    const brandLine = 'This article is part of JustAidyn Courses.';
    if (!value) {
      return brandLine;
    }
    if (/JustAidyn Courses/i.test(value)) {
      return value;
    }
    return `${value} ${brandLine}`;
  }

  function buildStructuredData(meta) {
    const title = brandTitle(meta && meta.title || '');
    const description = brandDescription(meta && meta.description || '');
    const canonical = meta && meta.canonical || window.location.href;

    return JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: title,
      description: description,
      url: canonical,
      author: {
        '@type': 'Person',
        name: 'Dauletuly Aidyn',
        alternateName: 'JustAidyn'
      },
      publisher: {
        '@type': 'Organization',
        name: 'JustAidyn Courses'
      },
      mainEntityOfPage: canonical
    });
  }

  function getCourseBrandCopy(lang) {
    if (lang === 'ru') {
      return {
        label: 'JustAidyn Courses',
        text: 'Эта статья входит в JustAidyn Courses и помогает связать материалы сайта с курсами и AI Agents Course.',
        link: 'Открыть страницу курса'
      };
    }

    if (lang === 'kk') {
      return {
        label: 'JustAidyn Courses',
        text: 'Бұл мақала JustAidyn Courses құрамына кіреді және сайт материалдарын курстармен әрі AI Agents Course бетімен байланыстырады.',
        link: 'Курс бетін ашу'
      };
    }

    return {
      label: 'JustAidyn Courses',
      text: 'This article is part of JustAidyn Courses and is connected to the broader AI Agents Course ecosystem.',
      link: 'Open course page'
    };
  }

  function applyVisibleArticleBranding(lang) {
    const courseDropdown = navMount.querySelector('#coursesDropdown');
    if (courseDropdown) {
      courseDropdown.textContent = 'JustAidyn Courses';
      courseDropdown.setAttribute('data-en', 'JustAidyn Courses');
      courseDropdown.setAttribute('data-ru', 'Курсы JustAidyn');
      courseDropdown.setAttribute('data-kk', 'JustAidyn курстары');
    }

    if (isArticlesHubPage(currentPage)) {
      const hubTitle = mainMount.querySelector('.subpage-title');
      const hubLead = mainMount.querySelector('.subpage-lead');
      if (hubTitle) {
        hubTitle.textContent = 'JustAidyn Courses Articles';
      }
      if (hubLead) {
        hubLead.textContent = 'Articles and materials from JustAidyn Courses about AI, programming, research, and practical workflows.';
      }
      return;
    }

    const heroTitle = mainMount.querySelector('.subpage-title');
    const heroLead = mainMount.querySelector('.subpage-lead');

    if (heroTitle && !/JustAidyn Courses/i.test(heroTitle.textContent)) {
      heroTitle.textContent = `${heroTitle.textContent} | JustAidyn Courses`;
    }

    if (heroLead && !/JustAidyn Courses/i.test(heroLead.textContent)) {
      heroLead.textContent = `${heroLead.textContent} JustAidyn Courses material.`;
    }
  }

  function injectCourseBrandBlock(lang) {
    if (isArticlesHubPage(currentPage)) {
      return;
    }

    const article = mainMount.querySelector('.article-entry');
    if (!article || article.querySelector('[data-course-brand-block]')) {
      return;
    }

    const copy = getCourseBrandCopy(lang);
    const block = document.createElement('div');
    block.className = 'article-callout note';
    block.setAttribute('data-course-brand-block', 'true');
    block.innerHTML = `<strong>${copy.label}:</strong> ${copy.text} <a href="https://justaidyn.vercel.app/ai-agents-course.html">${copy.link}</a>.`;

    const anchor = article.querySelector('.article-meta') || article.firstElementChild;
    if (anchor && anchor.nextSibling) {
      article.insertBefore(block, anchor.nextSibling);
    } else {
      article.appendChild(block);
    }
  }

  function getBrandedMeta(meta) {
    if (!meta) {
      return null;
    }

    if (isArticlesHubPage(currentPage)) {
      const hubTitle = brandTitle(meta.title || 'JustAidyn Posts and Articles');
      const hubDescription = brandDescription(meta.description || 'JustAidyn posts and articles hub.');

      return {
        title: hubTitle,
        description: hubDescription,
        canonical: meta.canonical || '',
        structuredData: meta.structuredData || '',
        named: Object.assign({}, meta.named, {
          description: hubDescription,
          'twitter:title': hubTitle,
          'twitter:description': hubDescription
        }),
        property: Object.assign({}, meta.property, {
          'og:title': hubTitle,
          'og:description': hubDescription
        })
      };
    }

    const title = brandTitle(meta.title);
    const description = brandDescription(meta.description);
    const structuredData = meta.structuredData && meta.structuredData.trim() ? meta.structuredData : buildStructuredData(meta);

    return {
      title: title,
      description: description,
      canonical: meta.canonical || '',
      structuredData: structuredData,
      named: Object.assign({}, meta.named, {
        description: description,
        'twitter:title': title,
        'twitter:description': description
      }),
      property: Object.assign({}, meta.property, {
        'og:title': title,
        'og:description': description
      })
    };
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

  function getMainHtmlForLanguage(page, lang) {
    const localized = page && page.localizedMainHtml;
    if (localized && typeof localized === 'object') {
      if (localized[lang]) {
        return localized[lang];
      }
      if (page.defaultLang && localized[page.defaultLang]) {
        return localized[page.defaultLang];
      }
      const firstAvailable = Object.values(localized).find(Boolean);
      if (firstAvailable) {
        return firstAvailable;
      }
    }

    return page && page.mainHtml || '';
  }

  function renderMainForLanguage(lang) {
    if (!currentPage) {
      return;
    }

    const nextHtml = getMainHtmlForLanguage(currentPage, lang);
    if (mainMount.innerHTML !== nextHtml) {
      mainMount.innerHTML = nextHtml;
      currentFilterController = null;
    }

    applyVisibleArticleBranding(lang);
    injectCourseBrandBlock(lang);
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

  function getMetaForLanguage(page, lang) {
    const localized = page && page.localizedMeta;
    if (localized && typeof localized === 'object') {
      if (localized[lang]) {
        return localized[lang];
      }
      if (page.defaultLang && localized[page.defaultLang]) {
        return localized[page.defaultLang];
      }
      const firstAvailable = Object.values(localized).find(Boolean);
      if (firstAvailable) {
        return firstAvailable;
      }
    }

    return page && page.meta || null;
  }

  function applyHead(meta) {
    if (!meta) {
      return;
    }

    const brandedMeta = getBrandedMeta(meta);

    document.title = brandedMeta.title || 'JustAidyn Articles | JustAidyn Courses';
    ensureMetaAttribute('meta[name="description"]', 'content', brandedMeta.description || '');
    ensureMetaAttribute('meta[property="og:title"]', 'content', brandedMeta.property && brandedMeta.property['og:title'] || brandedMeta.title || '');
    ensureMetaAttribute('meta[property="og:description"]', 'content', brandedMeta.property && brandedMeta.property['og:description'] || brandedMeta.description || '');
    ensureMetaAttribute('meta[property="og:type"]', 'content', meta.property && meta.property['og:type'] || 'website');
    ensureMetaAttribute('meta[property="og:url"]', 'content', brandedMeta.property && brandedMeta.property['og:url'] || brandedMeta.canonical || '');
    ensureMetaAttribute('meta[property="og:image"]', 'content', brandedMeta.property && brandedMeta.property['og:image'] || '');
    ensureMetaAttribute('meta[name="twitter:card"]', 'content', brandedMeta.named && brandedMeta.named['twitter:card'] || 'summary_large_image');
    ensureMetaAttribute('meta[name="twitter:title"]', 'content', brandedMeta.named && brandedMeta.named['twitter:title'] || brandedMeta.title || '');
    ensureMetaAttribute('meta[name="twitter:description"]', 'content', brandedMeta.named && brandedMeta.named['twitter:description'] || brandedMeta.description || '');
    ensureMetaAttribute('meta[name="twitter:image"]', 'content', brandedMeta.named && brandedMeta.named['twitter:image'] || '');

    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', brandedMeta.canonical || '');

    const structuredData = document.getElementById('pageStructuredData');
    if (structuredData) {
      structuredData.textContent = brandedMeta.structuredData || '';
    }
  }

  function applyLanguage(lang) {
    const activeLang = ['en', 'ru', 'kk'].includes(lang) ? lang : 'kk';
    if (currentPage) {
      applyHead(getMetaForLanguage(currentPage, activeLang));
    }
    renderMainForLanguage(activeLang);
    document.documentElement.lang = activeLang;
    saveLanguage(activeLang);

    document.querySelectorAll('[data-lang-option]').forEach((button) => {
      const isActive = button.getAttribute('data-lang-option') === activeLang;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    document.querySelectorAll('[data-en][data-ru][data-kk]').forEach((element) => {
      const value = element.getAttribute('data-' + activeLang);
      if (value !== null) {
        element.textContent = value;
      }
    });

    document.querySelectorAll('[data-show-langs]').forEach((element) => {
      element.style.display = isElementAllowedForLanguage(element, activeLang) ? '' : 'none';
    });

    if (currentFilterController) {
      currentFilterController.applyCurrentFilter();
    } else {
      initArticlesFilter();
    }
  }

  window.changeLanguage = function (lang) {
    applyLanguage(lang);
  };

  function initArticlesFilter() {
    const buttons = Array.from(document.querySelectorAll('.articles-filter-btn'));
    const items = Array.from(document.querySelectorAll('.article-card-item'));
    const emptyState = document.getElementById('articlesEmptyState');
    const params = new URLSearchParams(window.location.search);
    let currentFilter = params.get('filter') || 'all';

    if (!buttons.length || !items.length) {
      return;
    }

    function applyFilter(filter) {
      const normalized = filter || 'all';
      const activeLang = document.documentElement.lang || body.getAttribute('data-default-lang') || 'kk';
      let visibleCount = 0;

      buttons.forEach((button) => {
        button.classList.toggle('is-active', button.getAttribute('data-filter') === normalized);
      });

      items.forEach((item) => {
        const categories = (item.getAttribute('data-categories') || '').split(',').map((value) => value.trim()).filter(Boolean);
        const matchesFilter = normalized === 'all' || categories.includes(normalized);
        const visible = matchesFilter && isElementAllowedForLanguage(item, activeLang);
        item.hidden = !visible;
        if (visible) {
          visibleCount += 1;
        }
      });

      if (emptyState) {
        emptyState.hidden = visibleCount !== 0;
      }

      const nextUrl = normalized === 'all' ? window.location.pathname : `${window.location.pathname}?filter=${encodeURIComponent(normalized)}`;
      window.history.replaceState({}, '', nextUrl);
      currentFilter = normalized;
    }

    currentFilterController = {
      applyCurrentFilter: function () {
        applyFilter(currentFilter);
      }
    };

    buttons.forEach((button) => {
      button.addEventListener('click', function () {
        applyFilter(this.getAttribute('data-filter'));
      });
    });

    document.querySelectorAll('[data-filter-tag]').forEach((tag) => {
      tag.addEventListener('click', function () {
        applyFilter(this.getAttribute('data-filter-tag'));
      });
    });

    applyFilter(currentFilter);
  }

  function renderPage(data) {
      const page = data.pages && data.pages[body.getAttribute('data-page-key')];
      if (!page) {
        throw new Error('Missing articles page data');
      }

      currentPage = page;
      body.setAttribute('data-default-lang', page.defaultLang || body.getAttribute('data-default-lang') || 'kk');
      navMount.innerHTML = page.navHtml || '';
      footerMount.innerHTML = page.footerHtml || '';
      applyLanguage(readSavedLanguage() || body.getAttribute('data-default-lang') || 'kk');
  }

  function renderError(error) {
      console.error(error);
      navMount.innerHTML = '<a class="navbar-brand mx-auto mx-lg-0" href="../index.html">Aidyn</a>';
      mainMount.innerHTML = '<section class="section-padding"><div class="container"><div class="profile-thumb"><h3>Content failed to load</h3><p>Open the site through static hosting or a local server so JSON files can be loaded.</p></div></div></section>';
      footerMount.innerHTML = '';
  }

  function loadJsonData() {
    const source = body.getAttribute('data-content-src');
    if (!source) {
      return Promise.reject(new Error('Missing articles data source'));
    }

    return fetch(source, { cache: 'no-cache' }).then(function (response) {
      if (!response.ok) {
        throw new Error('Failed to load articles page data');
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
