"""Validate MIDI read-back, JSON, renderer dispatch, and delivered PCM file."""
import hashlib
import json
import math
import wave
from array import array
from pathlib import Path
from build_anton import OUT, read_midi

midi = OUT / 'anton-soprano.mid'
info = json.loads((OUT / 'anton-timing.json').read_text())
notes, measures, tempo, program, end_tick = read_midi(midi)
assert info['midiSha256'] == hashlib.sha256(midi.read_bytes()).hexdigest()
assert len(notes) == len(info['notes']) == 110
assert tempo == 500000 and program == 8 and end_tick == 46560
assert [m['sourceMeasure'] for m in measures] == [16, *range(17,33), *range(17,31), 33, 34]
for midi_note, note in zip(notes, info['notes']):
    for key, value in midi_note.items():
        assert note[key] == value
    assert note['onsetMs'] == midi_note['onsetTick'] * tempo / 480000
    assert note['durationMs'] == midi_note['durationTicks'] * tempo / 480000
    assert note['onsetSample'] == note['onsetMs'] * 48
    assert note['durationSamples'] == note['durationMs'] * 48
    assert note['durationMs'] in (250, 500, 1000, 1500)
expected = []
for note in info['notes']:
    expected += [{'frame': note['onsetSample'], 'midiPitch': note['midiPitch'], 'on': 1},
                 {'frame': note['onsetSample'] + note['durationSamples'], 'midiPitch': note['midiPitch'], 'on': 0}]
expected.sort(key=lambda e: (e['frame'], e['on']))
actual = json.loads(Path('/tmp/anton-rendered-events.json').read_text())
assert actual == expected, 'Renderer must deliver every MIDI-derived note on/off at exactly its PCM frame.'
with wave.open(str(OUT / 'anton-celesta.wav')) as wav:
    assert wav.getframerate() == 48000 and wav.getnchannels() == 2 and wav.getsampwidth() == 2
    frames = wav.getnframes()
    assert frames == round(info['audioDurationMs'] * 48)
    samples = array('h', wav.readframes(frames))
peak = max(abs(s) for s in samples)
assert 0 < peak < 32767
first = next(i//2 for i, sample in enumerate(samples) if abs(sample) > 3)
assert first < 480, 'Opening pickup must start within 10 ms, not after an encoder delay.'
# Check every attack region contains audible signal, including repeated pitches.
for note in info['notes']:
    start = note['onsetSample'] * 2
    assert max(abs(s) for s in samples[start:start + 4800]) > 100
report = {
    'noteCount': len(notes), 'noteOnAndOffDispatchesVerified': len(actual),
    'maximumDispatchTimingErrorSamples': 0, 'sampleRate': 48000,
    'audioFrames': frames, 'audioDurationMs': frames / 48,
    'scoreDurationMs': info['totalDurationMs'],
    'firstSignalAboveNoiseSample': first, 'firstSignalAboveNoiseMs': first / 48,
    'peakDbFS': round(20 * math.log10(peak / 32768), 2),
    'audioSha256': hashlib.sha256((OUT / 'anton-celesta.wav').read_bytes()).hexdigest(),
    'midiSha256': info['midiSha256'],
    'scoreReview': 'Visually checked all soprano measures 16 (beat 3)–34 against PDF pages 2–3, including first and second endings. No uncertain pitches or durations found.',
    'limits': 'Sample-accurate MIDI scheduling does not imply instantaneous acoustic attack or silence at note-off. Celesta sample envelopes and reverb decay naturally. No physical-iPhone listening validation.'
}
(OUT / 'anton-validation.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
