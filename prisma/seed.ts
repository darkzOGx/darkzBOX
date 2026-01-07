import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Starting seed...')

    // 1. Create Layout
    const user = await prisma.user.upsert({
        where: { email: 'demo@darkzbox.io' },
        update: {},
        create: {
            email: 'demo@darkzbox.io',
            name: 'Demo User',
        },
    })

    // 2. Create Workspace
    const workspace = await prisma.workspace.create({
        data: {
            name: 'My Workspace',
            members: {
                create: {
                    userId: user.id,
                    role: 'OWNER',
                },
            },
        },
    })

    // 3. Create Email Accounts
    const account1 = await prisma.emailAccount.create({
        data: {
            workspaceId: workspace.id,
            email: 'sender1@darkzbox.io',
            provider: 'SMTP',
            dailyLimit: 50, // Small limit for testing
            smtpHost: 'smtp.mock.com',
            smtpPort: 587,
            smtpUser: 'sender1',
            smtpPass: 'mockpass',
            imapHost: 'imap.mock.com',
            imapPort: 993,
            imapUser: 'sender1',
            imapPass: 'mockpass',
        },
    })

    const account2 = await prisma.emailAccount.create({
        data: {
            workspaceId: workspace.id,
            email: 'sender2@darkzbox.io',
            provider: 'GMAIL',
            dailyLimit: 30,
            smtpHost: 'smtp.gmail.com',
            smtpPort: 465,
            smtpUser: 'sender2',
            smtpPass: 'mockpass',
            imapHost: 'imap.gmail.com',
            imapPort: 993,
            imapUser: 'sender2',
            imapPass: 'mockpass',
        }
    })

    // 4. Create Campaign
    const campaign = await prisma.campaign.create({
        data: {
            workspaceId: workspace.id,
            name: 'Q1 Outreach - CEOs',
            status: 'ACTIVE',
            schedule: {},
            steps: {
                create: [
                    {
                        order: 1,
                        subject: 'Quick question for {{companyName}}',
                        body: 'Hi {{firstName}}, are you scaling this quarter?',
                        waitDays: 0,
                    },
                    {
                        order: 2,
                        subject: 'Re: Quick question',
                        body: 'Just bumping this up.',
                        waitDays: 2,
                    },
                ],
            },
        },
    })

    // 5. Create Leads
    const leadsData = [
        { firstName: 'John', lastName: 'Doe', email: 'john@acme.com', companyName: 'Acme Inc', status: 'COMPLETED' },
        { firstName: 'Sarah', lastName: 'Connor', email: 'sarah@skynet.com', companyName: 'Cyberdyne', status: 'REPLIED' },
        { firstName: 'Mike', lastName: 'Ross', email: 'mike@pearson.com', companyName: 'Pearson Hardman', status: 'IN_PROGRESS' },
        { firstName: 'Elon', lastName: 'Musk', email: 'elon@x.com', companyName: 'X Corp', status: 'FAILED' },
    ]

    const createdLeads = []
    for (const l of leadsData) {
        const lead = await prisma.lead.create({
            data: {
                campaignId: campaign.id,
                email: l.email,
                firstName: l.firstName,
                lastName: l.lastName,
                companyName: l.companyName,
                status: l.status as any,
                currentStep: 1,
            },
        })
        createdLeads.push(lead)
    }

    // 6. Create Email Logs (Fake History) to populate charts
    // Create ~50 logs over the last 7 days
    const today = new Date()
    for (let i = 0; i < 50; i++) {
        const daysAgo = Math.floor(Math.random() * 7)
        const date = new Date(today)
        date.setDate(date.getDate() - daysAgo)

        // Weighted status: mostly SENT, some OPENED, few REPLIED
        const rand = Math.random()
        let status = 'SENT'
        if (rand > 0.6) status = 'OPENED'
        if (rand > 0.9) status = 'REPLIED'

        await prisma.emailLog.create({
            data: {
                emailAccountId: i % 2 === 0 ? account1.id : account2.id,
                leadId: createdLeads[i % createdLeads.length].id,
                // campaignId: campaign.id,
                type: status,
                messageId: `mock-msg-${i}`,
                sentAt: date,
            }
        })
    }

    console.log('✅ Seed complete!')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
