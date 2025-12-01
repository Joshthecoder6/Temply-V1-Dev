// List ALL plans from Live Mantle
const LIVE_MANTLE_APP_ID = '0edfd6a7-8fa2-4493-b08b-5b40965b88ba';
const LIVE_MANTLE_API_KEY = 'a7bfa30712c104840e022d07ec13c10365075ba9bbeae697b4112b9522f343719cd1fce7a472266d24b4e28345c579f830d2b148ab4292b7c80a6d80dc68c9e0.2ea11708a67b2dc9';

async function listAllPlans() {
    const identifyResponse = await fetch('https://appapi.heymantle.com/v1/identify', {
        method: 'POST',
        headers: {
            'X-Mantle-App-Id': LIVE_MANTLE_APP_ID,
            'X-Mantle-App-Api-Key': LIVE_MANTLE_API_KEY,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            platform: 'shopify',
            platformId: LIVE_MANTLE_APP_ID,
            myshopifyDomain: 'test.myshopify.com',
            customer_id: 'test.myshopify.com',
            email: 'test@example.com',
            name: 'Test',
        }),
    });

    const identifyData = await identifyResponse.json();
    const customerToken = identifyData.apiToken;

    const customerResponse = await fetch('https://appapi.heymantle.com/v1/customer', {
        method: 'GET',
        headers: {
            'X-Mantle-App-Id': LIVE_MANTLE_APP_ID,
            'X-Mantle-Customer-Api-Token': customerToken,
            'Content-Type': 'application/json',
        },
    });

    const customerData = await customerResponse.json();
    const allPlans = customerData.plans || [];

    console.log('\n🎯 ALL PLANS IN LIVE MANTLE:\n');
    allPlans.forEach((plan, i) => {
        console.log(`${i + 1}. ${plan.name}`);
        console.log(`   ID: ${plan.id}`);
        console.log(`   Price: $${plan.amount} ${plan.currencyCode}`);
        console.log(`   Trial: ${plan.trialDays} days`);
        console.log(`   Public: ${plan.public}`);
        console.log('');
    });

    console.log(`\nTotal: ${allPlans.length} plans found\n`);

    // Find specific plans
    const beginner = allPlans.find(p => p.name.toLowerCase().includes('beginner'));
    const growth = allPlans.find(p => p.name.toLowerCase().includes('growth'));
    const example = allPlans.find(p => p.name.toLowerCase().includes('example'));

    console.log('📦 PLAN IDS:\n');
    if (beginner) console.log(`Beginner: ${beginner.id}`);
    if (growth) console.log(`Growth: ${growth.id}`);
    if (example) console.log(`Example: ${example.id}`);
}

listAllPlans();
