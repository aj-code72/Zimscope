# ZimScope — setup guide

## Files in this project

- `index.html` — student app (register/login, grade & subject selection, lesson reader, quizzes, AI tutor, progress)
- `admin.html` — admin panel (post/edit/delete lessons and their quiz questions)
- `firebase-config.js` — shared Firebase setup + the grade/subject navigation map. **Paste your Firebase config here.**
- `app.js` — student app logic
- `admin.js` — admin panel logic
- `ai-tutor.js` — AI tutor chat wiring. **Paste your LLM API key here.**
- `firestore.rules` — security rules to paste into the Firebase console
- `manifest.json`, `sw.js` — PWA install + offline app-shell caching

## 1. Create the Firebase project

1. Go to https://console.firebase.google.com → **Add project** → follow the prompts.
2. In the project, go to **Project settings** (gear icon) → **General** → under "Your apps" click the web icon `</>` → register an app (no need for Firebase Hosting SDK setup here yet).
3. Firebase shows you a `firebaseConfig` object. Copy every value into `firebase-config.js` in this project, replacing the `PASTE_YOUR_...` placeholders.

## 2. Turn on Authentication

1. In the console, go to **Build → Authentication → Get started**.
2. Under **Sign-in method**, enable **Email/Password**.

## 3. Turn on Firestore

1. Go to **Build → Firestore Database → Create database**.
2. Choose **production mode** (the rules file below locks it down properly).
3. Once created, go to the **Rules** tab, delete the default contents, and paste in everything from `firestore.rules` in this project. Click **Publish**.

You don't need to manually create the `users`, `content`, or `scores` collections — they're created automatically the first time the app writes to them.

## 4. Create your first admin account

Admin accounts are just regular accounts with `role: "admin"` on their user document — there's no separate signup form, to keep it simple and secure.

1. Open `index.html` (once deployed, or locally) and **register** a normal account with the email you want to use as admin.
2. In the Firebase console, go to **Firestore Database → Data**, open the `users` collection, and find the document for that account (the document ID is the user's UID — you can match the `email` field).
3. Edit that document and change the `role` field from `"student"` to `"admin"`.
4. Go to `admin.html` and log in with that same email/password. You now have access to the admin panel.

## 5. Deploy with Firebase Hosting

From a terminal with the [Firebase CLI](https://firebase.google.com/docs/cli) installed:

```bash
npm install -g firebase-tools
firebase login
cd zimscope           # this project's folder
firebase init hosting # choose "Use an existing project", select this project,
                       # set the public directory to the current folder ("."),
                       # configure as a single-page app: No (we use plain multi-page files)
firebase deploy
```

Firebase will give you a live URL (`https://your-project.web.app`) serving `index.html` and `admin.html` directly.

If you'd rather keep using Render for hosting the static files, that works too — Firebase Auth and Firestore are called over the internet from the browser regardless of where the HTML/JS files themselves are hosted. Just make sure your Firebase project's **Authentication → Settings → Authorized domains** list includes whatever domain Render gives you.

## 6. Add the AI tutor API key

Open `ai-tutor.js` and fill in:

```js
const TUTOR_API_KEY = "your-key-here";
```

**Important limitation to know about:** calling most LLM providers (Anthropic, OpenAI, etc.) directly from browser JavaScript exposes the key to anyone who opens dev tools, and providers often block direct browser calls entirely (CORS). The wiring in `ai-tutor.js` is written so it will work as-is for local testing, but for a real deployment, put a small server between the browser and the provider — a single Firebase Cloud Function is enough:

```js
// functions/index.js (Cloud Function sketch)
exports.tutor = functions.https.onRequest(async (req, res) => {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY, // stored as a server secret, never shipped to the browser
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify(req.body)
  });
  res.json(await response.json());
});
```

Then in `ai-tutor.js`, change `TUTOR_ENDPOINT` to point at your deployed function's URL instead of `api.anthropic.com` directly, and leave `TUTOR_API_KEY` blank in the browser file (the key lives on the server, not the client).

## 7. Adding lesson content

Every subject a student can select starts empty until an admin posts a lesson for it. Go to `admin.html`, pick the grade and subject, write the lesson body (blank line between paragraphs), add one or more quiz questions with four options each and mark the correct one, then **Post lesson**. It appears instantly in the student library for that grade/subject.

## Known limitations, on purpose

- No password reset flow yet — add `auth.sendPasswordResetEmail(email)` if you want one.
- The AI tutor calls the provider directly from the browser until you add the proxy described in step 6 — fine for testing, not for a public launch.
- Offline mode (`sw.js`) caches the app shell (HTML/JS/CSS) for offline loading, not live lesson data — Firestore itself has its own offline persistence you can enable with `db.enablePersistence()` in `firebase-config.js` if you want lessons to be readable offline too.
