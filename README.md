# ChatGPT Clone - Full Stack AI Chat Application

A modern, full-stack ChatGPT clone built with Next.js frontend and Django backend. This application provides a seamless AI chat experience with user authentication, real-time messaging, and advanced AI integrations including memory capabilities.

![Project Architecture](https://img.shields.io/badge/Frontend-Next.js-black) ![Backend](https://img.shields.io/badge/Backend-Django-green) ![Database](https://img.shields.io/badge/Database-PostgreSQL-blue) ![AI](https://img.shields.io/badge/AI-OpenAI-purple)

## 🏗️ Project Architecture

```
chatgpt-clone/
├── frontend/              # Next.js 14 frontend application
│   ├── app/              # App Router pages
│   ├── components/       # Reusable React components
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utility functions and configurations
│   └── styles/          # Global styles
├── backend/             # Django REST API backend
│   ├── apps/           # Django applications
│   │   ├── authentication/  # User auth & JWT management
│   │   ├── chats/          # Chat management & AI integration
│   │   ├── users/          # User profile management
│   │   └── ai_integration/ # AI services & memory
│   ├── core/           # Django project settings
│   ├── scripts/        # Database seeding and utilities
│   └── requirements/   # Python dependencies
└── docs/               # Project documentation
```

## 🚀 Key Features

### Frontend Features
- **Modern UI/UX**: Built with Next.js 14, Tailwind CSS, and Radix UI components
- **Real-time Chat Interface**: Instant messaging with streaming responses
- **Authentication**: Secure JWT-based authentication with refresh tokens
- **Responsive Design**: Mobile-first approach with adaptive layouts
- **Theme Support**: Light/dark mode toggle
- **State Management**: Zustand for global state, TanStack Query for server state
- **Optimizations**: Image optimization, package imports optimization

### Backend Features
- **RESTful API**: Django Ninja for fast, type-safe API development
- **AI Integration**: OpenAI GPT models with memory capabilities (Mem0AI)
- **Authentication**: JWT tokens with refresh mechanism
- **Real-time Communication**: Django Channels for WebSocket support
- **Database**: PostgreSQL with Redis for caching
- **Task Processing**: Celery for background tasks
- **Security**: CORS headers, environment-based configuration

### AI & Memory Features
- **Conversation Memory**: Persistent context across chat sessions
- **Multiple AI Models**: Support for various OpenAI models
- **Streaming Responses**: Real-time response streaming
- **Context Management**: Intelligent context retention and retrieval

## 📋 Prerequisites

- **Node.js** 18+ and pnpm
- **Python** 3.9+
- **PostgreSQL** 12+
- **Redis** 6+
- **OpenAI API Key**

## 🛠️ Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/chatgpt-clone.git
cd chatgpt-clone
```

### 2. Environment Setup

Create environment files in both frontend and backend directories:

**Backend Environment** (`backend/.env`):
```env
# Django Settings
DEBUG=True
SECRET_KEY=your-super-secret-django-key
ALLOWED_HOSTS=localhost,127.0.0.1

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/chatgpt_clone
REDIS_URL=redis://localhost:6379/0

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4

# JWT Configuration
JWT_SECRET_KEY=your-jwt-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS Settings
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Mem0 AI Configuration
MEM0_API_KEY=your-mem0-api-key
```

**Frontend Environment** (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
```

### 3. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create Python virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements/development.txt

# Run database migrations
python manage.py migrate

# Create superuser (optional)
python manage.py createsuperuser

# Seed initial data (optional)
python scripts/seed_data.py
```

### 4. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
pnpm install

# Build the application (optional, for production)
pnpm run build
```

### 5. Database Setup

Create PostgreSQL database:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE chatgpt_clone;

# Create user (optional)
CREATE USER chatgpt_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE chatgpt_clone TO chatgpt_user;
```

### 6. Redis Setup

Ensure Redis is running:

```bash
# Start Redis server
redis-server

# Test Redis connection
redis-cli ping
```

## 🏃‍♂️ Running the Application

### Development Mode

**Option 1: Run Both Services Simultaneously**
```bash
# From project root
pnpm run dev
```

**Option 2: Run Services Separately**

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
python manage.py runserver 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
pnpm run dev
```

**Terminal 3 - Celery (for background tasks):**
```bash
cd backend
source venv/bin/activate
celery -A core worker -l info
```

### Production Mode

**Backend:**
```bash
cd backend
source venv/bin/activate

# Collect static files
python manage.py collectstatic --noinput

# Run with Gunicorn
gunicorn core.wsgi:application --bind 0.0.0.0:8000
```

**Frontend:**
```bash
cd frontend
pnpm run build
pnpm run start
```

## 📡 API Endpoints

### Authentication Endpoints
```
POST   /api/v1/auth/register     # User registration
POST   /api/v1/auth/login        # User login
POST   /api/v1/auth/refresh      # Token refresh
POST   /api/v1/auth/logout       # User logout
GET    /api/v1/auth/me          # Get current user
```

### Chat Endpoints
```
GET    /api/v1/chats/           # List user chats
POST   /api/v1/chats/           # Create new chat
GET    /api/v1/chats/{id}/      # Get chat details
PUT    /api/v1/chats/{id}/      # Update chat
DELETE /api/v1/chats/{id}/      # Delete chat
POST   /api/v1/chats/{id}/messages/  # Send message
GET    /api/v1/chats/{id}/messages/  # Get chat messages
```

### User Endpoints
```
GET    /api/v1/users/profile/   # Get user profile
PUT    /api/v1/users/profile/   # Update user profile
```

### Health Check
```
GET    /health/                 # Application health status
```

## 🔄 Application Flow

### 1. User Authentication Flow
```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant DB as Database

    U->>F: Access protected route
    F->>F: Check auth token in middleware
    alt No valid token
        F->>U: Redirect to login
        U->>F: Submit credentials
        F->>B: POST /auth/login
        B->>DB: Validate user
        DB-->>B: User data
        B-->>F: JWT tokens + user data
        F->>F: Store tokens in cookies
        F->>U: Redirect to chat
    else Valid token
        F->>U: Allow access
    end
```

### 2. Chat Message Flow
```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant AI as OpenAI API
    participant M as Mem0 AI
    participant DB as Database

    U->>F: Send message
    F->>B: POST /chats/{id}/messages
    B->>DB: Save user message
    B->>M: Retrieve conversation memory
    M-->>B: Context data
    B->>AI: Send message + context
    AI-->>B: Stream response
    B->>DB: Save AI response
    B->>M: Update conversation memory
    B-->>F: Stream response chunks
    F-->>U: Display real-time response
```

### 3. Memory Management Flow
```mermaid
sequenceDiagram
    participant C as Chat
    participant M as Memory Service
    participant DB as Database
    participant Mem0 as Mem0 AI

    C->>M: New message received
    M->>Mem0: Retrieve user memories
    Mem0-->>M: Previous context
    M->>M: Merge with current context
    M->>C: Enhanced context
    C->>AI: Send with memory
    AI-->>C: Response
    C->>M: Update conversation
    M->>Mem0: Store new memories
    M->>DB: Cache conversation state
```

## 🏗️ Backend Architecture Deep Dive

### Django Apps Structure

**Authentication App** (`apps/authentication/`)
```python
# Key Components:
- models.py          # Custom User model extensions
- views.py           # JWT auth endpoints
- serializers.py     # Request/response serializers
- services.py        # Auth business logic
- permissions.py     # Custom permission classes
```

**Chats App** (`apps/chats/`)
```python
# Key Components:
- models.py          # Chat, Message, ChatSettings models
- views.py           # Chat CRUD and messaging endpoints
- serializers.py     # Chat and message serializers
- services.py        # AI integration and chat logic
- tasks.py           # Celery background tasks
- consumers.py       # WebSocket consumers for real-time
```

**AI Integration App** (`apps/ai_integration/`)
```python
# Key Components:
- services.py        # OpenAI API integration
- memory.py          # Mem0 memory management
- models.py          # AI configuration models
- utils.py           # AI utility functions
```

### Database Models

**Core Models:**
```python
# User Model (extends Django's AbstractUser)
class User:
    - email (unique)
    - username
    - first_name, last_name
    - date_joined, last_login
    - is_active, is_staff

# Chat Model
class Chat:
    - title
    - user (ForeignKey to User)
    - created_at, updated_at
    - is_archived
    - settings (JSONField)

# Message Model
class Message:
    - chat (ForeignKey to Chat)
    - content
    - role (user/assistant)
    - timestamp
    - metadata (JSONField)
```

### API Response Format

**Standard Success Response:**
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Operation completed successfully"
}
```

**Standard Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {
      // Additional error details
    }
  }
}
```

## 🎨 Frontend Architecture Deep Dive

### Next.js 14 App Router Structure

**App Directory Structure:**
```
app/
├── (auth)/              # Route groups for auth pages
│   ├── register/
│   └── login/
├── chat/
│   ├── [chatId]/       # Dynamic chat routes
│   ├── layout.tsx      # Chat layout wrapper
│   └── page.tsx        # Chat list page
├── layout.tsx          # Root layout
├── page.tsx            # Landing page
└── globals.css         # Global styles
```

### Key Components Architecture

**Chat Components** (`components/chat/`):
```typescript
// Chat Interface Components
- ChatContainer         # Main chat wrapper
- MessageList          # Scrollable message list
- MessageInput         # Message composition
- ChatSidebar         # Chat navigation
- ChatSettings        # Chat configuration

// Message Components
- MessageBubble       # Individual message display
- MessageActions      # Copy, edit, delete actions
- TypingIndicator     # Real-time typing status
- MessageMarkdown     # Markdown rendering
```

**Provider Components** (`components/providers/`):
```typescript
// Core Providers
- AuthProvider        # Authentication context
- QueryProvider       # TanStack Query setup
- ThemeProvider       # Theme management
- ClientLayoutProvider # Client-side layout logic
```

### State Management

**Zustand Stores:**
```typescript
// Auth Store
interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

// Chat Store
interface ChatStore {
  currentChat: Chat | null;
  chats: Chat[];
  messages: Message[];
  isLoading: boolean;
  sendMessage: (content: string) => Promise<void>;
  loadChats: () => Promise<void>;
}
```

### Custom Hooks

**Key Custom Hooks:**
```typescript
// Authentication hooks
useAuth()              # Auth state and methods
useRequireAuth()       # Redirect if not authenticated

// Chat hooks
useChats()            # Chat list management
useMessages(chatId)   # Message management
useStreamingMessage() # Real-time message streaming

// Utility hooks
useDebounce()         # Input debouncing
useLocalStorage()     # Local storage management
useWebSocket()        # WebSocket connection
```

## 🧪 Testing

### Backend Testing

**Run Python Tests:**
```bash
cd backend

# Run all tests
pytest

# Run with coverage
pytest --cov=apps --cov-report=html

# Run specific test file
pytest apps/chats/tests/test_views.py

# Run with verbose output
pytest -v
```

**Test Structure:**
```
backend/apps/chats/tests/
├── __init__.py
├── test_models.py      # Model tests
├── test_views.py       # API endpoint tests
├── test_services.py    # Business logic tests
└── test_tasks.py       # Celery task tests
```

### Frontend Testing

**Run Frontend Tests:**
```bash
cd frontend

# Run tests (when test suite is configured)
pnpm run test

# Run linting
pnpm run lint

# Type checking
pnpm run type-check
```

## 📦 Deployment

### Docker Deployment (Recommended)

**Docker Compose Setup:**
```yaml
# docker-compose.yml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/chatgpt_clone
    depends_on:
      - db
      - redis

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8000/api/v1

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=chatgpt_clone
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass

  redis:
    image: redis:7-alpine
```

**Deploy with Docker:**
```bash
# Build and run all services
docker-compose up --build

# Run in production mode
docker-compose -f docker-compose.prod.yml up -d
```

### Manual Deployment

**Backend Deployment:**
1. Set up production database (PostgreSQL)
2. Configure environment variables
3. Install dependencies: `pip install -r requirements/production.txt`
4. Run migrations: `python manage.py migrate`
5. Collect static files: `python manage.py collectstatic`
6. Start with Gunicorn: `gunicorn core.wsgi:application`

**Frontend Deployment:**
1. Build the application: `pnpm run build`
2. Start production server: `pnpm run start`
3. Or deploy to Vercel/Netlify for automatic deployment

## 🔧 Configuration

### Backend Configuration

**Settings Structure:**
```
backend/core/settings/
├── __init__.py         # Settings router
├── base.py            # Base settings
├── development.py     # Development overrides
├── testing.py         # Test environment
└── production.py      # Production settings
```

**Key Configuration Options:**
```python
# AI Configuration
OPENAI_SETTINGS = {
    'api_key': env('OPENAI_API_KEY'),
    'model': env('OPENAI_MODEL', default='gpt-4'),
    'max_tokens': env('OPENAI_MAX_TOKENS', default=2000),
    'temperature': env('OPENAI_TEMPERATURE', default=0.7),
}

# Memory Configuration
MEM0_SETTINGS = {
    'api_key': env('MEM0_API_KEY'),
    'user_id_prefix': env('MEM0_USER_PREFIX', default='chatgpt_user_'),
}

# Celery Configuration
CELERY_BROKER_URL = env('REDIS_URL')
CELERY_RESULT_BACKEND = env('REDIS_URL')
```

### Frontend Configuration

**Next.js Configuration** (`next.config.mjs`):
```javascript
const nextConfig = {
  // Build optimizations
  experimental: {
    optimizePackageImports: ['@tanstack/react-query', 'zustand'],
  },

  // Production optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Image optimization
  images: {
    domains: ['localhost', 'your-domain.com'],
  },
};
```

## 📊 Performance Optimizations

### Backend Optimizations
- **Database Query Optimization**: Select related, prefetch related
- **Caching**: Redis for session storage and API responses
- **Background Tasks**: Celery for non-blocking operations
- **Connection Pooling**: PostgreSQL connection pooling
- **API Response Optimization**: Pagination and field selection

### Frontend Optimizations
- **Code Splitting**: Automatic route-based code splitting
- **Image Optimization**: Next.js Image component
- **Bundle Analysis**: Package import optimization
- **Caching**: TanStack Query for server state caching
- **Lazy Loading**: Dynamic imports for heavy components

## 🔒 Security Considerations

### Backend Security
- **JWT Tokens**: Secure token implementation with refresh mechanism
- **CORS Configuration**: Proper origin restrictions
- **Input Validation**: Pydantic models for request validation
- **Rate Limiting**: API rate limiting (implement as needed)
- **SQL Injection Prevention**: ORM usage prevents SQL injection

### Frontend Security
- **XSS Protection**: React's built-in XSS protection
- **CSRF Protection**: SameSite cookie attributes
- **Secure Headers**: Security headers in Next.js configuration
- **Environment Variables**: Proper separation of client/server variables

## 🐛 Troubleshooting

### Common Backend Issues

**Database Connection Issues:**
```bash
# Check PostgreSQL status
systemctl status postgresql

# Test database connection
psql -U username -d chatgpt_clone -h localhost

# Check Django database settings
python manage.py dbshell
```

**Redis Connection Issues:**
```bash
# Check Redis status
redis-cli ping

# Check Redis configuration in Django settings
python manage.py shell
>>> from django.core.cache import cache
>>> cache.set('test', 'value')
>>> cache.get('test')
```

**OpenAI API Issues:**
- Verify API key in environment variables
- Check API quota and billing
- Ensure proper model permissions

### Common Frontend Issues

**Build Issues:**
```bash
# Clear Next.js cache
rm -rf .next
pnpm run build

# Check for TypeScript errors
pnpm run type-check

# Verify environment variables
cat .env.local
```

**Authentication Issues:**
- Check cookie settings in browser
- Verify API endpoint accessibility
- Ensure middleware configuration is correct

## 📚 Additional Resources

### Documentation Links
- [Next.js Documentation](https://nextjs.org/docs)
- [Django Documentation](https://docs.djangoproject.com/)
- [Django Ninja](https://django-ninja.rest-framework.com/)
- [TanStack Query](https://tanstack.com/query/latest)
- [Tailwind CSS](https://tailwindcss.com/docs)

### API Documentation
- **Swagger UI**: Available at `http://localhost:8000/api/v1/docs` when running in development
- **OpenAPI Schema**: Available at `http://localhost:8000/api/v1/openapi.json`

### Development Tools
- **Django Admin**: `http://localhost:8000/admin/`
- **Redis CLI**: `redis-cli` for debugging Redis operations
- **Database GUI**: pgAdmin or similar for PostgreSQL management

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines
- Follow existing code style and conventions
- Write tests for new features
- Update documentation as needed
- Use descriptive commit messages
- Ensure all tests pass before submitting PR

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for GPT models
- Mem0 AI for memory capabilities
- Next.js and Django communities
- All open-source contributors

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check existing documentation
- Review troubleshooting section

---

**Built with ❤️ using Next.js, Django, and OpenAI**