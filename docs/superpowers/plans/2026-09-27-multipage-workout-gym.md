# Multi-Page Intensive Pronunciation Gym Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Создать многостраничный раздел тренажёрного зала `site/workout/` с разводящей страницей (`index.html`) и 7 массивными страницами ежедневных интенсивных тренировок (`monday.html` ... `sunday.html`) на 30–40 минут практики с интервальным повторением (Spaced Repetition) и перекрестной навигацией.

**Architecture:** Папка `site/workout/`, содержащая `index.html` и 7 файлов дней (`monday.html` ... `sunday.html`), редирект/шлюз `site/workout.html` → `site/workout/index.html`, стили пагинации дней и чекбоксов в `site/assets/style.css`, обновление навигации по всему сайту (`index.html`, `plan.html`, уроки фазы 5).

**Tech Stack:** HTML5, CSS3, JavaScript (vanilla, no external dependencies), General American IPA.

## Global Constraints
- Кодировка UTF-8, язык `<html lang="ru">`.
- Никаких ссылок на `.md` файлы из страниц сайта `site/`.
- Полная адаптивность на десктопах (1080px), планшетах (900px) и смартфонах (600px).
- Все внутренние ссылки должны строго резолвиться.

## Review Focus
- Все 7 страниц должны иметь 6 расширенных блоков (Вчерашний повтор, Разминка, L1 Слова, L2 Коллокации, L3 Предложения, Марафон/Скороговорки) объемом на 30–40 мин.
- Навигация между днями: Понедельник ↔ Вторник ↔ ... ↔ Воскресенье ↔ Понедельник.
- Кнопка "👁 Скрыть IPA" должна корректно функционировать на всех страницах и синхронизироваться через `localStorage`.
- Все ссылки на тренажер из главного меню должны вести на `workout/` или `workout/index.html`.

---

### Task 1: Подготовка папки `site/workout/` и стилей в `site/assets/style.css`

**Files:**
- Create directory: `site/workout`
- Modify: `site/assets/style.css`

- [ ] **Step 1: Создать папку `site/workout`**
- [ ] **Step 2: Добавить стили для интерактивного чек-листа тренировки, интервального блока и навигации дней:**
  - Классы: `.workout-card-day`, `.drill-check-item`, `.review-yesterday-box`, `.workout-week-nav`.
- [ ] **Step 3: Зафиксировать изменения в git**
  - `git commit -am "style: add multi-page workout styles and repetition badges"`

---

### Task 2: Создание разводящей страницы `site/workout/index.html` и шлюза `site/workout.html`

**Files:**
- Create: `site/workout/index.html`
- Modify: `site/workout.html`

- [ ] **Step 1: Создать `site/workout/index.html`**
  - Оглавление всех 7 дней недели с описанием фонемного профиля, целей и ссылок на `monday.html` ... `sunday.html`.
  - Кнопка "📅 Тренировка на сегодня", автоматически перенаправляющая на текущий день.
  - Методическое руководство по 30–40 минутным тренировкам.
- [ ] **Step 2: Обновить `site/workout.html` как посадочный шлюз/редирект на `workout/index.html`**
- [ ] **Step 3: Зафиксировать изменения в git**
  - `git commit -am "feat: implement workout gym hub page and gateway redirect"`

---

### Task 3: Реализация страниц Пн (Day 1), Вт (Day 2), Ср (Day 3)

**Files:**
- Create: `site/workout/monday.html`
- Create: `site/workout/tuesday.html`
- Create: `site/workout/wednesday.html`

- [ ] **Step 1: Создать `site/workout/monday.html` (The Accent Breaker)**
  - 6 блоков (Разминка, L1 30+ слов /θ-ð/, /ɹ/, Dark L, /w-v/, L2 15+ фраз, L3 8 предложений, 4 скороговорки).
- [ ] **Step 2: Создать `site/workout/tuesday.html` (Explosive Precision & Stops)**
  - Вчерашний повтор (Пн) + взрывные пары, аспирация, unreleased stops, Glottal Stop [ʔ], /æ/.
- [ ] **Step 3: Создать `site/workout/wednesday.html` (Sibilants & Affricates)**
  - Вчерашний повтор (Вт) + /s-z/, /ʃ-ʒ/, /tʃ-dʒ/, палатализация (*don't you, did you*), /ʊ/-/uː/.
- [ ] **Step 4: Проверить валидность ссылок**
- [ ] **Step 5: Зафиксировать изменения в git**
  - `git commit -am "feat: implement intensive 30-40 min workouts for Mon, Tue, Wed"`

---

### Task 4: Реализация страниц Чт (Day 4), Пт (Day 5), Сб (Day 6), Вс (Day 7)

**Files:**
- Create: `site/workout/thursday.html`
- Create: `site/workout/friday.html`
- Create: `site/workout/saturday.html`
- Create: `site/workout/sunday.html`

- [ ] **Step 1: Создать `site/workout/thursday.html` (Nasal Resonance & Glides)**
  - Вчерашний повтор (Ср) + носовые /ŋ/ vs /ŋɡ/, glide linking [w]/[j], /ʌ/ vs /ɑː/.
- [ ] **Step 2: Создать `site/workout/friday.html` (R-Colored Vowels & Heavy Clusters)**
  - Вчерашний повтор (Чт) + 7 R-гласных, начальные/конечные кластеры (str-, spl-, -ksts).
- [ ] **Step 3: Создать `site/workout/saturday.html` (Connected Speech & Weak Forms)**
  - Вчерашний повтор (Пт) + 25 слабых форм, geminates, разговорные редукции (*gonna, wanna*).
- [ ] **Step 4: Создать `site/workout/sunday.html` (Prosody, Intonation & Native Rhythm)**
  - Вчерашний повтор (Сб) + интонация 2-3-1/2-3-3, thought groups, большой связный марафон.
- [ ] **Step 5: Проверить валидность ссылок**
- [ ] **Step 6: Зафиксировать изменения в git**
  - `git commit -am "feat: implement intensive 30-40 min workouts for Thu, Fri, Sat, Sun"`

---

### Task 5: Обновление навигации сайта и документации курса

**Files:**
- Modify: `site/index.html`
- Modify: `site/plan.html`
- Modify: `site/mission.html`
- Modify: `site/resources.html`
- Modify: `site/reference/ipa-chart.html`
- Modify: `site/lessons/0033-shadowing.html`
- Modify: `site/lessons/0034-minimal-pairs.html`
- Modify: `site/lessons/0035-problem-sounds.html`
- Modify: `site/lessons/0038-final-assessment.html`
- Modify: `PLAN.md`

- [ ] **Step 1: Обновить все ссылки на тренажёр: вести на `workout/index.html`**
- [ ] **Step 2: Запустить полный скрипт проверки целостности всех ссылок в `site/`**
- [ ] **Step 3: Зафиксировать изменения в git**
  - `git commit -am "feat: update site-wide navigation and lessons to point to workout hub"`
