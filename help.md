# Extension: Custom Domains

This extension provides custom domain support for multi-tenant applications, including DNS verification and automatic SSL certificate provisioning.

## Features

- **Domain Management**: Add, verify, and remove custom domains per team
- **DNS Verification**: CNAME or TXT record verification for domain ownership
- **SSL Provisioning**: Automatic SSL certificate provisioning via Cloudflare for SaaS, Let's Encrypt, or AWS ACM
- **Domain Limits**: Configurable maximum domains per team
- **Domain Blocklist**: Block competitor or sensitive domain patterns
- **Auto-Renewal**: Automatic SSL certificate renewal before expiry
- **Status Tracking**: Real-time domain and SSL status updates

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `sslProvider` | select | cloudflare-for-saas | SSL certificate provider |
| `verificationMethod` | select | cname | DNS verification method (cname or txt) |
| `maxDomainsPerTeam` | number | 3 | Maximum custom domains per team (0 = unlimited) |
| `verificationTimeoutHours` | number | 72 | Hours to complete DNS verification |
| `fallbackDomain` | text | app.example.com | Default domain when custom domain not configured |
| `enableAutoRenewal` | boolean | true | Auto-renew SSL certificates before expiry |
| `enableDomainBlocklist` | boolean | true | Block reserved/competitor domains |

## SSL Providers

### Cloudflare for SaaS (Recommended)
- Automatic SSL provisioning via Cloudflare Custom Hostnames API
- Fast propagation (usually minutes)
- Requires Cloudflare Zone with Custom Hostnames enabled
- Environment variables: `CLOUDFLARE_ZONE_ID`, `CLOUDFLARE_API_TOKEN`

### Let's Encrypt
- Free SSL certificates via ACME protocol
- Requires HTTP-01 challenge (domain must point to your server)
- Certificates valid for 90 days (auto-renewed)

### AWS ACM
- Free SSL certificates via AWS Certificate Manager
- Requires DNS validation record
- Best for AWS-hosted applications

## API Endpoints

```
POST   /api/teams/{teamId}/domains         - Add a new domain
GET    /api/teams/{teamId}/domains         - List all domains
GET    /api/teams/{teamId}/domains/{id}    - Get domain details
POST   /api/teams/{teamId}/domains/{id}/verify  - Verify domain ownership
POST   /api/teams/{teamId}/domains/{id}/refresh - Refresh verification token
DELETE /api/teams/{teamId}/domains/{id}    - Delete a domain
```

## React Integration

### CustomDomainPage

The main page component for managing custom domains:

```tsx
import { CustomDomainPage } from './pages/CustomDomainPage';

function App() {
  return (
    <TeamProvider>
      <CustomDomainPage />
    </TeamProvider>
  );
}
```

### Components

- `DomainList` - Displays list of domains with status badges
- `AddDomainForm` - Form to add new domains with validation
- `DnsInstructions` - DNS configuration instructions with copy-to-clipboard
- `VerificationStatus` - Shows verification result status

## Domain Verification Flow

1. **Add Domain**: User enters domain name (e.g., `app.customer.com`)
2. **Get DNS Instructions**: System provides verification record details
3. **Configure DNS**: User adds CNAME/TXT record to their DNS
4. **Verify**: System checks DNS record matches
5. **Provision SSL**: Upon verification, SSL certificate is provisioned
6. **Active**: Domain is ready for use

### CNAME Verification

For CNAME verification, user adds:
```
_grablin-verify.app.customer.com CNAME {token}.verify.{fallbackDomain}
```

### TXT Verification

For TXT verification, user adds:
```
_grablin-verify.app.customer.com TXT "grablin-verification={token}"
```

## Database Schema

```sql
CREATE TABLE custom_domains (
  id BIGSERIAL PRIMARY KEY,
  team_id BIGINT NOT NULL REFERENCES teams(id),
  domain VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING_VERIFICATION',
  verification_token VARCHAR(64) UNIQUE,
  verification_record_name VARCHAR(255),
  verification_record_value VARCHAR(512),
  verification_expires_at TIMESTAMP,
  verified_at TIMESTAMP,
  ssl_status VARCHAR(20),
  ssl_certificate_id VARCHAR(255),
  ssl_expires_at TIMESTAMP,
  cloudflare_hostname_id VARCHAR(64),  -- Cloudflare for SaaS
  cloudflare_status VARCHAR(30),
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_custom_domains_team ON custom_domains(team_id);
CREATE INDEX idx_custom_domains_status ON custom_domains(status);
CREATE UNIQUE INDEX idx_custom_domains_domain ON custom_domains(domain);
```

## Security Considerations

### Domain Validation
- RFC 1123 hostname format validation
- Platform subdomain prevention (can't use your own domain as subdomain)
- Local domain prevention (.local, .localhost)
- Optional domain blocklist for competitors

### SSL Enforcement
- All domains require valid SSL before activation
- Automatic certificate renewal
- HTTPS-only traffic

### Rate Limiting
- Domain addition rate limited per team
- DNS verification rate limited to prevent enumeration

## Cloudflare Setup

1. Enable Cloudflare for SaaS on your zone:
   - Go to SSL/TLS > Custom Hostnames
   - Click "Enable Cloudflare for SaaS"

2. Create API Token:
   - Go to My Profile > API Tokens
   - Create token with `Zone:Edit` permission

3. Configure environment variables:
   ```bash
   CLOUDFLARE_ZONE_ID=your-zone-id
   CLOUDFLARE_API_TOKEN=your-api-token
   ```

## Troubleshooting

### DNS Record Not Found
- DNS propagation can take up to 48 hours (usually 15 minutes)
- Verify record was added to correct DNS zone
- Check for typos in record name/value
- Try using different DNS resolver (8.8.8.8, 1.1.1.1)

### SSL Provisioning Failed
- Ensure domain points to your server (for Let's Encrypt HTTP-01)
- Check Cloudflare API credentials
- Verify zone has Custom Hostnames enabled

### Verification Expired
- Use the "Refresh Verification" button to generate new token
- Verification must complete within configured timeout

### Domain Already Exists
- Each domain can only be registered once globally
- If you own the domain, contact support to transfer it
