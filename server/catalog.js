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
    name: "Handlebar Phone Mount",
    price: 799,
    category: "Electronics",
    shortDescription: "Keep your phone visible while parked or on a route.",
    description: "A handlebar-mounted phone holder for riders who want a visible screen position. Check your handlebar measurements and mounting details with us before ordering.",
    fitment: "Please confirm handlebar compatibility",
    image: "images/phone-mount.svg"
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
    name: "Compact Handlebar Pouch",
    price: 1199,
    category: "Travel",
    shortDescription: "A handy pouch for small ride essentials.",
    description: "A compact storage pouch for small items you want close at hand. Check dimensions and mounting details with us before ordering.",
    fitment: "Please confirm mounting compatibility",
    image: "images/handlebar-bag.svg"
  }),
  5: Object.freeze({
    id: 5,
    name: "USB Bike Charger",
    price: 699,
    category: "Electronics",
    shortDescription: "A simple way to keep a device charged on the go.",
    description: "A compact USB charging accessory for motorcycle use. Check the connector, installation needs, and compatibility with us before ordering.",
    fitment: "Please confirm installation compatibility",
    image: "images/usb-charger.svg"
  }),
  6: Object.freeze({
    id: 6,
    name: "Disc Brake Lock",
    price: 1099,
    category: "Security",
    shortDescription: "A compact lock to add to your parking routine.",
    description: "A compact disc lock for an added layer in your parking routine. Check the lock dimensions against your bike before ordering.",
    fitment: "Please confirm disc compatibility",
    image: "images/disc-lock.svg"
  }),
  7: Object.freeze({
    id: 7,
    name: "Reflective Rider Vest",
    price: 549,
    category: "Rider gear",
    shortDescription: "A reflective layer for added visibility on rides.",
    description: "A high-visibility reflective vest for riders. Ask us about available sizes and material details before ordering.",
    fitment: "Please confirm available sizes before ordering",
    image: "images/reflective-vest.svg"
  }),
  8: Object.freeze({
    id: 8,
    name: "Portable Tyre Inflator",
    price: 1999,
    category: "Travel",
    shortDescription: "A compact air inflator to keep in your ride kit.",
    description: "A portable inflator for a rider’s kit. Check the actual power connection and operating details with us before ordering.",
    fitment: "Please confirm power connection and compatibility",
    image: "images/tyre-inflator.svg"
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
