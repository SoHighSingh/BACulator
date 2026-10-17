import type { CatalogEntry, Category } from "./types";

/*
 * Curated Australian drink catalog. This file is the source of truth: scripts/build-catalog-sql.ts
 * turns it into migrations/0003_seed_catalog.sql for the DrinkCatalog table, and the eval script
 * reads it directly.
 *
 * Sources
 *  - Generic categories and serve sizes: Australian Government standard drinks guide,
 *    https://www.health.gov.au/topics/alcohol/about-alcohol/standard-drinks-guide
 *    Where strength varies by product we take the full-strength end of the usual range, so an
 *    unknown product is never under-counted.
 *  - Brands: ABV and pack size as printed on the label. `sourceUrl` points at the product search on
 *    Dan Murphy's (https://www.danmurphys.com.au), which lists ABV and pack size for every product
 *    below. Brand ABVs change; re-check the source when a value looks wrong.
 *    On 2026-10-17 about 45 of the most popular beers, RTDs, spirits and liqueurs were checked
 *    against Dan Murphy's / BWS listings. The craft beers, imports, smaller ciders and some
 *    liqueurs have not been checked yet. Where a range has variants at different strengths we use
 *    the strongest common variant.
 *  - Cocktails: ethanol from the IBA recipe (https://iba-world.com/cocktails/all-cocktails/) or
 *    the usual Australian bar build, with 30 ml nips.
 *
 * Open Food Facts is deliberately not imported (ODbL share-alike); it would suit a future barcode
 * scanning feature.
 */

const HEALTH = "https://www.health.gov.au/topics/alcohol/about-alcohol/standard-drinks-guide";
const IBA = "https://iba-world.com/cocktails/all-cocktails/";
const dan = (q: string) => `https://www.danmurphys.com.au/search?searchTerm=${encodeURIComponent(q)}`;

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

/** Generic category (no brand). */
function g(name: string, category: Category, abv: number, serveMl: number, aliases: string[]): CatalogEntry {
  return { id: `generic_${slug(name)}`, name, brand: null, category, abv, serveMl, aliases, sourceUrl: HEALTH };
}

/** Branded product. */
function b(
  brand: string,
  name: string,
  category: Category,
  abv: number,
  serveMl: number,
  aliases: string[],
): CatalogEntry {
  return { id: slug(name), name, brand, category, abv, serveMl, aliases, sourceUrl: dan(name) };
}

/** Cocktail defined by its total ethanol (ml of pure alcohol) and glass volume. */
function c(name: string, volumeMl: number, ethanolMl: number, aliases: string[]): CatalogEntry {
  const abv = Math.round((ethanolMl / volumeMl) * 1000) / 10;
  return { id: `cocktail_${slug(name)}`, name, brand: null, category: "cocktail", abv, serveMl: volumeMl, aliases, sourceUrl: IBA };
}

/** Non-alcoholic drink or mixer. */
function m(name: string, aliases: string[], isMixer = true): CatalogEntry {
  return { id: `na_${slug(name)}`, name, brand: null, category: "non_alcoholic", abv: 0, serveMl: 375, aliases, isMixer, sourceUrl: null };
}

const GENERIC: CatalogEntry[] = [
  // Beer. "A beer" with no strength is full strength in a 375 ml can/stubby.
  g("Beer (full strength)", "beer", 4.8, 375, ["beer", "bevvy", "bevvie", "coldie", "cold one", "brew", "brewski", "lager", "draught", "draft", "ale", "frothy", "tinnie of beer", "full strength", "full strength beer", "pilsner", "pils"]),
  g("Beer (mid strength)", "beer", 3.5, 375, ["mid", "mid strength", "midstrength", "mid strength beer", "mid beer", "mids"]),
  g("Beer (light)", "beer", 2.7, 375, ["light beer", "lite beer", "light", "lite", "low alcohol beer", "low alc beer"]),
  g("Beer (zero alcohol)", "non_alcoholic", 0, 375, ["zero beer", "non alcoholic beer", "non alc beer", "alcohol free beer", "na beer", "0.0 beer", "zero alcohol beer"]),
  g("Pale ale", "beer", 4.8, 375, ["pale ale", "pale", "apa"]),
  g("XPA", "beer", 5.0, 375, ["xpa", "extra pale ale"]),
  g("IPA", "beer", 6.0, 375, ["ipa", "india pale ale", "hazy", "hazy ipa", "neipa", "west coast ipa"]),
  g("Double IPA", "beer", 8.0, 375, ["double ipa", "dipa", "imperial ipa", "triple ipa"]),
  g("Craft beer", "beer", 5.5, 375, ["craft beer", "craftie", "craft"]),
  g("Stout", "beer", 5.5, 375, ["stout", "porter", "imperial stout"]),
  g("Wheat beer", "beer", 5.0, 375, ["wheat beer", "hefeweizen", "weissbier", "witbier"]),
  g("Sour beer", "beer", 4.5, 375, ["sour", "sour beer", "gose"]),
  // Cider
  g("Cider", "cider", 5.0, 375, ["cider", "apple cider", "pear cider", "scrumpy"]),
  // Wine (150 ml glass)
  g("Wine", "wine", 13.5, 150, ["wine", "vino", "house wine", "wines"]),
  g("Red wine", "wine", 14.0, 150, ["red", "red wine", "shiraz", "syrah", "cab sav", "cab sauv", "cabernet", "cabernet sauvignon", "merlot", "pinot noir", "pinot", "grenache", "malbec", "tempranillo", "sangiovese", "gsm", "nebbiolo", "zinfandel", "durif"]),
  g("White wine", "wine", 13.0, 150, ["white", "white wine", "sav blanc", "sauv blanc", "sauvignon blanc", "savvy b", "savvy", "chardonnay", "chardy", "chardo", "pinot grigio", "pinot gris", "riesling", "semillon", "sem sav", "ssb", "verdelho", "fiano", "vermentino", "gewurztraminer", "chablis", "albarino"]),
  g("Rosé", "wine", 12.5, 150, ["rose", "rose wine", "pink wine"]),
  g("Moscato", "wine", 7.5, 150, ["moscato", "muscato"]),
  g("Cask wine", "wine", 12.0, 150, ["goon", "cask wine", "boxed wine", "box wine", "bag of goon"]),
  g("Sangria", "wine", 10.0, 200, ["sangria"]),
  g("Mulled wine", "wine", 12.0, 200, ["mulled wine", "gluhwein"]),
  g("Mead", "wine", 12.0, 150, ["mead", "honey wine"]),
  // Sparkling
  g("Sparkling wine", "sparkling", 12.0, 150, ["sparkling", "sparkling wine", "bubbly", "bubbles", "champagne", "champers", "brut", "cava", "sparkling white", "sparkling rose", "sparkling shiraz", "pet nat", "fizz"]),
  g("Prosecco", "sparkling", 11.0, 150, ["prosecco", "prosseco", "proseco"]),
  // Fortified (60 ml serve)
  g("Port", "fortified", 18.5, 60, ["port", "tawny", "tawny port", "muscat", "topaque"]),
  g("Sherry", "fortified", 17.5, 60, ["sherry", "fino", "apera"]),
  g("Vermouth", "fortified", 16.0, 60, ["vermouth", "martini rosso", "martini bianco", "dry vermouth", "sweet vermouth"]),
  // Spirits (30 ml nip). Full-strength ends of the range.
  g("Spirit", "spirit", 40, 30, ["spirit", "spirits", "liquor", "hard liquor"]),
  g("Vodka", "spirit", 40, 30, ["vodka", "voddy", "vodkas", "flavoured vodka", "vanilla vodka"]),
  g("Gin", "spirit", 40, 30, ["gin", "dry gin", "london dry gin", "pink gin"]),
  g("Rum", "spirit", 40, 30, ["rum", "white rum", "dark rum", "gold rum", "spiced rum", "coconut rum"]),
  g("Overproof rum", "spirit", 57.7, 30, ["overproof", "overproof rum", "op rum"]),
  g("Whisky", "spirit", 40, 30, ["whisky", "whiskey", "scotch", "single malt", "irish whiskey", "rye", "rye whiskey", "bourbon", "blended scotch", "japanese whisky"]),
  g("Tequila", "spirit", 40, 30, ["tequila", "tequilla", "tekila", "blanco", "reposado", "anejo", "mezcal"]),
  g("Brandy", "spirit", 40, 30, ["brandy", "cognac", "armagnac", "pisco", "grappa"]),
  g("Sambuca", "spirit", 40, 30, ["sambuca", "ouzo", "raki", "arak"]),
  g("Absinthe", "spirit", 68, 30, ["absinthe", "absinth"]),
  g("Baijiu", "spirit", 52, 30, ["baijiu", "moutai"]),
  g("Cachaça", "spirit", 40, 30, ["cachaca"]),
  g("Moonshine", "spirit", 40, 30, ["moonshine", "home brew spirit", "hooch"]),
  g("Liqueur", "liqueur", 25, 30, ["liqueur", "liquor shot", "schnapps", "peach schnapps", "butterscotch schnapps", "amaretto", "limoncello", "triple sec", "coffee liqueur", "cream liqueur", "creme de menthe", "goldschlager", "goldschläger", "sour puss", "sourz"]),
  // Soju / sake
  g("Soju", "soju_sake", 16.5, 360, ["soju", "fruit soju", "chamisul", "jinro", "chum churum", "chumchurum", "good day soju"]),
  g("Sake", "soju_sake", 15, 180, ["sake", "nihonshu", "hot sake"]),
  // Premix / RTDs
  g("Premix (RTD)", "rtd", 4.8, 375, ["premix", "pre mix", "rtd", "ready to drink", "premixed", "mixed drink can", "pre mixed"]),
  g("Hard seltzer", "rtd", 4.5, 330, ["seltzer", "hard seltzer", "vodka seltzer", "spiked seltzer"]),
  g("Alcoholic ginger beer", "rtd", 4.5, 330, ["alcoholic ginger beer", "hard ginger beer"]),
  g("Hard lemonade", "rtd", 5.0, 355, ["hard lemonade", "alcoholic lemonade", "hard soda"]),
  g("Hard kombucha", "rtd", 4.5, 330, ["hard kombucha", "alcoholic kombucha", "boozy kombucha"]),
  g("Cocktail", "cocktail", 15.8, 150, ["cocktail", "cocktails", "mixed cocktail"]),
];

// Cocktails: (name, glass ml, ethanol ml). Ethanol = Σ spirit ml × abv.
const COCKTAILS: CatalogEntry[] = [
  c("Espresso martini", 130, 24.8, ["espresso martini", "espresso martinis", "espresso tini", "expresso martini", "espress martini"]), // 50 vodka + 30 coffee liqueur (16%)
  c("Margarita", 150, 28, ["margarita", "margs", "marg", "mango margarita", "frozen margarita", "spicy margarita", "tommys margarita"]), // 50 tequila + 20 triple sec
  c("Mojito", 250, 18, ["mojito"]), // 45 rum
  c("Aperol spritz", 200, 16.5, ["aperol spritz", "spritz", "aperol", "aperol spritzer", "campari spritz", "limoncello spritz"]), // 90 prosecco + 60 Aperol
  c("Negroni", 100, 24.3, ["negroni", "negroni sbagliato"]), // 30 gin + 30 Campari + 30 vermouth
  c("Old fashioned", 75, 18, ["old fashioned", "old fashion"]), // 45 bourbon
  c("Whiskey sour", 150, 18, ["whiskey sour", "whisky sour", "bourbon sour"]), // 45 bourbon
  c("Amaretto sour", 150, 12.6, ["amaretto sour"]), // 45 amaretto 28%
  c("Cosmopolitan", 120, 22, ["cosmopolitan", "cosmo"]), // 40 vodka + 15 Cointreau
  c("Long Island iced tea", 300, 30, ["long island iced tea", "long island", "long island ice tea"]), // 5 × 15 ml at 40%
  c("Piña colada", 250, 20, ["pina colada", "pinacolada"]), // 50 rum
  c("Daiquiri", 120, 24, ["daiquiri", "strawberry daiquiri", "frozen daiquiri"]), // 60 rum
  c("Mimosa", 150, 9, ["mimosa", "bucks fizz"]), // 75 sparkling at 12%
  c("Bellini", 150, 11, ["bellini"]), // 100 prosecco
  c("Martini", 75, 25.6, ["martini", "dry martini", "dirty martini", "gin martini", "vodka martini", "vesper"]), // 60 gin + 10 vermouth
  c("Manhattan", 80, 23.2, ["manhattan"]), // 50 rye + 20 vermouth
  c("Moscow mule", 250, 18, ["moscow mule", "mule"]), // 45 vodka
  c("Dark 'n' Stormy", 250, 24, ["dark n stormy", "dark and stormy"]), // 60 rum
  c("Jägerbomb", 130, 10.5, ["jagerbomb", "jager bomb", "jaegerbomb", "jagerbom"]), // 30 Jäger 35%
  c("Sex on the beach", 200, 20, ["sex on the beach"]), // 40 vodka + 20 peach schnapps
  c("Tequila sunrise", 250, 18, ["tequila sunrise"]), // 45 tequila
  c("Bloody Mary", 250, 18, ["bloody mary", "bloody marys", "caesar"]), // 45 vodka
  c("Caipirinha", 150, 20, ["caipirinha", "caipiroska"]), // 50 cachaça
  c("Pornstar martini", 180, 26, ["pornstar martini", "passionfruit martini", "porn star martini"]), // 45 vanilla vodka + 15 Passoa + 60 prosecco
  c("White Russian", 150, 23.2, ["white russian", "black russian"]), // 50 vodka + 20 coffee liqueur
  c("Dirty Shirley", 300, 18, ["dirty shirley", "dirty shirley temple"]), // 45 cherry vodka
  c("Mai tai", 200, 30, ["mai tai"]), // 60 rum + 15 curaçao
  c("Pimm's cup", 250, 12.5, ["pimms cup", "pimms and lemonade", "pimms lemonade"]), // 50 Pimm's 25%
  c("B-52", 30, 7.7, ["b52", "b 52"]), // layered shot
  c("Paloma", 250, 20, ["paloma"]), // 50 tequila
  c("Mudslide", 250, 22, ["mudslide"]), // 30 vodka + 30 Kahlúa + 30 Baileys
  c("Irish coffee", 250, 16, ["irish coffee"]), // 40 Irish whiskey
  c("Gin fizz", 200, 18, ["gin fizz", "tom collins", "collins"]), // 45 gin
  c("Hugo spritz", 200, 12, ["hugo", "hugo spritz"]), // prosecco + elderflower
  c("Lychee martini", 120, 20, ["lychee martini", "lychee tini"]),
  c("Midori splice", 250, 14, ["midori splice", "splice"]),
  c("Fishbowl", 1500, 120, ["fishbowl", "fish bowl"]), // shared party bowl, ~8 nips
];

// Non-alcoholic drinks and mixers. A segment that is only a mixer is absorbed into the drink before it
// ("rum and coke"); on its own it is non-alcoholic.
const NON_ALCOHOLIC: CatalogEntry[] = [
  m("Cola", ["coke", "cola", "coca cola", "pepsi", "coke zero", "diet coke", "pepsi max", "zero sugar coke", "coke no sugar", "coke no sugar", "zero sugar"]),
  m("Lemonade", ["lemonade", "sprite", "solo", "lift", "sprite zero", "7up", "schweppes lemonade", "lemon squash"]),
  m("Energy drink", ["red bull", "redbull", "energy drink", "monster", "mother", "rockstar", "v energy", "sugar free red bull", "red bull sugar free"]),
  m("Tonic", ["tonic", "tonic water", "indian tonic"]),
  m("Soda water", ["soda", "soda water", "sparkling water", "mineral water", "lime soda", "soda lime", "club soda", "seltzer water"]),
  m("Ginger beer", ["ginger beer", "ginger ale", "dry ginger", "ginger", "dry", "bundaberg ginger beer"]),
  m("Juice", ["juice", "orange juice", "oj", "cranberry", "cranberry juice", "pineapple", "pineapple juice", "apple juice", "lime juice", "lemon juice", "grapefruit", "passionfruit", "mango", "tomato juice"]),
  m("Lime", ["lime", "lemon", "lime cordial", "cordial", "bitters", "splash", "ice", "rocks", "on the rocks", "neat", "lime wedge", "mint"]),
  m("Coffee", ["coffee", "iced coffee", "espresso", "milk", "hot chocolate", "cream", "latte"]),
  m("Water", ["water", "glass of water", "tap water", "still water"], false),
  m("Lemon lime and bitters", ["lemon lime and bitters", "lemon lime bitters", "llb"], false),
  m("Mocktail", ["mocktail", "virgin", "virgin mojito", "virgin margarita", "virgin pina colada", "shirley temple", "mocktails"], false),
  m("Kombucha", ["kombucha", "booch"], false),
  m("Soft drink", ["soft drink", "softdrink", "soda pop", "fanta", "lemon lime", "creaming soda", "sarsaparilla", "solo"], false),
  m("Tea", ["tea", "chai", "iced tea"], false),
  b("Lyre's", "Lyre's non-alcoholic spirit", "non_alcoholic", 0, 30, ["lyres", "non alcoholic spirit", "zero proof"]),
];

const BEER: CatalogEntry[] = [
  b("Carlton & United Breweries", "Victoria Bitter", "beer", 4.9, 375, ["vb", "victoria bitter", "vic bitter", "vbs", "big cold beer"]),
  b("Carlton & United Breweries", "Carlton Draught", "beer", 4.6, 375, ["carlton draught", "carlton draft", "carlton", "carlton d"]),
  b("Carlton & United Breweries", "Carlton Dry", "beer", 4.5, 375, ["carlton dry", "carlton dry lager"]),
  b("Carlton & United Breweries", "Carlton Mid", "beer", 3.5, 375, ["carlton mid", "carlton midstrength", "carlton mid strength"]),
  b("Carlton & United Breweries", "Carlton Zero", "non_alcoholic", 0, 375, ["carlton zero", "carlton 0"]),
  b("Carlton & United Breweries", "Great Northern Original", "beer", 4.2, 375, ["great northern", "great northern original", "gn", "great nothern", "gnb"]),
  b("Carlton & United Breweries", "Great Northern Super Crisp", "beer", 3.5, 375, ["great northern super crisp", "super crisp", "gn super crisp", "great northern crisp", "great northern mid", "great northern 3.5"]),
  b("Carlton & United Breweries", "Great Northern Zero", "non_alcoholic", 0, 375, ["great northern zero", "gn zero"]),
  b("Carlton & United Breweries", "Pure Blonde", "beer", 4.2, 375, ["pure blonde", "pure blond"]),
  b("Carlton & United Breweries", "Melbourne Bitter", "beer", 4.6, 375, ["melbourne bitter", "mb"]),
  b("Carlton & United Breweries", "Crown Lager", "beer", 4.9, 375, ["crown lager", "crownie", "crown"]),
  b("Carlton & United Breweries", "Foster's Lager", "beer", 4.9, 375, ["fosters", "fosters lager"]),
  b("Carlton & United Breweries", "Cascade Premium Light", "beer", 2.6, 375, ["cascade light", "cascade premium light"]),
  b("Carlton & United Breweries", "Cascade Draught", "beer", 4.7, 375, ["cascade draught", "cascade", "cascade draft"]),
  b("Carlton & United Breweries", "Matilda Bay Fat Yak", "beer", 4.7, 345, ["fat yak", "fat yak pale ale"]),
  b("Carlton & United Breweries", "Balter XPA", "beer", 5.0, 375, ["balter", "balter xpa"]),
  b("Carlton & United Breweries", "Balter Captain Sensible", "beer", 3.5, 375, ["captain sensible", "balter captain sensible"]),
  b("Carlton & United Breweries", "4 Pines Pale Ale", "beer", 5.1, 375, ["4 pines", "four pines", "4 pines pale ale", "4 pines pale"]),
  b("Carlton & United Breweries", "Resch's Draught", "beer", 4.4, 375, ["reschs", "reschs draught"]),
  b("Asahi", "Asahi Super Dry", "beer", 5.0, 330, ["asahi", "asahi super dry", "asahi dry"]),
  b("Asahi", "Peroni Nastro Azzurro", "beer", 5.1, 330, ["peroni", "peroni nastro azzurro", "peroni nastro", "peronis"]),
  b("Asahi", "Peroni Leggera", "beer", 3.5, 330, ["peroni leggera", "leggera"]),
  b("Asahi", "Peroni Red", "beer", 4.7, 330, ["peroni red", "peroni rossa"]),
  b("Asahi", "Peroni 0.0", "non_alcoholic", 0, 330, ["peroni 0.0", "peroni zero", "peroni libera", "peroni 0"]),
  b("Lion", "XXXX Gold", "beer", 3.5, 375, ["xxxx gold", "4x gold", "four x gold", "xxx gold", "gold"]),
  b("Lion", "XXXX Bitter", "beer", 4.4, 375, ["xxxx bitter", "xxxx", "4x", "four x", "fourex", "xxx"]),
  b("Lion", "XXXX Summer Bright Lager", "beer", 4.0, 375, ["xxxx summer", "summer bright", "xxxx summer bright", "4x summer"]),
  b("Lion", "XXXX Zero", "non_alcoholic", 0, 375, ["xxxx zero", "4x zero"]),
  b("Lion", "Tooheys New", "beer", 4.6, 375, ["tooheys new", "tooheys", "toohey new", "tooeys new", "tooeys"]),
  b("Lion", "Tooheys Extra Dry", "beer", 4.4, 375, ["tooheys extra dry", "ted", "tooheys dry", "extra dry"]),
  b("Lion", "Tooheys Old", "beer", 4.4, 375, ["tooheys old"]),
  b("Lion", "Hahn SuperDry", "beer", 4.6, 375, ["hahn superdry", "hahn super dry", "hahn"]),
  b("Lion", "Hahn SuperDry 3.5", "beer", 3.5, 375, ["hahn 3.5", "hahn superdry 3.5", "hahn super dry 3.5", "hahn mid"]),
  b("Lion", "Hahn Premium Light", "beer", 2.6, 375, ["hahn light", "hahn premium light"]),
  b("Lion", "James Squire One Fifty Lashes", "beer", 4.2, 345, ["150 lashes", "one fifty lashes", "james squire", "squires", "squire", "james squire 150 lashes"]),
  b("Lion", "James Squire Ginger Beer", "rtd", 4.0, 345, ["james squire ginger beer", "squire ginger beer"]),
  b("Lion", "Little Creatures Pale Ale", "beer", 5.2, 375, ["little creatures", "little creatures pale ale", "little creatures pale", "lc pale"]),
  b("Lion", "Little Creatures Rogers", "beer", 3.8, 330, ["little creatures rogers", "rogers"]),
  b("Lion", "Little Creatures Pacific Ale", "beer", 4.4, 330, ["little creatures pacific", "little creatures pacific ale"]),
  b("Lion", "Stone & Wood Pacific Ale", "beer", 4.4, 330, ["stone and wood", "stone and wood pacific ale", "stone wood", "pacific ale", "stone n wood"]),
  b("Lion", "Furphy Refreshing Ale", "beer", 4.4, 375, ["furphy", "furphys"]),
  b("Lion", "Iron Jack", "beer", 3.5, 375, ["iron jack", "ironjack"]),
  b("Lion", "Heineken", "beer", 5.0, 330, ["heineken", "heinie", "heinies", "heiny", "heino"]),
  b("Lion", "Heineken 0.0", "non_alcoholic", 0, 330, ["heineken 0.0", "heineken zero", "heineken 0", "heineken non alcoholic"]),
  b("Lion", "Guinness Draught", "beer", 4.2, 440, ["guinness", "guinness draught", "guiness", "guinesss", "guinnes"]),
  b("Lion", "Kilkenny", "beer", 4.3, 440, ["kilkenny", "kilkenny draught"]),
  b("Lion", "Byron Bay Premium Lager", "beer", 4.5, 330, ["byron bay", "byron bay lager", "byron bay premium lager"]),
  b("Lion", "Swan Draught", "beer", 4.4, 375, ["swan draught", "swan", "swanny"]),
  b("Lion", "Emu Export", "beer", 4.2, 375, ["emu export", "emu", "emu bitter"]),
  b("Lion", "West End Draught", "beer", 4.5, 375, ["west end", "west end draught", "westend"]),
  b("Lion", "Boag's Draught", "beer", 4.6, 375, ["boags", "boags draught", "boag", "boags draft"]),
  b("Lion", "James Boag's Premium Lager", "beer", 5.0, 375, ["boags premium", "james boags premium", "boags premium lager"]),
  b("Lion", "Kirin Ichiban", "beer", 5.0, 330, ["kirin", "kirin ichiban", "ichiban"]),
  b("Lion", "Steinlager Pure", "beer", 5.0, 330, ["steinlager", "steinlager pure", "steinie"]),
  b("Lion", "Beck's", "beer", 4.6, 330, ["becks", "beck"]),
  b("Coopers", "Coopers Original Pale Ale", "beer", 4.5, 375, ["coopers pale", "coopers pale ale", "coopers green", "coopers original", "coopers", "coopers original pale ale"]),
  b("Coopers", "Coopers Sparkling Ale", "beer", 5.8, 375, ["coopers sparkling", "coopers sparkling ale", "coopers red", "sparkling ale", "red coopers"]),
  b("Coopers", "Coopers Mild Ale", "beer", 3.5, 375, ["coopers mild", "coopers mild ale"]),
  b("Coopers", "Coopers Session Ale", "beer", 4.2, 375, ["coopers session", "coopers session ale"]),
  b("Coopers", "Coopers Best Extra Stout", "beer", 6.3, 375, ["coopers stout", "coopers best extra stout", "coopers extra stout"]),
  b("Coopers", "Coopers Dark Ale", "beer", 4.5, 375, ["coopers dark", "coopers dark ale"]),
  b("Coopers", "Coopers Ultra Light", "beer", 2.9, 375, ["coopers light", "coopers ultra light"]),
  b("Mountain Goat", "Mountain Goat Steam Ale", "beer", 4.5, 375, ["mountain goat", "steam ale", "mountain goat steam"]),
  b("Young Henrys", "Young Henrys Newtowner", "beer", 4.8, 375, ["newtowner", "young henrys", "young henrys newtowner"]),
  b("Gage Roads", "Gage Roads Single Fin", "beer", 4.5, 375, ["single fin", "gage roads", "gage roads single fin"]),
  b("Pirate Life", "Pirate Life Pale Ale", "beer", 5.4, 355, ["pirate life", "pirate life pale"]),
  b("Feral", "Feral Hop Hog", "beer", 5.8, 375, ["hop hog", "feral hop hog", "feral"]),
  b("Colonial", "Colonial Small Ale", "beer", 3.5, 375, ["colonial small ale", "small ale"]),
  b("Better Beer", "Better Beer Zero Carb", "beer", 4.2, 355, ["better beer", "better beer zero carb"]),
  b("Hawke's", "Hawke's Lager", "beer", 4.2, 375, ["hawkes", "hawkes lager"]),
  b("Grupo Modelo", "Corona Extra", "beer", 4.5, 355, ["corona", "corona extra", "corona with lime", "coronas", "corrona"]),
  b("Grupo Modelo", "Modelo Especial", "beer", 4.5, 355, ["modelo", "modelo especial"]),
  b("Grupo Modelo", "Pacifico", "beer", 4.4, 355, ["pacifico"]),
  b("AB InBev", "Stella Artois", "beer", 5.0, 330, ["stella", "stella artois", "stellas", "stella artios"]),
  b("AB InBev", "Budweiser", "beer", 5.0, 355, ["budweiser", "bud", "budweisers"]),
  b("AB InBev", "Bud Light", "beer", 4.2, 355, ["bud light", "bud lite", "budlight"]),
  b("AB InBev", "Hoegaarden", "beer", 4.9, 330, ["hoegaarden", "hoegarden"]),
  b("AB InBev", "Michelob Ultra", "beer", 4.2, 355, ["michelob", "michelob ultra"]),
  b("Molson Coors", "Coors", "beer", 4.2, 355, ["coors", "coors light", "coors banquet"]),
  b("Molson Coors", "Miller Genuine Draft", "beer", 4.7, 355, ["miller", "mgd", "miller genuine draft", "miller lite"]),
  b("Pilsner Urquell", "Pilsner Urquell", "beer", 4.4, 330, ["pilsner urquell", "urquell"]),
  b("Sapporo", "Sapporo Premium", "beer", 4.7, 330, ["sapporo", "sapporo premium"]),
  b("Asia Pacific Breweries", "Tiger", "beer", 5.0, 330, ["tiger", "tiger beer"]),
  b("Singha", "Singha", "beer", 5.0, 330, ["singha"]),
  b("Chang", "Chang Classic", "beer", 5.0, 320, ["chang", "chang beer"]),
  b("Multi Bintang", "Bintang Pilsener", "beer", 4.7, 330, ["bintang", "bintangs"]),
  b("Tsingtao", "Tsingtao", "beer", 4.7, 330, ["tsingtao", "tsing tao", "qingdao"]),
  b("Heineken", "Birra Moretti", "beer", 4.6, 330, ["moretti", "birra moretti"]),
  b("Carlsberg", "Carlsberg", "beer", 5.0, 330, ["carlsberg"]),
  b("Kronenbourg", "Kronenbourg 1664 Blanc", "beer", 5.0, 330, ["1664", "kronenbourg", "kronenbourg 1664", "1664 blanc"]),
  b("San Miguel", "San Miguel Pale Pilsen", "beer", 5.0, 330, ["san miguel", "san mig"]),
  b("Hite Jinro", "Cass Fresh", "beer", 4.5, 355, ["cass", "cass fresh"]),
  b("Estrella Damm", "Estrella Damm", "beer", 4.6, 330, ["estrella", "estrella damm"]),
  b("Mahou", "Mahou Cinco Estrellas", "beer", 5.5, 330, ["mahou"]),
];

const CIDER: CatalogEntry[] = [
  b("Carlsberg", "Somersby Apple Cider", "cider", 4.5, 330, ["somersby", "somersby apple", "somersby cider", "somersby pear", "somersby blackberry"]),
  b("Carlton & United Breweries", "Strongbow Original", "cider", 5.0, 375, ["strongbow", "strongbow original", "strongbow apple", "strongbow cider", "strong bow"]),
  b("Carlton & United Breweries", "Bulmers Original", "cider", 4.7, 330, ["bulmers", "bulmers original"]),
  b("Carlton & United Breweries", "Mercury Draught Cider", "cider", 4.8, 375, ["mercury", "mercury cider", "mercury draught"]),
  b("Rekorderlig", "Rekorderlig Cider", "cider", 4.5, 500, ["rekorderlig", "rekordelig", "rekorderlig strawberry lime", "rekorderlig wild berries"]),
  b("Kopparberg", "Kopparberg Cider", "cider", 4.0, 330, ["kopparberg", "kopparburg", "kopparberg mixed fruit", "kopparberg strawberry lime"]),
  b("Magners", "Magners Original", "cider", 4.5, 330, ["magners"]),
  b("Lion", "Little Fat Lamb", "cider", 4.5, 330, ["little fat lamb"]),
  b("Willie Smith's", "Willie Smith's Organic Apple", "cider", 5.0, 375, ["willie smiths", "willie smith"]),
  b("Pipsqueak", "Pipsqueak Apple Cider", "cider", 5.0, 375, ["pipsqueak"]),
  b("5 Seeds", "5 Seeds Crisp Apple Cider", "cider", 4.5, 345, ["5 seeds", "five seeds"]),
  b("Hills", "Hills Cider", "cider", 5.0, 330, ["hills cider", "hills apple cider"]),
];

const WINE: CatalogEntry[] = [
  b("Casella", "Yellow Tail Shiraz", "wine", 13.5, 150, ["yellow tail", "yellowtail", "yellow tail shiraz"]),
  b("Jacob's Creek", "Jacob's Creek Shiraz Cabernet", "wine", 13.5, 150, ["jacobs creek", "jacob creek"]),
  b("Penfolds", "Penfolds Koonunga Hill Shiraz", "wine", 14.5, 150, ["penfolds", "koonunga hill", "penfolds grange", "grange", "bin 389", "bin 28"]),
  b("Wolf Blass", "Wolf Blass Yellow Label Cabernet", "wine", 13.5, 150, ["wolf blass", "wolfblass"]),
  b("Oyster Bay", "Oyster Bay Sauvignon Blanc", "wine", 13.0, 150, ["oyster bay", "oyster bay sav blanc", "oyster bay sauvignon blanc"]),
  b("Cloudy Bay", "Cloudy Bay Sauvignon Blanc", "wine", 13.5, 150, ["cloudy bay"]),
  b("Brown Brothers", "Brown Brothers Moscato", "wine", 5.5, 150, ["brown brothers moscato", "brown brothers", "brown bros moscato", "brown bros"]),
  b("Lindeman's", "Lindeman's Bin 65 Chardonnay", "wine", 13.0, 150, ["lindemans", "bin 65"]),
  b("Hardys", "Hardys Stamp Shiraz", "wine", 13.5, 150, ["hardys", "hardies", "hardys stamp"]),
  b("McGuigan", "McGuigan Black Label Shiraz", "wine", 13.5, 150, ["mcguigan", "mcguigans", "mcguigan black label"]),
  b("Squealing Pig", "Squealing Pig Sauvignon Blanc", "wine", 13.0, 150, ["squealing pig"]),
  b("19 Crimes", "19 Crimes Red Wine", "wine", 13.5, 150, ["19 crimes", "nineteen crimes"]),
  b("Treasury", "Pepperjack Shiraz", "wine", 14.5, 150, ["pepperjack", "pepper jack"]),
  b("Taylors", "Taylors Estate Cabernet Sauvignon", "wine", 14.0, 150, ["taylors", "taylors estate"]),
  b("Banrock Station", "Banrock Station Shiraz", "wine", 13.0, 150, ["banrock", "banrock station"]),
  b("Barefoot", "Barefoot Pink Moscato", "wine", 9.0, 150, ["barefoot", "barefoot moscato", "barefoot pink moscato"]),
  b("Matua", "Matua Sauvignon Blanc", "wine", 12.5, 150, ["matua"]),
  b("Villa Maria", "Villa Maria Sauvignon Blanc", "wine", 13.0, 150, ["villa maria"]),
  b("Devil's Corner", "Devil's Corner Pinot Noir", "wine", 13.5, 150, ["devils corner"]),
  b("T'Gallant", "T'Gallant Pinot Grigio", "wine", 12.5, 150, ["tgallant", "t gallant"]),
  b("Whispering Angel", "Whispering Angel Rosé", "wine", 13.0, 150, ["whispering angel"]),
];

const SPARKLING: CatalogEntry[] = [
  b("Moët & Chandon", "Moët & Chandon Impérial Brut", "sparkling", 12.0, 150, ["moet", "moet and chandon", "moet chandon", "moet imperial", "moët"]),
  b("Veuve Clicquot", "Veuve Clicquot Yellow Label", "sparkling", 12.0, 150, ["veuve", "veuve clicquot", "veuve cliquot", "vueve"]),
  b("Mumm", "Mumm Cordon Rouge", "sparkling", 12.0, 150, ["mumm", "mumm cordon rouge"]),
  b("Dom Pérignon", "Dom Pérignon", "sparkling", 12.5, 150, ["dom perignon", "dom", "dom p"]),
  b("Bollinger", "Bollinger Special Cuvée", "sparkling", 12.0, 150, ["bollinger", "bolly"]),
  b("Chandon", "Chandon Brut", "sparkling", 12.5, 150, ["chandon", "chandon brut", "chandon garden spritz", "garden spritz"]),
  b("Yellowglen", "Yellowglen Pink", "sparkling", 11.0, 150, ["yellowglen", "yellow glen", "yellowglen pink"]),
  b("Mionetto", "Mionetto Prosecco", "sparkling", 11.0, 150, ["mionetto"]),
  b("Jacob's Creek", "Jacob's Creek Sparkling", "sparkling", 11.5, 150, ["jacobs creek sparkling"]),
  b("Seppelt", "Seppelt Original Sparkling Shiraz", "sparkling", 13.5, 150, ["seppelt", "seppelts"]),
];

const SPIRITS: CatalogEntry[] = [
  // Vodka
  b("Diageo", "Smirnoff Red No. 21 Vodka", "spirit", 37, 30, ["smirnoff", "smirnoff red", "smirnoff vodka", "smirnoff no 21", "smirnof"]),
  b("Pernod Ricard", "Absolut Vodka", "spirit", 40, 30, ["absolut", "absolute vodka", "absolut vodka"]),
  b("Bacardi", "Grey Goose Vodka", "spirit", 40, 30, ["grey goose", "gray goose", "goose"]),
  b("LVMH", "Belvedere Vodka", "spirit", 40, 30, ["belvedere"]),
  b("Diageo", "Ketel One Vodka", "spirit", 40, 30, ["ketel one", "kettle one"]),
  b("Diageo", "Cîroc Vodka", "spirit", 37.5, 30, ["ciroc"]),
  b("Tito's", "Tito's Handmade Vodka", "spirit", 40, 30, ["titos", "tito"]),
  b("Stoli", "Stolichnaya Vodka", "spirit", 37.5, 30, ["stoli", "stolichnaya"]),
  b("Vodka O", "Vodka O", "spirit", 37, 30, ["vodka o"]),
  b("Archie Rose", "Archie Rose Original Vodka", "spirit", 40, 30, ["archie rose vodka"]),
  // Gin
  b("Diageo", "Gordon's London Dry Gin", "spirit", 37, 30, ["gordons", "gordons gin", "gordon"]),
  b("Diageo", "Tanqueray London Dry Gin", "spirit", 40, 30, ["tanqueray", "tanq", "tanqueray gin"]),
  b("Bacardi", "Bombay Sapphire", "spirit", 40, 30, ["bombay sapphire", "bombay", "sapphire"]),
  b("William Grant & Sons", "Hendrick's Gin", "spirit", 41.4, 30, ["hendricks", "hendrick", "hendricks gin"]),
  b("Four Pillars", "Four Pillars Rare Dry Gin", "spirit", 41.8, 30, ["four pillars", "4 pillars", "four pillars gin", "bloody shiraz gin"]),
  b("Pernod Ricard", "Beefeater London Dry Gin", "spirit", 40, 30, ["beefeater"]),
  b("Suntory", "Roku Gin", "spirit", 43, 30, ["roku", "roku gin"]),
  b("Archie Rose", "Archie Rose Signature Dry Gin", "spirit", 42, 30, ["archie rose", "archie rose gin"]),
  b("Husk", "Ink Gin", "spirit", 43, 30, ["ink gin"]),
  b("Brookie's", "Brookie's Byron Dry Gin", "spirit", 46, 30, ["brookies", "brookies gin"]),
  b("Malfy", "Malfy Gin", "spirit", 41, 30, ["malfy"]),
  b("Monkey 47", "Monkey 47 Gin", "spirit", 47, 30, ["monkey 47"]),
  // Rum
  b("Diageo", "Bundaberg UP Rum", "spirit", 37, 30, ["bundy", "bundaberg", "bundaberg rum", "bundy rum", "bundys", "bundy up"]),
  b("Diageo", "Bundaberg OP Rum", "spirit", 57.7, 30, ["bundy op", "bundaberg op", "op bundy"]),
  b("Bacardi", "Bacardi Carta Blanca", "spirit", 37.5, 30, ["bacardi", "bacardi white", "bacardi carta blanca", "bacardi rum"]),
  b("Diageo", "Captain Morgan Original Spiced Gold", "spirit", 35, 30, ["captain morgan", "captain", "captain morgans", "captain morgan spiced", "cap morgan"]),
  b("William Grant & Sons", "Sailor Jerry Spiced Rum", "spirit", 40, 30, ["sailor jerry", "sailor jerrys"]),
  b("Proximo", "Kraken Black Spiced Rum", "spirit", 40, 30, ["kraken", "the kraken"]),
  b("Pernod Ricard", "Havana Club 3 Años", "spirit", 40, 30, ["havana club", "havana"]),
  b("Diplomático", "Diplomático Reserva Exclusiva", "spirit", 40, 30, ["diplomatico"]),
  b("Pernod Ricard", "Malibu", "liqueur", 21, 30, ["malibu", "malibu rum", "malibu and pineapple"]),
  // Whisk(e)y
  b("Pernod Ricard", "Jameson Irish Whiskey", "spirit", 40, 30, ["jameson", "jamo", "jamey", "jameson whiskey", "jamesons", "jamieson"]),
  b("Brown-Forman", "Jack Daniel's Old No. 7", "spirit", 40, 30, ["jack daniels", "jd", "jack", "jack daniel", "jacks", "jack daniels whiskey"]),
  b("Brown-Forman", "Jack Daniel's Tennessee Honey", "liqueur", 35, 30, ["jack honey", "jd honey", "jack daniels honey"]),
  b("Beam Suntory", "Jim Beam White Label", "spirit", 37, 30, ["jim beam", "beam", "jim beam white", "jimmy beam", "jim beam bourbon"]),
  b("Diageo", "Johnnie Walker Red Label", "spirit", 40, 30, ["johnnie walker", "johnny walker", "jw red", "red label", "johnnie walker red"]),
  b("Diageo", "Johnnie Walker Black Label", "spirit", 40, 30, ["black label", "jw black", "johnnie walker black", "johnny walker black"]),
  b("Beam Suntory", "Canadian Club", "spirit", 37, 30, ["canadian club", "cc", "canadian"]),
  b("Campari", "Wild Turkey 101", "spirit", 50.5, 30, ["wild turkey 101", "turkey 101", "wt 101"]),
  b("Campari", "Wild Turkey 81", "spirit", 40.5, 30, ["wild turkey", "turkey", "wild turkey 81"]),
  b("Beam Suntory", "Maker's Mark", "spirit", 45, 30, ["makers mark", "makers"]),
  b("Pernod Ricard", "Chivas Regal 12", "spirit", 40, 30, ["chivas", "chivas regal"]),
  b("William Grant & Sons", "Glenfiddich 12", "spirit", 40, 30, ["glenfiddich", "glen fiddich"]),
  b("Pernod Ricard", "The Glenlivet 12", "spirit", 40, 30, ["glenlivet"]),
  b("William Grant & Sons", "Monkey Shoulder", "spirit", 40, 30, ["monkey shoulder"]),
  b("Brown-Forman", "Woodford Reserve", "spirit", 43.2, 30, ["woodford", "woodford reserve"]),
  b("Diageo", "Bulleit Bourbon", "spirit", 45, 30, ["bulleit", "bulleit bourbon", "bullet bourbon"]),
  b("Sazerac", "Buffalo Trace", "spirit", 40, 30, ["buffalo trace"]),
  b("Pernod Ricard", "Ballantine's Finest", "spirit", 40, 30, ["ballantines"]),
  b("Edrington", "The Famous Grouse", "spirit", 40, 30, ["famous grouse", "grouse"]),
  b("Beam Suntory", "Suntory Toki", "spirit", 43, 30, ["toki", "suntory toki", "suntory whisky"]),
  b("Starward", "Starward Two-Fold", "spirit", 40, 30, ["starward"]),
  b("Diageo", "Talisker 10", "spirit", 45.8, 30, ["talisker"]),
  b("Edrington", "The Macallan 12", "spirit", 40, 30, ["macallan"]),
  // Tequila / agave
  b("Proximo", "Jose Cuervo Especial", "spirit", 38, 30, ["jose cuervo", "cuervo", "jose"]),
  b("Bacardi", "Patrón Silver", "spirit", 40, 30, ["patron", "patron silver", "patrón"]),
  b("Campari", "Espolòn Blanco", "spirit", 40, 30, ["espolon", "espolon blanco"]),
  b("Diageo", "Don Julio Blanco", "spirit", 38, 30, ["don julio"]),
  b("Pernod Ricard", "Olmeca Blanco", "spirit", 38, 30, ["olmeca"]),
  b("Sierra", "Sierra Tequila Silver", "spirit", 38, 30, ["sierra", "sierra tequila"]),
  b("Diageo", "Casamigos Blanco", "spirit", 40, 30, ["casamigos"]),
  b("Brown-Forman", "El Jimador Blanco", "spirit", 38, 30, ["el jimador", "jimador"]),
  b("Proximo", "1800 Silver", "spirit", 38, 30, ["1800", "1800 tequila"]),
  // Brandy / other
  b("LVMH", "Hennessy V.S", "spirit", 40, 30, ["hennessy", "henny"]),
  b("Molinari", "Molinari Sambuca", "spirit", 40, 30, ["molinari"]),
];

const LIQUEURS: CatalogEntry[] = [
  b("Diageo", "Baileys Original Irish Cream", "liqueur", 17, 30, ["baileys", "bailey", "baileys irish cream", "baileys iced coffee", "bailies"]),
  b("Pernod Ricard", "Kahlúa", "liqueur", 16, 30, ["kahlua", "kahlúa", "kalua"]),
  b("Illva Saronno", "Tia Maria", "liqueur", 20, 30, ["tia maria"]),
  b("Campari", "Frangelico", "liqueur", 20, 30, ["frangelico"]),
  b("Suntory", "Midori", "liqueur", 20, 30, ["midori", "midori and lemonade"]),
  b("Rémy Cointreau", "Cointreau", "liqueur", 40, 30, ["cointreau"]),
  b("Campari", "Grand Marnier", "liqueur", 40, 30, ["grand marnier"]),
  b("Campari", "Aperol", "liqueur", 11, 30, ["shot of aperol"]),
  b("Campari", "Campari", "liqueur", 25, 30, ["campari", "campari and soda", "campari soda"]),
  b("Mast-Jägermeister", "Jägermeister", "liqueur", 35, 30, ["jagermeister", "jager", "jaeger", "jagermiester", "jagger", "jaegermeister"]),
  b("Sazerac", "Fireball Cinnamon Whisky", "liqueur", 33, 30, ["fireball", "fire ball"]),
  b("Sazerac", "Pink Whitney", "liqueur", 30, 30, ["pink whitney", "pink whitneys"]),
  b("Sazerac", "Southern Comfort", "liqueur", 35, 30, ["southern comfort", "soco"]),
  b("Illva Saronno", "Disaronno Amaretto", "liqueur", 28, 30, ["disaronno", "di saronno"]),
  b("Brown-Forman", "Chambord", "liqueur", 16.5, 30, ["chambord"]),
  b("De Kuyper", "Archers Peach Schnapps", "liqueur", 18, 30, ["archers", "archers peach"]),
  b("Galliano", "Galliano Vanilla", "liqueur", 30, 30, ["galliano"]),
  b("Diego Zamora", "Licor 43", "liqueur", 31, 30, ["licor 43"]),
  b("Pernod Ricard", "Passoã", "liqueur", 17, 30, ["passoa"]),
  b("Diageo", "Pimm's No. 1", "liqueur", 25, 50, ["pimms", "pimms no 1", "pimm"]),
  b("Bacardi", "St-Germain", "liqueur", 20, 30, ["st germain", "elderflower liqueur"]),
  b("Mr Black", "Mr Black Coffee Amaro", "liqueur", 23, 30, ["mr black", "mister black"]),
  b("Diageo", "Sheridan's", "liqueur", 15.5, 30, ["sheridans"]),
  b("Pernod Ricard", "Ricard", "liqueur", 45, 30, ["ricard", "pastis", "pernod"]),
];

const RTD: CatalogEntry[] = [
  b("Asahi", "Vodka Cruiser", "rtd", 4.6, 275, ["cruiser", "vodka cruiser", "cruzza", "cruzzy", "cruisers", "cruiser wild raspberry", "cruiser pineapple", "cruiser blueberry", "pink cruiser", "blue cruiser"]),
  b("Asahi", "UDL Vodka Lime & Soda", "rtd", 4.0, 375, ["udl", "udls", "udl vodka", "udl vodka lime soda"]),
  b("Diageo", "Smirnoff Ice Red", "rtd", 4.5, 300, ["smirnoff ice", "smirnoff ice red", "smirnoff ices", "smirnoff red ice"]),
  b("Diageo", "Smirnoff Ice Double Black", "rtd", 6.5, 375, ["double black", "smirnoff double black", "smirnoff ice double black"]),
  b("Beam Suntory", "Jim Beam White & Cola", "rtd", 4.8, 375, ["jim beam and cola", "beam and cola", "jim beam can", "jim beam cola", "jim beam and coke can", "jimmy beam can"]),
  b("Beam Suntory", "Jim Beam Double Serve", "rtd", 6.7, 375, ["jim beam double serve", "beam double serve", "jim beam double"]),
  b("Brown-Forman", "Jack Daniel's & Cola", "rtd", 4.8, 375, ["jack daniels and cola", "jack and cola", "jd and cola", "jd can", "jack can", "jack daniels can", "jd cola"]),
  b("Brown-Forman", "Jack Daniel's Double Jack", "rtd", 6.9, 375, ["double jack", "jd double jack", "jack daniels double jack"]),
  b("Beam Suntory", "Canadian Club & Dry", "rtd", 4.8, 375, ["canadian club and dry", "cc and dry", "cc dry", "cc can", "cc and dries", "canadian club and dry can"]),
  b("Asahi", "Woodstock Bourbon & Cola", "rtd", 4.8, 375, ["woodstock", "woodies", "woodstock bourbon", "woodstock and cola"]),
  b("Diageo", "Bundaberg Rum & Cola", "rtd", 4.6, 375, ["bundy and cola", "bundaberg and cola", "bundy can", "bundy rum and cola", "bundy cola"]),
  b("Diageo", "Johnnie Walker Red & Cola", "rtd", 4.6, 375, ["johnnie walker and cola", "jw and cola", "johnny walker and cola"]),
  b("Campari", "Wild Turkey & Cola", "rtd", 4.5, 375, ["wild turkey and cola", "wild turkey can"]),
  b("Mark Anthony", "White Claw Hard Seltzer", "rtd", 4.5, 330, ["white claw", "claw", "white claws", "whiteclaw"]),
  b("Hard Rated", "Hard Rated Hard Solo", "rtd", 4.5, 375, ["hard solo", "hard rated", "hard solo can"]),
  b("Suntory", "-196 Double Lemon", "rtd", 6.0, 330, ["196", "minus 196", "suntory 196", "196 double lemon", "negative 196", "196 lemon"]),
  b("Billson's", "Billson's Vodka Soda", "rtd", 4.0, 355, ["billsons", "billson"]),
  b("Pals", "Pals Vodka Soda", "rtd", 4.5, 330, ["pals", "pals vodka"]),
  b("Asahi", "Vodka Mudshake", "rtd", 4.0, 270, ["mudshake", "mud shake", "vodka mudshake", "mudshakes"]),
  b("Bacardi", "Bacardi Breezer", "rtd", 4.0, 275, ["breezer", "bacardi breezer", "breezers"]),
  b("Asahi", "Cougar Bourbon & Cola", "rtd", 4.8, 375, ["cougar", "cougar bourbon"]),
  b("Brookvale Union", "Brookvale Union Ginger Beer", "rtd", 4.0, 330, ["brookvale union", "brookvale ginger beer", "brookvale"]),
  b("Matso's", "Matso's Ginger Beer", "rtd", 3.5, 330, ["matsos", "matsos ginger beer", "matsos mango"]),
  b("Suntory", "Suntory Kirin Hyoketsu", "rtd", 4.0, 330, ["hyoketsu"]),
  b("Diageo", "Smirnoff Seltzer", "rtd", 4.0, 330, ["smirnoff seltzer"]),
  b("Diageo", "Gordon's Gin & Tonic", "rtd", 5.0, 250, ["gordons and tonic can", "gordons gin and tonic can"]),
  b("Lion", "Fellr Hard Seltzer", "rtd", 4.0, 330, ["fellr"]),
  b("Asahi", "Somersby Hard Seltzer", "rtd", 4.0, 330, ["somersby seltzer"]),
  b("Brown-Forman", "Jack Daniel's & Zero Sugar Cola", "rtd", 4.8, 375, ["jack daniels zero sugar", "jack zero"]),
];

export const CATALOG: CatalogEntry[] = [
  ...GENERIC,
  ...COCKTAILS,
  ...NON_ALCOHOLIC,
  ...BEER,
  ...CIDER,
  ...WINE,
  ...SPARKLING,
  ...SPIRITS,
  ...LIQUEURS,
  ...RTD,
];
