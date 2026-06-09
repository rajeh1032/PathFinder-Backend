# Common folder explanation

This folder contains the shared backend building blocks used across the application. It centralizes reusable error handling, authentication, validation, response formatting, logging, and pagination helpers so the rest of the modules stay consistent and easier to maintain.

## Structure

### errors

- AppError.js
  - A custom error class for predictable application errors.
  - Supports status codes and optional details for API responses.
- errorHandler.js
  - Express error middleware that formats thrown errors into a consistent JSON response.

### middlewares

- auth.middleware.js
  - Verifies JWT-based authentication.
  - Exposes authenticate and authorize middleware for protected routes.
- rateLimit.middleware.js
  - Creates rate limiting middleware to protect endpoints from abuse.
- validate.middleware.js
  - Validates request body, query, or params using Joi schemas.

### utils

- apiResponse.js
  - Helper functions to send standardized success and error responses.
- asyncHandler.js
  - Wraps async route handlers and forwards errors to Express.
- logger.js
  - Configures a shared Winston logger for console and file output.
- pagination.js
  - Provides pagination helpers for list endpoints.

## How to use these modules

### Error handling

Use AppError when you want to raise a known application error:

```js
const AppError = require('../common/errors/AppError');

throw new AppError('User not found', 404);
```

Register the global error handler in your Express app:

```js
const errorHandler = require('./common/errors/errorHandler');
app.use(errorHandler);
```

### Authentication

Protect routes with authenticate and authorize:

```js
const {
  authenticate,
  authorize,
} = require('../common/middlewares/auth.middleware');

router.get(
  '/profile',
  authenticate,
  authorize('user', 'admin'),
  controller.getProfile,
);
```

### Validation

Validate request data before controller logic:

```js
const { validateBody } = require('../common/middlewares/validate.middleware');
const Joi = require('joi');

const schema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

router.post('/login', validateBody(schema), controller.login);
```

### Standard API responses

Return consistent payloads from controllers:

```js
const { sendSuccess, sendError } = require('../common/utils/apiResponse');

sendSuccess(res, user, 'User profile fetched successfully');
```

### Logging

Use the shared logger anywhere in the app:

```js
const logger = require('../common/utils/logger');

logger.info('User created successfully');
```

### Pagination

Use pagination helpers in list endpoints:

```js
const { paginateData } = require('../common/utils/pagination');

const result = paginateData(items, req.query, totalItems);
```

## Notes

- The folder is designed to be used across all modules in the backend.
- Keep helpers small and reusable instead of duplicating logic in each feature folder.
- If new shared functionality is added, place it here rather than inside feature modules.
