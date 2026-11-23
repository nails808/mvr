# Bank receipt templates

Each bank has its **own** template module:

| Bank | File | Telegram command |
|------|------|------------------|
| CommBank | `commbank.js` | `/commbank` |
| Westpac | `westpac.js` | `/westpac` |
| ANZ | `anz.js` | `/anz` |
| NAB | `nab.js` | `/nab` |
| Up | `up.js` | `/up` |

## Updating from a screenshot

1. Send Grok a screenshot of the real receipt screen for that bank.
2. Ask to **only rewrite** `receiptTemplates/<bank>.js` to match the screenshot.
3. Keep the `render(data)` export and use `receiptVars(data)` (or `v.amount`, `v.senderName`, `v.when`, `v.receiptId`) for dynamic fields.
4. Redeploy the Worker: `cd workers/worker && wrangler deploy`

Do not change other banks’ files unless requested.
