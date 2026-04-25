(function () {
  var EU_REGIONS = [
    "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
    "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
    "SI", "ES", "SE"
  ];

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
      "<div class=\"col-lg-12 col-12\" data-legal-footer>",
      "<strong class=\"site-footer-title d-block mb-3\">Legal</strong>",
      "<ul class=\"footer-menu d-flex flex-wrap gap-3\">",
      "<li class=\"footer-menu-item\"><a class=\"footer-menu-link\" href=\"/terms.html\">Terms</a></li>",
      "<li class=\"footer-menu-item\"><a class=\"footer-menu-link\" href=\"/eula.html\">EULA</a></li>",
      "<li class=\"footer-menu-item\"><a class=\"footer-menu-link\" href=\"/privacy.html\">Privacy</a></li>",
      "<li class=\"footer-menu-item\"><a class=\"footer-menu-link\" href=\"/cookie-policy.html\">Cookies</a></li>",
      "<li class=\"footer-menu-item\"><a class=\"footer-menu-link\" href=\"/refunds.html\">Refunds</a></li>",
      "<li class=\"footer-menu-item\"><a class=\"footer-menu-link\" href=\"/subscription-terms.html\">Subscriptions</a></li>",
      "<li class=\"footer-menu-item\"><a class=\"footer-menu-link\" href=\"/dmca.html\">DMCA</a></li>",
      "<li class=\"footer-menu-item\"><a class=\"footer-menu-link\" href=\"/legal-notice.html\">Legal Notice</a></li>",
      "</ul>",
      "</div>"
    ].join("");
  }

  function ensureLegalFooterLinks() {
    var footers = document.querySelectorAll(".site-footer");
    if (!footers.length) {
      var footer = document.createElement("footer");
      footer.className = "site-footer";
      footer.innerHTML = "<div class=\"container\"><div class=\"row g-4 align-items-start text-start\"></div></div>";
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

  document.addEventListener("DOMContentLoaded", function () {
    initRegionControls();
    initCookiePolicyButtons();
    initCheckoutWaiver();
    ensureLegalFooterLinks();
    createCookiePanel();
    setTimeout(ensureLegalFooterLinks, 0);
  });
}());
