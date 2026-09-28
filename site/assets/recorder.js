/* EnglishPhonetics — встроенный рекордер самозаписи (AUDIT 8.2).
   MediaRecorder: запись дублей (макс. 60 с), прослушивание, экспорт webm,
   A-B сравнение дубля с TTS-эталоном через CourseAudio (audio.js).
   Записи живут только в памяти страницы (Blob URL), без IndexedDB. */
(function () {
  'use strict';

  var MAX_SECONDS = 60;

  var recSupported = !!(window.MediaRecorder &&
    typeof navigator !== 'undefined' &&
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia);

  var panel, btnRecord, btnStop, timerEl, errorEl, listEl, selectEl, modelBtn;
  var stream = null;
  var mediaRecorder = null;
  var chunks = [];
  var timerId = null;
  var seconds = 0;
  var startedAt = 0;
  var isRecording = false;
  var takeCounter = 0;
  var audioCtx = null;
  var micSource = null;
  var analyser = null;
  var levelRaf = null;
  var levelEl = null;
  var maxLevel = 0;

  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function fmt(s) {
    return Math.floor(s / 60) + ':' + pad(s % 60);
  }

  function fileName(ext) {
    var d = new Date();
    return 'recording-' + d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' +
      pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + '.' + ext;
  }

  function pickMime() {
    var types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
    if (window.MediaRecorder && typeof MediaRecorder.isTypeSupported === 'function') {
      for (var i = 0; i < types.length; i++) {
        if (MediaRecorder.isTypeSupported(types[i])) return types[i];
      }
    }
    return '';
  }

  function extFor(mime) {
    if (mime && mime.indexOf('ogg') !== -1) return 'ogg';
    return 'webm';
  }

  /* MediaRecorder пишет webm без элемента Duration — плеер показывает 0:00/∞.
     Патчим EBML: ищем элемент Duration (0x4489) в начале файла (секция Info)
     и перезаписываем его значение как bigfloat (8 байт, миллисекунды). */
  function fixWebmDuration(blob, durationMs) {
    if (!blob || !blob.arrayBuffer || blob.type.indexOf('webm') === -1) {
      return Promise.resolve(blob);
    }
    return blob.arrayBuffer().then(function (buf) {
      var bytes = new Uint8Array(buf);
      var pos = -1;
      var limit = Math.min(bytes.length - 2, 65536);
      for (var i = 0; i < limit; i++) {
        if (bytes[i] === 0x44 && bytes[i + 1] === 0x89) { pos = i; break; }
      }
      if (pos === -1 || pos + 3 >= bytes.length) return blob;
      var sizeByte = bytes[pos + 2];
      var oldLen = sizeByte & 0x7f;
      if (!(sizeByte & 0x80) || (oldLen !== 2 && oldLen !== 4 && oldLen !== 8)) return blob;
      if (pos + 3 + oldLen > bytes.length) return blob;
      var out = new Uint8Array(bytes.length + (8 - oldLen));
      out.set(bytes.subarray(0, pos + 3));
      out[pos + 2] = 0x88;
      new DataView(out.buffer).setFloat64(pos + 3, durationMs, false);
      out.set(bytes.subarray(pos + 3 + oldLen), pos + 11);
      return new Blob([out], { type: blob.type });
    }).catch(function () { return blob; });
  }

  function showError(msg) {
    if (!errorEl) return;
    errorEl.textContent = msg;
    errorEl.hidden = false;
  }

  function hideError() {
    if (!errorEl) return;
    errorEl.hidden = true;
    errorEl.textContent = '';
  }

  function setTimer() {
    if (timerEl) timerEl.textContent = fmt(seconds) + ' / ' + fmt(MAX_SECONDS);
  }

  function startTimer() {
    seconds = 0;
    setTimer();
    timerId = window.setInterval(function () {
      seconds += 1;
      setTimer();
      if (seconds >= MAX_SECONDS) stopRecording('Дубль остановлен автоматически: достигнут предел 60 секунд.');
    }, 1000);
  }

  function stopTimer() {
    if (timerId !== null) {
      window.clearInterval(timerId);
      timerId = null;
    }
  }

  function allTakeAudios() {
    return listEl ? listEl.querySelectorAll('audio') : [];
  }

  function pauseAllAudios(except) {
    var audios = allTakeAudios();
    for (var i = 0; i < audios.length; i++) {
      if (audios[i] !== except && !audios[i].paused) audios[i].pause();
    }
  }

  function currentModelKey() {
    if (selectEl && selectEl.value) return selectEl.value;
    return panel ? (panel.getAttribute('data-audio-key') || '') : '';
  }

  function createLevelMeter() {
    var controls = panel.querySelector('.rec-controls');
    if (!controls) return;
    levelEl = document.createElement('span');
    levelEl.className = 'rec-level';
    levelEl.setAttribute('aria-hidden', 'true');
    if (timerEl && timerEl.parentNode === controls) {
      controls.insertBefore(levelEl, timerEl.nextSibling);
    } else {
      controls.appendChild(levelEl);
    }
  }

  function levelTick() {
    if (!analyser) return;
    var data = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);
    var sum = 0;
    for (var i = 0; i < data.length; i++) {
      var d = data[i] - 128;
      sum += d * d;
    }
    var rms = Math.sqrt(sum / data.length);
    if (rms > maxLevel) maxLevel = rms;
    if (levelEl) {
      levelEl.style.backgroundSize = Math.min(100, Math.round((rms / 24) * 100)) + '% 100%';
    }
    levelRaf = window.requestAnimationFrame(levelTick);
  }

  function startLevelAnalysis(s) {
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtx) audioCtx = new Ctx();
      if (audioCtx.state === 'suspended' && audioCtx.resume) audioCtx.resume();
      micSource = audioCtx.createMediaStreamSource(s);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      micSource.connect(analyser);
      maxLevel = 0;
      if (levelEl) levelEl.classList.add('rec-level-on');
      levelRaf = window.requestAnimationFrame(levelTick);
    } catch (e) {
      analyser = null;
    }
  }

  function stopLevelAnalysis() {
    if (levelRaf !== null) {
      window.cancelAnimationFrame(levelRaf);
      levelRaf = null;
    }
    if (micSource) {
      try { micSource.disconnect(); } catch (e) {}
      micSource = null;
    }
    analyser = null;
    if (levelEl) {
      levelEl.classList.remove('rec-level-on');
      levelEl.style.backgroundSize = '0% 100%';
    }
  }

  function buildItem(url, name, durationSec, key, ext) {
    var li = document.createElement('li');
    li.className = 'rec-item';

    var nameEl = document.createElement('span');
    nameEl.className = 'rec-item-name';
    nameEl.textContent = 'Дубль ' + takeCounter + ' · ' + name + ' · ' + fmt(durationSec);
    li.appendChild(nameEl);

    var audio = document.createElement('audio');
    audio.controls = true;
    audio.preload = 'auto';
    audio.src = url;
    audio.addEventListener('play', function () {
      pauseAllAudios(audio);
      if (window.CourseAudio) window.CourseAudio.stop();
    });
    li.appendChild(audio);

    var actions = document.createElement('span');
    actions.className = 'rec-item-actions';

    var download = document.createElement('a');
    download.href = url;
    download.download = name;
    download.textContent = 'Скачать';
    actions.appendChild(download);

    var ab = document.createElement('span');
    ab.className = 'ab-compare';
    var modelPlay = document.createElement('button');
    modelPlay.type = 'button';
    modelPlay.className = 'ab-btn ab-btn-model';
    modelPlay.setAttribute('data-audio-key', key);
    modelPlay.textContent = 'Эталон';
    modelPlay.title = 'Прослушать эталон перед вашим дублём';
    modelPlay.addEventListener('click', function () {
      pauseAllAudios(null);
      if (window.CourseAudio) window.CourseAudio.speak(key, modelPlay);
    });
    ab.appendChild(modelPlay);
    actions.appendChild(ab);

    var del = document.createElement('button');
    del.type = 'button';
    del.className = 'rec-delete';
    del.textContent = 'Удалить';
    del.addEventListener('click', function () {
      audio.pause();
      window.URL.revokeObjectURL(url);
      if (li.parentNode) li.parentNode.removeChild(li);
    });
    actions.appendChild(del);

    li.appendChild(actions);

    if (ext !== 'webm') {
      var note = document.createElement('span');
      note.className = 'rec-item-name';
      note.textContent = '(формат .' + ext + ')';
      li.appendChild(note);
    }

    if (listEl) listEl.insertBefore(li, listEl.firstChild);
  }

  function setControls(recording) {
    isRecording = recording;
    if (panel) panel.classList.toggle('recording', recording);
    if (btnRecord) btnRecord.disabled = recording;
    if (btnStop) btnStop.disabled = !recording;
  }

  function releaseMic() {
    if (stream) {
      var tracks = stream.getTracks();
      for (var i = 0; i < tracks.length; i++) tracks[i].stop();
      stream = null;
    }
  }

  function stopRecording(stopReason) {
    if (!isRecording) return;
    var elapsedMs = startedAt
      ? Math.min(Date.now() - startedAt, MAX_SECONDS * 1000)
      : seconds * 1000;
    var duration = Math.max(1, Math.round(elapsedMs / 1000));
    startedAt = 0;
    stopTimer();
    stopLevelAnalysis();
    setControls(false);
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      var key = currentModelKey();
      var mime = mediaRecorder.mimeType || '';
      var ext = extFor(mime);
      mediaRecorder.onstop = function () {
        var blob = new Blob(chunks, { type: mime || 'audio/webm' });
        chunks = [];
        releaseMic();
        if (blob.size > 1024) {
          takeCounter += 1;
          var name = fileName(ext);
          fixWebmDuration(blob, elapsedMs).then(function (fixed) {
            buildItem(window.URL.createObjectURL(fixed), name, duration, key, ext);
          });
        } else {
          showError(maxLevel < 1.5
            ? 'Микрофон молчал: за всё время записи уровень сигнала был нулевой. Проверьте: 1) разрешение на микрофон для браузера (иконка замка в адресной строке), 2) Windows: «Параметры → Конфиденциальность → Микрофон» (доступ настольным приложениям), 3) входное устройство и громкость записи в «Параметры звука».'
            : 'Запись получилась пустой: микрофон не передал звуковых данных. Попробуйте ещё раз и проверьте выбор микрофона в системе.');
        }
      };
      mediaRecorder.stop();
    } else {
      releaseMic();
    }
    if (stopReason) showError(stopReason);
  }

  function describeError(err) {
    var name = err && err.name ? err.name : '';
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      return 'Доступ к микрофону запрещён. Разрешите его для этого сайта (иконка замка / микрофона в адресной строке) и начните запись заново. ' +
        'Страница должна открываться по HTTPS или на localhost — иначе браузер не даёт микрофон.';
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return 'Микрофон не найден. Подключите микрофон и обновите страницу.';
    }
    if (name === 'NotReadableError') {
      return 'Браузер не смог прочитать данные с микрофона: возможно, его использует другое приложение. Закройте его и повторите.';
    }
    if (name === 'AbortError') {
      return 'Запрос на запись прерван другой операцией браузера. Попробуйте ещё раз.';
    }
    return 'Не удалось начать запись: ' + (name || 'неизвестная ошибка') + '. Проверьте, что страница открыта по HTTPS или localhost и микрофон не занят.';
  }

  function startRecording() {
    if (isRecording) return;
    hideError();
    if (window.CourseAudio) window.CourseAudio.stop();
    pauseAllAudios(null);
    btnRecord.disabled = true;
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (s) {
      if (stream) {
        var extra = s.getTracks();
        for (var i = 0; i < extra.length; i++) extra[i].stop();
        return;
      }
      stream = s;
      chunks = [];
      var mime = pickMime();
      mediaRecorder = mime ? new MediaRecorder(s, { mimeType: mime }) : new MediaRecorder(s);
      mediaRecorder.ondataavailable = function (e) {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      mediaRecorder.onerror = function () {
        stopRecording('Запись прервалась из-за ошибки браузера. Попробуйте ещё раз.');
      };
      setControls(true);
      startTimer();
      startLevelAnalysis(s);
      startedAt = Date.now();
      mediaRecorder.start(250);
    }).catch(function (err) {
      btnRecord.disabled = false;
      if (!isRecording) releaseMic();
      showError(describeError(err));
    });
  }

  function showUnsupportedStub() {
    var stub = document.createElement('p');
    stub.className = 'rec-notice';
    stub.textContent = 'Встроенная запись недоступна в этом браузере: нужен современный браузер с MediaRecorder и защищённое соединение (HTTPS или localhost). ' +
      'Протокол можно выполнить с любым внешним диктофоном — кнопки «Прослушать эталон» работают как обычно.';
    if (!panel) return;
    var children = [].slice.call(panel.children);
    for (var i = 0; i < children.length; i++) {
      var el = children[i];
      if (el.classList && el.classList.contains('rec-model-row')) continue;
      if (el.classList && el.classList.contains('rec-notice')) continue;
      if (el.parentNode) el.parentNode.removeChild(el);
    }
    panel.appendChild(stub);
  }

  function syncModelKey() {
    var key = currentModelKey();
    if (panel) panel.setAttribute('data-audio-key', key);
    if (modelBtn) modelBtn.setAttribute('data-audio-key', key);
  }

  function init() {
    panel = document.getElementById('recorder');
    if (!panel) return;
    btnRecord = document.getElementById('rec-btn-record');
    btnStop = document.getElementById('rec-btn-stop');
    timerEl = document.getElementById('rec-timer');
    errorEl = document.getElementById('rec-error');
    listEl = document.getElementById('rec-list');
    selectEl = document.getElementById('rec-model-select');
    modelBtn = document.getElementById('rec-model-btn');

    if (!recSupported) {
      showUnsupportedStub();
      return;
    }

    createLevelMeter();
    syncModelKey();
    if (selectEl) {
      selectEl.addEventListener('change', function () {
        syncModelKey();
        if (window.CourseAudio) window.CourseAudio.stop();
      });
    }

    if (btnRecord) {
      btnRecord.addEventListener('click', startRecording);
    } else {
      return;
    }
    if (btnStop) {
      btnStop.addEventListener('click', function () {
        stopRecording();
      });
    } else {
      return;
    }
    setTimer();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
