import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  toBcp47,
  fromBcp47,
  decodeAudios,
  parseTranscript,
  chunkForSpeech,
  uploadType,
  TTS_CHAR_LIMIT,
} from "./sarvam.ts";

describe("uploadType — the MIME string Sarvam will actually accept", () => {
  /* Found by reproducing the real failure, not by reading docs. Sarvam
     string-matches the part's Content-Type against an allowlist. Chrome's
     MediaRecorder stamps blobs `audio/webm;codecs=opus`, which is not on it:
        400 Invalid file type: audio/webm;codecs=opus
     The identical bytes sent as an allowed type transcribe perfectly, so this
     was never a format problem — the codecs parameter alone broke it. */

  test("never passes a browser recording type through unchanged", () => {
    assert.notEqual(uploadType("audio/webm;codecs=opus"), "audio/webm;codecs=opus");
  });

  test("normalises every container a browser can hand us to one allowed type", () => {
    /* Chrome and Firefox record webm/opus; Safari records mp4. Sarvam sniffs
       the real bytes, and application/octet-stream is explicitly on its
       allowlist — so one constant covers every browser without us maintaining
       a per-container mapping that a Safari release could invalidate. */
    for (const recorded of [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
    ]) {
      assert.equal(uploadType(recorded), "application/octet-stream");
    }
  });

  test("survives a browser that reports no mimeType at all", () => {
    /* MediaRecorder.mimeType is "" before the first start() in Chromium, and
       a blob built from those chunks carries an empty type. */
    assert.equal(uploadType(""), "application/octet-stream");
    assert.equal(uploadType(undefined), "application/octet-stream");
  });
});

describe("language codes", () => {
  test("maps the app's languages to Sarvam's BCP-47", () => {
    assert.equal(toBcp47("hi"), "hi-IN");
    assert.equal(toBcp47("mr"), "mr-IN");
    assert.equal(toBcp47("en"), "en-IN");
  });

  test("hinglish speaks as Hindi — Sarvam has no code for it", () => {
    /* She types romanised Hindi, but there is no hi-Latn voice. Hindi is the
       language she is actually speaking. */
    assert.equal(toBcp47("hinglish"), "hi-IN");
  });

  test("reads Sarvam's code back", () => {
    assert.equal(fromBcp47("mr-IN"), "mr");
    assert.equal(fromBcp47("hi-IN"), "hi");
    assert.equal(fromBcp47("en-IN"), "en");
  });

  test("an unknown or missing code falls back to English, never throws", () => {
    assert.equal(fromBcp47("ta-IN"), "en");
    assert.equal(fromBcp47(""), "en");
    assert.equal(fromBcp47(undefined), "en");
  });
});

describe("decodeAudios — Sarvam returns base64 JSON, not a stream", () => {
  test("decodes a single clip", () => {
    const wav = Buffer.from("RIFF....WAVEfmt ");
    const buf = decodeAudios({ audios: [wav.toString("base64")] });
    assert.ok(Buffer.isBuffer(buf));
    assert.equal(buf.toString(), "RIFF....WAVEfmt ");
  });

  test("returns null rather than throwing on a shape we do not recognise", () => {
    for (const bad of [null, undefined, {}, { audios: [] }, { audios: null }, "nope", 42]) {
      assert.equal(decodeAudios(bad), null, `should reject ${JSON.stringify(bad)}`);
    }
  });

  test("survives base64 that is not valid", () => {
    /* Buffer.from is lenient, so the guard is on shape rather than content —
       what must not happen is a throw reaching the route. */
    assert.doesNotThrow(() => decodeAudios({ audios: ["!!!not base64!!!"] }));
  });
});

describe("parseTranscript", () => {
  test("reads a Saarika response", () => {
    const r = parseTranscript({
      request_id: "x",
      transcript: "मला पैठणी साडी दाखवा",
      language_code: "mr-IN",
    });
    assert.equal(r?.text, "मला पैठणी साडी दाखवा");
    assert.equal(r?.language, "mr");
  });

  test("carries language_probability through as confidence when present", () => {
    const r = parseTranscript({ transcript: "hi", language_code: "hi-IN", language_probability: 0.66 });
    assert.equal(r?.confidence, 0.66);
  });

  test("defaults confidence when Sarvam omits it — Saarika does", () => {
    const r = parseTranscript({ transcript: "hi", language_code: "hi-IN" });
    assert.equal(typeof r?.confidence, "number");
  });

  test("rejects an empty transcript — silence is not a message", () => {
    assert.equal(parseTranscript({ transcript: "", language_code: "mr-IN" }), null);
    assert.equal(parseTranscript({ transcript: "   ", language_code: "mr-IN" }), null);
  });

  test("returns null on a malformed payload rather than throwing", () => {
    for (const bad of [null, undefined, {}, "nope", { language_code: "mr-IN" }]) {
      assert.equal(parseTranscript(bad), null);
    }
  });

  test("trims the transcript", () => {
    assert.equal(parseTranscript({ transcript: "  hello  ", language_code: "en-IN" })?.text, "hello");
  });
});

describe("chunkForSpeech — the agent's replies are longer than one request allows", () => {
  test("short text stays as one chunk", () => {
    assert.deepEqual(chunkForSpeech("Namaste!"), ["Namaste!"]);
  });

  test("no chunk exceeds the limit", () => {
    const long = "Yeh saree bahut sundar hai. ".repeat(60);
    for (const c of chunkForSpeech(long)) {
      assert.ok(c.length <= TTS_CHAR_LIMIT, `chunk of ${c.length} exceeds ${TTS_CHAR_LIMIT}`);
    }
  });

  test("splits on sentence boundaries, not mid-word", () => {
    const text = "Pehla vaakya hai. Dusra vaakya hai. Teesra vaakya hai.";
    for (const c of chunkForSpeech(text, 25)) {
      assert.ok(!/^\s|\s$/.test(c), `chunk has loose whitespace: "${c}"`);
    }
  });

  test("nothing is lost — every word survives the split", () => {
    const text = "Ek do teen. Chaar paanch chhe. Saat aath nau. Das gyarah barah.";
    const joined = chunkForSpeech(text, 20).join(" ");
    for (const w of text.split(/\s+/)) assert.ok(joined.includes(w), `lost "${w}"`);
  });

  test("a single word longer than the limit is still emitted, not dropped", () => {
    const [c] = chunkForSpeech("a".repeat(60), 20);
    assert.ok(c.length > 0);
  });

  test("empty input produces no chunks", () => {
    assert.deepEqual(chunkForSpeech(""), []);
    assert.deepEqual(chunkForSpeech("   "), []);
  });

  test("splits Devanagari on its full stop too", () => {
    const text = "मला साडी दाखवा। किंमत काय आहे। धन्यवाद।";
    const chunks = chunkForSpeech(text, 20);
    assert.ok(chunks.length > 1, "danda should be a boundary");
  });
});
