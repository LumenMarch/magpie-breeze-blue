# magpie-breeze-blue

## 1. 這是什麼

`magpie-breeze-blue` 是 Magpie 的 [Breeze Blue](https://breezeblue.ai/) TTS provider 外掛。它把 Magpie 閘道的 OpenAI 相容 `POST /v1/audio/speech` 請求轉換成 Breeze 官方 [`/v1/text-to-speech/{voice_id}`](https://docs.breezeblue.ai/api-reference/text-to-speech/convert-text-to-speech) 請求，並透過 `auth.usage` 把 Breeze 餘額顯示在 Magpie 的 provider 卡片/usage 中。

- provider id：`breeze`
- 顯示名稱：`BreezeBlue`
- 模型：`breeze-tts-2`（顯示名稱 `Breeze TTS 2`，輸入 `text`、輸出 `audio`）
- 介面文案：`en` / `zh` / `zh-TW` / `ja` / `de`，其他語言回退英文
- 連網目標只有 `https://api.breeze.blue`
- 圖示：`magpie.icon` 指向 BreezeBlue 官方 `https://breezeblue.ai/favicon.png`，不打包進本專案；圖示版權歸 BreezeBlue，如官方不希望第三方使用，可刪除該欄位或換回自繪圖示。
- README 語言：`README.md`（English）、`README.zh-CN.md`、`README.zh-TW.md`、`README.ja.md`、`README.de.md`

## 2. 安裝

在專案根目錄執行：

```bash
magpie plugin add ./            # 本機目錄
# 或發布後：magpie plugin add magpie-breeze-blue
magpie plugin login breeze
```

登入時填入 [Breeze API Key](https://docs.breezeblue.ai/authentication)（`brz_…`）。Key 保存在 Magpie 中，不會寫進本專案的檔案。

## 3. 使用 `/v1/audio/speech`

Magpie 閘道預設監聽 `http://127.0.0.1:3425`。`breeze/breeze-tts-2` 宣告為 audio-only，因此不會出現在 `/v1/models` 或 Magpie 的聊天模型選擇器中；`/v1/audio/speech` 仍會按 `provider/model` 直接解析它。請求體與 OpenAI TTS 一致：

```json
{
  "model": "breeze/breeze-tts-2",
  "input": "晚安啦",
  "voice": "voc_...",
  "response_format": "mp3",
  "instructions": "用溫柔的語氣說",
  "speed": 1.05
}
```

`voice` 必須是 Breeze 帳號下的真實[音色 ID](https://docs.breezeblue.ai/api-reference/voices/list-voices)（`voc_…`），本專案不硬編碼任何使用者的音色。

對應的 `curl`：

```bash
curl http://127.0.0.1:3425/v1/audio/speech \
  -H 'content-type: application/json' \
  -d '{"model":"breeze/breeze-tts-2","input":"晚安啦","voice":"voc_...","response_format":"mp3","instructions":"用溫柔的語氣說","speed":1.05}' \
  --output out.mp3
```

### 3.1 參數

| 欄位 | 必填 | 預設 | 說明 |
| --- | --- | --- | --- |
| `input` | 是 | — | 要朗讀的文字；空白字串會回傳 400 |
| `voice` | 是 | — | Breeze 音色 ID，例如 `voc_...`；會作為 URL path 段編碼 |
| `response_format` | 否 | `mp3` | 見 3.2 的格式對應；未知值按 `mp3` |
| `speed` | 否 | `1` | 夾取到 0.5–2；等於 1 時不送出 |
| `instructions` | 否 | 不送出 | 語氣/情緒指令 |
| `language_code` | 否 | `zh` | Breeze 擴充欄位，兩位 ISO 639-1 代碼 |
| `model_id` | 否 | `breeze-tts-2` | Breeze 擴充欄位 |
| `guidance_scale` | 否 | `1` | Breeze 擴充欄位，夾取到 1–10；等於 1 時不送出 |
| `use_speaker_boost` | 否 | `false` | Breeze 擴充欄位；僅當值為 `true` 時送出 |

`voice_settings` 只在 `speed`、`guidance_scale` 或 `use_speaker_boost` 有非預設值時才會出現在 Breeze 請求體中。

### 3.2 格式對應

| `response_format` | Breeze `output_format` |
| --- | --- |
| `mp3` | `mp3` |
| `wav` | `wav_24000` |
| `opus` | `opus` |
| `aac` | `aac_24000_128` |
| `flac` | `flac_24000` |
| `pcm` | `pcm_24000` |
| 其他值 | `mp3` |

成功時原樣回傳 Breeze 的音訊二進位與 `content-type`；Breeze 沒有提供時預設 `audio/mpeg`。

### 3.3 錯誤

Breeze 回傳 `{code, detail, error}` 時，外掛保留 HTTP 狀態，並轉換成 OpenAI 形狀：

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

本機驗證失敗回傳 400；非 `/v1/audio/speech` 路徑回傳 404；非 POST 回傳 405。所有錯誤都不會把 API Key 寫進訊息或日誌。

## 4. 餘額

`auth.usage` 會請求 Breeze [`GET /v1/balance`](https://docs.breezeblue.ai/api-reference/account/get-account-balance)，並回傳 Magpie 的 wallet window：

```js
{
  plan: 'BreezeBlue',
  windows: [{ name: 'Balance', balance: 1635.6, unit: 'Credits' }]
}
```

`settlement_pending` 為 `true` 時，視窗會帶上 `aside: true`，避免路由把它當作會立即耗盡帳戶的額度。查詢失敗時回傳 `windows: []` 和 `error` 文字，不會把例外拋到 Magpie 外層。

餘額只顯示在 Magpie 的 provider 卡片/usage 中。用量卡片還會顯示每日點數視窗，指向 [`breezeblue.ai/app`](https://breezeblue.ai/app) 手動領取。

### 4.1 介面多語言

- `Balance`、`Credits`、`Manual` 使用 Magpie 的英文規範名，Magpie 介面會按目前語言翻譯；`display` 保持語言中立的 URL。
- `auth.methods[].labels` 提供 `zh`、`zh-TW`、`ja`、`de` 的登入文案，其他語言回退 `label` 的英文。
- `magpie.summary` 提供 `en`、`zh`、`ja`、`de` 的外掛簡介；Magpie 的 Discover 卡片按兩位語言碼取用，`zh-TW` 會回退到 `zh`。

## 5. 網路與安全

- 外掛只存取 `https://api.breeze.blue`：`/v1/text-to-speech/{voice_id}` 和 `/v1/balance`。
- 自訂 `fetch` 只處理 `/v1/audio/speech`，其他路徑直接回傳 JSON 錯誤，不會轉發到 Breeze。
- 發往 Breeze 的請求只帶 Breeze 的 `xi-api-key`；不會轉發 Magpie 收到的 `authorization` 等請求標頭。
- API Key 不會出現在日誌、錯誤訊息或回應內容中。
- 套件本身不引入任何 npm 執行時依賴。

## 6. 相容性

開發與驗證基於 Magpie `0.1.4280` 的外掛介面（`config` / `auth.loader` / `auth.usage` / `provider.models`）；更低版本未驗證。

測試執行器需要 Node.js 18 或更高版本；外掛本身執行在 Magpie 的外掛宿主中。

## 7. 開發與測試

```bash
node --test
```

測試使用 `node:test`，透過注入 `fetchImpl` 覆蓋請求對應、錯誤透傳和餘額解析，不存取真實 Breeze 網路。

## 8. 授權

MIT，見 `LICENSE`。
