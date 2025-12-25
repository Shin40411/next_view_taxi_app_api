# Taxi App Backend Service

This is the backend service for the Taxi App, built with the [NestJS](https://github.com/nestjs/nest) framework.

## Prerequisites

Before getting started, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- [MySQL](https://www.mysql.com/) (v8.0 or later for Spatial Data support)
- [Redis](https://redis.io/) (v6.0 or later)

## Installation

```bash
$ npm install
```

## Configuration

1. Create a `.env` file in the root directory (you can copy from `.env.example` if it exists, otherwise use the template below).
2. Configure the following environment variables:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_NAME=taxi_app_db

# Paseto Secret (Required for Token Encryption - Hex formatted)
# You can generate a random 32-byte hex string (64 characters)
PASETO_SECRET=a1b2c3d4...

# Optional
PORT=3000
```

> **Note:** Redis is currently hardcoded to connect to `localhost:6379`. Ensure your Redis server is running locally on the default port.

## Database Setup

The application uses TypeORM with `synchronize: true` for development, so table schemas will be automatically created/updated when you start the application.

- Ensure your MySQL server is running.
- Create the database specified in `DB_NAME` (e.g., `taxi_app_db`) before starting the app.

## Running the app

```bash
# development
$ npm run start

# watch mode (recommended for dev)
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Features & Modules

- **Auth**: User registration (Partner/Customer), Login, Logout. Uses Paseto (v3) for tokens stored in Redis.
- **Admin**: User management (Get all users, Create users, Ban/Unban).
- **Partner**: Driver/Partner related features (Register, Create Trip Request, View Stats).
- **Customer**: Passenger/Service Point Owner features (Register, View Pending Requests, Confirm/Reject Requests).
- **Trips**: Core logic for trip management.
- **Static Assets**: Uploaded files (like ID cards) are serving from `./uploads` at `http://localhost:3000/assets/uploads/...`.

## API endpoints

The API is prefixed with `/api/v1` (based on codebase convention, though check `main.ts` to confirm global prefix if any).

Common endpoints:
- `POST /auth/register`: Register new user.
- `POST /auth/login`: Login.
- `GET /partner/stats`: Get partner statistics (today, week, month).
- `GET /partner/home`: Get partner home dashboard stats.
- `GET /partner/search-destination`: Search for service points.
- `POST /partner/create-request`: Create a trip request.
