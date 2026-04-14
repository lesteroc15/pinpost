const axios = require('axios');

async function refreshAccessToken(refreshToken) {
  const res = await axios.post('https://oauth2.googleapis.com/token', {
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  });
  return res.data.access_token;
}

async function listAccounts(accessToken) {
  const res = await axios.get(
    'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return res.data.accounts || [];
}

async function listLocations(accessToken, accountId) {
  const res = await axios.get(
    `https://mybusinessbusinessinformation.googleapis.com/v1/${accountId}/locations?readMask=name,title,storefrontAddress`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return res.data.locations || [];
}

async function createLocalPost({ accessToken, accountId, locationId, description, photoUrl }) {
  const body = {
    languageCode: 'en-US',
    summary: description,
    topicType: 'STANDARD'
  };

  if (photoUrl) {
    body.media = [{ mediaFormat: 'PHOTO', sourceUrl: photoUrl }];
  }

  const res = await axios.post(
    `https://mybusiness.googleapis.com/v4/${accountId}/${locationId}/localPosts`,
    body,
    { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
  );
  return res.data;
}

module.exports = { refreshAccessToken, listAccounts, listLocations, createLocalPost };
