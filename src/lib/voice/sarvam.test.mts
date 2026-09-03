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
  TTS_SPEAKER,
  BULBUL_V3_SPEAKERS,
} from "./sarvam.ts";

describe("TTS_SPEAKER — her voice is pinned, not inherited", () => {
  /* Two failures this guards against, both of which would be silent.

     A speaker Sarvam does not accept returns 400, and textToSpeech answers a
     400 with null, which the route turns into an empty body — so a typo here
     costs the whole voice with no error anywhere, exactly the way the
     microphone's MIME string did.

     And leaving it unset is what made her male in the first place: Sarvam
     picks a default, and a model update is free to change which one. */

  test("is set at all — an unset speaker is how she ended up male", () => {
    assert.ok(TTS_SPEAKER, "a speaker must be pinned explicitly");
  });

  test("is a speaker bulbul:v3 actually accepts", () => {
    /* The roster was read off the live API. The 44-name list an unrecognised
       speaker returns spans every Sarvam model; v3 takes a subset, and
       anushka, vidya, manisha and arya are all rejected by it. */
    assert.ok(
      BULBUL_V3_SPEAKERS.includes(TTS_SPEAKER),
      `${TTS_SPEAKER} is not on the verified bulbul:v3 roster`,
    );
  });
});

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

describe("chunkForSpeech — a small first chunk, so she starts talking sooner", () => {
  /* Sarvam's latency scales with input length, so the first thing she says has
     to be short or there is dead air before any sound. Everything after it is
     fetched while the previous clip plays, where its cost is hidden. */

  test("the first chunk obeys its own smaller limit", () => {
    const text = "Pehla vaakya. Dusra vaakya thoda lamba hai. Teesra bhi hai yahan.";
    const [first] = chunkForSpeech(text, 300, 20);
    assert.ok(first.length <= 20, `first chunk was ${first.length}: "${first}"`);
  });

  test("later chunks use the larger limit — fewer requests once she is talking", () => {
    const sentence = "Yeh saree bahut sundar hai. ";
    const chunks = chunkForSpeech(sentence.repeat(20), 300, 30);
    assert.ok(chunks.length > 1);
    assert.ok(chunks[0].length <= 30, "first stays small");
    assert.ok(
      chunks.slice(1).some((c) => c.length > 30),
      "later chunks should pack more than the first limit allows",
    );
  });

  test("nothing is lost to the split — every word still survives", () => {
    const text = "Ek do teen. Chaar paanch chhe. Saat aath nau. Das gyarah barah.";
    const joined = chunkForSpeech(text, 40, 15).join(" ");
    for (const w of text.split(/\s+/)) assert.ok(joined.includes(w), `lost "${w}"`);
  });

  test("a short reply is still a single chunk", () => {
    assert.deepEqual(chunkForSpeech("Namaste!", 300, 120), ["Namaste!"]);
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
