import express from 'express';

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT) || 5000;
const MAX_RETENTION_MINUTES = Number(process.env.MAX_RETENTION_MINUTES) || 1440;
const MAX_RETENTION_MS = MAX_RETENTION_MINUTES * 60 * 1000;
const BUCKET_SIZE_MS = 60 * 1000;
const activityBuckets = new Map();

function parseInteger(value) {
    if (typeof value === 'number' && Number.isInteger(value)) {
        return value;
    }

    if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
        return Number(value);
    }

    return null;
}

function normalizeTimestamp(value) {
    const parsedTimestamp = parseInteger(value);

    if (parsedTimestamp === null || parsedTimestamp <= 0) {
        return null;
    }

    return parsedTimestamp < 1_000_000_000_000 ? parsedTimestamp * 1000 : parsedTimestamp;
}

function pruneBuckets(referenceTime = Date.now()) {
    const oldestAllowedBucket = Math.floor((referenceTime - MAX_RETENTION_MS) / BUCKET_SIZE_MS) * BUCKET_SIZE_MS;

    for (const bucketStart of activityBuckets.keys()) {
        if (bucketStart < oldestAllowedBucket) {
            activityBuckets.delete(bucketStart);
        }
    }
}

function addLog(userId, timestamp) {
    const bucketStart = Math.floor(timestamp / BUCKET_SIZE_MS) * BUCKET_SIZE_MS;
    const bucketUsers = activityBuckets.get(bucketStart) ?? new Map();
    const latestTimestamp = bucketUsers.get(userId) ?? 0;
    bucketUsers.set(userId, Math.max(latestTimestamp, timestamp));
    activityBuckets.set(bucketStart, bucketUsers);
}

app.post('/logs', (req, res) => {
    const userId = parseInteger(req.body?.userId);
    const timestamp = normalizeTimestamp(req.body?.timestamp);

    if (userId === null || userId <= 0 || timestamp === null) {
        return res.status(400).json({
            error: 'Invalid input. userId must be a positive integer and timestamp must be a valid Unix time in seconds or milliseconds.'
        });
    }

    pruneBuckets();
    addLog(userId, timestamp);

    return res.status(201).json({ message: 'Log stored' });
});

app.get('/active-users', (req, res) => {
    const minutes = parseInteger(req.query.minutes);

    if (minutes === null || minutes <= 0) {
        return res.status(400).json({ error: 'minutes must be a positive integer.' });
    }

    if (minutes > MAX_RETENTION_MINUTES) {
        return res.status(400).json({
            error: `minutes cannot exceed ${MAX_RETENTION_MINUTES} because older activity is pruned from memory.`
        });
    }

    const currentTime = Date.now();
    const windowStart = currentTime - minutes * 60 * 1000;
    const firstBucket = Math.floor(windowStart / BUCKET_SIZE_MS) * BUCKET_SIZE_MS;
    const uniqueUsers = new Set();

    pruneBuckets(currentTime);

    for (const [bucketStart, bucketUsers] of activityBuckets.entries()) {
        if (bucketStart < firstBucket) {
            continue;
        }

        for (const [userId, latestTimestamp] of bucketUsers.entries()) {
            if (latestTimestamp >= windowStart) {
                uniqueUsers.add(userId);
            }
        }
    }

    return res.status(200).json({ activeUsers: uniqueUsers.size });
});


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});