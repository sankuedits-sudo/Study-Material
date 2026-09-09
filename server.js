        const express = require('express');
const axios = require('axios');
const app = express();

// यहाँ बोट टोकन सीधे सेट कर दिया गया है ताकि 500 एरर कभी न आए
const BOT_TOKEN = '8990729601:AAFQ9lzzryZUJVFmztFpK5vICwxfiabtZBA';

axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`)
    .then(() => console.log('Webhook deleted successfully!'))
    .catch(err => console.log('Webhook delete error:', err.message));

app.get('/stream', async (req, res) => {
    try {
        const fileId = req.query.file_id;
        if (!fileId) {
            return res.status(400).send('File ID गायब है!');
        }

        const fileResponse = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
        const filePath = fileResponse.data.result.file_path;
        const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;

        const headResponse = await axios.head(fileUrl);
        const fileSize = Number(headResponse.headers['content-length']);
        const range = req.headers.range;

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : Math.min(start + 2000000, fileSize - 1);
            const chunksize = (end - start) + 1;
            
            const videoStream = await axios({
                method: 'get',
                url: fileUrl,
                headers: { 
                    Range: `bytes=${start}-${end}`,
                    Connection: 'keep-alive'
                },
                responseType: 'stream'
            });

            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'video/mp4',
                'Cache-Control': 'no-cache',
            });

            videoStream.data.pipe(res);
        } else {
            const videoStream = await axios({
                method: 'get',
                url: fileUrl,
                headers: { Connection: 'keep-alive' },
                responseType: 'stream'
            });

            res.writeHead(200, {
                'Content-Length': fileSize,
                'Content-Type': 'video/mp4',
                'Cache-Control': 'no-cache',
            });

            videoStream.data.pipe(res);
        }

    } catch (error) {
        console.error('Stream Error:', error.message);
        if (!res.headersSent) {
            res.status(500).send('वीडियो स्ट्रीम करने में समस्या आई है।');
        }
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
