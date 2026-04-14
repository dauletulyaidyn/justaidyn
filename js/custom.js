
  (function ($) {
  
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

    function renderSharedFooters() {
      document.querySelectorAll('.site-footer').forEach(function(footer) {
        if (footer.querySelector('#courseFooterMount')) {
          return;
        }

        footer.innerHTML = getSharedFooterHtml();
      });
    }

    function enhanceMobileSplitNavbars() {
      document.querySelectorAll('.navbar.navbar-split').forEach(function(navbar) {
        if (navbar.classList.contains('course-navbar')) {
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

    document.addEventListener('DOMContentLoaded', function() {
      ensureSiteFavicon();
      enhanceMobileSplitNavbars();
      renderSharedFooters();
    });

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
