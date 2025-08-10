import os
import asyncio
from functools import lru_cache
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import uuid
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
from dotenv import load_dotenv
import logging

# Load environment variables from the root directory .env file
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), '.env'))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class Settings:
    KROGER_CLIENT_ID: str = os.getenv("KROGER_CLIENT_ID", "")
    KROGER_CLIENT_SECRET: str = os.getenv("KROGER_CLIENT_SECRET", "")
    KROGER_API_BASE_URL: str = os.getenv("KROGER_API_BASE_URL", "https://api.kroger.com/v1")
    DEV_MODE: bool = os.getenv("DEV_MODE", "").lower() in {"1", "true", "yes"} or (not os.getenv("KROGER_CLIENT_ID") or not os.getenv("KROGER_CLIENT_SECRET"))


@lru_cache
def get_settings() -> Settings:
    return Settings()


# Pydantic models for request/response
class CartItem(BaseModel):
    productId: str
    description: str
    brand: Optional[str] = None
    price: Optional[float] = None
    quantity: int = 1
    images: Optional[List[Dict[str, Any]]] = None


class AddToCartRequest(BaseModel):
    productId: str
    description: str
    brand: Optional[str] = None
    price: Optional[float] = None
    quantity: int = 1
    images: Optional[List[Dict[str, Any]]] = None


class UpdateCartRequest(BaseModel):
    quantity: int


class ShoppingList(BaseModel):
    id: str
    name: str
    items: List[CartItem]
    createdAt: datetime
    updatedAt: datetime


class CreateListRequest(BaseModel):
    name: str
    items: List[CartItem] = []


class UpdateListRequest(BaseModel):
    name: Optional[str] = None
    items: Optional[List[CartItem]] = None


app = FastAPI(title="Kroger Shopping AI - Modern API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for shopping lists and cart
class InMemoryStore:
    def __init__(self):
        self.cart: Dict[str, CartItem] = {}
        self.lists: Dict[str, ShoppingList] = {}
        self.token_cache: Dict[str, Dict[str, Any]] = {}
        # Cache aggregated product search results by (locationId, term)
        self.products_cache: Dict[str, Dict[str, Any]] = {}

store = InMemoryStore()


async def get_token(settings: Settings) -> str:
    """Get OAuth2 token with caching"""
    cache_key = "kroger_token"
    if settings.DEV_MODE:
        # In dev mode we do not call Kroger, just return a stub
        return "dev-token"
    
    # Check cache
    if cache_key in store.token_cache:
        cached = store.token_cache[cache_key]
        if cached["expires_at"] > datetime.now():
            return cached["token"]
    
    auth = httpx.BasicAuth(settings.KROGER_CLIENT_ID, settings.KROGER_CLIENT_SECRET)
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            f"{settings.KROGER_API_BASE_URL}/connect/oauth2/token",
            data={"grant_type": "client_credentials", "scope": "product.compact"},
            auth=auth,
        )
        if resp.status_code != 200:
            logger.error(f"Failed to get token: {resp.status_code} - {resp.text}")
            raise HTTPException(status_code=502, detail="Failed to get Kroger token")
        
        data = resp.json()
        # Cache the token (expire 5 minutes before actual expiry)
        store.token_cache[cache_key] = {
            "token": data["access_token"],
            "expires_at": datetime.now() + timedelta(seconds=data.get("expires_in", 1800) - 300)
        }
        return data["access_token"]


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/api/locations/nearby")
async def locations_nearby(
    zipCode: str = Query(..., description="ZIP code to search near"),
    radius: int = Query(50, description="Search radius in miles"),
    limit: int = Query(50, description="Maximum number of results")
):
    """Find Kroger stores near a ZIP code"""
    settings = get_settings()
    if settings.DEV_MODE:
        # Return sample stores in dev mode (include Cemetery Rd, Hilliard)
        samples = [
            {
                "locationId": "01600425",
                "name": "Kroger Cemetery Rd",
                "address": {"city": "Hilliard", "state": "OH"},
            },
            {
                "locationId": "01400462",
                "name": "Kroger Greenbriar",
                "address": {"city": "Grove City", "state": "OH"},
            },
            {
                "locationId": "01400322",
                "name": "Kroger Stringtown Rd",
                "address": {"city": "Grove City", "state": "OH"},
            },
        ]
        return samples[: max(1, min(limit, 50))]
    token = await get_token(settings)
    headers = {"Authorization": f"Bearer {token}"}
    params = {
        "filter.zipCode.near": zipCode,
        "filter.radiusInMiles": radius,
        "filter.limit": limit,
    }
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(f"{settings.KROGER_API_BASE_URL}/locations", headers=headers, params=params)
        if resp.status_code != 200:
            logger.error(f"Locations API error: {resp.status_code} - {resp.text}")
            raise HTTPException(status_code=resp.status_code, detail=resp.text)
        return resp.json().get("data", [])


@app.get("/api/products/search")
async def products_search(
    term: str = Query(..., description="Search term"),
    locationId: str = Query(..., description="Kroger location ID"),
    limit: int = Query(10, description="Page size (max 200)"),
    start: int = Query(0, description="Offset for pagination (filter.start)"),
    onSaleOnly: bool = Query(False, description="Only return items with promo < regular"),
    brand: Optional[str] = Query(None, description="Filter by brand substring"),
    category: Optional[str] = Query(None, description="Filter by category substring"),
    minPrice: Optional[float] = Query(None, description="Minimum price"),
    maxPrice: Optional[float] = Query(None, description="Maximum price"),
):
    """Search for products at a specific Kroger location with optional filtering"""
    settings = get_settings()

    def price_of(p: dict) -> float:
        try:
            it = (p.get("items") or [{}])[0]
            pr = (it or {}).get("price") or {}
            return float(pr.get("promo") if pr.get("promo") is not None else pr.get("regular") or 0)
        except Exception:
            return float("inf")

    def is_sale(p: dict) -> bool:
        try:
            it = (p.get("items") or [{}])[0]
            pr = (it or {}).get("price") or {}
            reg = pr.get("regular")
            promo = pr.get("promo")
            return isinstance(promo, (int, float)) and promo > 0 and (reg is None or promo < reg)
        except Exception:
            return False

    def apply_filters(items: list[dict]) -> list[dict]:
        out = items
        if onSaleOnly:
            out = [p for p in out if is_sale(p)]
        if brand:
            b = brand.lower()
            out = [p for p in out if b in (p.get("brand") or "").lower() or b in (p.get("description") or "").lower()]
        if category:
            c = category.lower()
            def has_cat(p: dict) -> bool:
                cats = p.get("categories") or []
                return any(isinstance(x, str) and c in x.lower() for x in cats)
            out = [p for p in out if has_cat(p)]
        if minPrice is not None:
            out = [p for p in out if price_of(p) >= float(minPrice)]
        if maxPrice is not None:
            out = [p for p in out if price_of(p) <= float(maxPrice)]
        return out[: min(max(limit, 1), 200)]

    if settings.DEV_MODE:
        data = _sample_products(term)
        sliced = data[start : start + min(max(limit, 1), 50)]
        return apply_filters(sliced)

    token = await get_token(settings)
    headers = {"Authorization": f"Bearer {token}"}
    params = {
        "filter.term": term,
        "filter.locationId": locationId,
        "filter.limit": min(max(limit, 1), 50),
        "filter.start": max(start, 0),
    }
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(f"{settings.KROGER_API_BASE_URL}/products", headers=headers, params=params)
        if resp.status_code != 200:
            logger.error(f"Products search error: {resp.status_code} - {resp.text}")
            raise HTTPException(status_code=resp.status_code, detail=resp.text)
        items = resp.json().get("data", [])
        return apply_filters(items)


def _cache_key_products(location_id: str, term: str, max_items: int) -> str:
    return f"products::{location_id}::{term.lower().strip()}::max{max_items}"


@app.get("/api/products/search/all")
async def products_search_all(
    term: str = Query(..., description="Search term"),
    locationId: str = Query(..., description="Kroger location ID"),
    max: int = Query(300, description="Max items to aggregate (cap 400)"),
    fresh: bool = Query(False, description="Bypass server cache when true"),
):
    """
    Aggregate up to `max` items for a term/location in a single backend call and cache it briefly.
    This reduces API cost and makes frontend pagination fully client-side and stable.
    """
    settings = get_settings()
    cap = min(max if max and max > 0 else 300, 400)
    cache_key = _cache_key_products(locationId, term, cap)

    # Serve from cache if fresh (5 minutes TTL)
    cached = store.products_cache.get(cache_key)
    now = datetime.now()
    if not fresh and cached and cached.get("expires_at") and cached["expires_at"] > now:
        return cached["items"]

    # Fetch and aggregate
    results: list[dict] = []
    if settings.DEV_MODE:
        data = _sample_products(term)
        results = data[: min(cap, 200)]
    else:
        token = await get_token(settings)
        headers = {"Authorization": f"Bearer {token}"}
        start = 0
        step = 50
        async with httpx.AsyncClient(timeout=15) as client:
            while len(results) < cap:
                params = {
                    "filter.term": term,
                    "filter.locationId": locationId,
                    "filter.limit": min(step, 50),
                    "filter.start": start,
                }
                resp = await client.get(f"{settings.KROGER_API_BASE_URL}/products", headers=headers, params=params)
                if resp.status_code != 200:
                    logger.error(f"Aggregate products error: {resp.status_code} - {resp.text}")
                    break
                raw = resp.json()
                batch = raw.get("data", [])
                # Attach raw details for modal richness when available
                for p in batch:
                    if isinstance(p.get("images"), list):
                        for e in p["images"]:
                            if isinstance(e, dict) and "sizes" in e and isinstance(e["sizes"], list):
                                # normalize sizes entries to ensure size/url keys exist
                                e["sizes"] = [
                                    {"size": str(s.get("size", "")), "url": s.get("url")} for s in e["sizes"] if isinstance(s, dict)
                                ]
                if not batch:
                    break
                results.extend(batch)
                start += step
                if len(batch) < step:
                    break
        # Deduplicate by productId/upc while preserving order
        seen: set[str] = set()
        deduped: list[dict] = []
        for p in results:
            pid = p.get("productId") or p.get("upc") or None
            if pid is None:
                deduped.append(p)
                continue
            if pid in seen:
                continue
            seen.add(pid)
            deduped.append(p)
        results = deduped[:cap]

    # Cache with TTL 2 minutes
    store.products_cache[cache_key] = {
        "items": results,
        "expires_at": now + timedelta(minutes=2),
    }
    return results

@app.get("/api/products/sales")
async def products_sales(locationId: str, term: str, limit: int = 50):
    """
    Returns products for the given term and location where a promo price exists
    and is lower than the regular price.

    Note: The Kroger public Products API does not expose a direct "on sale only"
    listing endpoint. We derive sale items by comparing promo vs regular price
    from the term search results.
    """
    settings = get_settings()
    if settings.DEV_MODE:
        items = _sample_products(term)
        def is_on_sale(p: dict) -> bool:
            try:
                it = (p.get("items") or [{}])[0]
                price = (it or {}).get("price") or {}
                reg = price.get("regular")
                promo = price.get("promo")
                return isinstance(promo, (int, float)) and promo > 0 and (reg is None or promo < reg)
            except Exception:
                return False
        return [p for p in items if is_on_sale(p)][: min(max(limit, 1), 50)]
    token = await get_token(settings)
    headers = {"Authorization": f"Bearer {token}"}
    params = {
        "filter.term": term,
        "filter.location.id": locationId,
        "filter.limit": min(max(limit, 1), 50),
    }
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(f"{settings.KROGER_API_BASE_URL}/products", headers=headers, params=params)
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=resp.text)
        items = resp.json().get("data", [])
        def is_on_sale(p: dict) -> bool:
            try:
                it = (p.get("items") or [{}])[0]
                price = (it or {}).get("price") or {}
                reg = price.get("regular")
                promo = price.get("promo")
                return isinstance(promo, (int, float)) and promo > 0 and (reg is None or promo < reg)
            except Exception:
                return False
        return [p for p in items if is_on_sale(p)]


@app.get("/api/products/sales/all")
async def products_sales_all(
    locationId: str = Query(..., description="Kroger location ID"),
    max: int = Query(150, description="Maximum number of sale items to return")
):
    """
    Attempts to gather a broad set of on-sale products for a location by issuing
    multiple term-based searches and deduplicating the results, then filtering on
    promo < regular. Public Products API doesn't provide a direct "all sales" endpoint.
    """
    settings = get_settings()
    if settings.DEV_MODE:
        # Aggregate over multiple seed terms locally
        seeds = [
            "chips", "snack", "drink", "milk", "bread", "fruit", "cheese", "organic"
        ]
        collected: list[dict] = []
        seen: set[str] = set()
        for s in seeds:
            for p in _sample_products(s):
                pid = p.get("productId") or p.get("upc")
                if pid in seen:
                    continue
                seen.add(pid)
                collected.append(p)
        def is_on_sale(p: dict) -> bool:
            try:
                it = (p.get("items") or [{}])[0]
                price = (it or {}).get("price") or {}
                reg = price.get("regular")
                promo = price.get("promo")
                return isinstance(promo, (int, float)) and (reg is None or promo < reg)
            except Exception:
                return False
        sale_items = [p for p in collected if is_on_sale(p)]
        return sale_items[: (max if max > 0 else 150)]
    token = await get_token(settings)
    headers = {"Authorization": f"Bearer {token}"}

    # Curated seed terms to cover a wide range without excessive calls
    seeds = [
        "a", "e", "o", "kroger", "simple truth", "organic",
        "milk", "bread", "meat", "snack", "drink", "fruit", "vegetable", "cheese"
    ]

    async def fetch_seed(seed: str):
        params = {
            "filter.term": seed,
            "filter.locationId": locationId,
            "filter.limit": 50,
        }
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(f"{settings.KROGER_API_BASE_URL}/products", headers=headers, params=params)
            if resp.status_code != 200:
                return []
            return resp.json().get("data", [])

    # Limit concurrency to reduce pressure
    semaphore = asyncio.Semaphore(5)

    async def guarded(seed: str):
        async with semaphore:
            return await fetch_seed(seed)

    results = await asyncio.gather(*[guarded(s) for s in seeds])
    all_items = []
    seen = set()
    for batch in results:
        for p in batch:
            pid = p.get("productId") or p.get("upc")
            if pid in seen:
                continue
            seen.add(pid)
            all_items.append(p)

    def is_on_sale(p: dict) -> bool:
        try:
            it = (p.get("items") or [{}])[0]
            price = (it or {}).get("price") or {}
            reg = price.get("regular")
            promo = price.get("promo")
            return isinstance(promo, (int, float)) and promo > 0 and (reg is None or promo < reg)
        except Exception:
            return False

    sale_items = [p for p in all_items if is_on_sale(p)]
    # Cap to requested max
    return sale_items[: max if max > 0 else 150]


# Shopping Lists API endpoints
@app.post("/api/lists", response_model=ShoppingList)
async def create_shopping_list(request: CreateListRequest):
    """Create a new shopping list"""
    list_id = str(uuid.uuid4())
    new_list = ShoppingList(
        id=list_id,
        name=request.name,
        items=request.items,
        createdAt=datetime.now(),
        updatedAt=datetime.now()
    )
    store.lists[list_id] = new_list
    return new_list


@app.get("/api/lists", response_model=List[ShoppingList])
async def get_shopping_lists():
    """Get all shopping lists"""
    return list(store.lists.values())


@app.get("/api/lists/{list_id}", response_model=ShoppingList)
async def get_shopping_list(list_id: str):
    """Get a specific shopping list"""
    if list_id not in store.lists:
        raise HTTPException(status_code=404, detail="Shopping list not found")
    return store.lists[list_id]


@app.put("/api/lists/{list_id}", response_model=ShoppingList)
async def update_shopping_list(list_id: str, request: UpdateListRequest):
    """Update a shopping list"""
    if list_id not in store.lists:
        raise HTTPException(status_code=404, detail="Shopping list not found")
    
    shopping_list = store.lists[list_id]
    
    if request.name is not None:
        shopping_list.name = request.name
    
    if request.items is not None:
        shopping_list.items = request.items
    
    shopping_list.updatedAt = datetime.now()
    return shopping_list


@app.delete("/api/lists/{list_id}")
async def delete_shopping_list(list_id: str):
    """Delete a shopping list"""
    if list_id not in store.lists:
        raise HTTPException(status_code=404, detail="Shopping list not found")
    
    del store.lists[list_id]
    return {"message": "Shopping list deleted successfully"}


# Cart API endpoints
def _serialize_cart() -> Dict[str, Any]:
    items = []
    for item in store.cart.values():
        items.append({
            "id": item.productId,
            "productId": item.productId,
            "description": item.description,
            "brand": item.brand,
            "price": item.price,
            "quantity": item.quantity,
        })
    total = sum(((i.get("price") or 0) * (i.get("quantity") or 0)) for i in items)
    return {"items": items, "total": round(total, 2)}


@app.get("/api/cart")
async def get_cart():
    """Get all items in the cart with total"""
    return _serialize_cart()


@app.post("/api/cart/add")
async def add_to_cart(request: AddToCartRequest):
    """Add an item to the cart"""
    cart_item = CartItem(
        productId=request.productId,
        description=request.description,
        brand=request.brand,
        price=request.price,
        quantity=request.quantity,
        images=request.images
    )
    
    # If item already exists, update quantity
    if request.productId in store.cart:
        store.cart[request.productId].quantity += request.quantity
        return _serialize_cart()
    store.cart[request.productId] = cart_item
    return _serialize_cart()


@app.delete("/api/cart/remove/{product_id}")
async def remove_from_cart(product_id: str):
    """Remove an item from the cart"""
    if product_id not in store.cart:
        raise HTTPException(status_code=404, detail="Item not found in cart")
    
    del store.cart[product_id]
    return _serialize_cart()


@app.put("/api/cart/update/{product_id}")
async def update_cart_item(product_id: str, request: UpdateCartRequest):
    """Update the quantity of an item in the cart"""
    if product_id not in store.cart:
        raise HTTPException(status_code=404, detail="Item not found in cart")
    
    if request.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than 0")
    
    store.cart[product_id].quantity = request.quantity
    return _serialize_cart()


@app.delete("/api/cart/clear")
async def clear_cart_delete():
    """Clear all items from the cart"""
    store.cart.clear()
    return _serialize_cart()

@app.post("/api/cart/clear")
async def clear_cart_post():
    """Clear all items from the cart (POST compatibility)"""
    store.cart.clear()
    return _serialize_cart()


@app.get("/api/cart/total")
async def get_cart_total():
    """Calculate the total price and counts"""
    data = _serialize_cart()
    item_count = sum((item.get("quantity") or 0) for item in data["items"]) if data else 0
    return {
        "total": data.get("total", 0),
        "itemCount": item_count,
        "uniqueItems": len(store.cart)
    }


@app.get("/api/products/details")
async def product_details(productId: str = Query(...), locationId: str = Query(...)):
    """Fetch detailed product info by productId for a given location."""
    settings = get_settings()
    if settings.DEV_MODE:
        # Try to find in sample data
        items = _sample_products("")
        for p in items:
            if p.get("productId") == productId:
                # Add some mock details for UI richness
                p = dict(p)
                p.setdefault("fulfillment", {"instore": True, "curbside": True, "delivery": True, "shiptohome": False})
                p.setdefault("items", [
                    {
                        "price": p.get("items", [{}])[0].get("price", {}),
                        "inventory": {"stockLevel": "HIGH"},
                        "aisleLocations": [{"aisleNumber": "12", "bayNumber": "B", "shelfNumber": "3"}],
                    }
                ])
                p.setdefault("productPageURI", "/p/demo-product")
                return p
        raise HTTPException(status_code=404, detail="Product not found")

    token = await get_token(settings)
    headers = {"Authorization": f"Bearer {token}"}
    params = {
        "filter.productId": productId,
        "filter.locationId": locationId,
        "filter.limit": 1,
    }
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(f"{settings.KROGER_API_BASE_URL}/products", headers=headers, params=params)
        if resp.status_code != 200:
            logger.error(f"Product details error: {resp.status_code} - {resp.text}")
            raise HTTPException(status_code=resp.status_code, detail=resp.text)
        data = resp.json().get("data", [])
        if not data:
            raise HTTPException(status_code=404, detail="Product not found")
        prod = data[0]
        # Compute full product page URL if URI is present
        try:
            uri = prod.get("productPageURI") or prod.get("productPageUri")
            if uri and isinstance(uri, str):
                prod["productPageUrl"] = f"https://www.kroger.com{uri}"
        except Exception:
            pass
        return prod


# --- Sample data helpers for DEV_MODE ---
def _sample_products(term: str) -> list[dict]:
    term_l = (term or "").lower()
    products = [
        {
            "productId": "0000000000001",
            "description": "Simple Truth Organic 2% Milk 64 oz",
            "brand": "Simple Truth",
            "categories": ["Dairy & Eggs"],
            "items": [{"price": {"regular": 4.99, "promo": 3.99}}],
        },
        {
            "productId": "0000000000002",
            "description": "Kroger White Sandwich Bread 20 oz",
            "brand": "Kroger",
            "categories": ["Bakery"],
            "items": [{"price": {"regular": 2.49}}],
        },
        {
            "productId": "0000000000003",
            "description": "Lay's Classic Potato Chips 8 oz",
            "brand": "Lay's",
            "categories": ["Snacks", "Chips"],
            "items": [{"price": {"regular": 4.49, "promo": 2.99}}],
        },
        {
            "productId": "0000000000004",
            "description": "Coca-Cola 12pk 12 fl oz Cans",
            "brand": "Coca-Cola",
            "categories": ["Beverages"],
            "items": [{"price": {"regular": 8.99, "promo": 6.99}}],
        },
        {
            "productId": "0000000000005",
            "description": "Kroger Shredded Cheddar Cheese 8 oz",
            "brand": "Kroger",
            "categories": ["Dairy & Eggs", "Cheese"],
            "items": [{"price": {"regular": 3.49, "promo": 2.99}}],
        },
    ]
    if not term_l:
        return products
    return [p for p in products if term_l in (p["description"].lower() + " " + (p.get("brand") or "").lower())]

