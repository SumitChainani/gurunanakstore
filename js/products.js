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
    name: "Helmet LED – Dual Beam Smart Light | Premium 360° Visibility & Stylish Design for Night Riding | 1-Month Warranty",
    category: "Rider gear",
    price: 329,
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
    shortDescription: "A dual-beam helmet LED light for a more visible night-riding setup. Includes a 1-month warranty.",
    description: "A dual-beam helmet LED light with a bold design for night riding. Ask us to confirm helmet compatibility, installation details, and what is included before ordering. Includes a 1-month warranty.",
    fitment: "Please confirm helmet compatibility, installation method, and included parts"
  },
  {
    id: 2,
    name: "H.J.G Premium LED Turn Signal Indicators – Stylish Motorcycle Blinker Lights Featuring Bright Illumination, Durable Construction, Modern Design, and Easy Installation | 1-Month Warranty",
    category: "Electronics",
    price: 269,
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
    shortDescription: "A pair of H.J.G LED turn signal indicators for motorcycles. Includes a 1-month warranty.",
    description: "Stylish motorcycle blinker lights featuring bright illumination, durable construction, a modern design, and easy installation. Please confirm wiring and fitment for your bike before ordering. Includes a 1-month warranty.",
    fitment: "Please confirm indicator wiring, mounting compatibility, and included parts"
  },
  {
    id: 3,
    name: "HJG 3-Lens LED Motorcycle Light – High-Power Triple Beam, Premium Design & Bright Road Visibility for Night Riding | 1-Month Warranty",
    category: "Electronics",
    price: 579,
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
    shortDescription: "A three-lens HJG motorcycle light with a triple-beam design for night rides. Includes a 1-month warranty.",
    description: "An HJG motorcycle light with three lenses and a high-power triple-beam design for night riding. Confirm installation requirements, wiring, and compatibility with your bike before ordering. Includes a 1-month warranty.",
    fitment: "Please confirm bike compatibility, installation requirements, and included parts"
  },
  {
    id: 10,
    name: "Premium LED Motorcycle Bike Turn Signal Indicator Light Set with Water-Resistant Housing, Bright Visibility, Durable Wiring, and Universal Mounting for Motorbikes, Scooters and Custom Builds | 1-Month Warranty",
    category: "Electronics",
    price: 259,
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
    shortDescription: "A bright LED turn signal set with water-resistant housing and durable wiring. Includes a 1-month warranty.",
    description: "A premium LED motorcycle bike turn signal indicator light set with water-resistant housing, bright visibility, durable wiring, and universal mounting for motorbikes, scooters, and custom builds. Please confirm mounting points and wiring compatibility for your vehicle before ordering. Includes a 1-month warranty.",
    fitment: "Confirm mounting points and wiring compatibility for your motorbike or scooter before ordering"
  },
  {
    id: 9,
    name: "CYT Lumina Pro — a premium LED projector headlight engineered for brighter illumination, focused visibility, durable performance, low power consumption, and safer rides every journey | 1-Month Warranty",
    category: "Electronics",
    price: 610,
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
    shortDescription: "A premium LED projector headlight for brighter illumination, focused visibility, and low power consumption. Includes a 1-month warranty.",
    description: "CYT Lumina Pro is a premium LED projector headlight engineered for brighter illumination, focused visibility, durable performance, low power consumption, and safer rides every journey. Please confirm your bike’s bulb fitment and installation requirements before ordering. Includes a 1-month warranty.",
    fitment: "Please confirm bulb fitment and installation compatibility for your bike"
  },
  {
    id: 4,
    name: "Original G15 Premium LED Projector Auxiliary Light – Powerful Focused Beam, Sleek Compact Design, Durable Metal Housing, and Easy Installation for Enhanced Motorcycle Visibility | 1-Month Warranty",
    category: "Electronics",
    price: 449,
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
    shortDescription: "A compact G15 LED projector auxiliary light with a focused beam and metal housing. Includes a 1-month warranty.",
    description: "A G15 LED projector auxiliary light featuring a focused beam, compact design, durable metal housing, and easy installation. Please confirm bike compatibility, wiring, mounting, and included parts before ordering. Includes a 1-month warranty.",
    fitment: "Please confirm bike compatibility, wiring, mounting, and included parts before ordering"
  },
  {
    id: 5,
    name: "H.J.G Premium LED Headlight Bulbs – Ultra-Bright Illumination, Advanced Cooling, Durable Design, Water and Dust Resistance, Easy Installation, and 12-Month Warranty.",
    category: "Electronics",
    price: 629,
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
  {
    id: 11,
    name: "H.J.G Premium LED Fog Light Indicator with Halo Ring Design, High-Visibility Illumination, Durable Housing, Stylish Finish, and Reliable Performance for Modern Vehicles | 1-Month Warranty",
    category: "Electronics",
    price: 349,
    badge: "Halo ring",
    image: "images/hjg-led-fog-light-halo-front.png",
    alt: "Pair of LED fog lights with bright halo rings",
    gallery: [
      {
        src: "images/hjg-led-fog-light-halo-front.png",
        alt: "Front view of a pair of LED fog lights with halo rings"
      },
      {
        src: "images/hjg-led-fog-light-halo-all-bikes.png",
        alt: "LED indicator light poster showing the product and vehicle applications"
      },
      {
        src: "images/hjg-led-fog-light-halo-poster.png",
        alt: "H.J.G LED indicator light poster with bright amber illumination"
      }
    ],
    shortDescription: "H.J.G LED fog lights with a distinctive halo-ring design and high-visibility illumination. Includes a 1-month warranty.",
    description: "H.J.G LED fog lights with a halo-ring design, high-visibility illumination, durable housing, and a stylish finish. Please confirm vehicle compatibility, wiring, mounting, and included parts before ordering. Includes a 1-month warranty.",
    fitment: "Please confirm vehicle compatibility, wiring, mounting, and included parts before ordering"
  },
  {
    id: 12,
    name: "H.J.G Premium Multicolor LED Motorcycle Indicator Light with Amber LED Segments, Vibrant Center Illumination, Sleek Oval Design, Modern Styling, and 1-Month Warranty.",
    category: "Electronics",
    price: 349,
    badge: "Multicolor LED",
    image: "images/hjg-multicolor-led-indicator-front.webp",
    alt: "H.J.G oval multicolor LED motorcycle indicator with amber segments and a bright center",
    gallery: [
      {
        src: "images/hjg-multicolor-led-indicator-front.webp",
        alt: "H.J.G multicolor motorcycle indicator with amber LED segments and vibrant center illumination"
      },
      {
        src: "images/hjg-multicolor-led-indicator-size.webp",
        alt: "Pair of oval motorcycle indicators shown with size markings"
      },
      {
        src: "images/hjg-multicolor-led-indicator-engineered.webp",
        alt: "Pair of H.J.G LED motorcycle indicators shown from the rear with wiring"
      },
      {
        src: "images/hjg-multicolor-led-indicator-light.webp",
        alt: "Angled view of the H.J.G oval indicator with amber and multicolor illumination"
      }
    ],
    shortDescription: "An H.J.G oval motorcycle indicator with amber LED segments, vibrant center illumination, and a 1-month warranty.",
    description: "An H.J.G multicolor LED motorcycle indicator with amber LED segments, vibrant center illumination, a sleek oval design, and modern styling. Please confirm mounting, wiring compatibility, and included parts before ordering. Includes a 1-month warranty.",
    fitment: "Please confirm mounting, wiring compatibility, and included parts before ordering"
  },
  {
    id: 13,
    name: "H.J.G Premium Red Lens LED Auxiliary Light for Bikes & Cars, Compact Design, Bright Illumination, Durable Build, and 1-Month Warranty.",
    category: "Electronics",
    price: 429,
    badge: "Red lens LED",
    image: "images/hjg-red-lens-auxiliary-light-front.webp",
    alt: "Compact H.J.G red-lens LED auxiliary light for bikes and cars",
    gallery: [
      {
        src: "images/hjg-red-lens-auxiliary-light-front.webp",
        alt: "Compact H.J.G LED auxiliary light with a red lens and wiring"
      },
      {
        src: "images/hjg-red-lens-auxiliary-light-beam.webp",
        alt: "LED auxiliary light shown with a focused optical beam"
      },
      {
        src: "images/hjg-red-lens-auxiliary-light-cooler.webp",
        alt: "H.J.G LED headlight cooler product image"
      },
      {
        src: "images/hjg-red-lens-auxiliary-light-modes.webp",
        alt: "Light mode guide showing multiple beam colors and modes"
      }
    ],
    shortDescription: "A compact red-lens H.J.G auxiliary light for bikes and cars with a 1-month warranty.",
    description: "A compact H.J.G red-lens LED auxiliary light for bikes and cars, featuring bright illumination and a durable build. Please confirm vehicle compatibility, wiring, mounting, and included parts before ordering. Includes a 1-month warranty.",
    fitment: "Please confirm vehicle compatibility, wiring, mounting, and included parts before ordering"
  },
];

function findProduct(id) {
  return PRODUCTS.find((product) => product.id === Number(id));
}
