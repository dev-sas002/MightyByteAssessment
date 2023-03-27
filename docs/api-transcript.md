# Captured API transcript

Recorded at 2026-11-08 21:14 UTC against the Docker Compose stack (`docker compose up --build`),
with `jq`-style pretty printing. The token is shortened to its first 6 and last 4
characters; every other line is verbatim.

```console

$ curl -s localhost:3001/health
{
  "status": "healthy",
  "timestamp": "2026-11-08T21:14:06.299Z",
  "uptime": 5.835744878,
  "environment": "production",
  "version": "1.0.0"
}

$ curl -s -X POST localhost:3001/api/login -H 'Content-Type: application/json' -d '{"username":"driver1","password":"wrong"}'
{
  "error": "Invalid credentials"
}
HTTP 401

$ curl -s -X POST localhost:3001/api/login -H 'Content-Type: application/json' -d '{"username":"driver1","password":"password1"}'
{
  "success": true,
  "token": "eyJhbG…1QOA",
  "profile": {
    "id": "driver1",
    "name": "John Smith",
    "vehicle": "Toyota Camry 2020",
    "license": "ABC123",
    "rating": 4.8
  },
  "expiresIn": "300s",
  "expiresInSeconds": 300,
  "expiresAt": "2026-11-08T21:19:06.331Z"
}

$ curl -s -X POST localhost:3001/api/driver/update -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"lat":40.7128,"lng":-74.006}'
{
  "success": true,
  "message": "Location updated successfully",
  "location": {
    "lat": 40.7128,
    "lng": -74.006,
    "timestamp": "2026-11-08T21:14:06.367Z"
  },
  "withinServiceArea": true,
  "timestamp": "2026-11-08T21:14:06.367Z"
}

$ curl -s -X POST localhost:3001/api/driver/update -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"lat":"north","lng":-74.006}'
{
  "error": "Invalid location data: lat and lng must be finite numbers"
}
HTTP 400

$ curl -s -X POST localhost:3001/api/driver/update -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"lat": 40.7,'
{
  "error": "Expected double-quoted property name in JSON at position 13 (line 1 column 14)",
  "timestamp": "2026-11-08T21:14:06.407Z"
}
HTTP 400

$ curl -s localhost:3001/api/driver/online
{
  "success": true,
  "drivers": [
    {
      "driverId": "driver1",
      "profile": {
        "id": "driver1",
        "name": "John Smith",
        "vehicle": "Toyota Camry 2020",
        "license": "ABC123",
        "rating": 4.8
      },
      "lastSeen": "2026-11-08T21:14:06.367Z",
      "isOnline": true
    }
  ],
  "count": 1,
  "timestamp": "2026-11-08T21:14:06.428Z"
}

$ curl -s localhost:3001/api/driver/driver1/location
{
  "success": true,
  "driverId": "driver1",
  "profile": {
    "id": "driver1",
    "name": "John Smith",
    "vehicle": "Toyota Camry 2020",
    "license": "ABC123",
    "rating": 4.8
  },
  "location": {
    "lat": 40.7128,
    "lng": -74.006,
    "timestamp": "2026-11-08T21:14:06.367Z"
  },
  "isOnline": true,
  "timestamp": "2026-11-08T21:14:06.448Z"
}

$ curl -s localhost:3001/api/driver/stats
{
  "success": true,
  "stats": {
    "activeTokens": 2,
    "driverLocations": 1,
    "connectedSockets": 0,
    "onlineDrivers": 1
  },
  "timestamp": "2026-11-08T21:14:06.466Z"
}

$ curl -s -X POST localhost:3001/api/logout -H "Authorization: Bearer $TOKEN"
{
  "success": true,
  "message": "Logged out successfully"
}

$ curl -s localhost:3001/api/profile -H "Authorization: Bearer $TOKEN"
{
  "error": "Invalid, expired or revoked token"
}
HTTP 401
```
