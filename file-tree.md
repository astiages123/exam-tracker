# Exam Tracker - File Structure

> Last updated: 2026-01-06

```
exam-tracker-main/
│
├── 📁 src/                              # Source code
│   ├── App.tsx                          # Root component
│   ├── main.tsx                         # Entry point
│   ├── vite-env.d.ts                    # Vite type declarations
│   │
│   ├── 📁 components/                   # Shared UI components
│   │   ├── 📁 layout/                   # Page layout components
│   │   │   ├── Dashboard.tsx            # Main dashboard
│   │   │   ├── Header.tsx               # App header
│   │   │   └── ProgressCard.tsx         # Progress display card
│   │   │
│   │   ├── 📁 shared/                   # Reusable feature components
│   │   │   ├── CelebrationOverlay.tsx   # Success celebration
│   │   │   ├── RankCelebrationOverlay.tsx
│   │   │   └── StreakDisplay.tsx        # Streak counter
│   │   │
│   │   ├── 📁 stats/                    # Statistics components
│   │   │   └── ProgressBars.tsx         # Progress bar variants
│   │   │
│   │   └── 📁 ui/                       # Base UI components (shadcn/ui)
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx
│   │       ├── input.tsx
│   │       ├── scroll-area.tsx
│   │       ├── tabs.tsx
│   │       ├── modal.tsx
│   │       ├── lightbox.tsx
│   │       ├── ConfirmModal.tsx
│   │       ├── ErrorBoundary.tsx
│   │       ├── MathAwareHtml.tsx
│   │       ├── ModalCloseButton.tsx
│   │       ├── Toast.tsx
│   │       └── index.ts
│   │
│   ├── 📁 features/                     # Feature modules (domain-driven)
│   │   │
│   │   ├── 📁 analytics/                # Analytics & tracking
│   │   │   ├── 📁 components/
│   │   │   │   ├── ErrorBook.jsx
│   │   │   │   ├── MasteryBadge.jsx
│   │   │   │   ├── SessionStats.jsx
│   │   │   │   ├── SourceReference.jsx
│   │   │   │   └── index.js
│   │   │   ├── 📁 hooks/
│   │   │   │   └── useSourceReference.js
│   │   │   └── 📁 services/
│   │   │       └── analyticsService.ts
│   │   │
│   │   ├── 📁 auth/                     # Authentication
│   │   │   └── 📁 components/
│   │   │       └── Login.tsx
│   │   │
│   │   ├── 📁 course/                   # Course management
│   │   │   ├── 📁 components/
│   │   │   │   ├── CategoryItem.tsx
│   │   │   │   ├── CategoryList.tsx
│   │   │   │   ├── ContentBlock.tsx
│   │   │   │   ├── ExampleCard.tsx
│   │   │   │   ├── MathBlock.tsx
│   │   │   │   ├── QuestionCard.tsx
│   │   │   │   ├── SolutionCard.tsx
│   │   │   │   ├── TableBlock.tsx
│   │   │   │   └── VideoItem.tsx
│   │   │   ├── 📁 constants/
│   │   │   │   └── index.ts
│   │   │   ├── 📁 data/
│   │   │   │   └── courseData.json
│   │   │   ├── 📁 styles/
│   │   │   │   └── course.css
│   │   │   └── 📁 types/
│   │   │       ├── content.ts
│   │   │       └── index.ts
│   │   │
│   │   ├── 📁 notes/                    # Notes viewer
│   │   │   └── 📁 components/
│   │   │       └── NotesModal.tsx
│   │   │
│   │   ├── 📁 pomodoro/                 # Pomodoro timer
│   │   │   ├── 📁 components/
│   │   │   │   ├── CourseSelector.tsx
│   │   │   │   ├── PomodoroTimer.tsx
│   │   │   │   └── TimerDisplay.tsx
│   │   │   └── 📁 hooks/
│   │   │       └── usePomodoroTimer.ts
│   │   │
│   │   ├── 📁 quiz/                     # Quiz system
│   │   │   ├── 📁 components/
│   │   │   │   ├── AutoQuizGenerator.tsx
│   │   │   │   ├── LatexRenderer.jsx
│   │   │   │   ├── QuizChart.jsx
│   │   │   │   ├── QuizContainer.tsx
│   │   │   │   ├── QuizExplanation.jsx
│   │   │   │   ├── QuizModal.jsx
│   │   │   │   ├── QuizOption.jsx
│   │   │   │   ├── QuizProgressBar.jsx
│   │   │   │   ├── index.js
│   │   │   │   └── 📁 schemas/
│   │   │   │       └── quizSchema.ts
│   │   │   ├── 📁 config/
│   │   │   │   └── quizConfig.ts
│   │   │   ├── 📁 hooks/
│   │   │   │   └── useQuiz.ts
│   │   │   ├── 📁 logic/
│   │   │   │   └── quizLogic.ts
│   │   │   ├── 📁 prompts/
│   │   │   │   └── quizPrompts.ts
│   │   │   └── 📁 services/
│   │   │       ├── quizService.ts
│   │   │       ├── quizUtils.ts
│   │   │       ├── stockpileService.ts
│   │   │       └── stockpileStatusService.ts
│   │   │
│   │   ├── 📁 ranks/                    # Ranking system
│   │   │   ├── 📁 components/
│   │   │   │   └── RankModal.tsx
│   │   │   ├── 📁 constants/
│   │   │   │   ├── ranks.ts
│   │   │   │   └── rankIcons.ts
│   │   │   └── 📁 types/
│   │   │       └── index.ts
│   │   │
│   │   ├── 📁 reports/                  # Reporting & statistics
│   │   │   ├── 📁 components/
│   │   │   │   ├── CourseStatsModal.tsx
│   │   │   │   ├── CustomTooltip.tsx
│   │   │   │   ├── DurationChart.tsx
│   │   │   │   ├── FullHistoryModal.tsx
│   │   │   │   ├── ReportModal.tsx
│   │   │   │   ├── ReportStats.tsx
│   │   │   │   ├── SessionChartModal.tsx
│   │   │   │   ├── SessionListItem.tsx
│   │   │   │   └── VideoChart.tsx
│   │   │   ├── 📁 hooks/
│   │   │   │   ├── useActivityTracking.ts
│   │   │   │   ├── useReportData.ts
│   │   │   │   └── useSessionChart.ts
│   │   │   └── 📁 types/
│   │   │       └── index.ts
│   │   │
│   │   └── 📁 schedule/                 # Schedule management
│   │       ├── 📁 components/
│   │       │   └── ScheduleModal.tsx
│   │       ├── 📁 constants/
│   │       │   └── scheduleConstants.ts
│   │       └── 📁 types/
│   │           └── index.ts
│   │
│   ├── 📁 context/                      # React contexts
│   │   ├── AuthContext.tsx              # Auth state provider
│   │   └── NotificationContext.tsx      # Toast notifications
│   │
│   ├── 📁 hooks/                        # Global custom hooks
│   │   ├── useAppController.ts          # Main app state controller
│   │   ├── useModals.ts                 # Modal management
│   │   ├── useQuiz.ts                   # Quiz logic hook
│   │   └── useUserData.ts               # User data persistence
│   │
│   ├── 📁 config/                       # Configuration
│   │   └── supabase.ts                  # Supabase client init
│   │
│   ├── 📁 constants/                    # App-wide constants
│   │   └── styles.ts                    # Style constants
│   │
│   ├── 📁 types/                        # TypeScript definitions
│   │   └── index.ts                     # Re-exports from features
│   │
│   ├── 📁 utils/                        # Utility functions
│   │   ├── calculations.ts              # Math utilities
│   │   ├── date.ts                      # Date formatting
│   │   ├── formatter.ts                 # Text formatting
│   │   ├── mathText.ts                  # LaTeX processing
│   │   ├── notification.ts              # Push notifications
│   │   ├── pointer.ts                   # Pointer events
│   │   ├── rateLimiter.ts               # API rate limiting
│   │   ├── sound.ts                     # Audio utilities
│   │   ├── streak.ts                    # Streak calculations
│   │   └── index.ts                     # Barrel export
│   │
│   ├── 📁 lib/                          # External library wrappers
│   │   └── utils.ts                     # shadcn cn() utility
│   │
│   ├── 📁 styles/                       # Global styles
│   │   └── globals.css                  # Tailwind + custom CSS
│   │
│   └── 📁 content-pipeline/             # Content processing system
│       ├── index.ts                     # Pipeline entry
│       ├── parser.ts                    # Markdown parser
│       ├── types.ts                     # Pipeline types
│       ├── utils.ts                     # Helper functions
│       └── README.md                    # Documentation
│
├── 📁 supabase/                         # Database layer
│   └── 📁 migrations/                   # SQL migrations
│       ├── 001_create_schema.sql        # Base tables
│       ├── 002_initialize_quiz.sql      # Quiz tables
│       ├── 003_mastery_and_analytics.sql
│       ├── 004_allow_seeding.sql
│       ├── 005_question_bank.sql
│       ├── 006_user_answers.sql
│       ├── 007_prevent_duplicates.sql
│       ├── 008_refactor_schema.sql
│       ├── 009_add_lesson_name_to_chunks.sql
│       ├── 010_add_srs_fields.sql
│       ├── 011_performance_indexes.sql
│       ├── 012_schema_consolidation.sql # Major consolidation
│       ├── 013_normalize_user_progress.sql
│       ├── 014_remove_course_progress.sql
│       ├── 014_stockpile_status.sql
│       ├── 015_rollback_normalization.sql
│       ├── 016_migrate_legacy_data.sql
│       └── 017_restore_user_progress.sql # Current schema
│
├── 📁 scripts/                          # Build & maintenance
│   ├── 📁 maintenance/
│   │   └── check_models.js              # API model checker
│   └── 📁 seeding/
│       ├── seed_db.js                   # Database seeder
│       └── seed_lessons.js              # Lesson data seeder
│
├── 📁 tests/                            # Test suite
│   ├── setup.ts                         # Test configuration
│   └── 📁 unit/
│       └── calculations.test.ts         # Unit tests
│
├── 📁 public/                           # Static assets
│   ├── 📁 content/                      # Generated lesson content
│   │   ├── 📁 ekonomi_1/
│   │   ├── 📁 hukuk_1/
│   │   ├── 📁 yetenek_1/
│   │   ├── not_stilleri.css
│   │   └── notes.js
│   ├── apple-touch-icon.png
│   ├── favicon-96x96.png
│   ├── favicon.ico
│   ├── site.webmanifest
│   ├── web-app-manifest-192x192.png
│   └── web-app-manifest-512x512.png
│
├── 📁 input/                            # Source content (markdown)
│   ├── 📁 Finans Matematiği/
│   ├── 📁 Medeni Hukuk/
│   └── 📁 Mikro İktisat/
│
├── 📁 .generated/                       # Pipeline output
│   └── content-data.json                # Processed content
│
├── 📁 dist/                             # Production build output
│
└── ⚙️ Configuration Files
    ├── package.json                     # Dependencies & scripts
    ├── package-lock.json
    ├── vite.config.js                   # Vite configuration
    ├── vitest.config.ts                 # Test configuration
    ├── tsconfig.json                    # TypeScript config
    ├── tsconfig.node.json               # Node TypeScript config
    ├── eslint.config.js                 # ESLint rules
    ├── postcss.config.js                # PostCSS config
    ├── components.json                  # shadcn/ui config
    ├── jsconfig.json                    # JS config
    ├── .env.example                     # Environment template
    ├── .env.local                       # Local environment
    ├── .gitignore                       # Git ignore rules
    └── README.md                        # Project documentation
```

## Architecture Overview

### Feature Module Pattern
Each feature in `src/features/` follows a consistent structure:
- `components/` - React components specific to the feature
- `hooks/` - Custom hooks for the feature
- `services/` - API and business logic
- `types/` - TypeScript type definitions
- `constants/` - Feature-specific constants

### Database Schema (Current)
The application uses Supabase with the following main tables:
- `user_progress` - User data with JSONB columns (sessions, schedule, activity_log, video_history)
- `lessons` - Lesson categories
- `lesson_chunks` - Individual note sections with embeddings
- `question_bank` - Generated quiz questions
- `user_answered_questions` - User quiz responses with SRS
- `user_statistics` - Performance statistics per chunk

### Key Technologies
- **Frontend**: React 19, TypeScript, Tailwind CSS v4
- **UI Components**: shadcn/ui (Radix primitives)
- **Backend**: Supabase (PostgreSQL + Auth)
- **AI Integration**: Google Gemini, OpenAI
- **Build Tool**: Vite 7
- **Testing**: Vitest
