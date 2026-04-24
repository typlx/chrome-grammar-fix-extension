# User Guide

This guide shows how to configure and use Typlix on any website.

## 1) Load Extension in Chrome

1. Clone/checkout the project locally:

```bash
git clone https://github.com/varteq-company/chrome-grammar-fix-extension.git
cd chrome-grammar-fix-extension
```

2. Open Chrome Extension Manager: `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select the folder where you checked out this project

## 2) Open Extension Settings

1. Open Chrome and pin the Typlix icon to the toolbar (optional but convenient).
2. Click the Typlix icon.
3. The settings popup opens.

![Settings popup](docs/images/settings-popup.png)

## 3) Configure API

In the popup:

- **Provider**: Choose OpenAI Compatible or Anthropic Claude
- **API URL**: default depends on selected provider
- **Model**: for example `gpt-4o-mini` or `claude-sonnet-4-20250514`
- **API Token**: your provider token

Then click **Save Settings**.

What happens on save:

- Typlix validates your configuration against the provider API
- Verifies token is valid
- Verifies model exists for that token
- Saves only if validation succeeds

If validation fails, you will get a detailed error (for example invalid URL, unauthorized token, model not found, rate limit).

## 4) Use Typlix on a Website

1. Open any site with a text field (textarea, text input, or contenteditable).
2. Type text with mistakes.
3. Click the purple fix icon at the bottom-right of the field.
4. Wait for spinner.
5. Text is replaced with corrected output.

![Fix icon in a text field](docs/images/textarea-icon.png)

## 5) Expected Behavior

- Works on static and dynamically added fields (SPA pages)
- Handles multiple fields per page
- Shows error tooltip if request fails
- Does not send token to page scripts (token is used in extension service worker only)

## 6) Troubleshooting

- **Unauthorized (401)**: token is wrong/expired
- **Endpoint not found (404)**: API URL is wrong
- **Model not found**: choose a model available for your token
- **Rate limit (429)**: quota exceeded, try later or use another key
