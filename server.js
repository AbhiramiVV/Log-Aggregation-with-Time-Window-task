import express from 'express';

const app = express();
app.use(express.json());

let activeUsers = [];
//POST /logs
app.post('/logs', (req, res) => {    
    const { userId, timestamp } = req.body;
    console.log(`Received userId: ${userId} at timestamp: ${timestamp}`);
    activeUsers.push({ userId, timestamp });
    res.status(200).json({ message: 'User data received successfully' });
});
//GET /active-users?minutes=10
app.get('/active-users', (req, res) => {
    const minutes = parseInt(req.query.minutes, 10);

    const currentTime = Date.now();
    const pastTime = currentTime - minutes * 60 * 1000;
    
    const activeUsersWithinTimeFrame = activeUsers.filter(user => user.timestamp >= pastTime);
    const uniqueActiveUsers = [...new Set(activeUsersWithinTimeFrame.map(user => user.userId))];
    res.status(200).json({ activeUsers: uniqueActiveUsers.length });
});


app.listen(5000, () => {
    console.log('Server is running on port 5000');
});