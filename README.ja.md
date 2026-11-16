# magpie-breeze-blue

## 1. これは何か

`magpie-breeze-blue` は Magpie 用の [Breeze Blue](https://breezeblue.ai/) TTS プロバイダープラグインです。Magpie ゲートウェイの OpenAI 互換 `POST /v1/audio/speech` リクエストを Breeze 公式の [`/v1/text-to-speech/{voice_id}`](https://docs.breezeblue.ai/api-reference/text-to-speech/convert-text-to-speech) リクエストに変換し、`auth.usage` で Breeze の残高を Magpie のプロバイダーカード/使用量に表示します。

- provider id: `breeze`
- 表示名: `BreezeBlue`
- モデル: `breeze-tts-2`（表示名 `Breeze TTS 2`、入力 `text`、出力 `audio`）
- UI 文言: `en` / `zh` / `zh-TW` / `ja` / `de`、それ以外は英語
- ネットワーク接続先: `https://api.breeze.blue` のみ
- アイコン: `magpie.icon` は BreezeBlue 公式の `https://breezeblue.ai/favicon.png` を指します。本プロジェクトには同梱しません。アイコンの権利は BreezeBlue に帰属します。公式が第三者利用を望まない場合は、このフィールドを削除するか独自アイコンに差し替えてください。
- README の言語: `README.md`（English）、`README.zh-CN.md`、`README.zh-TW.md`、`README.ja.md`、`README.de.md`

## 2. インストール

プロジェクトのルートで実行します。

```bash
magpie plugin add ./            # ローカルフォルダー
# 公開後: magpie plugin add magpie-breeze-blue
magpie plugin login breeze
```

ログイン時に Breeze の [API キー](https://docs.breezeblue.ai/authentication)（`brz_…`）を入力します。キーは Magpie が保持し、本プロジェクトのファイルには書き込まれません。

## 3. `/v1/audio/speech` の使い方

Magpie ゲートウェイは既定で `http://127.0.0.1:3425` を待ち受けます。`breeze/breeze-tts-2` は audio-only として宣言されているため、`/v1/models` や Magpie のチャットモデル選択には表示されません。`/v1/audio/speech` では `provider/model` で直接解決できます。リクエスト本文は OpenAI TTS 互換です。

```json
{
  "model": "breeze/breeze-tts-2",
  "input": "おやすみなさい。",
  "voice": "voc_...",
  "response_format": "mp3",
  "instructions": "やさしい口調で。",
  "speed": 1.05
}
```

`voice` には Breeze アカウントの実際の[音声 ID](https://docs.breezeblue.ai/api-reference/voices/list-voices)（`voc_…`）を指定してください。本プロジェクトは特定ユーザーの音声をハードコードしません。

対応する `curl`:

```bash
curl http://127.0.0.1:3425/v1/audio/speech \
  -H 'content-type: application/json' \
  -d '{"model":"breeze/breeze-tts-2","input":"おやすみなさい。","voice":"voc_...","response_format":"mp3","instructions":"やさしい口調で。","speed":1.05}' \
  --output out.mp3
```

### 3.1 パラメータ

| フィールド | 必須 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `input` | はい | — | 読み上げるテキスト。空白文字列は 400 |
| `voice` | はい | — | Breeze の音声 ID（例: `voc_...`）。URL パスとしてエンコード |
| `response_format` | いいえ | `mp3` | 3.2 の対応表を参照。不明な値は `mp3` |
| `speed` | いいえ | `1` | 0.5–2 に丸められる。1 のときは送信しない |
| `instructions` | いいえ | 送信しない | 口調や感情の指示 |
| `language_code` | いいえ | `zh` | Breeze 拡張フィールド。ISO 639-1 の 2 文字コード |
| `model_id` | いいえ | `breeze-tts-2` | Breeze 拡張フィールド |
| `guidance_scale` | いいえ | `1` | Breeze 拡張フィールド。1–10 に丸められる。1 のときは送信しない |
| `use_speaker_boost` | いいえ | `false` | Breeze 拡張フィールド。`true` のときだけ送信 |

`voice_settings` は `speed`、`guidance_scale`、`use_speaker_boost` のいずれかが既定値以外のときだけ Breeze のリクエスト本文に現れます。

### 3.2 フォーマット対応

| `response_format` | Breeze `output_format` |
| --- | --- |
| `mp3` | `mp3` |
| `wav` | `wav_24000` |
| `opus` | `opus` |
| `aac` | `aac_24000_128` |
| `flac` | `flac_24000` |
| `pcm` | `pcm_24000` |
| その他 | `mp3` |

成功時は Breeze の音声バイト列と `content-type` をそのまま返します。Breeze が `content-type` を返さない場合は `audio/mpeg` を使います。

### 3.3 エラー

Breeze が `{code, detail, error}` を返した場合、プラグインは HTTP ステータスを維持し、本文を OpenAI 形式に変換します。

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

ローカル検証の失敗は 400、`/v1/audio/speech` 以外のパスは 404、POST 以外のメソッドは 405 を返します。API キーがメッセージやログに含まれることはありません。

## 4. 残高

`auth.usage` は Breeze の [`GET /v1/balance`](https://docs.breezeblue.ai/api-reference/account/get-account-balance) を呼び出し、Magpie の wallet window を返します。

```js
{
  plan: 'BreezeBlue',
  windows: [{ name: 'Balance', balance: 1635.6, unit: 'Credits' }]
}
```

`settlement_pending` が `true` のとき、ウィンドウには `aside: true` が付き、ルーティングが即座に尽きる枠として扱いません。取得に失敗した場合は `windows: []` と `error` 文字列を返し、例外を Magpie の外側へ投げません。

残高は Magpie のプロバイダーカード/使用量にだけ表示されます。使用量カードには、[`breezeblue.ai/app`](https://breezeblue.ai/app) で手動受け取りが必要なデイリークレジットのウィンドウも表示されます。

### 4.1 UI の多言語対応

- `Balance`、`Credits`、`Manual` は Magpie の英語の正規名で、Magpie が現在の UI 言語に翻訳します。`display` は言語に依存しない URL のままです。
- `auth.methods[].labels` は `zh`、`zh-TW`、`ja`、`de` のログイン文言を提供します。それ以外の言語は英語の `label` を使います。
- `magpie.summary` は `en`、`zh`、`ja`、`de` のプラグイン概要を提供します。Magpie の Discover カードは 2 文字の言語コードで選ぶため、`zh-TW` は `zh` にフォールバックします。

## 5. ネットワークとセキュリティ

- プラグインが接続するのは `https://api.breeze.blue` の `/v1/text-to-speech/{voice_id}` と `/v1/balance` だけです。
- カスタム `fetch` は `/v1/audio/speech` だけを処理します。それ以外のパスは JSON エラーを返し、Breeze へ転送しません。
- Breeze へのリクエストには Breeze の `xi-api-key` だけを付けます。Magpie が受け取った `authorization` などのヘッダーは転送しません。
- API キーはログ、エラーメッセージ、レスポンス本文に現れません。
- パッケージに npm の実行時依存はありません。

## 6. 互換性

Magpie `0.1.4280` のプラグインインターフェース（`config` / `auth.loader` / `auth.usage` / `provider.models`）を基準に開発・検証しています。それより古いバージョンは未検証です。

テストランナーには Node.js 18 以上が必要です。プラグイン自体は Magpie のプラグインホストで動作します。

## 7. 開発とテスト

```bash
node --test
```

テストは `node:test` を使い、`fetchImpl` を注入してリクエスト対応、エラーの透過、残高解析をカバーします。実際の Breeze ネットワークには接続しません。

## 8. ライセンス

MIT。`LICENSE` を参照してください。
