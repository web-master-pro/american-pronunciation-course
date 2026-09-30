# Кнопки озвучки у транскрипций — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить играбельную иконку плей к каждому примеру произношения (слово/фраза/предложение, поданное с транскрипцией) на всех страницах курса, используя уже существующий аудио-движок `audio.js` + `audio-manifest.js`.

**Architecture:** Никакого нового движка. Расширяем охват существующего механизма `.audio-btn[data-audio-key]` (делегирование в `audio.js`, TTS en-US по орфографическому тексту из манифеста). Работа разбита по фазам курса (Ф0–Ф5) + общие страницы, чтобы каждую порцию можно было делать и принимать отдельно. Для каждой порции: аудит существующей разметки → новые ключи в манифест → кнопки рядом с транскрипциями → подключение скриптов в `<head>` → верификация → коммит.

**Tech Stack:** HTML5, CSS3 (переменные темы), ванильный JS (Web Speech API), Python 3 (вспомогательные скрипты `tools/`, только для разработки — на сайт не попадают).

**Spec:** `AGENTS.md` (раздел «Аудио-слой и озвучка», AUDIT 8.1), `AUDIT.md` Фаза 8.1, `docs/superpowers/plans/2026-09-27-audio-and-selfrecording.md` (Task 1–2).

**Отправная точка (замер 2026-09-30):** движок и манифест есть; 540 кнопок на 28 страницах. Озвучены: тренажёр, уроки 0004–0013, 0015–0021, 0034, 0035, `ipa-chart`. Не озвучены: 0001, 0002, 0003, **0014**, **0022**, **0023–0033**, 0036–0038, а также `index.html`, `plan.html`, `mission.html`, `workout/index.html`. В озвученных уроках кнопки покрывают не все транскрипции (только минимальные пары и часть карточек) — нужен gap-fill.

---

## Зафиксированные решения (2026-09-30)

1. **Что считается «примером произношения».** Кнопка ставится там, где рядом с транскрипцией есть **английское слово/фраза** (её и произносит TTS). Нотация: `word /wɜːd/`, `[wɜːd]`, карточки, таблицы, квиз-варианты, инлайн-примеры.
2. **Голые фонемы кнопок НЕ получают** (`/j/`, `/ə/`, `/ɹ/` как обозначение звука, без слова). Причина: TTS не читает изолированную фонему, а чтение «yes» вместо «/j/» методически вводит в заблуждение.
3. **Существующие страницы — gap-fill.** Покрытие добивается на всех уже готовых уроках, а не только на новых.
4. **Тренажёр (`workout/*`) включён в объём** — отдельной фазой (Task 7), т.к. там свои правила (ASCII `r` для согласного в IPA — не трогаем; ключи тренажёра переиспользуются при совпадении текста).
5. **Будущие (новые) уроки.** Конвенция «пример с транскрипцией ⇒ кнопка» становится обязательной частью шаблона урока: при создании нового урока кнопки добавляются сразу, а `python tools/audio_validate.py` должен проходить чисто. Правило фиксируется в `AGENTS.md` (Task 0, Step 1b) и проверяется валидатором и в Task 8.
6. **Источник звука** — только TTS через манифест (как решено 2026-09-27). Локальные mp3 — слот `file`, не в скоупе.

## Конвенции (фиксируются, обязательны для всех задач)

- **Кнопка (канонический сниппет, вставляется сразу после транскрипции, внутри того же блочного элемента):**
  ```html
  <button class="audio-btn" data-audio-key="KEY" aria-label="Озвучить: WORD" title="Озвучить"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.5 8.5a5 5 0 0 1 0 7"></path><path d="M18.5 5.5a9 9 0 0 1 0 13"></path></svg></button>
  ```
  Никаких `onclick`, никаких других классов-кнопок озвучки (AGENTS.md).
- **Порядок работы на каждой странице:** сначала ключ в манифест, потом кнопка в разметку.
- **Подключение скриптов в `<head>`** (пути по уровню вложенности):
  ```html
  <script src="../assets/audio-manifest.js" defer></script>
  <script src="../assets/audio.js" defer></script>
  ```
- **Манифест — только орфография.** Транскрипции (IPA) в тексте `text:` запрещены.
- **Ключи:** lower-case; пробелы → `-`; знаки препинания убираются (`don't` → `dont`, но `text` сохраняет апостроф/запятую для естественного TTS); дубли не создаются; пары (`ship / sheep`) → `ship-sheep` с текстом `"ship. sheep."`.
- **Размещение и валидность:** кнопка внутри `<td>` (существующая разметка уроков 0004–0021, где кнопка стоит между `</td>` и `</tr>`, признана невалидной и приводится к канону); в карточках — по существующему CSS (`.word-card` — угол), в прозе/таблицах — инлайн после транскрипции.
- **Канон нотации IPA не трогаем** (/ɹ/, /ɝ/, /ɚ/, ː, water = /ˈwɑːt̬ɚ/).

## Global Constraints

- UTF-8, `<html lang="ru">`, `<meta name="description">` — по шаблону курса (уже есть; новые страницы не создаются).
- Никаких ссылок на `.md` из `site/`; все новые внутренние ссылки — валидные `.html`.
- Никаких внешних JS/CSS/CDN; только `audio-manifest.js` + `audio.js` (пути относительные).
- `speechSynthesis` может отсутствовать — кнопки скрываются через `.audio-unsupported`; контент остаётся читаемым.
- Только ванильный JS; никаких правок `audio.js`, кроме случаев, прямо указанных в задаче.
- Тёмная тема: цвета только через `var(--...)`.
- После каждой фазы: 0 битых ссылок/src (python-чекер), 0 ключей без записи в манифесте, 0 IPA-символов в манифесте, 0 `onclick` на `.audio-btn`.
- Коммит в конце каждой фазы (только по явной команде пользователя; в остальном — держать фазы раздельными).

## Review Focus

- Кнопка не появляется у **голых фонем** и не «читает» чужое слово (проверка: `aria-label` и `data-audio-key` соответствуют видимому примеру).
- Русский текст с английскими вставками не ломается: TTS читает только `text` из манифеста, не окружающую разметку.
- Существующий интерактив (квизы `checkAnswer`, спойлеры IPA, рекордер) не задет.
- Кнопки в таблицах не ломают вёрстку на мобильных (600px) и в тёмной теме.
- Дубликаты ключей не создают конфликт текста (омографы).
- Обложка/оглавление/план не превращаются в «лес» из кнопок — там только явные примеры с транскрипцией.

## File Structure

- `tools/audio_audit.py` — создать. Инвентаризация транскрипций и покрытия кнопками по всем страницам (отчёт в stdout/CSV).
- `tools/audio_validate.py` — создать. Валидатор: ключи↔манифест, IPA в манифесте, лишние ключи, `onclick` на кнопках.
- `site/assets/style.css` — дополнить стилями инлайн-кнопки в прозе/таблицах.
- `site/assets/audio-manifest.js` — дополняется ключами в каждой фазе.
- `site/lessons/*.html`, `site/reference/ipa-chart.html`, `site/index.html`, `site/plan.html`, `site/mission.html`, `site/workout/index.html`, `site/workout/*.html` — разметка кнопок по фазам.
- `AGENTS.md` — зафиксировать конвенцию «пример с транскрипцией ⇒ кнопка» (Task 0) и итог покрытия (Task 8).
- `AUDIT.md` — актуализировать в финальной фазе (Task 8).

---

## Инвентаризация (точные числа `tools/audio_audit.py`, 2026-09-30)

| Фаза | Страницы | Транскр. | Кнопок сейчас | Режим |
|---|---|---|---|---|
| 1 | 0001 (13), 0002 (55), 0003 (89) | 13 + 55 + 89 | 0 | полностью |
| 2 | 0004 (16), 0005 (28), 0006 (88), 0007 (31), 0008 (20), 0009 (61), 0010 (75), 0011 (91), 0012 (99), 0013 (15), 0014 (60) | 584 | 6/6/6/6/4/2/4/3/15/10/0 | gap-fill + нормализация; 0014 — полностью (60) |
| 3 | 0015 (92), 0016 (96), 0017 (108), 0018 (109), 0019 (91), 0020 (68), 0021 (109), 0022 (91) | 764 | 8/8/7/8/5/6/8/0 | gap-fill + нормализация; 0022 — полностью (91) |
| 4 | 0023 (30), 0024 (39), 0025 (58), 0026 (51), 0027 (60) | 238 | 0 | полностью |
| 5 | 0028 (25), 0029 (0), 0030 (18), 0031 (0), 0032 (0) | 43 | 0 | выборочно (только явные примеры) |
| 6 | 0033 (0), 0034 (77), 0035 (66), 0036 (0), 0037 (0), 0038 (49) | 192 | 0/20/11/0/0/0 | gap-fill 0034/0035; 0038 — полностью; 0033/0036/0037 — без транскрипций |
| 7 | index (25), plan (49), mission (5), ipa-chart (51), resources (0), workout (0), workout/index (23), workout/* (94–173) | 153 + 941 | 0/0/0/45/0/0/0/36–60 | общие страницы + gap-fill справочника и тренажёра (включён) |

> Транскрипции включают голые фонемы и шум (оценка сверху); список кандидатов
> «транскрипция + английское слово» печатает `tools/audio_audit.py` (2754 шт. по всему `site/`).
> Baseline `tools/audio_validate.py` (2026-09-30): MISSING=0, IPA=0, onclick=0, ORPHAN=135
> (записи-компоненты пар, зарезервированные под отдельные карточки тренажёра).

| Фаза | Страницы | Транскр. (оценка) | Кнопок сейчас | Режим |
|---|---|---|---|---|
| 1 | 0001, 0002, 0003 | 13 + 55 + 89 | 0 | полностью |
| 2 | 0004–0013 | 16–99 | 2–15 | gap-fill + нормализация; 0014 — полностью (60) |
| 3 | 0015–0021 | 68–109 | 5–8 | gap-fill + нормализация; 0022 — полностью (91) |
| 4 | 0023–0027 | 30–60 | 0 | полностью |
| 5 | 0028–0032 | 25 + 0(0029 стрелки) + 18 + 0 + 0 | 0 | выборочно (только явные примеры) |
| 6 | 0033–0038 | 0 + 77 + 66 + 0 + 0 + 49 | 0/20/11 | gap-fill 0034/0035; 0038 — полностью; 0033/0036/0037 — без транскрипций |
| 7 | index, plan, mission, ipa-chart, workout/index, workout/* | 25 + 49 + 5 + 51 + 23 + 86–169 | 0/0/0/45/0/36–60 | общие страницы + gap-fill справочника и тренажёра (включён) |

---

**Точные числа — см. таблицу выше.**

---

### Task 0 (Фаза 0): Конвенции, инструменты, CSS

**Files:**
- Create: `tools/audio_audit.py`
- Create: `tools/audio_validate.py`
- Modify: `site/assets/style.css`
- Modify: `AGENTS.md` (зафиксировать конвенцию размещения кнопки — при необходимости)

**Interfaces:**
- Produces: CLI `python tools/audio_audit.py [--csv OUT]` — печатает по каждой странице число транскрипций, число кнопок, список кандидатов `(file, line, ipa, adjacent-english)`; CLI `python tools/audio_validate.py` — exit 0/1 со списком `missing`/`orphan`/`ipa-in-manifest`/`onclick`.

- [ ] **Step 1: Создать `tools/audio_audit.py`**

```python
"""Инвентаризация транскрипций и покрытия кнопками озвучки (только dev)."""
import glob, os, re, sys, csv

IPA = set('ɪʊɛæɑɔʌəɝɚɹðθʃʒŋɡʔʰ̬̩ːˈˌ')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, 'site')


def strip_tags(s):
    return re.sub(r'<[^>]+>', ' ', s)


def find_transcriptions(text):
    for m in re.finditer(r'/([^/<>]{1,60})/', text):
        if any(c in IPA for c in m.group(1)):
            yield m.start(), m.group(1), 'slash'
    for m in re.finditer(r'\[([^\[\]<>]{1,60})\]', text):
        if any(c in IPA for c in m.group(1)):
            yield m.start(), m.group(1), 'bracket'


def main():
    out = []
    for f in sorted(glob.glob(os.path.join(SITE, '**', '*.html'), recursive=True)):
        t = open(f, encoding='utf-8').read()
        rel = os.path.relpath(f, SITE).replace('\\', '/')
        trans = list(find_transcriptions(t))
        btns = t.count('class="audio-btn"')
        out.append((rel, len(trans), btns))
        if '--csv' in sys.argv:
            pass
    w = max(len(r[0]) for r in out)
    print(f'{"page".ljust(w)}  trans  btns')
    for rel, n, b in out:
        print(f'{rel.ljust(w)}  {n:>5}  {b:>4}')
    if '--csv' in sys.argv:
        i = sys.argv.index('--csv')
        path = sys.argv[i + 1]
        with open(path, 'w', newline='', encoding='utf-8') as fh:
            wr = csv.writer(fh)
            wr.writerow(['page', 'transcriptions', 'buttons'])
            wr.writerows(out)
        print('CSV:', path)


if __name__ == '__main__':
    main()
```

- [ ] **Step 2: Прогнать инвентаризацию и приложить результат**

Run: `python tools/audio_audit.py --csv tools/audio_inventory.csv`
Expected: таблица по ~50 страницам; CSV создан. Полученные точные числа заменить в таблице «Инвентаризация» этого плана.

- [ ] **Step 3: Создать `tools/audio_validate.py`**

```python
"""Валидатор аудио-слоя: ключи, манифест, onclick, IPA в манифесте (только dev)."""
import glob, os, re, sys

IPA = set('ɪʊɛæɑɔʌəɝɚɹðθʃʒŋɡʔʰ̬̩ːˈˌ')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, 'site')


def main():
    mtext = open(os.path.join(SITE, 'assets', 'audio-manifest.js'), encoding='utf-8').read()
    manifest = dict(re.findall(r"'([^']+)'\s*:\s*\{\s*text\s*:\s*'([^']*)'", mtext))
    used, onclick = {}, []
    for f in glob.glob(os.path.join(SITE, '**', '*.html'), recursive=True):
        t = open(f, encoding='utf-8').read()
        rel = os.path.relpath(f, SITE).replace('\\', '/')
        for k in re.findall(r'data-audio-key="([^"]+)"', t):
            used.setdefault(k, []).append(rel)
        if re.search(r'<button[^>]*class="audio-btn"[^>]*onclick', t):
            onclick.append(rel)

    missing = sorted(set(used) - set(manifest))
    orphan = sorted(set(manifest) - set(used))
    ipa_bad = sorted(k for k, v in manifest.items() if any(c in IPA for c in v))
    print(f'buttons keys used: {len(used)} | manifest: {len(manifest)}')
    for label, items in (('MISSING (нет в манифесте)', missing),
                         ('ORPHAN (нет кнопок)', orphan),
                         ('IPA IN MANIFEST', ipa_bad),
                         ('onclick on audio-btn', sorted(set(onclick)))):
        print(f'\n{label}: {len(items)}')
        for x in items[:200]:
            print('  -', x)
    sys.exit(1 if (missing or ipa_bad or onclick) else 0)


if __name__ == '__main__':
    main()
```

- [ ] **Step 4: Прогнать валидатор на текущем состоянии (baseline)**

Run: `python tools/audio_validate.py`
Expected: `MISSING`/`IPA`/`onclick` пусты (текущий аудит это подтверждал). `ORPHAN` может быть непуст — зафиксировать число как baseline; объяснить в отчёте (напр. ключи, зарезервированные под тренажёр). Если найден `onclick` или IPA — это баг, чинить до Фазы 1.

- [ ] **Step 5: Добавить стили инлайн-кнопки в прозе и таблицах**В `site/assets/style.css` рядом с блоком `.ipa-table .audio-btn` (≈ строка 1298) добавить:

```css
.ipa-inline .audio-btn,
td .audio-btn,
li .audio-btn,
p > .audio-btn {
  width: 1.25rem;
  height: 1.25rem;
  margin-left: 0.3rem;
  vertical-align: -0.25em;
}
.ipa-inline .audio-btn svg,
td .audio-btn svg,
li .audio-btn svg,
p > .audio-btn svg {
  width: 0.72rem;
  height: 0.72rem;
}
@media (max-width: 600px) {
  .ipa-inline .audio-btn,
  td .audio-btn,
  li .audio-btn,
  p > .audio-btn {
    width: 1.1rem;
    height: 1.1rem;
  }
}
```

- [ ] **Step 6: Смоук-тест стилей**

Открыть локально одну таблицу-урок (0004) в светлой и тёмной теме, 1080/900/600px — кнопки выровнены, не выпадают из строки. (Кнопки уже есть; правка только косметическая.)

- [ ] **Step 7: Коммит**

```bash
git add tools/audio_audit.py tools/audio_validate.py site/assets/style.css AGENTS.md
git commit -m "chore: audio coverage audit + validator + inline play-button styles + conventions"
```

---

### Task 1 (Фаза 1): Введение — уроки 1–3

**Files:**
- Modify: `site/lessons/0001-speech-apparatus.html`
- Modify: `site/lessons/0002-ipa-alphabet.html`
- Modify: `site/lessons/0003-sound-classification.html`
- Modify: `site/assets/audio-manifest.js`
- Modify: `AGENTS.md` (конвенция — Step 1b)

**Interfaces:**
- Consumes: `tools/audio_audit.py`, `tools/audio_validate.py` (Task 0), движок `audio.js`.

- [ ] **Step 1: Инвентаризация страниц фазы**

Run: `python tools/audio_audit.py --csv tools/audio_inventory.csv`
Выписать конкретные примеры (слово + транскрипция) для 0001, 0002, 0003. Для 0003 проверить, что не является голой фонемой.

- [ ] **Step 2: Подключить скрипты в `<head>` трёх уроков**

После `<script src="../assets/theme.js"></script>` добавить:
```html
  <script src="../assets/audio-manifest.js" defer></script>
  <script src="../assets/audio.js" defer></script>
```
Статус подключения (2026-09-30): есть в 0004–0013, 0015–0021, 0034, 0035, `ipa-chart`, тренажёре, `recorder.html`. Нет — во всех остальных страницах; задачи фаз добавляют по мере необходимости.

- [ ] **Step 1b: Зафиксировать конвенции в `AGENTS.md`**

В раздел «Аудио-слой и озвучка» добавить пункты:
- **Каждый пример произношения с транскрипцией** (слово/фраза/предложение рядом с `word /wɜːd/` или `[wɜːd]`) обязан иметь кнопку `.audio-btn[data-audio-key]` сразу после транскрипции — при создании нового урока и при правке существующего.
- **Голые фонемы** (`/j/`, `/ə/`, `/ɹ/` как обозначение звука без слова) кнопок не получают.
- Кнопка размещается **внутри** блочного элемента (`<td>`, `<li>`, `<p>`, карточка), не между закрывающими тегами строки/ячейки.
- Перед коммитом любой правки запускать `python tools/audio_validate.py` (0 missing/IPA/onclick).

Это делает правило обязательным для будущих уроков (см. решение 5).

- [ ] **Step 3: Добавить ключи в `site/assets/audio-manifest.js`**

Для каждого слова/фразы-примера — запись `'word': {text: 'word.'}` (ключи по конвенции; пары — `'word1-word2': {text: 'word1. word2.'}`). Существующие ключи не дублировать.

- [ ] **Step 4: Вставить кнопки**

Канонический сниппет после транскрипции (внутри `<td>`/`<li>`/`<p>`/`.ipa`-обёртки), `data-audio-key` = ключ шага 3. Для голых фонем — **без кнопки**.

- [ ] **Step 5: Верификация**

Run: `python tools/audio_validate.py`
Expected: `MISSING`=0, `IPA IN MANIFEST`=0, `onclick`=0.
Run: python-чекер ссылок из `AGENTS.md` — `Broken links: 0`.
Ручная проверка: открыть 3 страницы, нажать 2–3 кнопки — голос en-US, состояние `playing`, повторное нажатие стоп.

- [ ] **Step 6: Коммит**

```bash
git add site/lessons/0001-speech-apparatus.html site/lessons/0002-ipa-alphabet.html site/lessons/0003-sound-classification.html site/assets/audio-manifest.js
git commit -m "feat(audio): play buttons for transcription examples in lessons 1-3"
```

---

### Task 2 (Фаза 2): Согласные — уроки 4–14 (gap-fill + 0014 полностью)

**Files:**
- Modify: `site/lessons/0004-plosives-p-b.html` … `site/lessons/0014-approximant-y.html` (11 файлов)
- Modify: `site/assets/audio-manifest.js`

**Interfaces:**
- Consumes: Task 0 tools.

- [ ] **Step 1: Gap-аудит каждого урока 0004–0014**

Run: `python tools/audio_audit.py --csv tools/audio_inventory.csv`
Для каждой страницы сверить: сколько транскрипций-примеров и сколько кнопок; выписать непокрытые. Учесть, что в 0004–0013 часть кнопок стоит **вне** `<td>` — это чинится в Step 3.

- [ ] **Step 2: Нормализовать существующие кнопки**

В 0004–0013 перенести кнопки из позиции между `</td>` и `</tr>` внутрь `<td>`, сразу после транскрипции. Проверить `aria-label`/`data-audio-key` на соответствие примеру.

- [ ] **Step 3: Добавить скрипты в `<head>` уроков, где их нет**

`0014` (и любой урок фазы без аудио) — добавить два `<script ... defer>`.

- [ ] **Step 4: Дописать ключи в манифест**

По каждому новому примеру (в т.ч. от 0014: yes, you, yellow, yet, your, year, use, union, beauty, music, few, cute, tune, duke, suit, new, assume, pure, cure, lieu …). Пары (tune/duke и т.п., если подаются вместе) — составные ключи.

- [ ] **Step 5: Вставить недостающие кнопки**

Канонический сниппет рядом с каждым примером (карточки `.y-word-card`, таблицы, инлайн-списки, упражнения). Голые фонемы — без кнопки.

- [ ] **Step 6: Верификация**

Run: `python tools/audio_validate.py` → 0 missing/IPA/onclick; python-чекер ссылок → 0.
Ручная: по одному примеру в 0004, 0012, 0014 (мобильный вид + тёмная тема).

- [ ] **Step 7: Коммит**

```bash
git add site/lessons/0004-plosives-p-b.html site/lessons/0005-plosives-t-d.html site/lessons/0006-fricatives-th.html site/lessons/0007-fricatives-f-v.html site/lessons/0008-fricatives-s-z.html site/lessons/0009-fricatives-sh-zh-h.html site/lessons/0010-affricates-ch-j.html site/lessons/0011-nasals-m-n-ng.html site/lessons/0012-approximant-r.html site/lessons/0013-lateral-l-w.html site/lessons/0014-approximant-y.html site/assets/audio-manifest.js
git commit -m "feat(audio): complete play buttons for consonants lessons 4-14"
```

---

### Task 3 (Фаза 3): Гласные — уроки 15–22 (gap-fill + 0022 полностью)

**Files:**
- Modify: `site/lessons/0015-vowels-i-long.html` … `site/lessons/0022-vowels-schwa-r.html` (8 файлов)
- Modify: `site/assets/audio-manifest.js`

- [ ] **Step 1: Gap-аудит 0015–0022** — `python tools/audio_audit.py --csv tools/audio_inventory.csv`; выписать непокрытое; отдельно 0022 (карточки `.schwa-example`, `.stress-box`, таблицы).

- [ ] **Step 2: Подключить скрипты в 0022** (в других уроках фазы уже есть — проверить grep).

- [ ] **Step 3: Дописать ключи в манифест** (about, banana, problem, sofa, camera, comfortable, doctor, lemon, photograph, photography … и непокрытое из 0015–0021).

- [ ] **Step 4: Вставить кнопки** — канонический сниппет; в `.stress-comparison` кнопка к правильному варианту (banana /bəˈnænə/), «русский» вариант не озвучивать.

- [ ] **Step 5: Верификация** — `python tools/audio_validate.py` (0 missing/IPA/onclick); чекер ссылок 0; ручная проверка 0022 и одной карточной страницы.

- [ ] **Step 6: Коммит**

```bash
git add site/lessons/0015-vowels-i-long.html site/lessons/0016-vowels-e-ae.html site/lessons/0017-vowels-uh-ah.html site/lessons/0018-vowels-u-uh.html site/lessons/0019-vowels-aw-oh.html site/lessons/0020-vowels-ah-aw.html site/lessons/0021-diphthongs.html site/lessons/0022-vowels-schwa-r.html site/assets/audio-manifest.js
git commit -m "feat(audio): complete play buttons for vowels lessons 15-22"
```

---

### Task 4 (Фаза 4): Связность речи — уроки 23–27 (полностью)

**Files:**
- Modify: `site/lessons/0023-clusters.html`, `0024-linking.html`, `0025-elision-reductions.html`, `0026-syllable-stress.html`, `0027-word-stress.html`
- Modify: `site/assets/audio-manifest.js`

- [ ] **Step 1: Инвентаризация 0023–0027.** Здесь примеры — слова, **словосочетания и предложения** (`pick‿up`, `far away`, `I picked up a book…`). Выписать каждую пару «орфография + транскрипция».

- [ ] **Step 2: Подключить скрипты в `<head>` пяти уроков.**

- [ ] **Step 3: Дописать ключи** (слово — `text: 'word.'`; связка — `text: 'pick up.'`; предложение — полный текст с пунктуацией для естественной паузы).

- [ ] **Step 4: Вставить кнопки** после транскрипций в таблицах linking (0024), в диктантах и упражнениях. В 0026/0027 кнопку ставить у слова-примера, а не у схемы ударения (схемы `TE-Un-Un` — без кнопки).

- [ ] **Step 5: Верификация** — `python tools/audio_validate.py`; чекер ссылок 0; прослушать 3 длинных фразы (0024 предложения) — TTS не «глотает» слова.

- [ ] **Step 6: Коммит**

```bash
git add site/lessons/0023-clusters.html site/lessons/0024-linking.html site/lessons/0025-elision-reductions.html site/lessons/0026-syllable-stress.html site/lessons/0027-word-stress.html site/assets/audio-manifest.js
git commit -m "feat(audio): play buttons for connected-speech lessons 23-27"
```

---

### Task 5 (Фаза 5): Связная речь — уроки 28–32 (выборочно)

**Files:**
- Modify: `site/lessons/0028-sentence-stress.html`, `0029-intonation.html`, `0030-rhythm-timing.html`, `0031-thought-groups.html`, `0032-connected-speech.html`
- Modify: `site/assets/audio-manifest.js`

- [ ] **Step 1: Инвентаризация.** В 0029 примеры поданы стрелками (`.ipa` = `↘`/`↗`), транскрипций почти нет. Решить по каждому примеру, есть ли слово/фраза для озвучки; если да — кнопка, если только интонационный контур — нет.

- [ ] **Step 2: Подключить скрипты в `<head>` страниц, где будут кнопки.**

- [ ] **Step 3: Добавить ключи и кнопки** для реальных примеров (0028: редуцированные/полные формы `can`, `that`, `have to`; 0030: ритмические фразы). Контуры и схемы — без кнопок.

- [ ] **Step 4: Верификация** — `python tools/audio_validate.py`; чекер ссылок 0.

- [ ] **Step 5: Коммит**

```bash
git add site/lessons/0028-sentence-stress.html site/lessons/0029-intonation.html site/lessons/0030-rhythm-timing.html site/lessons/0031-thought-groups.html site/lessons/0032-connected-speech.html site/assets/audio-manifest.js
git commit -m "feat(audio): play buttons for connected-speech lessons 28-32"
```

---

### Task 6 (Фаза 6): Автоматизм и финал — уроки 33–38

**Files:**
- Modify: `site/lessons/0034-minimal-pairs.html`, `0035-problem-sounds.html` (gap-fill)
- Modify: `site/lessons/0038-final-assessment.html` (полностью)
- Modify: `site/lessons/0033-shadowing.html`, `0036-prosody-conversation.html`, `0037-reading-aloud.html` — только если в них найдутся примеры с транскрипцией
- Modify: `site/assets/audio-manifest.js`

- [ ] **Step 1: Gap-аудит 0034/0035; инвентаризация 0038.** В 0038 транскрипции (49) — часть в заданиях самооценки; добавить кнопки-образцы там, где это уместно (не превращая проверочный материал в подсказку — примеры-образцы допустимы, тестовые задания нет).

- [ ] **Step 2: Подключить скрипты в 0038** (в 0034/0035 уже есть).

- [ ] **Step 3: Ключи + кнопки.**

- [ ] **Step 4: Верификация** — `python tools/audio_validate.py`; чекер ссылок 0.

- [ ] **Step 5: Коммит**

```bash
git add site/lessons/0034-minimal-pairs.html site/lessons/0035-problem-sounds.html site/lessons/0038-final-assessment.html site/assets/audio-manifest.js
git commit -m "feat(audio): complete play buttons for lessons 33-38"
```

---

### Task 7 (Фаза 7): Общие страницы, справочник, тренажёр (включён в объём)

**Files:**
- Modify: `site/index.html`, `site/plan.html`, `site/mission.html`
- Modify: `site/reference/ipa-chart.html` (gap-fill)
- Modify: `site/workout/index.html`, `site/workout/*.html` (gap-fill, если включено)
- Modify: `site/assets/audio-manifest.js`

- [ ] **Step 1: Инвентаризация** общих страниц и `ipa-chart`; выписать примеры без кнопок.

- [ ] **Step 2: `ipa-chart` gap-fill** — у каждой строки звука кнопка уже есть; проверить, что все примерные слова озвучены, и добить пропуски. Ключи `ipa-*` не переиспользовать для уроков.

- [ ] **Step 3: `index.html`/`plan.html`/`mission.html`** — подключить скрипты, кнопки только у явных примеров «слово + транскрипция» (в оглавлении/обложке кнопок не плодить).

- [ ] **Step 4: Тренажёр (включён в объём)** — gap-fill кнопок в карточках/фразах; ASCII `r` в IPA тренажёра не трогать; ключи тренажёра не конфликтуют с ключами уроков (существующие ключи переиспользовать при совпадении текста).

- [ ] **Step 5: Верификация** — `python tools/audio_validate.py`; чекер ссылок 0; проверка, что existing-orfan список не вырос.

- [ ] **Step 6: Коммит**

```bash
git add site/index.html site/plan.html site/mission.html site/reference/ipa-chart.html site/workout site/assets/audio-manifest.js
git commit -m "feat(audio): play buttons on overview pages, ipa-chart and workout"
```

---

### Task 8 (Фаза 8): Финальная верификация и обновление документации

**Files:**
- Modify: `AGENTS.md`, `AUDIT.md`

- [ ] **Step 1: Полный прогон валидатора**

Run: `python tools/audio_validate.py`
Expected: `MISSING`=0, `IPA IN MANIFEST`=0, `onclick`=0, `ORPHAN`=0 (или объяснённый остаток).

- [ ] **Step 2: Полный чекер ссылок и src**

Run: python-однострочник из `AGENTS.md`.
Expected: `Broken links: 0`.

- [ ] **Step 3: Проверка канона нотации**

Run: grep по `site/` паттерна `ər|əɹ|ɜː|əʊ|ɒ|ɝː|wɔːt̬`.
Expected: только намеренные RP-контексты (0024, 0002), иначе пусто.

- [ ] **Step 4: Ручной смоук (выборка)**

5–7 страниц из разных фаз, светлая/тёмная тема, 1080/600px: кнопка рядом с каждым примером, играет нужное слово, голые фонемы без кнопок, квизы работают, рекордер не задет.

- [ ] **Step 5: Обновить `AUDIT.md`** (добавить подраздел 8.6 «Полное покрытие транскрипций кнопками») и уточнить `AGENTS.md` (итог покрытия; конвенция шаблона уже внесена в Task 0 Step 1b).

- [ ] **Step 6: Коммит**

```bash
git add AGENTS.md AUDIT.md
git commit -m "docs: record full transcription-audio coverage (AUDIT 8.6)"
```

---

## Self-Review

- **Покрытие спека:** спец = «кнопка плей у каждого примера произношения с транскрипцией на всех страницах (кроме голых фонем)». Tasks 1–7 покрывают все группы страниц (уроки 1–38 по фазам курса + общие/справочник/тренажёр). Task 0 даёт инструменты, конвенцию в `AGENTS.md` (обязательную для будущих уроков) и стили, Task 8 — сквозную верификацию и docs.
- **Плейсхолдеры:** в задачах нет «TBD»; в Task 0 приведён рабочий код инструментов и CSS; сниппет кнопки и правила ключей заданы дословно. Конкретные слова для каждой страницы выясняются шагом инвентаризации Task 0 (данные, а не заглушка).
- **Согласованность:** имена файлов, селектор `.audio-btn[data-audio-key]`, API `Audio`/`Manifest`, пути скриптов едины во всех задачах; порядок «сначала манифест, потом кнопка» соблюдён везде.
- **Review Focus → тесты:** голые фонемы (Task 1 Step 4, Task 2 Step 5), чужие слова (Task 2 Step 2 `aria-label`), существующий интерактив (Task 2 Step 6, Task 8 Step 4), мобильный/тёмная тема (Task 0 Step 6, Task 8 Step 4), омографы/дубли (Task 0 Step 4 + валидатор), «лес» кнопок на обзорах (Task 7 Step 3), будущие уроки (конвенция Task 0 Step 1b + обязательный прогон валидатора).

## Handoff

План сохранён в `docs/superpowers/plans/2026-09-30-transcription-play-buttons.md`. Решения зафиксированы: голые фонемы — без кнопок; тренажёр включён; gap-fill по всем существующим урокам; конвенция обязательна для будущих уроков.
