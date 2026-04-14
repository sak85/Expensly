# Expensly

Expensly is a standalone receipt and expense tracking web app built with React + Vite.

## Features

- Add expenses manually with amount, VAT, category, notes, and receipt image.
- Scan receipts with local OCR (Tesseract.js) to auto-fill fields.
- View, archive, edit, and delete expenses.
- Export selected expenses as PDF, CSV, and ZIP.

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Start the app:

```bash
npm run dev
```

3. Build production output:

```bash
npm run build
```

## Data Storage

- Expenses are stored via Netlify Function `/.netlify/functions/expenses`.
- The function persists user-scoped data in Netlify Blobs (`expensly/users/<user-id>/expenses.json`).
- Receipt files are still stored as data URLs inside each expense record.

## Authentication

- The app uses Netlify Identity for login/signup.
- Each authenticated user can access only their own receipts and expenses.
- In Netlify dashboard, enable **Identity** for your site before production usage.

## Deploy to Netlify

1. Connect this repository in Netlify.
2. Use:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. Deploy.

## Local Function Testing

- Install Netlify CLI if needed: `npm i -g netlify-cli`
- Run app + functions together: `netlify dev`
