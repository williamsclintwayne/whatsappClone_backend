// Simple test using native fetch (available in Node 18+)
async function testRegister() {
  try {
    const response = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123'
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Registration successful:');
      console.log(data);
    } else {
      console.log('❌ Registration failed:');
      console.log('Status:', response.status);
      console.log('Data:', data);
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }
}

testRegister();
