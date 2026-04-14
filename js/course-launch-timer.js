(function() {
  'use strict';

  var cards = document.querySelectorAll('[data-course-launch]');
  if (!cards.length) {
    return;
  }

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function resolveTarget(card) {
    var targetDateRaw = card.getAttribute('data-target-date') || '2026-03-30T08:00:00';
    var base = new Date(targetDateRaw);
    if (isNaN(base.getTime())) {
      return NaN;
    }

    var shouldRolloverYear = card.getAttribute('data-rollover-year') === 'true';
    if (!shouldRolloverYear) {
      return base.getTime();
    }

    var now = new Date();
    var target = new Date(base.getTime());
    target.setFullYear(now.getFullYear());
    if (target.getTime() <= now.getTime()) {
      target.setFullYear(now.getFullYear() + 1);
    }

    return target.getTime();
  }

  function updateCard(card) {
    var target = resolveTarget(card);

    if (isNaN(target)) {
      return false;
    }

    var diff = target - Date.now();
    var daysEl = card.querySelector('[data-unit=\"days\"]');
    var hoursEl = card.querySelector('[data-unit=\"hours\"]');
    var minutesEl = card.querySelector('[data-unit=\"minutes\"]');
    var secondsEl = card.querySelector('[data-unit=\"seconds\"]');
    var statusEl = card.querySelector('.course-launch-status');

    if (diff <= 0) {
      var gridEl = card.querySelector('.course-launch-grid');
      if (gridEl) gridEl.classList.add('d-none');
      if (statusEl) statusEl.classList.remove('d-none');
      return true;
    }

    var totalSeconds = Math.floor(diff / 1000);
    var days = Math.floor(totalSeconds / 86400);
    var hours = Math.floor((totalSeconds % 86400) / 3600);
    var minutes = Math.floor((totalSeconds % 3600) / 60);
    var seconds = totalSeconds % 60;

    if (daysEl) daysEl.textContent = String(days);
    if (hoursEl) hoursEl.textContent = pad(hours);
    if (minutesEl) minutesEl.textContent = pad(minutes);
    if (secondsEl) secondsEl.textContent = pad(seconds);
    if (statusEl) statusEl.classList.add('d-none');
    return false;
  }

  function tick() {
    var allStarted = true;
    cards.forEach(function(card) {
      var started = updateCard(card);
      if (!started) {
        allStarted = false;
      }
    });
    return allStarted;
  }

  var finished = tick();
  if (finished) {
    return;
  }

  var intervalId = setInterval(function() {
    if (tick()) {
      clearInterval(intervalId);
    }
  }, 1000);
})();
