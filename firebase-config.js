/*
  ZimScope — Firebase configuration
  ---------------------------------
  1. Go to https://console.firebase.google.com -> Create project.
  2. Project settings -> General -> "Your apps" -> Add app -> Web (</>) icon.
  3. Copy the config object Firebase gives you and paste the values below.
  4. In the Firebase console, enable:
       - Authentication -> Sign-in method -> Email/Password (enable it)
       - Firestore Database -> Create database (start in production mode)
  5. Paste firestore.rules into Firestore -> Rules, and publish.

  This file is loaded by both index.html and admin.html.
*/

// ===== FIREBASE CONFIG =====
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCmPHF7Kyg-Oicwp1MWJFnnBuBb7KCqz_Q",
  authDomain: "zimscope-3c62c.firebaseapp.com",
  projectId: "zimscope-3c62c",
  storageBucket: "zimscope-3c62c.firebasestorage.app",
  messagingSenderId: "1053155362959",
  appId: "1:1053155362959:web:c28061f7f00d72954c08fa",
  measurementId: "G-2XR3809E4F"
};
// =============================================

firebase.initializeApp(FIREBASE_CONFIG);

const auth = firebase.auth();
const db = firebase.firestore();

/*
  Firestore data shape used throughout the app:

  users/{uid}
    - email: string
    - role: "student" | "admin"
    - grade: string | null        (e.g. "Grade 5", "ECD A")
    - createdAt: timestamp

  content/{contentId}
    - grade: string                (e.g. "Grade 5")
    - subject: string              (e.g. "Mathematics")
    - topic: string                (short topic label)
    - title: string                (lesson title)
    - body: string                 (lesson text, plain paragraphs separated by \n\n)
    - quiz: array of {
        question: string,
        options: [string, string, string, string],
        correctIndex: number       (0-3)
      }
    - createdBy: uid
    - createdAt: timestamp

  scores/{uid}_{contentId}
    - uid: string
    - contentId: string
    - grade: string
    - subject: string
    - title: string
    - score: number
    - total: number
    - takenAt: timestamp
*/

// Full MoPSE-aligned tier / grade / subject map used to build the selection grid.
// This is structural navigation data, not lesson content — actual lesson content
// is posted by the admin and stored in Firestore under `content`.
const GRADE_TIERS = {
  "ECD A": {
    tier: "Early Childhood Development",
    subjects: [
      "Pre-Language (English/Shona/Ndebele)",
      "Pre-Numeracy",
      "Science and Discovery",
      "Physical Education",
      "Heritage-Based Arts"
    ]
  },
  "ECD B": {
    tier: "Early Childhood Development",
    subjects: [
      "Pre-Language (English/Shona/Ndebele)",
      "Pre-Numeracy",
      "Science and Discovery",
      "Physical Education",
      "Heritage-Based Arts"
    ]
  },
  "Grade 1": { tier: "Lower Primary", subjects: ["English", "Indigenous Languages (Shona/Ndebele)", "Mathematics", "Science and Technology", "Agriculture", "Social Studies", "Family & Heritage", "ICT"] },
  "Grade 2": { tier: "Lower Primary", subjects: ["English", "Indigenous Languages (Shona/Ndebele)", "Mathematics", "Science and Technology", "Agriculture", "Social Studies", "Family & Heritage", "ICT"] },
  "Grade 3": { tier: "Lower Primary", subjects: ["English", "Indigenous Languages (Shona/Ndebele)", "Mathematics", "Science and Technology", "Agriculture", "Social Studies", "Family & Heritage", "ICT"] },
  "Grade 4": { tier: "Upper Primary", subjects: ["English", "Mathematics", "Shona/Ndebele", "Agriculture", "Science & Technology", "Social Studies", "Physical Education", "Visual & Performing Arts", "FAREME"] },
  "Grade 5": { tier: "Upper Primary", subjects: ["English", "Mathematics", "Shona/Ndebele", "Agriculture", "Science & Technology", "Social Studies", "Physical Education", "Visual & Performing Arts", "FAREME"] },
  "Grade 6": { tier: "Upper Primary", subjects: ["English", "Mathematics", "Shona/Ndebele", "Agriculture", "Science & Technology", "Social Studies", "Physical Education", "Visual & Performing Arts", "FAREME"] },
  "Grade 7": { tier: "Upper Primary", subjects: ["English", "Mathematics", "Shona/Ndebele", "Agriculture", "Science & Technology", "Social Studies", "Physical Education", "Visual & Performing Arts", "FAREME"] }
};

const GRADE_ORDER = ["ECD A", "ECD B", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7"];

// English / Shona / Ndebele label sets for the interface language toggle.
const UI_LABELS = {
  en: {
    dashboard: "Dashboard", library: "Library", tutor: "AI Tutor", progress: "Progress",
    logout: "Log out", selectGrade: "Select your grade", selectSubject: "Select a subject",
    lessons: "Lessons", takeAssessment: "Take assessment", submitExam: "Submit exam",
    yourScore: "Your score", noContent: "No lessons have been posted for this subject yet.",
    welcomeBack: "Welcome back"
  },
  sn: {
    dashboard: "Chikamu Chikuru", library: "Raibhurari", tutor: "Mudzidzisi weAI", progress: "Kufambira mberi",
    logout: "Buda", selectGrade: "Sarudza giredhi rako", selectSubject: "Sarudza chidzidzo",
    lessons: "Zvidzidzo", takeAssessment: "Ita bvunzo", submitExam: "Tumira bvunzo",
    yourScore: "Zvibodzwa zvako", noContent: "Hapasati pave nezvidzidzo pachidzidzo ichi.",
    welcomeBack: "Tinokuchingamidza"
  },
  nd: {
    dashboard: "Ideshibhodi", library: "Ilayibhrari", tutor: "Umeluleki we-AI", progress: "Inqubekelaphambili",
    logout: "Phuma", selectGrade: "Khetha ibanga lakho", selectSubject: "Khetha isifundo",
    lessons: "Izifundo", takeAssessment: "Thatha uvivinyo", submitExam: "Thumela uvivinyo",
    yourScore: "Amaphuzu akho", noContent: "Azikho izifundo ezifakiweyo kulesi isifundo okwamanje.",
    welcomeBack: "Siyakwamukela futhi"
  }
};
