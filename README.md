# prep.ai

prep.ai is a workspace-driven active-learning platform designed to help developers and students prepare for exams and technical interviews. Instead of passively reading textbooks, documentation, or PDF files, users organize their learning material into dedicated workspaces called Boards. Using a self-correcting agentic Retrieval-Augmented Generation (RAG) pipeline, prep.ai transforms these source materials into interactive, feedback-rich preparation tools.

The platform supports uploading local PDF documents and dynamically scraping live online documentation, ensuring study material is based on the latest API specifications. Using this indexed knowledge, prep.ai generates active recall quizzes, spaced-repetition flashcards, and interactive 1-on-1 AI tutoring chat sessions with integrated coding sandboxes.

## Tech Stack

The application is built using a modern, fully-typed stack separated into a React frontend and a FastAPI backend, orchestrated by Docker Compose:

### Frontend
* Framework: React with TypeScript (strict mode)
* Build Tool: Vite
* Styling: Tailwind CSS (v4)
* Routing: React Router (v6)
* Server State: TanStack React Query (v5)
* HTTP Client: Axios (configured with JWT request interceptors and automatic 401 handling)
* Code Editor: Monaco Editor via `@monaco-editor/react`
* Form Management: React Hook Form with Zod validation

### Backend
* Framework: FastAPI (Python 3.12)
* Web Server: Uvicorn
* Database & ORM: PostgreSQL with SQLAlchemy (v2) and Alembic migrations
* Vector Database: Qdrant
* Agentic RAG Framework: LangGraph + Google Gemini API (via google-genai SDK)
* Document Loading & Ingestion: LlamaIndex (utilizing SemanticSplitterNodeParser, SimpleDirectoryReader, and SimpleWebPageReader) + optional LlamaParse for OCR
* Sandboxed Code Execution: Piston API
* Authentication: JWT stateless authentication (OAuth2 password flow with bcrypt hashing)
* Evaluation: Ragas evaluation framework (measuring Faithfulness, Answer Relevance, and Context Recall)

### Infrastructure
* Multi-container orchestration: Docker Compose 
* Database: PostgreSQL (Dockerized container)
* Vector Store: Qdrant (Dockerized container)
* Sandbox Environment: Piston (Dockerized, pre-installed with Python 3.12.0 and Node 20.11.1 runtimes)

## Features

### Workspace Boards
Users organize study materials into independent workspaces called Boards. Each Board aggregates sources, quizzes, flashcards, tutor sessions, and review statistics.

### Advanced Ingestion
* PDF Ingestion: Upload local PDFs. The system extracts text and layout details, parses the document, and generates semantic chunks. Supports LlamaParse for high-fidelity markdown extraction.
* Web Crawling Agent: Users input a technology name or direct URL. The document agent dynamically fetches online documentation, crawling up to depth 1 within the same domain.
* Semantic Chunking: Splitting is performed using the LlamaIndex SemanticSplitterNodeParser and Gemini embeddings to partition documents based on semantic shifts rather than arbitrary character limits.
* Vector Indexing: Generates embeddings using models/gemini-embedding-2 and saves them to Qdrant (filtered by board_id). Relational metadata is simultaneously indexed in PostgreSQL.

### Self-Correcting Agentic RAG
* Implemented using LangGraph to manage a state machine that runs iterative Critic loops.
* The [rag_graph.py](backend/app/services/agents/rag_graph.py) orchestrator retrieves context nodes, generates candidate responses, runs a faithfulness check using a [critic.py](backend/app/services/agents/critic.py) evaluation node, and automatically routes back to correction if factual errors or hallucinations are detected.
* Delivers improved faithfulness and context recall scores, verified using the Ragas framework.

### Interactive AI Tutor & Code Sandbox
* Starts a 1-on-1 dialog tutoring session on selected topics. The [tutor_agent.py](backend/app/services/agents/tutor_agent.py) acts as an interviewer, testing conceptual understanding.
* Generates coding tasks directly in the tutor chat.
* Opens an integrated Monaco Editor sidebar for Python or JavaScript tasks.
* Runs code inside a Dockerized Piston sandbox, returning stdout/stderr and exit codes.
* Uses a [reviewer.py](backend/app/services/agents/reviewer.py) agent to grade submissions, outputting a numerical score and markdown feedback directly into the chat.

### Active Recall Quizzes
* Generates multiple-choice questions (MCQs) grounded in Board source materials.
* Only a single active quiz runs at a time per Board.
* Provides detailed correctness explanations and reasoning references for each choice.

### Spaced-Repetition Flashcards
* Generates flashcard decks in bulk. The prompt is supplied with existing card titles to prevent duplicates.
* Recalculates review schedules using the SuperMemo-2 (SM-2) algorithm based on user ratings (again, hard, good, easy).
* Supports downloading flashcards for import into Anki.

### Pipeline Evaluation
* An evaluation suite that executes Ragas metrics (Faithfulness, Answer Relevance, Context Recall) across static QA pairs, comparing baseline (simple RAG) vs improved (agentic self-correcting RAG) performance.

## Quick Setup

### Prerequisites
* Docker and Docker Compose
* Node.js (v22 or later, optional for local setup)
* Python (3.12 or later, optional for local setup)
* Google Gemini API Key (obtained from Google AI Studio)

### Step 1: Clone and Configure Environment
1. Navigate to the project root directory.
2. Copy [.env.example](.env.example) to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Open `.env` and fill in the required `GOOGLE_API_KEY`:
   ```env
   GOOGLE_API_KEY=your_google_api_key_here
   ```
4. Optional configurations include setting `LLAMA_CLOUD_API_KEY` (for LlamaParse OCR) and LangSmith API keys.

### Step 2: Run the Application

#### Option A: Docker Compose (Recommended)
This runs the entire system, including databases, backend, frontend, and code execution sandboxes with zero manual service setup.
1. Build and start the services from the project root:
   ```bash
   docker compose up --build
   ```
2. The services will start on the following ports:
   * Frontend: http://localhost:5173
   * Backend API: http://localhost:8000
   * PostgreSQL: localhost:5432
   * Qdrant: localhost:6333
   * Piston Sandbox: localhost:2000
3. Database migrations (`alembic upgrade head`) will run automatically during startup.

#### Option B: Local Setup (Manual Execution)
If you prefer running services outside of Docker Compose, you must have PostgreSQL, Qdrant, and Piston running externally.

1. **Configure local hosts**:
   * Change `DATABASE_URL` in `.env` to point to `localhost` instead of `db`:
     ```env
     DATABASE_URL=postgresql://postgres:postgres@localhost:5432/prepai
     ```
   * Change `QDRANT_URL` to point to `localhost`:
     ```env
     QDRANT_URL=http://localhost:6333
     ```
   * Change `PISTON_URL` to point to `localhost`:
     ```env
     PISTON_URL=http://localhost:2000
     ```

2. **Run Backend**:
   * Navigate to backend directory:
     ```bash
     cd backend
     ```
   * Sync dependencies using uv:
     ```bash
     uv sync
     ```
   * Run database migrations:
     ```bash
     alembic upgrade head
     ```
   * Start the FastAPI application:
     ```bash
     uvicorn app.main:app --reload
     ```

3. **Run Frontend**:
   * Navigate to frontend directory in a separate terminal:
     ```bash
     cd frontend
     ```
   * Install packages:
     ```bash
     npm install
     ```
   * Start the development server:
     ```bash
     npm run dev
     ```
