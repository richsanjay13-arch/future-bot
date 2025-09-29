const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('simple-frontend'));
const dataFile = path.join(__dirname, 'messages.json');

// Logger function
function log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    console.log(JSON.stringify({ timestamp, level, message, ...data }));
}

// Initialize data file
if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify([]));
    log('info', 'Data file created');
}

function readMessages() {
    try {
        const data = fs.readFileSync(dataFile, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        log('error', 'Failed to read messages', { error: error.message });
        return [];
    }
}

function writeMessages(messages) {
    try {
        fs.writeFileSync(dataFile, JSON.stringify(messages, null, 2));
        log('info', 'Messages saved', { count: messages.length });
    } catch (error) {
        log('error', 'Failed to write messages', { error: error.message });
        throw error;
    }
}

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        messagesCount: readMessages().length
    });
});

// Save message
app.post('/save', (req, res) => {
    try {
        const { text } = req.body;
        
        if (!text || text.trim().length === 0) {
            return res.status(400).json({ 
                error: 'Message text is required' 
            });
        }

        if (text.length > 500) {
            return res.status(400).json({ 
                error: 'Message too long (max 500 characters)' 
            });
        }

        const messages = readMessages();
        const newMessage = {
            _id: Date.now().toString(),
            text: text.trim(),
            createdAt: new Date().toISOString()
        };
        
        messages.push(newMessage);
        writeMessages(messages);
        
        log('info', 'Message created', { id: newMessage._id });
        res.json({ saved: true, id: newMessage._id, message: newMessage });
        
    } catch (error) {
        log('error', 'Save failed', { error: error.message });
        res.status(500).json({ error: 'Failed to save message' });
    }
});

// Get messages
app.get('/messages', (req, res) => {
    try {
        const messages = readMessages();
        res.json(messages.reverse());
    } catch (error) {
        log('error', 'Get messages failed', { error: error.message });
        res.status(500).json({ error: 'Failed to retrieve messages' });
    }
});

// Delete message
app.delete('/messages/:id', (req, res) => {
    try {
        const { id } = req.params;
        const messages = readMessages();
        const filtered = messages.filter(msg => msg._id !== id);
        
        if (filtered.length === messages.length) {
            return res.status(404).json({ error: 'Message not found' });
        }
        
        writeMessages(filtered);
        log('info', 'Message deleted', { id });
        res.json({ deleted: true, id });
        
    } catch (error) {
        log('error', 'Delete failed', { error: error.message });
        res.status(500).json({ error: 'Failed to delete message' });
    }
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((error, req, res, next) => {
    log('error', 'Unhandled error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    log('info', 'Server started', { port: PORT });
    console.log(`Future-Bot is running on http://localhost:${PORT}`);
});