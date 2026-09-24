# Dra. Ydania medical website — final build

Static multilingual production package for Cloudflare Workers static assets.

Languages: Spanish, English, Portuguese, Italian, Korean.
Includes original supplied Ydania branding crop, doctor photography, treatment imagery, and a dedicated before/after gallery with medical disclaimer.

Deployment: upload the contents of this ZIP as a new deployment of the existing `ydania-medical` Worker.


## Production domains

Primary canonical domain: `https://draydania.com`

Redirect domains: `https://www.draydania.com`, `https://ydania.com`, `https://www.ydania.com`, `https://maracaibobotox.com`, and `https://www.maracaibobotox.com` should issue permanent 301 redirects to `https://draydania.com` (preserving path/query when practical).

Registrar remains Namecheap. DNS/nameservers can be moved to Cloudflare. Before changing nameservers, copy every existing iCloud Custom Email DNS record (MX, TXT/SPF, DKIM CNAME and any Apple verification record) from Namecheap into the matching Cloudflare DNS zone. Do not switch nameservers until those email records are present in Cloudflare.

The site includes a floating WhatsApp button and scroll-to-top control, office address, and Instagram link.
