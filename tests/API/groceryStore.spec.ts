import { test, expect } from '@playwright/test';

const API_BASE = 'https://simple-grocery-store-api.click';

/**
 * Simple Grocery Store API Test Suite
 * Runs serially — each group builds on state from previous tests
 * (productId → cart flow → auth + order flow)
 */
test.describe.serial('Simple Grocery Store API', () => {

  // Shared state across tests
  let productId : number;
  let cartId    : string;
  let itemId    : number;
  let accessToken: string;
  let orderId   : string;

  // ── Group 1: Status & Products ─────────────────────────────────────────────

  test('TC01 - Verify API is up and running @smoke @sanity @api @regression', async ({ request }) => {
    const res  = await request.get(`${API_BASE}/status`);
    const body = await res.json();

    expect(res.status()).toBe(200);
    expect(body.status).toBe('UP');
  });

  test('TC02 - Verify get all products returns a list with required fields @smoke @api @regression', async ({ request }) => {
    const res      = await request.get(`${API_BASE}/products`);
    const products = await res.json();

    expect(res.status()).toBe(200);
    expect(Array.isArray(products)).toBe(true);
    expect(products.length).toBeGreaterThan(0);

    const first = products[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('name');
    expect(first).toHaveProperty('category');
    expect(first).toHaveProperty('inStock');

    // pick an in-stock product for later tests
    productId = products.find((p: { inStock: boolean }) => p.inStock)?.id ?? first.id;
  });

  test('TC03 - Verify products can be filtered by category @smoke @api @regression', async ({ request }) => {
    const res      = await request.get(`${API_BASE}/products?category=coffee`);
    const products = await res.json();

    expect(res.status()).toBe(200);
    expect(Array.isArray(products)).toBe(true);
    expect(products.length).toBeGreaterThan(0);

    for (const product of products) {
      expect(product.category).toBe('coffee');
    }
  });

  test('TC04 - Verify products can be filtered by availability @smoke @api @regression', async ({ request }) => {
    const res      = await request.get(`${API_BASE}/products?available=true`);
    const products = await res.json();

    expect(res.status()).toBe(200);
    expect(Array.isArray(products)).toBe(true);

    for (const product of products) {
      expect(product.inStock).toBe(true);
    }
  });

  test('TC05 - Verify results count can be limited to 5 @smoke @api @regression', async ({ request }) => {
    const res      = await request.get(`${API_BASE}/products?results=5`);
    const products = await res.json();

    expect(res.status()).toBe(200);
    expect(products.length).toBe(5);
  });

  // ── Group 2: Single Product ────────────────────────────────────────────────

  test('TC06 - Verify a single product can be retrieved by valid ID @smoke @api @regression', async ({ request }) => {
    const res     = await request.get(`${API_BASE}/products/${productId}`);
    const product = await res.json();

    expect(res.status()).toBe(200);
    expect(product.id).toBe(productId);
    expect(product).toHaveProperty('name');
    expect(product).toHaveProperty('category');
    expect(product).toHaveProperty('inStock');
    expect(product).toHaveProperty('price');
  });

  test('TC07 - Verify invalid product ID returns 404 @smoke @api @regression', async ({ request }) => {
    const res = await request.get(`${API_BASE}/products/99999999`);
    expect(res.status()).toBe(404);
  });

  // ── Group 3: Cart Flow ─────────────────────────────────────────────────────

  test('TC08 - Verify a new cart can be created @smoke @api @regression', async ({ request }) => {
    const res  = await request.post(`${API_BASE}/carts`);
    const body = await res.json();

    expect(res.status()).toBe(201);
    expect(body.created).toBe(true);
    expect(body.cartId).toBeTruthy();

    cartId = body.cartId;
  });

  test('TC09 - Verify an item can be added to the cart @smoke @api @regression', async ({ request }) => {
    const res  = await request.post(`${API_BASE}/carts/${cartId}/items`, {
      data: { productId },
    });
    const body = await res.json();

    expect(res.status()).toBe(201);
    expect(body.created).toBe(true);
    expect(body.itemId).toBeDefined();

    itemId = body.itemId;
  });

  test('TC10 - Verify item quantity can be modified in the cart @smoke @api @regression', async ({ request }) => {
    const res = await request.patch(`${API_BASE}/carts/${cartId}/items/${itemId}`, {
      data: { quantity: 3 },
    });

    expect(res.status()).toBe(204);

    // Confirm quantity was updated
    const itemsRes = await request.get(`${API_BASE}/carts/${cartId}/items`);
    const items    = await itemsRes.json();
    const updated  = items.find((i: { id: number }) => i.id === itemId);
    expect(updated?.quantity).toBe(3);
  });

  test('TC11 - Verify an item can be deleted from the cart @smoke @api @regression', async ({ request }) => {
    const res = await request.delete(`${API_BASE}/carts/${cartId}/items/${itemId}`);
    expect(res.status()).toBe(204);

    // Confirm item is gone
    const itemsRes = await request.get(`${API_BASE}/carts/${cartId}/items`);
    const items    = await itemsRes.json();
    const deleted  = items.find((i: { id: number }) => i.id === itemId);
    expect(deleted).toBeUndefined();
  });

  // ── Group 4: Auth + Orders Flow ────────────────────────────────────────────

  test('TC12 - Verify API client registration returns an access token @smoke @api @regression', async ({ request }) => {
    const timestamp = Date.now();
    const res  = await request.post(`${API_BASE}/api-clients`, {
      data: {
        clientName : 'Playwright Test Client',
        clientEmail: `playwright.henry.${timestamp}@example.com`,
      },
    });
    const body = await res.json();

    expect(res.status()).toBe(201);
    expect(body.accessToken).toBeTruthy();

    accessToken = body.accessToken;
  });

  test('TC13 - Verify a new order can be created with a valid auth token @smoke @api @regression', async ({ request }) => {
    // Create fresh cart and add an item (TC11 deleted the previous item)
    const cartRes  = await request.post(`${API_BASE}/carts`);
    const { cartId: freshCartId } = await cartRes.json();

    await request.post(`${API_BASE}/carts/${freshCartId}/items`, {
      data: { productId },
    });

    const res  = await request.post(`${API_BASE}/orders`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data   : { cartId: freshCartId, customerName: 'Playwright Tester' },
    });
    const body = await res.json();

    expect(res.status()).toBe(201);
    expect(body.created).toBe(true);
    expect(body.orderId).toBeTruthy();

    orderId = body.orderId;
  });

  test('TC14 - Verify the created order can be retrieved by order ID @smoke @api @regression', async ({ request }) => {
    const res   = await request.get(`${API_BASE}/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const order = await res.json();

    expect(res.status()).toBe(200);
    expect(order.id).toBe(orderId);
    expect(order.customerName).toBe('Playwright Tester');
    expect(order).toHaveProperty('items');
  });

  test('TC15 - Verify the order can be deleted @smoke @api @regression', async ({ request }) => {
    const res = await request.delete(`${API_BASE}/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(res.status()).toBe(204);

    // Confirm order no longer exists
    const checkRes = await request.get(`${API_BASE}/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(checkRes.status()).toBe(404);
  });

});
