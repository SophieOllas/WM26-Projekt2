
# Deployment

The frontend is configured to use the CSC Rahti backend at
`https://wm-26-projekt-2-wm26-projekt2.2.rahtiapp.fi` for login, token refresh,
and Socket.IO. If the Rahti URL changes, update it in both `frontend/index.html`
and `frontend/app.js`.

The backend allows cross-origin requests only from `https://people.arcada.fi`.
It listens on the `PORT` environment variable when provided by Rahti, and uses
port `8080` locally otherwise.
