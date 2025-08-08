# 🧪 API Testing Reference

## ✅ Your Backend is Working!

The registration endpoint is functioning correctly. Here are examples:

### ✅ Successful Registration
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"name": "John Doe", "email": "john@example.com", "password": "Password123"}'
```

### ✅ Successful Login
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"email": "john@example.com", "password": "Password123"}'
```

### ❌ Common 400 Errors and Solutions

#### Password Too Weak
```json
// ❌ This will fail:
{"password": "123"}

// ✅ Use this instead:
{"password": "Password123"}
```

#### Invalid Email Format
```json
// ❌ This will fail:
{"email": "invalid-email"}

// ✅ Use this instead:
{"email": "user@example.com"}
```

#### Name Too Short
```json
// ❌ This will fail:
{"name": "A"}

// ✅ Use this instead:
{"name": "John Doe"}
```

#### Missing Content-Type Header
```javascript
// ❌ This will fail:
fetch('/api/auth/register', {
  method: 'POST',
  body: JSON.stringify(data)
})

// ✅ Use this instead:
fetch('/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
})
```

## 🎯 Validation Requirements

### Name
- ✅ 2-50 characters
- ✅ Letters and spaces only
- ❌ Numbers or special characters

### Email  
- ✅ Valid email format (user@domain.com)
- ✅ Must be unique

### Password
- ✅ At least 6 characters
- ✅ At least 1 uppercase letter
- ✅ At least 1 lowercase letter  
- ✅ At least 1 number

Your backend is ready for frontend integration! 🚀
