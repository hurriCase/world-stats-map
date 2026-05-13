// ══════════════════════════════════════════════════════════════════════════════
// locale.js — EN / RU localisation
// ══════════════════════════════════════════════════════════════════════════════

const STRINGS = {
    en: {
        // Top bar
        title:          'World Map',
        viewHeat:       'Heat',
        viewImage:      'Image',
        viewBoth:       'Both',
        opacity:        'Opacity',
        resetView:      'Reset View',
        trades:         'Trades',
        civPlanner:     'Civ Planner',
        loadJson:       'Load JSON',
        // Left panel
        statLabel:      'Stat',
        statScore:      'Score',
        statHammers:    'Hammers',
        statBeakers:    'Beakers',
        statGrowth:     'Growth',
        statHappiness:  'Happiness',
        weightLabel:    'Weight',
        // Search
        jumpTo:         'Jump to',
        go:             'Go',
        // HUD labels
        zoneLabel:      'Zone',
        zoomLabel:      'Zoom',
        // Overlay
        loadingData:    'Loading data.json…',
        noData:         'No data.json found — use "Load JSON" to open a file.',
        loadingFile:    (name) => `Loading ${name}…`,
        loadError:      (msg)  => `Error: ${msg}`,
        // Coord display
        hoverHint:      'hover over a zone',
        notFound:       (x, z) => `(${x}, ${z}) not found`,
        // Tooltip - zone
        coordinates:    'Coordinates',
        score:          'Score',
        hammers:        'Hammers',
        beakers:        'Beakers',
        growth:         'Growth',
        happiness:      'Happiness',
        zoneId:         'Zone ID',
        // Tooltip - trades
        coinsPerHour:   'Coins/hour',
        coords:         'Coords',
        fishingBoat:    '🚤 Fishing Boat',
        tradeOutpost:   '🏕️ Trade Outpost',
        // Planner
        plannerTitle:   'Civ Planner',
        capital:        'Capital',
        town:           'Town',
        remove:         'Remove',
        levelLabel:     'Level',
        totalLabel:     'Total',
        exportBtn:      'Export',
        importBtn:      'Import',
        copiedBtn:      '✓ Copied!',
        importedBtn:    (n) => `✓ Imported ${n} town(s)`,
        emptyPlanner:   'Click to place capital,<br>then add towns.<br>Right-click to remove.',
        nothingToImport:'Nothing to import',
        pastePrompt:    'Paste exported layout:',
        // Town list
        townCapital:    '★ Capital',
        townTown:       'Town',
        // Export text
        exportCapital:  (lv) => `★ Capital (Level ${lv})`,
        exportTown:     (lv) => `Town (Level ${lv})`,
        exportZones:    (n)  => `  Zones claimed: ${n}`,
        exportTotal:    '── Total ──',
        // Trade names (EN — same as key)
        tradeNames: {},
        buffNames: {},
        buffDesc: {},
    },
    ru: {
        title:          'Карта мира',
        viewHeat:       'Тепло',
        viewImage:      'Карта',
        viewBoth:       'Оба',
        opacity:        'Прозрачность',
        resetView:      'Сброс вида',
        trades:         'Торговля',
        civPlanner:     'Планировщик',
        loadJson:       'Загрузить JSON',
        statLabel:      'Показатель',
        statScore:      'Рейтинг',
        statHammers:    'Молоты',
        statBeakers:    'Колбы',
        statGrowth:     'Рост',
        statHappiness:  'Счастье',
        weightLabel:    'Влияние',
        jumpTo:         'Перейти',
        go:             'Найти',
        zoneLabel:      'Зона',
        zoomLabel:      'Масштаб',
        loadingData:    'Загрузка data.json…',
        noData:         'Файл data.json не найден — нажмите "Загрузить JSON".',
        loadingFile:    (name) => `Загрузка ${name}…`,
        loadError:      (msg)  => `Ошибка: ${msg}`,
        hoverHint:      'наведите на зону',
        notFound:       (x, z) => `(${x}, ${z}) не найдено`,
        coordinates:    'Координаты',
        score:          'Рейтинг',
        hammers:        'Молоты',
        beakers:        'Колбы',
        growth:         'Рост',
        happiness:      'Счастье',
        zoneId:         'ID зоны',
        coinsPerHour:   'Монет/час',
        coords:         'Координаты',
        fishingBoat:    '🚤 Рыбацкая лодка',
        tradeOutpost:   '🏕️ Торговый пост',
        plannerTitle:   'Планировщик',
        capital:        'Столица',
        town:           'Город',
        remove:         'Удалить',
        levelLabel:     'Уровень',
        totalLabel:     'Итого',
        exportBtn:      'Экспорт',
        importBtn:      'Импорт',
        copiedBtn:      '✓ Скопировано!',
        importedBtn:    (n) => `✓ Импортировано: ${n}`,
        emptyPlanner:   'Нажмите чтобы поставить столицу,<br>затем добавляйте города.<br>ПКМ — удалить город.',
        nothingToImport:'Нечего импортировать',
        pastePrompt:    'Вставьте экспортированные данные:',
        townCapital:    '★ Столица',
        townTown:       'Город',
        exportCapital:  (lv) => `★ Столица (Уровень ${lv})`,
        exportTown:     (lv) => `Город (Уровень ${lv})`,
        exportZones:    (n)  => `  Занято зон: ${n}`,
        exportTotal:    '── Итого ──',
        // Trade names
        tradeNames: {
            Algae: 'Водоросли', Amber: 'Янтарь', Banana: 'Бананы',
            Barley: 'Ячмень', Bison: 'Бизон', Cattle: 'Скот',
            Cinnamon: 'Корица', Citrus: 'Цитрусовые', Clam: 'Моллюск',
            Clove: 'Гвоздика', Cod: 'Треска', Cocoa: 'Какао',
            Coffee: 'Кофе', Corn: 'Кукуруза', Cotton: 'Хлопок',
            Crab: 'Краб', Deer: 'Олень', Eel: 'Угорь',
            Fugu: 'Фугу', Gem: 'Самоцвет', Grape: 'Виноград',
            Guarana: 'Гуарана', Hemlock: 'Болиголов', Honey: 'Мёд',
            Incense: 'Ладан', Ivory: 'Слоновая кость', Jellyfish: 'Медуза',
            Lobster: 'Омар', Marble: 'Мрамор', Olive: 'Оливки',
            Papyrus: 'Папирус', Pearl: 'Жемчуг', Pelt: 'Меха',
            Rice: 'Рис', Salmon: 'Лосось', Salt: 'Соль',
            Seal: 'Тюлень', Shipwreck: 'Кораблекрушение', Shrimp: 'Креветки',
            Silk: 'Шёлк', Spice: 'Специи', Squid: 'Кальмар',
            Sugar: 'Сахар', Tea: 'Чай', Tobacco: 'Табак',
            Trout: 'Форель', Truffle: 'Трюфель', Tuna: 'Тунец',
            Turtle: 'Черепаха', Whale: 'Кит',
        },
        // Buff names
        buffNames: {
            'Advanced Tooling': 'Передовые инструменты',
            'Barricade': 'Баррикада',
            'Barter': 'Бартер',
            'Carnival': 'Карнавал',
            'Construction': 'Строительство',
            'Catalyst': 'Катализатор',
            'Efficient Gears': 'Эффективные шестерни',
            'Enjoyment': 'Удовольствие',
            'Extraction': 'Добыча',
            'Fine Art': 'Изящное искусство',
            'Fire Bomb': 'Зажигательная бомба',
            'Gourmet': 'Гурман',
            'Great Work': 'Великое произведение',
            'Innovation': 'Инновация',
            'Investment': 'Инвестиция',
            'Joywire': 'Радость',
            'Maintenance': 'Обслуживание',
            'Management': 'Управление',
            'Medicine': 'Медицина',
            'Monopoly': 'Монополия',
            'Optics': 'Оптика',
            'Optimization': 'Оптимизация',
            'Preservative': 'Консервант',
            'Profit': 'Прибыль',
            'Progression': 'Прогрессия',
            'Propaganda': 'Пропаганда',
            'Prosperity': 'Процветание',
            'Rush': 'Рывок',
            'Smeltery': 'Плавильня',
            'Reinforced Masonry': 'Укреплённая кладка',
            'Toys': 'Игрушки',
            'Vitamin': 'Витамин',
            'Year of Plenty': 'Год изобилия',
            'Year Of Plenty': 'Год изобилия',
        },
        // Buff descriptions
        buffDesc: {
            'Advanced Tooling':   'Увеличивает производство молотов на шахтах на 10%',
            'Barricade':          'Увеличивает очки прочности стен на 10%',
            'Barter':             'Увеличивает курс обмена минералов в банке на 5% (10% на ур. 8)',
            'Carnival':           'Увеличивает счастье города на 10',
            'Construction':       'Увеличивает молоты на 85 (+10 за эпоху)',
            'Catalyst':           'Снижает стоимость катализатора (молоты) на 3%',
            'Efficient Gears':    'Увеличивает производство мельниц/пекарен/лесопилок на 25%',
            'Enjoyment':          'Даёт +3 к счастью',
            'Extraction':         'Увеличивает шанс редких минералов в мельнице на 5%',
            'Fine Art':           'Увеличивает выработку культуры города на 10%',
            'Fire Bomb':          'Увеличивает урон стрел на 1, башни стреляют огненными стрелами',
            'Gourmet':            'Увеличивает скорость коттеджей города на 10%',
            'Great Work':         'Увеличивает культуру города на 50 базово (+15 за эпоху)',
            'Innovation':         'Снижает стоимость всех исследований на 3% (макс. 3 в цивилизации)',
            'Investment':         'Увеличивает налог города на 5%',
            'Joywire':            'Снижает влияние масштаба золотого века на 10%',
            'Maintenance':        'Снижает содержание города на 10%',
            'Management':         'Снижает потребление лабораторий/шахт/храмов на 10%',
            'Medicine':           'Снижает время возрождения в ратуше на 10 секунд',
            'Monopoly':           'Увеличивает монеты от торговых товаров на 10%',
            'Optics':             'Увеличивает дальность башен на 10%',
            'Optimization':       'Увеличивает глобальную скорость города на 2%',
            'Preservative':       'Снижает потребление коттеджей города на 25%',
            'Profit':             'Увеличивает скорость дохода города на 5%',
            'Progression':        'Увеличивает очки золотого века в час на 10',
            'Propaganda':         'Снижает недовольство города на 1',
            'Prosperity':         'Увеличивает очки золотого века в час на 10%',
            'Rush':               'Снижает стоимость строений (молоты) на 10% (чудеса 5%)',
            'Smeltery':           'Увеличивает скорость плавки в плавильне на 10%',
            'Reinforced Masonry': 'Увеличивает очки прочности башен на 10%',
            'Toys':               'Увеличивает скорость счастья города на 10%',
            'Vitamin':            'Снижает потребление пастбищ города на 20%',
            'Year of Plenty':     'Увеличивает скорость роста города на 15%',
            'Year Of Plenty':     'Увеличивает скорость роста города на 15%',
        },
    },
};

const LANG_KEY = 'worldmap_lang';

export let lang = localStorage.getItem(LANG_KEY) || 'ru';

export function t(key, ...args) {
    const val = STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
    return typeof val === 'function' ? val(...args) : val;
}

export function setLang(l) {
    lang = l;
    localStorage.setItem(LANG_KEY, l);
}

export function applyStaticStrings() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        const attr = el.dataset.i18nAttr;
        const value = t(key);
        if (attr) el.setAttribute(attr, value);
        else el.textContent = value;
    });
}

export function tradeName(name) {
    return STRINGS[lang]?.tradeNames?.[name] || name;
}

export function buffName(name) {
    return STRINGS[lang]?.buffNames?.[name] || name;
}

export function buffDesc(name) {
    return STRINGS[lang]?.buffDesc?.[name] || null;
}