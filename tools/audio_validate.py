"""Валидатор аудио-слоя: ключи, манифест, onclick, IPA в манифесте (только dev).

Проверяет:
  * MISSING  — ключ, используемый кнопкой, отсутствует в манифесте;
  * ORPHAN   — запись манифеста, не используемая ни одной кнопкой;
  * IPA      — IPA-символы в тексте манифеста (TTS их не читает);
  * onclick  — inline-обработчик на .audio-btn (запрещён AGENTS.md).

Exit: 0, если MISSING/IPA/onclick пусты; иначе 1. ORPHAN на exit не влияет.

Usage:
    python tools/audio_validate.py
"""
import glob
import os
import re
import sys

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
