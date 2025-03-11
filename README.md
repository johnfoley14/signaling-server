# signaling-server
Signaling server to establish peer to peer connections

# monitor server with pm2

pm2 start signaling.js
pm2 status
pm2 stop signaling.js
pm2 restart signaling.js
pm2 startup
pm2 save
pm2 logs signaling.js
tail -f ~/.pm2/logs/signaling-error.log

