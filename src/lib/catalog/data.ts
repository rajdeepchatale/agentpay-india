// ============================================================
// Sakhi Sarees, Pune — Product Catalog Seed Data
// ============================================================
// 16 products across 3 price tiers for guardrail demo
// ============================================================

import type { Product } from '@/types';

const MERCHANT = {
  name: 'Sakhi Sarees',
  razorpay_id: 'merch_test_001',
};

export const products: Product[] = [
  // ─────────────────────────────────────────────────────────
  // TIER 1: Affordable (₹499–₹999)
  // These are within the default ₹1,000 guardrail — happy path
  // ─────────────────────────────────────────────────────────

  {
    id: 'prod_001',
    name: 'Handloom Cotton Saree — Mango Motif',
    name_hindi: 'हातमाग कॉटन साडी — आंबा मोटिफ',
    description:
      'Soft handloom cotton saree with traditional mango (amba) border motif. Perfect for daily wear. Lightweight and breathable — ideal for Pune summers.',
    price: 599,
    category: 'sarees',
    tags: ['cotton', 'handloom', 'daily-wear', 'mango-motif', 'affordable'],
    tags_hindi: ['कॉटन', 'हातमाग', 'रोजची साडी', 'आंबा मोटिफ'],
    sizes: ['Free Size'],
    colors: ['Green', 'Yellow Border'],
    in_stock: true,
    image_url: '/products/cotton-mango-saree.jpg',
    merchant: MERCHANT,
  },
  {
    id: 'prod_002',
    name: 'Chanderi Cotton Silk Saree — Peacock Border',
    name_hindi: 'चंदेरी कॉटन सिल्क साडी — मोर बॉर्डर',
    description:
      'Lightweight Chanderi weave with elegant peacock zari border. Semi-transparent drape, perfect for festive occasions and office wear.',
    price: 799,
    category: 'sarees',
    tags: ['chanderi', 'cotton-silk', 'peacock', 'festive', 'zari'],
    tags_hindi: ['चंदेरी', 'कॉटन सिल्क', 'मोर', 'सणासुदीची', 'जरी'],
    sizes: ['Free Size'],
    colors: ['Maroon', 'Gold Border'],
    in_stock: true,
    image_url: '/products/chanderi-peacock-saree.jpg',
    merchant: MERCHANT,
  },
  {
    id: 'prod_003',
    name: 'Khadi Cotton Saree — Block Print',
    name_hindi: 'खादी कॉटन साडी — ब्लॉक प्रिंट',
    description:
      'Hand block-printed khadi cotton saree. Eco-friendly, breathable, and made with natural dyes. A tribute to Indian craftsmanship.',
    price: 499,
    category: 'sarees',
    tags: ['khadi', 'block-print', 'eco-friendly', 'casual', 'natural-dye'],
    tags_hindi: ['खादी', 'ब्लॉक प्रिंट', 'इको-फ्रेंडली', 'नैसर्गिक रंग'],
    sizes: ['Free Size'],
    colors: ['Indigo', 'White'],
    in_stock: true,
    image_url: '/products/khadi-block-saree.jpg',
    merchant: MERCHANT,
  },
  {
    id: 'prod_004',
    name: 'Mul Cotton Saree — Marathi Checks',
    name_hindi: 'मूळ कॉटन साडी — मराठी चेक्स',
    description:
      'Classic Mul cotton with traditional Maharashtrian check pattern. Extremely lightweight, drapes beautifully. A wardrobe staple for Maharashtrian women.',
    price: 649,
    category: 'sarees',
    tags: ['mul-cotton', 'checks', 'marathi', 'traditional', 'lightweight'],
    tags_hindi: ['मूळ कॉटन', 'चेक्स', 'मराठमोळी', 'पारंपरिक', 'हलकी'],
    sizes: ['Free Size'],
    colors: ['White', 'Green Checks'],
    in_stock: true,
    image_url: '/products/mul-cotton-checks.jpg',
    merchant: MERCHANT,
  },
  {
    id: 'prod_005',
    name: 'Paithani Print Cotton Saree',
    name_hindi: 'पैठणी प्रिंट कॉटन साडी',
    description:
      'Cotton saree with Paithani-inspired printed motifs. Get the Paithani look at an affordable price. Traditional pallu design with modern comfort.',
    price: 899,
    category: 'sarees',
    tags: ['paithani-print', 'cotton', 'affordable', 'printed', 'festive'],
    tags_hindi: ['पैठणी प्रिंट', 'कॉटन', 'परवडणारी', 'छापील', 'सणासुदीची'],
    sizes: ['Free Size'],
    colors: ['Purple', 'Gold Print'],
    in_stock: true,
    image_url: '/products/paithani-print-cotton.jpg',
    merchant: MERCHANT,
  },
  {
    id: 'prod_006',
    name: 'Mangalgiri Cotton Saree — Temple Border',
    name_hindi: 'मंगलगिरी कॉटन साडी — मंदिर बॉर्डर',
    description:
      'Handloom Mangalgiri cotton with iconic temple border zari work. Crisp texture, holds pleats well. Popular for office and daily wear.',
    price: 749,
    category: 'sarees',
    tags: ['mangalgiri', 'cotton', 'temple-border', 'handloom', 'office-wear'],
    tags_hindi: ['मंगलगिरी', 'कॉटन', 'मंदिर बॉर्डर', 'हातमाग', 'ऑफिस वेअर'],
    sizes: ['Free Size'],
    colors: ['Yellow', 'Maroon Border'],
    in_stock: true,
    image_url: '/products/mangalgiri-temple-border.jpg',
    merchant: MERCHANT,
  },

  // ─────────────────────────────────────────────────────────
  // TIER 2: Mid-Range (₹1,500–₹3,000)
  // Above ₹1,000 default limit — triggers GuardrailAlert
  // ─────────────────────────────────────────────────────────

  {
    id: 'prod_007',
    name: 'Banarasi Silk Blend Saree',
    name_hindi: 'बनारसी सिल्क ब्लेंड साडी',
    description:
      'Rich Banarasi silk blend with intricate buti work and heavy pallu. Perfect for weddings and special occasions. Comes with matching blouse piece.',
    price: 2499,
    category: 'sarees',
    tags: ['banarasi', 'silk-blend', 'wedding', 'buti-work', 'heavy-pallu'],
    tags_hindi: ['बनारसी', 'सिल्क ब्लेंड', 'लग्नाची', 'बुटी वर्क', 'भारी पदर'],
    sizes: ['Free Size'],
    colors: ['Red', 'Gold Zari'],
    in_stock: true,
    image_url: '/products/banarasi-silk-blend.jpg',
    merchant: MERCHANT,
  },
  {
    id: 'prod_008',
    name: 'Tussar Silk Saree — Keri Border',
    name_hindi: 'तुसार सिल्क साडी — केरी बॉर्डर',
    description:
      'Natural tussar silk with traditional keri (paisley) border. Rich golden texture with earthy tones. Handwoven by artisans.',
    price: 1999,
    category: 'sarees',
    tags: ['tussar', 'silk', 'keri-border', 'paisley', 'handwoven', 'artisan'],
    tags_hindi: ['तुसार', 'सिल्क', 'केरी बॉर्डर', 'हातविण', 'कारागीर'],
    sizes: ['Free Size'],
    colors: ['Golden', 'Brown Border'],
    in_stock: true,
    image_url: '/products/tussar-silk-keri.jpg',
    merchant: MERCHANT,
  },
  {
    id: 'prod_009',
    name: 'Kanjivaram Silk Saree — Temple Design',
    name_hindi: 'कांजीवरम सिल्क साडी — मंदिर डिझाइन',
    description:
      'South Indian Kanjivaram silk with classic temple design border. Heavy silk with contrast pallu. A timeless investment piece.',
    price: 2999,
    category: 'sarees',
    tags: ['kanjivaram', 'silk', 'temple-design', 'south-indian', 'heavy', 'wedding'],
    tags_hindi: ['कांजीवरम', 'सिल्क', 'मंदिर डिझाइन', 'दक्षिण भारतीय', 'लग्नाची'],
    sizes: ['Free Size'],
    colors: ['Wine', 'Gold Temple Border'],
    in_stock: true,
    image_url: '/products/kanjivaram-temple.jpg',
    merchant: MERCHANT,
  },
  {
    id: 'prod_010',
    name: 'Gadwal Silk Saree',
    name_hindi: 'गडवाल सिल्क साडी',
    description:
      'Gadwal handloom silk with distinctive kuttu border. Lightweight silk body with heavy cotton border — the best of both worlds.',
    price: 1799,
    category: 'sarees',
    tags: ['gadwal', 'silk', 'handloom', 'kuttu-border', 'lightweight'],
    tags_hindi: ['गडवाल', 'सिल्क', 'हातमाग', 'कुट्टू बॉर्डर', 'हलकी'],
    sizes: ['Free Size'],
    colors: ['Blue', 'Maroon Border'],
    in_stock: true,
    image_url: '/products/gadwal-silk.jpg',
    merchant: MERCHANT,
  },

  // ─────────────────────────────────────────────────────────
  // TIER 3: Premium Paithani (₹8,000–₹25,000)
  // The dramatic guardrail block moment in the demo
  // ₹1,000 cap vs ₹8,000+ Paithani — 8x gap
  // ─────────────────────────────────────────────────────────

  {
    id: 'prod_011',
    name: 'Pure Silk Paithani — Peacock Pallu',
    name_hindi: 'शुद्ध रेशमी पैठणी — मोर पदर',
    description:
      'Authentic pure silk Paithani saree with hand-woven peacock (mor) pallu. Sourced directly from Yeola weavers. Each piece takes 15-20 days to weave.',
    price: 8999,
    category: 'sarees',
    tags: ['paithani', 'pure-silk', 'peacock', 'yeola', 'handwoven', 'premium', 'bridal'],
    tags_hindi: ['पैठणी', 'शुद्ध रेशीम', 'मोर', 'येवला', 'हातविण', 'प्रीमियम'],
    sizes: ['Free Size'],
    colors: ['Green', 'Gold Peacock Pallu'],
    in_stock: true,
    image_url: '/products/paithani-peacock.jpg',
    merchant: MERCHANT,
  },
  {
    id: 'prod_012',
    name: 'Yeola Paithani — Asawali Motif',
    name_hindi: 'येवला पैठणी — असावली मोटिफ',
    description:
      'Traditional Yeola Paithani with asawali (vine) motif. Handwoven with real zari thread. Certificate of authenticity from Yeola weavers cooperative.',
    price: 12500,
    category: 'sarees',
    tags: ['paithani', 'yeola', 'asawali', 'vine', 'zari', 'certified', 'premium'],
    tags_hindi: ['पैठणी', 'येवला', 'असावली', 'वेल', 'जरी', 'प्रमाणित', 'प्रीमियम'],
    sizes: ['Free Size'],
    colors: ['Red', 'Gold Asawali Border'],
    in_stock: true,
    image_url: '/products/yeola-paithani-asawali.jpg',
    merchant: MERCHANT,
  },
  {
    id: 'prod_013',
    name: 'Traditional Paithani — Bangdi Mor',
    name_hindi: 'पारंपरिक पैठणी — बांगडी मोर',
    description:
      'Classic Paithan-woven Paithani with bangdi mor (bangle peacock) design. Heirloom quality. Passed down through generations in Maharashtrian families.',
    price: 15999,
    category: 'sarees',
    tags: ['paithani', 'bangdi-mor', 'bangle-peacock', 'heirloom', 'paithan', 'premium'],
    tags_hindi: ['पैठणी', 'बांगडी मोर', 'वारसा', 'पैठण', 'प्रीमियम'],
    sizes: ['Free Size'],
    colors: ['Purple', 'Gold Bangdi Mor'],
    in_stock: true,
    image_url: '/products/paithani-bangdi-mor.jpg',
    merchant: MERCHANT,
  },
  {
    id: 'prod_014',
    name: 'Bridal Paithani — Heavy Zari',
    name_hindi: 'ब्राइडल पैठणी — हेवी जरी',
    description:
      'Bridal collection Paithani with heavy zari work across the entire body. Full peacock pallu. The crown jewel of Sakhi Sarees. Comes in premium packaging.',
    price: 24999,
    category: 'sarees',
    tags: ['paithani', 'bridal', 'heavy-zari', 'full-peacock', 'premium', 'luxury', 'wedding'],
    tags_hindi: ['पैठणी', 'ब्राइडल', 'हेवी जरी', 'संपूर्ण मोर पदर', 'लक्झरी', 'लग्नाची'],
    sizes: ['Free Size'],
    colors: ['Red', 'Heavy Gold Zari'],
    in_stock: true,
    image_url: '/products/bridal-paithani-heavy-zari.jpg',
    merchant: MERCHANT,
  },

  // ─────────────────────────────────────────────────────────
  // EXTRA: Out-of-stock product for failure scenario demo
  // ─────────────────────────────────────────────────────────

  {
    id: 'prod_015',
    name: 'Nauvari Saree — Maharashtrian Drape',
    name_hindi: 'नऊवारी साडी — मराठमोळी',
    description:
      'Traditional 9-yard Maharashtrian nauvari saree in cotton silk. Worn in the classic Maharashtrian kasta style. Currently out of stock — restocking next week.',
    price: 1299,
    category: 'sarees',
    tags: ['nauvari', '9-yard', 'maharashtrian', 'cotton-silk', 'traditional', 'kasta'],
    tags_hindi: ['नऊवारी', 'नऊ गज', 'मराठमोळी', 'कॉटन सिल्क', 'काष्टा'],
    sizes: ['Free Size'],
    colors: ['Green', 'Red Border'],
    in_stock: false,
    image_url: '/products/nauvari-saree.jpg',
    merchant: MERCHANT,
  },
  {
    id: 'prod_016',
    name: 'Ikat Cotton Saree — Double Weave',
    name_hindi: 'इकत कॉटन साडी — डबल विव्ह',
    description:
      'Handwoven double ikat cotton saree with geometric patterns. Each thread is tie-dyed before weaving, creating a unique pattern on every piece.',
    price: 949,
    category: 'sarees',
    tags: ['ikat', 'cotton', 'double-weave', 'handwoven', 'geometric', 'unique'],
    tags_hindi: ['इकत', 'कॉटन', 'डबल विव्ह', 'हातविण', 'भौमितिक'],
    sizes: ['Free Size'],
    colors: ['Navy Blue', 'White Pattern'],
    in_stock: true,
    image_url: '/products/ikat-cotton-double.jpg',
    merchant: MERCHANT,
  },
];
