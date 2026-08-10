import {
  SiGithub, SiGitlab, SiGmail, SiGoogle, SiFacebook, SiInstagram, SiX,
  SiWhatsapp, SiTelegram, SiDiscord, SiReddit, SiPinterest, SiTiktok, SiSnapchat,
  SiNetflix, SiSpotify, SiYoutube, SiTwitch, SiSteam, SiRoblox, SiBattledotnet,
  SiRiotgames, SiValorant, SiUbisoft,
  SiNotion, SiTrello, SiFigma, SiZoom, SiVimeo, SiBitbucket, SiAtlassian, SiJira,
  SiConfluence, SiAsana, SiDocker, SiMongodb, SiNpm, SiVercel, SiDigitalocean,
  SiCloudflare, SiFirebase,
  SiEbay, SiEtsy, SiShopify, SiMercadopago, SiPaypal, SiStripe, SiWise, SiRevolut,
  SiBinance, SiCoinbase,
  SiAirbnb, SiUber,
  SiApple, SiIcloud, SiDropbox, SiWordpress, SiProtonmail, SiDuolingo, SiEpicgames,
  SiPlaystation, SiBitwarden, SiLastpass, SiAnthropic, SiClaude
} from 'react-icons/si';

// keyword (en minúsculas) -> { Icon, color de marca }. Match por substring
// sobre el nombre del sitio. Lista curada a propósito (no todo Simple Icons)
// para no inflar el bundle con miles de logos que nunca se usan.
//
// OJO: Simple Icons no tiene TODAS las marcas — algunas fueron retiradas
// del paquete por reclamos legales de las empresas (Amazon, Microsoft,
// LinkedIn, Adobe, Slack, Skype quedaron afuera en esta versión). Para esos
// casos, y para cualquier sitio no listado acá, se usa el avatar de
// inicial + color como fallback.
export const BRAND_ICONS = {
  github: { Icon: SiGithub, color: '#181717' },
  gitlab: { Icon: SiGitlab, color: '#FC6D26' },
  gmail: { Icon: SiGmail, color: '#EA4335' },
  google: { Icon: SiGoogle, color: '#4285F4' },
  facebook: { Icon: SiFacebook, color: '#1877F2' },
  instagram: { Icon: SiInstagram, color: '#E4405F' },
  twitter: { Icon: SiX, color: '#000000' },
  whatsapp: { Icon: SiWhatsapp, color: '#25D366' },
  telegram: { Icon: SiTelegram, color: '#26A5E4' },
  discord: { Icon: SiDiscord, color: '#5865F2' },
  reddit: { Icon: SiReddit, color: '#FF4500' },
  pinterest: { Icon: SiPinterest, color: '#BD081C' },
  tiktok: { Icon: SiTiktok, color: '#000000' },
  snapchat: { Icon: SiSnapchat, color: '#FFFC00' },
  netflix: { Icon: SiNetflix, color: '#E50914' },
  spotify: { Icon: SiSpotify, color: '#1ED760' },
  youtube: { Icon: SiYoutube, color: '#FF0000' },
  twitch: { Icon: SiTwitch, color: '#9146FF' },
  steam: { Icon: SiSteam, color: '#000000' },
  roblox: { Icon: SiRoblox, color: '#000000' },
  battlenet: { Icon: SiBattledotnet, color: '#00AEFF' },
  riotgames: { Icon: SiRiotgames, color: '#D32936' },
  valorant: { Icon: SiValorant, color: '#FD4556' },
  ubisoft: { Icon: SiUbisoft, color: '#000000' },
  notion: { Icon: SiNotion, color: '#000000' },
  trello: { Icon: SiTrello, color: '#0052CC' },
  figma: { Icon: SiFigma, color: '#F24E1E' },
  zoom: { Icon: SiZoom, color: '#2D8CFF' },
  vimeo: { Icon: SiVimeo, color: '#1AB7EA' },
  bitbucket: { Icon: SiBitbucket, color: '#0052CC' },
  atlassian: { Icon: SiAtlassian, color: '#0052CC' },
  jira: { Icon: SiJira, color: '#0052CC' },
  confluence: { Icon: SiConfluence, color: '#172B4D' },
  asana: { Icon: SiAsana, color: '#F06A6A' },
  docker: { Icon: SiDocker, color: '#2496ED' },
  mongodb: { Icon: SiMongodb, color: '#47A248' },
  npm: { Icon: SiNpm, color: '#CB3837' },
  vercel: { Icon: SiVercel, color: '#000000' },
  digitalocean: { Icon: SiDigitalocean, color: '#0080FF' },
  cloudflare: { Icon: SiCloudflare, color: '#F38020' },
  firebase: { Icon: SiFirebase, color: '#FFCA28' },
  ebay: { Icon: SiEbay, color: '#E53238' },
  etsy: { Icon: SiEtsy, color: '#F16521' },
  shopify: { Icon: SiShopify, color: '#7AB55C' },
  mercadolibre: { Icon: SiMercadopago, color: '#009EE3' },
  mercadopago: { Icon: SiMercadopago, color: '#009EE3' },
  paypal: { Icon: SiPaypal, color: '#00457C' },
  stripe: { Icon: SiStripe, color: '#635BFF' },
  wise: { Icon: SiWise, color: '#9FE870' },
  revolut: { Icon: SiRevolut, color: '#000000' },
  binance: { Icon: SiBinance, color: '#F0B90B' },
  coinbase: { Icon: SiCoinbase, color: '#0052FF' },
  airbnb: { Icon: SiAirbnb, color: '#FF5A5F' },
  uber: { Icon: SiUber, color: '#000000' },
  apple: { Icon: SiApple, color: '#000000' },
  icloud: { Icon: SiIcloud, color: '#3693F3' },
  dropbox: { Icon: SiDropbox, color: '#0061FF' },
  wordpress: { Icon: SiWordpress, color: '#21759B' },
  protonmail: { Icon: SiProtonmail, color: '#8B89CC' },
  duolingo: { Icon: SiDuolingo, color: '#58CC02' },
  epicgames: { Icon: SiEpicgames, color: '#313131' },
  playstation: { Icon: SiPlaystation, color: '#003791' },
  bitwarden: { Icon: SiBitwarden, color: '#175DDC' },
  lastpass: { Icon: SiLastpass, color: '#D32D2F' },
  anthropic: { Icon: SiAnthropic, color: '#191919' },
  claude: { Icon: SiClaude, color: '#D97757' }
};

export function findBrandIcon(site) {
  const normalized = (site || '').toLowerCase();
  if (!normalized) return null;
  for (const [keyword, brand] of Object.entries(BRAND_ICONS)) {
    if (normalized.includes(keyword)) return brand;
  }
  return null;
}
