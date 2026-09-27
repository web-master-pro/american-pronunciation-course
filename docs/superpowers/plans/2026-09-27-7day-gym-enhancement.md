# 7-Day Pronunciation Gym Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Расширить «Тренажёрный зал произношения» (`site/workout.html`) до 7 полноценных специализированных программ (понедельник–воскресенье) с интерактивным переключателем дней, авто-определением текущего дня, переключателем IPA и полным охватом всех звуков и навыков General American.

**Architecture:** Интерактивный интерфейс вкладок на `site/workout.html` с 7 контейнерами тренировок (Day 1–7), стилизация навигации по дням в `site/assets/style.css`, автосохранение выбранного дня и состояния IPA в `localStorage`, обновление описания тренажера в `site/plan.html`, `site/index.html` и `PLAN.md`.

**Tech Stack:** HTML5, CSS3, JavaScript (vanilla, no dependencies), General American IPA.

## Global Constraints
- Кодировка UTF-8, язык `<html lang="ru">`.
- Никаких ссылок на `.md` файлы из страниц сайта `site/`.
- Полная адаптивность на десктопах (1080px), планшетах (900px) и смартфонах (600px).
- Все внутренние ссылки должны оставаться валидными.

## Review Focus
- Все 7 программ должны иметь единообразную 5-уровневую структуру: Warm-up → L1 (Слова) → L2 (Словосочетания) → L3 (Предложения) → Связная речь/Скороговорки.
- Переключение вкладок дней должно работать мгновенно без скролла наверх и без ошибок в консоли.
- Кнопка «📅 Сегодня» должна корректно вычислять текущий день недели по локальному времени пользователя.
- Скрытие/показ транскрипции (IPA) должно применяться ко всем 7 программам.

---

### Task 1: Стили панели выбора дней в `site/assets/style.css`

**Files:**
- Modify: `site/assets/style.css`

- [ ] **Step 1: Добавить стили для табов дней недели:**
  - Классы: `.workout-days-nav`, `.day-tab-btn`, `.day-tab-btn.active`, `.day-tab-btn.today-highlight`, `.workout-program-pane`.
  - Мобильная адаптивность для панели дней (горизонтальный скролл или flex-wrap с touch-friendly отступами).

- [ ] **Step 2: Зафиксировать изменения в git**
  - `git commit -am "style: add day tabs navigation and program pane styles"`

---

### Task 2: Реализация 7 программ тренировок в `site/workout.html`

**Files:**
- Modify: `site/workout.html`

- [ ] **Step 1: Добавить панель переключения дней (Пн–Вс + кнопка "Сегодня")**
- [ ] **Step 2: Оформить Программу 1 (Пн): The Accent Breaker (/θ/-/ð/, /ɹ/, Dark L, /w/-/v/)**
- [ ] **Step 3: Оформить Программу 2 (Вт): Explosive Precision & Stops (/p/-/b/, /t/-/d/, /k/-/ɡ/, Glottal Stop [ʔ], /ɛ/-/æ/)**
- [ ] **Step 4: Оформить Программу 3 (Ср): Sibilants, Whispers & Affricates (/s/-/z/, /ʃ/-/ʒ/, /tʃ/-/dʒ/, /h/, /ʊ/-/uː/, палатализация)**
- [ ] **Step 5: Оформить Программу 4 (Чт): Nasal Resonance & Approximants (/m/, /n/, /ŋ/, /w/ vs /v/, /ʌ/-/ɑː/-/ɔː/, glide linking)**
- [ ] **Step 6: Оформить Программу 5 (Пт): R-Colored Vowels & Heavy Clusters (/ɝ/, /ɚ/, /ɑːr/, /ɔːr/, /ɛr/, /ɪr/, /ʊr/, сложные кластеры)**
- [ ] **Step 7: Оформить Программу 6 (Сб): Connected Speech & Weak Forms Marathon (25 weak forms, geminates, беглые связки)**
- [ ] **Step 8: Оформить Программу 7 (Вс): Prosody, Intonation & Native Rhythm (stress-timing, контуры 2-3-1 и 2-3-3, thought groups)**
- [ ] **Step 9: Реализовать JavaScript логику переключения табов, автовыбора текущего дня и скрытия транскрипции**
- [ ] **Step 10: Проверить валидность ссылок и разметки**
  - Запуск python проверки ссылок.

- [ ] **Step 11: Зафиксировать изменения в git**
  - `git commit -am "feat: implement 7-day comprehensive pronunciation gym workouts"`

---

### Task 3: Обновление документации и описаний курса

**Files:**
- Modify: `site/index.html`
- Modify: `site/plan.html`
- Modify: `PLAN.md`

- [ ] **Step 1: Обновить описание тренажера в `site/index.html` (7-дневный цикл)**
- [ ] **Step 2: Обновить блок практикума в `site/plan.html` и `PLAN.md`**
- [ ] **Step 3: Проверить ссылки и целостность проекта**
- [ ] **Step 4: Зафиксировать изменения в git**
  - `git commit -am "docs: update course plan and homepage with 7-day gym routine"`
