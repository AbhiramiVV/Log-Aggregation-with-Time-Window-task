# Log Aggregation API

## Run

```bash
npm install
npm start
```

The server listens on `http://localhost:5000` by default.

## Endpoints

### POST /logs

Stores a log in memory.

Example body:

```json
{
	"userId": 1,
	"timestamp": 1710000000
}
```

`timestamp` accepts Unix time in seconds or milliseconds.

### GET /active-users?minutes=N

Returns the number of unique users active in the last `N` minutes.

Example response:

```json
{
	"activeUsers": 3
}
```

## Notes

- Invalid inputs return `400`.
- Activity is grouped into minute buckets for faster queries.
- Old buckets are pruned automatically to avoid unbounded memory growth.
