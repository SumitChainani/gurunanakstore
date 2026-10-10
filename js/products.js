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
    price: 899,
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
    name: "Handlebar Phone Mount",
    category: "Electronics",
    price: 799,
    badge: "Useful upgrade",
    image: "images/phone-mount.svg",
    alt: "Illustration of a phone held in a motorcycle handlebar mount",
    shortDescription: "Keep your phone visible while parked or on a route.",
    description: "A handlebar-mounted phone holder for riders who want a visible screen position. Check your handlebar measurements and mounting details with us before ordering.",
    fitment: "Please confirm handlebar compatibility"
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
    name: "Compact Handlebar Pouch",
    category: "Travel",
    price: 1199,
    badge: "Road companion",
    image: "images/handlebar-bag.svg",
    alt: "Illustration of a compact motorcycle handlebar travel pouch",
    shortDescription: "A handy pouch for small ride essentials.",
    description: "A compact storage pouch for small items you want close at hand. Check dimensions and mounting details with us before ordering.",
    fitment: "Please confirm mounting compatibility"
  },
  {
    id: 5,
    name: "USB Bike Charger",
    category: "Electronics",
    price: 699,
    badge: "Useful upgrade",
    image: "images/usb-charger.svg",
    alt: "Illustration of a compact USB charger for a motorcycle",
    shortDescription: "A simple way to keep a device charged on the go.",
    description: "A compact USB charging accessory for motorcycle use. Check the connector, installation needs, and compatibility with us before ordering.",
    fitment: "Please confirm installation compatibility"
  },
  {
    id: 6,
    name: "Disc Brake Lock",
    category: "Security",
    price: 1099,
    badge: "Lock it up",
    image: "images/disc-lock.svg",
    alt: "Illustration of a compact disc brake lock for a motorcycle",
    shortDescription: "A compact lock to add to your parking routine.",
    description: "A compact disc lock for an added layer in your parking routine. Check the lock dimensions against your bike before ordering.",
    fitment: "Please confirm disc compatibility"
  },
  {
    id: 7,
    name: "Reflective Rider Vest",
    category: "Rider gear",
    price: 549,
    badge: "Visibility",
    image: "images/reflective-vest.svg",
    alt: "Illustration of a high-visibility reflective rider vest",
    shortDescription: "A reflective layer for added visibility on rides.",
    description: "A high-visibility reflective vest for riders. Ask us about available sizes and material details before ordering.",
    fitment: "Please confirm available sizes before ordering"
  },
  {
    id: 8,
    name: "Portable Tyre Inflator",
    category: "Travel",
    price: 1999,
    badge: "Ride prepared",
    image: "images/tyre-inflator.svg",
    alt: "Illustration of a portable tyre inflator beside a motorcycle wheel",
    shortDescription: "A compact air inflator to keep in your ride kit.",
    description: "A portable inflator for a rider’s kit. Check the actual power connection and operating details with us before ordering.",
    fitment: "Please confirm power connection and compatibility"
  }
];

function findProduct(id) {
  return PRODUCTS.find((product) => product.id === Number(id));
}
