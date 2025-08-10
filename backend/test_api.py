#!/usr/bin/env python3
"""
Simple test script for the Kroger Shopping AI FastAPI backend.
Run this after starting the server to verify all endpoints work.
"""

import asyncio
import httpx
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

async def test_health():
    """Test health endpoint"""
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/health")
        assert response.status_code == 200
        print("✓ Health check passed")

async def test_locations():
    """Test location search"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{BASE_URL}/api/locations/nearby",
            params={"zipCode": "43123", "radius": 10, "limit": 5}
        )
        if response.status_code == 200:
            locations = response.json()
            print(f"✓ Found {len(locations)} locations")
            return locations[0]["locationId"] if locations else None
        else:
            print(f"✗ Location search failed: {response.status_code}")
            return None

async def test_product_search(location_id):
    """Test product search"""
    if not location_id:
        print("⚠ Skipping product search (no location)")
        return None
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{BASE_URL}/api/products/search",
            params={"term": "milk", "locationId": location_id, "limit": 5}
        )
        if response.status_code == 200:
            products = response.json()
            print(f"✓ Found {len(products)} products")
            return products[0] if products else None
        else:
            print(f"✗ Product search failed: {response.status_code}")
            return None

async def test_cart_operations(product):
    """Test cart operations"""
    async with httpx.AsyncClient() as client:
        # Clear cart first
        await client.delete(f"{BASE_URL}/api/cart/clear")
        
        # Add item to cart
        if product:
            cart_item = {
                "productId": product.get("productId", "test-123"),
                "description": product.get("description", "Test Product"),
                "brand": product.get("brand"),
                "price": product.get("items", [{}])[0].get("price", {}).get("regular", 1.99),
                "quantity": 2
            }
        else:
            cart_item = {
                "productId": "test-123",
                "description": "Test Product",
                "brand": "Test Brand",
                "price": 1.99,
                "quantity": 2
            }
        
        response = await client.post(f"{BASE_URL}/api/cart/add", json=cart_item)
        if response.status_code == 200:
            print("✓ Added item to cart")
        else:
            print(f"✗ Failed to add to cart: {response.status_code}")
            return
        
        # Get cart
        response = await client.get(f"{BASE_URL}/api/cart")
        if response.status_code == 200:
            cart = response.json()
            print(f"✓ Cart has {len(cart)} items")
        
        # Update quantity
        response = await client.put(
            f"{BASE_URL}/api/cart/update/{cart_item['productId']}",
            json={"quantity": 5}
        )
        if response.status_code == 200:
            print("✓ Updated cart item quantity")
        
        # Get total
        response = await client.get(f"{BASE_URL}/api/cart/total")
        if response.status_code == 200:
            total = response.json()
            print(f"✓ Cart total: ${total['total']:.2f} ({total['itemCount']} items)")
        
        # Remove item
        response = await client.delete(f"{BASE_URL}/api/cart/remove/{cart_item['productId']}")
        if response.status_code == 200:
            print("✓ Removed item from cart")

async def test_list_operations():
    """Test shopping list operations"""
    async with httpx.AsyncClient() as client:
        # Create list
        list_data = {
            "name": "Test Shopping List",
            "items": [
                {
                    "productId": "item-1",
                    "description": "Eggs",
                    "brand": "Local Farm",
                    "price": 3.99,
                    "quantity": 1
                },
                {
                    "productId": "item-2",
                    "description": "Bread",
                    "brand": "Wonder",
                    "price": 2.49,
                    "quantity": 2
                }
            ]
        }
        
        response = await client.post(f"{BASE_URL}/api/lists", json=list_data)
        if response.status_code == 200:
            created_list = response.json()
            list_id = created_list["id"]
            print(f"✓ Created shopping list: {list_id}")
        else:
            print(f"✗ Failed to create list: {response.status_code}")
            return
        
        # Get all lists
        response = await client.get(f"{BASE_URL}/api/lists")
        if response.status_code == 200:
            lists = response.json()
            print(f"✓ Retrieved {len(lists)} shopping lists")
        
        # Update list
        update_data = {"name": "Updated Shopping List"}
        response = await client.put(f"{BASE_URL}/api/lists/{list_id}", json=update_data)
        if response.status_code == 200:
            print("✓ Updated shopping list")
        
        # Get specific list
        response = await client.get(f"{BASE_URL}/api/lists/{list_id}")
        if response.status_code == 200:
            print("✓ Retrieved specific shopping list")
        
        # Delete list
        response = await client.delete(f"{BASE_URL}/api/lists/{list_id}")
        if response.status_code == 200:
            print("✓ Deleted shopping list")

async def main():
    """Run all tests"""
    print("\n🚀 Testing Kroger Shopping AI Backend\n")
    print("=" * 40)
    
    try:
        # Test basic health
        await test_health()
        print()
        
        # Test location search
        print("Testing Location Services...")
        location_id = await test_locations()
        print()
        
        # Test product search
        print("Testing Product Search...")
        product = await test_product_search(location_id)
        print()
        
        # Test cart operations
        print("Testing Cart Operations...")
        await test_cart_operations(product)
        print()
        
        # Test shopping lists
        print("Testing Shopping Lists...")
        await test_list_operations()
        print()
        
        print("=" * 40)
        print("\n✅ All tests completed!\n")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}\n")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())