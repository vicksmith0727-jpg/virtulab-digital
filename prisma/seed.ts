// Prisma seed script — populates a project with standard placeholder conversations.
// Run: bun run db:seed
//
// Creates:
//   1. A demo user (if none exists)
//   2. A demo project (if none exists)
//   3. 3 placeholder chat sessions with messages

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding placeholder conversations…')

  // 1. Ensure a demo user exists
  let user = await prisma.user.findFirst()
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'demo@virtulab.local',
        name: 'VirtuaLab Demo',
        plan: 'grove',
        role: 'owner',
        canAccessAPISettings: true,
        canAccessExternalSecrets: true,
      },
    })
    console.log('  ✓ Created demo user')
  }

  // 2. Ensure a demo project exists
  let project = await prisma.project.findFirst()
  if (!project) {
    project = await prisma.project.create({
      data: {
        name: 'Demo Plumbing Co.',
        subdomain: 'demo-plumbing',
        description: 'A demo plumbing business project',
        userId: user.id,
      },
    })
    console.log('  ✓ Created demo project')
  }

  // 3. Create placeholder chat sessions
  const placeholders = [
    {
      title: 'Local SEO strategy for plumbing',
      messages: [
        { role: 'user', content: 'How do I rank for "emergency plumber in [my city]" when big franchises dominate the top spots?' },
        { role: 'assistant', content: '**The Tactical Gap**: Big plumbing franchises target "plumber [city]" — high volume, generic. They ignore the urgency modifiers: "emergency plumber," "burst pipe at 2am," "weekend plumbing repair." These long-tail phrases have 10x lower search volume but 10x higher conversion because the searcher needs help RIGHT NOW.\n\n**The Asymmetrical Move**: Create a dedicated "Emergency Plumbing [Your City]" landing page. Include:\n- Your real response time (e.g., "We arrive within 45 minutes in [neighborhood]")\n- Photos of your actual van, your actual tools, your actual work\n- A FAQ: "What to do while you wait for the plumber" (turn off water, contain the leak, take photos for insurance)\n- Schema markup with EmergencyBusiness type\n\n**Immediate Action Items**:\n- Create a /emergency-plumber-[city] page in VirtuaLab Digital\n- Write 500 words of hyper-specific, actionable content\n- Add LocalBusiness schema with your NAP\n- Submit to Google Search Console for indexing' },
      ],
    },
    {
      title: 'Content brief for water heater repair',
      messages: [
        { role: 'user', content: 'Write a content brief for a page about water heater repair services.' },
        { role: 'assistant', content: '**Content Brief: Water Heater Repair [Your City]**\n\nTarget keyword: "water heater repair [your city]"\nSecondary keywords: "hot water heater not working," "water heater leaking," "tankless water heater repair near me"\n\n**H1**: Water Heater Repair in [Your City] — Fast, Honest, Local\n\n**H2 Structure**:\n1. Signs Your Water Heater Needs Repair (not enough hot water, strange noises, discolored water, leaking)\n2. Common Water Heater Problems We Fix (thermostat, heating element, pressure relief valve, anode rod)\n3. Tank vs. Tankless: Which Is Right for You?\n4. What to Do While You Wait for the Plumber\n5. Water Heater Repair Cost in [Your City] (honest pricing, no surprises)\n6. FAQ (5 questions with schema-ready answers)\n\nWord count: 1,200–1,500\nMeta title: Water Heater Repair [Your City] | [Your Business Name] (under 60 chars)\nMeta description: Fast water heater repair in [your city]. Honest pricing, same-day service, real plumbers. Call [phone]. (under 160 chars)\n\nInternal links: link to your emergency plumber page, your general plumbing services page, your contact page.' },
      ],
    },
    {
      title: 'Competitor gap analysis',
      messages: [
        { role: 'user', content: 'What content are my big competitors NOT creating that I should?' },
        { role: 'assistant', content: '**The Tactical Gap**: Big plumbing franchises create generic "plumbing services" pages for every city they serve. Same template, same text, just swapping the city name. They never create:\n- Seasonal content ("How to winterize your pipes in [city]")\n- Neighborhood-specific pages ("Plumbing services in [specific neighborhood]")\n- Educational content that shows real expertise ("Why your pipes make that banging sound")\n- Before/after case studies with real photos\n- Cost transparency pages ("What we charge and why")\n\n**The Asymmetrical Move**: Create a content calendar that fills these gaps:\n- 1 seasonal post per quarter (winterize, spring maintenance, summer AC condensation drain, fall heating prep)\n- 5 neighborhood pages (one per neighborhood you actually serve)\n- 10 "How to diagnose" posts (noisy pipes, slow drain, running toilet, low water pressure, etc.)\n- 3 cost transparency posts (what we charge for common repairs, with ranges)\n\n**Immediate Action Items**:\n- Use the Hub & Spoke Generator in VirtuaLab Digital to create your content architecture\n- Generate 5 neighborhood pages using the Programmatic SEO tool\n- Write your first seasonal post using the Blog Generator' },
      ],
    },
  ]

  for (const placeholder of placeholders) {
    const session = await prisma.chatSession.create({
      data: {
        projectId: project.id,
        title: placeholder.title,
      },
    })

    for (const msg of placeholder.messages) {
      await prisma.chatMessage.create({
        data: {
          chatSessionId: session.id,
          role: msg.role,
          content: msg.content,
        },
      })
    }

    console.log(`  ✓ Created session: ${placeholder.title} (${placeholder.messages.length} messages)`)
  }

  console.log('\n✅ Seed complete!')
  console.log(`   User: ${user.email}`)
  console.log(`   Project: ${project.name}`)
  console.log(`   Sessions: ${placeholders.length}`)
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
