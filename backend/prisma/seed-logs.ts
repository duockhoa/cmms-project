import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const eq = await prisma.equipment.findFirst();
  if(!eq) {
    console.log('No equipment found in DB');
    return;
  }
  
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log('No user found');
    return;
  }

  console.log('Using Equipment:', eq.name, 'User:', user.name);
  
  const param1 = await prisma.equipmentParameter.create({
    data: {
      equipmentId: eq.id,
      name: 'Nhiệt độ hoạt động',
      unit: '°C',
      minSpec: 20,
      maxSpec: 35
    }
  });

  const param2 = await prisma.equipmentParameter.create({
    data: {
      equipmentId: eq.id,
      name: 'Áp suất',
      unit: 'Bar',
      minSpec: 5,
      maxSpec: 10
    }
  });

  console.log('Created params:', param1.id, param2.id);

  const log1 = await prisma.operationLog.create({
    data: {
      equipmentId: eq.id,
      parameterId: param1.id,
      value: 38,
      isOutlier: true,
      recordedById: user.id
    }
  });

  const log2 = await prisma.operationLog.create({
    data: {
      equipmentId: eq.id,
      parameterId: param2.id,
      value: 6,
      isOutlier: false,
      recordedById: user.id
    }
  });

  console.log('Created logs:', log1.id, log2.id);
}

run().catch(console.error).finally(()=>prisma.$disconnect());
