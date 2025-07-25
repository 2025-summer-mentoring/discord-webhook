require('dotenv').config();

const express = require('express');
const serverless = require('serverless-http');
const crypto = require('crypto');
const axios = require('axios');
const app = express();

app.use(express.json());

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

function verifySignature(req) {
  const signature = req.headers['x-hub-signature-256'];
  if (!signature) return false;
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const digest = 'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

app.post('/github-webhook', (req, res) => {
  if (!verifySignature(req)) {
    return res.status(401).send('Invalid signature');
  }

  const event = req.headers['x-github-event'];
  if (event === 'pull_request') {
    const pr = req.body.pull_request;
    const action = req.body.action;

    const embed = {
      title: `📢 ${pr.user.login}님이 과제를 제출하였습니다! [${pr.title}]`,
      description: `**${pr.title}**\n`,
      url: pr.html_url,
      color: 3447003
    };

    axios.post(DISCORD_WEBHOOK_URL, { embeds: [embed] })
      .then(() => res.status(200).send('OK'))
      .catch(err => {
        console.error(err);
        res.status(500).send('Discord webhook error');
      });
  } else {
    res.status(200).send('Event ignored');
  }
});

module.exports = app;
module.exports.handler = serverless(app);