"""Create the MIDI, then read it back to derive every synchronization event.
Run from repository root: python3 scripts/music/build_anton.py
No third-party Python packages required.
"""
import hashlib
import json
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/audio/day24'
SOURCE = ROOT / 'scripts/music/anton-soprano.score.json'
PPQ = 480
SAMPLE_RATE = 48000
TAIL_MS = 2500


def vlq(value):
    result = [value & 127]
    while value >> 7:
        value >>= 7
        result.insert(0, (value & 127) | 128)
    return bytes(result)


def pitch_number(name):
    return (int(name[-1]) + 1) * 12 + {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}[name[0]] - ('b' in name)


def meta(kind, body):
    return bytes([255, kind]) + vlq(len(body)) + body


def read_midi(path):
    """Read our format-0 MIDI, including note-offs, tempo, and measure markers."""
    data = path.read_bytes()
    assert data[:4] == b'MThd'
    _, form, tracks, division = struct.unpack('>IHHH', data[4:14])
    assert (form, tracks, division) == (0, 1, PPQ)
    assert data[14:18] == b'MTrk'
    end = 22 + int.from_bytes(data[18:22], 'big')
    cursor, tick = 22, 0
    active, notes, boundaries = {}, [], []
    tempo = program = end_tick = None

    def read_vlq():
        nonlocal cursor
        number = 0
        while True:
            byte = data[cursor]
            cursor += 1
            number = (number << 7) | (byte & 127)
            if byte < 128:
                return number

    while cursor < end:
        tick += read_vlq()
        status = data[cursor]
        cursor += 1
        if status == 255:
            kind = data[cursor]
            cursor += 1
            size = read_vlq()
            body = data[cursor:cursor + size]
            cursor += size
            if kind == 0x51:
                assert tempo is None, 'Tempo changes are not allowed.'
                tempo = int.from_bytes(body, 'big')
            elif kind == 6:
                marker = json.loads(body)
                boundaries.append({**marker, 'startTick': tick})
            elif kind == 0x2f:
                end_tick = tick
        elif status == 0xc0:
            program = data[cursor]
            cursor += 1
        elif status in (0x90, 0x80):
            pitch, velocity = data[cursor:cursor + 2]
            cursor += 2
            if status == 0x90 and velocity:
                assert pitch not in active
                active[pitch] = (tick, velocity)
            else:
                start, velocity = active.pop(pitch)
                notes.append({'midiPitch': pitch, 'onsetTick': start, 'durationTicks': tick - start, 'velocity': velocity})
        else:
            raise ValueError(f'Unsupported MIDI status {status:x}')
    assert not active and tempo and end_tick is not None
    notes.sort(key=lambda note: note['onsetTick'])
    return notes, boundaries, tempo, program, end_tick


def build():
    score = json.loads(SOURCE.read_text())
    micros = round(60_000_000 / score['tempoBpm'])
    timeline = [(16, 0, [(score['pickup']['pitch'], 1)])]
    timeline += [(m, 1, score['measures'][str(m)]) for m in range(17, 33)]
    timeline += [(m, 2, score['measures'][str(m)]) for m in [*range(17, 31), 33, 34]]
    events = [(0, 0, meta(0x51, micros.to_bytes(3, 'big'))),
              (0, 0, meta(0x58, bytes([3, 2, 24, 8]))),
              (0, 0, meta(0x59, bytes([255, 0]))),
              (0, 0, meta(3, b'Anton - soprano / celesta')),
              (0, 0, bytes([0xc0, 8]))]
    tick = 0
    for index, (measure, repeat_pass, content) in enumerate(timeline):
        assert sum(duration for _, duration in content) == (1 if measure == 16 else 3)
        marker = {'sourceMeasure': measure, 'repeatPass': repeat_pass, 'performanceMeasure': index, 'sourceStartBeat': 3 if measure == 16 else 1}
        events.append((tick, 1, meta(6, json.dumps(marker).encode())))
        for pitch, duration in content:
            length = round(duration * PPQ)
            events.extend([(tick, 3, bytes([0x90, pitch_number(pitch), 76])),
                           (tick + length, 0, bytes([0x80, pitch_number(pitch), 0]))])
            tick += length
    events.append((tick, 4, meta(0x2f, b'')))
    track, previous = bytearray(), 0
    for at, _, payload in sorted(events, key=lambda e: (e[0], e[1])):
        track.extend(vlq(at - previous) + payload)
        previous = at
    OUT.mkdir(parents=True, exist_ok=True)
    midi_path = OUT / 'anton-soprano.mid'
    midi_path.write_bytes(b'MThd' + struct.pack('>IHHH', 6, 0, 1, PPQ) + b'MTrk' + struct.pack('>I', len(track)) + track)

    # Nothing below uses the original note list to calculate timing.
    notes, measures, tempo, program, end_tick = read_midi(midi_path)
    ms = lambda ticks: ticks * tempo / PPQ / 1000
    names = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
    for i, measure in enumerate(measures):
        stop = measures[i + 1]['startTick'] if i + 1 < len(measures) else end_tick
        measure.update(endTick=stop, onsetMs=ms(measure['startTick']), durationMs=ms(stop - measure['startTick']))
    for i, note in enumerate(notes):
        measure = next(m for m in measures if m['startTick'] <= note['onsetTick'] < m['endTick'])
        p = note['midiPitch']
        note.update(id=i, pitch=f'{names[p % 12]}{p // 12 - 1}', onsetMs=ms(note['onsetTick']), durationMs=ms(note['durationTicks']),
                    onsetSample=round(ms(note['onsetTick']) * SAMPLE_RATE / 1000),
                    durationSamples=round(ms(note['durationTicks']) * SAMPLE_RATE / 1000),
                    sourceMeasure=measure['sourceMeasure'], repeatPass=measure['repeatPass'],
                    beat=measure['sourceStartBeat'] + (note['onsetTick'] - measure['startTick']) / PPQ)
    assert len(notes) == 110 and end_tick == 97 * PPQ
    assert notes[0]['pitch'] == 'C5' and notes[0]['onsetMs'] == 0 and notes[0]['durationMs'] == 500
    assert notes[-1]['pitch'] == 'F5' and notes[-1]['durationMs'] == 1500
    assert all(a['onsetTick'] + a['durationTicks'] == b['onsetTick'] for a, b in zip(notes, notes[1:]))
    result = {
        'schemaVersion': 1, 'title': score['title'], 'voice': score['voice'],
        'sourceScore': score['source'], 'sourceMidi': midi_path.name,
        'midiSha256': hashlib.sha256(midi_path.read_bytes()).hexdigest(),
        'tempoBpm': 60_000_000 / tempo, 'microsecondsPerQuarter': tempo,
        'ticksPerQuarter': PPQ, 'timeSignature': score['timeSignature'],
        'keySignature': score['keySignature'], 'instrument': {'name': 'Celesta', 'midiProgramZeroBased': program},
        'totalDurationMs': ms(end_tick), 'audioDurationMs': ms(end_tick) + TAIL_MS,
        'audioTailMs': TAIL_MS, 'audioFile': 'anton-celesta.wav', 'sampleRate': SAMPLE_RATE,
        'timingOrigin': 'Audio frame 0 = MIDI tick 0 = pickup An-. Note durations are score/MIDI gate durations; sample decay may extend beyond note-off.',
        'pickup': score['pickup'], 'repeats': score['repeat'],
        'performanceOrder': [m['sourceMeasure'] for m in measures],
        'decisions': [score['tempoNote'], score['endingDecision'], score['fermataDecision']],
        'uncertainNotes': [], 'rests': [], 'restNote': score['restNote'],
        'measures': measures, 'notes': notes,
    }
    (OUT / 'anton-timing.json').write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n')
    print(f'Wrote MIDI and MIDI-derived JSON: {len(notes)} notes, {ms(end_tick)} ms + {TAIL_MS} ms decay.')


if __name__ == '__main__':
    build()
