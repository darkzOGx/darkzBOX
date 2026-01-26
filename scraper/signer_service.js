const http = require('http');
const url = require('url');

const hostname = '127.0.0.1';
const port = 3000;

// This would contain the actual obfuscated generation logic or import a binary
function generateXBogus(requestUrl, userAgent) {
    console.log(`Signing for UA: ${userAgent}`);
    // Simulating a computed signature
    const timestamp = Date.now();
    return `DFSzswVL-${timestamp}-SIGNED`;
}

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);

    if (parsedUrl.pathname === '/sign' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const signature = generateXBogus(data.url, data.user_agent);

                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ x_bogus: signature }));
            } catch (e) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: "Invalid JSON" }));
            }
        });
    } else {
        res.statusCode = 404;
        res.end('Not Found');
    }
});

server.listen(port, hostname, () => {
    console.log(`Signer Service running at http://${hostname}:${port}/`);
});
