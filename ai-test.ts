// test-polar.js
import fetch from "node-fetch"; // If using Node 18+, fetch is built-in

const POLAR_TOKEN = process.env.POLAR_ACCESS_TOKEN ;

async function testPolarToken() {
  try {
    const res = await fetch("https://api.polar.sh/v1/users/me", {
      headers: { Authorization: `Bearer ${POLAR_TOKEN}` },
    });

    if (!res.ok) {
      console.error("Error:", res.status, await res.text());
      return;
    }

    const data = await res.json();
    console.log("Polar token is valid. Response:");
    console.log(data);
  } catch (err) {
    console.error("Request failed:", err);
  }
}

testPolarToken();
