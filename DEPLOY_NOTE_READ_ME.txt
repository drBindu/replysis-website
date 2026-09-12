2026-09-12: this working tree is AHEAD of GitHub.

Commit 993deaf (admin portal usage and cost reporting, Groq removed from the
site) was made here and NOT pushed. There are no GitHub credentials on this
host, and none on the owner machine either.

verchor-deploy.sh starts with:

    git fetch -q origin main && git reset -q --hard origin/main

which will DISCARD that commit and rebuild the old site. Before running it,
push this commit to drBindu/replysis-website, or these changes are lost:

  - admin portal rewrite, per-user usage, tokens and provider cost
  - usage_events reading in app/api/admin/route.ts
  - data/providerRates.ts (new, rates intentionally unset)
  - Groq removed from privacy, terms, resume, mock-interview, WhyUsSection
  - dead Groq client removed from app/api/stt/tokens/route.ts

The running image was built from this tree, so the live site already has them.
A copy of the previous tree is in ~/verchor-backups/pre-adminportal-*.
