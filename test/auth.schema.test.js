const test = require('node:test');
const assert = require('node:assert/strict');

const {
  loginSchema,
  registerSchema,
} = require('../src/modules/auth/auth.schema');

const fcmToken = 'fcm-registration-token-1234567890';

test('login accepts an FCM token and platform together', () => {
  const { error, value } = loginSchema.validate({
    email: 'user@example.com',
    password: 'password123',
    fcmToken,
    platform: 'android',
  });

  assert.equal(error, undefined);
  assert.equal(value.fcmToken, fcmToken);
  assert.equal(value.platform, 'android');
});

test('login keeps device registration optional', () => {
  const { error } = loginSchema.validate({
    email: 'user@example.com',
    password: 'password123',
  });

  assert.equal(error, undefined);
});

test('auth schemas reject partial device registration', () => {
  const login = loginSchema.validate({
    email: 'user@example.com',
    password: 'password123',
    fcmToken,
  });
  const registration = registerSchema.validate({
    email: 'user@example.com',
    password: 'password123',
    confirmPassword: 'password123',
    name: 'Path Finder',
    university: 'ITI',
    major: 'Software Engineering',
    location: 'Cairo',
    educationLevel: 'Bachelor',
    experienceYear: '0-1',
    currentStatus: 'student',
    targetCareer: 'Backend Developer',
    platform: 'android',
  });

  assert.match(login.error.message, /required peers/);
  assert.match(registration.error.message, /required peers/);
});
