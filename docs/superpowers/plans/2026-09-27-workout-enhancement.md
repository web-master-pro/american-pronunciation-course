# Workout and Course Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Создать интерактивный тренировочный раздел `site/workout.html` с многоуровневыми упражнениями (слово -> фраза -> предложение) для ежедневной отработки произношения до автоматизма и интегрировать его во все материалы и навигацию курса.

**Architecture:** Выделенная страница `site/workout.html` в общей стилистике проекта с 5 функциональными блоками тренировок, интерактивными элементами (скрытие/показ IPA, темповые переключатели, карточки минимальных контрастов), обновлением стилей в `site/assets/style.css` и перекрестными ссылками в `index.html`, `plan.html`, `resources.html`, `mission.html`, `PLAN.md` и уроках Фазы 5.

**Tech Stack:** HTML5, CSS3, JavaScript (ванильный, без внешних зависимостей), General American IPA.

## Global Constraints
- Кодировка UTF-8, язык `<html lang="ru">`.
- Никаких ссылок на `.md` файлы из страниц сайта `site/`.
- Полное соответствие стандартам адаптивности (десктоп 1080px, планшеты 900px, смартфоны 600px).
- Все внутренние ссылки должны быть валидными.

## Review Focus
- Все ссылки между `workout.html` и остальными страницами курса должны резолвиться корректно.
- Интерактивные скрипты (спойлеры IPA, таймеры/счетчики темпа) должны работать без ошибок в консоли.
- Мобильная верстка тренировочных списков и карточек не должна ломать вьюпорт.
- Материал упражнений должен строго отражать General American фонетику (rhoticity, flap T, bat-bet distinction, schwa).

---

### Task 1: Стили и интерактивные компоненты тренажера в `site/assets/style.css`

**Files:**
- Modify: `site/assets/style.css`

- [ ] **Step 1: Добавить стили для тренировочного блока**
  - Классы: `.workout-section`, `.drill-card`, `.drill-level`, `.drill-badge`, `.ipa-toggle-btn`, `.speed-badge`, `.drill-item`, `.drill-phrase`, `.drill-sentence`, `.drill-focus`.
  - Обеспечить адаптивность для мобильных экранов.

- [ ] **Step 2: Проверить синтаксис CSS**
  - Убедиться в отсутствии незакрытых фигурных скобок и конфликтов.

- [ ] **Step 3: Зафиксировать изменения в git**
  - `git commit -am "style: add workout training components and drill layout styles"`

---

### Task 2: Создание страницы `site/workout.html` (Daily Pronunciation Gym)

**Files:**
- Create: `site/workout.html`

- [ ] **Step 1: Сформировать разметку страницы со всеми 5 тренировочными блоками:**
  - Навигация: единый хлебные крошки и ссылки (`Главная / Тренажерный зал`, ссылки на `План`, `Таблица IPA`, `Все уроки`).
  - Блок 1: Артикуляционная разминка (Gymnastics & Warm-up) — 5 пошаговых упражнений.
  - Блок 2: Триада согласных-маркеров (/θ/-/ð/, /ɹ/, /l/, /w/-/v/) — прогрессия: слова (начало, середина, конец) → фразы → предложения.
  - Блок 3: Контрасты гласных (Vowel Gymnastics) — 5 ключевых пар: /ɪ/-/iː/, /ɛ/-/æ/, /ʌ/-/ɑː/, /ʊ/-/uː/, /ə/-/ɝ/ со сравнительными цепочками.
  - Блок 4: Американский ритм, Flap T и связная речь — отработка связок consonant-vowel, glide linking, weak forms.
  - Блок 5: Скороговорки и марафон на выносливость (Speed & Endurance Drills) — 3 уровня скорости (медленно, умеренно, темп носителя).
  - Интерактивный JavaScript: кнопки скрытия/раскрытия подсказок транскрипции и переключения режимов тренировки.

- [ ] **Step 2: Проверить валидность HTML и отсутствие битых ссылок**
  - Запуск python-проверки ссылок.

- [ ] **Step 3: Зафиксировать изменения в git**
  - `git add site/workout.html`
  - `git commit -m "feat: implement comprehensive pronunciation workout gym with 5 drill blocks"`

---

### Task 3: Интеграция тренажера в навигацию сайта и документацию

**Files:**
- Modify: `site/index.html`
- Modify: `site/plan.html`
- Modify: `site/mission.html`
- Modify: `site/resources.html`
- Modify: `PLAN.md`

- [ ] **Step 1: Обновить навигацию и секции на `site/index.html`**
  - Добавить ссылку на «Тренажерный зал произношения» в навигацию и в блок быстрых разделов/герой-блок.

- [ ] **Step 2: Обновить `site/plan.html` и `PLAN.md`**
  - Добавить описание методики ежедневных тренировок в тренажере и ссылки на `workout.html`.

- [ ] **Step 3: Обновить навигационные шапки `site/mission.html` и `site/resources.html`**
  - Добавить пункт `Тренажёр` в `.site-nav .nav-links`.

- [ ] **Step 4: Проверить ссылки во всех файлах**
  - Запуск скрипта проверки ссылок.

- [ ] **Step 5: Зафиксировать изменения в git**
  - `git commit -am "feat: integrate workout gym into course navigation and documentation"`

---

### Task 4: Связывание уроков Фазы 5 с тренировочным блоком

**Files:**
- Modify: `site/lessons/0033-shadowing.html`
- Modify: `site/lessons/0034-minimal-pairs.html`
- Modify: `site/lessons/0035-problem-sounds.html`
- Modify: `site/lessons/0038-final-assessment.html`

- [ ] **Step 1: Добавить в домашние задания и рекомендации уроков 33, 34, 35 и 38 прямые ссылки на отработку в `../workout.html`**
- [ ] **Step 2: Проверить валидность ссылок и отсутствие регрессий**
- [ ] **Step 3: Зафиксировать изменения в git**
  - `git commit -am "feat: link phase 5 mastery lessons to daily workout gym"`
