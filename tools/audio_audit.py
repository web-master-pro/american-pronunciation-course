"""Инвентаризация транскрипций и покрытия кнопками озвучки (только dev).

Печатает по каждой странице число транскрипций и число кнопок озвучки,
а также список кандидатов (file, line, ipa, adjacent-english) — примеров,
рядом с которыми есть английское слово для TTS.

Usage:
    python tools/audio_audit.py [--csv OUT]
"""
import glob
import os
import re
import sys
import csv

IPA = set('ɪʊɛæɑɔʌəɝɚɹðθʃʒŋɡʔʰ̬̩ːˈˌ')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, 'site')

WORD_RE = re.compile(r"[A-Za-z][A-Za-z'’-]*")


def strip_tags(s):
    return re.sub(r'<[^>]+>', ' ', s)


def find_transcriptions(text):
    for m in re.finditer(r'/([^/<>]{1,60})/', text):
        if any(c in IPA for c in m.group(1)):
            yield m.start(), m.end(), m.group(1), 'slash'
    for m in re.finditer(r'\[([^\[\]<>]{1,60})\]', text):
        if any(c in IPA for c in m.group(1)):
            yield m.start(), m.end(), m.group(1), 'bracket'


def adjacent_english(text, start, end):
    """Ближайшее английское слово справа (типично `word /ipa/`) или слева."""
    right = strip_tags(text[end:end + 70])
    words = WORD_RE.findall(right)
    if words:
        return ' '.join(words[:2])
    left = strip_tags(text[max(0, start - 70):start])
    words = WORD_RE.findall(left)
    return ' '.join(words[-2:]) if words else ''


def line_of(text, pos):
    return text.count('\n', 0, pos) + 1


def main():
    rows = []
    candidates = []
    for f in sorted(glob.glob(os.path.join(SITE, '**', '*.html'), recursive=True)):
        t = open(f, encoding='utf-8').read()
        rel = os.path.relpath(f, SITE).replace('\\', '/')
        trans = list(find_transcriptions(t))
        btns = t.count('class="audio-btn"')
        rows.append((rel, len(trans), btns))
        for start, end, ipa, _kind in trans:
            eng = adjacent_english(t, start, end)
            if eng:
                candidates.append((rel, line_of(t, start), ipa, eng))

    w = max(len(r[0]) for r in rows)
    print(f'{"page".ljust(w)}  trans  btns')
    for rel, n, b in rows:
        print(f'{rel.ljust(w)}  {n:>5}  {b:>4}')

    print(f'\ncandidates (transcription + adjacent english): {len(candidates)}')
    for rel, ln, ipa, eng in candidates:
        print(f'  {rel}:{ln}  /{ipa}/  <- {eng}')

    if '--csv' in sys.argv:
        i = sys.argv.index('--csv')
        path = sys.argv[i + 1]
        with open(path, 'w', newline='', encoding='utf-8') as fh:
            wr = csv.writer(fh)
            wr.writerow(['page', 'transcriptions', 'buttons'])
            wr.writerows(rows)
        print('CSV:', path)


if __name__ == '__main__':
    main()
