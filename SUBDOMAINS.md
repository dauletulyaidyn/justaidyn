# Subdomains

This repository now includes static entry points for these subdomains:

- `skillsminds.justaidyn.com` -> `/var/www/justaidyn.com/skillsminds`
- `nofacethinker.justaidyn.com` -> `/var/www/justaidyn.com/nofacethinker`
- `courses.justaidyn.com` -> `/var/www/justaidyn.com/courses`
- `apps.justaidyn.com` -> `/var/www/justaidyn.com/apps`
- `games.justaidyn.com` -> `/var/www/justaidyn.com/games`

To make them resolve publicly, create DNS `A` records for each subdomain pointing to the same VPS IP as `justaidyn.com`, then apply the nginx config and SSL certificate update on the server.
