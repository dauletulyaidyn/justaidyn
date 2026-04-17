# Subdomains

This project uses one repository for the main site and all JustAidyn subdomains.

Repository root on the VPS:

- `/var/www/justaidyn.com`

Routing model:

- `justaidyn.com` -> `/var/www/justaidyn.com`
- `www.justaidyn.com` -> `/var/www/justaidyn.com`
- `skillsminds.justaidyn.com` -> `/var/www/justaidyn.com/skillsminds`
- `nofacethinker.justaidyn.com` -> `/var/www/justaidyn.com/nofacethinker`
- `courses.justaidyn.com` -> `/var/www/justaidyn.com/courses`
- `apps.justaidyn.com` -> `/var/www/justaidyn.com/apps`
- `games.justaidyn.com` -> `/var/www/justaidyn.com/games`
- `shop.justaidyn.com` -> `/var/www/justaidyn.com/shop`
- `api.justaidyn.com` -> `/var/www/justaidyn.com/api`

Operational rule:

- every subdomain must point to its folder inside this repository
- new subdomains should be added by creating a folder in the repo and adding one entry to `SUBDOMAIN_ROOTS` in `setup_nginx.py` and `setup_ssl.py`

To make a subdomain resolve publicly:

1. create its DNS `A` record to the same VPS IP as `justaidyn.com`
2. create its folder inside this repo
3. add it to `SUBDOMAIN_ROOTS`
4. run `python setup_nginx.py`
5. run `python setup_ssl.py`
