// Reuse the storefront's product data so checkout totals and AI product facts
// always come from the same catalogue.
const { PRODUCTS } = require("../js/products");

const catalog = Object.create(null);
for (const product of PRODUCTS) {
  catalog[product.id] = Object.freeze({
    id: product.id,
    name: product.name,
    price: product.price,
    category: product.category,
    shortDescription: product.shortDescription || "",
    description: product.description || "",
    fitment: product.fitment || "",
    image: product.image || ""
  });
}

module.exports = Object.freeze(catalog);
