
(function ($) {
    var isCoursePage = document.body && document.body.classList.contains('course-page');
  
  "use strict";

    function getSiteAssetPath(assetPath) {
      if (window.location.protocol !== 'file:') {
        return '/' + assetPath;
      }

      var normalizedPath = window.location.pathname.replace(/\\/g, '/');
      var marker = '/CV-Portfolio/';
      var markerIndex = normalizedPath.lastIndexOf(marker);

      if (markerIndex === -1) {
        return assetPath;
      }

      var relativePath = normalizedPath.slice(markerIndex + marker.length);
      var segments = relativePath.split('/').filter(Boolean);
      var depth = Math.max(segments.length - 1, 0);
      var prefix = depth ? new Array(depth + 1).join('../') : '';

      return prefix + assetPath;
    }

    function ensureSiteFavicon() {
      var faviconHref = getSiteAssetPath('favicon.png?v=20260331c');
      var selectors = [
        'link[rel="icon"]',
        'link[rel="shortcut icon"]',
        'link[rel="apple-touch-icon"]'
      ];

      selectors.forEach(function(selector) {
        var node = document.head.querySelector(selector);
        if (!node) {
          node = document.createElement('link');
          node.setAttribute('rel', selector.match(/rel="([^"]+)"/)[1]);
          document.head.appendChild(node);
        }

        node.setAttribute('href', faviconHref);
        if (node.getAttribute('rel') === 'icon' || node.getAttribute('rel') === 'shortcut icon') {
          node.setAttribute('type', 'image/png');
        }
      });
    }

    function getSharedFooterHtml() {
      return `
        <div class="container">
          <div class="row g-4 align-items-start text-start">
            <div class="col-lg-4 col-md-6 col-12">
              <div class="site-footer-brand mb-3">
                <img class="site-footer-logo" src="${getSiteAssetPath('images/justaidyn-logo.png')}" alt="JustAidyn logo" width="40" height="40">
                <strong class="site-footer-title d-block mb-0" data-en="JustAidyn" data-ru="JustAidyn" data-kk="JustAidyn">JustAidyn</strong>
              </div>
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
                <li class="footer-menu-item"><a class="footer-menu-link" href="https://wa.me/77769889889" target="_blank" rel="noopener">WhatsApp</a></li>
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
                  <span class="ms-2"><span data-en="Designed by" data-ru="Designed by" data-kk="Designed by">Designed by</span> <a href="https://templatemo.com/" target="_blank" rel="noopener">TemplateMo</a></span>
                </p>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    window.getSharedFooterHtml = getSharedFooterHtml;

    function renderSharedFooters() {
      document.querySelectorAll('.site-footer').forEach(function(footer) {
        footer.innerHTML = getSharedFooterHtml();
      });
    }

    function detectCurrentSection() {
      var path = (window.location.pathname || '/').toLowerCase();

      if (path === '/' || path === '/index.html' || path === '') return 'home';
      if (path === '/projects' || path.endsWith('/projects.html')) return 'projects';
      if (path === '/login') return 'login';
      if (path === '/register') return 'register';
      if (path.startsWith('/courses')) return 'courses';
      if (path.startsWith('/ai-agents') || path === '/faq.html') return 'courses';
      if (path.startsWith('/apps')) return 'apps';
      if (path.startsWith('/skillsminds')) return 'skillsminds';
      if (path.startsWith('/nofacethinker')) return 'nofacethinker';
      if (path.startsWith('/games')) return 'games';
      if (path.startsWith('/shop')) return 'shop';
      if (path.startsWith('/api')) return 'api';
      if (path.startsWith('/articles')) return 'articles';

      return '';
    }

    function getSharedStaticNavHtml(currentSection) {
      var isHome = currentSection === 'home';
      var isLogin = currentSection === 'login';
      var isRegister = currentSection === 'register';
      var languageButtons = `<button type="button" class="lang-flag-btn" data-lang-option="en" onclick="changeLanguage('en')" aria-label="English" title="English">EN</button><button type="button" class="lang-flag-btn" data-lang-option="kk" onclick="changeLanguage('kk')" aria-label="Kazakh" title="Kazakh">KK</button><button type="button" class="lang-flag-btn" data-lang-option="ru" onclick="changeLanguage('ru')" aria-label="Russian" title="Russian">RU</button>`;

      return `
        <div class="container">
          <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
          </button>

          <a href="/" class="navbar-brand mx-auto mx-lg-0">JustAidyn</a>

          <div class="d-flex align-items-center d-lg-none">
            <i class="navbar-icon bi-whatsapp me-3"></i>
            <a class="custom-btn btn" href="https://wa.me/77769889889" target="_blank" rel="noopener" data-en="Chat on WhatsApp" data-ru="Написать в WhatsApp" data-kk="WhatsApp-та жазу">Chat on WhatsApp</a>
          </div>

          <div class="collapse navbar-collapse" id="navbarNav">
            <div class="navbar-split-layout w-100">
              <div class="navbar-top-contact d-none d-lg-flex">
                <div class="navbar-top-contact-left">
                  <a class="navbar-top-contact-link" href="mailto:aidyn.daulet@gmail.com" aria-label="Write to me by email" title="Write to me by email">
                    <i class="bi bi-envelope"></i>
                  </a>
                  <a class="navbar-top-contact-link" href="tel:+77769889889" aria-label="Call me" title="Call me">
                    <i class="bi bi-telephone"></i>
                  </a>
                  <a class="navbar-top-contact-link" href="https://wa.me/77769889889" target="_blank" rel="noopener" aria-label="Write to me on WhatsApp" title="Write to me on WhatsApp">
                    <i class="bi bi-whatsapp"></i>
                  </a>
                  <a class="navbar-top-contact-link" href="https://t.me/justaidyn" target="_blank" rel="noopener" aria-label="Write to me on Telegram" title="Write to me on Telegram">
                    <i class="bi bi-telegram"></i>
                  </a>
                  <a class="navbar-top-contact-link navbar-top-cv-link" href="/?dl=pdf" aria-label="CV" title="CV">CV</a>
                </div>
                <div class="navbar-top-tools">
                  <div class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle navbar-top-tool-link" href="#" id="projectsDropdownTop" role="button" data-bs-toggle="dropdown" aria-expanded="false" data-en="JUSTAIDYN PROJECTS" data-ru="ПРОЕКТЫ JUSTAIDYN" data-kk="JUSTAIDYN ЖОБАЛАРЫ">JUSTAIDYN ЖОБАЛАРЫ</a>
                    <ul class="dropdown-menu" aria-labelledby="projectsDropdownTop">
                      <li><a class="dropdown-item" href="/" data-en="JustAidyn Home" data-ru="JustAidyn Home" data-kk="JustAidyn Home">JustAidyn Home</a></li>
                      <li><hr class="dropdown-divider"></li>
                      <li><a class="dropdown-item" href="/skillsminds" data-en="SkillsMinds" data-ru="SkillsMinds" data-kk="SkillsMinds">SkillsMinds</a></li>
                      <li><a class="dropdown-item" href="#" data-en="NoFaceThinker" data-ru="NoFaceThinker" data-kk="NoFaceThinker">NoFaceThinker</a></li>
                      <li class="dropdown-submenu" data-show-langs="ru,kk">
                        <a class="dropdown-item dropdown-toggle" href="#" data-en="Courses" data-ru="Курсы" data-kk="Курстар">Courses</a>
                        <ul class="dropdown-menu">
                          <li class="dropdown-submenu">
                            <a class="dropdown-item dropdown-toggle" href="/courses/ai-agents-course.html" data-en="AI Agents" data-ru="AI-агенты" data-kk="AI-агенттер">AI Agents</a>
                            <ul class="dropdown-menu">
                              <li data-show-langs="ru,kk"><a class="dropdown-item" href="/courses/faq.html" data-en="FAQ" data-ru="FAQ" data-kk="ЖҚС">FAQ</a></li>
                              <li><a class="dropdown-item disabled" href="#" aria-disabled="true" tabindex="-1" data-en="Student List" data-ru="Список слушателей" data-kk="Тыңдаушылар тізімі">Student List</a></li>
                            </ul>
                          </li>
                          <li><a class="dropdown-item disabled" href="#" aria-disabled="true" tabindex="-1" data-en="Programming" data-ru="Программирование" data-kk="Бағдарламалау">Programming</a></li>
                          <li><a class="dropdown-item" href="/courses/non-standard-math-logic.html" data-en="Non-standard Math" data-ru="Нестандартная математика" data-kk="Стандарттан тыс математика">Non-standard Math</a></li>
                          <li data-show-langs="ru,kk"><a class="dropdown-item" href="/courses/motivational-letter.html" data-en="Motivational Letter" data-ru="Мотивационное письмо" data-kk="Мотивациялық хат">Motivational Letter</a></li>
                        </ul>
                      </li>
                      <li><a class="dropdown-item" href="/apps" data-en="Apps" data-ru="Приложения" data-kk="Қосымшалар">Apps</a></li>
                      <li><a class="dropdown-item" href="#" data-en="Games" data-ru="Игры" data-kk="Ойындар">Games</a></li>
                      <li><a class="dropdown-item" href="#" data-en="Shop" data-ru="Магазин" data-kk="Дүкен">Shop</a></li>
                      <li><a class="dropdown-item" href="#" data-en="API" data-ru="API" data-kk="API">API</a></li>
                    </ul>
                  </div>
                  <div class="language-selector navbar-top-lang language-flags" role="group" aria-label="Language selector">
                    ${languageButtons}
                  </div>
                  <div class="navbar-top-auth-links">
                    <a class="navbar-top-tool-btn ${isLogin ? 'active' : ''}" href="#" data-en="Login" data-ru="Войти" data-kk="Кіру">Кіру</a>
                    <a class="navbar-top-tool-btn ${isRegister ? 'active' : ''}" href="#" data-en="Register" data-ru="Регистрация" data-kk="Тіркелу">Тіркелу</a>
                  </div>
                </div>
              </div>

              <ul class="navbar-nav ms-lg-0 nav-row-primary">
                <li class="nav-item"><a class="nav-link ${isHome ? 'active' : ''}" href="/#section_1" data-en="Home" data-ru="Главная" data-kk="Басты">Басты</a></li>
                <li class="nav-item"><a class="nav-link" href="/#section_2" data-en="About" data-ru="Обо мне" data-kk="Мен туралы">Мен туралы</a></li>
                <li class="nav-item"><a class="nav-link" href="/#section_3" data-en="Skills" data-ru="Навыки" data-kk="Дағдылар">Дағдылар</a></li>
                <li class="nav-item"><a class="nav-link" href="/#section_5" data-en="Contact" data-ru="Контакты" data-kk="Байланыс">Байланыс</a></li>
              </ul>
            </div>
          </div>
        </div>
      `;
    }

    window.getSharedStaticNavHtml = getSharedStaticNavHtml;

    function renderSharedNavbars() {
      var currentSection = detectCurrentSection();

      document.querySelectorAll('.navbar.navbar-split').forEach(function(navbar) {
        navbar.classList.remove('course-navbar');
        navbar.innerHTML = getSharedStaticNavHtml(currentSection);
      });
    }

    function readSavedLanguage() {
      try {
        return localStorage.getItem('site_lang');
      } catch (error) {
        return null;
      }
    }

    function saveLanguage(lang) {
      try {
        localStorage.setItem('site_lang', lang);
      } catch (error) {
        // Ignore storage errors.
      }
    }

    function applyLanguageToDocument(lang) {
      var uiLang = lang === 'kk' ? 'kk' : lang === 'ru' ? 'ru' : 'en';

      document.documentElement.lang = uiLang;

      document.querySelectorAll('[data-' + uiLang + ']').forEach(function(element) {
        var value = element.getAttribute('data-' + uiLang);
        if (value !== null) {
          if (value.indexOf('<') !== -1 || value.indexOf('&') !== -1) {
            element.innerHTML = value;
          } else {
            element.textContent = value;
          }
        }
      });

      document.querySelectorAll('[data-show-langs]').forEach(function(element) {
        var languages = (element.getAttribute('data-show-langs') || '')
          .split(',')
          .map(function(item) { return item.trim(); })
          .filter(Boolean);
        element.style.display = !languages.length || languages.indexOf(uiLang) !== -1 ? '' : 'none';
      });

      document.querySelectorAll('[data-lang-option]').forEach(function(button) {
        var isActive = button.getAttribute('data-lang-option') === uiLang;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });

      saveLanguage(uiLang);
    }

    window.changeLanguage = function(lang) {
      applyLanguageToDocument(lang);
    };

    function enhanceMobileSplitNavbars() {
      document.querySelectorAll('.navbar.navbar-split').forEach(function(navbar) {
        var layout = navbar.querySelector('.navbar-split-layout');
        if (layout && !layout.querySelector('.navbar-mobile-panel')) {
          var currentSection = detectCurrentSection();
          var isLogin = currentSection === 'login';
          var isRegister = currentSection === 'register';
          layout.insertAdjacentHTML('beforeend', `
            <div class="navbar-mobile-panel d-lg-none">
              <div class="navbar-mobile-actions" aria-label="Mobile contact actions">
                <a class="navbar-mobile-action" href="mailto:aidyn.daulet@gmail.com">
                  <i class="bi bi-envelope"></i>
                  <span class="visually-hidden" data-en="Write to email" data-ru="Write to email" data-kk="Write to email">Write to email</span>
                </a>
                <a class="navbar-mobile-action" href="tel:+77769889889">
                  <i class="bi bi-telephone"></i>
                  <span class="visually-hidden" data-en="Call to phone" data-ru="Call to phone" data-kk="Call to phone">Call to phone</span>
                </a>
                <a class="navbar-mobile-action" href="https://wa.me/77769889889" target="_blank" rel="noopener">
                  <i class="bi bi-whatsapp"></i>
                  <span class="visually-hidden" data-en="Write to WhatsApp" data-ru="Write to WhatsApp" data-kk="Write to WhatsApp">Write to WhatsApp</span>
                </a>
                <a class="navbar-mobile-action" href="https://t.me/justaidyn" target="_blank" rel="noopener">
                  <i class="bi bi-telegram"></i>
                  <span class="visually-hidden" data-en="Write to Telegram" data-ru="Write to Telegram" data-kk="Write to Telegram">Write to Telegram</span>
                </a>
                <a class="navbar-mobile-action" href="/?dl=pdf">
                  <i class="bi bi-file-earmark-arrow-down"></i>
                  <span class="visually-hidden" data-en="Download CV" data-ru="Download CV" data-kk="Download CV">Download CV</span>
                </a>
              </div>

              <div class="navbar-mobile-auth">
                <a class="navbar-top-tool-btn ${isLogin ? 'active' : ''}" href="#" data-en="Login" data-ru="Login" data-kk="Login">Login</a>
                <a class="navbar-top-tool-btn ${isRegister ? 'active' : ''}" href="#" data-en="Register" data-ru="Register" data-kk="Register">Register</a>
              </div>

              <div class="nav-item dropdown navbar-mobile-projects">
                <a class="nav-link dropdown-toggle navbar-mobile-projects-toggle" href="#" id="projectsDropdownMobile" role="button" data-bs-toggle="dropdown" data-bs-display="static" aria-expanded="false" data-en="Projects of JustAidyn" data-ru="Projects of JustAidyn" data-kk="Projects of JustAidyn">Projects of JustAidyn</a>
                <ul class="dropdown-menu" aria-labelledby="projectsDropdownMobile">
                  <li>
                    <button type="button" class="dropdown-item navbar-mobile-projects-close">
                      <i class="bi bi-x-lg"></i>
                      <span data-en="Close menu" data-ru="Close menu" data-kk="Close menu">Close menu</span>
                    </button>
                  </li>
                  <li><hr class="dropdown-divider"></li>
                  <li><a class="dropdown-item" href="/" data-en="JustAidyn Home" data-ru="JustAidyn Home" data-kk="JustAidyn Home">JustAidyn Home</a></li>
                  <li><a class="dropdown-item" href="/skillsminds" data-en="SkillsMinds" data-ru="SkillsMinds" data-kk="SkillsMinds">SkillsMinds</a></li>
                  <li><a class="dropdown-item" href="/nofacethinker" data-en="NoFaceThinker" data-ru="NoFaceThinker" data-kk="NoFaceThinker">NoFaceThinker</a></li>
                  <li><a class="dropdown-item" href="/courses/ai-agents-course.html" data-en="AI Agents" data-ru="AI Agents" data-kk="AI Agents">AI Agents</a></li>
                  <li><a class="dropdown-item" href="/apps" data-en="Apps" data-ru="Apps" data-kk="Apps">Apps</a></li>
                  <li><a class="dropdown-item" href="/games" data-en="Games" data-ru="Games" data-kk="Games">Games</a></li>
                  <li><a class="dropdown-item" href="/shop" data-en="Shop" data-ru="Shop" data-kk="Shop">Shop</a></li>
                  <li><a class="dropdown-item" href="/api" data-en="API" data-ru="API" data-kk="API">API</a></li>
                </ul>
              </div>
            </div>
          `);
          layout.querySelectorAll('.navbar-mobile-projects-close').forEach(function(button) {
            button.addEventListener('click', function(event) {
              event.preventDefault();
              var projects = button.closest('.navbar-mobile-projects');
              var toggle = projects && projects.querySelector('.navbar-mobile-projects-toggle');
              if (!toggle || typeof bootstrap === 'undefined' || !bootstrap.Dropdown) {
                return;
              }
              bootstrap.Dropdown.getOrCreateInstance(toggle).hide();
            });
          });
          layout.querySelectorAll('.navbar-mobile-projects-toggle').forEach(function(toggle) {
            toggle.addEventListener('show.bs.dropdown', function() {
              var menu = toggle.closest('.navbar-mobile-projects').querySelector('.dropdown-menu');
              var rect = toggle.getBoundingClientRect();
              var gutter = 24;
              var menuWidth = Math.max(0, window.innerWidth - gutter * 2);
              menu.style.setProperty('--mobile-projects-menu-bottom', Math.max(8, window.innerHeight - rect.top + 6) + 'px');
              menu.style.setProperty('--mobile-projects-menu-left', gutter + 'px');
              menu.style.setProperty('--mobile-projects-menu-width', menuWidth + 'px');
            });
          });
          return;
        }

        var mobileTools = navbar.querySelector('.d-flex.align-items-center.d-lg-none');
        var desktopLangs = navbar.querySelector('.navbar-top-lang.language-flags');

        if (!mobileTools || !desktopLangs) {
          return;
        }

        mobileTools.classList.add('navbar-mobile-tools');

        if (mobileTools.querySelector('.mobile-lang-selector')) {
          return;
        }

        var mobileLangs = desktopLangs.cloneNode(true);
        mobileLangs.classList.remove('navbar-top-lang');
        mobileLangs.classList.add('mobile-lang-selector');
        mobileTools.appendChild(mobileLangs);

        mobileLangs.querySelectorAll('[data-lang-option]').forEach(function(button) {
          button.addEventListener('click', function() {
            if (typeof window.changeLanguage === 'function') {
              window.changeLanguage(button.getAttribute('data-lang-option'));
            }
          });
        });
      });
    }

    // PRE LOADER
    $(window).load(function(){
      $('.preloader').fadeOut(1000); // set duration in brackets    
    });

    function initWhenReady() {
      ensureSiteFavicon();
      renderSharedNavbars();
      enhanceMobileSplitNavbars();
      renderSharedFooters();
      if (isCoursePage) {
        var savedCourseLang = readSavedLanguage();
        if (savedCourseLang && typeof window.changeLanguage === 'function') {
          window.changeLanguage(savedCourseLang);
        }
        return;
      }
      if (document.body && document.body.classList.contains('articles-page')) {
        return;
      }
      window.changeLanguage = function(lang) {
        applyLanguageToDocument(lang);
      };
      applyLanguageToDocument(readSavedLanguage() || document.documentElement.lang || 'en');
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initWhenReady);
    } else {
      initWhenReady();
    }

    var navbarObserver = new MutationObserver(function() {
      ensureSiteFavicon();
      enhanceMobileSplitNavbars();
    });

    navbarObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    // CUSTOM LINK
    $('.custom-link').click(function(){
    var el = $(this).attr('href');
    var elWrapped = $(el);
    var header_height = $('.navbar').height() + 10;

    scrollToDiv(elWrapped,header_height);
    return false;

    function scrollToDiv(element,navheight){
      var offset = element.offset();
      var offsetTop = offset.top;
      var totalScroll = offsetTop-navheight;

      $('body,html').animate({
      scrollTop: totalScroll
      }, 300);
  }
});
    
  })(window.jQuery);
