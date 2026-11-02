/* =========================================================
   NOVALINK - GENERAL JAVASCRIPT
   Theme memory, product filters and shopping cart
   ========================================================= */

"use strict";


/* =========================================================
   1. STORAGE HELPERS
   ========================================================= */

const NovaLink = {
    themeKey: "novalink-theme",
    cartKey: "novalink-cart",

    getSavedValue(key, fallback) {
        try {
            const value = localStorage.getItem(key);
            return value === null ? fallback : value;
        } catch (error) {
            console.warn("Could not read saved data:", error);
            return fallback;
        }
    },

    saveValue(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (error) {
            console.warn("Could not save data:", error);
        }
    }
};


/* =========================================================
   2. DAY / NIGHT THEME
   Checked checkbox = Day Mode
   Unchecked checkbox = Night Mode
   ========================================================= */

function initialiseTheme() {
    const toggle = document.getElementById("night-mode");

    // Pages without a theme switch can still load the script.
    if (!toggle) return;

    const savedTheme = NovaLink.getSavedValue(
        NovaLink.themeKey,
        ""
    );

    let theme;

    if (savedTheme === "light" || savedTheme === "dark") {
        theme = savedTheme;
    } else {
        // Use the visitor's device preference on first visit.
        theme = window.matchMedia(
            "(prefers-color-scheme: dark)"
        ).matches ? "dark" : "light";
    }

    function applyTheme(selectedTheme) {
        const isLight = selectedTheme === "light";

        toggle.checked = isLight;

        document.documentElement.dataset.theme = selectedTheme;

        NovaLink.saveValue(
            NovaLink.themeKey,
            selectedTheme
        );
    }

    // Restore the saved theme.
    applyTheme(theme);

    // Save changes when the switch is used.
    toggle.addEventListener("change", function () {
        applyTheme(this.checked ? "light" : "dark");
    });
}


/* =========================================================
   3. SHOPPING CART STORAGE
   ========================================================= */

function loadCart() {
    try {
        const saved = JSON.parse(
            NovaLink.getSavedValue(NovaLink.cartKey, "{}")
        );

        if (
            !saved ||
            typeof saved !== "object" ||
            Array.isArray(saved)
        ) {
            return {};
        }

        // Accept only valid cart entries.
        const cart = {};

        for (const [id, item] of Object.entries(saved)) {
            if (
                item &&
                typeof item.name === "string" &&
                Number.isFinite(item.price) &&
                item.price >= 0 &&
                Number.isInteger(item.quantity) &&
                item.quantity > 0
            ) {
                cart[id] = {
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity
                };
            }
        }

        return cart;

    } catch (error) {
        console.warn("Could not load shopping cart:", error);
        return {};
    }
}


let cart = loadCart();


function saveCart() {
    NovaLink.saveValue(
        NovaLink.cartKey,
        JSON.stringify(cart)
    );
}


/* =========================================================
   4. DELIVERY SETTINGS
   Edit these amounts to suit NovaLink.
   All amounts are in South African rand.
   ========================================================= */

const DELIVERY_FEE = 150;
const FREE_DELIVERY_LIMIT = 20000;


/* =========================================================
   5. ADD PRODUCTS TO THE CART
   Product information is read from your existing HTML.
   ========================================================= */

function initialiseProducts() {
    const productCells = document.querySelectorAll(
        ".product-section td"
    );

    productCells.forEach(function (cell) {
        const nameElement = cell.querySelector("b");
        const priceElement = cell.querySelector("h3");

        if (!nameElement || !priceElement) return;

        const name = nameElement.textContent.trim();

        // Read the price from the product card.
        const match = priceElement.textContent.match(
            /[\d,]+(?:\.\d{1,2})?/
        );

        if (!match) return;

        const price = Number(match[0].replace(/,/g, ""));

        if (!Number.isFinite(price)) return;

        const id = name.toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");

        // Avoid creating duplicate buttons.
        if (cell.querySelector(".add-to-cart")) return;

        const button = document.createElement("button");
        button.type = "button";
        button.className = "add-to-cart";
        button.textContent = "🛒 Add to Cart";

        button.addEventListener("click", function () {
            addToCart(id, name, price);
        });

        priceElement.insertAdjacentElement("afterend", button);
    });
}


function addToCart(id, name, price) {
    if (cart[id]) {
        cart[id].quantity += 1;
    } else {
        cart[id] = {
            name: name,
            price: price,
            quantity: 1
        };
    }

    saveCart();
    updateCartCount();

    // Confirm the product was added.
    alert(name + " has been added to your cart!");
}
/* =========================================================
   6. CART TOTALS
   ========================================================= */

function calculateCart() {
    let itemCount = 0;
    let subtotal = 0;

    Object.values(cart).forEach(function (item) {
        itemCount += item.quantity;
        subtotal += item.price * item.quantity;
    });

    const delivery = subtotal === 0
        ? 0
        : subtotal >= FREE_DELIVERY_LIMIT
            ? 0
            : DELIVERY_FEE;

    return {
        itemCount: itemCount,
        subtotal: subtotal,
        delivery: delivery,
        total: subtotal + delivery
    };
}


function formatRand(amount) {
    return "R " + amount.toLocaleString("en-ZA", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}


/* =========================================================
   7. CART ITEM COUNT
   ========================================================= */

function updateCartCount() {
    const totals = calculateCart();

    // Update existing cart links, if present.
    document.querySelectorAll(
        'a[href*="Enquiry.html"], a[href*="Cart.html"]'
    ).forEach(function (link) {
        const originalLabel = link.dataset.originalLabel
            || link.textContent.trim();

        link.dataset.originalLabel = originalLabel;

        // Avoid repeatedly adding the quantity.
        link.textContent = originalLabel.replace(
            /\s*\(\d+\)$/,
            ""
        );

        if (totals.itemCount > 0) {
            link.textContent += " (" + totals.itemCount + ")";
        }
    });
}


/* =========================================================
   8. CHANGE QUANTITY OR REMOVE PRODUCTS
   ========================================================= */

function changeQuantity(id, amount) {
    if (!cart[id]) return;

    cart[id].quantity += amount;

    if (cart[id].quantity <= 0) {
        delete cart[id];
    }

    saveCart();
    updateCartCount();
    renderCart();
}


function removeFromCart(id) {
    delete cart[id];

    saveCart();
    updateCartCount();
    renderCart();
}


function clearCart() {
    cart = {};

    saveCart();
    updateCartCount();
    renderCart();
}


/* =========================================================
   9. DISPLAY THE CART PAGE
   Uses the existing .cart-container in your Cart HTML.
   ========================================================= */

function renderCart() {
    const container = document.querySelector(".cart-container");

    // Product pages do not have a cart container.
    if (!container) return;

    const totals = calculateCart();

    container.replaceChildren();

    const heading = document.createElement("h2");
    heading.textContent = totals.itemCount === 0
        ? "Your Shopping Cart is Empty"
        : "Your Shopping Cart";

    container.appendChild(heading);

    if (totals.itemCount === 0) {
        const message = document.createElement("p");
        message.textContent =
            "Browse our products and add something to your cart.";

        container.appendChild(message);

        const shopLink = document.createElement("a");
        shopLink.href = "Products.html";
        shopLink.className = "shop-button";
        shopLink.textContent = "Back to Shopping";

        container.appendChild(shopLink);

        return;
    }

    const table = document.createElement("table");
    table.className = "shopping-cart-table";

    const header = document.createElement("tr");

    ["Product", "Price", "Quantity", "Subtotal", "Action"]
        .forEach(function (label) {
            const th = document.createElement("th");
            th.textContent = label;
            header.appendChild(th);
        });

    table.appendChild(header);

    Object.entries(cart).forEach(function ([id, item]) {
        const row = document.createElement("tr");

        const productName = document.createElement("td");
        productName.textContent = item.name;

        const price = document.createElement("td");
        price.textContent = formatRand(item.price);

        const quantityCell = document.createElement("td");

        const decrease = document.createElement("button");
        decrease.type = "button";
        decrease.textContent = "−";
        decrease.setAttribute(
            "aria-label",
            "Decrease " + item.name + " quantity"
        );
        decrease.addEventListener("click", function () {
            changeQuantity(id, -1);
        });

        const quantity = document.createElement("span");
        quantity.textContent = " " + item.quantity + " ";

        const increase = document.createElement("button");
        increase.type = "button";
        increase.textContent = "+";
        increase.setAttribute(
            "aria-label",
            "Increase " + item.name + " quantity"
        );
        increase.addEventListener("click", function () {
            changeQuantity(id, 1);
        });

        quantityCell.append(decrease, quantity, increase);

        const lineTotal = document.createElement("td");
        lineTotal.textContent = formatRand(
            item.price * item.quantity
        );

        const actionCell = document.createElement("td");

        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "Remove";
        remove.addEventListener("click", function () {
            removeFromCart(id);
        });

        actionCell.appendChild(remove);

        row.append(
            productName,
            price,
            quantityCell,
            lineTotal,
            actionCell
        );

        table.appendChild(row);
    });

    container.appendChild(table);

    const summary = document.createElement("div");
    summary.className = "cart-summary";

    function addSummaryLine(label, amount, bold = false) {
        const line = document.createElement("p");
        const labelElement = document.createElement(
            bold ? "strong" : "span"
        );
        const amountElement = document.createElement(
            bold ? "strong" : "span"
        );

        labelElement.textContent = label;
        amountElement.textContent = formatRand(amount);

        line.append(labelElement, document.createTextNode(" "));
        line.appendChild(amountElement);

        summary.appendChild(line);
    }

    addSummaryLine("Items:", totals.itemCount);
    addSummaryLine("Subtotal:", totals.subtotal);
    addSummaryLine("Delivery fee:", totals.delivery);
    addSummaryLine("Total:", totals.total, true);

    if (
        totals.subtotal > 0 &&
        totals.subtotal < FREE_DELIVERY_LIMIT
    ) {
        const remaining = document.createElement("p");
        remaining.textContent =
            "Spend " +
            formatRand(FREE_DELIVERY_LIMIT - totals.subtotal) +
            " more to qualify for free delivery.";

        summary.appendChild(remaining);
    } else if (totals.subtotal >= FREE_DELIVERY_LIMIT) {
        const free = document.createElement("p");
        free.textContent = "Your order qualifies for free delivery!";
        summary.appendChild(free);
    }

    container.appendChild(summary);

    const clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.textContent = "Clear Cart";
    clearButton.addEventListener("click", clearCart);

    container.appendChild(clearButton);

    const continueShopping = document.createElement("a");
    continueShopping.href = "Products.html";
    continueShopping.className = "shop-button";
    continueShopping.textContent = "Continue Shopping";

    container.appendChild(continueShopping);
}


/* =========================================================
   10. PRODUCT CATEGORY FILTERS
   Your CSS already handles hiding the categories.
   This ensures All Products resets the filter.
   ========================================================= */

function initialiseFilters() {
    const filters = document.querySelectorAll(
        '.filter-buttons input[name="filter"]'
    );

    filters.forEach(function (filter) {
        filter.addEventListener("change", function () {
            if (this.id === "all") {
                document.querySelectorAll(
                    ".product-section"
                ).forEach(function (section) {
                    section.style.display = "";
                });
            }
        });
    });
}


/* =========================================================
   11. START NOVALINK FEATURES
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {
    initialiseTheme();
    initialiseProducts();
    initialiseFilters();
    updateCartCount();
    renderCart();
});
