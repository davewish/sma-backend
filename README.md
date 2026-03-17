# SMA Backend API

A Node.js TypeScript backend API with Express, MongoDB, and complete authentication system (JWT, OAuth).

## Project Structure

```
src/
├── config/          # Configuration files (database, passport strategies)
├── controllers/     # Request handlers (auth, users)
├── middleware/      # Express middleware (auth, error handling)
├── models/          # MongoDB schemas (User)
├── routes/          # API routes (auth, users)
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
└── index.ts         # Application entry point
```

## Prerequisites

- Node.js 18+
- npm or yarn
- MongoDB (local or Atlas)

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Update `.env` with your MongoDB connection string and other settings

## Configuration

### Environment Variables

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/sma-backend

# JWT
JWT_SECRET=your_secret_key_here
JWT_EXPIRE=7d

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# GitHub OAuth (optional)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:3000/api/auth/github/callback
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Run production build
- `npm test` - Run tests
- `npm run lint` - Run ESLint

## API Endpoints

### Authentication

#### Register
- **POST** `/api/auth/register`
- Body:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "confirmPassword": "password123"
}
```
- Response:
```json
{
  "message": "User registered successfully",
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

#### Login
- **POST** `/api/auth/login`
- Body:
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```
- Response:
```json
{
  "message": "Login successful",
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

#### Get Profile
- **GET** `/api/auth/profile`
- Headers: `Authorization: Bearer <jwt_token>`
- Response:
```json
{
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "isVerified": true
  }
}
```

#### Logout
- **POST** `/api/auth/logout`
- Response:
```json
{
  "message": "Logged out successfully"
}
```

#### Google OAuth
- **GET** `/api/auth/google` - Initiates Google login
- **GET** `/api/auth/google/callback` - Google callback (automatic)

#### GitHub OAuth
- **GET** `/api/auth/github` - Initiates GitHub login
- **GET** `/api/auth/github/callback` - GitHub callback (automatic)

### Users

#### Get All Users
- **GET** `/api/users`
- Response: Array of users

#### Get User by ID
- **GET** `/api/users/:id`
- Response: User object

#### Create User
- **POST** `/api/users`
- Body:
```json
{
  "name": "User Name",
  "email": "user@example.com"
}
```

#### Update User
- **PUT** `/api/users/:id`
- Body: Partial user object to update

#### Delete User
- **DELETE** `/api/users/:id`

### Health Check
- **GET** `/health` - Server health status

## Authentication

### JWT Authentication
The API uses JWT (JSON Web Tokens) for authentication. After login or registration, you'll receive a token. Include it in the Authorization header for protected routes:

```
Authorization: Bearer <your_jwt_token>
```

### OAuth Support
The API supports OAuth authentication via:
- **Google OAuth 2.0** - For Google account login
- **GitHub OAuth** - For GitHub account login

To enable OAuth, set up your credentials in the respective provider's console and add them to your `.env` file.

## Development

Start the development server:
```bash
npm run dev
```

The server will run on `http://localhost:3000` by default.

## Building

Build the project:
```bash
npm run build
```

The compiled JavaScript will be output to the `dist/` directory.

## Features

✅ User Registration with Email & Password
✅ Login with Email & Password
✅ Google OAuth 2.0 Integration
✅ GitHub OAuth Integration
✅ JWT Token-based Authentication
✅ Password Hashing with bcryptjs
✅ Protected Routes
✅ User Profile Management
✅ Comprehensive Error Handling

## License

MIT
