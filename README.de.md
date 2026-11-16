# magpie-breeze-blue

## 1. Was es ist

`magpie-breeze-blue` ist eine [Breeze Blue](https://breezeblue.ai/)-TTS-Anbietererweiterung für Magpie. Sie wandelt die OpenAI-kompatiblen `POST /v1/audio/speech`-Anfragen des Magpie-Gateways in Breeze' offizielle [`/v1/text-to-speech/{voice_id}`](https://docs.breezeblue.ai/api-reference/text-to-speech/convert-text-to-speech)-Anfragen um und zeigt das Breeze-Guthaben über `auth.usage` auf der Anbieterkarte und der Nutzungsseite von Magpie an.

- Provider-ID: `breeze`
- Anzeigename: `BreezeBlue`
- Modell: `breeze-tts-2` (Anzeigename `Breeze TTS 2`, Eingabe `text`, Ausgabe `audio`)
- UI-Texte: `en` / `zh` / `zh-TW` / `ja` / `de`, sonst Englisch
- Einziges Netzwerkziel: `https://api.breeze.blue`
- Symbol: `magpie.icon` verweist auf das offizielle `https://breezeblue.ai/favicon.png` von BreezeBlue; es wird nicht mitgeliefert. Das Symbol gehört BreezeBlue. Wenn der Anbieter die Nutzung durch Dritte nicht wünscht, entferne das Feld oder verwende ein eigenes Symbol.
- README-Sprachen: `README.md` (English), `README.zh-CN.md`, `README.zh-TW.md`, `README.ja.md`, `README.de.md`

## 2. Installation

Im Projektordner ausführen:

```bash
magpie plugin add ./            # lokaler Ordner
# oder nach der Veröffentlichung: magpie plugin add magpie-breeze-blue
magpie plugin login breeze
```

Bei der Anmeldung den [Breeze-API-Schlüssel](https://docs.breezeblue.ai/authentication) (`brz_…`) eingeben. Magpie speichert den Schlüssel; in diesem Projekt wird nichts davon geschrieben.

## 3. `/v1/audio/speech` verwenden

Das Magpie-Gateway lauscht standardmäßig auf `http://127.0.0.1:3425`. `breeze/breeze-tts-2` ist als audio-only deklariert und erscheint daher nicht in `/v1/models` oder in der Chat-Modellauswahl von Magpie; `/v1/audio/speech` löst es weiterhin über `provider/model` auf. Der Anfragekörper ist OpenAI-TTS-kompatibel:

```json
{
  "model": "breeze/breeze-tts-2",
  "input": "Gute Nacht.",
  "voice": "voc_...",
  "response_format": "mp3",
  "instructions": "Sag es sanft.",
  "speed": 1.05
}
```

`voice` muss eine echte [Breeze-Stimm-ID](https://docs.breezeblue.ai/api-reference/voices/list-voices) (`voc_…`) im eigenen Konto sein; dieses Projekt enthält keine fest verdrahtete Stimme.

Das passende `curl`:

```bash
curl http://127.0.0.1:3425/v1/audio/speech \
  -H 'content-type: application/json' \
  -d '{"model":"breeze/breeze-tts-2","input":"Gute Nacht.","voice":"voc_...","response_format":"mp3","instructions":"Sag es sanft.","speed":1.05}' \
  --output out.mp3
```

### 3.1 Parameter

| Feld | Erforderlich | Standard | Hinweise |
| --- | --- | --- | --- |
| `input` | ja | — | Vorzulesender Text; eine leere Zeichenkette ergibt 400 |
| `voice` | ja | — | Breeze-Stimm-ID, z. B. `voc_...`; wird als URL-Pfad kodiert |
| `response_format` | nein | `mp3` | Siehe 3.2 für die Zuordnung; unbekannte Werte ergeben `mp3` |
| `speed` | nein | `1` | Auf 0,5–2 begrenzt; bei 1 nicht gesendet |
| `instructions` | nein | nicht gesendet | Hinweise zu Ton oder Emotion |
| `language_code` | nein | `zh` | Breeze-Erweiterung, zweistelliger ISO-639-1-Code |
| `model_id` | nein | `breeze-tts-2` | Breeze-Erweiterung |
| `guidance_scale` | nein | `1` | Breeze-Erweiterung, auf 1–10 begrenzt; bei 1 nicht gesendet |
| `use_speaker_boost` | nein | `false` | Breeze-Erweiterung; nur bei `true` gesendet |

`voice_settings` erscheint nur dann im Breeze-Anfragekörper, wenn `speed`, `guidance_scale` oder `use_speaker_boost` einen vom Standard abweichenden Wert hat.

### 3.2 Formatzuordnung

| `response_format` | Breeze `output_format` |
| --- | --- |
| `mp3` | `mp3` |
| `wav` | `wav_24000` |
| `opus` | `opus` |
| `aac` | `aac_24000_128` |
| `flac` | `flac_24000` |
| `pcm` | `pcm_24000` |
| andere Werte | `mp3` |

Bei Erfolg gibt die Erweiterung die Audiobytes und den `content-type` von Breeze unverändert zurück; fehlt der `content-type`, wird `audio/mpeg` verwendet.

### 3.3 Fehler

Wenn Breeze `{code, detail, error}` zurückgibt, behält die Erweiterung den HTTP-Status bei und wandelt den Körper in die OpenAI-Form um:

```json
{
  "error": {
    "message": "voice not found",
    "type": "invalid_request_error",
    "param": null,
    "code": "invalid_voice"
  }
}
```

Lokale Validierungsfehler ergeben 400; andere Pfade als `/v1/audio/speech` ergeben 404; andere Methoden als POST ergeben 405. Der API-Schlüssel erscheint nie in einer Meldung oder einem Log.

## 4. Guthaben

`auth.usage` ruft [`GET /v1/balance`](https://docs.breezeblue.ai/api-reference/account/get-account-balance) bei Breeze auf und gibt ein Wallet-Fenster für Magpie zurück:

```js
{
  plan: 'BreezeBlue',
  windows: [{ name: 'Balance', balance: 1635.6, unit: 'Credits' }]
}
```

Bei `settlement_pending: true` trägt das Fenster `aside: true`, damit das Routing es nicht als sofort aufbrauchbares Kontingent behandelt. Ein fehlgeschlagener Abruf liefert `windows: []` und eine `error`-Zeichenkette; nichts wird an Magpie weitergereicht.

Das Guthaben erscheint nur auf der Anbieterkarte und der Nutzungsseite von Magpie. Die Nutzungskarte zeigt außerdem ein Fenster für tägliche Credits, das auf [`breezeblue.ai/app`](https://breezeblue.ai/app) zum manuellen Abholen verweist.

### 4.1 UI-Sprachen

- `Balance`, `Credits` und `Manual` sind die englischen Canonical-Namen von Magpie und werden von Magpie in die aktuelle UI-Sprache übersetzt; `display` bleibt eine sprachneutrale URL.
- `auth.methods[].labels` liefert Anmeldetexte für `zh`, `zh-TW`, `ja` und `de`; andere Sprachen fallen auf das englische `label` zurück.
- `magpie.summary` liefert die Erweiterungsbeschreibung für `en`, `zh`, `ja` und `de`; die Discover-Karte von Magpie wählt nach zweistelligem Sprachcode, daher fällt `zh-TW` auf `zh` zurück.

## 5. Netzwerk und Sicherheit

- Die Erweiterung spricht nur mit `https://api.breeze.blue`: `/v1/text-to-speech/{voice_id}` und `/v1/balance`.
- Das eigene `fetch` behandelt nur `/v1/audio/speech`; jeder andere Pfad liefert einen JSON-Fehler und wird nie an Breeze weitergeleitet.
- Anfragen an Breeze tragen nur Breeze' `xi-api-key`; Header wie `authorization` von Magpie werden nicht weitergegeben.
- Der API-Schlüssel erscheint nie in Logs, Fehlermeldungen oder Antwortkörpern.
- Das Paket hat keine npm-Laufzeitabhängigkeiten.

## 6. Kompatibilität

Entwickelt und geprüft gegen Magpie `0.1.4280` und dessen Plugin-Schnittstellen (`config` / `auth.loader` / `auth.usage` / `provider.models`); ältere Versionen sind ungeprüft.

Der Testrunner benötigt Node.js 18 oder neuer; die Erweiterung selbst läuft im Plugin-Host von Magpie.

## 7. Entwicklung und Tests

```bash
node --test
```

Die Tests verwenden `node:test` und injizieren `fetchImpl`, um Anfragezuordnung, Fehlerweitergabe und Guthabenauswertung ohne echtes Breeze-Netzwerk abzudecken.

## 8. Lizenz

MIT, siehe `LICENSE`.
