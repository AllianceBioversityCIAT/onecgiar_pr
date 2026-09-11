# Sibling app clients — pool `us-east-1_o9y9Yq5pO` (TEST)

Source: `runbook/test-before.json` (read-only export, `describe-user-pool` + `describe-user-pool-client` x10, captured 2026-09-11). Secrets stripped (`ClientSecret` removed from every client object). Hostnames only — full callback paths live in the export.

10 app clients total. 5 already carry `ALLOW_USER_AUTH` and therefore **gain `EMAIL_OTP` as a selectable factor** the moment the pool's `AllowedFirstAuthFactors` includes it (it is a pool-level `SignInPolicy`, not a per-client setting) — those 5 teams must be notified before the console toggle (design.md §5.4 step 2).

| Client name | Id prefix | `ExplicitAuthFlows` | `ALLOW_USER_AUTH`? | `SupportedIdentityProviders` | Callback hostnames |
|---|---|---|---|---|---|
| My web app - 3qpmje | `1g5t8h` | `ALLOW_REFRESH_TOKEN_AUTH`, `ALLOW_USER_AUTH`, `ALLOW_USER_SRP_AUTH` | **yes → gains selectable EMAIL_OTP** | COGNITO | castest.ciat.cgiar.org |
| CSICAP | `2ut0j5` | `ALLOW_REFRESH_TOKEN_AUTH`, `ALLOW_USER_PASSWORD_AUTH` | no | COGNITO | castest.ciat.cgiar.org, localhost |
| AICCRA | `4r3d88` | `ALLOW_REFRESH_TOKEN_AUTH`, `ALLOW_USER_PASSWORD_AUTH` | no | COGNITO | aiccratest.ciat.cgiar.org, localhost |
| Alliance | `633s5b` | `ALLOW_REFRESH_TOKEN_AUTH`, `ALLOW_USER_PASSWORD_AUTH` | no | COGNITO | allianceindicatorstest.ciat.cgiar.org, d11q2gkl6a1qr7.cloudfront.net, d2cy6lnpnaqdfb.cloudfront.net, d2ed9x5gppzb0x.cloudfront.net, d3l06xkn4jjlv8.cloudfront.net, localhost, prtest.ciat.cgiar.org, qatest.ciat.cgiar.org |
| MARLO | `6kb9tc` | `ALLOW_REFRESH_TOKEN_AUTH`, `ALLOW_USER_AUTH`, `ALLOW_USER_SRP_AUTH` | **yes → gains selectable EMAIL_OTP** | COGNITO | d84l1y8p4kdic.cloudfront.net, localhost, staging-marlo.aiccra.cgiar.org |
| TOC | `6mi3dm` | `ALLOW_REFRESH_TOKEN_AUTH`, `ALLOW_USER_PASSWORD_AUTH` | no | COGNITO | africalab02.alliance.cgiar.org, localhost, toc.loc.codeobia.com |
| **general-client** — microservice client (`OTP-OQ-6`) | `6ph57q` | `ALLOW_ADMIN_USER_PASSWORD_AUTH`, `ALLOW_CUSTOM_AUTH`, `ALLOW_REFRESH_TOKEN_AUTH`, `ALLOW_USER_AUTH`, `ALLOW_USER_PASSWORD_AUTH`, `ALLOW_USER_SRP_AUTH` | **yes → gains selectable EMAIL_OTP** | COGNITO | localhost |
| TIP TEST | `706plh` | `ALLOW_REFRESH_TOKEN_AUTH`, `ALLOW_USER_AUTH`, `ALLOW_USER_SRP_AUTH` | **yes → gains selectable EMAIL_OTP** | COGNITO | star.alliance.cgiar.org, tiptst.ciat.cgiar.org |
| Risk | `7j40ek` | `ALLOW_REFRESH_TOKEN_AUTH`, `ALLOW_USER_PASSWORD_AUTH` | no | COGNITO | localhost, plannigtest.ciat.cgiar.org, planning.loc.codeobia.com, planningtest.ciat.cgiar.org, risk.cgiar.org, risk.loc.codeobia.com, risktest.ciat.cgiar.org, w3.loc.codeobia.com |
| **PRMS-Reporting** — hosted-UI client | `u0fum2` | `ALLOW_REFRESH_TOKEN_AUTH`, `ALLOW_USER_AUTH`, `ALLOW_USER_PASSWORD_AUTH` | **yes → gains selectable EMAIL_OTP** | COGNITO | d2ed9x5gppzb0x.cloudfront.net, localhost, prtest.ciat.cgiar.org, qatest.ciat.cgiar.org |

## Clients gaining selectable `EMAIL_OTP`

5 of 10: **My web app - 3qpmje**, **MARLO**, **general-client**, **TIP TEST**, **PRMS-Reporting** — matches design.md §5.4 step 2's named list (MARLO, TIP TEST, general-client, "My web app", PRMS-Reporting). These 5 teams share the pool's 50/day default email quota (`OTP-OQ-8`) and must be notified before the console change (step 2, JA-9).

## Role confirmation

- `general-client` (`6ph57q…`) — the AUTH microservice's app client (`OTP-OQ-6`, resolved 2026-09-11 by the user). Already `ALLOW_USER_AUTH`; no client-level change needed.
- `PRMS-Reporting` (`u0fum2…`) — the hosted-UI client.
