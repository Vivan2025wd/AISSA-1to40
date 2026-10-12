ol-science-quiz/
├── app/
│   ├── layout.tsx
│   ├── globals.css
│   ├── page.tsx                       # Landing
│   ├── auth/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── api/
│   │   └── quiz/[id]/route.ts         # Loader for exam engine
│   ├── student/
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── leaderboard/page.tsx
│   │   └── quiz/[id]/page.tsx         # Exam engine + timer + review
│   └── admin/
│       ├── layout.tsx
│       ├── AdminGuard.tsx
│       ├── dashboard/page.tsx
│       ├── questions/page.tsx
│       ├── super
│       │   └── page.tsx
│       ├── quizzes/
│       │   ├── page.tsx
│       │   └── [id]/questions/page.tsx
│       └── performance/page.tsx
├── components/
│   ├── ImageUploadField.tsx
│   ├── QuestionBankSelectorModal.tsx
│   ├── QuestionEditModal.tsx
│   ├── QuestionEntryForm.tsx
│   └── SchoolAutocomplete.tsx
├── lib/
│   ├── admin-session.ts
│   ├── quiz-window.ts
│   ├── supabaseClient.ts
│   └── supabase/server.ts
├── supabase/
│   └── server.ts
├── middleware.ts
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── tsconfig.json
└── .env.local.example