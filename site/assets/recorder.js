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
  var destNode = null;
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

  function readVint(bytes, p) {
    if (p >= bytes.length) return null;
    var first = bytes[p];
    if (!first) return null;
    var len = 1;
    while (len <= 8 && !(first & (0x80 >> (len - 1)))) len++;
    if (len > 8 || p + len > bytes.length) return null;
    var unknown = true;
    for (var i = 0; i < len; i++) {
      var maxByte = i === 0 ? (0xff >> (len - 1)) : 0xff;
      if (bytes[p + i] !== maxByte) { unknown = false; break; }
    }
    if (unknown) return { len: len, value: null };
    var value = first & (0x7f >> (len - 1));
    for (i = 1; i < len; i++) value = value * 256 + bytes[p + i];
    return { len: len, value: value };
  }

  function writeVint(value) {
    var len = 1;
    while (len < 8 && value >= Math.pow(2, 7 * len)) len++;
    var outArr = new Uint8Array(len);
    var v = value;
    for (var i = len - 1; i >= 1; i--) {
      outArr[i] = v % 256;
      v = Math.floor(v / 256);
    }
    outArr[0] = (1 << (8 - len)) + v;
    return outArr;
  }

  function concatBytes(parts) {
    var total = 0;
    var i;
    for (i = 0; i < parts.length; i++) total += parts[i].length;
    var out = new Uint8Array(total);
    var pos = 0;
    for (i = 0; i < parts.length; i++) {
      out.set(parts[i], pos);
      pos += parts[i].length;
    }
    return out;
  }

  function durationElement(ms) {
    var el = new Uint8Array(11);
    el[0] = 0x44;
    el[1] = 0x89;
    el[2] = 0x88;
    new DataView(el.buffer).setFloat64(3, ms, false);
    return el;
  }

  function indexOfSeq(bytes, seq, from, to) {
    outer: for (var i = from; i + seq.length <= to; i++) {
      for (var j = 0; j < seq.length; j++) {
        if (bytes[i + j] !== seq[j]) continue outer;
      }
      return i;
    }
    return -1;
  }

  /* MediaRecorder часто пишет webm без элемента Duration — встроенный
     плеер страницы тогда показывает 0:00 и не воспроизводит файл (скачанный
     файл другими плеерами играется). Чиним EBML структурно:
     Header -> Segment -> Info -> Duration. Если Duration есть — перезаписываем
     значение bigfloat'ом (мс); если нет — ВСТАВЛЯЕМ элемент Duration в конец
     Info (или создаём Info с Timecode+Duration, если его нет вовсе),
     корректируя размеры Info и Segment. Поиск Duration вне Info запрещён:
     ложное совпадение внутри Opus-данных испорит аудио. */
  function fixWebmDuration(blob, durationMs) {
    if (!blob || !blob.arrayBuffer || blob.type.indexOf('webm') === -1) {
      return Promise.resolve(blob);
    }
    return blob.arrayBuffer().then(function (buf) {
      var bytes = new Uint8Array(buf);
      if (indexOfSeq(bytes, [0x1a, 0x45, 0xdf, 0xa3], 0, 4) !== 0) return blob;
      var headerSize = readVint(bytes, 4);
      if (!headerSize || headerSize.value === null) return blob;
      var segStart = 4 + headerSize.len + headerSize.value;
      if (indexOfSeq(bytes, [0x18, 0x53, 0x80, 0x67], segStart, segStart + 4) !== segStart) return blob;
      var segVStart = segStart + 4;
      var segV = readVint(bytes, segVStart);
      if (!segV) return blob;
      var segContent = segVStart + segV.len;
      var segSizeBytes = segV.value === null
        ? bytes.subarray(segVStart, segContent)
        : writeVint(segV.value);
      var durEl = durationElement(durationMs);
      var infoPos = indexOfSeq(bytes, [0x15, 0x49, 0xa9, 0x66], segContent,
        Math.min(bytes.length, segContent + 8192));
      var parts, delta, newInfoSize;

      if (infoPos === -1) {
        var timecodeEl = new Uint8Array([0xe7, 0x84, 0, 0, 0, 0]);
        var infoContentNew = concatBytes([timecodeEl, durEl]);
        var infoEl = concatBytes([[0x15, 0x49, 0xa9, 0x66], writeVint(infoContentNew.length), infoContentNew]);
        delta = infoEl.length;
        if (segV.value !== null) segSizeBytes = writeVint(segV.value + delta);
        parts = [bytes.subarray(0, segVStart), segSizeBytes, infoEl, bytes.subarray(segContent)];
      } else {
        var infoSize = readVint(bytes, infoPos + 4);
        if (!infoSize || infoSize.value === null) return blob;
        var infoContent = infoPos + 4 + infoSize.len;
        var infoEnd = Math.min(bytes.length, infoContent + infoSize.value);
        var dpos = indexOfSeq(bytes, [0x44, 0x89], infoContent, infoEnd);
        var infoHead = [bytes.subarray(0, segVStart), segSizeBytes, bytes.subarray(segContent, infoPos + 4)];
        var infoBody;
        if (dpos === -1) {
          delta = 11;
          newInfoSize = infoSize.value + 11;
          infoBody = [writeVint(newInfoSize), bytes.subarray(infoContent, infoEnd), durEl];
        } else {
          var sizeByte = bytes[dpos + 2];
          var oldLen = sizeByte & 0x7f;
          if (!(sizeByte & 0x80) || (oldLen !== 2 && oldLen !== 4 && oldLen !== 8)) return blob;
          if (dpos + 3 + oldLen > infoEnd) return blob;
          delta = 8 - oldLen;
          newInfoSize = infoSize.value + delta;
          infoBody = [writeVint(newInfoSize), bytes.subarray(infoContent, dpos), durEl,
            bytes.subarray(dpos + 3 + oldLen, infoEnd)];
        }
        if (segV.value !== null && delta !== 0) infoHead[1] = writeVint(segV.value + delta);
        parts = infoHead.concat(infoBody, [bytes.subarray(infoEnd)]);
      }
      return new Blob([concatBytes(parts)], { type: blob.type });
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
    /* Подключаем микрофон через AudioContext: одна ветка — на индикатор
       уровня, вторая — на MediaStreamDestination, с которого пишет рекордер.
       Запись с processed-потока AudioContext надёжнее сырого getUserMedia
       потока в Chromium (известны случаи «тихого» blob при живом индикаторе). */
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return s;
      if (!audioCtx) audioCtx = new Ctx();
      if (audioCtx.state === 'suspended' && audioCtx.resume) audioCtx.resume();
      micSource = audioCtx.createMediaStreamSource(s);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      micSource.connect(analyser);
      destNode = audioCtx.createMediaStreamDestination();
      micSource.connect(destNode);
      maxLevel = 0;
      if (levelEl) levelEl.classList.add('rec-level-on');
      levelRaf = window.requestAnimationFrame(levelTick);
      return destNode.stream;
    } catch (e) {
      analyser = null;
      return s;
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
    destNode = null;
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
      var recStream = startLevelAnalysis(s);
      var mime = pickMime();
      mediaRecorder = mime ? new MediaRecorder(recStream, { mimeType: mime }) : new MediaRecorder(recStream);
      mediaRecorder.ondataavailable = function (e) {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      mediaRecorder.onerror = function () {
        stopRecording('Запись прервалась из-за ошибки браузера. Попробуйте ещё раз.');
      };
      setControls(true);
      startTimer();
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
