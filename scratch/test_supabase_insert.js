const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Lire .env.local manuellement
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    envVars[match[1]] = match[2].trim();
  }
});

const url = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const key = envVars['SUPABASE_SERVICE_ROLE_KEY'] || envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

console.log('Connecting to Supabase:', url);
console.log('Using Key:', key.substring(0, 15) + '...');

const supabase = createClient(url, key);

async function testInsert() {
  const saleId = '77777777-7777-7777-7777-777777777777';
  const shopId = 'test-shop-diagnostic';

  console.log('\n--- 1. Testing sale insert ---');
  const { data: saleData, error: saleError } = await supabase
    .from('sales')
    .insert([
      {
        id: saleId,
        shop_id: shopId,
        date: '2026-07-23',
        time: '12:00:00',
        client_name: 'Client Test Diagnostic',
        total_amount: 150,
        paid_amount: 150,
        debt_amount: 0,
        status: 'paid',
        type: 'cash_in',
        pen_color: 'blue',
        notes: '1 pain à 150',
        category: 'Divers'
      }
    ])
    .select();

  if (saleError) {
    console.error('Sale insert FAILED:', saleError);
  } else {
    console.log('Sale insert SUCCESS:', saleData);
  }

  console.log('\n--- 2. Testing sold_articles insert ---');
  const { data: articleData, error: articleError } = await supabase
    .from('sold_articles')
    .insert([
      {
        id: '88888888-8888-8888-8888-888888888888',
        sale_id: saleId,
        product_name: 'Pain',
        quantity: 1,
        unit_price: 150,
        subtotal: 150,
        category: 'Divers'
      }
    ])
    .select();

  if (articleError) {
    console.error('Article insert FAILED:', articleError);
  } else {
    console.log('Article insert SUCCESS:', articleData);
  }

  // Nettoyage du test
  console.log('\n--- Cleaning up test data ---');
  await supabase.from('sales').delete().eq('id', saleId);
  console.log('Done.');
}

testInsert();
