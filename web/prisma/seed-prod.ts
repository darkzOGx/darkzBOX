import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // Default to the hardcoded credential email if not provided
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@darkzbox.com'

    console.log(`🧹 Cleaning database for clean production start...`)

    // Delete in order of dependency (children first)
    // 1. Logs & Activity
    await prisma.emailLog.deleteMany({})
    await prisma.senderLog.deleteMany({})

    // 2. Leads & Targets
    await prisma.lead.deleteMany({})
    await prisma.senderLead.deleteMany({})

    // 3. Campaign Structure
    await prisma.campaignStepVariant.deleteMany({})
    await prisma.campaignStep.deleteMany({})
    await prisma.campaign.deleteMany({})

    // 4. Sender / Groups
    await prisma.senderCampaign.deleteMany({})
    await prisma.senderLeadGroup.deleteMany({})
    await prisma.senderTemplate.deleteMany({})
    await prisma.senderConfig.deleteMany({})

    // 5. Connecting Accounts & Configs
    await prisma.emailAccount.deleteMany({})
    await prisma.replyGuyConfig.deleteMany({})
    await prisma.blockedEmail.deleteMany({})
    await prisma.template.deleteMany({})

    // 6. Core Hierarchy
    await prisma.workspaceMember.deleteMany({})
    await prisma.workspace.deleteMany({})
    await prisma.user.deleteMany({})

    console.log(`✨ Database wiped.`)
    console.log(`👤 Creating Admin User: ${adminEmail}`)

    const user = await prisma.user.create({
        data: {
            email: adminEmail,
            name: 'Admin User',
        }
    })

    const workspace = await prisma.workspace.create({
        data: {
            name: 'Production Workspace',
            members: {
                create: {
                    userId: user.id,
                    role: 'OWNER'
                }
            }
        }
    })

    console.log(`🚀 Production Ready!`)
    console.log(`   User: ${user.email}`)
    console.log(`   Workspace: ${workspace.name} (${workspace.id})`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
