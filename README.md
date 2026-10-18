
# Deployment

Before deploying the frontend, replace `https://YOUR-RAHTI-APP.rahtiapp.fi` in
both `frontend/index.html` and `frontend/app.js` with the backend's public
HTTPS URL from CSC Rahti. Use the same URL in both files.

The backend allows cross-origin requests only from `https://people.arcada.fi`.
It listens on the `PORT` environment variable when provided by Rahti, and uses
port `8080` locally otherwise.
