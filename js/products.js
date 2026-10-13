/*
  Starter product catalogue
  -------------------------
  Replace these examples with the products you actually stock before launch.
  Keep each id unique and update the image path when you add product photos.
  To publish real customer feedback for everyone, add a reviews array to that
  product with name, rating (1–5), comment, and date. Never invent reviews.
*/

const PRODUCTS = [
  {
    id: 1,
    name: "Helmet LED – Dual Beam Smart Light | Premium 360° Visibility & Stylish Design for Night Riding",
    category: "Rider gear",
    price: 359,
    badge: "Night riding",
    image: "images/helmet-led-front.jpeg",
    alt: "Front view of a dual-beam helmet LED light beside a motorcycle at dusk",
    gallery: [
      {
        src: "images/helmet-led-front.jpeg",
        alt: "Front view of the dual-beam helmet LED light beside a motorcycle at dusk"
      },
      {
        src: "images/helmet-led-side.jpeg",
        alt: "Side view of the black helmet LED light and its clear front cover"
      },
      {
        src: "images/helmet-led-wiring.jpeg",
        alt: "Back view showing the helmet LED light wiring and connection leads"
      }
    ],
    shortDescription: "A dual-beam helmet LED light for a more visible night-riding setup.",
    description: "A dual-beam helmet LED light with a bold design for night riding. Ask us to confirm helmet compatibility, installation details, and what is included before ordering.",
    fitment: "Please confirm helmet compatibility, installation method, and included parts"
  },
  {
    id: 2,
    name: "H.J.G Premium LED Turn Signal Indicators – Stylish Motorcycle Blinker Lights Featuring Bright Illumination, Durable Construction, Modern Design, and Easy Installation.",
    category: "Electronics",
    price: 299,
    badge: "LED indicators",
    image: "images/hjg-turn-signal-front.jpg",
    alt: "Front product view of a pair of H.J.G LED motorcycle turn signal indicators",
    gallery: [
      {
        src: "images/hjg-turn-signal-front.jpg",
        alt: "Front product view of a pair of H.J.G LED motorcycle turn signal indicators"
      },
      {
        src: "images/hjg-turn-signal-details.jpg",
        alt: "H.J.G LED indicator lights with product feature details"
      },
      {
        src: "images/hjg-turn-signal-wiring.jpg",
        alt: "Close-up of the H.J.G motorcycle indicator pair and connecting wires"
      }
    ],
    shortDescription: "A pair of H.J.G LED turn signal indicators for motorcycles.",
    description: "Stylish motorcycle blinker lights featuring bright illumination, durable construction, a modern design, and easy installation. Please confirm wiring and fitment for your bike before ordering.",
    fitment: "Please confirm indicator wiring, mounting compatibility, and included parts"
  },
  {
    id: 3,
    name: "HJG 3-Lens LED Motorcycle Light – High-Power Triple Beam, Premium Design & Bright Road Visibility for Night Riding",
    category: "Electronics",
    price: 609,
    badge: "Triple beam",
    image: "images/hjg-3-lens-front.jpeg",
    alt: "Front view of an HJG motorcycle light with three illuminated lenses",
    gallery: [
      {
        src: "images/hjg-3-lens-front.jpeg",
        alt: "Front view showing all three lenses on the HJG motorcycle light"
      },
      {
        src: "images/hjg-3-lens-rear.jpeg",
        alt: "Rear view of the HJG light showing its casing and wiring"
      },
      {
        src: "images/hjg-3-lens-rear-angle.jpeg",
        alt: "Angled rear view of the HJG three-lens light and cable"
      },
      {
        src: "images/hjg-3-lens-brand.jpeg",
        alt: "Rear detail of the HJG light with its HJG-marked casing"
      }
    ],
    shortDescription: "A three-lens HJG motorcycle light with a triple-beam design for night rides.",
    description: "An HJG motorcycle light with three lenses and a high-power triple-beam design for night riding. Confirm installation requirements, wiring, and compatibility with your bike before ordering.",
    fitment: "Please confirm bike compatibility, installation requirements, and included parts"
  },
  {
    id: 10,
    name: "Premium LED Motorcycle Bike Turn Signal Indicator Light Set with Water-Resistant Housing, Bright Visibility, Durable Wiring, and Universal Mounting for Motorbikes, Scooters and Custom Builds",
    category: "Electronics",
    price: 289,
    badge: "LED indicator set",
    image: "images/turn-signal-indicator-front.jpg",
    alt: "Front view of a pair of premium LED motorcycle turn signal indicators with wiring",
    gallery: [
      {
        src: "images/turn-signal-indicator-front.jpg",
        alt: "Front view of two black LED motorcycle turn signal indicators and their wiring"
      },
      {
        src: "images/turn-signal-indicator-side.jpg",
        alt: "Side view of a black LED motorcycle indicator with its mounting stem and wire"
      },
      {
        src: "images/turn-signal-indicator-set.jpg",
        alt: "Back view of the LED indicator set showing both lights, wiring, and connectors"
      }
    ],
    shortDescription: "A bright LED turn signal set with water-resistant housing and durable wiring.",
    description: "A premium LED motorcycle bike turn signal indicator light set with water-resistant housing, bright visibility, durable wiring, and universal mounting for motorbikes, scooters, and custom builds. Please confirm mounting points and wiring compatibility for your vehicle before ordering.",
    fitment: "Confirm mounting points and wiring compatibility for your motorbike or scooter before ordering"
  },
  {
    id: 9,
    name: "CYT Lumina Pro — a premium LED projector headlight engineered for brighter illumination, focused visibility, durable performance, low power consumption, and safer rides every journey.",
    category: "Electronics",
    price: 640,
    badge: "LED projector",
    image: "images/cyt-lumina-pro-premium-light.jpg",
    alt: "CYT Lumina Pro premium LED projector headlight with red bezel and black cooling body",
    gallery: [
      {
        src: "images/cyt-lumina-pro-premium-light.jpg",
        alt: "CYT Lumina Pro LED projector headlight shown from the side with its red bezel and cooling fins"
      },
      {
        src: "images/cyt-lumina-pro-red-ring-light.jpg",
        alt: "Close view of the CYT Lumina Pro red-ring projector lens and electrical connectors"
      },
      {
        src: "images/cyt-lumina-pro-smarter-safer-ride.jpg",
        alt: "CYT Lumina Pro projector headlight product image highlighting focused light and durable build"
      },
      {
        src: "images/cyt-lumina-pro-cooling-fan.jpg",
        alt: "Rear cooling fan detail for the CYT Lumina Pro LED headlight"
      }
    ],
    shortDescription: "A premium LED projector headlight for brighter illumination, focused visibility, and low power consumption.",
    description: "CYT Lumina Pro is a premium LED projector headlight engineered for brighter illumination, focused visibility, durable performance, low power consumption, and safer rides every journey. Please confirm your bike’s bulb fitment and installation requirements before ordering.",
    fitment: "Please confirm bulb fitment and installation compatibility for your bike"
  },
  {
    id: 4,
    name: "Original G15 Premium LED Projector Auxiliary Light – Powerful Focused Beam, Sleek Compact Design, Durable Metal Housing, and Easy Installation for Enhanced Motorcycle Visibility.",
    category: "Electronics",
    price: 479,
    badge: "Focused beam",
    image: "images/original-g15-auxiliary-light-front.jpg",
    alt: "Front view of a G15 LED projector auxiliary light with a compact metal housing",
    gallery: [
      {
        src: "images/original-g15-auxiliary-light-front.jpg",
        alt: "Front view of a G15 LED projector auxiliary light with a focused projector lens"
      },
      {
        src: "images/original-g15-auxiliary-light-angle.jpg",
        alt: "Angled view of a compact LED auxiliary light with its mounting bracket and wiring"
      },
      {
        src: "images/original-g15-auxiliary-light-rectifier.jpg",
        alt: "Additional supplied image showing a motorcycle rectifier"
      }
    ],
    shortDescription: "A compact G15 LED projector auxiliary light with a focused beam and metal housing.",
    description: "A G15 LED projector auxiliary light featuring a focused beam, compact design, durable metal housing, and easy installation. Please confirm bike compatibility, wiring, mounting, and included parts before ordering.",
    fitment: "Please confirm bike compatibility, wiring, mounting, and included parts before ordering"
  },
  {
    id: 5,
    name: "H.J.G Premium LED Headlight Bulbs – Ultra-Bright Illumination, Advanced Cooling, Durable Design, Water and Dust Resistance, Easy Installation, and 12-Month Warranty.",
    category: "Electronics",
    price: 659,
    badge: "12-month warranty",
    image: "images/hjg-led-headlight-bulbs-front.jpg",
    alt: "Pair of H.J.G LED motorcycle headlight bulbs with cooling fins and wiring harness",
    gallery: [
      {
        src: "images/hjg-led-headlight-bulbs-front.jpg",
        alt: "Pair of H.J.G LED headlight bulbs shown with cooling fins and wiring harness"
      },
      {
        src: "images/hjg-led-headlight-bulbs-handheld.jpg",
        alt: "H.J.G LED headlight bulb and cooling assembly shown in hand"
      },
      {
        src: "images/hjg-led-headlight-driver-detail.jpg",
        alt: "Close view of the H.J.G LED headlight driver and cable assembly"
      }
    ],
    shortDescription: "H.J.G LED headlight bulbs with advanced cooling and a stated 12-month warranty.",
    description: "Ultra-bright LED headlight bulbs featuring advanced cooling, durable design, water and dust resistance, and easy installation. The product listing states a 12-month warranty; please confirm bulb fitment and warranty terms before ordering.",
    fitment: "Please confirm bulb type, bike compatibility, installation, and warranty terms before ordering"
  },
];

function findProduct(id) {
  return PRODUCTS.find((product) => product.id === Number(id));
}
