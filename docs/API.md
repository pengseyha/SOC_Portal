# SOC Monitoring Portal API

Base URL: `http://localhost:4000/api`

All protected routes require:

```http
Authorization: Bearer <jwt>
```

## Auth

- `POST /auth/register` `{ name, email, username, password }`
- `POST /auth/login` `{ identifier, password, rememberMe }`
- `POST /auth/logout`
- `POST /auth/forgot-password` `{ email }`
- `POST /auth/reset-password` `{ token, password }`
- `GET /auth/me`

## Profile

- `GET /profile`
- `PUT /profile` `{ name, email, title, department, phone }`
- `PUT /profile/password` `{ currentPassword, newPassword }`
- `GET /profile/login-history`
- `GET /profile/activity`

## Admin

- `GET /admin/users`
- `POST /admin/users`
- `PUT /admin/users/:id`
- `PATCH /admin/users/:id/disable`
- `DELETE /admin/users/:id`
- `POST /admin/users/:id/reset-password`
- `GET /admin/audit-logs`
- `GET /admin/security-events`

## Logs And Events

- `GET /audit-logs?search=&severity=&status=&eventType=`
- `GET /audit-logs/export.csv`
- `GET /security-events?severity=&search=`
- `GET /dashboard/overview`
- `GET /activity/timeline`

## Contact And Uploads

- `POST /contact` `{ name, email, subject, message }`
- `GET /contact` admin only
- `POST /uploads` multipart `file`
- `GET /uploads`
