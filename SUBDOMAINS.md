# Subdomains

This project uses one repository and one NestJS application for the main site and all JustAidyn subdomains.

Repository root on the VPS:

- `/var/www/justaidyn.com`

Routing model:

- all JustAidyn domains -> `nginx` reverse proxy -> `http://127.0.0.1:3000`
- the NestJS application runs from `/var/www/justaidyn.com`
- legacy content still remains in repo folders such as `courses/`, `apps/`, `shop/`, `skillsminds/`

Operational rule:

- every subdomain is served by the same NestJS process
- legacy files for a subdomain should still live in its folder inside the repo
- new subdomains should be added in the domain lists inside `setup_nginx.py` and `setup_ssl.py`

To make a subdomain resolve publicly:

1. create its DNS `A` record to the same VPS IP as `justaidyn.com`
2. add it to the domain lists in `setup_nginx.py` and `setup_ssl.py`
3. if needed, create its legacy folder inside this repo
4. run `python setup_nest_service.py`
5. run `python setup_nginx.py`
6. run `python setup_ssl.py`
