const crypto = require('crypto');
const axios = require('axios');

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

function verifySignature(req, body) {
  const signature = req.headers['x-hub-signature-256'];
  if (!signature) return false;
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const digest = 'sha256=' + hmac.update(body).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const body = await new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', err => reject(err));
  });

  if (!verifySignature(req, body)) {
    return res.status(401).send('Invalid signature');
  }

  const payload = JSON.parse(body);
  const event = req.headers['x-github-event'];

  if (event === 'pull_request') {
    const pr = payload.pull_request;

    const embed = {
      title: `📢 ${pr.user.login}님이 과제를 제출하였습니다!`,
      description: `**${pr.title}**\n`,
      url: pr.html_url,
      color: 3447003
    };

    try {
      await axios.post(DISCORD_WEBHOOK_URL, { embeds: [embed] });
      return res.status(200).send('OK');
    } catch (err) {
      console.error(err);
      return res.status(500).send('Discord webhook error');
    }
  }

  return res.status(200).send('Event ignored');
};