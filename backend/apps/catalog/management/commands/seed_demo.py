from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.catalog.models import Category, Product

CATEGORIES = [
    {
        "slug": "ceramics",
        "name": "Ceramics",
        "description": "Plates, bowls and tea sets thrown and painted by hand in Rishtan, "
        "finished with the turquoise ishqor glaze made from plant ash.",
    },
    {
        "slug": "textiles",
        "name": "Textiles",
        "description": "Suzani embroidery and adras ikat woven on hand looms in the Fergana Valley and Bukhara.",
    },
    {
        "slug": "silk",
        "name": "Silk",
        "description": "Scarves and shawls in khan-atlas silk, dyed with the blurred ikat edge Margilan is known for.",
    },
    {
        "slug": "home-wood",
        "name": "Home & wood",
        "description": "Carved walnut from Khiva and chased copper from Bukhara for the table and the shelf.",
    },
]

PRODUCTS = [
    # Ceramics
    {
        "category": "ceramics",
        "name": "Rishtan lagan plate, 32 cm",
        "summary": "Large serving plate with a pomegranate rosette in cobalt and turquoise.",
        "description": "A lagan is the wide plate that carries plov to the middle of the table. "
        "This one is painted freehand with a pomegranate rosette and a band of almond leaves, "
        "then fired with the alkaline ishqor glaze that gives Rishtan ware its deep turquoise. "
        "No two plates are identical. Hand-wash recommended.",
        "price": "68.00",
        "stock": 6,
        "origin": "Rishtan, Fergana Valley",
        "materials": "Red clay, ishqor glaze",
        "dimensions": "Ø 32 cm",
        "is_featured": True,
    },
    {
        "category": "ceramics",
        "name": "Piyola tea cups, set of 6",
        "summary": "Handleless tea bowls painted with a cotton-boll border.",
        "description": "Piyola are the small handleless bowls used for green tea across Uzbekistan. "
        "Each cup in this set is thrown separately, so heights vary by a few millimetres. "
        "Painted with the cotton-boll pattern, one of the best-known motifs in Uzbek tableware.",
        "price": "38.00",
        "stock": 12,
        "origin": "Rishtan, Fergana Valley",
        "materials": "Red clay, ishqor glaze",
        "dimensions": "Ø 9 cm, 180 ml each",
        "is_featured": True,
    },
    {
        "category": "ceramics",
        "name": "Choynak teapot",
        "summary": "Round teapot that pairs with the piyola set.",
        "description": "A generous round teapot with a short spout that pours without dripping. "
        "The lid is fitted to its own pot before glazing, which is why each lid has a matching "
        "painted mark inside.",
        "price": "46.00",
        "stock": 5,
        "origin": "Rishtan, Fergana Valley",
        "materials": "Red clay, ishqor glaze",
        "dimensions": "1.1 litres",
    },
    {
        "category": "ceramics",
        "name": "Kosa bowls, set of 2",
        "summary": "Deep soup bowls with a blue islimi vine.",
        "description": "Kosa are the deep bowls used for shurpa and lagman. These two are painted "
        "with a continuous islimi vine and are sturdy enough for daily use.",
        "price": "34.00",
        "stock": 9,
        "origin": "Rishtan, Fergana Valley",
        "materials": "Red clay, ishqor glaze",
        "dimensions": "Ø 15 cm, 600 ml each",
    },
    {
        "category": "ceramics",
        "name": "Small cobalt dish",
        "summary": "Palm-sized dish for nuts, olives or jewellery.",
        "description": "A small, shallow dish with a single cobalt rosette in the centre. "
        "A good first piece of Rishtan ware, and an easy gift to pack.",
        "price": "18.00",
        "stock": 20,
        "origin": "Rishtan, Fergana Valley",
        "materials": "Red clay, ishqor glaze",
        "dimensions": "Ø 14 cm",
    },
    {
        "category": "ceramics",
        "name": "Clay hushtak whistle",
        "summary": "Hand-moulded bird whistle, painted after firing.",
        "description": "Hushtak are clay whistles shaped as birds and animals, a folk toy found "
        "across Uzbekistan. Blow into the tail for a clear two-note call.",
        "price": "14.00",
        "stock": 25,
        "origin": "Gijduvan, Bukhara region",
        "materials": "Fired clay, mineral paint",
        "dimensions": "About 10 cm long",
    },
    # Textiles
    {
        "category": "textiles",
        "name": "Suzani wall hanging, pomegranate",
        "summary": "Hand-embroidered suzani with large red pomegranate medallions.",
        "description": "Suzani were traditionally stitched for a bride's dowry and hung on the wall "
        "or laid over a bed. This panel is worked in chain and couching stitch with cotton thread "
        "on a natural cotton ground. Expect small irregularities: they are the mark of hand work.",
        "price": "240.00",
        "stock": 2,
        "origin": "Bukhara",
        "materials": "Cotton ground, cotton embroidery thread",
        "dimensions": "150 × 110 cm",
        "is_featured": True,
    },
    {
        "category": "textiles",
        "name": "Adras ikat cushion cover",
        "summary": "Cushion cover in cotton-silk adras with a red and indigo ikat.",
        "description": "Adras is a half-silk fabric: a silk warp on a cotton weft. The pattern is "
        "dyed into the threads before weaving, which gives ikat its soft, feathered edges. "
        "Hidden zip, insert not included.",
        "price": "42.00",
        "stock": 14,
        "origin": "Margilan, Fergana Valley",
        "materials": "Silk warp, cotton weft",
        "dimensions": "45 × 45 cm",
    },
    {
        "category": "textiles",
        "name": "Ikat table runner",
        "summary": "Long adras runner in saffron, indigo and white.",
        "description": "A long runner cut from a single length of adras, hemmed by hand. "
        "Works on a dining table or folded over the back of a sofa.",
        "price": "56.00",
        "stock": 7,
        "origin": "Margilan, Fergana Valley",
        "materials": "Silk warp, cotton weft",
        "dimensions": "180 × 35 cm",
    },
    {
        "category": "textiles",
        "name": "Embroidered do'ppi skullcap",
        "summary": "Square skullcap with white pepper-pod embroidery on black.",
        "description": "The Chust do'ppi is the black skullcap with four white pepper-pod motifs, "
        "worn across Uzbekistan for weddings and holidays. Quilted and stitched by hand.",
        "price": "29.00",
        "stock": 10,
        "origin": "Chust, Namangan region",
        "materials": "Cotton, silk thread",
        "dimensions": "Head size 57–58 cm",
    },
    # Silk
    {
        "category": "silk",
        "name": "Khan-atlas silk scarf",
        "summary": "Pure silk scarf in the classic flame ikat pattern.",
        "description": "Khan-atlas is the satin-weave silk Margilan is famous for. The threads are "
        "tied and dyed in stages before weaving, producing the flame-like pattern. Light enough "
        "to wear in summer, warm enough for autumn.",
        "price": "64.00",
        "stock": 8,
        "origin": "Margilan, Fergana Valley",
        "materials": "100% silk",
        "dimensions": "180 × 45 cm",
        "is_featured": True,
    },
    {
        "category": "silk",
        "name": "Silk ikat shawl, indigo",
        "summary": "Wide shawl in indigo and silver-grey ikat.",
        "description": "A wide shawl woven in a single indigo dye bath with silver-grey reserve. "
        "Can be worn as a wrap or used as a throw.",
        "price": "92.00",
        "stock": 0,
        "origin": "Margilan, Fergana Valley",
        "materials": "100% silk",
        "dimensions": "200 × 70 cm",
    },
    {
        "category": "silk",
        "name": "Silk pocket square",
        "summary": "Hand-rolled pocket square cut from khan-atlas offcuts.",
        "description": "Small squares cut from the ends of scarf bolts, hand-rolled at the edges. "
        "Each one shows a different section of the pattern.",
        "price": "22.00",
        "stock": 18,
        "origin": "Margilan, Fergana Valley",
        "materials": "100% silk",
        "dimensions": "33 × 33 cm",
    },
    # Home & wood
    {
        "category": "home-wood",
        "name": "Carved walnut lauh book stand",
        "summary": "Folding book stand carved from a single walnut board.",
        "description": "A lauh is carved from a single walnut board, then split so the two leaves "
        "fold open on a hinge cut from the same wood. This one has a girih star on one leaf "
        "and an islimi vine on the other.",
        "price": "78.00",
        "stock": 4,
        "origin": "Khiva, Khorezm region",
        "materials": "Walnut, natural oil finish",
        "dimensions": "34 × 18 cm open",
        "is_featured": True,
    },
    {
        "category": "home-wood",
        "name": "Chased copper tray, 30 cm",
        "summary": "Round copper tray with hand-chased floral border.",
        "description": "Bukhara coppersmiths chase the pattern into the metal with small punches "
        "and a hammer. The tray is lacquered to slow tarnishing and works for tea service or "
        "as a wall piece.",
        "price": "54.00",
        "stock": 6,
        "origin": "Bukhara",
        "materials": "Copper, clear lacquer",
        "dimensions": "Ø 30 cm",
    },
    {
        "category": "home-wood",
        "name": "Walnut spice box",
        "summary": "Lidded box with a carved girih star.",
        "description": "A small lidded box for spices, tea or keepsakes, carved with an "
        "eight-point girih star and finished with natural oil.",
        "price": "36.00",
        "stock": 11,
        "origin": "Khiva, Khorezm region",
        "materials": "Walnut, natural oil finish",
        "dimensions": "12 × 12 × 7 cm",
    },
]


class Command(BaseCommand):
    help = "Create or update the demo categories and products (safe to run more than once)."

    @transaction.atomic
    def handle(self, *args, **options):
        categories = {}
        for order, data in enumerate(CATEGORIES):
            category, _ = Category.objects.update_or_create(
                slug=data["slug"],
                defaults={"name": data["name"], "description": data["description"], "sort_order": order},
            )
            categories[data["slug"]] = category

        created = 0
        for data in PRODUCTS:
            data = dict(data)
            category = categories[data.pop("category")]
            name = data.pop("name")
            data["price"] = Decimal(data["price"])
            data.setdefault("is_featured", False)
            product = Product.objects.filter(name=name).first()
            if product is None:
                product = Product(name=name)
                created += 1
            product.category = category
            for field, value in data.items():
                setattr(product, field, value)
            product.save()

        if options["verbosity"]:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Demo data ready: {len(categories)} categories, {len(PRODUCTS)} products ({created} new)."
                )
            )
