# UK Police Dashboard

A modern, interactive dashboard for exploring UK police data from the official [data.police.uk](https://data.police.uk) API.

## Live Demo

**https://91jj.github.io/UK-Police-Dashboad/**

## Features

- **Crime Map** with interactive Leaflet map, marker clustering, and heatmap
- **Setup Your Area** using:
  - Quick location buttons (London, Manchester, Birmingham, Edinburgh)
  - Postcode lookup
  - Police Force selection + Neighbourhood filter
- Multiple charts (Category breakdown + Top streets)
- Crime data table with CSV export
- Dark mode support
- Fully responsive (excellent on mobile)

## How to Use

1. Use the **Setup Your Area** section at the top
2. Either:
   - Click a quick location button, **or**
   - Enter a postcode and click **Go**, **or**
   - Select a Police Force + Neighbourhood
3. Click **Load Data**

## Tech Stack

- HTML + CSS + JavaScript
- Leaflet.js (maps + clustering)
- Chart.js (visualizations)
- Tailwind CSS (via CDN for simplicity)
- Multiple endpoints from the UK Police Open Data API

## Deployment

This project is designed to be hosted on **GitHub Pages**.

### How to Deploy

1. Push all files to a GitHub repository
2. Go to **Settings → Pages**
3. Set source to `main` branch and `/ (root)`
4. Your dashboard will be live at `https://yourusername.github.io/repo-name`

## Files

- `index.html` — Main interface
- `style.css` — Modern responsive styling
- `script.js` — All logic and API calls

## Notes

- Data has a publication delay (usually several weeks)
- Best experienced on desktop, but fully functional on mobile
