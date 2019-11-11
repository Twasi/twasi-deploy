const HTTP = require("http");
const Webhook = require("github-webhook-handler");
const config = require('../config');

const createWebhook = (push, ping, error) => {
    const handler = Webhook({path: '/', secret: config.github.webhook.secret});
    HTTP.createServer((req, res) => {
        handler(req, res, err => {
            res.statusCode = 404;
            res.end('no such location')
        });
    }).listen(config.github.webhook.port);
    handler.on('push', push);
    handler.on('ping', ping);
    handler.on('error', error);
    return handler;
};

module.exports = createWebhook;
