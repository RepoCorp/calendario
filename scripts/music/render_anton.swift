// Offline sample-based rendering of MIDI-derived events, at exact PCM frames.
// swift -module-cache-path /tmp/anton-swift-cache scripts/music/render_anton.swift
import Foundation
import AVFoundation

struct Note: Decodable {
    let midiPitch: UInt8
    let velocity: UInt8
    let onsetSample: Int64
    let durationSamples: Int64
}
struct Instrument: Decodable { let midiProgramZeroBased: UInt8 }
struct Score: Decodable {
    let notes: [Note]
    let sampleRate: Double
    let audioDurationMs: Double
    let instrument: Instrument
}
struct Event {
    let frame: Int64
    let pitch: UInt8
    let velocity: UInt8
    let on: Bool
}
let directory = URL(fileURLWithPath: FileManager.default.currentDirectoryPath).appendingPathComponent("public/audio/day24")
let score = try JSONDecoder().decode(Score.self, from: Data(contentsOf: directory.appendingPathComponent("anton-timing.json")))
let engine = AVAudioEngine()
let sampler = AVAudioUnitSampler()
let reverb = AVAudioUnitReverb()
engine.attach(sampler)
engine.attach(reverb)
let format = AVAudioFormat(standardFormatWithSampleRate: score.sampleRate, channels: 2)!
engine.connect(sampler, to: reverb, format: format)
engine.connect(reverb, to: engine.mainMixerNode, format: format)
reverb.loadFactoryPreset(.mediumHall)
reverb.wetDryMix = 12
let bank = URL(fileURLWithPath: "/System/Library/Components/CoreAudio.component/Contents/Resources/gs_instruments.dls")
try sampler.loadSoundBankInstrument(at: bank, program: score.instrument.midiProgramZeroBased, bankMSB: 0x79, bankLSB: 0)
try engine.enableManualRenderingMode(.offline, format: format, maximumFrameCount: 1024)
try engine.start()
var file: AVAudioFile? = try AVAudioFile(forWriting: URL(fileURLWithPath: "/tmp/anton-celesta-float.wav"), settings: format.settings)
let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: 1024)!
let events = score.notes.flatMap { note in
    [Event(frame: note.onsetSample, pitch: note.midiPitch, velocity: note.velocity, on: true),
     Event(frame: note.onsetSample + note.durationSamples, pitch: note.midiPitch, velocity: 0, on: false)]
}.sorted { $0.frame == $1.frame ? (!$0.on && $1.on) : $0.frame < $1.frame }
var frame: Int64 = 0
var index = 0
var retries = 0
var renderedEvents: [[String: Int64]] = []
let total = Int64((score.audioDurationMs * score.sampleRate / 1000).rounded())
while frame < total {
    while index < events.count && events[index].frame == frame {
        let event = events[index]
        renderedEvents.append(["frame": frame, "midiPitch": Int64(event.pitch), "on": event.on ? 1 : 0])
        if event.on { sampler.startNote(event.pitch, withVelocity: event.velocity, onChannel: 0) }
        else { sampler.stopNote(event.pitch, onChannel: 0) }
        index += 1
    }
    let next = index < events.count ? min(total, events[index].frame) : total
    let count = AVAudioFrameCount(min(1024, next - frame))
    let status = try engine.renderOffline(count, to: buffer)
    switch status {
    case .success:
        guard buffer.frameLength == count else { fatalError("Incomplete render block") }
        try file!.write(from: buffer)
        frame += Int64(count)
        retries = 0
    case .cannotDoInCurrentContext:
        retries += 1
        if retries > 20 { fatalError("Renderer stalled") }
    default: fatalError("Offline render failed: \(status)")
    }
}
engine.stop()
file = nil // Finalize the WAV header before another process reads it.
try JSONSerialization.data(withJSONObject: renderedEvents, options: [.prettyPrinted, .sortedKeys])
    .write(to: URL(fileURLWithPath: "/tmp/anton-rendered-events.json"))
print("Rendered \(frame) frames at \(score.sampleRate) Hz; \(events.count) note events.")
