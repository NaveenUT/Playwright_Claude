import { test, expect, type APIRequestContext } from '@playwright/test';

const API_BASE = 'https://simple-grocery-store-api.click';

/** Helper — registers a new API client and returns its access token */
async function getAccessToken(request: APIRequestContext): Promise<string> {
  const res  = await request.post(`${API_BASE}/api-clients`, {
    data: {
      clientName : 'Playwright Complex Test',
      clientEmail: `playwright.complex.${Date.now()}@example.com`,
    },
  });
  const body = await res.json();
  return body.accessToken as string;
}

/** Helper — creates a new cart and returns its cartId */
async function createCart(request: APIRequestContext): Promise<string> {
  const res  = await request.post(`${API_BASE}/carts`);
  const body = await res.json();
  return body.cartId as string;
}

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

// ── Complex Chain Flow Tests ───────────────────────────────────────────────────

test.describe('Simple Grocery Store API — Complex Chain Flows', () => {

  test('TC16 - Health check gates product discovery — status UP enables product fetch and detail match @smoke @api @regression', async ({ request }) => {
    // Step 1: verify API is healthy
    const statusRes  = await request.get(`${API_BASE}/status`);
    const statusBody = await statusRes.json();
    expect(statusRes.status()).toBe(200);
    expect(statusBody.status).toBe('UP');

    // Step 2: get product list only after confirming UP
    const listRes  = await request.get(`${API_BASE}/products?available=true&results=5`);
    const products = await listRes.json();
    expect(listRes.status()).toBe(200);
    expect(products.length).toBeGreaterThan(0);

    // Step 3: use productId from list → fetch product detail
    const productId = products[0].id;
    const detailRes = await request.get(`${API_BASE}/products/${productId}`);
    const detail    = await detailRes.json();

    // Step 4: verify detail matches what the list returned
    expect(detailRes.status()).toBe(200);
    expect(detail.id).toBe(productId);
    expect(detail.name).toBe(products[0].name);
    expect(detail.category).toBe(products[0].category);
  });

  test('TC17 - Category filter response feeds product detail — verify category and name match @smoke @api @regression', async ({ request }) => {
    // Step 1: get coffee products
    const listRes = await request.get(`${API_BASE}/products?category=coffee`);
    const coffees = await listRes.json();
    expect(listRes.status()).toBe(200);
    expect(coffees.length).toBeGreaterThan(0);

    // Step 2: extract productId and name from category response
    const { id: productId, name: expectedName } = coffees[0];

    // Step 3: fetch full product detail using extracted ID
    const detailRes = await request.get(`${API_BASE}/products/${productId}`);
    const detail    = await detailRes.json();

    // Step 4: verify detail matches the category list entry
    expect(detailRes.status()).toBe(200);
    expect(detail.id).toBe(productId);
    expect(detail.name).toBe(expectedName);
    expect(detail.category).toBe('coffee');
  });

  test('TC18 - Product search feeds cart creation and item add — verify correct product in cart @smoke @api @regression', async ({ request }) => {
    // Step 1: search available products
    const listRes  = await request.get(`${API_BASE}/products?available=true&results=3`);
    const products = await listRes.json();
    const productId = products[0].id;

    // Step 2: create cart
    const cartId = await createCart(request);

    // Step 3: add product from step 1 to cart from step 2
    const addRes = await request.post(`${API_BASE}/carts/${cartId}/items`, {
      data: { productId },
    });
    expect(addRes.status()).toBe(201);

    // Step 4: fetch cart items and verify the productId matches step 1
    const itemsRes = await request.get(`${API_BASE}/carts/${cartId}/items`);
    const items    = await itemsRes.json();
    expect(items.length).toBe(1);
    expect(items[0].productId).toBe(productId);
  });

  test('TC19 - Add item → extract itemId from GET → modify quantity → verify updated value @smoke @api @regression', async ({ request }) => {
    // Step 1: create cart and add item
    const cartId    = await createCart(request);
    const listRes   = await request.get(`${API_BASE}/products?available=true&results=1`);
    const [product] = await listRes.json();
    await request.post(`${API_BASE}/carts/${cartId}/items`, { data: { productId: product.id } });

    // Step 2: GET cart items — extract itemId from response
    const itemsRes1 = await request.get(`${API_BASE}/carts/${cartId}/items`);
    const items1    = await itemsRes1.json();
    const itemId    = items1[0].id;

    // Step 3: PATCH quantity using itemId extracted in step 2
    const patchRes = await request.patch(`${API_BASE}/carts/${cartId}/items/${itemId}`, {
      data: { quantity: 5 },
    });
    expect(patchRes.status()).toBe(204);

    // Step 4: GET cart items again — verify quantity is 5
    const itemsRes2 = await request.get(`${API_BASE}/carts/${cartId}/items`);
    const items2    = await itemsRes2.json();
    const updated   = items2.find((i: { id: number }) => i.id === itemId);
    expect(updated.quantity).toBe(5);
  });

  test('TC20 - Add productA → replace with productB from different category → verify item changed @smoke @api @regression', async ({ request }) => {
    // Step 1: get a coffee product (productA)
    const coffeeRes = await request.get(`${API_BASE}/products?category=coffee&available=true`);
    const productA  = (await coffeeRes.json())[0].id;

    // Step 2: create cart and add productA
    const cartId = await createCart(request);
    await request.post(`${API_BASE}/carts/${cartId}/items`, { data: { productId: productA } });

    // Step 3: GET items — extract itemId
    const itemsRes1 = await request.get(`${API_BASE}/carts/${cartId}/items`);
    const itemId    = (await itemsRes1.json())[0].id;

    // Step 4: get a dairy product (productB)
    const dairyRes = await request.get(`${API_BASE}/products?category=dairy&available=true`);
    const productB = (await dairyRes.json())[0].id;

    // Step 5: PUT replace using itemId from step 3 and productB from step 4
    const replaceRes = await request.put(`${API_BASE}/carts/${cartId}/items/${itemId}`, {
      data: { productId: productB, quantity: 2 },
    });
    expect(replaceRes.status()).toBe(204);

    // Step 6: GET items — verify productId changed from A to B
    const itemsRes2 = await request.get(`${API_BASE}/carts/${cartId}/items`);
    const items2    = await itemsRes2.json();
    expect(items2[0].productId).toBe(productB);
    expect(items2[0].productId).not.toBe(productA);
    expect(items2[0].quantity).toBe(2);
  });

  test('TC21 - Register client → create order → PATCH comment → GET order → verify comment updated @smoke @api @regression', async ({ request }) => {
    // Step 1: register API client → extract token
    const token  = await getAccessToken(request);

    // Step 2: create cart and add item
    const cartId    = await createCart(request);
    const listRes   = await request.get(`${API_BASE}/products?available=true&results=1`);
    const [product] = await listRes.json();
    await request.post(`${API_BASE}/carts/${cartId}/items`, { data: { productId: product.id } });

    // Step 3: create order using token from step 1 and cartId from step 2
    const orderRes    = await request.post(`${API_BASE}/orders`, {
      headers: { Authorization: `Bearer ${token}` },
      data   : { cartId, customerName: 'Chain Test User' },
    });
    const { orderId } = await orderRes.json();
    expect(orderRes.status()).toBe(201);

    // Step 4: PATCH order with a comment using orderId from step 3
    const patchRes = await request.patch(`${API_BASE}/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
      data   : { comment: 'Please leave at the door' },
    });
    expect(patchRes.status()).toBe(204);

    // Step 5: GET order — verify comment from step 4 is present
    const getRes = await request.get(`${API_BASE}/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const order  = await getRes.json();
    expect(order.comment).toBe('Please leave at the door');
    expect(order.customerName).toBe('Chain Test User');

    // Cleanup
    await request.delete(`${API_BASE}/orders/${orderId}`, { headers: { Authorization: `Bearer ${token}` } });
  });

  test('TC22 - Multi-category cart → order → verify order items count matches cart @smoke @api @regression', async ({ request }) => {
    // Step 1: get one coffee product
    const coffeeRes = await request.get(`${API_BASE}/products?category=coffee&available=true`);
    const coffeeId  = (await coffeeRes.json())[0].id;

    // Step 2: get one dairy product
    const dairyRes = await request.get(`${API_BASE}/products?category=dairy&available=true`);
    const dairyId  = (await dairyRes.json())[0].id;

    // Step 3: create cart and add both products from steps 1 and 2
    const cartId = await createCart(request);
    await request.post(`${API_BASE}/carts/${cartId}/items`, { data: { productId: coffeeId } });
    await request.post(`${API_BASE}/carts/${cartId}/items`, { data: { productId: dairyId } });

    // Step 4: verify 2 items from different categories exist in cart
    const itemsRes = await request.get(`${API_BASE}/carts/${cartId}/items`);
    const items    = await itemsRes.json();
    expect(items.length).toBe(2);
    const productIds = items.map((i: { productId: number }) => i.productId);
    expect(productIds).toContain(coffeeId);
    expect(productIds).toContain(dairyId);

    // Step 5: create order using cartId and token
    const token    = await getAccessToken(request);
    const orderRes = await request.post(`${API_BASE}/orders`, {
      headers: { Authorization: `Bearer ${token}` },
      data   : { cartId, customerName: 'Multi Category Buyer' },
    });
    const { orderId } = await orderRes.json();
    expect(orderRes.status()).toBe(201);

    // Step 6: GET order — verify it contains items matching the cart
    const getRes = await request.get(`${API_BASE}/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const order  = await getRes.json();
    expect(order.items.length).toBe(2);

    // Cleanup
    await request.delete(`${API_BASE}/orders/${orderId}`, { headers: { Authorization: `Bearer ${token}` } });
  });

  test('TC23 - GET all orders count → create order → GET all orders → verify count increased by 1 @smoke @api @regression', async ({ request }) => {
    const token = await getAccessToken(request);

    // Step 1: GET all orders — record current count
    const beforeRes    = await request.get(`${API_BASE}/orders`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const countBefore  = (await beforeRes.json()).length;
    expect(beforeRes.status()).toBe(200);

    // Step 2: create cart and add item
    const cartId    = await createCart(request);
    const listRes   = await request.get(`${API_BASE}/products?available=true&results=1`);
    const [product] = await listRes.json();
    await request.post(`${API_BASE}/carts/${cartId}/items`, { data: { productId: product.id } });

    // Step 3: create order using cartId from step 2
    const orderRes    = await request.post(`${API_BASE}/orders`, {
      headers: { Authorization: `Bearer ${token}` },
      data   : { cartId, customerName: 'Count Test User' },
    });
    const { orderId } = await orderRes.json();
    expect(orderRes.status()).toBe(201);

    // Step 4: GET all orders — verify count increased by exactly 1
    const afterRes   = await request.get(`${API_BASE}/orders`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const afterOrders = await afterRes.json();
    expect(afterOrders.length).toBe(countBefore + 1);

    // Step 5: verify the new order is in the list using orderId from step 3
    const found = afterOrders.find((o: { id: string }) => o.id === orderId);
    expect(found).toBeDefined();

    // Cleanup
    await request.delete(`${API_BASE}/orders/${orderId}`, { headers: { Authorization: `Bearer ${token}` } });
  });

  test('TC24 - Add 3 items → extract all itemIds from GET → delete each → verify cart is empty @smoke @api @regression', async ({ request }) => {
    // Step 1: get 3 available products
    const listRes  = await request.get(`${API_BASE}/products?available=true&results=3`);
    const products = await listRes.json();
    expect(products.length).toBe(3);

    // Step 2: create cart and add all 3 products using IDs from step 1
    const cartId = await createCart(request);
    for (const product of products) {
      await request.post(`${API_BASE}/carts/${cartId}/items`, { data: { productId: product.id } });
    }

    // Step 3: GET cart items — extract all itemIds from response
    const itemsRes1 = await request.get(`${API_BASE}/carts/${cartId}/items`);
    const items1    = await itemsRes1.json();
    expect(items1.length).toBe(3);
    const itemIds   = items1.map((i: { id: number }) => i.id);

    // Step 4: delete each item using itemIds extracted in step 3
    for (const itemId of itemIds) {
      const delRes = await request.delete(`${API_BASE}/carts/${cartId}/items/${itemId}`);
      expect(delRes.status()).toBe(204);
    }

    // Step 5: GET cart items — verify cart is now empty
    const itemsRes2 = await request.get(`${API_BASE}/carts/${cartId}/items`);
    const items2    = await itemsRes2.json();
    expect(items2.length).toBe(0);
  });

  test('TC25 - Full E2E: search → cart → order → update customerName → verify → delete → confirm 404 @smoke @api @regression', async ({ request }) => {
    // Step 1: search for an available product
    const listRes   = await request.get(`${API_BASE}/products?available=true&results=1`);
    const [product] = await listRes.json();
    const productId = product.id;

    // Step 2: create cart and add product from step 1
    const cartId = await createCart(request);
    await request.post(`${API_BASE}/carts/${cartId}/items`, { data: { productId } });

    // Step 3: verify cart has correct product before ordering
    const itemsRes = await request.get(`${API_BASE}/carts/${cartId}/items`);
    const items    = await itemsRes.json();
    expect(items[0].productId).toBe(productId);

    // Step 4: register API client → extract token
    const token = await getAccessToken(request);

    // Step 5: create order using cartId from step 2 and token from step 4
    const orderRes    = await request.post(`${API_BASE}/orders`, {
      headers: { Authorization: `Bearer ${token}` },
      data   : { cartId, customerName: 'Original Name' },
    });
    const { orderId } = await orderRes.json();
    expect(orderRes.status()).toBe(201);

    // Step 6: GET order — verify original customerName
    const getRes1 = await request.get(`${API_BASE}/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect((await getRes1.json()).customerName).toBe('Original Name');

    // Step 7: PATCH order with new customerName using orderId from step 5
    const patchRes = await request.patch(`${API_BASE}/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
      data   : { customerName: 'Updated Name' },
    });
    expect(patchRes.status()).toBe(204);

    // Step 8: GET order again — verify customerName updated
    const getRes2 = await request.get(`${API_BASE}/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect((await getRes2.json()).customerName).toBe('Updated Name');

    // Step 9: DELETE order
    const delRes = await request.delete(`${API_BASE}/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(delRes.status()).toBe(204);

    // Step 10: GET order — confirm 404 after deletion
    const confirmRes = await request.get(`${API_BASE}/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(confirmRes.status()).toBe(404);
  });

});
