# Email delivery (SMTP)

delibero sends no marketing mail and no notifications. It sends exactly three
things, all through Appwrite, all part of getting someone into the admin area:

| Mail | Sent when | Without it |
|---|---|---|
| Verification | an account signs up, or asks for a resend | the account cannot request editor access |
| Team invitation | an editor approves a request | the approved person never becomes an editor |
| Password recovery | someone forgets their password | no way back into an account |

All three are dead if delivery does not work, so this is not optional
infrastructure — the whole `docs/admins.md` flow rests on it.

## Appwrite Cloud sends these already

You do **not** need your own sender to send mail. [Appwrite's
docs](https://appwrite.io/docs/products/auth/message-templates) are explicit:
"Appwrite Cloud has a default SMTP server to get you started." Custom SMTP buys
you custom *templates* and control over deliverability — not the ability to send
at all.

So when a verification email never arrives despite Appwrite returning 200, the
usual cause is not a missing sender. It is the receiving side refusing the
message.

## When mail is accepted but never arrives

A message rejected by the recipient's gateway does not land in spam — it never
exists in the mailbox at all. "Not in my inbox and not in spam" is therefore the
signature of a *rejected* message, not an unsent one.

UZH runs Microsoft 365 with a strict gateway, and shared sender pools like
Appwrite's default are frequently blocked there.

**The test that tells them apart:** send to a mailbox outside UZH — a personal
Gmail account, say. Sign up with it at `/admin`, which fires a verification
email automatically.

| Result | Meaning | Fix |
|---|---|---|
| Gmail gets it, UZH does not | Appwrite sends fine; UZH is refusing | ask ZI to allow the sender, or use a sender UZH trusts (below) |
| Neither gets it | Appwrite is not sending | check console → Settings → SMTP, and Appwrite's status page |

## Why you cannot just send as `@zda.uzh.ch`

```
uzh.ch        SPF    v=spf1 ip4:40.95.0.0/16 … include:spf.protection.outlook.com -all
zda.uzh.ch    SPF    v=spf1 include:uzh.ch include:spf.protection.outlook.com -all
_dmarc.uzh.ch        v=DMARC1; p=none; sp=none
```

`-all` is a hard fail: UZH declares that mail from anywhere other than its own
Microsoft 365 infrastructure is forgery. Point Appwrite at Brevo, Resend or
SendGrid with a `@zda.uzh.ch` sender and every message fails SPF with no aligned
DKIM signature to save it.

DMARC is `p=none`, so receivers are asked not to *reject* — they will accept and
file it as spam instead. That is the most likely fate of the verification email
that never arrived.

The rule this leaves: **send from a domain whose DNS you control**, or send
through UZH's own relay. Never a `uzh.ch` address through a third party.

## If UZH is the one blocking

Custom SMTP becomes worth it here — not to gain the ability to send, but to send
from an identity UZH's gateway accepts. The options below are ordered by how
well they fit a UZH project.

### 1. Ask UZH ZI (best fit for a UZH project)

Two things they can do: allow Appwrite's sender through the gateway (smallest
ask — no SMTP config needed at all, keep using the default), or issue relay
credentials so mail comes from UZH infrastructure and passes SPF because it *is*
in the SPF record.

### 1b. UZH relay credentials

Zentrale Informatik can issue relay credentials or authorise an M365 app to send
as an address you own. Mail then comes from real UZH infrastructure, passes SPF
because it *is* in the SPF record, and arrives from a sender your collaborators
recognise.

Cost: a ticket and a wait. Worth starting today even if you use option 2 or 3 in
the meantime.

### 2. Your own domain + a transactional provider (most control)

Register a small domain for the project (`delibero.app`, say — the site is on
`delibero.appwrite.network`, whose DNS you cannot touch). Add it to
[Resend](https://resend.com) or [Postmark](https://postmarkapp.com), publish the
SPF and DKIM records they give you, and send as `noreply@your-domain`.

Both have free tiers far above what this app needs — a handful of emails per
month. This is the only option that both scales to inviting other people and
keeps deliverability in your hands.

### 3. A provider's sandbox sender (works in ten minutes, does not scale)

Resend lets you send from `onboarding@resend.dev` with no DNS at all, but only
*to* the address you signed up with. Enough to verify your own account and see
the pipeline work end to end; useless for inviting a colleague, since their
address will be refused.

Fine as a stopgap. Do not build on it.

## Configuring it in Appwrite

Console → your project → **Settings → SMTP** → enable custom SMTP:

| Field | Value |
|---|---|
| Sender name | `delibero` |
| Sender email | the address at the domain you control (**not** `@zda.uzh.ch` unless using option 1) |
| Reply-to | your real address, so replies reach a human |
| Host / Port | from the provider — e.g. `smtp.resend.com`, port `465` |
| Username | provider-specific — Resend uses the literal `resend` |
| Password | the provider's API key or SMTP password |
| Secure protocol | `SSL` for 465, `TLS` for 587 |

Then check **Settings → Templates → Verification / Invitation** — the default
copy names the project, and the sender address shown there must match what SMTP
is authorised to send.

## Testing it

```bash
npm run appwrite:test-email you@example.com                        # redirects to localhost
npm run appwrite:test-email you@example.com https://the-site/admin # or your deployed site
```

The redirect URL is only there because Appwrite requires one; nobody needs to
open the link for the delivery test to mean something. It must be a hostname
registered as a **Web platform**, though — `localhost` is allowed out of the
box, which is why it is the default. A 400 naming a hostname means that
hostname is not registered, which is worth fixing on its own: an unregistered
production hostname also fails CORS on every database read.

This sends a password-recovery email — the only mail Appwrite will send for an
existing account without a session or an API key — through the project's real
mail path. The recovery link is harmless and expires.

The command reports success as soon as Appwrite accepts the request, which
proves the *request* worked, not that the message landed. If nothing arrives,
the problem is downstream: SMTP credentials, sender authorisation, or the
receiving side's spam filter.

Once mail works, the real test is the flow itself: verify your own address from
the prompt on `/admin`, then sign up a second account and take it all the way
through request → approve → accept.
