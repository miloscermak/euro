# 💶 Navrhni si vlastní stoeurovku

Vtipná webová aplikace: nahraj fotku (nebo vyber emoji) a vyrob si vlastní
eurobankovku. Fotka se převede na „rytinu" – vlnité linky, jejichž tloušťka
odpovídá tmavosti obrazu, stejný princip jako u skutečných bankovek.

Žádná AI, žádný server, žádné náklady. Všechno počítá vanilla JavaScript
na canvasu přímo v prohlížeči.

## Funkce

- nahrání fotky (tlačítkem i přetažením), posouvání a přiblížení motivu
- galerie emoji pro rychlý výběr
- editovatelná hodnota bankovky, nápis (s automatickým přepisem do řečtiny
  a cyrilice) a podpis
- stažení PNG a sdílení přes Web Share API (na mobilu rovnou do aplikací)
- nápis SPECIMEN kvůli pravidlům EU o reprodukcích bankovek

## Spuštění lokálně

Stačí jakýkoliv statický server, např.:

```bash
python3 -m http.server 8123
```

a otevřít http://localhost:8123.

## Nasazení na Netlify

Web je čistě statický – žádný build. Stačí propojit repozitář s Netlify
a jako publish directory nechat kořen projektu (`.`), viz `netlify.toml`.

Po nasazení uprav v `index.html` doménu v meta tazích `og:image` a `og:url`
podle skutečné adresy webu.

## Struktura

- `index.html` – stránka a ovládací prvky
- `style.css` – vzhled
- `script.js` – vykreslování bankovky a rytinový filtr
- `og-image.png` – náhledový obrázek pro sociální sítě
