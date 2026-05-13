"""MakerWorld category taxonomy (Rioplatense Spanish translation).

Scraped from https://makerworld.com/en/3d-models in 2026-05. The category IDs
match MakerWorld's URL slugs (e.g. /en/3d-models/100-art has makerworld_id=100).
Hundreds digit = parent group, ones = leaf within group.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class SeedCategory:
    makerworld_id: int
    slug: str
    name_en: str
    name_es: str
    parent_makerworld_id: int | None
    sort_order: int


# Listed in display order. Parents first within each group.
CATEGORIES: list[SeedCategory] = [
    # Art
    SeedCategory(100, "art", "Art", "Arte", None, 100),
    SeedCategory(101, "2d-art", "2D Art", "Arte 2D", 100, 101),
    SeedCategory(102, "signs-and-logos", "Signs & Logos", "Carteles y Logos", 100, 102),
    SeedCategory(103, "coin-and-badges", "Coin & Badges", "Monedas e Insignias", 100, 103),
    SeedCategory(104, "sculptures", "Sculptures", "Esculturas", 100, 104),
    SeedCategory(105, "other-art-models", "Other Art Models", "Otros Modelos de Arte", 100, 199),

    # Fashion
    SeedCategory(200, "fashion", "Fashion", "Moda", None, 200),
    SeedCategory(201, "bags", "Bags", "Bolsos", 200, 201),
    SeedCategory(202, "clothes", "Clothes", "Ropa", 200, 202),
    SeedCategory(203, "glasses", "Glasses", "Anteojos", 200, 203),
    SeedCategory(204, "footwear", "Footwear", "Calzado", 200, 204),
    SeedCategory(205, "rings", "Rings", "Anillos", 200, 205),
    SeedCategory(206, "earrings", "Earrings", "Aros", 200, 206),
    SeedCategory(208, "jewelry", "Jewelry", "Joyería", 200, 207),
    SeedCategory(207, "other-fashion-models", "Other Fashion Models", "Otros Modelos de Moda", 200, 299),

    # Hobby & DIY
    SeedCategory(300, "hobby-and-diy", "Hobby & DIY", "Hobbies y Hacelo Vos Mismo", None, 300),
    SeedCategory(301, "electronics", "Electronics", "Electrónica", 300, 301),
    SeedCategory(302, "vehicles", "Vehicles", "Vehículos", 300, 302),
    SeedCategory(303, "music", "Music", "Música", 300, 303),
    SeedCategory(304, "rc", "RC", "Radiocontrol", 300, 304),
    SeedCategory(305, "robotics", "Robotics", "Robótica", 300, 305),
    SeedCategory(306, "sport-and-outdoors", "Sport & Outdoors", "Deportes y Aire Libre", 300, 306),
    SeedCategory(307, "other-hobby-and-diy", "Other Hobby & DIY", "Otros Hobbies y Hacelo Vos Mismo", 300, 399),

    # Household
    SeedCategory(400, "household", "Household", "Hogar", None, 400),
    SeedCategory(401, "decor", "Decor", "Decoración", 400, 401),
    SeedCategory(402, "garden", "Garden", "Jardín", 400, 402),
    SeedCategory(403, "festivities", "Festivities", "Festividades", 400, 403),
    SeedCategory(404, "office", "Office", "Oficina", 400, 404),
    SeedCategory(405, "pets", "Pets", "Mascotas", 400, 405),
    SeedCategory(406, "other-house-models", "Other House Models", "Otros Modelos para el Hogar", 400, 499),

    # Education
    SeedCategory(500, "education", "Education", "Educación", None, 500),
    SeedCategory(501, "engineering", "Engineering", "Ingeniería", 500, 501),
    SeedCategory(502, "mathematics", "Mathematics", "Matemática", 500, 502),
    SeedCategory(503, "biology", "Biology", "Biología", 500, 503),
    SeedCategory(504, "physics-and-astronomy", "Physics & Astronomy", "Física y Astronomía", 500, 504),
    SeedCategory(505, "chemistry", "Chemistry", "Química", 500, 505),
    SeedCategory(506, "geography", "Geography", "Geografía", 500, 506),
    SeedCategory(507, "other-education-models", "Other Education Models", "Otros Modelos Educativos", 500, 599),

    # Miniatures
    SeedCategory(600, "miniatures", "Miniatures", "Miniaturas", None, 600),
    SeedCategory(601, "animals", "Animals", "Animales", 600, 601),
    SeedCategory(602, "architecture", "Architecture", "Arquitectura", 600, 602),
    SeedCategory(603, "creatures", "Creatures", "Criaturas", 600, 603),
    SeedCategory(604, "people", "People", "Personas", 600, 604),
    SeedCategory(605, "other-miniatures", "Other Miniatures", "Otras Miniaturas", 600, 699),

    # Tools
    SeedCategory(700, "tools", "Tools", "Herramientas", None, 700),
    SeedCategory(701, "organizers", "Organizers", "Organizadores", 700, 701),
    SeedCategory(702, "measure-tools", "Measure Tools", "Herramientas de Medición", 700, 702),
    SeedCategory(703, "hand-tools", "Hand Tools", "Herramientas Manuales", 700, 703),
    SeedCategory(704, "machine-tools", "Machine Tools", "Máquinas Herramienta", 700, 704),
    SeedCategory(705, "gadgets", "Gadgets", "Gadgets", 700, 705),
    SeedCategory(707, "medical-tools", "Medical Tools", "Instrumental Médico", 700, 706),
    SeedCategory(706, "other-tools", "Other Tools", "Otras Herramientas", 700, 799),

    # Toys & Games
    SeedCategory(800, "toys-and-games", "Toys & Games", "Juguetes y Juegos", None, 800),
    SeedCategory(801, "characters", "Characters", "Personajes", 800, 801),
    SeedCategory(802, "board-games", "Board Games", "Juegos de Mesa", 800, 802),
    SeedCategory(803, "outdoor-toys", "Outdoor Toys", "Juguetes de Exterior", 800, 803),
    SeedCategory(804, "puzzles", "Puzzles", "Rompecabezas", 800, 804),
    SeedCategory(806, "construction-sets", "Construction Sets", "Sets de Construcción", 800, 805),
    SeedCategory(805, "other-toys-and-games", "Other Toys & Games", "Otros Juguetes y Juegos", 800, 899),

    # 3D Printer
    SeedCategory(900, "3d-printer", "3D Printer", "Impresora 3D", None, 900),
    SeedCategory(901, "3d-printer-accessories", "3D Printer Accessories", "Accesorios de Impresora 3D", 900, 901),
    SeedCategory(902, "3d-printer-parts", "3D Printer Parts", "Repuestos de Impresora 3D", 900, 902),
    SeedCategory(903, "test-models", "Test Models", "Modelos de Prueba", 900, 903),

    # Props & Cosplays
    SeedCategory(1000, "props-and-cosplays", "Props & Cosplays", "Props y Cosplay", None, 1000),
    SeedCategory(1001, "masks-and-helmets", "Masks & Helmets", "Máscaras y Cascos", 1000, 1001),
    SeedCategory(1002, "replica-weapon", "Cosplay Weapons", "Armas de Cosplay", 1000, 1002),
    SeedCategory(1003, "costumes", "Costumes", "Disfraces", 1000, 1003),
    SeedCategory(1004, "other-props-and-cosplays", "Other Props & Cosplays", "Otros Props y Cosplay", 1000, 1099),

    # Generative 3D Model
    SeedCategory(2000, "generative-3d-model", "Generative 3D Model", "Modelo Generativo 3D", None, 2000),
    SeedCategory(2001, "hueforge-lithophane", "Hueforge & Lithophane", "Hueforge y Litofanía", 2000, 2001),
    SeedCategory(2002, "make-my-sign", "Make My Sign", "Crear mi Cartel", 2000, 2002),
    SeedCategory(2003, "make-my-vase", "Make My Vase", "Crear mi Florero", 2000, 2003),
    SeedCategory(2004, "pixel-puzzle-maker", "Pixel Puzzle Maker", "Generador de Pixel Puzzle", 2000, 2004),
    SeedCategory(2005, "3d-to-relief-sculpture", "Relief Sculpture Maker", "Generador de Esculturas en Relieve", 2000, 2005),
    SeedCategory(2006, "ai-scanner", "AI Scanner", "Escáner IA", 2000, 2006),
    SeedCategory(2007, "image-to-keychain", "Image to Keychain", "Imagen a Llavero", 2000, 2007),
    SeedCategory(2008, "make-my-desk-organizer", "Make My Desk Organizer", "Crear mi Organizador de Escritorio", 2000, 2008),
    SeedCategory(2009, "printmon-maker", "PrintMon Maker", "Generador de PrintMon", 2000, 2009),
    SeedCategory(2010, "statue-maker", "Statue Maker", "Generador de Estatuas", 2000, 2010),
    SeedCategory(2011, "christmas-ornament-maker", "Christmas Ornament Maker", "Generador de Adornos Navideños", 2000, 2011),
    SeedCategory(2012, "make-my-lantern", "Make My Lantern", "Crear mi Linterna", 2000, 2012),
]


def seed(session) -> None:
    """Insert/upsert categories by makerworld_id. Safe to run repeatedly."""
    from .models import Category

    by_mw_id = {c.makerworld_id: c for c in session.query(Category).all()}

    # First pass: insert/update without parent_id resolution.
    mw_to_pk: dict[int, int] = {}
    for cat in CATEGORIES:
        existing = by_mw_id.get(cat.makerworld_id)
        if existing is None:
            row = Category(
                makerworld_id=cat.makerworld_id,
                slug=cat.slug,
                name_en=cat.name_en,
                name_es=cat.name_es,
                sort_order=cat.sort_order,
            )
            session.add(row)
            session.flush()
            mw_to_pk[cat.makerworld_id] = row.id
        else:
            existing.slug = cat.slug
            existing.name_en = cat.name_en
            existing.name_es = cat.name_es
            existing.sort_order = cat.sort_order
            mw_to_pk[cat.makerworld_id] = existing.id

    # Second pass: resolve parents now that all rows exist.
    for cat in CATEGORIES:
        if cat.parent_makerworld_id is None:
            parent_pk = None
        else:
            parent_pk = mw_to_pk.get(cat.parent_makerworld_id)
        row = session.query(Category).filter_by(makerworld_id=cat.makerworld_id).one()
        row.parent_id = parent_pk

    session.commit()
