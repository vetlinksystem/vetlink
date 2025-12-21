const http = require('http');
const app = require('./app');
const server = http.createServer(app);
const PORT = process.env.PORT || 8585;

/**
 * 
 * Credentials:
 * VetlinkSystem@gmail.com
 * VetLinkSystem123
 * 
 */

server.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
})