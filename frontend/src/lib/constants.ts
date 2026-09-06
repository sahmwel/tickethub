// frontend/src/lib/constants.ts

export const CATEGORIES = [
  { id: 1, name: "Concerts & Live Music", emoji: "🎵" },
  { id: 2, name: "Festivals", emoji: "🎪" },
  { id: 3, name: "Parties & Nightlife", emoji: "🕺" },
  { id: 4, name: "Rave / EDM Parties", emoji: "✨" },
  { id: 5, name: "House Party", emoji: "🏠" },
  { id: 6, name: "Networking Events", emoji: "🤝" },
  { id: 7, name: "Workshop & Classes", emoji: "🎨" },
  { id: 8, name: "Conference & Seminars", emoji: "💼" },
  { id: 9, name: "Sports Events", emoji: "⚽" },
  { id: 10, name: "Theatre & Performing Arts", emoji: "🎭" },
  { id: 11, name: "Birthday Parties", emoji: "🎉" },
  { id: 12, name: "Weddings & Engagements", emoji: "💍" },
  { id: 13, name: "Corporate Events", emoji: "🏢" },
  { id: 14, name: "Charity & Fundraisers", emoji: "❤️" },
  { id: 15, name: "Food & Drink Tastings", emoji: "🍔" },
  { id: 16, name: "Beach Party", emoji: "🏖️" },
  { id: 17, name: "Pool Party", emoji: "🏊" },
  { id: 19, name: "Themed Costume Party", emoji: "🎭" },
  { id: 20, name: "Karaoke Night", emoji: "🎤" },
  { id: 21, name: "Halloween Party", emoji: "👻" },
  { id: 22, name: "Christmas Party", emoji: "🎄" },
  { id: 23, name: "New Year's Eve Party", emoji: "🎆" },
] as const;

export type CategoryName = (typeof CATEGORIES)[number]["name"];

// ============================================
// COUNTRY CONFIGURATION
// ============================================

export interface CountryConfig {
  name: string;
  currency: string;
  currencySymbol?: string;
  timezone?: string;
  provider: "paystack" | "flutterwave";
}

export const COUNTRIES: CountryConfig[] = [
  // ============================================
  // AFRICA - Paystack (Nigeria only) & Flutterwave
  // ============================================
  { name: "Nigeria", currency: "NGN", provider: "paystack", timezone: "Africa/Lagos" },
  { name: "Ghana", currency: "GHS", provider: "flutterwave", timezone: "Africa/Accra" },
  { name: "Kenya", currency: "KES", provider: "flutterwave", timezone: "Africa/Nairobi" },
  { name: "South Africa", currency: "ZAR", provider: "flutterwave", timezone: "Africa/Johannesburg" },
  { name: "Uganda", currency: "UGX", provider: "flutterwave", timezone: "Africa/Kampala" },
  { name: "Tanzania", currency: "TZS", provider: "flutterwave", timezone: "Africa/Dar_es_Salaam" },
  { name: "Rwanda", currency: "RWF", provider: "flutterwave", timezone: "Africa/Kigali" },
  { name: "Egypt", currency: "EGP", provider: "flutterwave", timezone: "Africa/Cairo" },
  { name: "Morocco", currency: "MAD", provider: "flutterwave", timezone: "Africa/Casablanca" },
  { name: "Zambia", currency: "ZMW", provider: "flutterwave", timezone: "Africa/Lusaka" },
  { name: "Botswana", currency: "BWP", provider: "flutterwave", timezone: "Africa/Gaborone" },
  { name: "Mauritius", currency: "MUR", provider: "flutterwave", timezone: "Indian/Mauritius" },
  { name: "Mozambique", currency: "MZN", provider: "flutterwave", timezone: "Africa/Maputo" },
  { name: "Angola", currency: "AOA", provider: "flutterwave", timezone: "Africa/Luanda" },
  { name: "Ethiopia", currency: "ETB", provider: "flutterwave", timezone: "Africa/Addis_Ababa" },
  { name: "Cameroon", currency: "XAF", provider: "flutterwave", timezone: "Africa/Douala" },
  { name: "Ivory Coast", currency: "XOF", provider: "flutterwave", timezone: "Africa/Abidjan" },
  { name: "Senegal", currency: "XOF", provider: "flutterwave", timezone: "Africa/Dakar" },
  { name: "Mali", currency: "XOF", provider: "flutterwave", timezone: "Africa/Bamako" },
  { name: "Burkina Faso", currency: "XOF", provider: "flutterwave", timezone: "Africa/Ouagadougou" },
  { name: "Benin", currency: "XOF", provider: "flutterwave", timezone: "Africa/Porto-Novo" },
  { name: "Niger", currency: "XOF", provider: "flutterwave", timezone: "Africa/Niamey" },
  { name: "Guinea", currency: "GNF", provider: "flutterwave", timezone: "Africa/Conakry" },
  { name: "Togo", currency: "XOF", provider: "flutterwave", timezone: "Africa/Lome" },
  { name: "Liberia", currency: "LRD", provider: "flutterwave", timezone: "Africa/Monrovia" },
  { name: "Sierra Leone", currency: "SLL", provider: "flutterwave", timezone: "Africa/Freetown" },
  { name: "Zimbabwe", currency: "ZWL", provider: "flutterwave", timezone: "Africa/Harare" },
  { name: "Namibia", currency: "NAD", provider: "flutterwave", timezone: "Africa/Windhoek" },
  { name: "Eswatini", currency: "SZL", provider: "flutterwave", timezone: "Africa/Mbabane" },
  { name: "Lesotho", currency: "LSL", provider: "flutterwave", timezone: "Africa/Maseru" },
  { name: "Cape Verde", currency: "CVE", provider: "flutterwave", timezone: "Atlantic/Cape_Verde" },
  { name: "Comoros", currency: "KMF", provider: "flutterwave", timezone: "Indian/Comoro" },
  { name: "Djibouti", currency: "DJF", provider: "flutterwave", timezone: "Africa/Djibouti" },
  { name: "Eritrea", currency: "ERN", provider: "flutterwave", timezone: "Africa/Asmara" },
  { name: "Gambia", currency: "GMD", provider: "flutterwave", timezone: "Africa/Banjul" },
  { name: "Guinea-Bissau", currency: "XOF", provider: "flutterwave", timezone: "Africa/Bissau" },
  { name: "Madagascar", currency: "MGA", provider: "flutterwave", timezone: "Indian/Antananarivo" },
  { name: "Malawi", currency: "MWK", provider: "flutterwave", timezone: "Africa/Blantyre" },
  { name: "Mauritania", currency: "MRU", provider: "flutterwave", timezone: "Africa/Nouakchott" },
  { name: "Sao Tome and Principe", currency: "STN", provider: "flutterwave", timezone: "Africa/Sao_Tome" },
  { name: "Seychelles", currency: "SCR", provider: "flutterwave", timezone: "Indian/Mahe" },
  { name: "Somalia", currency: "SOS", provider: "flutterwave", timezone: "Africa/Mogadishu" },
  { name: "South Sudan", currency: "SSP", provider: "flutterwave", timezone: "Africa/Juba" },
  { name: "Sudan", currency: "SDG", provider: "flutterwave", timezone: "Africa/Khartoum" },
  
  // ============================================
  // EUROPE - Flutterwave
  // ============================================
  { name: "United Kingdom", currency: "GBP", provider: "flutterwave", timezone: "Europe/London" },
  { name: "France", currency: "EUR", provider: "flutterwave", timezone: "Europe/Paris" },
  { name: "Germany", currency: "EUR", provider: "flutterwave", timezone: "Europe/Berlin" },
  { name: "Italy", currency: "EUR", provider: "flutterwave", timezone: "Europe/Rome" },
  { name: "Spain", currency: "EUR", provider: "flutterwave", timezone: "Europe/Madrid" },
  { name: "Portugal", currency: "EUR", provider: "flutterwave", timezone: "Europe/Lisbon" },
  { name: "Netherlands", currency: "EUR", provider: "flutterwave", timezone: "Europe/Amsterdam" },
  { name: "Belgium", currency: "EUR", provider: "flutterwave", timezone: "Europe/Brussels" },
  { name: "Switzerland", currency: "CHF", provider: "flutterwave", timezone: "Europe/Zurich" },
  { name: "Sweden", currency: "SEK", provider: "flutterwave", timezone: "Europe/Stockholm" },
  { name: "Norway", currency: "NOK", provider: "flutterwave", timezone: "Europe/Oslo" },
  { name: "Denmark", currency: "DKK", provider: "flutterwave", timezone: "Europe/Copenhagen" },
  { name: "Finland", currency: "EUR", provider: "flutterwave", timezone: "Europe/Helsinki" },
  { name: "Ireland", currency: "EUR", provider: "flutterwave", timezone: "Europe/Dublin" },
  { name: "Austria", currency: "EUR", provider: "flutterwave", timezone: "Europe/Vienna" },
  { name: "Greece", currency: "EUR", provider: "flutterwave", timezone: "Europe/Athens" },
  { name: "Poland", currency: "PLN", provider: "flutterwave", timezone: "Europe/Warsaw" },
  { name: "Czech Republic", currency: "CZK", provider: "flutterwave", timezone: "Europe/Prague" },
  { name: "Hungary", currency: "HUF", provider: "flutterwave", timezone: "Europe/Budapest" },
  { name: "Romania", currency: "RON", provider: "flutterwave", timezone: "Europe/Bucharest" },
  { name: "Bulgaria", currency: "BGN", provider: "flutterwave", timezone: "Europe/Sofia" },
  { name: "Croatia", currency: "EUR", provider: "flutterwave", timezone: "Europe/Zagreb" },
  { name: "Slovakia", currency: "EUR", provider: "flutterwave", timezone: "Europe/Bratislava" },
  { name: "Slovenia", currency: "EUR", provider: "flutterwave", timezone: "Europe/Ljubljana" },
  { name: "Lithuania", currency: "EUR", provider: "flutterwave", timezone: "Europe/Vilnius" },
  { name: "Latvia", currency: "EUR", provider: "flutterwave", timezone: "Europe/Riga" },
  { name: "Estonia", currency: "EUR", provider: "flutterwave", timezone: "Europe/Tallinn" },
  { name: "Luxembourg", currency: "EUR", provider: "flutterwave", timezone: "Europe/Luxembourg" },
  { name: "Malta", currency: "EUR", provider: "flutterwave", timezone: "Europe/Malta" },
  { name: "Cyprus", currency: "EUR", provider: "flutterwave", timezone: "Asia/Nicosia" },
  
  // ============================================
  // AMERICAS - Flutterwave
  // ============================================
  { name: "United States", currency: "USD", provider: "flutterwave", timezone: "America/New_York" },
  { name: "Canada", currency: "CAD", provider: "flutterwave", timezone: "America/Toronto" },
  { name: "Mexico", currency: "MXN", provider: "flutterwave", timezone: "America/Mexico_City" },
  { name: "Brazil", currency: "BRL", provider: "flutterwave", timezone: "America/Sao_Paulo" },
  { name: "Argentina", currency: "ARS", provider: "flutterwave", timezone: "America/Buenos_Aires" },
  { name: "Chile", currency: "CLP", provider: "flutterwave", timezone: "America/Santiago" },
  { name: "Colombia", currency: "COP", provider: "flutterwave", timezone: "America/Bogota" },
  { name: "Peru", currency: "PEN", provider: "flutterwave", timezone: "America/Lima" },
  { name: "Jamaica", currency: "JMD", provider: "flutterwave", timezone: "America/Jamaica" },
  { name: "Trinidad and Tobago", currency: "TTD", provider: "flutterwave", timezone: "America/Port_of_Spain" },
  { name: "Barbados", currency: "BBD", provider: "flutterwave", timezone: "America/Barbados" },
  { name: "Bahamas", currency: "BSD", provider: "flutterwave", timezone: "America/Nassau" },
  { name: "Costa Rica", currency: "CRC", provider: "flutterwave", timezone: "America/Costa_Rica" },
  { name: "Dominican Republic", currency: "DOP", provider: "flutterwave", timezone: "America/Santo_Domingo" },
  { name: "El Salvador", currency: "USD", provider: "flutterwave", timezone: "America/El_Salvador" },
  { name: "Guatemala", currency: "GTQ", provider: "flutterwave", timezone: "America/Guatemala" },
  { name: "Honduras", currency: "HNL", provider: "flutterwave", timezone: "America/Tegucigalpa" },
  { name: "Nicaragua", currency: "NIO", provider: "flutterwave", timezone: "America/Managua" },
  { name: "Panama", currency: "PAB", provider: "flutterwave", timezone: "America/Panama" },
  { name: "Uruguay", currency: "UYU", provider: "flutterwave", timezone: "America/Montevideo" },
  { name: "Paraguay", currency: "PYG", provider: "flutterwave", timezone: "America/Asuncion" },
  { name: "Bolivia", currency: "BOB", provider: "flutterwave", timezone: "America/La_Paz" },
  { name: "Ecuador", currency: "USD", provider: "flutterwave", timezone: "America/Guayaquil" },
  
  // ============================================
  // ASIA - Flutterwave
  // ============================================
  { name: "India", currency: "INR", provider: "flutterwave", timezone: "Asia/Kolkata" },
  { name: "China", currency: "CNY", provider: "flutterwave", timezone: "Asia/Shanghai" },
  { name: "Japan", currency: "JPY", provider: "flutterwave", timezone: "Asia/Tokyo" },
  { name: "South Korea", currency: "KRW", provider: "flutterwave", timezone: "Asia/Seoul" },
  { name: "Singapore", currency: "SGD", provider: "flutterwave", timezone: "Asia/Singapore" },
  { name: "Malaysia", currency: "MYR", provider: "flutterwave", timezone: "Asia/Kuala_Lumpur" },
  { name: "Thailand", currency: "THB", provider: "flutterwave", timezone: "Asia/Bangkok" },
  { name: "Vietnam", currency: "VND", provider: "flutterwave", timezone: "Asia/Ho_Chi_Minh" },
  { name: "Indonesia", currency: "IDR", provider: "flutterwave", timezone: "Asia/Jakarta" },
  { name: "Philippines", currency: "PHP", provider: "flutterwave", timezone: "Asia/Manila" },
  { name: "Pakistan", currency: "PKR", provider: "flutterwave", timezone: "Asia/Karachi" },
  { name: "Bangladesh", currency: "BDT", provider: "flutterwave", timezone: "Asia/Dhaka" },
  { name: "Sri Lanka", currency: "LKR", provider: "flutterwave", timezone: "Asia/Colombo" },
  { name: "Nepal", currency: "NPR", provider: "flutterwave", timezone: "Asia/Kathmandu" },
  { name: "Hong Kong", currency: "HKD", provider: "flutterwave", timezone: "Asia/Hong_Kong" },
  { name: "Taiwan", currency: "TWD", provider: "flutterwave", timezone: "Asia/Taipei" },
  { name: "Saudi Arabia", currency: "SAR", provider: "flutterwave", timezone: "Asia/Riyadh" },
  { name: "United Arab Emirates", currency: "AED", provider: "flutterwave", timezone: "Asia/Dubai" },
  { name: "Israel", currency: "ILS", provider: "flutterwave", timezone: "Asia/Jerusalem" },
  { name: "Turkey", currency: "TRY", provider: "flutterwave", timezone: "Europe/Istanbul" },
  { name: "Lebanon", currency: "LBP", provider: "flutterwave", timezone: "Asia/Beirut" },
  { name: "Jordan", currency: "JOD", provider: "flutterwave", timezone: "Asia/Amman" },
  { name: "Kuwait", currency: "KWD", provider: "flutterwave", timezone: "Asia/Kuwait" },
  { name: "Oman", currency: "OMR", provider: "flutterwave", timezone: "Asia/Muscat" },
  { name: "Qatar", currency: "QAR", provider: "flutterwave", timezone: "Asia/Qatar" },
  { name: "Bahrain", currency: "BHD", provider: "flutterwave", timezone: "Asia/Bahrain" },
  { name: "Iraq", currency: "IQD", provider: "flutterwave", timezone: "Asia/Baghdad" },
  { name: "Yemen", currency: "YER", provider: "flutterwave", timezone: "Asia/Aden" },
  
  // ============================================
  // OCEANIA - Flutterwave
  // ============================================
  { name: "Australia", currency: "AUD", provider: "flutterwave", timezone: "Australia/Sydney" },
  { name: "New Zealand", currency: "NZD", provider: "flutterwave", timezone: "Pacific/Auckland" },
  { name: "Fiji", currency: "FJD", provider: "flutterwave", timezone: "Pacific/Fiji" },
  { name: "Papua New Guinea", currency: "PGK", provider: "flutterwave", timezone: "Pacific/Port_Moresby" },
];

// ============================================
// CURRENCY SYMBOLS
// ============================================

export const getCurrencySymbol = (currencyCode: string): string => {
  const symbols: Record<string, string> = {
    // Africa
    NGN: "₦",
    GHS: "₵",
    KES: "KSh",
    ZAR: "R",
    UGX: "USh",
    TZS: "TSh",
    RWF: "FRw",
    EGP: "E£",
    MAD: "DH",
    ZMW: "ZK",
    BWP: "P",
    MUR: "Rs",
    MZN: "MT",
    AOA: "Kz",
    ETB: "Br",
    XAF: "FCFA",
    XOF: "CFA",
    GNF: "FG",
    LRD: "L$",
    SLL: "Le",
    ZWL: "Z$",
    NAD: "N$",
    SZL: "L",
    LSL: "L",
    CVE: "Esc",
    KMF: "CF",
    DJF: "Fdj",
    ERN: "Nfk",
    GMD: "D",
    MGA: "Ar",
    MWK: "MK",
    MRU: "UM",
    STN: "Db",
    SCR: "SCR",
    SOS: "S",
    SSP: "SSP",
    SDG: "SDG",
    
    // Europe
    GBP: "£",
    EUR: "€",
    CHF: "CHF",
    SEK: "SEK",
    NOK: "NOK",
    DKK: "DKK",
    PLN: "zł",
    CZK: "Kč",
    HUF: "Ft",
    RON: "lei",
    BGN: "лв",
    
    // Americas
    USD: "$",
    CAD: "C$",
    MXN: "$",
    BRL: "R$",
    ARS: "$",
    CLP: "$",
    COP: "$",
    PEN: "S/",
    JMD: "J$",
    TTD: "TT$",
    BBD: "B$",
    BSD: "B$",
    CRC: "₡",
    DOP: "RD$",
    GTQ: "Q",
    HNL: "L",
    NIO: "C$",
    PAB: "B/",
    UYU: "$U",
    PYG: "₲",
    BOB: "Bs",
    
    // Asia
    INR: "₹",
    CNY: "¥",
    JPY: "¥",
    KRW: "₩",
    SGD: "S$",
    MYR: "RM",
    THB: "฿",
    VND: "₫",
    IDR: "Rp",
    PHP: "₱",
    PKR: "Rs",
    BDT: "৳",
    LKR: "Rs",
    NPR: "Rs",
    HKD: "HK$",
    TWD: "NT$",
    SAR: "SAR",
    AED: "د.إ",
    ILS: "₪",
    TRY: "₺",
    LBP: "ل.ل",
    JOD: "JD",
    KWD: "KWD",
    OMR: "OMR",
    QAR: "QAR",
    BHD: "BHD",
    IQD: "IQD",
    YER: "YER",
    
    // Oceania
    AUD: "A$",
    NZD: "NZ$",
    FJD: "FJ$",
    PGK: "K",
  };
  
  return symbols[currencyCode] || currencyCode;
};

// ============================================
// COUNTRY HELPERS
// ============================================

export function getCountryConfig(countryName: string): CountryConfig {
  const country = COUNTRIES.find((c) => c.name === countryName);
  if (!country) {
    console.warn(`Country "${countryName}" not found, defaulting to Nigeria`);
    return COUNTRIES[0];
  }
  return country;
}

export function getCountryByCurrency(currencyCode: string): CountryConfig | undefined {
  return COUNTRIES.find((c) => c.currency === currencyCode);
}

export function getCountriesByProvider(provider: "paystack" | "flutterwave"): CountryConfig[] {
  return COUNTRIES.filter((c) => c.provider === provider);
}

export function getAllCurrencies(): string[] {
  return COUNTRIES.map((c) => c.currency);
}

export function getAllCountryNames(): string[] {
  return COUNTRIES.map((c) => c.name);
}

export function getCountryTimezones(countryName: string): string[] {
  const country = getCountryConfig(countryName);
  // Return common timezones for the country
  const timezoneMap: Record<string, string[]> = {
    'Nigeria': ['Africa/Lagos'],
    'United Kingdom': ['Europe/London'],
    'United States': ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles'],
    'Canada': ['America/Toronto', 'America/Vancouver', 'America/Montreal'],
    'Australia': ['Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane', 'Australia/Perth'],
    // Add more as needed
  };
  return timezoneMap[countryName] || [country.timezone || 'UTC'];
}

// ============================================
// MONEY HELPERS
// ============================================

export function formatMoney(amount: number, currencyCode: string): string {
  const symbol = getCurrencySymbol(currencyCode);
  const formattedAmount = amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${symbol}${formattedAmount}`;
}

export function parseMoney(formatted: string): number {
  const cleaned = formatted.replace(/[^0-9.,]/g, '').replace(/,/g, '');
  return parseFloat(cleaned) || 0;
}

// ============================================
// DATE/TIME HELPERS
// ============================================

export function formatEventDateTime(
  iso: string, 
  timezone: string = "Africa/Lagos", 
  opts?: Intl.DateTimeFormatOptions
): string {
  const date = new Date(iso);
  const defaultOptions: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
    ...opts,
  };
  
  return date.toLocaleString("en-US", defaultOptions);
}

export function formatDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  });
}

export function formatTime(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  });
}

export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const d = typeof date === 'string' ? new Date(date) : date;
  const diff = now.getTime() - d.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

// ============================================
// VALIDATION HELPERS
// ============================================

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhone(phone: string): boolean {
  return /^[\d\s+()-]{7,15}$/.test(phone);
}

export function isValidName(name: string): boolean {
  return name.trim().length >= 2;
}

export function isValidAmount(amount: number): boolean {
  return amount > 0 && isFinite(amount);
}

// ============================================
// STRING HELPERS
// ============================================

export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function capitalizeWords(text: string): string {
  return text.replace(/\b\w/g, (char) => char.toUpperCase());
}

// ============================================
// EXPORT DEFAULTS
// ============================================

export default {
  CATEGORIES,
  COUNTRIES,
  getCurrencySymbol,
  getCountryConfig,
  getCountryByCurrency,
  getCountriesByProvider,
  getAllCurrencies,
  getAllCountryNames,
  getCountryTimezones,
  formatMoney,
  parseMoney,
  formatEventDateTime,
  formatDate,
  formatTime,
  formatRelativeTime,
  isValidEmail,
  isValidPhone,
  isValidName,
  isValidAmount,
  truncateText,
  slugify,
  capitalizeWords,
};