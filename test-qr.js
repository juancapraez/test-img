/**
 * Test script for QR payment endpoint
 */

const axios = require('axios');

const testData = {
  external_reference: 'TEST-' + Date.now(),
  data: 'https://example.com/payment/123456',
  business: {
    logo: 'https://via.placeholder.com/130x45/2563eb/ffffff?text=LOGO',
    main_color_brand: '#2563eb',
    secondary_color_brand: '#f3f4f6',
  },
};

async function testQrEndpoint() {
  try {
    console.log('Testing QR endpoint...');
    console.log('Request data:', JSON.stringify(testData, null, 2));
    
    const response = await axios.post('http://localhost:3000/qr/payment', testData, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('\n✅ Success!');
    console.log('Response:', response.data);
    
    if (response.data.url) {
      console.log('\n📎 QR Image URL:', response.data.url);
    }
  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
  }
}

testQrEndpoint();
