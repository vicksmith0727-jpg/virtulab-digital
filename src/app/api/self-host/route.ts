import { NextResponse } from 'next/server'

// GET /api/self-host
// Returns the self-host instructions, Docker compose snippet, and env vars
// so free-tier users can deploy VirtuaLab Digital on their own server.
// The frontend renders this on a "Self-host" view.
export async function GET() {
  return NextResponse.json({
    selfHost: {
      supported: true,
      tagline: 'Free forever — host VirtuaLab Digital on your own VPS or laptop.',
      requirements: {
        ram: '2GB minimum (4GB recommended)',
        disk: '1GB',
        os: 'Linux, macOS, or Windows (Docker Desktop)',
        software: 'Docker + Docker Compose (or Node 20+ / Bun)',
      },
      steps: [
        {
          title: 'Clone the repo',
          cmd: 'git clone https://github.com/your-agency/virtulab-digital.git\ncd virtulab-digital',
        },
        {
          title: 'Copy the env template',
          cmd: 'cp .env.example .env\n# Edit .env: set DATABASE_URL, AGENCY_NAME, AGENCY_MAIN_URL',
        },
        {
          title: 'Run with Docker Compose',
          cmd: 'docker compose up -d\n# App on http://localhost:3000',
        },
        {
          title: 'Or run without Docker',
          cmd: 'bun install\nbun run db:push\nbun run dev',
        },
      ],
      dockerCompose: `version: "3.9"
services:
  virtulab:
    image: virtulab/digital:latest
    # build: .  # uncomment to build from source
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=file:/data/virtulab.db
      - AGENCY_NAME=\${AGENCY_NAME:-VirtuaLab Agency}
      - AGENCY_MAIN_URL=\${AGENCY_MAIN_URL:-https://virtulab.agency}
      - AGENCY_IS_SUBDOMAIN=false
    volumes:
      - virtulab-data:/data
    restart: unless-stopped
volumes:
  virtulab-data:`,
      envExample: `# Parent agency (this builder is the sub-domain offering)
AGENCY_NAME=VirtuaLab Agency
AGENCY_MAIN_URL=https://virtulab.agency
AGENCY_SUBDOMAIN_LABEL=builder
AGENCY_IS_SUBDOMAIN=false

# Database (SQLite for self-host; swap for Postgres if you want)
DATABASE_URL=file:/data/virtulab.db

# Optional: BYO LLM provider (Ollama local = free)
# LLM_BASE_URL=http://localhost:11434/v1
# LLM_MODEL=llama3.1

# Optional: OAuth providers (leave blank for demo mode)
# GSC_CLIENT_ID=
# GSC_CLIENT_SECRET=
# FACEBOOK_CLIENT_ID=
# FACEBOOK_CLIENT_SECRET=`,
      notes: [
        'Self-hosted instances run as the standalone builder (not a subdomain).',
        'All data stays on your server — nothing leaves your VPS.',
        'Free forever. No telemetry. No paid tiers required.',
        'Updates: `docker compose pull && docker compose up -d`.',
      ],
    },
  })
}
