# Banan Interactive Survey

An interactive research survey supporting **Banan**, a project that helps hearing people learn Saudi Sign Language.

The survey features a retro desktop interface with interactive windows, Arabic right-to-left layout, and English translations.

## Live Preview

[View the Banan Survey](https://banan-servay.netlify.app/)

## Technologies

- HTML, CSS, and JavaScript
- Google Apps Script for submissions
- Google Sheets for response storage
- Netlify for hosting

## Project Files

| File | Purpose |
| --- | --- |
| `index.html` | Page structure |
| `style.css` | Styling and responsive layout |
| `app.js` | Survey logic and submissions |
| `Code.gs` | Google Sheets integration |

## Running Locally

Keep the frontend files in the same folder and open `index.html` in a browser. No installation or build step is required.

Submissions require a deployed Google Apps Script web app, with its URL configured in `app.js`.

## Deployment

The website is published on **Netlify**. The backend runs separately through **Google Apps Script**.

## Privacy

Survey responses are stored in a Google Sheet restricted to the research team. Participant data must not be uploaded to this repository.
