const axios = require('axios');

const BASE = 'https://graph.facebook.com/v19.0';

async function postToFacebook({ pageAccessToken, pageId, message, photoUrl }) {
  if (photoUrl) {
    const res = await axios.post(`${BASE}/${pageId}/photos`, {
      url: photoUrl,
      caption: message,
      access_token: pageAccessToken
    });
    return res.data;
  }
  const res = await axios.post(`${BASE}/${pageId}/feed`, {
    message,
    access_token: pageAccessToken
  });
  return res.data;
}

async function postToInstagram({ pageAccessToken, igAccountId, message, photoUrl }) {
  if (!photoUrl) throw new Error('Instagram requires a photo');

  // Step 1: Create media container
  const containerRes = await axios.post(`${BASE}/${igAccountId}/media`, {
    image_url: photoUrl,
    caption: message,
    access_token: pageAccessToken
  });
  const creationId = containerRes.data.id;

  // Step 2: Publish the container
  const publishRes = await axios.post(`${BASE}/${igAccountId}/media_publish`, {
    creation_id: creationId,
    access_token: pageAccessToken
  });
  return publishRes.data;
}

async function getPageAccessToken({ userAccessToken, pageId }) {
  const res = await axios.get(`${BASE}/${pageId}`, {
    params: { fields: 'access_token', access_token: userAccessToken }
  });
  return res.data.access_token;
}

module.exports = { postToFacebook, postToInstagram, getPageAccessToken };
