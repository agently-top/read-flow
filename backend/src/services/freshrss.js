import axios from 'axios';

const FRESHRSS_URL = process.env.FRESHRSS_URL || 'http://localhost:8081';
const FRESHRSS_USER = process.env.FRESHRSS_USER || 'admin';
const FRESHRSS_PASSWORD = process.env.FRESHRSS_PASSWORD || 'FreshRSS2026!';

let FRESHRSS_API_KEY = null;

// 登录获取 API Key
export async function loginToFreshRSS() {
  try {
    const response = await axios.post(
      `${FRESHRSS_URL}/api/greader.php/accounts/ClientLogin`,
      new URLSearchParams({
        Email: FRESHRSS_USER,
        Passwd: FRESHRSS_PASSWORD,
        service: 'reader'
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    
    const match = response.data.match(/Auth=([a-z0-9]+)/i);
    if (match) {
      FRESHRSS_API_KEY = match[1];
      console.log('FreshRSS login successful');
      return FRESHRSS_API_KEY;
    }
    throw new Error('Failed to extract API key');
  } catch (error) {
    console.error('FreshRSS login failed:', error.message);
    throw error;
  }
}

// 获取未读文章
export async function getUnreadArticles() {
  if (!FRESHRSS_API_KEY) {
    await loginToFreshRSS();
  }

  try {
    const response = await axios.get(
      `${FRESHRSS_URL}/api/greader.php/reader/api/0/stream/contents/user/-/state/com.google/reading-list`,
      {
        headers: { 'Authorization': `GoogleLogin auth=${FRESHRSS_API_KEY}` },
        params: { xt: 'user/-/state/com.google/read', n: 100 }
      }
    );
    
    return response.data.items || [];
  } catch (error) {
    console.error('Failed to fetch unread articles:', error.message);
    throw error;
  }
}

// 标记文章为已读
export async function markAsRead(articleId) {
  if (!FRESHRSS_API_KEY) {
    await loginToFreshRSS();
  }

  try {
    await axios.post(
      `${FRESHRSS_URL}/api/greader.php/reader/api/0/edit-tag`,
      new URLSearchParams({
        i: articleId,
        a: 'user/-/state/com.google/read'
      }),
      {
        headers: {
          'Authorization': `GoogleLogin auth=${FRESHRSS_API_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
  } catch (error) {
    console.error('Failed to mark as read:', error.message);
    throw error;
  }
}
