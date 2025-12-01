// Script to fetch Live Mantle Plan IDs
const LIVE_MANTLE_APP_ID = '0edfd6a7-8fa2-4493-b08b-5b40965b88ba';
const LIVE_MANTLE_API_KEY = 'a7bfa30712c104840e022d07ec13c10365075ba9bbeae697b4112b9522f343719cd1fce7a472266d24b4e28345c579f830d2b148ab4292b7c80a6d80dc68c9e0.2ea11708a67b2dc9';

async function fetchLivePlans() {
    console.log('🔍 Fetching plans from Live Mantle account...\n');

    try {
        // Step 1: Identify a test customer to get the customer API token
        console.log('Step 1: Identifying customer...');
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
                myshopifyDomain: 'test-fetch.myshopify.com',
                customer_id: 'test-fetch.myshopify.com',
                email: 'test@example.com',
                name: 'Test Fetch',
            }),
        });

        if (!identifyResponse.ok) {
            const errorText = await identifyResponse.text();
            console.error(`Identify failed: ${identifyResponse.status} - ${errorText}`);
            throw new Error(`Identify failed: ${identifyResponse.status} - ${errorText}`);
        }

        const identifyData = await identifyResponse.json();
        const customerToken = identifyData.apiToken || identifyData.customerApiToken;

        console.log('✅ Customer identified successfully');
        console.log(`Customer Token: ${customerToken.substring(0, 20)}...\n`);

        // Step 2: Fetch customer data (includes plans)
        console.log('Step 2: Fetching customer data...');
        const customerResponse = await fetch('https://appapi.heymantle.com/v1/customer', {
            method: 'GET',
            headers: {
                'X-Mantle-App-Id': LIVE_MANTLE_APP_ID,
                'X-Mantle-Customer-Api-Token': customerToken,
                'Content-Type': 'application/json',
            },
        });

        if (!customerResponse.ok) {
            const errorText = await customerResponse.text();
            console.error(`Fetch customer failed: ${customerResponse.status} - ${errorText}`);
        } else {
            const customerData = await customerResponse.json();
            console.log('Customer data response:', JSON.stringify(customerData, null, 2));

            const plans = customerData.plans || [];
            console.log(`\nPlans from /v1/customer: ${plans.length}`);

            if (plans.length > 0) {
                displayPlans(plans);
                return;
            }
        }

        // Step 3: Try /v1/plans endpoint as fallback
        console.log('\nStep 3: Trying /v1/plans endpoint...');
        const plansResponse = await fetch('https://appapi.heymantle.com/v1/plans', {
            method: 'GET',
            headers: {
                'X-Mantle-App-Id': LIVE_MANTLE_APP_ID,
                'X-Mantle-Customer-Api-Token': customerToken,
                'Content-Type': 'application/json',
            },
        });

        if (!plansResponse.ok) {
            const errorText = await plansResponse.text();
            console.error(`Fetch plans failed: ${plansResponse.status} - ${errorText}`);
        } else {
            const plansData = await plansResponse.json();
            console.log('Plans data response:', JSON.stringify(plansData, null, 2));

            const plans = Array.isArray(plansData) ? plansData : (plansData.plans || []);
            console.log(`\nPlans from /v1/plans: ${plans.length}`);

            if (plans.length > 0) {
                displayPlans(plans);
                return;
            }
        }

        console.log('\n⚠️  No plans found in any endpoint!');
        console.log('\n📝 Please check:');
        console.log('1. Are plans created in the Mantle dashboard for this Live app?');
        console.log('2. Are the plans marked as "public"?');
        console.log('3. Is the Mantle App ID correct?');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

function displayPlans(plans) {
    console.log('\n📋 LIVE MANTLE PLANS:\n');
    console.log(`Total plans found: ${plans.length}\n`);

    plans.forEach((plan, index) => {
        console.log(`${index + 1}. ${plan.name}`);
        console.log(`   ID: ${plan.id}`);
        console.log(`   Amount: ${plan.amount?.amount || 'N/A'} ${plan.amount?.currencyCode || ''}`);
        console.log(`   Interval: ${plan.interval || 'N/A'}`);
        console.log(`   Public: ${plan.public}`);
        console.log('');
    });

    // Generate Heroku commands
    console.log('\n🔧 HEROKU CONFIG COMMANDS:\n');
    console.log(`heroku config:set MANTLE_APP_ID="${LIVE_MANTLE_APP_ID}" -a temply-live`);
    console.log(`heroku config:set MANTLE_API_KEY="${LIVE_MANTLE_API_KEY}" -a temply-live`);

    const beginnerPlan = plans.find(p => p.name.toLowerCase().includes('beginner'));
    const growthPlan = plans.find(p => p.name.toLowerCase().includes('growth'));

    if (beginnerPlan) {
        console.log(`heroku config:set MANTLE_PLAN_ID_BEGINNER="${beginnerPlan.id}" -a temply-live`);
    }
    if (growthPlan) {
        console.log(`heroku config:set MANTLE_PLAN_ID_GROWTH="${growthPlan.id}" -a temply-live`);
    }

    console.log('\n📦 Plan IDs for mantle.server.ts:\n');
    if (beginnerPlan) {
        console.log(`BEGINNER: '${beginnerPlan.id}' // ${beginnerPlan.name}`);
    }
    if (growthPlan) {
        console.log(`GROWTH: '${growthPlan.id}' // ${growthPlan.name}`);
    }

    if (!beginnerPlan || !growthPlan) {
        console.log('\n⚠️  Note: Could not find "Beginner" or "Growth" plan by name.');
        console.log('Please manually set the plan IDs based on the plan names above.');
    }
}

fetchLivePlans();
