const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.upsert({ where: { email: 'demo@darkzbox.io' }, update: {}, create: { email: 'demo@darkzbox.io', name: 'Demo User' } })
    .then(u => p.workspace.create({ data: { name: 'My Workspace', members: { create: { userId: u.id, role: 'OWNER' } } } }))
    .then(() => console.log('Done!')).catch(console.error).finally(() => p.$disconnect());
