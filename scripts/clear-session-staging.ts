import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Lösche alle Sessions für Staging-App...\n');
  
  // Lösche alle Sessions
  const result = await prisma.session.deleteMany({});
  
  console.log(`✅ ${result.count} Session(s) gelöscht`);
  console.log('\n📝 Nächste Schritte:');
  console.log('1. Gehe zu deinem Shopify Admin');
  console.log('2. Deinstalliere die App "Temply-staging"');
  console.log('3. Installiere die App erneut');
  console.log('4. Die neuen Scopes (write_themes) werden dann aktiviert\n');
}

main()
  .catch((e) => {
    console.error('❌ Fehler:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

