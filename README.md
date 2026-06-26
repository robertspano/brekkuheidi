# Brekkuheiði — lóðavefur

Gagnvirkt lóðakort fyrir frístundabyggðina **Brekkuheiði / Brekkuskóg** í
Bláskógabyggð (Biskupstungum), í sama stíl og
[vesturhlidarbyggd.is/kort](https://vesturhlidarbyggd.is/kort):
**alvöru gervihnattakort** sem hægt er að þysja/snúa/halla, með lóðunum
upphleyptum (3D) og litmerktum ofan á — á **réttum, landmældum hnitum**.

## Hvaðan koma lóðahnitin (mikilvægt)

Lóðamörkin eru **opinber, landmæld hnit** sótt af kortavef Loftmynda /
Skipulagsstofnunar (map.is – Suðurland), upphaflega í **ISN93 (EPSG:3057)** og
varpað í WGS84 (lengd/breidd). Þetta eru sömu mörk og í fasteigna-/lóðaskrá,
þ.e. nákvæm staðsetning hverrar lóðar — ekki teiknað eftir auga.

> Athugið: gervihnattamyndin að baki er Esri/Maxar. Hnitin eru rétt; ef myndin
> sjálf er örlítið hliðruð (nokkrir metrar) er það skekkja í gervihnattamyndinni,
> ekki í lóðahnitunum. Hægt er að skipta yfir í Loftmynda-myndir fyrir fullkomna
> myndræna samsvörun.

## Tækni

- **MapLibre GL JS** (opinn, Mapbox-samhæfður) — enginn aðgangslykill (token) þarf.
- Gervihnattamyndir: Esri World Imagery (Maxar/Loftmyndir).
- Lóðir = **fill-extrusion** (3D) úr GeoJSON, litaðar eftir stöðu.

## Að keyra / skoða

```bash
cd site
python3 -m http.server 8000     # → http://localhost:8000
```
Static síða — má hýsa hvar sem er. Þarf nettengingu (kort + letur af neti).

## Litir / staða

Til sölu `#7FFF00` · Frátekin `#0fe3ff` · Seld `#FF383C` · Síðari áfangi `#B6B6B6`

## Gögnin — `plots.json`

```json
{ "id":1, "street":"Brekkuheiði", "number":1, "status":"til_solu",
  "area_m2":3831, "verd":null, "byggingarmagn":null, "fasteignanr":null,
  "clng":-20.5069, "clat":64.2670, "ring":[[lng,lat], ...] }
```
`ring` = lóðamörk í WGS84 (rétt hnit). `clng/clat` = miðja. `fasteignanr` = landnúmer.

### Hvað er rétt
- ✅ **Staðsetning lóða (`ring`)** = opinber, landmæld hnit (fasteignaskrá).
- ✅ **Gata + númer** = úr opinberri staðfangaskrá (HMS) — síaðar á göturnar tvær
  **Brekkuheiði** og **Vallárvegur** (54 lóðir).
- ✅ **Staða** (til sölu / leigð) = úr Excel-skjalinu þínu (lausar/leigðar lóðir):
  laus → 🟢 Til sölu, leigð → 🔴 (Seld/taken). 23 lausar, 28 leigðar, 3 ekki í lista.
- ✅ **`fasteignanr`** = landnúmer úr skránni.

### Athugið
- **„Vallárbraut" í Excel = „Vallárvegur" í opinberri skrá** — ég nota opinbera
  heitið. Auðvelt að breyta í `plots.json` ef þú vilt Vallárbraut.
- **3 leigðar lóðir vantar** (Brekkuheiði 1, 13, 16) — fundust ekki sjálfkrafa.
  Allar *lausar* lóðir eru með. Hægt að bæta þeim við.
- **Verð / byggingarmagn** eru tóm — fylltu inn.
- „Seld" (rauður) merkir hér **leigð/tekin** lóð. Breyttu merkingu ef þú vilt
  (t.d. „Leigð"/„Frátekin").

**Ritilshamur (`E`):** smelltu á lóð → skiptir um stöðu; Shift+smella → setja
götu+númer; **Hlaða niður plots.json** → vistar.

## Skrár
`index.html` (kort) · `hafa-samband.html` · `styles.css` · `app.js` · `plots.json`
· `assets/aerial*.jpg` (loftmyndir í spjaldi/samskiptasíðu).
