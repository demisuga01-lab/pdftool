# Support

## Purpose

Define how users and internal responders should handle support, failure, abuse, and contact requests.

## Audience

- End users
- Support staff
- Owner/operator

## Scope

This file covers mailbox ownership, what users should include, and the minimum triage checklist.

## Contact Addresses

- Bugs, broken tools, processing failures, upload/download problems, abuse, and security reports: `support@wellfriend.online`
- API questions, general contact, feature suggestions, partnerships, and business: `contact@wellfriend.online`

## What Users Should Include

- tool or route used
- file type
- approximate file size
- exact error text
- screenshot if relevant
- job ID if the failure happened after processing started
- whether the issue is reproducible

## What Users Should Not Send

- passwords
- API keys
- unrelated private credentials
- highly sensitive files unless absolutely required and explicitly agreed

## Processing Failure Guidance

If the UI shows a job ID, ask the user to include it in the report. Current failure UI already points users toward `support@wellfriend.online` with the job ID when applicable.

## Security and Abuse

Security issues and abuse reports should go to:

- `support@wellfriend.online`

## Expected Response Placeholder

Set your internal target response time according to staffing. The repository does not currently enforce a public SLA.

## Support Triage Checklist

1. Capture route, tool, timestamp, and job ID
2. Identify whether the problem is upload, processing, polling, or download
3. Check production health and worker logs
4. Check for repeated or systemic failure
5. Respond with safe next steps or escalate internally

## Related Documents

- [docs/support-playbook.md](./docs/support-playbook.md)
- [docs/error-handling.md](./docs/error-handling.md)
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

