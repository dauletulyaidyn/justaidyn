(function () {
  var EU_REGIONS = [
    "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
    "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
    "SI", "ES", "SE"
  ];

  function ensureLegalRuntimeStyles() {
    if (!document.querySelector("link[href=\"/static/styles/legal.css\"]")) {
      var link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "/static/styles/legal.css";
      document.head.appendChild(link);
    }

    if (document.getElementById("justaidyn-legal-runtime-styles")) return;

    var style = document.createElement("style");
    style.id = "justaidyn-legal-runtime-styles";
    style.textContent = [
      ".cookie-consent-panel{position:fixed;right:18px;bottom:18px;z-index:9999;width:min(460px,calc(100% - 36px));padding:20px;background:rgba(255,255,255,.96);border:1px solid rgba(24,36,50,.1);border-radius:8px;box-shadow:0 16px 48px rgba(18,35,52,.08);font-family:inherit}",
      ".cookie-consent-panel h2{margin:0 0 8px;color:#182432;font-size:1.1rem;line-height:1.25}",
      ".cookie-consent-panel p{margin:0 0 14px;color:#5e6c79;line-height:1.55}",
      ".cookie-consent-actions{display:flex;flex-wrap:wrap;gap:10px}",
      ".cookie-consent-actions button,.cookie-preference-list button{min-height:40px;padding:8px 12px;border-radius:8px;border:1px solid #0d5b5f;font-weight:700}",
      ".cookie-primary{background:#0d5b5f;color:#fff}",
      ".cookie-secondary{background:#fff;color:#0d5b5f}",
      ".cookie-preference-list{display:none;margin-top:14px;grid-template-columns:1fr;gap:10px}",
      ".cookie-consent-panel.is-customizing .cookie-preference-list{display:grid}",
      ".cookie-option{display:flex;gap:10px;align-items:flex-start;padding:10px;border:1px solid rgba(24,36,50,.1);border-radius:8px;color:#182432}",
      ".cookie-option span{color:#5e6c79;line-height:1.45}",
      ".cookie-option strong{color:#182432}"
    ].join("");
    document.head.appendChild(style);
  }

  function getQueryParam(name) {
    try {
      return new URLSearchParams(window.location.search).get(name);
    } catch (error) {
      return null;
    }
  }

  function normalizeRegion(value) {
    if (!value) return null;
    var clean = String(value).toLowerCase();
    if (["kz", "kazakhstan"].indexOf(clean) >= 0) return "kz";
    if (["eu", "eea", "europe"].indexOf(clean) >= 0) return "eu";
    if (["uk", "gb", "united-kingdom"].indexOf(clean) >= 0) return "uk";
    if (["us", "usa", "california", "ca-us"].indexOf(clean) >= 0) return "us";
    if (["other", "world", "rest"].indexOf(clean) >= 0) return "other";
    return null;
  }

  function regionFromLocale() {
    var languages = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
    for (var i = 0; i < languages.length; i += 1) {
      var parts = String(languages[i] || "").split("-");
      var region = parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "";
      if (region === "KZ") return "kz";
      if (region === "GB") return "uk";
      if (region === "US") return "us";
      if (EU_REGIONS.indexOf(region) >= 0) return "eu";
    }
    return null;
  }

  function detectRegion() {
    var queryRegion = normalizeRegion(getQueryParam("region"));
    if (queryRegion) return queryRegion;

    var savedRegion = normalizeRegion(localStorage.getItem("justaidynLegalRegion"));
    if (savedRegion) return savedRegion;

    var timeZone = "";
    try {
      timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    } catch (error) {
      timeZone = "";
    }

    if (/Asia\/(Almaty|Qyzylorda|Aqtau|Aqtobe|Atyrau|Oral)/i.test(timeZone)) return "kz";
    if (/Europe\/London/i.test(timeZone)) return "uk";
    if (/America\//i.test(timeZone)) return "us";

    return regionFromLocale() || "other";
  }

  function applyRegion(region) {
    document.body.setAttribute("data-legal-region", region);
    localStorage.setItem("justaidynLegalRegion", region);

    var label = document.querySelector("[data-legal-region-label]");
    var names = {
      kz: "Kazakhstan",
      eu: "EU / EEA",
      uk: "United Kingdom",
      us: "United States / California",
      other: "Other Regions"
    };
    if (label) label.textContent = names[region] || names.other;

    document.querySelectorAll("[data-legal-region-select]").forEach(function (select) {
      select.value = region;
    });
  }

  function initRegionControls() {
    var region = detectRegion();
    applyRegion(region);

    document.querySelectorAll("[data-legal-region-select]").forEach(function (select) {
      select.addEventListener("change", function () {
        applyRegion(select.value);
      });
    });

    document.querySelectorAll("[data-legal-toggle-regions]").forEach(function (button) {
      button.addEventListener("click", function () {
        var next = document.body.getAttribute("data-legal-show-all-regions") !== "true";
        document.body.setAttribute("data-legal-show-all-regions", String(next));
        button.textContent = next ? "Show selected region only" : "Show all regional notices";
      });
    });
  }

  function loadAnalyticsWhenAllowed(settings) {
    if (!settings || !settings.analytics || window.__justAidynAnalyticsLoaded) return;
    window.__justAidynAnalyticsLoaded = true;

    var remote = document.createElement("script");
    remote.async = true;
    remote.src = "https://www.googletagmanager.com/gtag/js?id=G-TGWQPL62RQ";
    document.head.appendChild(remote);

    var local = document.createElement("script");
    local.src = "/js/gtag.js";
    document.head.appendChild(local);
  }

  function saveCookieSettings(settings) {
    localStorage.setItem("justaidynCookieConsent", JSON.stringify({
      necessary: true,
      analytics: Boolean(settings.analytics),
      marketing: Boolean(settings.marketing),
      preferences: Boolean(settings.preferences),
      savedAt: new Date().toISOString()
    }));
    loadAnalyticsWhenAllowed(settings);
  }

  function readCookieSettings() {
    try {
      return JSON.parse(localStorage.getItem("justaidynCookieConsent"));
    } catch (error) {
      return null;
    }
  }

  function createCookiePanel() {
    if (document.querySelector("[data-cookie-consent-panel]")) return;
    if (readCookieSettings()) {
      loadAnalyticsWhenAllowed(readCookieSettings());
      return;
    }

    var panel = document.createElement("section");
    panel.className = "cookie-consent-panel";
    panel.setAttribute("data-cookie-consent-panel", "");
    panel.setAttribute("aria-label", "Cookie consent");
    panel.innerHTML = [
      "<h2>Cookie preferences</h2>",
      "<p>We use necessary cookies for site operation. Analytics, marketing, and preference cookies are optional and can be changed later.</p>",
      "<div class=\"cookie-consent-actions\">",
      "<button class=\"cookie-primary\" type=\"button\" data-cookie-accept>Accept all</button>",
      "<button class=\"cookie-secondary\" type=\"button\" data-cookie-reject>Reject optional</button>",
      "<button class=\"cookie-secondary\" type=\"button\" data-cookie-customize>Customize</button>",
      "</div>",
      "<div class=\"cookie-preference-list\">",
      "<label class=\"cookie-option\"><input type=\"checkbox\" checked disabled> <span><strong>Necessary</strong><br>Required for legal region selection and basic site operation.</span></label>",
      "<label class=\"cookie-option\"><input type=\"checkbox\" data-cookie-option=\"analytics\"> <span><strong>Analytics</strong><br>Helps us understand site usage.</span></label>",
      "<label class=\"cookie-option\"><input type=\"checkbox\" data-cookie-option=\"marketing\"> <span><strong>Marketing</strong><br>Reserved for advertising or campaign measurement.</span></label>",
      "<label class=\"cookie-option\"><input type=\"checkbox\" data-cookie-option=\"preferences\"> <span><strong>Preferences</strong><br>Stores display choices such as region.</span></label>",
      "<button class=\"cookie-primary\" type=\"button\" data-cookie-save>Save preferences</button>",
      "</div>"
    ].join("");
    document.body.appendChild(panel);

    panel.querySelector("[data-cookie-accept]").addEventListener("click", function () {
      saveCookieSettings({ analytics: true, marketing: true, preferences: true });
      panel.remove();
    });
    panel.querySelector("[data-cookie-reject]").addEventListener("click", function () {
      saveCookieSettings({ analytics: false, marketing: false, preferences: false });
      panel.remove();
    });
    panel.querySelector("[data-cookie-customize]").addEventListener("click", function () {
      panel.classList.toggle("is-customizing");
    });
    panel.querySelector("[data-cookie-save]").addEventListener("click", function () {
      saveCookieSettings({
        analytics: panel.querySelector("[data-cookie-option=\"analytics\"]").checked,
        marketing: panel.querySelector("[data-cookie-option=\"marketing\"]").checked,
        preferences: panel.querySelector("[data-cookie-option=\"preferences\"]").checked
      });
      panel.remove();
    });
  }

  function initCookiePolicyButtons() {
    document.querySelectorAll("[data-open-cookie-settings]").forEach(function (button) {
      button.addEventListener("click", function () {
        localStorage.removeItem("justaidynCookieConsent");
        createCookiePanel();
      });
    });
  }

  function initCheckoutWaiver() {
    document.querySelectorAll("[data-checkout-waiver]").forEach(function (wrapper) {
      var checkbox = wrapper.querySelector("input[type=\"checkbox\"]");
      var button = document.querySelector(wrapper.getAttribute("data-controls") || "[data-pay-button]");
      if (!checkbox || !button) return;
      var update = function () {
        button.disabled = !checkbox.checked;
      };
      checkbox.addEventListener("change", update);
      update();
    });
  }

  function legalFooterHtml() {
    return [
      "<div class=\"col-lg-2 col-md-6 col-12\" data-legal-footer>",
      "<strong class=\"site-footer-title d-block mb-3\" data-en=\"Legal\" data-ru=\"Правовые документы\" data-kk=\"Құқықтық құжаттар\">Legal</strong>",
      "<ul class=\"footer-menu\">",
      "<li class=\"footer-menu-item\"><a class=\"footer-menu-link\" href=\"/terms.html\" data-en=\"Terms\" data-ru=\"Условия\" data-kk=\"Шарттар\">Terms</a></li>",
      "<li class=\"footer-menu-item\"><a class=\"footer-menu-link\" href=\"/eula.html\" data-en=\"EULA\" data-ru=\"EULA\" data-kk=\"EULA\">EULA</a></li>",
      "<li class=\"footer-menu-item\"><a class=\"footer-menu-link\" href=\"/privacy.html\" data-en=\"Privacy\" data-ru=\"Конфиденциальность\" data-kk=\"Құпиялылық\">Privacy</a></li>",
      "<li class=\"footer-menu-item\"><a class=\"footer-menu-link\" href=\"/cookie-policy.html\" data-en=\"Cookies\" data-ru=\"Cookies\" data-kk=\"Cookies\">Cookies</a></li>",
      "<li class=\"footer-menu-item\"><a class=\"footer-menu-link\" href=\"/refunds.html\" data-en=\"Refunds\" data-ru=\"Возвраты\" data-kk=\"Қайтарымдар\">Refunds</a></li>",
      "<li class=\"footer-menu-item\"><a class=\"footer-menu-link\" href=\"/subscription-terms.html\" data-en=\"Subscriptions\" data-ru=\"Подписки\" data-kk=\"Жазылымдар\">Subscriptions</a></li>",
      "<li class=\"footer-menu-item\"><a class=\"footer-menu-link\" href=\"/dmca.html\" data-en=\"DMCA\" data-ru=\"DMCA\" data-kk=\"DMCA\">DMCA</a></li>",
      "<li class=\"footer-menu-item\"><a class=\"footer-menu-link\" href=\"/legal-notice.html\" data-en=\"Legal Notice\" data-ru=\"Юридическая информация\" data-kk=\"Заңды ақпарат\">Legal Notice</a></li>",
      "</ul>",
      "</div>"
    ].join("");
  }

  function ensureLegalFooterLinks() {
    var footers = document.querySelectorAll(".site-footer");
    if (!footers.length) {
      var footer = document.createElement("footer");
      footer.className = "site-footer";
      footer.innerHTML = typeof window.getSharedFooterHtml === "function"
        ? window.getSharedFooterHtml()
        : "<div class=\"container\"><div class=\"row g-4 align-items-start text-start\"></div></div>";
      document.body.appendChild(footer);
      footers = document.querySelectorAll(".site-footer");
    }

    footers.forEach(function (footer) {
      if (footer.querySelector("[data-legal-footer]")) return;

      var row = footer.querySelector(".row.g-4") || footer.querySelector(".row");
      if (!row) {
        var container = footer.querySelector(".container") || footer;
        row = document.createElement("div");
        row.className = "row g-4 align-items-start text-start";
        container.appendChild(row);
      }

      row.insertAdjacentHTML("beforeend", legalFooterHtml());
    });
  }

  var legalDocs = {
    "/terms.html": {
      title: { en: "Terms of Use", ru: "Условия использования", kk: "Пайдалану шарттары" },
      desc: {
        en: "These Terms govern access to justaidyn.com, JustAidyn projects, accounts, digital content, applications, games, and subscriptions.",
        ru: "Эти Условия регулируют доступ к justaidyn.com, проектам JustAidyn, аккаунтам, цифровому контенту, приложениям, играм и подпискам.",
        kk: "Бұл шарттар justaidyn.com сайтына, JustAidyn жобаларына, аккаунттарға, цифрлық контентке, қосымшаларға, ойындарға және жазылымдарға қолжетімділікті реттейді."
      },
      nav: [
        ["account", { en: "Account", ru: "Аккаунт", kk: "Аккаунт" }],
        ["products", { en: "Products", ru: "Продукты", kk: "Өнімдер" }],
        ["payments", { en: "Payments", ru: "Оплата", kk: "Төлем" }],
        ["license", { en: "License", ru: "Лицензия", kk: "Лицензия" }],
        ["regional", { en: "Regional terms", ru: "Региональные условия", kk: "Аймақтық шарттар" }],
        ["liability", { en: "Liability", ru: "Ответственность", kk: "Жауапкершілік" }]
      ],
      sections: [
        ["account", { en: "Account and Registration", ru: "Аккаунт и регистрация", kk: "Аккаунт және тіркелу" }, {
          en: ["You may need an account to access paid content, applications, games, downloads, or member areas. You must provide accurate information, keep credentials secure, and notify us about unauthorized access.", "You are responsible for activity under your account unless caused by our failure to use reasonable security measures."],
          ru: ["Для доступа к платному контенту, приложениям, играм, загрузкам или закрытым разделам может потребоваться аккаунт. Вы должны указывать достоверные данные, хранить учетные данные безопасно и сообщать о несанкционированном доступе.", "Вы отвечаете за действия в своем аккаунте, кроме случаев, когда проблема вызвана нашей неспособностью применять разумные меры безопасности."],
          kk: ["Ақылы контентке, қосымшаларға, ойындарға, жүктеулерге немесе жабық бөлімдерге кіру үшін аккаунт қажет болуы мүмкін. Сіз нақты деректер беруге, кіру деректерін қауіпсіз сақтауға және рұқсатсыз қолжетімділік туралы хабарлауға тиіссіз.", "Қауіпсіздік шараларын тиісінше қолданбауымыздан туындамаған жағдайда, аккаунтыңыздағы әрекеттерге өзіңіз жауаптысыз."]
        }],
        ["products", { en: "Services and Subscriptions", ru: "Сервисы и подписки", kk: "Сервистер және жазылымдар" }, {
          en: ["Skills and Minds Hub is free access to digital content such as text, images, and videos. no Face Thinker is a paid digital content subscription. Individual application subscriptions provide paid access or license rights to a specific app. The all-games subscription provides paid access to eligible JustAidyn games.", "Content, features, prices, and availability may change. Material changes to paid subscriptions will be communicated where required by law."],
          ru: ["Skills and Minds Hub предоставляет бесплатный доступ к цифровому контенту: текстам, изображениям и видео. no Face Thinker является платной подпиской на цифровой контент. Подписка на отдельное приложение дает платный доступ или лицензию на конкретное приложение. Единая подписка на игры дает платный доступ к подходящим играм JustAidyn.", "Контент, функции, цены и доступность могут меняться. О существенных изменениях платных подписок мы сообщаем там, где это требуется законом."],
          kk: ["Skills and Minds Hub мәтін, сурет және видео сияқты цифрлық контентке тегін қолжетімділік береді. no Face Thinker цифрлық контентке ақылы жазылым болып табылады. Жеке қосымша жазылымы нақты қосымшаға ақылы қолжетімділік немесе лицензия береді. Барлық ойындарға арналған жазылым JustAidyn ойындарына ақылы қолжетімділік береді.", "Контент, функциялар, бағалар және қолжетімділік өзгеруі мүмкін. Ақылы жазылымдардағы маңызды өзгерістер туралы заң талап еткен жағдайда хабарлаймыз."]
        }],
        ["payments", { en: "Payments and Access", ru: "Оплата и доступ", kk: "Төлем және қолжетімділік" }, {
          en: ["Prices, billing periods, taxes, and payment methods are shown before purchase. Paid subscriptions may renew automatically when stated at checkout.", "Access normally starts immediately after successful payment or activation. Paid digital subscriptions are non-refundable after access begins, except where mandatory law requires otherwise."],
          ru: ["Цены, периоды списания, налоги и способы оплаты показываются до покупки. Платные подписки могут продлеваться автоматически, если это указано при оформлении.", "Доступ обычно начинается сразу после успешной оплаты или активации. Платные цифровые подписки не подлежат возврату после начала доступа, кроме случаев, когда обязательный закон требует иного."],
          kk: ["Бағалар, төлем кезеңдері, салықтар және төлем тәсілдері сатып алуға дейін көрсетіледі. Егер рәсімдеу кезінде көрсетілсе, ақылы жазылымдар автоматты түрде ұзартылуы мүмкін.", "Қолжетімділік әдетте төлем немесе белсендіру сәтті аяқталғаннан кейін бірден басталады. Қолжетімділік басталғаннан кейін ақылы цифрлық жазылымдар қайтарылмайды, міндетті заң өзгеше талап ететін жағдайларды қоспағанда."]
        }],
        ["license", { en: "License and Restrictions", ru: "Лицензия и ограничения", kk: "Лицензия және шектеулер" }, {
          en: ["We grant a limited, personal, non-exclusive, non-transferable license to use the site, content, apps, and games for their intended purpose during your access period.", "You may not resell access, redistribute paid content, reverse engineer applications, bypass access controls, scrape private areas, or use the services unlawfully."],
          ru: ["Мы предоставляем ограниченную, личную, неисключительную и непередаваемую лицензию на использование сайта, контента, приложений и игр по назначению в течение периода доступа.", "Нельзя перепродавать доступ, распространять платный контент, проводить обратную разработку приложений, обходить ограничения доступа, собирать данные из закрытых разделов или использовать сервисы незаконно."],
          kk: ["Біз сайтты, контентті, қосымшаларды және ойындарды қолжетімділік кезеңінде мақсаты бойынша пайдалануға шектеулі, жеке, ерекше емес және берілмейтін лицензия береміз.", "Қолжетімділікті қайта сатуға, ақылы контентті таратуға, қосымшаларды кері әзірлеуге, қолжетімділік шектеулерін айналып өтуге, жабық бөлімдерден дерек жинауға немесе сервистерді заңсыз пайдалануға болмайды."]
        }],
        ["regional", { en: "Regional Terms", ru: "Региональные условия", kk: "Аймақтық шарттар" }, {
          en: ["The selected regional block below applies together with the general Terms. Mandatory consumer rights that cannot be waived remain in force."],
          ru: ["Выбранный ниже региональный блок применяется вместе с общими Условиями. Обязательные права потребителей, от которых нельзя отказаться, сохраняются."],
          kk: ["Төмендегі таңдалған аймақтық блок жалпы шарттармен бірге қолданылады. Бас тартуға болмайтын міндетті тұтынушы құқықтары сақталады."]
        }],
        ["liability", { en: "Disclaimers and Limitation of Liability", ru: "Отказ от гарантий и ограничение ответственности", kk: "Кепілдіктен бас тарту және жауапкершілікті шектеу" }, {
          en: ["The services are provided on an as-is and as-available basis. To the maximum extent permitted by law, JustAidyn is not liable for indirect, incidental, special, consequential, or punitive damages, loss of profits, loss of data, or business interruption."],
          ru: ["Сервисы предоставляются как есть и по мере доступности. В максимальной степени, разрешенной законом, JustAidyn не отвечает за косвенные, случайные, специальные, последующие или штрафные убытки, потерю прибыли, данных или перерыв в работе."],
          kk: ["Сервистер қолда бар күйінде және қолжетімді болған шамада ұсынылады. Заң рұқсат еткен ең жоғары деңгейде JustAidyn жанама, кездейсоқ, арнайы, салдарлық немесе айыптық залалдар, пайда немесе дерек жоғалту, жұмыс үзілісі үшін жауап бермейді."]
        }]
      ]
    },
    "/refunds.html": {
      title: { en: "Refund & Cancellation Policy", ru: "Политика возврата и отмены", kk: "Қайтару және бас тарту саясаты" },
      desc: {
        en: "All paid JustAidyn digital subscriptions are non-refundable after access begins, except where mandatory law requires otherwise.",
        ru: "Все платные цифровые подписки JustAidyn не возвращаются после начала доступа, кроме случаев, когда обязательный закон требует иного.",
        kk: "Қолжетімділік басталғаннан кейін барлық ақылы цифрлық JustAidyn жазылымдары қайтарылмайды, міндетті заң өзгеше талап ететін жағдайларды қоспағанда."
      },
      nav: [["policy", { en: "No refunds", ru: "Без возврата", kk: "Қайтарым жоқ" }], ["cancel", { en: "Cancellation", ru: "Отмена", kk: "Бас тарту" }], ["products", { en: "Products", ru: "Продукты", kk: "Өнімдер" }], ["regional", { en: "Regional terms", ru: "Региональные условия", kk: "Аймақтық шарттар" }]],
      sections: [
        ["policy", { en: "No-Refund Policy for Paid Digital Access", ru: "Отсутствие возврата для платного цифрового доступа", kk: "Ақылы цифрлық қолжетімділік үшін қайтарым жоқ" }, {
          en: ["All purchases of paid digital subscriptions are final once access begins. You receive immediate access to digital content, digital services, applications, or games.", "No refunds or partial refunds are provided for an active paid period after access starts, except where mandatory law requires otherwise."],
          ru: ["Все покупки платных цифровых подписок являются окончательными после начала доступа. Вы получаете немедленный доступ к цифровому контенту, цифровым услугам, приложениям или играм.", "Возврат или частичный возврат за текущий оплаченный период после начала доступа не предоставляется, кроме случаев, когда обязательный закон требует иного."],
          kk: ["Қолжетімділік басталғаннан кейін ақылы цифрлық жазылымдардың барлық сатып алулары түпкілікті болып саналады. Сіз цифрлық контентке, цифрлық қызметтерге, қосымшаларға немесе ойындарға бірден қол жеткізесіз.", "Қолжетімділік басталғаннан кейін ағымдағы төленген кезең үшін толық немесе ішінара қайтарым берілмейді, міндетті заң өзгеше талап ететін жағдайларды қоспағанда."]
        }],
        ["cancel", { en: "Cancellation", ru: "Отмена", kk: "Бас тарту" }, {
          en: ["You may cancel a paid subscription to stop future renewals. Cancellation does not refund the current paid period. Access normally continues until the end of the already paid billing period."],
          ru: ["Вы можете отменить платную подписку, чтобы остановить будущие продления. Отмена не возвращает текущий оплаченный период. Доступ обычно сохраняется до конца уже оплаченного периода."],
          kk: ["Болашақ ұзартуларды тоқтату үшін ақылы жазылымнан бас тарта аласыз. Бас тарту ағымдағы төленген кезең үшін ақшаны қайтармайды. Қолжетімділік әдетте төленген кезеңнің соңына дейін сақталады."]
        }],
        ["products", { en: "Covered Products", ru: "Какие продукты покрываются", kk: "Қамтылатын өнімдер" }, {
          en: ["This policy covers no Face Thinker, individual app subscriptions, all-games subscriptions, and future paid digital subscriptions that reference this policy."],
          ru: ["Эта политика применяется к no Face Thinker, подпискам на отдельные приложения, единой подписке на игры и будущим платным цифровым подпискам, которые ссылаются на эту политику."],
          kk: ["Бұл саясат no Face Thinker, жеке қосымша жазылымдары, барлық ойындарға арналған жазылым және осы саясатқа сілтеме жасайтын болашақ ақылы цифрлық жазылымдарға қолданылады."]
        }],
        ["regional", { en: "Regional Terms", ru: "Региональные условия", kk: "Аймақтық шарттар" }, {
          en: ["The selected regional notice below explains how the no-refund policy is applied."],
          ru: ["Ниже выбранное региональное уведомление объясняет, как применяется политика без возврата."],
          kk: ["Төмендегі таңдалған аймақтық хабарлама қайтарымсыз саясаттың қалай қолданылатынын түсіндіреді."]
        }]
      ]
    },
    "/subscription-terms.html": {
      title: { en: "Subscription Terms / Auto-Renewal Policy", ru: "Условия подписки / автопродление", kk: "Жазылым шарттары / автоматты ұзарту" },
      desc: {
        en: "These terms explain JustAidyn free access, paid subscriptions, renewals, cancellation, and no-refund rules.",
        ru: "Эти условия объясняют бесплатный доступ JustAidyn, платные подписки, продление, отмену и правила без возврата.",
        kk: "Бұл шарттар JustAidyn тегін қолжетімділігін, ақылы жазылымдарды, ұзартуды, бас тартуды және қайтарымсыз ережелерді түсіндіреді."
      },
      nav: [["plans", { en: "Plans", ru: "Планы", kk: "Жоспарлар" }], ["renewal", { en: "Renewal", ru: "Продление", kk: "Ұзарту" }], ["cancel", { en: "Cancellation", ru: "Отмена", kk: "Бас тарту" }], ["regional", { en: "Regional terms", ru: "Региональные условия", kk: "Аймақтық шарттар" }]],
      sections: [
        ["plans", { en: "Subscription Types", ru: "Типы подписок", kk: "Жазылым түрлері" }, {
          en: ["Skills and Minds Hub is free content access. no Face Thinker is paid digital content access. Individual application subscriptions cover a named app. The all-games subscription covers eligible games."],
          ru: ["Skills and Minds Hub — бесплатный доступ к контенту. no Face Thinker — платный цифровой контент. Подписка на отдельное приложение покрывает конкретное приложение. Единая игровая подписка покрывает подходящие игры."],
          kk: ["Skills and Minds Hub — контентке тегін қолжетімділік. no Face Thinker — ақылы цифрлық контент. Жеке қосымша жазылымы нақты қосымшаны қамтиды. Барлық ойындарға арналған жазылым қолжетімді ойындарды қамтиды."]
        }],
        ["renewal", { en: "Auto-Renewal and Billing", ru: "Автопродление и списания", kk: "Автоматты ұзарту және төлем" }, {
          en: ["If a plan is recurring, it renews automatically at the end of each billing period until cancelled. Checkout must disclose price, period, renewal behavior, and cancellation method before payment."],
          ru: ["Если план является регулярным, он автоматически продлевается в конце каждого расчетного периода до отмены. До оплаты checkout должен показывать цену, период, автопродление и способ отмены."],
          kk: ["Егер жоспар қайталанатын болса, ол әр төлем кезеңінің соңында бас тартылғанға дейін автоматты түрде ұзарады. Төлемге дейін checkout бағаны, кезеңді, ұзарту тәртібін және бас тарту әдісін көрсетуі тиіс."]
        }],
        ["cancel", { en: "Cancellation Effects", ru: "Последствия отмены", kk: "Бас тартудың салдары" }, {
          en: ["Cancellation stops future renewal charges. It does not refund the current paid period. Access continues until the paid period expires unless terminated for misuse."],
          ru: ["Отмена останавливает будущие списания. Она не возвращает текущий оплаченный период. Доступ продолжается до конца оплаченного периода, если он не прекращен из-за нарушения правил."],
          kk: ["Бас тарту болашақ төлемдерді тоқтатады. Ол ағымдағы төленген кезеңді қайтармайды. Ережелерді бұзу себебінен тоқтатылмаса, қолжетімділік төленген кезең аяқталғанға дейін жалғасады."]
        }],
        ["regional", { en: "Regional Terms", ru: "Региональные условия", kk: "Аймақтық шарттар" }, {
          en: ["The selected regional block applies to subscription disclosures and cancellation rights."],
          ru: ["Выбранный региональный блок применяется к раскрытию информации о подписке и правам отмены."],
          kk: ["Таңдалған аймақтық блок жазылым туралы ақпаратқа және бас тарту құқықтарына қолданылады."]
        }]
      ]
    }
  };

  var simpleDocs = {
    "/eula.html": {
      title: { en: "End User License Agreement", ru: "Лицензионное соглашение пользователя", kk: "Пайдаланушының лицензиялық келісімі" },
      desc: {
        en: "This EULA applies to JustAidyn applications, games, downloads, updates, and related software features.",
        ru: "Это соглашение применяется к приложениям, играм, загрузкам, обновлениям и связанным программным функциям JustAidyn.",
        kk: "Бұл келісім JustAidyn қосымшаларына, ойындарына, жүктеулеріне, жаңартуларына және байланысты бағдарламалық функцияларға қолданылады."
      },
      sections: [
        ["license", { en: "License Grant", ru: "Предоставление лицензии", kk: "Лицензия беру" }, {
          en: ["JustAidyn grants a limited, revocable, non-exclusive, non-transferable license to install or access eligible applications and games during the applicable access period.", "You receive a license to use the software, not ownership of software, source code, trademarks, assets, or paid content."],
          ru: ["JustAidyn предоставляет ограниченную, отзывную, неисключительную и непередаваемую лицензию на установку или доступ к подходящим приложениям и играм в течение применимого периода доступа.", "Вы получаете лицензию на использование ПО, а не право собственности на ПО, исходный код, товарные знаки, активы или платный контент."],
          kk: ["JustAidyn қолданылатын қолжетімділік кезеңінде тиісті қосымшалар мен ойындарды орнатуға немесе пайдалануға шектеулі, қайтарып алынатын, ерекше емес және берілмейтін лицензия береді.", "Сіз бағдарламаны пайдалануға лицензия аласыз, бірақ бағдарламаның, бастапқы кодтың, тауар белгілерінің, активтердің немесе ақылы контенттің меншік құқығын алмайсыз."]
        }],
        ["restrictions", { en: "Restrictions", ru: "Ограничения", kk: "Шектеулер" }, {
          en: ["No resale, sublicensing, renting, sharing of paid access, reverse engineering, bypassing protections, or redistribution of app/game assets unless mandatory law allows it."],
          ru: ["Запрещены перепродажа, сублицензирование, аренда, передача платного доступа, обратная разработка, обход защиты и распространение активов приложений/игр, кроме случаев, разрешенных обязательным законом."],
          kk: ["Міндетті заң рұқсат етпесе, қайта сату, сублицензиялау, жалға беру, ақылы қолжетімділікті бөлісу, кері әзірлеу, қорғанысты айналып өту және қосымша/ойын активтерін таратуға болмайды."]
        }]
      ]
    },
    "/privacy.html": {
      title: { en: "Privacy Policy", ru: "Политика конфиденциальности", kk: "Құпиялылық саясаты" },
      desc: {
        en: "This policy explains how JustAidyn handles account, contact, subscription, analytics, payment-related, and support data.",
        ru: "Эта политика объясняет, как JustAidyn обрабатывает данные аккаунта, контактов, подписок, аналитики, оплаты и поддержки.",
        kk: "Бұл саясат JustAidyn аккаунт, байланыс, жазылым, аналитика, төлем және қолдау деректерін қалай өңдейтінін түсіндіреді."
      },
      sections: [
        ["data", { en: "Data We May Collect", ru: "Какие данные мы можем собирать", kk: "Біз жинай алатын деректер" }, {
          en: ["Account data, subscription status, support messages, technical data, cookie choices, and payment metadata needed to provide the service."],
          ru: ["Данные аккаунта, статус подписки, обращения в поддержку, технические данные, настройки cookies и платежные метаданные, необходимые для предоставления сервиса."],
          kk: ["Сервисті ұсыну үшін қажет аккаунт деректері, жазылым мәртебесі, қолдау хабарламалары, техникалық деректер, cookie таңдаулары және төлем метадеректері."]
        }],
        ["use", { en: "How We Use Data", ru: "Как мы используем данные", kk: "Деректерді қалай пайдаланамыз" }, {
          en: ["We use data for accounts, subscriptions, access control, support, security, legal compliance, fraud prevention, and site improvement. We do not sell personal data."],
          ru: ["Мы используем данные для аккаунтов, подписок, контроля доступа, поддержки, безопасности, соблюдения закона, предотвращения мошенничества и улучшения сайта. Мы не продаем персональные данные."],
          kk: ["Деректерді аккаунттар, жазылымдар, қолжетімділікті бақылау, қолдау, қауіпсіздік, заңды сақтау, алаяқтықтың алдын алу және сайтты жақсарту үшін пайдаланамыз. Біз жеке деректерді сатпаймыз."]
        }],
        ["children", { en: "Children's Privacy", ru: "Конфиденциальность детей", kk: "Балалардың құпиялылығы" }, {
          en: ["Paid subscriptions are not directed to children under 13. If a child provided data without appropriate consent, contact us for review."],
          ru: ["Платные подписки не предназначены для детей младше 13 лет. Если ребенок предоставил данные без надлежащего согласия, свяжитесь с нами для проверки."],
          kk: ["Ақылы жазылымдар 13 жасқа толмаған балаларға арналмаған. Егер бала тиісті келісімсіз дерек берсе, тексеру үшін бізге хабарласыңыз."]
        }]
      ]
    },
    "/cookie-policy.html": {
      title: { en: "Cookie Policy", ru: "Политика cookies", kk: "Cookie саясаты" },
      desc: {
        en: "This page explains how JustAidyn uses necessary, analytics, marketing, and preference cookies or local storage.",
        ru: "Эта страница объясняет, как JustAidyn использует необходимые, аналитические, маркетинговые и предпочтительные cookies или local storage.",
        kk: "Бұл бет JustAidyn қажетті, аналитикалық, маркетингтік және баптау cookies немесе local storage қалай пайдаланатынын түсіндіреді."
      },
      sections: [
        ["types", { en: "Cookie Types", ru: "Типы cookies", kk: "Cookie түрлері" }, {
          en: ["Necessary cookies support site operation, consent, security, and region selection. Analytics, marketing, and preferences are optional where consent is required."],
          ru: ["Необходимые cookies поддерживают работу сайта, согласие, безопасность и выбор региона. Аналитика, маркетинг и предпочтения являются optional там, где требуется согласие."],
          kk: ["Қажетті cookies сайт жұмысына, келісімге, қауіпсіздікке және аймақ таңдауға көмектеседі. Аналитика, маркетинг және баптаулар келісім қажет жерлерде міндетті емес."]
        }]
      ]
    },
    "/dmca.html": {
      title: { en: "DMCA / Copyright Policy", ru: "DMCA / политика авторских прав", kk: "DMCA / авторлық құқық саясаты" },
      desc: {
        en: "This policy explains how to report alleged copyright infringement involving JustAidyn content, user submissions, or linked materials.",
        ru: "Эта политика объясняет, как сообщить о предполагаемом нарушении авторских прав в отношении контента JustAidyn, пользовательских материалов или ссылок.",
        kk: "Бұл саясат JustAidyn контентіне, пайдаланушы материалдарына немесе сілтемелерге қатысты болжамды авторлық құқық бұзушылық туралы қалай хабарлауды түсіндіреді."
      },
      sections: [
        ["notice", { en: "Copyright Complaint", ru: "Жалоба об авторских правах", kk: "Авторлық құқық шағымы" }, {
          en: ["Send complaints to aidyn.daulet@gmail.com. Include your contact details, the copyrighted work, exact URL, good-faith statement, accuracy statement, and signature."],
          ru: ["Отправляйте жалобы на aidyn.daulet@gmail.com. Укажите контакты, защищенную работу, точный URL, заявление о добросовестном убеждении, подтверждение точности и подпись."],
          kk: ["Шағымдарды aidyn.daulet@gmail.com мекенжайына жіберіңіз. Байланыс деректерін, қорғалатын жұмысты, нақты URL, адал сенім мәлімдемесін, дәлдік растауын және қолтаңбаны көрсетіңіз."]
        }]
      ]
    },
    "/legal-notice.html": {
      title: { en: "Contact / Legal Notice", ru: "Контакты / юридическое уведомление", kk: "Байланыс / заңды хабарлама" },
      desc: {
        en: "Official contact information for legal, privacy, copyright, subscription, and payment-related notices.",
        ru: "Официальные контакты для юридических, privacy, copyright, subscription и payment уведомлений.",
        kk: "Заңды, құпиялылық, авторлық құқық, жазылым және төлемге қатысты хабарламаларға арналған ресми байланыс деректері."
      },
      sections: [
        ["owner", { en: "Owner / Operator", ru: "Владелец / оператор", kk: "Иесі / оператор" }, {
          en: ["JustAidyn is operated by Dauletuly Aidyn. Country: Kazakhstan. Website: https://justaidyn.com."],
          ru: ["JustAidyn управляется Даулетулы Айдыном. Страна: Казахстан. Сайт: https://justaidyn.com."],
          kk: ["JustAidyn жобасын Дәулетұлы Айдын басқарады. Ел: Қазақстан. Сайт: https://justaidyn.com."]
        }],
        ["contact", { en: "Contact Channels", ru: "Каналы связи", kk: "Байланыс арналары" }, {
          en: ["Email: aidyn.daulet@gmail.com. WhatsApp: +7 776 988 9889. Telegram: @justaidyn."],
          ru: ["Email: aidyn.daulet@gmail.com. WhatsApp: +7 776 988 9889. Telegram: @justaidyn."],
          kk: ["Email: aidyn.daulet@gmail.com. WhatsApp: +7 776 988 9889. Telegram: @justaidyn."]
        }]
      ]
    }
  };

  Object.keys(simpleDocs).forEach(function (path) {
    legalDocs[path] = Object.assign({
      nav: simpleDocs[path].sections.map(function (section) { return [section[0], section[1]]; })
    }, simpleDocs[path]);
  });

  var regionalCopy = {
    kz: {
      title: { en: "Kazakhstan", ru: "Казахстан", kk: "Қазақстан" },
      text: {
        en: "For Kazakhstan users, paid access is digital content or digital service access. After access begins, paid periods are non-refundable unless mandatory Kazakhstan law requires otherwise.",
        ru: "Для пользователей из Казахстана платный доступ является доступом к цифровому контенту или цифровой услуге. После начала доступа оплаченные периоды не возвращаются, кроме случаев, когда обязательное законодательство Казахстана требует иного.",
        kk: "Қазақстан пайдаланушылары үшін ақылы қолжетімділік цифрлық контентке немесе цифрлық қызметке қолжетімділік болып табылады. Қолжетімділік басталғаннан кейін төленген кезеңдер қайтарылмайды, Қазақстанның міндетті заңы өзгеше талап ететін жағдайларды қоспағанда."
      }
    },
    eu: {
      title: { en: "EU / EEA", ru: "ЕС / ЕЭЗ", kk: "ЕО / ЕЭА" },
      text: {
        en: "If EU consumer rules apply, immediate paid digital access requires your express consent and acknowledgement that you lose the 14-day withdrawal right once performance begins.",
        ru: "Если применяются правила ЕС для потребителей, немедленный платный цифровой доступ требует вашего явного согласия и подтверждения, что вы теряете 14-дневное право отказа после начала исполнения.",
        kk: "ЕО тұтынушы ережелері қолданылса, дереу ақылы цифрлық қолжетімділік сіздің айқын келісіміңізді және орындау басталғаннан кейін 14 күндік бас тарту құқығын жоғалтатыныңызды растауды талап етеді."
      }
    },
    uk: {
      title: { en: "United Kingdom", ru: "Великобритания", kk: "Ұлыбритания" },
      text: {
        en: "If UK consumer rules apply, immediate digital access may affect cancellation rights after your express consent and acknowledgement.",
        ru: "Если применяются правила Великобритании для потребителей, немедленный цифровой доступ может повлиять на права отмены после вашего явного согласия и подтверждения.",
        kk: "Ұлыбритания тұтынушы ережелері қолданылса, сіздің айқын келісіміңіз бен растауыңыздан кейін дереу цифрлық қолжетімділік бас тарту құқықтарына әсер етуі мүмкін."
      }
    },
    us: {
      title: { en: "United States / California", ru: "США / Калифорния", kk: "АҚШ / Калифорния" },
      text: {
        en: "Automatic renewal terms must be clear before purchase. California users must receive a clear and easy cancellation method.",
        ru: "Условия автопродления должны быть ясны до покупки. Пользователи из Калифорнии должны получить понятный и простой способ отмены.",
        kk: "Автоматты ұзарту шарттары сатып алуға дейін анық көрсетілуі тиіс. Калифорния пайдаланушыларына түсінікті және оңай бас тарту тәсілі берілуі керек."
      }
    },
    other: {
      title: { en: "Other Regions", ru: "Другие регионы", kk: "Басқа аймақтар" },
      text: {
        en: "General terms apply unless mandatory laws in your location provide rights that cannot be excluded.",
        ru: "Общие условия применяются, если обязательные законы вашей страны не предоставляют права, которые нельзя исключить.",
        kk: "Сіздің еліңіздегі міндетті заңдар алып тастауға болмайтын құқықтар бермесе, жалпы шарттар қолданылады."
      }
    }
  };

  function currentLanguage() {
    var saved = localStorage.getItem("site_lang");
    return ["en", "ru", "kk"].indexOf(saved) >= 0 ? saved : "en";
  }

  function t(value, lang) {
    return value && (value[lang] || value.en) || "";
  }

  function renderParagraphs(paragraphs) {
    return paragraphs.map(function (paragraph) {
      return "<p>" + paragraph + "</p>";
    }).join("");
  }

  function renderLegalDocument() {
    var doc = legalDocs[window.location.pathname];
    var shell = document.querySelector(".legal-shell");
    if (!doc || !shell) return;

    var lang = currentLanguage();
    document.title = t(doc.title, lang) + " | JustAidyn";
    var nav = doc.nav.map(function (item) {
      return "<a href=\"#" + item[0] + "\">" + t(item[1], lang) + "</a>";
    }).join("");
    var sections = doc.sections.map(function (section) {
      return [
        "<section class=\"legal-card\" id=\"" + section[0] + "\">",
        "<h2>" + t(section[1], lang) + "</h2>",
        renderParagraphs(section[2][lang] || section[2].en),
        "</section>"
      ].join("");
    }).join("");
    var regions = Object.keys(regionalCopy).map(function (key) {
      var copy = regionalCopy[key];
      return [
        "<section class=\"legal-card region-panel\" data-region=\"" + key + "\">",
        "<h2>" + t(copy.title, lang) + "</h2>",
        "<p>" + t(copy.text, lang) + "</p>",
        "</section>"
      ].join("");
    }).join("");

    var labels = {
      eyebrow: { en: "Legal document", ru: "Юридический документ", kk: "Заңды құжат" },
      updated: { en: "Last updated: April 25, 2026", ru: "Обновлено: 25 апреля 2026", kk: "Жаңартылды: 2026 жылғы 25 сәуір" },
      detected: { en: "Detected region:", ru: "Определенный регион:", kk: "Анықталған аймақ:" },
      shownFor: { en: "Regional terms shown for", ru: "Региональные условия для", kk: "Аймақтық шарттар" },
      showAll: { en: "Show all regional notices", ru: "Показать все региональные уведомления", kk: "Барлық аймақтық хабарламаларды көрсету" },
      note: {
        en: "The site selects a region from browser language and time zone where possible. You can change it manually.",
        ru: "Сайт по возможности выбирает регион по языку браузера и часовому поясу. Вы можете изменить его вручную.",
        kk: "Сайт мүмкін болған жағдайда аймақты браузер тілі мен уақыт белдеуі бойынша таңдайды. Оны қолмен өзгерте аласыз."
      },
      language: {
        en: "Document language",
        ru: "Язык документа",
        kk: "Құжат тілі"
      }
    };

    shell.innerHTML = [
      "<section class=\"legal-hero\">",
      "<span class=\"legal-eyebrow\">" + t(labels.eyebrow, lang) + "</span>",
      "<h1>" + t(doc.title, lang) + "</h1>",
      "<p>" + t(doc.desc, lang) + "</p>",
      "<div class=\"legal-meta\"><span class=\"legal-pill\">" + t(labels.updated, lang) + "</span><span class=\"legal-pill\">" + t(labels.detected, lang) + " <span data-legal-region-label>Other Regions</span></span></div>",
      "</section>",
      "<section class=\"legal-region-control legal-card\">",
      "<label>" + t(labels.language, lang) + "</label>",
      "<div class=\"language-selector language-flags\" role=\"group\" aria-label=\"Language selector\">",
      "<button type=\"button\" class=\"lang-flag-btn\" data-lang-option=\"kk\">KK</button>",
      "<button type=\"button\" class=\"lang-flag-btn\" data-lang-option=\"en\">EN</button>",
      "<button type=\"button\" class=\"lang-flag-btn\" data-lang-option=\"ru\">RU</button>",
      "</div>",
      "</section>",
      "<section class=\"legal-region-control legal-card\">",
      "<label for=\"legalRegion\">" + t(labels.shownFor, lang) + "</label>",
      "<select id=\"legalRegion\" data-legal-region-select><option value=\"kz\">Kazakhstan</option><option value=\"eu\">EU / EEA</option><option value=\"uk\">United Kingdom</option><option value=\"us\">United States / California</option><option value=\"other\">Other Regions</option></select>",
      "<button class=\"legal-toggle-all\" type=\"button\" data-legal-toggle-regions>" + t(labels.showAll, lang) + "</button>",
      "<p class=\"legal-region-note\">" + t(labels.note, lang) + "</p>",
      "</section>",
      "<div class=\"legal-layout\"><aside class=\"legal-nav legal-card\">" + nav + "</aside><div>" + sections + regions + "</div></div>"
    ].join("");
    applyRegion(detectRegion());
    initRegionControls();
    setTimeout(initLegalLanguageFallback, 0);
  }

  function patchLegalLanguageSwitch() {
    if (window.__justAidynLegalLanguagePatched || typeof window.changeLanguage !== "function") return;
    window.__justAidynLegalLanguagePatched = true;
    var original = window.changeLanguage;
    window.changeLanguage = function (lang) {
      original(lang);
      renderLegalDocument();
    };
  }

  function initLegalLanguageFallback() {
    document.querySelectorAll("[data-lang-option]").forEach(function (button) {
      if (button.getAttribute("data-legal-lang-bound") === "true") return;
      button.setAttribute("data-legal-lang-bound", "true");
      button.addEventListener("click", function () {
        var lang = button.getAttribute("data-lang-option");
        if (["en", "ru", "kk"].indexOf(lang) === -1) return;
        localStorage.setItem("site_lang", lang);
        document.documentElement.lang = lang;
        document.querySelectorAll("[data-lang-option]").forEach(function (item) {
          var active = item.getAttribute("data-lang-option") === lang;
          item.classList.toggle("active", active);
          item.setAttribute("aria-pressed", active ? "true" : "false");
        });
        document.querySelectorAll("[data-en][data-ru][data-kk]").forEach(function (item) {
          var value = item.getAttribute("data-" + lang);
          if (!value) return;
          if (value.indexOf("<br>") !== -1) {
            item.innerHTML = value;
          } else {
            item.textContent = value;
          }
        });
        renderLegalDocument();
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    ensureLegalRuntimeStyles();
    renderLegalDocument();
    patchLegalLanguageSwitch();
    initLegalLanguageFallback();
    initRegionControls();
    initCookiePolicyButtons();
    initCheckoutWaiver();
    ensureLegalFooterLinks();
    createCookiePanel();
    setTimeout(ensureLegalFooterLinks, 0);
  });
}());
