import { prisma } from "@/lib/prisma";
import { AnalyticsClient } from "./AnalyticsClient";
import { DateTime } from "luxon";

// removed direct instantiation

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  const thirtyDaysAgo = DateTime.now().minus({ days: 30 }).toJSDate();
  const sixtyDaysAgo = DateTime.now().minus({ days: 60 }).toJSDate();

  // 1. Fetch Global Stats (Current Period)
  const [sent, opened, replied, bounced] = await Promise.all([
    prisma.emailLog.count({ where: { type: 'SENT', sentAt: { gte: thirtyDaysAgo } } }),
    prisma.emailLog.count({ where: { type: 'OPENED', sentAt: { gte: thirtyDaysAgo } } }),
    prisma.emailLog.count({ where: { type: 'REPLIED', sentAt: { gte: thirtyDaysAgo } } }),
    prisma.emailLog.count({ where: { type: 'BOUNCED', sentAt: { gte: thirtyDaysAgo } } }),
  ]);

  // 1b. Fetch Global Stats (Past Period) for Change Calc
  const [pastSent, pastOpened, pastReplied, pastBounced] = await Promise.all([
    prisma.emailLog.count({ where: { type: 'SENT', sentAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
    prisma.emailLog.count({ where: { type: 'OPENED', sentAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
    prisma.emailLog.count({ where: { type: 'REPLIED', sentAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
    prisma.emailLog.count({ where: { type: 'BOUNCED', sentAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
  ]);

  const calcChange = (current: number, past: number) => {
    if (past === 0) return current > 0 ? '+100%' : '+0%';
    const change = ((current - past) / past) * 100;
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  const globalStats = { 
    sent, 
    opened, 
    replied, 
    bounced,
    sentChange: calcChange(sent, pastSent),
    openedChange: calcChange(opened, pastOpened),
    repliedChange: calcChange(replied, pastReplied),
    bouncedChange: calcChange(bounced, pastBounced)
  };

  // 2. Fetch Daily Stats (Last 30 Days)
  // Group by date. Prisma doesn't support convenient date truncation in groupBy clearly across all DBs without raw query.
  // We'll use a raw query for performance and clarity.
  
  // Note: This raw query is PostgreSQL specific string formatting
  const dailyData = await prisma.$queryRaw`
    SELECT 
      TO_CHAR("sentAt", 'YYYY-MM-DD') as date,
      COUNT(CASE WHEN type = 'SENT' THEN 1 END) as sent,
      COUNT(CASE WHEN type = 'OPENED' THEN 1 END) as opened,
      COUNT(CASE WHEN type = 'REPLIED' THEN 1 END) as replied
    FROM "EmailLog"
    WHERE "sentAt" >= ${thirtyDaysAgo}
    GROUP BY TO_CHAR("sentAt", 'YYYY-MM-DD')
    ORDER BY date ASC
  ` as Array<{ date: string, sent: bigint, opened: bigint, replied: bigint }>;

  const dailyStats = dailyData.map(d => ({
    date: DateTime.fromISO(d.date).toFormat('MMM dd'),
    sent: Number(d.sent),
    opened: Number(d.opened),
    replied: Number(d.replied)
  }));


  // 3. Fetch Campaign Performance
  // We need to group by campaignId.
  const campaignData = await prisma.emailLog.groupBy({
    by: ['campaignId'],
    where: { campaignId: { not: null } },
    _count: {
      type: true
    },
    // We can't conditionally count in groupBy easily to get breakdown in one go without raw query.
    // Let's use Raw Query again for efficiency.
  });

  const campaignStatsRaw = await prisma.$queryRaw`
    SELECT 
      c.id, 
      c.name, 
      c.status,
      COUNT(CASE WHEN l.type = 'SENT' THEN 1 END) as sent,
      COUNT(CASE WHEN l.type = 'OPENED' THEN 1 END) as opened,
      COUNT(CASE WHEN l.type = 'REPLIED' THEN 1 END) as replied
    FROM "Campaign" c
    LEFT JOIN "EmailLog" l ON c.id = l."campaignId"
    GROUP BY c.id, c.name, c.status
    ORDER BY sent DESC
    LIMIT 10
  ` as Array<{ id: string, name: string, status: string, sent: bigint, opened: bigint, replied: bigint }>;

  const campaignStats = campaignStatsRaw.map(c => ({
    id: c.id,
    name: c.name,
    status: c.status,
    sent: Number(c.sent),
    opened: Number(c.opened),
    replied: Number(c.replied)
  }));

  return (
    <AnalyticsClient
      globalStats={globalStats}
      dailyStats={dailyStats}
      campaignStats={campaignStats}
    />
  );
}
