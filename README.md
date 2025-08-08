# WhatsApp Clone Backend

A robust, production-ready WhatsApp clone backend built with Node.js, Express.js, MongoDB, and Socket.io. This backend supports real-time messaging, user authentication, contact management, and is optimized for deployment on free hosting services.

## 🚀 Features

### Core Features
- **User Authentication System**
  - Registration with email/password
  - JWT-based authentication
  - Password reset capability
  - Email verification
  - Profile management

- **Real-time Messaging**
  - One-to-one messaging
  - Message status (sent, delivered, read)
  - Message types (text, emoji)
  - Message editing and deletion
  - Message forwarding
  - Reply to messages
  - Typing indicators

- **Contact Management**
  - Add/remove contacts
  - Search contacts
  - Online status tracking
  - Mutual contacts discovery

- **Security & Performance**
  - Rate limiting
  - Data sanitization
  - XSS protection
  - CORS configuration
  - Compression
  - Input validation

## 🛠 Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Real-time**: Socket.io
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: Helmet, express-rate-limit, express-mongo-sanitize, xss-clean
- **Validation**: express-validator
- **Email**: Nodemailer
- **Testing**: Jest, Supertest

## 📁 Project Structure

```
Backend/
├── config/
│   └── database.js          # MongoDB connection configuration
├── controllers/
│   ├── authController.js    # Authentication logic
│   ├── userController.js    # User management logic
│   ├── contactController.js # Contact management logic
│   └── messageController.js # Message handling logic
├── middleware/
│   ├── auth.js             # Authentication middleware
│   ├── errorHandler.js     # Global error handling
│   └── validation.js       # Input validation rules
├── models/
│   ├── User.js             # User schema and methods
│   └── Message.js          # Message schema and methods
├── routes/
│   ├── authRoutes.js       # Authentication endpoints
│   ├── userRoutes.js       # User management endpoints
│   ├── contactRoutes.js    # Contact management endpoints
│   └── messageRoutes.js    # Message handling endpoints
├── socket/
│   └── socketHandler.js    # Socket.io real-time logic
├── tests/
│   ├── auth.test.js        # Authentication tests
│   └── messages.test.js    # Message functionality tests
├── utils/
│   ├── emailService.js     # Email sending utilities
│   └── helpers.js          # Common utility functions
├── server.js               # Main server file
├── package.json            # Project dependencies
├── .env.example            # Environment variables template
└── README.md               # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local installation or MongoDB Atlas)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd Backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit the `.env` file with your configuration:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/whatsapp-clone
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRES_IN=7d
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   CLIENT_URL=http://localhost:3000
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:5000`. You can verify it's running by visiting `http://localhost:5000/health`.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

## 📚 API Documentation

### Authentication Endpoints (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/register` | Register new user | No |
| POST | `/login` | User login | No |
| POST | `/logout` | User logout | Yes |
| GET | `/me` | Get current user | Yes |
| PUT | `/me` | Update profile | Yes |
| PUT | `/updatepassword` | Update password | Yes |
| POST | `/forgotpassword` | Request password reset | No |
| PUT | `/resetpassword/:token` | Reset password | No |
| GET | `/verify/:token` | Verify email | No |
| POST | `/resend-verification` | Resend verification email | Yes |
| POST | `/refresh` | Refresh token | Yes |

### User Management (`/api/users`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | Get users with search | Yes |
| GET | `/:id` | Get user by ID | Yes |
| POST | `/search` | Search users | Yes |
| GET | `/:id/status` | Get user status | Yes |
| PUT | `/status` | Update online status | Yes |
| POST | `/:id/block` | Block user | Yes |
| DELETE | `/:id/block` | Unblock user | Yes |
| GET | `/blocked` | Get blocked users | Yes |
| GET | `/stats` | Get user statistics | Yes |

### Contact Management (`/api/contacts`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | Get contacts | Yes |
| POST | `/` | Add contact | Yes |
| DELETE | `/:userId` | Remove contact | Yes |
| GET | `/:userId` | Get contact details | Yes |
| GET | `/check/:userId` | Check if user is contact | Yes |
| GET | `/online` | Get online contacts | Yes |
| POST | `/search` | Search contacts | Yes |
| GET | `/mutual/:userId` | Get mutual contacts | Yes |
| GET | `/stats` | Get contact statistics | Yes |

### Messaging (`/api/messages`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/` | Send message | Yes |
| GET | `/conversations` | Get all conversations | Yes |
| GET | `/conversation/:userId` | Get conversation with user | Yes |
| PUT | `/read/:senderId` | Mark messages as read | Yes |
| DELETE | `/:messageId` | Delete message | Yes |
| PUT | `/:messageId` | Edit message | Yes |
| GET | `/:messageId` | Get message by ID | Yes |
| POST | `/search/:userId` | Search messages | Yes |
| GET | `/unread/count` | Get unread count | Yes |
| GET | `/stats` | Get message statistics | Yes |
| POST | `/:messageId/forward` | Forward message | Yes |

## 🔌 Socket.io Events

### Client to Server Events

| Event | Data | Description |
|-------|------|-------------|
| `joinConversation` | `{ receiverId }` | Join a conversation room |
| `sendMessage` | `{ receiverId, content, messageType?, replyTo? }` | Send a message |
| `typing` | `{ receiverId, isTyping }` | Send typing indicator |
| `markAsRead` | `{ messageId, senderId }` | Mark message as read |
| `updateStatus` | `{ status }` | Update user status |

### Server to Client Events

| Event | Data | Description |
|-------|------|-------------|
| `newMessage` | `message` | New message received |
| `messageNotification` | `{ message, sender }` | Message notification |
| `typingIndicator` | `{ userId, userName, isTyping }` | Typing indicator |
| `messageRead` | `{ readBy, senderId, timestamp }` | Message read confirmation |
| `userOnline` | `{ userId, isOnline, lastSeen }` | User came online |
| `userOffline` | `{ userId, isOnline, lastSeen }` | User went offline |
| `statusUpdate` | `{ userId, status }` | User status update |
| `conversationJoined` | `{ conversationId, receiverId }` | Conversation joined |
| `error` | `{ message }` | Error occurred |

## 🚀 Deployment

### Free Hosting Options

This backend is optimized for deployment on free hosting services:

#### 1. Render.com (Recommended)

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Configure environment variables
4. Deploy with these settings:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node

#### 2. Railway.app

1. Connect your GitHub repository to Railway
2. Add environment variables
3. Deploy automatically

#### 3. Fly.io

1. Install Fly CLI
2. Run `fly launch` in your project directory
3. Configure `fly.toml`
4. Deploy with `fly deploy`

### Database Setup (MongoDB Atlas Free Tier)

1. Create a MongoDB Atlas account
2. Create a new cluster (Free tier: M0)
3. Create a database user
4. Whitelist your IP address (or use 0.0.0.0/0 for all IPs)
5. Get your connection string and update `MONGODB_URI`

### Environment Variables for Production

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/whatsapp-clone
JWT_SECRET=your-production-jwt-secret
JWT_EXPIRES_IN=7d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
CLIENT_URL=https://your-frontend-url.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🔒 Security Features

- **Authentication**: JWT tokens with secure headers
- **Rate Limiting**: Prevents API abuse
- **Data Sanitization**: Protection against NoSQL injection
- **XSS Protection**: Cleans user input
- **CORS**: Configured for specific origins
- **Helmet**: Sets various HTTP headers
- **Password Hashing**: bcrypt with salt rounds
- **Input Validation**: Comprehensive validation rules

## 🧪 Testing

The project includes comprehensive test suites:

```bash
# Run all tests
npm test

# Run specific test file
npm test auth.test.js

# Run tests with coverage
npm test -- --coverage
```

Test files cover:
- Authentication flows
- Message functionality
- API endpoints
- Error handling

## 📊 Performance Optimizations

- **Database Indexing**: Optimized queries with proper indexes
- **Pagination**: Efficient data loading
- **Compression**: gzip compression for responses
- **Caching**: Connection pooling and query optimization
- **Rate Limiting**: Prevents server overload
- **Graceful Shutdown**: Proper cleanup on server termination

## 🔧 Configuration

### Database Indexes

The application automatically creates these indexes for optimal performance:

- User email (unique)
- User name (text search)
- Message participants and timestamps
- Message status and timestamps

### Rate Limiting

- **Window**: 15 minutes
- **Max Requests**: 100 per IP
- **Scope**: All API routes (`/api/*`)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/your-repo/issues) page
2. Create a new issue with detailed information
3. Include error logs and steps to reproduce

## 🔄 Roadmap

Future enhancements planned:
- [ ] Group messaging
- [ ] File/image uploads
- [ ] Voice messages
- [ ] Video calls
- [ ] Message encryption
- [ ] Push notifications
- [ ] Message reactions
- [ ] Stories feature
- [ ] Advanced admin panel

---

**Happy Coding! 🚀**
