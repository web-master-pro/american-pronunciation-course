/* EnglishPhonetics — аудио-движок озвучки курса (AUDIT 8.1).
   Прогрессивное улучшение: без зависимостей, источник звука — Web Speech API (TTS)
   по манифесту audio-manifest.js; зарезервирован слот entry.file для будущих mp3.
   Кнопки: <button class="audio-btn" data-audio-key="ключ" data-rate="0.75">. */
(function () {
  'use strict';

  var ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  var DEFAULT_RATE = 0.95;
  var cachedVoice = null;
  var activeBtn = null;
  var activeFile = null;

  function pickVoice() {
    if (!ttsSupported) return null;
    var voices = window.speechSynthesis.getVoices() || [];
    var i, v, lang;
    for (i = 0; i < voices.length; i++) {
      if (voices[i].name === 'Google US English') return voices[i];
    }
    for (i = 0; i < voices.length; i++) {
      lang = (voices[i].lang || '').toLowerCase().replace('_', '-');
      if (lang === 'en-us') return voices[i];
    }
    for (i = 0; i < voices.length; i++) {
      lang = (voices[i].lang || '').toLowerCase();
      if (lang.indexOf('en') === 0) return voices[i];
    }
    return null;
  }

  function refreshVoice() {
    cachedVoice = pickVoice();
  }

  function clearActive() {
    if (activeBtn) {
      activeBtn.classList.remove('playing');
      activeBtn = null;
    }
  }

  function stop() {
    if (ttsSupported) window.speechSynthesis.cancel();
    if (activeFile) {
      try { activeFile.pause(); } catch (e) {}
      activeFile = null;
    }
    clearActive();
  }

  function rateFor(btn) {
    if (btn && btn.dataset && btn.dataset.rate) {
      var r = parseFloat(btn.dataset.rate);
      if (!isNaN(r) && r > 0) return r;
    }
    return DEFAULT_RATE;
  }

  function markPlaying(btn) {
    clearActive();
    if (btn) {
      activeBtn = btn;
      btn.classList.remove('error');
      btn.classList.add('playing');
    }
  }

  function speakText(text, btn) {
    if (!ttsSupported || !text) {
      if (btn && !ttsSupported) btn.classList.add('audio-unsupported');
      return;
    }
    var utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    if (cachedVoice) utterance.voice = cachedVoice;
    utterance.rate = rateFor(btn);
    utterance.onend = clearActive;
    utterance.onerror = function () {
      clearActive();
      if (btn) {
        btn.classList.add('error');
        window.setTimeout(function () { btn.classList.remove('error'); }, 1200);
      }
    };
    window.speechSynthesis.speak(utterance);
  }

  function speakFile(entry, btn) {
    var audio = new Audio(entry.file);
    activeFile = audio;
    markPlaying(btn);
    audio.addEventListener('ended', function () {
      if (activeFile === audio) activeFile = null;
      clearActive();
    });
    audio.addEventListener('error', function () {
      if (activeFile === audio) activeFile = null;
      clearActive();
      speakText(entry.text, btn);
    });
    var p = audio.play();
    if (p && typeof p.catch === 'function') {
      p.catch(function () {
        if (activeFile === audio) activeFile = null;
        clearActive();
        speakText(entry.text, btn);
      });
    }
  }

  function speak(key, btn) {
    var manifest = window.AUDIO_MANIFEST || {};
    var entry = manifest[key];
    if (!entry) return;
    stop();
    if (entry.file) {
      speakFile(entry, btn);
    } else {
      markPlaying(btn);
      speakText(entry.text, btn);
    }
  }

  function toggle(btn) {
    if (!btn) return;
    var key = btn.getAttribute('data-audio-key');
    if (!key) return;
    if (btn.classList.contains('playing')) {
      stop();
      return;
    }
    speak(key, btn);
  }

  function init() {
    if (!ttsSupported) {
      var btns = document.querySelectorAll('.audio-btn');
      for (var i = 0; i < btns.length; i++) {
        btns[i].classList.add('audio-unsupported');
      }
      return;
    }
    refreshVoice();
    if (typeof window.speechSynthesis.addEventListener === 'function') {
      window.speechSynthesis.addEventListener('voiceschanged', refreshVoice);
    } else if ('onvoiceschanged' in window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = refreshVoice;
    }
  }

  document.addEventListener('click', function (e) {
    var target = e.target;
    if (!target || typeof target.closest !== 'function') return;
    var btn = target.closest('.audio-btn[data-audio-key]');
    if (!btn) return;
    e.preventDefault();
    toggle(btn);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.CourseAudio = {
    init: init,
    speak: speak,
    toggle: toggle,
    stop: stop
  };
})();
