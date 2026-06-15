# Backend Architecture Guide

## Overview

This project follows a **Modular Architecture** with clear separation of responsibilities. Each layer has a single responsibility, making the codebase easier to maintain, test, and scale.

### Request Flow

```text
Client Request
      │
      ▼
    Routes
      │
      ▼
  Controller
      │
      ▼
    Service
      │
      ▼
  Repository
      │
      ▼
   Database
```

---

# Project Structure

```text
src/
│
├── common/
│   ├── errors/
│   ├── middlewares/
│   └── utils/
│
├── config/
│   ├── gemini.js
│   ├── storage.js
│   └── supabase.js
│
├── modules/
│   ├── users/
│   │   ├── user.routes.js
│   │   ├── user.controller.js
│   │   ├── user.service.js
│   │   ├── user.repository.js
│   │   └── user.schema.js
│   │
│   └── auth/
│       ├── auth.routes.js
│       ├── auth.controller.js
│       ├── auth.service.js
│       ├── auth.repository.js
│       └── auth.schema.js
│
├── app.js
└── server.js
```

---

# Routes Layer

## Responsibility

Routes define API endpoints and map them to controller methods.

### Example

```javascript
const express = require("express");
const router = express.Router();
const userController = require("./user.controller");

router.post("/", userController.createUser);
router.get("/:id", userController.getUserById);

module.exports = router;
```

### Allowed

* Define endpoints
* Apply middleware
* Connect routes to controllers

### Not Allowed

* Database queries
* Business logic
* Request validation logic
* External API calls

### Rule

Routes should only answer:

> Which controller should handle this endpoint?

---

# Controller Layer

## Responsibility

Controllers handle incoming HTTP requests and outgoing HTTP responses.

### Example

```javascript
const userService = require("./user.service");

exports.createUser = async (req, res, next) => {
  try {
    const user = await userService.createUser(req.body);

    res.status(201).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};
```

### Allowed

* Read request data
* Call services
* Return responses
* Handle HTTP status codes

### Not Allowed

* Database queries
* Complex business logic
* External service integrations

### Rule

Controllers should answer:

> What should be returned to the client?

---

# Service Layer

## Responsibility

Services contain all business logic and application rules.

### Example

```javascript
const userRepository = require("./user.repository");

exports.createUser = async (userData) => {
  const existingUser =
    await userRepository.findByEmail(userData.email);

  if (existingUser) {
    throw new Error("Email already exists");
  }

  return await userRepository.create(userData);
};
```

### Allowed

* Business rules
* Data transformation
* Calling multiple repositories
* Calling third-party services
* Application workflows

### Examples

```javascript
if (user.role !== "admin")
```

```javascript
if (course.isPublished)
```

```javascript
await openAI.generateResponse()
```

```javascript
await stripe.createPayment()
```

### Not Allowed

* HTTP responses
* Express-specific logic
* Direct request/response handling

### Rule

Services should answer:

> What business action should happen?

---

# Repository Layer

## Responsibility

Repositories are responsible for database communication only.

### Example

```javascript
const User = require("./user.model");

exports.findByEmail = async (email) => {
  return User.findOne({ email });
};

exports.create = async (userData) => {
  return User.create(userData);
};
```

### Allowed

* Create records
* Read records
* Update records
* Delete records
* Database queries

### Not Allowed

* Business logic
* Validation logic
* Response handling

### Rule

Repositories should answer:

> How do we get or store data?

---

# Schema Layer

## Responsibility

Schemas define the structure and validation rules for data.

### Example (Zod)

```javascript
const { z } = require("zod");

const createUserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
});
```

### Example (Joi)

```javascript
const Joi = require("joi");

const createUserSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
});
```

### Allowed

* Field definitions
* Validation rules
* Request payload validation

### Not Allowed

* Business logic
* Database access
* Response handling

### Rule

Schemas should answer:

> Is this data valid?

---

# Layer Responsibilities Summary

| Layer      | Responsibility                |
| ---------- | ----------------------------- |
| Routes     | Define API endpoints          |
| Controller | Handle requests and responses |
| Service    | Business logic                |
| Repository | Database access               |
| Schema     | Validation and data structure |

---

# Quick Decision Guide

### If you are writing:

```javascript
router.post(...)
```

Place it in:

```text
Routes
```

---

### If you are writing:

```javascript
res.json(...)
```

Place it in:

```text
Controller
```

---

### If you are writing:

```javascript
if (user.role === "admin")
```

Place it in:

```text
Service
```

---

### If you are writing:

```javascript
User.findOne(...)
```

Place it in:

```text
Repository
```

---

### If you are writing:

```javascript
email: Joi.string().email()
```

Place it in:

```text
Schema
```

---

# Architecture Principles

1. Single Responsibility Principle (SRP)
2. Separation of Concerns
3. Feature-Based Modular Structure
4. Scalability
5. Maintainability
6. Testability

---

# Final Rule

Before writing code, ask yourself:

* Am I defining an endpoint? → Routes
* Am I handling a request/response? → Controller
* Am I implementing business logic? → Service
* Am I accessing the database? → Repository
* Am I validating data? → Schema

If every file follows its responsibility, the project will remain clean, scalable, and easy to maintain.
