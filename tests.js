/**
 * Extension Custom Domain Tests
 * Tests for custom domain management with DNS verification and SSL provisioning
 */

module.exports = {
  scenarios: [
    {
      name: 'customdomain-spring-cloudflare',
      description: 'Custom domains with Cloudflare for SaaS SSL',
      config: {
        extensions: ['extension-rdbms', 'extension-teams', 'extension-customdomain'],
        layers: ['backend'],
        backend: 'spring',
        scaffold: {
          'extension-customdomain': {
            sslProvider: 'cloudflare-for-saas',
            verificationMethod: 'cname',
            maxDomainsPerTeam: 3,
            verificationTimeoutHours: 72,
            fallbackDomain: 'app.example.com',
            enableAutoRenewal: true,
            enableDomainBlocklist: true
          }
        }
      },
      expectations: {
        files: [
          'src/main/java/**/jpa/entity/CustomDomainEntity.java',
          'src/main/java/**/jpa/repository/CustomDomainRepository.java',
          'src/main/java/**/service/CustomDomainService.java',
          'src/main/java/**/service/DnsVerificationService.java',
          'src/main/java/**/service/SslProvisioningService.java',
          'src/main/java/**/controller/CustomDomainController.java',
          'src/main/java/**/model/enumtype/DomainStatus.java',
          'src/main/java/**/model/enumtype/SslStatus.java',
          'src/main/java/**/scheduler/DomainVerificationScheduler.java',
          'src/main/resources/application-customdomain.yaml'
        ],
        contentMatches: {
          'src/main/java/**/jpa/entity/CustomDomainEntity.java': [
            '@Entity',
            '@Table(name = "custom_domains")',
            'verificationToken',
            'verificationRecordName',
            'cloudflareHostnameId',
            'sslStatus'
          ],
          'src/main/java/**/service/SslProvisioningService.java': [
            '@Service',
            '@Profile("customdomain")',
            'cloudflare.com/client/v4',
            'custom_hostnames',
            '@Scheduled',
            'checkPendingSslStatus'
          ],
          'src/main/java/**/service/DnsVerificationService.java': [
            'dig',
            'verifyDnsRecord',
            'CNAME'
          ],
          'src/main/java/**/service/CustomDomainService.java': [
            'validateDomainNotBlocked',
            'MAX_DOMAINS_PER_TEAM'
          ]
        }
      }
    },
    {
      name: 'customdomain-spring-txt-verification',
      description: 'Custom domains with TXT record verification',
      config: {
        extensions: ['extension-rdbms', 'extension-teams', 'extension-customdomain'],
        layers: ['backend'],
        backend: 'spring',
        scaffold: {
          'extension-customdomain': {
            sslProvider: 'cloudflare-for-saas',
            verificationMethod: 'txt',
            maxDomainsPerTeam: 5,
            verificationTimeoutHours: 48,
            fallbackDomain: 'app.example.com',
            enableAutoRenewal: false,
            enableDomainBlocklist: false
          }
        }
      },
      expectations: {
        contentMatches: {
          'src/main/java/**/service/DnsVerificationService.java': [
            'TXT'
          ],
          'src/main/java/**/jpa/entity/CustomDomainEntity.java': [
            'grablin-verification='
          ]
        },
        contentAbsent: {
          'src/main/java/**/service/CustomDomainService.java': [
            'validateDomainNotBlocked'
          ],
          'src/main/java/**/service/SslProvisioningService.java': [
            'checkSslExpiry'
          ]
        }
      }
    },
    {
      name: 'customdomain-spring-letsencrypt',
      description: 'Custom domains with Lets Encrypt SSL',
      config: {
        extensions: ['extension-rdbms', 'extension-teams', 'extension-customdomain'],
        layers: ['backend'],
        backend: 'spring',
        scaffold: {
          'extension-customdomain': {
            sslProvider: 'lets-encrypt',
            verificationMethod: 'cname',
            maxDomainsPerTeam: 3,
            verificationTimeoutHours: 72,
            fallbackDomain: 'app.example.com'
          }
        }
      },
      expectations: {
        contentMatches: {
          'src/main/java/**/service/SslProvisioningService.java': [
            'provisionLetsEncrypt',
            'acme-server'
          ]
        },
        contentAbsent: {
          'src/main/java/**/jpa/entity/CustomDomainEntity.java': [
            'cloudflareHostnameId'
          ]
        }
      }
    },
    {
      name: 'customdomain-react-full',
      description: 'React custom domain management UI',
      config: {
        extensions: ['extension-teams', 'extension-customdomain'],
        layers: ['frontend'],
        frontend: 'react',
        scaffold: {
          'extension-customdomain': {
            sslProvider: 'cloudflare-for-saas',
            verificationMethod: 'cname',
            maxDomainsPerTeam: 3
          }
        }
      },
      expectations: {
        files: [
          'src/pages/CustomDomainPage.tsx',
          'src/components/domain/DomainList.tsx',
          'src/components/domain/AddDomainForm.tsx',
          'src/components/domain/DnsInstructions.tsx',
          'src/components/domain/VerificationStatus.tsx'
        ],
        contentMatches: {
          'src/pages/CustomDomainPage.tsx': [
            'useTeam',
            'handleVerifyDomain',
            'handleAddDomain',
            '/api/teams/'
          ],
          'src/components/domain/DnsInstructions.tsx': [
            'copyToClipboard',
            'verificationRecordName',
            'verificationRecordValue',
            'Verify DNS'
          ],
          'src/components/domain/AddDomainForm.tsx': [
            'validateDomain',
            'maxDomains'
          ]
        }
      }
    }
  ],
  templateValidations: [
    {
      name: 'domain-validation',
      file: 'code-spring/src/main/java/{{packagePath}}/service/CustomDomainService.java.mustache',
      checks: [
        {
          type: 'contains',
          value: 'DOMAIN_PATTERN',
          message: 'Has RFC 1123 domain validation pattern'
        },
        {
          type: 'contains',
          value: 'normalizeDomain',
          message: 'Normalizes domain input'
        }
      ]
    },
    {
      name: 'dns-verification',
      file: 'code-spring/src/main/java/{{packagePath}}/service/DnsVerificationService.java.mustache',
      checks: [
        {
          type: 'contains',
          value: 'ProcessBuilder',
          message: 'Uses ProcessBuilder for dig command'
        },
        {
          type: 'contains',
          value: '8.8.8.8',
          message: 'Uses Google DNS as primary resolver'
        }
      ]
    },
    {
      name: 'scheduled-tasks',
      file: 'code-spring/src/main/java/{{packagePath}}/scheduler/DomainVerificationScheduler.java.mustache',
      checks: [
        {
          type: 'contains',
          value: '@Scheduled',
          message: 'Has scheduled tasks'
        },
        {
          type: 'contains',
          value: 'markExpiredVerifications',
          message: 'Marks expired verifications'
        }
      ]
    },
    {
      name: 'react-copy-clipboard',
      file: 'code-react/src/components/domain/DnsInstructions.tsx.mustache',
      checks: [
        {
          type: 'contains',
          value: 'navigator.clipboard',
          message: 'Uses clipboard API'
        },
        {
          type: 'contains',
          value: 'Copy',
          message: 'Has copy button'
        }
      ]
    }
  ]
};
