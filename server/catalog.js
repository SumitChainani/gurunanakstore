"use strict";

// Railway runs this service with /server as its root, so keep the backend
// catalogue inside the service directory and sync it with ../js/products.js.
// The server uses these trusted entries for order totals and AI product facts.
module.exports = Object.freeze({
  1: Object.freeze({
    id: 1,
    name: "Helmet LED – Dual Beam Smart Light | Premium 360° Visibility & Stylish Design for Night Riding",
    price: 359,
    category: "Rider gear",
    shortDescription: "A dual-beam helmet LED light for a more visible night-riding setup.",
    description: "A dual-beam helmet LED light with a bold design for night riding. Ask us to confirm helmet compatibility, installation details, and what is included before ordering.",
    fitment: "Please confirm helmet compatibility, installation method, and included parts",
    image: "images/helmet-led-front.jpeg"
  }),
  2: Object.freeze({
    id: 2,
    name: "H.J.G Premium LED Turn Signal Indicators – Stylish Motorcycle Blinker Lights Featuring Bright Illumination, Durable Construction, Modern Design, and Easy Installation.",
    price: 299,
    category: "Electronics",
    shortDescription: "A pair of H.J.G LED turn signal indicators for motorcycles.",
    description: "Stylish motorcycle blinker lights featuring bright illumination, durable construction, a modern design, and easy installation. Please confirm wiring and fitment for your bike before ordering.",
    fitment: "Please confirm indicator wiring, mounting compatibility, and included parts",
    image: "images/hjg-turn-signal-front.jpg"
  }),
  3: Object.freeze({
    id: 3,
    name: "HJG 3-Lens LED Motorcycle Light – High-Power Triple Beam, Premium Design & Bright Road Visibility for Night Riding",
    price: 609,
    category: "Electronics",
    shortDescription: "A three-lens HJG motorcycle light with a triple-beam design for night rides.",
    description: "An HJG motorcycle light with three lenses and a high-power triple-beam design for night riding. Confirm installation requirements, wiring, and compatibility with your bike before ordering.",
    fitment: "Please confirm bike compatibility, installation requirements, and included parts",
    image: "images/hjg-3-lens-front.jpeg"
  }),
  4: Object.freeze({
    id: 4,
    name: "Original G15 Premium LED Projector Auxiliary Light – Powerful Focused Beam, Sleek Compact Design, Durable Metal Housing, and Easy Installation for Enhanced Motorcycle Visibility.",
    price: 479,
    category: "Electronics",
    shortDescription: "A compact G15 LED projector auxiliary light with a focused beam and metal housing.",
    description: "A G15 LED projector auxiliary light featuring a focused beam, compact design, durable metal housing, and easy installation. Please confirm bike compatibility, wiring, mounting, and included parts before ordering.",
    fitment: "Please confirm bike compatibility, wiring, mounting, and included parts before ordering",
    image: "images/original-g15-auxiliary-light-front.jpg"
  }),
  5: Object.freeze({
    id: 5,
    name: "H.J.G Premium LED Headlight Bulbs – Ultra-Bright Illumination, Advanced Cooling, Durable Design, Water and Dust Resistance, Easy Installation, and 12-Month Warranty.",
    price: 659,
    category: "Electronics",
    shortDescription: "H.J.G LED headlight bulbs with advanced cooling and a stated 12-month warranty.",
    description: "Ultra-bright LED headlight bulbs featuring advanced cooling, durable design, water and dust resistance, and easy installation. The product listing states a 12-month warranty; please confirm bulb fitment and warranty terms before ordering.",
    fitment: "Please confirm bulb type, bike compatibility, installation, and warranty terms before ordering",
    image: "images/hjg-led-headlight-bulbs-front.jpg"
  }),
  9: Object.freeze({
    id: 9,
    name: "CYT Lumina Pro — a premium LED projector headlight engineered for brighter illumination, focused visibility, durable performance, low power consumption, and safer rides every journey.",
    price: 640,
    category: "Electronics",
    shortDescription: "A premium LED projector headlight for brighter illumination, focused visibility, and low power consumption.",
    description: "CYT Lumina Pro is a premium LED projector headlight engineered for brighter illumination, focused visibility, durable performance, low power consumption, and safer rides every journey. Please confirm your bike’s bulb fitment and installation requirements before ordering.",
    fitment: "Please confirm bulb fitment and installation compatibility for your bike",
    image: "images/cyt-lumina-pro-premium-light.jpg"
  }),
  10: Object.freeze({
    id: 10,
    name: "Premium LED Motorcycle Bike Turn Signal Indicator Light Set with Water-Resistant Housing, Bright Visibility, Durable Wiring, and Universal Mounting for Motorbikes, Scooters and Custom Builds",
    price: 289,
    category: "Electronics",
    shortDescription: "A bright LED turn signal set with water-resistant housing and durable wiring.",
    description: "A premium LED motorcycle bike turn signal indicator light set with water-resistant housing, bright visibility, durable wiring, and universal mounting for motorbikes, scooters, and custom builds. Please confirm mounting points and wiring compatibility for your vehicle before ordering.",
    fitment: "Confirm mounting points and wiring compatibility for your motorbike or scooter before ordering",
    image: "images/turn-signal-indicator-front.jpg"
  })
});
