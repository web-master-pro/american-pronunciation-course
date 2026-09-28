# Аудио-слой курса и протокол самозаписи — Implementation Plan (AUDIT Фаза 8, пункты 8.1 и 8.2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Закрыть оставшиеся пункты Фазы 8 аудита курса: **8.1 (Аудио)** — добавить звук к карточкам слов, фразам и таблице IPA через единый клиентский аудио-движок (Web Speech API TTS + манифест); **8.2 (Протокол самозаписи)** — создать страницу-протокол самопроверки с чек-листом сравнения и встроенным Web Audio рекордером (MediaRecorder), интегрировав её в уроки и тренажёр.

**Architecture:**
- **Аудио-движок (8.1):** один файл `site/assets/audio.js` (прогрессивное улучшение, без зависимостей). Источник звука — Web Speech API (`speechSynthesis`, голос en-US, темп 1.0/0.75) по манифесту `site/assets/audio-manifest.js` (ключ → текст для озвучки; зарезервирован слот `file` под будущие локальные mp3 в `site/assets/audio/`). Кнопки озвучки (`.audio-btn`) добавляются в `site/workout/*.html` (карточки `.word-card`, `.phrase-row`, `.sentence-card`), в ключевые уроки (списки минимальных пар) и в `site/reference/ipa-chart.html` (строки звуков). Единый экземпляр воспроизведения: повторное нажатие останавливает, состояния `playing`/`error` стилизуются.
- **Протокол самозаписи (8.2):** новая страница `site/recorder.html` (статичная, в стилистике курса) + `site/assets/recorder.js` (MediaRecorder: запись / стоп / прослушивание / экспорт webm / A-B сравнение записи с TTS-эталоном через `audio.js`). Контент: 5-шаговый протокол (Эталон → Запись → Сравнение по 5 критериям → Повтор → Еженедельный замер), карточки критериев самопроверки, шаблон еженедельного дневника записи. Ссылки на страницу — из уроков с заданиями «Запись себя», из тренажёра (`workout/index.html` «золотое правило», `workout/sunday.html` обязательное задание), из `index.html` и `plan.html` (принцип «Записывай себя»).

**Tech Stack:** HTML5, CSS3 (переменные существующей темы, dark-mode совместимость), ванильный JavaScript (Web Speech API, MediaRecorder API), General American IPA (канон нотации курса: /ɹ/, /ɝ/, /ɚ/, ː).

**Решения, зафиксированные при согласовании (2026-09-27):**
1. Источник аудио — **Web Speech API (TTS) + манифест** (вариант 1). Forvo-хотлинки и внешние embed не используются (ломаются, CORS, юридические риски). Локальные mp3 — опциональный слот в манифесте на будущее, в скоуп не входят.
2. Скоуп самозаписи — **страница-протокол + Web Audio рекордер** (вариант 1). Без мини-рекордеров в каждом уроке.

## Global Constraints
- Кодировка UTF-8, язык `<html lang="ru">`, `<meta name="description">` — по шаблону курса (вставляется сразу после viewport).
- Никаких ссылок на `.md` файлы из страниц сайта `site/`.
- Никаких внешних JS-библиотек и CDN-скриптов (кроме существующего Google Fonts `@import` в style.css).
- Требуется `<script src="...">` без блокировки рендера (`defer`) и graceful degradation: при отсутствии `speechSynthesis` / `MediaRecorder` UI скрывается или показывает дружелюбную заглушку, контент страницы остаётся полностью читабельным.
- `getUserMedia` работает только в secure context (HTTPS или localhost) — на странице рекордера нужна явная подсказка об этом.
- Транскрипции — строго канон курса (AUDIT Фаза 7): /ɹ/, /ɝ/, /ɚ/, знак долготы ː, water = /ˈwɑːt̬ɚ/. В тренажёре допускается исторический ASCII `r` для согласного (не трогаем), но озвучиваемый текст манифеста — обычная орфография (TTS не читает IPA — **в манифесте только орфографические строки**, не транскрипции).
- Адаптивность: десктоп 1080px, планшеты 900px, смартфоны 600px (существующие breakpoints).
- Все новые внутренние ссылки валидны; после каждой задачи — python-чекер ссылок/src.

## Review Focus
- `audio.js` не ломает страницы без `speechSynthesis` (кнопки скрыты/заглушка, нет ошибок в консоли).
- Манифест содержит только орфографию (английские слова/фразы), никаких IPA-символов в тексте для TTS.
- Кнопки озвучки не нарушают существующий интерактив (спойлеры IPA `.ipa-hidden`, квизы `checkAnswer`).
- Канон нотации не нарушен ни в одном изменённом файле (grep `ər|əɹ|ɜː|r/` в IPA-спанах).
- `recorder.js`: двойной клик по «Запись» не создаёт параллельных потоков; после «Стоп» трек микрофона освобождается (`MediaStreamTrack.stop()`); список записей только в памяти страницы (без IndexedDB), экспорт — через `<a download>` (Blob URL).
- На `recorder.html` есть подсказка про HTTPS и разрешение микрофона.
- 0 битых ссылок и src во всём `site/` после каждой задачи; `AGENTS.md` и `AUDIT.md` актуализированы в конце.

---

### Task 1: Аудио-движок `site/assets/audio.js` + стили кнопок

**Files:**
- Create: `site/assets/audio.js`
- Modify: `site/assets/style.css`

- [x] **Step 1: Создать `site/assets/audio.js`**
  - Feature-detect: `const ttsSupported = 'speechSynthesis' in window`.
  - API модуля (глобальный `CourseAudio`): `init()` (обработчик на `DOMContentLoaded`), `speak(key)` — ищет ключ в `AUDIO_MANIFEST`, озвучивает `entry.text`; `toggle(btn)` — стоп/старт по кнопке.
  - Выбор голоса: приоритет `en-US` (`Google US English` → любой `en-US` → любой `en-*` → default); голоса грузятся асинхронно — слушатель `voiceschanged`.
  - Темп: `data-rate` на кнопке или глобальный дефолт `0.95`; удерживание/двойной режим не нужен — достаточно `data-rate="0.75"` для «медленного» варианта там, где добавим вторую кнопку.
  - Единственность воспроизведения: `speechSynthesis.cancel()` перед новым стартом; класс `.playing` на активной кнопке, снятие по `utterance.onend/onerror`.
  - Если TTS недоступен: все `.audio-btn` получают класс `.audio-unsupported` (CSS скрывает их) + один раз `<noscript>`-подобная заметка не нужна — просто скрытие.
  - Если у записи манифеста есть `entry.file` и файл существует — проигрывать `new Audio(entry.file)` вместо TTS (слот на будущее; в рамках задачи файлов нет, код пути предусмотреть).
  - Делегирование событий: один `click`-слушатель на `document` по селектору `.audio-btn[data-audio-key]` — чтобы кнопки работали и в статично вставленной разметке без индивидуальных `onclick`.

- [x] **Step 2: Создать `site/assets/audio-manifest.js`**
  - Глобальный объект `AUDIO_MANIFEST = { 'ship': {text:'ship'}, ... }`.
  - Заполнить ключами тренажёра: программно извлечь `word-text` из `site/workout/*.html` (146 записей), разбить пары `ship / sheep` и контрасты `to → /tə/` на отдельные орфографические ключи; фразы из `.phrase-text` и `.sentence-text` — ключами целиком. Итоговый объём ~200–250 ключей.
  - Только орфография, без IPA; ключи в lower-case, пробелы → `-` (например `pick-it-up`; `BLACK bird / black BIRD` → ключи `black-bird-contrast` c текстом «blackbird. Black bird.» — для контрастных карточек Sunday текст формулируется вручную).
  - Плюс базовый набор для ipa-chart: 44 звука → примерные слова (`see`, `zoo`, `think`, `this`, …) — ключи вида `ipa-see`.

- [x] **Step 3: Стили в `site/assets/style.css`**
  - `.audio-btn` — круглая/пилюльная кнопка-иконка (inline SVG динамика, наследует `currentColor`; размер ~1.6rem), состояния `:hover`, `.playing` (пульс/акцент), `.audio-unsupported {display:none}`.
  - Размещение: в `.word-card` кнопка в правом верхнем углу (делать `.word-card { position: relative }` НЕ ломая hover-трансформации); для `.phrase-row`/`.sentence-card` — inline перед текстом или в конце заголовка.
  - Проверить, что `.ipa-hidden .word-ipa` механика тренажёра не затронута.
  - Тёмная тема: использовать `var(--color-accent)`, `var(--color-surface)` — ничего хардкодить.

- [x] **Step 4: Дым-тест**
  - Открыть локально одну страницу тренажёра с временно подключёнными скриптами, проверить консоль (0 ошибок), озвучку одной карточки.
  - Откатить временное подключение, если оно делалось вне Task 2.

- [x] **Step 5: Зафиксировать изменения в git**
  - `git add site/assets/audio.js site/assets/audio-manifest.js site/assets/style.css`
  - `git commit -m "feat: add TTS audio engine + manifest + button styles (AUDIT 8.1)"`

---

### Task 2: Подключение озвучки в тренажёрный зал

**Files:**
- Modify: `site/workout/index.html`, `site/workout/monday.html` … `site/workout/sunday.html` (8 файлов)

- [x] **Step 1: Подключить в `<head>` каждого из 8 файлов:**
  ```html
  <script src="../assets/audio-manifest.js" defer></script>
  <script src="../assets/audio.js" defer></script>
  ```
  (в `workout/index.html` пути `assets/...` — проверить уровень вложенности: `site/workout/index.html` → `../assets/`).

- [x] **Step 2: Программная вставка кнопок (python-скриптом, однократно):**
  - В `.word-card`: `<button class="audio-btn" data-audio-key="KEY" aria-label="Озвучить: WORD" title="Прослушать">SVG</button>` — ключ согласовать с манифестом (Task 1). Скрипт-вставчик: для пары `ship / sheep` — ключи через запятую не поддерживаем; одна кнопка озвучивает оба слова (манифест-хранит текст «ship. sheep.»).
  - В `.phrase-row` — кнопка слева от `.phrase-text` (ключ = текст фразы нормализованный).
  - В `.sentence-card` — аналогично.
  - Карточки-контрасты ударений в Sunday (`RE-cord / re-CORD`) — тексты в манифесте вручную («REcord. reCORD.»).
  - Отчёт вставщика: сколько карточек обработано/пропущено; список пропущенных (нет ключа) — вручную дописать в манифест.

- [x] **Step 3: Проверка**
  - Python-чекер ссылок и src — 0 битых.
  - Grep-контроль: количество `data-audio-key` ≥ 95% от числа `.word-card` на странице.
  - Ручной просмотр 1–2 страниц в браузере.

- [x] **Step 4: Зафиксировать изменения в git**
  - `git add site/workout/`
  - `git commit -m "feat: wire TTS audio buttons into workout gym pages (AUDIT 8.1)"`

---

### Task 3: Озвучка в уроках (приоритетный скоуп)

**Files:**
- Modify: `site/lessons/0004`–`0022` (звуковые уроки: согласные и гласные) + `site/lessons/0034-minimal-pairs.html`, `site/lessons/0035-problem-sounds.html`

- [x] **Step 1: Определить точки вставки**
  - Таблицы и списки минимальных пар (`ship/sheep`, `bad/bed` и т.п.) — кнопка у каждого слова или пары.
  - Упражнения «Задание: Запись себя» (0015, 0016, 0017, 0018, 0020): добавить ряд кнопок «Слушать образец» к перечню слов задания (озвучка цепочки из манифеста).
  - НЕ трогать: квизы, `.transcription-practice` (spoiler), исторические ASCII-`r` в workout.

- [x] **Step 2: Подключить скрипты и вставить кнопки** (тем же подходом, что Task 2; ключи добавить в манифест при недоставче)
  - Пути из уроков: `../assets/audio-manifest.js`, `../assets/audio.js`.

- [x] **Step 3: Проверка**
  - Чекер ссылок/src; grep-контроль канона нотации (изменения не должны затронуть IPA).
  - 0 ошибок консоли на 2–3 проверенных уроках; квизы и спойлеры работают.

- [x] **Step 4: Зафиксировать изменения в git**
  - `git add site/lessons/ site/assets/audio-manifest.js`
  - `git commit -m "feat: add audio buttons to sound lessons and drills (AUDIT 8.1)"`

---

### Task 4: Озвучка справочника `site/reference/ipa-chart.html`

**Files:**
- Modify: `site/reference/ipa-chart.html`
- Modify: `site/assets/audio-manifest.js`

- [x] **Step 1:** В каждой строке таблиц звуков (согласные, гласные, дифтонги, R-colored) добавить `.audio-btn` к примерному слову (ключ `ipa-*` из Task 1; при недостаче — дописать).
- [x] **Step 2:** Подключить скрипты (пути `../assets/`).
- [x] **Step 3:** Проверка ссылок/src + визуальный контроль таблиц (кнопки не ломают `.ipa-table-wrapper` скролл).
- [x] **Step 4: Зафиксировать изменения в git**
  - `git commit -am "feat: playable IPA chart reference (AUDIT 8.1)"`

---

### Task 5: Страница-протокол `site/recorder.html` (контент 8.2)

**Files:**
- Create: `site/recorder.html`
- Modify: `site/assets/style.css`

- [x] **Step 1: Разметка страницы по шаблону курса**
  - `<html lang="ru">`, charset, viewport, **meta description**, title «Протокол самозаписи — …», favicon, `assets/style.css`, `assets/theme.js`, `assets/audio-manifest.js`+`audio.js`+`recorder.js` (defer).
  - Навигация `.site-nav` (хлебные крошки `Главная / Протокол самозаписи`, ссылки План / Таблица IPA / Все уроки), футер в стиле курса.

- [x] **Step 2: Контент — методика (русский язык, стиль курса: `.insight`, `.tip`, `.marginnote`)**
  - Блок «Зачем записывать себя» (связь с принципом курса «только запись покажет правду»).
  - **5-шаговый протокол (карточки):**
    1. **Эталон** — прослушай образец носителя (встроенная TTS-кнопка-образец на странице; внешние ссылки на Forvo/YouGlish из ресурсов курса).
    2. **Запись** — скажи то же самое 3 раза, запиши третий дубль.
    3. **Сравнение по 5 критериям** — чек-лист (input[type=checkbox], сохранение не требуется): ① гласные (длина/качество), ② согласные-маркеры (/θ ð ɹ ɫ/, flap T), ③ словесное ударение, ④ связность (linking/редукции), ⑤ интонация и ритм.
    4. **Повтор** — переиграй один худший критерий, перезапиши дубль.
    5. **Еженедельный замер** — раз в неделю одна и та же контрольная фраза (`The quick brown fox…` заменить на контрольный абзац курса — например 3 фразы: фраза с /θ/, фраза с R-цветными, фраза со связностью), файл с датой, сравнение с прошлой неделей.
  - **Шаблон дневника записи** — таблица: Дата | Материал | Что слышу | Критерий недели | Следующий фокус (статичная HTML-таблица для переноса в заметки).
  - `.tip`-предостережения: не оценивать «на слух без записи»; не сравнивать себя с диктором студии; 10 минут/день > часа раз в неделю.

- [x] **Step 3: Стили рекордера в `style.css`**
  - `.recorder-panel`, `.rec-btn` (record/stop состояния), `.rec-list` (список дублей: имя, длительность, play, download, delete), `.rec-criteria` (чек-лист), `.ab-compare` (две кнопки «Эталон»/«Я»).
  - Совместимость с тёмной темой, мобильная раскладка.

- [x] **Step 4: Проверка ссылок/src; зафиксировать**
  - `git add site/recorder.html site/assets/style.css`
  - `git commit -m "feat: self-recording protocol page with checklist (AUDIT 8.2)"`

  Примечание: `<script src="assets/recorder.js">` на страницу будет добавлен в Task 6 вместе с самим файлом (иначе чекер src дал бы битый src).

---

### Task 6: Рекордер `site/assets/recorder.js`

**Files:**
- Create: `site/assets/recorder.js`

- [ ] **Step 1: Реализация MediaRecorder-обёртки**
  - Feature-detect: `navigator.mediaDevices?.getUserMedia && window.MediaRecorder`; при отсутствии — панель заменяется заглушкой «Запись недоступна в этом браузере (нужен HTTPS и современный браузер)».
  - Flow: «Начать запись» → `getUserMedia({audio:true})` → `MediaRecorder` (mimeType autodetect: `audio/webm;codecs=opus` → `audio/webm` → default) → «Стоп» → Blob → пункт списка с `URL.createObjectURL`.
  - Максимум 1 активный поток; на `stop` — `stream.getTracks().forEach(t => t.stop())`.
  - Ограничение дубля 60 сек (auto-stop) + индикация таймера.
  - Кнопки дубля: Прослушать / Скачать (`.webm`, имя `recording-YYYY-MM-DD-HHMM.webm`) / Удалить.
  - A-B: кнопка «Эталон» рядом с каждым дублем — озвучивает `data-audio-key` панели через `CourseAudio.speak` (тот же TTS, гарантия одного источника звука).
  - Ошибки разрешения микрофона — дружелюбное сообщение (NotAllowedError → подсказка про иконку замка в адресной строке).

- [ ] **Step 2: Подключить к панели на `recorder.html`; проверить в браузере вручную (localhost/HTTPS)**
  - Критерии приёмки: запись создаёт дубль; повторная запись не плодит потоки; экспорт скачивает файл; A-B играет эталон.

- [ ] **Step 3: Зафиксировать**
  - `git add site/assets/recorder.js`
  - `git commit -m "feat: in-browser MediaRecorder with A/B vs TTS model (AUDIT 8.2)"`

---

### Task 7: Интеграция ссылок на протокол самозаписи

**Files:**
- Modify: `site/index.html` (принцип «Записывай себя» — обернуть в ссылку на `recorder.html`; добавить страницу в список разделов/справочников)
- Modify: `site/plan.html` (принцип «Записывай себя», стр. ~71)
- Modify: `site/workout.html` и `site/workout/index.html` («золотое правило»)
- Modify: `site/workout/sunday.html` (обязательное задание с диктофоном)
- Modify: `site/lessons/0015, 0016, 0017, 0018, 0020, 0037, 0038` (задания/рекомендации «Запись себя» → ссылка `../recorder.html`)
- Modify: `site/resources.html` (упоминание протокола, опционально)

- [ ] **Step 1:** Вставить компактные ссылки вида `<a href="recorder.html">протоколом самозаписи</a>` / `<a href="../recorder.html">…</a>` — без изменения смысла текста; проверить уровень относительных путей для каждой папки.
- [ ] **Step 2:** Проверка python-чекером: 0 битых ссылок/src; 0 ссылок на `.md`.
- [ ] **Step 3: Зафиксировать**
  - `git commit -am "feat: integrate self-recording protocol links across course (AUDIT 8.2)"`

---

### Task 8: Документация и закрытие пунктов 8.1 / 8.2 в AUDIT.md

**Files:**
- Modify: `AGENTS.md`
- Modify: `AUDIT.md`

- [ ] **Step 1: `AGENTS.md`**
  - В структуру `site/`: добавить `site/recorder.html`, `site/assets/audio.js`, `site/assets/audio-manifest.js`, `site/assets/recorder.js`.
  - Добавить параграф соглашений: «Кнопки озвучки — только через `data-audio-key` + манифест (в манифесте только орфография, не IPA); новые слова озвучки — сначала ключ в `audio-manifest.js`».

- [ ] **Step 2: `AUDIT.md`**
  - Пункты 8.1 и 8.2 → `[x]` с кратким описанием реализации (TTS-движок + манифест, кнопки в тренажёре/уроках/ipa-chart; страница-протокол + рекордер).
  - Обновить шапку («из Фазы 8 — пункты 8.3, 8.4, 8.5» → «Фаза 8 выполнена полностью») и секцию «Прогресс» (строка Фазы 8: выполнены 8.1–8.5).
  - В «Общее резюме» можно поднять оценку «Уроки/Тренажёр» по усмотрению проявившегося результата (опционально, без переписывания таблицы).

- [ ] **Step 3: Финальная верификация**
  - Python-чекер ссылок/src по всему `site/` — 0 битых; 0 ссылок на `.md`.
  - Grep канона нотации (`ər|əɹ|ɜː|wɔːt̬` вне разрешённых мест) — чисто.
  - Ручной проход критического пути: тренажёр (кнопка играет), урок 16 (кнопка у задания), ipa-chart (строка играет), recorder.html (запись дубля + экспорт) — по возможности в браузере.

- [ ] **Step 4: Зафиксировать**
  - `git commit -am "docs: close AUDIT 8.1/8.2, document audio + recorder assets"`
