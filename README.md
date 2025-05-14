# signaling-server
Signaling server to establish peer to peer connections

To ensure the webapp can access the signaling server, visit https://3.254.201.195:3000/ and continue through to the webpage

# monitor server with pm2

pm2 start signaling.js
pm2 status
pm2 stop signaling.js
pm2 restart signaling.js
pm2 startup
pm2 save
pm2 logs signaling.js
tail -f ~/.pm2/logs/signaling-error.log

